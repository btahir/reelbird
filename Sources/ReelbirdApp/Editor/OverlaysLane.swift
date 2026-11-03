import AppKit
import ReelbirdCore
import SwiftUI

/// The Overlays lane: one bar per blur, arrow, box, text and highlight. Overlapping ones stack in rows.
/// Click to select, drag to move, drag the ends to trim, Delete removes.
struct OverlaysLane: View {
    @Bindable var model: EditorModel
    let scale: TimeScale

    var body: some View {
        let rows = Self.rows(model.edit.annotations)
        let count = max(1, (rows.values.max() ?? 0) + 1)
        // Rows always fit the lane: many overlapping overlays get thinner bars (labels show from two rows down).
        let gap: CGFloat = count > 3 ? 1 : 2
        let rowHeight = max(2, (TimelineView.overlayHeight - gap * CGFloat(count - 1)) / CGFloat(count))
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 7, style: .continuous)
                .fill(Color.primary.opacity(0.03))
                .frame(width: scale.x(model.duration) - scale.x(0), height: TimelineView.overlayHeight)
                .offset(x: scale.x(0))
                .allowsHitTesting(false)
            ForEach(model.edit.annotations) { a in
                OverlayBarView(model: model, annotation: a, scale: scale, height: rowHeight)
                    .offset(y: CGFloat(rows[a.id] ?? 0) * (rowHeight + gap))
            }
            if model.edit.annotations.isEmpty {
                Text("Press B to blur an area, or add arrows, boxes and text in Overlays")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
                    .frame(height: TimelineView.overlayHeight)
                    .offset(x: scale.x(0) + 10)
                    .allowsHitTesting(false)
            }
        }
    }

    /// Row per overlay: each goes in the first row that's free at its start.
    static func rows(_ annotations: [Annotation]) -> [String: Int] {
        var ends: [Double] = []
        var out: [String: Int] = [:]
        for a in annotations.sorted(by: { ($0.range.start, $0.id) < ($1.range.start, $1.id) }) {
            if let i = ends.firstIndex(where: { $0 <= a.range.start + 1e-6 }) {
                ends[i] = a.range.end
                out[a.id] = i
            } else {
                ends.append(a.range.end)
                out[a.id] = ends.count - 1
            }
        }
        return out
    }
}

/// One overlay on the lane.
struct OverlayBarView: View {
    @Bindable var model: EditorModel
    let annotation: Annotation
    let scale: TimeScale
    let height: CGFloat
    @ViewState private var origin: TimeRange?

    private var selected: Bool { model.selection == .annotation(annotation.id) }

    var body: some View {
        let a = annotation
        let x0 = scale.x(a.range.start), x1 = scale.x(a.range.end)
        let w = max(8, x1 - x0)
        ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: min(6, height / 2), style: .continuous)
                .fill(Theme.ink.opacity(a.kind == .blur ? 0.82 : 0.62))
            if a.kind == .blur {
                // A faint grid says "blurred" at a glance.
                Canvas { ctx, size in
                    var p = Path()
                    var x: CGFloat = 4
                    while x < size.width { p.addRect(CGRect(x: x, y: 0, width: 1, height: size.height)); x += 6 }
                    ctx.fill(p, with: .color(Theme.panel.opacity(0.12)))
                }
                .clipShape(RoundedRectangle(cornerRadius: min(6, height / 2), style: .continuous))
                .allowsHitTesting(false)
            }
            RoundedRectangle(cornerRadius: min(6, height / 2), style: .continuous)
                .strokeBorder(selected ? Theme.accent : .clear, lineWidth: 2)
            if w > 34, height >= 12 {
                HStack(spacing: 4) {
                    if a.kind != .blur && a.kind != .highlight {
                        Circle().fill(Color(.sRGB, red: a.color.r, green: a.color.g, blue: a.color.b)).frame(width: 7, height: 7)
                    } else {
                        Image(systemName: a.kind.symbol).font(.system(size: 9, weight: .semibold))
                    }
                    if w > 70 { Text(a.title).font(.system(size: 10.5, weight: .semibold)).lineLimit(1) }
                }
                .foregroundStyle(Theme.panel)
                .padding(.horizontal, 8)
            }
            HStack {
                edge(leading: true)
                Spacer(minLength: 0)
                edge(leading: false)
            }
        }
        .frame(width: w, height: height)
        .offset(x: x0)
        .onTapGesture { model.selectAnnotation(a.id) }
        .gesture(DragGesture(minimumDistance: 3, coordinateSpace: .named("timeline"))
            .onChanged { v in
                let o = origin ?? a.range
                origin = o
                let d = o.duration
                let start = min(max(0, o.start + Double(v.translation.width / scale.pps)), model.duration - d)
                model.selection = .annotation(a.id)
                model.updateAnnotation(a.id, "Move Overlay", coalesce: "time") { $0.shift(by: start - $0.range.start) }
            }
            .onEnded { _ in origin = nil })
        .help("\(a.title). Drag to move, drag the ends to trim, Delete to remove.")
        .accessibilityElement()
        .accessibilityLabel("\(a.title), \(TimeFormat.clock(a.range.start)) to \(TimeFormat.clock(a.range.end))")
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
                    model.selection = .annotation(annotation.id)
                    model.updateAnnotation(annotation.id, "Trim Overlay", coalesce: leading ? "start" : "end") { a in
                        if leading { a.range.start = min(t, a.range.end - Annotation.minimumDuration) }
                        else { a.range.end = max(t, a.range.start + Annotation.minimumDuration) }
                    }
                })
    }
}
