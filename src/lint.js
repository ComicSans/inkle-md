/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Linter per SPEC.md section 11, plus the reachability report.
 *
 * Implemented: L001, L002, L005, L006, L007, L008, L009, L010, L012, L013,
 * L016, L017, L018, L020, L021 to L028.
 * Not yet implemented: L003, L004, L011, L014, L015 - they need either
 * constant folding over variables or a prose model, and are tracked in the
 * README.
 */

import { walkOps } from './compile.js';
import { walkExpression } from './expr.js';
import { STRING_KEYS } from './frontmatter.js';

const LEVELS = {
  L001: 'warning', L002: 'warning', L005: 'warning', L006: 'warning',
  L007: 'info', L008: 'warning', L009: 'warning', L010: 'info',
  L012: 'warning', L013: 'info', L016: 'warning', L017: 'warning', L018: 'warning',
  L020: 'warning',
  L021: 'warning', L022: 'warning', L023: 'info', L024: 'warning',
  L025: 'info', L026: 'warning', L027: 'info', L028: 'warning',
};

/** Anything that consumes the dice stream. */
const RANDOM_CALLS = new Set(['roll', 'random', 'test', 'test_luck']);

/**
 * A book does not know which output it becomes (12.5), so nothing the linter
 * says about it may assume one. L025 is the one check that does: content
 * behind a host fact is lost in an output that has no host, and nowhere else.
 * It is therefore a note about the book, and this raises it to a warning for
 * the one output where the loss is real.
 *
 * @param {object[]} messages what `lint` returned
 * @returns {object[]} the same messages, with L025 raised
 */
export function forHostlessOutput(messages) {
  return messages.map((m) => (m.code === 'L025' ? { ...m, level: 'warning' } : m));
}

export function lint(story, { table, config, lang }) {
  const out = [];
  const add = (code, detail, at) => out.push({ code, level: LEVELS[code], detail, ...at });

  // The linter walks the compiler's tree for one language: the emitted JSON
  // has its defaults stripped, and every other language shares this structure
  // by E070 and E071, so walking them again would only duplicate.
  const nodes = Object.fromEntries(table);
  const graph = buildGraph(nodes);
  // death.goto is an edge like any other: every assignment can take it.
  const entries = [story.meta.start, config.death?.goto].filter(Boolean);
  const reachable = walkGraph(entries, graph);

  for (const [id, node] of Object.entries(nodes)) {
    if (node.kind === 'function') continue;
    if (!reachable.has(id)) add('L001', `node "${id}" cannot be reached from the start`, node.source);
    if (table.get(id)?.derivedId) {
      add('L005', `node "${id}" has no {#id}; renaming its heading will break every divert`, node.source);
    }
  }

  const endings = [...reachable].filter((id) => graph.get(id)?.end);
  if (endings.length === 0) {
    add('L002', 'no reachable node ends the story with -> END', { file: story.meta.start });
  } else {
    for (const id of reachable) {
      if (!canReachAny(id, graph, new Set(endings))) {
        add('L002', `node "${id}" has no path to an ending`, nodes[id].source);
      }
    }
  }

  // Variables, items and code words, collected over the whole book.
  const read = new Set(), written = new Set();
  const granted = new Set(), tested = new Set();
  const remembered = new Set(), known = new Set();

  for (const [id, node] of Object.entries(nodes)) {
    const choiceLabels = new Map();

    walkOps(node.body, (op) => {
      if (op.op === 'assign') written.add(op.target);
      if (op.op === 'choices') {
        if (op.items.length > 7) {
          add('L013', `node "${id}" offers ${op.items.length} choices at once`, node.source);
        }
        for (const item of op.items) {
          if (item.when && rolls(item.when)) {
            add('L020',
              `a choice in "${id}" decides whether to appear by rolling dice, so it flickers ` +
              'between visits; roll inside the choice instead', item.source);
          }
          const text = plain(item.label);
          if (choiceLabels.has(text)) {
            add('L012', `node "${id}" repeats the choice "${text}"`, item.source);
          }
          choiceLabels.set(text, true);
        }
      }
    }, (expr) => {
      walkExpression(expr, (e) => {
        if (e.var !== undefined) read.add(e.var);
        if (e.call === 'test_luck') read.add('luck');
        if (!e.call) return;
        const arg = e.args?.[0]?.lit;
        if (typeof arg !== 'string') return;
        if (e.call === 'test') read.add(arg);
        if (e.call === 'take' || e.call === 'equip') granted.add(arg);
        if (e.call === 'has' || e.call === 'uses' || e.call === 'equipped' || e.call === 'use') tested.add(arg);
        if (e.call === 'remember') remembered.add(arg);
        if (e.call === 'knows' || e.call === 'forget') known.add(arg);
      });
    });
  }

  // Frontmatter expressions count as reads: a stat used only by the combat
  // formula is used, and a consumable's effect is a write.
  for (const expr of configExpressions(config)) {
    walkExpression(expr, (e) => {
      if (e.var !== undefined) read.add(e.var);
    });
  }
  for (const item of Object.values(config.items)) {
    if (item.effect?.op === 'assign') written.add(item.effect.target);
  }
  // An event assigns, so its target counts as written, or L006 would call
  // every stat an event drives "written but never read" the wrong way round.
  for (const event of Object.values(config.events ?? {})) {
    if (event.do?.op === 'assign') written.add(event.do.target);
    if (event.do?.op === 'call') {
      for (const arg of event.do.args ?? []) {
        walkExpression(arg, (e) => { if (e.var !== undefined) read.add(e.var); });
      }
      const word = event.do.args?.[0]?.lit;
      if (typeof word === 'string') {
        if (event.do.fn === 'remember') remembered.add(word);
        if (event.do.fn === 'take' || event.do.fn === 'equip') granted.add(word);
      }
    }
  }

  for (const item of config.inventory.start ?? []) granted.add(item);
  for (const block of config.setup) {
    for (const option of block.from) {
      if (option.item) granted.add(option.item);
      if (option.remember) remembered.add(option.remember);
    }
  }

  for (const name of tested) {
    if (!granted.has(name)) add('L008', `item "${name}" is tested but never granted`, {});
  }
  for (const name of granted) {
    if (!tested.has(name) && !config.items[name]) {
      add('L008', `item "${name}" is granted but never tested`, {});
    }
  }
  for (const word of known) {
    if (!remembered.has(word)) add('L009', `code word "${word}" is tested but never set`, {});
  }
  for (const word of remembered) {
    if (!known.has(word)) add('L009', `code word "${word}" is set but never tested`, {});
  }

  for (const [id, item] of Object.entries(config.items)) {
    if (!granted.has(id)) add('L016', `item "${id}" is declared but never granted`, {});
    if (item.kind === 'consumable' && !item.effect) {
      add('L018', `consumable "${id}" has no effect:`, {});
    }
    if (item.kind !== 'consumable' && item.effect) {
      add('L018', `"${id}" is not a consumable but has an effect:`, {});
    }
  }

  for (const name of Object.keys(config.stats)) {
    if (!read.has(name) && !written.has(name)) add('L010', `stat "${name}" is never used`, {});
    else if (!read.has(name)) add('L006', `stat "${name}" is written but never read`, {});
  }

  for (const enemy of Object.keys(config.enemies)) {
    if (![...Object.values(nodes)].some((n) => fights(n.body, enemy))) {
      add('L007', `enemy "${enemy}" is declared but never fought`, {});
    }
  }

  // --- facts, events and places (0.7) -------------------------------------

  const summary = report(story, nodes, graph, reachable, endings);

  for (const [name, fact] of Object.entries(config.facts ?? {})) {
    if (!read.has(name)) add('L023', `fact "${name}" is never read`, {});
    if (fact.source !== 'derived') continue;
    walkExpression(fact.value, (e) => {
      if (e.var === undefined) return;
      if (!(e.var in config.stats) || written.has(e.var)) return;
      add('L024',
        `fact "${name}" reads "${e.var}", which nothing ever writes, so it never moves`, {});
    });
  }

  for (const [name, event] of Object.entries(config.events ?? {})) {
    if (event.every !== null && !event.declaredCatchup) {
      add('L027',
        `event "${name}" recurs without max_catchup:, so a book left closed for a month `
        + 'catches up all at once', {});
    }
    if (event.do?.op === 'assign' && !read.has(event.do.target)) {
      add('L022', `event "${name}" writes "${event.do.target}", which nothing reads`, {});
    }
    const threshold = firstFiring(event);
    if (threshold !== null && threshold > summary.longestPath) {
      add('L021',
        `event "${name}" first fires at turn ${threshold}, and the longest path through the `
        + `book is ${summary.longestPath}`, {});
    }
  }

  // L028: a gather that sends the reader back into its own node is a loop, and
  // it is only a survivable one while some choice is certain to be there on the
  // next pass. Once every choice is once-only or conditional, the node runs out
  // of them, falls through to the gather and arrives at itself with nothing
  // left to offer, which the runtime can only answer by diverting again.
  for (const [id, node] of Object.entries(nodes)) {
    if (loopsOnItself(node.body, id)) {
      add('L028',
        `every choice in "${id}" can run out, and its gather diverts back into "${id}"`,
        node.source);
    }
  }

  const placeVar = config.places?.variable ?? null;
  for (const place of config.places?.table ?? []) {
    if (!place.enter) continue;
    for (const [id, node] of Object.entries(nodes)) {
      const nodeSetsPlace = setsPlace(node.body, placeVar);
      walkOps(node.body, (op) => {
        if (op.op === 'divert' && op.target?.ref === place.enter && !nodeSetsPlace) {
          add('L026',
            `"${id}" diverts into "${place.enter}" without setting the place index`, node.source);
        }
        if (op.op !== 'choices') return;
        for (const item of op.items) {
          if (item.target?.ref !== place.enter) continue;
          if (setsPlace(item.body, placeVar) || nodeSetsPlace) continue;
          add('L026',
            `a choice in "${id}" travels to "${place.enter}" without setting the place index`,
            item.source);
        }
      });
    }
  }

  // L025: the same walk again, with every host fact at its fallback, which is
  // the book a reader gets with no host at all (11, 15.4). What it says about
  // the book is a note, because a book does not know which output it becomes;
  // it is a defect only where that output is one that has no host (12.5).
  if (Object.values(config.facts ?? {}).some((f) => f.source === 'host')) {
    const constants = factConstants(config);
    const offline = buildGraph(nodes, (when) => fold(when, constants) === 0);
    const withoutHost = walkGraph(entries, offline);
    for (const id of reachable) {
      if (!withoutHost.has(id)) {
        add('L025', `"${id}" cannot be reached when every host fact takes its fallback`,
          nodes[id]?.source);
      }
    }
  }

  const overridden = config.overriddenStrings ?? [];
  if (overridden.length > 0) {
    for (const key of Object.keys(STRING_KEYS)) {
      if (!overridden.includes(key)) {
        add('L017', `strings key "${key}" is still the English default`, {});
      }
    }
  }

  return { messages: out, report: summary };
}

/** Every expression the frontmatter declares. */
function configExpressions(config) {
  const out = [];
  for (const stat of Object.values(config.stats)) {
    out.push(stat.start);
    if (stat.max && stat.max !== 'start') out.push(stat.max);
  }
  if (config.combat) out.push(config.combat.attack, config.combat.damage);
  if (config.death) out.push(config.death.when);
  if (config.checks) out.push(config.checks.dice);
  for (const fact of Object.values(config.facts ?? {})) {
    if (fact.source === 'derived') out.push(fact.value);
  }
  for (const event of Object.values(config.events ?? {})) {
    out.push(event.counter, event.when);
    if (event.do?.op === 'assign') out.push(event.do.value);
  }
  for (const item of Object.values(config.items)) {
    if (item.when) out.push(item.when);
    if (item.effect?.value) out.push(item.effect.value);
    if (item.effect?.args) out.push(...item.effect.args);
  }
  return out.filter(Boolean);
}

/**
 * @param {object} nodes the compiler's tree
 * @param {(when: object) => boolean} [prune] drops a choice whose condition
 *        is known to be false, which is how L025 walks the book a reader gets
 *        with no host at all
 */
function buildGraph(nodes, prune = () => false) {
  const graph = new Map();
  for (const [id, node] of Object.entries(nodes)) {
    const entry = { to: new Set(), end: false };
    walkOps(node.body, (op) => {
      if (op.op === 'divert') {
        if (op.target.end) entry.end = true; else entry.to.add(op.target.ref);
      }
      if (op.op === 'choices') {
        for (const item of op.items) {
          if (item.when && prune(item.when)) continue;
          if (item.target?.end) entry.end = true;
          else if (item.target) entry.to.add(item.target.ref);
        }
      }
      if (op.op === 'combat') {
        for (const exit of Object.values(op.exits)) {
          if (exit.target.end) entry.end = true; else entry.to.add(exit.target.ref);
        }
      }
    });
    graph.set(id, entry);
  }
  return graph;
}

function walkGraph(starts, graph) {
  const seen = new Set();
  const queue = [...starts];
  while (queue.length > 0) {
    const id = queue.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    for (const next of graph.get(id)?.to ?? []) queue.push(next);
  }
  return seen;
}

function canReachAny(start, graph, targets) {
  const seen = new Set();
  const queue = [start];
  while (queue.length > 0) {
    const id = queue.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    if (targets.has(id) || graph.get(id)?.end) return true;
    for (const next of graph.get(id)?.to ?? []) queue.push(next);
  }
  return false;
}

function report(story, nodes, graph, reachable, endings) {
  // Functions are not places, so they are not part of the reachability count.
  const total = Object.values(nodes).filter((n) => n.kind !== 'function').length;
  const paths = pathLengths(story.meta.start, graph);
  return {
    nodes: total,
    reachable: reachable.size,
    unreachable: total - reachable.size,
    endings: endings.length,
    shortestPath: paths.shortest,
    longestPath: paths.longest,
  };
}

/** Shortest and longest simple path from start to an ending, over choices. */
function pathLengths(start, graph) {
  let shortest = Infinity, longest = 0;
  const walk = (id, depth, seen) => {
    const entry = graph.get(id);
    if (!entry) return;
    if (entry.end || entry.to.size === 0) {
      shortest = Math.min(shortest, depth);
      longest = Math.max(longest, depth);
      return;
    }
    for (const next of entry.to) {
      if (seen.has(next)) {
        longest = Math.max(longest, depth);
        continue;
      }
      walk(next, depth + 1, new Set([...seen, next]));
    }
  };
  walk(start, 1, new Set([start]));
  return { shortest: shortest === Infinity ? 0 : shortest, longest };
}

function fights(ops, enemy) {
  let found = false;
  walkOps(ops, (op) => { if (op.op === 'combat' && op.enemies.includes(enemy)) found = true; });
  return found;
}

/** True when an expression reaches for the dice. */
function rolls(expr) {
  let found = false;
  walkExpression(expr, (e) => { if (e.call && RANDOM_CALLS.has(e.call)) found = true; });
  return found;
}

/**
 * The turn an event first fires, when that can be read off the declaration.
 * Deliberately narrow (21): only a counter of `turns()` against a literal, or
 * a `when:` of the shape `turns() >= 300`. A threshold that depends on the
 * reader is not a thing a static longest path can be compared against.
 */
function firstFiring(event) {
  if (event.counter?.call === 'turns' && event.every !== null) return event.every;
  const when = event.when;
  if (!when || !['>=', '>'].includes(when.op)) return null;
  const [left, right] = when.args ?? [];
  if (left?.call !== 'turns' || typeof right?.lit !== 'number') return null;
  return when.op === '>' ? right.lit + 1 : right.lit;
}

/**
 * True when a container sets the place. With `places.variable:` declared that
 * is an assignment to exactly that variable, however the index was arrived at.
 * Without it the rule falls back to guessing: an assignment whose value came
 * from `place()`, which is why L026 stays a warning either way (19.2).
 */
/**
 * Whether a container offers only choices that can run out and then falls
 * through to a divert back into `id`. The runtime answers that by entering the
 * node again, finding nothing to offer again, and diverting again (L028).
 */
function loopsOnItself(ops, id) {
  for (let i = 0; i < (ops ?? []).length; i++) {
    const op = ops[i];
    if (op.op === 'choices') {
      const certain = op.items.some((item) => item.sticky && item.when === null);
      const back = ops.slice(i + 1).some((o) => o.op === 'divert' && o.target?.ref === id);
      if (!certain && back) return true;
      for (const item of op.items) {
        if (loopsOnItself(item.body, id)) return true;
      }
    }
    if (op.op === 'branch') {
      for (const branch of op.branches) if (loopsOnItself(branch.body, id)) return true;
      if (loopsOnItself(op.else, id)) return true;
    }
  }
  return false;
}

function setsPlace(ops, variable) {
  let found = false;
  walkOps(ops ?? [], (op) => {
    if (op.op !== 'assign') return;
    if (variable ? op.target === variable : op.place) found = true;
  });
  return found;
}

/** Every fact that is the same on a machine with no host attached. */
function factConstants(config) {
  const known = new Map();
  for (const [name, fact] of Object.entries(config.facts ?? {})) {
    if (fact.source === 'fixed') known.set(name, fact.value);
    else if (fact.source === 'host') known.set(name, fact.fallback);
    else {
      const value = fold(fact.value, known);
      if (value !== undefined) known.set(name, value);
    }
  }
  return known;
}

/**
 * Constant folding over the facts alone: anything touching a variable, a
 * node or a die stays unknown, so a pruned edge is one that really cannot
 * be taken.
 * @returns {number|undefined}
 */
function fold(expr, known) {
  if (!expr || typeof expr !== 'object') return undefined;
  if ('lit' in expr) {
    if (typeof expr.lit === 'boolean') return expr.lit ? 1 : 0;
    return typeof expr.lit === 'number' ? expr.lit : undefined;
  }
  if ('var' in expr) return known.has(expr.var) ? known.get(expr.var) : undefined;
  if ('call' in expr || 'ref' in expr) return undefined;

  const [a, b] = expr.args ?? [];
  const x = fold(a, known);
  if (expr.op === 'not') return x === undefined ? undefined : (x ? 0 : 1);
  const y = fold(b, known);
  if (x === undefined || y === undefined) return undefined;
  switch (expr.op) {
    case 'and': return x && y ? 1 : 0;
    case 'or': return x || y ? 1 : 0;
    case '+': return x + y;
    case '-': return x - y;
    case '*': return x * y;
    case '/': return y === 0 ? undefined : Math.trunc(x / y);
    case '%': return y === 0 ? undefined : x % y;
    case '==': return x === y ? 1 : 0;
    case '!=': return x !== y ? 1 : 0;
    case '>': return x > y ? 1 : 0;
    case '<': return x < y ? 1 : 0;
    case '>=': return x >= y ? 1 : 0;
    case '<=': return x <= y ? 1 : 0;
    default: return undefined;
  }
}

function plain(parts) {
  return (parts ?? []).map((p) => (p.t === 'lit' ? p.v : '…')).join('');
}
