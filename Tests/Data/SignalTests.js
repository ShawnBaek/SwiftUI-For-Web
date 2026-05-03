/**
 * Signal core tests — internal reactive primitives.
 *
 * These verify the engine that Phase 2 wires State/Observable/etc onto.
 * If anything here regresses, the whole signal-based renderer is broken.
 */

import { describe, it, expect } from '../TestUtils.js';
import {
  createSignal,
  createEffect,
  createMemo,
  untrack,
  batch,
  onCleanup,
  createRoot,
  getOwner,
  runWithOwner,
  isTracking,
  trackObservers,
  notifyObserversSet,
} from '../../src/Data/Signal.js';
import { flushSync } from '../../src/Core/Scheduler.js';

describe('Signal', () => {
  describe('createSignal', () => {
    it('returns [read, write]', () => {
      const [read, write] = createSignal(0);
      expect(typeof read).toBe('function');
      expect(typeof write).toBe('function');
    });

    it('reads the initial value', () => {
      const [read] = createSignal(42);
      expect(read()).toBe(42);
    });

    it('updates via write(value)', () => {
      const [read, write] = createSignal(0);
      write(10);
      expect(read()).toBe(10);
    });

    it('updates via write(prev => next)', () => {
      const [read, write] = createSignal(5);
      write((p) => p + 1);
      expect(read()).toBe(6);
    });

    it('skips write when equals returns true (Object.is default)', () => {
      const [read, write] = createSignal(1);
      let runs = 0;
      createRoot(() => {
        createEffect(() => { read(); runs++; });
      });
      expect(runs).toBe(1);
      write(1); // same value
      flushSync();
      expect(runs).toBe(1);
    });

    it('honours custom equals', () => {
      const [read, write] = createSignal({ a: 1 }, { equals: (x, y) => x.a === y.a });
      let runs = 0;
      createRoot(() => {
        createEffect(() => { read(); runs++; });
      });
      expect(runs).toBe(1);
      write({ a: 1 }); // structurally equal under custom comparator
      flushSync();
      expect(runs).toBe(1);
      write({ a: 2 });
      flushSync();
      expect(runs).toBe(2);
    });
  });

  describe('createEffect', () => {
    it('runs immediately on creation', () => {
      let runs = 0;
      createRoot(() => {
        createEffect(() => { runs++; });
      });
      expect(runs).toBe(1);
    });

    it('re-runs when a tracked signal changes', () => {
      const [read, write] = createSignal(0);
      let last = -1;
      createRoot(() => {
        createEffect(() => { last = read(); });
      });
      expect(last).toBe(0);
      write(7);
      flushSync();
      expect(last).toBe(7);
    });

    it('does not re-run when an untracked signal changes', () => {
      const [readA, writeA] = createSignal(0);
      const [readB, writeB] = createSignal(0);
      let runs = 0;
      createRoot(() => {
        createEffect(() => { readA(); runs++; });
      });
      expect(runs).toBe(1);
      writeB(99); // different signal — must not trigger
      flushSync();
      expect(runs).toBe(1);
      writeA(1);
      flushSync();
      expect(runs).toBe(2);
    });

    it('coalesces multiple writes inside a microtask', () => {
      const [read, write] = createSignal(0);
      let runs = 0;
      createRoot(() => {
        createEffect(() => { read(); runs++; });
      });
      expect(runs).toBe(1);
      write(1); write(2); write(3);
      flushSync();
      // The scheduler dedups: one extra run, not three.
      expect(runs).toBe(2);
    });

    it('detaches old sources between runs (no stale tracking)', () => {
      const [readA, writeA] = createSignal(true);
      const [readB, writeB] = createSignal('B');
      const [readC, writeC] = createSignal('C');
      let runs = 0;
      createRoot(() => {
        createEffect(() => { runs++; readA() ? readB() : readC(); });
      });
      expect(runs).toBe(1);
      // Toggle — now subscribed to readC, not readB
      writeA(false);
      flushSync();
      expect(runs).toBe(2);
      // Writing to the now-unsubscribed B must not re-run
      writeB('B-updated');
      flushSync();
      expect(runs).toBe(2);
      // Writing to C must re-run
      writeC('C-updated');
      flushSync();
      expect(runs).toBe(3);
    });

    it('returns a disposer that stops re-runs', () => {
      const [read, write] = createSignal(0);
      let runs = 0;
      createRoot(() => {
        const dispose = createEffect(() => { read(); runs++; });
        write(1);
        flushSync();
        expect(runs).toBe(2);
        dispose();
        write(2);
        flushSync();
        expect(runs).toBe(2); // disposed — no more runs
      });
    });

    it('disposes cascade through createRoot', () => {
      const [read, write] = createSignal(0);
      let runs = 0;
      let dispose;
      createRoot((d) => {
        dispose = d;
        createEffect(() => { read(); runs++; });
      });
      expect(runs).toBe(1);
      dispose();
      write(1);
      flushSync();
      expect(runs).toBe(1); // root disposed — child effect torn down
    });
  });

  describe('createMemo', () => {
    it('caches and only recomputes on dependency change', () => {
      const [read, write] = createSignal(2);
      let computeCount = 0;
      let memo;
      createRoot(() => {
        memo = createMemo(() => { computeCount++; return read() * 10; });
      });
      expect(memo()).toBe(20);
      expect(memo()).toBe(20); // cached read
      expect(computeCount).toBe(1);
      write(3);
      flushSync();
      expect(memo()).toBe(30);
      expect(computeCount).toBe(2);
    });

    it('downstream effects only re-run when memo result changes', () => {
      const [read, write] = createSignal(1);
      let downstreamRuns = 0;
      createRoot(() => {
        const memo = createMemo(() => read() > 5);
        createEffect(() => { memo(); downstreamRuns++; });
      });
      expect(downstreamRuns).toBe(1);
      write(2); // memo result still false
      flushSync();
      expect(downstreamRuns).toBe(1);
      write(10); // memo flips to true
      flushSync();
      expect(downstreamRuns).toBe(2);
      write(20); // still true
      flushSync();
      expect(downstreamRuns).toBe(2);
    });
  });

  describe('untrack', () => {
    it('reads do not subscribe inside untrack()', () => {
      const [read, write] = createSignal(0);
      let runs = 0;
      createRoot(() => {
        createEffect(() => { runs++; untrack(read); });
      });
      expect(runs).toBe(1);
      write(7);
      flushSync();
      expect(runs).toBe(1); // read happened, but inside untrack
    });

    it('returns the function value', () => {
      const [read] = createSignal(42);
      const v = untrack(() => read());
      expect(v).toBe(42);
    });
  });

  describe('batch', () => {
    it('coalesces writes across multiple signals into one effect run', () => {
      const [readA, writeA] = createSignal(0);
      const [readB, writeB] = createSignal(0);
      let runs = 0;
      createRoot(() => {
        createEffect(() => { readA(); readB(); runs++; });
      });
      expect(runs).toBe(1);
      batch(() => {
        writeA(1);
        writeB(1);
      });
      flushSync();
      expect(runs).toBe(2); // one extra run for both writes combined
    });
  });

  describe('onCleanup', () => {
    it('runs before re-execution', () => {
      const [read, write] = createSignal(0);
      const log = [];
      createRoot(() => {
        createEffect(() => {
          const v = read();
          log.push('run:' + v);
          onCleanup(() => log.push('cleanup:' + v));
        });
      });
      expect(log).toEqual(['run:0']);
      write(1);
      flushSync();
      // Cleanup of run 0 fires, then run 1 starts.
      expect(log).toEqual(['run:0', 'cleanup:0', 'run:1']);
    });

    it('runs on dispose', () => {
      const log = [];
      let dispose;
      createRoot((d) => {
        dispose = d;
        createEffect(() => {
          log.push('run');
          onCleanup(() => log.push('cleanup'));
        });
      });
      expect(log).toEqual(['run']);
      dispose();
      expect(log).toEqual(['run', 'cleanup']);
    });
  });

  describe('owner / runWithOwner', () => {
    it('getOwner returns null outside a tracking scope', () => {
      expect(getOwner()).toBeNull();
    });

    it('getOwner returns the current root or computation', () => {
      let captured;
      createRoot(() => {
        captured = getOwner();
      });
      expect(captured).toBeDefined();
      expect(captured).not.toBeNull();
    });

    it('runWithOwner attaches effects to a different scope', () => {
      const [read, write] = createSignal(0);
      let outerRoot, innerOwner;
      let runs = 0;
      createRoot((dispose) => {
        outerRoot = dispose;
        innerOwner = getOwner();
      });
      // After outerRoot returns, currentOwner is null. Re-attach via runWithOwner:
      runWithOwner(innerOwner, () => {
        createEffect(() => { read(); runs++; });
      });
      expect(runs).toBe(1);
      write(1);
      flushSync();
      expect(runs).toBe(2);
      outerRoot();
      write(2);
      flushSync();
      expect(runs).toBe(2); // owner disposed
    });
  });

  describe('tracking-context bridge', () => {
    it('isTracking() reports the active state correctly', () => {
      expect(isTracking()).toBeFalsy();
      createRoot(() => {
        createEffect(() => {
          expect(isTracking()).toBeTruthy();
        });
      });
      expect(isTracking()).toBeFalsy();
    });

    it('trackObservers/notifyObserversSet integrates an external Set', () => {
      const observers = new Set();
      let runs = 0;
      createRoot(() => {
        createEffect(() => { trackObservers(observers); runs++; });
      });
      expect(runs).toBe(1);
      expect(observers.size).toBe(1);
      notifyObserversSet(observers);
      flushSync();
      expect(runs).toBe(2);
    });
  });
});
