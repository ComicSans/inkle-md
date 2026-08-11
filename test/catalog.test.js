/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Translations per SPEC.md 3.4: the default language owns the logic, a
 * translation carries text, and an override is the escape hatch.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compileSources, compileFile } from '../src/compile.js';

const here = dirname(fileURLToPath(import.meta.url));

const BOOK = {
  title: 'T',
  start: 'a',
  languages: { default: 'de', available: ['de', 'en'] },
  stats: { gold: { start: 1 } },
};

const DE = [
  '# Erster Knoten {#a}', '',
  'Ein Absatz. {&Krachen|Stille}', '',
  '* [Weiter](#b) Du gehst.', '+ [Bleiben]()', '---', '-> b', '',
  '# Zweiter {#b}', '', 'Ende.', '-> END', '',
].join('\n');

function build(en, book = BOOK, de = DE) {
  return compileSources([
    { lang: 'de', files: [{ file: 'de/x.md', source: de, namespace: null }] },
    { lang: 'en', files: [{ file: 'en/x.md', source: en, namespace: null }] },
  ], { entry: 'book.yaml', book });
}

test('a catalogue replaces paragraphs and labels, and keeps the logic', () => {
  const { story } = build([
    '# First node {#a}', '', 'A paragraph. {&A crack|Silence}', '',
    '* On', '* Stay', '', 'You walk on.', '',
    '# Second {#b}', '', 'The end.', '',
  ].join('\n'));

  const de = story.nodes.de.a;
  const en = story.nodes.en.a;

  // Text is translated...
  assert.equal(en.body[0].parts[0], 'A paragraph. ');
  assert.equal(en.body[1].items[0].label[0], 'On');
  assert.equal(en.body[1].items[0].body[0].parts[0], 'You walk on.');

  // ...while structure, targets and runtime ids come from the default language.
  assert.equal(en.body[1].items[0].target, de.body[1].items[0].target);
  assert.equal(en.body[1].items[0].id, de.body[1].items[0].id);
  assert.equal(en.body[0].parts[1].id, de.body[0].parts[1].id);
  assert.ok(en.body[0].parts[1].id);
  assert.equal(en.body[1].items[1].sticky, true);
});

test('a missing or extra paragraph is reported', () => {
  assert.throws(() => build([
    '# First node {#a}', '', 'A paragraph. {&A crack|Silence}', '',
    '* On', '* Stay', '',
    '# Second {#b}', '', 'The end.', '',
  ].join('\n')), /E071/);

  assert.throws(() => build([
    '# First node {#a}', '', 'A paragraph. {&A crack|Silence}', '',
    '* On', '* Stay', '', 'You walk on.', '', 'One too many.', '',
    '# Second {#b}', '', 'The end.', '',
  ].join('\n')), /E071/);
});

test('an alternative may not appear or vanish in translation', () => {
  assert.throws(() => build([
    '# First node {#a}', '', 'A paragraph without an alternative.', '',
    '* On', '* Stay', '', 'You walk on.', '',
    '# Second {#b}', '', 'The end.', '',
  ].join('\n')), /E071/);
});

test('a missing node is reported, and a heading needs its id', () => {
  assert.throws(() => build([
    '# First node {#a}', '', 'A paragraph. {&A crack|Silence}', '',
    '* On', '* Stay', '', 'You walk on.', '',
  ].join('\n')), /E070/);

  assert.throws(() => build([
    '# First node', '', 'A paragraph. {&A crack|Silence}', '',
  ].join('\n')), /E070/);
});

test('a node with logic overrides, and is checked like the original', () => {
  const { story, warnings } = build([
    '# First node {#a}', '', 'A paragraph. {&A crack|Silence}', '',
    '* On', '* Stay', '', 'You walk on.', '',
    '# Second {#b}', '',
    '{ gold == 1 }', '  A single coin.', '{ else }', '  {gold} coins.', '',
    '-> END', '',
  ].join('\n'));

  assert.equal(story.nodes.en.b.body[0].op, 'branch');
  assert.equal(story.nodes.de.b.body[0].op, 'text');
  assert.ok(warnings.messages.some((m) => m.code === 'L019'));
});

test('an override is resolved against the default language', () => {
  assert.throws(() => build([
    '# First node {#a}', '', 'A paragraph. {&A crack|Silence}', '',
    '* On', '* Stay', '', 'You walk on.', '',
    '# Second {#b}', '', '-> nowhere', '',
  ].join('\n')), /E041/);
});

test('"?" stands in for a condition, and only in a translation', () => {
  const de = [
    '# Erster Knoten {#a}', '',
    '{gold > 1: viele|eine} Muenze. {&Krachen|Stille}', '',
    '* [Weiter](#b) Du gehst.', '+ [Bleiben]()', '---', '-> b', '',
    '# Zweiter {#b}', '', 'Ende.', '-> END', '',
  ].join('\n');

  const { story } = build([
    '# First node {#a}', '', '{?: many|one} coin. {&A crack|Silence}', '',
    '* On', '* Stay', '', 'You walk on.', '',
    '# Second {#b}', '', 'The end.', '',
  ].join('\n'), BOOK, de);

  // The condition itself comes from the default language.
  assert.deepEqual(story.nodes.en.a.body[0].parts[0].when, story.nodes.de.a.body[0].parts[0].when);
  assert.equal(story.nodes.en.a.body[0].parts[0].then[0], 'many');

  assert.throws(() => compileSources([
    { file: 't.md', source: '---\ntitle: T\nstats:\n  gold: { start: 1 }\n---\n\n# A {#a}\n\n{?: a|b}\n-> END\n', namespace: null },
  ], { entry: 't.md' }), /E130/);
});

test('expressions a translator writes are checked and resolved', () => {
  // A typo in a translated {variable} must fail like any other.
  assert.throws(() => build([
    '# First node {#a}', '', 'A paragraph. {glod} {&A crack|Silence}', '',
    '* On', '* Stay', '', 'You walk on.', '',
    '# Second {#b}', '', 'The end.', '',
  ].join('\n'), BOOK, [
    '# Erster Knoten {#a}', '',
    'Ein Absatz. {gold} {&Krachen|Stille}', '',
    '* [Weiter](#b) Du gehst.', '+ [Bleiben]()', '---', '-> b', '',
    '# Zweiter {#b}', '', 'Ende.', '-> END', '',
  ].join('\n')), /E131/);

  // A node reference inside translated text resolves like any other.
  assert.throws(() => build([
    '# First node {#a}', '', 'A paragraph. {visits(nowhere)} {&A crack|Silence}', '',
    '* On', '* Stay', '', 'You walk on.', '',
    '# Second {#b}', '', 'The end.', '',
  ].join('\n'), BOOK, [
    '# Erster Knoten {#a}', '',
    'Ein Absatz. {visits(b)} {&Krachen|Stille}', '',
    '* [Weiter](#b) Du gehst.', '+ [Bleiben]()', '---', '-> b', '',
    '# Zweiter {#b}', '', 'Ende.', '-> END', '',
  ].join('\n')), /E041/);
});

test('the two-language example project compiles', () => {
  const { story, warnings } = compileFile(join(here, '..', 'examples', 'thornwood-book', 'book.yaml'));

  assert.deepEqual(story.meta.languages, ['de', 'en']);
  assert.equal(story.meta.title.en, 'The Crypt Under the Thorn');
  assert.deepEqual(Object.keys(story.nodes.de), Object.keys(story.nodes.en));
  assert.equal(story.config.items.sword.name.de, 'Schwert');
  assert.equal(warnings.report.unreachable, 0);

  // The English gate is a plain translation; daylight is an override.
  assert.equal(story.nodes.en['crypt.gate'].body[1].op, 'branch');
  assert.ok(warnings.messages.every((m) => m.level === 'info'));

  // The as: override in book.yaml named the namespace.
  assert.ok(Object.keys(story.nodes.de).some((id) => id.startsWith('crypt.')));
});
