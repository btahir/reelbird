// Server settings from the environment. Bun loads cloud/.env in development.
function need(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}. See cloud/README.md.`);
  return v;
}

/** Self-hosted Umami page analytics (same website id as reelbird.app). Nothing is rendered when the id is unset. */
export const UMAMI_ORIGIN = "https://project-analytics.shiptiffin.app";
const umamiId = process.env.PUBLIC_UMAMI_WEBSITE_ID?.trim() ?? "";

export const config = {
  umamiWebsiteId: /^[0-9a-f-]{36}$/i.test(umamiId) ? umamiId : "",
  port: Number(process.env.PORT ?? 8788),
  /** Origin that serves the viewer and the API, e.g. https://watch.reelbird.app. No trailing slash. */
  publicURL: need("PUBLIC_URL").replace(/\/+$/, ""),
  databaseURL: need("DATABASE_URL"),
  /** Development conveniences: switch plans by hand, and sign in without email. Never set in production. */
  dev: process.env.DEV === "1",
  /** Development: /login signs in at once instead of emailing a link (DEV_INSTANT_LOGIN=0 tests the email path). */
  instantLogin: process.env.DEV === "1" && process.env.DEV_INSTANT_LOGIN !== "0",
  /** Country from a proxy header (cf-ipcountry): only when a proxy we run sets it. Off: viewers could fake it. */
  trustCountryHeader: process.env.TRUST_COUNTRY_HEADER === "1",
  /** Salts the daily viewer hash. */
  statsSecret: need("STATS_SECRET"),
  r2: {
    accountId: need("R2_ACCOUNT_ID"),
    accessKeyId: need("R2_ACCESS_KEY_ID"),
    secretAccessKey: need("R2_SECRET_ACCESS_KEY"),
    bucket: need("R2_BUCKET"),
  },
};

/**
 * What each plan allows. Hosted links are Pro only; "free" means no subscription (signed in, not
 * paying: it can pay, and its existing links keep playing, but it can't create new ones).
 */
export const plans = {
  free: { activeLinks: 0, storageBytes: 0, analytics: false },
  pro: { activeLinks: Infinity, storageBytes: 100e9, analytics: true },
} as const;
export type Plan = keyof typeof plans;
