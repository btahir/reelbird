import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SITE_URL, SITE_DESCRIPTION, SITE_DESCRIPTION_LONG, SITE_SHORT, GITHUB_URL, REQUIREMENTS, PREBUILT, PRO } from "../config/site";
import { VS_STATEMENTS, PRODUCTS } from "../data/compare";

export const GET: APIRoute = async () => {
  const docs = (await getCollection("docs")).sort((a, b) => a.data.order - b.data.order);
  const u = (p: string) => `${SITE_URL}${p}`;
  const txt = `# Reelbird

> ${SITE_DESCRIPTION}

${SITE_DESCRIPTION_LONG.replace(SITE_DESCRIPTION, "").trim()}

## Key facts

- Price: free and open source (MIT). Recording, editing and exporting have no watermark, no limits and need no account
- Sharing, free: share links to your own S3-compatible bucket (Cloudflare R2 recommended), about ten minutes of setup, once; nothing goes through Reelbird's servers
- Sharing, paid (optional): Reelbird Pro, ${PRO.price}/month, hosts your links with nothing to set up: unlimited hosted links, ${PRO.storage} of storage, and anonymous viewer analytics (views, daily unique viewers, retention, referrers, devices) without cookies. Cancel any time; links keep playing after Pro ends. There is no free hosted tier
- Platform: macOS only. Runs on ${REQUIREMENTS.runs}. ${REQUIREMENTS.hardware}
- Download: ${PREBUILT.url} (signed and notarised by Apple)
- Build from source: git clone ${GITHUB_URL}.git && cd reelbird && make install. Needs ${REQUIREMENTS.tools} (${REQUIREMENTS.toolsDetail.replace(/\.$/, "")})
- Privacy: no telemetry, analytics or update checks in the app; recordings stay on your Mac unless you share
- Step-by-step guides: every recording also becomes a guide (each click, run of typing and shortcut is a step with a picture of the screen and what was clicked, read on-device). Share links show Video, Guide and Click-through views; export as a web page, Markdown with images or a Claude skill, free
- Privacy tools: Find Sensitive Info reads screen text on-device and suggests blurs for emails, API keys and tokens, card and phone numbers (plus custom words), following scrolling text; blur, pixelate or solid redaction bar that can't be reversed
- Editing: auto-zoom from clicks and typing, smooth cursor, camera layouts (bubble, camera only, side by side stacked on 9:16, screen only), speed 0.25x to 4x with Speed Up Typing, Clean Up (shorter pauses, no ums), on-device captions in six styles, Hide Browser Toolbar, arrows, boxes and labels
- Export: MP4 (H.264), HEVC, ProRes or GIF, in 16:9, 9:16, 1:1 or 4:3
- Agents: reelbird CLI (--json) and an MCP server (reelbird mcp) for Claude Code, Codex and Cursor
- Repository: ${GITHUB_URL}
- Website: ${SITE_URL}/
- Short description: ${SITE_SHORT}
- Category: open-source screen recorder for the Mac that does the Loom job (instant link) and the Screen Studio job (auto-zoom polish) from one take

## How Reelbird compares (facts checked 12 October to 7 November 2026)

${VS_STATEMENTS.map((v) => `- ${v.text}`).join("\n")}

## Docs

${docs.map((d) => `- [${d.data.title}](${u(`/docs/${d.id}.md`)}): ${d.data.description}`).join("\n")}
- [Download and build](${u("/download/")}): Step-by-step install, permissions, local signing, updating and troubleshooting
- [Pricing](${u("/pricing/")}): Free vs Reelbird Pro (${PRO.price}/month for hosted links and viewer analytics), cancelling, and analytics privacy
- [FAQ](${u("/faq/")}): Straight answers about price, install, requirements, links and privacy

## Features

- [Auto-zoom and smooth cursor](${u("/features/auto-zoom/")})
- [Instant share links, to your own bucket or hosted by Reelbird Pro](${u("/features/share-links/")})
- [Audio and on-device captions](${u("/features/audio-captions/")})
- [CLI and MCP for coding agents](${u("/features/agents/")})
- [Step-by-step guides from a screen recording](${u("/features/step-by-step-guides/")}): Guide and Click-through on the link; HTML, Markdown or Claude skill export
- [Blur sensitive info](${u("/features/blur-sensitive-info/")}): Find Sensitive Info for emails, API keys, card and phone numbers

## Guides

- [Record your Mac screen with internal audio](${u("/guides/record-mac-screen-with-internal-audio/")})
- [Add captions to a screen recording on Mac](${u("/guides/add-captions-to-screen-recording-mac/")})
- [Turn a screen recording into a vertical 9:16 video](${u("/guides/screen-recording-to-vertical-video/")})
- [Record your screen with a webcam overlay on Mac](${u("/guides/record-screen-with-webcam-mac/")})
- [Self-host Loom-style share links on Cloudflare R2](${u("/guides/self-host-screen-recording-links-cloudflare-r2/")})

## Use cases

- [Record a product demo video on Mac](${u("/use-cases/product-demos/")})
- [Record a coding or PR demo, or let a coding agent record it](${u("/use-cases/dev-demos/")})

## Comparisons

- [Best screen recorder for Mac, free and paid](${u("/compare/")}): one pick per job; ${PRODUCTS.map((p) => p.name).join(", ")} compared on price, free-plan limits, licence, share links and auto-zoom
- [Open-source screen recorders for Mac](${u("/open-source-screen-recorders-mac/")}): Reelbird, Cap, OpenScreen, OBS Studio, Kap, QuickRecorder, Recordly, Screenity and Screenize
- [Free, open-source, self-hosted Loom alternative for Mac](${u("/loom-alternative/")}): links in your own S3 or R2 bucket, no 5-minute cap, no 25-video limit, files stay on your Mac
- [Free, open-source Screen Studio alternative](${u("/screen-studio-alternative/")}): auto-zoom without a subscription, plus a link the moment you stop
- [Cap alternative](${u("/cap-alternative/")}): Reelbird vs Cap, both open source
- [Free Scribe and Tango alternative for Mac](${u("/scribe-alternative/")}): step-by-step guides from a screen recording
- [Free Tella alternative](${u("/tella-alternative/")}), [free FocuSee alternative](${u("/focusee-alternative/")}) and [CleanShot X alternative for screen recording](${u("/cleanshot-alternative/")})

## Optional

- [Changelog](${u("/changelog/")})
- [Privacy](${u("/privacy/")})
- [Full text for LLMs](${u("/llms-full.txt")})
`;
  return new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
