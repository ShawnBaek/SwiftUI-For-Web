/**
 * RectangleMark - Represents a rectangle region in a chart
 * Mirrors Swift Charts RectangleMark API
 *
 * Usage:
 *   RectangleMark(
 *     xStart: .value("X1", x1),
 *     xEnd: .value("X2", x2),
 *     yStart: .value("Y1", y1),
 *     yEnd: .value("Y2", y2)
 *   )
 *   .foregroundStyle(Color.blue.opacity(0.2))
 */

import { Mark } from './Mark.js';

export class RectangleMark extends Mark {
  constructor(options = {}) {
    super(options);
    this._opacity = 0.3;
  }

  get markType() {
    return 'RectangleMark';
  }

  /**
   * Render rectangle mark to SVG element
   * @param {Object} context - Rendering context
   * @returns {SVGElement}
   */
  render(context) {
    const { xScale, yScale, width, height } = context;

    let x, y, w, h;

    // Calculate rectangle bounds
    if (this.xStart && this.xEnd) {
      const x1 = this.xStart.type === 'nominal'
        ? xScale(this.xStart.rawValue)
        : xScale(this.xStart.numericValue);
      const x2 = this.xEnd.type === 'nominal'
        ? xScale(this.xEnd.rawValue) + (xScale.bandwidth?.() || 0)
        : xScale(this.xEnd.numericValue);
      x = Math.min(x1, x2);
      w = Math.abs(x2 - x1);
    } else if (this.x) {
      x = this.x.type === 'nominal'
        ? xScale(this.x.rawValue)
        : xScale(this.x.numericValue);
      w = xScale.bandwidth?.() || 10;
    } else {
      x = 0;
      w = width;
    }

    if (this.yStart && this.yEnd) {
      const y1 = this.yStart.type === 'nominal'
        ? yScale(this.yStart.rawValue)
        : yScale(this.yStart.numericValue);
      const y2 = this.yEnd.type === 'nominal'
        ? yScale(this.yEnd.rawValue) + (yScale.bandwidth?.() || 0)
        : yScale(this.yEnd.numericValue);
      y = Math.min(y1, y2);
      h = Math.abs(y2 - y1);
    } else if (this.y) {
      y = this.y.type === 'nominal'
        ? yScale(this.y.rawValue)
        : yScale(this.y.numericValue);
      h = yScale.bandwidth?.() || 10;
    } else {
      y = 0;
      h = height;
    }

    // Get color
    const color = this._foregroundStyle || '#007AFF';

    // Create rect element
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', Math.max(0, w));
    rect.setAttribute('height', Math.max(0, h));
    rect.setAttribute('fill', color);
    rect.setAttribute('opacity', this._opacity);

    if (this._cornerRadius > 0) {
      rect.setAttribute('rx', this._cornerRadius);
      rect.setAttribute('ry', this._cornerRadius);
    }

    return rect;
  }
}

export function createRectangleMark(options) {
  return new RectangleMark(options);
}

export default RectangleMark;
