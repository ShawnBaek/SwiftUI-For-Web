/**
 * ScrollView - A scrollable view container
 *
 * Matches SwiftUI's ScrollView for creating scrollable content areas.
 * Supports both vertical and horizontal scrolling.
 *
 * @example
 * // Vertical scroll (default)
 * ScrollView(
 *   VStack({ spacing: 10 },
 *     ForEach(items, item => Text(item.name))
 *   )
 * )
 *
 * // Horizontal scroll
 * ScrollView({ axis: 'horizontal', showsIndicators: false },
 *   HStack({ spacing: 16 },
 *     ForEach(movies, movie => MovieCard(movie))
 *   )
 * )
 */

import { createDescriptor, isView } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render } from '../../Core/Renderer.js';

/**
 * Axis enum for scroll direction
 */
export const Axis = {
  vertical: 'vertical',
  horizontal: 'horizontal',
  both: 'both'
};

/**
 * ScrollView(options?, ...content)
 *
 * @param {Object|View} [options] - Options, or the first content view
 * @param {string} [options.axis='vertical'] - 'vertical', 'horizontal' or 'both'
 * @param {boolean} [options.showsIndicators=true] - Show scroll indicators
 * @param {boolean} [options.bounces=true] - Overscroll bounce
 * @param {Function} [options.onScroll] - Called with { x, y, target }
 * @param {...View|Function} content - Views, or functions returning views
 * @returns {Object} Chainable view descriptor
 *
 * @example
 * ScrollView({ axis: 'horizontal', showsIndicators: false },
 *   HStack({ spacing: 12 }, ForEach(movies, (movie) => MovieCard(movie)))
 * ).scrollTargetLayout('start')
 */
export function ScrollView(options = {}, ...content) {
  if (isView(options) || typeof options === 'function' || Array.isArray(options)) {
    content = [options, ...content];
    options = {};
  }
  return chainable(createDescriptor('ScrollView', {
    axis: options.axis ?? Axis.vertical,
    showsIndicators: options.showsIndicators ?? true,
    bounces: options.bounces ?? true,
    onScroll: options.onScroll ?? null,
    snapAlignment: null,
    paging: false,
  }, content.flat()), ({ withProps }) => ({
    // Snap to full pages.
    pagingEnabled: () => withProps({ paging: true }),
    // Snap children to 'start', 'center' or 'end'.
    scrollTargetLayout: (alignment = 'start') => withProps({ snapAlignment: alignment }),
    onScroll: (handler) => withProps({ onScroll: handler }),
  }));
}

registerRenderer('ScrollView', (props, children) => {
  const { axis, snapAlignment, paging, onScroll } = props;
  const container = document.createElement('div');
  container.dataset.view = 'ScrollView';

  if (axis === Axis.horizontal) {
    container.style.overflowX = 'auto';
    container.style.overflowY = 'hidden';
  } else if (axis === Axis.both) {
    container.style.overflow = 'auto';
  } else {
    container.style.overflowX = 'hidden';
    container.style.overflowY = 'auto';
  }

  if (!props.showsIndicators) {
    container.style.scrollbarWidth = 'none'; // Firefox
    container.style.msOverflowStyle = 'none'; // IE/Edge
    container.classList.add('swiftui-hide-scrollbar'); // WebKit (base.css)
  }

  container.style.overscrollBehavior = props.bounces ? 'auto' : 'none';
  container.style.scrollBehavior = 'smooth';
  container.style.webkitOverflowScrolling = 'touch'; // iOS momentum scrolling

  if (snapAlignment || paging) {
    container.style.scrollSnapType = axis === Axis.horizontal ? 'x mandatory' : 'y mandatory';
  }

  for (const child of children) {
    const view = typeof child === 'function' && !isView(child) ? child() : child;
    if (!isView(view)) continue;
    const element = render(view);
    if (snapAlignment) element.style.scrollSnapAlign = snapAlignment;
    if (paging) {
      element.style.scrollSnapAlign = 'start';
      element.style.scrollSnapStop = 'always';
    }
    container.appendChild(element);
  }

  if (onScroll) {
    container.addEventListener('scroll', () => {
      onScroll({ x: container.scrollLeft, y: container.scrollTop, target: container });
    });
  }

  return container;
});

export default ScrollView;
