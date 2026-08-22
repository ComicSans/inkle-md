/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import Foundation
import JavaScriptCore

/// A book being played, over the host protocol of HOSTS 8.
///
/// The story logic is not written twice. This holds a `JSContext` running the
/// engine `story-weaver bundle` wrote, sends it one command per turn and decodes
/// the view that comes back. Principle 5 is the reason: seed plus counter has
/// to produce the same die here as in a browser, and one implementation
/// cannot disagree with itself.
@MainActor
public final class Story: ObservableObject {
    /// The current page. Every command replaces it.
    @Published public private(set) var view: StoryView

    /// Where the book's images are, so a view can resolve `Paragraph.image`.
    /// `nil` when the book was opened from strings rather than a directory.
    public let directory: URL?

    /// The back of the book (SPEC 7), per language. `nil` when the book has
    /// none. Read from `meta` here because the view of 12.7 carries the page,
    /// not the cover (12.8).
    public private(set) var blurb: [String: String]?

    /// The blurb in the reading language, or the book's first one.
    public func blurbText() -> String? {
        guard let blurb else { return nil }
        return blurb[view.lang] ?? blurb.values.first
    }

    private let context: JSContext
    private let decoder = JSONDecoder()

    // MARK: - Opening a book

    /// Opens the two files `story-weaver bundle --out dir` wrote.
    ///
    /// - Parameters:
    ///   - directory: the bundle directory, usually inside the app's own
    ///     resources.
    ///   - seed: fixes the dice, so a playthrough can be replayed exactly
    ///     (principle 5). Omit it and the engine draws its own.
    ///   - language: one of the book's languages; omit for its default.
    public convenience init(bundle directory: URL, seed: Int? = nil, language: String? = nil) throws {
        let engine = try String(contentsOf: directory.appendingPathComponent("story-weaver.js"), encoding: .utf8)
        let story = try String(contentsOf: directory.appendingPathComponent("story.json"), encoding: .utf8)
        try self.init(engine: engine, story: story, seed: seed, language: language, directory: directory)
    }

    /// The file for an image paragraph, at the best resolution that is there.
    ///
    /// `wald@2x.png` beside `wald.png` is the same picture at twice the size
    /// (22.4). The suffix is Apple's spelling and the export ignores it; this
    /// is the host that picks it up, matching the screen it draws on.
    public func url(for image: String, scale: CGFloat) -> URL? {
        guard let directory else { return nil }
        let dot = image.lastIndex(of: ".")
        let stem = dot.map { String(image[image.startIndex..<$0]) } ?? image
        let ext = dot.map { String(image[$0...]) } ?? ""

        // Wanted first, then larger, then smaller, then the base file, which
        // the language guarantees is there (E184). A one-times screen asks for
        // no suffix at all: a bigger file on it is bytes for nothing.
        let wanted = max(1, Int(scale.rounded()))
        let order = wanted >= 3 ? [3, 2] : wanted == 2 ? [2, 3] : []
        for factor in order {
            let candidate = directory.appendingPathComponent("\(stem)@\(factor)x\(ext)")
            if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
        }
        let base = directory.appendingPathComponent(image)
        return FileManager.default.fileExists(atPath: base.path) ? base : nil
    }

    /// - Parameters:
    ///   - engine: the contents of `story-weaver.js`
    ///   - story: the contents of `story.json`, unparsed. The engine parses it
    ///     itself; handing it across as text is what keeps the bridge to two
    ///     names (12.8).
    public init(engine: String, story: String, seed: Int? = nil, language: String? = nil,
                directory: URL? = nil) throws {
        guard let context = JSContext() else { throw StoryError.noEngine }
        self.context = context
        self.directory = directory

        var thrown: String?
        context.exceptionHandler = { _, value in thrown = value?.toString() ?? "unknown" }

        context.evaluateScript(engine)
        if let thrown { throw StoryError.engineFailed(thrown) }

        if let data = story.data(using: .utf8),
           let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let meta = root["meta"] as? [String: Any] {
            self.blurb = meta["blurb"] as? [String: String]
        }

        var options: [String: Any] = [:]
        if let seed { options["seed"] = seed }
        if let language { options["lang"] = language }
        let optionsText = String(decoding: try JSONSerialization.data(withJSONObject: options), as: UTF8.self)

        context.setObject(story, forKeyedSubscript: "__swStory" as NSString)
        context.setObject(optionsText, forKeyedSubscript: "__swOptions" as NSString)
        let answer = context.evaluateScript("storyWeaver.start(__swStory, __swOptions)")
        if let thrown { throw StoryError.engineFailed(thrown) }
        guard let text = answer?.toString() else { throw StoryError.noAnswer }

        self.view = try Story.decode(text, using: decoder).view
        // Now that a page exists, later throws become refusals rather than
        // silent failures: `send` reads this after every call.
        context.exceptionHandler = { _, value in
            assertionFailure("the engine threw past the protocol: \(value?.toString() ?? "unknown")")
        }
    }

    // MARK: - Playing

    /// Answers the creation blocks and sets out.
    /// - Parameter picks: the `key` of each chosen option, one array per block.
    public func begin(_ picks: [[String]] = []) throws {
        try send(["cmd": "begin", "picks": picks])
    }

    public func choose(_ index: Int) throws {
        try send(["cmd": "choose", "index": index])
    }

    /// A boundary: brings host values in and runs whatever has come due
    /// (HOSTS 11). Call it when the app returns to the foreground with time to
    /// hand over. The values are consumed by this boundary (16.2), so they do
    /// not also belong to the choice that follows.
    public func advance(host: [String: Double] = [:]) throws {
        try send(["cmd": "advance", "host": host])
    }

    @discardableResult
    public func use(_ item: String) throws -> Bool {
        try send(["cmd": "use", "id": item]) as? Bool ?? false
    }

    @discardableResult
    public func equip(_ item: String) throws -> Bool {
        try send(["cmd": "equip", "id": item]) as? Bool ?? false
    }

    /// One round of a fight. Returns what the round did, for a status message.
    @discardableResult
    public func attack() throws -> Round? {
        try decodeDid(send(["cmd": "attack"]))
    }

    /// The luck test a book offers after a hit. Returns whether it came off.
    @discardableResult
    public func testLuck() throws -> Bool? {
        try send(["cmd": "luck"]) as? Bool
    }

    @discardableResult
    public func flee() throws -> Bool {
        try send(["cmd": "flee"]) as? Bool ?? false
    }

    @discardableResult
    public func undo() throws -> Bool {
        try send(["cmd": "undo"]) as? Bool ?? false
    }

    public func setLanguage(_ language: String) throws {
        try send(["cmd": "language", "lang": language])
    }

    /// Jumps to a node. For a chapter picker, not for storytelling, and only
    /// after `begin`: a jump does not roll the stats a reader arrives with.
    public func go(to node: String) throws {
        try send(["cmd": "go", "node": node])
    }

    // MARK: - Saving

    /// The save of SPEC 15, as the JSON text a host writes to a file. It is the
    /// same format the web export keeps in `localStorage`; where it is kept
    /// was never part of it (12.5).
    public func save() throws -> Data {
        guard let state = try send(["cmd": "save"]) else { throw StoryError.noAnswer }
        return try JSONSerialization.data(withJSONObject: state)
    }

    public func load(_ save: Data) throws {
        let state = try JSONSerialization.jsonObject(with: save)
        try send(["cmd": "load", "save": state])
    }

    // MARK: - The bridge

    /// One command, one view. `did` is whatever the command returned beyond
    /// the page (12.7).
    @discardableResult
    private func send(_ command: [String: Any]) throws -> Any? {
        let text = String(decoding: try JSONSerialization.data(withJSONObject: command), as: UTF8.self)
        context.setObject(text, forKeyedSubscript: "__swCommand" as NSString)
        guard let answer = context.evaluateScript("storyWeaver.send(__swCommand)")?.toString() else {
            throw StoryError.noAnswer
        }
        let decoded = try Story.decode(answer, using: decoder)
        view = decoded.view
        return decoded.did
    }

    private func decodeDid<T: Decodable>(_ did: Any?) throws -> T? {
        guard let did else { return nil }
        return try decoder.decode(T.self, from: JSONSerialization.data(withJSONObject: did))
    }

    /// The protocol answers `{ ok, view, did }` or `{ ok: false, error }`. A
    /// refusal is data on the way over and an error here, because on this side
    /// there is a language that carries one.
    private static func decode(_ text: String, using decoder: JSONDecoder) throws -> (view: StoryView, did: Any?) {
        guard let data = text.data(using: .utf8),
              let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw StoryError.malformedAnswer(text)
        }
        guard object["ok"] as? Bool == true else {
            let why = object["refused"] as? [String: Any]
            throw StoryError.refused(object["error"] as? String ?? "unknown",
                                     Refusal(why))
        }
        guard let viewObject = object["view"] else { throw StoryError.malformedAnswer(text) }
        let view = try decoder.decode(StoryView.self, from: JSONSerialization.data(withJSONObject: viewObject))
        return (view, object["did"])
    }
}

public enum StoryError: Error, CustomStringConvertible {
    /// JavaScriptCore would not give us a context at all.
    case noEngine
    /// `story-weaver.js` did not load. The message is what the engine threw.
    case engineFailed(String)
    case noAnswer
    case malformedAnswer(String)
    /// The engine refused the command and said why (12.7). The second value
    /// is set where the refusal is one a host has to act on rather than show.
    case refused(String, Refusal?)

    public var description: String {
        switch self {
        case .noEngine: return "JavaScriptCore gave no context"
        case .engineFailed(let message): return "the engine did not load: \(message)"
        case .noAnswer: return "the engine answered nothing"
        case .malformedAnswer(let text): return "the engine answered something else: \(text.prefix(120))"
        case .refused(let reason, _): return reason
        }
    }
}
