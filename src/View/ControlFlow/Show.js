/**
 * Show — reactive conditional rendering primitive.
 *
 * Renders `then` while `when()` is truthy; renders `fallback` (or nothing)
 * otherwise. Re-evaluates on each signal change that `when` reads.
 *
 * @example
 *   Show(() => vm.todos.length === 0,
 *     Text('No todos yet'))
 *
 *   Show(() => vm.loggedIn,
 *     Text('Welcome back'),
 *     Text('Please sign in'))
 *
 * Signature mirrors Solid's <Show when={…}> with then/else children.
 */

import { createDescriptor } from '../../Core/ViewDescriptor.js';

/**
 * @param {() => any} when - Thunk returning truthy/falsy.
 * @param {Object} thenView - Descriptor to render when when() is truthy.
 * @param {Object} [elseView] - Descriptor to render otherwise.
 * @returns {Object} A 'Show' descriptor consumed by the SignalRenderer.
 */
export function Show(when, thenView, elseView) {
  if (typeof when !== 'function') {
    throw new Error('Show: `when` must be a function returning a value to test');
  }
  return createDescriptor('Show', { when, then: thenView, else: elseView ?? null });
}

export default Show;
