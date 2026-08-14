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
/// The house below belongs to the app, not to the book. It holds where the
/// party is, what they carry, what the weather is doing, and which doors have
/// been opened. A room leads into a passage of a book; the reader plays it;
/// the app takes the character back and carries on. The book never learns that
/// any of this is happening, and would play the same from its own first page.
struct MapView: View {
    @StateObject private var world = World()
    @State private var episode: Story?
    @State private var floor = 0
    @State private var confirmingReset = false

    var body: some View {
        NavigationStack {
            Group {
                if let episode {
                    StoryScreen(story: episode)
                        .onChange(of: episode.view.node) { _ in finishIfArrived() }
                } else {
                    plan
                }
            }
            .navigationTitle(episode == nil ? "The house on the hill" : (world.here?.name ?? ""))
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    if episode == nil {
                        Button("Start over", systemImage: "arrow.counterclockwise") {
                            confirmingReset = true
                        }
                    } else {
                        // An app may walk out of an episode whenever it likes:
                        // the save is the app's (12.5), and a reader who wants
                        // to look at the map again should not have to reach an
                        // ending first. The book keeps where it stood.
                        Button("Back to the plan", systemImage: "map") { leave() }
                    }
                }
            }
            .confirmationDialog("Start over?", isPresented: $confirmingReset, titleVisibility: .visible) {
                Button("Start over", role: .destructive) { world.reset(); floor = 0 }
                Button("Keep playing", role: .cancel) {}
            } message: {
                Text("The party goes back to full strength, every door closes, and both books forget you were there.")
            }
        }
    }

    // MARK: - The plan

    private var plan: some View {
        VStack(spacing: 0) {
            party
            Picker("Floor", selection: $floor) {
                ForEach(Array(Floorplan.floors.enumerated()), id: \.offset) { index, floor in
                    Text(floor.name).tag(index)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.bottom, 8)

            // A plan keeps its proportions: a building stretched to fill a
            // window stops reading as a building.
            GeometryReader { geometry in
                let plan = fit(geometry.size)
                ZStack {
                    ForEach(Floorplan.floors[floor].rooms) { room in
                        RoomTile(room: room, state: world.state(of: room), size: plan) {
                            enter(room)
                        }
                        .frame(width: plan.width * room.frame.width,
                               height: plan.height * room.frame.height)
                        // The centre, not the corner: `position` places a view
                        // by its middle in the parent's own coordinates.
                        .position(x: plan.width * room.frame.midX,
                                  y: plan.height * room.frame.midY)
                    }
                }
                .frame(width: plan.width, height: plan.height)
                // The outer wall, over the rooms, so the building has one
                // outline rather than a seam per room.
                .overlay(Rectangle().strokeBorder(Color.primary.opacity(0.55), lineWidth: 2))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
            .padding(.horizontal, 16)

            Spacer(minLength: 0)

            if let report = world.report {
                Text(report)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding()
                    // The app's own status line, spoken without moving focus.
                    .accessibilityAddTraits(.updatesFrequently)
            }
        }
    }

    /// The largest 4:3 plan that fits, so every floor is drawn to one scale.
    private func fit(_ available: CGSize) -> CGSize {
        let ratio: CGFloat = 4.0 / 3.0
        let width = min(available.width, max(0, available.height) * ratio)
        return CGSize(width: max(240, width), height: max(180, width / ratio))
    }

    private var party: some View {
        HStack(spacing: 20) {
            value("Stamina", "\(world.stamina)")
            value("Gold", "\(world.gold)")
            Button {
                world.rollWeather()
            } label: {
                value("Weather", world.weatherName)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Weather, \(world.weatherName)")
            .accessibilityHint("Changes the weather the books read")
            Spacer()
        }
        .padding(.horizontal)
        .padding(.bottom, 8)
    }

    private func value(_ name: String, _ text: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(name).font(.caption2).foregroundStyle(.secondary)
            Text(text).font(.headline).monospacedDigit()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(name), \(text)")
    }

    // MARK: - Going in and coming out

    private func enter(_ room: Floorplan.Room) {
        guard world.state(of: room) != .shut else { return }
        guard let directory = Books.directory(room.book) else {
            world.report = "\(room.book) is not in this app's resources"
            return
        }
        do {
            let story = try Story(bundle: directory)
            try world.send(story, into: room)
            // World data the book may read, handed over at a boundary. A book
            // that declares it `holds:` keeps it for the whole episode rather
            // than for one turn (15.1).
            try? story.advance(host: ["weather": Double(world.weather)])
            world.here = room
            episode = story
        } catch {
            world.report = String(describing: error)
        }
    }

    /// Leaves an episode where it stands. The character comes back with
    /// whatever it has, and the room stays open rather than counting as
    /// visited: nothing was finished here.
    private func leave() {
        guard let story = episode, let room = world.here else { return }
        world.keep(story, from: room)
        episode = nil
    }

    /// The app watches the node after every command and stops at one of its
    /// own exits. Which nodes those are depends on the house, so the book says
    /// nothing about them.
    private func finishIfArrived() {
        guard let story = episode, let room = world.here else { return }
        let outcome = story.outcome(exits: room.exits, deathNode: "cellar.undone")
        guard outcome != .playing else { return }
        world.came(back: story, from: room, with: outcome)
        episode = nil
    }
}

// MARK: - One room on the plan

private struct RoomTile: View {
    let room: Floorplan.Room
    let state: World.RoomState
    let size: CGSize
    let enter: () -> Void

    var body: some View {
        Button(action: enter) {
            VStack(spacing: 2) {
                Text(room.name)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.7)
                if state == .visited {
                    // Never colour alone: a visited room says so twice.
                    Image(systemName: "checkmark").font(.caption2)
                }
            }
            .padding(4)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(background)
            // The wall between two rooms: one line, shared, so the plan reads
            // as a building and not as a row of cards.
            .overlay(
                Rectangle().strokeBorder(
                    state == .shut ? Color.primary.opacity(0.25) : Color.accentColor.opacity(0.9),
                    style: StrokeStyle(lineWidth: 1.5, dash: state == .shut ? [5, 4] : []))
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(state == .shut)
        .foregroundStyle(state == .shut ? Color.secondary : Color.primary)
        .accessibilityLabel(room.name)
        .accessibilityValue(spoken)
        .accessibilityHint(state == .shut ? "No way in yet" : (room.hint ?? "Enters the book here"))
    }

    private var background: some View {
        Rectangle()
            .fill(state == .shut ? Color.secondary.opacity(0.10) : Color.accentColor.opacity(0.14))
    }

    private var spoken: String {
        switch state {
        case .shut: return "closed"
        case .open: return "open"
        case .visited: return "already been here"
        }
    }
}

// MARK: - The world the app holds

@MainActor
final class World: ObservableObject {
    enum RoomState { case shut, open, visited }

    @Published var stamina = 18
    @Published var gold = 12
    @Published var weather = 0
    @Published var here: Floorplan.Room?
    @Published var report: String?
    @Published private var opened = Floorplan.openAtFirst
    @Published private var visited: Set<String> = []

    /// One save per book, so a room remembers a previous visit.
    private var saves: [String: Data] = [:]

    var weatherName: String { ["clear", "overcast", "rain", "storm"][min(weather, 3)] }

    func rollWeather() { weather = (weather + 1) % 4 }

    func state(of room: Floorplan.Room) -> RoomState {
        if visited.contains(room.id) { return .visited }
        return opened.contains(room.id) ? .open : .shut
    }

    /// Everything back to how it started. The books forget too: their saves
    /// are the app's to keep and the app's to throw away (12.5).
    func reset() {
        stamina = 18
        gold = 12
        weather = 0
        here = nil
        report = nil
        opened = Floorplan.openAtFirst
        visited = []
        saves = [:]
    }

    /// Sends the party into a room (12.6).
    ///
    /// The first visit to a book is the interesting one. There is no save yet,
    /// and `go` alone would drop the reader in with no stats at all, which is
    /// what 12.6 warns about: the first blow kills them. So the book is opened
    /// the ordinary way once, purely to get a character sheet it accepts, and
    /// the app writes its own numbers over it. Every later visit is load, then
    /// go.
    func send(_ story: Story, into room: Floorplan.Room) throws {
        if let kept = saves[room.book] {
            try story.enterEpisode(at: room.node, carrying: kept)
            return
        }
        if let setup = story.view.setup {
            try story.begin(setup.map { $0.from.prefix($0.pick).map(\.key) })
        }
        try story.load(written(into: try story.save()))
        try story.go(to: room.node)
    }

    /// The app's numbers, written into a save this book already accepts.
    private func written(into save: Data) throws -> Data {
        guard var object = try JSONSerialization.jsonObject(with: save) as? [String: Any],
              var vars = object["vars"] as? [String: Any] else { return save }
        // Only what the book declares: a stat it has never heard of is not its
        // business, and writing one in would be inventing state.
        if vars["stamina"] != nil { vars["stamina"] = stamina }
        if vars["gold"] != nil { vars["gold"] = gold }
        object["vars"] = vars
        return try JSONSerialization.data(withJSONObject: object)
    }

    /// Puts an unfinished episode away: the book keeps its page, the party
    /// keeps what it earned, and the room stays as it was.
    func keep(_ story: Story, from room: Floorplan.Room) {
        takeCharacter(from: story, book: room.book)
        report = "\(room.name): left for now"
        here = nil
    }

    /// Takes the character back out and opens whatever this room opens.
    func came(back story: Story, from room: Floorplan.Room, with outcome: Story.Outcome) {
        switch outcome {
        case .exit(let name, _): report = "\(room.name): \(name)"
        case .died: report = "\(room.name): the party did not come back"
        case .ended(let node): report = "\(room.name): the book ended at \(node)"
        case .playing: return
        }

        takeCharacter(from: story, book: room.book)
        visited.insert(room.id)
        for id in room.opens { opened.insert(id) }
        here = nil
    }

    /// The save is the book's whole state and the app's to keep (12.5). Out of
    /// it the app reads back only the numbers it owns.
    private func takeCharacter(from story: Story, book: String) {
        guard let data = try? story.save() else { return }
        saves[book] = data
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let vars = object["vars"] as? [String: Any] else { return }
        if let value = vars["stamina"] as? Int { stamina = value }
        if let value = vars["gold"] as? Int { gold = value }
    }
}
