# Story Weaver

Story Weaver is a language for writing gamebooks: branching stories in the
tradition of the 1980s adventure books, where you read a passage, make a
choice and turn to another passage, with a character sheet, dice and fights
along the way. A book is a plain Markdown file, or a folder of them. A
heading is a passage, a link is a jump, a list item is a choice, and the
whole thing stays readable in any editor and on GitHub.

The story logic follows ink, the open scripting language inkle wrote for
games such as 80 Days. What ink can say about branching, this language says
in Markdown's spelling, with one spelling per concept; you do not need to
know ink to write a book. The RPG layer - stats, items, dice, combat - is
built into the language, so a fight needs no custom code.

[SPEC.md](SPEC.md) is the language definition and the only authority; this
repository implements it. There are no dependencies and no build step. Node
20 or newer runs everything.

## Trying it

```bash
node src/cli.js play examples/thornwood-book/book.yaml
```

walks the smallest example book in the terminal: character creation, a
fight, two endings. And

```bash
node src/cli.js export examples/thornwood-book/book.yaml --out build/play.html
```

turns it into a single HTML file with no framework and no network access at
runtime. Put that file on any web space, or send it in a mail, and it plays.
Installed as an npm package, this tool is the `story-weaver` command; run
from a checkout, `node src/cli.js` is the same command without installing
anything.

## The commands

```
story-weaver build    <entry> [--out FILE]     compile to story JSON
story-weaver lint     <entry> [--strict]       errors, warnings, a reachability report
story-weaver export   <entry> --out FILE       one playable HTML file
story-weaver bundle   <entry> --out DIR        story and engine for a native app
story-weaver play     <entry>                  read in the terminal
story-weaver simulate <entry> [--runs N]       let the machine play many games
story-weaver import   <file.ink> [--out FILE]  translate an ink file
story-weaver mcp                               lint, play and simulate for AI tools
```

`play` with `--script 1,2,a,a` walks a fixed route instead of asking, and
with `--seed` the dice fall the same every time, which turns "it broke
somewhere in the crypt" into a reproducible bug report; `--json` returns the
same as data. `simulate` plays hundreds of games with a curious pseudo-random
reader and reports the endings, the dead ends and the average length - a
balance problem shows up there long before a human playtester finds it; that
is how the fear stat in the house example was found to punish every second
visit to the same room. `mcp` serves lint, play and simulate over stdio in
the protocol AI coding tools speak, so an agent can playtest a book against
the real runtime rather than parse terminal output.

How large an export gets is mostly the book. With `--minify`, the smallest
example is a 47 kB file that compresses to 14 kB, inside the 30 kB budget
the spec sets for a book without images; the largest, a full imported game,
comes to 210 kB, nearly all of it story.

## The examples

`examples/` holds four books written for this project and one imported one.
Each is there to fail differently.

**`thornwood-book/`** is the smallest complete book: character creation, a
fight, two endings, spread over a `book.yaml`, two chapters and two
languages. Read this one first, beside the full example at the end of the
spec. You can play it
[here](https://www.tobiasreithmeier.de/en/crypt-under-the-thorn).

**`house/`** is full-length: 46 passages, secrets, and a fear stat that
kills, so the numbers get exercised over a long game rather than a demo. You
can play it [here](https://www.tobiasreithmeier.de/en/house-behind-the-moor).

**`nightside/`** uses the layer where the world outside the book takes part:
values the book reads but never writes, events that come due on their own,
places in a table - and an oxygen clock that runs down whether or not the
reader is doing anything. You can play it
[here](https://www.tobiasreithmeier.de/en/nightside).

**`leuchtturm/`** is the smallest book of the newest layer: a picture, a
value a surrounding app supplies, an event that comes due, and a way in for
an app.

**`intercept.md`** is not written in this language at all. It is inkle's own
ink demo, *The Intercept*, put through `import`, and it earns its place by
having no character sheet, no dice and no combat: it exercises the narrative
half of the language on someone else's writing, where nothing could be
quietly bent to fit. It carries inkle's MIT notice, not this project's MPL
header, and it is the one example that does not pass `--strict`: it repeats
choice labels because the original does. You can play it
[here](https://www.tobiasreithmeier.de/the-intercept).

## A book inside another app

A book is normally read from its first page to one of its endings. It can
also be one scene inside a larger game: an app that keeps a world of its own -
a map, a party, a clock - opens a book at one passage, lets the reader play
it, and takes the character sheet back when they leave. The book is never
told which of the two is happening, and the second way needs nothing the
first does not have: load a save, jump to a passage, play, save. Three kinds
of host can hold a book like this.

**A web page.** Concatenate `src/runtime.js` and `src/view.js` with the
`export` keywords stripped - that is all `src/export.js` does - and mount the
game into an element of your own:

```js
mount(story, root, { onRender: ({ node }) => console.log(node) });
```

`onRender` reports the passage the reader is on after every redraw, so the
page can follow along.

**A native app.** A host written in Swift or Kotlin cannot call a JavaScript
function directly, so it gets a protocol instead. `bundle` writes two files,
the story as data and the engine as one script, and the script defines two
functions that take and return text, which is what any JavaScript bridge
carries well:

```js
storyWeaver.start(storyJsonText, '{"seed":7}');   // -> the first page
storyWeaver.send('{"cmd":"choose","index":1}');   // -> the page after the choice
```

One command in, the whole page out, so a turn costs one language crossing
rather than a dozen. The engine is embedded rather than translated into each
language because the dice must fall the same everywhere: a save carried from
a phone to a browser has to resume as the same story, and one implementation
cannot disagree with itself.

`hosts/` holds three such hosts, each with its own README:
[`hosts/ios/`](hosts/ios/) is a Swift package with a ready-made SwiftUI
reading view, [`hosts/demo/`](hosts/demo/) is an example app built on it,
and [`hosts/android/`](hosts/android/) is a Kotlin host that is written but
has never been compiled. What a host owns - drawing, saving, feeding the
clock - and what it owes its readers is set out in SPEC 12.

## Writing with an editor

[`tools/vscode/`](tools/vscode/) is a VS Code extension: a panel beside the
text showing the node the cursor is in - its title, every way on with its
target, the warnings that fall inside it - and, on one keystroke, the book
played from that node, with the same runtime and the same view the HTML
export ships. It compiles the buffer rather than the file, so unsaved text
counts, and a book that does not compile leaves the last one that did on
screen with the error above it. No build step and no dependency: a symlink
into `~/.vscode/extensions` is the whole install.

## Importing ink

```bash
node src/cli.js import TheIntercept.ink --out examples/intercept.md
```

The importer reads a file written in ink and writes the same story in this
language. What has a direct equivalent is carried over: passages and their
nesting, choices and their split button text, conditions, variables, and the
inline forms of varying text. What ink says differently is rewritten rather
than guessed - a label that is only jumped to becomes a passage of its own,
for example. What has no equivalent at all - ink's threads, lists and
external functions - is reported with the ink line number and left out, so
you know what to rewrite by hand.

## Three rules worth knowing before writing a book

**The book holds no time.** A clock is a stat the book declares and advances
itself; the runtime never learns what its unit means. What comes from
outside - real seconds, a host app's weather - arrives as a fact: a value
the book can read but never write. What the reader changes is a variable.
The spec draws this line in sections 14 to 18.

**The book holds no presentation.** No fonts, no colours, no button labels,
no hint about how a stat should be drawn. Looks belong to whatever plays the
book, and a book that carries its own layout stops being portable to the
next host. The single exception is `strings:`, which holds only the lines
the combat resolver narrates.

**Translations carry text, not logic.** The default language owns the
structure; every other language is a catalogue of paragraphs and button
labels, matched in source order. Where a language genuinely needs different
logic - a plural only it branches on - it may override a whole passage, and
the linter points at every place that happens. See
`examples/thornwood-book/en/crypt.md`.

## What is in this repository

`SPEC.md` is the language definition; it decides, and the code follows.
`test/` is the test suite, run with `node --test 'test/*.test.js'`.
`examples/` holds the books above, and `hosts/` the three native hosts.

`src/` is the whole implementation, in plain Node with no dependencies: the
compiler front (`lexer.js`, `expr.js`, `parser.js`, `frontmatter.js`, and
`yaml.js`, a YAML subset written here rather than installed), the pipeline
and its checks (`compile.js`, `lint.js`, `emit.js`), the player
(`runtime.js`), the browser view and the export (`view.js`, `export.js`),
the native side (`host.js`, `bundle.js`), the terminal player and the
simulator (`play.js`), the ink importer (`import.js`), the MCP server
(`mcp.js`) and the command line (`cli.js`).

## Licence

Mozilla Public License 2.0, see [LICENSE](LICENSE).

MPL is per file: change one of these files and your version of that file
stays open, while a book, a game or a product built with them can be
licensed however you like. The exported HTML carries the runtime, so it
carries the notice too - the exporter writes it in for you.
