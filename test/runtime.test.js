/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The runtime of SPEC.md 8 and 12.1, driven against the compiled examples.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compileFile } from '../src/compile.js';
import { Story } from '../src/runtime.js';
import { walk } from '../src/play.js';
import { compile } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));
const example = () => compileFile(join(here, 'fixtures', 'thornwood.md')).story;
const house = () => compileFile(join(here, '..', 'examples', 'house', 'book.yaml')).story;
const book = () => compileFile(join(here, '..', 'examples', 'thornwood-book', 'book.yaml')).story;

/** Starts a story with a fixed seed and the first setup option. */
function play(story, options = {}) {
  const s = new Story(story, { seed: 12345, ...options });
  if (s.setup) s.begin(s.setup.map((block) => block.from.slice(0, block.pick).map((o) => o.item)));
  return s;
}

test('a story starts, prints text and offers choices', () => {
  const s = play(example());
  assert.equal(s.current.node, 'begin');
  assert.match(s.current.text[0].text, /Der Pfad teilt sich/);
  assert.ok(s.current.choices.length >= 2);
  assert.deepEqual(s.stats.map((x) => x.name), ['skill', 'stamina', 'luck', 'gold']);
});

test('a stat without a name stays internal', () => {
  // An imported book arrives full of these: ink only ever tested the
  // variable, so there is no name to import.
  const s = play(compile('# A {#a}\n\n-> END\n', {
    frontmatter: '---\ntitle: Quiet\nstart: a\nstats:\n'
      + '  stamina: { name: Stamina, start: 20 }\n  seen_hut: { start: 0 }\n---\n',
  }).story);
  assert.deepEqual(s.stats.map((x) => [x.name, x.label, x.named]), [
    ['stamina', 'Stamina', true],
    ['seen_hut', 'seen_hut', false],
  ]);
});

test('setup grants what was picked, and stats are rolled once', () => {
  const s = play(example());
  assert.ok(s.inventory.some((i) => i.id === 'sword'));
  assert.ok(s.inventory.some((i) => i.id === 'provisions' && i.uses === 10));
  const skill = s.stats.find((x) => x.name === 'skill');
  assert.equal(skill.value, skill.max);
});

test('the same seed replays exactly', () => {
  const a = play(example());
  const b = play(example());
  assert.deepEqual(a.stats, b.stats);
  a.choose(0); b.choose(0);
  assert.deepEqual(a.current.text, b.current.text);
});

test('a once-only choice disappears, a sticky one stays', () => {
  const { story } = compile(`
# Hub {#hub}

The hub.

* [Once](#side)
+ [Twice](#side)

# Side {#side}

The side.

+ [Back](#hub)
`);
  const s = new Story(story, { seed: 1 });
  const pick = (re) => s.choose(s.current.choices.find((c) => re.test(c.label)).index);

  pick(/Once/);
  assert.equal(s.current.node, 'side');
  pick(/Back/);
  assert.equal(s.current.node, 'hub');
  assert.ok(!s.current.choices.some((c) => /Once/.test(c.label)), 'once-only is gone');
  assert.ok(s.current.choices.some((c) => /Twice/.test(c.label)), 'sticky stays');

  // And it stays however often the reader comes back.
  pick(/Twice/); pick(/Back/);
  assert.ok(s.current.choices.some((c) => /Twice/.test(c.label)));
});

test('an alternative advances, and a once-only alternative runs dry', () => {
  const s = play(example());
  const pick = (re) => s.choose(s.current.choices.find((c) => re.test(c.label)).index);
  const first = s.current.text[0].text;

  pick(/Dickicht/);
  assert.match(s.current.text[0].text, /Dornen fahren dir über die Arme/);

  pick(/Zur Hecke/);
  assert.notEqual(s.current.text[0].text, first, 'the cycle moved on');

  pick(/Bach/);
  pick(/Zur Hecke/);
  assert.notEqual(s.current.text[0].text, first);
});

test('a choice with a body runs it, then falls through to the gather', () => {
  const s = play(example());
  s.choose(1);                                      // to the brook
  const gold = s.stats.find((x) => x.name === 'gold').value;
  const reach = s.current.choices.find((c) => /Danach greifen/.test(c.label));
  s.choose(reach.index);
  assert.equal(s.stats.find((x) => x.name === 'gold').value, gold + 3);
  assert.match(s.current.text.map((t) => t.text).join(' '), /Finger schließen sich/);
});

test('combat runs round by round and ends in an exit', () => {
  const s = play(example());
  const gap = s.current.choices.find((c) => /Spalt/.test(c.label));
  s.choose(gap.index);
  assert.equal(s.current.node, 'crypt');
  assert.ok(s.combat, 'a fight started');
  assert.equal(s.combat.enemy.stamina, 6);

  let guard = 0;
  while (s.combat && guard++ < 100) s.attack();
  assert.ok(guard < 100, 'the fight ended');
  assert.ok(['chamber', 'death'].includes(s.current.node));
});

/** A fight you can run from at once, so the price of fleeing is all it tests. */
function fleeBook(combat = '') {
  return compile(`# A {#a}

!combat rat
  win  -> END
  flee [Run](#b) You go.

# B {#b}

-> END
`, {
    frontmatter: `---
title: Flight
start: a
stats:
  stamina: { start: 20 }
combat:
  attack: "roll(1,6)"
  damage: "1"
${combat}enemies:
  rat: { name: Rat, skill: 1, stamina: 99, flee_after: 0 }
---
`,
  }).story;
}

test('fleeing costs two stamina where the book says nothing', () => {
  const s = play(fleeBook());
  assert.ok(s.combat, 'a fight started');
  assert.equal(s.flee(), true);
  assert.equal(s.state.vars.stamina, 18);
  assert.equal(s.current.node, 'b');
});

test('a book sets its own price for running away', () => {
  const dear = play(fleeBook('  flee_cost: "5"\n'));
  dear.flee();
  assert.equal(dear.state.vars.stamina, 15);

  const free = play(fleeBook('  flee_cost: "0"\n'));
  free.flee();
  assert.equal(free.state.vars.stamina, 20, 'nothing was taken');

  const scaled = play(fleeBook('  flee_cost: "stamina / 4"\n'));
  scaled.flee();
  assert.equal(scaled.state.vars.stamina, 15, 'the expression saw the stats');
});

test('a negative flee cost is no free healing', () => {
  const s = play(fleeBook('  flee_cost: "0 - 6"\n'));
  s.flee();
  assert.equal(s.state.vars.stamina, 20);
});

test('death diverts where the frontmatter says', () => {
  const s = play(example());
  s.state.vars.stamina = 1;
  const gap = s.current.choices.find((c) => /Spalt/.test(c.label));
  s.choose(gap.index);
  let guard = 0;
  while (s.combat && guard++ < 100) s.attack();
  if (s.state.vars.stamina <= 0) assert.equal(s.current.node, 'death');
});

test('items are taken, tested and used', () => {
  const s = play(example());
  const before = s.stats.find((x) => x.name === 'stamina').value;
  s.state.vars.stamina = before - 6;
  assert.equal(s.useItem('provisions'), true);
  assert.equal(s.stats.find((x) => x.name === 'stamina').value, before - 2);
  assert.equal(s.inventory.find((i) => i.id === 'provisions').uses, 9);
});

test('a consumable is refused where its when: forbids it', () => {
  const s = play(example());
  const gap = s.current.choices.find((c) => /Spalt/.test(c.label));
  s.choose(gap.index);
  assert.ok(s.combat);
  assert.equal(s.useItem('provisions'), false, 'not in combat');
});

test('save and load restore the position and the dice', () => {
  const s = play(example());
  s.choose(1);
  const save = s.save();
  const text = s.current.text.map((t) => t.text);

  const other = new Story(example(), { seed: 999 });
  other.load(save);
  assert.equal(other.current.node, s.current.node);
  assert.deepEqual(other.current.text.map((t) => t.text), text);
  assert.equal(other.state.rolls, save.rolls);
});

test('undo goes back to the last root choice, not to a nested one', () => {
  const s = play(example());
  const pick = (re) => s.choose(s.current.choices.find((c) => re.test(c.label)).index);

  pick(/Bach/);                                  // root choice in "begin"
  pick(/Danach greifen/);                        // root choice in "brook"
  const gold = s.stats.find((x) => x.name === 'gold').value;
  pick(/Noch einmal suchen/);                    // nested: no checkpoint of its own

  assert.equal(s.canUndo, true);
  s.undo();
  assert.equal(s.current.node, 'brook');
  assert.equal(s.stats.find((x) => x.name === 'gold').value, gold - 3, 'the coin is back in the water');

  s.undo();
  assert.equal(s.current.node, 'begin');
  assert.equal(s.canUndo, false);
});

test('undo restores the dice, so the same choice rolls the same', () => {
  const s = play(example());
  const pick = (re) => s.choose(s.current.choices.find((c) => re.test(c.label)).index);
  pick(/Bach/);
  const rolls = s.state.rolls;
  const text = s.current.text.map((t) => t.text);
  s.undo();
  pick(/Bach/);
  assert.equal(s.state.rolls, rolls);
  assert.deepEqual(s.current.text.map((t) => t.text), text);
});

test('a language switch keeps the position and the state', () => {
  const s = play(book());
  assert.equal(s.lang, 'de');
  s.choose(0);
  const node = s.current.node;
  const taken = { ...s.state.taken };

  s.setLanguage('en');
  assert.equal(s.current.node, node);
  assert.deepEqual(s.state.taken, taken);
  assert.match(s.current.text[0].text, /Thorns rake|You know the way/);
  assert.ok(s.current.choices.some((c) => /Go back to the hedge/.test(c.label)));
});

test('an overridden node runs its own logic', () => {
  const s = play(book(), { lang: 'en' });
  s.state.vars.gold = 1;
  s.go('crypt.daylight');
  assert.match(s.current.text.map((t) => t.text).join(' '), /a single gold piece/);

  s.state.vars.gold = 7;
  s.go('crypt.daylight');
  assert.match(s.current.text.map((t) => t.text).join(' '), /7 gold pieces/);

  // The German original has no branch there, just one sentence.
  s.setLanguage('de');
  assert.match(s.current.text.map((t) => t.text).join(' '), /Goldstücken in der Tasche/);
});

test('a story function is called and returns', () => {
  const { story } = compile([
    '# fn double(n)', '~ return n + n', '',
    '# A {#a}', '', 'Twice: {double(3)}.', '-> END', '',
  ].join('\n'));
  const s = new Story(story, { seed: 1 });
  assert.match(s.current.text[0].text, /Twice: 6\./);
});

test('a finished story loads as finished', () => {
  const s = play(example());
  s.go('death');
  assert.equal(s.current.ended, true);

  const other = new Story(example(), { seed: 1 });
  other.load(s.save());
  assert.equal(other.current.ended, true);
  assert.equal(other.current.text.length > 0, true);
});

test('a story function called as a statement resolves across files', () => {
  const s = play(book());
  const pick = (re) => s.choose(s.current.choices.find((c) => re.test(c.label)).index);
  pick(/Spalt/);
  let guard = 0;
  while (s.combat && guard++ < 80) s.attack();
  if (s.current.node !== 'crypt.chamber') return;    // died on the way, fine

  pick(/Schlüssel nehmen/);                          // stays in the chamber, key in hand
  assert.equal(s.current.node, 'crypt.chamber');
  assert.ok(s.inventory.some((i) => i.id === 'silver-key'));

  const before = s.state.vars.stamina;
  pick(/eisernen Tor/);                              // the gate calls heal(2)
  assert.equal(s.current.node, 'crypt.gate');
  assert.equal(s.state.vars.stamina, Math.min(before + 2, s.state.vars.stamina_max));

  pick(/Hinaus ins Licht/);
  assert.equal(s.current.ended, true);
});

test('a check rolls the declared dice, in the declared direction', () => {
  const frontmatter = `---
title: T
stats:
  skill: { start: 12 }
checks:
  dice: "roll(2,6)"
  succeeds: at-most
---
`;
  const { story } = compile('# A {#a}\n\n{test("skill"): passed|failed}\n-> END\n', { frontmatter });
  const s = new Story(story, { seed: 7 });
  assert.match(s.current.text[0].text, /passed|failed/);
  assert.equal(s.state.rolls, 2, 'two dice came off the stream');

  // The same seed, the other direction: a skill of 12 that has to be reached
  // by 2d6 can only fail on most rolls, so the two disagree.
  const other = compile('# A {#a}\n\n{test("skill"): passed|failed}\n-> END\n', {
    frontmatter: frontmatter.replace('at-most', 'at-least'),
  }).story;
  const t = new Story(other, { seed: 7 });
  assert.notEqual(t.current.text[0].text, s.current.text[0].text);
});

test('the house survives three hundred playthroughs', () => {
  const story = house();
  const ends = new Set();

  for (let seed = 1; seed <= 300; seed++) {
    const s = new Story(story, { seed });
    s.begin([[s.setup[0].from[seed % 3].item], [s.setup[1].from[(seed >> 2) % 3].remember]]);

    const run = walk(s, { seed, maxSteps: 200 });
    assert.ok(!run.deadEnd, `dead end at ${s.current.node} (seed ${seed})`);
    assert.ok(run.ended, `seed ${seed} never finished`);
    ends.add(s.current.node);
  }

  // Every ending is reachable by play, not just by the reachability report.
  assert.deepEqual([...ends].sort(), ['cellar.break', 'cellar.flight', 'cellar.jar', 'cellar.undone']);
});

test('code words appear on the sheet, in the order they were noted', () => {
  const s = new Story(house(), { seed: 1 });
  s.begin([['dagger'], ['JOURNALIST']]);
  assert.deepEqual(s.memory, ['journalist']);

  s.go('arrival.window');
  assert.deepEqual(s.memory, ['journalist', 'auf-der-treppe']);
});

test('a save from another book or version is rejected', () => {
  const s = new Story(house(), { seed: 1 });
  s.begin([['dagger'], ['VERTRETER']]);
  const save = s.save();
  save.story = 'Ein anderes Haus@0.1.0';

  const t = new Story(house(), { seed: 1 });
  assert.throws(() => t.load(save), /anderes Haus/);

  const ok = new Story(house(), { seed: 1 });
  ok.load(s.save());
  assert.equal(ok.current.node, s.current.node);
});

test('fear kills, and only counts a room the first time', () => {
  const s = new Story(house(), { seed: 3 });
  s.begin([['brandy'], ['JOURNALIST']]);
  const max = s.state.vars.fear_max;

  s.go('house.library');
  const first = s.state.vars.fear;
  s.go('house.library');
  assert.equal(s.state.vars.fear, first, 'a second visit does not frighten again');

  s.state.vars.fear = max - 1;
  s.go('house.stay');                       // costs two
  assert.equal(s.current.node, 'cellar.undone');
  assert.equal(s.current.ended, true);
});

test('when every choice is filtered out, the container runs on', () => {
  const { story } = compile([
    '# A {#a}', '', '* {gold > 99} [Never](#b)', '---', 'Nothing happened.', '-> END', '',
    '# B {#b}', '', '-> END', '',
  ].join('\n'));
  const s = new Story(story, { seed: 1 });
  assert.match(s.current.text[0].text, /Nothing happened/);
  assert.equal(s.current.ended, true);
});

const nightside = () => compileFile(join(here, '..', 'examples', 'nightside', 'book.yaml')).story;

test('the nightside runs its clock down over three hundred playthroughs', () => {
  const story = nightside();

  // Both languages, because `en` overrides the nodes entirely (L019): its
  // choices, targets and conditions are the ones that run, and a translation
  // that dropped a guard would play a different book.
  for (const lang of ['de', 'en']) {
    const ends = new Set();

    for (let seed = 1; seed <= 300; seed++) {
      const s = new Story(story, { seed, lang });
      s.begin([[s.setup[0].from[seed % 3].remember]]);

      // More steps than the house needs: the filter in the basin holds the
      // clock up, and a spare cartridge fitted at the last exit buys the way
      // back in - a reader who keeps wandering takes longer to run out.
      const run = walk(s, { seed, maxSteps: 600 });
      assert.ok(!run.deadEnd, `dead end at ${s.current.node} (seed ${seed}, ${lang})`);
      assert.ok(run.ended, `seed ${seed} never finished (${lang})`);
      ends.add(s.current.node);
    }

    assert.deepEqual([...ends].sort(),
      ['ende.abschalten', 'ende.bleiben', 'ende.dunkel', 'ende.erstickt', 'ende.rettung'],
      `endings reached in ${lang}`);
  }
});

test('the nightside advances its own clock, and events read it', () => {
  const story = nightside();
  const s = new Story(story, { seed: 1 });
  s.begin([['TECHNIK']]);

  const air = s.state.vars.air;
  const time = s.state.vars.time;
  s.choose(s.current.choices[0].index);
  assert.ok(s.state.vars.time > time, 'a turn costs story time');
  assert.ok(s.state.vars.air <= air, 'story time costs air');

  // `elapsed` is a host fact: without a host it stays at its fallback, and the
  // book still plays (SPEC 15.4).
  assert.equal(s.facts.elapsed, 0);
  s.advance({ elapsed: 1800 });
  assert.equal(s.facts.elapsed, 1800);
  assert.equal(s.facts.tick, 1800, 'tick caps at an hour');
  assert.equal(s.facts.lang_weg, 1, 'half an hour away is a long time away');
  s.advance({});
  assert.equal(s.facts.elapsed, 0, 'a host value is consumed by its boundary');
});

test('a gather closes its level and the scene goes on above it', () => {
  const { story } = compile(`
# A {#a}

* [Ask]()
  He wipes out a mug.
  * [The road]()
    ~ gold = gold + 1
  * [The tower]()
    ~ gold = gold + 2
  ---
  You put a coin on the counter.
* [Leave](#b)

---
-> b

# B {#b}

-> END
`);
  // Ohne setup: setzt der Konstruktor die Geschichte selbst in Gang.
  const s = new Story(story, { seed: 1 });
  s.choose(0);
  s.choose(0);
  // The gather joins the inner threads, so what stands now is the outer
  // level, not the sibling that was never taken.
  assert.deepEqual(s.current.choices.map((c) => c.label), ['Leave']);
  assert.equal(s.state.vars.gold, 2);
});

test('glue carries a sentence across a choice', () => {
  const { story } = compile(`
# A {#a}

He asks what I am.

* [Deny]() "Nothing," I say<>
* [Boast]() "A cryptographer," I say<>

---
<>, and the room goes quiet.

-> END
`);
  // Ohne setup: setzt der Konstruktor die Geschichte selbst in Gang.
  const s = new Story(story, { seed: 1 });
  s.choose(0);
  assert.deepEqual(s.current.text.map((t) => t.text), ['"Nothing," I say, and the room goes quiet.']);
});

test('glue across paragraphs does not invent a space before punctuation', () => {
  const { story } = compile(`
# A {#a}

He says nothing<>

<>.

-> END
`);
  // Ohne setup: setzt der Konstruktor die Geschichte selbst in Gang.
  const s = new Story(story, { seed: 1 });
  assert.deepEqual(s.current.text.map((t) => t.text), ['He says nothing.']);
});

test('a folded conditional still joins the line before it', () => {
  const { story } = compile(`
# A {#a}

* [Agree]() "Awkward," I reply

---
<>{gold > 0: , sipping at my tea|}.

-> END
`);
  // Ohne setup: setzt der Konstruktor die Geschichte selbst in Gang.
  const s = new Story(story, { seed: 1 });
  s.choose(0);
  assert.deepEqual(s.current.text.map((t) => t.text), ['"Awkward," I reply, sipping at my tea.']);
});

test('a node whose choices have all run out is an error, not a silent stop', () => {
  // SPEC 4.2: a node with no way on is an error. E110 says that about what is
  // written; this says it about what is left at runtime. Before it existed,
  // the reader was shown the previous node's choices under this node's text,
  // and could take them.
  const { story } = compile(`
# Hub {#hub}

The hub.

* [Once](#side)

# Side {#side}

The side.

+ [Back](#hub)
`);
  const s = new Story(story, { seed: 1 });
  s.choose(0);
  assert.equal(s.current.node, 'side');

  assert.throws(() => s.choose(0), (error) => {
    assert.match(error.message, /"hub" has nothing left to offer/);
    assert.match(error.message, /sticky choice or a divert/, 'it says what would fix it');
    return true;
  });
});

test('a node that ends, fights or diverts is never that error', () => {
  // The three ways a page can be a page, each with its once-only choice spent.
  for (const tail of ['-> END', '-> onwards', '+ [Stay](#hub)']) {
    const { story } = compile(`
# Hub {#hub}

The hub.

* [Once](#side)
---
${tail}

# Side {#side}

The side.

+ [Back](#hub)

# Onwards {#onwards}

-> END
`);
    const s = new Story(story, { seed: 1 });
    s.choose(0);
    s.choose(0);                       // back into the hub, choice spent
    assert.ok(s.current.ended || s.current.choices.length > 0 || s.combat,
      `"${tail}" left the reader with nothing`);
  }
});

test('ein Buch ohne setup setzt einmal aus, und ein zweites begin() ist ein Fehler', () => {
  // Zweimal aussetzen spielte den Startknoten komplett noch einmal: jede
  // Zuweisung lief erneut, jedes Ereignis feuerte erneut, und jede
  // Alternative rueckte eine Option weiter - die erste Option einer Sequenz
  // war ueber diesen Weg nie zu sehen.
  const { story } = compile(`# A {#a}

{erste|zweite}

~ zaehler = zaehler + 1

+ [Nochmal](#a)
`, { frontmatter: '---\ntitle: Probe\nstart: a\nstats:\n  zaehler: { name: Zaehler, start: 0 }\n---\n\n' });

  const s = new Story(story, { seed: 1 });
  assert.equal(s.setup, null, 'dieses Buch hat nichts zu fragen');
  assert.equal(s.current.text[0].text, 'erste');
  assert.equal(s.stats.find((x) => x.name === 'zaehler').value, 1, 'die Zuweisung lief einmal');

  assert.throws(() => s.begin(), /already set out/);
  assert.equal(s.current.text[0].text, 'erste', 'der abgelehnte Aufruf laesst die Seite in Ruhe');
  assert.equal(s.stats.find((x) => x.name === 'zaehler').value, 1);
});
