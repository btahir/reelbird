// Server-rendered pages: sign-in, device approval, account and per-link stats.
// They follow brand/colors.md and the website (reelbird.app): paper and ink, coral for the one thing
// to press, Fraunces headings, Instrument Sans text, Commit Mono for codes. Fonts and icons are served
// from /assets (see assets.ts), so the pages load nothing from other hosts.
import { config } from "./config";
import { umamiTag } from "./viewer";
import { asset } from "./assets";
import type { Stats } from "./stats";
import type { User } from "./auth";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

const SITE = "https://reelbird.app";
export const PRICE = "$5";
export const CONTACT = "hello@reelbird.app";

// The robin from brand/logo.svg, recoloured to follow the theme. The record dot stays coral.
const BIRD = "M204 70C196 54 182 45 164 45C144 45 130 55 120 67C96 88 50 128 22 166Q15 177 28 181L72 177C86 201 108 213 132 213C176 213 206 182 210 140C212 120 210 106 205 98L230.5 88.6Q236 86.4 230.6 84.2Z";
const WORD = "M12 -88V-12M12 -50A38 38 0 0 1 69 -82.9M99 -50H175A38 38 0 1 0 165.2 -24.6M213 -50H289A38 38 0 1 0 279.2 -24.6M329 -136V-12M373 -136V-12M373 -50A38 38 0 1 1 449 -50A38 38 0 1 1 373 -50M491 -88V-12M533 -88V-12M533 -50A38 38 0 0 1 590 -82.9M695 -136V-12M695 -50A38 38 0 1 0 619 -50A38 38 0 1 0 695 -50";
const LOGO = `<svg class="logo" viewBox="8 33 728.5 192" role="img" aria-label="Reelbird"><path d="${BIRD}" fill="currentColor"/><circle cx="146" cy="149" r="40" fill="#FF5A36"/><circle cx="177" cy="80" r="8" fill="var(--bg)"/><g transform="translate(270 172.5) scale(0.64)"><path d="${WORD}" fill="none" stroke="currentColor" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/><circle cx="491" cy="-124" r="15" fill="currentColor"/></g></svg>`;

// Mascots from brand/mascot-*.svg, in currentColor so they work on paper and on ink. One per screen, 96 px.
const MASCOT = {
  sleeping: `<svg class="mascot" viewBox="0 0 256 256" aria-hidden="true"><g transform="translate(0 18)"><path d="${BIRD}" fill="currentColor"/><circle cx="146" cy="149" r="37" fill="none" stroke="#FF5A36" stroke-width="6"/><path d="M169 80Q177 88 185 80" fill="none" stroke="var(--bg)" stroke-width="5" stroke-linecap="round"/></g></svg>`,
  celebrating: `<svg class="mascot" viewBox="0 0 256 256" aria-hidden="true"><style>.hop{animation:rb-hop 2.4s cubic-bezier(.3,0,.3,1) 2}.wing{transform-origin:116px 110px;animation:rb-flap 2.4s ease-in-out 2}@keyframes rb-hop{0%,60%,100%{transform:translateY(0)}15%{transform:translateY(-7px)}30%{transform:translateY(0)}38%{transform:translateY(-4px)}46%{transform:translateY(0)}}@keyframes rb-flap{0%,56%,100%{transform:rotate(0)}10%{transform:rotate(-16deg)}20%{transform:rotate(4deg)}30%{transform:rotate(-14deg)}40%{transform:rotate(2deg)}}@media (prefers-reduced-motion:reduce){.hop,.wing{animation:none}}</style><g class="hop"><g transform="rotate(-8 128 140) translate(0 -10)"><path class="wing" d="M124 94C108 66 88 42 62 26C55 22 49 27 51 34C53 41 56 47 60 52C55 53 53 57 56 61C62 70 69 78 76 85C71 87 70 92 74 96C82 104 91 112 100 118Z" fill="currentColor"/><path d="M204 70C196 54 182 45 164 45C144 45 130 55 120 67C96 88 50 128 22 166Q15 177 28 181L72 177C86 201 108 213 132 213C176 213 206 182 210 140C212 120 210 106 205 98Z" fill="currentColor"/><path d="M203 70L233 70.5Q238 71.5 233.5 75L205 86Z" fill="currentColor"/><path d="M205 91L228 102Q231.5 104.5 227 105L205 99Z" fill="currentColor"/><circle cx="146" cy="149" r="40" fill="#FF5A36"/><path d="M169 84Q177 74 185 84" fill="none" stroke="var(--bg)" stroke-width="5" stroke-linecap="round"/><path d="M116 210L104 228M144 211L136 230" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></g></g></svg>`,
};

const ICONS = {
  check: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4 6.6 11.5 12.5 4.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  open: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 3.5h-3v9h9v-3M9 3.5h3.5V7M12.3 3.7 7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  link: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2.4-2.4a2.6 2.6 0 0 0-3.7-3.7l-.6.6M9.4 6.6a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.6-.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  back: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 3.5 5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const CSS = `
@font-face{font-family:Fraunces;src:url(${asset("fraunces.woff2")}) format("woff2");font-weight:400 650;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(${asset("instrument-sans.woff2")}) format("woff2");font-weight:400 700;font-display:swap}
@font-face{font-family:"Commit Mono";src:url(${asset("commit-mono.woff2")}) format("woff2");font-weight:400;font-display:swap}
:root{color-scheme:light dark;
--ink:#1a1512;--ink-raised:#2a2320;--paper:#fff4e8;--coral:#ff5a36;--coral-deep:#e5432b;--coral-text:#c93a1e;
--bg:light-dark(var(--paper),var(--ink));--raised:light-dark(#fffaf4,var(--ink-raised));--sunk:light-dark(#f8ebdc,#130f0d);
--text:light-dark(var(--ink),var(--paper));--muted:light-dark(#6e645c,#a69c93);
--line:light-dark(rgb(26 21 18/.12),rgb(255 244 232/.12));--line-strong:light-dark(rgb(26 21 18/.22),rgb(255 244 232/.22));
--accent-text:light-dark(var(--coral-text),var(--coral));--focus:light-dark(var(--coral-text),var(--coral));
--display:Fraunces,ui-serif,Georgia,serif;--sans:"Instrument Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"Commit Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
--gutter:clamp(16px,4vw,32px);--ease:cubic-bezier(.22,1,.36,1)}
:root[data-theme=light]{color-scheme:light}:root[data-theme=dark]{color-scheme:dark}
*,*::before,*::after{box-sizing:border-box}*{margin:0}
html{background:var(--bg);-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{min-height:100dvh;display:flex;flex-direction:column;background:var(--bg);color:var(--text);font:16px/1.55 var(--sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:inherit;text-decoration-thickness:1px;text-underline-offset:.18em}
a:hover{text-decoration-color:var(--accent-text)}
:focus-visible{outline:2px solid var(--focus);outline-offset:3px;border-radius:4px}
::selection{background:rgb(255 90 54/.25)}
svg{display:block}
h1,h2,.display{font-family:var(--display);font-weight:520;letter-spacing:-.022em;font-feature-settings:"lnum";text-wrap:balance}
h1{font-size:clamp(30px,2.2vw + 18px,40px);line-height:1.08;overflow-wrap:anywhere}
h2{font-size:22px;line-height:1.2}
h3{font-size:15px;font-weight:600;letter-spacing:-.005em}
p{text-wrap:pretty}
.muted{color:var(--muted)}
.tnum{font-variant-numeric:tabular-nums}
.wrap{width:min(100% - 2*var(--gutter),1040px);margin-inline:auto}
header.top{height:68px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--text)}
.brand .logo{height:22px;width:auto}
.tag{display:inline-flex;align-items:center;height:20px;padding:0 7px;border:1px solid var(--line-strong);border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.01em;color:var(--muted)}
nav.top{display:flex;align-items:center;gap:4px;font-size:15px}
nav.top a,nav.top button{appearance:none;border:0;background:none;font:inherit;color:var(--muted);text-decoration:none;padding:6px 12px;border-radius:999px;cursor:pointer;transition:color .15s,background-color .15s}
nav.top a:hover,nav.top button:hover{color:var(--text);background:var(--raised)}
nav.top a[aria-current=page]{color:var(--text)}
nav.top form{display:contents}
main{flex:1;width:100%;padding:24px 0 72px}
main.narrow{display:grid;place-items:start center;padding-top:clamp(32px,10vh,112px)}
.solo{width:min(100% - 2*var(--gutter),420px)}
.solo h1{margin-bottom:12px}
.solo .lede{color:var(--muted);font-size:17px}
.solo .mascot{width:96px;height:96px;margin:0 0 20px -6px;color:var(--text)}
.btn{--h:48px;appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;height:var(--h);padding:0 20px;border-radius:999px;border:1px solid transparent;font:inherit;font-size:16px;font-weight:600;letter-spacing:-.005em;line-height:1;text-decoration:none;white-space:nowrap;cursor:pointer;transition:background-color .16s,border-color .16s,transform .16s var(--ease)}
.btn:active{transform:translateY(1px)}
.btn svg{width:16px;height:16px;flex:none}
.btn.primary{background:var(--coral);color:var(--ink)}
.btn.primary:hover{background:#ff6c4b}.btn.primary:active{background:var(--coral-deep)}
.btn.ink{background:var(--text);color:var(--bg)}
.btn.ink:hover{background:light-dark(#3a302a,#fff)}
.btn.ghost{border-color:var(--line-strong);background:transparent;color:var(--text)}
.btn.ghost:hover{background:var(--raised);border-color:var(--muted)}
.btn.sm{--h:36px;padding:0 14px;font-size:14.5px}
.btn.block{width:100%}
form.stack,.stack{display:grid;gap:10px;margin-top:28px}
label{font-size:14px;font-weight:600}
input[type=email]{width:100%;height:48px;padding:0 14px;border-radius:12px;border:1px solid var(--line-strong);background:var(--raised);color:var(--text);font:inherit;font-size:16px;transition:border-color .15s}
input[type=email]:hover{border-color:var(--muted)}
input[type=email]:focus-visible{outline:2px solid var(--focus);outline-offset:1px;border-color:transparent}
form.stack .btn{margin-top:8px}
.error{color:var(--accent-text);font-weight:500;margin-top:16px}
.fine{margin-top:20px;font-size:14px;color:var(--muted)}
.fine a,.linkbtn{color:var(--text)}
.linkbtn{appearance:none;border:0;background:none;padding:0;font:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.18em;cursor:pointer}
.code{margin:28px 0;padding:22px 12px;border-radius:14px;background:var(--sunk);font:400 clamp(28px,7vw,36px)/1 var(--mono);letter-spacing:.18em;text-indent:.18em;text-align:center}
.pagehead{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px 24px;padding:24px 0 28px}
.pagehead .sub{margin-top:8px;color:var(--muted);display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.pagehead .actions{display:flex;flex-wrap:wrap;gap:8px}
.back{display:inline-flex;align-items:center;gap:4px;color:var(--muted);text-decoration:none;font-size:15px;margin-bottom:14px}
.back:hover{color:var(--text)}
.back svg{width:16px;height:16px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));border-block:1px solid var(--line-strong)}
.fact{padding:20px 24px 22px 0}
.fact+.fact{padding-left:24px;border-left:1px solid var(--line)}
.fact b{display:block;font-family:var(--display);font-weight:500;font-size:clamp(30px,2vw + 18px,40px);line-height:1.05;letter-spacing:-.02em;font-feature-settings:"lnum","tnum"}
.fact span{display:block;margin-top:6px;font-size:14px;color:var(--muted)}
.fact small{font-size:15px;font-family:var(--sans);color:var(--muted);letter-spacing:0;font-weight:400}
.meter{height:4px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:12px;max-width:220px}
.meter i{display:block;height:100%;background:var(--text);border-radius:99px}
.section{padding-top:44px}
.section>h2,.sechead h2{margin-bottom:6px}
.sechead{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 16px;margin-bottom:18px}
.sechead p{color:var(--muted);font-size:15px}
table{width:100%;border-collapse:collapse;font-size:15px}
th{text-align:left;font-weight:600;color:var(--muted);font-size:13.5px;padding:0 16px 10px 0;border-bottom:1px solid var(--line-strong)}
td{padding:14px 16px 14px 0;border-bottom:1px solid var(--line);vertical-align:middle}
th:last-child,td:last-child{padding-right:0}
.num{text-align:right;font-variant-numeric:tabular-nums}
td.title a{font-weight:600;text-decoration:none}
td.title a:hover{text-decoration:underline;text-decoration-color:var(--accent-text)}
td.quiet{color:var(--muted)}
td.go{width:1%;white-space:nowrap;text-align:right}
.iconlink{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:999px;color:var(--muted);transition:color .15s,background-color .15s}
.iconlink:hover{color:var(--text);background:var(--raised)}
.iconlink svg{width:16px;height:16px}
.empty{display:grid;justify-items:start;gap:6px;padding:36px 0 8px}
.empty .mascot{width:96px;height:96px;margin-left:-6px;color:var(--text)}
.empty h3{font-family:var(--display);font-weight:520;font-size:22px;letter-spacing:-.02em}
.empty p{color:var(--muted);max-width:44ch}
.welcome{display:flex;align-items:center;gap:20px;padding:20px 0 24px;margin-bottom:8px;border-bottom:1px solid var(--line)}
.welcome .mascot{width:96px;height:96px;flex:none;color:var(--text)}
.welcome h2{margin-bottom:4px}
.welcome p{color:var(--muted);max-width:52ch}
.welcome p+p{margin-top:6px}
.offer{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:24px 48px;align-items:center;padding:32px;border:1px solid var(--line-strong);border-radius:20px;background:var(--raised);margin-bottom:8px}
.offer h2{font-size:clamp(24px,1.4vw + 16px,30px);margin-bottom:8px}
.offer .price{font-family:var(--display);font-size:22px;font-weight:500}
.offer .price span{font-family:var(--sans);font-size:15px;color:var(--muted);font-weight:400}
.offer ul{list-style:none;padding:0;margin-top:18px;display:grid;gap:9px}
.offer li{display:grid;grid-template-columns:18px 1fr;gap:10px;align-items:start;color:var(--text)}
.offer li svg{width:18px;height:18px;margin-top:3px;color:var(--muted)}
.offer .cta{display:grid;justify-items:start;gap:12px}
.offer .cta p{font-size:14px;color:var(--muted);max-width:32ch}
.chart{width:100%;height:auto;overflow:visible}
.chart .area{fill:var(--text);opacity:.07}
.chart .line{fill:none;stroke:var(--text);stroke-width:2;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.chart .grid{stroke:var(--line);stroke-width:1;vector-effect:non-scaling-stroke}
.chart text{fill:var(--muted);font:12px var(--sans);font-variant-numeric:tabular-nums}
.chart .cursor{display:none}.curve.on .cursor{display:inline}
.chart .cursor line{stroke:var(--text);stroke-width:1;opacity:.35;vector-effect:non-scaling-stroke}
.chart .cursor circle{fill:var(--bg);stroke:var(--text);stroke-width:2;vector-effect:non-scaling-stroke}
.curve{position:relative;touch-action:pan-y}
.readout{min-height:22px;margin-top:6px;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.note{margin-top:12px;font-size:14px;color:var(--muted)}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px 48px}
.bars{display:flex;align-items:flex-end;gap:3px;height:120px;padding-bottom:1px;border-bottom:1px solid var(--line-strong)}
.bars i{flex:1;background:var(--text);opacity:.82;border-radius:3px 3px 0 0;min-height:2px}
.bars i.zero{background:var(--line);opacity:1}
.axis{display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:var(--muted)}
.list{list-style:none;padding:0}
.list li{display:grid;grid-template-columns:1fr auto;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);font-size:15px;position:relative}
.list li:first-child{border-top:1px solid var(--line-strong)}
.list li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.list li b{font-weight:600;font-variant-numeric:tabular-nums}
.list li i{position:absolute;left:0;bottom:-1px;height:2px;background:var(--text);opacity:.5}
.none{color:var(--muted);font-size:15px;padding:12px 0;border-top:1px solid var(--line-strong)}
.locked{margin-top:40px;padding:32px;border:1px solid var(--line-strong);border-radius:20px;background:var(--raised);display:grid;gap:10px;justify-items:start}
.locked p{color:var(--muted);max-width:56ch}
.locked .btn{margin-top:8px}
footer.foot{border-top:1px solid var(--line)}
footer.foot .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 24px;padding:22px 0 calc(22px + env(safe-area-inset-bottom));font-size:14px;color:var(--muted)}
footer.foot nav{display:flex;flex-wrap:wrap;gap:6px 18px}
footer.foot a{text-decoration:none}footer.foot a:hover{color:var(--text)}
.copied{color:var(--accent-text)}
.danger{margin-top:24px;padding-top:32px;border-top:1px solid var(--line)}
code{font:14px var(--mono);overflow-wrap:anywhere}
@media (max-width:720px){
.hide{display:none}
.offer{grid-template-columns:1fr;padding:24px}
.fact{padding:16px 16px 18px 0}.fact+.fact{padding-left:16px}
.facts{grid-template-columns:repeat(2,minmax(0,1fr))}
.facts .fact:nth-child(3){padding-left:0;border-left:0}
.facts .fact:nth-child(n+3){border-top:1px solid var(--line)}
.welcome{align-items:flex-start}
.chart text{font-size:24px}.welcome .mascot{width:72px;height:72px}
nav.top .email{display:none}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

type LayoutOpts = { user?: User | null; narrow?: boolean; current?: "links" };

function layout(title: string, body: string, opts: LayoutOpts = {}) {
  const u = opts.user;
  const nav = u
    ? `<nav class="top" aria-label="Account"><a href="/account"${opts.current === "links" ? ' aria-current="page"' : ""}>Your links</a><form method="post" action="/logout"><button type="submit">Sign out</button></form></nav>`
    : `<nav class="top" aria-label="Account"><a href="${SITE}/pricing/">Pricing</a><a href="/login">Sign in</a></nav>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title><meta name="robots" content="noindex">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fff4e8"><meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1a1512">
<link rel="icon" href="${asset("favicon.svg")}" type="image/svg+xml"><link rel="apple-touch-icon" href="${asset("apple-touch-icon.png")}">
<link rel="preload" href="${asset("fraunces.woff2")}" as="font" type="font/woff2" crossorigin><link rel="preload" href="${asset("instrument-sans.woff2")}" as="font" type="font/woff2" crossorigin>
${umamiTag()}<style>${CSS}</style></head>
<body><header class="wrap top"><a class="brand" href="${u ? "/account" : "/"}" aria-label="Reelbird Pro, home">${LOGO}<span class="tag" aria-hidden="true">Pro</span></a>${nav}</header>
<main${opts.narrow ? ' class="narrow"' : ""}>${body}</main>
<footer class="foot"><div class="wrap"><span>Reelbird Pro${config.dev ? " · development server" : ""}</span><nav aria-label="Reelbird"><a href="${SITE}/">reelbird.app</a><a href="${SITE}/pricing/">Pricing</a><a href="${SITE}/docs/sharing/">Help</a><a href="${SITE}/terms/">Terms</a><a href="${SITE}/privacy/">Privacy</a><a href="mailto:${CONTACT}">Contact</a></nav></div></footer></body></html>`;
}

const solo = (inner: string) => `<div class="solo">${inner}</div>`;

export function notFoundPage(message = "This link doesn't exist, or its owner deleted it.") {
  return layout("Link not available · Reelbird", solo(`${MASCOT.sleeping}<h1>Link not available</h1><p class="lede">${esc(message)}</p>
<p class="fine">Made with <a href="${SITE}/">Reelbird</a>, the free screen recorder for Mac.</p>`), { narrow: true });
}

/** watch.reelbird.app itself. Signed-in people go to their links (see index.ts); this is for everyone else. */
export function homePage() {
  return layout("Reelbird Pro", solo(`<h1>Reelbird Pro</h1>
<p class="lede">Hosted share links and viewer analytics for Reelbird, the free screen recorder for Mac. ${PRICE} a month.</p>
<div class="stack"><a class="btn primary block" href="/login">Sign in</a></div>
<p class="fine">New here? <a href="${SITE}/pricing/">See what Pro includes</a> or <a href="${SITE}/download/">download Reelbird</a>, free.</p>`), { narrow: true });
}

export function loginPage(next: string, error?: string) {
  const note = config.instantLogin
    ? `Development server: you're signed in straight away, and no email is sent.`
    : `We'll email you a link that signs you in. No password.`;
  return layout("Sign in · Reelbird", solo(`<h1>Sign in to Reelbird</h1>
<p class="lede">Your account is your email address. A new address gets a new account.</p>
${error ? `<p class="error" role="alert">${esc(error)}</p>` : ""}
<form class="stack" method="post" action="/login"><input type="hidden" name="next" value="${esc(next)}">
<label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email" autocapitalize="off" spellcheck="false" autofocus>
<button class="btn primary block" type="submit">Email me a sign-in link</button></form>
<p class="fine">${note} By signing in you agree to the <a href="${SITE}/terms/">Terms</a> and <a href="${SITE}/privacy/">Privacy policy</a>.</p>`), { narrow: true });
}

export function reportPage(link: string | null) {
  const mail = `mailto:${CONTACT}?subject=${encodeURIComponent(`Report: ${link ? `${config.publicURL}/r/${link}/` : "a Reelbird link"}`)}`;
  return layout("Report a link · Reelbird", solo(`<h1>Report a link</h1>
<p class="lede">Links on watch.reelbird.app are shared by Reelbird Pro customers. If one breaks the law or our <a href="${SITE}/terms/#acceptable-use">acceptable use rules</a>, tell us and we'll look at it.</p>
<div class="stack"><a class="btn primary block" href="${esc(mail)}">Email ${CONTACT}</a></div>
<p class="fine">Include the link${link ? ` (<code>${esc(`${config.publicURL}/r/${link}/`)}</code>)` : ""} and what's wrong.</p>`), { narrow: true });
}

export function checkEmailPage(email: string) {
  return layout("Check your email · Reelbird", solo(`<h1>Check your email</h1>
<p class="lede">We sent a sign-in link to <b style="color:var(--text);font-weight:600">${esc(email)}</b>. Open it on this device. It works once, for 15 minutes.</p>
<p class="fine">Nothing there? Check spam, or <a href="/login">use another address</a>.</p>`), { narrow: true });
}

export function confirmLoginPage(token: string) {
  return layout("Sign in · Reelbird", solo(`<h1>Sign in to Reelbird</h1>
<p class="lede">Continue to finish signing in.</p>
<form class="stack" method="post" action="/login/verify"><input type="hidden" name="token" value="${esc(token)}">
<button class="btn primary block" type="submit">Continue</button></form>`), { narrow: true });
}

export function linkExpiredPage() {
  return layout("Link expired · Reelbird", solo(`<h1>That link has expired</h1>
<p class="lede">Sign-in links work once, for 15 minutes.</p>
<div class="stack"><a class="btn primary block" href="/login">Get a new link</a></div>`), { narrow: true });
}

/**
 * The sign-in email. Plain and short; the button is the whole message. Email clients don't load web
 * fonts or SVG, so it uses system fonts and the PNG app icon, with brand colours.
 */
export function loginEmail(url: string, minutes: number) {
  const text = `Sign in to Reelbird:\n\n${url}\n\nThe link works once, for ${minutes} minutes. If you didn't ask for it, ignore this email.\n\nReelbird · ${SITE}`;
  const html = `<!doctype html><html><head><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:40px 16px;background:#fff4e8;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1512">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:440px" cellpadding="0" cellspacing="0"><tr><td>
<img src="${config.publicURL}${asset("icon-512.png")}" width="44" height="44" alt="Reelbird" style="display:block;border:0;margin:0 0 28px">
<p style="margin:0 0 10px;font:600 24px/1.2 Georgia,'Times New Roman',serif;letter-spacing:-.01em">Sign in to Reelbird</p>
<p style="margin:0 0 28px;color:#6e645c">This button signs you in. It works once, for ${minutes} minutes.</p>
<a href="${esc(url)}" style="display:inline-block;background:#ff5a36;color:#1a1512;text-decoration:none;font-weight:600;padding:13px 26px;border-radius:999px">Sign in</a>
<p style="margin:32px 0 0;padding-top:20px;border-top:1px solid #ead9c6;font-size:13px;color:#6e645c">If you didn't ask for this, ignore this email. Reelbird · <a href="${SITE}" style="color:#6e645c">reelbird.app</a></p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject: "Your Reelbird sign-in link", text, html };
}

/** Sent after a Mac is connected, so an approval made by mistake doesn't go unnoticed. */
export function connectedEmail(name: string | null) {
  const what = name ? `Reelbird on ${name}` : "A Mac";
  const text = `${what} was just connected to your Reelbird account. It can upload, update and delete your links.\n\nIf this wasn't you, sign it out on your account page: ${config.publicURL}/account#macs\n\nReelbird · ${SITE}`;
  const html = `<!doctype html><html><head><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:40px 16px;background:#fff4e8;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1512">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:440px" cellpadding="0" cellspacing="0"><tr><td>
<img src="${config.publicURL}${asset("icon-512.png")}" width="44" height="44" alt="Reelbird" style="display:block;border:0;margin:0 0 28px">
<p style="margin:0 0 10px;font:600 24px/1.2 Georgia,'Times New Roman',serif">${esc(what)} was connected</p>
<p style="margin:0 0 28px;color:#6e645c">It can upload, update and delete links in your account. If this wasn't you, sign it out.</p>
<a href="${config.publicURL}/account#macs" style="display:inline-block;background:#ff5a36;color:#1a1512;text-decoration:none;font-weight:600;padding:13px 26px;border-radius:999px">Review signed-in Macs</a>
<p style="margin:32px 0 0;padding-top:20px;border-top:1px solid #ead9c6;font-size:13px;color:#6e645c">Reelbird · <a href="${SITE}" style="color:#6e645c">reelbird.app</a></p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject: "A Mac was connected to your Reelbird account", text, html };
}

export function devicePage(user: User, code: string, name: string | null, state: "ask" | "done" | "invalid") {
  if (state === "invalid") {
    return layout("Connect Reelbird", solo(`<h1>That code has expired</h1>
<p class="lede">Start again in Reelbird: Settings › Sharing › Reelbird Pro › Sign In.</p>`), { user, narrow: true });
  }
  if (state === "done") {
    return layout("Reelbird is connected", solo(`${MASCOT.celebrating}<h1>Reelbird is connected</h1>
<p class="lede">You're signed in as ${esc(user.email)}. Go back to Reelbird; you can close this tab.</p>`), { user, narrow: true });
  }
  return layout("Connect Reelbird", solo(`<h1>Connect Reelbird${name ? ` on ${esc(name)}` : ""}</h1>
<p class="lede">Only connect if you just chose Sign In in Reelbird on your own Mac, and this code matches the one it shows.</p>
<div class="code" aria-label="Code ${esc(code.split("").join(" "))}">${esc(code)}</div>
<form method="post" action="/device"><input type="hidden" name="code" value="${esc(code)}">
<button class="btn primary block" type="submit">Connect</button></form>
<form class="fine" method="post" action="/logout"><input type="hidden" name="next" value="${esc(`/login?next=${encodeURIComponent(`/device?code=${code}`)}`)}">Signed in as ${esc(user.email)}. Reelbird can then upload, update and delete links in this account. <button class="linkbtn" type="submit">Not you?</button></form>`), { user, narrow: true });
}

// Decimal units, like Finder.
const fmtBytes = (n: number) =>
  n < 1e6 ? `${Math.round(n / 1e3)} KB` : n < 1e9 ? `${(n / 1e6).toFixed(0)} MB` : `${+(n / 1e9).toFixed(1)} GB`;
const fmtDur = (s: number) => {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
};
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
const fmtWatch = (s: number) => {
  const [n, unit] = s < 60 ? [Math.round(s), "second"] : s < 3600 ? [Math.round(s / 60), "minute"] : [+(s / 3600).toFixed(1), "hour"];
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
};
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

/** What Pro is, said the same way on the account and stats pages. The coral button is the one coral thing. */
function offer(lead: string, note: string) {
  return `<section class="offer" aria-labelledby="offer-title"><div>
<h2 id="offer-title">${lead}</h2><p class="price">${PRICE} <span>a month</span></p>
<ul>
<li>${ICONS.check}<span>Share from Reelbird with nothing to set up</span></li>
<li>${ICONS.check}<span>Unlimited links and 100 GB of video</span></li>
<li>${ICONS.check}<span>See how many watched, where they stopped and where they came from</span></li>
</ul></div>
<div class="cta"><a class="btn primary" href="/upgrade">Upgrade to Pro</a><p>${note}</p></div></section>`;
}

export function accountPage(
  user: User,
  usage: { activeLinks: number; storageBytes: number },
  lim: { activeLinks: number | null; storageBytes: number },
  shares: { id: string; title: string | null; created_at: Date; bytes: string; views: number; opens: number }[],
  billingState: { subscribed: boolean; paymentFailed?: boolean; portal: boolean; welcome: boolean; deleted?: boolean } = { subscribed: false, portal: false, welcome: false },
  macs: { id: string; name: string | null; created_at: Date; last_used_at: Date }[] = [],
) {
  const pro = user.plan === "pro";
  // Billing shows for anyone with a subscription, Pro or not: a failed payment is when it matters most.
  const billing = billingState.subscribed && billingState.portal ? `<a class="btn ghost sm" href="/billing">Manage billing</a>` : "";
  const notice = billingState.paymentFailed && billingState.portal
    ? `<div class="welcome" role="alert"><div><h2>Your last payment didn't go through</h2><p>Update your card in <a href="/billing">billing</a> to keep Pro. Your links keep playing either way.</p></div></div>`
    : billingState.deleted ? `<p class="note" role="status" style="margin:0 0 16px">Link deleted. It stopped working straight away, and its video is being removed.</p>` : "";
  const devPlan = config.dev
    ? `<form method="post" action="/dev/plan" style="margin:0"><input type="hidden" name="plan" value="${pro ? "free" : "pro"}"><button class="btn ghost sm" type="submit">Dev: ${pro ? "end Pro" : "start Pro"}</button></form>`
    : "";
  const welcome = billingState.welcome
    ? pro
      ? `<div class="welcome" role="status">${MASCOT.celebrating}<div><h2>Welcome to Pro</h2><p>Thank you for supporting Reelbird. Press Share on any recording; its link shows up here with its views.</p><p>No Reelbird on this Mac yet? <a href="${SITE}/download/">Download it</a>, free, then sign in from Share › Reelbird Pro with this email address.</p></div></div>`
      : `<div class="welcome" role="status"><div><h2>Finishing up…</h2><p>Stripe is confirming the payment. <a href="/account?welcome=pro">Refresh</a> in a few seconds.</p></div></div>`
    : "";
  const pct = lim.storageBytes ? Math.min(100, (usage.storageBytes / lim.storageBytes) * 100) : 0;
  const facts = pro
    ? `<div class="facts">
<div class="fact"><b>${usage.activeLinks.toLocaleString("en")}</b><span>${usage.activeLinks === 1 ? "Link" : "Links"} · unlimited</span></div>
<div class="fact"><b>${fmtBytes(usage.storageBytes)} <small>of ${fmtBytes(lim.storageBytes)}</small></b><span>Video stored</span><div class="meter" role="img" aria-label="${pct.toFixed(0)}% used"><i style="width:${Math.max(pct, usage.storageBytes ? 1 : 0).toFixed(1)}%"></i></div></div>
<div class="fact"><b>${shares.reduce((n, s) => n + s.views, 0).toLocaleString("en")}</b><span>Views, all links</span></div>
</div>`
    : offer("Share without setting anything up", `Cancel any time. Recording, editing, exporting and sharing to your own bucket stay free.${usage.activeLinks ? " Your existing links keep playing." : ""}`);
  const rows = shares.map((s) => `<tr>
<td class="title"><a href="/account/s/${esc(s.id)}">${esc(s.title || "Untitled recording")}</a></td>
<td class="num">${s.views.toLocaleString("en")}</td><td class="num quiet hide">${fmtBytes(Number(s.bytes))}</td><td class="quiet hide">${fmtDate(s.created_at)}</td>
<td class="go"><a class="iconlink" href="/r/${esc(s.id)}/" target="_blank" rel="noopener" aria-label="Open the link" title="Open the link">${ICONS.open}</a></td></tr>`).join("");
  const list = shares.length
    ? `<table><thead><tr><th scope="col">Recording</th><th scope="col" class="num">Views</th><th scope="col" class="num hide">Size</th><th scope="col" class="hide">Shared</th><th scope="col"><span class="hide" style="position:absolute;width:1px;height:1px;overflow:hidden">Open</span></th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="empty">${MASCOT.sleeping}<h3>No links yet</h3><p>${pro ? "In Reelbird, press Share on any recording. Its link shows up here with its views." : "Links you share with Pro show up here with their views."}</p></div>`;
  return layout("Your links · Reelbird Pro", `<div class="wrap">
<div class="pagehead"><div><h1>Your links</h1><p class="sub"><span>${esc(user.email)}</span>${pro ? `<span aria-hidden="true">·</span><span>Reelbird Pro</span>` : ""}</p></div><div class="actions">${billing}${devPlan}</div></div>
${notice}${welcome}${facts}
<section class="section" aria-label="Links">${list}</section>
${macs.length ? `<section class="section danger" id="macs"><div class="sechead"><h2>Signed-in Macs</h2><p>Reelbird and scripts that can upload and delete links in this account.</p></div>
<table><thead><tr><th scope="col">Name</th><th scope="col" class="hide">Signed in</th><th scope="col" class="hide">Last used</th><th scope="col"><span class="hide" style="position:absolute;width:1px;height:1px;overflow:hidden">Sign out</span></th></tr></thead><tbody>
${macs.map((m) => `<tr><td>${esc(m.name || "Reelbird")}</td><td class="quiet hide">${fmtDate(m.created_at)}</td><td class="quiet hide">${fmtDate(m.last_used_at)}</td>
<td class="go"><form method="post" action="/account/macs/${esc(m.id)}/revoke"><button class="btn ghost sm" type="submit">Sign out</button></form></td></tr>`).join("")}
</tbody></table></section>` : ""}</div>`, { user, current: "links" });
}

function retentionSVG(retention: number[], chunkSeconds: number, duration: number | null) {
  if (!retention.length) return `<p class="none">The curve appears after the first view of the current version.</p>`;
  const W = 640, H = 180;
  const n = retention.length;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - v * H;
  const pts = retention.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const total = duration ?? n * chunkSeconds;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => `<text x="${(f * W).toFixed(0)}" y="${H + 26}" text-anchor="${f === 0 ? "start" : f === 1 ? "end" : "middle"}">${fmtDur(f * total)}</text>`).join("");
  const grid = [0, 0.5, 1].map((f) => `<line class="grid" x1="0" x2="${W}" y1="${y(f)}" y2="${y(f)}"/><text x="-10" y="${y(f) + 4}" text-anchor="end">${Math.round(f * 100)}%</text>`).join("");
  // The readout follows the pointer: "62% still watching at 1:14".
  return `<div class="curve" data-r="${retention.map((v) => Math.round(v * 1000) / 1000).join(",")}" data-total="${total}">
<svg class="chart" viewBox="-62 -10 ${W + 70} ${H + 46}" role="img" aria-label="Share of viewers still watching at each point of the video">
${grid}<polygon class="area" points="0,${H} ${pts} ${W},${H}"/><polyline class="line" points="${pts}"/>${ticks}
<g class="cursor"><line x1="0" x2="0" y1="0" y2="${H}"/><circle r="4" cx="0" cy="0"/></g></svg><p class="readout" aria-live="polite"></p></div>
<script>(()=>{const el=document.currentScript.previousElementSibling,svg=el.querySelector("svg"),g=el.querySelector(".cursor"),out=el.querySelector(".readout"),r=el.dataset.r.split(",").map(Number),total=+el.dataset.total,W=${W},H=${H};
const fmt=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0")};
svg.addEventListener("pointermove",e=>{const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());const i=Math.max(0,Math.min(r.length-1,Math.round(p.x/W*(r.length-1))));const x=r.length>1?i/(r.length-1)*W:W/2;
el.classList.add("on");g.querySelector("line").setAttribute("x1",x);g.querySelector("line").setAttribute("x2",x);const c=g.querySelector("circle");c.setAttribute("cx",x);c.setAttribute("cy",H-r[i]*H);
out.textContent=Math.round(r[i]*100)+"% still watching at "+fmt(r.length>1?i/(r.length-1)*total:0)});
svg.addEventListener("pointerup",e=>{if(e.pointerType!=="mouse")setTimeout(()=>{el.classList.remove("on");out.textContent=""},1600)});svg.addEventListener("pointerleave",()=>{el.classList.remove("on");out.textContent=""})})()</script>`;
}

function listBlock(title: string, rows: { name: string; views: number }[]) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  const body = rows.length
    ? `<ul class="list">${rows.map((r) => `<li><span>${esc(r.name)}</span><b>${r.views.toLocaleString("en")}</b><i style="width:${((r.views / max) * 100).toFixed(1)}%" aria-hidden="true"></i></li>`).join("")}</ul>`
    : `<p class="none">No data yet</p>`;
  return `<section class="section"><div class="sechead"><h2>${esc(title)}</h2></div>${body}</section>`;
}

function deleteForm(id: string) {
  return `<section class="section danger"><div class="sechead"><h2>Delete this link</h2><p>It stops working at once for everyone, and its video and stats are removed. Copies people downloaded aren't affected.</p></div>
<form method="post" action="/account/s/${esc(id)}/delete" onsubmit="return confirm('Delete this link? It stops working for everyone. This can\\'t be undone.')"><button class="btn ghost sm" type="submit">Delete link</button></form></section>`;
}

const COPY_SCRIPT = `<script>document.querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(new URL(b.dataset.copy,location.href).href);const s=b.querySelector("span"),t=s.textContent;s.textContent="Copied";b.classList.add("copied");setTimeout(()=>{s.textContent=t;b.classList.remove("copied")},1600)}catch(e){location.href=b.dataset.copy}}))</script>`;

export function statsPage(user: User, s: Stats) {
  const title = s.title || "Untitled recording";
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v)}%`);
  const facts = `<div class="facts">
<div class="fact"><b>${s.views.toLocaleString("en")}</b><span>Views</span></div>
<div class="fact"><b>${s.locked ? "—" : s.uniqueViewers.toLocaleString("en")}</b><span>Viewers</span></div>
<div class="fact"><b>${pct(s.averagePercent)}</b><span>Watched on average</span></div>
<div class="fact"><b>${pct(s.completionRate)}</b><span>Reached the end</span></div>
</div>`;
  const head = `<a class="back" href="/account">${ICONS.back}Your links</a>
<div class="pagehead" style="padding-top:0"><div><h1>${esc(title)}</h1>${s.duration ? `<p class="sub"><span class="tnum">${fmtDur(s.duration)}</span></p>` : ""}</div>
<div class="actions"><button class="btn ghost sm" type="button" data-copy="/r/${esc(s.id)}/">${ICONS.link}<span>Copy link</span></button><a class="btn ghost sm" href="/r/${esc(s.id)}/" target="_blank" rel="noopener">${ICONS.open}<span>Open</span></a></div></div>`;
  const pageTitle = `${title} · Reelbird Pro`;
  if (s.locked) {
    return layout(pageTitle, `<div class="wrap">${head}${facts}
<div class="locked"><h2>See how it's watched</h2><p>Pro shows how many people watched, where they stopped, where they came from and every recent view.${s.views ? ` ${plural(s.views, "view is", "views are")} already counted for this link.` : ""}</p><a class="btn primary" href="/upgrade">Upgrade to Pro · ${PRICE} a month</a></div>${deleteForm(s.id)}</div>${COPY_SCRIPT}`, { user });
  }
  const maxDay = Math.max(1, ...s.byDay.map((d) => d.views));
  const bars = s.byDay.map((d) => `<i class="${d.views ? "" : "zero"}" style="height:${d.views ? Math.max(4, (d.views / maxDay) * 100) : 2}%" title="${esc(fmtDate(d.day + "T12:00:00Z"))}: ${plural(d.views, "view")}"></i>`).join("");
  const first = s.byDay[0]?.day, last = s.byDay[s.byDay.length - 1]?.day;
  const shortDay = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
  const recent = s.recent.length
    ? `<table><thead><tr><th scope="col">When</th><th scope="col" class="num">Got to</th><th scope="col" class="hide">Device</th><th scope="col" class="hide">From</th></tr></thead><tbody>${s.recent.map((r) => `<tr><td>${new Date(r.at).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td><td class="num">${r.percent === null ? fmtDur(r.seconds) : r.percent + "%"}</td><td class="quiet hide">${esc([r.device, r.browser].filter(Boolean).join(" · "))}</td><td class="quiet hide">${esc(r.referrer ?? "Direct")}</td></tr>`).join("")}</tbody></table>`
    : `<p class="none">No views yet. Send the link to someone.</p>`;
  return layout(pageTitle, `<div class="wrap">${head}${facts}
<p class="note">${fmtWatch(s.watchSeconds)} watched in total. A view is at least 3 seconds of playing (or most of a shorter video); your own plays and link previews don't count. Viewers are counted once a day, without cookies, so someone who comes back on another day counts again.</p>
<section class="section"><div class="sechead"><h2>Where viewers stop</h2><p>Share of viewers still watching, across the current version</p></div>${retentionSVG(s.retention, s.chunkSeconds, s.duration)}</section>
<div class="cols">
<section class="section"><div class="sechead"><h2>Views</h2><p>Last 30 days</p></div><div class="bars" role="img" aria-label="Views per day over the last 30 days">${bars}</div>${first && last ? `<div class="axis"><span>${shortDay(first)}</span><span>${shortDay(last)}</span></div>` : ""}</section>
${listBlock("Sources", s.referrers)}
${listBlock("Devices", s.devices)}
${s.countries.length ? listBlock("Countries", s.countries) : ""}
</div>
<section class="section"><div class="sechead"><h2>Recent views</h2></div>${recent}</section>
${deleteForm(s.id)}</div>${COPY_SCRIPT}`, { user });
}
