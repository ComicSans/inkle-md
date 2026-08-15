/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Was eine Seite zeigt, haengt nicht daran, wie oft sie gezeichnet wurde.
 *
 * Die Runtime baut die Seite beim ersten Mal aus den Ops und danach aus
 * `state.screen` neu - beim Laden, beim Undo, bei einer Zeitgrenze und beim
 * Sprachwechsel. Der zweite Weg wendete den Klebstoff nie an, also zerfiel
 * jeder ueber eine Wahl geklebte Satz beim Laden in zwei Absaetze. Gefunden
 * in `examples/intercept/`, dem einzigen Buch, das Glue benutzt; geprueft
 * wird hier an dem Beispiel aus SPEC 4.5, weil intercept eine halbe Minute
 * zum Kompilieren braucht.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Host } from '../src/host.js';
import { compile } from './helpers.js';

/** Die Seite als das, was ein Host von ihr sieht. */
const seite = (view) => JSON.stringify(view.text.map((t) => t.text ?? t.image));

const GEKLEBT = `# A {#a}

* [Leugnen]() "Nichts", sage ich<>
* [Prahlen]() "Alles", sage ich<>
---
<>, und im Raum wird es still.

-> END
`;

/** Spielt bis hinter die geklebte Stelle. */
function geklebt() {
  const { story } = compile(GEKLEBT);
  const host = new Host(story, { seed: 1 });
  host.command({ cmd: 'choose', index: 0 });
  assert.equal(host.view.text.length, 1, 'gespielt ist es ein Absatz');
  assert.match(host.view.text[0].text, /still\.$/);
  return { story, host };
}

test('ein geklebter Satz bleibt beim Laden ein Satz', () => {
  const { story, host } = geklebt();
  const save = JSON.parse(JSON.stringify(host.command({ cmd: 'save' }).did));
  const geladen = new Host(story, { seed: 999 });
  geladen.command({ cmd: 'load', save });
  assert.equal(seite(geladen.view), seite(host.view));
});

test('eine Zeitgrenze zeichnet die Seite geklebt neu', () => {
  const { host } = geklebt();
  const vorher = seite(host.view);
  host.command({ cmd: 'advance', host: {} });
  assert.equal(seite(host.view), vorher);
});

test('ein Absatz, in dem keine Bedingung zutrifft, entsteht gar nicht', () => {
  // Vier Zeilen untereinander, keine wahr: frueher blieb ein Absatz aus einem
  // Leerzeichen stehen, weil die Zeilenumbrueche mit Leerzeichen verbunden
  // werden. `play.js` und `view.js` haben ihn weggefiltert, die Swift-Ansicht
  // nicht - auf dem Geraet stand dort eine Luecke.
  const { story } = compile(`# A {#a}

Ein Satz.

{gold > 99: reich}
{gold > 98: sehr reich}

Noch ein Satz.

-> END
`);
  assert.deepEqual(new Host(story, { seed: 1 }).view.text.map((t) => t.text),
    ['Ein Satz.', 'Noch ein Satz.']);
});

test('ein Absatz, in dem eine Bedingung zutrifft, traegt keine Rand-Leerzeichen', () => {
  const { story } = compile(`# A {#a}

{gold > 99: reich}
Mittendrin.
{gold > 98: sehr reich}

-> END
`);
  assert.deepEqual(new Host(story, { seed: 1 }).view.text.map((t) => t.text), ['Mittendrin.']);
});
