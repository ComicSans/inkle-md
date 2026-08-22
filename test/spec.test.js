/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The book printed in SPEC.md section 14, compiled.
 *
 * Section 18.4 claims that every example in the document is a test case. It was
 * not true of the one that calls itself the full example: it declared keys the
 * language does not have, linked two nodes it did not contain, and handed out
 * an item nobody had declared. None of that is visible by reading, which is
 * exactly why it stood there for so long.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compileSources } from '../src/compile.js';
import { Story } from '../src/runtime.js';

const here = dirname(fileURLToPath(import.meta.url));

/** The one fenced block in section 14. */
function fullExample() {
  const spec = readFileSync(join(here, '..', 'SPEC.md'), 'utf8');
  const section = spec.slice(spec.indexOf('## 14. Full example'), spec.indexOf('## 15.'));
  const fence = section.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(fence, 'section 14 has a markdown block');
  return `${fence[1]}\n`;
}

test('the full example of section 14 compiles', () => {
  const { story, warnings } = compileSources(
    [{ file: 'SPEC.md#14', source: fullExample(), namespace: null }],
    { entry: 'SPEC.md#14' });

  assert.equal(story.format, 1);
  // Clean, not merely compiling: a book the document holds up as the whole
  // language should not be the one book that trips its own linter.
  const complaints = warnings.messages.filter((m) => m.level === 'warning');
  assert.deepEqual(complaints, [], complaints.map((m) => `${m.code} ${m.detail}`).join('\n'));
  assert.equal(warnings.report.unreachable, 0);
  assert.ok(warnings.report.endings >= 2, 'it ends well and badly');
});

test('the full example plays from its first page to an ending', () => {
  const { story } = compileSources(
    [{ file: 'SPEC.md#14', source: fullExample(), namespace: null }],
    { entry: 'SPEC.md#14' });

  const s = new Story(story, { seed: 4 });
  assert.equal(s.current.node, 'begin');
  // Everything the frontmatter promised is on the sheet.
  assert.deepEqual(s.stats.map((stat) => stat.name).sort(),
    ['gold', 'luck', 'skill', 'stamina']);
  assert.ok(s.inventory.some((item) => item.id === 'lantern'));

  // The lantern is what opens the third choice, and it is in the pack.
  assert.ok(s.current.choices.some((c) => /gap under the hedge/.test(c.label)));

  for (let step = 0; step < 40 && !s.current.ended; step++) {
    if (s.combat) { s.attack(); continue; }
    const choices = s.current.choices;
    if (choices.length === 0) break;
    // Head for the crypt, then take whatever comes.
    const forward = choices.find((c) => /gap under the hedge|key|gate/.test(c.label)) ?? choices[0];
    s.choose(forward.index);
  }
  assert.equal(s.current.ended, true, `stuck at ${s.current.node}`);
});
