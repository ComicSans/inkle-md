/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseExpression, parseStatement } from '../src/expr.js';

test('precedence follows arithmetic, then comparison, then and/or', () => {
  assert.deepEqual(parseExpression('1 + 2 * 3'), {
    op: '+', args: [{ lit: 1 }, { op: '*', args: [{ lit: 2 }, { lit: 3 }] }],
  });
  const ast = parseExpression('gold >= 10 and not broke');
  assert.equal(ast.op, 'and');
  assert.equal(ast.args[0].op, '>=');
  assert.equal(ast.args[1].op, 'not');
});

test('only the word forms of the logical operators exist', () => {
  assert.throws(() => parseExpression('a && b'), /E130/);
  assert.throws(() => parseExpression('!a'), /E130/);
  assert.throws(() => parseExpression('a || b'), /E130/);
});

test('numbers are integers', () => {
  assert.throws(() => parseExpression('1.5'), /E130/);
});

test('built-ins are checked for arity', () => {
  assert.throws(() => parseExpression('roll(6)'), /E132/);
  assert.throws(() => parseExpression('turns(1)'), /E132/);
  assert.deepEqual(parseExpression('roll(2, 6)'), {
    call: 'roll', args: [{ lit: 2 }, { lit: 6 }],
  });
});

test('node arguments become references, not variables', () => {
  assert.deepEqual(parseExpression('visits(crypt.chamber)'), {
    call: 'visits', args: [{ ref: 'crypt.chamber' }],
  });
});

test('assignments desugar to the plain form', () => {
  assert.deepEqual(parseStatement('gold -= 3'), {
    op: 'assign', target: 'gold', value: { op: '-', args: [{ var: 'gold' }, { lit: 3 }] },
  });
  assert.deepEqual(parseStatement('take("silver key")'), {
    op: 'call', fn: 'take', args: [{ lit: 'silver key' }],
  });
  assert.deepEqual(parseStatement('return stamina'), {
    op: 'return', value: { var: 'stamina' },
  });
});

test('a statement is not just any expression', () => {
  assert.throws(() => parseStatement('gold + 1'), /E130/);
});
