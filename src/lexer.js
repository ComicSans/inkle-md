/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Line scanner per SPEC.md 18.2.
 *
 * The grammar is line-oriented: the kind of a line follows from its first
 * non-space characters, with the three collision rules of 4.3, 4.4 and 4.6
 * resolved here rather than left to the parser.
 */

import { CompileError } from './errors.js';

/** @typedef {'heading'|'function'|'choice'|'gather'|'divert'|'assign'|'directive'|'block'|'image'|'text'} LineKind */

/** An image is a line of its own (SPEC 5.9); this finds one anywhere. */
export const IMAGE_RE = /!\[([^\]]*)\]\(([^)]*)\)/;

const INDENT_UNIT = 2;

/**
 * @param {string} body story text without frontmatter
 * @param {{file: string, startLine: number}} ctx
 * @returns {Array<{kind: LineKind, depth: number, line: number, file: string, text: string, raw: string}>}
 */
export function lex(body, ctx) {
  const file = ctx.file ?? '<input>';
  const rawLines = body.split('\n');
  /** @type {any[]} */
  const lines = [];

  let blank = true;   // the start of a file begins a paragraph
  rawLines.forEach((raw, index) => {
    const line = (ctx.startLine ?? 1) + index;
    if (raw.trim() === '') { blank = true; return; }
    const at = { file, line, text: raw };

    const leading = raw.match(/^[ \t]*/)[0];
    if (leading.includes('\t')) {
      throw new CompileError('E020', 'indent with two spaces per level', at);
    }
    if (leading.length % INDENT_UNIT !== 0) {
      throw new CompileError('E021', `indentation is ${leading.length} spaces`, at);
    }
    lines.push({ depth: leading.length / INDENT_UNIT, line, file, text: raw.trim(), raw, blankBefore: blank });
    blank = false;
  });

  for (let i = 0; i < lines.length; i++) {
    const prev = lines[i - 1];
    if (prev && lines[i].depth > prev.depth + 1) {
      throw new CompileError('E022', `jumps from level ${prev.depth} to level ${lines[i].depth}`, lines[i]);
    }
    lines[i].kind = classify(lines[i], lines[i + 1]);
  }

  return lines;
}

function classify(cur, next) {
  const t = cur.text;

  if (/^#{1,2} /.test(t)) {
    return /^# fn\b/.test(t) ? 'function' : 'heading';
  }
  if (/^#{3,} /.test(t)) return 'text';           // a heading inside prose
  if (/^[*+] /.test(t)) return 'choice';          // the space is what makes it a choice
  if (/^-{3,}(\s|$)/.test(t)) return 'gather';
  if (t.startsWith('->')) return 'divert';
  if (/^~ /.test(t)) return 'assign';
  if (/^!\[/.test(t)) return 'image';             // SPEC 5.9, before the directive rule
  if (/^![A-Za-z]/.test(t)) return 'directive';
  if (t.startsWith('{')) return classifyBrace(t, next && next.depth > cur.depth ? next : null);
  return 'text';
}

/**
 * SPEC 5.6: a line starting with "{" is inline text if the first character
 * inside is & ! or ~, if the contents hold | or :, or if no indented line
 * follows. Otherwise it is a block header.
 */
function classifyBrace(text, next) {
  const inner = text.slice(1).trimStart();
  if (/^[&!~]/.test(inner)) return 'text';
  const close = text.lastIndexOf('}');
  const contents = close > 0 ? text.slice(1, close) : text.slice(1);
  if (contents.includes('|') || contents.includes(':')) return 'text';
  if (!next) return 'text';
  return 'block';
}

/** True for the head of a conditional chain that continues an earlier one. */
export function isElse(text) {
  return /^\{\s*else\s*\}$/.test(text.trim());
}

/** Strips the braces of a block header and returns the condition source. */
export function blockCondition(text) {
  const close = text.lastIndexOf('}');
  return text.slice(1, close < 0 ? undefined : close).trim();
}
