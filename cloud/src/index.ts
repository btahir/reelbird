// Reelbird Cloud: hosted share links and view analytics for the Reelbird app.
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { config, type Plan } from "./config";
import { sql } from "./db";
import * as auth from "./auth";
import { credentials, deleteShare, limits, listShares, measureRecent, purgeDeleted, ShareRefusal, SHARE_ID, storageInfo, syncShare, usage } from "./shares";
import { serveShare } from "./gateway";
import { ingest, VIEWER_SCRIPT } from "./events";
import { shareStats } from "./stats";
import { billing, createCheckoutURL, linkOnSignIn, portalURL, subscriptionState, upgradeURL, webhook } from "./billing";
import * as pages from "./pages";
import { asset, serveAsset } from "./assets";
import { canSendMail, sendMail } from "./mail";
import { clientIP, limiter } from "./events";

export const app = new Hono();

const fail = (c: Context, status: number, error: string, message: string) =>
  c.json({ error, message }, status as 400);

app.use("*", async (c, next) => {
  await next();
  // Signed-in pages and sign-in steps are per person: never cached by a browser or proxy.
  if (/^\/(account|device|login|billing|upgrade|logout)(\/|$)/.test(c.req.path)) c.header("cache-control", "no-store");
  c.header("x-content-type-options", "nosniff");
  c.header("referrer-policy", "strict-origin-when-cross-origin");
  if (!c.req.path.startsWith("/r/")) c.header("x-frame-options", "DENY");
});

// No request needs more than this: uploads go straight to R2, and Stripe events are a few KB.
app.use("*", bodyLimit({ maxSize: 256 * 1024, onError: (c) => c.text("Too large", 413) }));

app.get("/healthz", (c) => c.text("ok"));
// Link previews (Slack, X, iMessage) must reach /r/; account pages have nothing to crawl.
app.get("/robots.txt", (c) => c.text("User-agent: *\nDisallow: /account\nDisallow: /login\nDisallow: /device\nDisallow: /api/\n"));
app.get("/favicon.ico", (c) => c.redirect(asset("favicon.ico"), 301));
for (const page of ["terms", "privacy"]) app.get(`/${page}`, (c) => c.redirect(`https://reelbird.app/${page}/`, 301));
// Ready to serve: the database answers. (Liveness is /healthz; this one is for monitors.)
app.get("/readyz", async (c) => {
  try {
    await sql`select 1`;
    return c.text("ok");
  } catch {
    return c.text("database unavailable", 503);
  }
});

// MARK: Viewer

app.get("/r/:id", (c) => c.redirect(`/r/${c.req.param("id")}/`, 301));
app.get("/r/:id/*", serveShare);
app.get("/e.js", (c) => c.body(VIEWER_SCRIPT, 200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=300" }));
app.post("/e", ingest);

// MARK: Web pages

app.get("/", async (c) => ((await auth.webUser(c)) ? c.redirect("/account") : c.html(pages.homePage())));

// Fonts and icons for the pages, so they load nothing from other hosts.
app.get("/assets/:file", serveAsset);

// Limits, in memory (one instance). Sign-in emails: 10 an hour per IP and 300 an hour in all, to
// protect the sender's reputation. Device codes: 20 an hour. Polling for a device token: the app asks
// every 2 seconds, so 60 a minute is plenty. Per account: 120 syncs an hour (new links: shares.ts).
const loginPerIP = limiter(10, 3_600_000);
const loginTotal = limiter(300, 3_600_000);
const loginAllowed = (ip: string) => loginPerIP(ip) && loginTotal("all");
const syncAllowed = limiter(120, 3_600_000);
const deviceAllowed = limiter(20, 3_600_000);
const pollAllowed = limiter(60, 60_000);

/** A path on this site to go to after signing in. Anything that could leave the site ("//x", "/\\x", tabs) is refused. */
const safeNext = (n: unknown) => {
  if (typeof n !== "string" || !/^\/(?![\/\\])[^\\\x00-\x20]*$/.test(n)) return "/account";
  try {
    return new URL(n, config.publicURL).origin === new URL(config.publicURL).origin ? n : "/account";
  } catch {
    return "/account";
  }
};

app.get("/login", async (c) => {
  const next = safeNext(c.req.query("next"));
  if (await auth.webUser(c)) return c.redirect(next);
  return c.html(pages.loginPage(next));
});

app.post("/login", async (c) => {
  if (!auth.sameOrigin(c)) return c.text("Bad origin", 403);
  const form = await c.req.parseBody();
  const next = safeNext(form.next);
  const email = String(form.email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return c.html(pages.loginPage(next, "Enter a valid email address."), 400);
  if (config.instantLogin) {
    const user = await auth.userByEmail(email);
    await linkOnSignIn(user);
    await auth.startWebSession(c, user.id);
    return c.redirect(next);
  }
  if (!canSendMail) return c.html(pages.loginPage(next, "Sign-in email isn't set up on this server."), 503);
  if (!loginAllowed(clientIP(c))) return c.html(pages.loginPage(next, "Too many sign-in emails. Try again in a few minutes."), 429);
  const link = await auth.createLoginLink(email, next);
  // Too many links for this address: say the same thing, so the page doesn't reveal anything.
  if (link) {
    const m = pages.loginEmail(`${config.publicURL}/login/verify?token=${link.token}`, link.minutes);
    await sendMail({ to: email, ...m });
  }
  return c.html(pages.checkEmailPage(email));
});

// Mail scanners open links to check them, so opening the link only shows a button; the button signs in.
app.get("/login/verify", async (c) => {
  const t = c.req.query("token") ?? "";
  return (await auth.loginLinkValid(t)) ? c.html(pages.confirmLoginPage(t)) : c.html(pages.linkExpiredPage(), 410);
});

app.post("/login/verify", async (c) => {
  if (!auth.sameOrigin(c)) return c.text("Bad origin", 403);
  const r = await auth.useLoginLink(String((await c.req.parseBody()).token ?? ""));
  if (!r) return c.html(pages.linkExpiredPage(), 410);
  await linkOnSignIn(r.user);
  await auth.startWebSession(c, r.user.id);
  return c.redirect(safeNext(r.next));
});

app.post("/logout", async (c) => {
  if (!auth.sameOrigin(c)) return c.text("Bad origin", 403);
  await auth.endWebSession(c);
  const next = (await c.req.parseBody()).next;
  return c.redirect(typeof next === "string" && next.startsWith("/login") ? safeNext(next) : "/");
});

app.get("/device", async (c) => {
  const code = auth.normalizeCode(c.req.query("code") ?? "");
  const user = await auth.webUser(c);
  if (!user) return c.redirect(`/login?next=${encodeURIComponent(`/device?code=${code ?? ""}`)}`);
  const info = code ? await auth.deviceInfo(code) : null;
  if (!code || !info || info.approved) return c.html(pages.devicePage(user, code ?? "", null, "invalid"), 404);
  return c.html(pages.devicePage(user, code, info.name, "ask"));
});

app.post("/device", async (c) => {
  if (!auth.sameOrigin(c)) return c.text("Bad origin", 403);
  const user = await auth.webUser(c);
  if (!user) return c.redirect("/login");
  const code = auth.normalizeCode(String((await c.req.parseBody()).code ?? ""));
  const name = code ? (await auth.deviceInfo(code))?.name ?? null : null;
  const ok = code ? await auth.approveDevice(code, user.id) : false;
  // Tell the account's owner, so a code approved by mistake (or by phishing) doesn't go unnoticed.
  if (ok && canSendMail) sendMail({ to: user.email, ...pages.connectedEmail(name) }).catch((e) => console.error("mail:", e));
  return c.html(pages.devicePage(user, code ?? "", null, ok ? "done" : "invalid"), ok ? 200 : 404);
});

app.get("/account", async (c) => {
  const user = await auth.webUser(c);
  if (!user) return c.redirect("/login?next=/account");
  const billingState = { ...(await subscriptionState(user.id)), portal: portalURL(user) !== null, welcome: c.req.query("welcome") === "pro", deleted: c.req.query("deleted") === "1" };
  return c.html(pages.accountPage(user, await usage(user.id), limits(user.plan), await listShares(user.id), billingState, await auth.appSessions(user.id)));
});

/** Signs a Mac (or a script's token) out of this account. */
app.post("/account/macs/:id/revoke", async (c) => {
  if (!auth.sameOrigin(c)) return c.text("Bad origin", 403);
  const user = await auth.webUser(c);
  if (!user) return c.redirect("/login");
  await auth.revokeAppSession(user.id, c.req.param("id"));
  return c.redirect("/account#macs");
});

// MARK: Billing (branded Stripe Checkout, Payment Link fallback, webhook, no-code customer portal)

app.post("/stripe/webhook", webhook);

app.get("/upgrade", async (c) => {
  const user = await auth.webUser(c);
  if (!user) return c.redirect("/login?next=/upgrade");
  if (user.plan === "pro") return c.redirect("/account");
  return c.redirect((await createCheckoutURL(user)) ?? upgradeURL(user));
});

app.get("/billing", async (c) => {
  const user = await auth.webUser(c);
  if (!user) return c.redirect("/login?next=/billing");
  const url = portalURL(user);
  return url ? c.redirect(url) : c.redirect("/account");
});

app.get("/account/s/:id", async (c) => {
  const user = await auth.webUser(c);
  const id = c.req.param("id");
  if (!user) return c.redirect(`/login?next=/account/s/${encodeURIComponent(id)}`);
  const [own] = await sql`select 1 from shares where id = ${id} and user_id = ${user.id} and deleted_at is null`;
  const stats = own ? await shareStats(id, limits(user.plan).analytics) : null;
  if (!stats) return c.html(pages.notFoundPage(), 404);
  return c.html(pages.statsPage(user, stats));
});

app.post("/account/s/:id/delete", async (c) => {
  if (!auth.sameOrigin(c)) return c.text("Bad origin", 403);
  const user = await auth.webUser(c);
  if (!user) return c.redirect("/login");
  const ok = SHARE_ID.test(c.req.param("id")) && (await deleteShare(user, c.req.param("id")));
  return ok ? c.redirect("/account?deleted=1") : c.html(pages.notFoundPage(), 404);
});

/** How to report a hosted link (abuse, copyright). */
app.get("/report", (c) => c.html(pages.reportPage(SHARE_ID.test(c.req.query("link") ?? "") ? c.req.query("link")! : null)));

async function setPlan(userId: string, plan: unknown) {
  if (plan !== "free" && plan !== "pro") return false;
  await sql`update users set plan = ${plan as Plan} where id = ${userId}`;
  return true;
}

if (config.dev) {
  // Stand-in for billing while there is no payment provider.
  app.post("/dev/plan", async (c) => {
    if (!auth.sameOrigin(c)) return c.text("Bad origin", 403);
    const user = await auth.webUser(c);
    if (!user) return c.redirect("/login");
    await setPlan(user.id, (await c.req.parseBody()).plan);
    return c.redirect("/account");
  });
}

// MARK: App API

app.post("/api/device", async (c) => {
  if (!deviceAllowed(clientIP(c))) return fail(c, 429, "TooMany", "Too many sign-in attempts. Try again later.");
  const body = await c.req.json().catch(() => ({}));
  return c.json(await auth.startDevice(typeof body.name === "string" ? body.name : null));
});

app.post("/api/device/token", async (c) => {
  if (!pollAllowed(clientIP(c))) return fail(c, 429, "SlowDown", "Polling too fast.");
  const body = await c.req.json().catch(() => ({}));
  if (typeof body.deviceCode !== "string") return fail(c, 400, "BadRequest", "deviceCode is required.");
  const r = await auth.exchangeDevice(body.deviceCode);
  if (r.status === "pending") return fail(c, 428, "Pending", "Waiting for approval in the browser.");
  if (r.status === "expired") return fail(c, 410, "Expired", "The sign-in code expired. Start again.");
  return c.json({ token: r.token, email: r.user.email, plan: r.user.plan });
});

app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/device")) return next();
  const user = await auth.appUser(c);
  if (!user) return fail(c, 401, "SignedOut", "Sign in to Reelbird again.");
  c.set("user" as never, user as never);
  return next();
});
const me = (c: Context) => c.get("user" as never) as unknown as auth.User;

app.get("/api/me", async (c) => {
  const u = me(c);
  return c.json({ email: u.email, plan: u.plan, limits: limits(u.plan), usage: await usage(u.id), accountURL: `${config.publicURL}/account`,
                 upgradeURL: `${config.publicURL}/upgrade`, storage: storageInfo() });
});

app.post("/api/logout", async (c) => {
  await auth.revokeAppToken(c);
  return c.body(null, 204);
});

app.post("/api/shares/:id/credentials", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.slice(0, 300) : null;
  try {
    return c.json(await credentials(me(c), c.req.param("id"), title));
  } catch (e) {
    if (e instanceof ShareRefusal) return fail(c, e.status, e.code, e.message);
    throw e;
  }
});

app.post("/api/shares/:id/sync", async (c) => {
  if (!syncAllowed(me(c).id)) return fail(c, 429, "SlowDown", "Too many syncs. Try again later.");
  const ok = await syncShare(me(c), c.req.param("id"));
  return ok ? c.body(null, 204) : fail(c, 404, "NotFound", "No such link in this account.");
});

app.get("/api/shares", async (c) => {
  const rows = await listShares(me(c).id);
  return c.json(rows.map((s) => ({ id: s.id, title: s.title, url: `${config.publicURL}/r/${s.id}/`, createdAt: s.created_at, bytes: Number(s.bytes), views: s.views })));
});

app.get("/api/shares/:id/stats", async (c) => {
  const u = me(c);
  const id = c.req.param("id");
  const [own] = SHARE_ID.test(id) ? await sql`select 1 from shares where id = ${id} and user_id = ${u.id} and deleted_at is null` : [];
  const stats = own ? await shareStats(id, limits(u.plan).analytics) : null;
  if (!stats) return fail(c, 404, "NotFound", "No such link in this account.");
  return c.json({ ...stats, statsURL: `${config.publicURL}/account/s/${id}` });
});

app.delete("/api/shares/:id", async (c) => {
  const ok = await deleteShare(me(c), c.req.param("id"));
  return ok ? c.body(null, 204) : fail(c, 404, "NotFound", "No such link in this account.");
});

if (config.dev) {
  app.post("/api/dev/plan", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    return (await setPlan(me(c).id, body.plan)) ? c.body(null, 204) : fail(c, 400, "BadPlan", "plan is free or pro.");
  });
}

app.onError((e, c) => {
  console.error(e);
  return c.req.path.startsWith("/api/") ? fail(c, 500, "ServerError", "Something went wrong on our side.") : c.text("Something went wrong.", 500);
});

// MARK: Server

if (import.meta.main) {
  setInterval(() => measureRecent().catch((e) => console.error("measure:", e)), 5 * 60_000);
  setInterval(() => purgeDeleted().then(auth.cleanUp).catch((e) => console.error("purge:", e)), 5 * 60_000);
  const server = Bun.serve({ port: config.port, fetch: (req, srv) => app.fetch(req, { server: srv }) });
  console.log(`Reelbird Cloud on ${config.publicURL} (port ${server.port}${config.dev ? ", DEV" : ""}${billing.webhookSecret ? "" : ", billing off: no STRIPE_WEBHOOK_SECRET"})`);
}
