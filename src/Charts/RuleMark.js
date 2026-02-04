/**
 * RuleMark - Represents a horizontal or vertical line/rule
 * Mirrors Swift Charts RuleMark API
 *
 * Usage:
 *   RuleMark(y: .value("Threshold", 100))  // Horizontal line
 *   RuleMark(x: .value("Date", targetDate)) // Vertical line
 *   RuleMark(
 *     xStart: .value("Start", start),
 *     xEnd: .value("End", end),
 *     y: .value("Y", yPos)
 *   )
 */

import { Mark } from './Mark.js';

export class RuleMark extends Mark {
  constructor(options = {}) {
    super(options);
    this._lineStyle = { lineWidth: 1, dash: null };
  }

  get markType() {
    return 'RuleMark';
  }

  /**
   * Render rule mark to SVG element
   * @param {Object} context - Rendering context
   * @returns {SVGElement}
   */
  render(context) {
    const { xScale, yScale, width, height } = context;

    let x1, y1, x2, y2;

    // Determine line orientation and position
    if (this.x && !this.y) {
      // Vertical line at X
      const xPos = this.x.type === 'nominal'
        ? xScale(this.x.rawValue) + (xScale.bandwidth?.() || 0) / 2
        : xScale(this.x.numericValue);
      x1 = x2 = xPos;
      y1 = 0;
      y2 = height;
    } else if (this.y && !this.x) {
      // Horizontal line at Y
      const yPos = this.y.type === 'nominal'
        ? yScale(this.y.rawValue) + (yScale.bandwidth?.() || 0) / 2
        : yScale(this.y.numericValue);
      y1 = y2 = yPos;
      x1 = 0;
      x2 = width;
    } else if (this.xStart && this.xEnd && this.y) {
      // Horizontal segment
      x1 = this.xStart.type === 'nominal'
        ? xScale(this.xStart.rawValue)
        : xScale(this.xStart.numericValue);
      x2 = this.xEnd.type === 'nominal'
        ? xScale(this.xEnd.rawValue) + (xScale.bandwidth?.() || 0)
        : xScale(this.xEnd.numericValue);
      y1 = y2 = this.y.type === 'nominal'
        ? yScale(this.y.rawValue) + (yScale.bandwidth?.() || 0) / 2
        : yScale(this.y.numericValue);
    } else if (this.yStart && this.yEnd && this.x) {
      // Vertical segment
      y1 = this.yStart.type === 'nominal'
        ? yScale(this.yStart.rawValue)
        : yScale(this.yStart.numericValue);
      y2 = this.yEnd.type === 'nominal'
        ? yScale(this.yEnd.rawValue) + (yScale.bandwidth?.() || 0)
        : yScale(this.yEnd.numericValue);
      x1 = x2 = this.x.type === 'nominal'
        ? xScale(this.x.rawValue) + (xScale.bandwidth?.() || 0) / 2
        : xScale(this.x.numericValue);
    } else {
      return null;
    }

    // Get color
    const color = this._foregroundStyle || '#999999';

    // Create line element
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', this._lineStyle.lineWidth || 1);
    line.setAttribute('opacity', this._opacity);

    if (this._lineStyle.dash) {
      line.setAttribute('stroke-dasharray', this._lineStyle.dash);
    }

    return line;
  }
}

export function createRuleMark(options) {
  return new RuleMark(options);
}

export default RuleMark;
