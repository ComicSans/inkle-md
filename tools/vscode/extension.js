/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The Story Weaver panel for VS Code: the node under the cursor on one side of
 * the screen, the book playable from that node on the other.
 *
 * This file is the adapter and nothing else. Everything that can be wrong
 * without anyone noticing - which book a file belongs to, which node a line
 * falls in - lives in `book.mjs` and is tested by `node --test`.
 *
 * CommonJS, because VS Code loads `main` with `require`; the compiler and the
 * runtime are ES modules and are pulled in with a dynamic import. There is no
 * build step here either, and no dependency beyond VS Code itself.
 */

const vscode = require('vscode');
const { readFileSync } = require('node:fs');
const { join, dirname } = require('node:path');
const { pathToFileURL } = require('node:url');

/**
 * The ES modules, loaded once. Where the project's own sources are depends on
 * how this copy was installed - see `sourceDir` - so the extension's own
 * modules load first and answer that question.
 */
let modules = null;
async function load() {
  if (modules) return modules;
  const own = (name) => pathToFileURL(join(__dirname, name)).href;
  const [book, document] = await Promise.all([import(own('book.mjs')), import(own('document.mjs'))]);
  const src = book.sourceDir(__dirname);
  const compile = await import(pathToFileURL(join(src, 'compile.js')).href);
  modules = { compile, book, document, src };
  return modules;
}

let panel = null;          // the webview, while it is open
let ready = false;         // its scripts have loaded and may be sent to
let pending = [];          // messages written before that
let last = null;           // the last book that compiled, entry and story
let timer = null;

function activate(context) {
  const out = vscode.window.createOutputChannel('Story Weaver');
  context.subscriptions.push(out);

  const open = (playFrom) => openPanel(context, out, playFrom);

  context.subscriptions.push(
    vscode.commands.registerCommand('storyWeaver.showPanel', () => open(null)),
    vscode.commands.registerCommand('storyWeaver.playHere', () => open('cursor')),
    vscode.commands.registerCommand('storyWeaver.playFromStart', () => open('start')),

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (!panel || !isBook(event.document)) return;
      // The file is invalid for most of the time an author is typing in it,
      // so this waits for a pause rather than reporting every keystroke.
      clearTimeout(timer);
      timer = setTimeout(() => refresh(out), 400);
    }),

    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (!panel || event.textEditor !== vscode.window.activeTextEditor) return;
      if (!isBook(event.textEditor.document)) return;
      if (!vscode.workspace.getConfiguration('storyWeaver').get('follow')) return;
      refresh(out);
    }),

    vscode.window.onDidChangeActiveTextEditor(() => {
      if (panel) refresh(out);
    }),

    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('storyWeaver')) refresh(out, { reload: true });
    }),
  );
}

function deactivate() {
  clearTimeout(timer);
}

/**
 * The cheap question, asked in every event handler: could this file be part of
 * a book at all? Whether it is one is `holdsBook`, which has to read a file to
 * answer it and is therefore asked once, where the compiler is called.
 */
function isBook(document) {
  return document.languageId === 'markdown'
    || document.fileName.endsWith('book.yaml')
    || document.fileName.endsWith('book.yml');
}

/** Whether the file in an editor belongs to a book (SPEC 3.1, 3.2). */
async function holdsBook(editor) {
  const { book } = await load();
  const entry = book.findEntry(editor.document.uri.fsPath, { stop: workspaceRoot(editor) });
  return book.isBookEntry(entry, textOf(entry));
}

// --- the panel -----------------------------------------------------------

async function openPanel(context, out, playFrom) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !isBook(editor.document) || !(await holdsBook(editor))) {
    vscode.window.showInformationMessage('Story Weaver: kein Buch im aktiven Editor.');
    return;
  }

  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      'storyWeaver.panel',
      'Story Weaver',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: roots(editor) },
    );
    panel.onDidDispose(() => { panel = null; ready = false; pending = []; last = null; });
    panel.webview.onDidReceiveMessage((message) => handle(message, out));
    panel.webview.html = await shell(panel.webview);
  } else {
    panel.reveal(vscode.ViewColumn.Beside, true);
  }

  await refresh(out, { reload: true, playFrom });
}

/** Everything the webview may load from: the book's directory, for images. */
function roots(editor) {
  const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  const dir = vscode.Uri.file(dirname(editor.document.uri.fsPath));
  return folder ? [folder.uri, dir] : [dir];
}

function handle(message, out) {
  if (message.type === 'ready') {
    ready = true;
    for (const queued of pending) panel.webview.postMessage(queued);
    pending = [];
    return;
  }
  if (message.type === 'reveal') return reveal(message.node, message.focus !== false);
  if (message.type === 'log') out.appendLine(message.text);
}

function post(message) {
  if (!panel) return;
  if (ready) panel.webview.postMessage(message);
  else pending.push(message);
}

/**
 * Jumps the editor to a node, which is how the panel doubles as an index.
 * While a game is running the source follows along without taking the focus:
 * the author is reading the panel, and a cursor that jumps into the file they
 * are not looking at is a cursor that has moved without them.
 */
async function reveal(nodeId, focus) {
  if (!last) return;
  const where = last.book.whereIs(last.story, nodeId, last.lang);
  if (!where?.file) return;
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(where.file));
  const editor = await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: !focus,
    preview: false,
  });
  const position = new vscode.Position(Math.max(0, where.line - 1), 0);
  if (focus) editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
}

// --- compiling and sending ----------------------------------------------

/**
 * Compiles what the editor holds - not what is on disk - and sends the panel
 * the node the cursor is in. A book that does not compile leaves the last one
 * that did on screen, with the error above it: during typing the file is
 * broken more often than not, and an empty panel is no help at all.
 */
async function refresh(out, options = {}) {
  const editor = vscode.window.activeTextEditor;
  if (!panel || !editor || !isBook(editor.document)) return;

  const { compile, book } = await load();
  const entry = book.findEntry(editor.document.uri.fsPath, { stop: workspaceRoot(editor) });
  // Not every markdown file is a book, and the ones that are not stay silent:
  // no banner, no error in the channel, the last book that compiled left on
  // screen. Reading the project's own README should not look like a broken
  // book.
  if (!book.isBookEntry(entry, textOf(entry))) return;
  const settings = vscode.workspace.getConfiguration('storyWeaver');

  let story = null;
  let messages = [];
  try {
    const result = compile.compileFile(entry, { read: buffered });
    story = result.story;
    messages = result.warnings.messages;
    post({ type: 'banner', text: null });
  } catch (error) {
    const all = error.all ?? [error];
    post({ type: 'banner', text: all.map((e) => e.message).join('\n') });
    out.appendLine(all.map((e) => e.message).join('\n'));
    if (!last) return;
  }

  if (story) {
    const wanted = settings.get('language');
    const lang = story.meta.languages.includes(wanted) ? wanted : story.meta.default;
    const now = stamp(story);
    const changed = !last || last.entry !== entry || last.stamp !== now;
    last = { entry, story, lang, book, stamp: now, messages };
    if (changed || options.reload) {
      post({
        type: 'book',
        story: forWebview(story, entry, book),
        lang,
        host: parseHost(settings.get('host')),
        title: titleOf(story, lang),
      });
    }
  }

  if (!last) return;

  const line = editor.selection.active.line + 1;
  const at = last.book.nodeAt(last.story, editor.document.uri.fsPath, line, last.lang);
  const nodeId = at?.id ?? null;
  const view = nodeId ? last.book.outline(last.story, nodeId, last.messages, last.lang) : null;
  post({ type: 'node', outline: view });

  if (options.playFrom === 'cursor' && nodeId) post({ type: 'play', node: nodeId });
  if (options.playFrom === 'start') post({ type: 'play', node: last.story.meta.start });
}

function workspaceRoot(editor) {
  return vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath ?? null;
}

/** The text of an open document beats the file on disk; nothing else does. */
function buffered(path) {
  const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === path);
  return open ? open.getText() : readFileSync(path, 'utf8');
}

/** The same, for the question whether a file is a book: unreadable is no. */
function textOf(path) {
  try {
    return buffered(path);
  } catch {
    return '';
  }
}

/**
 * The book as one string, to tell a changed book from an unchanged one. The
 * length alone would not do it: a word swapped for one of the same length -
 * "Krachen" for "Knacken" - is exactly the edit an author makes, and the panel
 * would go on playing the old text.
 */
function stamp(story) {
  return JSON.stringify(story);
}

function titleOf(story, lang) {
  const title = story.meta.title;
  if (!title) return 'Story Weaver';
  return typeof title === 'string' ? title : (title[lang] ?? Object.values(title)[0]);
}

/**
 * A webview may not open a file by its path, so every image in the book gets
 * the URI the webview can load. The alt text carries the page either way
 * (SPEC 4.9), so a picture that fails to resolve costs the picture, not the
 * sentence.
 */
function forWebview(story, entry, book) {
  const root = dirname(entry);
  return book.rewriteImages(story, (src) => (/^[a-z]+:/i.test(src)
    ? src
    : panel.webview.asWebviewUri(vscode.Uri.file(join(root, src))).toString()));
}

/** `steps=2000,elapsed=3600`, the same spelling `story-weaver play --host` takes. */
function parseHost(text) {
  if (!text) return null;
  const host = {};
  for (const pair of String(text).split(',')) {
    const [key, value] = pair.split('=').map((s) => s.trim());
    if (!key) continue;
    const number = Number(value);
    host[key] = value === '' ? true : (Number.isNaN(number) ? value : number);
  }
  return Object.keys(host).length > 0 ? host : null;
}

// --- the document in the webview ----------------------------------------

/**
 * The panel's page: the runtime and the view of the project itself, so what is
 * played here is what a reader would play, plus the panel's own chrome. Built
 * once; everything after that is a message.
 */
async function shell(webview) {
  const { document, src } = await load();
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return document.panelHtml({ nonce, cspSource: webview.cspSource, src });
}

module.exports = { activate, deactivate };
