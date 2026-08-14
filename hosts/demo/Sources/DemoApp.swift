/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import SwiftUI
import StoryWeaver

/// A shelf of books, on macOS and iOS from one source.
///
/// Pick a book and read it. What builds up on screen is one long text: the
/// story, and between its parts what the reader did, so that a finished book
/// reads back as an account of this particular playthrough.
@main
struct DemoApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        #if os(macOS)
        .defaultSize(width: 900, height: 700)
        #endif
    }
}

struct ContentView: View {
    var body: some View {
        ShelfView()
    }
}

/// Where the compiled books live: `story-weaver bundle` wrote them into the app's
/// resources at build time, one directory each.
enum Books {
    static func directory(_ name: String) -> URL? {
        // `Books` is a folder reference, so the directory survives into the
        // bundle and each book keeps its own, next to its images.
        Bundle.main.url(forResource: name, withExtension: nil, subdirectory: "Books")
    }

    /// Every book in this repository, except `examples/thornwood.md`: that is the
    /// same story as `thornwood-book` written as one file, and a shelf with it
    /// twice would say something about the compiler rather than about reading.
    static let all = ["thornwood-book", "house", "nightside", "leuchtturm", "intercept"]

    /// The title a reader sees. It is in the book's own frontmatter, and an
    /// app that wanted it exactly could read `meta.title` out of story.json
    /// (12.8). This one keeps a short name of its own, because a shelf label
    /// and a title page are not the same thing.
    static func title(_ name: String) -> String {
        switch name {
        case "thornwood-book": return "The Crypt under the Thorn"
        case "house": return "The House on the Hill"
        case "nightside": return "Nachtseite"
        case "leuchtturm": return "Der Leuchtturm auf der Sandbank"
        case "intercept": return "The Intercept"
        default: return name
        }
    }

    static func note(_ name: String) -> String? {
        switch name {
        case "thornwood-book": return "two chapters"
        case "house": return "a long night"
        case "nightside": return "a long way down"
        case "leuchtturm": return "one night, one lamp"
        case "intercept": return "by inkle, imported"
        default: return nil
        }
    }
}
