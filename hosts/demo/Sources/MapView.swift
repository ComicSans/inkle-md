/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import SwiftUI
import InkleMD

/// The second way to play: a book as one episode inside something larger
/// (SPEC 12.6).
///
/// The world below is the app's, not the book's. It holds where the party is,
/// what they carry, and what the weather is doing. A place on the map leads
/// into a passage of a book; the reader plays it; the app takes the character
/// back and carries on. The book never learns that any of this is happening.
struct MapView: View {
    @StateObject private var world = World()
    @State private var episode: Story?
    @State private var report: String?

    var body: some View {
        NavigationStack {
            if let episode {
                StoryScreen(story: episode)
                    .navigationTitle(world.here?.name ?? "")
                    .onChange(of: episode.view.node) { _ in finishIfArrived() }
            } else {
                map
            }
        }
    }

    private var map: some View {
        List {
            Section("The party") {
                LabeledContent("Stamina", value: "\(world.stamina)")
                LabeledContent("Gold", value: "\(world.gold)")
                LabeledContent("Weather", value: world.weatherName)
                Button("The weather turns") { world.rollWeather() }
                    .frame(minHeight: 44)
            }

            Section("Places") {
                ForEach(World.places) { place in
                    Button {
                        enter(place)
                    } label: {
                        VStack(alignment: .leading) {
                            Text(place.name)
                            Text(place.book).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    .frame(minHeight: 44)
                }
            }

            if let report {
                Section("Last time") { Text(report) }
            }
        }
        .navigationTitle("The marches")
    }

    /// Load, then go: the order of 12.6, because `go` rolls no stats and a
    /// reader arriving without them dies of the first blow.
    private func enter(_ place: World.Place) {
        report = nil
        guard let directory = Books.directory(place.book) else {
            report = "\(place.book) is not in this app's resources"
            return
        }
        do {
            let story = try Story(bundle: directory)
            try world.send(story, to: place.node)
            // The world data the book may read, handed over at a boundary. The
            // weather is declared `holds:` in a book that has one, so it stays
            // for the whole episode rather than lasting one turn (15.1).
            try? story.advance(host: ["weather": Double(world.weather)])
            world.here = place
            episode = story
        } catch {
            report = String(describing: error)
        }
    }

    /// The app watches the node after every command and stops at one of its
    /// own exits. Which nodes those are depends on the map, so the book says
    /// nothing about them.
    private func finishIfArrived() {
        guard let story = episode, let place = world.here else { return }
        switch story.outcome(exits: place.exits, deathNode: place.deathNode) {
        case .playing:
            return
        case .exit(let name, _):
            report = "\(place.name): \(name)"
        case .died:
            report = "\(place.name): the party did not come back"
        case .ended(let node):
            report = "\(place.name): the book ended at \(node)"
        }
        world.take(from: story, book: place.book)
        episode = nil
        world.here = nil
    }
}

/// Everything the app owns: the party, the weather, and one save per book.
@MainActor
final class World: ObservableObject {
    struct Place: Identifiable {
        let id: String
        let name: String
        let book: String
        let node: String
        /// Node id to the name this app knows it by.
        let exits: [String: String]
        let deathNode: String?
    }

    static let places: [Place] = [
        Place(id: "crypt", name: "The crypt under the thorn", book: "thornwood-book",
              node: "crypt.crypt",
              exits: ["crypt.daylight": "back into the daylight", "crypt.gate": "through the iron gate"],
              deathNode: "crypt.death"),
        Place(id: "cellar", name: "The house on the hill", book: "house",
              node: "arrival.road", exits: [:], deathNode: nil),
    ]

    @Published var stamina = 18
    @Published var gold = 12
    @Published var weather = 0
    @Published var here: Place?

    /// Saves the app keeps, one per book, so a place remembers a previous visit.
    var saves: [String: Data] = [:]

    var weatherName: String { ["clear", "overcast", "rain", "storm"][min(weather, 3)] }

    func rollWeather() { weather = (weather + 1) % 4 }

    /// Sends the party into a passage of a book (12.6).
    ///
    /// The first visit is the interesting one. There is no save yet, and `go`
    /// alone would drop the reader into the passage with no stats at all,
    /// which is exactly what 12.6 warns about: the first blow kills them. So
    /// the book is opened the ordinary way first, purely to get a character
    /// sheet this book accepts, and the app then writes its own numbers over
    /// it. After that it is load, then go, like every later visit.
    func send(_ story: Story, to node: String) throws {
        if let kept = saves[story.directory?.lastPathComponent ?? ""] {
            try story.enterEpisode(at: node, carrying: kept)
            return
        }
        if let setup = story.view.setup {
            try story.begin(setup.map { $0.from.prefix($0.pick).map(\.key) })
        }
        try story.load(written(into: try story.save()))
        try story.go(to: node)
    }

    /// The app's numbers, written into a save this book already accepts.
    private func written(into save: Data) throws -> Data {
        guard var object = try JSONSerialization.jsonObject(with: save) as? [String: Any],
              var vars = object["vars"] as? [String: Any] else { return save }
        // Only what the book itself declares: a stat it has never heard of is
        // not its business, and writing one in would be inventing state.
        if vars["stamina"] != nil { vars["stamina"] = stamina }
        if vars["gold"] != nil { vars["gold"] = gold }
        object["vars"] = vars
        return try JSONSerialization.data(withJSONObject: object)
    }

    /// Takes the character back out of an episode (12.6).
    func take(from story: Story, book: String) {
        guard let data = try? story.save() else { return }
        saves[book] = data
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let vars = object["vars"] as? [String: Any] else { return }
        if let value = vars["stamina"] as? Int { stamina = value }
        if let value = vars["gold"] as? Int { gold = value }
    }
}
