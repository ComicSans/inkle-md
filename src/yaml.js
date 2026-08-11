/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * A small YAML reader for exactly the frontmatter subset SPEC.md section 6
 * uses: nested mappings by indentation, block sequences, flow mappings and
 * sequences (which may span lines), comments, and scalars.
 *
 * It is deliberately not a YAML implementation. Anything outside the subset
 * raises, which is better than a book that means something different in
 * another parser.
 */

import { CompileError } from './errors.js';

const TRUE = new Set(['true', 'yes', 'on']);
const FALSE = new Set(['false', 'no', 'off']);

/**
 * @param {string} source
 * @param {string} file for error messages
 * @returns {any}
 */
export function parseYaml(source, file = '<frontmatter>') {
  const lines = joinFlowLines(splitLines(source, file), file);
  if (lines.length === 0) return {};
  const [value, next] = parseBlock(lines, 0, lines[0].indent, file);
  if (next < lines.length) {
    throw new CompileError('E010', 'unexpected content after the top-level mapping', {
      file, line: lines[next].line, text: lines[next].text,
    });
  }
  return value;
}

function splitLines(source, file) {
  const out = [];
  source.split('\n').forEach((raw, i) => {
    const line = i + 1;
    if (raw.includes('\t') && /^\s*\t/.test(raw)) {
      throw new CompileError('E020', 'the frontmatter is indented with a tab', { file, line, text: raw });
    }
    const stripped = stripComment(raw);
    if (stripped.trim() === '') return;
    const indent = stripped.length - stripped.trimStart().length;
    out.push({ line, indent, text: stripped.trim(), raw });
  });
  return out;
}

/** Removes a trailing comment that is not inside quotes. */
function stripComment(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '#' && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i);
    }
  }
  return text;
}

/** Folds a flow mapping or sequence that runs over several lines into one. */
function joinFlowLines(lines, file) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let cur = { ...lines[i] };
    while (flowDepth(cur.text) > 0) {
      const next = lines[++i];
      if (!next) {
        throw new CompileError('E010', 'unterminated { or [ in the frontmatter', {
          file, line: cur.line, text: cur.text,
        });
      }
      cur.text = `${cur.text} ${next.text}`;
    }
    out.push(cur);
  }
  return out;
}

function flowDepth(text) {
  let depth = 0, quote = null;
  for (const c of text) {
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
  }
  return depth;
}

/**
 * Parses every line at `indent` as one mapping or sequence.
 * @returns {[any, number]} value and the index of the first line not consumed
 */
function parseBlock(lines, start, indent, file) {
  if (lines[start].text.startsWith('- ') || lines[start].text === '-') {
    return parseSequence(lines, start, indent, file);
  }
  return parseMapping(lines, start, indent, file);
}

function parseMapping(lines, start, indent, file) {
  const map = {};
  let i = start;
  while (i < lines.length && lines[i].indent >= indent) {
    const cur = lines[i];
    if (cur.indent > indent) {
      throw new CompileError('E010', 'unexpected indentation in the frontmatter', {
        file, line: cur.line, text: cur.text,
      });
    }
    const colon = findColon(cur.text);
    if (colon < 0) {
      throw new CompileError('E010', 'expected "key: value"', { file, line: cur.line, text: cur.text });
    }
    const key = unquote(cur.text.slice(0, colon).trim());
    const rest = cur.text.slice(colon + 1).trim();
    if (rest !== '') {
      map[key] = parseScalarOrFlow(rest, cur.line, file);
      i++;
      continue;
    }
    // Value is the indented block below, or an empty mapping.
    const next = lines[i + 1];
    if (!next || next.indent <= indent) {
      map[key] = {};
      i++;
      continue;
    }
    const [value, after] = parseBlock(lines, i + 1, next.indent, file);
    map[key] = value;
    i = after;
  }
  return [map, i];
}

function parseSequence(lines, start, indent, file) {
  const items = [];
  let i = start;
  while (i < lines.length && lines[i].indent === indent && (lines[i].text.startsWith('- ') || lines[i].text === '-')) {
    const cur = lines[i];
    const rest = cur.text === '-' ? '' : cur.text.slice(2).trim();
    const next = lines[i + 1];
    const hasBlock = next && next.indent > indent;

    if (rest === '') {
      if (!hasBlock) {
        throw new CompileError('E010', 'empty sequence item', { file, line: cur.line, text: cur.text });
      }
      const [value, after] = parseBlock(lines, i + 1, next.indent, file);
      items.push(value);
      i = after;
      continue;
    }

    const colon = findColon(rest);
    if (colon >= 0 && !rest.startsWith('{') && !rest.startsWith('[')) {
      // An inline mapping entry, possibly continued by an indented block that
      // belongs to the same item: "- title: x" followed by "  pick: 1".
      const key = unquote(rest.slice(0, colon).trim());
      const value = rest.slice(colon + 1).trim();
      const item = {};
      if (value !== '') {
        item[key] = parseScalarOrFlow(value, cur.line, file);
        i++;
      } else if (hasBlock) {
        const [inner, after] = parseBlock(lines, i + 1, next.indent, file);
        item[key] = inner;
        i = after;
      } else {
        item[key] = {};
        i++;
      }
      // Continuation lines of this item sit one level in, as plain mapping keys.
      while (i < lines.length && lines[i].indent > indent && !lines[i].text.startsWith('- ')) {
        const [more, after] = parseMapping(lines, i, lines[i].indent, file);
        Object.assign(item, more);
        i = after;
      }
      items.push(item);
      continue;
    }

    items.push(parseScalarOrFlow(rest, cur.line, file));
    i++;
  }
  return [items, i];
}

/** Finds the colon that separates key from value, ignoring quotes and flow. */
function findColon(text) {
  let quote = null, depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    else if (c === ':' && depth === 0 && (i + 1 === text.length || /\s/.test(text[i + 1]))) return i;
  }
  return -1;
}

function parseScalarOrFlow(text, line, file) {
  if (text.startsWith('{')) return parseFlowMap(text, line, file);
  if (text.startsWith('[')) return parseFlowSeq(text, line, file);
  return parseScalar(text);
}

function parseFlowMap(text, line, file) {
  const body = text.slice(1, findClose(text, '{', '}', line, file)).trim();
  const map = {};
  for (const part of splitFlow(body)) {
    if (part.trim() === '') continue;
    const colon = findColon(part);
    if (colon < 0) {
      throw new CompileError('E010', `expected "key: value" in { ... }`, { file, line, text: part });
    }
    map[unquote(part.slice(0, colon).trim())] = parseScalarOrFlow(part.slice(colon + 1).trim(), line, file);
  }
  return map;
}

function parseFlowSeq(text, line, file) {
  const body = text.slice(1, findClose(text, '[', ']', line, file)).trim();
  return splitFlow(body).filter((p) => p.trim() !== '').map((p) => parseScalarOrFlow(p.trim(), line, file));
}

function findClose(text, open, close, line, file) {
  let depth = 0, quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === open || (open === '{' ? c === '[' : c === '{')) depth++;
    else if (c === close || (close === '}' ? c === ']' : c === '}')) {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new CompileError('E010', `unterminated ${open}`, { file, line, text });
}

/** Splits on commas that sit at flow depth zero and outside quotes. */
function splitFlow(text) {
  const parts = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    else if (c === ',' && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts;
}

function parseScalar(text) {
  const t = text.trim();
  if (t === '') return '';
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }
  if (t === 'null' || t === '~') return null;
  if (TRUE.has(t)) return true;
  if (FALSE.has(t)) return false;
  if (/^-?\d+$/.test(t)) return Number.parseInt(t, 10);
  if (/^-?\d+\.\d+$/.test(t)) return Number.parseFloat(t);
  return t;
}

function unquote(text) {
  const t = text.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

/**
 * Splits a Markdown file into frontmatter and body.
 * @returns {{data: any, body: string, bodyStartLine: number}}
 */
export function splitFrontmatter(source, file) {
  const lines = source.split('\n');
  if (lines[0].trim() !== '---') {
    return { data: null, body: source, bodyStartLine: 1 };
  }
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end < 0) {
    throw new CompileError('E010', 'the frontmatter is never closed by a second ---', { file, line: 1 });
  }
  return {
    data: parseYaml(lines.slice(1, end).join('\n'), file),
    body: lines.slice(end + 1).join('\n'),
    bodyStartLine: end + 2,
  };
}
