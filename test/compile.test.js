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

import { compileSources, compileFile } from '../src/compile.js';
import { compile, expectError, nodesOf } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));

test('references resolve, and unknown ones are named', () => {
  expectError('# A {#a}\n\n-> nowhere\n', 'E041');
  expectError('# A {#a}\n\n-> other.place\n', 'E040');   // single file has no namespace
});

test('duplicate ids inside one file are rejected', () => {
  expectError('# A {#a}\n\n-> END\n\n# B {#a}\n\n-> END\n', 'E030');
});

test('a node must end in a divert, a choice or a combat', () => {
  expectError('# A {#a}\n\nJust prose.\n', 'E110');
});

test('a divert into a function is refused', () => {
  expectError('# fn heal(n)\n~ return n\n\n# A {#a}\n\n-> heal\n', 'E042');
});

test('a function without a return is refused', () => {
  expectError('# fn heal(n)\n~ gold = n\n\n# A {#a}\n\n-> END\n', 'E140');
});

test('only declared stats may be read or written', () => {
  expectError('# A {#a}\n\n~ mana = 3\n-> END\n', 'E131');
  expectError('# A {#a}\n\n{mana}\n-> END\n', 'E131');
});

test('built-in variables need no declaration', () => {
  const { story } = compile('# A {#a}\n\n{in_combat: yes|no} {gold_max}\n-> END\n');
  assert.ok(nodesOf(story).a);
});

test('items must be declared once items: exists', () => {
  const frontmatter = `---
title: T
stats:
  gold: { start: 1 }
items:
  sword: { name: Sword, kind: weapon }
---
`;
  expectError('# A {#a}\n\n~ take("lantern")\n-> END\n', 'E060', { frontmatter });
  const { story } = compile('# A {#a}\n\n~ take("sword")\n-> END\n', { frontmatter });
  assert.ok(story.config.items.sword);
});

test('an unknown item kind is refused', () => {
  const frontmatter = `---
title: T
stats:
  gold: { start: 1 }
items:
  sword: { name: Sword, kind: blade }
---
`;
  expectError('# A {#a}\n\n-> END\n', 'E061', { frontmatter });
});

test('start defaults to the first node', () => {
  const { story } = compile('# First {#first}\n\n-> END\n');
  assert.equal(story.meta.start, 'first');
});

test('a multi-file project namespaces its nodes and resolves across files', () => {
  const { story } = compileSources([
    { file: 'start.md', namespace: 'start', source: '---\ntitle: Opening\n---\n\n# Begin {#begin}\n\n-> crypt.chamber\n' },
    { file: 'crypt.md', namespace: 'crypt', source: '# Chamber {#chamber}\n\n-> END\n' },
  ], { entry: 'book.yaml', book: { title: 'T', start: 'start.begin', stats: { gold: { start: 1,  } } } });

  assert.deepEqual(Object.keys(nodesOf(story)), ['start.begin', 'crypt.chamber']);
  assert.equal(nodesOf(story)['start.begin'].body[0].target, 'crypt.chamber');
});

test('the example book compiles without warnings', () => {
  const { story, warnings } = compileFile(join(here, '..', 'examples', 'thornwood.md'));
  assert.equal(warnings.messages.length, 0, JSON.stringify(warnings.messages, null, 2));
  assert.equal(warnings.report.unreachable, 0);
  assert.equal(warnings.report.endings, 2);
  assert.equal(story.meta.start, 'begin');
  assert.equal(story.config.strings['combat.tie'].default, 'Die Klingen kreuzen sich, ohne dass etwas daraus wird.');
});

test('the reachability report counts what the linter walked', () => {
  const { warnings } = compile('# A {#a}\n\n* [On](#b)\n\n# B {#b}\n\n-> END\n\n# Lost {#lost}\n\n-> END\n');
  assert.equal(warnings.report.nodes, 3);
  assert.equal(warnings.report.unreachable, 1);
  assert.ok(warnings.messages.some((m) => m.code === 'L001'));
});
