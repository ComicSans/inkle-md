# inkle-md

A gamebook language written in Markdown: ink semantics, Markdown syntax, and a
fixed RPG layer modelled on the 1980s gamebooks. [SPEC.md](SPEC.md) is the
language definition and the only authority; this repository implements it.

No dependencies, no build step. Node 20 or newer.

```bash
node src/cli.js build examples/thornwood.md --out build/thornwood.json
node src/cli.js build examples/thornwood-book/book.yaml --out build/book.json
node src/cli.js lint examples/thornwood.md --strict
node src/cli.js export examples/thornwood-book/book.yaml --out build/play.html
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

The export is one HTML file with no external requests: 53 kB, 15 kB gzipped,
which is inside the 30 kB budget of SPEC 12.

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
| `src/play.js` | Playing from the terminal, scripted replays, simulation |
| `src/mcp.js` | lint, play and simulate as MCP tools over stdio |
| `src/cli.js` | `build`, `lint`, `export`, `play`, `simulate`, `mcp` |
| `examples/thornwood.md` | One file, one language: creation, combat, two endings |
| `examples/thornwood-book/` | The same book as a project: two chapters, German and English |
| `examples/house/` | A full-length book: 46 nodes, a fear stat that kills, secrets, three endings |
| `examples/nachtseite/` | The 0.7 layer at work: facts, events, places, an oxygen clock, five endings |

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

## What is not here yet

- **Lint rules L003, L004, L011, L014, L015.** They need constant folding over
  variables or a prose model. Everything else in SPEC 11 runs, including
  L021 to L027.
- **A calendar and an ephemeris.** The `clock` and `ephemeris` fact sources of
  SPEC 25 need an epoch, and this draft has no absolute time in it.

## Conventions

Errors carry a code from SPEC 10.3 and always name file, line and the
offending text. Warnings carry a code from SPEC 11; `--strict` turns them into
errors and is what CI uses.

Every example in SPEC.md is a test case, and the three collision rules are
table-driven in `test/lexer.test.js` - that is where a Markdown dialect breaks
first.

## Licence

Mozilla Public License 2.0, see [LICENSE](LICENSE).

MPL is per file: change one of these files and your version of that file stays
open, while a book, a game or a product built with them can be licensed however
you like. The exported HTML carries the runtime, so it carries the notice too -
the exporter writes it in for you.
