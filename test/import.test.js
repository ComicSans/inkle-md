/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { importInk } from '../src/import.js';
import { compileSources } from '../src/compile.js';

/** Compiles what the importer wrote, so a test proves more than a string match. */
function build(ink, options = {}) {
  const { markdown, notes } = importInk(ink, options);
  const { story, warnings } = compileSources([{ file: 'imported.md', source: markdown, namespace: null }]);
  return { markdown, notes, story, warnings };
}

test('a knot becomes a node and a divert keeps its target', () => {
  const { markdown, story } = build(`
=== start ===
The door is shut.
-> outside

=== outside ===
Daylight.
-> END
`);
  assert.match(markdown, /# Start \{#start\}/);
  assert.match(markdown, /-> outside/);
  assert.equal(story.meta.start, 'start');
});

test('the bracket split feeds the button and the text after it', () => {
  const { markdown } = build(`
=== start ===
* "I'm fine[."]," I reply.
  -> END
`);
  assert.match(markdown, /\* \["I'm fine\."\]\(\) "I'm fine," I reply\./);
});

test('a choice without brackets writes its text twice', () => {
  const { markdown } = build(`
=== start ===
* "Commander."
  -> END
`);
  assert.match(markdown, /\* \["Commander\."\]\(\) "Commander\."/);
});

test('VAR and CONST turn into the frontmatter, with true and false as integers', () => {
  const { markdown } = build(`
VAR teacup = false
CONST BUCKET = 2
VAR held = BUCKET
=== start ===
-> END
`);
  assert.match(markdown, /teacup: \{ start: 0 \}/);
  assert.match(markdown, /held: \{ start: 2 \}/);
  assert.doesNotMatch(markdown, /BUCKET: \{/);
});

test('a ref-parameter function is inlined at its call site', () => {
  const { markdown } = build(`
VAR forceful = 0
=== function raise(ref x)
~ x = x + 1
=== start ===
~ raise(forceful)
-> END
`);
  assert.match(markdown, /~ forceful = forceful \+ 1/);
  assert.doesNotMatch(markdown, /raise\(/);
});

test('a visit count on a choice label becomes a flag that the choice sets', () => {
  const { markdown } = build(`
=== start ===
* (plan) [Plan]
  -> start
* [Speak]
  {plan: You have a plan.}
  -> END
`);
  assert.match(markdown, /~ seen_plan = 1/);
  assert.match(markdown, /\{seen_plan: You have a plan\.\}/);
  assert.match(markdown, /seen_plan: \{ start: 0 \}/);
});

test("ink's multi-line conditional becomes the block branching of SPEC 4.7", () => {
  const { markdown } = build(`
VAR drugged = false
=== start ===
{ drugged:
	The room tilts.
- else:
	The room holds still.
}
-> END
`);
  assert.match(markdown, /\{ drugged \}\n {2}The room tilts\./);
  assert.match(markdown, /\{ else \}\n {2}The room holds still\./);
});

test('nested alternatives are spread into whole sentences', () => {
  const { markdown } = build(`
VAR item = 0
=== start ===
I reach for my { item == 2:bucket|{ item == 1:shoe|hands}}.
-> END
`);
  assert.match(markdown, /\{ item == 2 \}\n {2}I reach for my bucket\./);
  assert.match(markdown, /\{ else \}\n {2}I reach for my \{item == 1: shoe\|hands\}\./);
});

test('a tunnel becomes a divert and its return goes where the caller said', () => {
  const { markdown, notes } = build(`
=== start ===
-> aside -> after

=== aside ===
A memory.
->->

=== after ===
-> END
`);
  assert.match(markdown, /-> aside/);
  assert.match(markdown, /-> after/);
  assert.equal(notes.filter((n) => /tunnel/.test(n.message)).length, 0);
});

test('a label used as a divert target becomes a node of its own', () => {
  const { markdown, story } = build(`
=== start ===
* [Ask]
  -> answer
* (answer) [Wait]
  He says nothing.
  -> END
`);
  assert.match(markdown, /\{#start_answer\}/);
  assert.ok(Object.keys(story.nodes ?? {}).length > 1 || markdown.includes('start_answer'));
});

test('a weave deeper than three levels is lifted into a node', () => {
  const { notes, warnings } = build(`
=== start ===
* [One]
	* * [Two]
		* * * [Three]
			* * * * [Four]
				-> END
			* * * * [Five]
				-> END
`);
  assert.ok(notes.some((n) => /lifted into/.test(n.message)));
  assert.ok(warnings);
});

test('what ink says and inkle-md does not is reported with its ink line', () => {
  const { notes } = build(`
LIST colours = red, green
=== start ===
-> END
`);
  const note = notes.find((n) => /LIST/.test(n.message));
  assert.ok(note, 'the LIST declaration is reported');
  assert.equal(note.line, 2);
});

test('a stitch runs on into the next one, as it does in ink', () => {
  const { markdown } = build(`
=== start ===
= first
The first room.
= second
The second room.
-> END
`);
  assert.match(markdown, /-> start_second/);
});

test('glue across a conditional block folds into one line', () => {
  const { markdown } = build(`
VAR teacup = false
VAR drugged = false
=== start ===
"Awkward," I reply
{ teacup:
	~ drugged = true
	<>, sipping at my tea as though we were old friends
}
<>.
-> END
`);
  assert.match(markdown, /\{teacup: , sipping at my tea as though we were old friends\|\}\./);
  assert.doesNotMatch(markdown, /^\.$/m);
  // What the arm assigns keeps its condition and runs before the line.
  assert.match(markdown, /\{ teacup \}\n {2}~ drugged = 1/);
});

test('an em dash becomes a hyphen', () => {
  const { markdown } = build(`
=== start ===
I am a problem—solver.
-> END
`);
  assert.match(markdown, /problem-solver/);
  assert.doesNotMatch(markdown, /—/);
});

test('glue that reaches across a choice is carried over, not dropped', () => {
  const { markdown } = build(`
=== start ===
* [Take it]
  I take the mug. It is <>
- far too hot.
  -> END
`);
  // One mark is enough; the gather text needs none of its own.
  assert.match(markdown, /I take the mug\. It is<>/);
  assert.match(markdown, /---\nfar too hot\./);
});
