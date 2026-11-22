/**
 * Hydration (#39): render a view onto the server's DOM nodes.
 *
 * `mount(host, { mode: 'adopt' })` renders the client tree with a claim
 * cursor over the elements already in the host (markup from renderToString or
 * renderDocument). While that render runs, every element the renderers create
 * (through acquireElement, document.createElement or createElementNS) is, when
 * possible, an element taken from the server markup instead of a new one. So
 * the effects, delegated handlers, lifecycle callbacks and gesture listeners
 * the renderers bind, and every element reference their closures capture,
 * belong to the server's nodes from the start; nothing has to be moved from a
 * client node to a server node afterwards, which closures would make
 * impossible.
 *
 * Claiming. The server elements are listed in document order (comments and
 * text nodes are not listed, so whitespace and comments in the markup don't
 * affect matching). A request for a tag takes the first unclaimed element of
 * that tag (and namespace) at or after the cursor, within a small window past
 * the furthest element claimed so far, and inside the server element that the
 * enclosing view (the nearest Renderer.render frame) claimed, so a view that
 * differs from the markup can't take its siblings' nodes. Renderers mostly
 * create elements in document order; the window covers the exceptions, such
 * as a modifier layer created after the view it wraps. When nothing matches (the client tree
 * differs there), the element is created fresh, so a mismatched subtree
 * falls back to new nodes and the elements after it are still claimed.
 *
 * Correctness does not depend on the guesses. A claimed element is emptied
 * first: its attributes and its children are removed (the children stay in
 * the list and can be claimed in turn), so the renderer builds it exactly as
 * it would build a new element. The resulting tree is always the client's
 * tree; a wrong guess only costs reuse.
 *
 * Emptying does not reset a field's dirty `value` or `checked`, and the
 * renderer then writes the binding's value. Text typed (or a box ticked)
 * before hydration is kept when the binding still holds the value the server
 * rendered: the field gets the user's value back and an input (or change)
 * event, so the binding takes it. When the binding holds another value, the
 * binding wins.
 *
 * Elements made for side work during the render (measurement containers,
 * shared SVG defs, presented dialogs) are created inside withoutHydration,
 * so they never take server nodes.
 *
 * Removing and re-inserting nodes loses focus and scroll offsets, so both are
 * recorded first and restored on the same nodes afterwards.
 */

import { withoutPooling } from './ElementPool.js';

const HTML_NS = 'http://www.w3.org/1999/xhtml';

/** How far past the furthest claimed element a claim may look. */
const WINDOW = 32;
/** Unclaimed elements further than this behind the furthest claim are skipped for good. */
const ABANDON = 64;

let _cursor = null;

// The server elements in document order, and for each the index just past
// its subtree.
function serverElements(container) {
  const list = [];
  const ends = [];
  const visit = (node) => {
    for (let child = node.firstElementChild; child; child = child.nextElementSibling) {
      const index = list.length;
      list.push(child);
      ends.push(0);
      visit(child);
      ends[index] = list.length;
    }
  };
  visit(container);
  return { list, ends };
}

function createCursor(container) {
  const { list, ends } = serverElements(container);
  const claimed = new Uint8Array(list.length);
  // One frame per view being rendered (Renderer.render): the index of the
  // first server element it claimed, or -1.
  const frames = [];
  let low = 0;
  let high = -1;
  let claims = 0;
  const dirty = [];

  // The elements a view may claim lie inside the element its nearest
  // enclosing view claimed: a view's content is never outside its parent's
  // element (modifier layers are claimed by the parent's own frame).
  const scope = () => {
    for (let i = frames.length - 2; i >= 0; i--) {
      if (frames[i] >= 0) return frames[i];
    }
    return -1;
  };

  const claim = (namespace, tag) => {
    const name = String(tag).toLowerCase();
    const parent = scope();
    const start = Math.max(low, parent + 1);
    const end = Math.min(parent >= 0 ? ends[parent] : list.length, Math.max(high, start) + WINDOW + 1);
    for (let i = start; i < end; i++) {
      if (claimed[i]) continue;
      const node = list[i];
      if (node.localName !== name || (node.namespaceURI || HTML_NS) !== namespace) continue;
      claimed[i] = 1;
      claims++;
      if (i > high) high = i;
      while (low < list.length && (claimed[low] || high - low > ABANDON)) low++;
      if (frames.length && frames[frames.length - 1] < 0) frames[frames.length - 1] = i;
      empty(node, dirty);
      return node;
    }
    return null;
  };

  return {
    claim,
    enter() { frames.push(-1); },
    exit() { frames.pop(); },
    dirty,
    get claims() { return claims; },
    get total() { return list.length; },
  };
}

/**
 * Whether a hydrating render is running.
 * @internal
 */
export function isHydrating() {
  return _cursor !== null;
}

/**
 * Run `fn`, the rendering of one view, as a frame of the hydrating render,
 * so the elements its content claims stay inside the element it claimed.
 * @internal
 */
export function hydrationFrame(fn) {
  const cursor = _cursor;
  cursor.enter();
  try {
    return fn();
  } finally {
    cursor.exit();
  }
}

/**
 * Run `fn` with element creation not claiming server nodes, for elements
 * that are not part of the view tree.
 * @internal
 */
export function withoutHydration(fn) {
  const cursor = _cursor;
  _cursor = null;
  try {
    return fn();
  } finally {
    _cursor = cursor;
  }
}

// Give a claimed element the state of a new one, noting a field the user
// changed: [node, property, server value, user's value].
function empty(node, dirty) {
  if ((node.localName === 'input' || node.localName === 'textarea') && node.type !== 'file') {
    const box = node.type === 'checkbox' || node.type === 'radio';
    const initial = box ? node.defaultChecked : node.defaultValue;
    const current = box ? node.checked : node.value;
    if (current !== initial) dirty.push([node, box ? 'checked' : 'value', initial, current]);
  }
  for (let i = node.attributes.length - 1; i >= 0; i--) node.removeAttribute(node.attributes[i].name);
  while (node.firstChild) node.removeChild(node.firstChild);
}

// What removing nodes from the document loses: focus (with the text
// selection of a field) and scroll offsets.
function recordViewState(container) {
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  const focus = active && active !== container && container.contains(active) ? { element: active, selection: null } : null;
  if (focus && typeof active.selectionStart === 'number') {
    try {
      focus.selection = [active.selectionStart, active.selectionEnd, active.selectionDirection];
    } catch { /* not a text field */ }
  }
  const scrolled = [];
  for (const element of container.querySelectorAll?.('*') ?? []) {
    if (element.scrollTop || element.scrollLeft) scrolled.push([element, element.scrollTop, element.scrollLeft]);
  }
  return { focus, scrolled };
}

function restoreViewState(container, { focus, scrolled }) {
  for (const [element, top, left] of scrolled) {
    if (!element.isConnected) continue;
    element.scrollTop = top;
    element.scrollLeft = left;
  }
  if (!focus) return false;
  const { element, selection } = focus;
  if (!element.isConnected || !container.contains(element)) return false;
  if (document.activeElement !== element) element.focus?.({ preventScroll: true });
  if (selection && typeof element.setSelectionRange === 'function') {
    try {
      element.setSelectionRange(selection[0], selection[1], selection[2] || undefined);
    } catch { /* the field no longer takes a selection */ }
  }
  return document.activeElement === element;
}

/**
 * Run `render` with element creation claiming the elements already inside
 * `container`. Returns the rendered root and a `restore()` to call once the
 * root is in place, which puts typed field values, focus and scroll offsets
 * back on the reused nodes and reports whether focus was restored.
 *
 * @param {HTMLElement} container - Host holding the server markup
 * @param {() => Node} render
 * @returns {{ element: Node, claims: number, total: number, restore: () => boolean }}
 */
export function hydrate(container, render) {
  const state = recordViewState(container);
  const cursor = createCursor(container);
  const doc = document;
  const ownCreate = Object.prototype.hasOwnProperty.call(doc, 'createElement');
  const ownCreateNS = Object.prototype.hasOwnProperty.call(doc, 'createElementNS');
  const create = doc.createElement;
  const createNS = doc.createElementNS;
  const previous = _cursor;
  _cursor = cursor;
  doc.createElement = function createElement(tag, options) {
    return (_cursor === cursor && cursor.claim(HTML_NS, tag)) || create.call(doc, tag, options);
  };
  doc.createElementNS = function createElementNS(namespace, tag, options) {
    return (_cursor === cursor && cursor.claim(namespace || HTML_NS, tag)) || createNS.call(doc, namespace, tag, options);
  };
  let element;
  try {
    // Pooled elements would bypass the claims; pooling resumes afterwards.
    element = withoutPooling(render);
  } finally {
    _cursor = previous;
    if (ownCreate) doc.createElement = create;
    else delete doc.createElement;
    if (ownCreateNS) doc.createElementNS = createNS;
    else delete doc.createElementNS;
  }
  return {
    element,
    claims: cursor.claims,
    total: cursor.total,
    restore: () => {
      for (const [node, key, initial, typed] of cursor.dirty) {
        if (!node.isConnected || node[key] !== initial) continue;
        node[key] = typed;
        node.dispatchEvent(new Event(key === 'value' ? 'input' : 'change', { bubbles: true }));
      }
      return restoreViewState(container, state);
    },
  };
}

