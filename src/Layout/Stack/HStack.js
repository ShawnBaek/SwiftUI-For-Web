/**
 * HStack - A view that arranges its children in a horizontal line.
 *
 * Matches SwiftUI's HStack for horizontal layout composition.
 *
 * @example
 * // Basic usage
 * HStack(
 *   Text('Left'),
 *   Text('Center'),
 *   Text('Right')
 * )
 *
 * // With options
 * HStack({ alignment: Alignment.top, spacing: 20 },
 *   Image('icon.png'),
 *   Text('Label')
 * )
 *
 * // With Spacer for flexible layouts
 * HStack(
 *   Text('Left'),
 *   Spacer(),
 *   Text('Right')
 * )
 */

import { View } from '../../Core/View.js';
import { Alignment, alignmentToCSS } from '../Alignment.js';

/**
 * HStack view class implementation.
 * @extends View
 */
class HStackView extends View {
  /**
   * Creates a new HStack.
   *
   * @param {Object} [options] - Stack options or first child
   * @param {string} [options.alignment='center'] - Vertical alignment of children
   * @param {number} [options.spacing=8] - Spacing between children in pixels
   * @param {...View} children - Child views
   */
  constructor(options = {}, ...children) {
    super();

    // Handle case where first argument is a View (no options provided)
    if (options instanceof View || typeof options === 'function') {
      children = [options, ...children];
      options = {};
    }

    // Handle case where options is an array (children passed as array)
    if (Array.isArray(options)) {
      children = options;
      options = {};
    }

    this._alignment = options.alignment ?? Alignment.center;
    this._spacing = options.spacing ?? 8;
    this._children = children.flat().filter(child => child != null);
  }

  /**
   * HStack returns itself as the body (container view).
   *
   * @returns {HStackView} Returns this
   */
  body() {
    return this;
  }

  /**
   * Renders the HStack to a DOM element.
   *
   * @returns {HTMLDivElement} The rendered container element
   * @protected
   */
  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'HStack';

    // Apply flexbox styles for horizontal layout
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.alignItems = alignmentToCSS(this._alignment, 'vertical');
    container.style.gap = `${this._spacing}px`;

    // Render and append children
    for (const child of this._children) {
      if (child instanceof View) {
        container.appendChild(child._render());
      } else if (typeof child === 'function') {
        // Support for lazy/dynamic children
        const result = child();
        if (result instanceof View) {
          container.appendChild(result._render());
        }
      }
    }

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for creating HStack views.
 * Provides cleaner syntax without the `new` keyword.
 *
 * @param {Object|View} [options] - Stack options or first child view
 * @param {string} [options.alignment] - Vertical alignment ('top', 'center', 'bottom', 'firstTextBaseline')
 * @param {number} [options.spacing] - Spacing between children in pixels
 * @param {...View} children - Child views to arrange horizontally
 * @returns {HStackView} A new HStack instance
 *
 * @example
 * // Without options
 * HStack(
 *   Icon('star'),
 *   Text('Favorite')
 * )
 *
 * // With options
 * HStack({ alignment: 'top', spacing: 12 },
 *   Avatar(user),
 *   VStack(
 *     Text(user.name).bold(),
 *     Text(user.email).foregroundColor(Color.gray)
 *   )
 * )
 */
export function HStack(options, ...children) {
  return new HStackView(options, ...children);
}

// Export the class for those who want to extend it
export { HStackView };

export default HStack;
