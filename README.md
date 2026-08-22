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

[SPEC.md](SPEC.md) is the language definition and the only authority, and
[HOSTS.md](HOSTS.md) says how a compiled book is exported, embedded and
played. This repository implements both. There are no dependencies and no build step. Node
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
story-weaver simulate <entry> --coverage       and name what no game ever showed
story-weaver import   <file.ink> [--out FILE]  translate an ink file
story-weaver mcp                               lint, play and simulate for AI tools
```

`play` with `--script 1,2,a,a` walks a fixed route instead of asking - a
digit takes a choice, `a`, `l` and `f` play out a fight, `z` takes a step
back - and with `--seed` the dice fall the same every time, which turns "it
broke somewhere in the crypt" into a reproducible bug report; `--json` returns the
same as data. `simulate` plays hundreds of games with a curious pseudo-random
reader and reports the endings, the dead ends and the average length - a
balance problem shows up there long before a human playtester finds it; that
is how the fear stat in the house example was found to punish every second
visit to the same room. `mcp` serves lint, play and simulate over stdio in
the protocol AI coding tools speak, so an agent can playtest a book against
the real runtime rather than parse terminal output.

How large an export gets is mostly the book. With `--minify`, the smallest
example is a 58 kB file that compresses to 17 kB, inside the 30 kB budget
the spec sets for a book without images; the largest, a full imported game,
comes to 217 kB, nearly all of it story.

## The examples

`examples/` holds four books written for this project and one imported one.
Each is there to fail differently.

**`thornwood-book/`** is the smallest complete book: character creation, a
fight, two endings, spread over a `book.yaml`, two chapters and two
languages. Read this one first, beside the full example at the end of the
spec. You can play it
[here](https://www.tobiasreithmeier.de/en/crypt-under-the-thorn).

**`house/`** is full-length: 48 passages, secrets, and a fear stat that
kills, so the numbers get exercised over a long game rather than a demo. You
can play it [here](https://www.tobiasreithmeier.de/en/house-behind-the-moor).

**`nightside/`** uses the layer where the world outside the book takes part:
values the book reads but never writes, events that come due on their own,
places in a table - and an oxygen clock that runs down whether or not the
reader is doing anything. You can play it
[here](https://www.tobiasreithmeier.de/en/nightside).

**`leuchtturm/`** is the smallest book of the newest layer: a picture, a
value a surrounding app supplies, an event that comes due, and a way in for
an app. German is its default language, English its translation.

**`intercept/`** is not written in this language at all. It is inkle's own
ink demo, *The Intercept*, put through `import`, and it earns its place by
having no character sheet, no dice and no combat: it exercises the narrative
half of the language on someone else's writing, where nothing could be
quietly bent to fit. It carries inkle's MIT notice, not this project's MPL
header, and it is the one example that does not pass `--strict`: it repeats
choice labels because the original does. English is the default language and
stays the imported text word for word; German is a catalogue beside it, which
is the whole point of the translation rule - a second language cannot touch
the structure it is translating. You can play it
[here](https://www.tobiasreithmeier.de/the-intercept).

## A book inside another app

A book is normally read from its first page to one of its endings. It can
also be one scene inside a larger game: an app that keeps a world of its own -
a map, a party, a clock - opens a book at one passage, lets the reader play
it, and takes the character sheet back when they leave. The book is never
told which of the two is happening, and the second way needs nothing the
first does not have: load a save, jump to a passage, play, save. Two kinds
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
clock - and what it owes its readers is set out in HOSTS 1.

## Writing with an editor

[`tools/vscode/`](tools/vscode/) is a VS Code extension: a panel beside the
text showing the node the cursor is in - its title, every way on with its
target, the warnings that fall inside it - and, on one keystroke, the book
played from that node, with the same runtime and the same view the HTML
export ships. It compiles the buffer rather than the file, so unsaved text
counts, and a book that does not compile leaves the last one that did on
screen with the error above it.

Install it by building a .vsix and handing it to VS Code. Copying or linking
a folder into `~/.vscode/extensions` has not worked since VS Code 1.74: only
what the CLI or the UI installed is loaded at all.

```bash
node tools/vscode/pack.mjs
code --install-extension build/tobiasreithmeier.story-weaver-0.1.0.vsix
```

`pack.mjs` prints the path it wrote and the install line to go with it. If
`code` is not on the PATH, run *Shell Command: Install 'code' command in
PATH* from the command palette once, or use the binary inside the app bundle
at `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`.

The packer is 60 lines and needs nothing installed - a .vsix is a zip with a
manifest - so the project stays dependency-free and `vsce` never appears. The
compiler, the runtime and the view travel inside the package, but a checkout
above the extension wins over that copy, so working in this repository means
an edit to `src/` shows in the panel without repacking.

Reload the window (*Developer: Reload Window*), open a `.md` book, and:

| | |
| --- | --- |
| `cmd+alt+p` / `ctrl+alt+p` | play from the node the cursor is in |
| *Story Weaver: Show node* | open the panel on that node's outline |
| *Story Weaver: Play from the start* | play from the book's start node |

The panel follows the cursor, and while a game runs the source follows the
game - it scrolls to the page being read without taking the focus. Clicking a
target in the outline jumps the editor to that node, which makes the panel an
index as well.

Three settings, all under `storyWeaver`: `follow`, on by default, lets the
panel follow the cursor, `language` picks the language to play in, and `host`
takes the host values of HOSTS 5 as `key=value` pairs separated by commas -
the same spelling `story-weaver play --host` uses. Without them a book that
reads the clock or a counter plays against its fallbacks, which `nightside`
and `leuchtturm` do.

To work on the extension itself, open `tools/vscode` in VS Code and press F5.
[`tools/vscode/README.md`](tools/vscode/README.md) has the rest.

## Importing ink

```bash
node src/cli.js import TheIntercept.ink --out examples/intercept/en/intercept.md
```

The importer writes one file with its frontmatter at the top, which is a whole
book per 3.1. `examples/intercept/` has since grown a German translation and
therefore a `book.yaml`, so re-importing it means lifting the frontmatter the
importer wrote into that `book.yaml` again. The English text below it is what
a re-import reproduces word for word, and that is what the example is for.

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

## Writing a book that plays well

None of the following is a rule of the language. It is craft, and it can be
read off the four example books and a shelf of Fighting Fantasy paperbacks.
Where a tool can verify a point, the tool is named.

**The first part converges on a single node.** The structure is called branch
and bottleneck; the name comes from Sam Kabo Ashwell's essay on CYOA
structures. The alternative, a tree that keeps opening - the time cave -
grows combinatorially until no one can write all the branches. After the
bottleneck, the second part is allowed to know where the reader stands.

**Loops are not bad - loops where nothing changes are bad.** A room the
reader returns to is the backbone of many books; in `leuchtturm`, the
workroom is exactly that. It carries because something is different on every
return: the weather one step further, the water higher, the light out. L028
and L029 report the other kind, the loop with no way out.

**A place describes itself once.** On the second visit, only what has changed
is on the page. The language carries this in the sequence without a marker:
`{long form|short form}` stays on the short form from the second visit on.

**A right path exists, and chance does not find it.** In `leuchtturm`, a
random reader reaches the good ending in 0 of 800 runs; the intended path
reaches it every time. Both halves can be checked: `simulate` for the chance,
a test with a fixed sequence of moves for the path.

**When time presses, it has to be seen coming.** Four stages, not two. And
they hang on the book's clock, not on the visit count - otherwise a reader
sees the whole escalation by looking out of the same window four times.

**What opens a later door has been seen before the door.** An item or code
word that first appears behind the door makes the decision in front of it
impossible instead of hard. L008 and L009 report what is taken and never
tested, and the other way round.

**Death is earned.** The most criticised trait of the old books is the
paragraph that kills without warning. Better a warning one page earlier, and
better to cost a resource than to end the book.

**Two hands, not twenty.** A carry limit turns a list into a decision. In
`leuchtturm` there are two slots, and carrying the tools means leaving the
lantern behind.

**Seven choices on a page at most.** Beyond that it is a menu, not a scene.
L013 says so.

**In the end the numbers decide, not the feel.** `simulate` shows how the
endings distribute. `simulate --coverage` names every choice that no run ever
put on the page. `lint --strict` has to stay clean.

What the linter reports is a find, not a verdict. A choice behind a
multi-step plan turns up in the coverage list, and that is as it should be.

## Rule systems the language can carry

The default rules are Fighting Fantasy, but almost everything about them is a
number or an expression in the frontmatter, and a book overrides them there.
Every variant below has been compiled and played; they work.

**Fighting Fantasy, the default.** Skill, Stamina and Luck; a check rolls two
six-sided dice and succeeds at or under the stat. A book that wants exactly
this writes nothing. The examples `thornwood-book`, `house` and `nightside`
work this way.

**Over the threshold instead of under it.** `succeeds: at-least` flips the
check. With `dice: "roll(1,20)"` and a stat that holds the threshold, this is
the check of modern role-playing games.

```yaml
checks:
  dice: "roll(1,20)"
  succeeds: at-least
```

**Percentages.** `dice: "roll(1,100)"` with `succeeds: at-most`, and every
stat is a percentage. That is the check of the systems from the early
eighties, where "Sneak 65" means that 65 or less succeeds.

**No dice at all.** A book never has to use `checks:`. Success can depend on
state alone: whether the light is burning, whether the tool is up on the
platform, what time it is. The `leuchtturm` example rolls dice in exactly one
place, the ladder on the outside, and is otherwise a book made of state and a
clock.

**Your own combat arithmetic.** `attack:` and `damage:` are expressions, not
fixed formulas, and they see everything the book knows. Fleeing costs
whatever the book says: nothing, two points as in the original, or a roll.

```yaml
combat:
  attack: "kraft + roll(1,10)"
  damage: "roll(1,6)"
  flee_cost: "roll(1,4)"
```

**Consumption instead of hit points.** A consumable item has `uses:`, an
`effect:` that runs when someone uses it, and a `when:` that says when that
is allowed. Provisions, lamp oil, cartridges: the tension comes from
something running out, not from someone landing a blow.

**A value that kills without a fight.** `death:` reads any expression. In the
`house` example it is fear, which keeps rising; in `leuchtturm` it is the
water in the cellar - both end the book without a single enemy in it.

What is not adjustable is the shape of a combat round. Both sides compute an
attack total, the higher one wins, the loser takes damage - `rule:` knows
only `higher-wins`. Initiative order, hit locations or any other kind of
comparison are written as ordinary nodes with conditions, not as combat.

## What is in this repository

`SPEC.md` is the language definition. It decides, and the code follows.
`HOSTS.md` is the other half, for programs that play a book rather than
authors who write one.
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
