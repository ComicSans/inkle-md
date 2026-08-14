/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import Foundation

/// The words this host puts on its own controls, per language.
///
/// SPEC 6 keeps presentation out of the book, so a button that says "Attack"
/// is not the book's word but the host's, and every host carries its own set
/// (12.5). These are the same words the web view uses, because a reader who
/// moves between the two should not have to learn a second vocabulary.
public struct Labels: Sendable {
    public var attack = "Attack"
    public var flee = "Flee"
    public var luck = "Test your luck"
    public var belongings = "Belongings"
    public var use = "Use"
    public var equip = "Equip"
    public var equipped = "equipped"
    public var back = "Go back"
    public var character = "Character"
    public var memory = "Noted"
    public var begin = "Begin"
    public var theEnd = "The end"
    public var choices = "What do you do?"
    public var pickFirst = "Make your choice to begin."
    public var pick: @Sendable (Int) -> String = { "Choose \($0)" }
    public var uses: @Sendable (Int) -> String = { "\($0) left" }
    public var round: @Sendable (Int) -> String = { "Round \($0)" }
    /// Read to a screen reader, never shown: a stat is a name and a number,
    /// and "18" alone is not an answer to "what is my stamina".
    public var statValue: @Sendable (String, Int, Int?) -> String = { name, value, max in
        max.map { "\(name), \(value) of \($0)" } ?? "\(name), \(value)"
    }
    /// Reads to a screen reader as what the line between two passages is.
    public var youChose = "You chose"
    public var unusable = "not usable right now"
    public var cannotFleeYet = "not yet"

    public init() {}

    public static let english = Labels()

    public static let german: Labels = {
        var l = Labels()
        l.attack = "Angreifen"
        l.flee = "Fliehen"
        l.luck = "Glück versuchen"
        l.belongings = "Gepäck"
        l.use = "Benutzen"
        l.equip = "Ausrüsten"
        l.equipped = "ausgerüstet"
        l.back = "Zurück"
        l.character = "Held"
        l.memory = "Gemerkt"
        l.begin = "Losgehen"
        l.theEnd = "Ende"
        l.choices = "Was tust du?"
        l.pickFirst = "Triff deine Wahl, dann kann es losgehen."
        l.pick = { "Wähle \($0)" }
        l.uses = { "noch \($0)" }
        l.round = { "Runde \($0)" }
        l.statValue = { name, value, max in
            max.map { "\(name), \(value) von \($0)" } ?? "\(name), \(value)"
        }
        l.youChose = "Du hast gewählt"
        l.unusable = "gerade nicht benutzbar"
        l.cannotFleeYet = "noch nicht"
        return l
    }()

    /// The set for a book's language, falling back to English for a language
    /// this host has no words for yet. The book still reads correctly; only
    /// the buttons around it are in the wrong language, which is better than
    /// an empty label.
    public static func forLanguage(_ code: String) -> Labels {
        switch code.prefix(2) {
        case "de": return .german
        default: return .english
        }
    }
}
