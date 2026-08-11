/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Translations per SPEC.md 3.4.
 *
 * The default language owns structure and logic; a translation is a catalogue
 * of text. Paragraphs replace paragraphs and list items replace button labels,
 * each in source order, counted as two separate streams so that nesting never
 * has to be mirrored.
 *
 * A node written with logic is an override: it replaces that node wholesale
 * for that language, which is the escape hatch for text that genuinely needs
 * a different shape.
 */

import { CompileError } from './errors.js';
import { lex } from './lexer.js';
import { parseStory, parseInline } from './parser.js';

const LABEL_RE = /^[*+]\s+(.*)$/s;
const LINK_RE = /\[[^\]]*\]\([^)]*\)/;

/**
 * @param {string} body
 * @param {{file: string, startLine: number, namespace: string|null}} ctx
 * @returns {Map<string, {paragraphs: object[][], labels: object[][], override: object|null}>}
 */
export function parseCatalog(body, ctx) {
  const lines = lex(body, ctx);
  const entries = new Map();
  let current = null;
  let currentLines = [];

  const finish = () => {
    if (!current) return;
    if (current.overrideLines.length > 0) {
      current.override = parseOverride(current, currentLines, ctx);
    }
    entries.set(current.id, current);
  };

  const state = { counter: 0, node: { id: 'catalog' }, catalog: true };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.kind === 'heading' || line.kind === 'function') {
      finish();
      const m = line.text.match(/\{#([^}]+)\}\s*$/);
      if (!m) {
        throw new CompileError('E070',
          'a translated heading needs an explicit {#id}, or it drifts from the original', line);
      }
      current = { id: m[1], paragraphs: [], labels: [], override: null, overrideLines: [], source: { file: line.file, line: line.line } };
      currentLines = [line];
      continue;
    }
    if (!current) {
      throw new CompileError('E110', 'text before the first node in a translation', line);
    }
    currentLines.push(line);

    switch (line.kind) {
      case 'text': {
        // Same paragraph rule as the story parser, or the two would count
        // different numbers of paragraphs and E071 would fire on good text.
        const parts = [line.text];
        while (index + 1 < lines.length
          && lines[index + 1].kind === 'text'
          && lines[index + 1].depth === line.depth
          && !lines[index + 1].blankBefore) {
          index++;
          currentLines.push(lines[index]);
          parts.push(lines[index].text);
        }
        current.paragraphs.push(parseInline(parts.join(' '), line, state).parts);
        break;
      }
      case 'choice': {
        if (LINK_RE.test(line.text)) { current.overrideLines.push(line); break; }
        const m = line.text.match(LABEL_RE);
        current.labels.push(parseInline(m[1].trim(), line, state).parts);
        break;
      }
      default:
        // divert, assign, block, directive, gather: this node carries logic.
        current.overrideLines.push(line);
        break;
    }
  }
  finish();
  return entries;
}

/** Re-parses one node with the full grammar, because it overrides. */
function parseOverride(entry, lines, ctx) {
  const source = lines.map((l) => l.raw).join('\n');
  const { nodes } = parseStory(source, {
    file: ctx.file, startLine: lines[0].line, namespace: ctx.namespace,
  });
  if (nodes.length !== 1) {
    throw new CompileError('E071', `override of "${entry.id}" did not parse as one node`, lines[0]);
  }
  return nodes[0];
}

/**
 * Copies the default language's nodes and substitutes the catalogue's text.
 * @param {Map<string, object>} table nodes of the default language
 * @param {Map<string, object>} catalogue
 * @param {{lang: string, bag: object, file: string}} ctx
 * @returns {Map<string, object>} nodes for this language
 */
export function applyCatalog(table, catalogue, ctx) {
  const out = new Map();

  for (const [id, node] of table) {
    if (node.kind === 'function') {   // logic only, nothing to translate
      out.set(id, node);
      continue;
    }
    const entry = catalogue.get(node.id);
    if (!entry) {
      ctx.bag.add('E070', `"${node.id}" has no ${ctx.lang} translation`, node.source);
      out.set(id, node);
      continue;
    }
    if (entry.override) {
      const overridden = { ...entry.override, qualified: id, namespace: node.namespace, overridden: true };
      out.set(id, overridden);
      continue;
    }

    const streams = {
      paragraphs: [...entry.paragraphs],
      labels: [...entry.labels],
      bag: ctx.bag,
      lang: ctx.lang,
      id: node.id,
      source: entry.source,
    };
    const copy = structuredClone(node);
    substituteOps(copy.body, streams);

    if (streams.paragraphs.length > 0 || streams.labels.length > 0) {
      ctx.bag.add('E071',
        `"${node.id}" has ${streams.paragraphs.length} paragraph(s) and ` +
        `${streams.labels.length} label(s) too many in ${ctx.lang}`, entry.source);
    }
    out.set(id, copy);
  }

  for (const entry of catalogue.values()) {
    if (![...table.values()].some((n) => n.id === entry.id)) {
      ctx.bag.add('E070', `"${entry.id}" exists only in ${ctx.lang}`, entry.source);
    }
  }

  return out;
}

function substituteOps(ops, streams) {
  for (const op of ops ?? []) {
    switch (op.op) {
      case 'text':
        op.parts = takeParts(streams, 'paragraphs', op.parts);
        break;
      case 'choices':
        for (const item of op.items) {
          item.label = takeParts(streams, 'labels', item.label);
          substituteOps(item.body, streams);
        }
        break;
      case 'branch':
        for (const b of op.branches) substituteOps(b.body, streams);
        if (op.else) substituteOps(op.else, streams);
        break;
      case 'combat':
        for (const exit of Object.values(op.exits)) {
          if (exit.label) exit.label = takeParts(streams, 'labels', exit.label);
          if (exit.text) exit.text = takeParts(streams, 'paragraphs', exit.text);
        }
        break;
      default:
        break;
    }
  }
}

/**
 * Takes the next entry of a stream and carries the original's runtime ids and
 * conditions over to it: those are logic, and logic is not translated.
 */
function takeParts(streams, kind, original) {
  const replacement = streams[kind].shift();
  if (!replacement) {
    streams.bag.add('E071',
      `"${streams.id}" is missing a ${kind === 'labels' ? 'label' : 'paragraph'} in ${streams.lang}`,
      streams.source);
    return original;
  }
  return mergeParts(original, replacement, streams);
}

function mergeParts(original, replacement, streams) {
  const stateful = collectStateful(original);
  const incoming = collectStateful(replacement);

  if (stateful.length !== incoming.length) {
    streams.bag.add('E071',
      `"${streams.id}" has ${stateful.length} alternative(s) in the default language ` +
      `and ${incoming.length} in ${streams.lang}`, streams.source);
    return original;
  }

  for (let i = 0; i < stateful.length; i++) {
    const from = stateful[i];
    const to = incoming[i];
    if (from.t !== to.t || (from.t === 'alt' && from.kind !== to.kind)) {
      streams.bag.add('E071',
        `"${streams.id}" changes a ${from.t === 'alt' ? from.kind : from.t} into a ` +
        `${to.t === 'alt' ? to.kind : to.t} in ${streams.lang}`, streams.source);
      return original;
    }
    if (from.t === 'alt') to.id = from.id;      // runtime state stays keyed by the original
    if (from.t === 'cond') to.when = from.when; // the condition is logic, not text
  }
  return replacement;
}

/** Alternatives and conditionals, in source order, at any depth. */
function collectStateful(parts, out = []) {
  for (const part of parts ?? []) {
    if (part.t === 'alt') {
      out.push(part);
      for (const item of part.items) collectStateful(item, out);
    } else if (part.t === 'cond') {
      out.push(part);
      collectStateful(part.then, out);
      collectStateful(part.else, out);
    }
  }
  return out;
}
