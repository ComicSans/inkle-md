/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The two ways to play of SPEC.md 20.6: a book read from its start, and a book
 * entered as one episode inside something larger.
 *
 * Nothing here uses anything the language does not already have, and that is
 * what these tests are for. An episode is `load`, `go`, play, `save`. If that
 * ever stops holding, the answer is not to add `episodes:` to the frontmatter
 * but to find out what broke: the book must not learn which of the two is
 * happening, in the way it must not learn which output it becomes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compileFile } from '../src/compile.js';
import { Host } from '../src/host.js';

const here = dirname(fileURLToPath(import.meta.url));
const load = (entry) => compileFile(join(here, '..', 'examples', entry)).story;

/** The app opens a book the ordinary way once, to have a character at all. */
function character(story, picks) {
  const host = new Host(story, { seed: 11 });
  host.command({ cmd: 'begin', picks });
  return host.command({ cmd: 'save' }).did;
}

test('an app carries a character in, plays one passage, and takes it back out', () => {
  const story = load(join('thornwood-book', 'book.yaml'));
  const save = character(story, [['sword']]);

  // Outside the book, the app has been keeping this character: it spent gold
  // and took wounds on the map.
  save.vars.gold = 99;
  save.vars.stamina = 7;

  const episode = new Host(story, { seed: 11 });
  assert.equal(episode.command({ cmd: 'load', save }).ok, true);
  const entered = episode.command({ cmd: 'go', node: 'crypt.chamber' });

  assert.equal(entered.ok, true);
  assert.equal(entered.view.node, 'crypt.chamber');
  const value = (name) => entered.view.stats.find((s) => s.name === name).value;
  assert.equal(value('gold'), 99, 'the character arrives as the app had it');
  assert.equal(value('stamina'), 7);
  assert.ok(entered.view.text.length > 0, 'and lands on a real page');
  assert.ok(entered.view.choices.length > 0);

  // The episode is played to whatever it reaches.
  let view = entered.view;
  for (let step = 0; step < 12 && !view.ended; step++) {
    if (view.combat) episode.command({ cmd: 'attack' });
    else if (view.choices.length > 0) episode.command({ cmd: 'choose', index: 0 });
    else break;
    view = episode.view;
  }

  const back = episode.command({ cmd: 'save' }).did;
  assert.notDeepEqual(back.vars, save.vars, 'the episode changed something');
  assert.equal(back.vars.gold, 99, 'and left alone what it had no reason to touch');
  assert.ok(Object.keys(back.inventory).length > 0);
});

test('go without load is a reader with no stats, which is why the order is fixed', () => {
  const story = load(join('thornwood-book', 'book.yaml'));
  const bare = new Host(story, { seed: 11 });
  // No begin, no load: `go` jumps but rolls nothing (12.6).
  bare.command({ cmd: 'go', node: 'crypt.crypt' });

  const stamina = bare.view.stats.find((s) => s.name === 'stamina').value;
  assert.ok(stamina === undefined || stamina === null,
    'a reader who arrives by go alone has no stamina to lose');
});

test('a save from another book is refused, so carrying over is a transfer', () => {
  const thornwood = load(join('thornwood-book', 'book.yaml'));
  const house = load(join('house', 'book.yaml'));
  const hero = character(thornwood, [['sword']]);

  const next = new Host(house, { seed: 11 });
  const refused = next.command({ cmd: 'load', save: hero });
  assert.equal(refused.ok, false);
  assert.match(refused.error, /save is from/);

  // The transfer of 12.6: open the next book normally, then copy over what
  // both books declare and nothing else.
  const setup = next.view.setup;
  next.command({ cmd: 'begin', picks: setup.map((b) => b.from.slice(0, b.pick).map((o) => o.key)) });
  const own = next.command({ cmd: 'save' }).did;

  const shared = Object.keys(own.vars).filter((name) => name in hero.vars);
  assert.ok(shared.includes('stamina') && shared.includes('luck'));
  assert.ok(!shared.includes('gold'), 'the house has never heard of gold, so gold stays behind');
  for (const name of shared) own.vars[name] = hero.vars[name];
  own.inventory = { ...own.inventory, ...hero.inventory };
  own.memory = [...new Set([...own.memory, ...hero.memory])];

  assert.equal(next.command({ cmd: 'load', save: own }).ok, true);
  assert.equal(next.view.stats.find((s) => s.name === 'stamina').value, hero.vars.stamina);
  assert.ok(next.view.inventory.some((item) => item.id === 'sword'), 'the sword came along');
});

test('the way out is a node, and the story JSON names the one that is dying', () => {
  const story = load(join('thornwood-book', 'book.yaml'));

  // Everything the app needs to recognise an exit is data it already has.
  assert.equal(typeof story.config.death.goto, 'string');
  assert.ok(story.config.death.goto in story.nodes[story.meta.default]);
  assert.equal(typeof story.meta.start, 'string');

  // What the app keeps is its own list: where this passage may let the reader
  // out, and where the book itself says they died. Nothing in the book
  // declares this, because which nodes are exits depends on the map.
  const exits = { 'crypt.daylight': 'back to the map', [story.config.death.goto]: 'died' };

  const save = character(story, [['sword']]);
  const episode = new Host(story, { seed: 11 });
  episode.command({ cmd: 'load', save });
  episode.command({ cmd: 'go', node: 'crypt.crypt' });

  // The app watches `node` after every command and stops at the first one it
  // recognises. That is the whole of the way out.
  let outcome = null;
  for (let step = 0; step < 30 && !outcome; step++) {
    if (episode.view.combat) episode.command({ cmd: 'attack' });
    else if (episode.view.choices.length > 0) episode.command({ cmd: 'choose', index: 0 });
    else break;
    outcome = exits[episode.view.node] ?? null;
  }

  assert.ok(outcome, `the episode ended somewhere the app does not know: ${episode.view.node}`);
  assert.equal(outcome, 'back to the map');
  // And the app takes the character on from there.
  assert.equal(typeof episode.command({ cmd: 'save' }).did.vars.stamina, 'number');
});
