/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/** Startet den Server, schickt Anfragen, sammelt Antworten nach id ein. */
function talk(requests) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(root, 'src', 'cli.js'), 'mcp'], { cwd: root });
    const byId = new Map();
    let buffer = '';
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        if (line.trim() === '') continue;
        const message = JSON.parse(line);
        byId.set(message.id, message);
      }
    });
    child.on('error', reject);
    child.on('close', () => resolve(byId));
    for (const request of requests) child.stdin.write(`${JSON.stringify(request)}\n`);
    child.stdin.end();
  });
}

test('the MCP server lists its tools and lints a book', async () => {
  const entry = join(root, 'examples', 'house', 'book.yaml');
  const byId = await talk([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'lint', arguments: { entry, strict: true } } },
    { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'play', arguments: { entry, seed: 42, script: ['1'] } } },
    { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'simulate', arguments: { entry, runs: 30 } } },
    { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'lint', arguments: { entry: 'nowhere.yaml' } } },
    { jsonrpc: '2.0', id: 7, method: 'no/such/method' },
  ]);

  assert.equal(byId.get(1).result.serverInfo.name, 'inkle-md');
  assert.deepEqual(byId.get(2).result.tools.map((t) => t.name), ['lint', 'play', 'simulate']);

  const lint = JSON.parse(byId.get(3).result.content[0].text);
  assert.equal(lint.failed, false);
  assert.ok(lint.report.nodes > 0);

  const played = JSON.parse(byId.get(4).result.content[0].text);
  assert.ok(played.node.length > 0);
  assert.ok(Array.isArray(played.choices));

  const report = JSON.parse(byId.get(5).result.content[0].text);
  assert.equal(report.runs, 30);
  assert.equal(report.deadEnds.length, 0);

  assert.equal(byId.get(6).result.isError, true);
  assert.equal(byId.get(7).error.code, -32601);
});
