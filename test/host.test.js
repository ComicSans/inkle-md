/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The host protocol and the native bundle of SPEC.md section 12.5.
 *
 * The test that matters most here is the last one. It runs the bundle in a
 * bare JavaScript realm, which is what a JSContext on iOS offers: the
 * language and nothing else, no `structuredClone`, no `console`, no timers. A
 * runtime that reaches past the standard library plays in a browser and fails
 * on a phone, and it fails at the first save rather than at load time, so
 * only a run finds it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compileFile } from '../src/compile.js';
import { Host } from '../src/host.js';
import { bundleFiles } from '../src/bundle.js';

const here = dirname(fileURLToPath(import.meta.url));
const book = () => compileFile(join(here, '..', 'examples', 'thornwood.md')).story;

test('one command answers with the whole view, so a turn is one crossing', () => {
  const host = new Host(book(), { seed: 42 });
  const answer = host.command({ cmd: 'state' });

  assert.equal(answer.ok, true);
  // Everything 12.1 offers one member at a time arrives here at once.
  for (const field of ['lang', 'languages', 'setup', 'node', 'text', 'choices',
    'stats', 'facts', 'inventory', 'memory', 'combat', 'canUndo']) {
    assert.ok(field in answer.view, `view is missing ${field}`);
  }
});

test('setup labels arrive in the reading language, not as a table of them', () => {
  const host = new Host(book(), { seed: 42 });
  const block = host.view.setup[0];

  assert.equal(typeof block.title, 'string');
  assert.equal(typeof block.from[0].label, 'string');
  // `key` is what begin() takes back, so a host never has to know which of
  // the three spellings an option used.
  assert.equal(host.command({ cmd: 'begin', picks: [[block.from[0].key]] }).ok, true);
  assert.equal(host.view.setup, null);
});

test('a failing command is an answer, not a throw', () => {
  const host = new Host(book(), { seed: 42 });
  host.command({ cmd: 'begin', picks: [['sword']] });

  assert.deepEqual(host.command({ cmd: 'choose', index: 99 }), { ok: false, error: 'no choice 99' });
  assert.equal(host.command({ cmd: 'fly' }).ok, false);
  assert.equal(host.command({}).ok, false);
  // The story is unhurt: the view still answers after all three.
  assert.equal(host.command({ cmd: 'state' }).ok, true);
});

test('the string form carries the same protocol, and malformed input is data too', () => {
  const host = new Host(book(), { seed: 42 });
  const answer = JSON.parse(host.dispatch('{"cmd":"state"}'));

  assert.equal(answer.ok, true);
  assert.equal(JSON.parse(host.dispatch('nonsense')).ok, false);
});

test('save and load cross the protocol as plain JSON', () => {
  const host = new Host(book(), { seed: 42 });
  host.command({ cmd: 'begin', picks: [['sword']] });
  host.command({ cmd: 'choose', index: 0 });
  const save = host.command({ cmd: 'save' }).did;
  const node = host.view.node;

  host.command({ cmd: 'choose', index: 0 });
  const back = host.command({ cmd: 'load', save: JSON.parse(JSON.stringify(save)) });
  assert.equal(back.ok, true);
  assert.equal(back.view.node, node);
});

test('the bundle is the story and the engine, each in its own file', () => {
  const files = bundleFiles(book());

  assert.deepEqual(Object.keys(files).sort(), ['inkle-md.js', 'story.json']);
  assert.equal(JSON.parse(files['story.json']).format, 1);
  // No module keywords survive: the engine runs where there is no loader.
  assert.doesNotMatch(files['inkle-md.js'], /^(import|export) /m);
  assert.match(files['inkle-md.js'], /Mozilla Public License/);
  // The view of 12.2 stays behind; a native host draws its own.
  assert.doesNotMatch(files['inkle-md.js'], /document\.createElement/);
});

test('the bundle plays a whole game in a bare JavaScript realm', () => {
  const files = bundleFiles(book());
  // Object.create(null) leaves the realm with the language and nothing else:
  // no Node globals, no web APIs. This is the iOS JSContext.
  const realm = createContext(Object.create(null));
  assert.equal(runInContext('typeof structuredClone', realm), 'undefined');

  runInContext(files['inkle-md.js'], realm);
  runInContext(`globalThis.__story = ${JSON.stringify(files['story.json'])}`, realm);
  const send = (command) => JSON.parse(
    runInContext(`inkleMd.send(${JSON.stringify(JSON.stringify(command))})`, realm));

  const started = JSON.parse(runInContext('inkleMd.start(__story, \'{"seed":7}\')', realm));
  assert.equal(started.ok, true);
  assert.equal(send({ cmd: 'begin', picks: [['sword']] }).ok, true);

  // A save, a checkpoint and a load are the three places the copy used to
  // reach for a web API, so the walk has to reach all three.
  const turn = send({ cmd: 'choose', index: 0 });
  assert.equal(turn.ok, true, turn.error);
  assert.equal(turn.view.canUndo, true);

  const save = send({ cmd: 'save' }).did;
  assert.equal(save.version, 1);
  send({ cmd: 'choose', index: 0 });
  assert.equal(send({ cmd: 'load', save }).view.node, turn.view.node);
  assert.equal(send({ cmd: 'undo' }).did, true);
});

test('a fight reaches the host with both halves of the enemy bar', () => {
  const story = book();
  const host = new Host(story, { seed: 7 });
  host.command({ cmd: 'begin', picks: [['sword']] });

  // Walk until a fight starts; thornwood has one on a short path.
  let fight = null;
  for (let i = 0; i < 20 && !fight; i++) {
    const view = host.command({ cmd: 'choose', index: 0 }).view;
    fight = view.combat;
    if (view.ended || (!view.choices.length && !fight)) break;
  }
  assert.ok(fight, 'no fight on this walk');
  assert.equal(typeof fight.enemy.name, 'string');
  assert.ok(fight.enemy.max >= fight.enemy.stamina);
  assert.equal(typeof fight.waiting, 'number');

  const round = host.command({ cmd: 'attack' }).did;
  assert.equal(round.round, 1);
  assert.equal(typeof round.text, 'string');
});
