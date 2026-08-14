/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import SwiftUI

/// A book on screen.
///
/// This is one answer to what a page looks like, not the answer: the protocol
/// hands over a label and an index, and what becomes a button is this side's
/// decision (12.5). An app that wants its own look reads `story.view` and
/// draws it however it likes; nothing below is required to play a book.
///
/// What is not optional is the list in SPEC 12.3, translated into this
/// platform's terms: choices are buttons in a list, the new text takes focus
/// after every turn, a fight announces what its round did without moving
/// focus, a disabled control says why, and nothing here is conveyed by colour
/// alone.
@MainActor
public struct StoryScreen: View {
    @ObservedObject private var story: Story
    private let labels: Labels

    @AccessibilityFocusState private var textIsFocused: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.displayScale) private var displayScale
    @State private var picks: [Set<String>] = []

    public init(story: Story, labels: Labels? = nil) {
        self.story = story
        self.labels = labels ?? .forLanguage(story.view.lang)
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if let setup = story.view.setup {
                    creation(setup)
                } else {
                    prose
                    if let fight = story.view.combat {
                        combat(fight)
                    } else if story.view.ended {
                        Text(labels.theEnd)
                            .font(.headline)
                            .accessibilityAddTraits(.isHeader)
                    } else {
                        choices
                    }
                    sheet
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        // The book decides its language, so the text is marked as that
        // language and a screen reader does not read German with an English
        // voice.
        .environment(\.locale, Locale(identifier: story.view.lang))
        .animation(reduceMotion ? nil : .default, value: story.view.node)
    }

    // MARK: - Setting out

    @ViewBuilder
    private func creation(_ blocks: [SetupBlock]) -> some View {
        ForEach(Array(blocks.enumerated()), id: \.element.id) { index, block in
            VStack(alignment: .leading, spacing: 8) {
                Text(block.title ?? labels.pick(block.pick))
                    .font(.headline)
                    .accessibilityAddTraits(.isHeader)
                ForEach(block.from) { option in
                    let chosen = picks.indices.contains(index) && picks[index].contains(option.key)
                    Button { toggle(option.key, in: index, limit: block.pick) } label: {
                        HStack {
                            Text(option.label)
                            Spacer()
                            // Never colour alone: the checkmark carries it too.
                            if chosen { Image(systemName: "checkmark") }
                        }
                    }
                    .buttonStyle(.bordered)
                    .accessibilityAddTraits(chosen ? [.isSelected] : [])
                }
            }
        }

        Button(labels.begin) { try? story.begin(picks.map(Array.init)) }
            .buttonStyle(.borderedProminent)
            .disabled(!readyToBegin)
            // A disabled control says why, next to it and as its description.
            .accessibilityHint(readyToBegin ? "" : labels.pickFirst)
        if !readyToBegin {
            Text(labels.pickFirst).font(.footnote).foregroundStyle(.secondary)
        }
    }

    private var readyToBegin: Bool {
        guard let blocks = story.view.setup else { return false }
        return blocks.indices.allSatisfy { picks.indices.contains($0) && picks[$0].count == blocks[$0].pick }
    }

    private func toggle(_ key: String, in block: Int, limit: Int) {
        while picks.count <= block { picks.append([]) }
        if picks[block].contains(key) { picks[block].remove(key) }
        else if picks[block].count < limit { picks[block].insert(key) }
        else { picks[block] = [key] }   // a single-pick block swaps rather than refuses
    }

    // MARK: - The page

    private var prose: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(story.view.text) { paragraph in
                switch paragraph.kind {
                case .prose(let text):
                    Text(text)
                        .font(font(for: paragraph.styleName))
                        .italic(paragraph.styleName == "letter")
                case .image(let file, let alt):
                    picture(file, alt: alt)
                }
            }
        }
        // Focus lands on the new text after every turn, so a screen reader
        // starts at what changed rather than at the top of the screen.
        .accessibilityElement(children: .combine)
        .accessibilityFocused($textIsFocused)
        .onChange(of: story.view.node) { _ in textIsFocused = true }
    }

    /// An image between two paragraphs (SPEC 4.9).
    ///
    /// The alt text is the accessible name and never also visible text: the
    /// language requires it, so there is no decorative image to hide and no
    /// caption to duplicate. `Story.url(for:scale:)` picks `@2x` or `@3x` if
    /// the book shipped one.
    @ViewBuilder
    private func picture(_ file: String, alt: String) -> some View {
        if let url = story.url(for: file, scale: displayScale),
           let image = platformImage(url) {
            image
                .resizable()
                .scaledToFit()
                .frame(maxWidth: .infinity)
                .accessibilityLabel(alt)
                // A picture is one element, not a decoration next to nothing.
                .accessibilityAddTraits(.isImage)
        } else {
            // A missing file is a broken book, but the reader keeps the
            // sentence the picture was carrying.
            Text(alt).font(.footnote).foregroundStyle(.secondary)
        }
    }

    private func platformImage(_ url: URL) -> Image? {
        #if canImport(UIKit)
        return UIImage(contentsOfFile: url.path).map(Image.init(uiImage:))
        #elseif canImport(AppKit)
        return NSImage(contentsOfFile: url.path).map(Image.init(nsImage:))
        #else
        return nil
        #endif
    }

    /// The one place a `{.name}` from the book becomes a look. Section 6 keeps
    /// this out of the book, and this is where it lives instead.
    private func font(for styleName: String?) -> Font {
        switch styleName {
        case "letter": return .callout
        case "sign": return .system(.body, design: .monospaced)
        default: return .body
        }
    }

    private var choices: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(labels.choices)
                .font(.headline)
                .accessibilityAddTraits(.isHeader)
            ForEach(story.view.choices) { choice in
                Button(choice.label) { try? story.choose(choice.index) }
                    .buttonStyle(.bordered)
                    .frame(minHeight: 44)      // 12.3: a touch target is 44pt
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            if story.view.canUndo {
                Button(labels.back) { _ = try? story.undo() }
                    .buttonStyle(.borderless)
                    .frame(minHeight: 44)
            }
        }
        .accessibilityElement(children: .contain)
    }

    // MARK: - A fight

    @ViewBuilder
    private func combat(_ fight: Combat) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(fight.enemy.name)
                .font(.headline)
                .accessibilityAddTraits(.isHeader)
            ProgressView(value: Double(max(0, fight.enemy.stamina)), total: Double(max(1, fight.enemy.max)))
                .accessibilityLabel(labels.statValue(fight.enemy.name, fight.enemy.stamina, fight.enemy.max))
            if let last = fight.log.last {
                Text(last.text)
                    .font(.callout)
                    // What a round did reaches a screen reader as a status,
                    // so it is spoken without the focus moving (12.3).
                    .accessibilityAddTraits(.updatesFrequently)
                    .accessibilityLabel("\(labels.round(last.round)). \(last.text)")
            }

            HStack {
                if fight.luck != nil {
                    Button(labels.luck) { _ = try? story.testLuck() }.buttonStyle(.bordered)
                }
                Button(labels.attack) { announce(try? story.attack()) }
                    .buttonStyle(.borderedProminent)
                if fight.canFlee {
                    Button(labels.flee) { _ = try? story.flee() }.buttonStyle(.bordered)
                }
            }
            .frame(minHeight: 44)
        }
    }

    private func announce(_ round: Round??) {
        guard let text = (round ?? nil)?.text else { return }
        #if os(iOS)
        AccessibilityNotification.Announcement(text).post()
        #endif
    }

    // MARK: - The character sheet

    private var sheet: some View {
        VStack(alignment: .leading, spacing: 12) {
            let shown = story.view.stats.filter(\.named)
            if !shown.isEmpty {
                Text(labels.character).font(.headline).accessibilityAddTraits(.isHeader)
                ForEach(shown) { stat in
                    HStack {
                        Text(stat.label)
                        Spacer()
                        Text(stat.value.map(String.init) ?? "-")
                            .monospacedDigit()
                    }
                    // The sheet is a description list, not a row of bars: the
                    // number belongs in the accessible name (12.3).
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(labels.statValue(stat.label, stat.value ?? 0, stat.max))
                }
            }

            if !story.view.inventory.isEmpty {
                Text(labels.belongings).font(.headline).accessibilityAddTraits(.isHeader)
                ForEach(story.view.inventory) { item in
                    HStack {
                        Text(item.name)
                        if item.equipped {
                            Text(labels.equipped).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        if item.usable || item.uses > 1 {
                            Button(labels.use) { _ = try? story.use(item.id) }
                                .buttonStyle(.bordered)
                                .disabled(!item.usable)
                                // The remaining uses ride in the button's own
                                // name, so the effect is not visible only as a
                                // number somewhere else.
                                .accessibilityLabel("\(labels.use) \(item.name), \(labels.uses(item.uses))")
                                .accessibilityHint(item.usable ? "" : labels.unusable)
                        }
                        if item.kind == "weapon" || item.kind == "armour", !item.equipped {
                            Button(labels.equip) { _ = try? story.equip(item.id) }
                                .buttonStyle(.bordered)
                                .accessibilityLabel("\(labels.equip) \(item.name)")
                        }
                    }
                    .frame(minHeight: 44)
                }
            }

            if !story.view.memory.isEmpty {
                Text(labels.memory).font(.headline).accessibilityAddTraits(.isHeader)
                // The code words in the order they were noted, the Lone Wolf
                // convention the runtime keeps for exactly this.
                Text(story.view.memory.joined(separator: ", "))
            }
        }
    }
}
