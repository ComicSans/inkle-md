/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Compile errors per SPEC.md section 10.3 and lint codes per section 11.
 * Every error carries file, line and column so a message can point at the
 * offending text rather than at the book.
 */

export const ERRORS = {
  E010: 'Frontmatter missing, malformed, or not at the top of the file',
  E011: 'Unknown key or malformed declaration in the frontmatter, or a function node carrying {#id}',
  E012: 'Book-wide declaration in a chapter file',
  E020: 'Tab used for indentation',
  E021: 'Indentation not a multiple of two',
  E022: 'Indentation jumps more than one level',
  E030: 'Duplicate node id within a namespace',
  E031: 'Duplicate namespace',
  E040: 'Malformed reference',
  E041: 'Unresolved reference',
  E042: 'Divert to a function node',
  E060: 'Undeclared item used where a declaration is required',
  E061: 'Unknown item kind',
  E062: 'Unknown key in strings',
  E100: 'Choice without a link',
  E110: 'Node whose end has neither divert, choice nor combat, or text before the first node',
  E120: 'Gather not preceded by a choice',
  E121: 'Nesting deeper than three levels',
  E130: 'Malformed expression',
  E131: 'Unknown function or variable',
  E132: 'Wrong argument count',
  E133: 'Name argument that is not a quoted name, or names nothing',
  E140: 'Function node without a return on some path',
  E150: 'Flee exit for an enemy without flee_after',
  E151: 'Combat with an unknown enemy or without a win exit',
  E152: 'Malformed line in a directive block',
  E160: 'Unknown fact source',
  E161: 'Fact missing a field its source requires',
  E162: 'Fixed value or fallback outside the declared range',
  E163: 'Fact reading a later-declared fact, or a cycle among facts',
  E164: 'Assignment to a fact',
  E165: 'place() with an unknown id',
  E166: 'Place enter: naming an unknown node',
  E167: 'Event without do:',
  E168: 'Event with both once: and every:',
  E169: 'Fact expression that is not pure',
  E170: 'Fact name colliding with a stat or variable',
  E171: 'places.variable: naming something that is not a declared stat',
  E172: 'holds: on a fact that is not supplied from outside',
  E173: 'due outside an event\'s do:',
  E180: 'An image line that is not ![alt](file)',
  E181: 'An image inside a sentence rather than on a line of its own',
  E182: 'An image without alt text',
  E183: 'An image path that is a URL, or that leaves the book\'s directory',
  E184: 'An image file that does not exist',
};

export class CompileError extends Error {
  /**
   * @param {string} code one of ERRORS
   * @param {string} detail what is wrong here, concretely
   * @param {{file?: string, line?: number, column?: number, text?: string}} at
   */
  constructor(code, detail, at = {}) {
    const where = `${at.file ?? '<input>'}:${at.line ?? 0}:${at.column ?? 1}`;
    super(`${where}: ${code} ${ERRORS[code] ?? ''}\n  ${detail}` +
      (at.text ? `\n  > ${at.text}` : ''));
    this.name = 'CompileError';
    this.code = code;
    this.detail = detail;
    this.file = at.file;
    this.line = at.line;
    this.column = at.column ?? 1;
    this.text = at.text;
  }
}

/** Collects errors so one run can report more than the first failure. */
export class ErrorBag {
  constructor() {
    /** @type {CompileError[]} */ this.errors = [];
    /** @type {{code: string, level: string, detail: string, file?: string, line?: number}[]} */
    this.warnings = [];
  }

  add(code, detail, at) {
    this.errors.push(new CompileError(code, detail, at));
  }

  warn(code, level, detail, at = {}) {
    this.warnings.push({ code, level, detail, file: at.file, line: at.line });
  }

  get ok() {
    return this.errors.length === 0;
  }

  /** Throws the first error, with the rest attached. */
  throwIfFailed() {
    if (this.ok) return;
    const first = this.errors[0];
    first.all = this.errors;
    throw first;
  }
}
