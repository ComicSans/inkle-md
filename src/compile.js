/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The compile pipeline of SPEC.md 10.1: read, frontmatter, line scan, parse,
 * resolve, check, emit.
 */

import { readFileSync } from 'node:fs';
import { dirname, basename, extname, join } from 'node:path';

import { CompileError, ErrorBag } from './errors.js';
import { splitFrontmatter, parseYaml } from './yaml.js';
import { validateFrontmatter, languagesOf, DEFAULT_LANGUAGE } from './frontmatter.js';
import { parseStory } from './parser.js';
import { BUILTINS, BUILTIN_VARS, walkExpression } from './expr.js';
import { lint } from './lint.js';
import { parseCatalog, applyCatalog } from './catalog.js';
import { emitStory } from './emit.js';

export const FORMAT_VERSION = 1;

/**
 * @param {string} entry path to a .md file or a book.yaml
 * @returns {{story: object, warnings: object[]}}
 */
export function compileFile(entry) {
  if (basename(entry) === 'book.yaml' || extname(entry) === '.yaml') {
    return compileProject(entry);
  }
  const source = readFileSync(entry, 'utf8');
  return compileSources([{ file: entry, source, namespace: null }], { entry, root: dirname(entry) });
}

function compileProject(bookPath) {
  const root = dirname(bookPath);
  const data = parseYaml(readFileSync(bookPath, 'utf8'), bookPath);
  const chapters = data.chapters ?? [];
  if (chapters.length === 0) {
    throw new CompileError('E010', 'book.yaml lists no chapters', { file: bookPath, line: 1 });
  }

  const languages = languagesOf(data);
  const seen = new Set();
  const plan = chapters.map((chapter) => {
    const file = typeof chapter === 'string' ? chapter : chapter.file;
    const namespace = (typeof chapter === 'object' && chapter.as) ? String(chapter.as) : namespaceOf(file);
    if (seen.has(namespace)) {
      throw new CompileError('E031', `namespace "${namespace}" is used twice`, { file: bookPath, line: 1 });
    }
    seen.add(namespace);
    return { file, namespace };
  });

  // One directory per language, holding the same chapter file names (SPEC 3.4).
  const variants = languages.available.map((lang) => ({
    lang,
    files: plan.map(({ file, namespace }) => {
      const path = languages.explicit ? join(root, lang, file) : join(root, file);
      return { file: path, source: readFileSync(path, 'utf8'), namespace };
    }),
  }));

  return compileSources(variants, { entry: bookPath, book: data });
}

function namespaceOf(file) {
  return basename(file, extname(file)).toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * @param {Array<{lang: string, files: object[]}>|Array<{file: string, source: string, namespace: string|null}>} input
 *        language variants, or a flat file list for a single-language book
 * @param {{entry: string, book?: any}} ctx
 */
export function compileSources(input, ctx = {}) {
  const variants = input[0] && input[0].source !== undefined
    ? [{ lang: DEFAULT_LANGUAGE, files: input }]
    : input;

  const bag = new ErrorBag();
  let config = ctx.book ? validateFrontmatter(ctx.book, { file: ctx.entry, chapter: false }) : null;

  // The default language owns structure and logic; the rest are catalogues.
  const defaultLang = config?.languages.default ?? variants[0].lang;
  const primaryVariant = variants.find((v) => v.lang === defaultLang) ?? variants[0];
  const primary = buildVariant(primaryVariant, config, ctx, bag);
  config = primary.config;

  const built = [{ lang: primaryVariant.lang, table: primary.table }];
  for (const variant of variants) {
    if (variant === primaryVariant) continue;
    built.push({ lang: variant.lang, table: translateVariant(variant, primary.table, { ...ctx, config }, bag) });
  }
  built.sort((a, b) => config.languages.available.indexOf(a.lang) - config.languages.available.indexOf(b.lang));

  bag.throwIfFailed();

  const start = resolveStart(primary, config, ctx, bag);
  bag.throwIfFailed();

  const story = emitStory({
    meta: {
      title: config.title,
      author: config.author,
      version: config.version,
      start,
      languages: config.languages.available,
      default: config.languages.default,
    },
    config: {
      stats: config.stats,
      inventory: config.inventory,
      items: config.items,
      setup: config.setup,
      combat: config.combat,
      enemies: config.enemies,
      death: config.death,
      undo: config.undo,
      strings: config.strings,
    },
    built,
  });

  // The linter works on the compiler's tree, not on the slimmed output.
  const warnings = lint(story, { table: primary.table, config, lang: primaryVariant.lang });
  for (const { lang, table } of built) {
    for (const node of table.values()) {
      if (node.overridden) {
        warnings.messages.push({
          code: 'L019', level: 'info',
          detail: `"${node.qualified}" is overridden in ${lang}, so its state does not survive a language switch`,
          file: node.source?.file, line: node.source?.line,
        });
      }
    }
  }
  return { story, warnings };
}

/** Builds one non-default language from its catalogue (SPEC 3.4). */
function translateVariant(variant, defaultTable, ctx, bag) {
  let table = new Map();
  for (const file of variant.files) {
    const { data, body, bodyStartLine } = splitFrontmatter(file.source, file.file);
    if (data) validateFrontmatter(data, { file: file.file, chapter: true });
    const catalogue = parseCatalog(body, {
      file: file.file, startLine: bodyStartLine, namespace: file.namespace,
    });
    const slice = new Map([...defaultTable].filter(([, node]) => node.namespace === file.namespace));
    const translated = applyCatalog(slice, catalogue, { lang: variant.lang, bag, file: file.file });
    table = new Map([...table, ...translated]);
  }

  const multi = variant.files.some((f) => f.namespace !== null);

  // An override brings its own logic, so it goes through the same checks as
  // the default language, resolved against the default language's nodes.
  const overrides = [...table.values()].filter((node) => node.overridden);
  if (overrides.length > 0) {
    checkAndResolve(overrides, defaultTable, { config: ctx.config, multi, bag });
  }

  // A plain translation contributes expressions too: every {gold} a
  // translator writes is theirs, so it is checked and resolved like any other.
  const translated = [...table.values()].filter((node) => !node.overridden && node.kind !== 'function');
  checkTranslatedText(translated, defaultTable, { config: ctx.config, multi, bag });

  return table;
}

/** Checks only what a catalogue contributes: the expressions inside its text. */
function checkTranslatedText(nodes, table, { config, multi, bag }) {
  const scope = new Set([
    ...Object.keys(config.stats),
    ...Object.keys(config.stats).map((s) => `${s}_max`),
    ...BUILTIN_VARS,
  ]);
  const functions = new Map();
  for (const node of table.values()) {
    if (node.kind === 'function') functions.set(node.qualified, node);
  }

  const resolve = (ref, namespace, at) => {
    const name = ref.trim();
    const qualified = name.includes('.') || !namespace ? name : `${namespace}.${name}`;
    if (!multi && name.includes('.')) {
      bag.add('E040', `"${name}" has a dot, but a single-file book has no namespace`, at);
      return name;
    }
    if (!table.has(qualified)) bag.add('E041', `nothing named "${name}"`, at);
    return qualified;
  };

  for (const node of nodes) {
    walkTextExpressions(node.body, (expr) => {
      checkExpression(expr, scope, node, node.source, bag, resolve, functions);
    });
  }
}

/** Every expression a translator can write: the ones printed inside text. */
function walkTextExpressions(ops, visit) {
  const parts = (list) => {
    for (const part of list ?? []) {
      if (part.t === 'print') visit(part.expr);
      else if (part.t === 'alt') part.items.forEach(parts);
      else if (part.t === 'cond') { parts(part.then); parts(part.else); }
    }
  };
  for (const op of ops ?? []) {
    if (op.op === 'text') parts(op.parts);
    else if (op.op === 'choices') {
      for (const item of op.items) { parts(item.label); walkTextExpressions(item.body, visit); }
    } else if (op.op === 'branch') {
      for (const b of op.branches) walkTextExpressions(b.body, visit);
      if (op.else) walkTextExpressions(op.else, visit);
    } else if (op.op === 'combat') {
      for (const exit of Object.values(op.exits)) { parts(exit.label); parts(exit.text); }
    }
  }
}

/** Parses, resolves and checks one language. */
function buildVariant(variant, bookConfig, ctx, bag) {
  const files = variant.files;
  const multi = files.length > 1 || files.some((f) => f.namespace !== null);

  let config = bookConfig;
  const parsed = [];

  for (const file of files) {
    const { data, body, bodyStartLine } = splitFrontmatter(file.source, file.file);
    if (ctx.book) {
      if (data) validateFrontmatter(data, { file: file.file, chapter: true });
    } else if (data) {
      config = validateFrontmatter(data, { file: file.file, chapter: false });
    }
    const { nodes } = parseStory(body, {
      file: file.file, startLine: bodyStartLine, namespace: file.namespace,
    });
    parsed.push({ ...file, nodes });
  }

  if (!config) {
    throw new CompileError('E010', 'no frontmatter found', { file: ctx.entry, line: 1 });
  }

  // --- resolve ------------------------------------------------------------
  /** @type {Map<string, object>} qualified id -> node */
  const table = new Map();
  for (const file of parsed) {
    const local = new Set();
    for (const node of file.nodes) {
      if (local.has(node.id)) {
        bag.add('E030', `"${node.id}" is declared twice in this file`, node.source);
        continue;
      }
      local.add(node.id);
      const qualified = file.namespace ? `${file.namespace}.${node.id}` : node.id;
      node.qualified = qualified;
      node.namespace = file.namespace;
      table.set(qualified, node);
    }
  }

  checkAndResolve([...table.values()], table, { config, multi, bag });

  // Items named anywhere must exist once `items:` declares anything at all.
  const declaredItems = new Set(Object.keys(config.items));
  if (declaredItems.size > 0) {
    for (const { name, at } of collectItemNames(table, config)) {
      if (!declaredItems.has(name)) {
        bag.add('E060', `item "${name}" is not declared under items:`, at);
      }
    }
  }

  if (config.death?.goto) {
    const target = config.death.goto;
    if (multi && !target.includes('.')) {
      bag.add('E040', `death.goto "${target}" needs a namespace in a multi-file project`, { file: ctx.entry, line: 1 });
    } else if (!table.has(target)) {
      bag.add('E041', `death.goto "${target}" does not exist`, { file: ctx.entry, line: 1 });
    }
  }

  return { config, table, parsed };
}

/** start: defaults to the first node of the first file (SPEC 3.2). */
function resolveStart(primary, config, ctx, bag) {
  const first = [...primary.table.values()].find((n) => n.kind !== 'function');
  const start = config.start ?? first?.qualified ?? null;
  if (!start || !primary.table.has(start)) {
    bag.add('E041', `start node "${start}" does not exist`, { file: ctx.entry, line: 1 });
  }
  return start;
}


/**
 * Resolves every reference in `nodes` against `table` and runs the checks of
 * SPEC 10.3 on them. Used for a language's own nodes and again for the nodes
 * a translation overrides, which resolve against the default language.
 */
export function checkAndResolve(nodes, table, { config, multi, bag }) {
  const resolve = (ref, namespace, at) => {
    const name = ref.trim();
    if (name.includes('.')) {
      if (!multi) {
        bag.add('E040', `"${name}" has a dot, but a single-file book has no namespace`, at);
        return name;
      }
      if (!table.has(name)) bag.add('E041', `nothing named "${name}"`, at);
      return name;
    }
    const qualified = namespace ? `${namespace}.${name}` : name;
    if (!table.has(qualified)) {
      bag.add('E041', `nothing named "${name}" in this file`, at);
    }
    return qualified;
  };

  const knownVars = new Set([
    ...Object.keys(config.stats),
    ...Object.keys(config.stats).map((s) => `${s}_max`),
    ...BUILTIN_VARS,
  ]);

  const functions = new Map();
  for (const node of table.values()) {
    if (node.kind === 'function') functions.set(node.qualified, node);
  }

  for (const node of nodes) {
    const scope = new Set([...knownVars, ...(node.params ?? [])]);
    walkOps(node.body, (op) => {
      if (op.op === 'divert') {
        if (op.target.end) return;
        const target = resolve(op.target.ref, node.namespace, op.source ?? node.source);
        op.target = { ref: target };
        const found = table.get(target);
        if (found && found.kind === 'function') {
          bag.add('E042', `"${target}" is a function, not a place to go`, op.source ?? node.source);
        }
        return;
      }
      if (op.op === 'choices') {
        for (const item of op.items) {
          if (item.target && !item.target.end) {
            item.target = { ref: resolve(item.target.ref, node.namespace, item.source) };
          }
        }
        return;
      }
      if (op.op === 'combat') {
        for (const enemy of op.enemies) {
          if (!config.enemies[enemy]) bag.add('E151', `no enemy called "${enemy}"`, op.source);
        }
        if (op.exits.flee) {
          const canFlee = op.enemies.some((e) => config.enemies[e]?.flee_after != null);
          if (!canFlee) bag.add('E150', 'none of these enemies declares flee_after', op.exits.flee.source);
        }
        for (const exit of Object.values(op.exits)) {
          if (!exit.target.end) exit.target = { ref: resolve(exit.target.ref, node.namespace, exit.source) };
        }
        return;
      }
      if (op.op === 'assign' && !scope.has(op.target)) {
        bag.add('E131', `"${op.target}" is not a declared stat`, op.source ?? node.source);
      }
    }, (expr, at) => checkExpression(expr, scope, node, at ?? node.source, bag, resolve, functions));

    if (node.kind === 'function') {
      if (!hasReturn(node.body)) bag.add('E140', `function "${node.id}" never returns`, node.source);
    } else if (!terminates(node.body)) {
      bag.add('E110', `node "${node.qualified}" has no divert, choice or combat at its end`, node.source);
    }
  }
}

/** Walks every op, and every expression inside it. */
export function walkOps(ops, onOp, onExpr = () => {}) {
  for (const op of ops ?? []) {
    onOp(op);
    switch (op.op) {
      case 'text':
        walkParts(op.parts, onExpr, op.source);
        break;
      case 'assign':
        onExpr(op.value, op.source);
        break;
      case 'call':
        // The call itself is an expression too, or `~ take("key")` would be
        // invisible to every check that looks at expressions. The view writes
        // through, so resolving a story function updates the op itself.
        onExpr({
          get call() { return op.fn; },
          set call(value) { op.fn = value; },
          args: op.args,
        }, op.source);
        break;
      case 'return':
        if (op.value) onExpr(op.value, op.source);
        break;
      case 'choices':
        for (const item of op.items) {
          if (item.when) onExpr(item.when, item.source);
          walkParts(item.label, onExpr, item.source);
          walkOps(item.body, onOp, onExpr);
        }
        break;
      case 'branch':
        for (const b of op.branches) { onExpr(b.when, b.source); walkOps(b.body, onOp, onExpr); }
        if (op.else) walkOps(op.else, onOp, onExpr);
        break;
      case 'combat':
        for (const exit of Object.values(op.exits)) {
          walkParts(exit.label, onExpr, exit.source);
          walkParts(exit.text, onExpr, exit.source);
        }
        break;
      default:
        break;
    }
  }
}

function walkParts(parts, onExpr, at) {
  for (const part of parts ?? []) {
    if (part.t === 'print') onExpr(part.expr, at);
    else if (part.t === 'cond') {
      onExpr(part.when, at);
      walkParts(part.then, onExpr, at);
      walkParts(part.else, onExpr, at);
    } else if (part.t === 'alt') {
      for (const item of part.items) walkParts(item, onExpr, at);
    }
  }
}

function checkExpression(expr, scope, node, at, bag, resolve, functions) {
  walkExpression(expr, (e) => {
    if (e.var !== undefined && !scope.has(e.var)) {
      bag.add('E131', `"${e.var}" is not a declared stat`, at);
    }
    if (e.ref !== undefined) {
      e.ref = resolve(e.ref, node.namespace, at);
    }
    if (e.call === undefined || BUILTINS[e.call]) return;

    // A call to a story function, resolved local-then-qualified like a divert.
    const qualified = e.call.includes('.') || !node.namespace ? e.call : `${node.namespace}.${e.call}`;
    const fn = functions.get(qualified) ?? functions.get(e.call);
    if (!fn) {
      bag.add('E131', `no function called "${e.call}"`, at);
      return;
    }
    if (e.args.length !== fn.params.length) {
      bag.add('E132', `${e.call}() takes ${fn.params.length} arguments, got ${e.args.length}`, at);
    }
    e.call = fn.qualified;
  });
}

/** Collects every item name that appears in the book or the frontmatter. */
function collectItemNames(table, config) {
  const found = [];
  const itemFns = new Set(['has', 'take', 'drop', 'uses', 'use', 'equip', 'equipped']);
  for (const node of table.values()) {
    walkOps(node.body, () => {}, (expr, at) => {
      walkExpression(expr, (e) => {
        if (e.call && itemFns.has(e.call) && typeof e.args?.[0]?.lit === 'string') {
          found.push({ name: e.args[0].lit, at: at ?? node.source });
        }
      });
    });
  }
  for (const name of config.inventory.start ?? []) found.push({ name, at: { line: 1 } });
  for (const block of config.setup) {
    for (const option of block.from) if (option.item) found.push({ name: option.item, at: { line: 1 } });
  }
  return found;
}

/**
 * A container terminates when control cannot fall off its end.
 *
 * A run of choices only counts when at least one of them is unconditional:
 * when every condition is false the runtime falls through to whatever follows
 * the choices op, which is the gather, so the rest of the container has to
 * carry the ending. This is what replaces ink's fallback choices.
 */
function terminates(ops) {
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.op === 'divert' || op.op === 'combat') return true;
    if (op.op === 'choices') {
      // A choice without a target falls through to the gather, so the rest of
      // the container has to carry the ending; otherwise it is a dead end.
      const fallsThrough = op.items.some((item) => !item.target);
      if (fallsThrough && !terminates(ops.slice(i + 1))) return false;
      if (op.items.some((item) => item.when === null)) return true;
    }
    if (op.op === 'branch') {
      const all = op.branches.every((b) => terminates(b.body));
      if (all && op.else && terminates(op.else)) return true;
    }
  }
  return false;
}

function hasReturn(ops) {
  let found = false;
  walkOps(ops, (op) => { if (op.op === 'return') found = true; });
  return found;
}
