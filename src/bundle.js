/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The native bundle of HOSTS 9.
 *
 * The web export of section 20 is one HTML file because a browser wants one.
 * A host in Swift or Kotlin wants the opposite: the story as data it can read
 * and the engine as a script it can hand to a JavaScript engine, each in its
 * own file, so that neither has to be cut out of the other at runtime.
 *
 * What lands in the bundle is the runtime, the host fassade and the story.
 * The view of section 20.2 does not: a native host draws its own.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { strip } from './export.js';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The two globals a bridge needs, and no more. A JSContext and an Android
 * WebView can both call a function by name with a string and take a string
 * back; neither can hold a JavaScript object across the boundary without a
 * wrapper per member. So the whole engine is two names.
 */
const BOOT = `
var storyWeaver = {
  host: null,
  /** @param {string} json story JSON per SPEC 17.1, as text */
  start: function (json, options) {
    this.host = new Host(JSON.parse(json), options ? JSON.parse(options) : {});
    return this.host.dispatch('{"cmd":"state"}');
  },
  /** @param {string} command one command per HOSTS 8, as text */
  send: function (command) {
    if (!this.host) return '{"ok":false,"error":"start has not been called"}';
    return this.host.dispatch(command);
  },
};
`;

const NOTICE = `/* The engine below is story-weaver, under the Mozilla Public License 2.0. A copy
 * of the source is this file; the licence is at https://mozilla.org/MPL/2.0/.
 * The story in story.json is the author's own work.
 */
`;

/**
 * @param {object} story story JSON per SPEC 17.1
 * @param {{minify?: boolean}} options
 * @returns {Record<string, string>} file name to contents
 */
export function bundleFiles(story, options = {}) {
  const shrink = options.minify ? strip : (s) => s;
  const engine = [read('runtime.js'), read('host.js'), BOOT]
    .map(module)
    .join('\n');

  return {
    'story.json': `${JSON.stringify(story)}\n`,
    'story-weaver.js': `${NOTICE}${shrink(engine)}\n`,
  };
}

function read(name) {
  return readFileSync(join(here, name), 'utf8');
}

/**
 * One module as a plain script: the engine runs in a JavaScript engine that
 * has no module loader and no file system, so the two files become one scope
 * with the keywords that tie them to a loader removed.
 */
function module(source) {
  return source
    .replace(/^import .*;\n/gm, '')
    .replace(/^export \{[^}]*\};?\n/gm, '')
    .replace(/^export /gm, '');
}
