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

import { readFileSync, existsSync } from 'node:fs';
import { dirname, basename, extname, join } from 'node:path';

import { CompileError, ErrorBag } from './errors.js';
import { splitFrontmatter, parseYaml } from './yaml.js';
import { validateFrontmatter, languagesOf, DEFAULT_LANGUAGE } from './frontmatter.js';
import { parseStory } from './parser.js';
import { BUILTINS, BUILTIN_VARS, IMPURE_CALLS, NAME_ARGS, walkExpression } from './expr.js';
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
  // A book with a single language keeps its chapters in the root: declaring
  // `languages:` to name that language should not cost a directory level.
  const perLanguage = languages.available.length > 1;
  const variants = languages.available.map((lang) => ({
    lang,
    files: plan.map(({ file, namespace }) => {
      const path = perLanguage ? join(root, lang, file) : join(root, file);
      return { file: path, source: readChapter(path, bookPath), namespace };
    }),
  }));

  return compileSources(variants, { entry: bookPath, root, book: data });
}

function readChapter(path, bookPath) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    throw new CompileError('E010', `cannot read the chapter file "${path}"`, { file: bookPath, line: 1 });
  }
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

  // A single-file book names its language in its own frontmatter, which is
  // only known once that frontmatter has been read.
  const primaryLang = ctx.book ? primaryVariant.lang : config.languages.default;
  const built = [{ lang: primaryLang, table: primary.table }];
  for (const variant of variants) {
    if (variant === primaryVariant) continue;
    built.push({ lang: variant.lang, table: translateVariant(variant, primary.table, { ...ctx, config }, bag) });
  }
  built.sort((a, b) => config.languages.available.indexOf(a.lang) - config.languages.available.indexOf(b.lang));

  bag.throwIfFailed();

  checkImages(built, ctx, bag);

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
      checks: config.checks,
      strings: config.strings,
      facts: config.facts,
      // `declaredCatchup` is the linter's bookkeeping for L027 and has no
      // business in a file that ships to every reader.
      events: Object.fromEntries(Object.entries(config.events).map(
        ([name, { declaredCatchup, ...rest }]) => [name, rest],
      )),
      places: config.places,
    },
    built,
  });

  // The linter works on the compiler's tree, not on the slimmed output.
  const warnings = lint(story, { table: primary.table, config, lang: primaryLang });
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

/**
 * The images a book links have to be there, per language (SPEC 4.9, 22.4).
 *
 * This is the one check in the compiler that reads the disk. Everything else
 * answers from the sources it was handed; whether a file exists is a fact
 * about a directory, and there is no honest way to ask it of a tree. A
 * checkout without its images therefore fails to compile, which is right: the
 * book is incomplete in that checkout.
 *
 * Paths are relative to the book's own directory, not to the chapter file that
 * writes them, because that is where they land beside the output (principle 6).
 */
function checkImages(built, ctx, bag) {
  if (!ctx.root) return;   // compiled from strings, so there is no directory
  const seen = new Set();

  for (const { lang, table } of built) {
    for (const node of table.values()) {
      walkOps(node.body ?? [], (op) => {
        if (op.op !== 'image') return;
        const key = `${lang}:${op.src}`;
        if (seen.has(key)) return;
        seen.add(key);
        if (!existsSync(join(ctx.root, op.src))) {
          bag.add('E184', `"${op.src}" is not in the book's directory (${lang})`, op.source);
        }
      });
    }
  }
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
    ...Object.keys(config.facts ?? {}),
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
      checkExpression(expr, scope, node, node.source, bag, resolve, functions, config);
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
  checkDeclarations(table, config, { multi, bag, at: { file: ctx.entry, line: 1 } });

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
    ...Object.keys(config.facts ?? {}),
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
      if (op.op === 'assign') {
        // Travel is an assignment whose value came from place() (19.2), and
        // L026 has no other way to recognise it once the call is folded away.
        if (namesPlace(op.value)) op.place = true;
        // A fact name is in scope, so this has to come before the E131 below
        // or the reader would be told a fact is not a stat (15.2).
        if (config.facts?.[op.target]) {
          bag.add('E164', `"${op.target}" is a fact; a book only reads it`, op.source ?? node.source);
        } else if (!scope.has(op.target)) {
          bag.add('E131', `"${op.target}" is not a declared stat`, op.source ?? node.source);
        }
      }
    }, (expr, at) => checkExpression(expr, scope, node, at ?? node.source, bag, resolve, functions, config));

    if (node.kind === 'function') {
      if (!hasReturn(node.body)) bag.add('E140', `function "${node.id}" never returns`, node.source);
    } else if (!terminates(node.body)) {
      bag.add('E110', `node "${node.qualified}" has no divert, choice or combat at its end`, node.source);
    }
  }
}

/**
 * The book-wide declarations of 0.7: facts, events and places. They resolve
 * against the same node table the story does, and their expressions go
 * through the same checks, because a `visits()` in an event is the same
 * `visits()` a node writes.
 */
function checkDeclarations(table, config, { multi, bag, at }) {
  const facts = config.facts ?? {};
  const events = config.events ?? {};
  const places = config.places?.table ?? [];

  for (const place of places) {
    if (!place.enter) continue;
    if (multi && !place.enter.includes('.')) {
      bag.add('E040', `place "${place.id}" enters "${place.enter}", which needs a namespace`, at);
    } else if (!table.has(place.enter)) {
      bag.add('E166', `place "${place.id}" enters "${place.enter}", which does not exist`, at);
    }
  }

  const scope = new Set([
    ...Object.keys(config.stats),
    ...Object.keys(config.stats).map((s) => `${s}_max`),
    ...Object.keys(facts),
    ...BUILTIN_VARS,
  ]);

  // The place variable is written by the book, so a fact will not do (19.1).
  const placeVar = config.places?.variable;
  if (placeVar && !Object.hasOwn(config.stats, placeVar)) {
    bag.add('E171', `places.variable: names "${placeVar}", which is not a declared stat`, at);
  }

  const functions = new Map();
  for (const node of table.values()) {
    if (node.kind === 'function') functions.set(node.qualified, node);
  }
  const resolve = (ref) => {
    const name = String(ref).trim();
    if (!table.has(name)) bag.add('E041', `nothing named "${name}"`, at);
    return name;
  };
  const outside = { namespace: null };
  const check = (expr, { firing = false } = {}) => {
    if (expr) checkExpression(expr, scope, outside, at, bag, resolve, functions, config, firing);
  };

  for (const fact of Object.values(facts)) {
    if (fact.source === 'derived') check(fact.value);
  }
  // A story function can hide an assignment, so principle 8 has to look
  // through the call rather than only at the name in front of it.
  for (const [name, fact] of Object.entries(facts)) {
    if (fact.source !== 'derived') continue;
    walkExpression(fact.value, (e) => {
      if (e.call === undefined || BUILTINS[e.call]) return;
      const fn = functions.get(e.call);
      if (fn && !isPureFunction(fn, functions, new Set())) {
        bag.add('E169',
          `fact "${name}" calls ${e.call}(), which changes state`, at);
      }
    });
  }

  for (const [name, event] of Object.entries(events)) {
    check(event.counter);
    check(event.when);
    if (event.do.op === 'assign') {
      // The one place `due` is a number: this event, this boundary (17.2).
      check(event.do.value, { firing: true });
      if (facts[event.do.target]) {
        bag.add('E164', `event "${name}" assigns to the fact "${event.do.target}"`, at);
      } else if (!scope.has(event.do.target)) {
        bag.add('E131', `event "${name}" assigns to "${event.do.target}", which is not a declared stat`, at);
      }
    } else if (event.do.op === 'call') {
      check({ call: event.do.fn, args: event.do.args }, { firing: true });
    } else {
      bag.add('E167', `event "${name}" returns instead of doing something`, at);
    }
  }

  checkFrontmatterNames(config, bag, at);
}

/**
 * The name rule of SPEC 5, applied to the expressions the frontmatter carries
 * outside facts and events: a stat's `start:`, an item's `effect:` and
 * `when:`, the dice under `checks:`, the arithmetic of `combat:` and
 * `death:`. None of them reach checkExpression, so `effect: "take(0)"` was as
 * quiet there as `take(0)` ever was in the story.
 *
 * Only this one rule runs here. Whether those expressions name declared stats
 * is a separate question, and answering it in this pass would fail books that
 * have compiled since 0.1 for a reason this check is not about.
 */
function checkFrontmatterNames(config, bag, at) {
  const names = (expr) => walkExpression(expr, (e) => {
    if (e.call === 'place' || NAME_ARGS.has(e.call)) nameArgument(e, bag, at);
  });
  const statement = (op) => {
    if (!op) return;
    if (op.op === 'call') names({ call: op.fn, args: op.args });
    else names(op.value);
  };

  names(config.checks?.dice);
  for (const stat of Object.values(config.stats ?? {})) {
    names(stat.start);
    if (stat.max !== 'start') names(stat.max);
  }
  for (const item of Object.values(config.items ?? {})) {
    statement(item.effect);
    names(item.when);
  }
  for (const key of ['attack', 'damage', 'flee_cost']) names(config.combat?.[key]);
  names(config.death?.when);
}

/** True when a story function neither assigns nor calls anything impure. */
function isPureFunction(fn, functions, seen) {
  if (seen.has(fn.qualified)) return true;
  seen.add(fn.qualified);
  let pure = true;
  walkOps(fn.body, (op) => {
    if (op.op === 'assign') pure = false;
    if (op.op === 'call' && IMPURE_CALLS.has(op.fn)) pure = false;
  }, (expr) => {
    walkExpression(expr, (e) => {
      if (e.call === undefined) return;
      if (IMPURE_CALLS.has(e.call)) pure = false;
      const called = functions.get(e.call);
      if (called && !isPureFunction(called, functions, seen)) pure = false;
    });
  });
  return pure;
}

/** True when an expression reaches for place(), before folding removes it. */
function namesPlace(expr) {
  let found = false;
  walkExpression(expr, (e) => { if (e.call === 'place') found = true; });
  return found;
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

/**
 * The rule of SPEC 5 for the first argument of the functions in NAME_ARGS and
 * of place(): it is a name in quotes, and nothing else. Only the first one;
 * take("rope", 3) counts uses in the second.
 *
 * A number passes for the same reason a bare identifier does - the runtime
 * turns whatever it gets into a key. `has(0)` then looks for an item called
 * "0", forever without finding one, so the test is on the type, not on
 * whether a literal is there at all.
 *
 * @returns {boolean} true when the call may be checked further
 */
function nameArgument(e, bag, at) {
  if (typeof e.args?.[0]?.lit === 'string') return true;
  bag.add('E133', `${e.call}() wants a name in quotes, not a value`, at);
  return false;
}

function checkExpression(expr, scope, node, at, bag, resolve, functions, config = null, firing = false) {
  walkExpression(expr, (e) => {
    // `due` counts firings owed to one scheduled event at one boundary
    // (17.2). Anywhere else there is no such number, and reading it as 1
    // would be a silent wrong answer.
    if (e.var === 'due' && !firing) {
      bag.add('E173', 'due only means something inside an event\'s do:', at);
      return;
    }
    if (e.var !== undefined && !scope.has(e.var)) {
      bag.add('E131', `"${e.var}" is not a declared stat`, at);
    }
    if (e.ref !== undefined) {
      e.ref = resolve(e.ref, node.namespace, at);
    }
    // place("ridge") is an index the linter can check and the author never
    // writes as a number (19.2); nothing of it survives into the runtime.
    if (e.call === 'place') {
      if (!nameArgument(e, bag, at)) return;
      const id = e.args?.[0]?.lit;
      const index = (config?.places?.table ?? []).findIndex((p) => p.id === String(id));
      if (index < 0) {
        bag.add('E165', `no place called "${id}"`, at);
        return;
      }
      delete e.call;
      delete e.args;
      e.lit = index;
      return;
    }
    if (NAME_ARGS.has(e.call)) {
      if (!nameArgument(e, bag, at)) return;
      // Which names exist is checked where the declaration lives: items by
      // E060, places by E165. Stats had nobody, so test("gschick") failed
      // silently for as long as the typo stood there.
      if (e.call === 'test' && !scope.has(String(e.args[0].lit))) {
        bag.add('E133', `no stat called "${e.args[0].lit}"`, at);
      }
      return;
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
