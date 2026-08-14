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
        // Labels arrive in the reading language, not as a table of them (12.6).
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
        let route = [0, 0, 0, 0]
        let expected = try playInNode(example: "thornwood.md", seed: 7, picks: ["sword"], route: route)

        let story = try open(seed: 7)
        try story.begin([["sword"]])
        var walked: [String] = []
        for index in route {
            guard story.view.choices.indices.contains(index) else { break }
            try story.choose(index)
            walked.append(story.view.node ?? "-")
        }

        XCTAssertEqual(walked, expected.nodes)
        XCTAssertEqual(story.view.stats.map { $0.value ?? -1 }, expected.stats)
        XCTAssertEqual(story.view.text.map { $0.text }, expected.text)
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
            if (!h.view.choices.some((c) => c.index === i)) break;
            h.command({ cmd: 'choose', index: i });
            nodes.push(h.view.node ?? '-');
          }
          process.stdout.write(JSON.stringify({
            nodes,
            stats: h.view.stats.map((s) => s.value ?? -1),
            text: h.view.text.map((p) => p.text),
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
