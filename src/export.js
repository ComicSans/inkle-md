/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The single-file HTML export of SPEC.md section 12: story JSON, runtime and
 * view in one document, no framework, no network access at runtime.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const CSS = `
:root {
  --ink: #1b1a17; --paper: #f6f2e8; --edge: #8f8460; --line: #cfc6b0; --accent: #7a3b2e;
  --measure: 34rem; --serif: Georgia, 'Iowan Old Style', 'Times New Roman', serif;
}
@media (prefers-color-scheme: dark) {
  :root { --ink: #ede7db; --paper: #17161a; --edge: #6b6779; --line: #3a3742; --accent: #d99478; }
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 1.5rem; background: var(--paper); color: var(--ink);
  font: 1.05rem/1.6 var(--serif);
}
#app { max-width: 60rem; margin: 0 auto; display: grid; gap: 1.5rem;
  grid-template-columns: minmax(0, 1fr); }
@media (min-width: 55rem) { #app { grid-template-columns: minmax(0, 1fr) 16rem; }
  header, main { grid-column: 1; } .sheet { grid-column: 2; grid-row: 2; } }
header { display: flex; flex-wrap: wrap; gap: 1rem; align-items: baseline;
  justify-content: space-between; border-bottom: 1px solid var(--line); padding-bottom: .5rem; }
h1 { font-size: 1.3rem; margin: 0; }
h2 { font-size: 1rem; margin: 1rem 0 .3rem; letter-spacing: .04em; text-transform: uppercase; }
.prose { max-width: var(--measure); }
.prose p { margin: 0 0 1rem; }
/* An image never widens the measure and never overflows a narrow screen; the
   height follows so it is not stretched. */
.prose img { display: block; max-width: 100%; height: auto; margin: 0 0 1rem; }
.prose .letter { font-style: italic; border-left: 3px solid var(--line); padding-left: 1rem; }
.choices { list-style: none; padding: 0; margin: 1.5rem 0 0; display: grid; gap: .5rem;
  max-width: var(--measure); }
button, select {
  font: inherit; color: inherit; background: transparent; text-align: left;
  border: 1px solid var(--edge); border-radius: .3rem; padding: .6rem .8rem; cursor: pointer;
  width: 100%;
}
button:hover:not(:disabled), select:hover { border-color: var(--accent); }
button:focus-visible, select:focus-visible {
  outline: 3px solid var(--accent); outline-offset: 2px;
}
/* The prose takes focus after every choice so that a screen reader starts at
   the new text rather than at the top. Keyboard users see where they are; a
   mouse click leaves no ring behind. */
.prose:focus-visible { outline: 2px dashed var(--accent); outline-offset: .4rem; }
.prose:focus:not(:focus-visible) { outline: none; }
kbd { font: inherit; font-size: .8em; opacity: .7; margin-right: .5em; }
button:disabled { opacity: .5; cursor: default; }
.toolbar { display: flex; gap: .5rem; align-items: center; }
.toolbar button, .toolbar select, button.small { width: auto; padding: .3rem .6rem; font-size: .85rem; }
/* Fingers need more room than a mouse pointer. */
@media (pointer: coarse) {
  .toolbar button, .toolbar select, button.small { min-height: 44px; padding: .5rem .8rem; }
}
.sheet { font-size: .9rem; border: 1px solid var(--line); border-radius: .4rem; padding: .8rem 1rem; }
/* Gepäck und Gemerktes klappen auf; die Überschrift bleibt die Zeile, die
   man anklickt. */
.fold summary { cursor: pointer; }
.fold summary::-webkit-details-marker { color: var(--edge); }
.fold summary h2 { display: inline-block; margin: .8rem 0 .3rem; }
.stats { display: grid; grid-template-columns: auto 1fr; gap: .2rem .8rem; margin: 0; }
.stats dt { text-transform: capitalize; }
.stats dd { margin: 0; display: flex; align-items: center; gap: .5rem; }
.bar { flex: 1; height: .5rem; border: 1px solid var(--edge); border-radius: .3rem;
  background: linear-gradient(to right, var(--accent) calc(var(--fill) * 100%), transparent 0); }
.items { list-style: none; padding: 0; margin: 0; display: grid; gap: .4rem; }
.items li { display: flex; gap: .4rem; align-items: center; justify-content: space-between; }
.combat { border: 1px solid var(--accent); border-radius: .4rem; padding: .8rem 1rem; margin-top: 1.5rem;
  max-width: var(--measure); }
.combat h2 { margin-top: 0; }
.combat .choices { display: flex; flex-wrap: wrap; margin-top: 1rem; }
.combat .choices button { width: auto; }
.setup fieldset { border: 1px solid var(--edge); border-radius: .4rem; margin: 0 0 1rem; }
.setup .option { display: flex; gap: .5rem; align-items: center; }
.setup input { width: auto; }
.setup button { width: auto; }
.end { font-style: italic; }
.hint { font-size: .9rem; opacity: .8; margin: 0 0 .5rem; }
.blow:empty { display: none; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;

/**
 * @param {object} story story JSON per SPEC 9.1
 * @param {{minify?: boolean}} options `minify` drops comments and indentation
 *        from the runtime, the view and the stylesheet (SPEC 12)
 * @returns {string} a complete HTML document
 */
export function exportHtml(story, options = {}) {
  const shrink = options.minify ? strip : (s) => s;
  const runtime = shrink(read('runtime.js').replace(/^export /gm, ''));
  const view = shrink(read('view.js').replace(/^export /gm, ''));
  const css = shrink(CSS);
  const title = pick(story.meta.title) ?? 'story-weaver';

  return `<!doctype html>
<html lang="${story.meta.default}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
<div id="app"></div>
<script type="application/json" id="story">${escapeJson(JSON.stringify(story))}</script>
<script>
/* The runtime and view below are story-weaver, under the Mozilla Public License
 * 2.0. A copy of the source is this file; the licence is at
 * https://mozilla.org/MPL/2.0/. The story itself is the author's own work. */
${runtime}
${view}
mount(JSON.parse(document.getElementById('story').textContent), document.getElementById('app'));
</script>
</body>
</html>
`;
}

function read(name) {
  return readFileSync(join(here, name), 'utf8');
}

/**
 * The whole minifier of SPEC 12: comment lines, blank lines and indentation
 * go, everything else stays where it is. Line breaks survive, so no semicolon
 * has to be guessed and no name is rewritten; that would need a JavaScript
 * parser, and the kilobytes it would save do not pay for one. The same pass
 * serves CSS, whose comments are the block form as well.
 */
export function strip(source) {
  const out = [];
  let inBlock = false;

  for (const raw of source.split('\n')) {
    let line = raw.trim();

    if (inBlock) {
      const end = line.indexOf('*/');
      if (end < 0) continue;
      inBlock = false;
      line = line.slice(end + 2).trim();
    }

    while (line.startsWith('/*')) {
      const end = line.indexOf('*/', 2);
      if (end < 0) { inBlock = true; line = ''; break; }
      line = line.slice(end + 2).trim();
    }

    if (line === '' || line.startsWith('//')) continue;
    out.push(line);
  }

  return out.join('\n');
}

function pick(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return Object.values(value)[0];
}

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** Only "</" can end the script block early; nothing else needs escaping. */
function escapeJson(json) {
  return json.replace(/<\//g, '<\\/');
}
