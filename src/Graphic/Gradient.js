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

import { createDescriptor } from '../Core/ViewDescriptor.js';
import { chainable } from '../Core/Chainable.js';
import { registerRenderer } from '../Core/Renderer.js';

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
  return color && typeof color.rgba === 'function' ? color.rgba() : String(color);
}

// Color stops: plain colors spread evenly, or { color, location } stops.
function stopsCSS(colors) {
  return colors.map((item) => {
    if (typeof item === 'object' && item.color !== undefined) {
      const location = item.location !== undefined ? `${item.location * 100}%` : '';
      return `${colorToCSS(item.color)} ${location}`.trim();
    }
    return colorToCSS(item);
  }).join(', ');
}

// A gradient is a view (it fills its frame) and a fill: css() is its CSS
// image, read by Shape.fill and .mask.
function gradient(type, css) {
  return chainable(createDescriptor(type, { css }), () => ({ css: () => css }));
}

/**
 * LinearGradient(colors, { direction | startPoint, endPoint })
 *
 * @param {Array} colors - Colors or { color, location } stops
 * @param {Object} [options]
 * @param {string} [options.direction='to bottom'] - CSS direction or a GradientDirection key
 * @param {{x: number, y: number}} [options.startPoint] - UnitPoint
 * @param {{x: number, y: number}} [options.endPoint] - UnitPoint
 */
export function LinearGradient(colors, options = {}) {
  const { startPoint, endPoint } = options;
  let direction = options.direction ?? GradientDirection.toBottom;
  if (startPoint && endPoint) {
    const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x) * (180 / Math.PI) + 90;
    direction = `${angle}deg`;
  } else if (GradientDirection[direction]) {
    // An enum key ('toRight') becomes its CSS value ('to right').
    direction = GradientDirection[direction];
  }
  return gradient('LinearGradient', `linear-gradient(${direction}, ${stopsCSS(colors)})`);
}

/**
 * RadialGradient(colors, { center })
 */
export function RadialGradient(colors, options = {}) {
  const center = options.center ?? UnitPoint.center;
  return gradient('RadialGradient', `radial-gradient(circle at ${center.x * 100}% ${center.y * 100}%, ${stopsCSS(colors)})`);
}

/**
 * AngularGradient(colors, { center, startAngle })
 */
export function AngularGradient(colors, options = {}) {
  const center = options.center ?? UnitPoint.center;
  return gradient('AngularGradient', `conic-gradient(from ${options.startAngle ?? 0}deg at ${center.x * 100}% ${center.y * 100}%, ${stopsCSS(colors)})`);
}

for (const type of ['LinearGradient', 'RadialGradient', 'AngularGradient']) {
  registerRenderer(type, (props) => {
    const el = document.createElement('div');
    el.dataset.view = type;
    el.style.background = props.css;
    el.style.width = '100%';
    el.style.height = '100%';
    return el;
  });
}

export default { LinearGradient, RadialGradient, AngularGradient };
