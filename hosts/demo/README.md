# The demo

One book, played both ways, on macOS and iOS from one source. It is the
worked example of SPEC 12.6: a **Shelf** that opens a book at its first page,
and a **Map** that enters a passage of a book, lets you play it, and takes the
character back out.

```bash
cd hosts/demo
xcodegen generate            # writes InkleMDDemo.xcodeproj from project.yml
open InkleMDDemo.xcodeproj
```

The project is generated rather than checked in, because a `.xcodeproj` is not
a thing to read or merge by hand. So are the books: a build step runs
`inkle-md bundle` over `examples/`, so there is one copy of the runtime and it
is the one `src/` produces (12.8).

## What to look at

`ShelfView` is the short one. Open the bundle, hand the story to
`StoryScreen`, done. That is the whole of the first way to play.

`MapView` is the interesting one. It draws the house on the hill as a
floorplan, four storeys of it, and the world it holds belongs to the app: the
party's stamina, their gold, the weather, and which doors have been opened. A
room leads into a book at a node the plan names, and the app watches
`view.node` after every turn until it sees one of its own exits. One room in
the cellar leads into the *other* book, because a save is per book (12.6) and
an app is exactly the thing that can carry a character across.

Two more things belong to the app rather than to any book: **Back to the plan**
walks out of an episode mid-scene, keeping whatever the character earned, and
**Start over** puts the whole world back, saves included. Neither is something
a book could offer, and both are things a reader expects.

Two things are worth reading before writing your own:

- **The first visit has no save yet.** `go` alone would drop the reader into
  the passage with no stats, and the first blow would kill them. So the book
  is opened the ordinary way once, purely to get a character sheet it accepts,
  and the app writes its own numbers over it. Every later visit is load, then
  go. This demo got it wrong first and showed exactly that: a page of dashes
  where the stats should be.
- **Only what the book declares travels.** The app writes `stamina` and
  `gold` because those books have them. A stat a book has never heard of is
  not that book's business.

## What is not here

No network, no accounts, no analytics. The demo reads two books out of its own
bundle and talks to nothing.
