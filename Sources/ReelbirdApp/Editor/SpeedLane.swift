import AppKit
import ReelbirdCore
import SwiftUI

/// The timeline's speed lane (recording time, like the zoom lane above it): speed segments to select, move,
/// resize, change or remove, and dashed outlines for "speed up typing" suggestions with a one-click offer.
struct SpeedLane: View {
    @Bindable var model: EditorModel
    let scale: TimeScale

    var body: some View {
        let suggestions = model.speedSuggestionsDismissed ? [] : model.speedSuggestions
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 7, style: .continuous)
                .fill(Color.primary.opacity(0.03))
                .frame(width: scale.x(model.duration) - scale.x(0), height: TimelineView.speedHeight)
                .offset(x: scale.x(0))
                .allowsHitTesting(false)
            ForEach(Array(suggestions.enumerated()), id: \.offset) { _, s in
                SpeedSuggestionMark(model: model, suggestion: s, scale: scale)
            }
            ForEach(model.edit.speed.segments) { s in
                SpeedSegmentView(model: model, segment: s, scale: scale)
            }
            if suggestions.isEmpty && model.edit.speed.segments.isEmpty {
                Text("Press R to change the speed of a part")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
                    .frame(height: TimelineView.speedHeight)
                    .offset(x: scale.x(0) + 10)
                    .allowsHitTesting(false)
            }
        }
        .animation(Theme.snappy, value: suggestions.count)
    }
}

/// "Speed up 6 typing stretches, saves 0:24": applies every suggestion in one undo step. Sits with the edit tools
/// while suggestions are pending and nothing is selected.
struct SpeedOffer: View {
    @Bindable var model: EditorModel
    let suggestions: [SpeedSuggestion]
    @ViewState private var hovering = false

    var body: some View {
        HStack(spacing: 0) {
            Button { model.applySpeedSuggestions() } label: {
                HStack(spacing: 5) {
                    Image(systemName: "keyboard").font(.system(size: 11, weight: .medium))
                    Text(EditorModel.speedSuggestionTitle(suggestions)).font(.system(size: 12, weight: .medium).monospacedDigit())
                }
                .padding(.leading, 9).padding(.trailing, 6)
                .frame(height: 26)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .help("\(EditorModel.speedSuggestionDetail(suggestions)) Adds a speed segment for each dashed stretch in the speed lane; each can be changed or removed.")
            Button { model.speedSuggestionsDismissed = true } label: {
                Image(systemName: "xmark").font(.system(size: 8.5, weight: .semibold)).frame(width: 22, height: 26).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
            .help("Hide this suggestion")
            .accessibilityLabel("Hide speed suggestion")
        }
        .foregroundStyle(Theme.ink)
        .background(RoundedRectangle(cornerRadius: 6, style: .continuous).fill(Color.primary.opacity(hovering ? 0.08 : 0.045)))
        .overlay(RoundedRectangle(cornerRadius: 6, style: .continuous)
            .strokeBorder(Theme.neutralMark.opacity(0.55), style: StrokeStyle(lineWidth: 1, dash: [3, 2.5])))
        .onHover { hovering = $0 }
        .fixedSize()
    }
}

/// A suggested stretch: a dashed outline with its speed. Click to apply just this one.
private struct SpeedSuggestionMark: View {
    @Bindable var model: EditorModel
    let suggestion: SpeedSuggestion
    let scale: TimeScale

    var body: some View {
        let x0 = scale.x(suggestion.range.start), w = max(8, scale.x(suggestion.range.end) - x0)
        RoundedRectangle(cornerRadius: 6, style: .continuous)
            .strokeBorder(Theme.neutralMark.opacity(0.7), style: StrokeStyle(lineWidth: 1, dash: [3, 2.5]))
            .background(RoundedRectangle(cornerRadius: 6, style: .continuous).fill(Theme.neutralMark.opacity(0.06)))
            .overlay(alignment: .trailing) {
                if w > 34 {
                    Text(SpeedSegment.label(suggestion.rate)).font(.system(size: 10, weight: .semibold).monospacedDigit())
                        .foregroundStyle(Theme.neutralMark).padding(.trailing, 6)
                }
            }
            .frame(width: w, height: TimelineView.speedHeight)
            .contentShape(Rectangle())
            .offset(x: x0)
            .onTapGesture { model.applySpeedSuggestion(suggestion) }
            .help("\(suggestion.kind == .typing ? "Typing" : "Nothing happening") for \(TimeFormat.clock(suggestion.range.duration)). "
                  + "Click to play it at \(SpeedSegment.label(suggestion.rate)) (saves \(TimeFormat.clock(suggestion.savedSeconds))).")
            .accessibilityElement()
            .accessibilityLabel("Suggested speed \(SpeedSegment.label(suggestion.rate)) at \(TimeFormat.clock(suggestion.range.start))")
            .accessibilityAddTraits(.isButton)
    }
}

/// One speed segment: drag to move, drag the edges to resize, click to select, right-click to change.
struct SpeedSegmentView: View {
    @Bindable var model: EditorModel
    let segment: SpeedSegment
    let scale: TimeScale
    @ViewState private var origin: TimeRange?

    private var selected: Bool { model.selection == .speed(segment.id) }
    private var muted: Bool { !model.edit.speed.isAudible(rate: segment.rate) }

    var body: some View {
        let x0 = scale.x(segment.range.start), x1 = scale.x(segment.range.end)
        let w = max(10, x1 - x0)
        let user = segment.source == .user
        ZStack {
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(user ? Theme.ink.opacity(0.82) : Theme.neutralMark.opacity(0.28))
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .strokeBorder(selected ? Theme.accent : Color.primary.opacity(user ? 0 : 0.18), lineWidth: selected ? 2 : 1)
            if w > 30 {
                HStack(spacing: 3) {
                    if w > 70 { Image(systemName: symbol).font(.system(size: 8.5, weight: .semibold)) }
                    Text(SpeedSegment.label(segment.rate)).font(.system(size: 10.5, weight: .semibold).monospacedDigit())
                    if muted && w > 52 { Image(systemName: "speaker.slash.fill").font(.system(size: 8, weight: .semibold)).opacity(0.75) }
                }
                .foregroundStyle(user ? Theme.panel : Color.primary.opacity(0.72))
            }
            HStack {
                edge(leading: true)
                Spacer(minLength: 0)
                edge(leading: false)
            }
        }
        .frame(width: w, height: TimelineView.speedHeight)
        .offset(x: x0)
        .onTapGesture { model.selection = .speed(segment.id) }
        .gesture(DragGesture(minimumDistance: 3, coordinateSpace: .named("timeline"))
            .onChanged { v in
                let o = origin ?? segment.range
                origin = o
                let dt = Double(v.translation.width / scale.pps)
                model.selection = .speed(segment.id)
                model.updateSpeed(segment.id, coalesce: "move") { s in
                    let lower = model.edit.speed.segments.last { $0.range.end <= o.start + 1e-9 && $0.id != segment.id }?.range.end ?? 0
                    let upper = model.edit.speed.segments.first { $0.range.start >= o.end - 1e-9 && $0.id != segment.id }?.range.start ?? model.duration
                    let start = min(max(lower, o.start + dt), upper - o.duration)
                    s.range = TimeRange(start: start, end: start + o.duration)
                }
            }
            .onEnded { _ in origin = nil })
        .contextMenu { menu }
        .help(help)
        .accessibilityElement()
        .accessibilityLabel("Speed \(SpeedSegment.label(segment.rate)) from \(TimeFormat.clock(segment.range.start)) to \(TimeFormat.clock(segment.range.end))")
        .accessibilityAddTraits(selected ? [.isSelected, .isButton] : .isButton)
    }

    private var symbol: String {
        switch segment.source {
        case .typing: "keyboard"
        case .idle: "hourglass"
        case .cleanUp: "wand.and.stars"
        case .user: segment.rate < 1 ? "tortoise.fill" : "forward.fill"
        }
    }

    private var help: String {
        let what = segment.source == .typing ? "Typing sped up" : segment.source == .idle ? "Idle stretch sped up"
            : segment.source == .cleanUp ? "Sped up by Clean Up" : "Speed"
        var s = "\(what): \(SpeedSegment.label(segment.rate)). Drag to move, drag the edges to resize, R for the next speed, Delete to remove."
        if muted { s += " Sound is off above 2×." }
        return s
    }

    @ViewBuilder private var menu: some View {
        ForEach([0.25] + SpeedSegment.presets + [8], id: \.self) { r in
            Button {
                model.selection = .speed(segment.id)
                model.setSpeedRate(r)
            } label: {
                if abs(r - segment.rate) < 1e-9 { Label(SpeedSegment.label(r), systemImage: "checkmark") } else { Text(SpeedSegment.label(r)) }
            }
        }
        Divider()
        Toggle("Keep Sound Above 2×", isOn: Binding(get: { model.edit.speed.keepFastAudio }, set: { model.setKeepFastAudio($0) }))
        Divider()
        Button("Remove Speed") { model.deleteSpeed(segment.id) }
    }

    private func edge(leading: Bool) -> some View {
        Color.clear
            .frame(width: 7)
            .contentShape(Rectangle())
            .edgeResizePointer(leading: leading)
            .gesture(DragGesture(minimumDistance: 1, coordinateSpace: .named("timeline"))
                .onChanged { v in
                    let t = scale.t(v.location.x)
                    model.selection = .speed(segment.id)
                    model.updateSpeed(segment.id, coalesce: leading ? "start" : "end") { s in
                        if leading { s.range.start = min(t, s.range.end - 0.3) } else { s.range.end = max(t, s.range.start + 0.3) }
                    }
                })
    }
}
