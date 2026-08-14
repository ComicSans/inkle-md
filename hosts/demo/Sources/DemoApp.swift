/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import SwiftUI
import InkleMD

/// The demo of SPEC 12.6, on macOS and iOS from one source.
///
/// It shows the two ways a book can be played, side by side, because the
/// difference between them is the whole point and it is invisible from inside
/// the book. On the left a shelf: pick a book and read it from its first page.
/// On the right a map: the app holds the world, and one place on it leads into
/// a passage of a book and back out again.
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
        TabView {
            ShelfView()
                .tabItem { Label("Shelf", systemImage: "books.vertical") }
            MapView()
                .tabItem { Label("Map", systemImage: "map") }
        }
    }
}

/// Where the compiled books live: `inkle-md bundle` wrote them into the app's
/// resources at build time, one directory each.
enum Books {
    static func directory(_ name: String) -> URL? {
        // `Books` is a folder reference, so the directory survives into the
        // bundle and each book keeps its own, next to its images.
        Bundle.main.url(forResource: name, withExtension: nil, subdirectory: "Books")
    }

    static let all = ["thornwood-book", "house"]

    /// The title a reader sees. It is in the book's own frontmatter, and an
    /// app that wanted it exactly could read `meta.title` out of story.json
    /// (12.8). This one keeps a short name of its own, because a shelf label
    /// and a title page are not the same thing.
    static func title(_ name: String) -> String {
        switch name {
        case "thornwood-book": return "The Crypt under the Thorn"
        case "house": return "The House on the Hill"
        default: return name
        }
    }

    static func note(_ name: String) -> String? {
        switch name {
        case "thornwood-book": return "two chapters"
        case "house": return "a long night"
        default: return nil
        }
    }
}
