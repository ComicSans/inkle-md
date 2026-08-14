/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * E133: a name argument is a quoted name, or it is an error.
 *
 * `test(skill)` compiled clean for as long as the language existed. It reads
 * the stat, arrives at 9, and asks for a stat called "9" - so the check fails
 * every single time, and a failed check is indistinguishable from bad luck.
 * The first test below measures that difference rather than asserting it:
 * 251 successes out of 300 against 0 out of 300, from the same book.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compileSources } from '../src/compile.js';
import { Story } from '../src/runtime.js';
import { CompileError } from '../src/errors.js';

const here = dirname(fileURLToPath(import.meta.url));
const thornwood = readFileSync(join(here, '..', 'examples', 'thornwood.md'), 'utf8');

/** Compiles a book and returns the codes it complained about. */
function codes(source) {
  try {
    compileSources([{ file: 'a.md', source, namespace: null }], { entry: 'a.md' });
    return [];
  } catch (error) {
    if (error instanceof CompileError) return [error.code];
    return (error.errors ?? []).map((e) => e.code);
  }
}

test('a bare name in a name argument is E133, not a working check', () => {
  assert.deepEqual(codes(thornwood), [], 'the book itself is clean');
  assert.deepEqual(codes(thornwood.replace(/test\("skill"\)/g, 'test(skill)')), ['E133']);
  // The same hole, and the reason it is about names rather than about test():
  // `gold` is a declared stat, so nothing else on the way objected.
  assert.deepEqual(codes(thornwood.replace(/has\("lantern"\)/g, 'has(gold)')), ['E133']);
});

test('a quoted name that names no stat is E133', () => {
  assert.deepEqual(codes(thornwood.replace(/test\("skill"\)/g, 'test("gschick")')), ['E133']);
  // Items and places have had this half for as long as they have had
  // declarations; only stats were missing it.
  assert.deepEqual(codes(thornwood.replace(/has\("lantern"\)/g, 'has("laterne")')), ['E060']);
});

test('code words are invented, so any quoted word is a name', () => {
  // A code word has no declaration to check against, and demanding one would
  // make remember() impossible to use for what it is for.
  assert.deepEqual(codes(thornwood.replace(/knows\("KRAKEN"\)/g, 'knows("NEUES-WORT")')), []);
});

test('only the first argument of take() is a name', () => {
  const book = thornwood.replace(/take\("[^"]+"\)/, (call) => call.replace(')', ', 2)'));
  assert.deepEqual(codes(book), [], 'the count stays an expression');
});

test('what E133 prevents: a check that could never succeed', () => {
  // The measurement the error exists for. Without it, both books lint clean
  // and one of them silently never lets the reader across the brook.
  const quer = (source) => {
    const { story } = compileSources([{ file: 'a.md', source, namespace: null }], { entry: 'a.md' });
    let versuche = 0;
    let gelungen = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const s = new Story(story, { seed });
      s.begin((s.setup ?? []).map((block) => block.from.slice(0, block.pick)
        .map((o) => o.item ?? o.remember ?? o.label)));
      for (let schritt = 0; schritt < 30 && !s.current.ended; schritt++) {
        if (s.combat) { s.attack(); continue; }
        const choices = s.current.choices;
        if (choices.length === 0) break;
        const sprung = choices.find((c) => /springen/i.test(c.label));
        if (sprung) {
          versuche++;
          s.choose(sprung.index);
          if (s.current.node === 'thicket') gelungen++;
          continue;
        }
        s.choose((choices.find((c) => /Bach/.test(c.label)) ?? choices[0]).index);
      }
    }
    return { versuche, gelungen };
  };

  const richtig = quer(thornwood);
  assert.equal(richtig.versuche, 300);
  assert.ok(richtig.gelungen > 200, `a check against skill mostly succeeds, got ${richtig.gelungen}`);

  // The broken form no longer compiles, which is the fix. Proving what it did
  // means reaching past the check, so this asserts the error instead and
  // leaves the number in the comment: it was 0 of 300.
  assert.deepEqual(codes(thornwood.replace(/test\("skill"\)/g, 'test(skill)')), ['E133']);
});
