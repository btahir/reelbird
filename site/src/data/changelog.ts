/** Release notes. /changelog and /changelog/rss.xml read this. Newest first. */
export interface Release { version: string; date: string; title: string; summary: string; notes: string[] }

import { APP_VERSION } from "../config/site";

const newer = (a: string, b: string) => {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) if ((x![i] ?? 0) !== (y![i] ?? 0)) return (x![i] ?? 0) > (y![i] ?? 0);
  return false;
};

const ALL: Release[] = [
  {
    version: "0.4.1",
    date: "2026-11-02",
    title: "Timeline handles that are easier to grab",
    summary: "The trim handles and the edges of a selected part are easier to catch and smoother to drag.",
    notes: [
      "Trim handles and the edges of a selected part can be grabbed a little either side of the bar, not just on it.",
      "An edge moves from where you grab it as soon as you drag, instead of waiting and then jumping to the pointer.",
      "The trim start handle can be grabbed while the playhead sits on it, as it does when a recording opens.",
      "The resize pointer shows over every timeline edge (trim, parts, zooms, camera layouts, speed and overlays) and stays while you drag.",
      "Handles widen a little on hover and while you drag them.",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-10-27",
    title: "Caption styles and one-click Clean Up",
    summary: "Captions come in six looks, from Classic to a word-by-word Highlight, in the language you pick. Clean Up tightens a whole take in one go: shorter pauses, no ums or dead time, faster typing and waiting, and every change can be put back.",
    notes: [
      "Caption styles: Classic, Highlight (the spoken word lights up), Marker (a highlighter box follows your words), and Pop, One Word and Slam for short social clips. Five colour sets, three sizes.",
      "Caption position: Auto puts captions under the video when there's room, and otherwise at the bottom, moving to the top while you work near the bottom of the screen. Or pin them to the bottom, below the video or the top.",
      "Pick the spoken language next to Generate Captions. The menu lists the languages Apple supports on your Mac, downloaded ones first, and remembers your choice.",
      "Fix captions in place: double-click a line in the transcript, and the words keep their timing. Fix a misheard word everywhere at once, or hide a line from captions.",
      "Clean Up (W, the wand under the video): shortens long pauses instead of deleting them, cuts ums and dead time at the start and end, and speeds up silent typing and waiting. Likely retakes are offered as suggestions.",
      "A bar after Clean Up says what changed. Review plays each change from a second before, and lets you put it back, apply a suggestion or dismiss it. Undo puts everything back.",
      "Smoother cuts everywhere: every cut join dips the sound for a moment so there's no click, and the cursor glides across a cut instead of jumping.",
      "Speed Up Typing joins bursts of typing up to 2 seconds apart, so a long stretch of typing becomes one speed-up instead of several.",
      "Command line and MCP: reelbird cleanup (with --dry-run and --undo) and clean_up, and the caption keys captions.style, captions.palette, captions.size and captions.position.",
      "Clean Up replaces Cut Long Silences.",
    ],
  },
  {
    version: "0.3.1",
    date: "2026-10-22",
    title: "A calmer timeline, a Speed panel and better blurs",
    summary: "Click any part of the video to select it and trim just that part. Cuts close up neatly, speed has its own panel from 0.25× to 4×, and blurs can be soft-edged, oval or a solid bar.",
    notes: [
      "Click the video on the timeline to select a part, then drag its edges to trim just that part. The timeline holds still while you drag and applies the trim when you let go.",
      "Split points are saved with the recording.",
      "Cut parts close up into a small scissors marker instead of a big hatched block. Click the marker to bring the part back. Cuts glide shut, and the timeline keeps its scale.",
      "Speed is a button that shows the selected part's speed. Click it to drag the value, use a slider from 0.25× to 4×, or pick a preset.",
      "Blurs can be square, rounded or oval, can have a soft edge that fades out around the area (never into it), and can be a solid redaction bar.",
      "Buttons light up when you hover over them.",
      "Fixed: the speed slider disappearing when dragged through 1×.",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-10-22",
    title: "Every recording is a step-by-step guide",
    summary: "Each click, run of typing and shortcut becomes a step with a picture of the screen. Shared links show a Guide and a Click-through next to the video, and viewers can copy text straight out of the paused video.",
    notes: [
      "Guide panel (⌘9): every step with its picture, what you clicked (read from the screen on your Mac) and what you said. Rewrite or hide steps, and read the screen again.",
      "Shared links get Video, Guide and Click-through views. In Click-through, viewers click the highlighted spot to move through the steps themselves.",
      "Copy text: pause a shared video and select any text in the frame. Text under a blur is never included.",
      "Export a guide as a web page, Markdown with images, or a Claude skill.",
      "On Macs with Apple Intelligence, steps you talked through get your reason added, like: Click \"Save\" to keep the draft.",
      "Typed text stays out of guides unless you turn on Show what was typed, and anything that looks like an email, key, card or phone number is masked even then.",
      "Command line and MCP: reelbird steps and reelbird guide, plus get_steps, describe_take, edit_step and export_guide, so an agent can read what a recording shows.",
      "The in-app support links are gone; Reelbird Pro is how to support the project.",
    ],
  },
  {
    version: "0.2.3",
    date: "2026-10-20",
    title: "Signing in to Reelbird Pro always saves",
    summary: "Fixes \"Couldn't save the secret in the Keychain\" when signing in, if an older or self-built copy of Reelbird had saved a sign-in before.",
    notes: [
      "Signing in to Reelbird Pro, or saving your own bucket's key, no longer fails because of a Keychain item an older copy of Reelbird left behind.",
      "If macOS ever refuses to replace an item, the message says how to clear it in Keychain Access.",
    ],
  },
  {
    version: "0.2.2",
    date: "2026-10-20",
    title: "Updating a link really replaces it",
    summary: "When you update a shared link with edits, blurs and removed captions now reach everyone: the earlier version's files are deleted. Plus safer edits from agents and a keystroke overlay that respects blurs.",
    notes: [
      "Update Link deletes the earlier version's files after publishing, including the quick stream and any captions or posters you removed. Before, someone with the link could still fetch the unblurred original.",
      "A slow upload that finishes after you've published your edits can no longer put the original back.",
      "The app, the command line and MCP agents can edit the same project at once without losing each other's changes.",
      "The keystroke overlay shows shortcuts only, unless you turn on Include typed text, and never shows typing while a blur is on screen.",
      "Find Sensitive Info says what it checks: the screen, not narration, captions or overlays.",
      "Reelbird Pro is called Reelbird Pro everywhere, and shared pages use the brand's coral and the robin.",
    ],
  },
  {
    version: "0.2.1",
    date: "2026-10-20",
    title: "Fix permissions that look on but don't work",
    summary: "A Reset button for permissions that are switched on in System Settings but still don't apply, and Reelbird Pro in the menus.",
    notes: [
      "Settings › Permissions shows Reset when Screen Recording, Accessibility or Input Monitoring is on in System Settings but not working. It clears the entry an earlier copy of Reelbird left behind, and macOS asks again.",
      "The welcome window offers the same reset on its Screen Recording step.",
      "Reelbird Pro… in the Reelbird menu and the menu bar menu opens your account, or sign-in and upgrade.",
      "A Pricing page on the website compares the free app and Reelbird Pro.",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-10-20",
    title: "Share without setting up storage",
    summary: "Reelbird Pro hosts your links for you, with analytics that show how many people watched and where they stopped. Recording, editing, exporting and sharing to your own bucket stay free.",
    notes: [
      "Reelbird Pro ($5 a month): sign in from Settings › Sharing and Share just works, with no bucket to set up.",
      "Anonymous viewer analytics: views, daily unique viewers, where people stopped and where they came from. View counts show in the Library; the full stats are on your account page.",
      "Sharing to your own bucket is unchanged and free. Links you already shared keep working.",
      "The Share panel offers both ways to get a link. Exports never carry a watermark.",
      "Shared pages now say what Reelbird is: a free screen recorder for Mac.",
    ],
  },
  {
    version: "0.1.2",
    date: "2026-10-19",
    title: "Any speed between 0.5× and 2×",
    summary: "A speed slider for any part of a recording, and Show in Finder that brings Finder forward every time.",
    notes: [
      "Select a part between split points, or a speed segment, and drag the speed slider: anything from 0.5× to 2× in 0.05× steps, such as 1.2×.",
      "Only the selected part changes speed. One drag is one undo step.",
      "R still steps through the preset speeds; 0.25×, 4× and 8× stay in a speed segment's menu.",
      "Show in Finder now brings Finder to the front, instead of sometimes opening it behind Reelbird.",
    ],
  },
  {
    version: "0.1.1",
    date: "2026-10-13",
    title: "Signed and notarised download",
    summary: "The download is now signed with an Apple Developer ID and notarised by Apple, so it opens with no approval step and keeps its permissions across updates.",
    notes: [
      "Signed with an Apple Developer ID and notarised by Apple. No more Open Anyway in System Settings.",
      "macOS keeps Screen Recording and the other permissions when you update.",
      "Privacy blur, arrows, boxes, text and highlights in the editor.",
      "Speed changes, markers and camera layouts on the timeline, a command menu (⌘K) and a shortcut sheet (⌘/).",
      "A movable camera bubble in circle, rounded square or portrait shapes that matches the export exactly.",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-10-12",
    title: "First public release",
    summary: "Reelbird's first open-source release: record, get a link when you stop, polish it later under the same link.",
    notes: [
      "Record a display, a window or an area, with camera, microphone and system audio on separate tracks.",
      "Crash-safe recording in 2-second segments, with recovery on next launch and live warnings for a silent mic, stalls, drift, low disk and upload lag.",
      "Share while recording: a 1080p stream uploads to your own S3-compatible bucket, and the link is copied when you stop. Update link replaces the video and keeps the URL.",
      "Auto-zoom planned from clicks and typing bursts, with one intensity slider and editable zooms on the timeline.",
      "A cursor redrawn from the event log, click effects, backgrounds, padding, corners, shadow and a movable camera bubble. Preview and export share one Metal renderer.",
      "Audio: auto level to −16 LUFS, on-device voice enhance, ducking of system audio, Cut Long Silences, and a limiter on every track.",
      "On-device captions (SpeechAnalyzer on macOS 26, on-device recognition on macOS 15), burned in or offered as a track on share links.",
      "Crop, including a one-click Hide Browser Toolbar.",
      "Export to MP4 (H.264), HEVC, ProRes and GIF in landscape, square, vertical or 4:3.",
      "The reelbird command line tool with --json output, and an MCP server for Claude Code, Codex and Cursor.",
      "The open .reelbird project format: MP4s, JSON and an event log with relative paths.",
    ],
  },
];

/** Releases up to the one the site offers (APP_VERSION): notes for a version wait until it can be downloaded. */
export const RELEASES = ALL.filter((r) => !newer(r.version, APP_VERSION));
