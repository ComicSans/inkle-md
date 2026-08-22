/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * The walk over a compiled node's ops, shared by the compiler, the linter
 * and the simulator. It lives in a file of its own so that the linter never
 * has to import the compiler that calls it (SPEC 18.1, step 6).
 */

/** Walks every op, and every expression inside it. */
export function walkOps(ops, onOp, onExpr = () => {}) {
  for (const op of ops ?? []) {
    onOp(op);
    switch (op.op) {
      case 'text':
        walkParts(op.parts, onExpr, op.source);
        break;
      case 'assign':
        onExpr(op.value, op.source);
        break;
      case 'call':
        // The call itself is an expression too, or `~ take("key")` would be
        // invisible to every check that looks at expressions. The view writes
        // through, so resolving a story function updates the op itself.
        onExpr({
          get call() { return op.fn; },
          set call(value) { op.fn = value; },
          args: op.args,
        }, op.source);
        break;
      case 'return':
        if (op.value) onExpr(op.value, op.source);
        break;
      case 'choices':
        for (const item of op.items) {
          if (item.when) onExpr(item.when, item.source);
          walkParts(item.label, onExpr, item.source);
          walkOps(item.body, onOp, onExpr);
        }
        break;
      case 'branch':
        for (const b of op.branches) { onExpr(b.when, b.source); walkOps(b.body, onOp, onExpr); }
        if (op.else) walkOps(op.else, onOp, onExpr);
        break;
      case 'combat':
        for (const exit of Object.values(op.exits)) {
          walkParts(exit.label, onExpr, exit.source);
          walkParts(exit.text, onExpr, exit.source);
        }
        break;
      default:
        break;
    }
  }
}

/** Walks every expression inside a run of text parts. */
export function walkParts(parts, onExpr, at) {
  for (const part of parts ?? []) {
    if (part.t === 'print') onExpr(part.expr, at);
    else if (part.t === 'cond') {
      onExpr(part.when, at);
      walkParts(part.then, onExpr, at);
      walkParts(part.else, onExpr, at);
    } else if (part.t === 'alt') {
      for (const item of part.items) walkParts(item, onExpr, at);
    }
  }
}
