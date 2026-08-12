/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The runtime of SPEC.md section 8 and 12.1.
 *
 * Browser and Node both run this file unchanged: no imports, no globals
 * beyond the standard library. It renders text, resolves choices, runs
 * combat, and keeps the flat save of section 8.
 *
 * Position inside a node is an index path (`at`), not a call stack: there are
 * no return addresses and no frames carrying their own state, which is what
 * principle 4 is about. `[2, 0, 1]` reads "op 2, its item 0, op 1 inside it".
 */

// A divert chain that has not settled after this many hops is a loop, not a
// story: one transition can pass through a few nodes, never through hundreds.
const MAX_DIVERTS = 100;

const SETUP = 'setup';
const PLAYING = 'playing';
const ENDED = 'ended';

export class Story {
  /**
   * @param {object} json story JSON per SPEC 9.1
   * @param {{lang?: string, seed?: number}} options
   */
  constructor(json, options = {}) {
    this.json = json;
    this.lang = options.lang ?? json.meta.default;
    if (!json.nodes[this.lang]) throw new Error(`unknown language "${this.lang}"`);

    this.config = json.config;
    this.state = {
      version: 1,
      story: `${flat(json.meta.title, this.lang) ?? 'story'}@${json.meta.version ?? '0'}`,
      seed: options.seed ?? Math.floor(Math.random() * 2 ** 31),
      rolls: 0,
      node: null,
      at: [],
      vars: {},
      inventory: {},
      equipped: { weapon: null, armour: null },
      memory: [],
      visits: {},
      taken: {},
      alts: {},
      turn: 0,
      seen: [],
      screen: [],
      picks: {},
      visible: [],
      fight: null,
      host: {},
      facts: {},
      events: { fired: {}, last: {} },
      lang: this.lang,
      phase: null,
      undo: [],
    };

    this.scopes = [];
    // Host values wait here for the boundary that takes them in (16.2); what
    // lands in state.host is the record of what that boundary got.
    this.incoming = null;
    this.pending = false;
    this.#setPhase(this.config.setup.length > 0 ? SETUP : PLAYING);
    this.text = [];
    this.choices = [];
    this.combat = null;
    this.#computeFacts();   // so a setup screen already has a snapshot to show
    if (this.phase === PLAYING) this.begin();
  }

  // --- languages ---------------------------------------------------------

  get languages() { return this.json.meta.languages; }

  /**
   * Switches language and re-renders the current node. State keyed by ids
   * the other language does not have is kept but ignored, per SPEC 12.1.
   */
  setLanguage(lang) {
    if (!this.json.nodes[lang]) throw new Error(`unknown language "${lang}"`);
    this.lang = lang;
    this.state.lang = lang;
    this.#resume();   // repaints even at the end: the last page is text too
  }

  get nodes() { return this.json.nodes[this.lang]; }

  // --- setting out -------------------------------------------------------

  get setup() { return this.phase === SETUP ? this.config.setup : null; }

  /**
   * @param {Array<string[]>} picks one array of option labels or item ids per
   *        setup block; omit when the book has no setup
   */
  begin(picks = []) {
    this.#diverts = 0;
    this.config.setup.forEach((block, i) => {
      const chosen = picks[i] ?? [];
      if (chosen.length !== block.pick) {
        throw new Error(`setup block ${i} takes ${block.pick} pick(s), got ${chosen.length}`);
      }
      for (const key of chosen) {
        const option = block.from.find((o) => o.item === key || o.remember === key || flat(o.label, this.lang) === key);
        if (!option) throw new Error(`unknown setup option "${key}"`);
        if (option.item) this.#take(option.item, 1);
        if (option.remember) this.#remember(option.remember);
      }
    });

    for (const [name, stat] of Object.entries(this.config.stats)) {
      this.state.vars[name] = this.#evaluate(stat.start);
      if (stat.max === 'start') this.state.vars[`${name}_max`] = this.state.vars[name];
      else if (stat.max) this.state.vars[`${name}_max`] = this.#evaluate(stat.max);
    }
    for (const item of this.config.inventory.start ?? []) this.#take(item, null);
    this.#autoEquip();

    this.#setPhase(PLAYING);
    this.text = [];
    this.state.screen = [];
    this.pending = true;
    this.#enter(this.json.meta.start);
  }

  /**
   * A boundary without a choice: the host brings time in and the page it was
   * already showing is repainted from the new snapshot (16.3, 20).
   * @param {object} host values for the declared host facts
   */
  advance(host = {}) {
    this.#diverts = 0;
    // Before begin() there is no playthrough for an event to act on; the
    // first boundary is begin()'s own (15.4).
    if (this.phase === SETUP) {
      this.state.host = host;
      this.#computeFacts();
      return this.current;
    }
    this.incoming = host;
    this.pending = true;
    if (this.#boundary()) return this.current;
    // A fight in progress is rebuilt by #resume, and that would throw away
    // the round just fought and the luck test it offered. Bringing time in
    // must not cost the reader the page they are on.
    if (this.combat) this.#paint();
    else this.#resume();
    return this.current;
  }

  /** The published snapshot, read-only (15, 20). */
  get facts() { return { ...this.state.facts }; }

  // --- what the view layer reads ----------------------------------------

  get current() {
    return {
      node: this.state.node,
      title: this.nodes[this.state.node]?.title ?? null,
      text: this.text,
      choices: this.choices.map((c, index) => ({ index, label: c.label })),
      stats: this.stats,
      facts: this.facts,
      ended: this.phase === ENDED,
    };
  }

  get stats() {
    return Object.entries(this.config.stats).map(([name, stat]) => ({
      name,
      label: flat(stat.name, this.lang) ?? name,
      // Ohne `name:` im Frontmatter ist der Wert intern (SPEC 6): er treibt
      // die Geschichte, aber niemand liest ihn. Der Wert steht trotzdem hier,
      // damit ein Werkzeug ihn sehen kann - nur die Anzeige lässt ihn weg.
      named: stat.name !== undefined,
      value: this.state.vars[name],
      max: this.state.vars[`${name}_max`] ?? null,
    }));
  }

  get inventory() {
    return Object.entries(this.state.inventory).map(([id, uses]) => {
      const declared = this.config.items[id];
      return {
        id,
        name: declared ? flat(declared.name, this.lang) : id,
        kind: declared?.kind ?? 'gear',
        uses,
        equipped: this.state.equipped.weapon === id || this.state.equipped.armour === id,
        usable: Boolean(declared?.effect) && (!declared.when || Boolean(this.#evaluate(declared.when))),
      };
    });
  }

  /** The code words the reader has been told to note down, in the order
   *  they were remembered. The sheet shows them; that is the Lone Wolf
   *  convention, where the book itself says "note this word". */
  get memory() {
    return [...this.state.memory];
  }

  // --- playing -----------------------------------------------------------

  choose(index) {
    this.#diverts = 0;
    const choice = this.choices[index];
    if (!choice) throw new Error(`no choice ${index}`);

    // Undo reaches back to the last root choice only (SPEC 8.1).
    if (choice.path.length === 1 && this.config.undo.depth > 0) this.#checkpoint();

    this.state.taken[choice.id] = (this.state.taken[choice.id] ?? 0) + 1;
    this.state.turn += 1;
    this.text = [];
    this.state.screen = [];
    // One boundary per completed transition (16.1): it falls after the
    // choice's own effects and before the page that follows them.
    this.pending = true;

    const item = choice.item;
    // The body may stop at a nested choice or a fight of its own; only when it
    // runs to its end does the target or the gather take over.
    const stopped = this.#runOps(item.body ?? [], [...choice.path, choice.itemIndex]);
    if (this.dead || stopped) return;
    if (item.target) { this.#go(item.target); return; }

    // No target: fall through to whatever follows the choices op, the gather.
    if (this.#boundaryIfPending()) return;
    this.#resumeAfter(choice.path);
  }

  /** Jumps to a node. For tools and chapter pickers, not for storytelling. */
  go(nodeId) {
    this.#diverts = 0;
    if (!this.nodes[nodeId]) throw new Error(`no node "${nodeId}"`);
    this.#setPhase(PLAYING);
    this.text = [];
    this.state.screen = [];
    this.#enter(nodeId);
  }

  get canUndo() { return this.state.undo.length > 0; }

  undo() {
    const previous = this.state.undo.pop();
    if (!previous) return false;
    const stack = this.state.undo;
    this.state = { ...previous, facts: {}, undo: stack };
    this.lang = this.state.lang;
    this.phase = this.state.phase ?? PLAYING;
    this.pending = false;
    this.incoming = null;
    this.#computeFacts();
    this.#resume();
    return true;
  }

  // --- items -------------------------------------------------------------

  useItem(id) {
    const declared = this.config.items[id];
    if (!declared?.effect) return false;
    if (declared.when && !this.#evaluate(declared.when)) return false;
    if (!this.#has(id)) return false;
    this.#statement(declared.effect);
    this.#spend(id);
    this.#checkDeath();
    return true;
  }

  equipItem(id) {
    const declared = this.config.items[id];
    if (!declared || !this.#has(id)) return false;
    if (declared.kind !== 'weapon' && declared.kind !== 'armour') return false;
    this.state.equipped[declared.kind] = id;
    return true;
  }

  // --- combat ------------------------------------------------------------

  /** One round: both sides roll, the higher total wounds the loser. */
  attack() {
    this.#diverts = 0;
    const fight = this.combat;
    if (!fight) return null;

    const enemy = fight.enemy;
    const mine = this.#evaluate(this.config.combat.attack);
    const theirs = this.#enemyAttack(enemy);
    fight.round += 1;
    const line = { round: fight.round, mine, theirs };

    if (mine > theirs) {
      const damage = Math.max(0, this.#evaluate(this.config.combat.damage));
      enemy.stamina -= damage;
      line.hit = 'enemy';
      line.damage = damage;
      line.text = this.#string('combat.hit', enemy);
    } else if (theirs > mine) {
      const damage = Math.max(0, this.#evaluate(this.config.combat.damage));
      this.state.vars.stamina -= damage;
      line.hit = 'player';
      line.damage = damage;
      line.text = this.#string('combat.taken', enemy);
    } else {
      line.hit = null;
      line.text = this.#string('combat.tie', enemy);
    }

    fight.log.push(line);
    fight.luck = this.config.combat.luck_in_combat && line.hit ? line.hit : null;
    fight.canFlee = fight.fleeAfter !== null && fight.round >= fight.fleeAfter && Boolean(fight.exits.flee);

    if (this.#checkDeath()) return line;
    if (enemy.stamina <= 0) this.#nextEnemy();
    return line;
  }

  /** The Fighting Fantasy luck rule, offered after a hit. */
  testLuck() {
    const fight = this.combat;
    if (!fight?.luck) return null;
    const lucky = this.#testLuck();
    const last = fight.log[fight.log.length - 1];

    if (fight.luck === 'enemy') {
      const extra = lucky ? 2 : -1;
      fight.enemy.stamina -= extra;
      last.damage += extra;
    } else {
      const relief = lucky ? 2 : -1;
      this.state.vars.stamina += relief;
      last.damage -= relief;
    }
    fight.luck = null;

    if (this.#checkDeath()) return lucky;
    if (fight.enemy.stamina <= 0) this.#nextEnemy();
    return lucky;
  }

  flee() {
    this.#diverts = 0;
    const fight = this.combat;
    if (!fight?.canFlee) return false;
    // What running away costs is the book's to set (SPEC 7); a story JSON
    // from before that was so falls back to the Fighting Fantasy two.
    const cost = this.config.combat.flee_cost
      ? Math.max(0, this.#evaluate(this.config.combat.flee_cost))
      : 2;
    this.state.vars.stamina -= cost;
    const exit = fight.exits.flee;
    this.combat = null;
    this.state.fight = null;
    if (this.#checkDeath()) return true;
    this.#exit('flee', exit);
    return true;
  }

  // --- save and load -----------------------------------------------------

  save() { return structuredClone(this.state); }

  load(save) {
    if (save.version > 1) throw new Error(`save version ${save.version} is newer than this runtime`);
    if (save.story !== this.state.story) {
      throw new Error(`save is from "${save.story}", this book is "${this.state.story}"`);
    }
    this.state = structuredClone(save);
    this.lang = this.json.nodes[save.lang] ? save.lang : this.json.meta.default;
    this.state.lang = this.lang;
    this.phase = save.phase ?? PLAYING;
    this.pending = false;
    this.incoming = null;
    this.state.host ??= {};
    this.state.events ??= { fired: {}, last: {} };
    // A save may have been written in the middle of a node, where variables
    // have moved on since the last boundary; the cache is what the reader saw
    // on the page they left, so it is taken as it stands (18.1).
    if (!this.state.facts) this.#computeFacts();
    this.#resume();
  }

  seed(n) { this.state.seed = n; this.state.rolls = 0; }

  // --- boundaries --------------------------------------------------------

  /**
   * One boundary, in the order of 16.2: host values in and clamped, facts,
   * events, facts again. The second pass is what the events see reflected;
   * it is a single pass, so variables chain and facts do not.
   *
   * @returns {boolean} true when an event killed the reader and the runtime
   *          has already gone somewhere else, so the caller must stop.
   */
  #boundary() {
    this.pending = false;
    this.inBoundary = true;
    this.state.host = this.incoming ?? {};
    this.incoming = null;

    const before = this.state.node;
    const wasEnded = this.phase === ENDED;
    this.#computeFacts();
    const died = this.#runEvents();
    this.#computeFacts();
    this.inBoundary = false;
    // What matters is whether this boundary moved the reader, not whether the
    // story was already over: the last page is text too, and repaints.
    return died || (this.phase === ENDED && !wasEnded) || this.state.node !== before;
  }

  /**
   * A boundary, but only if this transition has not had one yet (16.1). A
   * boundary that killed the reader lands on the death page from inside
   * itself; that page does not get a boundary of its own, or an event that
   * kills would run again on the page it sent the reader to.
   */
  #boundaryIfPending() {
    if (this.inBoundary) { this.pending = false; return false; }
    return this.pending ? this.#boundary() : false;
  }

  /**
   * Facts in declaration order, written as they go so that a derived fact
   * finds the ones above it (15.3). A condition stores as 1 or 0, because a
   * fact is an integer like everything else in 4.8.
   */
  #computeFacts() {
    const facts = {};
    this.state.facts = facts;
    for (const [name, fact] of Object.entries(this.config.facts ?? {})) {
      facts[name] = whole(this.#factValue(name, fact));
    }
  }

  #factValue(name, fact) {
    if (fact.source === 'fixed') return fact.value;
    if (fact.source === 'derived') return this.#evaluate(fact.value);
    const [min, max] = fact.range;
    const supplied = this.state.host?.[name];
    const value = typeof supplied === 'number' ? Math.trunc(supplied) : fact.fallback;
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Events in declaration order (16.2). A recurring event's anchor advances
   * by the steps the counter actually took, not by the firings it was allowed,
   * so a bounded catch-up drops the rest instead of queueing it (17.2).
   * @returns {boolean} true when a firing killed the reader
   */
  #runEvents() {
    const store = this.state.events;
    for (const [name, event] of Object.entries(this.config.events ?? {})) {
      if (event.once && store.fired[name]) continue;

      let firings = 1;
      if (event.counter) {
        const now = this.#evaluate(event.counter);
        const anchor = store.last[name];
        // The first boundary only sets the anchor: an event is scheduled
        // against what the counter does next, not against where it started.
        if (anchor === undefined) { store.last[name] = now; continue; }
        const every = event.every ?? 1;
        const steps = Math.floor((now - anchor) / every);
        if (steps <= 0) continue;
        store.last[name] = anchor + steps * every;
        firings = Math.min(steps, event.max_catchup ?? 1);
      }

      // A false condition costs the firings, never the anchor: time passed
      // whether or not the wound was there to worsen (17.2).
      if (event.when && !this.#evaluate(event.when)) continue;

      for (let i = 0; i < firings; i++) {
        this.#statement(event.do);
        if (this.#checkDeath()) return true;
      }
      if (event.once) store.fired[name] = true;
    }
    return false;
  }

  // --- flow --------------------------------------------------------------

  /** Hops in the current transition, reset wherever a new one starts. */
  #diverts = 0;

  #go(target) {
    if (target === 'END') { this.#setPhase(ENDED); this.choices = []; this.combat = null; return; }
    // A chain of diverts is one transition (16.1), so it has to be finite. A
    // node whose choices have run out and whose gather points back at itself
    // would otherwise recurse until the stack gives out, and a stack trace is
    // no way to tell an author which node it was. L028 catches the shape the
    // linter can see; this catches every other way a book gets here.
    if (++this.#diverts > MAX_DIVERTS) {
      this.#diverts = 0;
      throw new Error(`divert chain from "${this.state.node}" to "${target}" does not settle`);
    }
    this.#enter(target);
  }

  #enter(id) {
    this.state.node = id;
    this.state.at = [];
    this.state.visits[id] = (this.state.visits[id] ?? 0) + 1;
    if (!this.state.seen.includes(id)) this.state.seen.push(id);
    this.combat = null;
    // The page the reader arrives at is built after the boundary, so it can
    // never contradict the events that had just run (16.3).
    if (this.#boundaryIfPending()) return;
    this.#runOps(this.#node().body, []);
  }

  /**
   * Rebuilds what is on screen from the state alone: the recorded text ops in
   * the current language, and the choices or the fight at the stopping point.
   * Nothing here advances anything, so it is safe after load, undo and a
   * language switch alike.
   */
  #resume() {
    this.#paint();
    this.choices = [];
    this.combat = null;
    if (this.phase !== PLAYING) return;

    const at = [...this.state.at];
    if (at.length === 0) return;
    const ops = this.#opsAt(at.slice(0, -1));
    const op = ops[at[at.length - 1]];
    if (!op) return;

    if (op.op === 'choices') {
      this.#showChoices(op, at, this.state.visible ?? []);
    } else if (op.op === 'combat' && this.state.fight) {
      this.combat = this.#restoreCombat(op, this.state.fight);
    }
  }

  /** The visible text, rendered from the recorded screen. */
  #paint() {
    const recorded = this.state.screen ?? [];
    const kept = [];
    let dropped = false;

    for (const entry of recorded) {
      const node = entry.node ?? this.state.node;
      const current = node === this.state.node;
      const ops = this.#opsAt(entry.at.slice(0, -1), node);
      const op = ops[entry.at[entry.at.length - 1]];

      if (entry.exit) {
        const exit = op?.exits?.[entry.exit];
        if (exit?.text) kept.push({ text: this.#render(exit.text), class: entry.class, current });
        else if (current) dropped = true;
        continue;
      }
      if (op?.op === 'text') kept.push({ text: this.#render(op.parts), class: entry.class, current });
      else if (current) dropped = true;   // a shape this language does not have
    }

    // A node one language overrides has a shape the other cannot follow.
    // Replay that node's text here instead of showing half a page; whatever
    // came from earlier nodes stays as it is.
    this.text = kept.filter((k) => !dropped || !k.current).map(({ text, class: cls }) => ({ text, class: cls }));
    if (dropped) this.#replayText(this.state.node);
  }

  /** Collects a node's text without touching state: reads, never writes. */
  #replayText(nodeId, ops = this.nodes[nodeId]?.body) {
    for (const op of ops ?? []) {
      if (op.op === 'text') {
        this.text.push({ text: this.#render(op.parts), class: op.class ?? null });
      } else if (op.op === 'branch') {
        const index = op.branches.findIndex((b) => Boolean(this.#evaluate(b.when)));
        this.#replayText(nodeId, index >= 0 ? op.branches[index].body : op.else);
      } else if (op.op === 'choices' || op.op === 'combat') {
        return;
      }
    }
  }

  /**
   * Continues in the container that holds `path`, just after it, and keeps
   * going outwards when that container runs out.
   *
   * A gather joins the threads of its own level and the scene goes on above
   * it (SPEC 4.4). Stopping at the end of the enclosing body instead would
   * leave the nested choices standing, and the reader would be offered the
   * same level again with no way back out to the one that holds it.
   */
  #resumeAfter(path) {
    let at = path;
    let from = at[at.length - 1] + 1;
    for (;;) {
      const container = at.slice(0, -1);
      const stopped = this.#runOps(this.#opsAt(container), container, from);
      if (stopped || this.dead) return;
      // The body that held this level has run out. What stands now is the
      // level above, offered again without whatever has been taken from it.
      at = container.slice(0, -1);
      if (at.length === 0) return;
      from = at[at.length - 1];
    }
  }

  #node() {
    const node = this.nodes[this.state.node];
    if (!node) throw new Error(`no node "${this.state.node}" in ${this.lang}`);
    return node;
  }

  /** The op list a path points into, inside `nodeId` or the current node. */
  #opsAt(path, nodeId = this.state.node) {
    const node = this.nodes[nodeId];
    if (!node) return [];
    let ops = node.body;
    for (let i = 0; i < path.length; i += 2) {
      const op = ops[path[i]];
      if (!op) return [];
      if (op.op === 'choices') ops = op.items[path[i + 1]]?.body ?? [];
      else if (op.op === 'branch') {
        ops = path[i + 1] === -1 ? (op.else ?? []) : (op.branches[path[i + 1]]?.body ?? []);
      } else return [];   // the path does not fit this language's structure
    }
    return ops;
  }

  /**
   * Runs a container from `from`, appending text, and stops at a choice, a
   * combat, a divert or the end of the container.
   * @returns {boolean} true when it stopped, false when it ran off the end
   */
  #runOps(ops, path, from = 0) {
    for (let i = from; i < (ops ?? []).length; i++) {
      const op = ops[i];
      switch (op.op) {
        case 'text':
          this.state.screen.push({ node: this.state.node, at: [...path, i], class: op.class ?? null });
          this.text.push({ text: this.#render(op.parts, true), class: op.class ?? null });
          break;

        case 'assign':
          this.state.vars[op.target] = this.#evaluate(op.value);
          if (this.#checkDeath()) return true;
          break;

        case 'call':
          this.#call(op.fn, op.args);
          if (this.#checkDeath()) return true;
          break;

        case 'return':
          this.returned = op.value ? this.#evaluate(op.value) : null;
          return true;

        case 'label':
          break;

        case 'divert':
          this.state.at = [...path, i];
          this.#go(op.target);
          return true;

        case 'branch': {
          const index = op.branches.findIndex((b) => Boolean(this.#evaluate(b.when)));
          const body = index >= 0 ? op.branches[index].body : op.else;
          if (!body) break;
          if (this.#runOps(body, [...path, i, index >= 0 ? index : -1])) return true;
          break;
        }

        case 'choices': {
          // Whether an option is offered is decided from the new snapshot,
          // never from the one the departing page was written against.
          if (this.#boundaryIfPending()) return true;
          const visible = op.items
            .map((item, index) => (this.#visible(item) ? index : -1))
            .filter((index) => index >= 0);
          if (visible.length === 0) break;      // no fallback: fall through to the gather
          this.state.at = [...path, i];
          this.state.visible = visible;
          this.#showChoices(op, [...path, i], visible);
          return true;
        }

        case 'combat':
          if (this.#boundaryIfPending()) return true;
          this.state.at = [...path, i];
          this.#startCombat(op);
          return true;

        default:
          break;
      }
    }
    return false;
  }

  #showChoices(op, path, visible) {
    this.choices = visible
      .filter((index) => op.items[index])
      .map((index) => ({
        id: op.items[index].id,
        label: this.#render(op.items[index].label),
        item: op.items[index],
        itemIndex: index,
        path,
      }));
  }

  #visible(item) {
    if (!item.sticky && (this.state.taken[item.id] ?? 0) > 0) return false;
    return item.when ? Boolean(this.#evaluate(item.when)) : true;
  }

  // --- combat internals --------------------------------------------------

  #startCombat(op) {
    const roster = op.enemies.map((id) => ({ id, ...structuredClone(this.config.enemies[id]) }));
    this.state.fight = { roster, index: 0, round: 0 };
    this.choices = [];
    this.combat = this.#restoreCombat(op, this.state.fight);
  }

  /** The live fight, rebuilt from the part of it that lives in the save. */
  #restoreCombat(op, fight) {
    const enemy = fight.roster[fight.index];
    return {
      exits: op.exits,
      get roster() { return fight.roster; },
      get index() { return fight.index; },
      enemy,
      get round() { return fight.round; },
      set round(value) { fight.round = value; },
      name: flat(enemy.name, this.lang),
      log: [],
      luck: null,
      canFlee: enemy.flee_after !== null && fight.round >= (enemy.flee_after ?? Infinity) && Boolean(op.exits.flee),
      fleeAfter: enemy.flee_after ?? null,
      op,
    };
  }

  #nextEnemy() {
    const fight = this.combat;
    const saved = this.state.fight;
    saved.index += 1;
    if (saved.index < saved.roster.length) {
      saved.round = 0;
      this.combat = this.#restoreCombat(fight.op, saved);
      return;
    }
    const exit = fight.exits.win;
    this.combat = null;
    this.state.fight = null;
    this.#exit('win', exit);
  }

  /** Prints an exit's text, then goes where it points. */
  #exit(name, exit) {
    this.text = [];
    this.state.screen = [];
    // Leaving a fight is a completed transition like any other, so the page
    // it leads to is built from its own snapshot (16.1).
    this.pending = true;
    if (exit.text) {
      this.state.screen.push({ node: this.state.node, at: [...this.state.at], exit: name, class: null });
      this.text.push({ text: this.#render(exit.text, true), class: null });
    }
    this.#go(exit.target);
  }

  #enemyAttack(enemy) {
    // The enemy uses the same formula with its own skill and no equipment.
    return this.#evaluate(this.config.combat.attack, {
      skill: enemy.skill,
      stamina: enemy.stamina,
      weapon_attack: 0,
      weapon_damage: 0,
      armour_defence: 0,
    });
  }

  get dead() { return this.phase === ENDED; }

  #checkDeath() {
    if (!this.config.death || this.phase === ENDED) return false;
    if (!this.#evaluate(this.config.death.when)) return false;
    const lose = this.combat?.exits?.lose;
    this.combat = null;
    this.state.fight = null;
    this.choices = [];
    if (lose) this.#exit('lose', lose);
    else this.#go(this.config.death.goto ?? 'END');
    return true;
  }

  // --- text --------------------------------------------------------------

  #render(parts, record = false) {
    let out = '';
    for (const part of parts ?? []) {
      if (typeof part === 'string') { out += part; continue; }
      if (part.t === 'print') { out += String(this.#evaluate(part.expr)); continue; }
      if (part.t === 'cond') {
        out += this.#render(this.#evaluate(part.when) ? part.then : (part.else ?? []), record);
        continue;
      }
      if (part.t === 'alt') out += this.#render(this.#pickAlternative(part, record), record);
    }
    return out;
  }

  #pickAlternative(part, record) {
    // Re-rendering the same screen must not move a cycle on, so a screen
    // remembers what each alternative settled on (SPEC 8).
    if (!record) {
      const settled = this.state.picks[part.id];
      return settled === undefined ? [] : (part.items[settled] ?? []);
    }
    const seen = this.state.alts[part.id] ?? 0;
    const count = part.items.length;
    let index;
    switch (part.kind) {
      case 'cycle': index = seen % count; break;
      case 'random': index = this.#random(0, count - 1); break;
      case 'once': index = seen < count ? seen : -1; break;
      default: index = Math.min(seen, count - 1); break;   // sequence: hold the last
    }
    this.state.alts[part.id] = seen + 1;
    this.state.picks[part.id] = index;
    return index >= 0 ? part.items[index] : [];
  }

  // --- expressions -------------------------------------------------------

  #evaluate(expr, overrides = null) {
    if (expr === null || expr === undefined) return null;
    if ('lit' in expr) return expr.lit;
    if ('ref' in expr) return expr.ref;
    if ('var' in expr) return this.#variable(expr.var, overrides);
    if ('call' in expr) return this.#call(expr.call, expr.args, overrides);

    const [a, b] = expr.args;
    switch (expr.op) {
      case 'not': return !this.#evaluate(a, overrides);
      case 'and': return Boolean(this.#evaluate(a, overrides)) && Boolean(this.#evaluate(b, overrides));
      case 'or': return Boolean(this.#evaluate(a, overrides)) || Boolean(this.#evaluate(b, overrides));
      default: break;
    }
    const x = this.#evaluate(a, overrides);
    const y = this.#evaluate(b, overrides);
    switch (expr.op) {
      case '+': return x + y;
      case '-': return x - y;
      case '*': return x * y;
      case '/': return Math.trunc(x / y);
      case '%': return x % y;
      case '==': return x === y;
      case '!=': return x !== y;
      case '>': return x > y;
      case '<': return x < y;
      case '>=': return x >= y;
      case '<=': return x <= y;
      default: throw new Error(`unknown operator "${expr.op}"`);
    }
  }

  #variable(name, overrides) {
    if (overrides && name in overrides) return overrides[name];
    const scope = this.scopes[this.scopes.length - 1];
    if (scope && name in scope) return scope[name];
    // A fact is read wherever a variable is read; there is no new spelling
    // (15.2), and E170 keeps the two namespaces from overlapping.
    if (name in this.state.facts) return this.state.facts[name];
    switch (name) {
      case 'in_combat': return this.combat !== null;
      case 'weapon_attack': return this.#equipped('weapon')?.attack_bonus ?? 0;
      case 'weapon_damage': return this.#equipped('weapon')?.damage_override ?? 0;
      case 'armour_defence': return this.#equipped('armour')?.defence ?? 0;
      default: return this.state.vars[name] ?? 0;
    }
  }

  #equipped(kind) {
    const id = this.state.equipped[kind];
    return id ? this.config.items[id] : null;
  }

  #call(name, args, overrides = null) {
    const value = (i) => this.#evaluate(args[i], overrides);
    switch (name) {
      case 'roll': {
        const count = value(0), sides = value(1);
        let total = 0;
        for (let i = 0; i < count; i++) total += this.#random(1, sides);
        return total;
      }
      case 'random': return this.#random(value(0), value(1));
      case 'test_luck': return this.#testLuck();
      case 'test': return this.#check(this.#variable(value(0), overrides));
      case 'has': return this.#has(value(0));
      case 'take': return this.#take(value(0), args[1] ? value(1) : null);
      case 'drop': { delete this.state.inventory[key(value(0))]; return true; }
      case 'uses': return this.state.inventory[key(value(0))] ?? 0;
      case 'use': return this.useItem(key(value(0)));
      case 'equip': return this.equipItem(key(value(0)));
      case 'equipped': {
        const id = key(value(0));
        return this.state.equipped.weapon === id || this.state.equipped.armour === id;
      }
      case 'remember': return this.#remember(value(0));
      case 'forget': {
        this.state.memory = this.state.memory.filter((w) => w !== key(value(0)));
        return true;
      }
      case 'knows': return this.state.memory.includes(key(value(0)));
      case 'visits': return this.state.visits[value(0)] ?? 0;
      case 'turns': return this.state.turn;
      case 'turns_since': {
        const target = value(0);
        return this.state.seen.includes(target) ? this.state.turn : -1;
      }
      case 'choice_count': return this.choices.length;
      case 'min': return Math.min(value(0), value(1));
      case 'max': return Math.max(value(0), value(1));
      case 'abs': return Math.abs(value(0));
      default: return this.#callFunction(name, args, overrides);
    }
  }

  /** A story function: its own scope, its parameters bound to the arguments. */
  #callFunction(name, args, overrides) {
    const fn = this.nodes[name];
    if (!fn || fn.kind !== 'function') throw new Error(`no function "${name}"`);
    const scope = {};
    fn.params.forEach((param, i) => { scope[param] = this.#evaluate(args[i], overrides); });

    const previous = this.returned;
    this.returned = null;
    const savedText = this.text;
    this.text = [];
    this.scopes.push(scope);
    this.#runOps(fn.body, [], 0);
    this.scopes.pop();
    this.text = savedText;
    const result = this.returned;
    this.returned = previous;
    return result;
  }

  #statement(op) {
    if (op.op === 'assign') this.state.vars[op.target] = this.#evaluate(op.value);
    else if (op.op === 'call') this.#call(op.fn, op.args);
  }

  // --- inventory internals ----------------------------------------------

  #has(id) { return (this.state.inventory[key(id)] ?? 0) > 0; }

  #take(id, count) {
    const name = key(id);
    const declared = this.config.items[name];
    const uses = count ?? declared?.uses ?? 1;
    if (this.state.inventory[name] !== undefined) {
      if (declared?.kind === 'consumable') this.state.inventory[name] += uses;
      return true;
    }
    const slots = this.config.inventory.slots;
    if (slots > 0 && Object.keys(this.state.inventory).length >= slots) return false;
    this.state.inventory[name] = uses;
    return true;
  }

  #spend(id) {
    const name = key(id);
    this.state.inventory[name] -= 1;
    if (this.state.inventory[name] <= 0) {
      delete this.state.inventory[name];
      if (this.state.equipped.weapon === name) this.state.equipped.weapon = null;
      if (this.state.equipped.armour === name) this.state.equipped.armour = null;
    }
  }

  #remember(word) {
    const name = key(word);
    if (!this.state.memory.includes(name)) this.state.memory.push(name);
    return true;
  }

  #autoEquip() {
    for (const id of Object.keys(this.state.inventory)) {
      const declared = this.config.items[id];
      if (!declared) continue;
      if (declared.kind === 'weapon' && !this.state.equipped.weapon) this.state.equipped.weapon = id;
      if (declared.kind === 'armour' && !this.state.equipped.armour) this.state.equipped.armour = id;
    }
  }

  // --- dice --------------------------------------------------------------

  /**
   * Roll n of the stream, from seed and the counter alone: reloading a save
   * gives the same roll as before rather than a fresh one (SPEC 8).
   */
  #random(min, max) {
    const n = this.state.rolls++;
    let x = (this.state.seed + n * 0x9e3779b9) >>> 0;
    x ^= x >>> 16; x = Math.imul(x, 0x21f0aaad) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 0x735a2d97) >>> 0;
    x ^= x >>> 15;
    return min + ((x >>> 0) % (max - min + 1));
  }

  /**
   * A test rolls `checks.dice` against a value: with `at-most` the roll has to
   * come in at or under it, the Fighting Fantasy rule, with `at-least` at or
   * over it. One place decides, so test() and test_luck() cannot drift apart.
   */
  #check(against) {
    const roll = this.#evaluate(this.config.checks.dice);
    return this.config.checks.succeeds === 'at-least' ? roll >= against : roll <= against;
  }

  #testLuck() {
    const lucky = this.#check(this.state.vars.luck ?? 0);
    this.state.vars.luck = Math.max(0, (this.state.vars.luck ?? 0) - 1);
    return lucky;
  }

  // --- undo --------------------------------------------------------------

  /**
   * A checkpoint carries `host` and `events` and omits `facts` (18.2): it is
   * always taken at a boundary, and principle 8 guarantees that recomputing
   * from the same state gives the same answer.
   */
  #checkpoint() {
    const { undo, facts, ...rest } = this.state;
    this.state.undo = [...undo, structuredClone(rest)].slice(-this.config.undo.depth);
  }

  #setPhase(phase) {
    this.phase = phase;
    this.state.phase = phase;
  }

  #string(key, enemy) {
    const template = flat(this.config.strings[key], this.lang) ?? '';
    return template.replace('{enemy}', flat(enemy.name, this.lang));
  }
}

/** Reads a language table, falling back to the only entry it has. */
function flat(value, lang) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return value[lang] ?? Object.values(value)[0] ?? null;
}

function key(name) {
  return String(name).trim().toLowerCase();
}

/** Facts are integers (4.8), so a condition stores as 1 or 0. */
function whole(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Math.trunc(value);
  return 0;
}
