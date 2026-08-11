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
import { parseExpression, parseStatement } from './expr.js';

const BOOK_KEYS = new Set([
  'title', 'author', 'version', 'start', 'chapters', 'languages',
  'stats', 'inventory', 'items', 'setup', 'combat', 'enemies',
  'death', 'undo', 'strings',
]);

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
    strings: Object.fromEntries(Object.entries(STRING_KEYS)
      .map(([key, value]) => [key, i18n(value, lang, key, at)])),
  };

  for (const [name, spec] of Object.entries(data.stats ?? {})) {
    if (typeof spec !== 'object' || spec === null) {
      throw new CompileError('E011', `stat "${name}" must be a mapping`, at);
    }
    for (const key of Object.keys(spec)) {
      if (!['start', 'max', 'name'].includes(key)) {
        throw new CompileError('E011', `stat "${name}" has unknown key "${key}"`, at);
      }
    }
    config.stats[name] = {
      // The name a reader sees is the author's, and translatable; the key
      // stays the identifier the story does arithmetic on.
      name: i18n(spec.name ?? name, lang, `stat "${name}" name`, at),
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
