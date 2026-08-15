/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compileSources, compileFile } from '../src/compile.js';
import { compile, expectError, nodesOf } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));

test('references resolve, and unknown ones are named', () => {
  expectError('# A {#a}\n\n-> nowhere\n', 'E041');
  expectError('# A {#a}\n\n-> other.place\n', 'E040');   // single file has no namespace
});

test('duplicate ids inside one file are rejected', () => {
  expectError('# A {#a}\n\n-> END\n\n# B {#a}\n\n-> END\n', 'E030');
});

test('a node must end in a divert, a choice or a combat', () => {
  expectError('# A {#a}\n\nJust prose.\n', 'E110');
});

test('a divert into a function is refused', () => {
  expectError('# fn heal(n)\n~ return n\n\n# A {#a}\n\n-> heal\n', 'E042');
});

test('a function without a return is refused', () => {
  expectError('# fn heal(n)\n~ gold = n\n\n# A {#a}\n\n-> END\n', 'E140');
});

test('only declared stats may be read or written', () => {
  expectError('# A {#a}\n\n~ mana = 3\n-> END\n', 'E131');
  expectError('# A {#a}\n\n{mana}\n-> END\n', 'E131');
});

test('built-in variables need no declaration', () => {
  const { story } = compile('# A {#a}\n\n{in_combat: yes|no} {gold_max}\n-> END\n');
  assert.ok(nodesOf(story).a);
});

test('items must be declared once items: exists', () => {
  const frontmatter = `---
title: T
stats:
  gold: { start: 1 }
items:
  sword: { name: Sword, kind: weapon }
---
`;
  expectError('# A {#a}\n\n~ take("lantern")\n-> END\n', 'E060', { frontmatter });
  const { story } = compile('# A {#a}\n\n~ take("sword")\n-> END\n', { frontmatter });
  assert.ok(story.config.items.sword);
});

test('an unknown item kind is refused', () => {
  const frontmatter = `---
title: T
stats:
  gold: { start: 1 }
items:
  sword: { name: Sword, kind: blade }
---
`;
  expectError('# A {#a}\n\n-> END\n', 'E061', { frontmatter });
});

test('start defaults to the first node', () => {
  const { story } = compile('# First {#first}\n\n-> END\n');
  assert.equal(story.meta.start, 'first');
});

test('a multi-file project namespaces its nodes and resolves across files', () => {
  const { story } = compileSources([
    { file: 'start.md', namespace: 'start', source: '---\ntitle: Opening\n---\n\n# Begin {#begin}\n\n-> crypt.chamber\n' },
    { file: 'crypt.md', namespace: 'crypt', source: '# Chamber {#chamber}\n\n-> END\n' },
  ], { entry: 'book.yaml', book: { title: 'T', start: 'start.begin', stats: { gold: { start: 1,  } } } });

  assert.deepEqual(Object.keys(nodesOf(story)), ['start.begin', 'crypt.chamber']);
  assert.equal(nodesOf(story)['start.begin'].body[0].target, 'crypt.chamber');
});

test('a single-file book compiles without warnings', () => {
  const { story, warnings } = compileFile(join(here, 'fixtures', 'thornwood.md'));
  assert.equal(warnings.messages.length, 0, JSON.stringify(warnings.messages, null, 2));
  assert.equal(warnings.report.unreachable, 0);
  assert.equal(warnings.report.endings, 2);
  assert.equal(story.meta.start, 'begin');
  assert.equal(story.meta.default, 'de');   // the book names its language
  assert.equal(story.config.strings['combat.tie'].de, 'Die Klingen kreuzen sich, ohne dass etwas daraus wird.');
});

/**
 * The frontmatter carries expressions too, and until 0.8 nobody looked at
 * them: an item could heal a stat that was never declared and the book
 * compiled. They go through the same check as the story's now, so these are
 * the errors a node would have raised for the same text.
 */
const withFrontmatter = (fields) => `---
title: T
stats:
  gold: { start: 1 }
items:
  bread: { name: Bread, kind: consumable, uses: 2${fields.item ?? ', effect: "gold = gold + 1"'} }
${fields.extra ?? ''}---
`;

test('an item effect answers to the same scope as a node', () => {
  const body = '# A {#a}\n\n~ take("bread")\n-> END\n';
  // Reading and writing, both halves of the same assignment.
  expectError(body, 'E131', { frontmatter: withFrontmatter({ item: ', effect: "mana = mana + 1"' }) });
  expectError(body, 'E131', { frontmatter: withFrontmatter({ item: ', effect: "mana = 1"' }) });
  expectError(body, 'E131', { frontmatter: withFrontmatter({ item: ', effect: "nowhere(1)"' }) });
  expectError(body, 'E131', { frontmatter: withFrontmatter({ item: ', effect: "gold = gold + 1", when: "mana > 0"' }) });
  // `due` counts firings owed to an event, and an item is not an event.
  expectError(body, 'E173', { frontmatter: withFrontmatter({ item: ', effect: "gold = gold + due"' }) });
  // A node reference is resolved wherever it stands.
  expectError(body, 'E041', { frontmatter: withFrontmatter({ item: ', effect: "gold = visits(nowhere)"' }) });
});

test('the rest of the frontmatter is checked as well', () => {
  const body = '# A {#a}\n\n-> END\n';
  expectError(body, 'E131', { frontmatter: withFrontmatter({ extra: 'checks:\n  dice: "roll(2,6) + mana"\n' }) });
  expectError(body, 'E131', { frontmatter: withFrontmatter({ extra: 'combat:\n  attack: "mana + roll(2,6)"\n' }) });
  expectError(body, 'E131', { frontmatter: withFrontmatter({ extra: 'death:\n  when: "mana <= 0"\n' }) });
  expectError(body, 'E131',
    { frontmatter: withFrontmatter({}).replace('gold: { start: 1 }', 'gold: { start: "mana + 1" }') });
});

test('an item may not assign to a fact', () => {
  const frontmatter = withFrontmatter({
    item: ', effect: "hour = 1"',
    extra: 'facts:\n  hour: { source: fixed, value: 3 }\n',
  });
  expectError('# A {#a}\n\n-> END\n', 'E164', { frontmatter });
});

test('place() in an item effect is folded, not left for the runtime', () => {
  // The runtime has no `place` of its own: an unfolded call landed in the
  // function lookup and threw `no function "place"` mid-game.
  const frontmatter = `---
title: T
stats:
  gold: { start: 1 }
  location: { start: 0 }
items:
  map: { name: Map, kind: consumable, uses: 1, effect: "location = place(\\"ridge\\")" }
places:
  variable: location
  table:
    - { id: crash, name: Crash }
    - { id: ridge, name: Ridge }
---
`;
  const { story } = compile('# A {#a}\n\n~ take("map")\n-> END\n', { frontmatter });
  assert.deepEqual(story.config.items.map.effect, { op: 'assign', target: 'location', value: { lit: 1 } });
  expectError('# A {#a}\n\n-> END\n', 'E165',
    { frontmatter: frontmatter.replace('place(\\"ridge\\")', 'place(\\"summit\\")') });
});

test('a choice that rolls to decide whether it appears is flagged', () => {
  const { warnings } = compile('# A {#a}\n\n* {test("gold")} [Luck](#a)\n+ [On](#b)\n\n# B {#b}\n\n-> END\n');
  assert.ok(warnings.messages.some((m) => m.code === 'L020'));
});

test('the reachability report counts what the linter walked', () => {
  const { warnings } = compile('# A {#a}\n\n* [On](#b)\n\n# B {#b}\n\n-> END\n\n# Lost {#lost}\n\n-> END\n');
  assert.equal(warnings.report.nodes, 3);
  assert.equal(warnings.report.unreachable, 1);
  assert.ok(warnings.messages.some((m) => m.code === 'L001'));
});

test('die Pfadlaenge rechnet polynomial und bleibt eine Obergrenze', () => {
  // Frueher zaehlte der Linter jeden einfachen Pfad einzeln auf.
  // `examples/intercept.md` verbrachte damit 32 von 33 Sekunden, und ein
  // doppelt so grosses Buch waere nie fertig geworden. Jetzt: Breitensuche
  // fuer den kuerzesten Weg, und fuer den laengsten die Komponenten des
  // Graphen, nach Groesse gewichtet.
  const gerade = compile(`# A {#a}

+ [Weiter](#b)

# B {#b}

+ [Weiter](#c)

# C {#c}

-> END
`).warnings.report;
  assert.equal(gerade.shortestPath, 3);
  assert.equal(gerade.longestPath, 3, 'ohne Schleife ist die Grenze der Weg selbst');

  // Mit Schleife bleibt die Rechnung endlich, und sie irrt nach oben statt
  // nach unten: L021 schweigt lieber, als vor einem Ereignis zu warnen, das
  // doch noch feuern kann.
  const schleife = compile(`# A {#a}

+ [Im Kreis](#b)
+ [Zum Ende](#c)

# B {#b}

+ [Zurueck](#a)

# C {#c}

-> END
`).warnings.report;
  assert.equal(schleife.shortestPath, 2);
  assert.ok(schleife.longestPath >= 2 && schleife.longestPath <= schleife.nodes,
    `Grenze ${schleife.longestPath} liegt zwischen dem kuerzesten Weg und der Zahl der Knoten`);
});
