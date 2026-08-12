/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Facts, boundaries, events and places: SPEC.md sections 16 to 23.
 *
 * Every example in those sections appears here, plus the two checks section
 * 26 asks for by name: a fact computed twice from an identical state, and the
 * catch-up anchor as a table.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile, expectError, nodesOf } from './helpers.js';
import { compileSources } from '../src/compile.js';
import { Story } from '../src/runtime.js';

/** A book whose frontmatter is written per test, with a two-node story. */
function book(declarations, body = null, extraStats = '') {
  const frontmatter = `---\ntitle: Test\nstats:\n  time: { name: Time, start: 12 }\n  stamina: { start: 10 }\n${extraStats}${declarations}---\n`;
  const story = body ?? `
# Start {#start}

The gallery.

* [Wait](#second)
  ~ time += 9
+ [Stay](#start)

# Second {#second}

-> END
`;
  return compile(story, { frontmatter });
}

function play(declarations, body, extraStats) {
  const { story } = book(declarations, body, extraStats);
  return new Story(story, { seed: 7 });
}

// --- 17.1, declaration ------------------------------------------------------

const DAY = `facts:
  day_length: { source: fixed, value: 24 }
  elapsed:    { source: host,  range: [0, 604800], fallback: 0,
                name: Elapsed }
  is_night:   { source: derived,
                value: 'time % day_length >= 20 or time % day_length < 6' }
`;

test('the declaration of 17.1 compiles, and its facts reach the story JSON', () => {
  const { story } = book(DAY);
  const facts = story.config.facts;
  assert.equal(facts.day_length.source, 'fixed');
  assert.equal(facts.day_length.value, 24);
  assert.equal(facts.elapsed.source, 'host');
  assert.deepEqual(facts.elapsed.range, [0, 604800]);
  assert.equal(facts.is_night.source, 'derived');
});

test('a fact is read where a variable is read, in text and in a condition', () => {
  const s = play(DAY, `
# Start {#start}

{is_night: The gallery lies in the dark.|Daylight falls through the hatch.}

* [Wait](#second)
  ~ time += 9
* {is_night} [Turn in for the night](#second)

# Second {#second}

-> END
`);
  assert.equal(s.current.text[0].text, 'Daylight falls through the hatch.');
  assert.equal(s.facts.is_night, 0);
  assert.equal(s.current.choices.length, 1);   // the night option is not offered

  s.choose(0);                                  // ~ time += 9, then the boundary
  assert.equal(s.facts.is_night, 1);
});

test('a fact stores as an integer, and a condition as 1 or 0', () => {
  const s = play(DAY);
  assert.equal(s.facts.day_length, 24);
  assert.equal(s.facts.is_night, 0);
  assert.equal(typeof s.facts.is_night, 'number');
});

test('a fact name is not a place to write', () => {
  expectError('# A {#a}\n\n~ day_length = 3\n-> END\n', 'E164',
    { frontmatter: `---\ntitle: T\nstats:\n  gold: { start: 1 }\nfacts:\n  day_length: { source: fixed, value: 24 }\n---\n` });
});

// --- the error codes of 23 --------------------------------------------------

const bare = (facts) => `---\ntitle: T\nstats:\n  time: { start: 0 }\n${facts}---\n`;

test('E160: an unknown source, and a near-miss that is fine', () => {
  expectError('# A {#a}\n\n-> END\n', 'E160',
    { frontmatter: bare('facts:\n  x: { source: guessed, value: 1 }\n') });
  book('facts:\n  x: { source: fixed, value: 1 }\n');
});

test('E161: a source without the field it needs', () => {
  expectError('# A {#a}\n\n-> END\n', 'E161',
    { frontmatter: bare('facts:\n  x: { source: derived }\n') });
  expectError('# A {#a}\n\n-> END\n', 'E161',
    { frontmatter: bare('facts:\n  x: { source: host, range: [0, 5] }\n') });
  expectError('# A {#a}\n\n-> END\n', 'E161',
    { frontmatter: bare('facts:\n  x: { source: host, fallback: 0 }\n') });
});

test('E162: a fallback outside its own range', () => {
  expectError('# A {#a}\n\n-> END\n', 'E162',
    { frontmatter: bare('facts:\n  x: { source: host, range: [0, 5], fallback: 9 }\n') });
  book('facts:\n  x: { source: host, range: [0, 5], fallback: 5 }\n');
});

test('E163: declaration order is the dependency rule', () => {
  expectError('# A {#a}\n\n-> END\n', 'E163',
    { frontmatter: bare("facts:\n  a: { source: derived, value: 'b + 1' }\n  b: { source: fixed, value: 2 }\n") });
  expectError('# A {#a}\n\n-> END\n', 'E163',
    { frontmatter: bare("facts:\n  a: { source: derived, value: 'a + 1' }\n") });
  // The same two the other way round is exactly what 17.3 allows.
  book("facts:\n  b: { source: fixed, value: 2 }\n  a: { source: derived, value: 'b + 1' }\n");
});

test('E169: a fact that rolls, or calls something that changes state', () => {
  expectError('# A {#a}\n\n-> END\n', 'E169',
    { frontmatter: bare("facts:\n  x: { source: derived, value: 'roll(1,6)' }\n") });
  expectError('# fn bump()\n~ time = time + 1\n~ return time\n\n# A {#a}\n\n-> END\n', 'E169',
    { frontmatter: bare("facts:\n  x: { source: derived, value: 'bump()' }\n") });
  // Reading state is what a fact is for, so has() and visits() stay allowed.
  book("facts:\n  x: { source: derived, value: 'time + visits(\"start\")' }\n");
});

test('E170: a fact and a stat cannot share a name', () => {
  expectError('# A {#a}\n\n-> END\n', 'E170',
    { frontmatter: bare('facts:\n  time: { source: fixed, value: 1 }\n') });
  expectError('# A {#a}\n\n-> END\n', 'E170',
    { frontmatter: bare('facts:\n  in_combat: { source: fixed, value: 1 }\n') });
});

test('E167 and E168: what an event must and must not be', () => {
  expectError('# A {#a}\n\n-> END\n', 'E167',
    { frontmatter: bare("events:\n  e: { when: 'time > 1' }\n") });
  expectError('# A {#a}\n\n-> END\n', 'E168',
    { frontmatter: bare("events:\n  e: { once: true, counter: 'turns()', every: 5, do: 'time += 1' }\n") });
  book("events:\n  e: { once: true, when: 'time > 1', do: 'time += 1' }\n");
});

test('an event may not assign to a fact either', () => {
  expectError('# A {#a}\n\n-> END\n', 'E164',
    { frontmatter: bare("facts:\n  x: { source: fixed, value: 1 }\nevents:\n  e: { do: 'x = 2' }\n") });
});

// --- 21, places -------------------------------------------------------------

const PLACES = `places:
  - { id: base,  name: Base,  enter: start }
  - { id: ridge, name: Ridge, enter: second }
`;

test('place() folds to an index at compile time', () => {
  const { story } = book(`${PLACES}`, `
# Start {#start}

Here.

* [Set out for the ridge](#second)
  ~ time = place("ridge")

# Second {#second}

-> END
`);
  const choice = nodesOf(story).start.body.find((op) => op.op === 'choices').items[0];
  const { line, ...assign } = choice.body[0];
  assert.deepEqual(assign, { op: 'assign', target: 'time', value: { lit: 1 } });
});

test('E165 and E166: an unknown place, and a place entering nowhere', () => {
  expectError('# A {#a}\n\n~ time = place("nowhere")\n-> END\n', 'E165',
    { frontmatter: bare('places:\n  - { id: base, enter: a }\n') });
  expectError('# A {#a}\n\n-> END\n', 'E166',
    { frontmatter: bare('places:\n  - { id: base, enter: missing }\n') });
});

// --- 18, boundaries ---------------------------------------------------------

const TICKER = `events:
  tick: { do: 'stamina += 1' }
`;

test('one boundary per completed transition, divert or not', () => {
  const s = play(TICKER, `
# Start {#start}

Here.

* [On](#middle)
* [Round](#start)

# Middle {#middle}

-> second

# Second {#second}

-> END
`);
  assert.equal(s.state.vars.stamina, 11);   // begin() is one boundary
  s.choose(0);                              // through a divert chain: still one
  assert.equal(s.state.vars.stamina, 12);
});

test('the boundary falls after the choice and before the page that follows', () => {
  const s = play(DAY, `
# Start {#start}

Day.

* [Travel](#second)
  ~ time += 9

# Second {#second}

{is_night: Night has fallen.|Still day.}

-> END
`);
  s.choose(0);
  assert.equal(s.current.text[0].text, 'Night has fallen.');
});

test('an event sees the first pass, and the page sees the second', () => {
  const s = play(`facts:
  late: { source: derived, value: 'time >= 20' }
events:
  aging: { do: 'time += 10' }
`, `
# Start {#start}

{late: Late.|Early.}

* [Wait](#second)

# Second {#second}

{late: Late.|Early.}

-> END
`);
  // The event fired at begin(): the page is built from the second pass.
  assert.equal(s.current.text[0].text, 'Late.');
  assert.equal(s.facts.late, 1);
});

test('variables chain within a boundary, facts do not', () => {
  const s = play(`facts:
  doubled: { source: derived, value: 'time * 2' }
events:
  first:  { do: 'time += 5' }
  second: { do: 'stamina = doubled' }
`);
  // `first` moved time on, `second` still reads the fact computed before it.
  assert.equal(s.state.vars.time, 17);
  assert.equal(s.state.vars.stamina, 24);   // 12 * 2, not 17 * 2
  assert.equal(s.facts.doubled, 34);        // the second pass has caught up
});

test('a fact computed twice from an identical state gives the same value', () => {
  const s = play(DAY);
  s.choose(0);
  const first = s.facts;
  const save = s.save();
  const again = new Story(book(DAY).story, { seed: 7 });
  again.load(save);
  again.advance();
  assert.deepEqual(again.facts, { ...first, elapsed: 0 });
});

// --- 17.4, host facts -------------------------------------------------------

const HOST = `facts:
  elapsed: { source: host, range: [0, 3600], fallback: 0 }
  tick:    { source: derived, value: 'min(elapsed, 60)' }
events:
  clock: { do: 'time += tick' }
`;

test('without a host every host fact takes its fallback', () => {
  const s = play(HOST);
  assert.equal(s.facts.elapsed, 0);
  s.choose(0);
  assert.equal(s.state.vars.time, 21);   // only what the choice itself added
});

test('a host value is clamped into its range and consumed by its boundary', () => {
  const s = play(HOST);
  s.advance({ elapsed: 99999 });
  assert.equal(s.facts.elapsed, 3600);
  assert.equal(s.facts.tick, 60);
  assert.equal(s.state.vars.time, 72);

  // The next boundary does not spend the same seconds again (18.2).
  s.choose(0);
  assert.equal(s.facts.elapsed, 0);
  assert.equal(s.state.vars.time, 81);
});

test('advance repaints the page it was already showing', () => {
  const s = play(`facts:
  elapsed: { source: host, range: [0, 100], fallback: 0 }
`, `
# Start {#start}

Waited {elapsed} seconds.

* [On](#second)

# Second {#second}

-> END
`);
  assert.equal(s.current.text[0].text, 'Waited 0 seconds.');
  s.advance({ elapsed: 42 });
  assert.equal(s.current.text[0].text, 'Waited 42 seconds.');
});

// --- 19, events -------------------------------------------------------------

test('a once event fires once, and only when its condition holds', () => {
  const s = play(`events:
  relief: { once: true, when: 'turns() >= 2', do: 'remember("RELIEF")' }
`, `
# Start {#start}

Here.

+ [Round](#start)
`);
  assert.deepEqual(s.memory, []);
  s.choose(0);
  assert.deepEqual(s.memory, []);
  s.choose(0);
  assert.deepEqual(s.memory, ['relief']);
  assert.equal(s.state.events.fired.relief, true);
  s.choose(0);
  assert.deepEqual(s.memory, ['relief']);
});

test('the catch-up anchor, as a table', () => {
  // counter jumps by `jump`, every 10, max_catchup as given.
  const cases = [
    { jump: 0, every: 10, max: 1, firings: 0, anchor: 0 },
    { jump: 9, every: 10, max: 1, firings: 0, anchor: 0 },
    { jump: 10, every: 10, max: 1, firings: 1, anchor: 10 },
    { jump: 35, every: 10, max: 1, firings: 1, anchor: 30 },
    { jump: 35, every: 10, max: 3, firings: 3, anchor: 30 },
    { jump: 35, every: 10, max: 99, firings: 3, anchor: 30 },
    { jump: 100, every: 25, max: 2, firings: 2, anchor: 100 },
  ];

  for (const c of cases) {
    const s = play(`events:
  wound: { counter: 'time', every: ${c.every}, max_catchup: ${c.max}, do: 'stamina -= 1' }
`, `
# Start {#start}

Here.

+ [Round](#start)
`);
    // begin() only sets the anchor, wherever the counter happens to stand.
    assert.equal(s.state.events.last.wound, 12);
    s.state.vars.time = 12 + c.jump;
    s.advance();
    assert.equal(s.state.vars.stamina, 10 - c.firings,
      `${c.jump} steps of ${c.every}, at most ${c.max}`);
    assert.equal(s.state.events.last.wound, 12 + c.anchor,
      `anchor after a jump of ${c.jump}`);
  }
});

test('a bounded catch-up drops the rest instead of queueing it', () => {
  const s = play(`events:
  wound: { counter: 'time', every: 10, max_catchup: 1, do: 'stamina -= 1' }
`, `
# Start {#start}

Here.

+ [Round](#start)
`);
  s.state.vars.time = 112;
  s.advance();
  assert.equal(s.state.vars.stamina, 9);
  s.advance();
  assert.equal(s.state.vars.stamina, 9);   // not nine more rounds of damage
});

test('a false condition costs the firings but not the anchor', () => {
  const s = play(`events:
  wound: { counter: 'time', every: 10, max_catchup: 9, when: 'knows("HURT")', do: 'stamina -= 1' }
`, `
# Start {#start}

Here.

+ [Note it](#start)
  ~ remember("HURT")
`);
  s.state.vars.time = 52;
  s.advance();
  assert.equal(s.state.vars.stamina, 10);       // no wound yet
  assert.equal(s.state.events.last.wound, 52);  // but the time did pass

  s.choose(0);                                   // now the reader is wounded
  s.state.vars.time = 62;
  s.advance();
  assert.equal(s.state.vars.stamina, 9);         // one step, not five
});

test('an event can kill without the reader having done anything', () => {
  const s = play(`death:
  when: 'stamina <= 0'
  goto: dead
events:
  bleed: { do: 'stamina -= 4' }
`, `
# Start {#start}

Here.

+ [Round](#start)

# Dead {#dead}

Your adventure ends here.

-> END
`);
  assert.equal(s.state.vars.stamina, 6);
  s.choose(0);
  s.choose(0);
  assert.equal(s.current.node, 'dead');
  assert.equal(s.current.ended, true);
});

// --- 20, save and undo ------------------------------------------------------

test('a save carries host, facts and events; a checkpoint omits the facts', () => {
  const s = play(`${DAY}undo:\n  depth: 4\n`);
  s.choose(0);
  const save = s.save();
  assert.deepEqual(Object.keys(save.facts).sort(), ['day_length', 'elapsed', 'is_night']);
  assert.ok('host' in save);
  assert.deepEqual(save.events, { fired: {}, last: {} });
  assert.equal('facts' in save.undo[0], false);
  assert.ok('host' in save.undo[0]);
  assert.ok('events' in save.undo[0]);
});

test('undo takes back a firing, and recomputes the facts', () => {
  const s = play(`facts:
  late: { source: derived, value: 'time >= 21' }
undo:
  depth: 4
events:
  count: { once: true, when: 'time >= 21', do: 'remember("LATE")' }
`);
  assert.equal(s.facts.late, 0);
  s.choose(0);
  assert.equal(s.facts.late, 1);
  assert.deepEqual(s.memory, ['late']);

  assert.equal(s.undo(), true);
  assert.equal(s.facts.late, 0);
  assert.deepEqual(s.memory, []);
  assert.equal(s.state.events.fired.count, undefined);

  s.choose(0);                       // forward again reaches the same event
  assert.deepEqual(s.memory, ['late']);
});

// --- 11, the new lint codes -------------------------------------------------

/** A story that writes nothing, so L022 and L024 have something to find. */
const NO_WRITES = `
# Start {#start}

Here.

+ [Round](#start)
`;

function lintOf(declarations, body) {
  return book(declarations, body).warnings.messages.map((m) => m.code);
}

test('L021: an event scheduled past the end of the book', () => {
  assert.ok(lintOf("events:\n  relief: { once: true, when: 'turns() >= 300', do: 'stamina += 1' }\n")
    .includes('L021'));
  assert.equal(lintOf("events:\n  relief: { once: true, when: 'turns() >= 1', do: 'stamina += 1' }\n")
    .includes('L021'), false);
});

test('L022 and L027: an event nothing reads, and one without a bound', () => {
  const codes = lintOf("events:\n  drift: { counter: 'turns()', every: 1, do: 'stamina = 1' }\n", NO_WRITES);
  assert.ok(codes.includes('L027'));
  assert.ok(codes.includes('L022'));   // nothing reads stamina in this book

  const bounded = lintOf(
    "events:\n  drift: { counter: 'turns()', every: 1, max_catchup: 1, do: 'stamina = 1' }\n",
    NO_WRITES,
  );
  assert.equal(bounded.includes('L027'), false);
});

test('L023 and L024: a fact nobody reads, and one that can never move', () => {
  const codes = lintOf("facts:\n  frozen: { source: derived, value: 'time + 1' }\n", NO_WRITES);
  assert.ok(codes.includes('L023'));   // nothing reads `frozen`
  assert.ok(codes.includes('L024'));   // and nothing writes `time` either

  const moving = lintOf(
    "facts:\n  moving: { source: derived, value: 'time + 1' }\nevents:\n  e: { do: 'stamina = moving' }\n",
  );
  assert.equal(moving.includes('L023'), false);
});

test('L025: content that only a host can reach', () => {
  const codes = book(`facts:
  elapsed: { source: host, range: [0, 100], fallback: 0 }
  waited:  { source: derived, value: 'elapsed > 10' }
`, `
# Start {#start}

Here.

* {waited} [The door has opened](#opened)
* [Wait](#second)

# Opened {#opened}

-> END

# Second {#second}

-> END
`).warnings.messages;
  assert.ok(codes.some((m) => m.code === 'L025' && m.detail.includes('opened')));
});

test('L026: travelling to a place without setting the index', () => {
  const codes = book(PLACES, `
# Start {#start}

Here.

* [Set out for the ridge](#second)

# Second {#second}

-> END
`).warnings.messages.map((m) => m.code);
  assert.ok(codes.includes('L026'));

  const paired = book(PLACES, `
# Start {#start}

Here.

* [Set out for the ridge](#second)
  ~ time = place("ridge")

# Second {#second}

-> END
`).warnings.messages.map((m) => m.code);
  assert.equal(paired.includes('L026'), false);
});

// --- what only a fight and a translation reach ------------------------------

test('leaving a fight is a boundary, so the page after it is a fresh one', () => {
  const s = play(`combat:
  attack: "skill + roll(2,6)"
  damage: 1
enemies:
  rat: { name: Rat, skill: 1, stamina: 1 }
events:
  tick: { do: 'time += 1' }
`, `
# Start {#start}

A rat.

!combat rat
  win -> second

# Second {#second}

-> END
`, `  skill: { start: 12 }\n`);

  const atStart = s.state.vars.time;
  while (s.combat) s.attack();       // rounds themselves are not boundaries
  assert.equal(s.current.node, 'second');
  assert.equal(s.state.vars.time, atStart + 1, 'exactly one boundary on the way out');
});

test('a translated catalogue may print a fact of its own', () => {
  const declarations = {
    title: 'T',
    start: 'start.begin',
    languages: { default: 'de', available: ['de', 'en'] },
    stats: { time: { start: 12 } },
    facts: { is_night: { source: 'derived', value: 'time >= 20' } },
  };
  const { story } = compileSources([
    {
      lang: 'de',
      files: [{
        file: 'de/start.md',
        namespace: 'start',
        source: '# Anfang {#begin}\n\nEs ist Nacht: {is_night}.\n\n-> END\n',
      }],
    },
    {
      lang: 'en',
      files: [{
        file: 'en/start.md',
        namespace: 'start',
        source: '# Anfang {#begin}\n\nNight: {is_night}.\n\n-> END\n',
      }],
    },
  ], { entry: 'book.yaml', book: declarations });

  const english = new Story(story, { lang: 'en' });
  assert.equal(english.current.text[0].text, 'Night: 0.');
  english.state.vars.time = 30;
  english.advance();
  assert.equal(english.current.text[0].text, 'Night: 1.');
});
