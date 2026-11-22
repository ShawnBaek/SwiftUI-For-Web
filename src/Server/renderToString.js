/**
 * Static rendering (#40): render a view to HTML in Node, with no browser.
 *
 * One renderer, two backends: the view is rendered by the framework's own
 * renderers (the same code that runs in the browser) against the DOM-like
 * shim in ./DOMShim.js, inside a signal root that is disposed afterwards, and
 * the resulting tree is serialized. The same input gives byte-identical HTML.
 */

import { createRoot } from '../Data/Signal.js';
import { render } from '../Core/Renderer.js';
import { View } from '../Core/View.js';
import { isDescriptor } from '../Core/ViewDescriptor.js';
import { DocumentMetadata } from '../App/DocumentMetadata.js';
import { withoutPooling } from '../Core/ElementPool.js';
import { withElementIdScope } from '../Core/ElementID.js';
import { undelegateAll } from '../Core/EventDelegate.js';
import { discardCallbacks } from '../Core/LifecycleObserver.js';
import { withDOMShim, serializeNode, escapeAttribute } from './DOMShim.js';

/**
 * Drop what rendering registered against the tree's elements (delegated
 * handlers, onAppear/onDisappear), without running any of it: the tree is
 * never shown, and module-level registries must not keep it alive.
 */
function discardTree(node) {
  if (!node) return;
  if (node.nodeType === 1) {
    undelegateAll(node);
    discardCallbacks(node);
  }
  for (const child of node.childNodes || []) discardTree(child);
}

function resolveView(content) {
  if (typeof content === 'function' && !isDescriptor(content)) {
    return content.prototype instanceof View ? new content() : content();
  }
  return content;
}

/**
 * Render a view, view descriptor, or a function returning one, to an HTML
 * string (the markup the browser renderer would produce on first render).
 *
 * @param {View|Object|Function} content
 * @returns {string}
 */
export function renderToString(content) {
  return renderWithTitle(content).html;
}

// Render and also report the document title the view set with
// .navigationTitle(_:) (#40), read before the render's owner is disposed.
function renderWithTitle(content) {
  return withElementIdScope(() => withoutPooling(() => withDOMShim((document) => createRoot((dispose) => {
    let element = null;
    try {
      element = render(resolveView(content));
      return { html: element ? serializeNode(element) : '', title: document.title || null };
    } finally {
      dispose();
      discardTree(element);
    }
  }))));
}

/**
 * Render a complete HTML document: <head> with charset, viewport and the
 * scene's DocumentMetadata, and <body> with the view's markup in a root
 * element the client app can mount into.
 *
 * Metadata comes from options.metadata, or from a WindowGroup's
 * `{ metadata }`. A missing title comes from the view's
 * `.navigationTitle(_:)`, then from the WindowGroup's title.
 *
 * @param {View|Object|Function} content
 * @param {Object} [options]
 * @param {DocumentMetadata|Object} [options.metadata]
 * @param {string} [options.lang='en']
 * @param {string} [options.rootId='root']
 * @param {string[]} [options.stylesheets] - <link rel="stylesheet"> hrefs
 * @param {string[]} [options.scripts] - <script type="module"> srcs
 * @param {string} [options.head] - Extra trusted markup appended to <head>
 * @returns {string}
 */
export function renderDocument(content, options = {}) {
  const view = resolveView(content);
  const rendered = renderWithTitle(view);
  let metadata = DocumentMetadata.from(options.metadata ?? view?._metadata ?? null);
  // A missing metadata title comes from .navigationTitle(_:), then from the
  // WindowGroup's title.
  const fallbackTitle = rendered.title ?? view?._title ?? null;
  if (fallbackTitle && (!metadata || metadata.title === null)) {
    metadata = metadata ? metadata.merging({ title: fallbackTitle }) : new DocumentMetadata({ title: fallbackTitle });
  }
  const lang = options.lang ?? 'en';
  const rootId = options.rootId ?? 'root';
  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
  ];
  if (metadata) {
    const tags = metadata.headHTML();
    if (tags) head.push(tags);
  }
  for (const href of options.stylesheets ?? []) head.push(`<link rel="stylesheet" href="${escapeAttribute(href)}">`);
  if (options.head) head.push(String(options.head));
  const body = [`<div id="${escapeAttribute(rootId)}">${rendered.html}</div>`];
  for (const src of options.scripts ?? []) body.push(`<script type="module" src="${escapeAttribute(src)}"></script>`);
  return [
    '<!DOCTYPE html>',
    `<html lang="${escapeAttribute(lang)}">`,
    '<head>',
    head.join('\n'),
    '</head>',
    '<body>',
    body.join('\n'),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
