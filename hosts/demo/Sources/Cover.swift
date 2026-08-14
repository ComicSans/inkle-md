/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import SwiftUI

/// A cover for a book on the shelf, drawn rather than shipped.
///
/// The books in this project carry no cover: SPEC 6 keeps presentation out of
/// the book, and a picture of a book is presentation about it. So the shelf
/// draws its own, from the title and nothing else. Same title, same cover,
/// every time.
struct Cover: View {
    let title: String
    let subtitle: String?
    /// False for a book whose text is not ours. `examples/intercept.md` is
    /// inkle's own game, imported and under its own licence, and inventing a
    /// device for it would be putting our hand on someone else's cover. It
    /// gets a typeset cover instead: deliberately plain rather than empty,
    /// because those look the same and only one of them is meant.
    var device = true
    /// A book that has been opened before wears a ribbon, the way a book with
    /// a bookmark in it does.
    var started = false

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(LinearGradient(colors: palette, startPoint: .top, endPoint: .bottom))

            // A device in the middle, chosen by the title so a book keeps its
            // own face: an arch, a house, a moon, a door.
            if device {
                Device(kind: kind)
                    .fill(Color.white.opacity(0.30))
                    .padding(.horizontal, 18)
                    .padding(.top, 26)
                    .padding(.bottom, 34)
            } else {
                typeset
            }

            VStack {
                Spacer()
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.6)
                    .lineLimit(3)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.75))
                }
            }
            .padding(8)

            // The spine, so it reads as a book and not as a card.
            HStack {
                Rectangle().fill(Color.black.opacity(0.18)).frame(width: 6)
                Spacer()
            }
            .clipShape(RoundedRectangle(cornerRadius: 6))

            if started {
                HStack {
                    Spacer()
                    Ribbon()
                        .fill(Color.white.opacity(0.85))
                        .frame(width: 14, height: 34)
                        .padding(.trailing, 14)
                }
                .frame(maxHeight: .infinity, alignment: .top)
            }
        }
        .frame(width: 132, height: 190)
        .shadow(radius: 2, y: 1)
        // One element with one name: a screen reader does not want a spine.
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
    }

    /// A cover made of rules and space. It says a book is here and claims
    /// nothing about what is in it.
    private var typeset: some View {
        VStack(spacing: 0) {
            Rectangle().fill(Color.white.opacity(0.35)).frame(height: 1)
            Spacer(minLength: 0)
            Rectangle().fill(Color.white.opacity(0.35)).frame(height: 1)
        }
        .padding(.horizontal, 16)
        .padding(.top, 22)
        .padding(.bottom, 46)
        .overlay(alignment: .top) {
            // The mark of a book that came from somewhere else.
            Text("· · ·")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.5))
                .padding(.top, 34)
        }
    }

    // MARK: - Everything below follows from the title

    /// A small stable hash. Swift's own is salted per launch, and a cover that
    /// changes colour between two starts is not a cover.
    private func hash(_ salt: Int) -> Int {
        title.unicodeScalars.reduce(salt) { ($0 &* 131 &+ Int($1.value)) & 0xFFFFF }
    }

    private var seed: Int { hash(7) }

    private var palette: [Color] {
        let palettes: [[Color]] = [
            [Color(red: 0.29, green: 0.13, blue: 0.16), Color(red: 0.10, green: 0.07, blue: 0.11)],
            [Color(red: 0.11, green: 0.20, blue: 0.24), Color(red: 0.05, green: 0.08, blue: 0.13)],
            [Color(red: 0.24, green: 0.19, blue: 0.09), Color(red: 0.09, green: 0.08, blue: 0.06)],
            [Color(red: 0.17, green: 0.12, blue: 0.25), Color(red: 0.06, green: 0.05, blue: 0.12)],
        ]
        return palettes[seed % palettes.count]
    }

    /// The title first, the hash only when the title says nothing. A cover
    /// that draws a house for a book about a house is worth the four lines,
    /// and the fallback has its own salt: dividing one seed between colour and
    /// shape had both books drawing the same moon.
    private var kind: Device.Kind {
        let words = title.lowercased()
        if words.contains("house") || words.contains("haus") { return .house }
        if words.contains("crypt") || words.contains("gruft") || words.contains("tomb") { return .arch }
        if words.contains("night") || words.contains("nacht") || words.contains("moon") { return .moon }
        return Device.Kind.allCases[hash(23) % Device.Kind.allCases.count]
    }
}

/// The shape in the middle of a cover.
struct Device: Shape {
    enum Kind: CaseIterable { case arch, house, moon, door }

    let kind: Kind

    func path(in rect: CGRect) -> Path {
        var path = Path()
        switch kind {
        case .arch:
            let springing = rect.midY
            path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX, y: springing))
            path.addArc(center: CGPoint(x: rect.midX, y: springing),
                        radius: rect.width / 2, startAngle: .degrees(180), endAngle: .zero,
                        clockwise: false)
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
            path.closeSubpath()
        case .house:
            path.move(to: CGPoint(x: rect.midX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX, y: rect.midY))
            path.closeSubpath()
        case .moon:
            // Two arcs rather than a circle minus a circle: `subtracting` is
            // macOS 14, and this package goes back to 13.
            let r = min(rect.width, rect.height) / 2
            let centre = CGPoint(x: rect.midX, y: rect.midY)
            path.addArc(center: centre, radius: r,
                        startAngle: .degrees(90), endAngle: .degrees(270), clockwise: false)
            path.addArc(center: CGPoint(x: centre.x - r * 0.5, y: centre.y),
                        radius: r * 1.1, startAngle: .degrees(300), endAngle: .degrees(60),
                        clockwise: true)
            path.closeSubpath()
        case .door:
            let inset = rect.insetBy(dx: rect.width * 0.22, dy: 0)
            path.addRoundedRect(in: inset, cornerSize: CGSize(width: inset.width / 2,
                                                              height: inset.width / 2))
        }
        return path
    }
}


/// A bookmark ribbon: a strip with a notch cut out of its foot.
struct Ribbon: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.midX, y: rect.maxY - rect.width * 0.55))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}
