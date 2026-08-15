/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The editor extension, minus the editor. What is tested here is what a
 * running VS Code cannot be asked about: which node a cursor line falls in,
 * which book a file belongs to, and that an unsaved buffer compiles.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { compileFile } from '../src/compile.js';
import { findEntry, nodeAt, nodesOf, whereIs, outline, plain, rewriteImages } from '../tools/vscode/book.mjs';
import { imagePaths } from '../src/emit.js';

const THORNWOOD = resolve('test/fixtures/thornwood.md');
const HOUSE = resolve('examples/house/book.yaml');

test('a node knows the file it was written in, by the path the compiler was given', () => {
  const { story } = compileFile(THORNWOOD);
  const nodes = nodesOf(story);
  assert.ok(nodes.length > 0);
  for (const entry of nodes) assert.equal(resolve(entry.file), THORNWOOD);
});

test('the cursor on a heading is already inside that node', () => {
  const { story } = compileFile(THORNWOOD);
  const begin = whereIs(story, 'begin');
  const source = readFileSync(THORNWOOD, 'utf8').split('\n');

  // `line` counts from 1 and points at the heading itself.
  assert.match(source[begin.line - 1], /^#/);
  assert.equal(nodeAt(story, THORNWOOD, begin.line)?.id, 'begin');
  assert.equal(nodeAt(story, THORNWOOD, begin.line + 1)?.id, 'begin');
});

test('a line above every node belongs to no node, which is the frontmatter', () => {
  const { story } = compileFile(THORNWOOD);
  assert.equal(nodeAt(story, THORNWOOD, 1), null);
});

test('a line inside a node stays with it until the next heading', () => {
  const { story } = compileFile(THORNWOOD);
  const ordered = nodesOf(story).sort((a, b) => a.line - b.line);
  for (const [i, entry] of ordered.entries()) {
    const next = ordered[i + 1];
    const last = next ? next.line - 1 : entry.line + 1;
    assert.equal(nodeAt(story, THORNWOOD, last)?.id, entry.id, `line ${last}`);
  }
});

test('a chapter of a book finds its book.yaml, a lone file is its own book', () => {
  const chapter = resolve('examples/house/de/cellar.md');
  assert.equal(findEntry(chapter), HOUSE);
  assert.equal(findEntry(THORNWOOD), THORNWOOD);
  assert.equal(findEntry(HOUSE), HOUSE);
});

test('the search for a book.yaml stops where the workspace does', () => {
  const chapter = resolve('examples/house/de/cellar.md');
  assert.equal(findEntry(chapter, { stop: resolve('examples/house/de') }), chapter);
});

test('every node of a book names the chapter file it stands in', () => {
  const { story } = compileFile(HOUSE);
  const cellar = resolve('examples/house/de/cellar.md');
  const here = nodesOf(story).filter((entry) => resolve(entry.file) === cellar);
  assert.ok(here.length > 0);
  assert.equal(nodeAt(story, cellar, here[0].line)?.id, here[0].id);
});

test('the outline lists the ways on without playing the node', () => {
  const { story } = compileFile(THORNWOOD);
  const view = outline(story, 'begin');
  assert.equal(view.title, 'Am Waldrand');
  const targets = view.ways.map((way) => way.target);
  assert.deepEqual(targets, ['thicket', 'brook', 'crypt']);
  // The third one asks for the lantern, so it is not always there.
  assert.equal(view.ways[0].conditional, false);
  assert.equal(view.ways[2].conditional, true);
  assert.ok(view.ways.every((way) => way.reachable));
});

test('an alternative keeps its shape in a label, a printed value admits it has none', () => {
  assert.equal(plain(['Der Weg ', { t: 'alt', items: [['links'], ['rechts']] }]), 'Der Weg {links|rechts}');
  assert.equal(plain(['Du hast ', { t: 'print', expr: { var: 'gold' } }, ' Gold']), 'Du hast {...} Gold');
});

test('a warning lands on the node it stands in', () => {
  const { story, warnings } = compileFile(THORNWOOD);
  const ordered = nodesOf(story).sort((a, b) => a.line - b.line);
  for (const message of warnings.messages) {
    if (!message.file || message.line == null) continue;
    const owner = nodeAt(story, message.file, message.line);
    if (!owner) continue;
    const view = outline(story, owner.id, warnings.messages);
    assert.ok(view.messages.includes(message), `${message.code} on ${owner.id}`);
  }
  assert.ok(ordered.length > 0);
});

test('an editor compiles the buffer it holds, not the file on disk', () => {
  const source = readFileSync(THORNWOOD, 'utf8').replace('# Am Waldrand', '# Am Waldsaum');
  const { story } = compileFile(THORNWOOD, { read: (path) => {
    assert.equal(resolve(path), THORNWOOD);
    return source;
  } });
  assert.equal(story.nodes.de.begin.title, 'Am Waldsaum');
});

test('a book reads every chapter through the editor, the book.yaml included', () => {
  const seen = [];
  const { story } = compileFile(HOUSE, { read: (path) => {
    seen.push(resolve(path));
    return readFileSync(path, 'utf8');
  } });
  assert.ok(seen.includes(HOUSE));
  assert.ok(seen.includes(resolve('examples/house/de/cellar.md')));
  assert.ok(Object.keys(story.nodes[story.meta.default]).length > 0);
});

test('a fight lists its exits as ways on, a branch its choices', () => {
  const { story } = compileFile(THORNWOOD);
  const nodes = nodesOf(story);
  const fight = nodes.find((entry) => JSON.stringify(entry.node.body).includes('"combat"'));
  assert.ok(fight, 'die Fixture hat einen Kampf');
  const ways = outline(story, fight.id).ways.filter((way) => way.kind === 'combat');
  assert.ok(ways.length > 0);
  // Whether a fight is won or fled is a question for a playthrough, never for
  // the outline, so every exit is conditional.
  assert.ok(ways.every((way) => way.conditional));

  const branched = nodes.find((entry) => JSON.stringify(entry.node.body).includes('"branch"'));
  if (branched) {
    const inside = outline(story, branched.id).ways;
    assert.ok(inside.every((way) => way.target === null || typeof way.target === 'string'));
  }
});

test('every image in a book gets the address its host can open', () => {
  const entry = resolve('examples/leuchtturm/book.yaml');
  const { story } = compileFile(entry);
  const paths = imagePaths(story);
  assert.ok(paths.length > 0, 'leuchtturm hat ein Bild');

  const seen = [];
  const copy = rewriteImages(story, (src) => { seen.push(src); return `host://${src}`; });
  // The same pictures the bundler copies, no more and no fewer.
  assert.deepEqual([...new Set(seen)].sort(), [...paths].sort());
  assert.ok(JSON.stringify(copy).includes('host://'));
  assert.ok(!JSON.stringify(story).includes('host://'), 'das Buch selbst bleibt unberührt');
});
