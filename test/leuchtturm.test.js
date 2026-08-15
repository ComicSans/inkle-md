/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Der Leuchtturm hat einen richtigen Weg, und `lint` kann das nicht sehen.
 *
 * Die Bedingungen im Keller hängen an Zeit, Wasser, Licht und zwei Händen.
 * Zieht jemand eine Schwelle - der Sturm ist am 15.08.2026 von Minute 150
 * auf 90 gerückt -, bleibt das Buch strukturell erreichbar und ist doch
 * rechnerisch nicht mehr zu gewinnen. Der Test spielt deshalb den
 * vorgesehenen Weg und besteht darauf, dass er ankommt.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compileFile } from '../src/compile.js';
import { Host } from '../src/host.js';

const here = dirname(fileURLToPath(import.meta.url));
const buch = () => compileFile(join(here, '..', 'examples', 'leuchtturm', 'book.yaml')).story;

// Gewählt wird über den Wahltext, nicht über den Index: welche Wahlen ein
// Knoten zeigt, hängt an Bedingungen und verschiebt sich mit jeder von ihnen.
const WEG = [
  // Vorbereiten, solange das Seekabel liefert: hell, trocken, ohne Eile.
  /Durch die Tür in den Arbeitsraum/,
  /Öl-Laterne vom Haken/,
  /Keller des Maschinenhauses/,
  /Laterne am Ölfass füllen/,
  /aufs Podest legen/,
  /Schotttüren seeseitig zudrehen/,
  /Den Keller verlassen/,
  // Warten, bis der Sturm das Seekabel holt. Vorher ist der Generator nur
  // ein Probelauf, und das Benzin bleibt im Kanister.
  /Dienstbuch/,
  /Fenster/,
  /Fenster/,
  // Jetzt ist der Turm dunkel, aber die Laterne brennt und alles liegt oben.
  /Keller des Maschinenhauses/,
  /Die Leitung dichten/,
  /Kanister in den Tank leeren/,
  /Den Generator anwerfen/,
  /Den Keller verlassen/,
  /Wendeltreppe hinauf/,
  /Den Hebel auf EIN legen/,
  /Bei der Lampe wachen/,
];

/** Spielt eine Folge von Wahltexten und meldet, wo sie endet. */
function spiele(story, weg, seed) {
  const host = new Host(story, { seed });
  for (const muster of weg) {
    const wahl = host.view.choices.find((c) => muster.test(c.label));
    assert.ok(wahl, `"${muster}" wird in ${host.view.node} nicht angeboten: `
      + host.view.choices.map((c) => c.label).join(' | '));
    host.command({ cmd: 'choose', index: wahl.index });
  }
  return host;
}

test('der vorgesehene Weg führt bis zum Morgen', () => {
  // An der Leiter würfelt das Buch; dieser Weg geht nicht über sie, also
  // hängt er an keinem Seed.
  for (const seed of [1, 7, 42]) {
    const host = spiele(buch(), WEG, seed);
    assert.equal(host.view.node, 'turm.morgen', `Seed ${seed}`);
    assert.equal(host.view.ended, true);
  }
});

test('ohne die Laterne endet der Weg vor dem Tank', () => {
  // Das Benzin will gesehen werden, wo es hinläuft, und nach dem
  // Stromausfall gibt es dafür nur die Öl-Laterne. Wer sie stehen lässt,
  // kommt bis an den Tank und nicht weiter - das ist die Stelle, an der aus
  // "irgendwas anklicken" ein Weg wird.
  const ohneLaterne = WEG.filter((m) => !/Laterne/.test(String(m)));
  assert.throws(() => spiele(buch(), ohneLaterne, 7),
    /Kanister in den Tank leeren/);
});
