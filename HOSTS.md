# Story Weaver hosts, draft 0.8

A book is written in the language of `SPEC.md`. This document is the other
half: how a compiled book is exported, embedded and played, and what a
program that plays one has to provide. An author needs none of it.

## 1. Export and hosts
Once your book lints clean, you hand it to readers.
`story-weaver export book.yaml --out play.html` produces a
single HTML file: the story JSON embedded as a
`<script type="application/json">`, the runtime below it. No framework, no
external resources, no network access at runtime. You can put that one file on
any web space, or send it in a mail, and it plays.

By default the runtime travels as it is written, with its comments and its
indentation, so you can open the file and follow what it does. Add `--minify`
and the exporter drops the comment lines, the blank lines and the indentation
from the runtime, the view and the stylesheet before writing them. Line breaks
stay where they are, so no semicolon has to be guessed, and nothing is
renamed: a rename needs a JavaScript parser, and the kilobytes it would save
do not pay for one. The licence notice stays either way, and so does the
embedded JSON, which is compact in both cases because nobody reads a story
tree by hand. Nothing about the story changes, and the same book plays the
same way. The target size, under 30 kB compressed, is the size of the
minified file, so keep the flag off while you are still working and turn it on
for the copy you hand out.

One case adds to the single file. A book that links images is that file plus
those images, per principle 6, copied beside it by the export and resolved
relative to it by the browser. Nothing else ever lands there. A path that
leaves the book's directory never reaches this point: it is E183 at compile
time (SPEC 5.9). A book without images stays one file, which is the case the target
size above is written for.

## 2. Runtime API
The runtime is the piece of JavaScript that actually plays the story: it
holds the state, evaluates conditions and hands the host the text to show. It
is one class, so the same code serves the export and any embedding. A host
that puts your book inside an app or a website talks to this:

```js
const story = new Story(json, { lang: 'de' });
story.setup;                          // creation blocks, or null
story.begin(picks);                   // answers the setup, rolls the stats (once)
story.choose(index);                  // take a choice
story.advance(host);                  // a boundary: take host values, compute, run events
story.go(node);                       // enter a node from outside the story (20.6)
story.facts;                          // the published snapshot, read-only
story.current;                        // { node, title, text, choices, stats, facts, ended }
story.combat;                         // active combat, or null
story.inventory;                      // [{ id, name, kind, uses, equipped, usable }]
story.memory;                         // code words in the order they were noted
story.useItem(id);                    // honours the item's when:
story.equipItem(id);
story.canUndo;                        // false when the stack is empty or depth is 0
story.undo();                         // back to before the last root choice
story.lang;                           // current language
story.languages;                      // what the book offers
story.setLanguage('en');              // allowed at any point, including mid-combat
story.save();                         // save JSON per section 15
story.load(save);
story.seed(n);
```

**A book sets out exactly once.** `begin(picks)` answers the setup and rolls
the stats, so a book that declares no `setup:` has nothing to answer and sets
out the moment it is constructed. `story.setup` is `null` and the first page
is already there. Calling `begin()` on such a book, or a second time on any
book, is refused rather than obeyed: setting out twice would run every
assignment in the first node again, fire its events again, and move every
alternative on a step, so the first option of a sequence was never seen.

Most of these calls do what their name says. Language switching touches the
save. `setLanguage` re-renders the
current node in the new language and keeps the whole save: the ids of 17.1 are
shared between languages, so `taken` and `alts` carry over. In a node where
one language overrides (SPEC 4.4), the ids are that language's own, so on a switch
the keys that do not exist on the other side are kept in the save but ignored
while reading, and switching back restores them. Nothing is discarded, because a
reader who switches twice should not lose a once-only line they already saw.

Text is delivered as an array of paragraphs, each with its CSS classes, so
the host decides how to render. An image is an entry in that same array,
carrying `image` and `alt` where a paragraph carries `text` (SPEC 5.9). Combat is
exposed as state plus `attack()` and `flee()`, never as a blocking loop, so
your interface stays in charge of its own event loop.

`go` is the odd one out. Everywhere else the story
decides where it goes next: a divert moves it, a choice moves it, an event
never does. `go` is the door in the side wall, for a host that already knows
where it wants to be (a chapter picker, a debug jump, an episode entered from
a map, 7). It is not a way to tell a story with, because a jump the
book did not write is a jump the book cannot account for: it rolls no stats,
takes no boundary of its own beyond the node it enters, and leaves whatever
the reader was in the middle of. What it is for is arriving, once, from
outside.

## 3. Presentation
SPEC 7 keeps looks out of the book, so they live here and only here: the
export ships a stylesheet with CSS custom
properties for font, measure and four colours each for light and dark, plus a
rule per `{.name}` a book uses, plus the labels for its own buttons and
panels in each language the book declares. None of that is readable from the
story JSON, which is the point of SPEC 7's rule.

A book that declares a `blurb:` (SPEC 7) opens on it: the back of the book as the
first page, with the one button that begins. A reader returning to a saved
game has read it already and is not shown it again.

Themes follow `prefers-color-scheme` and can be overridden by the reader.

Saves live in `localStorage` under one key per book, plus export and import
as a JSON string, so a reader can move a game between devices without an
account.

The sheet also lists the code words the reader has been told to note, in the
order they were remembered, following the Lone Wolf convention, where noting
the word is the reader's own act. A book that wants a secret keeps it out of
`remember()` and in its structure.

## 4. Accessibility
Accessibility is part of the export, not a later pass. Every exported book
gives you this without work on the author's side:

- choices are real buttons in a list, reachable and operable by keyboard, with
  number keys 1 to 9 as shortcuts. The number is shown next to the label and
  announced through `aria-keyshortcuts`, while the accessible name stays the
  choice itself;
- new text is announced through `aria-live="polite"`, and focus moves to the
  new section after every choice;
- the character sheet is a description list, not a table of bars, with the
  numeric value in the accessible name;
- the inventory is a list whose Use and Equip controls are buttons, with the
  remaining uses in each button's accessible name, and a status message after
  every use so the effect is not visible only in a bar;
- no animation under `prefers-reduced-motion`;
- contrast at least 4.5:1 for text in both themes, and at least 3:1 for the
  outline of anything operable, which is a different value and the one that
  gets forgotten; nothing conveyed by colour alone;
- what a combat round did is a status message, so it reaches a screen reader
  without the focus moving;
- a control that is disabled says why, next to it and as its description;
- touch targets are at least 44 px on a coarse pointer;
- the whole page works at 200% zoom and at 320 px width.

## 5. Playing without a browser
You do not need the HTML export to read your own book. `story-weaver play
<entry>` walks a book in the terminal, which is how an author reads their own
text before anyone else does. A declared `blurb:` (SPEC 7) is printed before the
setup, and a `--script` walk and `--json` output skip it, because neither is
reading for pleasure. Three flags make it a tool rather than a toy:

- `--script 1,2,a,a` walks a fixed route and prints where it ended up. A
  digit takes the choice at that position. In a fight, `a` attacks, `l`
  tests luck and `f` flees. `z` takes a step back, and `u lantern` or
  `e sword` uses or equips an item. With a seed, that route is exactly
  reproducible, which is what turns "it broke somewhere in the crypt" into a
  bug report.
- `--json` returns the same as data: node, text, choices, stats, inventory,
  code words, facts, the dice counter, and a log of which move led where.
  `lint` takes the flag too.
- `--host elapsed=60` supplies host values, arriving at every boundary the
  walk performs. A boundary is the point where the book pauses and asks the
  outside world for values, and a host fact is a fact whose value that
  outside world supplies. Boundaries are SPEC 11 and facts SPEC 10. Without the flag a
  host fact stays at its `fallback:`, which is the same book a reader gets
  offline.

You can also let the machine play for you. `story-weaver simulate <entry>
--runs 300 --host elapsed=60` plays many games with
pseudo-random choices and reports the endings, the dead ends and the average
length. A balance problem shows up there long before it shows up in a
playthrough: the fear stat of the house example punished every second visit
to the same room, and three hundred games said so in a second.

The simulated reader is curious, not random: at a crossroads an option not
yet tried in this run comes first, and only when every visible option has
been tried once does the walk fall back to cycling. A purely cyclic walker
never leaves a hub room with a sticky "go back" choice, and no human reads a
gamebook that way. `endings` counts only runs that actually reached an
ending. A run that hits the step limit is reported as unfinished, not as an
ending at whatever node it happened to stand in.

`--coverage` asks a different question: not where a book ends, but what a
reader never gets to see. It reports every choice that stood on no page in
any of the runs, and to find them it steers. Across runs, the choice taken
least often so far comes first. Least often, not never: a walker that only
takes what nobody has taken fans out at the first crossroads and never
reaches anything deep, because every way there has been walked once
already. That steering shifts the spread of endings, which
is what a book is balanced against, so it stays off unless asked for. What it
surfaces is not by itself a fault: a choice behind a three-step plan belongs
in that list, and what it is worth is the author's to say.

For `simulate`, `--host` is the policy for how the counters and `elapsed`
advance per turn. Without it nothing scheduled is ever tested: a book whose
relief arrives at turn three hundred needs a walk that reaches turn three
hundred, and a book that measures seconds needs someone to hand it seconds.

There is a third way in, for tools rather than people. `story-weaver mcp` serves
the same three checks (lint, play, simulate) as MCP tools over stdio, so an
agent can playtest a book against the real runtime instead of parsing
terminal output. The server speaks JSON-RPC 2.0, one message per line, and
needs no dependency.

## 6. Hosts beyond the browser
The runtime is one file with no imports and no globals beyond the standard
library, and that is not a matter of taste. It is what lets one piece of
story logic serve more than one surface. You have already met two hosts: the
view of 3, which draws the story in a browser, and `play` of 5, which
draws it in a terminal. Neither of them is the runtime. Both talk to it
through the API of 2, and a reading app on a phone is a third host of the
same kind.

A host written in Swift or Kotlin cannot talk to that API, because it cannot
call a JavaScript method. So it embeds a JavaScript engine, hands it the
runtime unchanged, and speaks the protocol of 8.

The reason to embed rather than port the runtime into each language is
principle 5. Seed plus counter has to produce the same die on every platform,
or a save carried from a phone to a browser resumes as a different story. One implementation
cannot disagree with itself. A second one is a second sequence, a second set
of rounding rules, and a bug that appears on one platform only, which is the
kind nobody finds. The same argument covers everything in SPEC 6 to 7:
those rules are written once, or they are written differently.

Embedding has a price, and it is one line long: the runtime may use the
language and nothing above it. `structuredClone` reads better than a copy
through JSON, and it is out, because it is a web API rather than part of
JavaScript, and the JSContext an iOS host embeds does not have it.

What is left to the host is what the runtime declines to decide.

**The save.** SPEC 15's save is one JSON object, and 3 puts it in
`localStorage` because that is what a browser has. A native host writes the
same object to a file of its own. The format is the same either way. Where
it is kept was never part of it.

**Time.** Nothing in the runtime reads a clock (principle 7, 11). A
host that wants real time measures it and hands it to `advance`, typically
once when the app comes back to the foreground. A host value is consumed by
the boundary that takes it (SPEC 11.2), so those seconds go to `advance` or to
the choice that follows, never to both.

**Looks.** SPEC 7 keeps presentation out of the book, and 3 is one
answer to where it goes instead, not the answer. A native host writes its
own, down to the labels for its own buttons in each language the book
declares.

**Accessibility.** The list in 4 is what the web export gives a reader
without any work by the author. A native host owes its readers the same list
in its own platform's terms. The protocol hands it what that needs and
nothing more: a choice is a label and an index, never a rendered button.

## 7. Two ways to play: a book, and an episode
A book is normally read from its start to one of its endings. It can also be
one episode inside something larger: an app holds a map, a party and a
clock, and at some point on that map a book is entered, one passage is
played, and the app takes over again.

It needs nothing the language does not already have, and that is deliberate.
The book does not know which of the two is happening, in exactly the way it
does not know which output it becomes (6). An entry point is a node, and
a book already declares nodes. What comes back is variables, an inventory
and code words, and a book already declares those too. Adding `episodes:` to
the frontmatter would put the host's business into the book, and a book does
not know which output it becomes. That is the same reasoning L025 rests on
(SPEC 19): what differs between outputs is settled where the output is built,
never declared in the story.

So an episode is four calls the host already has:

```
story.load(save);          // the character, as the app has been keeping it
story.go(node);            // in at the passage the map points to
…                          // choose, attack, advance: the episode is played
story.save();              // out, with everything it changed
```

Four things are worth knowing before you write that loop.

**Load first, then go.** `go` jumps, it does not set out: it rolls no stats,
so a reader who arrives by `go` alone has none and dies of the first blow.
The save carries them, which is why it goes first.

**The save is per book.** `load` refuses a save whose `story` does not match
(SPEC 15), and rightly so: every field in it is keyed against one book's nodes and
choice ids. Carrying a character from one book to the next is therefore not
a load but a transfer. The host opens the next book normally, takes the save
it writes, copies over the fields both books share, and loads that. What the
two share is what they both declare, and nothing else travels: a stat the
next book has never heard of is not that book's business.

**The way out is a node, and the host already knows node names.** It chose
the one it went in at. So it watches `view.node` after every command and
stops when it sees one of its own exits, and `config.death.goto` in the story
JSON names the one the book itself calls dying. Nothing needs to be declared
for this, and nothing should be: which nodes are exits depends on the map,
not on the book.

**A new edition is another book.** Bumping `version:` changes what a save is
keyed against, so the save a reader has stops loading, which is the strictness
of 15 doing its job. In a shop it is also a reader losing a playthrough to an
update they never asked for. A host that ships editions therefore decides
between two answers: keep the previous story JSON in the app and let anyone
mid-playthrough finish there, or carry the character across as above and let
the position go. The refusal tells it which situation it is in, because a
save from a newer runtime is refused too and wants a different answer (SPEC 15). There
is no third answer where the old position survives, because the ids it points
at are the old edition's.

The other half of this is what the app knows and the book only reads, and
that half is SPEC 10's: a map's weather, a distance, a party's standing
with a faction are host facts, declared `holds:` where they are a state
rather than a duration (SPEC 10.1). What the episode changes is variables, and it
comes back in the save. The test is SPEC 9's, unchanged: if the book
writes it, it is a variable, and if the book only reads it, it is a fact.

## 8. The host protocol
One command goes in, the whole view comes out, both as plain JSON. The shape
follows from what a language boundary costs: reading a dozen members of 2
one at a time is a dozen crossings for one page, and a turn should be one.

```json
{ "cmd": "choose", "index": 1 }
```

```json
{ "ok": true, "did": null,
  "view": { "lang": "de", "node": "crypt.chamber", "text": [ "…" ] } }
```

| command                  | fields  | what it does                              |
| ------------------------ | ------- | ----------------------------------------- |
| `state`                  |         | nothing; answers with the view            |
| `begin`                  | `picks` | answers the setup blocks and sets out     |
| `choose`                 | `index` | takes a choice                            |
| `advance`                | `host`  | a boundary: brings host values in 11    |
| `use`                    | `id`    | uses an item, honouring its `when:`       |
| `equip`                  | `id`    | equips a weapon or a piece of armour      |
| `attack`, `luck`, `flee` |         | a combat round, the luck test after a hit, running away |
| `undo`                   |         | back to before the last root choice (SPEC 15.1) |
| `language`               | `lang`  | switches language and repaints            |
| `save`                   |         | answers with the save of SPEC 15 in `did` |
| `load`                   | `save`  | takes a save back                         |
| `seed`                   | `value` | sets the random stream                    |
| `go`                     | `node`  | jumps; for chapter pickers, not for storytelling |

`did` carries what a command returned and the view does not show: the round
a fight just played, whether a luck test came off, `false` from a `use`
whose `when:` was not met, the save from `save`. Where there is nothing to
add, it is `null`.

A command that fails answers `{ "ok": false, "error": "…" }` instead of
throwing. An exception crossing a language boundary arrives as a crash or as
an empty string, and neither tells a host what went wrong. A failed command
leaves the story untouched, so the next one is answered normally.

The view is what 2 offers one member at a time, collected: `lang`,
`languages`, `setup`, `node`, `title`, `ended`, `text`, `choices`, `stats`,
`facts`, `inventory`, `memory`, `combat` and `canUndo`. Two of them are
resolved on the way out, because a host should not have to repeat a lookup
the runtime already makes. Setup labels arrive as one string in the reading
language rather than one per language, each with the `key` that `begin`
takes back, so a host never has to know which of the three spellings of
SPEC 7 an option used. And a fight arrives with the enemy's full stamina
beside its current one, so a bar has both halves without reading the config.

Text arrives as paragraphs with their classes, exactly as 2 delivers it.
An image is an entry in that same list, carrying `image` and `alt` where a
paragraph carries `text`: a host walks one list in order and tells the two
apart by which field is there. It is not a part inside a text run, because a
picture sits between paragraphs, not inside a sentence (SPEC 5.9). What a host
makes of a class, or of a picture, is the host's own business. One story, one
logic, as many surfaces as there are hosts.

## 9. The native bundle
`story-weaver bundle book.yaml --out dir` writes what a native host needs:

- `story.json`, the story of 17.1 as data, which the host can also read
  itself, for a chapter list, a cover or the back of the book (`meta.blurb`);
- `story-weaver.js`, the runtime and the protocol of 8 as one script, with
  the module keywords removed, because the engine it runs in has no loader.

`--minify` is the pass of 1, unchanged. The view of 3 is not in
the bundle: a native host draws its own. A book with images is these files
plus those images, per principle 6, copied into the same directory together
with whatever `@2x` and `@3x` files stand beside them (SPEC 5.9). A host resolves
an `image` path against that directory and picks the resolution its screen
wants.

The script defines one name with two functions on it, and nothing else,
because that is what a bridge carries without a wrapper per member:

```js
storyWeaver.start(storyJsonText, optionsJsonText);   // -> the first view, as text
storyWeaver.send(commandText);                       // -> one answer, as text
```

Strings in, strings out. That is what a `JSContext` on Apple platforms and a
`WebView` on Android both speak. Anything richer is a wrapper written twice.

## 10. Inside a foreign game loop
The hosts of this section so far share one assumption: the reader acts, and
then the program waits. A game engine does not wait. It has a loop of its
own, running many times a second, and a book living inside it has to fit
that loop rather than the other way round. Four rules make that work. None of them is new,
but an engine programmer will look for them here.

**A frame is not a boundary.** This is the rule that costs a bug when it is
missed. Every boundary computes facts and runs events (SPEC 11.2), so calling
`advance` once per frame runs every scheduled event sixty times a second,
and relief scheduled for turn three hundred arrives in five seconds.
`advance` is for handing over time that has actually passed, typically once
when the program comes back to the reader after being away. Between two
boundaries the page is stable on purpose: an engine may draw it as often as
it likes, and reading `current` costs nothing and changes nothing.

**A book runs on one thread and holds its own state.** The runtime is a
plain object with no locking, no timers and nothing asynchronous, and every call
returns before the next one starts. Two playthroughs are two instances,
which is also how a program plays two books at once, or the same book for
two readers. They share nothing but the story JSON, which is read-only after
loading.

**The book never calls out.** There is no external function, and that is a
decision, not a gap. Principle 8 says a fact is a pure function of its
state, and a book that could call the program around it could ask it
anything, including a different answer each time, and the guarantee that a save
replays to the same story would be gone. The way in is a host fact (SPEC 10), the
way out is the save (SPEC 15), and both are data, not control. A program that
wants a book to trigger something watches for it: a variable it set, a code
word it noted, the node it reached.

**Nothing in a book measures real time.** Principle 7 again, and it is what
makes a book fit any loop at all. A turn-based engine advances the book's
clock by whatever a turn is worth, a real-time one hands over seconds, and a
replay hands over the same numbers as last time and gets the same story
back. The runtime never learns which of the three it is in.

What an engine has to write itself is the loop around those calls: when to
enter, what to draw, when to hand over time, and what to do with the save
that comes back. 7 is the shape of that loop for the case where a
book is one episode among many.

## 11. Boundaries and facts
If you embed a book in an app or a website, that app is the host, and this is
the part of the API it talks to. Facts are SPEC 10, boundaries SPEC 11. The calls of 2 stay as they
are, and these three are what a host needs to bring time in and read the
snapshot back out.

```
story.advance(host);        // a boundary: take host values, compute, run events
story.facts;                // the published snapshot, read-only
story.current;              // { node, title, text, choices, stats, facts, ended }
```

`advance` is the only way host values enter. You do not need to call it around
every turn: `begin` and `choose` perform a boundary themselves. `advance`
exists for a host that wants to bring time in without the reader having chosen,
say when the app returns to the foreground after an hour. A host value is
consumed by the boundary that takes it (SPEC 11.2), so a host feeding real time
calls `advance` and then lets the reader choose,
rather than trying to hand the same seconds to both.

Nothing in the runtime reads a clock. A host that wants real time measures it
and passes it in. That is what makes a scripted replay reproducible: the same
inputs always play the same story.
