/**
 * EventDelegate - Root-level event delegation system
 *
 * Instead of attaching event listeners to every element (which React also does
 * for most events), this system attaches a single listener per event type
 * to the root container. Events are dispatched to the correct handler via
 * a WeakMap lookup on the target element.
 *
 * Advantages over per-element listeners:
 * - O(1) memory regardless of element count
 * - No need to remove listeners on element teardown
 * - Faster element creation (no addEventListener calls)
 * - Compatible with element pooling (no stale listeners)
 *
 * React 17+ also uses root-level delegation, but we go further by:
 * - Using WeakMap (auto-cleanup when elements are GC'd)
 * - Avoiding the synthetic event system overhead
 * - Supporting direct native event access
 */

import { batchUpdates, endBatch } from './Scheduler.js';

// ---------------------------------------------------------------------------
// Event Handler Registry
// ---------------------------------------------------------------------------

/**
 * WeakMap from DOM element -> Map<eventType, handler>
 * WeakMap ensures handlers are GC'd when elements are removed.
 * @type {WeakMap<HTMLElement, Map<string, Function>>}
 */
const _handlers = new WeakMap();

/**
 * Set of event types we're currently listening for on each root.
 * @type {Map<HTMLElement, Set<string>>}
 */
const _activeRoots = new Map();

/**
 * Events that should be captured (not bubbled).
 * @type {Set<string>}
 */
const CAPTURE_EVENTS = new Set([
  'focus', 'blur', 'scroll', 'load', 'error',
]);

/**
 * Events that don't bubble and need special handling.
 * @type {Set<string>}
 */
const NON_BUBBLING = new Set([
  'focus', 'blur', 'load', 'error', 'scroll',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register an event handler for an element via delegation.
 *
 * @param {HTMLElement} element - Target element
 * @param {string} eventType - Event type (e.g., 'click', 'input')
 * @param {Function} handler - Event handler function
 * @param {HTMLElement} [root] - Root element for delegation (defaults to document.body)
 */
export function delegateEvent(element, eventType, handler, root) {
  if (!element || !eventType || !handler) return;

  // Store handler on element via WeakMap
  let elementHandlers = _handlers.get(element);
  if (!elementHandlers) {
    elementHandlers = new Map();
    _handlers.set(element, elementHandlers);
  }
  elementHandlers.set(eventType, handler);

  // Ensure root listener exists
  root = root || document.body;
  ensureRootListener(root, eventType);
}

/**
 * Remove an event handler for an element.
 *
 * @param {HTMLElement} element - Target element
 * @param {string} eventType - Event type
 */
export function undelegateEvent(element, eventType) {
  const elementHandlers = _handlers.get(element);
  if (elementHandlers) {
    elementHandlers.delete(eventType);
    if (elementHandlers.size === 0) {
      _handlers.delete(element);
    }
  }
}

/**
 * Remove all event handlers for an element.
 *
 * @param {HTMLElement} element - Target element
 */
export function undelegateAll(element) {
  _handlers.delete(element);
}

/**
 * Initialize event delegation on a root element.
 *
 * @param {HTMLElement} root - Root element to attach listeners to
 * @param {string[]} [eventTypes] - Event types to listen for
 */
export function initDelegation(root, eventTypes) {
  if (!root) return;

  // Default commonly-used event types
  const types = eventTypes || [
    'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
    'input', 'change', 'keydown', 'keyup', 'keypress',
    'focus', 'blur',
    'touchstart', 'touchend', 'touchmove',
    'pointerdown', 'pointerup', 'pointermove',
  ];

  for (const type of types) {
    ensureRootListener(root, type);
  }
}

/**
 * Tear down event delegation on a root element.
 *
 * @param {HTMLElement} root - Root element
 */
export function teardownDelegation(root) {
  const types = _activeRoots.get(root);
  if (!types) return;

  for (const type of types) {
    const useCapture = CAPTURE_EVENTS.has(type);
    root.removeEventListener(type, rootHandler, useCapture);
  }

  _activeRoots.delete(root);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Ensure a root-level listener exists for the given event type.
 *
 * @param {HTMLElement} root
 * @param {string} eventType
 */
function ensureRootListener(root, eventType) {
  let types = _activeRoots.get(root);
  if (!types) {
    types = new Set();
    _activeRoots.set(root, types);
  }

  if (types.has(eventType)) return;
  types.add(eventType);

  const useCapture = CAPTURE_EVENTS.has(eventType);
  root.addEventListener(eventType, rootHandler, useCapture);
}

/**
 * Root event handler - dispatches to the correct element handler.
 * Wraps handler execution in a batch for automatic update coalescing.
 *
 * @param {Event} event
 */
function rootHandler(event) {
  const type = event.type;

  // Walk up from target to root, looking for handlers
  let target = event.target;

  // Begin batch - all state changes within this handler are coalesced
  batchUpdates();

  try {
    while (target && target !== event.currentTarget) {
      const elementHandlers = _handlers.get(target);
      if (elementHandlers) {
        const handler = elementHandlers.get(type);
        if (handler) {
          handler(event);
          // Don't stop propagation - let event continue bubbling
          // unless the handler called stopPropagation
          if (event.cancelBubble) break;
        }
      }
      target = target.parentElement;
    }
  } finally {
    // End batch - triggers a single reconciliation pass
    endBatch();
  }
}

export default {
  delegateEvent,
  undelegateEvent,
  undelegateAll,
  initDelegation,
  teardownDelegation,
};
