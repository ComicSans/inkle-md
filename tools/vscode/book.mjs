/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Everything the editor extension needs to know that is not the editor: which
 * book a file belongs to, which node the cursor is in, and what the compiler
 * knows about that node without playing it.
 *
 * No `vscode` import lives here on purpose. The two questions that fail
 * silently - the path a compiled node names, and the line it starts on - are
 * exactly the ones a running editor cannot be asked about, so they are
 * answered by a module that `node --test` can run.
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Where the compiler, the runtime and the view are. Two answers, in this
 * order: the project itself, one directory above the extension - then an edit
 * to `src/` is live in the panel without reinstalling anything - and failing
 * that the copy packed into the extension, which is what an installed
 * extension in `~/.vscode/extensions` has and all it has.
 *
 * @param {string} extensionDir the directory `extension.js` lives in
 * @param {(path: string) => boolean} [exists]
 * @returns {string}
 */
export function sourceDir(extensionDir, exists = existsSync) {
  const project = join(extensionDir, '..', '..', 'src');
  if (exists(join(project, 'compile.js'))) return project;
  return join(extensionDir, 'vendor', 'src');
}

/**
 * The book a file belongs to: the nearest `book.yaml` at or above it, and
 * failing that the file itself, which is a whole book in one file (SPEC 3.1).
 *
 * @param {string} filePath an absolute path to a .md file or a book.yaml
 * @param {{stop?: string, exists?: (path: string) => boolean}} [options]
 *        `stop` is the directory to give up at, the workspace root as a rule.
 * @returns {string} an absolute path, always
 */
export function findEntry(filePath, options = {}) {
  const here = resolve(filePath);
  if (here.endsWith('.yaml') || here.endsWith('.yml')) return here;

  const exists = options.exists ?? existsSync;
  const stop = options.stop ? resolve(options.stop) : null;
  let dir = dirname(here);
  for (;;) {
    const candidate = join(dir, 'book.yaml');
    if (exists(candidate)) return candidate;
    if (stop && dir === stop) break;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return here;
}

/**
 * The nodes of one language, with their source position resolved to paths the
 * editor can compare. `meta.files` holds the paths as the compiler was given
 * them, so the extension passes absolute ones and gets absolute ones back.
 *
 * @param {object} story story JSON per SPEC 9.1
 * @param {string} [lang] defaults to the book's own default language
 */
export function nodesOf(story, lang) {
  const language = story.nodes[lang] ? lang : story.meta.default;
  const files = story.meta.files ?? [];
  return Object.entries(story.nodes[language] ?? {}).map(([id, node]) => ({
    id,
    node,
    lang: language,
    file: files[node.file] ?? null,
    line: node.line ?? 1,
  }));
}

/**
 * The node a line belongs to: the last one that starts at or above it in the
 * same file. `node.line` counts from 1 and points at the heading, so a cursor
 * resting on the heading is already inside the node - which is where an author
 * writing a new page has it.
 *
 * @param {object} story
 * @param {string} filePath absolute
 * @param {number} line 1-based
 * @param {string} [lang]
 * @returns {{id: string, line: number, lang: string}|null} null outside every
 *          node, which is what the frontmatter is
 */
export function nodeAt(story, filePath, line, lang) {
  const wanted = resolve(filePath);
  let best = null;
  for (const entry of nodesOf(story, lang)) {
    if (!entry.file || resolve(entry.file) !== wanted) continue;
    if (entry.line > line) continue;
    if (!best || entry.line > best.line) best = entry;
  }
  return best ? { id: best.id, line: best.line, lang: best.lang } : null;
}

/** Where a node stands, so the editor can jump to it. */
export function whereIs(story, nodeId, lang) {
  const found = nodesOf(story, lang).find((entry) => entry.id === nodeId);
  return found ? { file: found.file, line: found.line } : null;
}

/**
 * The compiler's own reading of a node: the title, the ways on and the
 * warnings that fall inside it. No text is evaluated here - an alternative
 * has no turn yet, a `{print}` has no value, a condition has no state - so
 * this is what the book says, not what a reader would see. That is the point:
 * it is available for every node at once, including the ones no playthrough
 * has reached.
 *
 * @param {object} story
 * @param {string} nodeId
 * @param {object[]} [messages] lint messages, `{code, level, detail, file, line}`
 * @param {string} [lang]
 */
export function outline(story, nodeId, messages = [], lang) {
  const all = nodesOf(story, lang);
  const self = all.find((entry) => entry.id === nodeId);
  if (!self) return null;

  const ways = [];
  collect(self.node.body, ways);
  const known = new Set(all.map((entry) => entry.id));
  for (const way of ways) {
    way.reachable = !way.target || way.target === 'END' || known.has(way.target);
  }

  return {
    id: nodeId,
    lang: self.lang,
    title: self.node.title ?? nodeId,
    file: self.file,
    line: self.line,
    ways,
    messages: messagesFor(self, all, messages),
  };
}

/**
 * Every way out of the page, in the order it is written: choices, diverts and
 * the exits of a fight. A way inside a branch is listed too, marked as
 * conditional - it is a way out of the node, and whether the branch is taken
 * is a question only a playthrough answers.
 */
function collect(ops, out, conditional = false) {
  for (const op of ops ?? []) {
    switch (op.op) {
      case 'choices':
        for (const item of op.items ?? []) {
          out.push({
            kind: 'choice',
            label: plain(item.label),
            target: item.target ?? null,
            conditional: conditional || Boolean(item.when),
            sticky: Boolean(item.sticky),
            line: item.line ?? null,
          });
          collect(item.body, out, true);
        }
        break;

      case 'divert':
        out.push({
          kind: 'divert', label: null, target: op.target ?? null, conditional, line: null,
        });
        break;

      case 'combat':
        for (const [name, exit] of Object.entries(op.exits ?? {})) {
          out.push({
            kind: 'combat',
            label: exit.label ? plain(exit.label) : name,
            target: exit.target ?? null,
            conditional: true,
            line: op.line ?? null,
          });
        }
        break;

      case 'branch':
        for (const branch of op.branches ?? []) collect(branch.body, out, true);
        collect(op.else, out, true);
        break;

      default:
        break;
    }
  }
}

/**
 * A warning belongs to the node it stands in: same file, at or after that
 * node's heading and before the next one. A message without a position
 * belongs to the book, not to a page, and is left out here.
 */
function messagesFor(self, all, messages) {
  if (!self.file) return [];
  const mine = resolve(self.file);
  const next = all
    .filter((entry) => entry.file && resolve(entry.file) === mine && entry.line > self.line)
    .reduce((low, entry) => (low === null || entry.line < low ? entry.line : low), null);

  return messages.filter((m) => {
    if (!m.file || m.line == null) return false;
    if (resolve(m.file) !== mine) return false;
    return m.line >= self.line && (next === null || m.line < next);
  });
}

/**
 * Rewrites every image path in a book, in place on a copy. A host that cannot
 * open a file by its path - a webview - needs its own kind of address for
 * them, and the book is written with paths (SPEC 4.9).
 *
 * @param {object} story
 * @param {(src: string) => string} address
 * @returns {object} a copy; the story handed in is untouched
 */
export function rewriteImages(story, address) {
  const copy = JSON.parse(JSON.stringify(story));
  const walk = (ops) => {
    for (const op of ops ?? []) {
      if (op.op === 'image' && typeof op.src === 'string') op.src = address(op.src);
      for (const item of op.items ?? []) walk(item.body);
      for (const branch of op.branches ?? []) walk(branch.body);
      walk(op.else);
    }
  };
  for (const nodes of Object.values(copy.nodes ?? {})) {
    for (const node of Object.values(nodes)) walk(node.body);
  }
  return copy;
}

/**
 * A part list as bare text. The pieces that need a running story - an
 * alternative, a printed value - become a marker rather than a guess, because
 * a label that pretends to know its value is worse than one that admits it
 * does not.
 */
export function plain(parts) {
  if (typeof parts === 'string') return parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => {
    if (typeof part === 'string') return part;
    if (part?.t === 'alt') return `{${(part.items ?? []).map((item) => plain(item)).join('|')}}`;
    if (part?.t === 'print') return '{...}';
    return '';
  }).join('').trim();
}
