/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Frontmatter validation per SPEC.md section 6.
 * Expression fields are parsed here, not at runtime (SPEC 10.1 step 2).
 */

import { CompileError } from './errors.js';
import {
  parseExpression, parseStatement, walkExpression, BUILTIN_VARS, IMPURE_CALLS,
} from './expr.js';

const BOOK_KEYS = new Set([
  'title', 'author', 'version', 'start', 'chapters', 'languages',
  'stats', 'inventory', 'items', 'setup', 'combat', 'enemies',
  'death', 'undo', 'strings', 'checks',
  'facts', 'events', 'places',
]);

const FACT_SOURCES = new Set(['fixed', 'host', 'derived']);

const FACT_KEYS = new Set(['source', 'value', 'range', 'fallback', 'name']);

const EVENT_KEYS = new Set(['once', 'counter', 'every', 'max_catchup', 'when', 'do']);

const PLACE_KEYS = new Set(['id', 'name', 'enter']);

const CHECK_DIRECTIONS = new Set(['at-most', 'at-least']);

const CHAPTER_KEYS = new Set(['title']);

const ITEM_KINDS = new Set(['weapon', 'armour', 'gear', 'consumable']);

/**
 * Only what the combat resolver narrates. Button labels and panel names are
 * the view layer's business (SPEC 6 and 12.2).
 */
export const STRING_KEYS = {
  'combat.hit': 'You wound {enemy}.',
  'combat.taken': '{enemy} wounds you.',
  'combat.tie': 'The blades meet and nothing comes of it.',
};

export const DEFAULT_LANGUAGE = 'default';

/** Reads the language list of a book (SPEC 3.4). */
export function languagesOf(data) {
  const available = data?.languages?.available;
  if (!Array.isArray(available) || available.length === 0) {
    return { available: [DEFAULT_LANGUAGE], default: DEFAULT_LANGUAGE, explicit: false };
  }
  const list = available.map(String);
  return {
    available: list,
    default: data.languages.default ? String(data.languages.default) : list[0],
    explicit: true,
  };
}

/**
 * Normalises a reader-visible field into a language table (SPEC 6).
 * A scalar means the same text in every language.
 */
function i18n(value, languages, what, at) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object') {
    return Object.fromEntries(languages.map((lang) => [lang, String(value)]));
  }
  const table = {};
  for (const lang of languages) {
    if (value[lang] === undefined) {
      throw new CompileError('E072', `${what} has no text for "${lang}"`, at);
    }
    table[lang] = String(value[lang]);
  }
  return table;
}

/**
 * @param {any} data parsed YAML
 * @param {{file: string, chapter: boolean}} ctx
 * @returns {object} normalised config
 */
export function validateFrontmatter(data, ctx) {
  const at = { file: ctx.file, line: 1 };
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new CompileError('E010', 'the frontmatter must be a mapping', at);
  }

  const allowed = ctx.chapter ? CHAPTER_KEYS : BOOK_KEYS;
  for (const key of Object.keys(data)) {
    if (allowed.has(key)) continue;
    if (ctx.chapter && BOOK_KEYS.has(key)) {
      throw new CompileError('E012', `"${key}" belongs in book.yaml, not in a chapter file`, at);
    }
    throw new CompileError('E011', `unknown key "${key}"`, at);
  }
  if (ctx.chapter) return { title: data.title ?? null };

  const languages = languagesOf(data);
  const lang = languages.available;

  const config = {
    languages,
    title: i18n(data.title, lang, 'title', at),
    author: data.author ?? null,
    version: data.version ?? null,
    start: data.start ?? null,
    stats: {},
    inventory: { slots: data.inventory?.slots ?? 0, start: data.inventory?.start ?? [] },
    items: {},
    setup: [],
    combat: null,
    enemies: {},
    death: null,
    undo: { depth: data.undo?.depth ?? 0 },
    // How test() and test_luck() roll. The default is the Fighting Fantasy
    // rule: two six-sided dice, success at or under the stat.
    checks: {
      dice: asExpression(data.checks?.dice ?? 'roll(2,6)', 'checks.dice', at),
      succeeds: data.checks?.succeeds ?? 'at-most',
    },
    strings: Object.fromEntries(Object.entries(STRING_KEYS)
      .map(([key, value]) => [key, i18n(value, lang, key, at)])),
    facts: {},
    events: {},
    places: { variable: null, table: [] },
  };

  // Facts keep their declaration order: 15.3 makes that order the whole
  // dependency rule, so a plain object built in order is the data structure.
  for (const [name, spec] of Object.entries(data.facts ?? {})) {
    if (typeof spec !== 'object' || spec === null) {
      throw new CompileError('E011', `fact "${name}" must be a mapping`, at);
    }
    for (const key of Object.keys(spec)) {
      if (!FACT_KEYS.has(key)) {
        throw new CompileError('E011', `fact "${name}" has unknown key "${key}"`, at);
      }
    }
    if (!FACT_SOURCES.has(spec.source)) {
      throw new CompileError('E160',
        `fact "${name}" has source "${spec.source ?? '(none)'}"`, at);
    }
    const fact = {
      name: i18n(spec.name ?? name, lang, `fact "${name}" name`, at),
      source: spec.source,
    };

    if (spec.source === 'fixed') {
      if (typeof spec.value !== 'number') {
        throw new CompileError('E161', `fixed fact "${name}" needs an integer value:`, at);
      }
      fact.value = Math.trunc(spec.value);
    } else if (spec.source === 'derived') {
      if (spec.value === undefined || spec.value === null) {
        throw new CompileError('E161', `derived fact "${name}" needs a value:`, at);
      }
      fact.value = typeof spec.value === 'number'
        ? { lit: Math.trunc(spec.value) }
        : parseExpression(String(spec.value), { ...at, text: String(spec.value) });
    } else {
      if (!Array.isArray(spec.range) || spec.range.length !== 2) {
        throw new CompileError('E161', `host fact "${name}" needs a range: [min, max]`, at);
      }
      if (typeof spec.fallback !== 'number') {
        throw new CompileError('E161', `host fact "${name}" needs an integer fallback:`, at);
      }
      fact.range = [Math.trunc(spec.range[0]), Math.trunc(spec.range[1])];
      fact.fallback = Math.trunc(spec.fallback);
      if (fact.fallback < fact.range[0] || fact.fallback > fact.range[1]) {
        throw new CompileError('E162',
          `fallback ${fact.fallback} of "${name}" is outside [${fact.range.join(', ')}]`, at);
      }
    }

    if (spec.range && spec.source === 'fixed') {
      const [min, max] = spec.range;
      if (fact.value < min || fact.value > max) {
        throw new CompileError('E162',
          `value ${fact.value} of "${name}" is outside [${min}, ${max}]`, at);
      }
    }

    // The stats loop runs further down, so the collision is checked against
    // the YAML rather than against a half-built config.
    const stats = Object.keys(data.stats ?? {});
    if (stats.includes(name) || stats.some((s) => `${s}_max` === name)) {
      throw new CompileError('E170', `"${name}" is already a stat`, at);
    }
    if (BUILTIN_VARS.has(name)) {
      throw new CompileError('E170', `"${name}" is a built-in variable`, at);
    }
    if (name in config.facts) {
      throw new CompileError('E170', `fact "${name}" is declared twice`, at);
    }
    config.facts[name] = fact;
  }

  // Declaration order is the dependency rule (15.3), so a fact may only name
  // the ones already declared above it. That is the whole cycle check.
  const declaredSoFar = new Set();
  for (const [name, fact] of Object.entries(config.facts)) {
    if (fact.source === 'derived') {
      walkExpression(fact.value, (e) => {
        if (e.var !== undefined && e.var in config.facts && !declaredSoFar.has(e.var)) {
          throw new CompileError('E163',
            e.var === name
              ? `fact "${name}" reads itself`
              : `fact "${name}" reads "${e.var}", which is declared below it`, at);
        }
        if (e.call !== undefined && IMPURE_CALLS.has(e.call)) {
          throw new CompileError('E169',
            `fact "${name}" calls ${e.call}(), so it would not give the same answer twice`, at);
        }
      });
    }
    declaredSoFar.add(name);
  }

  for (const [name, spec] of Object.entries(data.events ?? {})) {
    if (typeof spec !== 'object' || spec === null) {
      throw new CompileError('E011', `event "${name}" must be a mapping`, at);
    }
    for (const key of Object.keys(spec)) {
      if (!EVENT_KEYS.has(key)) {
        throw new CompileError('E011', `event "${name}" has unknown key "${key}"`, at);
      }
    }
    if (spec.do === undefined || spec.do === null) {
      throw new CompileError('E167', `event "${name}" has nothing to do`, at);
    }
    if (spec.once && spec.every !== undefined) {
      throw new CompileError('E168', `event "${name}" is both once and recurring`, at);
    }
    if (spec.every !== undefined && spec.counter === undefined) {
      throw new CompileError('E161', `event "${name}" has every: but no counter:`, at);
    }
    config.events[name] = {
      once: Boolean(spec.once),
      counter: spec.counter === undefined ? null
        : parseExpression(String(spec.counter), { ...at, text: String(spec.counter) }),
      every: spec.every === undefined ? null : Math.trunc(spec.every),
      // Default 1, per 17.1: a book that wants a month of damage says so.
      max_catchup: spec.max_catchup === undefined ? 1 : Math.trunc(spec.max_catchup),
      declaredCatchup: spec.max_catchup !== undefined,
      when: spec.when === undefined || spec.when === null ? null
        : parseExpression(String(spec.when), { ...at, text: String(spec.when) }),
      do: parseStatement(String(spec.do), { ...at, text: String(spec.do) }),
    };
    if (config.events[name].every !== null && config.events[name].every < 1) {
      throw new CompileError('E161', `event "${name}" has every: ${spec.every}`, at);
    }
  }

  // `places:` is a mapping, not a bare list: the table is one field of it and
  // the name of the variable holding the index is the other (19.1).
  const placeBlock = data.places ?? {};
  if (typeof placeBlock !== 'object' || placeBlock === null || Array.isArray(placeBlock)) {
    throw new CompileError('E011', 'places: must be a mapping with variable: and table:', at);
  }
  for (const key of Object.keys(placeBlock)) {
    if (key !== 'variable' && key !== 'table') {
      throw new CompileError('E011', `places: has unknown key "${key}"`, at);
    }
  }
  config.places.variable = placeBlock.variable ? String(placeBlock.variable) : null;

  const placeIds = new Set();
  for (const spec of placeBlock.table ?? []) {
    if (typeof spec !== 'object' || spec === null || !spec.id) {
      throw new CompileError('E011', 'a place needs an id:', at);
    }
    for (const key of Object.keys(spec)) {
      if (!PLACE_KEYS.has(key)) {
        throw new CompileError('E011', `place "${spec.id}" has unknown key "${key}"`, at);
      }
    }
    const id = String(spec.id);
    if (placeIds.has(id)) {
      throw new CompileError('E011', `place "${id}" is declared twice`, at);
    }
    placeIds.add(id);
    config.places.table.push({
      id,
      name: i18n(spec.name ?? id, lang, `place "${id}" name`, at),
      enter: spec.enter ? String(spec.enter) : null,
    });
  }

  for (const [name, spec] of Object.entries(data.stats ?? {})) {
    if (typeof spec !== 'object' || spec === null) {
      throw new CompileError('E011', `stat "${name}" must be a mapping`, at);
    }
    for (const key of Object.keys(spec)) {
      if (!['start', 'max', 'name'].includes(key)) {
        throw new CompileError('E011', `stat "${name}" has unknown key "${key}"`, at);
      }
    }
    if (name in config.facts || `${name}_max` in config.facts) {
      throw new CompileError('E170', `"${name}" is already a fact`, at);
    }
    config.stats[name] = {
      // The name a reader sees is the author's, and translatable; the key
      // stays the identifier the story does arithmetic on. A stat without one
      // is internal and carries no name at all: it drives the story, but no
      // sheet lists it (SPEC 6). An imported book is full of those.
      ...(spec.name === undefined
        ? {}
        : { name: i18n(spec.name, lang, `stat "${name}" name`, at) }),
      start: asExpression(spec.start, `stats.${name}.start`, at),
      max: spec.max === 'start' ? 'start' : (spec.max === undefined ? null : asExpression(spec.max, `stats.${name}.max`, at)),
    };
  }

  for (const [id, spec] of Object.entries(data.items ?? {})) {
    if (typeof spec !== 'object' || spec === null) {
      throw new CompileError('E011', `item "${id}" must be a mapping`, at);
    }
    if (!ITEM_KINDS.has(spec.kind)) {
      throw new CompileError('E061', `item "${id}" has kind "${spec.kind ?? '(none)'}"`, at);
    }
    config.items[id] = {
      name: i18n(spec.name ?? id, lang, `item "${id}" name`, at),
      kind: spec.kind,
      attack_bonus: spec.attack_bonus ?? 0,
      damage_override: spec.damage_override ?? null,
      defence: spec.defence ?? 0,
      uses: spec.uses ?? 1,
      effect: spec.effect ? parseStatement(String(spec.effect), at) : null,
      when: spec.when ? parseExpression(String(spec.when), at) : null,
    };
  }

  for (const block of data.setup ?? []) {
    const from = (block.from ?? []).map((option) => ({
      label: i18n(option.label ?? option.item ?? option.remember, lang, 'a setup label', at),
      item: option.item ?? null,
      remember: option.remember ?? null,
    }));
    if (from.length === 0) {
      throw new CompileError('E011', 'a setup block needs a non-empty "from" list', at);
    }
    config.setup.push({
      title: i18n(block.title ?? '', lang, 'a setup title', at),
      pick: block.pick ?? 1,
      from,
    });
  }

  if (data.combat) {
    config.combat = {
      attack: asExpression(data.combat.attack, 'combat.attack', at),
      damage: asExpression(data.combat.damage ?? 2, 'combat.damage', at),
      // Two stamina is the Fighting Fantasy rule, and a default rather than a
      // fixture: a book that wants another price writes one (SPEC 7).
      flee_cost: asExpression(data.combat.flee_cost ?? 2, 'combat.flee_cost', at),
      rule: data.combat.rule ?? 'higher-wins',
      luck_in_combat: data.combat.luck_in_combat ?? false,
    };
    if (config.combat.rule !== 'higher-wins') {
      throw new CompileError('E011', `unknown combat rule "${config.combat.rule}"`, at);
    }
  }

  for (const [id, spec] of Object.entries(data.enemies ?? {})) {
    config.enemies[id] = {
      name: i18n(spec.name ?? id, lang, `enemy "${id}" name`, at),
      skill: spec.skill ?? 0,
      stamina: spec.stamina ?? 0,
      flee_after: spec.flee_after ?? null,
    };
  }

  if (data.death) {
    config.death = {
      when: asExpression(data.death.when, 'death.when', at),
      goto: data.death.goto ?? null,
    };
  }

  if (!CHECK_DIRECTIONS.has(config.checks.succeeds)) {
    throw new CompileError('E011',
      `checks.succeeds is "${config.checks.succeeds}", not at-most or at-least`, at);
  }

  for (const [key, value] of Object.entries(data.strings ?? {})) {
    if (!(key in STRING_KEYS)) {
      throw new CompileError('E062', `unknown strings key "${key}"`, at);
    }
    config.strings[key] = i18n(value, lang, `strings.${key}`, at);
  }
  config.overriddenStrings = Object.keys(data.strings ?? {});

  return config;
}

function asExpression(value, what, at) {
  if (value === undefined || value === null) {
    throw new CompileError('E011', `${what} is required`, at);
  }
  if (typeof value === 'number') return { lit: value };
  return parseExpression(String(value), { ...at, text: String(value) });
}
