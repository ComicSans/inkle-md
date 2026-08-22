/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The host protocol of SPEC.md section 20.7.
 *
 * The runtime of 12.1 is a JavaScript object with two dozen members, which is
 * the right shape for a host written in JavaScript and the wrong one for a
 * host written in Swift or Kotlin: every member read costs a crossing between
 * two languages, and a page needs a dozen of them. This file is the fassade
 * that turns those crossings into one. A command goes in, the whole view
 * comes out, both as plain JSON.
 *
 * Nothing here decides how anything looks. Text arrives as paragraphs with
 * their classes, exactly as 12.1 delivers it, and what a host makes of a
 * class is the host's own business. That is the whole point: one story, one
 * logic, as many surfaces as there are hosts.
 */

import { Story } from './runtime.js';

/** Commands that do not touch the story and therefore never fail. */
const READS = new Set(['state', 'save']);

export class Host {
  /**
   * @param {object} json story JSON per SPEC 17.1
   * @param {{lang?: string, seed?: number}} options
   */
  constructor(json, options = {}) {
    this.story = new Story(json, options);
  }

  /**
   * One command, one view. Errors come back as data rather than as a thrown
   * exception, because an exception crossing a language boundary arrives as a
   * crash or as an empty string, and neither tells a host what went wrong.
   *
   * @param {object} command `{ cmd, ...fields }` per SPEC 20.7
   * @returns {object} `{ ok: true, view, did }` or `{ ok: false, error }`
   */
  command(command) {
    const cmd = command?.cmd;
    if (typeof cmd !== 'string') return { ok: false, error: 'command needs a cmd' };

    let did = null;
    try {
      did = this.#run(cmd, command);
    } catch (error) {
      const answer = { ok: false, error: String(error?.message ?? error) };
      // A refused save says why in fields rather than only in a sentence, so
      // a host can offer the previous edition or carry the character across
      // instead of parsing English (8, 12.6).
      if (error?.refused) answer.refused = error.refused;
      return answer;
    }
    if (did === undefined) return { ok: false, error: `unknown command "${cmd}"` };

    return { ok: true, view: this.view, did };
  }

  /**
   * The string form, for a bridge that carries text rather than objects: a
   * WebView on Android, a JSContext on Apple platforms. Malformed input is an
   * answer, not a throw, for the same reason as above.
   *
   * @param {string} text one command as JSON
   * @returns {string} one answer as JSON
   */
  dispatch(text) {
    let command;
    try {
      command = JSON.parse(text);
    } catch (error) {
      return JSON.stringify({ ok: false, error: `command is not JSON: ${error.message}` });
    }
    return JSON.stringify(this.command(command));
  }

  /**
   * Everything a page needs, in one object. The runtime offers these one at a
   * time (12.1); collecting them here is what makes a turn a single crossing.
   */
  get view() {
    const story = this.story;
    const current = story.current;
    return {
      lang: story.lang,
      languages: story.languages,
      setup: setupView(story),
      node: current.node,
      title: current.title,
      ended: current.ended,
      text: current.text,
      choices: current.choices,
      stats: current.stats,
      facts: current.facts,
      inventory: story.inventory,
      memory: story.memory,
      combat: combatView(story),
      canUndo: story.canUndo,
    };
  }

  /**
   * @returns {*} what the command returned, `undefined` for an unknown one
   */
  #run(cmd, c) {
    const story = this.story;
    switch (cmd) {
      case 'state':    return null;
      case 'begin':    story.begin(c.picks ?? []); return null;
      case 'choose':   story.choose(c.index); return null;
      case 'advance':  story.advance(c.host ?? {}); return null;
      case 'go':       story.go(c.node); return null;
      case 'use':      return story.useItem(c.id);
      case 'equip':    return story.equipItem(c.id);
      case 'attack':   return story.attack();
      case 'luck':     return story.testLuck();
      case 'flee':     return story.flee();
      case 'undo':     return story.undo();
      case 'language': story.setLanguage(c.lang); return null;
      case 'seed':     story.seed(c.value); return null;
      case 'save':     return story.save();
      case 'load':     story.load(c.save); return null;
      default:         return undefined;
    }
  }
}

/**
 * The runtime keeps a fight as live objects, one of which is the enemy it is
 * mutating. A host gets a copy with the enemy's full stamina alongside its
 * current one, because a bar needs both and the config the other half lives
 * in is not something a host should have to read.
 */
function combatView(story) {
  const fight = story.combat;
  if (!fight) return null;
  const declared = story.config.enemies[fight.enemy.id];
  return {
    round: fight.round,
    enemy: {
      id: fight.enemy.id,
      name: fight.name ?? fight.enemy.id,
      stamina: fight.enemy.stamina,
      max: declared?.stamina ?? fight.enemy.stamina,
    },
    waiting: Math.max(0, fight.roster.length - fight.index - 1),
    log: fight.log,
    luck: fight.luck,
    canFlee: fight.canFlee,
  };
}

/**
 * The setup blocks of SPEC 7, with every label resolved to the current
 * language. The runtime hands them out as the book declared them, one string
 * per language, because its own view layer resolves them itself. A host in
 * another language should not have to reimplement that lookup, and one that
 * did would be a second place where a missing translation is decided.
 */
function setupView(story) {
  if (!story.setup) return null;
  return story.setup.map((block) => ({
    title: flat(block.title, story.lang),
    pick: block.pick,
    from: block.from.map((option) => ({
      label: flat(option.label, story.lang),
      item: option.item ?? null,
      remember: option.remember ?? null,
      // What `begin` takes back is one of these three, in this order (12.1).
      key: option.item ?? option.remember ?? flat(option.label, story.lang),
    })),
  }));
}

/** One string out of a `{ de: "…", en: "…" }`, or out of a plain string. */
function flat(value, lang) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  return value[lang] ?? Object.values(value)[0] ?? null;
}

/** Commands that only read, listed for a host that wants to skip a save. */
export { READS };
