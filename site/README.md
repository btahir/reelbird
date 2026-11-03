# reelbird.app

The Reelbird website: a static [Astro](https://astro.build) site with no UI framework and a few
small inline scripts (theme toggle, copy buttons, video loading).

## Develop

```sh
cd site
bun install
bun run dev        # http://localhost:4321
bun run build      # writes dist/
bun run preview    # serves dist/
```

`bun run dev` and `bun run build` first run `scripts/sync-docs.mjs`, which copies the repo's
`README.md` and `docs/*.md` into `src/content/docs/`. Commit those copies: when only `site/` is
uploaded (no `../docs`), the build uses them and says so.

## Deploy

`bun run build` writes a fully static site to `dist/`: one `<page>/index.html` per page, a
`404.html`, and fingerprinted assets in `/_astro/`. Upload `dist/` to any static host
(Cloudflare Pages, Netlify, GitHub Pages, an S3 bucket, nginx).

- **Trailing slashes:** every canonical URL ends in `/`, so the host should redirect `/download`
  to `/download/` (most do by default) and serve `404.html` with status 404.
- **Caching:** `/_astro/*` is safe to cache for a year. Revalidate everything else (`/media`,
  `/og`, favicons, `sitemap.xml`, `llms.txt`).
- **Env:** none required. `PUBLIC_UMAMI_WEBSITE_ID` is optional (see Analytics below).
- **Build time:** about 6 s cold on an M-series Mac, most of it image optimisation; about 1 s warm.

The official site runs on [ShipTiffin](https://shiptiffin.com), which serves the prebuilt `dist/`.

## Where things live

| What | Where |
|---|---|
| Site URL, GitHub URL, version, requirements, **Stripe links**, launch video, prebuilt download switch | `src/config/site.ts` (the only file with Stripe URLs) |
| FAQ (page and `FAQPage` JSON-LD) | `src/data/faq.ts` |
| Competitor facts, with sources and the date checked | `src/data/compare.ts` |
| Release notes (page and RSS) | `src/data/changelog.ts` |
| Design tokens (paper and ink themes) | `src/styles/global.css` |
| Fonts (Fraunces, Instrument Sans, Commit Mono; OFL, subset woff2) | `src/assets/fonts/`, registered in `astro.config.mjs` |
| Screenshots and illustrations (copies of `brand/`) | `src/assets/shots/`, `src/assets/illustrations/` |
| Hero clip and auto-zoom loop | `public/media/` |
| Open Graph images (1200×630, committed) | `public/og/`, rendered by `scripts/og.sh` |
| `llms.txt`, `llms-full.txt`, `robots.txt`, RSS | `src/pages/*.ts` endpoints |
| `sitemap.xml` | written after the build by the small integration in `astro.config.mjs` |

### Launch video

Set `LAUNCH_VIDEO.url` in `src/config/site.ts` to an MP4 URL (`kind: "file"`) or an embed URL
such as `https://www.youtube-nocookie.com/embed/<id>` (`kind: "embed"`), then rebuild. Until
then the home page shows a poster and says the video is on its way.

### Prebuilt download

`PREBUILT.enabled` is `false`. When a release zip from `scripts/dist.sh` is on GitHub Releases,
check `PREBUILT.url` and `PREBUILT.note`, set `enabled: true` and rebuild. `/download` then shows
it above the build-from-source steps.

### Open Graph images

They are plain PNGs, so the build needs no browser. After changing a page title, re-render them
from a full checkout (needs Chrome or Chromium; `pngquant` is used when installed):

```sh
site/scripts/og.sh
```

The template is `brand/src/og.html`. Each page names its image with the `og` prop of its layout.

## Analytics (optional)

Set `PUBLIC_UMAMI_WEBSITE_ID` (and optionally `PUBLIC_UMAMI_SCRIPT`) in `site/.env` or the build environment to add
cookieless [Umami](https://umami.is) page counts. Without it the site ships no Umami script.

The ShipTiffin box that hosts the site counts page views itself, with no script. On `reelbird.app` only, the
pages also load its cookieless script (`https://t.shiptiffin.app/script.js`) and send every click marked
`data-umami-event` to it with `tiffin.track()`, under the same event name, so `tiffin analytics events` sees the
download and Pro clicks. On any other host (a fork, `localhost`) nothing loads. `PUBLIC_TIFFIN_SCRIPT=""` at build
time leaves it out.
