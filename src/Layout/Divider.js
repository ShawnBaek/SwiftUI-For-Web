/**
 * Divider - A visual separator between views
 *
 * Matches SwiftUI's Divider view that creates a horizontal or vertical line.
 *
 * @example
 * VStack(
 *   Text('Item 1'),
 *   Divider(),
 *   Text('Item 2')
 * )
 */

import { View } from '../Core/View.js';
import { Color } from '../Graphic/Color.js';

/**
 * Divider view class
 */
export class DividerView extends View {
  constructor() {
    super();
    this._orientation = 'horizontal';
    this._color = null;
    this._thickness = 1;
  }

  /**
   * Set the orientation (for use inside HStack/VStack)
   * In VStack, divider is horizontal. In HStack, divider is vertical.
   * @private
   */
  _setOrientation(orientation) {
    this._orientation = orientation;
    return this;
  }

  _render() {
    const el = document.createElement('hr');
    el.dataset.view = 'divider';

    // Reset default hr styles
    el.style.margin = '0';
    el.style.padding = '0';
    el.style.border = 'none';

    if (this._orientation === 'horizontal') {
      el.style.width = '100%';
      el.style.height = `${this._thickness}px`;
      el.style.backgroundColor = this._color
        ? (typeof this._color.rgba === 'function' ? this._color.rgba() : this._color)
        : 'rgba(60, 60, 67, 0.3)'; // SwiftUI default separator color
    } else {
      el.style.width = `${this._thickness}px`;
      el.style.height = '100%';
      el.style.minHeight = '1px';
      el.style.backgroundColor = this._color
        ? (typeof this._color.rgba === 'function' ? this._color.rgba() : this._color)
        : 'rgba(60, 60, 67, 0.3)';
    }

    return this._applyModifiers(el);
  }
}

/**
 * Factory function for Divider
 */
export function Divider() {
  return new DividerView();
}

export default Divider;
