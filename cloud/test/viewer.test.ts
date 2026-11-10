// The viewer's checks on uploaded meta (guide steps, text layer) and the gateway's path rule.
// Pure functions: no database or R2 needed (bun test test/viewer.test.ts).
import { expect, test } from "bun:test";

// config.ts reads these at import; cloud/.env sets them in development. Nothing here connects anywhere.
process.env.PUBLIC_URL ??= "https://watch.example";
process.env.STATS_SECRET ??= "test";
process.env.R2_ACCOUNT_ID ??= "test";
process.env.R2_ACCESS_KEY_ID ??= "test";
process.env.R2_SECRET_ACCESS_KEY ??= "test";
process.env.R2_BUCKET ??= "test";

const { sanitizeMeta, renderViewer } = await import("../src/viewer");
const { route } = await import("../src/gateway");
const { config } = await import("../src/config");

const ID = "AbCdEfGhJkMnPq";
const step = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "c4210", n: 1, t: 1.62, kind: "click", text: 'Click "Inbox"', note: "First open the inbox", section: "Setup",
  image: "steps.3/01.jpg", w: 1600, h: 1000, x: 0.083, y: 0.149, box: { x: 0.06, y: 0.13, width: 0.05, height: 0.03 },
  ...over,
});
const meta = (over: Record<string, unknown> = {}) => sanitizeMeta({ revision: 3, title: "Guide", video: "video.3.mp4", ...over }, ID)!;

test("guide steps pass through as published", () => {
  const m = meta({ guide: { steps: [step(), step({ id: "k5000", n: 2, t: 5, kind: "shortcut", text: "Press ⌘S", keys: "⌘S", x: undefined, y: undefined, box: undefined, image: "steps.3/02.jpg" })] }, text: "text.3.json" });
  expect(m.guide!.steps as unknown[]).toEqual([
    step(),
    { id: "k5000", n: 2, t: 5, kind: "shortcut", text: "Press ⌘S", note: "First open the inbox", section: "Setup", image: "steps.3/02.jpg", w: 1600, h: 1000, keys: "⌘S" },
  ]);
  expect(m.text).toBe("text.3.json");
  // Round trip through JSON, the way meta.json is served: absent fields stay absent.
  expect(JSON.parse(JSON.stringify(m)).guide.steps[1]).not.toHaveProperty("x");
});

test("guide strings are capped and numbers clamped", () => {
  const [s] = meta({ guide: { steps: [step({
    id: "i".repeat(99), text: "t".repeat(900), note: "n".repeat(2000), section: "s".repeat(400), keys: "k".repeat(90),
    x: -3, y: 7, box: { x: -1, y: 0.5, width: 4, height: 1e999 }, w: 1600.9, h: 99999,
  })] } }).guide!.steps;
  expect(s!.id).toHaveLength(40);
  expect(s!.text).toHaveLength(500);
  expect(s!.note).toHaveLength(1000);
  expect(s!.section).toHaveLength(200);
  expect(s!.keys).toHaveLength(40);
  expect([s!.x, s!.y]).toEqual([0, 1]);
  // 1e999 parses as Infinity: not a number the page can use, so the whole box goes.
  expect(s!.box).toBeUndefined();
  expect(meta({ guide: { steps: [step({ box: { x: -1, y: 0.5, width: 4, height: 0.2 } })] } }).guide!.steps[0]!.box)
    .toEqual({ x: 0, y: 0.5, width: 1, height: 0.2 });
  expect(s!.w).toBe(1600);
  expect(s!.h).toBeUndefined();
});

test("malformed steps are dropped, not fatal", () => {
  const steps = [
    step({ id: "ok" }),
    null, "x", 3, [step()],
    step({ kind: "hover" }), step({ kind: undefined }),
    step({ text: undefined }), step({ text: 12 }),
    step({ id: undefined }), step({ n: "1" }), step({ t: -1 }), step({ t: "2" }),
    step({ id: "ok2", image: "../../other/secret.jpg", x: "0.5", y: 0.5, box: "big", w: "1600", note: 5, keys: ["⌘S"] }),
  ];
  const m = meta({ guide: { steps } });
  expect(m.guide!.steps.map((s) => s.id)).toEqual(["ok", "ok2"]);
  expect(m.guide!.steps[1]).toEqual({ id: "ok2", n: 1, t: 1.62, kind: "click", text: 'Click "Inbox"', section: "Setup", h: 1000 });
  for (const guide of [undefined, null, "guide", [], { steps: "x" }, { steps: [] }, { steps: [null] }]) {
    expect(meta({ guide }).guide).toBeUndefined();
  }
});

test("at most 300 steps", () => {
  const many = Array.from({ length: 450 }, (_, i) => step({ id: `c${i}`, n: i + 1 }));
  const m = meta({ guide: { steps: many } });
  expect(m.guide!.steps).toHaveLength(300);
  expect(m.guide!.steps.at(-1)!.id).toBe("c299");
});

test("step images and the text layer only name files in this share", () => {
  const image = (name: unknown) => meta({ guide: { steps: [step({ image: name })] } }).guide!.steps[0]!.image;
  expect(image("steps.3/01.jpg")).toBe("steps.3/01.jpg");
  for (const bad of ["https://evil.example/x.jpg", "//evil.example/x.jpg", "../x.jpg", "steps.3/../x.jpg", "steps..3/01.jpg",
    "/steps.3/01.jpg", "a/b/c/d.jpg", "steps.3/01.jpg?x=1", "steps 3/01.jpg", "", 7]) {
    expect(image(bad)).toBeUndefined();
  }
  expect(meta({ text: "text.12.json" }).text).toBe("text.12.json");
  for (const bad of ["text.json", "text.x.json", "text.3.json.html", "x/text.3.json", "../text.3.json", "text.3.JSON",
    "captions.3.vtt", "https://evil.example/text.3.json", 3, null]) {
    expect(meta({ text: bad }).text).toBeUndefined();
  }
});

test("hostile step text renders as data, never as markup", () => {
  const evil = `</script><script>steal()</script><img src=x onerror=steal()>`;
  const m = meta({ title: evil, guide: { steps: [step({ text: evil, note: evil, section: evil, keys: evil })] }, text: "text.3.json" });
  const html = renderViewer(m, "NONCE");
  expect(html).not.toContain("<script>steal()");
  expect(html).not.toContain("<img src=x");
  for (const tag of html.match(/<script(?=[\s>])[^>]*>/g)!) expect(tag).toContain(`nonce="NONCE"`);
  // The embedded meta still carries the text, escaped, for the page to put in with textContent.
  const json = html.match(/<script nonce="NONCE" type="application\/json" id="meta">([\s\S]*?)<\/script>/)![1]!;
  expect(JSON.parse(json).guide.steps[0].text).toBe(evil);
  expect(JSON.parse(json).text).toBe("text.3.json");
  // The view switch is in the page, hidden until the script finds steps.
  expect(html).toContain(`<div class="views" id="views" hidden>`);
  expect(html).toContain(`id="tab-demo"`);
  expect(m.pageURL).toBe(`${config.publicURL}/r/${ID}/`);
});

test("gateway: text.<n>.json at the share root is proxied as JSON; other paths keep their rules", () => {
  expect(route("text.3.json")).toEqual({ kind: "text", type: "application/json" });
  expect(route("text.1234.json")).toEqual({ kind: "text", type: "application/json" });
  expect(route("index.html")).toEqual({ kind: "page" });
  expect(route("meta.json")).toEqual({ kind: "meta" });
  expect(route("hls/index.m3u8")).toEqual({ kind: "text", type: "application/vnd.apple.mpegurl" });
  expect(route("captions.2.vtt")).toEqual({ kind: "text", type: "text/vtt; charset=utf-8" });
  expect(route("steps.3/01.jpg")).toEqual({ kind: "media", type: "image/jpeg" });
  expect(route("video.3.mp4")).toEqual({ kind: "media", type: "video/mp4" });
  for (const path of ["text.json", "text.x.json", "steps.3/text.3.json", "sub/meta.json", "sub/index.html", "evil.html",
    "text.3.json.html", "other.json", "text.3.jsonp", "Text.3.json"]) {
    expect(route(path)).toBeNull();
  }
});

test("the server's viewer template matches the app's", async () => {
  const { generated, out } = await import("../scripts/sync-viewer");
  expect(await Bun.file(out).text()).toBe(generated());
});

test("Umami tag and CSP appear only when the website id is set", async () => {
  const { config } = await import("../src/config");
  const { viewerCSP } = await import("../src/viewer");
  const m = meta({});
  const before = config.umamiWebsiteId;
  try {
    config.umamiWebsiteId = "";
    expect(renderViewer(m, "N")).not.toContain("project-analytics");
    expect(viewerCSP("N", "https://r2.example")).not.toContain("project-analytics");
    config.umamiWebsiteId = "415f1047-be59-47fa-a877-e57c2f25e010";
    const html = renderViewer(m, "N");
    expect(html).toContain(`<script nonce="N" defer src="https://project-analytics.shiptiffin.app/script.js" data-website-id="415f1047-be59-47fa-a877-e57c2f25e010"`);
    expect(html).toContain(`data-exclude-search="true" data-before-send="rbMask"`);
    for (const tag of html.match(/<script(?=[\s>])[^>]*>/g)!) expect(tag).toContain(`nonce="N"`);
    const csp = viewerCSP("N", "https://r2.example");
    expect(csp).toMatch(/script-src [^;]*project-analytics\.shiptiffin\.app/);
    expect(csp).toMatch(/connect-src [^;]*project-analytics\.shiptiffin\.app/);
  } finally {
    config.umamiWebsiteId = before;
  }
});

test("the Umami mask hides share ids in url and same-site referrer", async () => {
  const { UMAMI_MASK_JS } = await import("../src/viewer");
  (globalThis as any).location = { host: "watch.reelbird.app" };
  const mask = new Function(`${UMAMI_MASK_JS}; return rbMask;`)() as (t: string, p: any) => any;
  const out = mask("event", { url: "/r/AbC123xyz456Qw/", referrer: "https://watch.reelbird.app/r/AbC123xyz456Qw/x" });
  expect(out.url).toBe("/r/:id/");
  expect(out.referrer).toBe("https://watch.reelbird.app/r/:id/");
  expect(mask("event", { url: "/r/AbC123xyz456Qw/sub/page", referrer: "" }).url).toBe("/r/:id/");
  expect(mask("event", { url: "/account/s/AbC123xyz456Qw", referrer: "https://other.example/r/keep" })).toEqual({ url: "/account/s/:id", referrer: "https://other.example/r/keep" });
  expect(mask("event", { url: "/account", referrer: "" }).url).toBe("/account");
});
