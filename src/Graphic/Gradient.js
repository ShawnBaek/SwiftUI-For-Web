/**
 * Gradient - SwiftUI-style gradient components
 *
 * Provides LinearGradient and RadialGradient for creating gradient backgrounds.
 *
 * @example
 * // Basic linear gradient
 * LinearGradient([Color.blue, Color.purple])
 *
 * // With direction
 * LinearGradient([Color.black.opacity(0), Color.black], { direction: 'toBottom' })
 *
 * // With custom stops
 * LinearGradient([
 *   { color: Color.red, location: 0 },
 *   { color: Color.yellow, location: 0.5 },
 *   { color: Color.green, location: 1 }
 * ])
 */

import { View } from '../Core/View.js';

/**
 * Gradient direction presets
 */
export const GradientDirection = {
  toTop: 'to top',
  toBottom: 'to bottom',
  toLeft: 'to left',
  toRight: 'to right',
  toTopLeft: 'to top left',
  toTopRight: 'to top right',
  toBottomLeft: 'to bottom left',
  toBottomRight: 'to bottom right'
};

/**
 * UnitPoint for gradient start/end positions
 */
export const UnitPoint = {
  zero: { x: 0, y: 0 },
  center: { x: 0.5, y: 0.5 },
  top: { x: 0.5, y: 0 },
  bottom: { x: 0.5, y: 1 },
  leading: { x: 0, y: 0.5 },
  trailing: { x: 1, y: 0.5 },
  topLeading: { x: 0, y: 0 },
  topTrailing: { x: 1, y: 0 },
  bottomLeading: { x: 0, y: 1 },
  bottomTrailing: { x: 1, y: 1 }
};

/**
 * Convert a color to CSS color string
 *
 * @param {Object|string} color - Color object or CSS string
 * @returns {string} CSS color string
 * @private
 */
function colorToCSS(color) {
  if (color && typeof color.rgba === 'function') {
    return color.rgba();
  }
  return String(color);
}

/**
 * LinearGradient view class
 * @extends View
 */
class LinearGradientView extends View {
  /**
   * Creates a LinearGradient
   *
   * @param {Array} colors - Array of colors or gradient stops
   * @param {Object} [options] - Gradient options
   * @param {string} [options.direction] - CSS direction (e.g., 'to bottom')
   * @param {Object} [options.startPoint] - Start point { x, y } (0-1)
   * @param {Object} [options.endPoint] - End point { x, y } (0-1)
   */
  constructor(colors, options = {}) {
    super();
    this._colors = colors;
    this._direction = options.direction ?? GradientDirection.toBottom;
    this._startPoint = options.startPoint ?? null;
    this._endPoint = options.endPoint ?? null;
  }

  /**
   * Build CSS gradient string
   *
   * @returns {string} CSS linear-gradient value
   * @private
   */
  _buildGradientCSS() {
    // Build color stops
    const stops = this._colors.map((item, index, arr) => {
      if (typeof item === 'object' && item.color !== undefined) {
        // Gradient stop with explicit location
        const location = item.location !== undefined ? `${item.location * 100}%` : '';
        return `${colorToCSS(item.color)} ${location}`.trim();
      } else {
        // Simple color - distribute evenly
        return colorToCSS(item);
      }
    }).join(', ');

    // Determine direction
    let direction = this._direction;

    // If using start/end points, calculate angle
    if (this._startPoint && this._endPoint) {
      const dx = this._endPoint.x - this._startPoint.x;
      const dy = this._endPoint.y - this._startPoint.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      direction = `${angle}deg`;
    }

    return `linear-gradient(${direction}, ${stops})`;
  }

  /**
   * Renders the gradient to a DOM element
   *
   * @returns {HTMLDivElement} The rendered element
   * @protected
   */
  _render() {
    const el = document.createElement('div');
    el.dataset.view = 'LinearGradient';

    el.style.background = this._buildGradientCSS();
    el.style.width = '100%';
    el.style.height = '100%';

    return this._applyModifiers(el);
  }
}

/**
 * RadialGradient view class
 * @extends View
 */
class RadialGradientView extends View {
  /**
   * Creates a RadialGradient
   *
   * @param {Array} colors - Array of colors or gradient stops
   * @param {Object} [options] - Gradient options
   * @param {Object} [options.center] - Center point { x, y } (0-1)
   * @param {number} [options.startRadius] - Start radius (0-1 of smallest dimension)
   * @param {number} [options.endRadius] - End radius (0-1 of smallest dimension)
   */
  constructor(colors, options = {}) {
    super();
    this._colors = colors;
    this._center = options.center ?? UnitPoint.center;
    this._startRadius = options.startRadius ?? 0;
    this._endRadius = options.endRadius ?? 0.5;
  }

  /**
   * Build CSS gradient string
   *
   * @returns {string} CSS radial-gradient value
   * @private
   */
  _buildGradientCSS() {
    // Build color stops
    const stops = this._colors.map((item) => {
      if (typeof item === 'object' && item.color !== undefined) {
        const location = item.location !== undefined ? `${item.location * 100}%` : '';
        return `${colorToCSS(item.color)} ${location}`.trim();
      }
      return colorToCSS(item);
    }).join(', ');

    const centerX = this._center.x * 100;
    const centerY = this._center.y * 100;

    return `radial-gradient(circle at ${centerX}% ${centerY}%, ${stops})`;
  }

  /**
   * Renders the gradient to a DOM element
   *
   * @returns {HTMLDivElement} The rendered element
   * @protected
   */
  _render() {
    const el = document.createElement('div');
    el.dataset.view = 'RadialGradient';

    el.style.background = this._buildGradientCSS();
    el.style.width = '100%';
    el.style.height = '100%';

    return this._applyModifiers(el);
  }
}

/**
 * AngularGradient (conic gradient) view class
 * @extends View
 */
class AngularGradientView extends View {
  /**
   * Creates an AngularGradient
   *
   * @param {Array} colors - Array of colors or gradient stops
   * @param {Object} [options] - Gradient options
   * @param {Object} [options.center] - Center point { x, y } (0-1)
   * @param {number} [options.startAngle] - Start angle in degrees
   * @param {number} [options.endAngle] - End angle in degrees
   */
  constructor(colors, options = {}) {
    super();
    this._colors = colors;
    this._center = options.center ?? UnitPoint.center;
    this._startAngle = options.startAngle ?? 0;
    this._endAngle = options.endAngle ?? 360;
  }

  /**
   * Build CSS gradient string
   *
   * @returns {string} CSS conic-gradient value
   * @private
   */
  _buildGradientCSS() {
    const stops = this._colors.map((item) => {
      if (typeof item === 'object' && item.color !== undefined) {
        const location = item.location !== undefined ? `${item.location * 100}%` : '';
        return `${colorToCSS(item.color)} ${location}`.trim();
      }
      return colorToCSS(item);
    }).join(', ');

    const centerX = this._center.x * 100;
    const centerY = this._center.y * 100;

    return `conic-gradient(from ${this._startAngle}deg at ${centerX}% ${centerY}%, ${stops})`;
  }

  _render() {
    const el = document.createElement('div');
    el.dataset.view = 'AngularGradient';
    el.style.background = this._buildGradientCSS();
    el.style.width = '100%';
    el.style.height = '100%';
    return this._applyModifiers(el);
  }
}

/**
 * Factory function for LinearGradient
 *
 * @param {Array} colors - Array of Color objects or gradient stops
 * @param {Object} [options] - Gradient options
 * @returns {LinearGradientView} A new LinearGradient instance
 *
 * @example
 * // Simple two-color gradient
 * LinearGradient([Color.blue, Color.purple])
 *
 * // Fade to black (for overlays)
 * LinearGradient([Color.clear, Color.black], { direction: 'toBottom' })
 *
 * // Custom stops
 * LinearGradient([
 *   { color: Color.red, location: 0 },
 *   { color: Color.orange, location: 0.3 },
 *   { color: Color.yellow, location: 1 }
 * ])
 */
export function LinearGradient(colors, options) {
  return new LinearGradientView(colors, options);
}

/**
 * Factory function for RadialGradient
 *
 * @param {Array} colors - Array of Color objects or gradient stops
 * @param {Object} [options] - Gradient options
 * @returns {RadialGradientView} A new RadialGradient instance
 */
export function RadialGradient(colors, options) {
  return new RadialGradientView(colors, options);
}

/**
 * Factory function for AngularGradient
 *
 * @param {Array} colors - Array of Color objects or gradient stops
 * @param {Object} [options] - Gradient options
 * @returns {AngularGradientView} A new AngularGradient instance
 */
export function AngularGradient(colors, options) {
  return new AngularGradientView(colors, options);
}

// Export classes
export { LinearGradientView, RadialGradientView, AngularGradientView };

export default { LinearGradient, RadialGradient, AngularGradient };
