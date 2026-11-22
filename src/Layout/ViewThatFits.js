/**
 * ViewThatFits - Selects the first child view that fits within the available space
 *
 * Matches SwiftUI's ViewThatFits container introduced in iOS 16.
 *
 * SwiftUI Implementation Details:
 * - ViewThatFits applies fixedSize() to each child view to get its "ideal size"
 * - The ideal size is the size a view would occupy with no constraints (unlimited space)
 * - It compares each child's ideal size against the parent's proposed size
 * - Selects the FIRST child whose ideal size fits within the proposed size
 * - If no child fits, falls back to the LAST child
 *
 * @see https://developer.apple.com/documentation/swiftui/viewthatfits
 * @see https://fatbobman.com/en/posts/mastering-viewthatfits/
 *
 * @example
 * // Basic usage - first fitting view is displayed
 * ViewThatFits(
 *   HStack(Text('Wide Layout'), Text('Extra Info')),
 *   VStack(Text('Narrow'), Text('Layout'))
 * )
 *
 * @example
 * // Constrain to horizontal axis only
 * ViewThatFits({ in: 'horizontal' },
 *   Text('Very long text that needs lots of space'),
 *   Text('Medium text'),
 *   Text('Short')
 * )
 *
 * @example
 * // Adaptive HStack to VStack
 * ViewThatFits(
 *   HStack({ spacing: 20 }, ...cards),
 *   VStack({ spacing: 12 }, ...cards)
 * )
 */

import { createDescriptor, isView } from '../Core/ViewDescriptor.js';
import { chainable } from '../Core/Chainable.js';
import { registerRenderer, render } from '../Core/Renderer.js';
import { withoutHydration } from '../Core/Hydration.js';
import { createOwnedSlot } from '../Core/OwnedSlot.js';
import { releaseChildren } from '../Core/ElementPool.js';
import { createRoot, getOwner, onCleanup } from '../Data/Signal.js';

/**
 * Axis enum for constraining fit checking
 */
export const Axis = {
  horizontal: 'horizontal',
  vertical: 'vertical',
  both: 'both'
};

/**
 * ViewThatFits({ in: axis }?, ...candidates)
 *
 * @returns {Object} Chainable view descriptor
 */
export function ViewThatFits(optionsOrFirstChild, ...children) {
  const hasOptions = optionsOrFirstChild && !isView(optionsOrFirstChild) && typeof optionsOrFirstChild === 'object';
  const candidates = hasOptions ? children : [optionsOrFirstChild, ...children];
  return chainable(createDescriptor('ViewThatFits', {
    axis: (hasOptions && optionsOrFirstChild.in) || Axis.both,
  }, candidates.flat()));
}

/**
 * A view's ideal size: its size with no constraints, like SwiftUI's
 * fixedSize(). The view renders off-screen in a throwaway root, so its
 * effects end with the measurement, and never claims server nodes.
 *
 * @param {Object} view
 * @returns {{ width: number, height: number }}
 */
export function measureIdealSize(view) {
  return withoutHydration(() => createRoot((dispose) => {
    const box = document.createElement('div');
    box.style.cssText = 'position: absolute; visibility: hidden; pointer-events: none; top: -9999px; left: -9999px; width: max-content; height: max-content;';
    const element = render(view);
    element.style.width = 'max-content';
    element.style.height = 'max-content';
    element.style.whiteSpace = 'nowrap'; // ideal width: no wrapping
    element.style.overflow = 'visible';
    box.appendChild(element);
    document.body.appendChild(box);
    const rect = element.getBoundingClientRect();
    box.remove();
    dispose();
    return { width: rect.width, height: rect.height };
  }));
}

registerRenderer('ViewThatFits', ({ axis }, candidates) => {
  const container = document.createElement('div');
  container.dataset.view = 'ViewThatFits';
  container.style.cssText = `
      width: 100%;
      height: 100%;
    `;
  // The chosen candidate renders later (it needs layout), from frame and
  // resize callbacks; the slot keeps its effects owned.
  const slot = createOwnedSlot();
  let selected = -1;
  let timer = null;

  const fits = (size, proposed) =>
    (axis === Axis.vertical || !(proposed.width < Infinity) || size.width <= proposed.width)
    && (axis === Axis.horizontal || !(proposed.height < Infinity) || size.height <= proposed.height);

  // The first candidate whose ideal size fits the space offered, or the
  // last one when none fits (SwiftUI's rule).
  const update = () => {
    if (slot.isDisposed() || candidates.length === 0) return;
    const rect = container.getBoundingClientRect();
    // Not laid out yet: offer the viewport.
    const proposed = rect.width === 0 && rect.height === 0
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: rect.width, height: rect.height };
    let index = candidates.length - 1;
    if (candidates.length > 1) {
      const first = candidates.findIndex((candidate) => fits(measureIdealSize(candidate), proposed));
      if (first >= 0) index = first;
    }
    if (index === selected && container.firstChild) return;
    selected = index;
    slot.clear();
    releaseChildren(container);
    const node = slot.render(() => render(candidates[index]));
    if (node) container.appendChild(node);
  };

  requestAnimationFrame(update);
  if (typeof ResizeObserver !== 'undefined') {
    // Debounced to one update per frame.
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(update, 16);
    });
    observer.observe(container);
    if (getOwner()) onCleanup(() => { observer.disconnect(); clearTimeout(timer); });
  }

  return container;
});

export default ViewThatFits;
