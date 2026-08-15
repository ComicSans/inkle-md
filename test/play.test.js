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

import { compileFile } from '../src/compile.js';
import { play, simulate } from '../src/play.js';
import { compile } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));
const house = () => compileFile(join(here, '..', 'examples', 'house', 'book.yaml')).story;

test('a script of moves replays the same way twice', async () => {
  const moves = ['1', '1', 'a', 'a', 'a'];
  const a = await play(house(), { seed: 42, script: moves, quiet: true });
  const b = await play(house(), { seed: 42, script: moves, quiet: true });

  assert.equal(a.node, b.node);
  assert.deepEqual(a.text, b.text);
  assert.equal(a.rolls, b.rolls);
  assert.equal(a.seed, 42);
});

test('a move that does not apply stops the script and says so', async () => {
  const result = await play(house(), { seed: 1, script: ['9'], quiet: true });
  assert.equal(result.log.length, 1);
  assert.equal(result.log[0].ok, false);
  assert.equal(result.node, 'arrival.road', 'nothing moved');
});

test('the script reports the state a tool needs', async () => {
  const result = await play(house(), { seed: 5, script: ['1'], quiet: true });
  assert.ok(result.choices.every((c) => typeof c.key === 'number' && c.label));
  assert.ok('fear' in result.stats);
  assert.ok(Array.isArray(result.inventory));
  assert.equal(typeof result.rolls, 'number');
});

test('simulate finds every ending and no dead end', () => {
  const report = simulate(house(), { runs: 100 });
  assert.equal(report.deadEnds.length, 0);
  assert.equal(report.unfinished, 0);
  assert.ok(Object.keys(report.endings).length >= 2);
  assert.ok(report.averageSteps > 1);
});

test('simulate --coverage meldet, was nie auf der Seite stand', () => {
  // `endings` beantwortet nicht, ob jemand alles zu sehen bekommt: ein Buch
  // kann jedes Ende erreichen und trotzdem Absaetze tragen, die keine Partie
  // je zeigt. Die zweite Wahl hier steht hinter einer Bedingung, die nichts
  // je wahr macht.
  const { story } = compile(`# A {#a}

+ [Weiter](#b)
+ {gold > 99} [Der teure Weg](#b)

# B {#b}

-> END
`);
  const r = simulate(story, { runs: 20, coverage: true });
  assert.equal(r.coverage.choices, 2);
  assert.equal(r.coverage.seen, 1);
  assert.deepEqual(r.coverage.unseen.map((u) => u.label), ['Der teure Weg']);
  assert.equal(r.coverage.unseen[0].conditional, true);
});

test('ohne --coverage lenkt nichts den Leser, damit die Enden vergleichbar bleiben', () => {
  // Die Abdeckungsmessung bevorzugt ueber Partien hinweg das Ungesehene. Das
  // verschiebt die Verteilung der Enden, an der ein Buch ausbalanciert wird,
  // also bleibt es aus, solange niemand danach fragt.
  const buch = house();
  assert.deepEqual(simulate(buch, { runs: 30 }).endings,
    simulate(buch, { runs: 30 }).endings);
  assert.equal(simulate(buch, { runs: 30 }).coverage, undefined);
});
