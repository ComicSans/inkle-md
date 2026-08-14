# StoryWeaver for iOS and macOS

A Swift package that plays Story Weaver books in an app on iPhone, iPad and
Mac. A book is written in Markdown and compiled by the tools at the root of
this repository; this package opens the compiled book, plays it, and brings
a SwiftUI view that shows it as one continuous text. It needs iOS 16 or
macOS 13, and it has no dependencies.

```swift
import StoryWeaver

let story = try Story(bundle: url)   // the directory the compiler wrote
ReadingView(story: story)
```

## Getting a book into the app

The `url` above points at a directory that `story-weaver bundle` writes.
From the root of this repository:

```bash
node src/cli.js bundle examples/thornwood-book/book.yaml --out MyApp/Books/thornwood-book
```

Two files land there, plus any images the book links. `story.json` is the
book as data; `story-weaver.js` is the engine that plays it. Add the
directory to the app as a folder reference, so it survives into the app
bundle as a directory, and `Story(bundle:)` opens it.

## What `Story` is

`Story` is one book being played: `begin`, `choose`, `advance`, `attack`,
`testLuck`, `flee`, `use`, `equip`, `undo`, `setLanguage`, `save`, `load`.
It publishes `view`, the whole current page as one value - text, choices,
stats, inventory, an active fight - so SwiftUI redraws on it and an app
never assembles a page from parts.

## What `ReadingView` is

`ReadingView` shows a book as one long text. The page is not replaced when
the reader chooses; it grows: what was read stays where it was, the new
passage follows below, and between the two stands the choice that was made.
A finished book reads back as an account of this particular playthrough,
not as a heap of scenes.

It is one way to draw a book, not the way. The language keeps every kind of
presentation out of the book itself, so an app with its own design reads
`story.view` and draws its own screens. What is not optional is
accessibility, and this view carries it in iOS terms: choices are real
buttons, VoiceOver focus moves to the new passage after every turn, an
enemy's health reaches VoiceOver as a value rather than as a bar, a button
that is not ready yet says why, animation follows Reduced Motion, and the
page's buttons keep a 44 point target.

## Why a JavaScript engine and not Swift

The dice must fall the same on every platform: a save carried from a phone
to a browser has to resume as the same story, and one implementation cannot
disagree with itself. So the runtime is not translated into Swift. The one
engine that `src/` produces runs inside `JavaScriptCore`, which is a system
framework, so embedding it costs no dependency - the same reason the rest of
the project has none.

`StoryTests.testTheSameSeedPlaysTheSameStoryAsNodeDoes` is where that claim
is checked: it plays a fixed route in Node and the same route here, and
compares the passages, the stats and the text.

## A book as one scene in a larger game

A book is normally read from its first page. An app can instead use it as
one scene of a world the app keeps itself - a map, a party, a clock: open
the book at one passage, let the reader play it, and take the character back
when they leave. The book is never told which of the two is happening.

```swift
try story.enterEpisode(at: "crypt.chamber", carrying: save)  // the character in, then the jump
// … choose, attack, advance …
switch story.outcome(exits: ["crypt.daylight": "back to the map"]) {
case .exit(let name, _): break        // the app takes over again
case .died, .ended, .playing: break
}
let changed = try story.save()
```

A save is keyed to one book, so carrying a character from one book into the
next is a transfer rather than a load: `adopt(_:)` copies what both books
declare and leaves the rest behind.

## What the app owns

- **The save.** `story.save()` returns one JSON object as `Data`. Where it
  is kept is the app's business: a file, iCloud, wherever. It is the same
  format the web export keeps in the browser.
- **Time.** Nothing in the engine reads a clock. An app that wants real time
  measures it and hands it to `advance(host:)`, typically once when it
  returns to the foreground.
- **The words on its own buttons.** `Labels` carries them, English and
  German so far; `Labels.forLanguage(_:)` picks by code. A book's own text
  is never in there.

## Running the tests

```bash
cd hosts/ios && swift test
```

The tests compile the books in `examples/` with the compiler in this
repository, so there is one copy of the engine and it is the one `src/`
produces. Node has to be on the path.
