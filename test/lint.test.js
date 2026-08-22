/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The five source-level linter checks of SPEC 19 that read what a static
 * walk can prove: L003, L004, L011, L014 and L015. Each test carries the
 * trigger and the near-miss that must stay quiet, per SPEC 18.4.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from './helpers.js';

const codes = (warnings) => warnings.messages.map((m) => m.code);

const FACTS_FRONTMATTER = `---
title: Test
stats:
  gold: { start: 1 }
facts:
  day_length: { source: fixed, value: 24 }
  half_day:   { source: derived, value: 'day_length / 2' }
  elapsed:    { source: host, range: [0, 604800], fallback: 0 }
---
`;

test('L003: a condition on fixed facts that can never hold', () => {
  const { warnings } = compile(
    '# A {#a}\n\n'
    + '* {day_length > 30} [Durch die lange Nacht](#b)\n'
    + '+ [Weiter](#b)\n\n'
    + '# B {#b}\n\n-> END\n',
    { frontmatter: FACTS_FRONTMATTER },
  );
  assert.equal(codes(warnings).filter((c) => c === 'L003').length, 1);
});

test('L003 stays quiet for host facts and for conditions that can hold', () => {
  const { warnings } = compile(
    '# A {#a}\n\n'
    + '* {elapsed > 30} [Nach der Pause](#b)\n'      // a host may supply 31
    + '* {day_length > 20} [Am langen Tag](#b)\n'    // 24 > 20 holds
    + '* {half_day > 20} [Nie am halben Tag](#b)\n'  // derived from fixed: 12
    + '+ [Weiter](#b)\n\n'
    + '# B {#b}\n\n-> END\n',
    { frontmatter: FACTS_FRONTMATTER },
  );
  assert.equal(codes(warnings).filter((c) => c === 'L003').length, 1);
});

test('L004: one sticky choice as the only way out is a button without a decision', () => {
  const { warnings } = compile(
    '# A {#a}\n\n+ [Weiter](#b)\n\n# B {#b}\n\n-> END\n',
  );
  assert.ok(codes(warnings).includes('L004'));
});

test('L004 stays quiet when the node changes state: the press is a boundary', () => {
  const rest = compile(
    '# Rast {#rest}\n\nDu ruhst dich aus.\n\n~ gold = gold + 1\n\n+ [Weiter](#b)\n\n'
    + '# B {#b}\n\n-> END\n',
  );
  assert.ok(!codes(rest.warnings).includes('L004'));
});

test('L004 stays quiet for a once-only choice and for a real decision', () => {
  const once = compile('# A {#a}\n\n* [Weiter](#b)\n\n# B {#b}\n\n-> END\n');
  assert.ok(!codes(once.warnings).includes('L004'));
  const two = compile(
    '# A {#a}\n\n+ [Links](#b)\n+ [Rechts](#b)\n\n# B {#b}\n\n-> END\n',
  );
  assert.ok(!codes(two.warnings).includes('L004'));
});

test('L011: a source line over 80 characters is reported with its line number', () => {
  const long = 'x'.repeat(81);
  const { warnings } = compile(`# A {#a}\n\n${long}\n\n-> END\n`);
  const hit = warnings.messages.find((m) => m.code === 'L011');
  assert.ok(hit);
  assert.equal(hit.level, 'info');
  assert.ok(hit.line > 0);
});

test('L011 leaves a line of exactly 80 characters alone', () => {
  const edge = 'x'.repeat(80);
  const { warnings } = compile(`# A {#a}\n\n${edge}\n\n-> END\n`);
  assert.ok(!codes(warnings).includes('L011'));
});

const DEATH_FRONTMATTER = `---
title: Test
stats:
  stamina: { start: 10 }
death:
  when: "stamina <= 0"
  goto: dead
---
`;

test('L014: a death node no divert or choice ever reaches', () => {
  const { warnings } = compile(
    '# A {#a}\n\n-> END\n\n# Dead {#dead}\n\nHier endet es.\n\n-> END\n',
    { frontmatter: DEATH_FRONTMATTER },
  );
  assert.ok(codes(warnings).includes('L014'));
  assert.ok(!codes(warnings).includes('L001'));      // the safety net keeps it reachable
});

test('L014 stays quiet once a choice leads there too', () => {
  const { warnings } = compile(
    '# A {#a}\n\n* [Aufgeben](#dead)\n+ [Weiter](#b)\n\n'
    + '# B {#b}\n\n-> END\n\n# Dead {#dead}\n\nHier endet es.\n\n-> END\n',
    { frontmatter: DEATH_FRONTMATTER },
  );
  assert.ok(!codes(warnings).includes('L014'));
});

test('L015: prose after a divert in the same block is never read', () => {
  const plain = compile('# A {#a}\n\n-> END\n\nDas liest niemand.\n');
  assert.ok(codes(plain.warnings).includes('L015'));
  const weave = compile(
    '# A {#a}\n\n'
    + '* [Springen]()\n'
    + '  -> b\n'
    + '  Das liest niemand.\n'
    + '+ [Gehen](#b)\n'
    + '---\n'
    + '-> b\n\n'
    + '# B {#b}\n\n-> END\n',
  );
  assert.ok(codes(weave.warnings).includes('L015'));
});

test('L015 leaves prose before the divert alone', () => {
  const { warnings } = compile('# A {#a}\n\nEin Satz davor.\n\n-> END\n');
  assert.ok(!codes(warnings).includes('L015'));
});
