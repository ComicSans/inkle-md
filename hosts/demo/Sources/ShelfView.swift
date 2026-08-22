/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import SwiftUI
import StoryWeaver

/// The first way to play: a book, read from its first page (SPEC 20.6).
///
/// This is all it takes. Open the bundle, hand the story to `ReadingView`, and
/// the reader is in the book. The save goes to a file of the app's choosing,
/// because where it is kept was never part of the format (12.5).
struct ShelfView: View {
    @State private var open: Story?
    @State private var openName: String?
    /// The key of the open book, which the title is not: the save file, the
    /// bundle and the shelf all go by the directory name.
    @State private var openKey: String?
    /// Whether the open book resumed a save: a returning reader has read the
    /// back of the book already, so the cover is only for a fresh start.
    @State private var openResumed = false
    @State private var failure: String?
    @Environment(\.scenePhase) private var phase
    /// The book a long press is asking to start over, if any.
    @State private var restarting: String?

    private let columns = [GridItem(.adaptive(minimum: 150), spacing: 20)]

    var body: some View {
        NavigationStack {
            Group {
                if let story = open {
                    // A new story is a new view: `ReadingView` keeps the
                    // passages read so far in its own state, and starting over
                    // hands it a story that has read none. Without an identity
                    // that changes with the story, the old page would stay on
                    // screen under a book that has forgotten it.
                    ReadingView(story: story, showCover: !openResumed)
                        .id(ObjectIdentifier(story))
                } else {
                    shelf
                }
            }
            .navigationTitle(open == nil ? "Shelf" : (openName ?? ""))
            .confirmationDialog("Start over?",
                                isPresented: Binding(get: { restarting != nil },
                                                     set: { if !$0 { restarting = nil } }),
                                titleVisibility: .visible) {
                Button("Start over", role: .destructive) {
                    if let name = restarting {
                        forget(name)
                        // Throwing away the save of the book in hand is only
                        // half of it: the story still standing on the screen
                        // knows where it was. It is opened again, and having
                        // no save left it opens at the cover.
                        if name == openKey { openBook(name) }
                    }
                    restarting = nil
                }
                Button("Keep my place", role: .cancel) { restarting = nil }
            } message: {
                Text(restarting.map { "\(Books.title($0)) opens at its first page again, and what you did in it is gone." } ?? "")
            }
            // A reader who switches away or quits has not decided to lose the
            // afternoon. The save is a file and writing it costs nothing, so
            // it is written whenever the app stops being in front.
            .onChange(of: phase) { newPhase in
                if newPhase != .active, let story = open { keep(story) }
            }
            .toolbar {
                if let story = open {
                    // Leading, opposite the way back to the shelf: one is the
                    // way out of the book, the other the way back to its
                    // first page. `cancellationAction` rather than
                    // `navigationBarLeading` because this app also builds for
                    // the Mac, where that placement does not exist.
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Start over", systemImage: "arrow.3.trianglepath") {
                            restarting = openKey
                        }
                        .disabled(openKey == nil)
                    }
                    ToolbarItem(placement: .primaryAction) {
                        Button("Close", systemImage: "books.vertical") { close(story) }
                    }
                }
            }
        }
    }

    private var shelf: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 20) {
                ForEach(Books.all, id: \.self) { name in
                    Button { openBook(name) } label: {
                        Cover(title: Books.title(name), subtitle: Books.note(name),
                              device: name != "intercept", started: hasSave(name))
                    }
                    .buttonStyle(.plain)
                    // A long press offers the one thing a shelf can offer
                    // about a book it is not showing: forget where I was.
                    .contextMenu {
                        if hasSave(name) {
                            Button("Start over", systemImage: "arrow.counterclockwise", role: .destructive) {
                                restarting = name
                            }
                        }
                    }
                    // VoiceOver does not reach a context menu by holding; it
                    // reaches an action by name.
                    .accessibilityAction(named: "Start over") {
                        if hasSave(name) { restarting = name }
                    }
                    .accessibilityLabel(Books.title(name))
                    .accessibilityValue(hasSave(name) ? "started" : "")
                    .accessibilityHint(hasSave(name) ? "Continues where you left it" : "Opens at the first page")
                }
            }
            .padding()

            if let failure {
                Text(failure).font(.footnote).foregroundStyle(.red).padding(.horizontal)
            }
            Text("A book opens where it begins, and remembers where you left it.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .padding()
        }
    }

    private func openBook(_ name: String) {
        failure = nil
        guard let directory = Books.directory(name) else {
            failure = "\(name) is not in this app's resources"
            return
        }
        do {
            let story = try Story(bundle: directory)
            // A save from last time, if there is one. The character sheet is
            // JSON in a file; nothing about it is this app's invention (8).
            openResumed = false
            if let saved = try? Data(contentsOf: saveFile(name)), (try? story.load(saved)) != nil {
                openResumed = true
            }
            openName = Books.title(name)
            openKey = name
            open = story
        } catch {
            failure = String(describing: error)
        }
    }

    private func close(_ story: Story) {
        keep(story)
        open = nil
        openName = nil
        openKey = nil
    }

    /// Writes the save of the book being read, wherever it stands.
    private func keep(_ story: Story) {
        guard let name = Books.all.first(where: { Books.directory($0) == story.directory }),
              let data = try? story.save() else { return }
        try? data.write(to: saveFile(name))
    }

    /// Throws away the save of one book. The book itself is untouched: it is
    /// a file in the app's own bundle, and what a reader did with it was never
    /// part of it.
    private func forget(_ name: String) {
        try? FileManager.default.removeItem(at: saveFile(name))
    }

    private func hasSave(_ name: String) -> Bool {
        FileManager.default.fileExists(atPath: saveFile(name).path)
    }

    private func saveFile(_ name: String) -> URL {
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: support, withIntermediateDirectories: true)
        return support.appendingPathComponent("\(name).save.json")
    }
}
