/**
 * ZStack - A view that overlays its children, aligning them on both axes.
 *
 * Matches SwiftUI's ZStack for layered layout composition.
 * Children are stacked from back to front (first child at bottom, last at top).
 *
 * @example
 * // Basic usage - image with text overlay
 * ZStack(
 *   Image('background.jpg').resizable(),
 *   Text('Overlay Text')
 *     .foregroundColor('white')
 * )
 *
 * // With alignment
 * ZStack({ alignment: Alignment.bottomLeading },
 *   Image('photo.jpg'),
 *   Text('Caption')
 * )
 */

import { View } from '../../Core/View.js';
import { Alignment, alignmentToCSS } from '../Alignment.js';

/**
 * ZStack view class implementation.
 * @extends View
 */
class ZStackView extends View {
  /**
   * Creates a new ZStack.
   *
   * @param {Object} [options] - Stack options or first child
   * @param {string} [options.alignment='center'] - Alignment of children within the stack
   * @param {...View} children - Child views (stacked back to front)
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
    this._children = children.flat().filter(child => child != null);
  }

  /**
   * ZStack returns itself as the body (container view).
   *
   * @returns {ZStackView} Returns this
   */
  body() {
    return this;
  }

  /**
   * Get CSS properties for alignment
   *
   * @param {string} alignment - Alignment value
   * @returns {Object} CSS properties for justifyContent and alignItems
   * @private
   */
  _getAlignmentCSS(alignment) {
    // Map SwiftUI alignment to CSS flexbox properties
    const alignmentMap = {
      // Center (default)
      'center': { justifyContent: 'center', alignItems: 'center' },

      // Edges
      'top': { justifyContent: 'center', alignItems: 'flex-start' },
      'bottom': { justifyContent: 'center', alignItems: 'flex-end' },
      'leading': { justifyContent: 'flex-start', alignItems: 'center' },
      'trailing': { justifyContent: 'flex-end', alignItems: 'center' },

      // Corners
      'topLeading': { justifyContent: 'flex-start', alignItems: 'flex-start' },
      'topTrailing': { justifyContent: 'flex-end', alignItems: 'flex-start' },
      'bottomLeading': { justifyContent: 'flex-start', alignItems: 'flex-end' },
      'bottomTrailing': { justifyContent: 'flex-end', alignItems: 'flex-end' }
    };

    return alignmentMap[alignment] || alignmentMap['center'];
  }

  /**
   * Renders the ZStack to a DOM element.
   *
   * @returns {HTMLDivElement} The rendered container element
   * @protected
   */
  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'ZStack';

    // Use CSS Grid for stacking - all children in same cell
    container.style.display = 'grid';
    container.style.gridTemplateAreas = '"stack"';

    // Get alignment CSS
    const alignCSS = this._getAlignmentCSS(this._alignment);
    container.style.justifyItems = alignCSS.justifyContent;
    container.style.alignItems = alignCSS.alignItems;

    // Render and append children
    this._children.forEach((child, index) => {
      let element = null;

      if (child instanceof View) {
        element = child._render();
      } else if (typeof child === 'function') {
        const result = child();
        if (result instanceof View) {
          element = result._render();
        }
      }

      if (element) {
        // Place all children in the same grid cell
        element.style.gridArea = 'stack';
        // Later children render on top (higher z-index)
        element.style.zIndex = String(index);
        container.appendChild(element);
      }
    });

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for creating ZStack views.
 * Provides cleaner syntax without the `new` keyword.
 *
 * @param {Object|View} [options] - Stack options or first child view
 * @param {string} [options.alignment] - Alignment of children ('center', 'top', 'bottom', 'leading', 'trailing', 'topLeading', 'topTrailing', 'bottomLeading', 'bottomTrailing')
 * @param {...View} children - Child views to stack (back to front)
 * @returns {ZStackView} A new ZStack instance
 *
 * @example
 * // Image with gradient overlay
 * ZStack(
 *   Image('hero.jpg')
 *     .resizable()
 *     .aspectRatio('fill'),
 *   LinearGradient(['transparent', 'black'], { direction: 'toBottom' }),
 *   VStack(
 *     Spacer(),
 *     Text('Movie Title').font(Font.largeTitle).foregroundColor('white')
 *   ).padding(20)
 * )
 *
 * // Badge on corner
 * ZStack({ alignment: 'topTrailing' },
 *   Image('product.jpg').frame({ width: 100, height: 100 }),
 *   Text('NEW')
 *     .font(Font.caption)
 *     .padding(4)
 *     .background(Color.red)
 *     .foregroundColor('white')
 *     .cornerRadius(4)
 * )
 */
export function ZStack(options, ...children) {
  return new ZStackView(options, ...children);
}

// Export the class for those who want to extend it
export { ZStackView };

export default ZStack;
