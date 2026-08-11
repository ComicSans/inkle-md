/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Playing a book from the terminal, in two modes:
 *
 * - interactively, for an author who wants to walk their own text;
 * - from a script of moves, for anyone who needs the same walk twice, which
 *   is what makes a bug report reproducible.
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { Story } from './runtime.js';

const HELP = `
  1-9   eine Wahl treffen        a   angreifen
  i     Gepäck zeigen            f   fliehen
  u ID  Gegenstand benutzen      l   Glück versuchen
  e ID  Gegenstand ausrüsten     z   einen Zug zurück
  ?     diese Hilfe              q   beenden
`;

/**
 * @param {object} story story JSON
 * @param {{seed?: number, lang?: string, script?: string[], json?: boolean}} options
 */
export async function play(story, options = {}) {
  const s = new Story(story, { seed: options.seed, lang: options.lang });
  if (s.setup) s.begin(pickSetup(s, options.picks));

  if (options.script) return runScript(s, options);
  return interactive(s);
}

/** The opening choices, by id or by position, so a script can name them. */
function pickSetup(s, picks) {
  return s.setup.map((block, i) => {
    const wanted = (picks?.[i] ?? '').split(',').map((p) => p.trim()).filter(Boolean);
    if (wanted.length === block.pick) return wanted;
    return block.from.slice(0, block.pick).map((o) => o.item ?? o.remember);
  });
}

/** Applies a list of moves and reports where they ended up. */
function runScript(s, options) {
  const log = [];
  for (const move of options.script) {
    if (s.current.ended) break;
    const before = s.current.node;
    const done = apply(s, move);
    log.push({ move, from: before, to: s.current.node, ok: done });
    if (!done) break;
  }

  const result = {
    node: s.current.node,
    ended: s.current.ended,
    text: s.current.text.map((t) => t.text),
    choices: s.current.choices.map((c, i) => ({ key: i + 1, label: c.label })),
    combat: s.combat ? { enemy: s.combat.name, stamina: s.combat.enemy.stamina, round: s.combat.round } : null,
    stats: Object.fromEntries(s.stats.map((x) => [x.name, x.max ? `${x.value}/${x.max}` : x.value])),
    inventory: s.inventory.map((i) => i.id),
    memory: s.memory,
    seed: s.state.seed,
    rolls: s.state.rolls,
    log,
  };

  if (options.json) stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else if (!options.quiet) stdout.write(`${render(s)}\n`);
  return result;
}

/** One move, in the same language the interactive mode uses. */
function apply(s, move) {
  const key = String(move).trim().toLowerCase();
  if (/^[1-9]$/.test(key)) {
    const choice = s.current.choices[Number(key) - 1];
    if (!choice) return false;
    s.choose(choice.index);
    return true;
  }
  if (key === 'a') { return s.combat ? Boolean(s.attack()) : false; }
  if (key === 'l') { return s.combat ? s.testLuck() !== null : false; }
  if (key === 'f') { return s.combat ? s.flee() : false; }
  if (key === 'z') return s.undo();
  if (key.startsWith('u ')) return s.useItem(key.slice(2).trim());
  if (key.startsWith('e ')) return s.equipItem(key.slice(2).trim());
  return false;
}

async function interactive(s) {
  const rl = createInterface({ input: stdin, output: stdout });
  stdout.write(`${HELP}\n`);

  for (;;) {
    stdout.write(`\n${render(s)}\n`);
    if (s.current.ended) break;

    const answer = (await rl.question('> ')).trim();
    if (answer === 'q') break;
    if (answer === '?') { stdout.write(HELP); continue; }
    if (answer === 'i') { stdout.write(`${inventory(s)}\n`); continue; }
    if (!apply(s, answer)) stdout.write('Das geht hier nicht.\n');
  }

  rl.close();
  return s;
}

function render(s) {
  const out = [];
  for (const paragraph of s.current.text) {
    if (paragraph.text.trim() !== '') out.push(wrap(paragraph.text));
  }

  if (s.combat) {
    const fight = s.combat;
    const last = fight.log[fight.log.length - 1];
    out.push(`\n[ ${fight.name}, Ausdauer ${fight.enemy.stamina} ]`);
    if (last) out.push(`Runde ${last.round}: ${last.text}`);
    out.push(`(a) angreifen${fight.luck ? '  (l) Glück versuchen' : ''}${fight.canFlee ? '  (f) fliehen' : ''}`);
  } else if (s.current.ended) {
    out.push('\n— Ende —');
  } else {
    out.push('');
    s.current.choices.forEach((choice, i) => out.push(`  ${i + 1}) ${choice.label}`));
  }

  out.push(`\n${stats(s)}`);
  return out.join('\n');
}

function stats(s) {
  return s.stats.map((x) => `${x.label} ${x.value}${x.max ? `/${x.max}` : ''}`).join('   ');
}

function inventory(s) {
  const lines = s.inventory.length === 0
    ? ['Du trägst nichts bei dir.']
    : s.inventory
      .map((i) => `  ${i.id}  ${i.name}${i.uses > 1 ? ` (${i.uses})` : ''}${i.equipped ? ' [ausgerüstet]' : ''}${i.usable ? ' [benutzbar]' : ''}`);
  if (s.memory.length > 0) lines.push(`Gemerkt: ${s.memory.map((w) => w.toUpperCase()).join(', ')}`);
  return lines.join('\n');
}

/** Wraps at 76 columns, because a terminal is not a browser. */
function wrap(text, width = 76) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line === '') line = word;
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line !== '') lines.push(line);
  return lines.join('\n');
}

/**
 * Plays many games with pseudo-random choices and reports where they end.
 * A balance problem shows up here long before it shows up in a playthrough.
 */
export function simulate(story, { runs = 300, maxSteps = 200 } = {}) {
  const endings = {};
  const deadEnds = [];
  let steps = 0;
  let unfinished = 0;

  for (let seed = 1; seed <= runs; seed++) {
    const s = new Story(story, { seed });
    if (s.setup) s.begin(s.setup.map((block, i) => block.from
      .slice((seed + i) % Math.max(1, block.from.length - block.pick + 1))
      .slice(0, block.pick)
      .map((o) => o.item ?? o.remember)));

    const run = walk(s, { seed, maxSteps });
    steps += run.steps;
    if (run.deadEnd) deadEnds.push({ seed, node: s.current.node });
    if (run.ended) endings[s.current.node] = (endings[s.current.node] ?? 0) + 1;
    else unfinished++;
  }

  return {
    runs,
    endings,
    deadEnds,
    unfinished,
    averageSteps: Math.round((steps / runs) * 10) / 10,
  };
}

/**
 * One playthrough with a curious reader: an option not yet tried this run
 * comes first, and only when every visible option has been tried once does
 * the walk fall back to cycling. A book full of hub rooms with sticky "go
 * back" choices would trap a purely cyclic walker forever, and no human
 * reads a gamebook that way.
 */
export function walk(s, { seed = 1, maxSteps = 200 } = {}) {
  const taken = new Set();
  let steps = 0;
  while (!s.current.ended && steps < maxSteps) {
    steps++;
    if (s.combat) { s.attack(); continue; }
    const choices = s.current.choices;
    if (choices.length === 0) return { ended: false, deadEnd: true, steps };
    const fresh = choices.filter((c) => !taken.has(`${s.current.node}#${c.index}`));
    const pool = fresh.length > 0 ? fresh : choices;
    const pick = pool[(seed * 7 + steps * 3) % pool.length];
    taken.add(`${s.current.node}#${pick.index}`);
    s.choose(pick.index);
  }
  return { ended: s.current.ended, deadEnd: false, steps };
}
