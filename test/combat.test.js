/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * What a combat round says (SPEC 6, 7): the lines of `strings:` are prose,
 * they carry the alternatives of 4.6, and an enemy may bring its own.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Story } from '../src/runtime.js';
import { compile, expectError } from './helpers.js';

/**
 * A fight nobody can lose: the player rolls a stat the enemy cannot match, so
 * every round is a hit and the wordings step on one after the other.
 */
const FRONTMATTER = (extra = '') => `---
title: Test
languages:
  available: [de]
stats:
  skill: { start: 100 }
  stamina: { start: 20 }
combat:
  attack: "skill"
  damage: "1"
enemies:
  goblin: { name: Kobold, skill: 1, stamina: 8 }
  troll:
    name: Troll
    skill: 1
    stamina: 8
    strings:
      combat.hit: "{&Der Troll taumelt.|Der Troll geht in die Knie.}"
strings:
  combat.hit: "{&Du triffst|Deine Klinge findet} {enemy}."
${extra}---
`;

const BOOK = `
# los

!combat goblin
  win -> sieg

# sieg

Vorbei.

-> END
`;

function fight(extra = '', body = BOOK) {
  const { story } = compile(body, { frontmatter: FRONTMATTER(extra) });
  return new Story(story, { seed: 1 });
}

test('a combat line cycles through its wordings instead of repeating one', () => {
  const s = fight();
  assert.equal(s.attack().text, 'Du triffst Kobold.');
  assert.equal(s.attack().text, 'Deine Klinge findet Kobold.');
  assert.equal(s.attack().text, 'Du triffst Kobold.');
});

test('an enemy that writes its own line beats the book, key by key', () => {
  const s = fight('', BOOK.replace('!combat goblin', '!combat troll'));
  assert.equal(s.attack().text, 'Der Troll taumelt.');
  assert.equal(s.attack().text, 'Der Troll geht in die Knie.');
  // The troll writes no line for a tie, so the built-in default stands.
  assert.equal(s.config.enemies.troll.strings['combat.tie'], undefined);
});

test('a wording keeps its place across fights, so a cycle carries on', () => {
  const two = `
# los

!combat goblin
  win -> zweiter

# zweiter

!combat goblin
  win -> sieg

# sieg

Vorbei.

-> END
`;
  const s = fight('', two);
  const said = [];
  for (let i = 0; i < 12; i++) said.push(s.attack()?.text);
  // The second goblin picks the cycle up where the first left it, so the two
  // wordings keep alternating across the seam between the fights.
  for (let i = 0; i < said.length; i++) {
    if (said[i] === undefined) break;
    assert.equal(said[i], i % 2 === 0 ? 'Du triffst Kobold.' : 'Deine Klinge findet Kobold.');
  }
  assert.ok(said.filter(Boolean).length > 8, 'both fights were fought');
});

test('what an enemy says is looked up, never copied into the save', () => {
  const s = fight('', BOOK.replace('!combat goblin', '!combat troll'));
  s.attack();
  const saved = JSON.parse(JSON.stringify(s.save()));
  assert.equal(saved.fight.roster[0].strings, undefined);
  assert.ok(!JSON.stringify(saved).includes('taumelt'));
});

test('a fourth key is E062, in the book and at an enemy', () => {
  expectError(BOOK, 'E062', { frontmatter: FRONTMATTER().replace(
    'combat.hit: "{&Du triffst|Deine Klinge findet} {enemy}."',
    'combat.hits: "Daneben."') });
  expectError(BOOK, 'E062', { frontmatter: FRONTMATTER().replace(
    'combat.hit: "{&Der Troll taumelt.|Der Troll geht in die Knie.}"',
    'combat.treffer: "Der Troll taumelt."') });
});

test('a combat line is checked like any other text: an unknown name is E131', () => {
  expectError(BOOK, 'E131', { frontmatter: FRONTMATTER().replace(
    '{&Du triffst|Deine Klinge findet} {enemy}.',
    '{&Du triffst|Deine Klinge findet} {enemy}, {gschick} Punkte.') });
});
