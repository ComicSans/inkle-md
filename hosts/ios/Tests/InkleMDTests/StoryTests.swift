/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import XCTest
@testable import InkleMD

/// The bundle is built from the examples in this repository rather than
/// checked in beside the Swift, so there is one copy of the engine and it is
/// the one `src/` produces.
@MainActor
final class StoryTests: XCTestCase {
    private static var bundleDirectory: URL!

    override class func setUp() {
        super.setUp()
        bundleDirectory = try! buildBundle(example: "thornwood.md")
    }

    private func open(seed: Int = 7) throws -> Story {
        try Story(bundle: Self.bundleDirectory, seed: seed)
    }

    func testABookOpensAtItsCreationBlocks() throws {
        let story = try open()

        let setup = try XCTUnwrap(story.view.setup, "thornwood asks the reader to choose a weapon")
        XCTAssertEqual(setup.count, 1)
        XCTAssertEqual(setup[0].pick, 1)
        // Labels arrive in the reading language, not as a table of them (12.7).
        XCTAssertFalse(setup[0].from[0].label.isEmpty)
        XCTAssertTrue(story.view.text.isEmpty, "no story text before the reader sets out")
    }

    func testSettingOutRollsTheStatsAndShowsThePage() throws {
        let story = try open()
        try story.begin([["sword"]])

        XCTAssertNil(story.view.setup)
        XCTAssertEqual(story.view.node, "begin")
        XCTAssertFalse(story.view.text.isEmpty)
        XCTAssertFalse(story.view.choices.isEmpty)
        let stamina = try XCTUnwrap(story.view.stats.first { $0.name == "stamina" })
        XCTAssertNotNil(stamina.value, "a stat has a value once the reader has set out")
        XCTAssertTrue(story.view.inventory.contains { $0.id == "sword" && $0.equipped })
    }

    func testARefusedCommandIsAnErrorRatherThanASilentNoop() throws {
        let story = try open()
        try story.begin([["sword"]])
        let before = story.view.node

        XCTAssertThrowsError(try story.choose(99)) { error in
            guard case StoryError.refused(let reason) = error else {
                return XCTFail("expected a refusal, got \(error)")
            }
            XCTAssertTrue(reason.contains("99"), reason)
        }
        XCTAssertEqual(story.view.node, before, "a refused command leaves the page alone")
    }

    func testASaveTravelsAsPlainDataAndComesBack() throws {
        let story = try open()
        try story.begin([["sword"]])
        try story.choose(0)
        let node = story.view.node
        let save = try story.save()

        try story.choose(0)
        XCTAssertNotEqual(story.view.node, node)
        try story.load(save)
        XCTAssertEqual(story.view.node, node)

        // It is JSON a host can write to a file and read back (8, 12.5).
        let object = try XCTUnwrap(try JSONSerialization.jsonObject(with: save) as? [String: Any])
        XCTAssertEqual(object["version"] as? Int, 1)
    }

    func testUndoGoesBackToBeforeTheLastRootChoice() throws {
        let story = try open()
        try story.begin([["sword"]])
        let start = story.view.node
        try story.choose(0)
        XCTAssertTrue(story.view.canUndo)

        XCTAssertTrue(try story.undo())
        XCTAssertEqual(story.view.node, start)
    }

    /// This is the test the whole approach stands on. The same book, the same
    /// seed and the same route have to reach the same page with the same
    /// numbers in Node and in JavaScriptCore, or principle 5 is a claim rather
    /// than a property, and a save cannot travel between a phone and a
    /// browser.
    func testTheSameSeedPlaysTheSameStoryAsNodeDoes() throws {
        // The route reaches the goblin and fights it, because a walk that
        // stops short of the dice only proves the stats were rolled alike. A
        // fight is where the stream is drawn from hardest: two rolls a round.
        let route = [2, 0, 0, 0, 0, 0, 0, 0]
        let expected = try playInNode(example: "thornwood.md", seed: 7, picks: ["sword"], route: route)

        let story = try open(seed: 7)
        try story.begin([["sword"]])
        var walked: [String] = []
        var fought = 0
        for index in route {
            if story.view.combat != nil {
                try story.attack()
                fought += 1
            } else if story.view.choices.contains(where: { $0.index == index }) {
                try story.choose(index)
            } else {
                break
            }
            walked.append(story.view.node ?? "-")
        }

        XCTAssertGreaterThan(fought, 0, "the route has to reach the fight for this to prove anything")
        XCTAssertEqual(walked, expected.nodes)
        XCTAssertEqual(story.view.stats.map { $0.value ?? -1 }, expected.stats)
        XCTAssertEqual(story.view.text.map(\.text), expected.text)

        // The counter is the whole of principle 5 in one number: roll n
        // follows from seed and n, so two runs that agree here drew the same
        // dice in the same order, whatever they did with them.
        let save = try JSONSerialization.jsonObject(with: try story.save()) as? [String: Any]
        XCTAssertEqual(save?["rolls"] as? Int, expected.rolls)
        XCTAssertGreaterThan(expected.rolls, 0, "a walk that rolls nothing proves nothing")
    }

    func testAnImageArrivesAsItsOwnKindOfParagraphAndResolvesToAFile() throws {
        let bundle = try Self.buildBundle(example: "thornwood-book/book.yaml")
        let story = try Story(bundle: bundle, seed: 3)
        try story.begin([["sword"]])
        try story.go(to: "crypt.crypt")

        let picture = try XCTUnwrap(story.view.text.first { $0.image != nil })
        guard case .image(let file, let alt) = picture.kind else {
            return XCTFail("an image paragraph reports itself as one")
        }
        XCTAssertEqual(file, "gruft.png")
        XCTAssertFalse(alt.isEmpty, "alt text is required by the language (4.9)")
        // The prose around it is still ordinary text in the same list.
        XCTAssertTrue(story.view.text.contains { $0.image == nil && !$0.text.isEmpty })

        // `bundle` copied the file next to story.json, so the host can find it.
        let base = try XCTUnwrap(story.url(for: file, scale: 1))
        XCTAssertEqual(base.lastPathComponent, "gruft.png")
        // At twice the scale it picks the file the book shipped for it (22.5).
        let retina = try XCTUnwrap(story.url(for: file, scale: 2))
        XCTAssertEqual(retina.lastPathComponent, "gruft@2x.png")
        // A book that shipped no @3x falls back rather than failing.
        XCTAssertEqual(try XCTUnwrap(story.url(for: file, scale: 3)).lastPathComponent, "gruft@2x.png")
    }

    func testAFightReportsItsRoundsAndBothHalvesOfTheEnemyBar() throws {
        let house = try Self.buildBundle(example: "house/book.yaml")
        let story = try Story(bundle: house, seed: 5)
        let setup = try XCTUnwrap(story.view.setup)
        try story.begin(setup.map { block in block.from.prefix(block.pick).map(\.key) })
        try story.go(to: "cellar.guards")

        let fight = try XCTUnwrap(story.view.combat)
        XCTAssertEqual(fight.waiting, 1, "a second cultist is still to come")
        XCTAssertEqual(fight.enemy.stamina, fight.enemy.max)

        let round = try XCTUnwrap(try story.attack())
        XCTAssertEqual(round.round, 1)
        XCTAssertFalse(round.text.isEmpty, "a round says what it did, for a status message (12.3)")
    }
}

// MARK: - Reaching the compiler

extension StoryTests {
    /// The repository root, found from this file rather than from a working
    /// directory, so the tests run from anywhere.
    static var repository: URL {
        URL(fileURLWithPath: #filePath)      // …/hosts/ios/Tests/InkleMDTests/StoryTests.swift
            .deletingLastPathComponent()     // …/InkleMDTests
            .deletingLastPathComponent()     // …/Tests
            .deletingLastPathComponent()     // …/ios
            .deletingLastPathComponent()     // …/hosts
            .deletingLastPathComponent()     // the repository
    }

    static func buildBundle(example: String) throws -> URL {
        let out = FileManager.default.temporaryDirectory
            .appendingPathComponent("inkle-md-tests")
            .appendingPathComponent(example.replacingOccurrences(of: "/", with: "-"))
        try run(["src/cli.js", "bundle", "examples/\(example)", "--out", out.path, "--quiet"])
        return out
    }

    struct Walk: Decodable {
        let nodes: [String]
        let stats: [Int]
        let text: [String]
        /// The dice counter of SPEC 8: roll n follows from seed and n.
        let rolls: Int
    }

    /// Plays a fixed route in Node and reports where it ended up, so the run in
    /// JavaScriptCore has something to be equal to.
    func playInNode(example: String, seed: Int, picks: [String], route: [Int]) throws -> Walk {
        let script = """
        import('./src/compile.js').then(async (m) => {
          const { Host } = await import('./src/host.js');
          const h = new Host(m.compileFile('examples/\(example)').story, { seed: \(seed) });
          h.command({ cmd: 'begin', picks: [\(picks.map { "['\($0)']" }.joined(separator: ", "))] });
          const nodes = [];
          for (const i of \(route)) {
            if (h.view.combat) h.command({ cmd: 'attack' });
            else if (h.view.choices.some((c) => c.index === i)) h.command({ cmd: 'choose', index: i });
            else break;
            nodes.push(h.view.node ?? '-');
          }
          process.stdout.write(JSON.stringify({
            nodes,
            stats: h.view.stats.map((s) => s.value ?? -1),
            text: h.view.text.map((p) => p.text ?? ''),
            rolls: h.command({ cmd: 'save' }).did.rolls,
          }));
        });
        """
        let output = try Self.run(["-e", script])
        return try JSONDecoder().decode(Walk.self, from: Data(output.utf8))
    }

    @discardableResult
    static func run(_ arguments: [String]) throws -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["node"] + arguments
        process.currentDirectoryURL = repository
        let out = Pipe()
        process.standardOutput = out
        process.standardError = FileHandle.nullDevice
        try process.run()
        let data = out.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            throw StoryError.engineFailed("node \(arguments.first ?? "") exited \(process.terminationStatus)")
        }
        return String(decoding: data, as: UTF8.self)
    }
}

// MARK: - Playing a book as an episode (SPEC 12.6)

@MainActor
final class EpisodeTests: XCTestCase {
    func testAnAppCarriesACharacterInAndTakesItBackOut() throws {
        let bundle = try StoryTests.buildBundle(example: "thornwood-book/book.yaml")

        // The app opened the book once, long ago, and has kept the character.
        let first = try Story(bundle: bundle, seed: 11)
        try first.begin([["sword"]])
        var carried = try JSONSerialization.jsonObject(with: try first.save()) as! [String: Any]
        var vars = carried["vars"] as! [String: Any]
        vars["gold"] = 99
        carried["vars"] = vars
        let save = try JSONSerialization.data(withJSONObject: carried)

        let episode = try Story(bundle: bundle, seed: 11)
        try episode.enterEpisode(at: "crypt.chamber", carrying: save)

        XCTAssertEqual(episode.view.node, "crypt.chamber")
        XCTAssertEqual(episode.view.stats.first { $0.name == "gold" }?.value, 99)
        XCTAssertFalse(episode.view.text.isEmpty)
    }

    func testTheAppRecognisesItsOwnWayOutAndNothingElse() throws {
        let bundle = try StoryTests.buildBundle(example: "thornwood-book/book.yaml")
        let story = try Story(bundle: bundle, seed: 11)
        try story.begin([["sword"]])
        try story.go(to: "crypt.chamber")

        // Mid-passage the app is told to keep playing.
        XCTAssertEqual(story.outcome(exits: ["crypt.daylight": "back to the map"]), .playing)

        var outcome = Story.Outcome.playing
        for _ in 0..<30 {
            if story.view.combat != nil { try story.attack() }
            else if let first = story.view.choices.first { try story.choose(first.index) }
            else { break }
            outcome = story.outcome(exits: ["crypt.daylight": "back to the map"], deathNode: "crypt.death")
            if outcome != .playing { break }
        }
        XCTAssertEqual(outcome, .exit("back to the map", node: "crypt.daylight"))
    }

    func testACharacterCrossesFromOneBookToTheNext() throws {
        let thornwood = try Story(bundle: try StoryTests.buildBundle(example: "thornwood-book/book.yaml"), seed: 11)
        try thornwood.begin([["sword"]])
        let hero = try thornwood.save()
        let heroStamina = thornwood.view.stats.first { $0.name == "stamina" }?.value

        let house = try Story(bundle: try StoryTests.buildBundle(example: "house/book.yaml"), seed: 11)
        // A save from another book is refused outright, which is why `adopt`
        // exists and is not just `load`.
        XCTAssertThrowsError(try house.load(hero))

        let setup = try XCTUnwrap(house.view.setup)
        try house.begin(setup.map { $0.from.prefix($0.pick).map(\.key) })
        let carried = try house.adopt(hero)

        XCTAssertTrue(carried.contains("stamina"))
        XCTAssertFalse(carried.contains("gold"), "the house never declared gold, so gold stays behind")
        XCTAssertEqual(house.view.stats.first { $0.name == "stamina" }?.value, heroStamina)
        XCTAssertTrue(house.view.inventory.contains { $0.id == "sword" }, "the sword came along")
    }
}
