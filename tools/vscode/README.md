<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/.

     Copyright 2026 Tobias Reithmeier -->

# Story Weaver for VS Code

A panel beside the text: on the left the book, on the right the node the
cursor is in, and on one keystroke the book, played from exactly that node.

## What the panel shows

**Outline** is what the compiler knows about the node: title, id, location,
every way on with its target, and the warnings that fall inside the node.
None of it is evaluated - an alternative has no turn yet, a `{...}` no value,
a condition no state. In return, the view exists for every node, including
the ones no playthrough has reached.

**Play** is the book itself, with the same runtime and the same view the HTML
export ships. What stands here is what a reader reads. Play starts from the
node the cursor is in; the opening choice from SPEC 7.2 still happens,
otherwise the hero would stand there with no pack and empty stats. A test run
writes nothing to disk: it starts where the author is writing, not where
someone last read.

While a game runs, the source follows the game and scrolls to the paragraph
of the page being read - without taking the focus.

## Commands

| Command | Effect |
| --- | --- |
| `Story Weaver: Show node` | Open the panel on the outline of the node under the cursor |
| `Story Weaver: Play from here` | Open the panel and play from that node (`cmd+alt+p`) |
| `Story Weaver: Play from the start` | Play from the book's start node |

## Settings

- `storyWeaver.follow` - the panel follows the cursor. Off, it stays put.
- `storyWeaver.host` - host values for the test run, `key=value`, separated
  by commas, the same spelling `story-weaver play --host` uses. Without them
  a book that reads the clock or a counter plays against its fallbacks;
  `nightside` and `leuchtturm` need them.
- `storyWeaver.language` - the language of the test run; empty means the
  book's default language.

## What gets compiled

The book belonging to the file in the editor: the nearest `book.yaml` above
it, and if there is none, the file itself - provided that file carries the
frontmatter a single-file book needs (SPEC 3.1). A markdown file without one
is no book, and the panel leaves it alone rather than reporting compile
errors in someone's README. What the editor holds is what gets read, not what
is on disk - unsaved text counts too. Images are the exception: they are
looked up on disk, because that is where they have to be (SPEC 4.9).

Whatever does not compile leaves the last state that did on screen, with the
error above it. While typing, a file is invalid most of the time, and an
empty panel helps no one.

## Getting started

To try it out and keep building: open `tools/vscode` in VS Code and press F5.
That starts a second VS Code with the extension and this project inside it.

For daily use, build and install a package:

```bash
node tools/vscode/pack.mjs
code --install-extension build/tobiasreithmeier.story-weaver-0.1.0.vsix
```

`pack.mjs` prints the path and the matching install line to the terminal. If
`code` is missing from the PATH, run *Shell Command: Install 'code' command
in PATH* from the command palette once, or use the binary inside the app
bundle at
`/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`.

Then reload the window (*Developer: Reload Window*). Copying or linking a
folder into `~/.vscode/extensions` has not been enough since VS Code 1.74:
only what the CLI or the UI installed is loaded, and a symlink there lies
silent.

`pack.mjs` needs nothing installed - a .vsix is a zip with a manifest, and
macOS ships `zip`. `vsce` never appears, and the project stays without
dependencies.

Compiler, runtime and view travel inside the package as `vendor/src`,
because an installed extension cannot reach into the project. If a checkout
sits above the extension - that is, when working in this repository - its
`src/` wins: a change there shows in the panel at once, without repacking.

## What gets tested

`test/vscode.test.js` in the project's test run checks what a running editor
cannot answer and what would fail silently: which node a cursor line falls
in, which book a file belongs to, and that the compiler takes the buffer
rather than the file. `extension.js` stays the thin connection to VS Code
and is checked by hand; everything that works without `vscode` lives in
`book.mjs`.
