/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The view layer of SPEC.md section 12: everything a reader sees that is not
 * the book's own words. Button labels, panel names and presentation live
 * here, never in the story (SPEC 6).
 *
 * Written as a plain script, no imports: the exporter inlines it verbatim.
 */

/* global Story */

const UI = {
  en: {
    attack: 'Attack', flee: 'Flee', luck: 'Test your luck',
    belongings: 'Belongings', use: 'Use', equip: 'Equip', equipped: 'equipped',
    back: 'Go back', restart: 'Start again', save: 'Save', saved: 'Saved', memory: 'Noted',
    resume: 'Continue', language: 'Language', begin: 'Begin', theEnd: 'The end',
    character: 'Character', pick: (n) => `Choose ${n}`, uses: (n) => `${n} left`,
    pickFirst: 'Make your choice to begin.',
    round: (n) => `Round ${n}`, choices: 'What do you do?',
  },
  de: {
    attack: 'Angreifen', flee: 'Fliehen', luck: 'Glück versuchen',
    belongings: 'Gepäck', use: 'Benutzen', equip: 'Ausrüsten', equipped: 'ausgerüstet',
    back: 'Zurück', restart: 'Neu beginnen', save: 'Speichern', saved: 'Gespeichert', memory: 'Gemerkt',
    resume: 'Weiterspielen', language: 'Sprache', begin: 'Losgehen', theEnd: 'Ende',
    character: 'Held', pick: (n) => `Wähle ${n}`, uses: (n) => `noch ${n}`,
    pickFirst: 'Triff deine Wahl, dann kann es losgehen.',
    round: (n) => `Runde ${n}`, choices: 'Was tust du?',
  },
};

/**
 * @param {object} json story JSON per SPEC 9.1
 * @param {HTMLElement} root where the game is drawn
 * @param {object} [options] only for a host that is not the export
 * @param {boolean} [options.setDocumentLang] write the book's language to
 *   <html lang>. True for the export, whose document is the game. A page that
 *   embeds the game has its own language and its own scripts reading it.
 * @param {(where: {node: string, lang: string}) => void} [options.onRender]
 *   called after every redraw with the node the reader is on.
 * @param {string} [options.heading] tag for the book's title, 'h1' by default.
 *   A page that already has a heading of its own passes the level below it, so
 *   the document keeps one outline instead of two.
 * @param {string} [options.lang] the language to open in, if the book has it.
 *   The export asks the browser, which is the best it can do. A page that is
 *   itself written in one language knows better, and an English page opening a
 *   German book because of a browser setting is nobody's idea of correct.
 */
function mount(json, root, options = {}) {
  const setDocumentLang = options.setDocumentLang !== false;
  const headingTag = options.heading ?? 'h1';
  const key = `inkle-md:${json.meta.start}`;
  const wanted = json.meta.languages.includes(options.lang)
    ? options.lang
    : preferredLanguage(json);
  let story = new Story(json, { lang: wanted });
  let ui = UI[story.lang] ?? UI.en;

  const el = (tag, props = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (name === 'class') { if (value) node.className = value; }
      else if (name === 'text') node.textContent = value;
      else if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
      else if (value !== null && value !== undefined) node.setAttribute(name, value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  };

  function save() {
    try { localStorage.setItem(key, JSON.stringify(story.save())); } catch { /* private mode */ }
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // --- panels ------------------------------------------------------------

  function characterPanel() {
    const stats = el('dl', { class: 'stats' });
    for (const stat of story.stats) {
      stats.append(el('dt', { text: stat.label }));
      const value = stat.max ? `${stat.value} / ${stat.max}` : String(stat.value);
      const dd = el('dd', { class: 'stat' });
      if (stat.max) {
        dd.append(el('span', {
          class: 'bar', 'aria-hidden': 'true',
          style: `--fill:${Math.max(0, Math.min(1, stat.value / stat.max))}`,
        }));
      }
      dd.append(el('span', { class: 'value', text: value }));
      stats.append(dd);
    }

    const items = el('ul', { class: 'items' });
    for (const item of story.inventory) {
      const label = item.uses > 1 ? `${item.name} (${ui.uses(item.uses)})` : item.name;
      const line = el('li', {}, [el('span', { text: label + (item.equipped ? ` - ${ui.equipped}` : '') })]);
      if (item.usable) {
        line.append(el('button', {
          class: 'small', 'aria-label': `${ui.use}: ${item.name}`,
          text: ui.use, onclick: () => { story.useItem(item.id); render(); announce(`${ui.use}: ${item.name}`); },
        }));
      }
      if ((item.kind === 'weapon' || item.kind === 'armour') && !item.equipped) {
        line.append(el('button', {
          class: 'small', 'aria-label': `${ui.equip}: ${item.name}`,
          text: ui.equip, onclick: () => { story.equipItem(item.id); render(); },
        }));
      }
      items.append(line);
    }

    const words = story.memory;
    const memory = el('ul', { class: 'items memory' },
      words.map((word) => el('li', { text: word.toUpperCase() })));

    return el('aside', { class: 'sheet', 'aria-label': ui.character }, [
      stats,
      story.inventory.length > 0 ? el('h2', { text: ui.belongings }) : null,
      story.inventory.length > 0 ? items : null,
      words.length > 0 ? el('h2', { text: ui.memory }) : null,
      words.length > 0 ? memory : null,
    ]);
  }

  function setupScreen() {
    const picks = story.setup.map(() => new Set());
    const form = el('form', {
      class: 'setup',
      onsubmit: (event) => {
        event.preventDefault();
        story.begin(picks.map((set) => [...set]));
        save();
        render();
      },
    });

    story.setup.forEach((block, i) => {
      const group = el('fieldset', {}, [
        el('legend', { text: `${text(block.title)} - ${ui.pick(block.pick)}` }),
      ]);
      for (const option of block.from) {
        const id = `setup-${i}-${option.item ?? option.remember}`;
        const input = el('input', {
          type: block.pick === 1 ? 'radio' : 'checkbox', name: `setup-${i}`, id,
          onchange: (event) => {
            const value = option.item ?? option.remember;
            if (block.pick === 1) picks[i].clear();
            if (event.target.checked) picks[i].add(value); else picks[i].delete(value);
            const ready = picks.every((set, j) => set.size === story.setup[j].pick);
            const submit = form.querySelector('button[type=submit]');
            submit.setAttribute('aria-disabled', String(!ready));
            submit.disabled = !ready;
            form.querySelector('.hint').textContent = ready ? '' : ui.pickFirst;
          },
        });
        group.append(el('div', { class: 'option' }, [input, el('label', { for: id, text: text(option.label) })]));
      }
      form.append(group);
    });

    const hint = el('p', { class: 'hint', role: 'status', text: ui.pickFirst });
    form.append(hint, el('button', {
      type: 'submit', text: ui.begin, disabled: 'disabled',
      'aria-disabled': 'true', 'aria-describedby': 'setup-hint',
    }));
    hint.id = 'setup-hint';
    return form;
  }

  function combatPanel() {
    const fight = story.combat;
    const enemy = fight.enemy;
    const panel = el('section', { class: 'combat', 'aria-label': fight.name }, [
      el('h2', { text: fight.name }),
      el('p', { class: 'enemy', text: `${enemy.stamina} / ${story.config.enemies[enemy.id].stamina}` }),
    ]);

    const last = fight.log[fight.log.length - 1];
    panel.append(el('p', {
      class: 'blow', role: 'status', 'aria-live': 'polite',
      text: last ? `${ui.round(last.round)}: ${last.text}` : '',
    }));

    const actions = el('div', { class: 'choices' });
    if (fight.luck) {
      actions.append(el('button', { text: ui.luck, onclick: () => { story.testLuck(); render(); } }));
    }
    actions.append(el('button', { text: ui.attack, onclick: () => { story.attack(); render(); } }));
    if (fight.canFlee) {
      actions.append(el('button', { text: ui.flee, onclick: () => { story.flee(); save(); render(); } }));
    }
    panel.append(actions);
    return panel;
  }

  // --- rendering ---------------------------------------------------------

  function render() {
    root.textContent = '';
    ui = UI[story.lang] ?? UI.en;
    if (setDocumentLang) document.documentElement.lang = story.lang;
    // The game speaks the book's language even where the page around it does
    // not, so a screen reader pronounces it correctly either way.
    root.lang = story.lang;

    const header = el('header', {}, [
      el(headingTag, { text: text(json.meta.title) ?? '' }),
      toolbar(),
    ]);
    root.append(header);

    if (story.setup) {
      root.append(el('main', {}, [setupScreen()]));
      options.onRender?.({ node: null, lang: story.lang });
      return;
    }

    const page = el('main', { class: 'page' });
    const prose = el('div', { class: 'prose', 'aria-live': 'polite', tabindex: '-1' });
    for (const paragraph of story.current.text) {
      if (paragraph.text.trim() === '') continue;
      prose.append(el('p', { class: paragraph.class ?? null, text: paragraph.text }));
    }
    page.append(prose);

    if (story.combat) {
      page.append(combatPanel());
    } else if (story.current.ended) {
      page.append(el('p', { class: 'end', text: ui.theEnd }));
      page.append(el('div', { class: 'choices' }, [
        el('button', { text: ui.restart, onclick: restart }),
      ]));
    } else {
      const choices = el('ul', { class: 'choices', 'aria-label': ui.choices });
      story.current.choices.forEach((choice, index) => {
        const button = el('button', {
          // The number is decoration for the eye; the accessible name stays
          // the choice itself.
          'aria-label': choice.label,
          'data-key': index < 9 ? String(index + 1) : null,
          'aria-keyshortcuts': index < 9 ? String(index + 1) : null,
          onclick: () => { story.choose(choice.index); save(); render(); },
        });
        if (index < 9) button.append(el('kbd', { text: String(index + 1), 'aria-hidden': 'true' }));
        button.append(document.createTextNode(choice.label));
        choices.append(el('li', {}, [button]));
      });
      page.append(choices);
    }

    root.append(page, characterPanel());
    prose.focus();
    options.onRender?.({ node: story.current.node, lang: story.lang });
  }

  function toolbar() {
    const bar = el('nav', { class: 'toolbar' });
    if (story.canUndo) {
      bar.append(el('button', {
        class: 'small', text: ui.back,
        onclick: () => { story.undo(); save(); render(); },
      }));
    }
    if (json.meta.languages.length > 1) {
      const select = el('select', {
        'aria-label': ui.language,
        onchange: (event) => { story.setLanguage(event.target.value); save(); render(); },
      });
      for (const lang of json.meta.languages) {
        const option = el('option', { value: lang, text: lang.toUpperCase() });
        if (lang === story.lang) option.selected = true;
        select.append(option);
      }
      bar.append(select);
    }
    bar.append(el('button', { class: 'small', text: ui.restart, onclick: restart }));
    return bar;
  }

  function restart() {
    try { localStorage.removeItem(key); } catch { /* private mode */ }
    story = new Story(json, { lang: story.lang });
    if (!story.setup) save();
    render();
  }

  function announce(message) {
    const live = el('p', { class: 'sr-only', role: 'status', text: message });
    root.append(live);
    setTimeout(() => live.remove(), 2000);
  }

  function text(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value[story.lang] ?? Object.values(value)[0];
  }

  function preferredLanguage(book) {
    const wanted = (navigator.language ?? '').slice(0, 2);
    return book.meta.languages.includes(wanted) ? wanted : book.meta.default;
  }

  // Number keys pick a choice, as a gamebook always let you.
  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    // In the export the game is the whole document, so anything goes. Embedded
    // in a page it is one region among several: a key only counts while the
    // reader is inside the game or nowhere in particular, and never while they
    // are typing.
    const target = event.target;
    const elsewhere = target instanceof Element
      && target !== document.body && target !== document.documentElement
      && !root.contains(target);
    if (elsewhere) return;
    if (target?.isContentEditable || /^(input|textarea|select)$/i.test(target?.tagName ?? '')) return;
    if (/^[1-9]$/.test(event.key)) {
      const button = root.querySelector(`button[data-key="${event.key}"]`);
      if (button) { button.click(); event.preventDefault(); }
    }
  });

  const saved = loadSaved();
  if (saved) {
    try { story.load(saved); } catch {
      // An old save from another book or version: it would resume garbage,
      // so it is dropped rather than retried on every reload.
      try { localStorage.removeItem(key); } catch { /* private mode */ }
    }
  }
  render();
}
