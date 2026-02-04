/**
 * VStack - A view that arranges its children in a vertical line.
 *
 * Matches SwiftUI's VStack for vertical layout composition.
 *
 * @example
 * // Basic usage
 * VStack(
 *   Text('Line 1'),
 *   Text('Line 2'),
 *   Text('Line 3')
 * )
 *
 * // With options
 * VStack({ alignment: Alignment.leading, spacing: 10 },
 *   Text('Left aligned'),
 *   Text('Also left aligned')
 * )
 *
 * // With array of children
 * VStack({ spacing: 8 }, ...items.map(item => Text(item.name)))
 */

import { View } from '../../Core/View.js';
import { Alignment, alignmentToCSS } from '../Alignment.js';

/**
 * VStack view class implementation.
 * @extends View
 */
class VStackView extends View {
  /**
   * Creates a new VStack.
   *
   * @param {Object} [options] - Stack options or first child
   * @param {string} [options.alignment='center'] - Horizontal alignment of children
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
   * VStack returns itself as the body (container view).
   *
   * @returns {VStackView} Returns this
   */
  body() {
    return this;
  }

  /**
   * Renders the VStack to a DOM element.
   *
   * @returns {HTMLDivElement} The rendered container element
   * @protected
   */
  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'VStack';

    // Apply flexbox styles for vertical layout
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = alignmentToCSS(this._alignment, 'horizontal');
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
 * Factory function for creating VStack views.
 * Provides cleaner syntax without the `new` keyword.
 *
 * @param {Object|View} [options] - Stack options or first child view
 * @param {string} [options.alignment] - Horizontal alignment ('leading', 'center', 'trailing')
 * @param {number} [options.spacing] - Spacing between children in pixels
 * @param {...View} children - Child views to arrange vertically
 * @returns {VStackView} A new VStack instance
 *
 * @example
 * // Without options
 * VStack(
 *   Text('Hello'),
 *   Text('World')
 * )
 *
 * // With options
 * VStack({ alignment: 'leading', spacing: 16 },
 *   Text('Title').font(Font.title),
 *   Text('Subtitle').foregroundColor(Color.gray)
 * )
 */
export function VStack(options, ...children) {
  return new VStackView(options, ...children);
}

// Export the class for those who want to extend it
export { VStackView };

export default VStack;
