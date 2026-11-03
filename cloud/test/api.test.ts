// End-to-end: device sign-in, scoped upload keys against the real dev bucket, the viewer gateway,
// analytics events and plan limits. Needs scripts/db.sh start and cloud/.env (R2 dev bucket).
import { afterAll, beforeAll, expect, test } from "bun:test";
import postgres from "postgres";

const TEST_DB = "postgres://postgres@127.0.0.1:54329/reelbird_cloud_test";

const { migrate } = await import("../src/migrate");
const { app } = await import("../src/index");
const { R2 } = await import("../src/r2");
const { config } = await import("../src/config");
const { signPayload, verifySignature, qualifies } = await import("../src/billing");
const { captured } = await import("../src/mail");
const { ShortIDForTest } = { ShortIDForTest: () => {
  const a = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  return Array.from(crypto.getRandomValues(new Uint8Array(14)), (b) => a[b % a.length]).join("");
} };

const base = config.publicURL;
const created: string[] = [];

beforeAll(async () => {
  const sql = postgres(TEST_DB, { max: 1, onnotice: () => {} });
  await sql.unsafe("drop schema public cascade; create schema public;");
  await sql.end();
  await migrate(TEST_DB);
});

afterAll(async () => {
  const admin = new R2(config.r2);
  for (const id of created) await admin.deleteShare(`r/${id}`).catch(() => {});
});

const call = (path: string, init: RequestInit & { cookie?: string; bearer?: string } = {}) => {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.bearer) headers.set("authorization", `Bearer ${init.bearer}`);
  return app.fetch(new Request(base + path, { ...init, headers, redirect: "manual" }));
};
const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

/** The sign-in link from the last email to this address. */
function lastLink(email: string) {
  const m = [...captured].reverse().find((x) => x.to.toLowerCase() === email.toLowerCase());
  return m?.text.match(/https?:\/\/\S+\/login\/verify\?token=([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

let loginIP = 0;
async function webLogin(email: string, next = "/account") {
  // Each sign-in from its own address, so the per-IP email limit doesn't trip the suite.
  const r = await call("/login", { method: "POST", body: new URLSearchParams({ email, next }), headers: { "x-forwarded-for": `198.18.0.${++loginIP}` } });
  expect(r.status).toBe(200);
  expect(await r.text()).toContain("Check your email");
  const token = lastLink(email)!;
  expect(token).toBeString();
  expect((await call(`/login/verify?token=${token}`)).status).toBe(200);
  const done = await call("/login/verify", { method: "POST", body: new URLSearchParams({ token }) });
  expect(done.status).toBe(302);
  expect(done.headers.get("location")).toBe(next);
  return done.headers.get("set-cookie")!.split(";")[0];
}

async function appLogin(email: string) {
  const start = await (await call("/api/device", { ...json({ name: "Test Mac" }), headers: { "content-type": "application/json", "x-forwarded-for": `198.19.0.${++loginIP}` } })).json();
  expect(start.userCode).toMatch(/^[A-Z]{4}-[A-Z]{4}$/);
  expect((await call("/api/device/token", json({ deviceCode: start.deviceCode }))).status).toBe(428);
  const cookie = await webLogin(email);
  const page = await call(`/device?code=${start.userCode}`, { cookie });
  expect(await page.text()).toContain("Test Mac");
  const ok = await call("/device", { method: "POST", cookie, body: new URLSearchParams({ code: start.userCode }) });
  expect(ok.status).toBe(200);
  const done = await (await call("/api/device/token", json({ deviceCode: start.deviceCode }))).json();
  expect(done.token).toBeString();
  // The code works once.
  expect((await call("/api/device/token", json({ deviceCode: start.deviceCode }))).status).toBe(410);
  return { token: done.token as string, cookie };
}

/** A client that signs with the temporary keys, like the Mac app. */
function tempClient(k: { accessKeyId: string; secretAccessKey: string; sessionToken: string }) {
  const c = new R2({ ...config.r2, accessKeyId: k.accessKeyId, secretAccessKey: k.secretAccessKey });
  const send = c.send.bind(c);
  c.send = (m, key, o = {}) => send(m, key, { ...o, headers: { ...(o.headers ?? {}), "x-amz-security-token": k.sessionToken } });
  return c;
}

let alice: { token: string; cookie: string };
let bob: { token: string; cookie: string };
let shareId: string;

const backdate = async (id: string) => {
  const db = postgres(TEST_DB, { max: 1, onnotice: () => {} });
  await db`update shares set touched_at = now() - interval '2 days', created_at = now() - interval '2 days' where id = ${id}`;
  await db.end();
};

test("email sign-in: the link works once, the email is plain, opening it signs nobody in", async () => {
  const before = captured.length;
  const r = await call("/login", { method: "POST", body: new URLSearchParams({ email: "zoe@example.com", next: "/account" }) });
  expect(r.status).toBe(200);
  expect(captured.length).toBe(before + 1);
  const mail = captured.at(-1)!;
  expect(mail).toMatchObject({ to: "zoe@example.com", subject: "Your Reelbird sign-in link" });
  expect(mail.html).toContain("Sign in to Reelbird");
  const token = lastLink("zoe@example.com")!;
  // Opening the link (or a mail scanner opening it) only shows a button.
  expect((await call(`/login/verify?token=${token}`)).headers.get("set-cookie")).toBeNull();
  expect((await call(`/login/verify?token=${token}`)).status).toBe(200);
  const ok = await call("/login/verify", { method: "POST", body: new URLSearchParams({ token }) });
  expect(ok.status).toBe(302);
  expect(ok.headers.get("set-cookie")).toContain("rb_session=");
  // Used: gone.
  expect((await call("/login/verify", { method: "POST", body: new URLSearchParams({ token }) })).status).toBe(410);
  expect((await call(`/login/verify?token=${token}`)).status).toBe(410);
  expect((await call("/login/verify", { method: "POST", body: new URLSearchParams({ token: "nonsense" }) })).status).toBe(410);
});

test("email sign-in: expired links fail; at most five links per address per 15 minutes", async () => {
  await call("/login", { method: "POST", body: new URLSearchParams({ email: "yan@example.com" }) });
  const token = lastLink("yan@example.com")!;
  const db = postgres(TEST_DB, { max: 1, onnotice: () => {} });
  await db`update login_links set expires_at = now() - interval '1 second' where email = 'yan@example.com'`;
  await db.end();
  expect((await call("/login/verify", { method: "POST", body: new URLSearchParams({ token }) })).status).toBe(410);
  const sent = () => captured.filter((m) => m.to === "yan@example.com").length;
  for (let i = 0; i < 6; i++) await call("/login", { method: "POST", body: new URLSearchParams({ email: "yan@example.com" }), headers: { "x-forwarded-for": `198.51.100.${i}` } });
  expect(sent()).toBe(5); // the first plus four more; the sixth asked within 15 minutes gets nothing
});

test("device sign-in gives the app a token; a new account has no plan", async () => {
  alice = await appLogin("alice@example.com");
  bob = await appLogin("bob@example.com");
  const me = await (await call("/api/me", { bearer: alice.token })).json();
  expect(me).toMatchObject({ email: "alice@example.com", plan: "free", limits: { activeLinks: 0, analytics: false } });
  expect((await call("/api/me", { bearer: "nope" })).status).toBe(401);
});

test("hosted links need Pro", async () => {
  const r = await call(`/api/shares/${ShortIDForTest()}/credentials`, { ...json({}), bearer: alice.token });
  expect(r.status).toBe(402);
  expect(await r.json()).toMatchObject({ error: "ProRequired" });
  expect(await (await call("/account", { cookie: alice.cookie })).text()).toContain("Upgrade to Pro");
});

test("upload keys work for the share's folder only, and the gateway serves it", async () => {
  expect((await call("/api/dev/plan", { ...json({ plan: "pro" }), bearer: alice.token })).status).toBe(204);
  shareId = ShortIDForTest();
  created.push(shareId);
  const r = await call(`/api/shares/${shareId}/credentials`, { ...json({ title: "Demo" }), bearer: alice.token });
  expect(r.status).toBe(200);
  const k = await r.json();
  expect(k.publicBaseURL).toBe(base);
  const c = tempClient(k);
  const html = `<!doctype html><html><body><video id="v"></video><script type="application/json" id="meta">{"revision":1}</script></body></html>`;
  await c.put(`r/${shareId}/index.html`, html, "text/html; charset=utf-8");
  await c.put(`r/${shareId}/meta.json`, JSON.stringify({ revision: 1, title: "Demo from meta" }), "application/json");
  await c.put(`r/${shareId}/video.1.mp4`, "fake mp4 bytes", "video/mp4");
  // Outside the folder: refused.
  const other = await c.send("PUT", `r/${ShortIDForTest()}/x.txt`, { body: "x", headers: { "content-type": "text/plain" } });
  expect(other.status).toBe(403);

  expect((await call(`/api/shares/${shareId}/sync`, { method: "POST", bearer: alice.token })).status).toBe(204);
  const list = await (await call("/api/shares", { bearer: alice.token })).json();
  expect(list[0]).toMatchObject({ id: shareId, url: `${base}/r/${shareId}/` });
  expect(list[0].bytes).toBeGreaterThan(0);
  const page = await call(`/r/${shareId}/`);
  expect(page.status).toBe(200);
  const pageHTML = await page.text();
  expect(pageHTML).toMatch(new RegExp(`<script nonce="[^"]+" src="/e.js" data-share="${shareId}" defer>`));
  expect(pageHTML).toContain("<title>Demo from meta</title>");
  expect(page.headers.get("content-security-policy")).toContain("script-src 'nonce-");
  expect((await call(`/r/${shareId}`)).status).toBe(301);
  expect((await call(`/r/${shareId}/meta.json`)).status).toBe(200);
  const media = await call(`/r/${shareId}/video.1.mp4`);
  expect(media.status).toBe(302);
  const signed = await fetch(media.headers.get("location")!);
  expect(await signed.text()).toBe("fake mp4 bytes");
  expect((await call(`/r/${shareId}/..%2Fsecret`)).status).toBe(404);
  expect((await call(`/r/${ShortIDForTest()}/`)).status).toBe(404);
});

test("uploaded files never run as watch.reelbird.app: the page is rendered from checked meta", async () => {
  const k = await (await call(`/api/shares/${shareId}/credentials`, { ...json({}), bearer: alice.token })).json();
  const c = tempClient(k);
  await c.put(`r/${shareId}/index.html`, `<html><body><script>steal()</script></body></html>`, "text/html");
  await c.put(`r/${shareId}/meta.json`, JSON.stringify({
    revision: 2, title: `</script><script>steal()</script>`, baseURL: "https://evil.example/", pageURL: "https://evil.example/",
    video: "https://evil.example/x.mp4", poster: "../../other/poster.jpg", captions: "captions.2.vtt", width: 1920, height: 1080,
    chapters: [{ time: 3, title: "<img src=x onerror=steal()>" }, { time: "x", title: 1 }],
  }), "text/html");
  await c.put(`r/${shareId}/hls/index.m3u8`, `<script>steal()</script>`, "text/html");
  const page = await call(`/r/${shareId}/`);
  const html = await page.text();
  expect(html).not.toContain("<script>steal()");
  expect(html).not.toContain("evil.example");
  expect(html).not.toContain("<img src=x");
  const nonce = page.headers.get("content-security-policy")!.match(/'nonce-([^']+)'/)![1];
  for (const tag of html.match(/<script(?=[\s>])[^>]*>/g)!) expect(tag).toContain(`nonce="${nonce}"`);
  const meta = await (await call(`/r/${shareId}/meta.json`)).json();
  expect(meta).toMatchObject({ baseURL: `${base}/r/${shareId}/`, pageURL: `${base}/r/${shareId}/`, captions: "captions.2.vtt", revision: 2 });
  expect(meta.video).toBeUndefined();
  expect(meta.poster).toBeUndefined();
  expect(meta.chapters).toEqual([{ time: 3, title: "<img src=x onerror=steal()>" }]);
  const playlist = await call(`/r/${shareId}/hls/index.m3u8`);
  expect(playlist.headers.get("content-type")).toBe("application/vnd.apple.mpegurl");
  expect(playlist.headers.get("content-security-policy")).toContain("sandbox");
  expect(playlist.headers.get("x-content-type-options")).toBe("nosniff");
});

test("the server's viewer template matches the app's", async () => {
  const { generated, out } = await import("../scripts/sync-viewer");
  expect(await Bun.file(out).text()).toBe(generated());
});

test("someone else's share ID is refused", async () => {
  const r = await call(`/api/shares/${shareId}/credentials`, { ...json({}), bearer: bob.token });
  expect(r.status).toBe(403);
});

test("views are recorded; Pro sees everything, a lapsed account sees the count", async () => {
  const view = crypto.randomUUID();
  const ua = { "user-agent": "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15", "x-forwarded-for": "203.0.113.7" };
  const beat = (body: object, extra: Record<string, string> = {}) =>
    call("/e", { method: "POST", body: JSON.stringify(body), headers: { ...ua, ...extra } });
  expect((await beat({ s: shareId, t: "open" })).status).toBe(204);
  // Chunks 0-4 watched of a 20 s video (10 chunks): 0b00011111.
  const bits = Buffer.from([0b00011111]).toString("base64");
  expect((await beat({ s: shareId, v: view, t: "beat", rev: 1, d: 20, p: 10, ws: 10, w: bits, c: false, r: "https://app.slack.com/client" })).status).toBe(204);
  // A later beat from the same page load replaces the bitmap.
  const more = Buffer.from([0xff, 0b11]).toString("base64");
  await beat({ s: shareId, v: view, t: "beat", rev: 1, d: 20, p: 20, ws: 20, w: more, c: true });
  // Under 3 seconds isn't a view; bots and the owner don't count.
  await beat({ s: shareId, v: crypto.randomUUID(), t: "beat", rev: 1, d: 20, p: 2, ws: 2, w: bits });
  await beat({ s: shareId, v: crypto.randomUUID(), t: "beat", rev: 1, d: 20, p: 9, ws: 9, w: bits }, { "user-agent": "Slackbot-LinkExpanding 1.0" });
  await beat({ s: shareId, v: crypto.randomUUID(), t: "beat", rev: 1, d: 20, p: 9, ws: 9, w: bits }, { cookie: alice.cookie });

  const pro = await (await call(`/api/shares/${shareId}/stats`, { bearer: alice.token })).json();
  expect(pro).toMatchObject({ views: 1, uniqueViewers: 1, locked: false, completionRate: 100, averagePercent: 100, duration: 20 });
  expect(pro.retention).toEqual(new Array(10).fill(1));
  expect(pro.referrers).toEqual([{ name: "app.slack.com", views: 1 }]);
  expect(pro.devices).toEqual([{ name: "Desktop", views: 1 }]);
  expect((await call(`/account/s/${shareId}`, { cookie: alice.cookie })).status).toBe(200);
  expect((await call(`/api/shares/${shareId}/stats`, { bearer: bob.token })).status).toBe(404);

  await call("/api/dev/plan", { ...json({ plan: "free" }), bearer: alice.token });
  const lapsed = await (await call(`/api/shares/${shareId}/stats`, { bearer: alice.token })).json();
  expect(lapsed).toMatchObject({ views: 1, locked: true, retention: [] });
});

test("when Pro ends: links keep playing, uploads in progress finish, nothing new", async () => {
  // alice is no longer Pro (previous test).
  expect((await call(`/r/${shareId}/`)).status).toBe(200);
  // Made in the last day (a recording that was uploading): keys still come, and renewing doesn't extend that.
  expect((await call(`/api/shares/${shareId}/credentials`, { ...json({}), bearer: alice.token })).status).toBe(200);
  // Older than a day: no more updates.
  await backdate(shareId);
  const stale = await call(`/api/shares/${shareId}/credentials`, { ...json({}), bearer: alice.token });
  expect(stale.status).toBe(402);
  expect((await stale.json()).error).toBe("ProRequired");
  // And no new links.
  expect((await call(`/api/shares/${ShortIDForTest()}/credentials`, { ...json({}), bearer: alice.token })).status).toBe(402);
  expect(await (await call("/account", { cookie: alice.cookie })).text()).toContain("Your existing links keep playing");
});

test("deleting a link removes its files and the page (with or without Pro)", async () => {
  expect((await call(`/api/shares/${shareId}`, { method: "DELETE", bearer: alice.token })).status).toBe(204);
  expect((await call(`/r/${shareId}/`)).status).toBe(404);
  expect(await new R2(config.r2).list(`r/${shareId}/`)).toEqual([]);
  // A deleted ID can't be reused.
  await call("/api/dev/plan", { ...json({ plan: "pro" }), bearer: alice.token });
  expect((await call(`/api/shares/${shareId}/credentials`, { ...json({}), bearer: alice.token })).status).toBe(410);
});

test("signing out revokes the app token", async () => {
  expect((await call("/api/logout", { method: "POST", bearer: bob.token })).status).toBe(204);
  expect((await call("/api/me", { bearer: bob.token })).status).toBe(401);
});

// MARK: Billing

const stripeEvent = async (type: string, object: object, id = "evt_" + crypto.randomUUID().replaceAll("-", "")) => {
  const payload = JSON.stringify({ id, type, data: { object } });
  return call("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": signPayload(payload, process.env.STRIPE_WEBHOOK_SECRET!), "content-type": "application/json" } });
};
const PRO = "prod_VTSee5NkgzYUpl", PRO_LINK = "plink_1USVjtBbj7zje3qW3ZISlMYw", DONATION = "prod_VKMxHgIqwzOiCj";
const sub = (id: string, customer: string, status: string, product = PRO) => ({
  id, object: "subscription", customer, status,
  items: { data: [{ quantity: 1, current_period_end: 1_800_000_000, price: { unit_amount: 500, currency: "usd", product, recurring: { interval: "month" } } }] },
});
const checkout = (customer: string, subscription: string, extra: object = {}) => ({
  object: "checkout.session", mode: "subscription", customer, subscription, payment_link: PRO_LINK,
  payment_status: "paid", amount_total: 500, currency: "usd", ...extra,
});
const plan = async (bearer: string) => (await (await call("/api/me", { bearer })).json()).plan;

test("signatures: Stripe's scheme, within five minutes", () => {
  const body = '{"a":1}';
  const now = Date.now();
  expect(verifySignature(body, signPayload(body, "s", Math.floor(now / 1000)), "s", now)).toBe(true);
  expect(verifySignature(body, signPayload(body, "other"), "s")).toBe(false);
  expect(verifySignature(body + " ", signPayload(body, "s"), "s")).toBe(false);
  expect(verifySignature(body, signPayload(body, "s", Math.floor(now / 1000) - 600), "s", now)).toBe(false);
  expect(verifySignature(body, undefined, "s")).toBe(false);
});

test("only an active Reelbird Pro subscription makes Pro", () => {
  expect(qualifies({ status: "active", product_id: PRO })).toBe(true);
  expect(qualifies({ status: "trialing", product_id: PRO })).toBe(true);
  expect(qualifies({ status: "past_due", product_id: PRO })).toBe(false);
  expect(qualifies({ status: "canceled", product_id: PRO })).toBe(false);
  expect(qualifies({ status: "active", product_id: DONATION })).toBe(false);
  expect(qualifies({ status: "active", product_id: null })).toBe(false);
});

test("paying through the Pro link makes the account Pro; cancelling ends it", async () => {
  const carol = await appLogin("carol@example.com");
  const me = await (await call("/api/me", { bearer: carol.token })).json();
  expect(me.upgradeURL).toBe(`${base}/upgrade`);

  // /upgrade sends the signed-in person to the Pro Payment Link, tagged with their account.
  const up = await call("/upgrade", { cookie: carol.cookie });
  expect(up.status).toBe(302);
  const link = new URL(up.headers.get("location")!);
  expect(link.toString()).toStartWith("https://buy.stripe.com/5kQ8wO88gaXs9h57Yn3ks05?");
  const ref = link.searchParams.get("client_reference_id")!;
  expect(link.searchParams.get("prefilled_email")).toBe("carol@example.com");

  // The subscription event can come first: nothing to link yet.
  expect((await stripeEvent("customer.subscription.created", sub("sub_carol", "cus_carol", "active"))).status).toBe(200);
  expect(await plan(carol.token)).toBe("free");
  // Checkout links the customer to the account → Pro.
  expect((await stripeEvent("checkout.session.completed", checkout("cus_carol", "sub_carol", { client_reference_id: ref, customer_details: { email: "carol@example.com" } }))).status).toBe(200);
  expect(await plan(carol.token)).toBe("pro");
  // Stripe sends the buyer back to /account?welcome=pro&session_id=cs_… (the link's After payment redirect). That
  // address must answer with the page, not a redirect: Tiffin's analytics credits the payment to the visit that
  // comes back with the Checkout Session id, and only a page view that answers 2xx counts.
  const back = await call("/account?welcome=pro&session_id=cs_live_a1b2c3d4", { cookie: carol.cookie });
  expect(back.status).toBe(200);
  expect(await back.text()).toContain("Welcome to Pro");
  expect((await call("/upgrade", { cookie: carol.cookie })).headers.get("location")).toBe("/account");
  expect(await (await call("/account", { cookie: carol.cookie })).text()).toContain("Manage billing");
  expect((await call("/billing", { cookie: carol.cookie })).headers.get("location")).toContain("billing.stripe.com/p/login/test_portal?prefilled_email=carol%40example.com");

  // Payment fails → past_due → no Pro; paid again → Pro; cancelled → no Pro.
  await stripeEvent("customer.subscription.updated", sub("sub_carol", "cus_carol", "past_due"));
  expect(await plan(carol.token)).toBe("free");
  await stripeEvent("customer.subscription.updated", sub("sub_carol", "cus_carol", "active"));
  expect(await plan(carol.token)).toBe("pro");
  await stripeEvent("customer.subscription.deleted", sub("sub_carol", "cus_carol", "canceled"));
  expect(await plan(carol.token)).toBe("free");
});

test("open-source support tiers and other links grant nothing", async () => {
  const dan = await appLogin("dan@example.com");
  // A checkout through a donation link, even with Dan's account reference, links nothing.
  const ref = new URL((await call("/upgrade", { cookie: dan.cookie })).headers.get("location")!).searchParams.get("client_reference_id")!;
  await stripeEvent("checkout.session.completed", checkout("cus_dan", "sub_dan_donation", { payment_link: "plink_1UJiDnBbj7zje3qWA0UXs9Hn", client_reference_id: ref, customer_details: { email: "dan@example.com" } }));
  await stripeEvent("customer.subscription.created", sub("sub_dan_donation", "cus_dan", "active", DONATION));
  expect(await plan(dan.token)).toBe("free");
});

test("a 100%-off code (no payment required) makes Pro even before the subscription event", async () => {
  const fay = await appLogin("fay@example.com");
  const ref = new URL((await call("/upgrade", { cookie: fay.cookie })).headers.get("location")!).searchParams.get("client_reference_id")!;
  await stripeEvent("checkout.session.completed", checkout("cus_fay", "sub_fay", { client_reference_id: ref, payment_status: "no_payment_required", amount_total: 0 }));
  expect(await plan(fay.token)).toBe("pro");
});

test("a payment made before signing up turns into Pro at sign-in", async () => {
  await stripeEvent("checkout.session.completed", checkout("cus_erin", "sub_erin", { customer_details: { email: "erin@example.com" } }));
  await stripeEvent("customer.subscription.created", sub("sub_erin", "cus_erin", "active"));
  const erin = await appLogin("Erin@Example.com");
  expect(await plan(erin.token)).toBe("pro");
});

test("webhooks: bad signatures are refused, repeats are ignored", async () => {
  const payload = JSON.stringify({ id: "evt_forged", type: "customer.subscription.created", data: { object: sub("sub_f", "cus_f", "active") } });
  const forged = await call("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": signPayload(payload, "wrong") } });
  expect(forged.status).toBe(400);
  const again = await stripeEvent("customer.subscription.updated", sub("sub_erin", "cus_erin", "active"), "evt_same");
  expect(again.status).toBe(200);
  expect(await (await stripeEvent("customer.subscription.updated", sub("sub_erin", "cus_erin", "canceled"), "evt_same")).json()).toMatchObject({ duplicate: true });
});

test("pages: brand assets are served with long caching; the home page sends signed-in people to their links", async () => {
  const home = await (await call("/")).text();
  const font = home.match(/\/assets\/fraunces\.woff2\?v=[0-9a-f]+/)?.[0];
  expect(font).toBeTruthy();
  const r = await call(font!);
  expect(r.status).toBe(200);
  expect(r.headers.get("content-type")).toBe("font/woff2");
  expect(r.headers.get("cache-control")).toContain("immutable");
  expect((await call("/assets/../package.json")).status).toBe(404);
  expect((await call("/assets/nope.css")).status).toBe(404);
  const dave = await webLogin("dave@example.com");
  const res = await call("/", { cookie: dave });
  expect(res.status).toBe(302);
  expect(res.headers.get("location")).toBe("/account");
});

// MARK: Hardening

const db = () => postgres(TEST_DB, { max: 1, onnotice: () => {} });

test("storage counts on every key renewal, not just new links", async () => {
  const carl = await appLogin("carl@example.com");
  await call("/api/dev/plan", { ...json({ plan: "pro" }), bearer: carl.token });
  const id = ShortIDForTest();
  created.push(id);
  expect((await call(`/api/shares/${id}/credentials`, { ...json({}), bearer: carl.token })).status).toBe(200);
  const q = db();
  await q`update shares set bytes = ${200e9} where id = ${id}`;
  await q.end();
  const r = await call(`/api/shares/${id}/credentials`, { ...json({}), bearer: carl.token });
  expect(r.status).toBe(402);
  expect((await r.json()).error).toBe("StorageLimit");
});

test("a delete that fails in R2 is retried until the files are gone", async () => {
  const { purgeDeleted, r2 } = await import("../src/shares");
  const dana = await appLogin("dana@example.com");
  await call("/api/dev/plan", { ...json({ plan: "pro" }), bearer: dana.token });
  const id = ShortIDForTest();
  created.push(id);
  const k = await (await call(`/api/shares/${id}/credentials`, { ...json({}), bearer: dana.token })).json();
  await tempClient(k).put(`r/${id}/meta.json`, "{}", "application/json");
  const real = r2.deleteShare.bind(r2);
  r2.deleteShare = async () => { throw new Error("R2 is down"); };
  expect((await call(`/api/shares/${id}`, { method: "DELETE", bearer: dana.token })).status).toBe(204);
  expect((await call(`/r/${id}/`)).status).toBe(404); // the link stops at once
  expect((await new R2(config.r2).list(`r/${id}/`)).length).toBe(1); // files still there
  r2.deleteShare = real;
  expect(await purgeDeleted()).toBeGreaterThanOrEqual(1);
  expect(await new R2(config.r2).list(`r/${id}/`)).toEqual([]);
  const q = db();
  const [row] = await q`select purged_at is not null as purged from shares where id = ${id}`;
  // Purged once; another pass comes after the last keys expire.
  expect(row!.purged).toBe(true);
  await q`update shares set deleted_at = now() - interval '2 hours', purged_at = now() - interval '110 minutes' where id = ${id}`;
  expect(await purgeDeleted()).toBeGreaterThanOrEqual(1);
  const [again] = await q`select purged_at > deleted_at + interval '65 minutes' as final from shares where id = ${id}`;
  expect(again!.final).toBe(true);
  await q.end();
});

test("links can be deleted from the browser", async () => {
  const erin2 = await appLogin("erin2@example.com");
  await call("/api/dev/plan", { ...json({ plan: "pro" }), bearer: erin2.token });
  const id = ShortIDForTest();
  created.push(id);
  await call(`/api/shares/${id}/credentials`, { ...json({}), bearer: erin2.token });
  const page = await (await call(`/account/s/${id}`, { cookie: erin2.cookie })).text();
  expect(page).toContain(`action="/account/s/${id}/delete"`);
  // Someone else can't.
  expect((await call(`/account/s/${id}/delete`, { method: "POST", cookie: alice.cookie })).status).toBe(404);
  const r = await call(`/account/s/${id}/delete`, { method: "POST", cookie: erin2.cookie });
  expect(r.headers.get("location")).toBe("/account?deleted=1");
  expect((await call(`/r/${id}/`)).status).toBe(404);
  expect((await call(`/account/s/${id}/delete`, { method: "POST", cookie: erin2.cookie, headers: { origin: "https://evil.example" } })).status).toBe(403);
});

test("billing: an older event can't undo a newer one; a failed event leaves no trace", async () => {
  const hal = await appLogin("hal@example.com");
  const me = await (await call("/api/me", { bearer: hal.token })).json();
  expect(me.plan).toBe("free");
  const q = db();
  const [u] = await q`select id from users where email = 'hal@example.com'`;
  await q.end();
  const event = (type: string, object: object, created: number, id = "evt_" + crypto.randomUUID().replaceAll("-", "")) => {
    const payload = JSON.stringify({ id, type, created, data: { object } });
    return call("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": signPayload(payload, process.env.STRIPE_WEBHOOK_SECRET!) } });
  };
  await event("checkout.session.completed", checkout("cus_hal", "sub_hal", { client_reference_id: u!.id }), 1000);
  await event("customer.subscription.created", sub("sub_hal", "cus_hal", "active"), 1001);
  await event("customer.subscription.deleted", sub("sub_hal", "cus_hal", "canceled"), 1003);
  // Delivered late: the "active" update from before the cancellation.
  await event("customer.subscription.updated", sub("sub_hal", "cus_hal", "active"), 1002);
  expect(await plan(hal.token)).toBe("free");

  // An event whose effects fail isn't recorded, so Stripe's retry runs it in full.
  const id = "evt_fail_once";
  const bad = { ...sub("sub_hal2", "cus_hal", "active"), status: null }; // violates a NOT NULL: the effects fail
  const r1 = await event("customer.subscription.created", bad, 2000, id);
  expect(r1.status).toBe(500);
  const r2 = await event("customer.subscription.created", sub("sub_hal2", "cus_hal", "active"), 2000, id);
  expect(await r2.json()).toEqual({ received: true });
  expect(await plan(hal.token)).toBe("pro");
});

test("a failed payment still shows billing, so the card can be fixed", async () => {
  const gus = await appLogin("gus@example.com");
  const q = db();
  const [u] = await q`select id from users where email = 'gus@example.com'`;
  await q.end();
  await stripeEvent("checkout.session.completed", checkout("cus_gus", "sub_gus", { client_reference_id: u!.id }));
  await stripeEvent("customer.subscription.updated", sub("sub_gus", "cus_gus", "past_due"));
  expect(await plan(gus.token)).toBe("free");
  const page = await (await call("/account", { cookie: gus.cookie })).text();
  expect(page).toContain("Manage billing");
  expect(page).toContain("Your last payment didn't go through");
});

test("report page, readiness, and sign-in rate limits", async () => {
  const r = await (await call("/report?link=MyR3jLKo9BGwGW")).text();
  expect(r).toContain("mailto:hello@reelbird.app");
  expect(r).toContain("/r/MyR3jLKo9BGwGW/");
  expect(await (await call("/report?link=<script>")).text()).not.toContain("<script>");
  expect((await call("/readyz")).status).toBe(200);
  const ip = { "x-forwarded-for": "192.0.2.99" };
  let last = 0;
  for (let i = 0; i < 21; i++) last = (await call("/api/device", { ...json({}), headers: { ...ip, "content-type": "application/json" } })).status;
  expect(last).toBe(429);
  // A spoofed first entry doesn't dodge it: the proxy's (last) entry is the one that counts.
  const spoofed = await call("/api/device", { ...json({}), headers: { "x-forwarded-for": "10.9.9.9, 192.0.2.99", "content-type": "application/json" } });
  expect(spoofed.status).toBe(429);
  expect((await call("/stripe/webhook", { method: "POST", body: "x".repeat(300 * 1024) })).status).toBe(413);
});

test("deleting a link deletes its view records; an operator takedown does the same", async () => {
  const { takeDown } = await import("../src/shares");
  const ivy = await appLogin("ivy@example.com");
  await call("/api/dev/plan", { ...json({ plan: "pro" }), bearer: ivy.token });
  const id = ShortIDForTest();
  created.push(id);
  await call(`/api/shares/${id}/credentials`, { ...json({}), bearer: ivy.token });
  const bits = Buffer.from([0xff]).toString("base64");
  await call("/e", { method: "POST", body: JSON.stringify({ s: id, v: crypto.randomUUID(), t: "beat", rev: 0, d: 10, p: 9, ws: 9, w: bits }), headers: { "user-agent": "Mozilla/5.0 Safari/605.1.15", "x-forwarded-for": "203.0.113.9" } });
  const q = db();
  expect((await q`select count(*)::int as n from views where share_id = ${id}`)[0]!.n).toBe(1);
  expect(await takeDown(id)).toBe(true);
  expect((await q`select count(*)::int as n from views where share_id = ${id}`)[0]!.n).toBe(0);
  await q.end();
  expect((await call(`/r/${id}/`)).status).toBe(404);
});

// MARK: Review fixes

test("sign-in never redirects off the site", async () => {
  const jo = await webLogin("jo@example.com");
  for (const bad of ["/\\evil.example", "//evil.example", "/\t/evil.example", "https://evil.example"]) {
    const r = await call(`/login?next=${encodeURIComponent(bad)}`, { cookie: jo });
    expect(r.headers.get("location")).toBe("/account");
  }
  expect((await call(`/login?next=${encodeURIComponent("/account/s/x")}`, { cookie: jo })).headers.get("location")).toBe("/account/s/x");
});

test("a checkout with someone else's email can't take over their billing link", async () => {
  const kim = await appLogin("kim@example.com");
  const q = db();
  const [u] = await q`select id from users where email = 'kim@example.com'`;
  await stripeEvent("checkout.session.completed", checkout("cus_kim", "sub_kim", { client_reference_id: u!.id }));
  await stripeEvent("customer.subscription.created", sub("sub_kim", "cus_kim", "active"));
  expect(await plan(kim.token)).toBe("pro");
  // Someone else pays through the public link, typing kim's address.
  await stripeEvent("checkout.session.completed", checkout("cus_mallory", "sub_mallory", { customer_details: { email: "kim@example.com" } }));
  await stripeEvent("customer.subscription.deleted", sub("sub_mallory", "cus_mallory", "canceled"));
  const [row] = await q`select stripe_customer_id from users where id = ${u!.id}`;
  expect(row!.stripe_customer_id).toBe("cus_kim");
  expect(await plan(kim.token)).toBe("pro");
  await q.end();
});

test("same-second subscription events: the later stage wins", async () => {
  const lee = await appLogin("lee@example.com");
  const q = db();
  const [u] = await q`select id from users where email = 'lee@example.com'`;
  await q.end();
  const event = (type: string, object: object, created: number) => {
    const payload = JSON.stringify({ id: "evt_" + crypto.randomUUID().replaceAll("-", ""), type, created, data: { object } });
    return call("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": signPayload(payload, process.env.STRIPE_WEBHOOK_SECRET!) } });
  };
  await event("checkout.session.completed", checkout("cus_lee", "sub_lee", { client_reference_id: u!.id }), 5000);
  await event("customer.subscription.updated", sub("sub_lee", "cus_lee", "active"), 5001);
  await event("customer.subscription.created", sub("sub_lee", "cus_lee", "incomplete"), 5001);
  expect(await plan(lee.token)).toBe("pro");
});

test("gateway: only media types redirect, with our content type; bad paths are 404s", async () => {
  const mo = await appLogin("mo@example.com");
  await call("/api/dev/plan", { ...json({ plan: "pro" }), bearer: mo.token });
  const id = ShortIDForTest();
  created.push(id);
  const k = await (await call(`/api/shares/${id}/credentials`, { ...json({}), bearer: mo.token })).json();
  const c = tempClient(k);
  await c.put(`r/${id}/meta.json`, JSON.stringify({ revision: 0, title: "x" }), "application/json");
  await c.put(`r/${id}/evil.html`, "<script>x</script>", "text/html");
  await c.put(`r/${id}/sub/index.html`, "<script>x</script>", "text/html");
  expect((await call(`/r/${id}/evil.html`)).status).toBe(404);
  expect((await call(`/r/${id}/sub/index.html`)).status).toBe(404);
  expect((await call(`/r/${id}/%E0%A4%A`)).status).toBe(404);
  const mp4 = await call(`/r/${id}/video.1.mp4`);
  expect(mp4.status).toBe(302);
  expect(mp4.headers.get("location")).toContain("response-content-type=video%2Fmp4");
  // A huge meta.json isn't read into memory: the link just isn't ready.
  await c.put(`r/${id}/meta.json`, JSON.stringify({ title: "x".repeat(300 * 1024) }), "application/json");
  expect((await call(`/r/${id}/`)).status).toBe(404);
});

test("analytics: reports for unpublished versions or one viewer's flood are ignored", async () => {
  const ned = await appLogin("ned@example.com");
  await call("/api/dev/plan", { ...json({ plan: "pro" }), bearer: ned.token });
  const id = ShortIDForTest();
  created.push(id);
  const k = await (await call(`/api/shares/${id}/credentials`, { ...json({}), bearer: ned.token })).json();
  await tempClient(k).put(`r/${id}/meta.json`, JSON.stringify({ revision: 2, title: "x", duration: 10 }), "application/json");
  expect((await call(`/r/${id}/`)).status).toBe(200); // the page records revision 2, 10 s
  const ua = { "user-agent": "Mozilla/5.0 Safari/605.1.15", "x-forwarded-for": "203.0.113.50" };
  const bits = Buffer.from([0xff]).toString("base64");
  const beat = (rev: number) => call("/e", { method: "POST", body: JSON.stringify({ s: id, v: crypto.randomUUID(), t: "beat", rev, d: 10, p: 9, ws: 9, w: bits }), headers: ua });
  await beat(1000000);
  for (let i = 0; i < 25; i++) await beat(2);
  const stats = await (await call(`/api/shares/${id}/stats`, { bearer: ned.token })).json();
  expect(stats.views).toBe(20);
});

test("signed-in Macs are listed and can be signed out from the browser", async () => {
  const oz = await appLogin("oz@example.com");
  const page = await (await call("/account", { cookie: oz.cookie })).text();
  expect(page).toContain("Signed-in Macs");
  expect(page).toContain("Test Mac");
  const mac = page.match(/\/account\/macs\/([0-9a-f]{16})\/revoke/)![1];
  expect((await call(`/account/macs/${mac}/revoke`, { method: "POST", cookie: oz.cookie })).status).toBe(302);
  expect((await call("/api/me", { bearer: oz.token })).status).toBe(401);
  // The approval was emailed.
  expect(captured.some((m) => m.to === "oz@example.com" && m.subject.includes("was connected"))).toBe(true);
  // Signed-in pages aren't cached.
  expect((await call("/account", { cookie: oz.cookie })).headers.get("cache-control")).toBe("no-store");
});

test("short clips count views; robots, favicon and legal links resolve", async () => {
  const pat = await appLogin("pat@example.com");
  await call("/api/dev/plan", { ...json({ plan: "pro" }), bearer: pat.token });
  const id = ShortIDForTest();
  created.push(id);
  const k = await (await call(`/api/shares/${id}/credentials`, { ...json({}), bearer: pat.token })).json();
  await tempClient(k).put(`r/${id}/meta.json`, JSON.stringify({ revision: 0, title: "clip", duration: 1.5 }), "application/json");
  await call(`/r/${id}/`);
  const bits = Buffer.from([0b1]).toString("base64");
  await call("/e", { method: "POST", body: JSON.stringify({ s: id, v: crypto.randomUUID(), t: "beat", rev: 0, d: 1.5, p: 1.5, ws: 1.4, w: bits, c: true }), headers: { "user-agent": "Mozilla/5.0 Safari/605.1.15", "x-forwarded-for": "203.0.113.77" } });
  expect((await (await call(`/api/shares/${id}/stats`, { bearer: pat.token })).json()).views).toBe(1);
  expect(await (await call("/robots.txt")).text()).toContain("Disallow: /account");
  expect((await call("/favicon.ico")).status).toBe(301);
  expect((await call("/terms")).headers.get("location")).toBe("https://reelbird.app/terms/");
});
