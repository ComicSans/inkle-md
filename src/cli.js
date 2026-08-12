#!/usr/bin/env node
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * inkle-md build    <entry> [--out file.json] [--strict] [--quiet]
 * inkle-md lint     <entry> [--strict] [--json]
 * inkle-md export   <entry> [--out file.html] [--strict]
 * inkle-md play     <entry> [--seed N] [--lang xx] [--script 1,2,a,a] [--host k=v] [--json]
 * inkle-md simulate <entry> [--runs N] [--host k=v] [--json]
 * inkle-md mcp
 *
 * `entry` is a .md file or a book.yaml.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { compileFile } from './compile.js';
import { exportHtml } from './export.js';
import { play, simulate } from './play.js';
import { serveMcp } from './mcp.js';
import { CompileError } from './errors.js';

const LEVEL_ORDER = { info: 0, warning: 1 };

function main(argv) {
  const [command, entry, ...rest] = argv;
  if (command === 'mcp') {
    return serveMcp().then(() => 0);
  }
  if (!command || !entry || ['-h', '--help'].includes(command)) {
    process.stdout.write([
      'usage:',
      '  inkle-md build    <entry> [--out FILE] [--strict] [--quiet]',
      '  inkle-md lint     <entry> [--strict] [--json]',
      '  inkle-md export   <entry> [--out FILE] [--strict]',
      '  inkle-md play     <entry> [--seed N] [--lang xx] [--script 1,2,a] [--host k=v] [--json]',
      '  inkle-md simulate <entry> [--runs N] [--host k=v] [--json]',
      '  inkle-md mcp',
      '',
    ].join('\n'));
    return command ? 1 : 0;
  }

  const flags = new Set(rest.filter((a) => a.startsWith('--')));
  const value = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : null; };
  const out = value('--out');
  const host = parseHost(value('--host'));
  const strict = flags.has('--strict');
  const json = flags.has('--json');
  const quiet = flags.has('--quiet') || json || command === 'play' || command === 'simulate';

  let result;
  try {
    result = compileFile(entry);
  } catch (error) {
    if (error instanceof CompileError) {
      for (const e of error.all ?? [error]) process.stderr.write(`${e.message}\n`);
      return 1;
    }
    throw error;
  }

  const { story, warnings } = result;
  const messages = [...warnings.messages].sort((a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level]);

  if (json && (command === 'lint' || command === 'build')) {
    process.stdout.write(`${JSON.stringify({ messages, report: warnings.report }, null, 2)}\n`);
    return strict && messages.some((m) => m.level === 'warning') ? 1 : 0;
  }

  if (!quiet) {
    for (const m of messages) {
      const where = m.file ? `${m.file}:${m.line ?? 0}: ` : '';
      process.stderr.write(`${where}${m.level} ${m.code} ${m.detail}\n`);
    }
    const r = warnings.report;
    process.stderr.write(
      `\n${r.nodes} nodes, ${r.reachable} reachable, ${r.unreachable} unreachable, ` +
      `${r.endings} ending(s), path length ${r.shortestPath} to ${r.longestPath}\n`);
  }

  if (strict && messages.some((m) => m.level === 'warning')) {
    process.stderr.write('\nfailed: --strict turns warnings into errors\n');
    return 1;
  }

  if (command === 'lint') return 0;

  if (command === 'play') {
    const script = value('--script');
    return play(story, {
      seed: value('--seed') ? Number(value('--seed')) : undefined,
      lang: value('--lang') ?? undefined,
      picks: value('--picks') ? value('--picks').split(';') : undefined,
      script: script ? script.split(',').map((m) => m.trim()) : null,
      host,
      json,
    }).then(() => 0);
  }

  if (command === 'simulate') {
    const report = simulate(story, {
      runs: value('--runs') ? Number(value('--runs')) : 300,
      host,
    });
    if (json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else {
      process.stdout.write(`${report.runs} Partien, im Schnitt ${report.averageSteps} Schritte\n`);
      for (const [node, count] of Object.entries(report.endings).sort((a, b) => b[1] - a[1])) {
        process.stdout.write(`  ${String(count).padStart(4)}  ${node}\n`);
      }
      if (report.deadEnds.length > 0) process.stdout.write(`  Sackgassen: ${report.deadEnds.length}\n`);
      if (report.unfinished > 0) process.stdout.write(`  ohne Ende abgebrochen: ${report.unfinished}\n`);
    }
    return report.deadEnds.length > 0 ? 1 : 0;
  }

  if (command !== 'build' && command !== 'export') {
    process.stderr.write(`unknown command "${command}"\n`);
    return 1;
  }

  const output = command === 'export' ? exportHtml(story) : `${JSON.stringify(story, null, 2)}\n`;
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, output);
    if (!quiet) {
      const size = Buffer.byteLength(output);
      process.stderr.write(`wrote ${out} (${Math.round(size / 1024)} kB)\n`);
    }
  } else {
    process.stdout.write(output);
  }
  return 0;
}

/** `--host elapsed=60,fuel=3` into the bag a boundary takes in (17.4). */
function parseHost(text) {
  if (!text) return null;
  const bag = {};
  for (const pair of text.split(',')) {
    const [name, raw] = pair.split('=');
    if (!name || raw === undefined) continue;
    bag[name.trim()] = Number(raw);
  }
  return Object.keys(bag).length > 0 ? bag : null;
}

const code = main(process.argv.slice(2));
if (code instanceof Promise) code.then((c) => process.exit(c));
else process.exit(code);
