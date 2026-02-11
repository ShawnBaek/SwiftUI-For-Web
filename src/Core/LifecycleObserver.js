/**
 * LifecycleObserver - Shared MutationObserver for onAppear/onDisappear
 *
 * The original implementation creates a new MutationObserver for EVERY
 * element that uses onAppear or onDisappear. Each observer watches the
 * entire document.body subtree, which is O(n*m) where n is the number
 * of observers and m is the number of DOM mutations.
 *
 * This module replaces that with a single shared MutationObserver that
 * tracks all elements, reducing the cost to O(n+m).
 *
 * Additionally, we batch lifecycle callbacks to run after the current
 * reconciliation pass completes, avoiding interleaved reads/writes.
 */

/** @type {Map<HTMLElement, Function>} Elements waiting for onAppear */
const _appearCallbacks = new Map();

/** @type {Map<HTMLElement, Function>} Elements being watched for onDisappear */
const _disappearCallbacks = new Map();

/** @type {MutationObserver|null} Shared observer instance */
let _observer = null;

/** @type {boolean} Whether we have pending appear checks */
let _pendingAppearCheck = false;

/**
 * Register an onAppear callback for an element.
 * The callback fires once when the element is connected to the document.
 *
 * @param {HTMLElement} element
 * @param {Function} callback
 */
export function onAppear(element, callback) {
  if (!element || !callback) return;

  // Fast path: already in DOM
  if (document.contains(element)) {
    // Defer to next microtask to ensure consistent timing
    queueMicrotask(() => callback());
    // Also register for disappear tracking if needed
    return;
  }

  _appearCallbacks.set(element, callback);
  ensureObserver();
  scheduleAppearCheck();
}

/**
 * Register an onDisappear callback for an element.
 * The callback fires once when the element is removed from the document.
 *
 * @param {HTMLElement} element
 * @param {Function} callback
 */
export function onDisappear(element, callback) {
  if (!element || !callback) return;

  _disappearCallbacks.set(element, callback);
  ensureObserver();
}

/**
 * Unregister all callbacks for an element.
 *
 * @param {HTMLElement} element
 */
export function removeCallbacks(element) {
  _appearCallbacks.delete(element);
  _disappearCallbacks.delete(element);
  maybeDisconnectObserver();
}

/**
 * Process any pending appear/disappear callbacks.
 * Called after reconciliation to batch lifecycle events.
 */
export function flushLifecycleCallbacks() {
  // Check appear callbacks
  for (const [element, callback] of _appearCallbacks) {
    if (document.contains(element)) {
      _appearCallbacks.delete(element);
      try {
        callback();
      } catch (e) {
        console.error('onAppear callback error:', e);
      }
    }
  }

  // Check disappear callbacks
  for (const [element, callback] of _disappearCallbacks) {
    if (!document.contains(element)) {
      _disappearCallbacks.delete(element);
      try {
        callback();
      } catch (e) {
        console.error('onDisappear callback error:', e);
      }
    }
  }

  maybeDisconnectObserver();
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function ensureObserver() {
  if (_observer) return;

  _observer = new MutationObserver(() => {
    // Batch the check to the next microtask to coalesce multiple mutations
    scheduleAppearCheck();
  });

  _observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function scheduleAppearCheck() {
  if (_pendingAppearCheck) return;
  _pendingAppearCheck = true;

  queueMicrotask(() => {
    _pendingAppearCheck = false;
    flushLifecycleCallbacks();
  });
}

function maybeDisconnectObserver() {
  if (_appearCallbacks.size === 0 && _disappearCallbacks.size === 0) {
    if (_observer) {
      _observer.disconnect();
      _observer = null;
    }
  }
}

/**
 * Get lifecycle observer statistics.
 * @returns {Object}
 */
export function getLifecycleStats() {
  return {
    pendingAppear: _appearCallbacks.size,
    pendingDisappear: _disappearCallbacks.size,
    observerActive: _observer !== null,
  };
}

export default {
  onAppear,
  onDisappear,
  removeCallbacks,
  flushLifecycleCallbacks,
  getLifecycleStats,
};
