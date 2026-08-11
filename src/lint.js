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
 * L016, L017, L018.
 * Not yet implemented: L003, L004, L011, L014, L015 — they need either
 * constant folding or a prose model, and are tracked in the README.
 */

import { walkOps } from './compile.js';
import { walkExpression } from './expr.js';
import { STRING_KEYS } from './frontmatter.js';

const LEVELS = {
  L001: 'warning', L002: 'warning', L005: 'warning', L006: 'warning',
  L007: 'info', L008: 'warning', L009: 'warning', L010: 'info',
  L012: 'warning', L013: 'info', L016: 'warning', L017: 'warning', L018: 'warning',
  L020: 'warning',
};

/** Anything that consumes the dice stream. */
const RANDOM_CALLS = new Set(['roll', 'random', 'test', 'test_luck']);

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

  const overridden = config.overriddenStrings ?? [];
  if (overridden.length > 0) {
    for (const key of Object.keys(STRING_KEYS)) {
      if (!overridden.includes(key)) {
        add('L017', `strings key "${key}" is still the English default`, {});
      }
    }
  }

  return { messages: out, report: report(story, nodes, graph, reachable, endings) };
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
  for (const item of Object.values(config.items)) {
    if (item.when) out.push(item.when);
    if (item.effect?.value) out.push(item.effect.value);
    if (item.effect?.args) out.push(...item.effect.args);
  }
  return out.filter(Boolean);
}

function buildGraph(nodes) {
  const graph = new Map();
  for (const [id, node] of Object.entries(nodes)) {
    const entry = { to: new Set(), end: false };
    walkOps(node.body, (op) => {
      if (op.op === 'divert') {
        if (op.target.end) entry.end = true; else entry.to.add(op.target.ref);
      }
      if (op.op === 'choices') {
        for (const item of op.items) {
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

function plain(parts) {
  return (parts ?? []).map((p) => (p.t === 'lit' ? p.v : '…')).join('');
}
