#!/usr/bin/env node
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * story-weaver build    <entry> [--out file.json] [--strict] [--quiet]
 * story-weaver lint     <entry> [--strict] [--json]
 * story-weaver export   <entry> [--out file.html] [--strict] [--minify]
 * story-weaver bundle   <entry> --out DIR [--strict] [--minify]
 * story-weaver play     <entry> [--seed N] [--lang xx] [--script 1,2,a,a] [--host k=v] [--json]
 * story-weaver simulate <entry> [--runs N] [--host k=v] [--json]
 * story-weaver import   <file.ink> [--out FILE] [--title T] [--author A] [--notice FILE]
 * story-weaver mcp
 *
 * `entry` is a .md file or a book.yaml.
 */

import { writeFileSync, mkdirSync, readFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { compileFile } from './compile.js';
import { importInk } from './import.js';
import { exportHtml } from './export.js';
import { bundleFiles } from './bundle.js';
import { forHostlessOutput } from './lint.js';
import { imagePaths } from './emit.js';
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
      '  story-weaver build    <entry> [--out FILE] [--strict] [--quiet]',
      '  story-weaver lint     <entry> [--strict] [--json]',
      '  story-weaver export   <entry> [--out FILE] [--strict] [--minify]',
      '  story-weaver bundle   <entry> --out DIR [--strict] [--minify]',
      '  story-weaver play     <entry> [--seed N] [--lang xx] [--script 1,2,a] [--host k=v] [--json]',
      '  story-weaver simulate <entry> [--runs N] [--host k=v] [--json]',
      '  story-weaver mcp',
      '',
    ].join('\n'));
    return command ? 1 : 0;
  }

  const flags = new Set(rest.filter((a) => a.startsWith('--')));
  const value = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : null; };
  const out = value('--out');

  // The importer reads ink, not story-weaver, so it runs before the compiler.
  if (command === 'import') {
    const notice = value('--notice') ? readFileSync(value('--notice'), 'utf8').trimEnd() : null;
    const result = importInk(readFileSync(entry, 'utf8'), {
      title: value('--title'),
      author: value('--author'),
      notice,
    });
    for (const note of result.notes) {
      process.stderr.write(`${entry}:${note.line}: ${note.message}\n`);
    }
    if (out) {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, result.markdown);
      process.stderr.write(`wrote ${out} (${result.notes.length} note(s))\n`);
    } else {
      process.stdout.write(result.markdown);
    }
    return 0;
  }

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
  // `export` is the one output with no host to supply values, so it is the one
  // place L025 is a defect rather than a note about the book (11, 12.5).
  const raw = command === 'export' ? forHostlessOutput(warnings.messages) : warnings.messages;
  const messages = [...raw].sort((a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level]);

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

  // A bundle is several files, so it writes a directory rather than a stream.
  if (command === 'bundle') {
    if (!out) {
      process.stderr.write('bundle needs --out DIR\n');
      return 1;
    }
    mkdirSync(out, { recursive: true });
    for (const [name, contents] of Object.entries(bundleFiles(story, { minify: flags.has('--minify') }))) {
      const file = join(out, name);
      writeFileSync(file, contents);
      if (!quiet) {
        process.stderr.write(`wrote ${file} (${Math.round(Buffer.byteLength(contents) / 1024)} kB)\n`);
      }
    }
    const images = copyImages(story, dirname(entry), out);
    if (images > 0 && !quiet) process.stderr.write(`copied ${images} image file(s)\n`);
    return 0;
  }

  if (command !== 'build' && command !== 'export') {
    process.stderr.write(`unknown command "${command}"\n`);
    return 1;
  }

  const output = command === 'export'
    ? exportHtml(story, { minify: flags.has('--minify') })
    : `${JSON.stringify(story, null, 2)}\n`;
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, output);
    if (!quiet) {
      const size = Buffer.byteLength(output);
      process.stderr.write(`wrote ${out} (${Math.round(size / 1024)} kB)\n`);
    }
    // The export is one file plus the images the book links, resolved relative
    // to it (principle 6). Without this the file would be one and the pictures
    // would be missing.
    if (command === 'export') {
      const images = copyImages(story, dirname(entry), dirname(out));
      if (images > 0 && !quiet) process.stderr.write(`copied ${images} image file(s)\n`);
    }
  } else {
    process.stdout.write(output);
  }
  return 0;
}

/**
 * The images an output travels with, copied beside it (principle 6).
 *
 * A second resolution rides along when it is there: `wald@2x.png` beside
 * `wald.png` is the same picture at twice the size, which the export ignores
 * and a native host picks (22.4). Nothing checks a size, only a name, so a
 * book that ships base files alone is complete.
 *
 * @returns {number} how many files were copied
 */
function copyImages(story, from, to) {
  let copied = 0;
  for (const src of imagePaths(story)) {
    const [stem, extension] = [src.slice(0, src.lastIndexOf('.')), src.slice(src.lastIndexOf('.'))];
    for (const name of [src, `${stem}@2x${extension}`, `${stem}@3x${extension}`]) {
      const source = join(from, name);
      if (!existsSync(source)) continue;
      const target = join(to, name);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, target);
      copied++;
    }
  }
  return copied;
}

/** `--host elapsed=60,fuel=3` into the bag a boundary takes in (15.4). */
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
