/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Story JSON emission per SPEC.md 9.1.
 *
 * The compiler works with a verbose tree; what ships is the same tree with
 * everything redundant taken out:
 *
 * - file names live once in `meta.files`; a node carries its index, and an op
 *   carries only a line number, relative to nothing but the file it inherits;
 * - defaults are omitted: a choice is once-only, unconditional, targetless and
 *   bodiless unless it says otherwise;
 * - a run of plain text is a string, not `{t:"lit",v:"…"}`;
 * - `source` stays only on ops that can fail at runtime, because that is the
 *   only reason a player-facing build needs a line number at all.
 */

/** @param {Map<string, object>[]} tables one per language, in language order */
export function emitStory({ meta, config, built }) {
  const files = [];
  const fileIndex = (name) => {
    if (!name) return undefined;
    const found = files.indexOf(name);
    if (found >= 0) return found;
    files.push(name);
    return files.length - 1;
  };

  const nodes = Object.fromEntries(built.map(({ lang, table }) => [
    lang,
    Object.fromEntries([...table].map(([id, node]) => [id, emitNode(node, fileIndex)])),
  ]));

  return { format: 1, meta: { ...meta, files }, config, nodes };
}

function emitNode(node, fileIndex) {
  const out = {};
  if (node.title) out.title = node.title;
  if (node.kind === 'function') {
    out.kind = 'function';
    out.params = node.params;
  }
  const file = fileIndex(node.source?.file);
  if (file !== undefined) out.file = file;
  if (node.source?.line) out.line = node.source.line;
  out.body = node.body.map(emitOp).filter(Boolean);
  return out;
}

function emitOp(op) {
  switch (op.op) {
    case 'text': {
      const parts = emitParts(op.parts);
      if (parts.length === 0) return null;
      const out = { op: 'text', parts };
      if (op.class) out.class = op.class;
      return out;
    }

    case 'choices':
      return { op: 'choices', items: op.items.map(emitChoice) };

    case 'divert':
      return { op: 'divert', target: emitTarget(op.target) };

    case 'branch': {
      const out = {
        op: 'branch',
        branches: op.branches.map((b) => ({
          when: b.when,
          body: b.body.map(emitOp).filter(Boolean),
          ...line(b.source),
        })),
      };
      if (op.else) out.else = op.else.map(emitOp).filter(Boolean);
      return out;
    }

    case 'combat': {
      const exits = {};
      for (const [name, exit] of Object.entries(op.exits)) {
        exits[name] = { target: emitTarget(exit.target) };
        if (exit.label) exits[name].label = emitParts(exit.label);
        if (exit.text) exits[name].text = emitParts(exit.text);
      }
      return { op: 'combat', enemies: op.enemies, exits, ...line(op.source) };
    }

    case 'assign':
      return { op: 'assign', target: op.target, value: op.value, ...line(op.source) };

    case 'call':
      return { op: 'call', fn: op.fn, args: op.args, ...line(op.source) };

    case 'return':
      return op.value ? { op: 'return', value: op.value, ...line(op.source) } : { op: 'return' };

    case 'label':
      return { op: 'label', id: op.id };

    default:
      return op;
  }
}

function emitChoice(item) {
  const out = { id: item.id, label: emitParts(item.label) };
  if (item.sticky) out.sticky = true;
  if (item.when) out.when = item.when;
  if (item.target) out.target = emitTarget(item.target);
  const body = item.body.map(emitOp).filter(Boolean);
  if (body.length > 0) out.body = body;
  // Only a conditional choice can fail at runtime, so only it needs a line.
  if (item.when && item.source?.line) out.line = item.source.line;
  return out;
}

/** A target is a node id, or the string "END". Never a falsy value: an
 * absent target means "fall through to the gather", which is not the same
 * thing at all. */
function emitTarget(target) {
  return target.end ? 'END' : target.ref;
}

/** Literal runs collapse into strings; everything else keeps its shape. */
function emitParts(parts) {
  const out = [];
  for (const part of parts ?? []) {
    if (part.t === 'lit') {
      if (part.v === '') continue;
      out.push(part.v);
    } else if (part.t === 'alt') {
      out.push({ t: 'alt', kind: part.kind, id: part.id, items: part.items.map(emitParts) });
    } else if (part.t === 'cond') {
      const cond = { t: 'cond', when: part.when, then: emitParts(part.then) };
      const otherwise = emitParts(part.else);
      if (otherwise.length > 0) cond.else = otherwise;
      out.push(cond);
    } else if (part.t === 'print') {
      out.push({ t: 'print', expr: part.expr });
    }
  }
  return out;
}

function line(source) {
  return source?.line ? { line: source.line } : {};
}
