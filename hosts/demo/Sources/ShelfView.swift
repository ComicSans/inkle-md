/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import SwiftUI
import InkleMD

/// The first way to play: a book, read from its first page (SPEC 12.6).
///
/// This is all it takes. Open the bundle, hand the story to `StoryScreen`, and
/// the reader is in the book. The save goes to a file of the app's choosing,
/// because where it is kept was never part of the format (12.5).
struct ShelfView: View {
    @State private var open: Story?
    @State private var openName: String?
    @State private var failure: String?

    private let columns = [GridItem(.adaptive(minimum: 150), spacing: 20)]

    var body: some View {
        NavigationStack {
            Group {
                if let story = open {
                    StoryScreen(story: story)
                } else {
                    shelf
                }
            }
            .navigationTitle(open == nil ? "Shelf" : (openName ?? ""))
            .toolbar {
                if let story = open {
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
                        VStack(spacing: 6) {
                            Cover(title: Books.title(name), subtitle: Books.note(name))
                            if hasSave(name) {
                                Label("Started", systemImage: "bookmark.fill")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Books.title(name))
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
            if let saved = try? Data(contentsOf: saveFile(name)) {
                try? story.load(saved)
            }
            openName = Books.title(name)
            open = story
        } catch {
            failure = String(describing: error)
        }
    }

    private func close(_ story: Story) {
        if let name = Books.all.first(where: { Books.directory($0) == story.directory }),
           let data = try? story.save() {
            try? data.write(to: saveFile(name))
        }
        open = nil
        openName = nil
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
