/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Reads an ink file and writes the same story as inkle-md.
 *
 * The importer covers the part of ink that inkle-md has a word for. Where ink
 * says something this language does not, the importer says so with the ink
 * line number rather than guessing: a note is not an error code from SPEC 10.3
 * or a warning from SPEC 11, because its subject is the ink source, and that
 * is not an inkle-md document.
 *
 * What is carried over: knots, stitches, weaves with their gathers and labels,
 * choices with their bracket split and conditions, diverts, variables and
 * constants, assignments, and the inline forms of varying text.
 *
 * What is reported instead: tunnels, threads, lists, external functions, and
 * weaves nested deeper than the three levels of SPEC 4.3.
 */

const RE = {
  knot: /^\s*={2,}\s*(function\s+)?([\w.]+)\s*(\([^)]*\))?\s*={0,}\s*$/,
  stitch: /^\s*=\s*(?!=)([\w.]+)\s*(\([^)]*\))?\s*$/,
  choice: /^\s*((?:[*+]\s*)+)(.*)$/,
  gather: /^\s*((?:-\s*)+)(?!>)(.*)$/,
  divert: /^\s*->\s*(.+?)\s*$/,
  logic: /^\s*~\s*(.+?)\s*$/,
  declare: /^\s*(VAR|CONST|LIST|EXTERNAL)\s+(\w+)\s*(?:=\s*(.+?))?\s*$/,
  include: /^\s*INCLUDE\s+(.+?)\s*$/,
  label: /^\s*\(\s*(\w+)\s*\)\s*/,
  condition: /^\s*\{([^}]*)\}\s*/,
  tunnel: /->\s*[\w.]+\s*->/,
  thread: /^\s*<-\s/,
};

/** ink's `raise(ref x)` mutates its argument; SPEC 4.10 has no such thing. */
const REF_FUNCTIONS = new Map([
  ['raise', (arg) => `${arg} = ${arg} + 1`],
  ['lower', (arg) => `${arg} = ${arg} - 1`],
]);

class Notes {
  constructor() { this.list = []; }

  add(line, message) { this.list.push({ line, message }); }

  get sorted() { return [...this.list].sort((a, b) => a.line - b.line); }
}

/**
 * @param {string} source an ink file
 * @param {{title?: string, author?: string, notice?: string}} options
 * @returns {{markdown: string, notes: Array<{line: number, message: string}>}}
 */
export function importInk(source, options = {}) {
  const notes = new Notes();
  // Ein ink-Text bringt Gedankenstriche in allen Breiten mit, oft mitten im
  // Wort ("gun-metal"), weil das Original sie als Bindestrich gesetzt hat.
  // Diese Beispiele kennen nur den einfachen Bindestrich, und der Quelltext
  // steht hier neben dem Spiel: was gelesen wird, soll auch dastehen.
  const plain = source.replace(/\r\n?/g, '\n').replace(/[‐-―−]/g, '-');
  const dashes = (source.match(/[‐-―−]/g) ?? []).length;
  if (dashes) notes.add(0, `${dashes} dash(es) narrowed to "-"`);
  const lines = stripComments(plain.split('\n'), notes);
  const { declarations, constants, refFunctions, body } = readDeclarations(lines, notes);
  const knots = readKnots(body, notes);

  resolveTunnels(knots, notes);
  // ink's `temp` is scoped to its knot; SPEC 3.5 keeps every variable global,
  // so a temporary becomes an ordinary one declared with the rest.
  for (const knot of knots) {
    for (const item of allItems(knot.items)) {
      if (item.kind !== 'logic') continue;
      const temp = item.code.match(/^temp\s+(\w+)\s*(.*)$/);
      if (!temp) continue;
      item.code = `${temp[1]} ${temp[2]}`;
      if (!declarations.some((d) => d.name === temp[1])) {
        declarations.push({ name: temp[1], value: '0', line: item.line });
      }
    }
  }

  const labels = collectLabels(knots);
  const read = collectReadReferences(knots, labels, constants);
  const flags = new Map();
  for (const name of read) flags.set(name, flagName(name));

  const ctx = { labels, flags, constants, refFunctions, knots, notes };
  const nodes = knots.map((knot) => ({ ...knot, tree: weave(knot.items, ctx) }));
  for (const node of nodes) weldGlue(node.tree.children, notes);
  for (const node of nodes) closeWeaves(node);
  liftTargets(nodes, ctx);
  liftDeepWeaves(nodes, ctx);
  linkFallthrough(nodes, ctx);
  for (const node of nodes) checkDepth(node.tree, notes);

  const markdown = emitBook(nodes, { ...options, ...ctx, declarations, flags, notes });
  return { markdown, notes: notes.sorted };
}

/** Strips `//` and `/* *\/` comments, and ink's `TODO:` lines. */
function stripComments(lines, notes) {
  const out = [];
  let block = false;
  for (const [index, raw] of lines.entries()) {
    let text = raw;
    if (block) {
      const end = text.indexOf('*/');
      if (end < 0) { out.push({ line: index + 1, text: '' }); continue; }
      text = text.slice(end + 2);
      block = false;
    }
    for (;;) {
      const start = text.indexOf('/*');
      if (start < 0) break;
      const end = text.indexOf('*/', start + 2);
      if (end < 0) { text = text.slice(0, start); block = true; break; }
      text = text.slice(0, start) + text.slice(end + 2);
    }
    const slashes = text.indexOf('//');
    if (slashes >= 0) text = text.slice(0, slashes);
    if (/^\s*TODO:/.test(text)) {
      notes.add(index + 1, 'TODO line dropped');
      text = '';
    }
    out.push({ line: index + 1, text: text.replace(/\u2014/g, '-') });
  }
  return out;
}

/**
 * Welds what ink glued. Inside a paragraph SPEC 4.5 joins the lines already,
 * but glue also reaches across a conditional block, and there the sentence
 * would break into three. A block whose arms only print becomes inline
 * conditional text (SPEC 4.6); what it also assigns stays a block, moved in
 * front of the paragraph so it still runs before the line is printed.
 */
function weldGlue(children, notes) {
  for (const child of children) {
    if (child.children) weldGlue(child.children, notes);
    for (const arm of child.arms ?? []) if (arm.tree) weldGlue(arm.tree.children, notes);
  }

  // A block whose arms only print, and print glued, is inline conditional
  // text; it folds into the line it was glued to, or into one of its own.
  for (let index = 0; index < children.length; index += 1) {
    const branch = children[index];
    if (branch.kind !== 'branch') continue;
    const printed = inlineArms(branch);
    if (!printed) continue;

    const left = children[index - 1];
    const glued = left && left.kind === 'text' && left.glue?.after;
    const line = glued ? left : { kind: 'text', text: '', glue: { before: false, after: true }, children: [], line: branch.line };

    const [first, other] = printed;
    line.text = `${line.text}{${first.condition}: ${first.text}|${other ? other.text : ''}}`;
    line.glue = { before: line.glue.before, after: true };
    for (const [at, arm] of printed.entries()) branch.arms[at].tree.children = arm.rest;

    const keep = printed.some((arm) => arm.rest.length > 0);
    // What the arms assign still has to run before the line is printed.
    children.splice(glued ? index - 1 : index, glued ? 2 : 1, ...(keep ? [branch, line] : [line]));
    index = Math.max(-1, index - 2);
  }

  for (let index = 0; index < children.length - 1; index += 1) {
    const left = children[index];
    const right = children[index + 1];
    if (left.kind !== 'text' || !left.glue?.after) continue;
    if (right.kind !== 'text' || !right.glue?.before) continue;
    left.text = weld(left.text, right.text);
    left.glue = { before: left.glue.before, after: right.glue.after };
    children.splice(index + 1, 1);
    index -= 1;
  }

  // What is left reached across a choice or a gather, where the two halves
  // live in different branches and no paragraph can hold both.
  for (const child of children) {
    if (child.kind === 'text' && (child.glue?.after || child.glue?.before)) {
      notes.add(child.line, 'glue reaches across a branch, the sentence breaks here');
    }
  }
}

/**
 * The arms of a block that only prints, each with what it also assigns.
 * @returns {Array<{condition: string, text: string, rest: object[]}>|null}
 */
function inlineArms(branch) {
  const arms = branch.arms ?? [];
  if (!arms.length || arms.length > 2) return null;
  const printed = [];
  for (const arm of arms) {
    const items = arm.tree?.children ?? [];
    const texts = items.filter((item) => item.kind === 'text');
    const rest = items.filter((item) => item.kind !== 'text');
    if (texts.length !== 1 || !texts[0].glue?.before) return null;
    if (rest.some((item) => item.kind !== 'logic')) return null;
    printed.push({ condition: arm.condition, text: texts[0].text, rest });
  }
  return printed;
}

/** Joins two glued halves without inventing a space before punctuation. */
function weld(left, right) {
  if (!left) return right;
  if (!right) return left;
  return /^[.,;:!?'"\u2019\u201d)]/.test(right) ? `${left}${right}` : `${left} ${right}`;
}

/**
 * Reads everything before the first knot: variables, constants, and the
 * ref-parameter helpers that get inlined at their call sites.
 */
function readDeclarations(lines, notes) {
  const declarations = [];
  const constants = new Map();
  const refFunctions = new Map(REF_FUNCTIONS);
  const body = [];
  let started = false;
  let depth = 0;

  for (const line of lines) {
    if (RE.knot.test(line.text)) started = true;
    if (started) { body.push(line); continue; }
    if (!line.text.trim()) continue;

    const include = line.text.match(RE.include);
    if (include) { notes.add(line.line, `INCLUDE ${include[1]} not followed`); continue; }

    const declare = line.text.match(RE.declare);
    if (declare) {
      const [, kind, name, value] = declare;
      if (kind === 'LIST') { notes.add(line.line, `LIST ${name} has no equivalent`); continue; }
      if (kind === 'EXTERNAL') { notes.add(line.line, `EXTERNAL ${name} has no equivalent`); continue; }
      if (kind === 'CONST') { constants.set(name, (value ?? '0').trim()); continue; }
      declarations.push({ name, value: (value ?? '0').trim(), line: line.line });
      continue;
    }

    // The preamble may hold a `{DEBUG: ...}` block and the opening divert.
    // Neither belongs in the book; `start:` is derived from the first knot.
    if (line.text.includes('{')) depth += 1;
    if (line.text.includes('}')) depth -= 1;
    if (depth > 0 || line.text.includes('}')) {
      notes.add(line.line, 'preamble block skipped');
      continue;
    }
    if (RE.divert.test(line.text)) continue;
    notes.add(line.line, `preamble line dropped: ${line.text.trim().slice(0, 40)}`);
  }
  return { declarations, constants, refFunctions, body };
}

/** How many braces a line opens, ignoring the ones it closes again. */
function braceBalance(text) {
  return (text.match(/\{/g) || []).length - (text.match(/\}/g) || []).length;
}

/**
 * Reads ink's multi-line conditional, which is the block branching of SPEC
 * 4.7 written with a colon and a closing brace:
 *
 *     { teacup:
 *         ...
 *     - else:
 *         ...
 *     }
 */
function readBranch(lines, start, head, notes) {
  const arms = [{ condition: head, lines: [] }];
  let depth = 1;
  let index = start + 1;

  for (; index < lines.length; index += 1) {
    const text = lines[index].text;
    const balance = braceBalance(text);
    if (depth === 1) {
      const arm = text.match(/^\s*-\s*(?:(else)|(.+?))\s*:\s*$/);
      if (arm && balance === 0) {
        arms.push({ condition: arm[1] ? 'else' : arm[2], lines: [] });
        continue;
      }
      if (balance < 0 && /^\s*\}\s*$/.test(text)) return { arms, end: index };
      if (balance < 0) {
        // The closing brace shares its line with text, which the arms would
        // otherwise lose.
        arms[arms.length - 1].lines.push({ ...lines[index], text: text.replace(/\}\s*$/, '') });
        return { arms, end: index };
      }
    }
    depth += balance;
    if (depth <= 0) return { arms, end: index };
    arms[arms.length - 1].lines.push(lines[index]);
  }
  notes.add(lines[start].line, 'conditional block is never closed');
  return { arms, end: lines.length - 1 };
}

/** Splits the body into knots, each holding its stitches as one item list. */
function readKnots(body, notes) {
  const knots = [];
  let current = null;

  for (let index = 0; index < body.length; index += 1) {
    const line = body[index];
    const knot = line.text.match(RE.knot);
    if (knot) {
      const [, isFunction, name] = knot;
      if (isFunction) {
        notes.add(line.line, `function ${name} inlined at its call sites`);
        current = null;
        continue;
      }
      current = { name, line: line.line, items: [] };
      knots.push(current);
      continue;
    }
    if (!current) continue;

    const stitch = line.text.match(RE.stitch);
    if (stitch) {
      current.items.push({ kind: 'stitch', name: stitch[1], line: line.line });
      continue;
    }

    // A block header may sit behind a gather or choice marker, as in
    // `- { teacup:`, so the marker is read first and the block second.
    if (braceBalance(line.text) > 0) {
      const opener = line.text.match(/^(\s*(?:[-*+]\s*)*)\{\s*(.+?)\s*:\s*$/);
      if (opener && !/[|]/.test(opener[2])) {
        const marker = opener[1].trim();
        if (marker) {
          const item = readItem({ ...line, text: `${opener[1]}` }, notes);
          if (item) current.items.push(item);
        }
        const { arms, end } = readBranch(body, index, opener[2], notes);
        current.items.push({
          kind: 'branch',
          line: line.line,
          arms: arms.map((arm) => ({
            condition: arm.condition,
            items: arm.lines.map((l) => readItem(l, notes)).filter(Boolean),
          })),
        });
        index = end;
        continue;
      }
    }

    const item = readItem(line, notes);
    if (item) current.items.push(item);
  }
  return knots;
}

/** Every item of a knot, including the ones inside conditional blocks. */
function* allItems(items) {
  for (const item of items) {
    yield item;
    if (item.then) yield item.then;
    if (item.kind === 'branch') {
      for (const arm of item.arms) yield* allItems(arm.items);
    }
  }
}

/**
 * Turns tunnels into plain diverts. A tunnel returns to the line after the
 * call; one arrow cannot express that (SPEC 2). Where every call names the
 * same place to come back to, that place becomes the target of the tunnelled
 * knot's returns and nothing is lost. Where the calls disagree, the importer
 * takes the one named and says so, because a return that goes nowhere would
 * strand the reader silently.
 */
function resolveTunnels(knots, notes) {
  const calls = new Map();
  for (const knot of knots) {
    for (const item of allItems(knot.items)) {
      if (item.kind !== 'tunnel') continue;
      if (!calls.has(item.target)) calls.set(item.target, []);
      calls.get(item.target).push(item);
    }
  }

  for (const [target, items] of calls) {
    const named = [...new Set(items.map((i) => i.back).filter(Boolean))];
    const back = named[0] ?? null;
    if (named.length > 1) {
      notes.add(items[0].line, `tunnel into "${target}" returns to ${named.length} different places, using "${back}"`);
    }
    for (const item of items) {
      if (!item.back && back) {
        notes.add(item.line, `tunnel into "${target}" returns to the caller, redirected to "${back}"`);
      }
      item.kind = 'divert';
    }
    if (!back) {
      notes.add(items[0].line, `tunnel into "${target}" has no return target`);
      continue;
    }
    const knot = knots.find((k) => k.name === target);
    if (!knot) continue;
    for (const item of allItems(knot.items)) {
      if (item.kind === 'return') { item.kind = 'divert'; item.target = back; }
    }
  }

  for (const knot of knots) {
    for (const item of allItems(knot.items)) {
      if (item.kind !== 'return') continue;
      notes.add(item.line, 'return from a tunnel that was never called, dropped');
      item.kind = 'text';
      item.text = '';
    }
  }
}

/** One source line as a weave item: choice, gather, divert, logic or text. */
function readItem(line, notes) {
  // Glue is read off the raw line and then taken out of it, so nothing
  // further down has to know it was ever there.
  const glue = { before: /^\s*<>/.test(line.text), after: /<>\s*$/.test(line.text) };
  const text = line.text.replace(/<>/g, '');
  if (!text.trim()) return null;

  if (RE.thread.test(text)) {
    notes.add(line.line, 'thread has no equivalent, line dropped');
    return null;
  }

  const choice = text.match(RE.choice);
  if (choice) {
    const depth = (choice[1].match(/[*+]/g) || []).length;
    const sticky = choice[1].includes('+');
    return { kind: 'choice', depth, sticky, ...readChoiceBody(choice[2], line, notes), line: line.line };
  }

  const gather = text.match(RE.gather);
  if (gather) {
    const depth = (gather[1].match(/-/g) || []).length;
    let rest = gather[2];
    const label = rest.match(RE.label);
    if (label) rest = rest.slice(label[0].length);
    const trailing = rest.trim();
    if (/^->/.test(trailing)) {
      return {
        kind: 'gather',
        depth,
        label: label ? label[1] : null,
        text: '',
        then: readItem({ ...line, text: trailing }, notes),
        line: line.line,
      };
    }
    return { kind: 'gather', depth, label: label ? label[1] : null, text: trailing, line: line.line };
  }

  const divert = text.match(RE.divert);
  if (divert) {
    const target = divert[1].trim();
    if (target === '->') return { kind: 'return', line: line.line };
    const tunnel = target.match(/^([\w.]+)\s*->\s*([\w.]*)$/);
    if (tunnel) return { kind: 'tunnel', target: tunnel[1], back: tunnel[2] || null, line: line.line };
    return { kind: 'divert', target, line: line.line };
  }

  const logic = text.match(RE.logic);
  if (logic) return { kind: 'logic', code: logic[1], line: line.line };

  const trailing = text.match(/^(.*?)\s*->\s*([\w.]+)\s*$/);
  if (trailing && trailing[1].trim() && !RE.tunnel.test(text)) {
    return {
      kind: 'text',
      text: trailing[1].trim(),
      glue,
      then: { kind: 'divert', target: trailing[2], line: line.line },
      line: line.line,
    };
  }
  return { kind: 'text', text: text.trim(), glue, line: line.line };
}

/** A choice line: label, condition, the bracket split, and a trailing divert. */
function readChoiceBody(rest, line, notes) {
  let body = rest;
  const label = body.match(RE.label);
  if (label) body = body.slice(label[0].length);

  // A leading `{...}` is a condition only when it has no `|` or `:`, which
  // would make it varying text that happens to open the line (SPEC 4.7).
  const conditions = [];
  for (;;) {
    const cond = body.match(RE.condition);
    if (!cond || /[|:]/.test(cond[1]) || !cond[1].trim()) break;
    conditions.push(cond[1].trim());
    body = body.slice(cond[0].length);
  }
  const condition = conditions.length
    ? conditions.map((c) => (conditions.length > 1 ? `(${c})` : c)).join(' and ')
    : null;

  let divert = null;
  const arrow = body.match(/->\s*([\w.]+)\s*$/);
  if (arrow && !RE.tunnel.test(body)) {
    divert = arrow[1];
    body = body.slice(0, arrow.index);
  }

  // ink: text before `[` shows in both, inside `[ ]` only on the button, after
  // `]` only in the text. inkle-md prints the button and the follow-on text
  // separately, so the shared part is written twice (SPEC 4.3).
  const open = body.indexOf('[');
  const close = body.indexOf(']');
  let button;
  let follow;
  if (open >= 0 && close > open) {
    const before = body.slice(0, open).trim();
    const inside = body.slice(open + 1, close).trim();
    const after = body.slice(close + 1).trim();
    button = join(before, inside);
    follow = join(before, after);
  } else {
    button = body.trim();
    follow = body.trim();
  }

  if (RE.tunnel.test(rest)) notes.add(line.line, 'tunnel on a choice, return not carried');
  return { label: label ? label[1] : null, condition, button, follow, divert };
}

/** Joins two halves of a split choice without doubling the space. */
function join(left, right) {
  if (!left) return right;
  if (!right) return left;
  return /^[.,;:!?'"’”)]/.test(right) ? `${left}${right}` : `${left} ${right}`;
}

/** Every name a `{...}` may refer to: knots, stitches, gathers and choices. */
function collectLabels(knots) {
  const labels = new Map();
  for (const knot of knots) {
    labels.set(knot.name, { kind: 'knot', id: knot.name, knot: knot.name });
    let stitch = null;
    for (const item of allItems(knot.items)) {
      if (item.kind === 'stitch') {
        stitch = item.name;
        const id = `${knot.name}_${item.name}`;
        labels.set(item.name, { kind: 'stitch', id, knot: knot.name });
        labels.set(`${knot.name}.${item.name}`, { kind: 'stitch', id, knot: knot.name });
        continue;
      }
      if (!item.label) continue;
      const id = item.kind === 'gather' ? `${knot.name}_${item.label}` : item.label;
      const entry = { kind: item.kind, id, knot: knot.name, stitch };
      labels.set(item.label, entry);
      labels.set(`${knot.name}.${item.label}`, entry);
      if (stitch) {
        labels.set(`${stitch}.${item.label}`, entry);
        labels.set(`${knot.name}.${stitch}.${item.label}`, entry);
      }
    }
  }
  return labels;
}

/**
 * Which labels are read as visit counts. A knot or stitch answers `visits()`,
 * but a choice is not a node, so those get a flag variable instead.
 */
function collectReadReferences(knots, labels, constants) {
  const read = new Set();
  const scan = (text) => {
    if (!text) return;
    for (const match of text.matchAll(/\{([^{}]*)\}/g)) {
      const inner = match[1];
      for (const word of inner.matchAll(/\b([a-zA-Z_][\w]*(?:\.[\w]+)?)\b/g)) {
        const name = word[1];
        if (constants.has(name)) continue;
        const entry = labels.get(name);
        if (entry && (entry.kind === 'choice' || entry.kind === 'gather')) read.add(name);
      }
    }
  };
  for (const knot of knots) {
    for (const item of allItems(knot.items)) {
      scan(item.text);
      scan(item.button);
      scan(item.follow);
      if (item.condition) scan(`{${item.condition}}`);
      for (const arm of item.arms ?? []) scan(`{${arm.condition}}`);
    }
  }
  return read;
}

/** A flag standing in for a choice's visit count. */
function flagName(label) {
  return `seen_${label.replace(/\./g, '_').toLowerCase()}`;
}

/**
 * Builds the weave tree. ink counts depth by the number of markers, so the
 * source indentation is decoration and is ignored.
 */
function weave(items, ctx) {
  const root = { children: [], depth: 0 };
  const stack = [root];
  let currentChoice = null;

  const containerFor = (depth) => {
    while (stack.length > depth) stack.pop();
    while (stack.length < depth) {
      const parent = stack[stack.length - 1];
      const filler = { kind: 'level', children: [], depth: stack.length };
      parent.children.push(filler);
      stack.push(filler);
    }
    return stack[stack.length - 1];
  };

  for (const item of items) {
    if (item.kind === 'stitch') {
      stack.length = 1;
      root.sawChoice = false;
      currentChoice = null;
      root.children.push({ ...item, children: [] });
      continue;
    }

    if (item.kind === 'choice') {
      const parent = containerFor(item.depth);
      const node = { ...item, children: [], depth: item.depth };
      parent.sawChoice = true;
      parent.children.push(node);
      stack.push(node);
      currentChoice = node;
      continue;
    }

    if (item.kind === 'gather') {
      // A gather closes every choice at or below its own level.
      while (stack.length > item.depth) stack.pop();
      const parent = stack[stack.length - 1];
      // ink writes a plain block of text as a gather too. Only one that
      // actually follows a choice is a gather in the sense of SPEC 4.4; the
      // rest would trip E120, so they become ordinary text.
      const node = {
        ...item,
        kind: parent.sawChoice ? 'gather' : 'block',
        children: item.then ? [{ ...item.then, children: [] }] : [],
        depth: item.depth,
      };
      parent.sawChoice = false;
      parent.children.push(node);
      stack.push(node);
      currentChoice = null;
      continue;
    }

    const parent = currentChoice ?? stack[stack.length - 1];
    if (item.kind === 'branch') {
      parent.children.push({
        ...item,
        children: [],
        arms: item.arms.map((arm) => ({ ...arm, tree: weave(arm.items, null) })),
      });
      continue;
    }
    parent.children.push({ ...item, children: [] });
    if (item.then) parent.children.push({ ...item.then, children: [] });
  }

  return root;
}

const MAX_DEPTH = 3;

/**
 * Mirrors the rule the compiler applies for E110 (src/compile.js): a run of
 * choices only ends a container when one of them is unconditional, and a
 * choice with no target falls through, so whatever follows has to carry the
 * ending.
 */
function terminates(children) {
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child.kind === 'divert') return true;

    if (child.kind === 'choice') {
      const group = [];
      let next = index;
      while (next < children.length
        && (children[next].kind === 'choice' || children[next].kind === 'level')) {
        if (children[next].kind === 'choice') group.push(children[next]);
        next += 1;
      }
      const rest = children.slice(next);
      if (group.some((item) => !item.divert) && !terminates(rest)) return false;
      if (group.some((item) => !item.condition)) return true;
      index = next - 1;
      continue;
    }

    if (child.kind === 'gather' || child.kind === 'block') {
      if (terminates(child.children ?? [])) return true;
    }
  }
  return false;
}

/**
 * In ink a knot runs on into its next stitch when nothing diverts away.
 * inkle-md wants every path to name where it goes (E110), so the fall-through
 * is written out.
 */
function linkFallthrough(nodes, ctx) {
  for (const node of nodes) {
    const children = node.tree.children ?? [];
    const marks = [];
    children.forEach((child, index) => { if (child.kind === 'stitch') marks.push(index); });

    const segments = [];
    let from = 0;
    for (const mark of marks) { segments.push([from, mark]); from = mark; }
    segments.push([from, children.length]);

    for (const [index, [begin, end]] of [...segments.entries()].reverse()) {
      const body = children.slice(begin === 0 ? 0 : begin + 1, end);
      if (terminates(body)) continue;
      const next = segments[index + 1];
      const line = children[begin]?.line ?? node.line;
      if (next) {
        const stitch = children[next[0]];
        const home = node.origin ?? node.name;
        const target = ctx.labels.get(`${home}.${stitch.name}`)?.id
          ?? ctx.labels.get(stitch.name)?.id
          ?? `${home}_${stitch.name}`;
        children.splice(end, 0, { kind: 'divert', target, resolved: true, line });
      } else {
        ctx.notes.add(line, `"${node.name}" runs out of content, ended with -> END`);
        children.push({ kind: 'divert', target: 'END', resolved: true, line });
      }
    }
  }
}

/**
 * ink closes a nested run of choices by itself: once one is taken, the flow
 * falls out to the gather above. inkle-md keeps offering the level until a
 * gather closes it, so a nested run that has none gets one.
 */
function closeWeaves(node) {
  const walk = (parent) => {
    const children = parent.children ?? [];
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      walk(child);
      for (const arm of child.arms ?? []) if (arm.tree) walk(arm.tree);
    }
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (child.kind !== 'choice' || (child.depth ?? 1) < 2) continue;
      const after = children.slice(index + 1);
      if (after.some((c) => c.kind === 'gather' && (c.depth ?? 1) <= (child.depth ?? 1))) break;
      const at = after.findIndex((c) => c.kind !== 'choice' && c.kind !== 'level');
      const cut = at < 0 ? children.length : index + 1 + at;
      children.splice(cut, 0, {
        kind: 'gather', depth: child.depth, label: null, text: '', children: [], line: child.line,
      });
      break;
    }
  };
  walk(node.tree);
}

/**
 * ink lets a divert land on any label, including one on a choice or on a
 * plain run of text. inkle-md jumps to nodes and to gathers, so a label used
 * as a target becomes a node of its own, carrying whatever followed it.
 */
function liftTargets(nodes, ctx) {
  const wanted = new Set();
  for (const node of nodes) {
    const collect = (item) => {
      if (item.kind === 'divert' && !item.resolved) wanted.add(item.target.trim().split('.').pop());
      if (item.divert) wanted.add(String(item.divert).trim().split('.').pop());
      for (const child of item.children ?? []) collect(child);
      for (const arm of item.arms ?? []) for (const child of arm.tree?.children ?? []) collect(child);
    };
    collect(node.tree);
  }

  for (let pass = 0; pass < 500; pass += 1) {
    let lifted = false;
    for (const node of [...nodes]) {

    const walk = (parent, ancestors) => {
      const children = parent.children ?? [];
      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        const home = node.origin ?? node.name;
        const entry = child.label
          ? (ctx.labels.get(`${home}.${child.label}`) ?? ctx.labels.get(child.label))
          : null;
        // A gather carries an id for the save and for translations, but it is
        // not a place a divert can name, so a gather that is jumped to has to
        // become a node as well.
        const anchored = child.kind === 'stitch';

        if (child.label && !child.liftedTarget && wanted.has(child.label) && entry && !anchored) {
          child.liftedTarget = true;
          const name = uniqueName(`${home}_${child.label}`, nodes, ctx, child.line);
          if (child.kind === 'gather') {
            liftGatherInto(parent, index, home, nodes, ctx, name,
              continuation(ancestors, parent, ctx, home, nodes));
          } else if (child.kind === 'block') {
            // Text after the label belongs to the jump target, so the rest of
            // the container moves with it and the container diverts there.
            const rest = children.splice(index, children.length - index);
            const by = Math.max(0, (child.depth ?? 1) - 1);
            const lifted = {
              children: [{ ...shift(rest[0], by), label: null }, ...rest.slice(1).map((c) => shift(c, by))],
            };
            const onwards = continuation(ancestors, parent, ctx, home, nodes);
            if (onwards && !terminates(lifted.children)) {
              lifted.children.push({ kind: 'divert', target: onwards, resolved: true, line: child.line });
            }
            children.push({ kind: 'divert', target: name, resolved: true, line: child.line });
            nodes.push({ name, origin: node.origin ?? node.name, line: child.line, tree: lifted, lifted: true });
          } else {
            const after = continuation([...ancestors, parent], child, ctx, node.origin ?? node.name, nodes);
            const lifted = { children: child.children.map((c) => shift(c, child.depth ?? 1)) };
            if (after) lifted.children.push({ kind: 'divert', target: after, resolved: true, line: child.line });
            child.children = [{ kind: 'divert', target: name, resolved: true, line: child.line }];
            nodes.push({ name, origin: node.origin ?? node.name, line: child.line, tree: lifted, lifted: true });
          }
          entry.id = name;
          ctx.notes.add(child.line, `label "${child.label}" is a divert target, lifted into "${name}"`);
          lifted = true;
          return true;
        }
        if (child.kind === 'branch') {
          for (const arm of child.arms ?? []) {
            if (arm.tree && walk(arm.tree, [...ancestors, parent])) return true;
          }
          continue;
        }
        if (walk(child, [...ancestors, parent])) return true;
      }
      return false;
    };
    walk(node.tree, []);
    }
    if (!lifted) break;
  }
}

/**
 * SPEC 4.3 stops at three levels. A weave that goes deeper is moved into a
 * node of its own, and the choice that carried it diverts there. Where the
 * lifted block runs out, it goes on to whatever the weave would have joined
 * next, so the reader lands where ink would have put them.
 */
function liftDeepWeaves(nodes, ctx) {
  for (let pass = 0; pass < 20; pass += 1) {
  const before = nodes.length;
  for (const node of [...nodes]) {
    if (node.deepChecked) continue;
    node.deepChecked = true;
    let counter = 0;
    const walk = (parent, ancestors) => {
      for (const [index, child] of (parent.children ?? []).entries()) {
        if (child.kind === 'choice' && child.depth === MAX_DEPTH) {
          const deep = child.children.filter((c) => c.kind === 'choice' || c.kind === 'gather');
          if (deep.length) {
            counter += 1;
            const name = uniqueName(`${node.name}_deep${counter}`, nodes, ctx, child.line);
            const after = continuation([...ancestors, parent], child, ctx, node.origin ?? node.name, nodes);
            child.children = child.children.filter((c) => !deep.includes(c));
            child.children.push({ kind: 'divert', target: name, resolved: true, line: child.line });
            const lifted = { children: deep.map((c) => shift(c, MAX_DEPTH)) };
            if (after) lifted.children.push({ kind: 'divert', target: after, resolved: true, line: child.line });
            else ctx.notes.add(child.line, `weave lifted into "${name}" has nothing to go on to`);
            nodes.push({ name, origin: node.origin ?? node.name, line: child.line, tree: lifted, lifted: true });
            ctx.labels.set(name, { kind: 'knot', id: name, knot: name });
            ctx.notes.add(child.line, `weave deeper than ${MAX_DEPTH} levels lifted into "${name}"`);
            continue;
          }
        }
        if (child.kind === 'branch') {
          for (const arm of child.arms ?? []) if (arm.tree) walk(arm.tree, [...ancestors, parent]);
          continue;
        }
        walk(child, [...ancestors, parent]);
      }
    };
    walk(node.tree, []);
  }
  if (nodes.length === before) break;
  }
}

/**
 * ink resolves a repeated label by context; inkle-md ids are global (SPEC
 * 3.5), so a second one gets a number and the collision is reported.
 */
function uniqueName(wanted, nodes, ctx, line) {
  if (!nodes.some((n) => n.name === wanted) && !ctx.knots.some((k) => k.name === wanted)) return wanted;
  let counter = 2;
  while (nodes.some((n) => n.name === `${wanted}${counter}`)) counter += 1;
  ctx.notes.add(line, `"${wanted}" is taken, using "${wanted}${counter}"`);
  return `${wanted}${counter}`;
}

/** Moves a lifted subtree up so its outermost choices sit at level one. */
function shift(node, by) {
  const moved = { ...node, depth: Math.max(1, (node.depth ?? 1) - by) };
  if (node.children) moved.children = node.children.map((c) => shift(c, by));
  return moved;
}

/**
 * Moves a gather's content into a node and leaves the gather itself behind,
 * so the choices above it still have something to join.
 */
function liftGatherInto(container, index, home, nodes, ctx, wanted, after) {
  const gather = container.children[index];
  // A gather may be the continuation of more than one lifted block; it moves
  // out once and every later caller is sent to the same node.
  if (gather.liftedInto) return gather.liftedInto;
  const entry = gather.label
    ? (ctx.labels.get(`${home}.${gather.label}`) ?? ctx.labels.get(gather.label))
    : null;
  const name = uniqueName(entry ? `${home}_${gather.label}` : wanted, nodes, ctx, gather.line);
  if (entry) entry.id = name;
  const rest = container.children.splice(index + 1, container.children.length - index - 1);
  const by = Math.max(0, (gather.depth ?? 1) - 1);
  const tree = {
    children: [
      ...(gather.text ? [{ kind: 'text', text: gather.text, children: [], line: gather.line }] : []),
      ...(gather.children ?? []).map((c) => shift(c, by)),
      ...rest.map((c) => shift(c, by)),
    ],
  };
  gather.text = '';
  gather.label = null;
  gather.children = [{ kind: 'divert', target: name, resolved: true, line: gather.line }];
  if (after && !terminates(tree.children)) {
    tree.children.push({ kind: 'divert', target: after, resolved: true, line: gather.line });
  }
  gather.liftedInto = name;
  nodes.push({ name, origin: home, line: gather.line, tree, lifted: true });
  return name;
}

/**
 * Where the reader goes when a lifted block ends: the next gather the weave
 * would have joined, or the divert the knot ends on.
 */
function continuation(ancestors, child, ctx, home, nodes) {
  for (let level = ancestors.length - 1; level >= 0; level -= 1) {
    const container = ancestors[level];
    const from = container.children.indexOf(level === ancestors.length - 1 ? child : ancestors[level + 1]);
    for (let at = from + 1; at < container.children.length; at += 1) {
      const sibling = container.children[at];
      if (sibling.kind !== 'gather') continue;
      // A gather that only closes a level carries nothing to go on with, so
      // the search moves outwards instead of making an empty node.
      if (!sibling.text && !(sibling.children ?? []).length && !sibling.liftedInto) continue;
      return liftGatherInto(container, at, home, nodes, ctx, `${home}_join`);
    }
    const tail = [...container.children].reverse().find((s) => s.kind === 'divert');
    if (level === 0 && tail) return tail.target;
  }
  return null;
}

/** Reports what is left over after the lift, which should be nothing. */
function checkDepth(root, notes) {
  const walk = (node) => {
    if ((node.kind === 'choice' || node.kind === 'gather') && node.depth > MAX_DEPTH) {
      notes.add(node.line, `${node.kind} nested ${node.depth} levels deep`);
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(root);
}

/** Rewrites an ink expression into one SPEC 4.8 accepts. */
function expression(code, ctx) {
  let out = code;
  for (const [name, expand] of ctx.refFunctions) {
    out = out.replace(new RegExp(`\\b${name}\\s*\\(\\s*([\\w]+)\\s*\\)`, 'g'), (_, arg) => expand(arg));
  }
  for (const [name, value] of ctx.constants) {
    out = out.replace(new RegExp(`\\b${name}\\b`, 'g'), value);
  }
  out = out.replace(/\btrue\b/g, '1').replace(/\bfalse\b/g, '0');
  out = out.replace(/&&/g, ' and ').replace(/\|\|/g, ' or ').replace(/!(?=\s*[\w(])/g, 'not ');
  for (const [label, flag] of ctx.flags) {
    out = out.replace(new RegExp(`\\b${label.replace('.', '\\.')}\\b`, 'g'), flag);
  }
  for (const [name, entry] of ctx.labels) {
    if (entry.kind !== 'knot' && entry.kind !== 'stitch') continue;
    out = out.replace(new RegExp(`(?<![\\w.])${name.replace('.', '\\.')}(?![\\w.(])`, 'g'), `visits("${entry.id}")`);
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * SPEC 4.6 has no alternatives inside alternatives, so a nested one is spread
 * into whole sentences: the surrounding text is repeated once per arm, which
 * is exactly what the language asks an author to write by hand.
 *
 * @returns {Array<{condition: string, text: string}>|null}
 */
function splitNested(text) {
  if (!text) return null;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (text[i] !== '}') continue;
    depth -= 1;
    if (depth > 0) continue;
    const inner = text.slice(start + 1, i);
    if (!inner.includes('{')) { start = -1; continue; }

    const colon = inner.indexOf(':');
    if (colon < 0) return null;
    const condition = inner.slice(0, colon).trim();
    const arms = splitTopLevel(inner.slice(colon + 1));
    if (arms.length !== 2) return null;
    const before = text.slice(0, start);
    const after = text.slice(i + 1);
    return [
      { condition, text: `${before}${arms[0].trim()}${after}` },
      { condition: 'else', text: `${before}${arms[1].trim()}${after}` },
    ];
  }
  return null;
}

/** Splits on `|` at brace depth zero. */
function splitTopLevel(text) {
  const parts = [''];
  let depth = 0;
  for (const character of text) {
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (character === '|' && depth === 0) { parts.push(''); continue; }
    parts[parts.length - 1] += character;
  }
  return parts;
}

/**
 * Rewrites the inline `{...}` forms inside a run of text, and drops ink's
 * glue. Inside a paragraph SPEC 4.5 already joins the lines, so glue is only
 * lost where it reached across a choice or a gather, and there it costs a
 * sentence break rather than a wrong turn.
 */
function inlineText(text, ctx) {
  if (!text) return '';
  const glued = text.replace(/<>/g, '').replace(/\s{2,}/g, ' ').trim();
  return glued.replace(/\{([^{}]*)\}/g, (whole, inner) => {
    if (/^[&!~]/.test(inner) || inner.includes('|') === true) {
      const lead = /^[&!~]/.test(inner) ? inner[0] : '';
      const rest = lead ? inner.slice(1) : inner;
      if (!rest.includes(':')) return `{${lead}${rest}}`;
    }
    const colon = inner.indexOf(':');
    if (colon < 0) return `{${expression(inner, ctx)}}`;
    const head = inner.slice(0, colon);
    const tail = inner.slice(colon + 1);
    return `{${expression(head, ctx)}: ${tail.trim()}}`;
  });
}

/** Resolves an ink divert target to an inkle-md id. */
function divertTarget(target, ctx, line) {
  const name = target.trim();
  if (/^(END|DONE)$/i.test(name)) return 'END';
  // ink resolves a bare label in its own knot first, and so does this.
  const entry = (ctx.knot ? ctx.labels.get(`${ctx.knot}.${name}`) : null) ?? ctx.labels.get(name);
  if (entry) return entry.id;
  ctx.notes.add(line, `divert to "${name}" not resolved`);
  return name;
}

function emitBook(nodes, ctx) {
  const { title, author, notice, declarations, flags } = ctx;
  const stats = [];
  for (const declaration of declarations) {
    stats.push(`  ${declaration.name}: { start: ${expression(declaration.value, ctx)} }`);
  }
  for (const flag of flags.values()) stats.push(`  ${flag}: { start: 0 }`);

  const head = [
    '---',
    `title: ${title ?? 'Imported story'}`,
    `author: ${author ?? 'unknown'}`,
    '',
    `start: ${nodes[0]?.name ?? 'start'}`,
    '',
    'stats:',
    ...stats,
  ];
  // The notice belongs to the file, and the only place a book may carry
  // prose that is not story is the frontmatter, as a comment.
  if (notice) head.push('', ...notice.split('\n').map((line) => (line ? `# ${line}` : '#')));
  head.push('---', '');

  const body = nodes.map((node) => emitKnot(node, ctx)).join('\n');
  return `${head.join('\n')}${body}`;
}

function emitKnot(node, ctx) {
  const out = [`# ${titleOf(node.name)} {#${node.name}}`, ''];
  emitChildren(node.tree.children, 0, out, { ...ctx, knot: node.origin ?? node.name });
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n\n`;
}

function titleOf(name) {
  return name.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function emitChildren(children, level, out, ctx) {
  for (const child of children) emitNode(child, level, out, ctx);
}

/** One run of prose, spread over a branch when it nests alternatives. */
function emitProse(source, pad, level, out, ctx) {
  const nested = splitNested(source);
  if (!nested) {
    const text = inlineText(source, ctx);
    if (text) out.push(`${pad}${text}`);
    return;
  }
  for (const arm of nested) {
    const head = arm.condition === 'else' ? 'else' : expression(arm.condition, ctx);
    const text = inlineText(arm.text, ctx);
    if (!text) continue;
    out.push(`${pad}{ ${head} }`, `${'  '.repeat(level + 1)}${text}`);
  }
}

function emitNode(node, level, out, ctx) {
  const pad = '  '.repeat(level);

  if (node.kind === 'stitch') {
    const id = ctx.labels.get(node.name)?.id ?? `${ctx.knot}_${node.name}`;
    out.push('', `## ${titleOf(node.name)} {#${id}}`, '');
    return;
  }

  if (node.kind === 'level') {
    emitChildren(node.children, level, out, ctx);
    return;
  }

  if (node.kind === 'text') {
    emitProse(node.text, pad, level, out, ctx);
    return;
  }

  if (node.kind === 'branch') {
    // SPEC 4.7 reads a `{...}` line with nothing indented under it as varying
    // text, so an arm that renders to nothing is left out entirely.
    const arms = [];
    for (const arm of node.arms) {
      const body = [];
      emitChildren(arm.tree.children, level + 1, body, ctx);
      const filled = body.filter((l) => l.trim());
      if (filled.length) arms.push({ condition: arm.condition, body: filled });
    }
    if (!arms.length) return;
    for (const arm of arms) {
      const head = arm.condition === 'else' ? 'else' : expression(arm.condition, ctx);
      out.push(`${pad}{ ${head} }`, ...arm.body);
    }
    return;
  }

  if (node.kind === 'logic') {
    out.push(`${pad}~ ${expression(node.code, ctx)}`);
    return;
  }

  if (node.kind === 'divert') {
    out.push(`${pad}-> ${node.resolved ? node.target : divertTarget(node.target, ctx, node.line)}`);
    return;
  }

  if (node.kind === 'gather' || node.kind === 'block') {
    const at = '  '.repeat(Math.max(0, node.depth - 1));
    if (node.kind === 'gather') {
      const id = node.label ? (ctx.labels.get(node.label)?.id ?? node.label) : null;
      out.push('', `${at}---${id ? ` {#${id}}` : ''}`);
      const mark = ctx.flags.get(node.label);
      if (mark) out.push(`${at}~ ${mark} = 1`);
    } else {
      out.push('');
      if (node.label) ctx.notes.add(node.line, `label "${node.label}" sits on plain text, not on a gather`);
    }
    const inner = Math.max(0, node.depth - 1);
    if (node.text) emitProse(node.text, at, inner, out, ctx);
    emitChildren(node.children, inner, out, ctx);
    return;
  }

  if (node.kind === 'choice') {
    const marker = node.sticky ? '+' : '*';
    const indent = '  '.repeat(Math.max(0, node.depth - 1));
    const condition = node.condition ? `{${expression(node.condition, ctx)}} ` : '';
    const target = node.divert ? `#${divertTarget(node.divert, ctx, node.line)}` : '';
    const button = inlineText(node.button, ctx) || '…';
    const follow = inlineText(node.follow, ctx);
    const same = follow && follow === button && !node.children.length && !node.divert;
    out.push(`${indent}${marker} ${condition}[${button}](${target})${same ? '' : (follow ? ` ${follow}` : '')}`);

    const inner = Math.max(0, node.depth - 1) + 1;
    const flag = ctx.flags.get(node.label);
    if (flag) out.push(`${'  '.repeat(inner)}~ ${flag} = 1`);
    emitChildren(node.children, inner, out, ctx);
  }
}
