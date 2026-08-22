/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * SPEC 5.6: a colon does not always mean a condition.
 *
 * Every colon outside quotes used to open a conditional, so a sentence like
 * "Im Dienstbuch: der letzte Eintrag" inside a sequence became E130 and the
 * author reached for a dash. Three of them stood in `examples/leuchtturm`
 * for exactly that reason. What decides now is the head: `?`, an operator,
 * or names that are all declared.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compileSources } from '../src/compile.js';
import { Host } from '../src/host.js';
import { CompileError } from '../src/errors.js';

const BUCH = (text) => `---
title: Probe
start: a
stats:
  gold: { name: Gold, start: 5 }
facts:
  lampe: { source: derived, value: 'gold > 1' }
---

# A {#a}

${text}

-> END
`;

/**
 * Compiles one line of text and returns what the first paragraph says. Ueber
 * den Host, nicht ueber `Story.begin()` und `.current`: dieser Weg rendert
 * den Startknoten zweimal und schaltet eine Sequenz dabei eine Option weiter.
 */
function sagt(text) {
  const { story } = compileSources([{ file: 'a.md', source: BUCH(text), namespace: null }],
    { entry: 'a.md' });
  return new Host(story, { seed: 1 }).view.text[0].text;
}

/** Compiles one line of text and returns the codes it complained about. */
function codes(text) {
  try {
    compileSources([{ file: 'a.md', source: BUCH(text), namespace: null }], { entry: 'a.md' });
    return [];
  } catch (error) {
    if (error instanceof CompileError) return [error.code];
    return (error.errors ?? []).map((e) => e.code);
  }
}

test('ein Kopf mit Operator ist eine Bedingung', () => {
  assert.equal(sagt('{gold >= 3: reich|arm}'), 'reich');
  assert.equal(sagt('{gold >= 3 and gold < 9: passt|passt nicht}'), 'passt');
});

test('ein Kopf aus lauter deklarierten Namen ist eine Bedingung', () => {
  // Die haeufigste Form im Buch: ein Fakt, ohne Vergleich daneben.
  assert.equal(sagt('{lampe: an|aus}'), 'an');
  assert.equal(sagt('{gold: ein Wort|zwei Woerter}'), 'ein Wort');
});

test('ein Kopf, der kein Ausdruck ist, ist Text', () => {
  // Der Fall, an dem der Leuchtturm haengen blieb.
  assert.equal(sagt('{Im Dienstbuch: der letzte Eintrag|Wie gehabt}'),
    'Im Dienstbuch: der letzte Eintrag');
});

test('ein Kopf aus einem Wort, das nichts benennt, ist Text', () => {
  // Deutsche Prosa faengt oft mit einem Wort und einem Doppelpunkt an. Der
  // Parser kann das nicht entscheiden, weil er die Deklarationen noch nicht
  // kennt; `checkAndResolve` loest es auf, sobald der Namensraum steht.
  assert.equal(sagt('{Achtung: eine Stufe|Vorsicht}'), 'Achtung: eine Stufe');
  assert.deepEqual(codes('{Achtung: eine Stufe|Vorsicht}'), []);
});

test('ein vertippter Vergleich bleibt ein Fehler und wird nicht zu Prosa', () => {
  // Der Preis der Regel waere sonst, dass ein Tippfehler still im Buch
  // landet - genau die Klasse Fehler, gegen die E133 eingefuehrt wurde.
  assert.deepEqual(codes('{gold >== 3: reich|arm}'), ['E130']);
  // Auch dann, wenn der Name daneben falsch geschrieben ist: der Operator
  // sagt, dass eine Bedingung gemeint war.
  assert.deepEqual(codes('{glod >= 3: reich|arm}'), ['E131']);
});

test('ein Doppelpunkt im Arm war nie das Problem und bleibt es nicht', () => {
  assert.equal(sagt('{gold >= 3: Ein Glas: seins.|Zwei Glaeser: deins.}'), 'Ein Glas: seins.');
});

test('Prosa mit Doppelpunkt geht auch in einer Uebersetzung', () => {
  // Der Katalog wird gegen die Standardsprache abgeglichen, ehe irgendetwas
  // geprueft ist. Blieb der Kopf einer Uebersetzung dabei unaufgeloest, war
  // derselbe Satz in der einen Sprache eine Sequenz und in der anderen eine
  // Bedingung, und E071 feuerte auf gute Prosa.
  const BOOK = {
    title: 'P',
    start: 'a',
    languages: { default: 'de', available: ['de', 'en'] },
    stats: { gold: { name: 'Gold', start: 5 } },
  };
  const zwei = (de, en) => compileSources([
    { lang: 'de', files: [{ file: 'de/x.md', source: `# A {#a}\n\n${de}\n\n-> END\n`, namespace: null }] },
    { lang: 'en', files: [{ file: 'en/x.md', source: `# A {#a}\n\n${en}\n`, namespace: null }] },
  ], { entry: 'book.yaml', book: BOOK });

  const { story } = zwei('{Achtung: eine Stufe|Vorsicht}', '{Careful: a step|Mind yourself}');
  assert.equal(new Host(story, { seed: 1, lang: 'de' }).view.text[0].text, 'Achtung: eine Stufe');
  assert.equal(new Host(story, { seed: 1, lang: 'en' }).view.text[0].text, 'Careful: a step');

  // Umgekehrt bleibt es ein Fehler: die Uebersetzung behauptet eine Logik,
  // die die Standardsprache nicht hat.
  assert.throws(() => zwei('{Achtung: eine Stufe|Vorsicht}', '{?: a step|mind}'), /E071/);
});
