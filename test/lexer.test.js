/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The three collision rules of SPEC.md 4.3, 4.4 and 4.6, table-driven, plus
 * the indentation rules. These are where a Markdown dialect breaks first.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { lex } from '../src/lexer.js';
import { expectError, firstBody } from './helpers.js';

const kinds = (body) => lex(body, { file: 't.md', startLine: 1 }).map((l) => l.kind);

test('4.6: a following line only makes a block header when it is indented', () => {
  assert.deepEqual(kinds('{gold}\n-> END'), ['text', 'divert']);
  assert.deepEqual(kinds('{gold >= 3}\n  Rich.'), ['block', 'text']);
});

test('4.3: a choice marker needs a following space', () => {
  const cases = [
    ['* [Go](#x)', 'choice'],
    ['+ [Go](#x)', 'choice'],
    ['*Der Wind heult.*', 'text'],
    ['**Nein!**', 'text'],
    ['*emphasis* and more', 'text'],
    ['+1 gold', 'text'],
  ];
  for (const [line, expected] of cases) {
    assert.equal(kinds(line)[0], expected, line);
  }
});

test('4.4: a gather must follow a choice', () => {
  expectError('# A {#a}\n\nSome prose.\n\n---\n\n-> END\n', 'E120');
  const ops = firstBody('# A {#a}\n\n* [One](#a)\n---\nAfter.\n-> END\n');
  assert.equal(ops[0].op, 'choices');
  assert.equal(ops[1].op, 'text');
});

test('4.6: brace lines are text or block headers', () => {
  const cases = [
    ['{gold}', undefined, 'text'],                    // no indented line follows
    ['{!Ein Rabe kraechzt.}', undefined, 'text'],     // leading !
    ['{&a|b}', undefined, 'text'],
    ['{has("x"): ja|nein}', undefined, 'text'],       // contains a colon
    ['{gold >= 3}', '  Text.', 'block'],              // condition with a body
    ['{else}', '  Text.', 'block'],
    ['{gold}', '  Text.', 'block'],                   // ambiguous by design, body wins
  ];
  for (const [line, next, expected] of cases) {
    const source = next ? `${line}\n${next}` : line;
    assert.equal(kinds(source)[0], expected, source);
  }
});

test('indentation is two spaces, and never a tab', () => {
  expectError('# A {#a}\n\n* [One](#a)\n\tDeep.\n', 'E020');
  expectError('# A {#a}\n\n* [One](#a)\n   Deep.\n', 'E021');
  expectError('# A {#a}\n\n* [One](#a)\n    Deep.\n', 'E022');
});

test('headings, diverts, assignments and directives are classified', () => {
  assert.deepEqual(
    kinds('# A {#a}\n## B {#b}\n### Prose heading\n-> END\n~ gold = 1\n!combat goblin'),
    ['heading', 'heading', 'text', 'divert', 'assign', 'directive'],
  );
});

test('a function node is its own kind', () => {
  assert.deepEqual(kinds('# fn heal(amount)'), ['function']);
});
