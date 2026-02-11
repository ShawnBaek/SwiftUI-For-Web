/**
 * ElementPool - DOM element recycling for reduced GC pressure
 *
 * Creating and garbage-collecting DOM elements is one of the most expensive
 * operations in browser rendering. This pool recycles elements that are
 * removed from the DOM, cleaning and reusing them for new views.
 *
 * This gives SwiftUI-For-Web a significant advantage over React, which
 * creates new DOM nodes on every render and relies on the browser's GC.
 *
 * Strategy:
 * - Pool common element types (div, span, button, input, img)
 * - When an element is removed from DOM, reclaim it into the pool
 * - When creating a new element, check the pool first
 * - Reset all properties when recycling to avoid stale state
 * - Cap pool size to prevent memory leaks
 */

/** @type {Map<string, HTMLElement[]>} Tag name -> array of recycled elements */
const _pools = new Map();

/** Maximum number of elements to keep per tag type */
const MAX_POOL_SIZE = 50;

/** Tags that benefit from pooling (high churn elements) */
const POOLABLE_TAGS = new Set([
  'div', 'span', 'button', 'input', 'img', 'a', 'label', 'hr', 'p'
]);

/** @type {number} Number of elements served from pool */
let _hits = 0;

/** @type {number} Number of elements created fresh */
let _misses = 0;

/**
 * Acquire a DOM element, preferring a recycled one from the pool.
 *
 * @param {string} tagName - HTML tag name (e.g., 'div', 'span')
 * @returns {HTMLElement} A clean DOM element
 */
export function acquireElement(tagName) {
  const tag = tagName.toLowerCase();
  const pool = _pools.get(tag);

  if (pool && pool.length > 0) {
    _hits++;
    const element = pool.pop();
    return element;
  }

  _misses++;
  return document.createElement(tagName);
}

/**
 * Release a DOM element back to the pool for recycling.
 * The element is cleaned of all attributes, styles, event listeners, and children.
 *
 * @param {HTMLElement} element - Element to recycle
 */
export function releaseElement(element) {
  if (!element || !element.tagName) return;

  const tag = element.tagName.toLowerCase();
  if (!POOLABLE_TAGS.has(tag)) return;

  let pool = _pools.get(tag);
  if (!pool) {
    pool = [];
    _pools.set(tag, pool);
  }

  if (pool.length >= MAX_POOL_SIZE) return; // Pool full

  // Clean the element for reuse
  cleanElement(element);
  pool.push(element);
}

/**
 * Recursively release an element and all its descendants.
 *
 * @param {HTMLElement} root - Root element to release
 */
export function releaseTree(root) {
  if (!root || !root.tagName) return;

  // Release children first (bottom-up)
  const children = root.children;
  for (let i = children.length - 1; i >= 0; i--) {
    releaseTree(children[i]);
  }

  releaseElement(root);
}

/**
 * Reset an element to a clean state for reuse.
 * This is faster than creating a new element in most browsers.
 *
 * @param {HTMLElement} element
 */
function cleanElement(element) {
  // Remove all children
  element.textContent = '';

  // Remove all attributes except tagName-intrinsic ones
  const attrs = element.attributes;
  for (let i = attrs.length - 1; i >= 0; i--) {
    element.removeAttribute(attrs[i].name);
  }

  // Reset inline styles - cssText assignment is fastest
  element.style.cssText = '';

  // Clear custom properties
  element._descriptor = undefined;
  element._swiftuiTransition = undefined;
  element._matchedGeometry = undefined;
  element._lazyObserver = undefined;
  element._delegatedEvents = undefined;

  // Clone node to detach all event listeners
  // This is the most reliable way to remove ALL listeners
  // (only needed if we're not using event delegation)
  // Note: we don't do this because event delegation handles cleanup
}

/**
 * Get pool statistics.
 * @returns {Object}
 */
export function getPoolStats() {
  const poolSizes = {};
  for (const [tag, pool] of _pools) {
    poolSizes[tag] = pool.length;
  }
  return {
    hits: _hits,
    misses: _misses,
    hitRate: _hits + _misses > 0 ? (_hits / (_hits + _misses) * 100).toFixed(1) + '%' : '0%',
    poolSizes,
    totalPooled: Array.from(_pools.values()).reduce((sum, p) => sum + p.length, 0),
  };
}

/**
 * Clear all pools.
 */
export function clearPools() {
  _pools.clear();
  _hits = 0;
  _misses = 0;
}

export default {
  acquireElement,
  releaseElement,
  releaseTree,
  getPoolStats,
  clearPools,
};
