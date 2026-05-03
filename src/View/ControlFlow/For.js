/**
 * For — reactive keyed list primitive.
 *
 * Renders `render(item, index)` for each element of `each()`. When the array
 * signal changes, the renderer diffs at the data level (compare key arrays
 * only) — stable-key rows preserve their DOM and effect closures, no
 * descriptor-tree diff.
 *
 * @example
 *   For(() => vm.todos, todo => TodoRow(todo), todo => todo.id)
 *
 *   // Auto-keyed by identity:
 *   For(() => vm.items, item => Text(item.name))
 *
 * Signature mirrors Solid's <For each={…}>.
 */

import { createDescriptor } from '../../Core/ViewDescriptor.js';

/**
 * @param {() => Array} each - Thunk returning the source array.
 * @param {(item: any, index: number) => Object} render - Per-row renderer.
 * @param {(item: any, index: number) => any} [keyFn] - Stable identity. Default
 *   is the item's `id` if present, else the index.
 * @returns {Object} A 'For' descriptor consumed by the SignalRenderer.
 */
export function For(each, render, keyFn) {
  if (typeof each !== 'function') {
    throw new Error('For: `each` must be a function returning an array');
  }
  if (typeof render !== 'function') {
    throw new Error('For: `render` must be a function');
  }
  return createDescriptor('For', {
    each,
    render,
    keyFn: keyFn || ((item, i) => (item && typeof item === 'object' && 'id' in item) ? item.id : i),
  });
}

export default For;
