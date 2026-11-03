import AppKit
import ReelbirdCore
import SwiftUI

/// The editor timeline: ruler, filmstrip with trim handles, waveform, zoom lane, the camera layouts lane (recordings
/// with a camera), speed lane, overlays lane, split points and the playhead. Positions are recording times, with cut
/// stretches closed up (each cut is a small restore chip at its join), so the parts sit back to back as in the video.
struct TimelineView: View {
    @Bindable var model: EditorModel

    static let gutter: CGFloat = 34
    static let inset: CGFloat = 12
    static let rulerHeight: CGFloat = 24
    static let videoHeight: CGFloat = 50
    static let audioHeight: CGFloat = 34
    static let zoomHeight: CGFloat = 28
    static let layoutHeight: CGFloat = 26
    static let speedHeight: CGFloat = 24
    static let overlayHeight: CGFloat = 28
    static let laneGap: CGFloat = 8

    /// The timeline's height: the base lanes plus the speed lane, and the layouts lane with a camera.
    static func height(layouts: Bool) -> CGFloat {
        let base = 188 + speedHeight + laneGap + overlayHeight + laneGap
        return layouts ? base + layoutHeight + laneGap : base
    }

    var body: some View {
        GeometryReader { geo in
            let visible = geo.size.width - Self.gutter
            // Fitted to `timelineFitDuration` when a cut froze the scale, else to what's shown now.
            let space = CutSpace(duration: model.duration, cuts: model.timelineCuts)
            let fit = max(0.001, model.timelineFitDuration ?? space.collapsedDuration)
            let pps = (visible - Self.inset * 2) * model.timelineZoom / CGFloat(fit)
            let width = max(visible, CGFloat(space.collapsedDuration) * pps + Self.inset * 2)
            let scale = TimeScale(duration: model.duration, width: width, inset: Self.inset, cuts: model.timelineCuts, pps: pps)
            HStack(spacing: 0) {
                laneIcons
                ScrollView(.horizontal) {
                    TimelineContent(model: model, scale: scale)
                        .frame(width: width, height: geo.size.height)
                }
                .scrollIndicators(model.timelineZoom > 1 ? .automatic : .never)
            }
        }
        .background(Theme.panel)
    }

    private var laneIcons: some View {
        VStack(spacing: Self.laneGap) {
            Color.clear.frame(height: Self.rulerHeight - Self.laneGap + 6)
            laneIcon("film", height: Self.videoHeight, label: "Video")
            laneIcon("waveform", height: Self.audioHeight, label: "Audio")
            laneIcon("plus.magnifyingglass", height: Self.zoomHeight, label: "Zooms")
            if model.hasCamera { laneIcon("person.crop.rectangle", height: Self.layoutHeight, label: "Camera layouts") }
            laneIcon("gauge.with.dots.needle.67percent", height: Self.speedHeight, label: "Speed")
            laneIcon("square.on.square.dashed", height: Self.overlayHeight, label: "Overlays")
            Spacer(minLength: 0)
        }
        .frame(width: Self.gutter)
    }

    private func laneIcon(_ symbol: String, height: CGFloat, label: String) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 11))
            .foregroundStyle(.tertiary)
            .frame(height: height)
            .help(label)
            .accessibilityLabel(label)
    }
}

/// Maps recording seconds to x positions, with cut stretches taking no room.
struct TimeScale {
    let duration: Double
    let width: CGFloat
    let inset: CGFloat
    let space: CutSpace

    /// Points per second of what's shown.
    let pps: CGFloat

    /// `pps` defaults to fitting what's shown into `width`.
    init(duration: Double, width: CGFloat, inset: CGFloat, cuts: [TimeRange] = [], pps: CGFloat? = nil) {
        self.duration = duration; self.width = width; self.inset = inset
        space = CutSpace(duration: duration, cuts: cuts)
        self.pps = pps ?? (width - inset * 2) / CGFloat(max(0.001, space.collapsedDuration))
    }

    /// Seconds shown: the recording without its cuts.
    var visibleDuration: Double { space.collapsedDuration }
    func x(_ t: Double) -> CGFloat { xShown(space.collapsed(t)) }
    /// The x of a time on the closed-up timeline (the ruler's time).
    func xShown(_ c: Double) -> CGFloat { inset + CGFloat(c) * pps }
    /// The recording time at `x`; a join lands just after its cut.
    func t(_ x: CGFloat) -> Double { space.source(Double((x - inset) / pps)) }
}

struct TimelineContent: View {
    @Bindable var model: EditorModel
    let scale: TimeScale
    /// The zoom selection a box selection adds to (shift held when it started).
    @ViewState private var marqueeBase: Set<String>?
    /// The trim edge being dragged and where it was when grabbed, so it follows the pointer from the grab point.
    @ViewState private var trimGrab: TrimGrab?

    struct TrimGrab {
        let leading: Bool
        let from: Double
    }

    private var videoTop: CGFloat { TimelineView.rulerHeight + 6 }
    private var audioTop: CGFloat { videoTop + TimelineView.videoHeight + TimelineView.laneGap }
    private var zoomTop: CGFloat { audioTop + TimelineView.audioHeight + TimelineView.laneGap }
    private var layoutTop: CGFloat { zoomTop + TimelineView.zoomHeight + TimelineView.laneGap }
    private var speedTop: CGFloat {
        (model.hasCamera ? layoutTop + TimelineView.layoutHeight : zoomTop + TimelineView.zoomHeight) + TimelineView.laneGap
    }
    private var overlayTop: CGFloat { speedTop + TimelineView.speedHeight + TimelineView.laneGap }
    private var lanesBottom: CGFloat { overlayTop + TimelineView.overlayHeight }

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Click/drag anywhere empty to scrub.
            Color.clear
                .contentShape(Rectangle())
                .gesture(scrubGesture)
            Ruler(scale: scale).frame(height: TimelineView.rulerHeight)
                .gesture(scrubGesture)
            videoLane
            audioLane
            zoomLane
            if model.hasCamera { layoutLane }
            SpeedLane(model: model, scale: scale).offset(y: speedTop)
            OverlaysLane(model: model, scale: scale).offset(y: overlayTop)
            cutsOverlay
            trimDim
            splitMarks
            cameraMoveMarks
            markerFlags
            segmentSelection
            Playhead(model: model, scale: scale, height: lanesBottom + 6)
            // Edge handles above the playhead, which often sits on an edge (at 0 when a recording opens).
            trimHandles
            partHandles
        }
        .coordinateSpace(name: "timeline")
    }

    private var scrubGesture: some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .named("timeline"))
            .onChanged { v in
                if model.isPlaying { model.pause() }
                model.seek(source: scale.t(v.location.x))
            }
            .onEnded { v in
                let t = scale.t(v.location.x)
                if v.translation == .zero, v.location.y >= videoTop, v.location.y <= videoTop + TimelineView.videoHeight {
                    // A click on the video selects the part there (between split points, cuts and the trim).
                    model.selection = .segment(model.segment(containing: t))
                } else if v.translation == .zero {
                    model.selection = nil
                }
            }
    }

    // MARK: Lanes

    private var videoLane: some View {
        let rect = CGRect(x: scale.x(0), y: videoTop, width: scale.x(model.duration) - scale.x(0), height: TimelineView.videoHeight)
        return Canvas { ctx, _ in
            let clip = Path(roundedRect: CGRect(origin: .zero, size: rect.size), cornerRadius: 7, style: .continuous)
            ctx.clip(to: clip)
            ctx.fill(clip, with: .color(Color.primary.opacity(0.08)))
            let frames = model.filmstrip
            if !frames.isEmpty {
                let fw = rect.height * 16 / 10
                var x: CGFloat = 0
                var i = 0
                while x < rect.width {
                    // The frame at this place's recording time (cut stretches take no room).
                    let t = scale.t(rect.minX + x + fw / 2)
                    let img = frames[min(frames.count - 1, max(0, Int(t / max(0.001, model.duration) * Double(frames.count))))]
                    ctx.draw(Image(decorative: img, scale: 1), in: CGRect(x: x, y: 0, width: fw, height: rect.height))
                    x += fw; i += 1
                }
                ctx.fill(clip, with: .color(.black.opacity(0.06)))
            }
            ctx.stroke(clip, with: .color(Color.primary.opacity(0.12)), lineWidth: 1)
        }
        .frame(width: rect.width, height: rect.height)
        .offset(x: rect.minX, y: rect.minY)
        .allowsHitTesting(false)
    }

    private var audioLane: some View {
        let rect = CGRect(x: scale.x(0), y: audioTop, width: scale.x(model.duration) - scale.x(0), height: TimelineView.audioHeight)
        let muted = model.edit.audio.microphoneMuted
        return Canvas { ctx, size in
            let bg = Path(roundedRect: CGRect(origin: .zero, size: size), cornerRadius: 7, style: .continuous)
            ctx.fill(bg, with: .color(Color.primary.opacity(0.045)))
            let w = model.waveform
            guard !w.isEmpty else { return }
            let barW: CGFloat = 2, gap: CGFloat = 1.2
            let count = Int(size.width / (barW + gap))
            var path = Path()
            for i in 0..<max(0, count) {
                let t = scale.t(rect.minX + CGFloat(i) * (barW + gap) + barW / 2)
                let v = CGFloat(w[min(w.count - 1, max(0, Int(t / max(0.001, model.duration) * Double(w.count))))])
                let h = max(1.5, v * (size.height - 8))
                path.addRoundedRect(in: CGRect(x: CGFloat(i) * (barW + gap), y: (size.height - h) / 2, width: barW, height: h),
                                    cornerSize: CGSize(width: 1, height: 1))
            }
            ctx.fill(path, with: .color(Theme.ink.opacity(muted ? 0.15 : 0.5)))
        }
        .frame(width: rect.width, height: rect.height)
        .offset(x: rect.minX, y: rect.minY)
        .allowsHitTesting(false)
    }

    private var zoomLane: some View {
        ZStack(alignment: .topLeading) {
            // Empty lane: click to move the playhead (and clear the selection), drag a box to select zooms.
            RoundedRectangle(cornerRadius: 7, style: .continuous)
                .fill(Color.primary.opacity(0.03))
                .frame(width: scale.x(model.duration) - scale.x(0), height: TimelineView.zoomHeight)
                .contentShape(Rectangle())
                .offset(x: scale.x(0))
                .gesture(marqueeGesture)
            ForEach(model.edit.zoom.regions) { r in
                ZoomRegionView(model: model, region: r, scale: scale,
                               dimmed: model.edit.zoom.mode == .off || (model.edit.zoom.mode == .manual && r.source == .auto))
            }
            if let m = model.zoomMarquee {
                let x0 = scale.x(min(m.start, m.end)), x1 = scale.x(max(m.start, m.end))
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .fill(Theme.ink.opacity(0.08))
                    .overlay(RoundedRectangle(cornerRadius: 4, style: .continuous).strokeBorder(Theme.ink.opacity(0.55), lineWidth: 1))
                    .frame(width: max(1, x1 - x0), height: TimelineView.zoomHeight + 4)
                    .offset(x: x0, y: -2)
                    .allowsHitTesting(false)
            }
            if model.edit.zoom.regions.isEmpty {
                Text(model.edit.zoom.mode == .off ? "Zoom is off" : "Press Z to add a zoom at the playhead")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
                    .frame(height: TimelineView.zoomHeight)
                    .offset(x: scale.x(0) + 10)
                    .allowsHitTesting(false)
            }
        }
        .offset(y: zoomTop)
    }

    /// Box select on the zoom lane (with shift: adds to the selection). A plain click scrubs like the rest of the timeline.
    private var marqueeGesture: some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .named("timeline"))
            .onChanged { v in
                if abs(v.translation.width) < 3 && model.zoomMarquee == nil {
                    if model.isPlaying { model.pause() }
                    model.seek(source: scale.t(v.location.x))
                    return
                }
                let base = marqueeBase ?? (NSEvent.modifierFlags.contains(.shift) ? model.selectedZoomIDs : [])
                marqueeBase = base
                model.boxSelectZooms(TimeRange(start: scale.t(v.startLocation.x), end: scale.t(v.location.x)), adding: base)
            }
            .onEnded { _ in
                if model.zoomMarquee == nil { model.selection = nil }
                marqueeBase = nil
                model.endZoomMarquee()
            }
    }

    /// Camera layouts: Camera, Split and Screen segments; the bubble everywhere else.
    private var layoutLane: some View {
        let tall = model.canvasPixelSize.height > model.canvasPixelSize.width
        return ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 7, style: .continuous)
                .fill(Color.primary.opacity(0.03))
                .frame(width: scale.x(model.duration) - scale.x(0), height: TimelineView.layoutHeight)
                .offset(x: scale.x(0))
                .allowsHitTesting(false)
            ForEach(model.edit.layouts) { s in
                LayoutSegmentView(model: model, segment: s, scale: scale, tall: tall, dimmed: !model.edit.camera.visible)
            }
            if model.edit.layouts.isEmpty {
                Text("Press C to change the camera layout at the playhead")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
                    .frame(height: TimelineView.layoutHeight)
                    .offset(x: scale.x(0) + 10)
                    .allowsHitTesting(false)
            }
        }
        .offset(y: layoutTop)
    }

    // MARK: Overlays

    /// Each cut is closed up on the timeline: a seam through the lanes at its join, and a scissors chip on the video
    /// that brings it back.
    private var cutsOverlay: some View {
        ForEach(Array(model.edit.cuts.filter { c in scale.space.cuts.contains { $0.start <= c.start + 1e-3 && $0.end >= c.end - 1e-3 } }.enumerated()),
                id: \.offset) { _, cut in
            let selected = model.selection == .cut(cut)
            let x = scale.x(cut.start)
            ZStack(alignment: .top) {
                Rectangle().fill(Theme.accent.opacity(selected ? 0.9 : 0.45))
                    .frame(width: 1.5, height: lanesBottom - videoTop)
                    .allowsHitTesting(false)
                CutChip(duration: cut.duration, selected: selected) { model.restoreCut(cut) }
                    .offset(y: TimelineView.videoHeight / 2 - CutChip.size / 2)
            }
            .frame(width: CutChip.size)
            .offset(x: x - CutChip.size / 2, y: videoTop)
        }
    }

    private var trim: TimeRange { model.timelineTrim ?? TimeRange(start: 0, end: model.duration) }

    /// Dims what's trimmed away.
    private var trimDim: some View {
        ZStack(alignment: .topLeading) {
            Rectangle().fill(Theme.panel.opacity(0.72))
                .frame(width: max(0, scale.x(trim.start) - scale.x(0)), height: lanesBottom - videoTop)
                .offset(x: scale.x(0), y: videoTop)
            Rectangle().fill(Theme.panel.opacity(0.72))
                .frame(width: max(0, scale.x(model.duration) - scale.x(trim.end)), height: lanesBottom - videoTop)
                .offset(x: scale.x(trim.end), y: videoTop)
        }
        .allowsHitTesting(false)
    }

    private var trimHandles: some View {
        ZStack(alignment: .topLeading) {
            trimHandle(leading: true)
            trimHandle(leading: false)
        }
    }

    private func trimHandle(leading: Bool) -> some View {
        let edge = leading ? trim.start : trim.end
        return TrimHandle(leading: leading, dragging: trimGrab?.leading == leading)
            .offset(x: scale.x(edge) - TrimHandle.hitWidth / 2, y: videoTop)
            .gesture(DragGesture(minimumDistance: 1, coordinateSpace: .named("timeline"))
                .onChanged { v in
                    let grab = trimGrab ?? TrimGrab(leading: leading, from: edge)
                    if trimGrab == nil { trimGrab = grab }
                    // Moved by the pointer's travel, not to the pointer, so the edge doesn't jump to where it was grabbed.
                    let t = scale.t(scale.x(grab.from) + v.translation.width)
                    if leading { model.setTrim(start: t) } else { model.setTrim(end: t) }
                }
                .onEnded { _ in trimGrab = nil })
    }

    private var splitMarks: some View {
        ForEach(model.splits, id: \.self) { s in
            Path { p in
                p.move(to: CGPoint(x: scale.x(s), y: videoTop - 2))
                p.addLine(to: CGPoint(x: scale.x(s), y: lanesBottom + 2))
            }
            .stroke(Theme.ink.opacity(0.55), style: StrokeStyle(lineWidth: 1.5, dash: [3, 3]))
            .allowsHitTesting(false)
        }
    }

    /// Where the camera bubble moves: a small mark in its shape just above the video lane. Click to go there;
    /// the Camera panel lists and deletes them.
    @ViewBuilder private var cameraMoveMarks: some View {
        if model.hasCamera, model.edit.camera.visible {
            let shape = model.edit.camera.shape
            ForEach(Array(model.edit.camera.moves.enumerated()), id: \.offset) { _, move in
                let size = shape.glyphSize
                Button { model.seek(source: move.t) } label: {
                    CameraBubbleShape(shape: shape)
                        .fill(Theme.ink)
                        .overlay(CameraBubbleShape(shape: shape).stroke(Theme.panel, lineWidth: 1))
                        .frame(width: size.width * 0.9, height: size.height * 0.9)
                        .frame(width: 16, height: 16)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .help("Camera moves at \(TimeFormat.clock(model.timeline.outputTime(forSource: move.t) ?? move.t))")
                .accessibilityLabel("Camera move")
                .offset(x: scale.x(move.t) - 8, y: videoTop - 15)
            }
        }
    }

    /// Markers dropped while recording (or added with M): small flags on the ruler. Click to go there,
    /// double-click to rename, right-click for more.
    private var markerFlags: some View {
        ForEach(model.markers) { m in
            MarkerFlagView(model: model, marker: m, height: videoTop)
                .offset(x: scale.x(m.t) - MarkerFlagView.stemX)
        }
    }

    /// The selected part: an outline, and a handle on each edge that trims just this part (dragging in cuts, dragging
    /// out brings back what was cut there; at the recording's ends it moves the trim).
    /// While a part edge is dragged: what will be cut, dimmed like the trim (it closes up on release).
    @ViewBuilder private var pendingCuts: some View {
        if let d = model.partTrim {
            ForEach(Array(d.result.cuts.enumerated()), id: \.offset) { _, c in
                let x0 = scale.x(c.start), x1 = scale.x(c.end)
                if x1 - x0 > 0.5 {
                    Rectangle().fill(Theme.panel.opacity(0.72))
                        .frame(width: x1 - x0, height: lanesBottom - videoTop)
                        .offset(x: x0, y: videoTop)
                        .allowsHitTesting(false)
                }
            }
        }
    }

    private var shownPart: TimeRange? {
        model.partTrim?.result.part ?? { if case .segment(let r) = model.selection { r } else { nil } }()
    }

    @ViewBuilder private var segmentSelection: some View {
        pendingCuts
        if let r = shownPart {
            RoundedRectangle(cornerRadius: 7, style: .continuous)
                .strokeBorder(Theme.accent, lineWidth: 2)
                .background(RoundedRectangle(cornerRadius: 7).fill(Theme.accent.opacity(0.08)))
                .frame(width: max(4, scale.x(r.end) - scale.x(r.start)), height: TimelineView.videoHeight)
                .offset(x: scale.x(r.start), y: videoTop)
                .allowsHitTesting(false)
        }
    }

    @ViewBuilder private var partHandles: some View {
        if let r = shownPart {
            partHandle(leading: true, at: scale.x(r.start))
            partHandle(leading: false, at: scale.x(r.end))
        }
    }

    private func partHandle(leading: Bool, at x: CGFloat) -> some View {
        PartHandle(leading: leading, dragging: model.partTrim?.leading == leading)
            .offset(x: leading ? x - PartHandle.outside : x - PartHandle.hitWidth + PartHandle.outside, y: videoTop)
            .gesture(DragGesture(minimumDistance: 1, coordinateSpace: .named("timeline"))
                .onChanged { v in
                    if model.partTrim == nil { model.beginPartTrim(leading: leading) }
                    model.dragPartEdge(by: Double(v.translation.width / scale.pps))
                }
                .onEnded { _ in model.endPartTrim() })
            .help(leading ? "Drag to trim the start of this part" : "Drag to trim the end of this part")
            .accessibilityLabel(leading ? "Start of the selected part" : "End of the selected part")
    }
}

struct Ruler: View {
    let scale: TimeScale
    var body: some View {
        Canvas { ctx, size in
            let candidates: [Double] = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
            let step = candidates.first { CGFloat($0) * scale.pps >= 64 } ?? 600
            let minor = step / 5
            var i = 0
            while Double(i) * minor <= scale.visibleDuration + 0.001 {
                // Index-based so ticks don't drift and sub-second labels read 0:00.5, not 0:00 twice. Times are
                // the closed-up timeline's: cut stretches don't count.
                let t = Double(i) * minor
                let x = scale.xShown(t)
                let isMajor = i % 5 == 0
                var p = Path()
                p.move(to: CGPoint(x: x, y: size.height - (isMajor ? 8 : 4)))
                p.addLine(to: CGPoint(x: x, y: size.height))
                ctx.stroke(p, with: .color(Color.primary.opacity(isMajor ? 0.3 : 0.14)), lineWidth: 1)
                if isMajor {
                    ctx.draw(Text(TimeFormat.clock(t + 0.001, tenths: step < 1)).font(.system(size: 10).monospacedDigit()).foregroundStyle(.secondary),
                             at: CGPoint(x: x + 3, y: 9), anchor: .leading)
                }
                i += 1
            }
        }
        .contentShape(Rectangle())
    }
}

/// A closed-up cut: a small scissors chip at its join. Click to bring the cut part back.
struct CutChip: View {
    static let size: CGFloat = 20
    let duration: Double
    let selected: Bool
    let restore: () -> Void
    @ViewState private var hovering = false

    var body: some View {
        Button(action: restore) {
            Image(systemName: "scissors")
                .font(.system(size: 9.5, weight: .bold))
                .foregroundStyle(selected || hovering ? Theme.onAccent : Theme.accentText)
                .frame(width: Self.size, height: Self.size)
                .background(Circle().fill(selected || hovering ? Theme.accent : Theme.raised))
                .overlay(Circle().strokeBorder(Theme.accent.opacity(0.7), lineWidth: 1))
                .shadow(color: .black.opacity(0.15), radius: 1.5, y: 0.5)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .help("\(TimeFormat.clock(duration, tenths: true)) cut here. Click to bring it back.")
        .accessibilityLabel("Cut of \(TimeFormat.clock(duration, tenths: true)). Bring it back")
    }
}

extension View {
    /// The left-right resize pointer over a draggable edge. A pointer style is held by the view (and through a drag),
    /// where `NSCursor.set()` on hover is undone by the next mouse move.
    func edgeResizePointer(leading: Bool) -> some View {
        pointerStyle(.frameResize(position: leading ? .leading : .trailing))
    }
}

/// An edge handle of the selected part: a bar just inside the edge, grabbable a little either side of it.
struct PartHandle: View {
    static let width: CGFloat = 9
    /// How far the grab area reaches past the edge, and past the bar into the part.
    static let outside: CGFloat = 8
    static let inside: CGFloat = 6
    static var hitWidth: CGFloat { outside + width + inside }
    let leading: Bool
    let dragging: Bool
    @ViewState private var hovering = false

    var body: some View {
        let active = hovering || dragging
        UnevenRoundedRectangle(topLeadingRadius: leading ? 7 : 1, bottomLeadingRadius: leading ? 7 : 1,
                               bottomTrailingRadius: leading ? 1 : 7, topTrailingRadius: leading ? 1 : 7, style: .continuous)
            .fill(Theme.accent.opacity(active ? 1 : 0.9))
            .overlay(Capsule().fill(Color.white.opacity(active ? 1 : 0.9)).frame(width: 2, height: active ? 20 : 14))
            .frame(width: active ? Self.width + 2 : Self.width, height: TimelineView.videoHeight)
            .shadow(color: .black.opacity(active ? 0.22 : 0), radius: 2, y: 0.5)
            .frame(width: Self.width + Self.inside, alignment: leading ? .leading : .trailing)
            .padding(leading ? .leading : .trailing, Self.outside)
            .contentShape(Rectangle())
            .edgeResizePointer(leading: leading)
            .onHover { hovering = $0 }
            .animation(Theme.snappy, value: active)
    }
}

/// A trim handle: a bar centred on the trim edge, grabbable a little either side of it.
struct TrimHandle: View {
    static let width: CGFloat = 12
    static let hitWidth: CGFloat = 28
    let leading: Bool
    let dragging: Bool
    @ViewState private var hovering = false

    var body: some View {
        let active = hovering || dragging
        UnevenRoundedRectangle(topLeadingRadius: leading ? 6 : 1, bottomLeadingRadius: leading ? 6 : 1,
                               bottomTrailingRadius: leading ? 1 : 6, topTrailingRadius: leading ? 1 : 6, style: .continuous)
            .fill(Theme.ink.opacity(active ? 0.95 : 0.8))
            .overlay(Capsule().fill(Theme.panel).frame(width: 2, height: active ? 22 : 16))
            .frame(width: active ? Self.width + 2 : Self.width, height: TimelineView.videoHeight)
            .shadow(color: .black.opacity(active ? 0.22 : 0), radius: 2, y: 0.5)
            .frame(width: Self.hitWidth)
            .contentShape(Rectangle())
            .edgeResizePointer(leading: leading)
            .onHover { hovering = $0 }
            .animation(Theme.snappy, value: active)
            .help(leading ? "Drag to trim the start" : "Drag to trim the end")
            .accessibilityLabel(leading ? "Trim start" : "Trim end")
    }
}

struct Playhead: View {
    @Bindable var model: EditorModel
    let scale: TimeScale
    let height: CGFloat

    var body: some View {
        let x = scale.x(model.playhead)
        ZStack(alignment: .top) {
            Rectangle().fill(Theme.accent).frame(width: 1.5, height: height)
            PlayheadKnob()
                .fill(Theme.accent)
                .frame(width: 13, height: 16)
                .offset(y: 4)
        }
        .frame(width: 13)
        .offset(x: x - 6.5)
        .contentShape(Rectangle())
        .gesture(DragGesture(coordinateSpace: .named("timeline")).onChanged { v in
            if model.isPlaying { model.pause() }
            model.seek(source: scale.t(v.location.x))
        })
        .accessibilityElement()
        .accessibilityLabel("Playhead")
        .accessibilityValue(TimeFormat.clock(model.playhead))
        .accessibilityAdjustableAction { dir in model.step(dir == .increment ? 1 : -1) }
    }
}

struct PlayheadKnob: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.addRoundedRect(in: CGRect(x: r.minX, y: r.minY, width: r.width, height: r.height * 0.62), cornerSize: CGSize(width: 3, height: 3))
        p.move(to: CGPoint(x: r.minX, y: r.height * 0.55))
        p.addLine(to: CGPoint(x: r.midX, y: r.maxY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.height * 0.55))
        p.closeSubpath()
        return p
    }
}

/// One zoom region: drag to move, drag the edges to resize, click to select (shift-click adds to the
/// selection). While the pointer is over it, 0–9 set its depth and I makes it instant. A zoom turned off is
/// dimmed with a dashed outline; an instant one shows a bolt.
struct ZoomRegionView: View {
    @Bindable var model: EditorModel
    let region: ZoomRegion
    let scale: TimeScale
    let dimmed: Bool
    @ViewState private var origin: TimeRange?

    private var selected: Bool { model.selectedZoomIDs.contains(region.id) }

    var body: some View {
        let x0 = scale.x(region.range.start), x1 = scale.x(region.range.end)
        let w = max(10, x1 - x0)
        let user = region.source == .user
        let on = region.enabled
        let fill: Color = !on ? Color.primary.opacity(0.05) : user ? Theme.ink.opacity(0.82) : Theme.neutralMark.opacity(0.28)
        let text: Color = on && user ? Theme.panel : Color.primary.opacity(on ? 0.7 : 0.5)
        ZStack {
            RoundedRectangle(cornerRadius: 6, style: .continuous).fill(fill)
            if on {
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .strokeBorder(selected ? Theme.accent : Color.primary.opacity(user ? 0 : 0.18), lineWidth: selected ? 2 : 1)
            } else {
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .strokeBorder(selected ? Theme.accent : Color.primary.opacity(0.35),
                                  style: StrokeStyle(lineWidth: selected ? 2 : 1, dash: selected ? [] : [3, 2.5]))
            }
            if w > 44 {
                HStack(spacing: 4) {
                    if on {
                        Image(systemName: region.focus == nil ? "cursorarrow" : "scope").font(.system(size: 9, weight: .semibold))
                        Text(String(format: "%.1f×", region.scale)).font(.system(size: 10.5, weight: .semibold).monospacedDigit())
                        if region.instant && w > 66 {
                            Image(systemName: "bolt.fill").font(.system(size: 8.5, weight: .semibold)).accessibilityHidden(true)
                        }
                    } else {
                        Image(systemName: "eye.slash").font(.system(size: 9, weight: .semibold))
                        Text("Off").font(.system(size: 10.5, weight: .semibold))
                    }
                }
                .foregroundStyle(text)
            }
            HStack {
                edge(leading: true)
                Spacer(minLength: 0)
                edge(leading: false)
            }
        }
        .frame(width: w, height: TimelineView.zoomHeight)
        .opacity(dimmed ? 0.4 : 1)
        .offset(x: x0)
        .onHover { h in
            if h { model.hoveredZoomID = region.id } else if model.hoveredZoomID == region.id { model.hoveredZoomID = nil }
        }
        .onTapGesture { model.clickZoom(region.id, extend: NSEvent.modifierFlags.contains(.shift)) }
        .gesture(DragGesture(minimumDistance: 3, coordinateSpace: .named("timeline"))
            .onChanged { v in
                let o = origin ?? region.range
                origin = o
                let dt = Double(v.translation.width / scale.pps)
                let d = o.duration
                let start = min(max(0, o.start + dt), model.duration - d)
                if !selected { model.selection = .zoom(region.id) }
                model.updateZoom(region.id, coalesce: "move") { $0.range = TimeRange(start: start, end: start + d) }
            }
            .onEnded { _ in origin = nil })
        .help(help(user: user))
        .accessibilityElement()
        .accessibilityLabel(accessibilityText(user: user))
        .accessibilityAddTraits(selected ? [.isSelected, .isButton] : .isButton)
    }

    private func help(user: Bool) -> String {
        let keys = "Shift-click to select several. 0–9 set the depth (0 turns it off), I makes it instant."
        if !region.enabled { return "Zoom turned off: it stays here but doesn't play. Press 0 to turn it back on." }
        return (user ? "Zoom you added. Drag to move, drag edges to resize, Delete to remove. " :
                    "Automatic zoom from your clicks. Drag to adjust it. ") + keys
    }

    private func accessibilityText(user: Bool) -> String {
        var parts = ["\(user ? "Zoom" : "Automatic zoom"), \(String(format: "%.1f", region.scale)) times, at \(TimeFormat.clock(region.range.start))"]
        if !region.enabled { parts.append("off") }
        if region.instant { parts.append("instant") }
        return parts.joined(separator: ", ")
    }

    private func edge(leading: Bool) -> some View {
        Color.clear
            .frame(width: 7)
            .contentShape(Rectangle())
            .edgeResizePointer(leading: leading)
            .gesture(DragGesture(minimumDistance: 1, coordinateSpace: .named("timeline"))
                .onChanged { v in
                    let t = scale.t(v.location.x)
                    if !selected { model.selection = .zoom(region.id) }
                    model.updateZoom(region.id, coalesce: leading ? "start" : "end") { r in
                        if leading { r.range.start = min(t, r.range.end - 0.3) } else { r.range.end = max(t, r.range.start + 0.3) }
                    }
                })
    }
}

/// One marker on the ruler: a stem with a small pennant. The pennant is the hit target.
struct MarkerFlagView: View {
    @Bindable var model: EditorModel
    let marker: Marker
    /// From the top of the ruler to the top of the video lane.
    let height: CGFloat
    static let stemX: CGFloat = 4
    @ViewState private var renaming = false
    @ViewState private var draft = ""
    @ViewState private var hovering = false

    var body: some View {
        ZStack(alignment: .topLeading) {
            Rectangle().fill(Theme.ink.opacity(0.7))
                .frame(width: 1.5, height: height - 2)
                .offset(x: Self.stemX - 0.75, y: 2)
            Pennant()
                .fill(Theme.ink.opacity(hovering ? 1 : 0.85))
                .frame(width: 10, height: 8)
                .offset(x: Self.stemX, y: 2)
        }
        .frame(width: 18, height: height, alignment: .topLeading)
        .contentShape(Rectangle().size(width: 18, height: 14))
        .onHover { hovering = $0 }
        .onTapGesture(count: 2) { startRename() }
        .onTapGesture { model.seek(source: marker.t) }
        .contextMenu {
            Button("Go to \(marker.title)") { model.seek(source: marker.t) }
            Button("Rename…") { startRename() }
            Button("Delete Marker") { model.deleteMarker(marker.id) }
            Divider()
            Button("Use Markers as Chapters") { model.useMarkersAsChapters() }
        }
        .popover(isPresented: $renaming, arrowEdge: .bottom) {
            HStack(spacing: 8) {
                TextField("Marker name", text: $draft)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 180)
                    .onSubmit { commit() }
                Button("Delete") { renaming = false; model.deleteMarker(marker.id) }
                    .buttonStyle(SecondaryButtonStyle(small: true))
            }
            .padding(10)
        }
        .help("\(marker.title) at \(TimeFormat.clock(model.timeline.outputTime(forSource: marker.t) ?? marker.t)). Double-click to rename.")
        .accessibilityElement()
        .accessibilityLabel("Marker, \(marker.title)")
        .accessibilityValue(TimeFormat.clock(marker.t))
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { model.seek(source: marker.t) }
        .accessibilityAction(named: "Rename") { startRename() }
        .accessibilityAction(named: "Delete") { model.deleteMarker(marker.id) }
    }

    private func startRename() {
        draft = marker.title
        renaming = true
    }

    private func commit() {
        model.renameMarker(marker.id, to: draft)
        renaming = false
    }
}

/// A flag's pennant: a rectangle with a notch cut into its free end.
struct Pennant: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.minX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX - r.width * 0.3, y: r.midY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
        p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        p.closeSubpath()
        return p
    }
}

/// One camera layout segment: drag to move, drag the edges to resize, click to select (Delete removes it).
struct LayoutSegmentView: View {
    @Bindable var model: EditorModel
    let segment: LayoutSegment
    let scale: TimeScale
    let tall: Bool
    let dimmed: Bool
    @ViewState private var origin: TimeRange?

    private var selected: Bool { model.selection == .layout(segment.id) }

    var body: some View {
        let x0 = scale.x(segment.range.start), x1 = scale.x(segment.range.end)
        let w = max(10, x1 - x0)
        ZStack {
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(Theme.ink.opacity(0.82))
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .strokeBorder(selected ? Theme.accent : .clear, lineWidth: 2)
            if w > 30 {
                HStack(spacing: 4) {
                    Image(systemName: segment.kind.symbol(tall: tall)).font(.system(size: 9.5, weight: .semibold))
                    if w > 70 { Text(segment.kind.label).font(.system(size: 10.5, weight: .semibold)) }
                }
                .foregroundStyle(Theme.panel)
            }
            HStack {
                edge(leading: true)
                Spacer(minLength: 0)
                edge(leading: false)
            }
        }
        .frame(width: w, height: TimelineView.layoutHeight)
        .opacity(dimmed ? 0.4 : 1)
        .offset(x: x0)
        .onTapGesture { model.selection = .layout(segment.id); model.section = .camera }
        .gesture(DragGesture(minimumDistance: 3, coordinateSpace: .named("timeline"))
            .onChanged { v in
                let o = origin ?? segment.range
                origin = o
                model.selection = .layout(segment.id)
                model.moveLayout(segment.id, to: o.start + Double(v.translation.width / scale.pps))
            }
            .onEnded { _ in origin = nil })
        .help("\(segment.kind.label) layout. Drag to move, drag the edges to resize, Delete to remove.")
        .accessibilityElement()
        .accessibilityLabel("\(segment.kind.label) layout from \(TimeFormat.clock(segment.range.start)) to \(TimeFormat.clock(segment.range.end))")
        .accessibilityAddTraits(selected ? [.isSelected, .isButton] : .isButton)
    }

    private func edge(leading: Bool) -> some View {
        Color.clear
            .frame(width: 7)
            .contentShape(Rectangle())
            .edgeResizePointer(leading: leading)
            .gesture(DragGesture(minimumDistance: 1, coordinateSpace: .named("timeline"))
                .onChanged { v in
                    let t = scale.t(v.location.x)
                    model.selection = .layout(segment.id)
                    model.updateLayout(segment.id, coalesce: leading ? "start" : "end") { s in
                        if leading { s.range.start = t } else { s.range.end = t }
                    }
                })
    }
}
