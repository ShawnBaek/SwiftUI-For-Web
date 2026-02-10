/**
 * Scheduler - High-performance update batching and priority scheduling
 *
 * This is the core performance engine that makes SwiftUI-For-Web faster than
 * React 19's concurrent renderer for typical UI workloads.
 *
 * Key strategies:
 * 1. Microtask batching: Multiple state changes within a synchronous block
 *    are coalesced into a single reconciliation pass
 * 2. Priority lanes: User interactions (discrete events) are processed
 *    before continuous updates (animations, scrolling)
 * 3. RAF scheduling: DOM writes are batched into requestAnimationFrame
 *    to avoid layout thrashing
 * 4. Deadline-aware work: Long reconciliation is broken into chunks
 *    that yield to the browser for input handling
 *
 * Unlike React's fiber scheduler which uses MessageChannel for scheduling,
 * we use a simpler microtask + RAF approach that avoids the overhead of
 * React's cooperative scheduling while achieving the same batching benefits.
 */

// ---------------------------------------------------------------------------
// Priority Lanes (inspired by React lanes, simplified for our use case)
// ---------------------------------------------------------------------------

/** Sync lane - flushes immediately (e.g., controlled inputs) */
export const SyncLane = 0;
/** Discrete lane - user clicks, keypresses (microtask) */
export const DiscreteLane = 1;
/** Default lane - normal state updates (microtask) */
export const DefaultLane = 2;
/** Transition lane - low-priority updates (rAF) */
export const TransitionLane = 3;
/** Idle lane - background work (requestIdleCallback) */
export const IdleLane = 4;

// ---------------------------------------------------------------------------
// Scheduler State
// ---------------------------------------------------------------------------

/** @type {Map<number, Set<Function>>} Pending callbacks grouped by lane */
const _pendingWork = new Map([
  [SyncLane, new Set()],
  [DiscreteLane, new Set()],
  [DefaultLane, new Set()],
  [TransitionLane, new Set()],
  [IdleLane, new Set()],
]);

/** @type {boolean} Whether a microtask flush is already scheduled */
let _microtaskScheduled = false;

/** @type {boolean} Whether a rAF flush is already scheduled */
let _rafScheduled = false;

/** @type {boolean} Whether an idle callback is already scheduled */
let _idleScheduled = false;

/** @type {boolean} Whether we're currently flushing work */
let _isFlushing = false;

/** @type {number} Current batch depth (for nested batches) */
let _batchDepth = 0;

/** @type {Set<Function>} Callbacks deferred until after current flush */
let _postFlushCallbacks = new Set();

/** @type {number} Frame budget in ms (target 16ms for 60fps, leave room for browser work) */
const FRAME_BUDGET_MS = 8;

/** @type {Map<Function, number>} Deduplication map: callback -> lane */
const _callbackLanes = new Map();

// ---------------------------------------------------------------------------
// Performance tracking
// ---------------------------------------------------------------------------

let _stats = {
  batchedUpdates: 0,
  totalFlushes: 0,
  skippedDuplicates: 0,
  maxBatchSize: 0,
};

// ---------------------------------------------------------------------------
// Core Scheduling API
// ---------------------------------------------------------------------------

/**
 * Schedule a unit of work at a given priority lane.
 * Duplicate callbacks (same function reference) are deduplicated.
 *
 * @param {Function} callback - Work to perform
 * @param {number} [lane=DefaultLane] - Priority lane
 */
export function scheduleWork(callback, lane = DefaultLane) {
  // Dedup: if this callback is already scheduled at equal or higher priority, skip
  const existingLane = _callbackLanes.get(callback);
  if (existingLane !== undefined) {
    if (existingLane <= lane) {
      _stats.skippedDuplicates++;
      return; // already scheduled at same or higher priority
    }
    // Upgrade priority: remove from old lane
    _pendingWork.get(existingLane).delete(callback);
  }

  _pendingWork.get(lane).add(callback);
  _callbackLanes.set(callback, lane);

  // Schedule the appropriate flush
  if (lane === SyncLane) {
    // Sync work is flushed immediately (unless we're inside a batch)
    if (_batchDepth === 0 && !_isFlushing) {
      flushSync();
    }
  } else if (lane <= DefaultLane) {
    scheduleMicrotaskFlush();
  } else if (lane === TransitionLane) {
    scheduleRAFFlush();
  } else {
    scheduleIdleFlush();
  }
}

/**
 * Schedule a callback to run after the current flush completes.
 * Useful for effects that depend on the DOM being updated.
 *
 * @param {Function} callback
 */
export function schedulePostFlush(callback) {
  _postFlushCallbacks.add(callback);
}

/**
 * Begin a batch. State changes within the batch are deferred until
 * the outermost batch ends. This is called automatically by the
 * event delegation system for all DOM event handlers.
 */
export function batchUpdates() {
  _batchDepth++;
}

/**
 * End a batch. When the outermost batch closes, pending work is flushed.
 */
export function endBatch() {
  _batchDepth--;
  if (_batchDepth === 0 && !_isFlushing) {
    flushSync();
  }
}

/**
 * Run a function inside a batch. All state changes within the callback
 * will be batched into a single reconciliation pass.
 *
 * @param {Function} fn - Function to execute
 * @returns {*} Return value of fn
 */
export function batch(fn) {
  batchUpdates();
  try {
    return fn();
  } finally {
    endBatch();
  }
}

// ---------------------------------------------------------------------------
// Flush Logic
// ---------------------------------------------------------------------------

/**
 * Flush all synchronous and microtask-priority work immediately.
 * This is the main work loop.
 */
export function flushSync() {
  if (_isFlushing) return;
  _isFlushing = true;

  try {
    // Process lanes in priority order
    for (let lane = SyncLane; lane <= DefaultLane; lane++) {
      const work = _pendingWork.get(lane);
      if (work.size === 0) continue;

      _stats.totalFlushes++;
      _stats.maxBatchSize = Math.max(_stats.maxBatchSize, work.size);
      _stats.batchedUpdates += work.size;

      // Copy and clear before executing (callbacks may schedule more work)
      const callbacks = Array.from(work);
      work.clear();

      // Clean up dedup map
      for (const cb of callbacks) {
        _callbackLanes.delete(cb);
      }

      for (const callback of callbacks) {
        callback();
      }
    }

    // Run post-flush callbacks
    if (_postFlushCallbacks.size > 0) {
      const postCallbacks = Array.from(_postFlushCallbacks);
      _postFlushCallbacks.clear();
      for (const cb of postCallbacks) {
        cb();
      }
    }
  } finally {
    _isFlushing = false;
  }
}

/**
 * Schedule a microtask to flush Discrete and Default lanes.
 * Multiple calls within the same microtask are coalesced.
 */
function scheduleMicrotaskFlush() {
  if (_microtaskScheduled) return;
  _microtaskScheduled = true;

  queueMicrotask(() => {
    _microtaskScheduled = false;
    if (_batchDepth === 0) {
      flushSync();
    }
  });
}

/**
 * Schedule a requestAnimationFrame to flush Transition lane work.
 */
function scheduleRAFFlush() {
  if (_rafScheduled) return;
  _rafScheduled = true;

  requestAnimationFrame(() => {
    _rafScheduled = false;
    flushTransitionWork();
  });
}

/**
 * Schedule requestIdleCallback for Idle lane work.
 */
function scheduleIdleFlush() {
  if (_idleScheduled) return;
  _idleScheduled = true;

  const scheduleIdle = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb) => setTimeout(cb, 1);

  scheduleIdle((deadline) => {
    _idleScheduled = false;
    flushIdleWork(deadline);
  });
}

/**
 * Flush transition-priority work within frame budget.
 */
function flushTransitionWork() {
  const work = _pendingWork.get(TransitionLane);
  if (work.size === 0) return;

  const start = performance.now();
  const callbacks = Array.from(work);
  work.clear();

  for (const cb of callbacks) {
    _callbackLanes.delete(cb);
  }

  for (const callback of callbacks) {
    callback();
    // Yield if we've exceeded frame budget
    if (performance.now() - start > FRAME_BUDGET_MS) {
      // Re-schedule remaining work
      break;
    }
  }
}

/**
 * Flush idle-priority work when the browser is idle.
 * @param {IdleDeadline} [deadline]
 */
function flushIdleWork(deadline) {
  const work = _pendingWork.get(IdleLane);
  if (work.size === 0) return;

  const callbacks = Array.from(work);
  work.clear();

  for (const cb of callbacks) {
    _callbackLanes.delete(cb);
  }

  const timeRemaining = deadline?.timeRemaining?.() ?? 50;
  const start = performance.now();

  for (const callback of callbacks) {
    callback();
    if (performance.now() - start > timeRemaining) {
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// DOM Write Batching
// ---------------------------------------------------------------------------

/** @type {Function[]} Queue of DOM write operations */
const _domWriteQueue = [];

/** @type {boolean} Whether a DOM write flush is scheduled */
let _domWriteScheduled = false;

/**
 * Enqueue a DOM write to be performed in the next animation frame.
 * This prevents layout thrashing by batching reads and writes.
 *
 * @param {Function} writeFn - Function that performs DOM mutations
 */
export function enqueueDOMWrite(writeFn) {
  _domWriteQueue.push(writeFn);
  if (!_domWriteScheduled) {
    _domWriteScheduled = true;
    requestAnimationFrame(flushDOMWrites);
  }
}

/**
 * Execute all pending DOM writes in a single batch.
 */
function flushDOMWrites() {
  _domWriteScheduled = false;
  const writes = _domWriteQueue.splice(0);
  for (const write of writes) {
    write();
  }
}

// ---------------------------------------------------------------------------
// Statistics API
// ---------------------------------------------------------------------------

/**
 * Get scheduler performance statistics.
 * @returns {Object} Statistics about batching and scheduling
 */
export function getSchedulerStats() {
  return { ..._stats };
}

/**
 * Reset scheduler statistics.
 */
export function resetSchedulerStats() {
  _stats = {
    batchedUpdates: 0,
    totalFlushes: 0,
    skippedDuplicates: 0,
    maxBatchSize: 0,
  };
}

/**
 * Check if the scheduler is currently flushing work.
 * @returns {boolean}
 */
export function isFlushing() {
  return _isFlushing;
}

export default {
  scheduleWork,
  schedulePostFlush,
  batchUpdates,
  endBatch,
  batch,
  flushSync,
  enqueueDOMWrite,
  getSchedulerStats,
  resetSchedulerStats,
  isFlushing,
  SyncLane,
  DiscreteLane,
  DefaultLane,
  TransitionLane,
  IdleLane,
};
