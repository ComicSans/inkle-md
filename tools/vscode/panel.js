/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The panel, inside the webview. It shows one of two things, and never both
 * at once, because they are not the same kind of knowledge:
 *
 * - Struktur: what the compiler holds about the node under the cursor - the
 *   title, the ways on, its warnings. No text is evaluated, so this is
 *   available for every node, including the ones no playthrough reaches.
 * - Spielen: the book itself, from a node the author picked, mounted with the
 *   project's own view. What is seen here is what a reader sees.
 *
 * Written as a plain script with no imports: the extension inlines it after
 * the runtime and the view, exactly as the HTML export does.
 */

/* global Story, mount, acquireVsCodeApi */

(function panel() {
  const vscode = acquireVsCodeApi();
  const chrome = document.getElementById('chrome');
  const content = document.getElementById('content');

  let book = null;        // {story, lang, host, title}
  let node = null;        // the outline of the node under the cursor
  let banner = null;      // the compile error, while there is one
  let playing = null;     // the node the game was started from
  let stale = false;      // the book changed while a game was running
  let game = null;        // the running game, so it can be taken down again

  const el = (tag, props = {}, children = []) => {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (name === 'class') { if (value) element.className = value; }
      else if (name === 'text') element.textContent = value;
      else if (name.startsWith('on')) element.addEventListener(name.slice(2), value);
      else if (value !== null && value !== undefined) element.setAttribute(name, value);
    }
    for (const child of [].concat(children)) if (child) element.append(child);
    return element;
  };

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'book') {
      // A game already running is not thrown away under the author's hands;
      // it says so and offers the restart.
      if (playing && book) stale = true;
      book = message;
      if (!playing) draw();
      else drawChrome();
      return;
    }
    if (message.type === 'node') { node = message.outline; if (!playing) draw(); else drawChrome(); return; }
    if (message.type === 'banner') { banner = message.text; drawChrome(); return; }
    if (message.type === 'play') { start(message.node); }
  });

  // --- chrome -------------------------------------------------------------

  function drawChrome() {
    chrome.textContent = '';

    const bar = el('div', { class: 'bar' });
    bar.append(el('span', { class: 'book', text: book?.title ?? 'Story Weaver' }));

    if (playing) {
      bar.append(el('button', {
        class: 'small', text: 'Struktur',
        onclick: () => { game?.unmount(); game = null; playing = null; stale = false; draw(); },
      }));
      bar.append(el('button', {
        class: 'small', text: 'Neu ab hier', onclick: () => start(playing),
      }));
    } else if (node) {
      bar.append(el('button', {
        class: 'small', text: 'Ab hier spielen', onclick: () => start(node.id),
      }));
      if (book) {
        bar.append(el('button', {
          class: 'small', text: 'Von vorn', onclick: () => start(book.story.meta.start),
        }));
      }
    }
    chrome.append(bar);

    if (banner) {
      chrome.append(el('p', {
        class: 'banner', role: 'status',
        text: `${banner}\n(gezeigt wird der letzte Stand, der übersetzt hat)`,
      }));
    }
    if (stale) {
      chrome.append(el('p', { class: 'note', role: 'status' }, [
        el('span', { text: 'Das Buch hat sich geändert. ' }),
        el('button', { class: 'small', text: 'Probelauf neu starten', onclick: () => start(playing) }),
      ]));
    }
    if (playing && book?.host) {
      chrome.append(el('p', {
        class: 'note',
        text: `Host-Werte: ${Object.entries(book.host).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      }));
    }
  }

  // --- the two views ------------------------------------------------------

  function draw() {
    drawChrome();
    content.textContent = '';
    if (!node) {
      content.append(el('p', { class: 'note', text: book
        ? 'Der Cursor steht in keinem Knoten. Die Frontmatter ist keiner.'
        : 'Noch kein Buch übersetzt.' }));
      return;
    }

    content.append(el('h2', { class: 'title', text: node.title }));
    content.append(el('p', { class: 'id' }, [
      el('code', { text: `#${node.id}` }),
      el('span', { class: 'where', text: ` ${shortFile(node.file)}:${node.line}` }),
    ]));

    if (node.messages.length > 0) {
      const list = el('ul', { class: 'messages' });
      for (const message of node.messages) {
        list.append(el('li', { class: message.level }, [
          el('code', { text: message.code }),
          el('span', { text: ` ${message.detail}` }),
        ]));
      }
      content.append(list);
    }

    content.append(el('h3', { text: node.ways.length === 1 ? 'Ein Weg weiter' : `${node.ways.length} Wege weiter` }));
    if (node.ways.length === 0) {
      content.append(el('p', { class: 'note', text: 'Keiner. Das ist ein Ende oder eine Sackgasse.' }));
      return;
    }

    const ways = el('ul', { class: 'ways' });
    for (const way of node.ways) {
      const label = way.label || (way.kind === 'divert' ? 'weiter' : way.kind);
      const line = el('li', { class: way.kind }, [
        el('span', { class: 'label', text: label }),
      ]);
      if (way.conditional) line.append(el('span', { class: 'tag', text: 'bedingt' }));
      if (way.sticky) line.append(el('span', { class: 'tag', text: 'bleibt' }));
      if (way.target === 'END') {
        line.append(el('span', { class: 'target end', text: 'Ende' }));
      } else if (way.target && way.reachable) {
        line.append(el('button', {
          class: 'link', text: `→ ${way.target}`,
          onclick: () => vscode.postMessage({ type: 'reveal', node: way.target }),
        }));
      } else if (way.target) {
        line.append(el('span', { class: 'target missing', text: `→ ${way.target} (gibt es nicht)` }));
      } else {
        line.append(el('span', { class: 'target', text: 'fällt durch' }));
      }
      ways.append(line);
    }
    content.append(ways);
  }

  /**
   * Plays the book from one node. The start is moved rather than the story
   * jumped, so the opening choices of SPEC 7.2 still happen: a hero without
   * their belongings would be a different book, and every value would read
   * empty.
   */
  function start(nodeId) {
    if (!book) return;
    playing = nodeId;
    stale = false;
    drawChrome();
    game?.unmount();
    game = null;
    content.textContent = '';

    const json = JSON.parse(JSON.stringify(book.story));
    json.meta.start = nodeId;
    const root = el('div', { id: 'game' });
    content.append(root);

    game = mount(json, root, {
      lang: book.lang,
      // The panel is not the document: it has its own heading above the game,
      // and a preview never writes to storage - it starts where the author is
      // looking, not where they last stopped reading.
      setDocumentLang: false,
      storage: false,
      heading: 'h2',
      host: book.host ?? undefined,
      // The source follows the game, so the author reads the page and sees
      // the paragraph they wrote. It never takes the focus: they are reading
      // here, not there.
      onRender: (where) => {
        if (where.node) vscode.postMessage({ type: 'reveal', node: where.node, focus: false });
      },
    });
  }

  function shortFile(path) {
    return path ? path.split('/').slice(-2).join('/') : '';
  }

  vscode.postMessage({ type: 'ready' });
}());
