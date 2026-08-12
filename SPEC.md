# inkle-md, draft 0.7

Welcome. inkle-md is a gamebook language written in Markdown. It takes its
story logic from ink, its syntax from Markdown, and it adds a fixed RPG layer
modelled on the 1980s gamebooks. You write in a plain text file that stays
readable in any editor and on GitHub. When you have read this document, you
will be able to write anything a Fighting Fantasy or Lone Wolf volume needed.

Here is a quick tour of what the language gives you. Keywords are English.
Combat is built in, so a fight needs no custom code. A book can span several
files, and one file points into another with a dotted reference. The export is
a single file, and it stays one file: how a book carries images is still open,
so no book has them yet. Translations carry text but not logic, and a book
holds no presentation, only story. On top of the story sits
a layer of facts, values the book can read but never write. Events change
values and never move the story somewhere else. Places live in a table and are
addressed by index. Game time is an ordinary variable the book advances
itself, durations are relative rather than pinned to an epoch, and there is no
calendar. Each of these ideas has its own section later, where you will meet
it properly.

And here is the road ahead. Sections 1 to 3 set the ground: the principles,
what this language keeps from ink and what it replaces, and how a project is
laid out. Sections 4 to 9 are the language itself: the narrative text, the
built-in functions, the character sheet, combat, and how the runtime saves and
restores a game. Sections 10 to 12 describe the tools that keep a book
honest: the parser, the linter, and the web export. Section 13 is a complete
small book you can read in one sitting. Sections 14 to 20 add the reality
layer: facts, boundaries, events, state and undo, places, and the runtime
calls behind them. Section 21 says why the parser and the linter check what
they check. Sections 22 to 24 close the document with open points, next steps,
and the change notes.

## 1. Principles

Nine principles shape everything that follows. You will meet each of them
again in a later section, so a short version of each is enough here.

1. **Where Markdown already has a spelling, use it.** A heading is a node,
   one addressable passage of the story, like a numbered section in a printed
   gamebook. A link is a divert, the jump that sends the reader to another
   node. A list item is a choice.
2. **One concept, one spelling.** Where ink offers three ways to do a thing,
   one survives. Where a character carries several meanings, one survives.
   You never have to guess which variant an author meant.
3. **Declare in the frontmatter, narrate in the text.** The frontmatter is
   the block at the top of a file where a book declares its setup. Everything
   below it is story. No configuration in the middle of prose.
4. **State is a flat object.** No call stack in the save. A save is JSON you
   can read and, if it comes to it, repair by hand.
5. **Randomness is reproducible.** Seed plus counter in the save. Load the
   same save twice and the dice fall the same way.
6. **The export is one file, plus the images a book links to.** No framework,
   no network access at runtime: an image is a relative path next to the
   export, never a URL. A book without images stays a single file, which is
   the case the target size in section 12 is written for.
7. **The book holds no time.** A clock is a variable a book declares and
   advances itself. The runtime never interprets its unit. Turn-based and
   real-time books are the same engine with a different thing feeding the
   clock.
8. **A fact is a pure function of its state.** A fact is a value the runtime
   computes for the book. Same state, same value, today and in a year. A fact
   never reads a clock, never draws a random number, never remembers anything
   between calls, and never reaches outside the state it is given.
9. **Facts are read-only to the book.** The story chooses where and when to
   look; reality supplies the value. What the reader changes is a variable,
   not a fact.

Principles 7 to 9 come to life in section 14, where the test that separates a
fact from a variable is written out. If the distinction feels abstract right
now, that is fine; it will click there.

Choosing Markdown has a price, and it is fair to name it. The official
`inklecate` compiler cannot check these files, and the ink documentation
applies only by analogy. Our compiler is the only authority, so it needs
precise errors with line numbers and a test suite from day one. Sections 10
and 11 exist for that reason.

## 2. What makes ink dense, and what replaces it

ink is a fine language, but three of its habits make it hard to read cold.
This section names them, and it says what inkle-md does instead. You do not
need to know ink to follow along; each point starts with the ink habit and
ends with the simpler rule you actually write.

- **`{ }` carries six meanings** in ink: print a variable, alternatives,
  conditional text, if/else, switch, visit counts. Which one applies is
  decided by a character far inside the braces, so you read to the middle
  before you know what you are looking at.
  Here: printing, alternatives and conditional text stay inline; branching is
  an indented block. Switch is gone. Section 4.7 states the disambiguation
  rule that makes this decidable in one pass, for the compiler and for you.
- **Four kinds of divert** (`->`, `-> x ->`, `->->`, `<-`) that look alike and
  behave very differently. A divert is the jump that moves the story to
  another passage. Here: one divert, one arrow.
- **`[...]` inside a choice** splits button text from follow-on text, at three
  possible positions with three different results. Here: the link text is the
  button, everything after the link is follow-on text. One rule, no cases.

## 3. Project layout and imports

Before you write your first scene, it helps to know where everything lives.
This section shows the two shapes a book can take: one file for a short story,
or a folder of files for a longer one. You can start small and grow later.

### 3.1 Single file

The simplest book is a single `.md` file. At the very top sits the YAML
frontmatter, a small block of settings between two `---` lines. Below it, the
story begins. For a short book, this is all you need.

**A single-file book has no namespace.** A namespace is a prefix that says
which file an id belongs to, and with only one file there is nothing to tell
apart. So ids stay bare everywhere: in diverts, in `start:`, in `death.goto`,
in `visits()` and in the `node` and `visits` fields of a save. A dot in a
reference is an error there (E040). If you add a second file later, you will
qualify your references, which is a mechanical rewrite the linter can point at.
That moment is also why `as:` exists in 3.2.

### 3.2 Multi-file project

When your book grows, you split it into chapters. The layout looks like this:

```
my-book/
  book.yaml         # everything the frontmatter would hold
  start.md
  forest.md
  crypt.md
```

`book.yaml` takes over the role of the frontmatter. It carries the
declarations of section 6 plus the file list:

```yaml
title: The Thornwood
version: 1.4.0
start: start.begin          # qualified id of the first node
chapters:
  - start.md
  - forest.md
  - crypt.md
  - file: appendix/bestiary.md
    as: beast               # namespace override
```

Chapter files may carry their own frontmatter, but only `title:`. The
namespace is set in `book.yaml` and nowhere else, because `book.yaml` already
owns the file list; `namespace:` in a chapter file is E011. Declarations that
affect the whole book (stats, inventory, items, combat, enemies, setup,
death, undo, strings)
belong in `book.yaml` and are an error anywhere else (E012). The reason is
principle 3: one place to look. `facts:`, `events:` and `places:` (15, 17, 19)
are book-wide in exactly the same way, and E012 rejects them in a chapter file
like the rest.

`start:` is optional and defaults to the first node of the first chapter. So a
book that simply begins at the beginning does not have to say so.

### 3.3 Namespaces and references

In a multi-file project, every file is a namespace. You get the namespace name
from the file name without extension (`crypt.md` becomes `crypt`), lowercased,
with spaces, slashes and dots replaced by hyphens. Or you pick your own name
with `as:` in the chapter list, as `beast` did above. Ids derived from a
heading are slugged the same way, so a title like "The Crypt, Pt. 2" can never
produce a second dot.

Here is how references work across that boundary:

- Node ids are unique **within their file**.
- Inside a file, `-> chamber` refers to that file's `chamber`.
- Across files, `-> crypt.chamber`. Exactly one dot: namespace, then id.
- If a bare reference does not resolve locally, it is an error, never a silent
  search of other files. Ambiguity is not resolved by proximity.

In a multi-file project the qualified form is used everywhere an id appears
outside its own file: diverts, choice links (`[Go down](#crypt.chamber)`),
`visits()`, `turns_since()`, `goto:` and `start:` in `book.yaml`, and the
`node`, `visits` and `seen` fields of a save. A single-file book keeps all of
these bare, per 3.1.

Namespaces do not nest. A path has at most one dot. If a book ever outgrows
that, the answer is a longer `as:` alias, not a second level.

### 3.4 Languages

A book may exist in several languages at once. The structure is shared and
only the text differs, so a reader can switch language mid-game without losing
their place. You declare the languages in `book.yaml`:

```yaml
languages:
  default: de
  available: [de, en]
chapters:
  - start.md
  - crypt.md
```

From the second language on, each one gets a directory named after it, holding
the same chapter file names: `de/start.md`, `en/start.md`. A book that declares
a single language keeps its chapters where they are, because naming the
language a book is written in should not cost a directory level. A book without
a `languages:` block has exactly one language, named `default`.

**The default language owns the logic. Translations carry text only.** A
translated file is a catalogue: headings that name the node, paragraphs in the
order the node prints them, and list items in the order the node offers them.
It has no diverts, no conditions, no assignments, no directives, and its list
items carry no links. A translated node looks like this:

```markdown
# The Iron Gate {#gate}

The gate closes the crypt off to the north.

The key turns as though it had been waiting for you.

Without the key the gate stays what it is.

* Take the key
* Back to the light
```

Paragraphs replace paragraphs and list items replace button labels, each in
source order, counted as two separate streams so that nesting never has to be
mirrored. Conditional arms, gather text and combat exit text are paragraphs
like any other. A translation with a different count is E071, and a node the
default language does not have, or does not translate, is E070.

Because there is one structure, the ids of 9.1 line up, and those ids are what
`taken` and `alts` in the save are keyed by. Translated headings therefore
need an explicit `{#id}`: a derived id would follow the translated title and
drift apart from the original.

**A translation may override a whole node** where a language needs different
logic, not just different words: a plural that only one language branches on, a
form of address that depends on a stat. Write the node with logic, exactly as
in the default language, and it replaces that node entirely for that language.
E071 does not apply to an overridden node, and the linter says so (L019),
because its choice and alternative ids are then its own; what that means for a
language switch is stated in 12.1.

The runtime carries the language in the save as `lang` and can switch it at
any point, including mid-combat: outside overridden nodes nothing but the text
changes.

### 3.5 Scope of everything else

One last question before we start writing: what is namespaced, and what is
shared? Only node ids are namespaced. Variables, inventory, memory words and
visit counts are global to the book. This keeps the save flat (section 8).

## 4. The narrative text

This is where the writing begins. In this section you learn everything a page
of your book is made of: nodes, diverts, choices, gathers, varying text,
branching, assignments and functions. Each piece is small, and together they
carry a whole story.

One ground rule first. Indentation is two spaces, everywhere. Tabs are an
error, not a style preference, because indentation carries meaning here.

### 4.1 Nodes

A node is a numbered section of your gamebook: the place a reader lands, reads,
and chooses from. You write one as a Markdown heading:

```markdown
# The Crypt {#crypt}
## The Second Chamber {#chamber}
```

`#` is a node, `##` a subnode. The heading text is the title for humans; the
id in `{# }` is the name used by diverts. Headings and subheadings are
structure for readers only, and both produce plain nodes for the compiler. So
you can organize your file however reads best.

You may leave the id out, and one is derived from the title. That is fine for
throwaway nodes and unwanted in a published book, because renaming the title
then breaks every divert. The linter warns (L005).

`###` and deeper are not nodes; they are headings inside prose. Use them freely
to structure a long passage.

### 4.2 Diverts

A divert is a jump to another node, the "turn to 137" of a printed gamebook.
When it happens without a choice, it sits alone on a line:

```markdown
-> chamber
-> crypt.chamber
-> END
```

The first form jumps within the file, the second across files, as you saw in
3.3. `-> END` ends the story. A node that neither diverts nor offers a choice
is an error, not a silent stop (E110). Every path through your book has to
lead somewhere, even if that somewhere is the end.

### 4.3 Choices

Choices are the moments your reader decides. You write them as Markdown list
items:

```markdown
* [Open the door](#hall) You press the latch down.
+ [Look around](#room)
* {skill > 8} [Bend the bars apart](#gate)
* [Run](#flight)
```

Line by line, here is what you are looking at:

- `*` is once-only, `+` is sticky. A once-only choice disappears after the
  reader takes it; a sticky one stays available. Both are Markdown bullets, so
  a renderer shows a list.
- **The marker requires a following space.** `*The wind howls.*` and
  `**No!**` are emphasis, not choices. This is Markdown's own rule, and it is
  why nesting uses indentation rather than ink's `**` and `***`.
- The link text is the button. Everything after the link is text printed after
  the choice is taken. The button text is not repeated; an author who wants it
  repeated writes it twice.
- `{ condition }` before the link makes the choice conditional. It goes before
  the link so that a reader skimming the file sees first whether an option
  appears at all. A condition asks what is true, it does not roll: an option
  that appears or vanishes by dice flickers whenever the page is drawn again.
  Put the roll inside the choice, where the reader can see what it decided,
  which is what L020 checks.
- Nesting is by indentation, at most three levels:

```markdown
* [Ask the innkeeper]() He wipes out a mug.
  * [Ask about the road]() "North, but not at night."
  * [Ask about the tower]() He says nothing.
  ---
  You put a coin on the counter.
* [Leave](#road)
```

`[Text]()` with an empty target means: stay here, then show the next level.
This is ink's weave with Markdown indentation: a conversation that branches
and rejoins without leaving the page. The empty link renders as a link that
goes nowhere, rather than one that jumps to the top of the page.

### 4.4 Gathers

A gather is where separate threads meet again: the reader asked about the road
or the tower, and either way the scene continues with the coin on the counter.
You write it as a line of `---` at the indentation of the choices it gathers.
Rendered it is a horizontal rule; read aloud it is "the threads join again
here". An id is optional: `--- {#after-inn}`.

A gather must follow a choice or a choice's indented block, never a paragraph:
`---` under a paragraph turns that paragraph into a heading in every Markdown
renderer. The compiler rejects it (E120).

### 4.5 Paragraphs

A paragraph runs to the next blank line, exactly as in Markdown. The line
breaks an author uses to keep the source readable are not breaks in the text,
so you can wrap a paragraph at any width and it still arrives as one
paragraph. A translation counts paragraphs the same way (3.4).

### 4.6 Varying text

Sometimes a line should change from one visit to the next, or depend on what
the reader carries. Varying text puts those small variations inline, inside
curly braces:

```markdown
{For the first time|Once again|Yet again} you stand before it.
{&A crack|A crunch|Silence} in the undergrowth.
{!A raven calls.|}
{~Left|Right|Straight on}
{has("lantern"): The light reaches far.|It is pitch dark.}
You have {gold} gold pieces left.
```

In order: a sequence steps through its options and stays on the last; a cycle
`&` wraps around; a once-only `!` shows each option once and then falls
silent; a random `~` picks one; a conditional `:` chooses by what is true; and
a bare expression like `{gold}` prints its value. Alternatives inside
alternatives do not exist, so each brace stays simple enough to read at a
glance.

### 4.7 Branching

When more than a phrase depends on a condition, you branch whole blocks of
text. Branching is multi-line, by indentation, never with `-` at the start of
a line, so that nothing collides with choices:

```markdown
{ gold >= 10 }
  The innkeeper nods and points up the stairs.
  -> room
{ gold >= 3 }
  He points at the stable.
  -> straw
{ else }
  He points at the door.
  -> alley
```

The conditions are tried from top to bottom, and the first true one wins, with
`{ else }` catching whatever falls through.

You may wonder how the compiler tells a branch header from the varying text of
4.6, since both start with `{`. **Disambiguation rule.** A line beginning with
`{` is inline text if any of these hold: the first character inside is `&`,
`!` or `~`; the contents contain `|` or `:`; or no indented line follows.
Otherwise it is a block header. This keeps `{!A raven calls.}` and a bare
`{gold}` on their own line meaning what they look like.

### 4.8 Assignments

An assignment changes the state of the world: coins spent, wounds taken, a key
pocketed. It starts with `~`:

```markdown
~ gold = gold - 3
~ stamina -= 2
~ take("silver key")
```

Operators: `+ - * / %`, `== != > < >= <=`, `and or not`. Word forms only.
Numbers are integers. No floating point, no string comparison.

`~` is always at the start of a line, never mid-line. Execution follows source
order, so

```markdown
~ gold -= 3
You have {gold} coins left.
```

prints the reduced amount. What you change first, you see next. Inside a
choice, assignments go on their own indented lines below it.

### 4.9 Marking a kind of text

```markdown
The letter is written in a shaky hand. {.letter}
```

`{.name}` at the end of a paragraph says what kind of text this is, not what
it should look like. The view layer decides whether a letter is indented,
boxed or italic. There is no other formatting control. Images are a decided
but unbuilt part of the language; 22.5 says what is still open about them.

### 4.10 Functions

When the same few assignments appear in many places, you give them a name. A
function is a node declared with `fn`:

```markdown
# fn heal(amount)
~ stamina = min(stamina + amount, stamina_max)
~ return stamina
```

The declared name is the id; a function node carries no `{# }` (E011). You
call it as `{heal(4)}` in text or `~ heal(4)` as a statement, and it is
resolved in the local namespace first and qualified as `crypt.heal(4)` across
files. No reference parameters, no divert targets as parameters. A function is
called, never visited, so a divert to a function node is an error (E042).

## 5. Built-in functions

Expressions in your story can call a small set of functions that the runtime
brings along. They cover dice, checks, the inventory, code words and a little
bookkeeping about where the reader has been. The table below is your reference
for all of them: the left column shows how you call a function, the right
column says what it does. You do not need to memorise it; come back whenever
you wonder whether something is already built in.

| Function | Meaning |
|---|---|
| `roll(n, sides)` | Sum of n dice with `sides` faces |
| `random(min, max)` | Integer in range, both bounds inclusive |
| `test_luck()` | A check against `luck`, then `luck` drops by one, never below zero |
| `test(stat)` | A check against the stat, with nothing spent |
| `has(item)` / `take(item)` / `drop(item)` | Inventory |
| `take(item, n)` | Grants n uses of a consumable |
| `uses(item)` | Uses left, 0 when the item is absent |
| `use(item)` | Applies the item's effect, spends one use, returns true or false |
| `equip(item)` / `equipped(item)` | Equip a weapon or armour, and test whether that item is the equipped one |
| `remember(word)` / `knows(word)` / `forget(word)` | Code words, Lone Wolf style |
| `visits(node)` | How often the node has been entered |
| `turns()` / `turns_since(node)` | Turns total, turns since that node |
| `choice_count()` | Number of choices currently visible |
| `place(id)` | The index of a declared place, resolved at compile time (19.2) |
| `min(a,b)` / `max(a,b)` / `abs(a)` | Arithmetic |

Two of these functions, `test()` and `test_luck()`, perform what the table
calls **a check**. A check is the classic "Test your Luck" moment from the
old gamebooks: you roll dice and compare the result to a stat. Here is the
rule in full. A check rolls `checks.dice` and compares it to the value. With
`succeeds: at-most`, the roll has to come in at or under the value, which is
the Fighting Fantasy rule and the default; with `at-least` it has to reach it.
Both `test()` and `test_luck()` go through the same rule, so they cannot drift
apart, and both consume the dice stream of section 8.

You tune the rule in the frontmatter, under `checks:`. This snippet shows the
default settings written out:

```yaml
checks:
  dice: "roll(2,6)"      # the default
  succeeds: at-most      # at-most or at-least
```

The defaults give you a feel for the odds: a stat of 10 succeeds about 62% of
the time and a stat of 7 about 17%. A book with a d10 table instead writes
`dice: "roll(1,10)"`.

A few of the inventory functions deserve a closer look. `take()` fails
silently when the inventory is full; `has("...")` after it is the way to
check. Item and code word names are plain strings, compared case-insensitively
after trimming; they appear only as arguments, never as values, which is why
the ban on string comparison in 4.8 costs nothing.

`has(x)` is exactly `uses(x) > 0`. A non-consumable counts as one use, and
taking one that is already held changes nothing. Beyond the functions, four
read-only variables come built in: `in_combat`, `weapon_attack`,
`weapon_damage` and `armour_defence`. You will meet them again in the combat
chapter, section 7.

## 6. Frontmatter: the character sheet

The frontmatter is the YAML block at the top of your book. Think of it as the
character sheet and the rulebook rolled into one: it declares the stats, the
starting inventory, the items, the enemies and the house rules for combat and
checks. Everything the story later does arithmetic on starts its life here.
The example below is a complete frontmatter for a small Fighting Fantasy style
book; the sections after it walk through every part.

```yaml
title: The Thornwood
author: ...
version: 1.4.0
start: start.begin

stats:
  skill:    { name: Skill,   start: "roll(1,6) + 6",  max: start }
  stamina:  { name: Stamina, start: "roll(2,6) + 12", max: start }
  luck:     { name: Luck,    start: "roll(1,6) + 6",  max: start }
  gold:     { name: Gold,    start: 12 }
  rations:  { name: Rations, start: 10 }

inventory:
  slots: 8
  start: [sword, leather-armour, lantern, provisions]

items:
  sword:         { name: Sword, kind: weapon }
  axe:           { name: Battleaxe, kind: weapon, attack_bonus: 1, damage_override: 3 }
  leather-armour:{ name: Leather Armour, kind: armour, defence: 1 }
  lantern:       { name: Lantern, kind: gear }
  provisions:    { name: Provisions, kind: consumable, uses: 10,
                   effect: "stamina = min(stamina + 4, stamina_max)",
                   when: "not in_combat" }
  potion-skill:  { name: Potion of Skill, kind: consumable, uses: 1,
                   effect: "skill = skill_max" }

setup:
  - title: Choose your weapon
    pick: 1
    from:
      - { label: Sword,    item: sword }
      - { label: Battleaxe, item: axe }
  - title: Choose five disciplines
    pick: 5
    from:
      - { label: Camouflage,  remember: CAMOUFLAGE }
      - { label: Sixth Sense, remember: SIXTH_SENSE }
      - { label: Healing,     remember: HEALING }

combat:
  attack: "skill + roll(2,6) + weapon_attack"
  damage: "max(weapon_damage, 2) - armour_defence"
  rule: higher-wins
  luck_in_combat: true

enemies:
  goblin:     { name: Goblin,     skill: 5, stamina: 6, flee_after: 3 }
  cave-troll: { name: Cave Troll, skill: 9, stamina: 11 }

death:
  when: "stamina <= 0"
  goto: crypt.death

undo:
  depth: 10

checks:
  dice: "roll(2,6)"
  succeeds: at-most

strings:
  combat.hit:   "You wound {enemy}."
  combat.taken: "{enemy} wounds you."
  combat.tie:   "The blades meet and nothing comes of it."
```

Start with `stats:`. Every stat becomes a global variable, so once you declare
`stamina` here you can write `stamina -= 2` anywhere in the story. `max:
start` means "the opening roll is also the ceiling", the Fighting Fantasy
rule, and exposes `<key>_max` as a read-only variable. The key is the
identifier the story does arithmetic on; `name:` is what a reader sees and
takes a language table like any other reader-visible field. Without a `name:`
the key is shown as it stands.

One thing you will not find in the frontmatter: nothing here describes
presentation. How a stat is drawn, what the inventory panel is called, what
the attack button says, which font the page uses: all of that belongs to the
view layer of section 12, which knows about screens. A book that carries its
own layout stops being portable to the next one. `strings:` is the exception
that proves it - it holds only lines the story tells, such as who wounded
whom, and not one button label.

`setup:` is character creation, the "choose your equipment before you set out"
page of the old books. The runtime shows each block in order before the first
node, each one a "pick `pick` from this list". A pick grants an item
(`item:`), a code word (`remember:`) or both. That covers the weapon and
potion choice of Fighting Fantasy, the five disciplines of Lone Wolf and the
spell list of Sorcery!. Without `setup:` the story starts immediately.

`death:` is your safety net, so you never have to write "if you have died,
turn to 400" by hand. `death.when` is evaluated after every assignment and
every combat round; when it becomes true the runtime diverts to `death.goto`.

`combat:` and `enemies:` are the house rules for a fight, and section 7 walks
through them one by one. The example above leaves out `combat.flee_cost`,
which is what running away takes off your stamina, because leaving it out is
how you get the Fighting Fantasy value of two.

Books travel, so translation is built in. Any field a reader can see may be a
language table instead of a scalar, in `title:`, item `name:`, setup titles
and labels, enemy `name:` and every entry of `strings:`:

```yaml
items:
  sword: { name: { de: Schwert, en: Sword }, kind: weapon }
```

A scalar means the same text in every language. A table missing a declared
language is E072.

That brings us back to `strings:`. It holds the lines the combat resolver
narrates, which you cannot write by hand because they happen round by round.
The runtime ships English defaults and a book overrides what it needs; the
list in the example above is complete. `{enemy}` is the only placeholder. A
book written in another language should override all of them, which is what
L017 checks.

`facts:`, `events:` and `places:` belong in the frontmatter too, and have
sections of their own: 15, 17 and 19.

### 6.1 Items

`items:` is optional. An item that is never declared is just its own name, a
key or a rope, which keeps short books free of bookkeeping. A declared item
gains a display name and a kind. There are four kinds, and each one tells the
runtime what the item can do:

- `weapon`: `attack_bonus:` and `damage_override:` surface as the read-only
  variables `weapon_attack` and `weapon_damage`, so the combat formula can
  name them. Exactly one weapon is equipped at a time.
- `armour`: `defence:` surfaces as `armour_defence`. Exactly one is equipped.
- `gear`: carried, tested with `has()`, nothing automatic.
- `consumable`: has `uses:` and an `effect:`, an assignment run when the item
  is used. `when:` restricts when it may be used; `in_combat` is a built-in
  variable for exactly this. The last use removes the item.

The runtime shows the inventory as a list and offers Use and Equip itself, so
eating provisions or drinking a potion needs no choice written by you.
`slots:` counts entries, not uses, so ten provisions occupy one slot.

Two things the linter catches for you: an item in `inventory.start` or in a
`setup:` block that is neither declared nor a bare string is an error (E060),
and an unknown `kind:` is E061.

## 7. Combat

A fight is one directive with indented exits. An exit is a name followed by
either a plain divert (an arrow that sends the story to another node) or the
choice form of 4.3, so you write the button label and the follow-on text in
the spelling you already know:

```markdown
!combat goblin
  win  -> crypt.treasure
  lose -> crypt.death
  flee [Run for the stairs](#forest.clearing) You leave your shield behind.
```

The three exits behave differently, and the difference is who decides. `win`
and `lose` are outcomes, not decisions, so a link text there is printed
rather than shown as a button. `flee` is a decision, so its link text is the
button the player sees once fleeing becomes possible. Without a link text the
view layer names the button itself.

The fight itself runs on the formulas you declared under `combat:` in the
frontmatter. The runtime resolves it round by round: both sides roll
`combat.attack`, the higher total costs the loser `combat.damage` stamina,
never below zero, a tie costs nothing. Nothing is added behind your back:
equipment reaches the fight only through `weapon_attack`, `weapon_damage` and
`armour_defence`, and a formula that does not name them ignores equipment
entirely. Both formulas are evaluated for the enemy too, where the equipment
variables read zero, so `armour_defence` only ever protects the player.
With `luck_in_combat`, the player may test luck after each hit, with the usual
consequences (more damage dealt on a lucky hit, less taken on a lucky escape).
`flee` appears as an exit once `flee_after` rounds have passed. Getting away
costs something, and what it costs is yours to decide. `combat.flee_cost` is
an expression like the other two, evaluated at the moment the player flees;
its result is taken off stamina, never below zero:

```yaml
combat:
  attack: "skill + roll(2,6) + weapon_attack"
  damage: "max(weapon_damage, 2) - armour_defence"
  flee_cost: "2"
```

Leave `flee_cost` out and it is `2`, the Fighting Fantasy rule, so a book that
wants that rule writes nothing. Write `0` and running away is free. Write
`roll(1,6)` and it is a gamble. Write `max(4 - armour_defence, 0)` and heavy
armour buys you a cheaper retreat. The expression sees the same variables the
other combat formulas see, and a malformed one is E130 like any other.

When several enemies come at once, list them in sequence:
`!combat goblin, goblin, cave-troll`.

Consumables whose `when:` allows it can be used between rounds from the
inventory panel, which is how a potion mid-fight works without you writing
anything.

The rules for the exits: `win` is required. `lose` is optional and defaults
to `death.goto`. `flee` is an error unless the enemy declares `flee_after`
(E150).

This directive fixes one rule system, and that is deliberate. If you want a
different one, you write combat by hand with `roll()`, variables and a sticky
choice, and never use the directive.

## 8. Runtime and save state

This section, and the ones that follow it, speak mostly to people building tools: a runtime, an editor, a save manager. If you are here to write a gamebook, you can skip ahead with a clear conscience and come back if you ever wonder what happens under the hood.

A save is a single JSON object. It captures everything a reader's playthrough has accumulated, so that closing the book and opening it again feels like never having left. Here is a complete example, taken mid-adventure:

```json
{
  "version": 1,
  "story": "thornwood@1.4.0",
  "seed": 1837465,
  "rolls": 42,
  "node": "crypt.chamber",
  "vars": { "gold": 9, "stamina": 14, "skill": 11, "luck": 7 },
  "inventory": { "sword": 1, "silver key": 1, "provisions": 7 },
  "equipped": { "weapon": "sword", "armour": null },
  "memory": ["KRAKEN"],
  "visits": { "crypt.crypt": 2, "forest.clearing": 1 },
  "lang": "de",
  "taken": { "crypt.chamber:c0": 1 },
  "alts": { "crypt.crypt:a0": 2 },
  "picks": { "crypt.crypt:a0": 1 },
  "visible": [0, 1],
  "screen": [{ "node": "crypt.chamber", "at": [0], "class": null }],
  "fight": null,
  "host":   { "elapsed": 700 },
  "facts":  { "day_length": 24, "elapsed": 700, "is_night": 1 },
  "events": { "fired": { "relief_arrives": true },
              "last":  { "wound_worsens": 120 } },
  "turn": 37,
  "seen": ["start.begin", "forest.clearing", "crypt.crypt"],
  "undo": []
}
```

Let's walk through the parts that are not self-explanatory.

`taken` counts how often each choice has been picked. That count is what makes `*` once-only: a choice the reader has already taken simply stops being offered. `alts` holds the position of each sequence and cycle, so an alternative picks up where it left off. Both are keyed by the ids the compiler hands out (9.1).

`story` is the title and version of the book that wrote the save. Loading rejects a save whose `story` does not match the running book, and there is a good reason for that strictness: every other field is keyed against a specific book's nodes and choice ids, so a save from another version would resume as plausible-looking garbage. This also gives you a lever as an author: bumping `version:` in the frontmatter is the way to declare old saves invalid.

`at` is the position inside the current node, written as an index path. `[2, 0, 1]` reads as "op 2, its item 0, op 1 inside it". It is worth saying what `at` is not: it is not a call stack. There are no return addresses and no frames of their own, which is exactly what principle 4 rules out.

A cluster of fields exists purely so the page can be repainted without replaying anything: `screen` names the text ops that are visible, `picks` records what each alternative on them settled on, `visible` says which choices were offered, and `fight` lists the enemies still standing. Why store all this instead of re-deriving it? Because a condition may roll dice. Re-deciding any of it on a repaint would move the random stream and change the page under the reader. Reloading, undoing and switching language all repaint from these fields.

`host`, `facts` and `events` belong to section 18, which also explains why `facts` is in a save and not in a checkpoint.

`rolls` is the counter of the random stream: roll n follows deterministically from `seed` and n. This buys you two things. Any playthrough can be replayed exactly, and reloading a save produces the same roll as before rather than a fresh one.

### 8.1 Undo

A book may offer undo back to the last **root choice**, which is a choice at indentation level zero. Nested choices, gathers and combat rounds are not undo points. The effect is that undo never unwinds a single line of dialogue, only the decision that led into it.

You switch it on in the frontmatter:

```yaml
undo:
  depth: 10        # number of root choices that can be taken back, 0 disables
```

Here is how the runtime makes that work. It writes a checkpoint immediately before executing a level-zero choice. A checkpoint is the complete flat state of section 8, with two things left out. The undo stack itself is left out, so the stack cannot grow into itself. And `facts` are left out, because they are recomputed on restore: a checkpoint is always taken at a boundary, and principle 8 guarantees the recomputation gives the same answer (18.2).

Checkpoints ride along in the save under `"undo": [ ... ]`, which is why `depth` is capped rather than unlimited. The stack rides in the save and stays there when a save is handed on. A reader who carries a save to another device can take back the same choices they could have taken back where they left. A save is one thing in one format, and an export that quietly dropped a field would be a second one.

`rolls` is restored with everything else. That has a pleasant consequence: repeating the same choice reproduces the same dice, so undo cannot be used to re-roll a failed luck test. It only lets a reader take a different path. That is also why undo past a death is allowed: it costs nothing that determinism has not already closed off.

Two small loose ends, and then you know everything about saves. Node references in a save are qualified exactly as the book writes them: the example above is a multi-file project, while a single-file book saves `"node": "chamber"`. And on loading, unknown fields are ignored, but a `version` higher than the runtime knows is refused with a clear message rather than partially applied.

## 9. The two JSON formats

This section is written for people building tools around inkle-md, such as a runtime or an exporter. If you are writing a book, nothing here changes how you write; feel free to skim or skip.

There are exactly two JSON formats in the whole system: the story JSON the compiler emits, and the save JSON from section 8. Let's look at each in turn.

### 9.1 Story JSON, the compiler output

The compiler turns your Markdown into a single JSON file. The design goal is that you can read and check it by hand, which is the deliberate contrast to ink's container bytecode. Here is what a small book looks like after compilation:

```json
{
  "format": 1,
  "meta": { "title": { "de": "…" }, "version": "1.4.0", "start": "start.begin",
            "languages": ["de", "en"], "default": "de",
            "files": ["de/start.md", "de/crypt.md"] },
  "config": { "stats": {}, "inventory": {}, "items": {}, "setup": [], "combat": {},
              "enemies": {}, "death": {}, "undo": {}, "strings": {},
              "facts": {}, "events": {},
              "places": { "variable": null, "table": [] } },
  "nodes": {
   "de": {
    "crypt.chamber": {
      "title": "The Second Chamber",
      "file": 1, "line": 42,
      "body": [
        { "op": "text", "parts": ["A silver key lies on the sarcophagus."] },
        { "op": "choices", "items": [
          { "id": "chamber:c0", "label": ["Take the key"],
            "body": [
              { "op": "text", "parts": ["Something sighs in the dark."] },
              { "op": "call", "fn": "take", "args": [{ "lit": "silver key" }], "line": 44 }
            ] },
          { "id": "chamber:c1", "sticky": true, "label": ["Back to the light"],
            "target": "start.begin" }
        ] },
        { "op": "divert", "target": "start.begin" }
      ]
    }
   },
   "en": { "crypt.chamber": { "…": "same structure, translated text" } }
  }
}
```

A story file is shipped to every reader, so nothing redundant is emitted. Four rules keep it lean:

- file names live once in `meta.files`; a node carries its index, and the ops
  inside it carry a bare line number;
- `line` appears only where something can fail at runtime, which means on
  assignments, calls, combat, conditional choices and branch arms;
- defaults are left out. A choice is once-only, unconditional, targetless and
  without a body unless it says otherwise, and `target` is a plain string, or
  `0` for the end of the story;
- a run of plain text is a string rather than `{"t":"lit","v":"…"}`.

For the two-chapter example, these four rules together make the output 40% smaller than the verbose form, and easier to read by eye, which was the point of not shipping ink's bytecode.

Expressions are small prefix trees: `{ "op": ">=", "args": [{ "var": "gold" }, { "lit": 10 }] }`.

The ops you will meet are `text`, `choices`, `branch`, `divert`, `combat`, `assign`, `call`, `return` and `label` (a named gather). Text is a list of parts: `lit`, `print`, `alt` and `cond`. `-> END` is `{ "end": true }` in place of a `ref`.

You may notice there is no op for weave, and that is on purpose. A run of choices at one depth is one `choices` op, and whatever follows it in the same container is the gather. A choice with `"target": null` runs its own body and then falls through to exactly that.

One last convention ties this format to the save format: anything the runtime has to remember carries an id. Choices are named `node:c<n>`, alternatives `node:a<n>`. That is what `taken` and `alts` in the save are keyed by.

### 9.2 Save JSON

Section 8 already showed you this one in full. It is versioned, and unknown fields are ignored.

## 10. Parser

This section describes how the compiler reads your files. It is aimed at people who want to build or fix the tooling; as an author you will mostly meet it through the error messages listed in 10.3, and it is fine to treat the rest as background reading.

The grammar is line-oriented: the kind of each line is decided by its first non-space characters. Only three cases are ambiguous, and all three are resolved in the sections above.

### 10.1 Pipeline

The compiler works in seven steps, each finishing before the next begins:

1. **Read** files listed in `book.yaml`, or the single file. Assign namespaces.
2. **Frontmatter** parsed as YAML, validated against the schema of section 6.
   Expression strings (`start:`, `when:`, `attack:`, `damage:`, `death.when`,
   a derived fact's `value:`, an event's `when:` and `counter:`) go through
   the expression parser at this point, not at runtime. `effect:` and an
   event's `do:` are parsed as assignments, the same production as a `~` line
   without the `~`, and are the only YAML fields that are statements rather
   than expressions.
3. **Line scan** per file: classify every line, build the indentation tree.
   Tabs, odd indentation and indentation jumps of more than one level are
   errors here.
4. **Parse** each block into ops; expressions via a Pratt parser.
5. **Resolve** ids: collect all node ids per namespace, then resolve every
   divert, choice link, `visits()`, `turns_since()`, `goto:` and `start:`.
6. **Check** the rules of section 11.
7. **Emit** story JSON.

A useful consequence of step 2: everything that can be malformed in your frontmatter fails at compile time, long before a reader ever sees the book.

### 10.2 Line kinds

This table is the whole classifier. Given the first characters of a line, you can read off what the parser will make of it:

| Starts with | Kind | Note |
|---|---|---|
| `# ` / `## ` | node / subnode | `# fn name(...)` is a function node |
| `### ` and deeper | text | heading inside prose |
| `* ` / `+ ` | choice | the space is required |
| `---` alone | gather | must follow a choice (E120) |
| `-> ` | divert | |
| `~ ` | assignment or call | |
| `!name` | directive | `!combat` today; `![` is not a directive |
| `{` | text or block header | rule in 4.7 |
| anything else | text | but see directive bodies below |

There is one exception to "the first characters decide everything". Inside the indented block of a directive the classification changes: a line is an exit name followed by either `-> target` or `[label](#target)` plus optional follow-on text, and anything else is an error (E152). This is the only place where indentation changes what a line means, and it is why directives are a closed list rather than an extension point.

### 10.3 Error codes

Errors abort compilation. Every message carries file, line, column and the offending text, so you always know where to look. The codes are stable: tools may match on them, and books may reference them in their build setup.

| Code | Error |
|---|---|
| E010 | Frontmatter missing, malformed, or not at the top of the file |
| E011 | Unknown key in frontmatter |
| E012 | Book-wide declaration in a chapter file |
| E020 | Tab used for indentation |
| E021 | Indentation not a multiple of two |
| E022 | Indentation jumps more than one level |
| E030 | Duplicate node id within a namespace |
| E031 | Duplicate namespace |
| E040 | Reference with more than one dot, or any dot in a single-file book |
| E041 | Unresolved reference |
| E042 | Reference to a function node from a divert |
| E060 | Undeclared item used where a declaration is required |
| E061 | Unknown item `kind:` |
| E062 | Unknown key in `strings:` |
| E070 | A node exists in one language but not in another |
| E071 | A node's choices or alternatives differ between languages |
| E072 | A language table is missing a declared language |
| E100 | Choice without a link |
| E110 | Node with neither divert nor choice |
| E120 | Gather not preceded by a choice |
| E121 | Nesting deeper than three levels |
| E130 | Malformed expression |
| E131 | Unknown function or variable |
| E132 | Wrong argument count |
| E140 | Function node without `~ return` on some path |
| E150 | `flee` exit for an enemy without `flee_after` |
| E151 | `!combat` with an unknown enemy or without a `win` exit |
| E152 | Malformed line in a directive block |
| E160 | Unknown fact `source:` |
| E161 | Fact missing a field its source requires |
| E162 | `fixed` value or `fallback` outside the declared `range:` |
| E163 | Fact reading a later-declared fact, or a cycle among facts |
| E164 | Assignment to a fact |
| E165 | `place()` with an unknown id |
| E166 | Place `enter:` naming an unknown node |
| E167 | Event without `do:` |
| E168 | Event with both `once:` and `every:` |
| E169 | Fact expression that is not pure: dice, or a call that changes state |
| E170 | Fact name colliding with a stat or variable |
| E171 | `places.variable:` naming something that is not a declared stat |

### 10.4 Test suite

Every example in this document is a test case. Each error code needs at least one file that triggers it and one near-miss that must not, so the compiler stays honest in both directions. The three collision rules (4.3 space after the marker, 4.4 gather after a choice, 4.7 inline versus block) get their own table-driven tests, because they are where a Markdown dialect breaks first.

## 11. Linter

Like the parser chapter before it, this one is mostly for tool builders and for anyone setting up a build. As an author you meet the linter as a friendly proofreader: it points at things that are probably mistakes, without stopping you.

That is the key difference to section 10: warnings do not abort compilation. `--strict` turns them into errors, and CI uses `--strict`. The codes are stable, just like the error codes, so tools can match on them.

| Code | Rule | Level |
|---|---|---|
| L001 | Node unreachable from `start` | warning |
| L002 | Node reachable but with no path to any `-> END` | warning |
| L003 | Choice that can never appear (condition statically false) | warning |
| L004 | Sticky choice in a node with no other exit | warning |
| L005 | Node id derived from the title rather than declared | warning |
| L006 | Variable written but never read, or read but never written | warning |
| L007 | Enemy declared but never fought | info |
| L008 | Item taken but never tested with `has()`, or tested but never granted | warning |
| L009 | Code word remembered but never tested, or tested but never set | warning |
| L010 | Stat declared but never used | info |
| L016 | Item declared but never granted anywhere | warning |
| L017 | `strings:` key left at its English default while others are overridden | warning |
| L018 | Consumable without `effect:`, or `effect:` on a non-consumable | warning |
| L019 | A node a translation overrides, so its state is language-specific | info |
| L020 | A choice whose condition rolls dice, so it flickers between visits | warning |
| L011 | Line longer than 80 characters in the source | info |
| L012 | Choice text duplicated within one node | warning |
| L013 | Node with more than seven choices | info |
| L014 | `death.goto` unreachable by any other route (dead-end check) | info |
| L015 | Prose in a node that only diverts (unreachable text) | warning |
| L021 | Event that can never fire: its threshold exceeds the longest path | warning |
| L022 | Event whose assignment is never read | warning |
| L023 | Fact never read anywhere | info |
| L024 | Fact depending on a variable that is never written | warning |
| L025 | Content unreachable when every host fact takes its fallback | warning |
| L026 | Divert into a place's `enter:` node without setting the index | warning |
| L027 | Recurring event without `max_catchup:` | info |
| L028 | Gather diverting back into its own node while every choice can run out | warning |

If you only remember two of these, make it L008 and L009. They are the ones that actually catch bugs in a gamebook: a key that is never granted, a code word that is never set. Both need the whole book to judge, so they run after resolution across all namespaces.

Beyond the warnings, the linter also emits a **reachability report**: node count, unreachable nodes, endings found, longest and shortest path from start to an ending, counted over choices without evaluating conditions. That report is the closest thing to proofreading a branching book.

Two of the warnings above lean on that same walk, and it helps to see how. The reachability walk behind the report is run a second time with every host fact at its `fallback:`, and L025 reads the difference between the two runs. The report itself carries the numbers of the first run: a reader with no host gets a smaller book, and saying so is the warning's job, not the report's. A book whose good ending needs a host is a book that quietly loses content when it is played as one file. L021 needs nothing new beyond the first run: the longest path answers the question a branching book cannot be proofread for, whether the relief that was scheduled for turn three hundred can arrive at all.

## 12. Web export

Once your book lints clean, you will want to hand it to readers. That is what
the export is for. `inkle-md export book.yaml --out play.html` produces a
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
for the copy you hand out. The minifier is part of the exporter, written here
rather than installed, like everything else in this project.

One case adds to the single file. A book that links images is that file plus
those images, resolved relative to it, per principle 6. Nothing else ever
lands beside the export. How a book writes an image, and what the export does
with a path that leaves its own directory, is open point 22.5; until it is
settled, no book has images and the export is one file.

### 12.1 Runtime API

The runtime is the piece of JavaScript that actually plays the story: it
holds the state, evaluates conditions and hands the host the text to show. It
is one class, so the same code serves the export and any embedding. If you
want your book inside your own app or website, you talk to this:

```js
const story = new Story(json, { lang: 'de' });
story.setup;                          // creation blocks, or null
story.begin(picks);                   // answers the setup, rolls the stats
story.choose(index);                  // take a choice
story.advance(host);                  // a boundary: take host values, compute, run events
story.facts;                          // the published snapshot, read-only
story.current;                        // { text: [...], choices: [...], stats, facts }
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
story.save();                         // save JSON per section 8
story.load(save);
story.seed(n);
```

Most of these calls do what their name says. Language switching deserves a
closer look, because it touches the save. `setLanguage` re-renders the
current node in the new language and keeps the whole save: the ids of 9.1 are
shared between languages, so `taken` and `alts` carry over. In a node where
one language overrides (3.4), the ids are that language's own, so on a switch
the keys that do not exist on the other side are kept in the save but ignored
while reading; switching back restores them. Nothing is discarded, because a
reader who switches twice should not lose a once-only line they already saw.

Text is delivered as an array of paragraphs, each with its CSS classes, so
the host decides how to render. Combat is exposed as state plus `attack()`
and `flee()`, never as a blocking loop, so your interface stays in charge of
its own event loop.

### 12.2 Presentation

Section 6 keeps looks out of the book, so the looks have to live somewhere.
They live here, and only here: the export ships a stylesheet with CSS custom
properties for font, measure and four colours each for light and dark, plus a
rule per `{.name}` a book uses, plus the labels for its own buttons and
panels in each language the book declares. None of that is readable from the
story JSON, which is the point of section 6's rule.

Themes follow `prefers-color-scheme` and can be overridden by the reader.

Saves live in `localStorage` under one key per book, plus export and import
as a JSON string, so a reader can move a game between devices without an
account.

The sheet also lists the code words the reader has been told to note, in the
order they were remembered - the Lone Wolf convention, where noting the word
is the reader's own act. A book that wants a secret keeps it out of
`remember()` and in its structure.

### 12.3 Accessibility

Accessibility is part of the export, not a later pass. Every exported book
gives you all of this without any work on the author's side:

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

## 12.4 Playing without a browser

You do not need the HTML export to read your own book. `inkle-md play
<entry>` walks a book in the terminal, which is how an author reads their own
text before anyone else does. Two flags make it a tool rather than a toy:

- `--script 1,2,a,a` walks a fixed route and prints where it ended up. With a
  seed, that route is exactly reproducible, which is what turns "it broke
  somewhere in the crypt" into a bug report.
- `--json` returns the same as data: node, text, choices, stats, inventory,
  code words, facts, the dice counter, and a log of which move led where.
  `lint` takes the flag too.
- `--host elapsed=60` supplies host values, arriving at every boundary the
  walk performs. A boundary is the point where the book pauses and asks the
  outside world for values, and a host fact is a fact whose value that
  outside world supplies; both are section 15's territory. Without the flag a
  host fact stays at its `fallback:`, which is the same book a reader gets
  offline.

Beyond walking one route, you can let the machine play for you. `inkle-md
simulate <entry> --runs 300 --host elapsed=60` plays many games with
pseudo-random choices and reports the endings, the dead ends and the average
length. A balance problem shows up there long before it shows up in a
playthrough: the fear stat of the house example punished every second visit
to the same room, and three hundred games said so in a second.

The simulated reader is curious, not random: at a crossroads an option not
yet tried in this run comes first, and only when every visible option has
been tried once does the walk fall back to cycling. A purely cyclic walker
never leaves a hub room with a sticky "go back" choice, and no human reads a
gamebook that way. `endings` counts only runs that actually reached an
ending; a run that hits the step limit is reported as unfinished, not as an
ending at whatever node it happened to stand in.

For `simulate`, `--host` is the policy for how the counters and `elapsed`
advance per turn. Without it nothing scheduled is ever tested: a book whose
relief arrives at turn three hundred needs a walk that reaches turn three
hundred, and a book that measures seconds needs someone to hand it seconds.

There is a third way in, for tools rather than people. `inkle-md mcp` serves
the same three checks - lint, play, simulate - as MCP tools over stdio, so an
agent can playtest a book against the real runtime instead of parsing
terminal output. The server speaks JSON-RPC 2.0, one message per line, and
needs no dependency.

## 13. Full example

Here is a complete little book, start to finish. There is nothing new in it:
every line uses something you have already met. The frontmatter is section
6's character sheet, the dice come from section 5, the choices and varying
text from section 4, the combat from section 7. Read it once as a story, then
once more with the walkthrough below.

```markdown
---
title: The Crypt Under the Thorn
start: begin
stats:
  skill:   { start: "roll(1,6) + 6",  max: start, ui: bar }
  stamina: { start: "roll(2,6) + 12", max: start, ui: bar }
  luck:    { start: "roll(1,6) + 6",  max: start, ui: bar }
  gold:    { start: 12, ui: number }
inventory:
  slots: 8
  start: [sword, lantern, provisions]
items:
  sword:      { name: Sword, kind: weapon }
  lantern:    { name: Lantern, kind: gear }
  provisions: { name: Provisions, kind: consumable, uses: 10,
                effect: "stamina = min(stamina + 4, stamina_max)",
                when: "not in_combat" }
combat:
  attack: "skill + roll(2,6)"
  damage: 2
  rule: higher-wins
enemies:
  goblin: { name: Goblin, skill: 5, stamina: 6, flee_after: 3 }
death:
  when: "stamina <= 0"
  goto: death
undo:
  depth: 10
---

# At the Forest Edge {#begin}

The path forks before a thorn hedge. {&A crack|A crunch|Silence} in the
undergrowth.

* [Left, into the thicket](#thicket)
* [Right, towards the brook](#brook)
* {has("lantern")} [Into the gap under the hedge](#crypt) You squeeze through.

# The Crypt {#crypt}

{!Cold air meets you.|You know the way by now.}

A goblin starts up out of an alcove.

!combat goblin
  win  -> chamber
  lose -> death
  flee [Back through the gap](#thicket) You scramble out, thorns tearing at you.

## The Second Chamber {#chamber}

A silver key lies on the sarcophagus.

* [Take the key]() Something sighs in the dark.
  ~ take("silver key")
  ~ remember("KRAKEN")
+ [Back to the light](#begin)
---
-> begin

# Dead {#death}

Your adventure ends here.
-> END
```

Now the same book again, this time as a checklist of what you have learned.

The frontmatter declares everything and narrates nothing, as principle 3
asks. Three stats are rolled with `roll()` at the start of the game, and
`max: start` pins each one to its opening value; `gold` starts at a plain
number. The inventory has eight slots and three starting items. The
provisions are a consumable with ten uses, an `effect:` that heals without
overshooting the maximum, and a `when:` that keeps them out of combat. The
combat block sets the attack formula and the damage for the whole book, the
goblin brings its own numbers and a `flee_after`, and the `death` block says
what state ends the game and where the story goes then. `undo` gives the
reader ten steps back.

Then the story. `# At the Forest Edge {#begin}` is a node, a heading with an
id, and `start: begin` in the frontmatter points at it. The
`{&A crack|A crunch|Silence}` is a cycling alternative from 4.6, so the
forest sounds different each time the reader comes back. The first two
choices use `*`, once-only; the third is guarded by `{has("lantern")}` and
only appears while the lantern is in the inventory, with a line of text that
prints after the choice is taken.

In the crypt, `{!Cold air meets you.|You know the way by now.}` is a
once-only alternative: the first visit gets the first text, every later
visit the second. The `!combat` block is section 7 in four lines: win and
lose are diverts, and the flee exit becomes available after three rounds
because the goblin declared `flee_after: 3`.

The second chamber shows a subnode and a small weave. `[Take the key]()` has
an empty target, so the story stays here, prints the sigh, and runs the two
indented assignments: `take()` puts the key in the inventory and
`remember()` notes a code word. The `+` choice is sticky, so going back to
the light never wears out. The `---` underneath is a gather; the thread that
took the key joins there and the divert sends it back to `begin`. The death
node ends the story with `-> END`, which is the explicit ending every path
must reach one way or another.

That is the whole language in one page. Everything after this section adds
the fact layer on top; nothing changes what you just read.

## 14. What is a fact, and what is a variable

Everything so far has been about variables: stats, gold, items, code words.
A variable is state the story owns and the reader changes by playing. The
sections from here to section 20 add a second kind of value, the fact. A
fact is something the book asks about rather than owns: a value computed
from state the world supplies, the way a gamebook might tell you to check
whether it is night before entering the graveyard.

Three of the principles from section 1 carry everything from here to section
20: the book holds no time, a fact is a pure function of its state, and
facts are read-only to the book. Those are principles 7 to 9. A book that
keeps all three can be replayed from a seed and a save, which is what the
rest of this document spends its rules on. Break any one of them and a
replay stops matching the game it replays: a book that reads a clock on its
own gives a different answer tomorrow, a fact that rolls dice gives a
different answer on the same day, and a fact the book could write to is not
a fact at all, just a variable wearing a costume.

When you design a book, you will meet values that could plausibly be either.
Here is the test that separates a fact from a variable, and the one to apply
when a case is unclear: does the reader change the world, or only which
slice of it we are looking at? The sun's height over a place is true whether
or not anyone stands there; the reader who travels changes where we look,
not where the sun is, so it is a fact. Air in a suit is not: it drains
because the reader wears the suit and breathes, so the reader is changing
the world, and it belongs in a variable.

The same test settles the practical cases. Gold is a variable, because
spending it changes the world. Whether the shop is open at this hour is a
fact, because the reader arriving does not move the shop's hours. If you are
still unsure, ask who would notice if the reader had never been there: a
value that would be the same anyway is a fact, and a value that only exists
because the reader acted is a variable.

## 15. Facts

Up to now, everything your book knows is something it wrote down itself: a variable you set, a stat you changed, a counter that ticked. A **fact** is different. A fact is a value your book looks up rather than stores. Think of the weather outside your window: you do not decide it, you glance at it. Some facts never change, some are computed from other values, and some arrive from the world outside the book. This section shows you how to declare all three.

### 15.1 Declaration

You declare facts once for the whole book. `facts:` is a book-wide declaration and belongs in `book.yaml` or the single file's frontmatter, per 3.2. Every fact carries a `source:`, the way every declared item carries a `kind:`. The `source:` tells the runtime where the value comes from.

```yaml
stats:
  time:     { name: Time, start: 0 }      # the clock is the book's own

facts:
  day_length: { source: fixed, value: 24 }
  elapsed:    { source: host,  range: [0, 604800], fallback: 0,
                name: { de: Verstrichen, en: Elapsed } }
  is_night:   { source: derived,
                value: 'time % day_length >= 20 or time % day_length < 6' }
```

You may wonder why `time` sits under `stats:` here. `time` above is a stat, not a fact, and that is principle 7: the clock is something the book declares and advances, and the runtime never learns what its unit means. Your book owns its own clock; facts are for the things it does not own.

Two fields work the same for every fact, whatever its source:

| Field      | Meaning                                                        |
| ---------- | -------------------------------------------------------------- |
| `source:`  | `fixed`, `host` or `derived`. Required.                        |
| `name:`    | Reader-visible name, a language table like any other. Optional. |

Each source then asks for its own fields:

| Source    | Required            | Notes                                     |
| --------- | ------------------- | ----------------------------------------- |
| `fixed`   | `value:`            | An integer literal, not an expression.    |
| `host`    | `range:`, `fallback:` | Supplied from outside at a boundary.    |
| `derived` | `value:`            | An expression, parsed at compile time.    |

A few rules keep declarations tidy. A fact name shares the namespace of variables and stats: a collision is E170. Facts are global to the book, like variables (3.5). An unknown `source:` is E160, a missing required field E161, and a `fixed` value or a `fallback` outside its own `range:` is E162.

Values are integers, per 4.8. A fact that wants a fraction states its unit smaller: minutes rather than hours, thousandths of a degree rather than degrees. A condition stores as `1` or `0`, which is what the save in 18.1 shows.

### 15.2 Reading a fact

Here is the good news: once a fact is declared, you already know how to use it. A fact is read wherever a variable is read: in text, in a choice condition, in a branch, in an event. There is no new spelling.

```
{is_night: The gallery lies in the dark.|Daylight falls through the hatch.}

* {is_night} [Turn in for the night](#camp.sleep)
```

Reading is all a fact does. Assigning to a fact is E164, and E164 comes before E131: a fact name is in scope, so without that order the error would never be the right one. A book that wants to change something declares a variable.

### 15.3 Derived facts

A derived fact is a value your book computes from values it already has. Think of it as a small formula with a name: you write the expression once and read the result everywhere.

A derived fact may read variables, stats, counters and facts declared **before** it. That gives a total order without a dependency solver, the same answer 4.7 gives to ambiguity: declaration order decides. A reference to a later fact, or a cycle, is E163.

There is one more promise a derived fact makes. A derived fact is a pure function of its state, per principle 8: from the same state you always get the same value. Dice and anything that changes state are E169, so `{ source: derived, value: 'roll(1,6)' }` does not compile. Without that check principle 8 would be a promise nothing keeps, and the test that computes each fact twice from an identical state would pass on a book that breaks it every second boundary.

This purity is not a limitation; it is where your book keeps interpretive control. The layer below hands out numbers; twilight is a definition, and the book writes its own:

```yaml
  dusk:      { source: derived, value: 'sun_elevation < 0 and sun_elevation > -6' }
  long_gone: { source: derived, value: 'elapsed > 259200' }
```

### 15.4 Host facts

A **host** is whatever runs your book: a reading app, a website, an export playing in a browser. A host fact is the one thing the language cannot compute for itself. The host supplies it at a boundary (16.1); a boundary, explained fully in section 16, is simply the moment the story moves from one page to the next. The runtime clamps the supplied value into `range:` and never reads anything on its own, which is what keeps principle 8 true.

What if there is no host, or the host stays silent? Without a host, or when a host supplies nothing, `fallback:` applies. A book therefore always plays: the single-file export of section 12 stays a complete game, and no book may require a network, per principle 6.

Exactly one host fact is defined by convention, because a book that wants elapsed real time should not invent its own name:

| Name      | Unit    | Meaning                                          |
| --------- | ------- | ------------------------------------------------ |
| `elapsed` | seconds | Time passed since the previous boundary          |

You can rely on this value behaving well. `elapsed` is never negative and is `0` at the first boundary. A clock that has moved backwards, a changed time zone and a resynchronised device all arrive as `0` rather than as a negative number, because a story clock that runs backwards produces states no book can be written against.

The value is not capped by the runtime. A reader who returns after a month gets the month. Capping is a book's decision and is written as a derived fact, where it is visible:

```yaml
  tick: { source: derived, value: 'min(elapsed, 3600)' }
```

Keeping the raw value alongside is what lets a book say "you were away for three days" while advancing its world by an hour.

## 16. Boundaries

The last section kept mentioning boundaries. Time to meet them properly. A **boundary** is the moment your story steps from one page to the next, like the instant between turning a page of a paper gamebook and reading the new one. Everything time-related in this language happens in that instant, and nothing happens between two of them.

### 16.1 What a boundary is

A boundary is the moment a node is entered and the moment a choice has been taken. Nothing else. Host values arrive there, facts are computed there, events run there.

Why so strict? Because it gives your reader a stable page. Between two boundaries the fact snapshot does not change. A page that offers an option cannot lose it while it is being read, which is the same promise L020 makes about dice.

**One boundary per completed transition.** A choice that runs a body and then diverts is one boundary, not two, and a chain of diverts arriving at the page the reader ends up on is still one. Concretely: `begin`, `choose`, `advance` and leaving a fight through one of its exits each publish exactly one snapshot. Without that rule an event with a `when:` and no counter would fire once or twice per click depending on whether the author happened to write a divert, which is a difference a reader can see.

Two moments deliberately have none. A **combat round** is not a boundary: the fight is one page, and an event firing between two swings would be a page contradicting itself mid-round. The **death page an event sent the reader to** is not one either, because the event that killed them would otherwise run again on the page it chose.

Where exactly does the boundary sit inside a choice? The boundary falls after the choice's own effects and before the page that follows them is built. `~ time += 5` in a choice is the departure; the arrival reads the clock it left behind. Follow-on text written on the choice itself belongs to the departure and renders before the boundary, which is the one place where text sees the older snapshot, and the reason 19.2 spells travel as an assignment on the choice rather than as something on the node it arrives at.

### 16.2 Order within a boundary

Inside that one instant, four things happen, always in the same order:

1. Host values are taken in and clamped.
2. Facts are computed in declaration order.
3. Events run in declaration order (17).
4. Facts are computed once more.

The fourth step exists for the events. The second pass is what events see reflected. It is a single pass, not a fixed point: two events at one boundary cannot chain through a derived fact, because nothing is recomputed between them. They can chain through a variable, because assignments take effect in order (4.8).

**Variables chain, facts do not.** An author will meet this rule once; it belongs in the error message, not only here.

Host values also come with an expiry date. A host value is **consumed** by the boundary that takes it in: afterwards the fact falls back to its `fallback:` until the next `advance`. `elapsed` is a duration since the previous boundary, so a `choose` that followed an `advance` without this rule would spend the same seconds a second time.

### 16.3 The published snapshot

The snapshot the view and every condition see is the one from step 4. A page that contradicted the events that had just run would be a bug the author could not fix.

### 16.4 Place changes

A change to the place index takes effect at the next boundary, not inside the node that made it. One page shows one sky.

## 17. Events

Sometimes the world should act on its own. A wound that worsens as time passes, relief that arrives after three hundred turns: you could write that condition into every node the reader might visit, or you could write it once. An **event** is that single place. It watches a condition at every boundary and, when the condition holds, changes state.

### 17.1 Declaration

`events:` is book-wide, like `facts:`. An event has a condition and an assignment. It has no text and no divert.

```yaml
events:
  relief_arrives:
    once: true
    when: 'turns() >= 300'
    do:   'remember("RELIEF")'

  wound_worsens:
    counter: 'turns()'
    every:   10
    max_catchup: 1
    when: 'has("wound")'
    do:   'stamina -= 1'
```

The first event fires a single time, the moment its condition first holds. The second is recurring: it is scheduled against a counter and fires every ten steps. These are the fields you can combine:

| Field          | Meaning                                                     |
| -------------- | ----------------------------------------------------------- |
| `once:`        | Fires at most once in a playthrough.                        |
| `counter:`     | An integer expression the event is scheduled against.       |
| `every:`       | Fires each time the counter has advanced by this much.      |
| `max_catchup:` | Most firings at one boundary. Default 1.                    |
| `when:`        | Condition. Optional; absent means always.                   |
| `do:`          | One assignment or call, the same production as a `~` line.  |

Two of these do not mix, and one is not optional: `once:` and `every:` together are E168. An event without `do:` is E167.

The point of an event is one declaration instead of the same condition in forty nodes. What it cannot do is speak or move the reader: it sets state, a node reads it and narrates. That keeps the translation rule of 3.4 intact, because all text stays in nodes. An event nudges the world; your nodes tell the reader about it.

### 17.2 Catching up

Picture a reader who puts the book down for a month and comes back. Their counter has jumped forward by a lot at a single boundary. A recurring event whose counter jumped forward would otherwise fire once per step. `max_catchup:` bounds that, and the anchor advances by the number of steps the counter actually took, so a bounded catch-up is not replayed at the next boundary: the missed firings are dropped, not queued. An event with `max_catchup: 1` whose counter jumped by fifty fires once and starts counting again from where the counter now stands.

Without a bound a book that was closed for a month wakes up dead. With one the author decides whether time away is dangerous or merely long.

The condition plays fair here too. A `when:` that is false costs the firings of that boundary but not the anchor: time passed whether or not the wound was there to worsen, so the event does not owe the reader fifty rounds of damage the moment they are finally wounded.

### 17.3 Death

One consequence follows from what you already know. `death.when` is evaluated after every assignment (6), and an event assigns. An event can therefore kill without the reader having done anything. That is intended, and a book that does not want it writes its condition so that it cannot.

## 18. State, save and undo

Facts and events need a place in the save file and an answer to the undo question. Both fit into what you already know from section 8; this section adds the details.

### 18.1 New fields

Three fields join the save:

```json
"host":   { "elapsed": 700 },
"facts":  { "day_length": 24, "elapsed": 700, "is_night": 1 },
"events": { "fired": { "relief_arrives": true },
            "last":  { "wound_worsens": 120 } }
```

`host` keeps the values the host supplied, `facts` keeps the computed snapshot, and `events` remembers which one-time events have fired and where each recurring event's anchor stands. A clock and a place index are ordinary variables and live in `vars`. Nothing else is added.

You might expect facts to be recomputed at load rather than stored. `facts` is a cache. It is in the save because a save may be written in the middle of a node, where variables have moved on since the last boundary; recomputing at load would then show the reader different numbers than the page they left. It is not in a checkpoint, because a checkpoint is always taken at a boundary (8.1) and principle 8 guarantees the same result.

### 18.2 Undo

A checkpoint carries `host` and `events` and omits `facts`, which are recomputed on restore.

Undo therefore takes back a firing. The counter returns to what it was, the condition is false again, and going forward again reaches the same event. That is section 8.1's rule unchanged: undo opens a different path, it does not undo a consequence.

One consequence is worth stating plainly. Story time is restored by undo, real time is not. A book that feeds its clock from `elapsed` lets a reader spend the same real seconds twice. In a single-player book this is harmless and deliberate, not a defect.

## 19. Places

A place is somewhere your book can be: the base camp, the ridge, the crypt.
This section shows how you declare your places once, in a small table, and how
the story then travels between them.

### 19.1 The table

You declare places in the book-wide frontmatter. Each place has an id you use
in the text and a name per language for the reader.

```yaml
places:
  variable: location
  table:
    - { id: base,  name: { de: Basis, en: Base },   enter: base.airlock }
    - { id: ridge, name: { de: Grat,  en: Ridge },  enter: ridge.arrival }
```

`enter:` is optional. It names the node a journey to that place arrives at,
where a node is one addressable passage of your book. If the node named there
does not exist, the linter reports E166.

`variable:` is optional too. It names the stat that holds the current place
index. Its whole job is to turn the travel warning L026 from a guess into a
check: nothing else reads it, and the runtime never sees it. A book that
declares it must declare the stat as well, or it is E171. A fact will not do
here, because the book writes this one, and facts are values a book only reads.

### 19.2 Using a place

The place a book is at is an ordinary variable holding an index. You never
write that number yourself. Instead you write `place("ridge")`, which resolves
to the index at compile time, so the linter can check the name for you. An
unknown id is E165.

Here is what travel looks like in a choice:

```
* [Set out for the ridge](#ridge.arrival)
  ~ location = place("ridge")
  ~ time += 5
```

Three lines, three familiar spellings: an assignment sets the new place, a
second assignment advances the clock, and the divert, the jump written in the
choice target, moves the reader to the arrival node. Travel is deliberately not
a directive of its own. Three spellings already exist for these three things,
and principle 2 forbids inventing a fourth for their combination. That keeps
the part only your story knows, such as how long the journey takes for a reader
who is injured or who found a horse, an ordinary expression you can shape
freely.

The pairing is where a slip is easy: you move the reader but forget the clock,
or the other way around. That is what L026 watches for. With `places.variable:`
declared, a travel is any assignment to that variable, however the index was
arrived at. Without it, the linter looks for an assignment whose value came
from `place()`, which reads the common spelling and misses a book that computes
its index. That is why L026 is a warning in both cases: it is exact about what
it saw, never about what the author meant.

## 20. Runtime API: boundaries and facts

If you embed a book in an app or a website, that app is the host, and this is
the part of the API it talks to. Two words carry this section. A boundary is
the moment between two turns when the story takes in values from the host,
recomputes what depends on them and runs any events that have come due. A fact
is such a computed value: the story derives it fresh at each boundary rather
than storing it.

The calls of 12.1 stay as they are. These three are what a host needs to bring
time in and to read the snapshot back out.

```
story.advance(host);        // a boundary: take host values, compute, run events
story.facts;                // the published snapshot, read-only
story.current;              // { text, choices, stats, facts }
```

`advance` is the only way host values enter. You do not need to call it around
every turn: `begin` and `choose` perform a boundary themselves. `advance`
exists for a host that wants to bring time in without the reader having chosen,
say when the app returns to the foreground after an hour. One thing to know
about the flow: a host value is consumed by the boundary that takes it (16.2).
So a host feeding real time calls `advance` and then lets the reader choose,
rather than trying to hand the same seconds to both.

Nothing in the runtime reads a clock. A host that wants real time measures it
and passes it in. That may seem roundabout, but it is what makes a scripted
replay reproducible: the same inputs always play the same story.

## 21. Why these checks exist

Every check has its formal home elsewhere: errors in the table of 10.3,
warnings in the table of section 11. This section tells the story behind the
ones you might otherwise take for arbitrary, so that when the linter speaks up
you know what it is protecting.

E169 rejects a fact expression that draws dice or changes state. A fact is
meant to be a pure computation, and principle 8 says so. Without this error the
principle is unenforced, and an unenforced principle is a comment.

L021 needs nothing new: the reachability report of section 11 already computes
the longest path through your book. The warning answers a question a branching
book cannot be proofread for by hand: can the relief you scheduled for turn
three hundred arrive at all, or does every path end before then? It stays
deliberately narrow. Only an event counted against `turns()` with a literal
threshold is checked, because a threshold that depends on the reader is not a
thing a static longest path can be compared against.

L025 protects the export. When your book is played as one standalone file,
there is no host to supply values, so every host fact falls back to its
default. A book whose good ending needs a host is a book that quietly loses
content in that setting, and this warning is how you find out before a reader
does.

L028 is about the one shape a hub room gets wrong. A gather is the point where
the paths of a node's choices come back together. A gather that sends the
reader back into its own node is a loop, and it is a survivable one only while
some choice is certain to be there on the next pass. Once every choice is
once-only or conditional, the node runs out of them, falls through to the
gather and arrives at itself with nothing left to offer. A sticky choice with
no condition is what makes the difference, which is why the warning asks for
exactly that and not for fewer once-only choices.

One check lives in the runtime rather than the linter: a divert chain is
finite. One transition may pass through a handful of nodes on its way to the
page the reader ends up on (16.1). A book that has not settled after a hundred
of them is looping, and the runtime raises an error naming the node it started
from. Without that bound, the loop L028 describes ends as a stack overflow, and
a stack trace tells an author nothing about which node to fix.

## 22. Open points

The language does not try to do everything at once. These are the ideas that
came up along the way and are not part of the language yet, together with where
each of them stands.

1. **Calendar and ephemeris.** Two further fact sources, `clock` and
   `ephemeris`, would turn an absolute instant and a place into a date or a
   sky. Both need an epoch, a fixed point in time to count from. A book would
   have to declare that epoch, and omitting it would only become an error once
   such a source is actually used. Out of scope here.
2. **Travel between places as an ephemeris input.** Once a sky depends on
   where the reader went, a fact is sampled at a story-chosen place. The
   test in section 14 already allows this, so the language would not have to
   change. What it costs the linter is untried.
3. **Events with a payload**, so that a caller could hand a duration to an
   event rather than assigning it first. The language keeps events free of
   arguments, so this was set aside. Worth revisiting if travel ever grows a
   spelling of its own.
4. **A second `max_catchup:` mode** that coalesces the missed firings into a
   single one, with the number of missed steps in a variable, rather than
   repeating the event once per step.
5. **Images.** The shape is settled: Markdown links them, `![alt](file)`
   with alt text required, and they are files next to the export rather than
   data embedded in it, per principle 6. Open is everything below that:
   whether a path may leave the export's own directory, what a translated
   catalogue does with an alt text, and what 12.3 promises a screen reader.
   Nothing of it is built, so no book has images yet.

## 23. Next steps

Of the open points in section 22, three have a natural order, and here it is.

1. Images per 22.5 come first: a line kind of their own, alt text as an error
   when it is missing, and an export that refuses a path pointing outside its
   directory. It is the only open point that changes what a book looks like on
   the page, which is why it leads.
2. Then the second `max_catchup:` mode of 22.4. The case to design it against
   is a book that is put down for a week, not a table of turns.
3. Calendar and ephemeris (22.1, 22.2) come last, and only once a book asks
   for them. They are the one open point that costs the language an epoch, and
   that price is worth paying only for a book that needs a date or a sky.

Everything these steps stand on is already built: grammar, parser and story
JSON per sections 10 and 9.1; the linter of section 11 with its reachability
report; facts and the two-pass boundary; the scheduler with its catch-up
anchor; places and L026; `play` and `simulate`, without which a book with
scheduled content cannot be tested at all; and three examples, one of which
puts facts, events, places and a clock through the acceptance test rather than
leaving them to the unit tests. Every example in this document is a test case.

## 24. Change notes

If you already know version 0.6 of the language, this table lists what 0.7
added, section by section, so you can jump straight to what is new.

### 0.6 to 0.7

| Section | Change                                                                 |
| ------- | ---------------------------------------------------------------------- |
| 1       | Principles 7 to 9 added, and section 14 with the test behind them.     |
| 5       | `place(id)` added to the built-in functions.                           |
| 6       | `facts:`, `events:` and `places:` added to the book-wide declarations, and therefore to what E012 rejects in a chapter file. |
| 8       | `host`, `facts` and `events` added to the save; 8.1 states that a checkpoint omits `facts`. |
| 9.1     | `config` gains `facts`, `events` and `places`.                         |
| 10.1    | Fact and event expressions are parsed in step 2, with the other frontmatter expressions. |
| 10.3    | E160 to E171 added to the error table.                                 |
| 11      | L021 to L028 added; the reachability walk is repeated with host facts at their fallbacks, and L025 reads the difference. |
| 12.1    | `advance` and `facts` added to the runtime API.                        |
| 12.4    | `play` gains `--host` to supply host values per boundary; `simulate` takes the same flag as its policy for how counters and `elapsed` advance per turn, without which no scheduled content is ever tested. |
