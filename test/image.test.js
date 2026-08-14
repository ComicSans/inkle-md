/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Images per SPEC.md 4.9: a line of their own, alt text required, a file
 * beside the output rather than a URL, and both halves translated.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile, expectError, nodesOf } from './helpers.js';
import { compileFile } from '../src/compile.js';
import { imagePaths } from '../src/emit.js';
import { Host } from '../src/host.js';

const here = dirname(fileURLToPath(import.meta.url));
const book = () => compileFile(join(here, '..', 'examples', 'thornwood-book', 'book.yaml')).story;

test('an image is an op of its own, carrying the file and the alt text', () => {
  const nodes = nodesOf(compile(`
# Start {#start}

Ahead of you, the gate.

![An iron gate, taller than a house.](gate.png)

-> END
`).story);
  const ops = nodes['start'].body.filter((op) => op.op === 'image');
  assert.equal(ops.length, 1);
  assert.deepEqual(ops[0], { op: 'image', src: 'gate.png', alt: 'An iron gate, taller than a house.' });
});

test('an image takes a class like a paragraph does', () => {
  const nodes = nodesOf(compile(`
# Start {#start}

![A map of the marches.](map.png){.plate}

-> END
`).story);
  assert.equal(nodes['start'].body.find((op) => op.op === 'image').class, 'plate');
});

test('an image without alt text is refused', () => {
  expectError(`
# Start {#start}

![](gate.png)

-> END
`, 'E182');
});

test('an image in the middle of a sentence is refused, not passed through', () => {
  // The same mistake diverts in prose once made: as text it reaches the
  // reader as literal Markdown.
  expectError(`
# Start {#start}

The gate ![an iron gate](gate.png) stands open.

-> END
`, 'E181');
});

test('every run of text is covered, not just a paragraph', () => {
  // The check first sat where paragraphs are read, which left three other
  // places passing literal Markdown through: a choice's follow-on text, a
  // gather's text and a combat exit's. They all share one reader, and that
  // is where it belongs.
  expectError(`
# Start {#start}

* [Through the gate](#second) The gate ![an iron gate](gate.png) stands open.

# Second {#second}

-> END
`, 'E181');

  expectError(`
# Start {#start}

* [Fight](#second)
* [Wait](#second)
---

Afterwards ![the gate](gate.png) stands open.

# Second {#second}

-> END
`, 'E181');

  expectError(`
# Start {#start}

!combat goblin
  win  -> second
  flee [Away](#second) You leave ![your shield](shield.png) behind.

# Second {#second}

-> END
`, 'E181', { frontmatter: COMBAT_FRONTMATTER });
});

const COMBAT_FRONTMATTER = `---
title: Test
stats:
  stamina: { start: 10 }
combat:
  attack: "roll(2,6)"
  damage: "2"
enemies:
  goblin: { name: Goblin, skill: 5, stamina: 6 }
---
`;

test('a path that leaves the book, or is a URL, is refused', () => {
  for (const path of ['../secret.png', '/etc/passwd', 'https://example.com/gate.png']) {
    expectError(`
# Start {#start}

![An iron gate.](${path})

-> END
`, 'E183');
  }
});

test('a file that is not there is refused, which is the one check that reads the disk', () => {
  assert.throws(
    () => compileFile(join(here, 'fixtures', 'missing-image.md')),
    (error) => error.all?.some((e) => e.code === 'E184') || error.code === 'E184',
  );
});

test('both halves of an image are translated', () => {
  const story = book();
  const image = (lang) => story.nodes[lang]['crypt.crypt'].body.find((op) => op.op === 'image');

  assert.equal(image('de').src, 'gruft.png');
  assert.equal(image('en').src, 'gruft.png');
  assert.notEqual(image('de').alt, image('en').alt);
  assert.match(image('de').alt, /Torbogen/);
  assert.match(image('en').alt, /archway/);
});

test('the runtime puts an image on the page beside the paragraphs', () => {
  const host = new Host(book(), { seed: 3 });
  host.command({ cmd: 'begin', picks: [['sword']] });
  host.command({ cmd: 'go', node: 'crypt.crypt' });

  const image = host.view.text.find((p) => p.image);
  assert.ok(image, 'the crypt shows its archway');
  assert.equal(image.image, 'gruft.png');
  assert.match(image.alt, /Torbogen/);
  // It is an entry in `text`, so a host walks one list and tells the two
  // apart by which field is there (12.7).
  assert.equal(image.text, undefined);
  assert.ok(host.view.text.some((p) => p.text !== undefined), 'the prose is still there too');
});

test('a language switch repaints the image in the other language', () => {
  const host = new Host(book(), { seed: 3 });
  host.command({ cmd: 'begin', picks: [['sword']] });
  host.command({ cmd: 'go', node: 'crypt.crypt' });
  const before = host.view.text.find((p) => p.image).alt;

  host.command({ cmd: 'language', lang: 'en' });
  const after = host.view.text.find((p) => p.image);
  assert.ok(after, 'the picture survives the switch');
  assert.notEqual(after.alt, before);
});

test('glue meets a picture and stops there rather than concatenating onto it', () => {
  const nodes = nodesOf(compile(`
# Start {#start}

The gate stands open. <>

![An iron gate, taller than a house.](gate.png)

-> END
`).story);
  const kinds = nodes['start'].body.map((op) => op.op);
  assert.deepEqual(kinds.slice(0, 2), ['text', 'image']);
});

test('the image paths of a book are what travels with it', () => {
  assert.deepEqual(imagePaths(book()), ['gruft.png']);
  // Once, however many languages and nodes link it.
  assert.equal(new Set(imagePaths(book())).size, imagePaths(book()).length);
});
