/**
 * Shape - Base class for all shape primitives in SwiftUI-For-Web
 *
 * Matches SwiftUI's Shape protocol where shapes can be used as views
 * and support fill, stroke, and other shape-specific modifiers.
 *
 * @example
 * Rectangle()
 *   .fill(Color.blue)
 *   .frame({ width: 100, height: 50 })
 *
 * Circle()
 *   .stroke(Color.red, { lineWidth: 2 })
 *   .frame({ width: 100, height: 100 })
 */

import { View } from '../Core/View.js';
import { Color } from '../Graphic/Color.js';

/**
 * Base Shape class - all shape primitives extend this
 */
export class ShapeView extends View {
  constructor() {
    super();
    this._fillColor = null;
    this._strokeColor = null;
    this._strokeWidth = 0;
    this._strokeStyle = 'solid';
  }

  /**
   * Fill the shape with a color
   * @param {Object|string} color - Color to fill with
   * @returns {ShapeView} Returns this for chaining
   */
  fill(color) {
    this._fillColor = color;
    return this;
  }

  /**
   * Stroke the shape outline
   * @param {Object|string} color - Stroke color
   * @param {Object} [options] - Stroke options
   * @param {number} [options.lineWidth=1] - Line width
   * @param {string} [options.style='solid'] - Line style (solid, dashed, dotted)
   * @returns {ShapeView} Returns this for chaining
   */
  stroke(color, options = {}) {
    this._strokeColor = color;
    this._strokeWidth = options.lineWidth ?? 1;
    this._strokeStyle = options.style ?? 'solid';
    return this;
  }

  /**
   * Get CSS color value from color object or string
   * @protected
   */
  _getColorValue(color) {
    if (!color) return 'transparent';
    if (typeof color.rgba === 'function') return color.rgba();
    if (typeof color.css === 'function') return color.css();
    return String(color);
  }

  /**
   * Apply fill and stroke styles to element
   * @protected
   */
  _applyShapeStyles(element) {
    if (this._fillColor) {
      element.style.backgroundColor = this._getColorValue(this._fillColor);
    }

    if (this._strokeColor && this._strokeWidth > 0) {
      element.style.border = `${this._strokeWidth}px ${this._strokeStyle} ${this._getColorValue(this._strokeColor)}`;
    }
  }
}

/**
 * Rectangle - A rectangular shape
 *
 * @example
 * Rectangle()
 *   .fill(Color.blue)
 *   .frame({ width: 100, height: 50 })
 */
export class RectangleView extends ShapeView {
  constructor() {
    super();
  }

  _render() {
    const el = document.createElement('div');
    el.dataset.shape = 'rectangle';
    this._applyShapeStyles(el);
    return this._applyModifiers(el);
  }
}

/**
 * Factory function for Rectangle
 */
export function Rectangle() {
  return new RectangleView();
}

/**
 * RoundedRectangle - A rectangle with rounded corners
 *
 * @example
 * RoundedRectangle({ cornerRadius: 10 })
 *   .fill(Color.green)
 *   .frame({ width: 100, height: 50 })
 */
export class RoundedRectangleView extends ShapeView {
  constructor(options = {}) {
    super();
    if (typeof options === 'number') {
      this._cornerRadius = options;
      this._cornerStyle = 'circular';
    } else {
      this._cornerRadius = options.cornerRadius ?? 10;
      this._cornerStyle = options.style ?? 'circular'; // 'circular' or 'continuous'
    }
  }

  _render() {
    const el = document.createElement('div');
    el.dataset.shape = 'rounded-rectangle';

    // Apply corner radius
    el.style.borderRadius = `${this._cornerRadius}px`;

    this._applyShapeStyles(el);
    return this._applyModifiers(el);
  }
}

/**
 * Factory function for RoundedRectangle
 * @param {number|Object} options - Corner radius or options object
 */
export function RoundedRectangle(options = {}) {
  return new RoundedRectangleView(options);
}

/**
 * Circle - A circular shape
 *
 * @example
 * Circle()
 *   .fill(Color.red)
 *   .frame({ width: 100, height: 100 })
 */
export class CircleView extends ShapeView {
  constructor() {
    super();
  }

  _render() {
    const el = document.createElement('div');
    el.dataset.shape = 'circle';
    el.style.borderRadius = '50%';
    el.style.aspectRatio = '1';

    this._applyShapeStyles(el);
    return this._applyModifiers(el);
  }
}

/**
 * Factory function for Circle
 */
export function Circle() {
  return new CircleView();
}

/**
 * Ellipse - An elliptical shape
 *
 * @example
 * Ellipse()
 *   .fill(Color.purple)
 *   .frame({ width: 150, height: 100 })
 */
export class EllipseView extends ShapeView {
  constructor() {
    super();
  }

  _render() {
    const el = document.createElement('div');
    el.dataset.shape = 'ellipse';
    el.style.borderRadius = '50%';

    this._applyShapeStyles(el);
    return this._applyModifiers(el);
  }
}

/**
 * Factory function for Ellipse
 */
export function Ellipse() {
  return new EllipseView();
}

/**
 * Capsule - A pill-shaped view (rectangle with fully rounded ends)
 *
 * @example
 * Capsule()
 *   .fill(Color.orange)
 *   .frame({ width: 150, height: 50 })
 */
export class CapsuleView extends ShapeView {
  constructor() {
    super();
  }

  _render() {
    const el = document.createElement('div');
    el.dataset.shape = 'capsule';
    el.style.borderRadius = '9999px'; // Very large value creates pill shape

    this._applyShapeStyles(el);
    return this._applyModifiers(el);
  }
}

/**
 * Factory function for Capsule
 */
export function Capsule() {
  return new CapsuleView();
}

/**
 * Path - Custom shape using SVG path commands
 *
 * @example
 * Path((path) => {
 *   path.move(to: { x: 0, y: 0 });
 *   path.addLine(to: { x: 100, y: 0 });
 *   path.addLine(to: { x: 50, y: 100 });
 *   path.closeSubpath();
 * })
 *   .fill(Color.yellow)
 */
export class PathView extends ShapeView {
  constructor(builder) {
    super();
    this._pathCommands = [];
    this._builder = builder;

    // Build the path
    if (typeof builder === 'function') {
      builder(this);
    }
  }

  /**
   * Move to a point
   * @param {Object} point - {x, y} coordinates
   */
  move(point) {
    this._pathCommands.push(`M ${point.x} ${point.y}`);
    return this;
  }

  /**
   * Add a line to a point
   * @param {Object} point - {x, y} coordinates
   */
  addLine(point) {
    this._pathCommands.push(`L ${point.x} ${point.y}`);
    return this;
  }

  /**
   * Add a quadratic curve
   * @param {Object} control - Control point {x, y}
   * @param {Object} end - End point {x, y}
   */
  addQuadCurve(control, end) {
    this._pathCommands.push(`Q ${control.x} ${control.y} ${end.x} ${end.y}`);
    return this;
  }

  /**
   * Add a cubic bezier curve
   * @param {Object} control1 - First control point
   * @param {Object} control2 - Second control point
   * @param {Object} end - End point
   */
  addCurve(control1, control2, end) {
    this._pathCommands.push(`C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${end.x} ${end.y}`);
    return this;
  }

  /**
   * Add an arc
   * @param {Object} center - Center point
   * @param {number} radius - Arc radius
   * @param {number} startAngle - Start angle in radians
   * @param {number} endAngle - End angle in radians
   * @param {boolean} clockwise - Direction
   */
  addArc(center, radius, startAngle, endAngle, clockwise = true) {
    const startX = center.x + radius * Math.cos(startAngle);
    const startY = center.y + radius * Math.sin(startAngle);
    const endX = center.x + radius * Math.cos(endAngle);
    const endY = center.y + radius * Math.sin(endAngle);

    const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
    const sweep = clockwise ? 1 : 0;

    this._pathCommands.push(`M ${startX} ${startY}`);
    this._pathCommands.push(`A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`);
    return this;
  }

  /**
   * Close the current subpath
   */
  closeSubpath() {
    this._pathCommands.push('Z');
    return this;
  }

  _render() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('data-shape', 'path');
    svg.style.display = 'block';
    svg.style.overflow = 'visible';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', this._pathCommands.join(' '));

    // Apply fill
    if (this._fillColor) {
      path.setAttribute('fill', this._getColorValue(this._fillColor));
    } else {
      path.setAttribute('fill', 'none');
    }

    // Apply stroke
    if (this._strokeColor && this._strokeWidth > 0) {
      path.setAttribute('stroke', this._getColorValue(this._strokeColor));
      path.setAttribute('stroke-width', String(this._strokeWidth));
      if (this._strokeStyle === 'dashed') {
        path.setAttribute('stroke-dasharray', '5,5');
      } else if (this._strokeStyle === 'dotted') {
        path.setAttribute('stroke-dasharray', '2,2');
      }
    }

    svg.appendChild(path);

    return this._applyModifiers(svg);
  }
}

/**
 * Factory function for Path
 * @param {Function} builder - Path builder function
 */
export function Path(builder) {
  return new PathView(builder);
}

/**
 * UnevenRoundedRectangle - Rectangle with different corner radii
 *
 * @example
 * UnevenRoundedRectangle({
 *   topLeading: 20,
 *   topTrailing: 10,
 *   bottomLeading: 5,
 *   bottomTrailing: 15
 * })
 *   .fill(Color.blue)
 */
export class UnevenRoundedRectangleView extends ShapeView {
  constructor(options = {}) {
    super();
    this._topLeading = options.topLeading ?? 0;
    this._topTrailing = options.topTrailing ?? 0;
    this._bottomLeading = options.bottomLeading ?? 0;
    this._bottomTrailing = options.bottomTrailing ?? 0;
  }

  _render() {
    const el = document.createElement('div');
    el.dataset.shape = 'uneven-rounded-rectangle';

    // CSS border-radius: top-left top-right bottom-right bottom-left
    el.style.borderRadius = `${this._topLeading}px ${this._topTrailing}px ${this._bottomTrailing}px ${this._bottomLeading}px`;

    this._applyShapeStyles(el);
    return this._applyModifiers(el);
  }
}

/**
 * Factory function for UnevenRoundedRectangle
 */
export function UnevenRoundedRectangle(options = {}) {
  return new UnevenRoundedRectangleView(options);
}

export default {
  Rectangle,
  RoundedRectangle,
  Circle,
  Ellipse,
  Capsule,
  Path,
  UnevenRoundedRectangle
};
