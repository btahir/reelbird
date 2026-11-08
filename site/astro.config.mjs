import { defineConfig, fontProviders } from "astro/config";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://reelbird.app";

// Writes dist/sitemap.xml from the pages the build produced: every index.html except 404 and
// pages marked noindex. No dependency, and it can't miss a page.
// <lastmod> is only written when the page states a real content date: the newest "dateModified"
// in its JSON-LD (docs from git, comparisons from the date their facts were checked). A build
// date on every page would tell crawlers nothing, so other pages leave it out.
const sitemap = () => ({
  name: "reelbird-sitemap",
  hooks: {
    "astro:build:done": ({ dir }) => {
      const root = fileURLToPath(dir);
      const urls = [];
      const walk = (d, rel) => {
        for (const e of readdirSync(d, { withFileTypes: true })) {
          if (e.isDirectory()) { if (!e.name.startsWith("_")) walk(join(d, e.name), `${rel}${e.name}/`); continue; }
          if (e.name !== "index.html") continue;
          const html = readFileSync(join(d, e.name), "utf8");
          if (/<meta name="robots" content="noindex"/.test(html)) continue;
          const dates = [...html.matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]).sort();
          urls.push({ path: `/${rel}`, lastmod: dates.at(-1) });
        }
      };
      walk(root, "");
      const prio = (u) => (u === "/" ? "1.0" : /^\/(download|pricing|features|docs|[a-z-]+-alternative|compare|open-source-screen-recorders-mac)\/$/.test(u) ? "0.8" : "0.6");
      const entry = ({ path, lastmod }) => `  <url><loc>${SITE}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>${prio(path)}</priority></url>`;
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.sort((a, b) => a.path.localeCompare(b.path)).map(entry).join("\n")}\n</urlset>\n`;
      writeFileSync(join(root, "sitemap.xml"), xml);
    },
  },
});

// Static output: every page is an HTML file in dist/, so any static host can serve it.
export default defineConfig({
  site: SITE,
  integrations: [sitemap()],
  output: "static",
  trailingSlash: "always",
  // Reelbird 0.2.3 and older link to /support/ from the app; donations gave way to Pro.
  redirects: { "/support/": "/pricing/" },
  build: { format: "directory", inlineStylesheets: "always" },
  compressHTML: true,
  devToolbar: { enabled: false },
  prefetch: false,
  markdown: {
    shikiConfig: { themes: { light: "github-light-high-contrast", dark: "github-dark-dimmed" }, defaultColor: false },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Fraunces",
      cssVariable: "--font-display",
      fallbacks: ["Georgia", "serif"],
      options: {
        variants: [{ src: ["./src/assets/fonts/fraunces-var.woff2"], weight: "400 650", style: "normal", display: "swap" }],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Instrument Sans",
      cssVariable: "--font-sans",
      fallbacks: ["system-ui", "sans-serif"],
      options: {
        variants: [
          { src: ["./src/assets/fonts/instrument-sans-var.woff2"], weight: "400 700", style: "normal", display: "swap" },
          { src: ["./src/assets/fonts/instrument-sans-italic.woff2"], weight: "400", style: "italic", display: "swap" },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Commit Mono",
      cssVariable: "--font-mono",
      fallbacks: ["ui-monospace", "monospace"],
      options: {
        variants: [{ src: ["./src/assets/fonts/commit-mono-400.woff2"], weight: "400", style: "normal", display: "swap" }],
      },
    },
  ],
});
