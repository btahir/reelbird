# Reelbird Cloud

Reelbird Pro: hosted share links and view analytics, $5/month. Optional: sharing to your own bucket stays free and needs none of this.

- **Links** live in one private R2 bucket. The server serves the viewer page at `<PUBLIC_URL>/r/<id>/` and redirects video, segments and images to short-lived signed R2 URLs, so video bytes go straight from R2 to the viewer.
- **Uploaded HTML never runs here.** The app uploads an `index.html` (it's what your own bucket serves), but this server renders the page itself from the share's `meta.json`, checked field by field, with every URL pointing back at this server (`src/viewer.ts`). The template is the app's own, copied by `bun scripts/sync-viewer.ts` into `src/viewer-template.ts`; a test fails if they drift. The page has a nonce CSP. Playlists and captions are served with fixed content types and an inert CSP.
- **Uploads** come from the app, using the same code as for your own bucket. The server hands out R2 temporary keys limited to one share's folder (`r/<id>/`), valid for an hour and signed locally.
- **Analytics** come from `/e.js`, which the server adds to the viewer page. It has no cookies. A viewer is a daily hash of IP, browser and link. It records views, unique viewers, a retention curve (2-second chunks), sources and devices. The owner's own views and link-preview bots don't count.
- **Pro only.** Hosted links need Reelbird Pro ($5/month): unlimited links, 100 GB and full analytics. There is no free hosted tier; sharing to your own bucket is the free option. An account without Pro can sign in and pay, and its existing links keep playing. An upload that was in progress (touched in the last day) may finish, but it can't create or update links. In development, `/dev/plan` (or `reelbird cloud plan pro`) switches Pro on and off.
- **Billing** uses one Stripe product and one link, with no SDK and no secret key:
  - `/upgrade` sends a signed-in person to the Reelbird Pro Payment Link (`STRIPE_PRO_LINK`, default `buy.stripe.com/5kQ8wO88gaXs9h57Yn3ks05`, ID `plink_1USVjtBbj7zje3qW3ZISlMYw`). The link is tagged with `client_reference_id` and `prefilled_email`, and after payment it returns to `https://watch.reelbird.app/account?welcome=pro`.
  - For revenue attribution, that redirect should be `https://watch.reelbird.app/account?welcome=pro&session_id={CHECKOUT_SESSION_ID}` (Dashboard › Payment Links › Reelbird Pro › After payment; Stripe fills in the id). Tiffin's analytics, connected to Stripe, credits a payment to the visit that comes back to one of the project's pages with `?session_id=cs_…`, so the payment gets that visit's source, first page and country. It can't use `client_reference_id`: it only matches ids of Tiffin sign-in accounts, and ours are our own. `/account` answers the return with the page itself (a redirect wouldn't count as a page view); a test checks it.
  - `POST /stripe/webhook` (signed with `STRIPE_WEBHOOK_SECRET`) only acts on checkouts from that link and on subscriptions to the Reelbird Pro product (`prod_VTSee5NkgzYUpl`, $5/month price `price_1USVjUBbj7zje3qWrQ56SdEO`). The account is Pro while that subscription is active or trialing. The open-source support tiers and anything else on the Stripe account are ignored.
  - Someone who pays through the link before having an account gets Pro when they sign in with the same email.
  - `/billing` opens Stripe's no-code customer portal (`STRIPE_PORTAL_LINK`).
- **Sign-in:** the app and CLI use a device code. The person approves it in the browser and the app receives a token (only its SHA-256 is stored).
  - The browser signs in with an emailed link that works once, for 15 minutes. Opening the link shows a button, and only the button signs in, so mail scanners can't use it up.
  - There's a limit of 5 links per address per 15 minutes, and 10 sign-in emails per IP per hour.
  - Mail goes through the Tiffin box's relay (SendGrid) using the `SMTP_URL` and `EMAIL_FROM` that Tiffin provides, sent as `reelbird@shiptiffin.com`.
  - In development, `/login` signs you in at once. `DEV_INSTANT_LOGIN=0` together with `MAIL_CAPTURE=1` tests the email path, and the test suite does this.

## Run locally

```sh
cd cloud
bun install
scripts/db.sh start          # Postgres 18 in cloud/.pgdata, port 54329
bun run migrate
bun scripts/setup-r2.ts      # creates the bucket (private) and its CORS rule, once
bun run dev                  # http://localhost:8788
```

`cloud/.env` (gitignored) needs:

```
DATABASE_URL=postgres://postgres@127.0.0.1:54329/reelbird_cloud
PUBLIC_URL=http://localhost:8788
PORT=8788
DEV=1
STATS_SECRET=<random hex>
R2_ACCOUNT_ID=…
R2_ACCESS_KEY_ID=…
R2_SECRET_ACCESS_KEY=…
R2_BUCKET=reelbird-cloud-dev
```

Then, from the repo root (with `export REELBIRD_CLOUD_URL=http://localhost:8788`):

```sh
.build/debug/reelbird cloud login        # approve the code in the browser
.build/debug/reelbird record --synthetic --duration 12 --share --mic none --no-system-audio
.build/debug/reelbird cloud links
.build/debug/reelbird cloud stats <share id>
```

The app's Settings › Sharing has a Reelbird Cloud tab that does the same sign-in. Set `REELBIRD_CLOUD_URL=http://localhost:8788` for the app and CLI to show Cloud and use the local server; without it, Cloud stays hidden until launch.

## Tests

```sh
bun run check   # TypeScript
bun test        # end to end against the dev bucket and reelbird_cloud_test
```

## Operating it

- **Deleting** a link stops it at once; its files and view records are purged, retried every 5 minutes until R2 confirms, and purged once more after any upload keys have expired.
- **Reports** come to `hello@reelbird.app` from `/report` and the Report link on every hosted page. `bun scripts/admin.ts takedown <id>` removes a link; `bun scripts/admin.ts delete-account <email>` handles an account deletion request (cancel the subscription in Stripe first). Both need the production `DATABASE_URL` and `R2_*`.
- **Billing**: each webhook's dedupe record and its effects commit in one transaction, and a subscription event older than the one already stored is ignored.
- **Health**: `/healthz` (process up) and `/readyz` (database answers).

## Before launch

- **Launch switches.** `CloudSettings.launched` (`Sources/ReelbirdShare/Cloud.swift`) shows Reelbird Cloud in the app and CLI; it is on since the server went live at `https://watch.reelbird.app`. `PRO.launched` (`site/src/config/site.ts`) adds the Pro section to /support.

- **R2 key.** Replace the dev key with an R2 token limited to the hosted bucket (Object Read & Write). The temporary keys can never exceed their parent key's access.
- **Email** is done: links are sent from `reelbird@shiptiffin.com` through the box's SendGrid relay, with no key of our own. A `hello@reelbird.app` sender later is one `tiffin email sending-domain set reelbird --domain reelbird.app` plus the DNS records it lists.
- **Stripe** is set up in live mode:
  - A webhook endpoint (`we_1USXBdBbj7zje3qWfYSRjLgB`) sends `checkout.session.completed` and `customer.subscription.*` to `https://watch.reelbird.app/stripe/webhook`. Its signing secret is in `notes/deploy/cloud-prod.env` (gitignored) and goes in `STRIPE_WEBHOOK_SECRET`.
  - A customer portal configuration "Reelbird Pro" (`bpc_1USXBVBbj7zje3qWnSI9LyWF`) allows cancel at period end, card updates and invoices. Its login link is the default `STRIPE_PORTAL_LINK`.
  - The Pro Payment Link is live but unused until launch. Deactivate it in the Dashboard if it shouldn't take payments before then.
  - For local tests: `stripe listen --forward-to localhost:8788/stripe/webhook` in test mode.
  - `/dev/plan` only exists with `DEV=1`.
- **Legal.** Done: [terms](https://reelbird.app/terms/), [privacy](https://reelbird.app/privacy/), report link and takedown script.
- **Deploy.** Add this as an app in the `reelbird` Tiffin project on its own host, e.g. `watch.reelbird.app`. That's an A record at Namecheap, like the site, so no Cloudflare DNS is needed because the bucket is never public. Set the release command to `bun run migrate`, use Tiffin Postgres for `DATABASE_URL` and Valkey for the event rate limit, and run `measureRecent` from a cron instead of `setInterval`. Then point `CloudSettings.defaultServer` at the production URL.
- **Country.** Countries need a GeoIP lookup (DB-IP Lite, as Tiffin's analytics uses). Today they're empty unless a proxy sends `cf-ipcountry`.
