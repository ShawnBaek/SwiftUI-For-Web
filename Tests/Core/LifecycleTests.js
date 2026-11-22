/**
 * Lifecycle tests on a real document: onAppear, onDisappear, and .task driven
 * by the browser's own MutationObserver (#57, #37).
 */

import { describe, it, expect } from '../TestUtils.js';
import { App } from '../../src/App/App.js';
import { Text } from '../../src/View/Text.js';
import { VStack } from '../../src/Layout/Stack/VStack.js';
import { For } from '../../src/View/ControlFlow/For.js';
import { Show } from '../../src/View/ControlFlow/Show.js';
import { State } from '../../src/Data/State.js';
import { flushSync } from '../../src/Core/Scheduler.js';
import { onAppear, onDisappear, removeCallbacks, getLifecycleStats } from '../../src/Core/LifecycleObserver.js';

// MutationObserver callbacks and the lifecycle check each take a microtask;
// a macrotask is after both.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const attachedRoot = () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  return root;
};

describe('Lifecycle on a real document', () => {
  describe('onAppear / onDisappear', () => {
    it('fires onAppear for rows of a long list when the list is attached', async () => {
      const appeared = [];
      const rows = Array.from({ length: 60 }, (_, id) => ({ id }));
      const detached = document.createElement('div');
      const app = App(() => VStack(For(
        () => rows,
        (row) => Text('row ' + row.id).onAppear(() => appeared.push(row.id)),
        (row) => row.id
      ))).mount(detached);
      try {
        await settle();
        expect(appeared.length).toBe(0);

        const root = attachedRoot();
        root.appendChild(detached);
        await settle();
        expect(appeared.length).toBe(60);
        root.remove();
      } finally {
        app.unmount();
      }
    });

    it('fires onDisappear only for the removed subtree of a large registry', async () => {
      const log = [];
      const list = attachedRoot();
      const elements = [];
      for (let i = 0; i < 40; i++) {
        const group = document.createElement('div');
        const leaf = document.createElement('span');
        group.appendChild(leaf);
        list.appendChild(group);
        onDisappear(leaf, () => log.push(i));
        elements.push(leaf);
      }
      try {
        await settle();
        // Remove an ancestor of one registered element.
        elements[12].parentNode.remove();
        await settle();
        expect(log).toEqual([12]);

        // An unrelated change fires nothing.
        const unrelated = attachedRoot();
        unrelated.appendChild(document.createElement('p'));
        unrelated.remove();
        await settle();
        expect(log).toEqual([12]);

        // Moving a subtree within the document is not a disappearance.
        const moved = elements[20].parentNode;
        list.insertBefore(moved, list.firstChild);
        await settle();
        expect(log).toEqual([12]);
      } finally {
        for (const element of elements) removeCallbacks(element);
        list.remove();
      }
    });

    it('fires onAppear for a nested element when its ancestor is attached', async () => {
      const waiting = [];
      let appeared = 0;
      // Enough pending elements to exercise the subtree walk.
      for (let i = 0; i < 30; i++) {
        const element = document.createElement('span');
        onAppear(element, () => {});
        waiting.push(element);
      }
      const section = document.createElement('section');
      const leaf = document.createElement('span');
      section.appendChild(document.createTextNode('text node'));
      section.appendChild(document.createElement('div')).appendChild(leaf);
      onAppear(leaf, () => { appeared++; });
      try {
        await settle();
        expect(appeared).toBe(0);
        const root = attachedRoot();
        root.appendChild(section);
        await settle();
        expect(appeared).toBe(1);
        root.remove();
      } finally {
        for (const element of waiting) removeCallbacks(element);
        removeCallbacks(leaf);
      }
    });

    it('returns the registry to its baseline after a mounted list is unmounted', async () => {
      await settle();
      const before = getLifecycleStats();
      const rows = Array.from({ length: 50 }, (_, id) => ({ id }));
      const root = attachedRoot();
      const app = App(() => VStack(For(
        () => rows,
        (row) => Text('row ' + row.id).onAppear(() => {}).onDisappear(() => {}),
        (row) => row.id
      ))).mount(root);
      await settle();
      app.unmount();
      root.remove();
      await settle();
      const after = getLifecycleStats();
      expect(after.pendingAppear).toBe(before.pendingAppear);
      expect(after.pendingDisappear).toBe(before.pendingDisappear);
    });
  });

  describe('.task', () => {
    it('starts when the view appears and is cancelled when it is unmounted', async () => {
      const signals = [];
      const root = attachedRoot();
      const app = App(() => Text('Loading').task((signal) => { signals.push(signal); })).mount(root);
      await settle();
      expect(signals.length).toBe(1);
      expect(signals[0].aborted).toBe(false);
      app.unmount();
      root.remove();
      expect(signals[0].aborted).toBe(true);
    });

    it('is cancelled when Show hides the view and runs again when it returns', async () => {
      const visible = new State(true);
      const signals = [];
      const root = attachedRoot();
      const app = App(() => VStack(
        Show(() => visible.value, Text('Row').task((signal) => { signals.push(signal); }))
      )).mount(root);
      try {
        await settle();
        visible.value = false;
        flushSync();
        expect(signals[0].aborted).toBe(true);
        visible.value = true;
        flushSync();
        await settle();
        expect(signals.length).toBe(2);
        expect(signals[1].aborted).toBe(false);
      } finally {
        app.unmount();
        root.remove();
      }
    });

    it('restarts for a new id and keeps a late result of the old run out of state', async () => {
      const query = new State('a');
      const result = new State('');
      const pending = [];
      const root = attachedRoot();
      const app = App(() => Text(() => result.value).task({ id: () => query.value }, async (signal) => {
        const answer = await new Promise((resolve) => pending.push(resolve));
        if (signal.aborted) return;
        result.value = answer;
      })).mount(root);
      try {
        await settle();
        query.value = 'b';
        flushSync();
        expect(pending.length).toBe(2);
        pending[1]('result for b');
        await settle();
        pending[0]('result for a');
        await settle();
        flushSync();
        expect(result.value).toBe('result for b');
        expect(root.textContent).toBe('result for b');
      } finally {
        app.unmount();
        root.remove();
      }
    });

    it('rejects work that awaits the signal with AbortError when the view goes away', async () => {
      let outcome = 'pending';
      const root = attachedRoot();
      const app = App(() => Text('Fetching').task(async (signal) => {
        try {
          // Settles only by cancellation, the way an aborted fetch rejects.
          await new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason));
          });
          outcome = 'completed';
        } catch (error) {
          outcome = error && error.name;
          throw error;
        }
      })).mount(root);
      await settle();
      app.unmount();
      root.remove();
      await settle();
      expect(outcome).toBe('AbortError');
    });
  });
});
