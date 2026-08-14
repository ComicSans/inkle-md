/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Expressions and assignments per SPEC.md 4.7.
 *
 * Integers only, word forms of the logical operators, no string comparison.
 * Strings exist solely as arguments to the built-ins in section 5.
 *
 * AST shapes, matching the story JSON of section 9.1:
 *   { lit: 12 } | { lit: "sword" } | { var: "gold" }
 *   { op: ">=", args: [a, b] }
 *   { call: "roll", args: [a, b] }
 *   { ref: "crypt.chamber" }        // node reference, resolved later
 */

import { CompileError } from './errors.js';

/** name -> [minArgs, maxArgs, refArgIndexes] */
export const BUILTINS = {
  roll: [2, 2, []],
  random: [2, 2, []],
  test_luck: [0, 0, []],
  test: [1, 1, []],
  has: [1, 1, []],
  take: [1, 2, []],
  drop: [1, 1, []],
  uses: [1, 1, []],
  use: [1, 1, []],
  equip: [1, 1, []],
  equipped: [1, 1, []],
  remember: [1, 1, []],
  knows: [1, 1, []],
  forget: [1, 1, []],
  visits: [1, 1, [0]],
  turns: [0, 0, []],
  turns_since: [1, 1, [0]],
  choice_count: [0, 0, []],
  // Folded to the place's index at compile time, so the runtime never sees it.
  place: [1, 1, []],
  min: [2, 2, []],
  max: [2, 2, []],
  abs: [1, 1, []],
};

/**
 * What a fact may not do, per principle 8: draw a die, or change anything.
 * Everything else in BUILTINS reads state and reads it the same way twice.
 */
export const IMPURE_CALLS = new Set([
  'roll', 'random', 'test', 'test_luck',
  'take', 'drop', 'use', 'equip', 'remember', 'forget',
]);

export const BUILTIN_VARS = new Set([
  'in_combat', 'weapon_attack', 'weapon_damage', 'armour_defence',
  // How many firings a scheduled event was owed at this boundary (17.2). It
  // reads as 1 anywhere else, and E173 makes sure it is never written there.
  'due',
]);

const BINARY = {
  or: 1, and: 2,
  '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4,
  '+': 5, '-': 5,
  '*': 6, '/': 6, '%': 6,
};

const PUNCT = ['==', '!=', '<=', '>=', '+', '-', '*', '/', '%', '<', '>', '(', ')', ','];

function tokenize(src, at) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") {
      const end = src.indexOf(c, i + 1);
      if (end < 0) throw new CompileError('E130', 'unterminated string', at);
      tokens.push({ kind: 'string', value: src.slice(i + 1, end), at: i });
      i = end + 1;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9]/.test(src[j])) j++;
      if (src[j] === '.' && /[0-9]/.test(src[j + 1] ?? '')) {
        throw new CompileError('E130', 'numbers are integers; floating point is not part of the language', at);
      }
      tokens.push({ kind: 'number', value: Number.parseInt(src.slice(i, j), 10), at: i });
      i = j;
      continue;
    }
    if (/[A-Za-z_À-ɏ]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_.\-À-ɏ]/.test(src[j])) j++;
      tokens.push({ kind: 'name', value: src.slice(i, j), at: i });
      i = j;
      continue;
    }
    const punct = PUNCT.find((p) => src.startsWith(p, i));
    if (punct) { tokens.push({ kind: punct, at: i }); i += punct.length; continue; }
    if (c === '&' || c === '|' || c === '!') {
      throw new CompileError('E130',
        `use the word form instead of "${c}": and, or, not`, at);
    }
    throw new CompileError('E130', `unexpected character "${c}"`, at);
  }
  tokens.push({ kind: 'end', at: src.length });
  return tokens;
}

class Parser {
  constructor(tokens, at) { this.tokens = tokens; this.i = 0; this.at = at; }
  peek() { return this.tokens[this.i]; }
  next() { return this.tokens[this.i++]; }
  expect(kind) {
    const t = this.next();
    if (t.kind !== kind) throw new CompileError('E130', `expected "${kind}"`, this.at);
    return t;
  }

  parseExpression(minPrec = 0) {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      const op = t.kind === 'name' ? t.value : t.kind;
      const prec = BINARY[op];
      if (prec === undefined || prec < minPrec) return left;
      this.next();
      const right = this.parseExpression(prec + 1);
      left = { op, args: [left, right] };
    }
  }

  parseUnary() {
    const t = this.peek();
    if (t.kind === 'name' && t.value === 'not') { this.next(); return { op: 'not', args: [this.parseUnary()] }; }
    if (t.kind === '-') { this.next(); return { op: '-', args: [{ lit: 0 }, this.parseUnary()] }; }
    return this.parsePrimary();
  }

  parsePrimary() {
    const t = this.next();
    if (t.kind === 'number') return { lit: t.value };
    if (t.kind === 'string') return { lit: t.value };
    if (t.kind === '(') {
      const inner = this.parseExpression();
      this.expect(')');
      return inner;
    }
    if (t.kind === 'name') {
      if (t.value === 'true') return { lit: true };
      if (t.value === 'false') return { lit: false };
      if (this.peek().kind === '(') {
        this.next();
        const args = [];
        if (this.peek().kind !== ')') {
          for (;;) {
            args.push(this.parseExpression());
            if (this.peek().kind === ',') { this.next(); continue; }
            break;
          }
        }
        this.expect(')');
        return this.makeCall(t.value, args);
      }
      return { var: t.value };
    }
    throw new CompileError('E130', `unexpected "${t.kind}"`, this.at);
  }

  makeCall(name, args) {
    const sig = BUILTINS[name];
    if (sig) {
      const [min, max, refs] = sig;
      if (args.length < min || args.length > max) {
        throw new CompileError('E132',
          `${name}() takes ${min === max ? min : `${min} to ${max}`} arguments, got ${args.length}`, this.at);
      }
      for (const idx of refs) {
        const a = args[idx];
        if (a && a.var !== undefined) args[idx] = { ref: a.var };
        else if (a && typeof a.lit === 'string') args[idx] = { ref: a.lit };
        else throw new CompileError('E130', `${name}() takes a node name`, this.at);
      }
    }
    return { call: name, args };
  }
}

/**
 * @param {string} source
 * @param {object} at {file, line, text}
 * @returns {object} expression AST
 */
export function parseExpression(source, at = {}) {
  if (source.trim() === '') throw new CompileError('E130', 'empty expression', at);
  const p = new Parser(tokenize(source, at), at);
  const ast = p.parseExpression();
  if (p.peek().kind !== 'end') {
    throw new CompileError('E130', 'trailing content after the expression', at);
  }
  return ast;
}

/**
 * An assignment or a call used as a statement: the body of a `~` line and the
 * only YAML field that is a statement, `effect:` (SPEC 10.1 step 2).
 * @returns {{op: 'assign', target: string, value: object}
 *          |{op: 'call', fn: string, args: object[]}
 *          |{op: 'return', value: object|null}}
 */
export function parseStatement(source, at = {}) {
  const text = source.trim();
  if (text === '') throw new CompileError('E130', 'empty statement', at);

  if (text === 'return' || text.startsWith('return ')) {
    const rest = text.slice(6).trim();
    return { op: 'return', value: rest === '' ? null : parseExpression(rest, at) };
  }

  const m = text.match(/^([A-Za-z_À-ɏ][A-Za-z0-9_.\-À-ɏ]*)\s*(=|\+=|-=|\*=|\/=)([^=].*)$/s);
  if (m) {
    const [, target, op, rhs] = m;
    const value = parseExpression(rhs, at);
    if (op === '=') return { op: 'assign', target, value };
    return { op: 'assign', target, value: { op: op[0], args: [{ var: target }, value] } };
  }

  const expr = parseExpression(text, at);
  if (expr.call === undefined) {
    throw new CompileError('E130', 'a statement is an assignment, a call or a return', at);
  }
  return { op: 'call', fn: expr.call, args: expr.args };
}

/** Walks an expression tree, calling visit on every node. */
export function walkExpression(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const child of node.args ?? []) walkExpression(child, visit);
}
