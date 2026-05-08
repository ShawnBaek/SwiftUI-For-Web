/**
 * Signal - fine-grained reactive primitives (internal).
 *
 * The reactive engine that replaces the VDOM reconciler's "re-run the whole
 * tree on every state change" model with Solid-style fine-grained tracking:
 * effects subscribe to exactly the signals they read; writes notify only
 * those effects.
 *
 * NOT exported from src/index.js — these are internal infrastructure.
 * User-facing primitives (State, Binding, ObservableObject, Environment)
 * keep their existing shapes; Phase 2 wires them on top of this module.
 *
 * Reuses src/Core/Scheduler.js for write→effect dispatch (microtask batching
 * + dedup is exactly the property we need: many writes in one tick collapse
 * into a single re-run per affected effect).
 */

import { scheduleWork, batchUpdates, endBatch, DefaultLane } from '../Core/Scheduler.js';

// ---------------------------------------------------------------------------
// Tracking context
// ---------------------------------------------------------------------------

/** @type {Computation|null} The effect/memo currently executing. */
let currentComputation = null;

/** @type {Owner|null} Ownership scope for cleanup/disposal cascade. */
let currentOwner = null;

/** @type {number} Reentrant counter — when >0, signal reads do not register. */
let untrackDepth = 0;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * A reactive cell. `read()` registers the current computation as an
 * observer; `write(v)` enqueues observers via the Scheduler.
 *
 * @typedef {Object} SignalNode
 * @property {*}                value
 * @property {Set<Computation>} observers
 * @property {(a, b) => boolean} equals
 */

/**
 * A unit of reactive work. Tracks the signals it reads (`sources`),
 * user cleanups (`cleanups`), and child computations (`children`) so
 * disposal cascades correctly.
 *
 * @typedef {Object} Computation
 * @property {() => void}        execute
 * @property {Set<SignalNode>}   sources
 * @property {Function[]}        cleanups
 * @property {Computation[]}     children
 * @property {Computation|null}  owner
 * @property {boolean}           disposed
 * @property {number}            lane     scheduler priority
 * @property {Function}          fn       user body
 * @property {boolean}           pure     true for memos (no side effects)
 */

// Owner is the same shape as Computation (a computation IS an owner for
// its children). createRoot() makes a "root" owner that has no execute.

// ---------------------------------------------------------------------------
// createSignal
// ---------------------------------------------------------------------------

/**
 * Create a reactive cell. Returns `[read, write]`.
 *
 * - `read()` returns the current value. If called inside an effect/memo,
 *   subscribes that computation to subsequent writes.
 * - `write(next)` updates the value and schedules subscribers. `next` can
 *   be a value or a `(prev) => next` updater.
 *
 * @template T
 * @param {T} initial
 * @param {{ equals?: (a: T, b: T) => boolean }} [options]
 * @returns {[() => T, (next: T | ((prev: T) => T)) => void]}
 */
export function createSignal(initial, options) {
  const equals = options && options.equals ? options.equals : Object.is;
  const node = {
    value: initial,
    observers: new Set(),
    equals,
  };

  const read = () => {
    if (currentComputation && untrackDepth === 0) {
      node.observers.add(currentComputation);
      currentComputation.sources.add(node);
    }
    return node.value;
  };

  const write = (next) => {
    const newValue = typeof next === 'function' ? next(node.value) : next;
    if (node.equals(node.value, newValue)) return;
    node.value = newValue;
    notifyObservers(node);
  };

  return [read, write];
}

/**
 * Wake up a signal's observers via the scheduler. Snapshot the set first
 * because cleanup during execution mutates the original.
 *
 * @param {SignalNode} node
 */
function notifyObservers(node) {
  if (node.observers.size === 0) return;
  // Copy into an array — observer execution disconnects from sources, which
  // mutates node.observers. Iterating a mutating Set is undefined behaviour.
  const list = [];
  for (const comp of node.observers) list.push(comp);
  for (let i = 0; i < list.length; i++) {
    const comp = list[i];
    if (!comp.disposed) scheduleWork(comp.execute, comp.lane);
  }
}

// ---------------------------------------------------------------------------
// createEffect / createMemo / createComputation
// ---------------------------------------------------------------------------

/**
 * Run `fn` immediately, tracking signal reads. Re-run whenever any tracked
 * signal changes.
 *
 * @param {() => void} fn
 * @param {{ lane?: number }} [options]
 * @returns {() => void} Disposer that detaches the effect.
 */
export function createEffect(fn, options) {
  const comp = createComputation(fn, currentOwner, options, false);
  comp.execute();
  return () => disposeComputation(comp);
}

/**
 * Derived signal: `read()` returns the cached result of `fn`. Recomputes
 * only when its tracked dependencies change. Equality-checked: downstream
 * effects re-run only when the *result* changes.
 *
 * @template T
 * @param {() => T} fn
 * @param {{ equals?: (a: T, b: T) => boolean }} [options]
 * @returns {() => T}
 */
export function createMemo(fn, options) {
  const equals = options && options.equals ? options.equals : Object.is;
  const node = {
    value: undefined,
    observers: new Set(),
    equals,
  };
  let initialized = false;

  const read = () => {
    if (currentComputation && untrackDepth === 0) {
      node.observers.add(currentComputation);
      currentComputation.sources.add(node);
    }
    return node.value;
  };

  const comp = createComputation(() => {
    const newValue = fn();
    if (!initialized || !node.equals(node.value, newValue)) {
      node.value = newValue;
      initialized = true;
      notifyObservers(node);
    }
  }, currentOwner, undefined, true);
  comp.execute();

  return read;
}

/**
 * Build a computation in the current owner scope.
 * @returns {Computation}
 */
function createComputation(fn, owner, options, pure) {
  const comp = {
    fn,
    sources: new Set(),
    cleanups: [],
    children: [],
    owner,
    disposed: false,
    lane: (options && options.lane !== undefined) ? options.lane : DefaultLane,
    pure: !!pure,
    execute: null,
  };

  comp.execute = function execute() {
    if (comp.disposed) return;
    cleanupComputation(comp);

    const prevComp = currentComputation;
    const prevOwner = currentOwner;
    // Reset untrackDepth — an effect's body is its OWN tracking scope.
    // Without this, an effect created inside an untrack(...) call (e.g.
    // For/Show wrap their per-row mounts in untrack to isolate the
    // outer effect from inner reads) would inherit untrackDepth > 0 and
    // fail to register any of its own tracked reads.
    const prevUntrack = untrackDepth;
    untrackDepth = 0;
    currentComputation = comp;
    currentOwner = comp;
    try {
      comp.fn();
    } finally {
      currentComputation = prevComp;
      currentOwner = prevOwner;
      untrackDepth = prevUntrack;
    }
  };

  if (owner) {
    owner.children.push(comp);
  }
  return comp;
}

/**
 * Run user cleanups, dispose child computations, disconnect from sources.
 * Used both before re-execution AND on disposal.
 */
function cleanupComputation(comp) {
  // User cleanups (registered via onCleanup)
  if (comp.cleanups.length > 0) {
    for (let i = 0; i < comp.cleanups.length; i++) {
      try {
        comp.cleanups[i]();
      } catch (e) {
        console.error('[Signal] cleanup threw:', e);
      }
    }
    comp.cleanups.length = 0;
  }

  // Children: dispose recursively
  if (comp.children.length > 0) {
    const kids = comp.children;
    comp.children = [];
    for (let i = 0; i < kids.length; i++) disposeComputation(kids[i]);
  }

  // Source disconnect
  if (comp.sources.size > 0) {
    for (const sig of comp.sources) sig.observers.delete(comp);
    comp.sources.clear();
  }
}

/**
 * Permanently dispose a computation. Idempotent.
 */
function disposeComputation(comp) {
  if (comp.disposed) return;
  comp.disposed = true;
  cleanupComputation(comp);
}

// ---------------------------------------------------------------------------
// untrack / batch / onCleanup
// ---------------------------------------------------------------------------

/**
 * Run `fn` without registering signal reads on the current computation.
 * Useful when you need to read a signal's current value without subscribing
 * (e.g. inside an event handler, or to avoid feedback loops).
 *
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function untrack(fn) {
  untrackDepth++;
  try {
    return fn();
  } finally {
    untrackDepth--;
  }
}

/**
 * Coalesce signal writes inside `fn` into a single flush. Reuses the
 * Scheduler's batch depth.
 *
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function batch(fn) {
  batchUpdates();
  try {
    return fn();
  } finally {
    endBatch();
  }
}

/**
 * Register a cleanup callback to run before the current computation
 * re-executes (or when it is disposed). Has no effect outside an effect.
 *
 * @param {Function} fn
 */
export function onCleanup(fn) {
  if (currentOwner) {
    currentOwner.cleanups.push(fn);
  }
}

// ---------------------------------------------------------------------------
// createRoot / getOwner / runWithOwner
// ---------------------------------------------------------------------------

/**
 * Establish a top-level owner scope. Returns whatever `fn` returns.
 * `fn` receives a disposer that tears down everything created inside
 * (effects, memos, child owners).
 *
 * Use at the top of every mount — without it, effects leak when you
 * unmount, because there's no parent to cascade disposal to.
 *
 * @template T
 * @param {(dispose: () => void) => T} fn
 * @returns {T}
 */
export function createRoot(fn) {
  const root = {
    fn: null,
    sources: new Set(),
    cleanups: [],
    children: [],
    owner: null,
    disposed: false,
    lane: DefaultLane,
    pure: false,
    execute: null,
    isRoot: true,
  };

  const dispose = () => disposeComputation(root);
  const prevOwner = currentOwner;
  currentOwner = root;
  try {
    return fn(dispose);
  } finally {
    currentOwner = prevOwner;
  }
}

/**
 * Get the current owner (computation or root). Useful for effects that
 * need to attach disposable resources to a longer-lived scope.
 */
export function getOwner() {
  return currentOwner;
}

/**
 * Run `fn` with the given owner as the active scope. Effects/memos
 * created inside register against that owner instead of the current one.
 *
 * @template T
 * @param {Computation|null} owner
 * @param {() => T} fn
 * @returns {T}
 */
export function runWithOwner(owner, fn) {
  const prev = currentOwner;
  currentOwner = owner;
  try {
    return fn();
  } finally {
    currentOwner = prev;
  }
}

// ---------------------------------------------------------------------------
// Internal hooks (for the Phase 2 compat shim on State/ObservableObject)
// ---------------------------------------------------------------------------

/**
 * Register the active computation as an observer of an arbitrary observers
 * set. Used by State, ObservableObject, etc. to plug their existing
 * subscriber sets into the signal-tracking machinery without restructuring
 * their storage.
 *
 * @param {Set<Computation>} observers
 */
export function trackObservers(observers) {
  if (currentComputation && untrackDepth === 0) {
    observers.add(currentComputation);
    // Synthesize a SignalNode-shaped record for source-disconnect on cleanup.
    // We only need an `observers` field; equals/value are unused.
    currentComputation.sources.add(/** @type {SignalNode} */ ({ observers, equals: Object.is, value: undefined }));
  }
}

/**
 * Wake observers attached to an arbitrary observers set. Mirrors what
 * `notifyObservers` does for SignalNodes but lets external code (State,
 * ObservableObject) drive notifications from their existing setters.
 *
 * @param {Set<Computation>} observers
 */
export function notifyObserversSet(observers) {
  if (observers.size === 0) return;
  const list = [];
  for (const comp of observers) list.push(comp);
  for (let i = 0; i < list.length; i++) {
    const comp = list[i];
    if (!comp.disposed) scheduleWork(comp.execute, comp.lane);
  }
}

// ---------------------------------------------------------------------------
// Tracking-context bridge for src/Data/Observable.js (legacy)
// ---------------------------------------------------------------------------

/**
 * Whether a signal-tracking scope is currently active. The legacy
 * Observable module has its own `currentTrackingContext` for explicit
 * `withTracking()` callers; this lets us keep both systems coexisting
 * during migration without one shadowing the other.
 */
export function isTracking() {
  return currentComputation !== null && untrackDepth === 0;
}

/**
 * @returns {Computation|null}
 */
export function getCurrentComputation() {
  return currentComputation;
}
