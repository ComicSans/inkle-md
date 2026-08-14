/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Story parser per SPEC.md section 4: lexed lines become nodes whose body is
 * a list of ops, the shape section 9.1 emits.
 *
 * Weave works by container: a run of choices at one depth becomes a single
 * `choices` op, and whatever follows it in the same container is the gather.
 * A choice whose target is null falls through to exactly that.
 */

import { CompileError } from './errors.js';
import { lex, blockCondition, isElse, IMAGE_RE } from './lexer.js';
import { parseExpression, parseStatement } from './expr.js';

const MAX_NESTING = 3;

const CHOICE_RE = /^([*+])\s+(?:\{([^}]*)\}\s*)?\[([^\]]*)\]\(([^)]*)\)\s*(.*)$/s;
const HEADING_RE = /^(#{1,2})\s+(.*?)(?:\s*\{#([^}]+)\})?\s*$/;
const FUNCTION_RE = /^#\s+fn\s+([A-Za-z_À-ɏ][\w\-À-ɏ]*)\s*\(([^)]*)\)\s*$/;
const GATHER_RE = /^-{3,}(?:\s*\{#([^}]+)\})?\s*$/;
const EXIT_RE = /^([A-Za-z_][\w-]*)\s+(?:->\s*(\S+)|\[([^\]]*)\]\(([^)]*)\))\s*(.*)$/s;

/**
 * @param {string} body story text without frontmatter
 * @param {{file: string, startLine: number, namespace: string|null}} ctx
 * @returns {{nodes: object[]}}
 */
export function parseStory(body, ctx) {
  const lines = lex(body, ctx);
  const nodes = [];
  let i = 0;

  // Everything before the first heading is an error rather than a silent
  // prologue: a book needs a node to start in.
  if (lines.length > 0 && lines[0].kind !== 'heading' && lines[0].kind !== 'function') {
    throw new CompileError('E110', 'text before the first node; every line belongs to a node', lines[0]);
  }

  while (i < lines.length) {
    const head = lines[i];
    const node = startNode(head, ctx);
    i++;
    const start = i;
    while (i < lines.length && lines[i].kind !== 'heading' && lines[i].kind !== 'function') i++;
    const state = { counter: 0, node };
    node.body = parseContainer(lines.slice(start, i), 0, state);
    nodes.push(node);
  }

  return { nodes };
}

function startNode(head, ctx) {
  if (head.kind === 'function') {
    const m = head.text.match(FUNCTION_RE);
    if (!m) throw new CompileError('E011', 'a function node is "# fn name(params)" and carries no {#id}', head);
    const params = m[2].split(',').map((p) => p.trim()).filter(Boolean);
    return {
      id: m[1], title: null, kind: 'function', params,
      source: { file: head.file, line: head.line }, body: [],
    };
  }
  const m = head.text.match(HEADING_RE);
  if (!m) throw new CompileError('E011', 'malformed heading', head);
  const [, hashes, title, explicitId] = m;
  const id = explicitId ?? slug(title);
  if (id.includes('.')) {
    throw new CompileError('E040', 'a node id cannot contain a dot', head);
  }
  return {
    id, title, kind: 'node', derivedId: !explicitId, level: hashes.length,
    source: { file: head.file, line: head.line }, body: [],
  };
}

/** Slugs a heading into an id, stripping dots so no second separator appears. */
export function slug(text) {
  return text.toLowerCase()
    .replace(/[.'"`]/g, '')
    .replace(/[^a-z0-9À-ɏ]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'node';
}

/**
 * Parses every line at `depth` into a list of ops. Lines deeper than `depth`
 * belong to the construct above them.
 */
function parseContainer(lines, depth, state) {
  const ops = [];
  let i = 0;

  while (i < lines.length) {
    const cur = lines[i];
    if (cur.depth < depth) break;
    if (cur.depth > depth) {
      throw new CompileError('E022', 'this line is indented under nothing that takes a block', cur);
    }

    switch (cur.kind) {
      case 'choice': {
        if (depth >= MAX_NESTING) {
          throw new CompileError('E121', `choices are nested ${depth + 1} levels deep`, cur);
        }
        const items = [];
        while (i < lines.length && lines[i].depth === depth && lines[i].kind === 'choice') {
          const [item, consumed] = parseChoice(lines, i, depth, state);
          items.push(item);
          i += consumed;
        }
        ops.push({ op: 'choices', items });
        // A gather ends the run; its content simply follows in this container.
        if (i < lines.length && lines[i].depth === depth && lines[i].kind === 'gather') {
          const m = lines[i].text.match(GATHER_RE);
          if (m && m[1]) ops.push({ op: 'label', id: m[1] });
          i++;
        }
        break;
      }

      case 'gather':
        throw new CompileError('E120', 'a gather must follow a choice', cur);

      case 'block': {
        const [op, consumed] = parseBranch(lines, i, depth, state);
        ops.push(op);
        i += consumed;
        break;
      }

      case 'directive': {
        const [op, consumed] = parseDirective(lines, i, depth, state);
        ops.push(op);
        i += consumed;
        break;
      }

      case 'divert': {
        const target = cur.text.slice(2).trim();
        if (target === '') throw new CompileError('E041', 'divert without a target', cur);
        ops.push({ op: 'divert', target: refOrEnd(target, cur), source: pos(cur) });
        i++;
        break;
      }

      case 'assign': {
        ops.push({ ...parseStatement(cur.text.slice(2), cur), source: pos(cur) });
        i++;
        break;
      }

      case 'image': {
        ops.push({ ...parseImage(cur), source: pos(cur) });
        i++;
        break;
      }

      case 'text': {
        // A paragraph runs to the next blank line, as in Markdown: the line
        // breaks an author uses to keep the source narrow are not breaks in
        // the text.
        const parts = [cur.text];
        let last = i;
        while (last + 1 < lines.length
          && lines[last + 1].kind === 'text'
          && lines[last + 1].depth === depth
          && !lines[last + 1].blankBefore) {
          last++;
          parts.push(lines[last].text);
        }
        ops.push({ ...parseInline(parts.join(' '), cur, state), source: pos(cur) });
        i = last + 1;
        break;
      }

      default:
        throw new CompileError('E011', `unexpected ${cur.kind} line`, cur);
    }
  }

  return ops;
}

function parseChoice(lines, i, depth, state) {
  const cur = lines[i];
  const m = cur.text.match(CHOICE_RE);
  if (!m) {
    throw new CompileError('E100', 'a choice is "* [button](#target) follow-on text"', cur);
  }
  const [, marker, condition, label, target, rest] = m;

  const item = {
    id: `${state.node.id}:c${state.counter++}`,
    sticky: marker === '+',
    label: parseInline(label, cur, state).parts,
    when: condition ? parseExpression(condition, cur) : null,
    target: target.trim() === '' ? null : refOrEnd(stripHash(target), cur),
    body: [],
    source: pos(cur),
  };

  // Follow-on text on the same line, then the indented block below it.
  const body = [];
  if (rest.trim() !== '') body.push({ ...parseInline(rest.trim(), cur, state), source: pos(cur) });

  let consumed = 1;
  const inner = [];
  while (i + consumed < lines.length && lines[i + consumed].depth > depth) {
    inner.push(lines[i + consumed]);
    consumed++;
  }
  if (inner.length > 0) body.push(...parseContainer(inner, depth + 1, state));
  item.body = body;
  return [item, consumed];
}

function parseBranch(lines, i, depth, state) {
  const branches = [];
  let otherwise = null;
  let consumed = 0;

  while (i + consumed < lines.length) {
    const head = lines[i + consumed];
    if (head.depth !== depth || head.kind !== 'block') break;
    if (otherwise) {
      throw new CompileError('E011', 'nothing may follow {else} in a branch', head);
    }

    const source = blockCondition(head.text);
    const when = isElse(head.text) ? null : parseExpression(source, head);
    consumed++;

    const inner = [];
    while (i + consumed < lines.length && lines[i + consumed].depth > depth) {
      inner.push(lines[i + consumed]);
      consumed++;
    }
    if (inner.length === 0) {
      throw new CompileError('E011', 'a branch needs an indented body', head);
    }
    const body = parseContainer(inner, depth + 1, state);
    if (when === null) otherwise = body;
    else branches.push({ when, body, source: pos(head) });
  }

  return [{ op: 'branch', branches, else: otherwise }, consumed];
}

function parseDirective(lines, i, depth, state) {
  const cur = lines[i];
  const m = cur.text.match(/^!([A-Za-z]+)\s*(.*)$/);
  if (!m) throw new CompileError('E152', 'malformed directive', cur);
  const [, name, argText] = m;
  if (name !== 'combat') {
    throw new CompileError('E152', `unknown directive "!${name}"; combat is the only one`, cur);
  }

  const enemies = argText.split(',').map((e) => e.trim()).filter(Boolean);
  if (enemies.length === 0) throw new CompileError('E151', '!combat needs at least one enemy', cur);

  const exits = {};
  let consumed = 1;
  while (i + consumed < lines.length && lines[i + consumed].depth > depth) {
    const line = lines[i + consumed];
    const em = line.text.match(EXIT_RE);
    if (!em) {
      throw new CompileError('E152', 'an exit is "name -> target" or "name [button](#target) text"', line);
    }
    const [, exit, plainTarget, label, linkTarget, rest] = em;
    if (!['win', 'lose', 'flee'].includes(exit)) {
      throw new CompileError('E152', `unknown exit "${exit}"; use win, lose or flee`, line);
    }
    if (exits[exit]) throw new CompileError('E152', `exit "${exit}" appears twice`, line);
    exits[exit] = {
      target: refOrEnd(stripHash(plainTarget ?? linkTarget), line),
      label: label ? parseInline(label, line, state).parts : null,
      text: rest && rest.trim() !== '' ? parseInline(rest.trim(), line, state).parts : null,
      source: pos(line),
    };
    consumed++;
  }

  if (!exits.win) throw new CompileError('E151', '!combat needs a win exit', cur);
  return [{ op: 'combat', enemies, exits, source: pos(cur) }, consumed];
}

/**
 * Inline text per 4.5: literal runs, {variable}, alternatives and conditional
 * text, plus a trailing {.class}.
 */
export function parseInline(text, at, state) {
  // An image is a line of its own (4.9). This catches one written into any
  // run of text, and every run of text comes through here: a paragraph, a
  // choice's follow-on, a gather's own text, a combat exit. The check used to
  // sit where paragraphs are read, which left the other three passing literal
  // Markdown to the reader - the same hole diverts in prose once had.
  if (IMAGE_RE.test(text)) {
    throw new CompileError('E181', 'an image is a line of its own, not part of a sentence', at);
  }

  // Glue (SPEC 4.5): the line joins the one printed before it, or the one
  // after it, instead of standing as a paragraph of its own.
  const glue = {};
  let source = text;
  if (/^\s*<>/.test(source)) { glue.before = true; source = source.replace(/^\s*<>/, ''); }
  if (/<>\s*$/.test(source)) { glue.after = true; source = source.replace(/<>\s*$/, ''); }
  text = source;

  const parts = [];
  let cssClass = null;
  let literal = '';
  let i = 0;

  const flush = () => {
    if (literal !== '') { parts.push({ t: 'lit', v: literal }); literal = ''; }
  };

  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && text[i + 1] === '{') { literal += '{'; i += 2; continue; }
    if (c !== '{') { literal += c; i++; continue; }

    const close = text.indexOf('}', i);
    if (close < 0) throw new CompileError('E130', 'unclosed { in text', at);
    const inner = text.slice(i + 1, close);
    i = close + 1;

    if (inner.startsWith('.')) {
      cssClass = inner.slice(1).trim();
      continue;
    }

    flush();
    parts.push(inlinePart(inner, at, state));
  }
  flush();

  return {
    op: 'text',
    parts,
    ...(cssClass ? { class: cssClass } : {}),
    ...(glue.before || glue.after ? { glue } : {}),
  };
}

function inlinePart(inner, at, state) {
  const id = () => `${state.node.id}:a${state.counter++}`;

  const kinds = { '&': 'cycle', '!': 'once', '~': 'random' };
  const lead = kinds[inner[0]];
  if (lead) {
    return { t: 'alt', kind: lead, id: id(), items: splitAlternatives(inner.slice(1), at, state) };
  }

  const colon = colonOutsideStrings(inner);
  if (colon >= 0) {
    // In a translation the condition is written as "?": it belongs to the
    // default language, and repeating it would duplicate logic (SPEC 3.4).
    const head = inner.slice(0, colon).trim();
    if (head === '?') {
      if (!state.catalog) {
        throw new CompileError('E130', '"?" as a condition is only allowed in a translation', at);
      }
      const placeholder = splitAlternatives(condBody(inner, colon), at, state);
      return { t: 'cond', when: null, then: placeholder[0] ?? [], else: placeholder[1] ?? [] };
    }
    const when = parseExpression(head, at);
    const arms = splitAlternatives(condBody(inner, colon), at, state);
    return { t: 'cond', when, then: arms[0] ?? [], else: arms[1] ?? [] };
  }

  if (inner.includes('|')) {
    return { t: 'alt', kind: 'seq', id: id(), items: splitAlternatives(inner, at, state) };
  }

  return { t: 'print', expr: parseExpression(inner, at) };
}

/** The arms of a conditional, without the space that follows the colon. */
function condBody(inner, colon) {
  return inner.slice(colon + 1).replace(/^ /, '');
}

function splitAlternatives(text, at, state) {
  return text.split('|').map((piece) => parseInline(piece, at, state).parts);
}

function colonOutsideStrings(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === ':') return i;
  }
  return -1;
}

function stripHash(target) {
  const t = (target ?? '').trim();
  return t.startsWith('#') ? t.slice(1) : t;
}

function refOrEnd(target, at) {
  const t = target.trim();
  if (t === 'END') return { end: true };
  if ((t.match(/\./g) ?? []).length > 1) {
    throw new CompileError('E040', `"${t}" has more than one dot`, at);
  }
  return { ref: t };
}

/**
 * One image line, `![alt](file)` per SPEC 4.9.
 *
 * Alt text is required rather than optional, which is why there is no
 * decorative image in this language: a book that has nothing to say about a
 * picture is a book whose picture carries nothing, and the reader who cannot
 * see it is owed the difference.
 */
export function parseImage(line) {
  const m = line.text.match(/^!\[([^\]]*)\]\(([^)]*)\)\s*(?:\{\.([A-Za-z][\w-]*)\})?\s*$/);
  if (!m) {
    throw new CompileError('E180', 'an image is "![alt text](file.png)"', line);
  }
  const [, alt, src, cssClass] = m;
  if (alt.trim() === '') {
    throw new CompileError('E182', 'an image needs alt text, for readers who cannot see it', line);
  }
  const path = src.trim();
  if (path === '') {
    throw new CompileError('E180', 'an image is "![alt text](file.png)"', line);
  }
  // Principle 6: what ships is the output and the files beside it. A path
  // that climbs out of that directory names something that is not shipped,
  // and a URL is not shipped at all.
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) {
    throw new CompileError('E183', `"${path}" is a URL; an image is a file beside the book`, line);
  }
  if (path.startsWith('/') || path.split('/').includes('..')) {
    throw new CompileError('E183', `"${path}" leaves the book's own directory`, line);
  }

  return { op: 'image', src: path, alt: alt.trim(), ...(cssClass ? { class: cssClass } : {}) };
}

function pos(line) {
  return { file: line.file, line: line.line };
}
