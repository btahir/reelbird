/**
 * Competitor facts for the homepage band, /compare, the alternative pages, llms-full.txt and
 * the README table. Every product links its own sources. Re-check each vendor page before
 * changing CHECKED, and keep the README table in step.
 */
export const CHECKED = "2026-10-12";
export const CHECKED_LABEL = "12 October 2026";
export const CHECKED_SHORT = "12 Oct 2026";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-11-07" → "7 November 2026". */
export const dateLabel = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m! - 1]} ${y}`; };

export interface Product {
  id: string;
  name: string;
  /** What it is, in a few words. */
  kind: string;
  price: string;
  /** What you get without paying. */
  freePlan: string;
  platforms: string;
  openSource: string;
  links: string;
  autoZoom: string;
  /** Can you keep the video file? */
  download: string;
  notes: string;
  bestFor: string;
  keepInMind: string;
  sources: { label: string; href: string }[];
  /** When this product's facts were checked, if not on CHECKED. */
  checked?: string;
}

/** Tools that aren't screen recorders in the /compare table but have an alternative page. */
export interface Rival { id: string; name: string; sources: { label: string; href: string }[]; checked?: string }

export const PRODUCTS: Product[] = [
  {
    id: "reelbird",
    name: "Reelbird",
    kind: "Native Mac screen recorder, open source",
    price: "Free. Optional Reelbird Pro, $5 a month, hosts your links",
    freePlan: "Everything, no watermark or limits, including links to your own bucket",
    platforms: "macOS 15+",
    openSource: "Yes, MIT",
    links: "Copied the moment you stop. Hosted in your own S3 or R2 bucket for free, or by Reelbird Pro. The same link updates after editing",
    autoZoom: "Yes, from clicks and typing. Every zoom editable",
    download: "Always. Every take is MP4 files on your Mac",
    notes: "Native Swift. Free notarised download or build from source. On-device captions in six styles and one-click Clean Up (shorter pauses, no ums or dead time). Every take is also a step-by-step guide with a Click-through. Find Sensitive Info blurs emails, keys, card and phone numbers. Camera layouts, including split on a 9:16 canvas. No account needed, no telemetry in the app. Viewer analytics with Pro. CLI and MCP server",
    bestFor: "Mac users who want a link the moment they stop, auto-zoom, captions and a one-click tidy-up later under the same link, and their files on their own Mac, for free.",
    keepInMind: "Mac only. Free links need a bucket you own; Reelbird Pro ($5 a month) hosts them instead. No comments.",
    sources: [{ label: "github.com/btahir/reelbird", href: "https://github.com/btahir/reelbird" }],
  },
  {
    id: "loom",
    name: "Loom",
    kind: "Hosted video messaging for teams",
    price: "Starter free. Business $18 and Business + AI $24 per user a month, billed monthly (up to 17% less yearly)",
    freePlan: "25 videos per person, 5 minutes each, up to 720p. No downloads",
    platforms: "Mac, Windows, web, mobile",
    openSource: "No",
    links: "Copied when you stop. Hosted on Loom's cloud",
    autoZoom: "No",
    download: "Business plans and up. Starter users can't download their videos",
    notes: "Comments, reactions, view counts and team workspaces",
    bestFor: "Teams that want comments, reactions, view counts and a shared library on Mac, Windows, the web and phones.",
    keepInMind: "The free plan stops each video at 5 minutes, keeps 25 per person, records up to 720p and can't download. Paid plans are priced per user.",
    sources: [
      { label: "Loom pricing", href: "https://www.loom.com/pricing" },
      { label: "Loom downloads", href: "https://support.atlassian.com/loom/docs/download-your-loom-video/" },
    ],
  },
  {
    id: "screen-studio",
    name: "Screen Studio",
    kind: "Mac screen recorder and editor for polished demos",
    price: "$29 a month, or $9 a month billed yearly. One-time licences no longer sold to new buyers",
    freePlan: "No free plan listed",
    platforms: "macOS (13.1+ recommended)",
    openSource: "No",
    links: "After you export. 1080p60, up to 30 minutes, with timestamped comments",
    autoZoom: "Yes, from clicks and activity, plus manual zooms",
    download: "Yes. MP4 up to 4K, or GIF",
    notes: "Mature editor: camera layouts, iPhone recording, transcript editing",
    bestFor: "Polished product videos on a Mac, with the most mature auto-zoom editor, camera layouts and iPhone recording.",
    keepInMind: "A subscription for new buyers. The share link comes after you export, so there's no link the moment you stop.",
    sources: [{ label: "screen.studio", href: "https://screen.studio/" }],
  },
  {
    id: "cap",
    name: "Cap",
    kind: "Open-source Loom alternative with hosted plans",
    price: "Free for personal use. Desktop licence $29 a year or $58 once. Pro $12 per user a month, or $8.16 billed yearly",
    freePlan: "Personal use only. 25 share links a month, up to 5 minutes each",
    platforms: "macOS, Windows (beta), Linux",
    openSource: "Source on GitHub. AGPLv3, some parts MIT",
    links: "Yes, in Instant mode (uploads as you record)",
    autoZoom: "Yes, in Studio mode",
    download: "Yes",
    notes: "Instant and Studio are separate recording modes. Custom S3 and the Loom importer are Pro features",
    bestFor: "An open-source Loom alternative on Windows or Linux as well as Mac, with hosted plans and a Loom importer.",
    keepInMind: "Instant links and Studio polish are separate recording modes. Commercial use needs a paid licence, and your own S3 bucket needs Pro.",
    sources: [
      { label: "Cap pricing", href: "https://cap.so/pricing" },
      { label: "Cap downloads", href: "https://cap.so/download" },
      { label: "Cap licence", href: "https://github.com/CapSoftware/Cap/blob/main/LICENSE" },
    ],
    checked: "2026-11-07",
  },
  {
    id: "openscreen",
    name: "OpenScreen",
    kind: "Open-source Screen Studio-style editor",
    price: "Free",
    freePlan: "Everything, for personal and commercial use",
    platforms: "macOS 13+, Windows, Linux",
    openSource: "Yes, MIT",
    links: "No. You export MP4 or GIF and host it yourself",
    autoZoom: "Yes, automatic or manual",
    download: "Yes",
    notes: "Electron. Signed and notarised Mac builds. CLI, MCP and an AI editing assistant (bring your own key)",
    bestFor: "A free, signed, cross-platform Screen Studio-style editor, with annotations and an AI editing assistant.",
    keepInMind: "No share links: you export a file and host it yourself. Built on Electron rather than native.",
    sources: [{ label: "OpenScreen on GitHub", href: "https://github.com/getopenscreen/openscreen" }],
  },
  {
    id: "cleanshot",
    name: "CleanShot X",
    kind: "Mac screenshot tool that also records",
    price: "$35 once (a year of updates, then $19 a year if you want more), or Pro $10 per user a month billed yearly",
    freePlan: "No free plan listed",
    platforms: "macOS 13+",
    openSource: "No",
    links: "Yes, on CleanShot Cloud (1 GB with the one-time licence, unlimited on Pro)",
    autoZoom: "Animated zooms you add in its video editor",
    download: "Yes",
    notes: "A screenshot tool first. Video editor with smart zooms, 4K, transcription. No trial; 30-day money-back guarantee",
    bestFor: "Screenshots first, plus screen recording, a video editor with animated zooms, and cloud links.",
    keepInMind: "A screenshot tool that records, not a dedicated video editor.",
    sources: [{ label: "CleanShot pricing", href: "https://cleanshot.com/pricing" }],
    checked: "2026-11-07",
  },
  {
    id: "tella",
    name: "Tella",
    kind: "Hosted recorder and browser editor",
    price: "Pro $13 and Premium $19 per user a month, billed yearly",
    freePlan: "No free plan. A 7-day free trial",
    platforms: "Mac, Windows, Chrome",
    openSource: "No",
    links: "Yes, hosted by Tella",
    autoZoom: "Yes",
    download: "Yes",
    notes: "Hosted, team-focused, viewer analytics. Transcription in 106 languages. Clips up to 6 hours. Custom domain and 60 fps export on Premium",
    bestFor: "Polished, hosted walkthroughs with viewer analytics, 4K export and, on Premium, a custom domain.",
    keepInMind: "Hosted and priced per user. No free plan, only a 7-day trial.",
    sources: [{ label: "Tella pricing", href: "https://www.tella.com/pricing" }],
    checked: "2026-11-07",
  },
  {
    id: "focusee",
    name: "FocuSee",
    kind: "Auto-zoom recorder and editor for Mac and Windows",
    price: "Standard $49.99 a year or $19.99 a month for one computer. Advanced $79.99 a year, or $199.99 once for version 2.x",
    freePlan: "A free trial with the standard features and one exported video",
    platforms: "macOS, Windows",
    openSource: "No",
    links: "Yes, through FocuSee's cloud (5 GB on every plan), with password and permission controls",
    autoZoom: "Yes, from clicks and typing",
    download: "Yes",
    notes: "Camera layouts and background removal, AI captions, voice enhancement, filler-word removal, a teleprompter. Some AI features use credits",
    bestFor: "Auto-zoom tutorials on Mac and Windows, with camera layouts, AI captions and a one-time licence option.",
    keepInMind: "Closed source. Standard includes no AI credits, and the one-time licence covers version 2.x only.",
    sources: [
      { label: "FocuSee pricing", href: "https://focusee.ai/go/store.php?product=fs&id=1" },
      { label: "focusee.ai", href: "https://focusee.ai/" },
    ],
    checked: "2026-11-07",
  },
  {
    id: "screenity",
    name: "Screenity",
    kind: "Chrome extension recorder",
    price: "Recorder free. Pro $10 a month or $120 a year",
    freePlan: "Recording and downloads. The editor, share links and auto-zoom need Pro",
    platforms: "Chrome, on any desktop OS",
    openSource: "Recorder GPL-3.0",
    links: "Pro only",
    autoZoom: "Pro only",
    download: "Yes, no account needed",
    notes: "Runs in the browser",
    bestFor: "Free recording in Chrome on any operating system, with downloads and no account.",
    keepInMind: "Share links, the editor and auto-zoom need Pro.",
    sources: [{ label: "screenity.io", href: "https://screenity.io/" }],
  },
];

/** Step-by-step guide makers, for /scribe-alternative/. Checked on their own pages. */
export const GUIDE_TOOLS: (Rival & { price: string; freePlan: string; platforms: string; exports: string })[] = [
  {
    id: "scribe",
    name: "Scribe",
    price: "Basic free. Pro Personal $25 a seat a month billed yearly ($35 monthly). Pro Team $13 a seat a month billed yearly ($17 monthly), from 5 seats",
    freePlan: "Browser capture in Chrome and Edge, sharing by link and embed. The desktop app, screenshot redaction and PDF, HTML and Markdown exports need Pro",
    platforms: "Chrome and Edge extensions; desktop apps on Pro",
    exports: "PDF, HTML and Markdown on Pro",
    sources: [{ label: "Scribe pricing", href: "https://scribe.com/pricing" }],
    checked: "2026-11-07",
  },
  {
    id: "tango",
    name: "Tango",
    price: "Free. Pro $22 a user a month billed yearly ($30 monthly) for 1 or 2 users; $15 a user a month billed yearly ($20 monthly) for 3 or more",
    freePlan: "Browser capture only, 5 shared workflows, up to 10 users. No blur, redaction, desktop capture or PDF, HTML and Markdown export",
    platforms: "Browser; desktop capture on Pro",
    exports: "PDF, HTML and Markdown on Pro",
    sources: [{ label: "Tango pricing", href: "https://www.tango.ai/pricing" }],
    checked: "2026-11-07",
  },
];

export const byId = (id: string) => PRODUCTS.find((p) => p.id === id)!;
/** Any product with an alternative page: a recorder from PRODUCTS or a guide tool. */
export const rivalById = (id: string): Rival => PRODUCTS.find((p) => p.id === id) ?? GUIDE_TOOLS.find((p) => p.id === id)!;
/** When a product's facts were checked: its own date, or CHECKED. */
export const checkedOf = (p: { checked?: string }) => { const iso = p.checked ?? CHECKED; return { iso, label: dateLabel(iso) }; };

/**
 * The homepage band: Loom's free plan and Screen Studio against Reelbird, in five rows.
 * Short cells; the full facts live in PRODUCTS and on /compare.
 */
export const HOME_VS = {
  cols: ["Loom", "Screen Studio", "Reelbird"] as const,
  colNotes: ["free Starter plan", "", ""] as const,
  rows: [
    { k: "Price", v: ["Free, then $18 per user a month", "$29 a month, or $9 billed yearly", "Free (MIT). Optional Pro hosting, $5 a month"] },
    { k: "Limits", v: ["5 min a video, 25 videos, 720p", "Links up to 30 min", "None set by Reelbird"] },
    { k: "Link when you stop", v: ["Yes, on Loom's cloud", "No, after you export", "Yes, hosted by Pro or in your own bucket"] },
    { k: "Auto-zoom polish", v: ["No", "Yes", "Yes, under the same link"] },
    { k: "Keep the file", v: ["No downloads on the free plan", "Yes", "Always: MP4s on your Mac"] },
  ],
} as const;

/**
 * Plain "Reelbird vs X" statements for llms.txt and llms-full.txt. Keep them in step with
 * PRODUCTS, the alternative pages and the README table.
 */
export const VS_STATEMENTS: { id: string; text: string }[] = [
  { id: "loom", text: "Reelbird vs Loom: both copy a share link when you stop recording. Loom's free Starter plan stops each video at 5 minutes, keeps 25 videos per person, records up to 720p and can't download; Business is $18 per user a month (billed monthly). Reelbird is free (MIT), sets no length limit, keeps every take as MP4 files on your Mac and hosts links in your own S3 or R2 bucket for free, or on Reelbird Pro ($5 a month, with view counts and where viewers stopped). Loom has comments, team workspaces and apps for Windows, web and mobile; Reelbird is Mac only and has none of those." },
  { id: "screen-studio", text: "Reelbird vs Screen Studio: both plan auto-zoom from clicks and smooth the cursor on the Mac. Screen Studio costs $29 a month or $9 a month billed yearly (no one-time licence for new buyers), and its share link comes after export (1080p60, up to 30 minutes). Reelbird is free and MIT licensed, copies a link the moment you stop and updates that same link after you polish; links go to your own bucket for free, or to Reelbird Pro hosting for $5 a month. Screen Studio has the more mature editor (camera layouts, iPhone recording, transcript editing)." },
  { id: "cap", text: "Reelbird vs Cap: both are open-source recorders with instant links and auto-zoom. Cap does them as separate recording modes (Instant and Studio), runs on macOS, Windows (beta) and Linux, is mostly AGPLv3, and its free plan is personal use with 25 links a month of up to 5 minutes; custom S3 needs Pro ($12 per user a month, or $8.16 yearly). Reelbird is Mac only, MIT, native Swift, and links to your own bucket for free; optional Reelbird Pro ($5 a month) hosts links instead." },
  { id: "focusee", text: "Reelbird vs FocuSee: both plan auto-zoom from clicks and typing and have camera layouts and captions. FocuSee runs on Mac and Windows, is closed source and costs $49.99 a year or $19.99 a month (Standard, one computer), or $199.99 once for version 2.x (Advanced); its links go through FocuSee's cloud with 5 GB. Reelbird is free, MIT licensed and Mac only, copies a link the moment you stop and updates that link after you edit; links go to your own bucket for free, or to Reelbird Pro for $5 a month. FocuSee prices checked 7 November 2026." },
  { id: "tella", text: "Reelbird vs Tella: both record your screen, zoom automatically and give you a share link. Tella is hosted, runs on Mac, Windows and Chrome, and costs $13 (Pro) or $19 (Premium) per user a month billed yearly, with no free plan (a 7-day trial). Reelbird is free and open source, Mac only, keeps every take as MP4 files on your Mac, and hosts links in your own bucket or on Reelbird Pro ($5 a month)." },
  { id: "cleanshot", text: "Reelbird vs CleanShot X: CleanShot X is a Mac screenshot tool that also records video, with animated zooms you add yourself and links on CleanShot Cloud; it costs $35 once or $10 per user a month for Pro. Reelbird is a free, open-source screen recorder only: no screenshots, but zooms planned from your clicks, captions, a link the moment you stop and a step-by-step guide from each take." },
  { id: "scribe", text: "Reelbird vs Scribe and Tango: all three turn clicks into a step-by-step guide with screenshots. Scribe and Tango are browser extensions first; their desktop capture and PDF, HTML and Markdown exports need a paid plan (Scribe Pro Personal $25 a seat a month billed yearly; Tango Pro from $15 a user a month billed yearly). Reelbird is a free, open-source Mac app: every screen recording also becomes a Guide and a Click-through on its share link, and exports as a web page, Markdown or a Claude skill, for free. Scribe and Tango have team workspaces and run on any desktop with a browser; Reelbird is Mac only. Checked 7 November 2026." },
  { id: "openscreen", text: "Reelbird vs OpenScreen: both are free, MIT licensed and have auto-zoom. OpenScreen is Electron, runs on macOS 13+, Windows and Linux, has signed Mac builds and no share links. Reelbird is native Swift, Mac only (macOS 15+), a notarised download or build from source, and copies a share link the moment you stop." },
];
