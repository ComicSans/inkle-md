/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import SwiftUI

/// What this app looks like.
///
/// SPEC 7 keeps presentation out of the book, so it has to live somewhere, and
/// this is the somewhere. The palette is the web export's, because a reader
/// who moves between the two should recognise the thing they are reading: warm
/// paper, dark ink, one accent, and a rule that is a rule and not a shadow.
public enum Paper {
    public static let background = Color.dynamic(light: Color(red: 0.965, green: 0.949, blue: 0.910),
                                          dark: Color(red: 0.090, green: 0.086, blue: 0.102))
    public static let ink = Color.dynamic(light: Color(red: 0.106, green: 0.102, blue: 0.090),
                                   dark: Color(red: 0.929, green: 0.906, blue: 0.859))
    public static let faded = Color.dynamic(light: Color(red: 0.451, green: 0.427, blue: 0.361),
                                      dark: Color(red: 0.569, green: 0.549, blue: 0.514))
    public static let rule = Color.dynamic(light: Color(red: 0.812, green: 0.776, blue: 0.690),
                                     dark: Color(red: 0.227, green: 0.216, blue: 0.259))
    public static let accent = Color.dynamic(light: Color(red: 0.478, green: 0.231, blue: 0.180),
                                       dark: Color(red: 0.851, green: 0.580, blue: 0.471))
}

/// A button that belongs on a page: no fill shouting for attention, a rule
/// around it, and the accent only where the reader is meant to look.
public struct PageButton: ButtonStyle {
    public enum Kind {
        /// A choice in the story: full width, because it is a line of text.
        case plain
        /// A small control beside others: as wide as its own words.
        case quiet
        /// A picked option among several, as wide as its own words.
        case chosen
        /// The one button that confirms - Begin, mostly. Filled, so it never
        /// looks like one more option in the list above it.
        case primary
    }

    public var kind: Kind = .plain

    public init(kind: Kind = .plain) { self.kind = kind }

    @Environment(\.isEnabled) private var isEnabled

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.custom("Georgia", size: kind == .plain || kind == .primary ? 16 : 14))
            .foregroundStyle(foreground)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: kind == .plain || kind == .primary ? .infinity : nil, alignment: .leading)
            // 44pt on a coarse pointer, per HOSTS 4, and it happens to be
            // the height a line of Georgia wants around it anyway.
            .frame(minHeight: 44)
            .padding(.horizontal, 14)
            .background(
                RoundedRectangle(cornerRadius: 3)
                    .fill(kind == .primary ? Paper.accent
                        : kind == .chosen ? Paper.accent.opacity(0.10) : Color.clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 3)
                    .strokeBorder(border(configuration.isPressed), lineWidth: kind == .chosen ? 1.5 : 1)
            )
            .opacity(isEnabled ? 1 : 0.45)
            .contentShape(Rectangle())
    }

    private var foreground: Color {
        switch kind {
        case .chosen: return Paper.accent
        case .quiet: return Paper.faded
        case .plain: return Paper.ink
        case .primary: return Paper.background
        }
    }

    private func border(_ pressed: Bool) -> Color {
        if pressed { return Paper.accent }
        switch kind {
        case .chosen: return Paper.accent
        case .quiet: return Paper.rule
        case .plain: return Paper.rule
        case .primary: return Paper.accent
        }
    }
}

extension Color {
    /// One colour with two values, so the page follows the reader's theme
    /// without a colour set in an asset catalogue this package does not have.
    public static func dynamic(light: Color, dark: Color) -> Color {
        #if canImport(UIKit)
        return Color(UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light)
        })
        #elseif canImport(AppKit)
        return Color(NSColor(name: nil) { appearance in
            appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua ? NSColor(dark) : NSColor(light)
        })
        #else
        return light
        #endif
    }
}
