# inkle-md

A gamebook language written in Markdown: ink semantics, Markdown syntax, and a
fixed RPG layer modelled on the 1980s gamebooks. [SPEC.md](SPEC.md) is the
language definition and the only authority; this repository implements it.

Node 20 or newer.

```bash
node src/cli.js build examples/thornwood.md --out build/thornwood.json
node src/cli.js build examples/thornwood-book/book.yaml --out build/book.json
node src/cli.js lint examples/thornwood.md --strict
node src/cli.js export examples/thornwood-book/book.yaml --out build/play.html
node src/cli.js bundle examples/thornwood-book/book.yaml --out build/native
node src/cli.js play examples/house/book.yaml
node --test 'test/*.test.js'
```

`play` walks a book in the terminal. With `--script 1,2,a,a` it walks a fixed
route instead and prints where it ended up, which makes a bug reproducible;
`--json` turns that into something a tool can read, as it does for `lint`.
`simulate --runs 300` plays many games with a curious pseudo-random reader and
reports the endings, dead ends and average length - that is how the fear stat
in the house example was found to punish every second visit to the same room.
`mcp` serves lint, play and simulate as MCP tools over stdio, so an agent can
playtest a book against the real runtime; `.mcp.json` registers it.

The export is one HTML file with no external requests. How large it gets is
mostly the book: thornwood comes to 63 kB, the nightside to 203 kB, The
Intercept to 223 kB. The fixed part is the runtime and the view layer, and that
is what the budget in SPEC 12 is about.

A page can host the game instead of exporting it. Concatenate `runtime.js` and
`view.js` with `export ` stripped - that is all `export.js` does - and mount it
into an element of your own:

```js
mount(story, root, { setDocumentLang: false, onRender: ({ node }) => … });
```

`setDocumentLang: false` leaves `<html lang>` to the page, which owns it; the
game marks its own region either way. `onRender` reports the node the reader is
on after every redraw, so a host can follow along in the source: `meta.files`
names the chapter files and every node carries its `file` and `line`.

A host in another language cannot call any of that, so it gets a protocol
instead. `bundle` writes `story.json` and `inkle-md.js` into a directory; the
script defines two names, both taking and returning text, and a host on iOS or
Android hands them to the JavaScript engine it already has:

```js
inkleMd.start(storyJsonText, '{"seed":7}');        // -> the first view
inkleMd.send('{"cmd":"choose","index":1}');        // -> one answer
```

One command in, the whole view out, so a turn costs one crossing rather than a
dozen. A book can be played two ways: read from its start, or entered as one
episode inside an app that holds the map. The second needs nothing new -
`load` the character, `go` to the passage, play it, `save` what changed - and
that is deliberate: the book must not learn which of the two is happening.
World data the book only reads arrives as host facts, declared `holds:` where
it is a state rather than a duration. The runtime is embedded rather than translated because principle 5 wants
the same die on every platform, and one implementation cannot disagree with
itself. What the host draws, where it keeps the save and what feeds its clock
are its own; SPEC 12.5 to 12.8 says what that means.

## What is here

| Path | What it does |
|---|---|
| `src/lexer.js` | Line scanner, SPEC 10.2, including the three collision rules |
| `src/expr.js` | Expressions and statements, SPEC 4.7 and 5 |
| `src/yaml.js` | The YAML subset the frontmatter uses, SPEC 6 |
| `src/frontmatter.js` | Frontmatter validation, character sheet, items, language tables |
| `src/parser.js` | Lines to nodes and ops, SPEC 4 |
| `src/catalog.js` | Translations as text catalogues and overrides, SPEC 3.4 |
| `src/compile.js` | Pipeline, reference resolution, checks |
| `src/emit.js` | Story JSON, with every default and repetition stripped, SPEC 9.1 |
| `src/lint.js` | Linter and reachability report, SPEC 11 |
| `src/runtime.js` | The player: text, choices, combat, save and undo, SPEC 8 |
| `src/view.js` | The view layer: labels, presentation, accessibility, SPEC 12 |
| `src/export.js` | One self-contained HTML file, SPEC 12 |
| `src/host.js` | The host protocol: one command in, the whole view out, SPEC 12.7 |
| `src/bundle.js` | Story and engine as files a native host embeds, SPEC 12.8 |
| `src/play.js` | Playing from the terminal, scripted replays, simulation |
| `src/mcp.js` | lint, play and simulate as MCP tools over stdio |
| `src/import.js` | Reads ink and writes inkle-md, reporting what has no equivalent |
| `src/cli.js` | `build`, `lint`, `export`, `bundle`, `play`, `simulate`, `import`, `mcp` |
| `examples/thornwood.md` | One file, one language: creation, combat, two endings |
| `examples/thornwood-book/` | The same book as a project: two chapters, German and English |
| `examples/house/` | A full-length book: 46 nodes, a fear stat that kills, secrets, three endings |
| `examples/nightside/` | The 0.7 layer at work: facts, events, places, an oxygen clock, five endings |
| `examples/intercept.md` | ink's own demo game, imported: 132 nodes, no RPG layer at all |
| `hosts/ios/` | The same runtime in a JSContext, with a SwiftUI screen, SPEC 12.5 |

## The examples

Each one is there to fail differently.

**`thornwood.md`** is the smallest complete book: one file, one language,
character creation, a fight, two endings. Read this one first, and read
[the full example in SPEC 13](SPEC.md#13-full-example) beside it. You can play it [here](https://www.tobiasreithmeier.de/en/crypt-under-the-thorn).

**`thornwood-book/`** is the same story as a project, to show what changes when
a book grows a `book.yaml`, a second chapter and a second language.

**`house/`** is full-length: 46 nodes, secrets, and a fear stat that kills, so
the numbers get exercised over a long game rather than a demo. You can play it [here](https://www.tobiasreithmeier.de/en/house-behind-the-moor).

**`nightside/`** carries the 0.7 layer - facts, events, places, host time - and
an oxygen clock that runs down whether or not the reader is doing anything. You can play it [here](https://www.tobiasreithmeier.de/en/nightside).

**`intercept.md`** is not written in this language at all. It is inkle's own
ink demo, *The Intercept*, put through `import`, and it earns its place by
having no character sheet, no dice and no combat: it exercises the narrative
half of the language on someone else's writing, where nothing could be quietly
bent to fit. It carries inkle's MIT notice, not this project's MPL header, and
it is the one example that is not `--strict` clean - it repeats choice labels
because the original does (L012). You can play it [here](https://www.tobiasreithmeier.de/the-intercept).

## Importing ink

```bash
node src/cli.js import TheIntercept.ink --out examples/intercept.md
```

The importer carries over what this language has a word for: knots, stitches,
weaves, the bracket split in choices, conditions, variables and the inline
forms of varying text. What ink says differently is rewritten rather than
guessed - a tunnel becomes a divert to where its callers return, a label used
as a jump target becomes a node, a visit count on a choice becomes a variable,
and a weave past the three levels of SPEC 4.3 moves into a node that goes on
where the weave would have gone on. What has no equivalent at all - threads,
lists, external functions - is reported with the ink line number and left out.

Those notes carry no error code on purpose: SPEC 10.3 and 11 describe an
inkle-md document, and the importer's input is not one.

## Three rules worth knowing before writing a book

**The book holds no time.** A clock is a stat the book declares and advances
itself; the runtime never learns what its unit means. What comes from outside
is a `host` fact, and it arrives only when a host hands it in. Facts are
read-only: a book reads them, a reader changes variables (SPEC 16 to 18).


**The book holds no presentation.** No fonts, no colours, no button labels, no
hint about how a stat should be drawn. That is the view layer's business
(SPEC 12), and a book that carries its own layout stops being portable to the
next one. `strings:` is the single exception and holds only lines the combat
resolver narrates.

**Translations carry text, not logic.** The default language owns the
structure; every other language is a catalogue of paragraphs and button
labels, matched in source order. Where a language genuinely needs different
logic - a plural only it branches on - it may override a whole node, and the
linter says so (L019). See `examples/thornwood-book/en/crypt.md`.

## Licence

Mozilla Public License 2.0, see [LICENSE](LICENSE).

MPL is per file: change one of these files and your version of that file stays
open, while a book, a game or a product built with them can be licensed however
you like. The exported HTML carries the runtime, so it carries the notice too -
the exporter writes it in for you.
