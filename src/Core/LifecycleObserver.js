/**
 * LifecycleObserver - Shared MutationObserver for onAppear/onDisappear
 *
 * One shared MutationObserver serves every element that uses onAppear or
 * onDisappear, instead of one observer per element.
 *
 * Cost per mutation batch (#57). Let R be the number of registered elements
 * and S the number of elements inside the subtrees the batch added or removed:
 *
 * - R <= SMALL_REGISTRY: every registered element is checked with
 *   `document.contains`, O(R x depth). With so few elements this is cheaper
 *   than walking a large inserted subtree.
 * - otherwise: only the added and removed subtrees are walked and looked up in
 *   the registry, O(S). A change elsewhere in the document never touches the
 *   elements outside it, so a long list of rows with onAppear/onDisappear does
 *   not pay for unrelated DOM changes.
 *
 * An explicit `flushLifecycleCallbacks()` call still checks every registered
 * element, O(R x depth). The renderer and the tests use it when they need the
 * callbacks to have run.
 *
 * Callbacks are batched into one microtask per mutation batch, so they never
 * interleave with the reconciliation pass that caused them.
 */

/**
 * At or below this many registered elements (per map), a mutation batch
 * checks each of them directly; above it, only the mutated subtrees are
 * walked.
 */
const SMALL_REGISTRY = 16;

/** @type {Map<HTMLElement, Function[]>} Elements waiting for onAppear, with their callbacks in registration order */
const _appearCallbacks = new Map();

/** @type {Map<HTMLElement, Function[]>} Elements being watched for onDisappear, with their callbacks in registration order */
const _disappearCallbacks = new Map();

/** @type {Function[]} onDisappear callbacks of released elements, run on the next flush */
const _releasedDisappearCallbacks = [];

/** @type {MutationObserver|null} Shared observer instance */
let _observer = null;

/** @type {boolean} Whether a lifecycle check is already queued */
let _pendingAppearCheck = false;

/** @type {Set<HTMLElement>} Elements registered for onAppear since the last check */
const _newAppearElements = new Set();

/** @type {Node[]} Subtree roots added since the last check */
const _addedRoots = [];

/** @type {Node[]} Subtree roots removed since the last check */
const _removedRoots = [];

/**
 * Register an onAppear callback for an element.
 * The callback fires once when the element is connected to the document.
 * An element can have several callbacks (`.onAppear(a).onAppear(b)`, or
 * `.onAppear` next to `.task`); they run in registration order.
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

  addCallback(_appearCallbacks, element, callback);
  _newAppearElements.add(element);
  ensureObserver();
  scheduleAppearCheck();
}

/**
 * Register an onDisappear callback for an element.
 * The callback fires once when the element is removed from the document.
 * An element can have several callbacks; they run in registration order.
 *
 * @param {HTMLElement} element
 * @param {Function} callback
 */
export function onDisappear(element, callback) {
  if (!element || !callback) return;

  addCallback(_disappearCallbacks, element, callback);
  ensureObserver();
}

/**
 * Unregister all callbacks for an element.
 *
 * @param {HTMLElement} element
 */
export function removeCallbacks(element) {
  _appearCallbacks.delete(element);
  _newAppearElements.delete(element);
  _disappearCallbacks.delete(element);
  maybeDisconnectObserver();
}

/**
 * Release an element's lifecycle callbacks because the element is being
 * returned to the element pool (its view is gone). A pending onAppear is
 * dropped; a registered onDisappear is detached from the element and run once
 * on the next flush. The pooled element therefore carries no callbacks into
 * the view that reuses it (invariant I3, #46).
 *
 * @param {HTMLElement} element
 */
export function releaseCallbacks(element) {
  _appearCallbacks.delete(element);
  _newAppearElements.delete(element);
  const disappear = _disappearCallbacks.get(element);
  if (disappear) {
    _disappearCallbacks.delete(element);
    _releasedDisappearCallbacks.push(...disappear);
    scheduleAppearCheck();
  }
  maybeDisconnectObserver();
}

/**
 * Drop an element's pending onAppear, for example when the owner that rendered
 * it is disposed before the element was ever attached. With `callback`, only
 * that callback is dropped and the element's others stay.
 *
 * @param {HTMLElement} element
 * @param {Function} [callback]
 */
export function cancelAppear(element, callback) {
  if (callback) {
    const callbacks = _appearCallbacks.get(element);
    const index = callbacks ? callbacks.indexOf(callback) : -1;
    if (index === -1) return;
    callbacks.splice(index, 1);
    if (callbacks.length > 0) return;
  }
  if (_appearCallbacks.delete(element)) {
    _newAppearElements.delete(element);
    maybeDisconnectObserver();
  }
}

/**
 * Forget an element's onAppear and onDisappear without running either, for
 * an element that was never shown, such as one rendered by renderToString
 * (#40).
 *
 * @param {HTMLElement} element
 */
export function discardCallbacks(element) {
  _appearCallbacks.delete(element);
  _newAppearElements.delete(element);
  _disappearCallbacks.delete(element);
  maybeDisconnectObserver();
}

/**
 * Process any pending appear/disappear callbacks, checking every registered
 * element: O(registered x depth). The shared observer does not use this path
 * for a large registry; it processes only the mutated subtrees (#57).
 */
export function flushLifecycleCallbacks() {
  // The full scan below covers whatever the queued records would have found.
  _newAppearElements.clear();
  _addedRoots.length = 0;
  _removedRoots.length = 0;

  runReleasedDisappearCallbacks();

  // Check appear callbacks
  for (const element of [..._appearCallbacks.keys()]) {
    if (document.contains(element)) fireAppear(element);
  }

  // Check disappear callbacks
  for (const element of [..._disappearCallbacks.keys()]) {
    if (!document.contains(element)) fireDisappear(element);
  }

  maybeDisconnectObserver();
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function addCallback(registry, element, callback) {
  const callbacks = registry.get(element);
  if (callbacks) callbacks.push(callback);
  else registry.set(element, [callback]);
}

function runReleasedDisappearCallbacks() {
  if (_releasedDisappearCallbacks.length === 0) return;
  const released = _releasedDisappearCallbacks.splice(0);
  for (const callback of released) {
    try {
      callback();
    } catch (e) {
      console.error('onDisappear callback error:', e);
    }
  }
}

function fireAppear(element) {
  const callbacks = _appearCallbacks.get(element);
  if (!callbacks) return;
  _appearCallbacks.delete(element);
  for (const callback of callbacks) {
    try {
      callback();
    } catch (e) {
      console.error('onAppear callback error:', e);
    }
  }
}

function fireDisappear(element) {
  const callbacks = _disappearCallbacks.get(element);
  if (!callbacks) return;
  _disappearCallbacks.delete(element);
  for (const callback of callbacks) {
    try {
      callback();
    } catch (e) {
      console.error('onDisappear callback error:', e);
    }
  }
}

/**
 * Collect the registered elements inside the given subtrees. A root counts
 * only if it is connected (for added subtrees) or disconnected (for removed
 * ones) now: a node added and removed again within one batch, or moved to
 * another place in the document, is in both lists and must not fire.
 *
 * @param {Node[]} roots
 * @param {Map<HTMLElement, Function[]>} registry
 * @param {boolean} connected - The connection state a root must have
 * @returns {HTMLElement[]}
 */
function registeredInSubtrees(roots, registry, connected) {
  const found = [];
  const seen = new Set();
  for (const root of roots) {
    if (!root || root.nodeType !== 1 || seen.has(root)) continue;
    if (document.contains(root) !== connected) continue;
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (seen.has(node)) continue;
      seen.add(node);
      if (registry.has(node)) found.push(node);
      const children = node.children;
      if (children) {
        for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
      }
    }
  }
  return found;
}

/**
 * The microtask check: process what changed since the last check.
 */
function processPendingChanges() {
  const added = _addedRoots.splice(0);
  const removed = _removedRoots.splice(0);
  const fresh = [..._newAppearElements];
  _newAppearElements.clear();

  runReleasedDisappearCallbacks();

  // Appear. Elements registered since the last check are checked directly:
  // they may have been attached before the observer could record it.
  for (const element of fresh) {
    if (_appearCallbacks.has(element) && document.contains(element)) fireAppear(element);
  }
  if (added.length > 0 && _appearCallbacks.size > 0) {
    if (_appearCallbacks.size <= SMALL_REGISTRY) {
      for (const element of [..._appearCallbacks.keys()]) {
        if (document.contains(element)) fireAppear(element);
      }
    } else {
      for (const element of registeredInSubtrees(added, _appearCallbacks, true)) {
        fireAppear(element);
      }
    }
  }

  // Disappear
  if (removed.length > 0 && _disappearCallbacks.size > 0) {
    if (_disappearCallbacks.size <= SMALL_REGISTRY) {
      for (const element of [..._disappearCallbacks.keys()]) {
        if (!document.contains(element)) fireDisappear(element);
      }
    } else {
      for (const element of registeredInSubtrees(removed, _disappearCallbacks, false)) {
        fireDisappear(element);
      }
    }
  }

  maybeDisconnectObserver();
}

function ensureObserver() {
  if (_observer) return;

  _observer = new MutationObserver((records) => {
    // Remember which subtrees changed; the check itself is batched into the
    // next microtask to coalesce multiple mutations.
    for (const record of records || []) {
      const { addedNodes, removedNodes } = record;
      if (addedNodes) for (let i = 0; i < addedNodes.length; i++) _addedRoots.push(addedNodes[i]);
      if (removedNodes) for (let i = 0; i < removedNodes.length; i++) _removedRoots.push(removedNodes[i]);
    }
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
    processPendingChanges();
  });
}

function maybeDisconnectObserver() {
  if (_appearCallbacks.size === 0 && _disappearCallbacks.size === 0) {
    if (_observer) {
      _observer.disconnect();
      _observer = null;
    }
    _addedRoots.length = 0;
    _removedRoots.length = 0;
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
  releaseCallbacks,
  cancelAppear,
  flushLifecycleCallbacks,
  getLifecycleStats,
};
