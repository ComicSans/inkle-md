# StoryWeaver for iOS

A host for Story Weaver books on Apple platforms, per SPEC 12.5 to 12.8. It plays
the same story logic a browser plays, because it embeds the same runtime rather
than reimplementing it.

```swift
let story = try Story(bundle: Bundle.main.url(forResource: "thornwood", withExtension: nil)!)
StoryScreen(story: story)
```

The directory it opens is what `story-weaver bundle` writes:

```bash
node src/cli.js bundle examples/thornwood.md --out MyApp/Resources/thornwood
```

Two files land there. `story.json` is the book, `story-weaver.js` is the runtime
and the host protocol. Drop both into the app's resources as a folder
reference, and the `Story` above reads them.

## Why a JavaScript engine and not Swift

Principle 5 of the spec: seed plus counter has to produce the same die on every
platform, or a save carried from a phone to a browser resumes as a different
story. One implementation cannot disagree with itself. `JavaScriptCore` is a
system framework, so embedding it costs no dependency, which is the same reason
the rest of the project has none.

`StoryTests.testTheSameSeedPlaysTheSameStoryAsNodeDoes` is where that claim is
checked: it plays a fixed route in Node and the same route here, and compares
the nodes, the stats and the text.

## What this package does and does not do

`Story` is the book: `begin`, `choose`, `advance`, `attack`, `save`, `load`,
`undo`. It publishes `view`, which is the whole page as one value, so SwiftUI
redraws on it.

`StoryScreen` is one way to draw that page, not the way. SPEC 6 keeps
presentation out of the book, so what a `{.letter}` looks like is decided here,
in `font(for:)`, and an app with its own design reads `story.view` and draws its
own. What is not optional is the accessibility list of SPEC 12.3, which this
screen carries in iOS terms: choices are buttons, the new text takes
`@AccessibilityFocusState` after every turn, a combat round is announced
without moving focus, a disabled control says why, touch targets are 44pt, and
nothing is conveyed by colour alone.

## Two ways to play

Read from the start, or entered as one episode by an app that holds a map:

```swift
try story.enterEpisode(at: "crypt.chamber", carrying: save)   // load, then go
// … choose, attack, advance …
switch story.outcome(exits: ["crypt.daylight": "back to the map"], deathNode: death) {
case .exit(let name, _):  // the app takes over again
case .died, .ended, .playing: break
}
let changed = try story.save()
```

`adopt(_:)` carries a character from one book into the next: a save is keyed to
one book, so what both books declare is copied over and the rest stays behind.
See SPEC 12.6.

## What the host owns

- **The save.** `story.save()` returns the JSON of SPEC 8 as `Data`. Where it
  is kept is the app's business: a file, iCloud, wherever. The format is the
  same one the web export keeps in `localStorage`.
- **Time.** Nothing in the runtime reads a clock. An app that wants real time
  measures it and calls `advance(host:)`, typically once when it returns to the
  foreground. Those seconds belong to that boundary and not also to the choice
  after it (SPEC 16.2).
- **The words on its own buttons.** `Labels` carries them, English and German
  so far. A book's own text is never in there.

## Running the tests

```bash
cd hosts/ios && swift test
```

They build the bundle from `examples/` with the compiler in this repository, so
there is one copy of the runtime and it is the one `src/` produces. Node has to
be on the path.
