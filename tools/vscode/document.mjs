/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The page the panel lives in. The runtime, the view and the stylesheet are
 * the project's own, so what is played in the panel is what a reader plays;
 * only the chrome around it belongs to the editor.
 *
 * Built here rather than in `extension.js` so that it can be assembled - and
 * looked at in a browser - without VS Code.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { sourceDir } from './book.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * @param {{nonce: string, cspSource?: string|null, src?: string}} options
 *        `cspSource` is what the webview allows images from; without it no
 *        policy is written, which is what a plain browser preview wants.
 *        `src` is where the project's own sources are, defaulting to wherever
 *        this copy of the extension finds them.
 * @returns {Promise<string>} a complete HTML document
 */
export async function panelHtml({ nonce, cspSource = null, src = null }) {
  const SRC = src ?? sourceDir(here);
  const { CSS } = await import(pathToFileURL(join(SRC, 'export.js')).href);
  const script = (path) => readFileSync(path, 'utf8').replace(/^export /gm, '');
  const policy = cspSource
    ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">`
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
${policy}
<style>${CSS}
${readFileSync(join(here, 'panel.css'), 'utf8')}</style>
</head>
<body>
<div id="chrome"></div>
<div id="content"></div>
<script nonce="${nonce}">
/* The runtime and the view below are story-weaver, under the Mozilla Public
 * License 2.0, https://mozilla.org/MPL/2.0/. */
${script(join(SRC, 'runtime.js'))}
${script(join(SRC, 'view.js'))}
${readFileSync(join(here, 'panel.js'), 'utf8')}
</script>
</body>
</html>
`;
}
