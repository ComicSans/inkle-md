/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The web export of HOSTS 1, and the optional minifier that keeps
 * it under the target size.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { compileFile } from '../src/compile.js';
import { exportHtml } from '../src/export.js';

const here = dirname(fileURLToPath(import.meta.url));
const book = () => compileFile(join(here, '..', 'examples', 'thornwood-book', 'book.yaml')).story;

/** The one script block that carries runtime and view. */
function script(html) {
  return html.split('<script>')[1].split('</script>')[0];
}

test('the export is one file that carries the story, the runtime and the view', () => {
  const html = exportHtml(book());
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<script type="application\/json" id="story">/);
  assert.match(script(html), /class Story/);
  assert.doesNotMatch(html, /https?:\/\/(?!mozilla\.org)/, 'nothing is fetched at runtime');
});

test('without --minify the runtime keeps its comments', () => {
  const js = script(exportHtml(book()));
  assert.match(js, /\/\/ --- combat/, 'a comment of the runtime survived');
  assert.match(js, /\n {2}\w/, 'and so did the indentation');
});

test('--minify drops comments and indentation, and the result still parses', () => {
  const plain = exportHtml(book());
  const small = exportHtml(book(), { minify: true });

  assert.ok(small.length < plain.length * 0.9, `${small.length} is not much smaller than ${plain.length}`);
  assert.ok(gzipSync(small).length < 30 * 1024, 'the target size of section 20 holds');

  const js = script(small);
  assert.doesNotMatch(js, /^\s*\/\//m, 'no line comment is left');
  // The licence block of the export itself is not part of what gets stripped,
  // so its continuation lines are the one indentation left.
  assert.doesNotMatch(js, /^ +(?!\*)/m, 'no code line starts indented');
  assert.match(js, /class Story/, 'the code itself is untouched');

  // Parsing it is the only proof that dropping lines broke no statement.
  assert.doesNotThrow(() => new Function(js.replace(/^mount\(/m, '// mount(')));
});

test('the licence notice survives the minifier', () => {
  for (const html of [exportHtml(book()), exportHtml(book(), { minify: true })]) {
    assert.match(html, /Mozilla Public License/);
    assert.match(html, /mozilla\.org\/MPL\/2\.0/);
  }
});
