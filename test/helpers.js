/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import assert from 'node:assert/strict';
import { compileSources } from '../src/compile.js';

const MINIMAL_FRONTMATTER = `---
title: Test
stats:
  gold: { start: 1 }
---
`;

/** Compiles a story body with a minimal frontmatter in front of it. */
export function compile(body, { frontmatter = MINIMAL_FRONTMATTER } = {}) {
  return compileSources([{ file: 't.md', source: frontmatter + body, namespace: null }], { entry: 't.md' });
}

/** Asserts that compiling raises exactly this error code. */
export function expectError(body, code, options) {
  try {
    compile(body, options);
  } catch (error) {
    assert.equal(error.code, code, `expected ${code}, got ${error.code}: ${error.message}`);
    return error;
  }
  assert.fail(`expected ${code}, but the source compiled`);
}

/** The nodes of the default language. */
export function nodesOf(story) {
  return story.nodes[story.meta.default];
}

/** The ops of the first node. */
export function firstBody(body, options) {
  const { story } = compile(body, options);
  return Object.values(nodesOf(story))[0].body;
}
