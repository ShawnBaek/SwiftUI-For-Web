/**
 * Spacer - A flexible space that expands along the major axis of its parent.
 *
 * Matches SwiftUI's Spacer for flexible layout spacing.
 *
 * @example
 * // Push content to edges
 * HStack(
 *   Text('Left'),
 *   Spacer(),
 *   Text('Right')
 * )
 *
 * // Push content to bottom
 * VStack(
 *   Text('Top'),
 *   Spacer(),
 *   Text('Bottom')
 * )
 *
 * // With minimum length
 * Spacer({ minLength: 20 })
 */

import { View } from '../Core/View.js';

/**
 * Spacer view class implementation.
 * @extends View
 */
class SpacerView extends View {
  /**
   * Creates a new Spacer.
   *
   * @param {Object} [options] - Spacer options
   * @param {number} [options.minLength] - Minimum length in pixels
   */
  constructor(options = {}) {
    super();
    this._minLength = options.minLength ?? null;
  }

  /**
   * Spacer returns itself as the body (leaf view).
   *
   * @returns {SpacerView} Returns this
   */
  body() {
    return this;
  }

  /**
   * Renders the Spacer to a DOM element.
   *
   * @returns {HTMLDivElement} The rendered spacer element
   * @protected
   */
  _render() {
    const spacer = document.createElement('div');
    spacer.dataset.view = 'Spacer';

    // Flex grow to take available space
    spacer.style.flexGrow = '1';
    spacer.style.flexShrink = '1';
    spacer.style.flexBasis = '0';

    // Apply minimum length if specified
    if (this._minLength !== null) {
      spacer.style.minWidth = `${this._minLength}px`;
      spacer.style.minHeight = `${this._minLength}px`;
    }

    return this._applyModifiers(spacer);
  }
}

/**
 * Factory function for creating Spacer views.
 * Provides cleaner syntax without the `new` keyword.
 *
 * @param {Object} [options] - Spacer options
 * @param {number} [options.minLength] - Minimum length in pixels
 * @returns {SpacerView} A new Spacer instance
 *
 * @example
 * // Default spacer
 * Spacer()
 *
 * // With minimum length
 * Spacer({ minLength: 16 })
 */
export function Spacer(options) {
  return new SpacerView(options);
}

// Export the class for those who want to extend it
export { SpacerView };

export default Spacer;
