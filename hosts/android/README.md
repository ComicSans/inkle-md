# Story Weaver for Android

One Kotlin file, `Story.kt`, that plays Story Weaver books on Android. It
plays the same story logic a browser or an iPhone plays, because it embeds
the same JavaScript engine rather than reimplementing it: the dice must fall
the same on every platform, or a save carried between devices resumes as a
different story. It is the engine only - it draws nothing, and an app around
it builds its own screens from the page the engine publishes.

## Not built here

**This code has never been compiled.** The machine it was written on has no
JDK, no Android SDK and no Gradle, so there is no build to point at and no
test that ran. That is worth saying plainly rather than leaving it to be
discovered: treat it as a starting point whose foundations are tested, not
as a working host.

What *is* tested is everything below this file. The engine runs a whole
playthrough in a bare JavaScript realm and in JavaScriptCore, the same kind
of environment a WebView provides, and the command protocol between host and
engine has its own test suite. What is untested is this file itself: the
bridge, the quoting, the coroutine wrapper.

To finish it, you need a JDK, the Android SDK and a Gradle project around
this source. Then: build it, run a book, and delete this section.

## Using it

```kotlin
val story = Story.open(context, assetDirectory = "thornwood-book", seed = 7)
story.begin(listOf(listOf("sword")))
story.choose(0)
val page = story.view          // the whole current page, as one JSON object
```

Every call is a `suspend` function, so this runs inside a coroutine. The
directory it opens is what the compiler at the root of this repository
writes, copied into the app's assets:

```bash
node src/cli.js bundle examples/thornwood-book/book.yaml \
  --out hosts/android/app/src/main/assets/thornwood-book
```

Two files land there: `story.json` is the book as data, `story-weaver.js` is
the engine that plays it. What an app owes its readers on top - the
accessibility the web export gives them, in Android's own terms - is set out
in SPEC 12.

## Why a WebView

The engine needs something that runs JavaScript and passes strings in and
out. Every Android device has a WebView, it costs no dependency, and its
`evaluateJavascript` is exactly that bridge. Nothing is ever loaded into it:
no page, no network, no origin. The engine is the only script that runs in
it.

`androidx.javascriptengine` is the tidier door, with a real sandbox and no
view object in sight, and it is the right target once the minimum SDK allows
it. The protocol does not change either way, because it is text on both
sides.

## What is asynchronous, and what is not

Every call here is `suspend`, because `evaluateJavascript` answers through a
callback, and blocking the main thread to pretend otherwise would be a bug.
The story engine itself is synchronous and single-threaded: it is the
crossing into the WebView that waits, not the story.
