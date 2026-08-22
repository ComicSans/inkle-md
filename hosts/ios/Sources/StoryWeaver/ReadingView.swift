/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import SwiftUI

/// A book as one long text.
///
/// The page does not get replaced when the reader chooses; it grows. What was
/// read stays where it was, the new part follows below it, and between the two
/// stands what the reader did. A finished book therefore reads back as an
/// account of this playthrough and not as a heap of scenes in whatever order
/// they were reached.
///
/// The protocol makes that easy and never asks for it: `view.text` is what is
/// on the page now (12.7), and keeping the earlier pages is the host's own
/// idea, like everything else about how a book looks (12.5).
@MainActor
public struct ReadingView: View {
    @ObservedObject private var story: Story
    private let labels: Labels

    /// - Parameters:
    ///   - story: the book being read.
    ///   - labels: the words this app puts on its own controls. Omit them and
    ///     they follow the book's language.
    ///   - showCover: whether to open on the back of the book (SPEC 7) when
    ///     the book has one. Pass `false` when a save was loaded: a reader
    ///     returning to a game has read the cover already.
    public init(story: Story, labels: Labels? = nil, showCover: Bool = true) {
        self.story = story
        self.labels = labels ?? .forLanguage(story.view.lang)
        _coverPending = State(initialValue: showCover && story.blurbText() != nil)
    }

    /// What has been read so far, oldest first.
    @State private var passages: [Passage] = []
    @State private var picks: [Set<String>] = []
    /// True while the back of the book is the page. The one button on it
    /// begins.
    @State private var coverPending = false
    /// False while a turn is being taken. The controls fade out, the new
    /// passage arrives, and they fade back in at the foot of it: a border that
    /// slides down the page with the text is a border the eye follows instead
    /// of reading.
    @State private var controlsVisible = true
    @AccessibilityFocusState private var latestIsFocused: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.displayScale) private var displayScale

    /// One turn: what the reader did, and what the book said next.
    private struct Passage: Identifiable {
        let id: Int
        /// The choice that led here, in the reader's own words. `nil` for the
        /// first passage, which nobody chose.
        let action: String?
        let paragraphs: [Paragraph]
        let node: String?
        /// What a single combat round narrated. A round is not a page: it has
        /// no paragraphs and no node of its own, only its sentence, and it
        /// stands in the account under the passage the fight began on.
        var line: String? = nil
    }

    public var body: some View {
        ScrollViewReader { scroller in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if story.view.languages.count > 1 {
                        languages
                    }
                    ForEach(passages) { passage in
                        if let line = passage.line {
                            round(line)
                                .id(passage.id)
                        } else {
                            if let action = passage.action {
                                deed(action)
                            }
                            prose(passage)
                                .id(passage.id)
                        }
                    }

                    Group {
                        if coverPending {
                            cover
                        } else if story.view.setup != nil {
                            creation
                        } else if let fight = story.view.combat {
                            combat(fight)
                        } else if story.view.ended {
                            ending
                        } else {
                            choices
                        }
                    }
                    .padding(.top, 28)
                    .opacity(controlsVisible ? 1 : 0)
                    // A new set of controls is a new thing, not the old one
                    // moved: without this SwiftUI keeps the frames and slides
                    // them down the page as the text grows.
                    .id(passages.count)

                    sheet
                        .padding(.top, 40)
                }
                .frame(maxWidth: 620, alignment: .leading)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 24)
                .padding(.vertical, 28)
            }
            .background(Paper.background.ignoresSafeArea())
            .onChange(of: passages.count) { _ in
                guard let last = passages.last else { return }
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.25)) {
                    scroller.scrollTo(last.id, anchor: .top)
                }
                // What a round did is a status message, not a new page: the
                // focus stays on the buttons the reader is using and the
                // sentence is announced where they are (HOSTS 4).
                if let line = last.line { announce(line) } else { latestIsFocused = true }
            }
        }
        .environment(\.locale, Locale(identifier: story.view.lang))
        .onAppear { if passages.isEmpty && !coverPending { record(action: nil) } }
    }

    /// A book that has more than one language lets the reader pick, and the
    /// pick holds for this book alone. Switching keeps the whole save: the ids
    /// of 9.1 are shared between languages, so nothing that was read is lost
    /// (12.1). What was already read stays in the language it was read in,
    /// because it was.
    private var languages: some View {
        HStack(spacing: 10) {
            Spacer()
            ForEach(Array(story.view.languages.enumerated()), id: \.element) { index, code in
                if index > 0 {
                    Text("·").font(.custom("Georgia", size: 12)).foregroundStyle(Paper.rule)
                }
                Button { switchTo(code) } label: {
                    Text(code.uppercased())
                        .font(.custom("Georgia", size: 12))
                        .foregroundStyle(code == story.view.lang ? Paper.accent : Paper.faded)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(name(of: code))
                .accessibilityAddTraits(code == story.view.lang ? [.isSelected] : [])
            }
        }
        .padding(.bottom, 18)
    }

    /// Says a line to a screen reader without moving anybody's focus.
    /// `AccessibilityNotification` would be the SwiftUI spelling and it starts
    /// at iOS 17; this package says 16.
    private func announce(_ line: String) {
        #if canImport(UIKit)
        UIAccessibility.post(notification: .announcement, argument: line)
        #endif
    }

    private func name(of code: String) -> String {
        Locale.current.localizedString(forLanguageCode: code) ?? code
    }

    /// Switching repaints the page the reader is on. The passage they are
    /// looking at is replaced rather than appended: it is the same passage,
    /// said again in the other language.
    private func switchTo(_ code: String) {
        guard code != story.view.lang else { return }
        try? story.setLanguage(code)
        let paragraphs = story.view.text
        guard !paragraphs.isEmpty, let last = passages.last else { return }
        // A round was said in the language it was said in, like every earlier
        // passage: there is no page under it to repaint.
        guard last.line == nil else { return }
        passages[passages.count - 1] = Passage(id: last.id, action: last.action,
                                               paragraphs: paragraphs, node: last.node)
    }

    // MARK: - The text

    /// What the reader did, set between two passages so the account reads on.
    private func deed(_ action: String) -> some View {
        HStack(alignment: .center, spacing: 12) {
            Rectangle().fill(Paper.rule).frame(height: 1)
            Text(action)
                .font(.custom("Georgia", size: 13).italic())
                .foregroundStyle(Paper.faded)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .layoutPriority(1)
            Rectangle().fill(Paper.rule).frame(height: 1)
        }
        .padding(.vertical, 26)
        // One element, and it says what it is: a screen reader should not have
        // to work out that two rules and a phrase are a caption.
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(labels.youChose): \(action)")
    }

    /// One round of a fight, set in the account like any other line of the
    /// book. No rule above it: eight rounds are eight sentences of the same
    /// scene, and eight captions saying "Attack" would be the loudest thing
    /// on the page.
    private func round(_ line: String) -> some View {
        Text(line)
            .font(.custom("Georgia", size: 17))
            .lineSpacing(5)
            .foregroundStyle(Paper.ink)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 14)
    }

    private func prose(_ passage: Passage) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            ForEach(passage.paragraphs) { paragraph in
                switch paragraph.kind {
                case .prose(let text):
                    Text(text)
                        .font(.custom("Georgia", size: 17))
                        .lineSpacing(5)
                        .foregroundStyle(Paper.ink)
                        .italic(paragraph.styleName == "letter")
                        .padding(.leading, paragraph.styleName == "letter" ? 16 : 0)
                        .overlay(alignment: .leading) {
                            if paragraph.styleName == "letter" {
                                Rectangle().fill(Paper.rule).frame(width: 2)
                            }
                        }
                case .image(let file, let alt):
                    picture(file, alt: alt)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityFocused($latestIsFocused)
    }

    @ViewBuilder
    private func picture(_ file: String, alt: String) -> some View {
        if let url = story.url(for: file, scale: displayScale), let image = platformImage(url) {
            image
                .resizable()
                .scaledToFit()
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: 3))
                .padding(.vertical, 6)
                .accessibilityLabel(alt)
                .accessibilityAddTraits(.isImage)
        } else {
            Text(alt).font(.footnote).foregroundStyle(Paper.faded)
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

    // MARK: - What the reader can do

    private var choices: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(story.view.choices) { choice in
                Button(choice.label) { take(choice) }
                    .buttonStyle(PageButton())
            }
            if story.view.canUndo {
                Button(labels.back) {
                    act(labels.back) { () -> String? in
                        _ = try? story.undo()
                        // Undo takes back the page too: the account should not
                        // keep a passage the reader has just unmade. A round is
                        // no undo point (SPEC 15), so a fight unwinds whole:
                        // every line said in it goes with the page it stood on.
                        while passages.count > 1, passages.last?.node != story.view.node {
                            passages.removeLast()
                        }
                        return nil
                    }
                }
                .buttonStyle(PageButton(kind: .quiet))
            }
        }
    }

    /// The back of the book: what a browser in a shop would read. One button
    /// under it, and nothing else of the page yet.
    private var cover: some View {
        VStack(alignment: .leading, spacing: 22) {
            if let blurb = story.blurbText() {
                Text(blurb)
                    .font(.custom("Georgia", size: 17).italic())
                    .lineSpacing(5)
                    .foregroundStyle(Paper.ink)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            Button(labels.begin) {
                coverPending = false
                record(action: nil)
            }
            .buttonStyle(PageButton(kind: .primary))
        }
    }

    private var ending: some View {
        Text(labels.theEnd)
            .font(.custom("Georgia", size: 15).smallCaps())
            .foregroundStyle(Paper.faded)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.top, 8)
            .accessibilityAddTraits(.isHeader)
    }

    @ViewBuilder
    private func combat(_ fight: Combat) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(fight.enemy.name)
                    .font(.custom("Georgia", size: 15).smallCaps())
                    .foregroundStyle(Paper.ink)
                Spacer()
                Text("\(max(0, fight.enemy.stamina)) / \(fight.enemy.max)")
                    .font(.custom("Georgia", size: 15))
                    .monospacedDigit()
                    .foregroundStyle(Paper.faded)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(labels.statValue(fight.enemy.name, fight.enemy.stamina, fight.enemy.max))

            ProgressView(value: Double(max(0, fight.enemy.stamina)), total: Double(max(1, fight.enemy.max)))
                .tint(Paper.accent)
                .accessibilityHidden(true)

            HStack(spacing: 10) {
                if fight.luck != nil {
                    Button(labels.luck) { act(labels.luck) { _ = try? story.testLuck(); return nil } }
                        .buttonStyle(PageButton(kind: .quiet))
                }
                Button(labels.attack) { act(labels.attack) { (try? story.attack())??.text } }
                    .buttonStyle(PageButton())
                if fight.canFlee {
                    Button(labels.flee) { act(labels.flee) { _ = try? story.flee(); return nil } }
                        .buttonStyle(PageButton(kind: .quiet))
                }
            }
        }
    }

    @ViewBuilder
    private var creation: some View {
        if let blocks = story.view.setup {
            VStack(alignment: .leading, spacing: 18) {
                ForEach(Array(blocks.enumerated()), id: \.element.id) { index, block in
                    VStack(alignment: .leading, spacing: 10) {
                        Text(block.title ?? labels.pick(block.pick))
                            .font(.custom("Georgia", size: 15).smallCaps())
                            .foregroundStyle(Paper.faded)
                            .accessibilityAddTraits(.isHeader)
                        ForEach(block.from) { option in
                            let chosen = picks.indices.contains(index) && picks[index].contains(option.key)
                            Button(option.label) { toggle(option.key, in: index, limit: block.pick) }
                                .buttonStyle(PageButton(kind: chosen ? .chosen : .plain))
                                .accessibilityAddTraits(chosen ? [.isSelected] : [])
                        }
                    }
                }
                Button(labels.begin) {
                    try? story.begin(picks.map(Array.init))
                    record(action: nil)
                }
                .buttonStyle(PageButton(kind: .primary))
                .disabled(!readyToBegin)
                .accessibilityHint(readyToBegin ? "" : labels.pickFirst)
                if !readyToBegin {
                    Text(labels.pickFirst).font(.footnote).foregroundStyle(Paper.faded)
                }
            }
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
        else { picks[block] = [key] }
    }

    // MARK: - The character sheet, under the text rather than beside it

    private var sheet: some View {
        VStack(alignment: .leading, spacing: 10) {
            Rectangle().fill(Paper.rule).frame(height: 1)
            let shown = story.view.stats.filter(\.named)
            if !shown.isEmpty {
                HStack(spacing: 22) {
                    ForEach(shown) { stat in
                        VStack(alignment: .leading, spacing: 1) {
                            Text(stat.label)
                                .font(.custom("Georgia", size: 11).smallCaps())
                                .foregroundStyle(Paper.faded)
                            Text(stat.value.map(String.init) ?? "-")
                                .font(.custom("Georgia", size: 16))
                                .monospacedDigit()
                                .foregroundStyle(Paper.ink)
                        }
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel(labels.statValue(stat.label, stat.value ?? 0, stat.max))
                    }
                    Spacer()
                }
                .padding(.top, 4)
            }

            if !story.view.inventory.isEmpty {
                ForEach(story.view.inventory) { item in
                    HStack(spacing: 8) {
                        Text(item.name)
                            .font(.custom("Georgia", size: 14))
                            .foregroundStyle(Paper.ink)
                        if item.equipped {
                            Text(labels.equipped)
                                .font(.custom("Georgia", size: 11))
                                .foregroundStyle(Paper.faded)
                        }
                        Spacer()
                        if item.usable && !story.view.ended {
                            Button(labels.use) {
                                aside("\(labels.use): \(item.name)") { (try? story.use(item.id)) == true }
                            }
                            .buttonStyle(PageButton(kind: .quiet))
                            .accessibilityLabel("\(labels.use) \(item.name), \(labels.uses(item.uses))")
                        }
                        if (item.kind == "weapon" || item.kind == "armour") && !item.equipped && !story.view.ended {
                            Button(labels.equip) {
                                aside("\(item.name): \(labels.inHand)") { (try? story.equip(item.id)) == true }
                            }
                            .buttonStyle(PageButton(kind: .quiet))
                            .accessibilityLabel("\(labels.equip) \(item.name)")
                        }
                    }
                    .frame(minHeight: 44)
                }
            }

            if !story.view.memory.isEmpty {
                Text("\(labels.memory): \(story.view.memory.joined(separator: ", "))")
                    .font(.custom("Georgia", size: 13))
                    .foregroundStyle(Paper.faded)
            }
        }
    }

    // MARK: - Keeping the account

    private func take(_ choice: Choice) {
        act(choice.label) { try? story.choose(choice.index); return nil }
    }

    /// A use or an equip is not a scene: it changes a number, and the account
    /// keeps one line saying so - never the page again, which is already
    /// there. A refused command keeps nothing at all.
    private func aside(_ line: String, _ body: () -> Bool) {
        guard controlsVisible, body() else { return }
        passages.append(Passage(id: (passages.last?.id ?? 0) + 1,
                                action: nil, paragraphs: [], node: nil, line: line))
    }

    /// Does something to the book and writes down what it was.
    ///
    /// The controls go first and come back last. In between the page grows,
    /// which is the part worth looking at.
    /// `body` returns the sentence a combat round narrated, or `nil` when the
    /// turn was an ordinary one and the page speaks for itself.
    private func act(_ action: String, _ body: @escaping () -> String?) {
        guard controlsVisible else { return }   // one turn at a time
        // Whether a fight was already going when this turn began. A page that
        // was already on the screen is not put there twice, and the node is no
        // way to tell: a book may enter the same node again.
        let fighting = story.view.combat != nil
        if reduceMotion {
            record(action: action, line: body(), during: fighting)
            return
        }
        withAnimation(.easeOut(duration: 0.18)) { controlsVisible = false }
        Task {
            try? await Task.sleep(nanoseconds: 180_000_000)
            record(action: action, line: body(), during: fighting)
            try? await Task.sleep(nanoseconds: 220_000_000)
            withAnimation(.easeIn(duration: 0.22)) { controlsVisible = true }
        }
    }

    /// Adds what the book now shows as the next passage. An empty page adds
    /// nothing: a use that only changed a number is not a new scene, and the
    /// deed alone would read as a heading over nothing.
    private func record(action: String?, line: String? = nil, during fight: Bool = false) {
        // A round is one sentence on the page the fight stands on, so it is
        // appended on its own; the page itself is not repeated under it. When
        // the round ended the fight, the passage it led to follows below.
        if let line, !line.isEmpty {
            passages.append(Passage(id: (passages.last?.id ?? 0) + 1,
                                    action: nil, paragraphs: [], node: nil, line: line))
            if story.view.combat == nil { record(action: nil) }
            return
        }
        let paragraphs = story.view.text
        guard !paragraphs.isEmpty else { return }
        // Undo already put the page back where it was; appending it again
        // would show the same scene twice.
        if action == labels.back, passages.last?.node == story.view.node { return }
        // Using an item mid-fight changes a number, not the scene: the page
        // the fight stands on is already in the account.
        if fight, story.view.combat != nil { return }
        passages.append(Passage(id: (passages.last?.id ?? 0) + 1,
                                action: action,
                                paragraphs: paragraphs,
                                node: story.view.node))
    }
}
