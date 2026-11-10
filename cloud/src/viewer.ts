// The viewer page for hosted links, rendered here from the share's meta.json.
//
// The app uploads an index.html too (it's what a link to your own bucket serves), but this server
// never sends uploaded HTML: watch.reelbird.app also hosts sign-in and accounts, so a page written by
// one account must not run as this origin for another. Instead the meta is checked field by field,
// its URLs are replaced with this server's, and the page is filled from the same template the app
// uses (src/viewer-template.ts, generated from ViewerPage.swift). It's served with a CSP whose nonce
// covers only this page's own scripts.
import { config, UMAMI_ORIGIN } from "./config";
import { HLS_SRI, HLS_URL, VIEWER_TEMPLATE } from "./viewer-template";

export { HLS_URL };

export type Meta = {
  version: number;
  id: string;
  title: string;
  status: "recording" | "processing" | "ready";
  createdAt: string;
  updatedAt: string;
  duration?: number;
  pageURL: string;
  baseURL: string;
  hls?: string;
  video?: string;
  videoBytes?: number;
  width?: number;
  height?: number;
  poster?: string;
  card?: string;
  captions?: string;
  captionsLanguage?: string;
  chapters: { time: number; title: string }[];
  revision: number;
  /** The step guide: the page's Guide and Click-through views. */
  guide?: { steps: GuideStep[] };
  /** The text layer for Copy text: "text.<rev>.json". */
  text?: string;
};

export const STEP_KINDS = ["click", "doubleClick", "rightClick", "drag", "type", "shortcut", "key"] as const;

/** One guide step, as the page shows it (ViewerMeta.Guide.Step in the app). */
export type GuideStep = {
  id: string;
  n: number;
  /** Output seconds: "Play from here". */
  t: number;
  kind: (typeof STEP_KINDS)[number];
  text: string;
  note?: string;
  section?: string;
  /** "steps.<rev>/NN.jpg" and its pixel size. */
  image?: string;
  w?: number;
  h?: number;
  /** Where the pointer acted, normalized to the image. Absent for key steps. */
  x?: number;
  y?: number;
  box?: { x: number; y: number; width: number; height: number };
  keys?: string;
};

// Asset names are paths inside the share folder: "hls/index.m3u8", "video.3.mp4". Never URLs.
const ASSET = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}(\/[A-Za-z0-9][A-Za-z0-9._-]{0,80}){0,2}$/;
/** The text layer is a file at the folder root: "text.3.json". */
export const TEXT_LAYER = /^text\.\d+\.json$/;
const MAX_STEPS = 300;
const asset = (v: unknown) => (typeof v === "string" && ASSET.test(v) && !v.includes("..") ? v : undefined);
const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : undefined);
const int = (v: unknown, max: number) => { const n = num(v, max); return n === undefined ? undefined : Math.trunc(n); };
const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
const date = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString().replace(/\.\d{3}Z$/, "Z") : undefined);
/** A finite number clamped to 0…1 (a position normalized to the step image). */
const unit = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : undefined);
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export const shareURL = (id: string) => `${config.publicURL}/r/${id}/`;

/** One step, checked field by field; null drops it (a malformed step never fails the page). */
function guideStep(raw: unknown): GuideStep | null {
  if (!isObject(raw)) return null;
  const id = text(raw.id, 40), n = int(raw.n, 1e6), t = num(raw.t, 1e6), body = text(raw.text, 500);
  const kind = STEP_KINDS.find((k) => k === raw.kind);
  if (id === undefined || n === undefined || t === undefined || body === undefined || !kind) return null;
  const step: GuideStep = { id, n, t, kind, text: body };
  const note = text(raw.note, 1000), section = text(raw.section, 200), keys = text(raw.keys, 40), image = asset(raw.image);
  if (note !== undefined) step.note = note;
  if (section !== undefined) step.section = section;
  if (image !== undefined) step.image = image;
  const w = int(raw.w, 16384), h = int(raw.h, 16384);
  if (w) step.w = w;
  if (h) step.h = h;
  const x = unit(raw.x), y = unit(raw.y);
  if (x !== undefined && y !== undefined) { step.x = x; step.y = y; }
  if (isObject(raw.box)) {
    const b = { x: unit(raw.box.x), y: unit(raw.box.y), width: unit(raw.box.width), height: unit(raw.box.height) };
    if (b.x !== undefined && b.y !== undefined && b.width !== undefined && b.height !== undefined) {
      step.box = { x: b.x, y: b.y, width: b.width, height: b.height };
    }
  }
  if (keys !== undefined) step.keys = keys;
  return step;
}

function guide(raw: unknown): Meta["guide"] {
  if (!isObject(raw) || !Array.isArray(raw.steps)) return undefined;
  const steps = raw.steps.slice(0, MAX_STEPS).flatMap((s) => guideStep(s) ?? []);
  return steps.length ? { steps } : undefined;
}

const textLayer = (v: unknown) => { const name = asset(v); return name && TEXT_LAYER.test(name) ? name : undefined; };

/** Uploaded meta.json → a Meta that only names files in this share and only points at this server. */
export function sanitizeMeta(raw: unknown, id: string): Meta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  const status = m.status === "recording" || m.status === "processing" || m.status === "ready" ? m.status : "ready";
  const now = new Date().toISOString();
  const chapters = Array.isArray(m.chapters)
    ? m.chapters.slice(0, 200).flatMap((c) => {
        const time = num((c as { time?: unknown })?.time, 1e6), title = text((c as { title?: unknown })?.title, 200);
        return time === undefined || title === undefined ? [] : [{ time, title }];
      })
    : [];
  const lang = text(m.captionsLanguage, 35);
  return {
    version: 1,
    id,
    title: text(m.title, 300) ?? "",
    status,
    createdAt: date(m.createdAt) ?? now,
    updatedAt: date(m.updatedAt) ?? now,
    duration: num(m.duration, 1e6),
    pageURL: shareURL(id),
    baseURL: shareURL(id),
    hls: asset(m.hls),
    video: asset(m.video),
    videoBytes: int(m.videoBytes, 1e13),
    width: int(m.width, 16384) || undefined,
    height: int(m.height, 16384) || undefined,
    poster: asset(m.poster),
    card: asset(m.card),
    captions: asset(m.captions),
    captionsLanguage: lang && /^[A-Za-z0-9-]+$/.test(lang) ? lang : undefined,
    chapters,
    revision: int(m.revision, 1e9) ?? 0,
    guide: guide(m.guide),
    text: textLayer(m.text),
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const named = (n: string, c: string) => `<meta name="${n}" content="${esc(c)}">`;
const property = (p: string, c: string) => `<meta property="${p}" content="${esc(c)}">`;

function formatDuration(s: number) {
  const t = Math.round(Math.max(0, s));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
}
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Replaces each {{NAME}} once, without looking inside inserted values (like ViewerPage.fill). */
function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (all, k: string) => (k in values ? values[k]! : all));
}

/** Same output as ViewerPage.html(meta) in the app, plus the analytics script and a CSP nonce. */
export function renderViewer(meta: Meta, nonce: string) {
  const title = meta.title || "Untitled recording";
  const url = (name?: string) => (name ? meta.baseURL + name : undefined);
  const duration = meta.duration !== undefined ? formatDuration(meta.duration) : undefined;
  const image = url(meta.poster) ?? url(meta.card);
  const description = meta.status === "recording"
    ? "A screen recording in progress. Open to watch."
    : duration ? `A ${duration} screen recording.` : "A screen recording.";
  const head = [
    `<title>${esc(title)}</title>`,
    named("description", description),
    named("robots", "noindex, nofollow"),
    `<link rel="canonical" href="${esc(meta.pageURL)}">`,
    property("og:site_name", "Reelbird"),
    property("og:type", meta.video ? "video.other" : "website"),
    property("og:title", title),
    property("og:description", description),
    property("og:url", meta.pageURL),
    named("twitter:card", "summary_large_image"),
    named("twitter:title", title),
    named("twitter:description", description),
  ];
  if (image) {
    head.push(property("og:image", image), named("twitter:image", image), property("og:image:alt", title));
    if (!meta.poster) head.push(property("og:image:width", "1200"), property("og:image:height", "630"));
  }
  const video = url(meta.video);
  if (video) {
    head.push(property("og:video", video));
    if (video.startsWith("https://")) head.push(property("og:video:secure_url", video));
    head.push(property("og:video:type", "video/mp4"));
    if (meta.width && meta.height) head.push(property("og:video:width", String(meta.width)), property("og:video:height", String(meta.height)));
  }
  const ok = meta.width && meta.height;
  const json = JSON.stringify(meta).replace(/</g, "\\u003c").replaceAll(String.fromCharCode(0x2028), "\\u2028").replaceAll(String.fromCharCode(0x2029), "\\u2029");
  const html = fill(VIEWER_TEMPLATE, {
    HEAD: head.join("\n"),
    TITLE: esc(title),
    SUBLINE: esc([duration, formatDate(meta.createdAt)].filter(Boolean).join(" · ")),
    RATIO: ok ? `${meta.width} / ${meta.height}` : "16 / 9",
    RATIO_N: ok ? (meta.width! / meta.height!).toFixed(4) : "1.7778",
    POSTER: url(meta.poster) ? ` poster="${esc(url(meta.poster)!)}"` : "",
    HLS_URL,
    HLS_SRI,
    SITE: "https://reelbird.app",
    META: json,
  });
  return html
    // Hosted links can be reported to us (links in your own bucket are yours alone).
    .replace(`<button type="button" id="keys-open"`, `<a href="/report?link=${meta.id}" rel="nofollow" style="margin-left:auto">Report</a>\n<button type="button" id="keys-open"`)
    .replace(/<script(?=[\s>])/g, `<script nonce="${nonce}"`)
    .replace("</head>", `${umamiTag(nonce)}</head>`)
    .replace("</body>", `<script nonce="${nonce}" src="/e.js" data-share="${meta.id}" defer></script>\n</body>`);
}

/**
 * Umami data-before-send handler (global function `rbMask`, called as (type, payload)). Share ids are the
 * only secret on a hosted link, so /r/<id>/... is sent as /r/:id/ and /account/s/<id> as /account/s/:id,
 * in the page url and in a same-site referrer.
 */
export const UMAMI_MASK_JS = `function rbMask(t,p){var f=function(u,h){if(typeof u!=="string"||(h&&u.indexOf(location.host)<0))return u;return u.replace(/\\/r\\/[^?#]*/,"/r/:id/").replace(/\\/account\\/s\\/[^\\/?#]+/,"/account/s/:id")};if(p){p.url=f(p.url);p.referrer=f(p.referrer,1)}return p}`;

/** Umami page-analytics tag; empty when PUBLIC_UMAMI_WEBSITE_ID is unset. */
export function umamiTag(nonce?: string) {
  if (!config.umamiWebsiteId) return "";
  const host = new URL(config.publicURL).hostname;
  const n = nonce ? ` nonce="${nonce}"` : "";
  return `<script${n}>${UMAMI_MASK_JS}</script>\n<script${n} defer src="${UMAMI_ORIGIN}/script.js" data-website-id="${config.umamiWebsiteId}" data-domains="${esc(host)}" data-exclude-search="true" data-before-send="rbMask"></script>\n`;
}

/** CSP for the viewer page: its own scripts, hls.js from jsDelivr, media from R2 and this server. */
export function viewerCSP(nonce: string, r2Origin: string) {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' ${HLS_URL}${config.umamiWebsiteId ? ` ${UMAMI_ORIGIN}` : ""}`, // the one pinned hls.js file, not all of jsDelivr
    "style-src 'unsafe-inline'",
    `img-src 'self' data: ${r2Origin}`,
    `media-src 'self' blob: ${r2Origin}`,
    `connect-src 'self' ${r2Origin}${config.umamiWebsiteId ? ` ${UMAMI_ORIGIN}` : ""}`,
    "worker-src blob:",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}
