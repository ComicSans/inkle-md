/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import SwiftUI

/// The house on the hill, as the app that holds it sees it.
///
/// None of this is in the book. The book has nodes; which of them are rooms,
/// where those rooms are, and which door is open tonight is the app's own
/// business (SPEC 12.6). Draw it differently and the same book still plays.
enum Floorplan {
    /// A room on the plan. `node` is where the book is entered, `exits` are
    /// the nodes this app recognises as the way out again.
    struct Room: Identifiable, Hashable {
        let id: String
        let name: String
        let book: String
        let node: String
        /// Position on the floor, in a unit square, and how large.
        let frame: CGRect
        /// Rooms that open once this one has been visited.
        let opens: [String]
        let exits: [String: String]
        let hint: String?

        static func == (a: Room, b: Room) -> Bool { a.id == b.id }
        func hash(into hasher: inout Hasher) { hasher.combine(id) }
    }

    struct Floor: Identifiable {
        let id: String
        let name: String
        let rooms: [Room]
    }

    static let floors: [Floor] = [outside, ground, upstairs, cellar, sandbank]

    /// Everything before the front door: the road, the wall, the dog.
    static let outside = Floor(id: "outside", name: "Outside", rooms: [
        Room(id: "road", name: "The road", book: "house", node: "arrival.road",
             frame: CGRect(x: 0.00, y: 0.50, width: 0.34, height: 0.50),
             opens: ["gate", "wall"],
             exits: ["arrival.hall": "inside at last", "arrival.drugged": "the wine was drugged"],
             hint: "Where the party arrives, in the rain"),
        Room(id: "gate", name: "The gate", book: "house", node: "arrival.gate",
             frame: CGRect(x: 0.34, y: 0.50, width: 0.33, height: 0.50),
             opens: ["drive"], exits: ["arrival.hall": "inside at last"], hint: nil),
        Room(id: "wall", name: "The wall", book: "house", node: "arrival.wall",
             frame: CGRect(x: 0.00, y: 0.00, width: 0.34, height: 0.50),
             opens: ["window"], exits: ["arrival.hall": "inside at last"],
             hint: "The way in for someone who was not invited"),
        Room(id: "drive", name: "The drive", book: "house", node: "arrival.drive",
             frame: CGRect(x: 0.34, y: 0.00, width: 0.33, height: 0.50),
             opens: ["door"], exits: ["arrival.hall": "inside at last"], hint: nil),
        Room(id: "door", name: "The front door", book: "house", node: "arrival.door",
             frame: CGRect(x: 0.67, y: 0.50, width: 0.33, height: 0.50),
             opens: [], exits: ["arrival.hall": "inside at last"], hint: nil),
        Room(id: "window", name: "The side window", book: "house", node: "arrival.window",
             frame: CGRect(x: 0.67, y: 0.00, width: 0.33, height: 0.50),
             opens: [], exits: ["arrival.hall": "inside at last"], hint: nil),
    ])

    static let ground = Floor(id: "ground", name: "Ground floor", rooms: [
        Room(id: "hall", name: "The hall", book: "house", node: "ground.hall",
             frame: CGRect(x: 0.34, y: 0.50, width: 0.33, height: 0.50),
             opens: ["dining", "study", "clock"], exits: [:],
             hint: "By night it is a different room"),
        Room(id: "dining", name: "Dining room", book: "house", node: "ground.dining",
             frame: CGRect(x: 0.00, y: 0.50, width: 0.34, height: 0.50),
             opens: ["kitchen"], exits: [:], hint: nil),
        Room(id: "kitchen", name: "Kitchen", book: "house", node: "ground.kitchen",
             frame: CGRect(x: 0.00, y: 0.00, width: 0.34, height: 0.50),
             opens: [], exits: [:], hint: nil),
        Room(id: "study", name: "Study", book: "house", node: "ground.study",
             frame: CGRect(x: 0.67, y: 0.00, width: 0.33, height: 1.00),
             opens: [], exits: ["ground.caught": "caught in the act"], hint: nil),
        Room(id: "clock", name: "The tall clock", book: "house", node: "ground.clock",
             frame: CGRect(x: 0.34, y: 0.00, width: 0.33, height: 0.50),
             opens: [], exits: [:], hint: "It is not telling the time"),
    ])

    static let upstairs = Floor(id: "upstairs", name: "Upstairs", rooms: [
        Room(id: "landing", name: "The landing", book: "house", node: "house.landing",
             frame: CGRect(x: 0.34, y: 0.50, width: 0.33, height: 0.50),
             opens: ["library", "bathroom", "tower"], exits: [:], hint: nil),
        Room(id: "room", name: "The guest room", book: "house", node: "house.room",
             frame: CGRect(x: 0.00, y: 0.50, width: 0.34, height: 0.50),
             opens: [], exits: [:], hint: "Where the night begins"),
        Room(id: "library", name: "Library", book: "house", node: "house.library",
             frame: CGRect(x: 0.00, y: 0.00, width: 0.34, height: 0.50),
             opens: [], exits: [:], hint: nil),
        Room(id: "bathroom", name: "The door with the towel", book: "house", node: "house.bathroom",
             frame: CGRect(x: 0.34, y: 0.00, width: 0.33, height: 0.50),
             opens: [], exits: [:], hint: nil),
        Room(id: "tower", name: "The tower room", book: "house", node: "house.tower",
             frame: CGRect(x: 0.67, y: 0.00, width: 0.33, height: 1.00),
             opens: [], exits: [:], hint: "Up the narrow stair"),
    ])

    static let cellar = Floor(id: "cellar", name: "Cellar", rooms: [
        Room(id: "stairs", name: "Cellar stairs", book: "house", node: "cellar.stairs",
             frame: CGRect(x: 0.34, y: 0.50, width: 0.33, height: 0.50),
             opens: ["wine", "passage"], exits: [:], hint: nil),
        Room(id: "wine", name: "The wine cellar", book: "house", node: "cellar.wine",
             frame: CGRect(x: 0.00, y: 0.50, width: 0.34, height: 0.50),
             opens: ["rite"], exits: [:], hint: nil),
        Room(id: "rite", name: "The cellar", book: "house", node: "cellar.rite",
             frame: CGRect(x: 0.00, y: 0.00, width: 0.67, height: 0.50),
             opens: [], exits: ["cellar.flight": "out through the front door",
                                "cellar.break": "the circle is broken"],
             hint: "Twelve hoods and a chalk circle"),
        // The one room that leads out of this book and into another. The app
        // is what makes that possible: a save is per book (12.6), so this is
        // a transfer, not a door.
        Room(id: "passage", name: "The passage", book: "thornwood-book", node: "crypt.crypt",
             frame: CGRect(x: 0.67, y: 0.00, width: 0.33, height: 1.00),
             opens: [], exits: ["crypt.daylight": "back into the daylight",
                                "crypt.gate": "through the iron gate"],
             hint: "It runs further than the house does"),
    ])

    /// A second place entirely, and a second book: the lighthouse reads the
    /// weather this app holds, which is what a `holds:` fact is for (15.1).
    /// Turn the weather to a storm on the map and the tide starts rising in
    /// there, without the book having been told anything else.
    static let sandbank = Floor(id: "sandbank", name: "The sandbank", rooms: [
        Room(id: "landing-stage", name: "The landing", book: "leuchtturm", node: "turm.ankunft",
             frame: CGRect(x: 0.00, y: 0.50, width: 0.50, height: 0.50),
             opens: ["lamp", "vault"],
             exits: ["turm.zurueck": "back to the boat", "turm.abgesoffen": "the cellar won"],
             hint: "The boat leaves as soon as you step off it"),
        Room(id: "lamp", name: "The lantern", book: "leuchtturm", node: "turm.laterne",
             frame: CGRect(x: 0.50, y: 0.00, width: 0.50, height: 1.00),
             opens: [],
             exits: ["turm.zurueck": "back to the boat", "turm.abgesoffen": "the cellar won"],
             hint: "Where the light is, if there is one"),
        Room(id: "vault", name: "The cellar", book: "leuchtturm", node: "turm.keller",
             frame: CGRect(x: 0.00, y: 0.00, width: 0.50, height: 0.50),
             opens: [],
             exits: ["turm.zurueck": "back to the boat", "turm.abgesoffen": "the cellar won"],
             hint: "Two barrels of oil and the sea coming in"),
    ])

    /// The rooms a party can walk into before anything has been explored.
    static let openAtFirst: Set<String> = ["road", "wall", "hall", "landing", "room", "stairs", "landing-stage"]

    static func room(_ id: String) -> Room? {
        floors.flatMap(\.rooms).first { $0.id == id }
    }
}
