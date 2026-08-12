/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Ein MCP-Server über stdio (JSON-RPC 2.0, eine Nachricht pro Zeile), der
 * die drei Werkzeuge anbietet, die ein Agent zum Prüfen eines Buchs braucht:
 * lint, play und simulate. Kein SDK, keine Abhängigkeit; das Protokoll ist
 * klein genug, um es hinzuschreiben.
 */

import { createInterface } from 'node:readline';

import { compileFile } from './compile.js';
import { play, simulate } from './play.js';
import { CompileError } from './errors.js';

const PROTOCOL_VERSION = '2025-06-18';

const TOOLS = [
  {
    name: 'lint',
    description:
      'Kompiliert ein Buch (book.yaml oder .md) und liefert Meldungen und '
      + 'Erreichbarkeitsbericht als JSON. strict behandelt Warnungen als Fehler.',
    inputSchema: {
      type: 'object',
      properties: {
        entry: { type: 'string', description: 'Pfad zu book.yaml oder einer .md-Datei' },
        strict: { type: 'boolean' },
      },
      required: ['entry'],
    },
  },
  {
    name: 'play',
    description:
      'Spielt ein Buch mit Seed und Zugfolge und liefert den erreichten '
      + 'Zustand: Knoten, Text, Auswahlen, Werte, Inventar und das Zugprotokoll. '
      + 'Züge sind Auswahlnummern ("1") oder "a" für eine Kampfrunde.',
    inputSchema: {
      type: 'object',
      properties: {
        entry: { type: 'string', description: 'Pfad zu book.yaml oder einer .md-Datei' },
        seed: { type: 'number' },
        script: { type: 'array', items: { type: 'string' }, description: 'Zugfolge, z. B. ["1","1","a"]' },
        picks: { type: 'array', items: { type: 'string' }, description: 'Eine Auswahl je setup-Block, z. B. ["dagger"]' },
        host: {
          type: 'object',
          description: 'Werte für die host-Fakten, die an jeder Grenze ankommen, z. B. {"elapsed": 60}',
        },
        lang: { type: 'string' },
      },
      required: ['entry'],
    },
  },
  {
    name: 'simulate',
    description:
      'Spielt viele Partien mit einem neugierigen Zufallsleser und meldet '
      + 'Enden, Sackgassen, abgebrochene Läufe und die mittlere Länge.',
    inputSchema: {
      type: 'object',
      properties: {
        entry: { type: 'string', description: 'Pfad zu book.yaml oder einer .md-Datei' },
        runs: { type: 'number' },
        host: {
          type: 'object',
          description: 'Wie Zähler und elapsed je Zug vorrücken, z. B. {"elapsed": 60}',
        },
      },
      required: ['entry'],
    },
  },
];

function compileOrThrow(entry) {
  try {
    return compileFile(entry);
  } catch (error) {
    if (error instanceof CompileError) {
      const lines = (error.all ?? [error]).map((e) => e.message).join('\n');
      throw new Error(lines);
    }
    throw error;
  }
}

async function callTool(name, args = {}) {
  if (name === 'lint') {
    const { warnings } = compileOrThrow(args.entry);
    const failed = Boolean(args.strict) && warnings.messages.some((m) => m.level === 'warning');
    return { messages: warnings.messages, report: warnings.report, failed };
  }
  if (name === 'play') {
    const { story } = compileOrThrow(args.entry);
    return play(story, {
      seed: args.seed,
      lang: args.lang,
      picks: args.picks,
      script: args.script ?? [],
      host: args.host ?? null,
      quiet: true,
    });
  }
  if (name === 'simulate') {
    const { story } = compileOrThrow(args.entry);
    return simulate(story, { runs: args.runs ?? 300, host: args.host ?? null });
  }
  throw new Error(`unbekanntes Werkzeug "${name}"`);
}

async function handle(message) {
  const { id, method, params } = message;
  if (id === undefined) return null; // Notification: nichts zu antworten.

  if (method === 'initialize') {
    return {
      protocolVersion: params?.protocolVersion ?? PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: 'inkle-md', version: '0.1.0' },
    };
  }
  if (method === 'ping') return {};
  if (method === 'tools/list') return { tools: TOOLS };
  if (method === 'tools/call') {
    try {
      const result = await callTool(params?.name, params?.arguments);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: String(error.message ?? error) }], isError: true };
    }
  }
  const error = new Error(`method not found: ${method}`);
  error.code = -32601;
  throw error;
}

/**
 * Liest Zeilen von `input`, schreibt Antworten nach `output` und löst das
 * zurückgegebene Promise, wenn die Eingabe endet.
 */
export function serveMcp({ input = process.stdin, output = process.stdout } = {}) {
  const rl = createInterface({ input, terminal: false });
  const write = (payload) => output.write(`${JSON.stringify(payload)}\n`);

  rl.on('line', async (line) => {
    if (line.trim() === '') return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });
      return;
    }
    try {
      const result = await handle(message);
      if (result !== null) write({ jsonrpc: '2.0', id: message.id, result });
    } catch (error) {
      write({
        jsonrpc: '2.0', id: message.id,
        error: { code: error.code ?? -32603, message: String(error.message ?? error) },
      });
    }
  });

  return new Promise((resolve) => rl.on('close', resolve));
}
