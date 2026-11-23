// Stripe billing without an SDK. /upgrade opens a Reelbird-branded Checkout Session ($5/month Pro) made
// with a restricted key (STRIPE_SECRET_KEY, Checkout Sessions write): the Stripe account is shared, and a
// Payment Link would show the account's own name. Without the key, or when Stripe errors, /upgrade uses
// the Pro Payment Link instead. Stripe's webhooks tell us who pays, and Stripe's no-code customer portal
// handles cancelling.
//
// Pro = an active (or trialing) subscription to the Reelbird Pro product. Nothing else on the Stripe
// account (the open-source support tiers, other apps) grants or changes anything here.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Context } from "hono";
import postgres from "postgres";
import { asset } from "./assets";
import { config } from "./config";
import { sql } from "./db";

/** The pool, or the transaction a webhook runs in. */
type Q = postgres.Sql | postgres.TransactionSql;

export const billing = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || null,
  /** Restricted key for creating branded Checkout Sessions. Without it, /upgrade uses the Payment Link. */
  secretKey: process.env.STRIPE_SECRET_KEY?.trim() || null,
  /** The $5/month Reelbird Pro price. */
  proPrice: process.env.STRIPE_PRO_PRICE?.trim() || "price_1USVjUBbj7zje3qWrQ56SdEO",
  /** Payment Link for Pro. Gets ?client_reference_id=<account id>&prefilled_email=… appended. */
  proLink: process.env.STRIPE_PRO_LINK?.trim() || "https://buy.stripe.com/5kQ8wO88gaXs9h57Yn3ks05",
  /** The same link's ID: only its checkouts link a Stripe customer to an account. */
  proLinkId: process.env.STRIPE_PRO_LINK_ID?.trim() || "plink_1USVjtBbj7zje3qW3ZISlMYw",
  /** The Reelbird Pro product: only subscriptions to it count. */
  proProduct: process.env.STRIPE_PRO_PRODUCT?.trim() || "prod_VTSee5NkgzYUpl",
  /** Stripe's no-code customer portal login link (Settings › Billing › Customer portal). */
  portalLink: process.env.STRIPE_PORTAL_LINK?.trim() || "https://billing.stripe.com/p/login/9B68wOewEaXsgJxdiH3ks01",
};

const PAYING = new Set(["active", "trialing"]);

/** Verifies a `Stripe-Signature` header (v1 = HMAC-SHA256 of "<t>.<payload>"), within 5 minutes. */
export function verifySignature(payload: string, header: string | undefined, secret: string, now = Date.now()) {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return parts.some(([k, v]) => {
    if (k !== "v1" || !v) return false;
    const got = Buffer.from(v, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/** Signs a payload like Stripe does (tests and local tooling). */
export function signPayload(payload: string, secret: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
}

export function qualifies(s: { status: string; product_id: string | null }) {
  return PAYING.has(s.status) && s.product_id === billing.proProduct;
}

/** Sets the plan of whoever owns this Stripe customer from their subscriptions. */
async function recompute(customerId: string, q: Q = sql) {
  const subs = await q<{ status: string; product_id: string | null }[]>`
    select status, product_id from subscriptions where customer_id = ${customerId}`;
  const pro = subs.some(qualifies);
  await q`update users set plan = ${pro ? "pro" : "free"} where stripe_customer_id = ${customerId}`;
}

type Obj = Record<string, any>;

// Two events in the same second: the later stage of a subscription's life wins.
const RANKS: Record<string, number> = { incomplete: 0, trialing: 1, active: 2, past_due: 3, unpaid: 4, paused: 4, canceled: 5, incomplete_expired: 5 };
const rank = (status: string) => RANKS[status] ?? 0;

async function upsertSubscription(q: Q, s: Obj, eventAt: Date) {
  const items: Obj[] = s.items?.data ?? [];
  const item = items.find((i) => (i.price?.product ?? i.plan?.product) === billing.proProduct);
  if (!item) return; // not Reelbird Pro (a donation tier, another app): none of our business
  const price = item.price ?? item.plan ?? {};
  const amount = Number(price.unit_amount ?? price.amount ?? 0) * Number(item.quantity ?? s.quantity ?? 1);
  // API 2025-03-31 moved current_period_end onto subscription items.
  const end = item.current_period_end ?? s.current_period_end;
  // An event older than the one this row came from is stale (Stripe doesn't promise order): skip it.
  await q`
    insert into subscriptions (id, customer_id, product_id, status, amount, currency, interval, current_period_end, event_at, updated_at)
    values (${s.id}, ${s.customer}, ${billing.proProduct}, ${s.status}, ${amount}, ${price.currency ?? "usd"},
            ${price.recurring?.interval ?? price.interval ?? "month"}, ${end ? new Date(end * 1000) : null}, ${eventAt}, now())
    on conflict (id) do update set customer_id = excluded.customer_id, product_id = excluded.product_id, status = excluded.status,
      amount = excluded.amount, currency = excluded.currency, interval = excluded.interval,
      current_period_end = excluded.current_period_end, event_at = excluded.event_at, updated_at = now()
    where subscriptions.event_at is null or subscriptions.event_at < excluded.event_at
       or (subscriptions.event_at = excluded.event_at and ${rank(s.status)} >= (case subscriptions.status
         when 'trialing' then 1 when 'active' then 2 when 'past_due' then 3 when 'unpaid' then 4 when 'paused' then 4
         when 'canceled' then 5 when 'incomplete_expired' then 5 else 0 end))`;
  await recompute(s.customer, q);
}

/** A checkout from /upgrade: our branded session (metadata.app "reelbird") or the Pro Payment Link. */
export function isProCheckout(session: Obj) {
  if (session.payment_link) return session.payment_link === billing.proLinkId;
  return session.metadata?.app === "reelbird";
}

/** Links the paying customer to the account that started checkout. */
async function checkoutCompleted(q: Q, session: Obj) {
  if (session.mode !== "subscription" || typeof session.customer !== "string") return;
  if (!isProCheckout(session)) return; // only our Checkout Sessions and the Reelbird Pro link
  const ref = typeof session.client_reference_id === "string" && /^[0-9a-f-]{36}$/i.test(session.client_reference_id)
    ? session.client_reference_id : null;
  const email = (session.customer_details?.email ?? session.customer_email ?? "").toLowerCase() || null;
  await q`insert into stripe_customers (customer_id, email) values (${session.customer}, ${email})
            on conflict (customer_id) do update set email = coalesce(excluded.email, stripe_customers.email)`;
  const [user] = ref
    ? await q<{ id: string }[]>`select id from users where id = ${ref}`
    : email ? await q<{ id: string }[]>`select id from users where email = ${email}` : [];
  if (!user) return; // paid before having an account: linkOnSignIn() picks it up
  // The checkout's email isn't verified: anyone can type yours into the public link. Matched by email
  // only, it may link an account that has no customer yet, but never replace an existing one.
  // client_reference_id comes from /upgrade, signed in, so that match may.
  if (!ref) {
    const linked = await q`update users set stripe_customer_id = ${session.customer} where id = ${user.id} and stripe_customer_id is null returning 1`;
    if (!linked.length) return;
  } else {
    await q`update users set stripe_customer_id = null where stripe_customer_id = ${session.customer} and id <> ${user.id}`;
    await q`update users set stripe_customer_id = ${session.customer} where id = ${user.id}`;
  }
  // The subscription event can arrive before or after this one. If it hasn't yet, count the paid
  // checkout for now (a 100%-off code is paid too: "no_payment_required"); the subscription event replaces it.
  if (typeof session.subscription === "string") {
    await q`
      insert into subscriptions (id, customer_id, product_id, status, amount, currency, interval)
      values (${session.subscription}, ${session.customer}, ${billing.proProduct}, ${session.payment_status === "paid" || session.payment_status === "no_payment_required" ? "active" : "incomplete"},
              ${Number(session.amount_total ?? 0)}, ${session.currency ?? "usd"}, 'month')
      on conflict (id) do nothing`;
  }
  await recompute(session.customer, q);
}

export async function webhook(c: Context) {
  if (!billing.webhookSecret) return c.text("Billing isn't configured.", 503);
  const payload = await c.req.text();
  if (!verifySignature(payload, c.req.header("stripe-signature"), billing.webhookSecret)) return c.text("Bad signature", 400);
  const event = JSON.parse(payload) as { id: string; type: string; created?: number; data: { object: Obj } };
  const eventAt = new Date((typeof event.created === "number" ? event.created : Date.now() / 1000) * 1000);
  // Recording the event and applying it commit together: if either fails (or the process dies),
  // neither happened and Stripe's retry does the whole thing again.
  const duplicate = await sql.begin(async (tx) => {
    const fresh = await tx`insert into stripe_events (id) values (${event.id}) on conflict do nothing returning 1`;
    if (!fresh.length) return true;
    const o = event.data.object;
    switch (event.type) {
      case "checkout.session.completed":
        await checkoutCompleted(tx, o);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        await upsertSubscription(tx, o, eventAt);
        break;
    }
    return false;
  });
  return c.json(duplicate ? { received: true, duplicate: true } : { received: true });
}

/** Links a Pro payment made with this email before the account existed (or before it was linked). */
export async function linkOnSignIn(user: { id: string; email: string }) {
  const [c] = await sql<{ customer_id: string }[]>`
    select sc.customer_id from stripe_customers sc
    where sc.email = ${user.email} and not exists (select 1 from users u where u.stripe_customer_id = sc.customer_id)
    order by sc.created_at desc limit 1`;
  if (!c) return;
  await sql`update users set stripe_customer_id = ${c.customer_id} where id = ${user.id} and stripe_customer_id is null`;
  await recompute(c.customer_id);
}

/** Pinned so the request shape doesn't follow the account's default API version. */
const STRIPE_VERSION = "2026-11-18.endive";

/** The form body for POST /v1/checkout/sessions: Pro for this account, with Reelbird's name, icon and coral button. */
export function checkoutParams(user: { id: string; email: string }) {
  return new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": billing.proPrice,
    "line_items[0][quantity]": "1",
    client_reference_id: user.id,
    customer_email: user.email,
    allow_promotion_codes: "true",
    payment_method_collection: "if_required",
    success_url: `${config.publicURL}/account?welcome=pro&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.publicURL}/account`,
    "metadata[app]": "reelbird",
    "metadata[plan]": "pro",
    "subscription_data[metadata][app]": "reelbird",
    "subscription_data[metadata][plan]": "pro",
    "branding_settings[display_name]": "Reelbird",
    "branding_settings[icon][type]": "url",
    "branding_settings[icon][url]": `${config.publicURL}${asset("icon-512.png")}`,
    "branding_settings[button_color]": "#ff5a36",
    "branding_settings[background_color]": "#ff5a36",
  });
}

/** A branded Checkout Session URL for this account, or null (no key, or Stripe said no): use upgradeURL then. */
export async function createCheckoutURL(user: { id: string; email: string }, fetchImpl: typeof fetch = fetch) {
  if (!billing.secretKey) return null;
  try {
    const res = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { authorization: `Bearer ${billing.secretKey}`, "content-type": "application/x-www-form-urlencoded", "stripe-version": STRIPE_VERSION },
      body: checkoutParams(user),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json().catch(() => null)) as { url?: unknown; error?: { code?: string; type?: string } } | null;
    if (res.ok && typeof body?.url === "string") return body.url;
    console.error(`[billing] checkout session failed: ${res.status} ${body?.error?.code ?? body?.error?.type ?? "unknown"}`);
  } catch (e) {
    console.error(`[billing] checkout session failed: ${e instanceof Error ? e.name : "error"}`);
  }
  return null;
}

/** The Payment Link for an account, so the payment is linked to it (the fallback for createCheckoutURL). */
export function upgradeURL(user: { id: string; email: string }) {
  const u = new URL(billing.proLink);
  u.searchParams.set("client_reference_id", user.id);
  u.searchParams.set("prefilled_email", user.email);
  return u.toString();
}

export function portalURL(user: { email: string }) {
  if (!billing.portalLink) return null;
  const u = new URL(billing.portalLink);
  u.searchParams.set("prefilled_email", user.email);
  return u.toString();
}

/**
 * Whether this account has a Stripe subscription to manage (vs. a plan set by hand in development),
 * including one whose payment failed: that person needs the billing page most.
 */
export async function subscriptionState(userId: string) {
  const [r] = await sql<{ n: number; failing: number }[]>`
    select count(*)::int as n, count(*) filter (where s.status in ('past_due', 'unpaid', 'incomplete'))::int as failing
    from subscriptions s join users u on u.stripe_customer_id = s.customer_id
    where u.id = ${userId} and s.status in ('active', 'trialing', 'past_due', 'unpaid', 'incomplete')`;
  return { subscribed: r.n > 0, paymentFailed: r.failing > 0 };
}
