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

import { View } from '../../Core/View.js';
import { VIEW_DESCRIPTOR } from '../../Core/ViewDescriptor.js';
import { render as renderDescriptor } from '../../Core/Renderer.js';

/**
 * Axis enum for scroll direction
 */
export const Axis = {
  vertical: 'vertical',
  horizontal: 'horizontal',
  both: 'both'
};

/**
 * ScrollView class implementation
 * @extends View
 */
class ScrollViewView extends View {
  /**
   * Creates a new ScrollView
   *
   * @param {Object} [options] - ScrollView options or content
   * @param {string} [options.axis='vertical'] - Scroll direction
   * @param {boolean} [options.showsIndicators=true] - Show scroll indicators
   * @param {boolean} [options.bounces=true] - Enable bounce effect (iOS-style)
   * @param {Function} [options.onScroll] - Scroll event handler
   * @param {...View} content - Content to scroll
   */
  constructor(options = {}, ...content) {
    super();

    // Handle case where first argument is a View
    if (options instanceof View || typeof options === 'function') {
      content = [options, ...content];
      options = {};
    }

    // Handle case where options is an array
    if (Array.isArray(options)) {
      content = options;
      options = {};
    }

    this._axis = options.axis ?? Axis.vertical;
    this._showsIndicators = options.showsIndicators ?? true;
    this._bounces = options.bounces ?? true;
    this._onScrollHandler = options.onScroll ?? null;
    this._content = content.flat().filter(child => child != null);

    // Snap options for carousel-style scrolling
    this._snapsToAlignment = null;
    this._isPagingEnabled = false;
  }

  /**
   * Enable paging (snap to full pages)
   *
   * @returns {ScrollViewView} Returns `this` for chaining
   */
  pagingEnabled() {
    this._isPagingEnabled = true;
    return this;
  }

  /**
   * Set scroll snap alignment
   *
   * @param {string} alignment - 'start', 'center', 'end'
   * @returns {ScrollViewView} Returns `this` for chaining
   */
  scrollTargetLayout(alignment = 'start') {
    this._snapsToAlignment = alignment;
    return this;
  }

  /**
   * Add scroll event handler
   *
   * @param {Function} handler - Function called on scroll with scroll position
   * @returns {ScrollViewView} Returns `this` for chaining
   */
  onScroll(handler) {
    this._onScrollHandler = handler;
    return this;
  }

  /**
   * Scroll to a specific position programmatically
   *
   * @param {Object} options - Scroll options
   * @param {number} [options.x] - Horizontal position
   * @param {number} [options.y] - Vertical position
   * @param {boolean} [options.animated=true] - Animate the scroll
   */
  scrollTo(options = {}) {
    if (this._element) {
      const { x = 0, y = 0, animated = true } = options;
      this._element.scrollTo({
        left: x,
        top: y,
        behavior: animated ? 'smooth' : 'auto'
      });
    }
  }

  /**
   * Scroll to top
   *
   * @param {boolean} [animated=true] - Animate the scroll
   */
  scrollToTop(animated = true) {
    this.scrollTo({ y: 0, animated });
  }

  /**
   * Scroll to bottom
   *
   * @param {boolean} [animated=true] - Animate the scroll
   */
  scrollToBottom(animated = true) {
    if (this._element) {
      this.scrollTo({ y: this._element.scrollHeight, animated });
    }
  }

  /**
   * Renders the ScrollView to a DOM element
   *
   * @returns {HTMLDivElement} The rendered container element
   * @protected
   */
  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'ScrollView';

    // Base scroll styles
    if (this._axis === Axis.horizontal) {
      container.style.overflowX = 'auto';
      container.style.overflowY = 'hidden';
    } else if (this._axis === Axis.both) {
      container.style.overflow = 'auto';
    } else {
      // vertical (default)
      container.style.overflowX = 'hidden';
      container.style.overflowY = 'auto';
    }

    // Hide scrollbars if showsIndicators is false
    if (!this._showsIndicators) {
      container.style.scrollbarWidth = 'none'; // Firefox
      container.style.msOverflowStyle = 'none'; // IE/Edge
      // Webkit browsers need a CSS class or style element
      container.classList.add('swiftui-hide-scrollbar');
    }

    // Bounce effect (via CSS overscroll-behavior)
    if (this._bounces) {
      container.style.overscrollBehavior = 'auto';
    } else {
      container.style.overscrollBehavior = 'none';
    }

    // Smooth scrolling
    container.style.scrollBehavior = 'smooth';
    container.style.webkitOverflowScrolling = 'touch'; // iOS momentum scrolling

    // Snap scrolling
    if (this._snapsToAlignment || this._isPagingEnabled) {
      if (this._axis === Axis.horizontal) {
        container.style.scrollSnapType = 'x mandatory';
      } else {
        container.style.scrollSnapType = 'y mandatory';
      }
    }

    // Render content
    for (const child of this._content) {
      let element = null;

      if (child instanceof View) {
        element = child._render();
      } else if (child && child.$$typeof === VIEW_DESCRIPTOR) {
        // Handle descriptor-based views
        element = renderDescriptor(child);
      } else if (typeof child === 'function') {
        const result = child();
        if (result instanceof View) {
          element = result._render();
        } else if (result && result.$$typeof === VIEW_DESCRIPTOR) {
          element = renderDescriptor(result);
        }
      }

      if (element) {
        // Apply snap alignment to children if set
        if (this._snapsToAlignment) {
          element.style.scrollSnapAlign = this._snapsToAlignment;
        }
        if (this._isPagingEnabled) {
          element.style.scrollSnapAlign = 'start';
          element.style.scrollSnapStop = 'always';
        }
        container.appendChild(element);
      }
    }

    // Add scroll handler
    if (this._onScrollHandler) {
      container.addEventListener('scroll', (e) => {
        this._onScrollHandler({
          x: container.scrollLeft,
          y: container.scrollTop,
          target: container
        });
      });
    }

    this._element = container;
    return this._applyModifiers(container);
  }
}

/**
 * Factory function for creating ScrollView
 *
 * @param {Object|View} [options] - ScrollView options or first content view
 * @param {string} [options.axis] - 'vertical', 'horizontal', or 'both'
 * @param {boolean} [options.showsIndicators] - Show scroll indicators
 * @param {boolean} [options.bounces] - Enable bounce effect
 * @param {...View} content - Content views to scroll
 * @returns {ScrollViewView} A new ScrollView instance
 *
 * @example
 * // Horizontal movie carousel
 * ScrollView({ axis: 'horizontal', showsIndicators: false },
 *   HStack({ spacing: 12 },
 *     ForEach(movies, (movie) =>
 *       Image(movie.poster)
 *         .resizable()
 *         .frame({ width: 150, height: 225 })
 *         .cornerRadius(8)
 *     )
 *   )
 * ).scrollTargetLayout('start')
 */
export function ScrollView(options, ...content) {
  return new ScrollViewView(options, ...content);
}

// Export class and Axis enum
export { ScrollViewView };

export default ScrollView;
