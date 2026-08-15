# The demo app

An example app, not a product: a small reading app for iPhone, iPad and Mac,
built on the Swift package next door in `hosts/ios`. It puts the example
books of this repository on a shelf. Pick one and it opens as one continuous
text; close it and the app remembers where you were; open it again and it
carries on there.

## Building it

```bash
cd hosts/demo
xcodegen generate            # writes StoryWeaverDemo.xcodeproj from project.yml
open StoryWeaverDemo.xcodeproj
```

The project file is generated rather than checked in, because a `.xcodeproj`
is not a thing to read or merge by hand; XcodeGen writes it from
`project.yml`. The books are not checked in as compiled data either: a build
step runs the compiler at the root of this repository over `examples/`, so
there is one copy of the engine and it is the one `src/` produces. Building
therefore needs XcodeGen and Node 20 or newer, besides Xcode.

## What to look at

`ShelfView` is the whole app, and it is short on purpose. Opening a book
means opening the directory the compiler wrote and handing the result to
`ReadingView`; everything about how the book plays and looks comes from the
package. What is left for the app is exactly what a host owns: it keeps one
save file per book in its Application Support directory, loads it when a
book is opened, and writes it when the book is closed. That is the entire
cost of being a host.

`Cover` draws the covers. The books carry no artwork, because the language
keeps presentation out of a book, so the shelf draws each cover from the
title and nothing else - a colour, a shape, a spine - and the same title gets
the same cover every time. A book that has been opened before wears a
bookmark ribbon.

Five books stand on the shelf: the four written for this repository, and
inkle's *The Intercept*, imported from ink. The Intercept keeps a plain
cover without a drawn emblem, because inventing artwork for someone else's
text is not this app's place.

## What is not here

No network, no accounts, no analytics. The app reads its books out of its
own bundle and talks to nothing.
