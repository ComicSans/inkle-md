# inkle-md, draft 0.7

A gamebook language written in Markdown: ink semantics, Markdown syntax, plus a
fixed RPG layer modelled on the 1980s gamebooks. The goal is that an author can
read this document in ten minutes and then write anything a Fighting Fantasy or
Lone Wolf volume needed, and that the source file stays readable in any editor
and on GitHub.

Decided on 2026-08-11: Markdown dialect rather than an ink subset, English
keywords, built-in combat, multi-file projects with dotted cross-file
references, no image support for now, translations that carry text but not
logic, and no presentation anywhere in a book.

Decided on 2026-08-12: a third layer named `facts`, read-only to the book;
events that assign and never divert; a place table addressed by index; game
time as an ordinary variable rather than a feature; relative durations rather
than an epoch; no calendar and no ephemeris.

Every section stands on its own: what a rule is, this document says, and it
says it where the rule lives. Section 24 is the one place that looks backwards,
and it is there for a reader coming from an older draft, not for a reader
learning the language.

## 1. Principles

1. **Where Markdown already has a spelling, use it.** A heading is a node, a
   link is a divert, a list item is a choice.
2. **One concept, one spelling.** Where ink offers three ways to do a thing,
   one survives. Where a character carries several meanings, one survives.
3. **Declare in the frontmatter, narrate in the text.** No configuration in
   the middle of prose.
4. **State is a flat object.** No call stack in the save. A save is JSON you
   can read and, if it comes to it, repair by hand.
5. **Randomness is reproducible.** Seed plus counter in the save.
6. **The export is one file, plus the images a book links to.** No framework,
   no network access at runtime: an image is a relative path next to the
   export, never a URL. A book without images stays a single file, which is
   the case the target size in section 12 is written for.
7. **The book holds no time.** A clock is a variable a book declares and
   advances itself. The runtime never interprets its unit. Turn-based and
   real-time books are the same engine with a different thing feeding the
   clock.
8. **A fact is a pure function of its state.** Same state, same value, today
   and in a year. A fact never reads a clock, never draws a random number,
   never remembers anything between calls, and never reaches outside the
   state it is given.
9. **Facts are read-only to the book.** The story chooses where and when to
   look; reality supplies the value. What the reader changes is a variable,
   not a fact.

Principles 7 to 9 are section 14, where the test that separates a fact from a
variable is written out.

The price of choosing Markdown: the official `inklecate` compiler cannot check
these files, and the ink documentation applies only by analogy. Our compiler is
the only authority, so it needs precise errors with line numbers and a test
suite from day one. Sections 10 and 11 exist for that reason.

## 2. What makes ink dense, and what replaces it

- **`{ }` carries six meanings** in ink: print a variable, alternatives,
  conditional text, if/else, switch, visit counts. Which one applies is decided
  by a character far inside the braces.
  Here: printing, alternatives and conditional text stay inline; branching is
  an indented block. Switch is gone. Section 4.7 states the disambiguation
  rule that makes this decidable in one pass.
- **Four kinds of divert** (`->`, `-> x ->`, `->->`, `<-`) that look alike and
  behave very differently. Here: one divert, one arrow.
- **`[...]` inside a choice** splits button text from follow-on text, at three
  possible positions with three different results. Here: the link text is the
  button, everything after the link is follow-on text. One rule, no cases.

## 3. Project layout and imports

### 3.1 Single file

A single `.md` file with YAML frontmatter at the very top, between two `---`
lines, followed by the story. Sufficient for a short book.

**A single-file book has no namespace.** Ids are bare everywhere: in diverts,
in `start:`, in `death.goto`, in `visits()` and in the `node` and `visits`
fields of a save. A dot in a reference is an error there (E040). Adding a
second file later means qualifying references, which is a mechanical rewrite
the linter can point at, and the reason `as:` exists in 3.2.

### 3.2 Multi-file project

```
my-book/
  book.yaml         # everything the frontmatter would hold
  start.md
  forest.md
  crypt.md
```

`book.yaml` carries the declarations of section 6 plus the file list:

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

`start:` is optional and defaults to the first node of the first chapter.

### 3.3 Namespaces and references

In a multi-file project, every file is a namespace. The namespace is the file
name without extension (`crypt.md` becomes `crypt`), lowercased, with spaces,
slashes and dots replaced by hyphens, or the explicit `as:` from the chapter
list. Ids derived from a heading are slugged the same way, so a title like
"The Crypt, Pt. 2" can never produce a second dot.

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
their place.

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
items carry no links.

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

Variables, inventory, memory words and visit counts are global to the book.
Only node ids are namespaced. This keeps the save flat (section 8).

## 4. The narrative text

Indentation is two spaces, everywhere. Tabs are an error, not a style
preference, because indentation carries meaning here.

### 4.1 Nodes

```markdown
# The Crypt {#crypt}
## The Second Chamber {#chamber}
```

`#` is a node, `##` a subnode. The heading text is the title for humans; the
id in `{# }` is the name used by diverts. Headings and subheadings are
structure for readers only, and both produce plain nodes for the compiler.

Without an explicit id, one is derived from the title. That is fine for
throwaway nodes and unwanted in a published book, because renaming the title
then breaks every divert. The linter warns (L005).

`###` and deeper are not nodes; they are headings inside prose.

### 4.2 Diverts

A divert with no choice sits alone on a line:

```markdown
-> chamber
-> crypt.chamber
-> END
```

`-> END` ends the story. A node that neither diverts nor offers a choice is an
error, not a silent stop (E110).

### 4.3 Choices

```markdown
* [Open the door](#hall) You press the latch down.
+ [Look around](#room)
* {skill > 8} [Bend the bars apart](#gate)
* [Run](#flight)
```

- `*` is once-only, `+` is sticky. Both are Markdown bullets, so a renderer
  shows a list.
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
This is ink's weave with Markdown indentation. The empty link renders as a
link that goes nowhere, rather than one that jumps to the top of the page.

### 4.4 Gathers

A line of `---` at the indentation of the choices it gathers. Rendered it is a
horizontal rule; read aloud it is "the threads join again here". An id is
optional: `--- {#after-inn}`.

A gather must follow a choice or a choice's indented block, never a paragraph:
`---` under a paragraph turns that paragraph into a heading in every Markdown
renderer. The compiler rejects it (E120).

### 4.5 Paragraphs

A paragraph runs to the next blank line, exactly as in Markdown. The line
breaks an author uses to keep the source readable are not breaks in the text,
so a paragraph may be wrapped at any width and still arrives as one paragraph.
A translation counts paragraphs the same way (3.4).

### 4.6 Varying text

```markdown
{For the first time|Once again|Yet again} you stand before it.
{&A crack|A crunch|Silence} in the undergrowth.
{!A raven calls.|}
{~Left|Right|Straight on}
{has("lantern"): The light reaches far.|It is pitch dark.}
You have {gold} gold pieces left.
```

Sequence, cycle `&`, once-only `!`, random `~`, conditional `:`, and printing.
Alternatives inside alternatives do not exist.

### 4.7 Branching

Multi-line, by indentation, never with `-` at the start of a line, so that
nothing collides with choices:

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

**Disambiguation rule.** A line beginning with `{` is inline text if any of
these hold: the first character inside is `&`, `!` or `~`; the contents
contain `|` or `:`; or no indented line follows. Otherwise it is a block
header. This keeps `{!A raven calls.}` and a bare `{gold}` on their own line
meaning what they look like.

### 4.8 Assignments

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

prints the reduced amount. Inside a choice, assignments go on their own
indented lines below it.

### 4.9 Marking a kind of text

```markdown
The letter is written in a shaky hand. {.letter}
```

`{.name}` at the end of a paragraph says what kind of text this is, not what
it should look like. The view layer decides whether a letter is indented,
boxed or italic. There is no other formatting control. Images are a decided
but unbuilt part of the language; 22.5 says what is still open about them.

### 4.10 Functions

```markdown
# fn heal(amount)
~ stamina = min(stamina + amount, stamina_max)
~ return stamina
```

The declared name is the id; a function node carries no `{# }` (E011). Called
as `{heal(4)}` in text or `~ heal(4)` as a statement, resolved in the local
namespace first and qualified as `crypt.heal(4)` across files. No reference
parameters, no divert targets as parameters. A divert to a function node is an
error (E042).

## 5. Built-in functions

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

**A check** rolls `checks.dice` and compares it to the value. With
`succeeds: at-most`, the roll has to come in at or under the value, which is
the Fighting Fantasy rule and the default; with `at-least` it has to reach it.
Both `test()` and `test_luck()` go through the same rule, so they cannot drift
apart, and both consume the dice stream of section 8.

```yaml
checks:
  dice: "roll(2,6)"      # the default
  succeeds: at-most      # at-most or at-least
```

With the default, a stat of 10 succeeds about 62% of the time and a stat of 7
about 17%. A book with a d10 table instead writes `dice: "roll(1,10)"`.

`take()` fails silently when the inventory is full; `has("...")` after it is
the way to check. Item and code word names are plain strings, compared
case-insensitively after trimming; they appear only as arguments, never as
values, which is why the ban on string comparison in 4.8 costs nothing.

`has(x)` is exactly `uses(x) > 0`. A non-consumable counts as one use, and
taking one that is already held changes nothing. `in_combat`, `weapon_attack`,
`weapon_damage` and `armour_defence` are built-in read-only variables.

## 6. Frontmatter: the character sheet

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

Every stat becomes a global variable; `max: start` means "the opening roll is
also the ceiling", the Fighting Fantasy rule, and exposes `<key>_max` as a
read-only variable. The key is the identifier the story does arithmetic on,
`name:` is what a reader sees and takes a language table like any other
reader-visible field; without it the key is shown as it stands.

**Nothing here describes presentation.** How a stat is drawn, what the
inventory panel is called, what the attack button says, which font the page
uses: all of that belongs to the view layer of section 12, which knows about
screens. A book that carries its own layout stops being portable to the next
one. `strings:` is the exception that proves it - it holds only lines the
story tells, such as who wounded whom, and not one button label.

`setup:` is character creation: the runtime shows each block in order before
the first node, each one a "pick `pick` from this list". A pick grants an item
(`item:`), a code word (`remember:`) or both. That covers the weapon and
potion choice of Fighting Fantasy, the five disciplines of Lone Wolf and the
spell list of Sorcery!. Without `setup:` the story starts immediately.

`death.when` is evaluated after every assignment and every combat round; when
it becomes true the runtime diverts to `death.goto`.

**Any field a reader can see may be a language table instead of a scalar**, in
`title:`, item `name:`, setup titles and labels, enemy `name:` and every entry
of `strings:`:

```yaml
items:
  sword: { name: { de: Schwert, en: Sword }, kind: weapon }
```

A scalar means the same text in every language. A table missing a declared
language is E072.

`strings:` holds the lines the combat resolver narrates, which the author
cannot write by hand because they happen round by round. The runtime ships
English defaults and a book overrides what it needs; the list above is
complete. `{enemy}` is the only placeholder. A book written in another
language should override all of them, which is what L017 checks.

`facts:`, `events:` and `places:` belong here too, and have sections of their
own: 17, 19 and 21.

### 6.1 Items

`items:` is optional. An item that is never declared is just its own name, a
key or a rope, which keeps short books free of bookkeeping. A declared item
gains a display name and a kind:

- `weapon`: `attack_bonus:` and `damage_override:` surface as the read-only
  variables `weapon_attack` and `weapon_damage`, so the combat formula can
  name them. Exactly one weapon is equipped at a time.
- `armour`: `defence:` surfaces as `armour_defence`. Exactly one is equipped.
- `gear`: carried, tested with `has()`, nothing automatic.
- `consumable`: has `uses:` and an `effect:`, an assignment run when the item
  is used. `when:` restricts when it may be used; `in_combat` is a built-in
  variable for exactly this. The last use removes the item.

The runtime shows the inventory as a list and offers Use and Equip itself, so
eating provisions or drinking a potion needs no choice written by the author.
`slots:` counts entries, not uses, so ten provisions occupy one slot.

An item in `inventory.start` or in a `setup:` block that is neither declared
nor a bare string is an error (E060); an unknown `kind:` is E061.

## 7. Combat

One directive, indented exits. An exit is a name followed by either a plain
divert or the choice form of 4.3, so the author writes the button label and
the follow-on text in the spelling they already know:

```markdown
!combat goblin
  win  -> crypt.treasure
  lose -> crypt.death
  flee [Run for the stairs](#forest.clearing) You leave your shield behind.
```

`win` and `lose` are outcomes, not decisions, so a link text there is printed
rather than shown as a button. `flee` is a decision, so its link text is the
button the player sees once fleeing becomes possible. Without a link text the
view layer names the button itself.

The runtime resolves it round by round: both sides roll `combat.attack`, the
higher total costs the loser `combat.damage` stamina, never below zero, a tie
costs nothing. Nothing is added behind the author's back: equipment reaches
the fight only through `weapon_attack`, `weapon_damage` and `armour_defence`,
and a formula that does not name them ignores equipment entirely. Both are
evaluated for the enemy too, where the equipment variables read zero, so
`armour_defence` only ever protects the player.
With `luck_in_combat`, the player may test luck after each hit, with the usual
consequences (more damage dealt on a lucky hit, less taken on a lucky escape).
`flee` appears as an exit once `flee_after` rounds have passed and costs two
stamina, the Fighting Fantasy rule.

Several enemies in sequence: `!combat goblin, goblin, cave-troll`.

Consumables whose `when:` allows it can be used between rounds from the
inventory panel, which is how a potion mid-fight works without the author
writing anything.

`win` is required. `lose` is optional and defaults to `death.goto`. `flee` is
an error unless the enemy declares `flee_after` (E150).

This fixes one rule system. An author who wants a different one writes combat
by hand with `roll()`, variables and a sticky choice, and never uses the
directive.

## 8. Runtime and save state

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

`taken` counts how often each choice has been picked, which is what makes `*`
once-only; `alts` holds the position of each sequence and cycle. Both are
keyed by the ids the compiler hands out (9.1).

`story` is title and version of the book that wrote the save, and loading
rejects a save whose `story` does not match the running book: every other
field is keyed against a specific book's nodes and choice ids, so a save from
another version would resume as plausible-looking garbage. Bumping `version:`
in the frontmatter is therefore also the way to declare old saves invalid.

`at` is the position inside the current node as an index path, `[2, 0, 1]`
being "op 2, its item 0, op 1 inside it". It is not a call stack: there are no
return addresses and no frames of their own, which is what principle 4 rules
out.

The rest is what the page is showing, so that reloading, undoing or switching
language repaints without replaying anything: `screen` names the text ops that
are visible, `picks` what each alternative on them settled on, `visible` which
choices were offered, and `fight` the enemies still standing. A condition may
roll dice, so re-deciding any of this on a repaint would move the stream and
change the page under the reader.

`host`, `facts` and `events` are section 18, which also says why `facts` is in
a save and not in a checkpoint.

`rolls` is the counter of the random stream: roll n follows deterministically
from `seed` and n. Any playthrough can be replayed exactly, and reloading a
save produces the same roll as before rather than a fresh one.

### 8.1 Undo

A book may offer undo back to the last **root choice**: a choice at
indentation level zero. Nested choices, gathers and combat rounds are not undo
points, so undo never unwinds a single line of dialogue, only the decision
that led into it.

```yaml
undo:
  depth: 10        # number of root choices that can be taken back, 0 disables
```

The runtime writes a checkpoint immediately before executing a level-zero
choice. A checkpoint is the complete flat state of section 8 minus the undo
stack itself, so the stack cannot grow into itself, and minus `facts`, which
are recomputed on restore because a checkpoint is always taken at a boundary
and principle 8 guarantees the same answer (18.2). Checkpoints ride along in
the save under `"undo": [ ... ]`, which is why `depth` is capped rather than
unlimited.

The stack rides in the save and stays there when a save is handed on: a reader
who carries a save to another device can take back the same choices they could
have taken back where they left. Decided on 2026-08-12. A save is one thing in
one format, and an export that quietly dropped a field would be a second one.

`rolls` is restored with everything else. Repeating the same choice therefore
reproduces the same dice, and undo cannot be used to re-roll a failed luck
test; it only lets a reader take a different path. That is also why undo past
a death is allowed: it costs nothing that determinism has not already closed
off.

Node references in a save are qualified exactly as the book writes them: the
example above is a multi-file project, a single-file book saves `"node":
"chamber"`. Unknown fields are ignored on load; a `version` higher than the
runtime knows is refused with a clear message rather than partially applied.

## 9. The two JSON formats

### 9.1 Story JSON, the compiler output

Readable and checkable by hand, which is the deliberate contrast to ink's
container bytecode.

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

Nothing redundant is emitted, because a story file is shipped to every reader:

- file names live once in `meta.files`; a node carries its index, and the ops
  inside it carry a bare line number;
- `line` appears only where something can fail at runtime, which means on
  assignments, calls, combat, conditional choices and branch arms;
- defaults are left out. A choice is once-only, unconditional, targetless and
  without a body unless it says otherwise, and `target` is a plain string, or
  `0` for the end of the story;
- a run of plain text is a string rather than `{"t":"lit","v":"…"}`.

For the two-chapter example that is 40% smaller than the verbose form, and
easier to read by eye, which was the point of not shipping ink's bytecode.

Expressions are small prefix trees: `{ "op": ">=", "args": [{ "var": "gold" }, { "lit": 10 }] }`.

Ops are `text`, `choices`, `branch`, `divert`, `combat`, `assign`, `call`,
`return` and `label` (a named gather). Text is a list of parts: `lit`, `print`,
`alt` and `cond`. `-> END` is `{ "end": true }` in place of a `ref`.

Weave needs no op of its own: a run of choices at one depth is one `choices`
op, and whatever follows it in the same container is the gather. A choice with
`"target": null` runs its own body and then falls through to exactly that.

Anything the runtime has to remember carries an id: choices as
`node:c<n>`, alternatives as `node:a<n>`. That is what `taken` and `alts` in
the save are keyed by.

### 9.2 Save JSON

Section 8, versioned, unknown fields ignored.

## 10. Parser

The grammar is line-oriented; the line kind is decided by the first non-space
characters, with exactly three ambiguous cases, all resolved above.

### 10.1 Pipeline

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

### 10.2 Line kinds

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

Inside the indented block of a directive the classification changes: a line is
an exit name followed by either `-> target` or `[label](#target)` plus
optional follow-on text, and anything else is an error (E152). This is the only
place where indentation changes what a line means, and it is why directives
are a closed list rather than an extension point.

### 10.3 Error codes

Errors abort compilation. Every message carries file, line, column and the
offending text.

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

Every example in this document is a test case. Each error code needs at least
one file that triggers it and one near-miss that must not. The three collision
rules (4.3 space after the marker, 4.4 gather after a choice, 4.7 inline
versus block) get their own table-driven tests, because they are where a
Markdown dialect breaks first.

## 11. Linter

Warnings do not abort compilation; `--strict` turns them into errors, and CI
uses `--strict`.

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

L008 and L009 are the ones that actually catch bugs in a gamebook: a key that
is never granted, a code word that is never set. They need the whole book, so
they run after resolution across all namespaces.

The linter also emits a **reachability report**: node count, unreachable
nodes, endings found, longest and shortest path from start to an ending,
counted over choices without evaluating conditions. That report is the closest
thing to proofreading a branching book.

The reachability walk behind the report is run a second time with every host
fact at its `fallback:`, and L025 reads the difference. The report itself
carries the numbers of the first run: a reader with no host gets a smaller
book, and saying so is the warning's job, not the report's. A book whose good
ending needs a host is a book that quietly loses content when it is played as
one file.
L021 needs nothing new beyond the first run: the longest path answers the
question a branching book cannot be proofread for, whether the relief that was
scheduled for turn three hundred can arrive at all.

## 12. Web export

`inkle-md build book.yaml --out play.html` produces a single HTML file: story
JSON embedded as a `<script type="application/json">`, runtime below it,
target under 30 kB compressed. No framework, no external resources, no network
access at runtime.

A book that links images is that file plus those images, resolved relative to
it, per principle 6. Nothing else ever lands beside the export. How a book
writes an image, and what the export does with a path that leaves its own
directory, is open point 22.5; until it is settled, no book has images and the
export is one file.

### 12.1 Runtime API

The runtime is one class, so the same code serves the export and any embedding:

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

`setLanguage` re-renders the current node in the new language and keeps the
whole save: the ids of 9.1 are shared, so `taken` and `alts` carry over. In a
node one language overrides (3.4) the ids are that language's own, so on a
switch the keys that do not exist on the other side are kept in the save but
ignored while reading; switching back restores them. Nothing is discarded,
because a reader who switches twice should not lose a once-only line they
already saw.

Text is delivered as an array of paragraphs, each with its CSS classes, so the
host decides how to render. Combat is exposed as state plus `attack()` and
`flee()`, never as a blocking loop.

### 12.2 Presentation

Presentation lives here and only here: the export ships a stylesheet with CSS
custom properties for font, measure and four colours each for light and dark,
plus a rule per `{.name}` a book uses, plus the labels for its own buttons and
panels in each language the book declares. None of that is readable from the
story JSON, which is the point of section 6's rule.

Themes follow `prefers-color-scheme` and can be overridden by the reader.

Saves live in `localStorage` under one key per book, plus export and import as
a JSON string so a reader can move a game between devices without an account.

The sheet also lists the code words the reader has been told to note, in the
order they were remembered - the Lone Wolf convention, where noting the word
is the reader's own act. A book that wants a secret keeps it out of
`remember()` and in its structure.

### 12.3 Accessibility

Part of the export, not a later pass:

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

`inkle-md play <entry>` walks a book in the terminal, which is how an author
reads their own text before anyone else does. Two flags make it a tool rather
than a toy:

- `--script 1,2,a,a` walks a fixed route and prints where it ended up. With a
  seed, that route is exactly reproducible, which is what turns "it broke
  somewhere in the crypt" into a bug report.
- `--json` returns the same as data: node, text, choices, stats, inventory,
  code words, facts, the dice counter, and a log of which move led where.
  `lint` takes the flag too.
- `--host elapsed=60` supplies host values, arriving at every boundary the
  walk performs. Without it a host fact stays at its `fallback:`, which is
  the same book a reader gets offline.

`inkle-md simulate <entry> --runs 300 --host elapsed=60` plays many games with pseudo-random
choices and reports the endings, the dead ends and the average length. A
balance problem shows up there long before it shows up in a playthrough: the
fear stat of the house example punished every second visit to the same room,
and three hundred games said so in a second.

The simulated reader is curious, not random: at a crossroads an option not
yet tried in this run comes first, and only when every visible option has
been tried once does the walk fall back to cycling. A purely cyclic walker
never leaves a hub room with a sticky "go back" choice, and no human reads a
gamebook that way. `endings` counts only runs that actually reached an
ending; a run that hits the step limit is reported as unfinished, not as an
ending at whatever node it happened to stand in.

`--host` is the policy for how the counters and `elapsed` advance per turn.
Without it nothing scheduled is ever tested: a book whose relief arrives at
turn three hundred needs a walk that reaches turn three hundred, and a book
that measures seconds needs someone to hand it seconds.

`inkle-md mcp` serves the same three checks - lint, play, simulate - as MCP
tools over stdio, so an agent can playtest a book against the real runtime
instead of parsing terminal output. The server speaks JSON-RPC 2.0, one
message per line, and needs no dependency.

## 13. Full example

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

## 14. What is a fact, and what is a variable

Principles 7 to 9 carry everything from here to section 20: the book holds no
time, a fact is a pure function of its state, and facts are read-only to the
book. A book that keeps those three can be replayed from a seed and a save,
which is what the rest of this document spends its rules on.

The test that separates a fact from a variable, and the one to apply when a
case is unclear: does the reader change the world, or only which slice of it
we are looking at? The sun's height over a place is true whether or not
anyone stands there. Air in a suit is not.

## 15. Facts

### 15.1 Declaration

`facts:` is a book-wide declaration and belongs in `book.yaml` or the
single file's frontmatter, per 3.2. Every fact carries a `source:`, the
way every declared item carries a `kind:`.

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

`time` above is a stat, not a fact, and that is principle 7: the clock is
something the book declares and advances, and the runtime never learns what
its unit means.

Fields common to all sources:

| Field      | Meaning                                                        |
| ---------- | -------------------------------------------------------------- |
| `source:`  | `fixed`, `host` or `derived`. Required.                        |
| `name:`    | Reader-visible name, a language table like any other. Optional. |

Per source:

| Source    | Required            | Notes                                     |
| --------- | ------------------- | ----------------------------------------- |
| `fixed`   | `value:`            | An integer literal, not an expression.    |
| `host`    | `range:`, `fallback:` | Supplied from outside at a boundary.    |
| `derived` | `value:`            | An expression, parsed at compile time.    |

A fact name shares the namespace of variables and stats: a collision is
E170. Facts are global to the book, like variables (3.5). An unknown
`source:` is E160, a missing required field E161, and a `fixed` value or a
`fallback` outside its own `range:` is E162.

Values are integers, per 4.8. A fact that wants a fraction states its
unit smaller: minutes rather than hours, thousandths of a degree rather
than degrees. A condition stores as `1` or `0`, which is what the save in
18.1 shows.

### 15.2 Reading a fact

A fact is read wherever a variable is read: in text, in a choice
condition, in a branch, in an event. There is no new spelling.

```
{is_night: The gallery lies in the dark.|Daylight falls through the hatch.}

* {is_night} [Turn in for the night](#camp.sleep)
```

Assigning to a fact is E164, and E164 comes before E131: a fact name is in
scope, so without that order the error would never be the right one. A book
that wants to change something declares a variable.

### 15.3 Derived facts

A derived fact may read variables, stats, counters and facts declared
**before** it. That gives a total order without a dependency solver, the
same answer 4.7 gives to ambiguity: declaration order decides. A
reference to a later fact, or a cycle, is E163.

A derived fact is a pure function of its state, per principle 8. Dice and
anything that changes state are E169, so `{ source: derived, value:
'roll(1,6)' }` does not compile. Without that check principle 8 would be a
promise nothing keeps, and the test that computes each fact twice from an
identical state would pass on a book that breaks it every second boundary.

This is where a book keeps interpretive control. The layer below hands
out numbers; twilight is a definition, and the book writes its own:

```yaml
  dusk:      { source: derived, value: 'sun_elevation < 0 and sun_elevation > -6' }
  long_gone: { source: derived, value: 'elapsed > 259200' }
```

### 15.4 Host facts

A host fact is the one thing the language cannot compute for itself. The host supplies
it at a boundary (16.1); the runtime clamps it into `range:` and never
reads anything on its own, which is what keeps principle 8 true.

Without a host, or when a host supplies nothing, `fallback:` applies. A
book therefore always plays: the single-file export of section 12 stays a
complete game, and no book may require a network, per principle 6.

Exactly one host fact is defined by convention, because a book that wants
elapsed real time should not invent its own name:

| Name      | Unit    | Meaning                                          |
| --------- | ------- | ------------------------------------------------ |
| `elapsed` | seconds | Time passed since the previous boundary          |

`elapsed` is never negative and is `0` at the first boundary. A clock
that has moved backwards, a changed time zone and a resynchronised device
all arrive as `0` rather than as a negative number, because a story clock
that runs backwards produces states no book can be written against.

The value is not capped by the runtime. A reader who returns after a
month gets the month. Capping is a book's decision and is written as a
derived fact, where it is visible:

```yaml
  tick: { source: derived, value: 'min(elapsed, 3600)' }
```

Keeping the raw value alongside is what lets a book say "you were away
for three days" while advancing its world by an hour.

## 16. Boundaries

### 16.1 What a boundary is

A boundary is the moment a node is entered and the moment a choice has
been taken. Nothing else. Host values arrive there, facts are computed
there, events run there.

Between two boundaries the fact snapshot does not change. A page that
offers an option cannot lose it while it is being read, which is the same
promise L020 makes about dice.

**One boundary per completed transition.** A choice that runs a body and then
diverts is one boundary, not two, and a chain of diverts arriving at the page
the reader ends up on is still one. Concretely: `begin`, `choose`, `advance`
and leaving a fight through one of its exits each publish exactly one
snapshot. Without that rule an event with a `when:` and no counter would fire
once or twice per click depending on whether the author happened to write a
divert, which is a difference a reader can see.

Two moments deliberately have none. A **combat round** is not a boundary: the
fight is one page, and an event firing between two swings would be a page
contradicting itself mid-round. The **death page an event sent the reader to**
is not one either, because the event that killed them would otherwise run
again on the page it chose.

The boundary falls after the choice's own effects and before the page that
follows them is built. `~ time += 5` in a choice is the departure; the
arrival reads the clock it left behind. Follow-on text written on the choice
itself belongs to the departure and renders before the boundary, which is the
one place where text sees the older snapshot, and the reason 19.2 spells
travel as an assignment on the choice rather than as something on the node it
arrives at.

### 16.2 Order within a boundary

1. Host values are taken in and clamped.
2. Facts are computed in declaration order.
3. Events run in declaration order (17).
4. Facts are computed once more.

The second pass is what events see reflected. It is a single pass, not a
fixed point: two events at one boundary cannot chain through a derived
fact, because nothing is recomputed between them. They can chain through
a variable, because assignments take effect in order (4.8).

**Variables chain, facts do not.** An author will meet this rule once;
it belongs in the error message, not only here.

A host value is **consumed** by the boundary that takes it in: afterwards the
fact falls back to its `fallback:` until the next `advance`. `elapsed` is a
duration since the previous boundary, so a `choose` that followed an
`advance` without this rule would spend the same seconds a second time.

### 16.3 The published snapshot

The snapshot the view and every condition see is the one from step 4. A
page that contradicted the events that had just run would be a bug the
author could not fix.

### 16.4 Place changes

A change to the place index takes effect at the next boundary, not inside
the node that made it. One page shows one sky.

## 17. Events

### 17.1 Declaration

`events:` is book-wide, like `facts:`. An event has a condition and an
assignment. It has no text and no divert.

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

| Field          | Meaning                                                     |
| -------------- | ----------------------------------------------------------- |
| `once:`        | Fires at most once in a playthrough.                        |
| `counter:`     | An integer expression the event is scheduled against.       |
| `every:`       | Fires each time the counter has advanced by this much.      |
| `max_catchup:` | Most firings at one boundary. Default 1.                    |
| `when:`        | Condition. Optional; absent means always.                   |
| `do:`          | One assignment or call, the same production as a `~` line.  |

`once:` and `every:` together are E168. An event without `do:` is E167.

The point of an event is one declaration instead of the same condition in
forty nodes. What it cannot do is speak or move the reader: it sets
state, a node reads it and narrates. That keeps the translation rule of
3.4 intact, because all text stays in nodes.

### 17.2 Catching up

A recurring event whose counter jumped forward would otherwise fire once
per step. `max_catchup:` bounds that, and the anchor advances by the
number of steps the counter actually took, so a bounded catch-up is not
replayed at the next boundary: the missed firings are dropped, not queued.
An event with `max_catchup: 1` whose counter jumped by fifty fires once and
starts counting again from where the counter now stands.

Without a bound a book that was closed for a month wakes up dead. With
one the author decides whether time away is dangerous or merely long.

A `when:` that is false costs the firings of that boundary but not the
anchor: time passed whether or not the wound was there to worsen, so the
event does not owe the reader fifty rounds of damage the moment they are
finally wounded.

### 17.3 Death

`death.when` is evaluated after every assignment (6), and an event
assigns. An event can therefore kill without the reader having done
anything. That is intended, and a book that does not want it writes its
condition so that it cannot.

## 18. State, save and undo

### 18.1 New fields

```json
"host":   { "elapsed": 700 },
"facts":  { "day_length": 24, "elapsed": 700, "is_night": 1 },
"events": { "fired": { "relief_arrives": true },
            "last":  { "wound_worsens": 120 } }
```

A clock and a place index are ordinary variables and live in `vars`.
Nothing else is added.

`facts` is a cache. It is in the save because a save may be written in the
middle of a node, where variables have moved on since the last boundary;
recomputing at load would then show the reader different numbers than the
page they left. It is not in a checkpoint, because a checkpoint is always
taken at a boundary (8.1) and principle 8 guarantees the same result.

### 18.2 Undo

A checkpoint carries `host` and `events` and omits `facts`, which are
recomputed on restore.

Undo therefore takes back a firing. The counter returns to what it was,
the condition is false again, and going forward again reaches the same
event. That is section 8.1's rule unchanged: undo opens a different path,
it does not undo a consequence.

One consequence is worth stating plainly. Story time is restored by undo,
real time is not. A book that feeds its clock from `elapsed` lets a reader
spend the same real seconds twice. In a single-player book this is
harmless, and it is written here so that nobody reports it as a defect.

## 19. Places

### 19.1 The table

```yaml
places:
  variable: location
  table:
    - { id: base,  name: { de: Basis, en: Base },   enter: base.airlock }
    - { id: ridge, name: { de: Grat,  en: Ridge },  enter: ridge.arrival }
```

`enter:` is optional and names the node a journey to that place arrives
at. An unknown node there is E166.

`variable:` names the stat that holds the index, and is optional. It is what
turns L026 from a guess into a check, which is the whole of its job: nothing
else reads it, and the runtime never sees it. A book that declares it must
declare the stat as well, or it is E171 — a fact will not do, because the book
writes this one.

### 19.2 Using a place

The place a book is at is an ordinary variable holding an index.
`place("ridge")` resolves to that index at compile time, so a book never
writes a bare number and the linter can check the name. An unknown id is
E165.

```
* [Set out for the ridge](#ridge.arrival)
  ~ location = place("ridge")
  ~ time += 5
```

Travel is an assignment, a clock advance and a divert. It is deliberately
not a directive: three spellings already exist for these three things, and
principle 2 forbids a fourth for their combination. What only the story
knows, how long a journey takes for a reader who is injured or who found
a horse, is then an ordinary expression.

The linter checks the pairing the author will get wrong (L026). With
`places.variable:` declared, a travel is any assignment to that variable,
however the index was arrived at. Without it, the linter looks for an
assignment whose value came from `place()`, which reads the common spelling
and misses a book that computes its index. That is why L026 is a warning in
both cases: it is exact about what it saw, never about what the author meant.

## 20. Runtime API: boundaries and facts

The calls of 12.1 stay as they are; these three are what a host needs to bring
time in and to read the snapshot back out.

```
story.advance(host);        // a boundary: take host values, compute, run events
story.facts;                // the published snapshot, read-only
story.current;              // { text, choices, stats, facts }
```

`advance` is the only way host values enter. `begin` and `choose` perform
a boundary themselves; `advance` exists for a host that wants to bring
time in without the reader having chosen. Because a host value is consumed
by the boundary that takes it (16.2), a host feeding real time calls
`advance` and then lets the reader choose, rather than trying to hand the
same seconds to both.

Nothing in the runtime reads a clock. A host that wants real time measures
it and passes it in, which is what makes a scripted replay reproducible.

## 21. Why these checks exist

The codes themselves live where every other code lives: errors in the table of
10.3, warnings in the table of section 11. What belongs here is the reasoning
behind the ones a reader would otherwise take for arbitrary.

E169 rejects a fact expression that draws dice or changes state. Without it
principle 8 is unenforced, and an unenforced principle is a comment.

L021 needs nothing new: the reachability report of section 11 already
computes the longest path. It answers the question a branching book
cannot be proofread for, whether the relief that was scheduled for turn
three hundred can arrive at all. It stays deliberately narrow: only an event
counted against `turns()` with a literal threshold is checked, because a
threshold that depends on the reader is not a thing a static longest path can
be compared against.

L025 protects the export. A book whose good ending needs a host is a book
that quietly loses content when it is played as one file.

L028 is the one shape a hub room gets wrong. A gather that sends the reader
back into its own node is a loop, and it is a survivable one only while some
choice is certain to be there on the next pass. Once every choice is once-only
or conditional, the node runs out of them, falls through to the gather and
arrives at itself with nothing left to offer. A sticky choice with no condition
is what makes the difference, which is why the warning asks for exactly that
and not for fewer once-only choices.

A divert chain is finite, and a runtime says so. One transition may pass
through a handful of nodes on its way to the page the reader ends up on (16.1);
a book that has not settled after a hundred of them is looping, and the runtime
raises an error naming the node it started from. Without that bound the loop
L028 describes ends as a stack overflow, and a stack trace tells an author
nothing about which node to fix.

## 22. Open points

1. **Calendar and ephemeris.** Two further sources, `clock` and
   `ephemeris`, turning an absolute instant and a place into a date or a
   sky. Both need an epoch, which a book must then declare, and which is
   an error to omit only once such a source is used. Out of scope here.
2. **Travel between places as an ephemeris input.** Once a sky depends on
   where the reader went, a fact is sampled at a story-chosen place. The
   test in section 14 already allows it; what it costs the linter is
   untried.
3. **Events with a payload**, so that a caller can hand a duration to an
   event rather than assigning first. Rejected here for keeping events
   free of arguments; worth revisiting if travel grows a spelling of its
   own.
4. **A second `max_catchup:` mode** that coalesces into a single firing
   with the number of missed steps in a variable, rather than repeating.
5. **Images.** Decided on 2026-08-12: Markdown links them, `![alt](file)`
   with alt text required, and they are files next to the export rather than
   data embedded in it, per principle 6. Open is everything below that
   decision: whether a path may leave the export's own directory, what a
   translated catalogue does with an alt text, and what 12.3 promises a
   screen reader. Nothing of it is built, so no book has images yet.

## 23. Next steps

1. Images per 22.5: a line kind of their own, alt text as an error when it is
   missing, and an export that refuses a path pointing outside its directory.
   It is the only open point that changes what a book looks like, so it comes
   first.
2. The second `max_catchup:` mode of 22.4, decided against a book that is put
   down for a week rather than against a table of turns.
3. Calendar and ephemeris (22.1, 22.2) last, and only once a book asks for
   them: they are the one open point that costs the language an epoch.

What these steps stand on is built: grammar, parser and story JSON per
sections 10 and 9.1; the linter of section 11 with its reachability report;
facts and the two-pass boundary; the scheduler with its catch-up anchor;
places and L026; `play` and `simulate`, without which a book with scheduled
content cannot be tested at all; and three examples, one of which puts facts,
events, places and a clock through the acceptance test rather than leaving
them to the unit tests. Every example in this document is a test case.

## 24. Change notes

The only section that speaks of an older draft. Everything else in this
document is written to be read without one.

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
