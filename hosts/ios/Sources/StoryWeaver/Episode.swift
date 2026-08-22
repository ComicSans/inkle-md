/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import Foundation

/// Playing a book as one episode inside something larger (SPEC 20.6).
///
/// An app with a map and a party enters a book at a node, plays one passage
/// and takes the character back out. Nothing below is a second engine: it is
/// the four calls of 12.6 in the right order, with the two mistakes that order
/// exists to prevent made impossible.
///
/// The book does not learn that it is being played this way, and must not:
/// which nodes are entrances and which are exits depends on the map, not on
/// the story.
public extension Story {
    /// Where an episode came to rest.
    enum Outcome: Equatable, Sendable {
        /// A node the app named as a way out, with the name the app gave it.
        case exit(String, node: String)
        /// The node `death.goto` names: the book's own way of saying the
        /// reader did not make it.
        case died(node: String)
        /// The book ran to one of its own endings without passing an exit.
        case ended(node: String)
        /// Still going: the reader has a choice to make, or a blow to strike.
        case playing
    }

    /// Enters the book at `node` with a character the app has been keeping.
    ///
    /// The order is not negotiable and is why this exists: `load` first,
    /// because `go` jumps without rolling stats, and a reader who arrives
    /// without them dies of the first blow (12.6).
    ///
    /// - Parameters:
    ///   - node: the passage the map points at.
    ///   - save: the character, as `save()` last wrote it. Pass `nil` only for
    ///     a book being entered without one, which means `begin` has run.
    func enterEpisode(at node: String, carrying save: Data?) throws {
        if let save { try load(save) }
        try go(to: node)
    }

    /// What the page in front of the reader means to the app.
    ///
    /// - Parameter exits: node id to the name the app knows it by. The app
    ///   keeps this list; the book has no opinion on it.
    /// - Parameter deathNode: `config.death.goto` of the story JSON, when the
    ///   book declares one. `Story` does not read it for you, because a host
    ///   that wants it can read the story JSON it already shipped.
    func outcome(exits: [String: String], deathNode: String? = nil) -> Outcome {
        guard let node = view.node else { return .playing }
        if let name = exits[node] { return .exit(name, node: node) }
        if let deathNode, node == deathNode { return .died(node: node) }
        if view.ended { return .ended(node: node) }
        return .playing
    }

    /// Takes over a character from another book (12.6).
    ///
    /// A save is keyed to one book and `load` refuses one from another, so
    /// carrying a character across is a transfer rather than a load: this book
    /// is opened normally first, and what both books declare is copied over.
    /// What only the other book knew stays behind, which is the point. A stat
    /// this book has never heard of is not this book's business.
    ///
    /// - Parameter other: a save written by a different book.
    /// - Returns: the names that came across, for the app to show or log.
    @discardableResult
    func adopt(_ other: Data) throws -> [String] {
        guard var mine = try JSONSerialization.jsonObject(with: try save()) as? [String: Any],
              let theirs = try JSONSerialization.jsonObject(with: other) as? [String: Any] else {
            throw StoryError.malformedAnswer("a save is a JSON object")
        }
        guard var vars = mine["vars"] as? [String: Any],
              let theirVars = theirs["vars"] as? [String: Any] else {
            throw StoryError.malformedAnswer("a save carries vars")
        }

        var carried: [String] = []
        for (name, value) in theirVars where vars[name] != nil {
            vars[name] = value
            carried.append(name)
        }
        mine["vars"] = vars

        // Belongings and code words are the character, not the book: they
        // travel whole. An item this book never declared shows up as plain
        // gear rather than breaking anything.
        if var inventory = mine["inventory"] as? [String: Any],
           let theirInventory = theirs["inventory"] as? [String: Any] {
            for (id, uses) in theirInventory { inventory[id] = uses }
            mine["inventory"] = inventory
        }
        if let words = mine["memory"] as? [String], let theirWords = theirs["memory"] as? [String] {
            mine["memory"] = words + theirWords.filter { !words.contains($0) }
        }

        try load(try JSONSerialization.data(withJSONObject: mine))
        return carried.sorted()
    }
}

/// Why a save was refused, in fields rather than in a sentence.
///
/// A save belongs to one book and one runtime (SPEC 15). An app meets this on
/// the day it ships a new edition: every reader who was mid-playthrough has a
/// save the new book will not take. What to do about it is the app's call and
/// nobody else's, and this is what it needs to make it.
public struct Refusal: Sendable {
    /// `"story"` when the save is from another book or another edition of it,
    /// `"version"` when it was written by a newer runtime.
    public let reason: String
    /// The book the save names, for `reason == "story"`.
    public let saved: String?
    /// The book that refused it.
    public let book: String?

    init?(_ fields: [String: Any]?) {
        guard let fields, let reason = fields["reason"] as? String else { return nil }
        self.reason = reason
        self.saved = fields["save"] as? String
        self.book = fields["book"] as? String
    }

    /// True when the two names differ only in what follows the `@`, which is
    /// the new-edition case: same book, bumped `version:`.
    public var isNewEdition: Bool {
        guard reason == "story", let saved, let book else { return false }
        return saved.split(separator: "@").first == book.split(separator: "@").first
            && saved != book
    }
}
