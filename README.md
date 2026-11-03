<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/readme/banner-dark.png">
    <img src="brand/readme/banner-light.png" alt="Reelbird: record your screen, send the link, polish it later" width="880">
  </picture>
</p>

<p align="center"><b>Reelbird is a free, open-source screen recorder for macOS that copies a share link the moment you stop recording, then lets you polish the same take with auto-zoom, a smooth cursor and captions without changing the link.</b></p>

<p align="center">
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-1A1512?style=flat-square"></a>
  <img alt="macOS 15 or later" src="https://img.shields.io/badge/macOS-15%2B-1A1512?style=flat-square&logo=apple&logoColor=FFF4E8">
  <img alt="Swift 6.2" src="https://img.shields.io/badge/Swift-6.2-FF5A36?style=flat-square&logo=swift&logoColor=FFF4E8">
  <img alt="No telemetry" src="https://img.shields.io/badge/telemetry-none-1A1512?style=flat-square">
</p>

<p align="center">
  <a href="https://reelbird.app">Website</a> ·
  <a href="#download">Download</a> ·
  <a href="#how-it-compares">Compare</a> ·
  <a href="#command-line">CLI</a> ·
  <a href="#mcp-server">MCP</a> ·
  <a href="docs/SHARING.md">Sharing setup</a> ·
  <a href="#troubleshooting">Troubleshooting</a> ·
  <a href="https://reelbird.app/pricing/">Pricing</a>
</p>

<p align="center">
  <img src="brand/media/demo.gif" alt="Reelbird zooming in on a click, the link being copied, then zooming back out" width="800">
</p>

It's a native Swift app with no account needed and no telemetry: share links point at a storage bucket you own, such as Cloudflare R2, or, if you'd rather not set one up, at Reelbird Pro's hosting ($5 a month, with viewer analytics). It includes a command-line tool and an MCP server, so coding agents can record and share demos too. You can download it, signed and notarised by Apple, or build it from source, on macOS 15 or later.

**Why not just use Loom or Screen Studio?** Loom's free plan stops each video at 5 minutes and won't let you download it; Screen Studio costs $29 a month and gives you a link only after you export. Reelbird gives you the link when you stop and the auto-zoom polish later, under the same link, for free. [How it compares](#how-it-compares).

## How it works

1. **Record.** Pick a display, a window or an area, with camera, microphone and system audio if you want them. Press ⌥⇧R from any app. Press ⌥⇧M to drop a marker at a moment you want to find again.
2. **Stop.** The link is already on your clipboard. Reelbird streamed the take to your bucket (or to Reelbird Pro's hosting) while you recorded, so it plays in any browser a moment later. A small card in the bottom-left corner offers **Copy video** (an MP4 to paste into Slack, Messages or Finder), **Save** and **Edit**.
3. **Polish it later.** Open the same take. Reelbird has planned zooms on your clicks and typing, smoothed the cursor and levelled your voice. Trim, add captions, pick a background, then choose **Update link**. Everyone you sent the link to now sees the polished version.

<table>
  <tr>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="brand/screenshots/editor-zoom-dark.webp"><img src="brand/screenshots/editor-zoom-light.webp" alt="The editor with auto-zoom regions on the timeline"></picture></td>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="brand/screenshots/picker-dark.webp"><img src="brand/screenshots/picker-light.webp" alt="Choosing a display, window or area, with microphone, camera and system audio"></picture></td>
  </tr>
  <tr>
    <td><picture><source media="(prefers-color-scheme: dark)" srcset="brand/screenshots/editor-audio-dark.webp"><img src="brand/screenshots/editor-audio-light.webp" alt="Audio settings: Enhance voice, Auto level and Lower under voice"></picture></td>
    <td><picture><source media="(prefers-color-scheme: dark)" srcset="brand/screenshots/share-dark.webp"><img src="brand/screenshots/share-light.webp" alt="The share popover with the link, Copy and Update Link"></picture></td>
  </tr>
</table>

## What it does

**A step-by-step guide from the same take.** Every click, run of typing and shortcut becomes a numbered step with a picture of the screen at that moment, the name of what you clicked (read from the screen on your Mac) and what you said while doing it. Your link shows it as a **Guide** and a **Click-through**, where viewers click through the steps themselves, next to the video, and viewers can select and copy text straight out of the paused video. Edit or hide steps in the Guide panel (⌘9), or export the guide as a web page, Markdown with images, or a Claude skill. On Macs with Apple Intelligence, steps you talked through get your reason added ("Click \"Save\" to keep the draft"). Blurred text never reaches the guide, and typed text stays out unless you turn it on.

**Records what you need, as separate tracks.** A display, a window or an area, plus camera, microphone and system audio, with no virtual audio driver. Camera and audio stay on their own tracks, so you can move the camera bubble or mute system sound after recording.

**The camera goes where you put it.** Drag the camera bubble while you record and the video follows: it starts where the bubble was and glides each time you moved it. In the editor, drag it anywhere on the preview (it snaps to the edges and centre lines), pick a corner, delete single moves or keep it in one place. Circle, rounded square or a 3:4 portrait tile.

**The camera makes room for zooms.** While the screen is zoomed in, the bubble shrinks (to 70% by default) on the same curve as the zoom, and if the zoomed cursor would pass under it, it glides to the nearest free corner and back. Both can be turned off in the Camera panel.

**Camera layouts.** For any part of the video, show only the camera, the screen and camera side by side (stacked on a 9:16 canvas), or only the screen, with a short spring between layouts. Add them on the Layouts lane of the timeline (press C), or switch while you record with ⌥⇧L: bubble, camera only, screen only. The editor starts with the layouts you switched to.

**Blur what shouldn't be seen.** Press B and drag over an email, a key or a customer's name: it is blurred (or pixelated) for as long as you want, on its own bar in the Overlays lane. **Find Sensitive Info** reads the text on screen on your Mac and suggests blurs for emails, API keys and tokens, card numbers and phone numbers (plus any words you add), following the text when it scrolls; keep each one, or Keep All. Choose blur, pixelate or a solid redaction bar; square, rounded or oval; and a soft edge that fades out around the area (never into it). Blurs are anchored to the screen, so they stay on the content through zoom, crop and any aspect, and every strength leaves text unreadable: each cell keeps one averaged colour, so what was under it can't be recovered. Nothing is uploaded to find them.

**Arrows, boxes, labels and highlights.** Draw them on the preview, pick a colour, trim them on the timeline.

**Keeps your take if the app quits.** Every track is written to disk in 2-second segments from the first frame. If Reelbird crashes or quits mid-recording, the take is recovered the next time Reelbird opens, minus at most the last two seconds.

**Warns you while it matters.** If the microphone is recording silence, capture stalls, audio drifts, the disk is filling up or uploads fall behind, you see it during the recording, not after.

**Auto-zoom and a smooth cursor.** Reelbird logs clicks, typing, scrolls and pointer movement next to the video, then plans zooms that follow them. One slider sets how much it zooms, from subtle to punchy, and you can add, move or delete zooms on the timeline. The cursor is redrawn from that log, so it glides instead of jittering, and you can resize or hide it after the fact. Preview and export use the same Metal renderer, so the export looks exactly like the preview.

**Speed up the slow parts.** Click a part of the video, then Speed: drag the big number sideways, use the slider (0.25× to 4×, 1× in the middle) or pick a preset. 8× is on the speed lane's right-click menu, and R steps through presets. Voices keep their pitch up to 2×; faster parts are silent unless you keep their sound. **Speed Up Typing** finds stretches of typing and of waiting with nothing happening, and offers to speed them all up in one click; each one stays on the timeline to change or remove.

**Audio that sounds finished.** **Auto level** brings your voice to a steady −16 LUFS with a true-peak limiter. **Enhance voice** removes background noise and evens out your voice on your Mac, with a strength control and a blend back to the original; the raw microphone track is never changed. **Lower under voice** turns system audio down while you talk.

**Instant share links to your own bucket.** With **Share while recording** on, Reelbird uploads a 1080p stream as you record and copies the link the moment you stop. After editing, **Update link** replaces the video and keeps the URL. Links to your own bucket are free; setup is in [docs/SHARING.md](docs/SHARING.md). Or skip the setup with [Reelbird Pro](https://reelbird.app/pricing/) ($5 a month), which hosts your links and shows how many people watched and where they stopped.

**Captions on your Mac.** Pick the language and press **Generate Captions**: Apple's on-device speech recognition writes the transcript. Then choose a look: Classic, Highlight (the spoken word lights up), Marker (a highlighter box follows your words), or Pop, One Word and Slam for short social clips, in five colour sets and three sizes. Captions sit under the video when there's room, and move to the top while you work near the bottom of the screen. Double-click a line to fix a word without breaking its timing, or hide a line. Share links also offer the captions as a track viewers can turn on. **Clean Up** (W, the wand under the video) tightens the whole take in one go: long pauses get shorter, ums and dead time at the start and end go, and silent typing and waiting speed up. Review plays, puts back or applies each change; Undo puts everything back. From the command line, `reelbird suggest` writes a title and chapters with Apple's on-device model on Macs with Apple Intelligence. No API keys. Markers you drop while recording show as flags on the timeline, and **Use Markers as Chapters** turns them into the chapter list on the share page.

**Clean frames.** Backgrounds, padding, rounded corners, aspect ratios for every platform, and **Hide Browser Toolbar** to crop the tabs and bookmarks bar off a browser window.

**Exports the usual formats.** MP4 (H.264), HEVC and ProRes with hardware encoding, plus GIF.

**Works with agents.** The `reelbird` command-line tool and its MCP server let Claude Code, Codex or Cursor list screens, record a demo of the change they just made, export it and hand you the link.

**Open project format.** A recording is a `.reelbird` folder of standard MP4 files, JSON and an event log, with relative paths. Nothing is locked in. See [docs/FORMAT.md](docs/FORMAT.md).

## How it compares

| | Reelbird | Loom | Screen Studio | Cap | OpenScreen |
|---|---|---|---|---|---|
| Price | Free; optional Pro $5/mo for hosted links | Free plan; Business $18/user/mo | $29/mo, or $9/mo billed yearly | Free for personal use; paid from $29/yr | Free |
| Free-plan limits | None | 25 videos, 5 min each, 720p | No free plan listed | Personal use, 5-min links | None |
| Open source | MIT | No | No | AGPLv3 (some parts MIT) | MIT |
| Link when you stop | Yes, to your own bucket or Pro hosting | Yes, on Loom's cloud | After export | Yes (Instant mode) | No links |
| Auto-zoom and smooth cursor | Yes | No | Yes | Yes (Studio mode) | Yes |
| Polish an instant link later, same URL | Yes | No auto-zoom | Link comes after export | Instant and Studio are separate modes | No links |
| Download your video | Always | Business plans and up | Yes | Yes | Yes |
| Comments or viewer stats | Viewer analytics on Pro | Yes | Yes | Viewer analytics on Pro | No links |
| Platforms | Mac | Mac, Windows, web, mobile | Mac | Mac, Windows (beta), Linux | Mac, Windows, Linux |
| Notarised download | Yes | Yes | Yes | Yes | Yes |

Checked 12 October 2026 on each vendor's own pages: [Loom pricing](https://www.loom.com/pricing), [Loom downloads](https://support.atlassian.com/loom/docs/download-your-loom-video/), [Screen Studio](https://screen.studio/), [Cap pricing](https://cap.so/pricing), [OpenScreen](https://github.com/getopenscreen/openscreen). Loom is the better team tool and runs everywhere; Screen Studio has the more mature editor; Cap and OpenScreen run on Windows and Linux. More detail, plus CleanShot X, Tella and Screenity, at [reelbird.app/compare](https://reelbird.app/compare/).

## Download

[**Download Reelbird 0.4.1**](https://github.com/btahir/reelbird/releases/latest/download/Reelbird-0.4.1.zip) for Apple silicon Macs on macOS 15 or later (8.4 MB).

Unzip it, drag **Reelbird** to your Applications folder and open it. It's signed with an Apple Developer ID and notarised by Apple, so it opens like any other app, and macOS keeps your permissions across updates. The SHA-256 of each zip is listed on its [release page](https://github.com/btahir/reelbird/releases).

To update, download the new zip, quit Reelbird and drag the new copy to Applications to replace the old one; your recordings, settings and permissions stay. The app never checks for updates itself, so watch the [changelog](https://reelbird.app/changelog/) (it has an [RSS feed](https://reelbird.app/changelog/rss.xml)) or [GitHub Releases](https://github.com/btahir/reelbird/releases). If you built from source, `git pull` and `make install` again.

## Install from source

Building it yourself takes a few minutes and needs no Xcode.

You need:

- macOS 15 or later, on Apple silicon. It also compiles for Intel Macs that run macOS 15, but it hasn't been tested on one yet.
- The Command Line Tools for Xcode 26 or later (`xcode-select --install`), which bring Swift 6.2 and the macOS 26 SDK. They install on macOS 15.6 and later. Xcode 26 works too but isn't required.

```sh
git clone https://github.com/btahir/reelbird.git
cd reelbird
make install
```

`make install` builds a release copy of the app and copies it to `/Applications`, asking first if Reelbird is already there. Then open it:

```sh
open /Applications/Reelbird.app
```

Reelbird lives in the menu bar. Look for the robin. To update a build from source later, run `git pull`, then `make install` again.

Some Command Line Tools installs ship a stale SwiftPM file that breaks every `Package.swift`. The scripts detect this and work around it on their own (see `scripts/env.sh`), so you don't need to do anything. Run `make` to see every target.

### Permissions on first run

The welcome tour asks for each permission in turn. You can change them later in **Settings… → Permissions** or in **System Settings → Privacy & Security**.

| Permission | Needed for |
|---|---|
| Screen & System Audio Recording | Recording the screen and system sound. Required. |
| Microphone | Your voice. |
| Camera | The camera bubble. |
| Accessibility and Input Monitoring | Optional. The keystroke overlay (**Settings… → Recording → Record keystrokes**). |
| Speech Recognition | Captions on macOS 15 only. macOS 26 and later doesn't ask. |

**Screen Recording takes effect only after Reelbird reopens.** After you turn it on, choose **Quit & Reopen** in Reelbird (or quit it from the menu bar and open it again).

### Keep permissions across rebuilds (optional)

By default the app is signed ad hoc. That signature changes with every build, so macOS forgets the Screen Recording permission each time you rebuild. If you build often, create a local signing certificate once:

```sh
scripts/dev-signing.sh
export RB_SIGN_IDENTITY="Reelbird Local Signing"   # add this to your ~/.zshrc
make install
```

The script creates a self-signed certificate named "Reelbird Local Signing" in your login keychain and does nothing if it already exists. Every build signed with it has the same identity, so the permission sticks. The first build asks whether `codesign` may use the key. Choose **Always Allow**. `scripts/dev-signing.sh --remove` deletes the certificate. It never leaves your Mac and isn't trusted for anything except signing your own builds.

## Keyboard shortcuts

These work in every app. Change them in **Settings… → General**; Reelbird refuses keys another of its shortcuts or another app already uses.

| Shortcut | Action |
|---|---|
| ⌥⇧R | New recording; while recording, stop |
| ⌥⇧P | Pause or resume |
| ⌥⇧M | Add a marker (only while recording, so the keys type normally the rest of the time) |
| ⌥⇧L | While recording with the camera: switch the camera layout (bubble, camera only, screen only) |

After you stop, the quick actions card closes by itself after about 12 seconds unless the pointer is on it; × closes it sooner. It never takes keyboard focus, so you can paste the link straight away. **Settings… → General → After recording** chooses between the card (the default), opening the editor, or nothing.

While picking what to record, Return starts and Esc closes the picker. During the countdown, Return, Space or a click skips it and Esc cancels. When selecting an area, Return records and Esc cancels.

In the editor:

| Key | Action |
|---|---|
| Space | Play or pause |
| J / K / L | Back 2 seconds / pause / play |
| ← / → | Step back or forward 1/30 second (with ⇧: one second) |
| Home / End | Jump to start or end |
| S | Split at the playhead (splits are saved with the recording) |
| Click the video lane | Select the part there; drag its edges to trim just that part |
| Z | Add a zoom at the playhead |
| M | Add a marker at the playhead (click a flag to jump to it, double-click to rename, right-click to delete) |
| C | Add a camera layout at the playhead (or select the one there) |
| R | Speed: 2× for the selected part (or 3 seconds from the playhead); on a speed segment, the next speed |
| B | Blur an area: drag on the preview |
| A / X / T / H | Draw an arrow, a box, a text label or a highlight |
| W | Clean Up: shorten long pauses, cut ums and dead time, speed up typing and waiting (Review and Undo in the bar that appears) |
| 1 to 9 | Zoom depth of the selected zoom, or the one under the pointer (1 = 1.25×, 9 = 3.5×) |
| 0 | Turn that zoom off without deleting it, or back on |
| I | Make that zoom instant: it cuts in and out with no animation |
| Delete | Cut the selected part (it closes up into a scissors chip; click the chip to bring it back), delete the selected zooms, layout, speed or overlay, or restore a selected cut |
| Esc | Put down the drawing tool, or clear the selection |
| ⌘C / ⌘V | Copy the selected zooms / paste them at the playhead |
| ⌘A | Select every zoom (shift-click or drag a box on the zoom lane to select some) |
| ⌘K | Command menu: search every command and setting |
| ⌘/ | Show every editor shortcut |
| ⌘1 to ⌘9 | Background, Cursor, Zoom, Camera, Canvas, Audio, Captions, Overlays, Guide |
| ⌘= / ⌘− | Zoom the timeline in or out |
| ⌘E | Export |
| ⌘Z / ⇧⌘Z | Undo / redo |

Elsewhere: ⌘N starts a new recording, ⇧⌘L opens the library, ⌘O opens a `.reelbird` project, ⇧⌘E shares or copies the link, ⇧⌘R shows the recording in Finder, ⌘⌫ moves it to the Trash, and ⌘, opens Settings.

## Command line

The `reelbird` tool ships inside the app. Put it on your `PATH`:

```sh
mkdir -p ~/.local/bin
ln -sf /Applications/Reelbird.app/Contents/Helpers/reelbird ~/.local/bin/reelbird
```

```sh
reelbird sources                               # displays, windows, microphones and cameras, with IDs
reelbird record --display 1 --duration 30      # 30 seconds of the main display
reelbird record --window 1234 --share          # a window by ID from `sources`; Ctrl-C stops
reelbird list                                  # recent recordings
reelbird edit latest --set zoom.intensity=0.7 --trim 0:05-end
reelbird edit latest --set camera.x=0.5 --set camera.y=1 --clear-camera-moves   # camera bottom centre, in one place
reelbird edit latest --speed 0:12-0:20@2       # play 12–20 s at 2× (1 = normal speed again)
reelbird speedup latest --apply                # speed up typing and idle stretches
reelbird cleanup latest                        # shorten pauses, cut ums, trim dead ends (--dry-run, --undo)
reelbird edit latest --layout camera@0:00-0:04 --layout split@0:30-0:45         # camera layouts for parts of the video
reelbird edit latest --set camera.sizeWhileZoomed=0.6 --set camera.smartFraming=false
reelbird edit latest --set zoom.regions.auto-3.enabled=false   # turn one zoom off (ids are in `edit latest --json`)
reelbird edit latest --set zoom.regions.*.instant=true         # every zoom cuts in and out, no animation
reelbird blur latest --rect 0.1,0.2,0.3,0.05 --from 0:05 --to 0:12   # blur an area (0–1 of the screen, or pixels)
reelbird redact latest --auto                  # find emails, keys, card and phone numbers on screen (masked list)
reelbird redact latest --auto --keep-all       # ...and blur them all (or --keep ID)
reelbird annotate latest --add arrow --arrow 0.8,0.8,0.55,0.45 --from 3 --to 6
reelbird annotate latest                       # list overlays; --remove ID or --clear
reelbird export latest --format mp4 --height 1080
reelbird captions latest --locale en-US       # transcript and captions.vtt, made on this Mac
reelbird edit latest --set captions.style=highlight   # none, classic, highlight, marker, pop, oneWord, slam
reelbird enhance latest --strength medium      # clean up the voice; the raw mic is kept
reelbird markers latest                        # markers dropped while recording
reelbird markers latest --as-chapters          # make them the chapters on the share page
reelbird steps latest                          # the guide's steps: each click, typing and shortcut, with what was clicked
reelbird steps latest --text c4210="Open the inbox" --hide c9876   # reword or hide a step
reelbird guide latest --format html            # a web page with Guide and Click-through (also md, skill)
reelbird share latest                          # upload and print the link
reelbird share latest --polished               # render the edit, same link
reelbird cloud login                           # Reelbird Pro: sign in in the browser instead of setting up a bucket
reelbird cloud links                           # your hosted links with view counts (cloud stats PROJECT for one)
reelbird help record
```

A project can be a `.reelbird` path, a name from `reelbird list`, or `latest`. Every command takes `--json` for machine-readable output and `--library DIR` to use another folder (the default is `~/Movies/Reelbird`, or `$REELBIRD_LIBRARY`).

Sharing settings made in the app are used by the CLI too. To set them from the terminal, run `reelbird config share --help` for your own bucket, or `reelbird cloud --help` for Reelbird Pro (scripts and agents can set `REELBIRD_CLOUD_TOKEN`).

When you record from a terminal, macOS asks for Screen Recording permission for the terminal app (Terminal, iTerm, your editor), not for Reelbird.

## MCP server

`reelbird mcp` runs an MCP server over stdio. Agents get tools to list sources, start and stop recordings, drop and list markers (`add_marker`, `list_markers`), list and inspect projects, edit (including crop, camera placement, camera layouts and speed), blur regions, find and blur sensitive info, add and remove overlays, export, caption, enhance the voice, find silences, speed up typing, suggest chapters, read and edit the step guide (`get_steps`, `edit_step`, `export_guide`), describe a recording without watching it (`describe_take`: its steps, what was said and markers, so an agent can follow what you showed it), and share or unshare.

**Claude Code**

```sh
claude mcp add reelbird -- /Applications/Reelbird.app/Contents/Helpers/reelbird mcp
```

**Codex**

```sh
codex mcp add reelbird -- /Applications/Reelbird.app/Contents/Helpers/reelbird mcp
```

or in `~/.codex/config.toml`:

```toml
[mcp_servers.reelbird]
command = "/Applications/Reelbird.app/Contents/Helpers/reelbird"
args = ["mcp"]
```

**Cursor** (`~/.cursor/mcp.json`, or `.cursor/mcp.json` in a project)

```json
{
  "mcpServers": {
    "reelbird": {
      "type": "stdio",
      "command": "/Applications/Reelbird.app/Contents/Helpers/reelbird",
      "args": ["mcp"]
    }
  }
}
```

Then ask: "Record a 20-second demo of the settings page you just changed and give me the share link."

Recording through an agent needs Screen Recording permission for the app that runs the agent (your terminal or editor).

## Sharing

Sharing is optional; recording, editing and exporting work without it, with no watermark. Share links point at a storage bucket **you** own, for free, or at Reelbird Pro ($5 a month): sign in under Settings › Sharing › Reelbird Pro and Share works with nothing to set up, plus anonymous analytics on how many people watched and where they stopped ([details](docs/SHARING.md#reelbird-pro-no-setup)). When you share to your own bucket, Reelbird uploads a small viewer page and the video to `https://<your public URL>/r/<id>/`, signed with your own keys; with Pro the link is `https://watch.reelbird.app/r/<id>/`. Anyone with the link can watch in a browser, and the link never changes, even after **Update link**.

Cloudflare R2 is the recommended host: no download (egress) fees, and the free tier includes 10 GB of storage. Setup takes about ten minutes, once:

1. **Create a bucket.** Cloudflare dashboard → **R2 object storage** → **Create bucket**, for example `reelbird`. (R2 asks for a payment method even on the free tier.)
2. **Give it a public URL.** Bucket → **Settings** → either **Custom Domains** → **Add** (a subdomain such as `video.example.com`, recommended), or **Public Development URL** → **Enable** for a quick `https://pub-….r2.dev` URL (rate-limited; fine for trying it out).
3. **Create an API token.** R2 → **Manage API Tokens** → **Create Account API token** with **Object Read & Write**, limited to that bucket. Copy the Access Key ID and Secret Access Key (the secret is shown once).
4. **Connect Reelbird.** Menu bar icon → **Settings…** → **Sharing**:

| Field | Value |
|---|---|
| Endpoint | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (account ID is on the R2 overview page) |
| Bucket | your bucket name |
| Region | `auto` |
| Access key ID / Secret access key | from step 3 |
| Public URL | your custom domain or `https://pub-….r2.dev` |

Choose **Test Connection**, which uploads a test file and reads it back through your public URL, then **Save**. The secret is kept in your macOS Keychain, and the `reelbird` CLI uses the same settings (`reelbird config share --help`).

Then turn on **Share while recording** in the picker, and the link is on your clipboard when you stop. Or share any recording later from the editor. AWS S3, Backblaze B2 and MinIO work too. The full walkthrough, costs, privacy notes and CI setup are in [docs/SHARING.md](docs/SHARING.md).

## Troubleshooting

**Reelbird says Screen Recording is off, but the switch is on.** Quit and reopen Reelbird; the permission only applies after a restart. If it still fails, you probably rebuilt an ad-hoc signed copy, and macOS is holding the permission for the old build. Remove Reelbird from the Screen Recording list (select it, then the minus button), reopen Reelbird and allow it again. To stop this happening on every rebuild, set up [local signing](#keep-permissions-across-rebuilds-optional).

**macOS asks again every month whether Reelbird may record your screen.** That prompt comes from macOS, not Reelbird. Since macOS 15, the system asks you now and then to confirm apps that record the screen. Choose to keep allowing it.

**A Keychain prompt asks to use "app.reelbird.share".** That's your sharing secret. It appears when the CLI reads a secret the app saved, or after a rebuild changed the app's signature. Enter your login password and choose **Always Allow**. Local signing makes the answer stick across rebuilds. For CI, set `REELBIRD_S3_SECRET_ACCESS_KEY` instead (see [docs/SHARING.md](docs/SHARING.md#command-line-and-ci)).

**Keystrokes don't show up.** Recording key presses needs Input Monitoring as well as Accessibility. Turn on Reelbird under **System Settings → Privacy & Security → Input Monitoring** (add it with the plus button if it isn't listed), then reopen Reelbird. Keystrokes are only recorded when **Record keystrokes** is on before you start.

**Captions say they need a newer macOS.** On macOS 26 and later, captions use Apple's SpeechAnalyzer and download the language model on first use. On macOS 15 they need on-device speech recognition for your language and the Speech Recognition permission.

**The app quit while recording. Is the take lost?** Open Reelbird again. It finishes the take from the segments on disk. From the terminal, `reelbird recover PROJECT` does the same.

## Privacy

- Recordings, edits, captions and transcripts stay on your Mac, in `~/Movies/Reelbird` unless you choose another folder.
- Find Sensitive Info reads the screen with Apple's on-device text recognition. Findings stay on your Mac; the command line and MCP show only masked previews (`sk-p…F2`, `•••• 4242`).
- The step guide is made on your Mac too. Shared links carry its pictures (rendered with your blurs) and the text on screen in the published video, so viewers can copy it; a label under a blur is dropped, and typed text stays out unless you turn on **Show what was typed** (sensitive-looking text is masked even then). Turn either off in the Guide panel.
- A link shared while recording plays that raw take until you **Update link**, so update it after adding blurs. The editor reminds you.
- Captions and titles are made on-device by Apple's frameworks. No API keys and no cloud services. (On macOS 26, macOS downloads Apple's speech model the first time you make captions.)
- Nothing is uploaded unless you share. Shares go only to the bucket you configured, signed with your own keys, or to Reelbird Pro if you sign in to it. The secret key lives in your macOS Keychain.
- No analytics, no telemetry, no crash reporting, no update checks. The app only contacts a Reelbird server if you sign in to Reelbird Pro. Pro's viewer analytics use no cookies and store no IP addresses ([privacy page](https://reelbird.app/privacy/#pro)).
- The shared viewer page plays the polished MP4 directly. While a share still has only the live stream, browsers without built-in HLS (Chrome, Firefox) load the hls.js player from jsDelivr, pinned to a version and integrity-checked.

## Roadmap

- **Joining clips.** The project format can already append other takes; the editor doesn't have a UI for it yet.
- **Focus-follow zoom.** Zooms that follow the text field you're typing in. Today zooms follow clicks.
- **Titles and chapters in the app.** Available from the CLI and MCP today.
- **Windows and Linux are not planned.** Reelbird is built on Apple frameworks from top to bottom.

## How it's built

Eight Swift modules with no third-party dependencies: capture (ScreenCaptureKit, AVFoundation), render (Metal), share (S3 uploads, HLS, viewer page), AI (Speech, Vision, Foundation Models), guide (steps, step pictures and guide exports), a shared core, the app and the CLI. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains the recording pipeline, sharing flow and renderer. [docs/FORMAT.md](docs/FORMAT.md) documents the project format.

## Contributing

Bug reports, fixes and features are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers building, tests and pull requests.

## License

[MIT](LICENSE).

## Support Reelbird

Reelbird is free and always will be. [Reelbird Pro](https://reelbird.app/pricing/) pays for it: $5 a month for hosted share links with view analytics, if you'd rather not set up a bucket. Stars, bug reports and pull requests help too.

<sub>The Reelbird website is hosted on <a href="https://shiptiffin.com">ShipTiffin</a>, which puts all your apps on one server you own. It's open source too: <a href="https://github.com/shiptiffin/tiffin">shiptiffin/tiffin</a>.</sub>
