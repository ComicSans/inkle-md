#!/usr/bin/env node
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * inkle-md build  <entry> [--out file.json] [--strict] [--quiet]
 * inkle-md lint   <entry> [--strict]
 * inkle-md export <entry> [--out file.html] [--strict]
 *
 * `entry` is a .md file or a book.yaml.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { compileFile } from './compile.js';
import { exportHtml } from './export.js';
import { CompileError } from './errors.js';

const LEVEL_ORDER = { info: 0, warning: 1 };

function main(argv) {
  const [command, entry, ...rest] = argv;
  if (!command || !entry || ['-h', '--help'].includes(command)) {
    process.stdout.write('usage: inkle-md build|lint|export <entry.md|book.yaml> [--out FILE] [--strict] [--quiet]\n');
    return command ? 1 : 0;
  }

  const flags = new Set(rest.filter((a) => a.startsWith('--')));
  const outIndex = rest.indexOf('--out');
  const out = outIndex >= 0 ? rest[outIndex + 1] : null;
  const strict = flags.has('--strict');
  const quiet = flags.has('--quiet');

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

process.exit(main(process.argv.slice(2)));
