# InkleMD for Android

A host for inkle-md books on Android, per SPEC 12.5 to 12.9. It plays the same
story logic a browser and a phone of the other kind play, because it embeds the
same runtime rather than reimplementing it.

```kotlin
val story = Story.open(context, assetDirectory = "thornwood-book", seed = 7)
story.begin(listOf(listOf("sword")))
story.choose(0)
val page = story.view          // the whole page, as JSON
```

The directory it opens is what `inkle-md bundle` writes, copied into
`app/src/main/assets/`:

```bash
node src/cli.js bundle examples/thornwood-book/book.yaml \
  --out hosts/android/app/src/main/assets/thornwood-book
```

## Not built here

**This code has never been compiled.** The machine it was written on has no
JDK, no Android SDK and no Gradle, so there is no build to point at and no test
that ran. That is worth saying plainly rather than leaving it to be discovered:
treat it as a starting point that follows a protocol which is itself well
tested, not as a working host.

What *is* tested is everything below it. The engine runs a whole playthrough in
a bare JavaScript realm and in JavaScriptCore, which is the same thing a
WebView gives it, and the protocol has its own test suite. What is untested is
this file: the bridge, the quoting, the coroutine wrapper.

To finish it, you need a JDK, the Android SDK and a Gradle project around this
source. Then: build it, run a book, and delete this section.

## Why a WebView

Every Android device has one, it costs no dependency, and `evaluateJavascript`
is exactly the string-in, string-out bridge of 12.8. Nothing is ever loaded
into it: no page, no network, no origin. The engine is the only script that
runs in it.

`androidx.javascriptengine` is the tidier door, with a real sandbox and no view
in sight, and it is the right target once the minimum SDK allows it. The
protocol does not change either way, because it is text on both sides.

## What is asynchronous, and what is not

Every call here is `suspend`, because `evaluateJavascript` answers through a
callback and blocking the main thread to pretend otherwise would be a bug. The
runtime itself is synchronous and single-threaded (12.9): it is the crossing
that waits, not the story.
