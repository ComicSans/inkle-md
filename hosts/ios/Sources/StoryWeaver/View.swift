/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import Foundation

/// The view of SPEC 12.7: everything a page needs, as one value.
///
/// Every field here is what the protocol sends, named as the protocol names
/// it. Nothing is computed on this side and nothing is left out, so that a
/// change to 12.7 shows up as a compile error rather than as a field that
/// silently stays at its default.
public struct StoryView: Decodable, Sendable {
    public let lang: String
    public let languages: [String]
    /// The creation blocks, until they are answered; `nil` once play begins.
    public let setup: [SetupBlock]?
    public let node: String?
    public let title: String?
    public let ended: Bool
    public let text: [Paragraph]
    public let choices: [Choice]
    public let stats: [Stat]
    public let facts: [String: Double]
    public let inventory: [Item]
    public let memory: [String]
    public let combat: Combat?
    public let canUndo: Bool

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.lang = try c.decode(String.self, forKey: .lang)
        self.languages = try c.decode([String].self, forKey: .languages)
        self.setup = try c.decodeIfPresent([SetupBlock].self, forKey: .setup)
        self.node = try c.decodeIfPresent(String.self, forKey: .node)
        self.title = try c.decodeIfPresent(String.self, forKey: .title)
        self.ended = try c.decode(Bool.self, forKey: .ended)
        self.choices = try c.decode([Choice].self, forKey: .choices)
        self.stats = try c.decode([Stat].self, forKey: .stats)
        self.facts = try c.decode([String: Double].self, forKey: .facts)
        self.inventory = try c.decode([Item].self, forKey: .inventory)
        self.memory = try c.decode([String].self, forKey: .memory)
        self.combat = try c.decodeIfPresent(Combat.self, forKey: .combat)
        self.canUndo = try c.decode(Bool.self, forKey: .canUndo)

        // Position on the page is the identity of a paragraph. The protocol
        // does not send one because it has no need of it; a view does.
        var numbered = try c.decode([Paragraph].self, forKey: .text)
        for index in numbered.indices { numbered[index].id = index }
        self.text = numbered
    }

    private enum CodingKeys: String, CodingKey {
        case lang, languages, setup, node, title, ended, text, choices
        case stats, facts, inventory, memory, combat, canUndo
    }
}

/// One thing on the page: a paragraph, or an image between two of them.
///
/// The protocol tells them apart by which field is there (SPEC 4.9), and so
/// does `kind` below, so a `switch` on this side is exhaustive.
public struct Paragraph: Decodable, Sendable, Identifiable {
    /// Position on the page. A fresh `UUID` per decode would give every
    /// paragraph a new identity every turn, so `ForEach` would rebuild all of
    /// them and an image would be read from disk again on each redraw.
    public internal(set) var id: Int = 0
    /// The sentence, for a paragraph; empty for an image.
    public let text: String
    /// The file, relative to the bundle directory, for an image.
    public let image: String?
    /// Required wherever `image` is set: the language has no decorative image.
    public let alt: String?
    /// The `{.name}` a book wrote, or `nil`. What it looks like is this side's
    /// business: SPEC 6 keeps presentation out of the book on purpose.
    public let styleName: String?

    public enum Kind: Sendable {
        case prose(String)
        case image(file: String, alt: String)
    }

    public var kind: Kind {
        if let image { return .image(file: image, alt: alt ?? "") }
        return .prose(text)
    }

    private enum CodingKeys: String, CodingKey {
        case text, image, alt
        case styleName = "class"
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.text = try c.decodeIfPresent(String.self, forKey: .text) ?? ""
        self.image = try c.decodeIfPresent(String.self, forKey: .image)
        self.alt = try c.decodeIfPresent(String.self, forKey: .alt)
        self.styleName = try c.decodeIfPresent(String.self, forKey: .styleName)
    }
}

public struct Choice: Decodable, Sendable, Identifiable {
    /// The index `choose` takes back. It is the identity too: a page never
    /// shows the same index twice.
    public let index: Int
    public let label: String
    public var id: Int { index }
}

public struct Stat: Decodable, Sendable, Identifiable {
    public let name: String
    public let label: String
    /// False for a stat the book declared without a `name:`: it drives the
    /// story and is not meant to be shown (SPEC 6).
    public let named: Bool
    /// Absent before `begin`, where no stat has been rolled yet.
    public let value: Int?
    public let max: Int?
    public var id: String { name }
}

public struct Item: Decodable, Sendable, Identifiable {
    public let id: String
    public let name: String
    public let kind: String
    public let uses: Int
    public let equipped: Bool
    /// False when the item has no effect, or when its `when:` is not met right
    /// now. A control for it belongs on the page either way, disabled and
    /// saying why (12.3).
    public let usable: Bool
}

public struct SetupBlock: Decodable, Sendable, Identifiable {
    public let id = UUID()
    public let title: String?
    public let pick: Int
    public let from: [SetupOption]

    private enum CodingKeys: String, CodingKey { case title, pick, from }
}

public struct SetupOption: Decodable, Sendable, Identifiable {
    public let label: String
    public let item: String?
    public let remember: String?
    /// What `begin` takes back for this option.
    public let key: String
    public var id: String { key }
}

public struct Combat: Decodable, Sendable {
    public let round: Int
    public let enemy: Enemy
    /// How many more enemies come after this one (SPEC 7).
    public let waiting: Int
    public let log: [Round]
    /// Set after a hit when the book allows a luck test, naming who was hit.
    public let luck: String?
    public let canFlee: Bool

    public struct Enemy: Decodable, Sendable {
        public let id: String
        public let name: String
        public let stamina: Int
        public let max: Int
    }
}

/// One round of a fight, as `attack` and `luck` report it.
public struct Round: Decodable, Sendable {
    public let round: Int
    public let mine: Int
    public let theirs: Int
    /// `"enemy"`, `"player"`, or `nil` for a tie.
    public let hit: String?
    /// Absent on a tie, which costs nothing.
    public let damage: Int?
    public let text: String
}
