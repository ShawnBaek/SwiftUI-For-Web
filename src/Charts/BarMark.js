/**
 * BarMark - Represents a bar in a bar chart
 * Mirrors Swift Charts BarMark API
 *
 * Usage:
 *   BarMark(
 *     x: .value("Month", item.month),
 *     y: .value("Sales", item.sales)
 *   )
 *   .foregroundStyle(Color.blue)
 *   .cornerRadius(4)
 */

import { Mark } from './Mark.js';

export class BarMark extends Mark {
  /**
   * Create a BarMark
   * @param {Object} options
   * @param {PlottableValue} options.x - X value
   * @param {PlottableValue} options.y - Y value
   * @param {PlottableValue} [options.yStart] - Y start (for ranged bars)
   * @param {PlottableValue} [options.yEnd] - Y end (for ranged bars)
   * @param {PlottableValue} [options.width] - Bar width
   * @param {PlottableValue} [options.height] - Bar height
   * @param {PlottableValue} [options.stacking] - Stacking mode
   */
  constructor(options = {}) {
    super(options);
    this._cornerRadius = 0;
  }

  get markType() {
    return 'BarMark';
  }

  /**
   * Render this bar mark to SVG element
   * @param {Object} context - Rendering context with scales, dimensions
   * @returns {SVGElement}
   */
  render(context) {
    const { xScale, yScale, colorScale, width, height } = context;

    const x = this.x;
    const y = this.y;

    if (!x || !y) return null;

    // Calculate bar position and size
    let barX, barY, barWidth, barHeight;

    if (x.type === 'nominal') {
      // Categorical X axis
      barWidth = xScale.bandwidth ? xScale.bandwidth() : width / 10;
      barX = xScale(x.rawValue);
    } else {
      // Quantitative X axis (horizontal bars)
      barX = Math.min(xScale(0), xScale(x.numericValue));
      barWidth = Math.abs(xScale(x.numericValue) - xScale(0));
    }

    if (y.type === 'nominal') {
      // Categorical Y axis (horizontal bars)
      barHeight = yScale.bandwidth ? yScale.bandwidth() : height / 10;
      barY = yScale(y.rawValue);
    } else {
      // Quantitative Y axis (vertical bars)
      const yVal = y.numericValue;
      barY = yScale(Math.max(0, yVal));
      barHeight = Math.abs(yScale(yVal) - yScale(0));
    }

    // Handle yStart/yEnd for ranged bars
    if (this.yStart && this.yEnd) {
      barY = yScale(this.yEnd.numericValue);
      barHeight = yScale(this.yStart.numericValue) - barY;
    }

    // Get color
    let color = this._foregroundStyle || '#007AFF';
    if (this._foregroundStyleField && colorScale) {
      color = colorScale(this._foregroundStyleField.rawValue);
    }

    // Create rect element
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', barX);
    rect.setAttribute('y', barY);
    rect.setAttribute('width', Math.max(0, barWidth));
    rect.setAttribute('height', Math.max(0, barHeight));
    rect.setAttribute('fill', color);
    rect.setAttribute('opacity', this._opacity);

    if (this._cornerRadius > 0) {
      rect.setAttribute('rx', this._cornerRadius);
      rect.setAttribute('ry', this._cornerRadius);
    }

    return rect;
  }
}

/**
 * Factory function for creating BarMark
 * Matches Swift Charts syntax: BarMark(x: .value(...), y: .value(...))
 */
export function createBarMark(options) {
  return new BarMark(options);
}

export default BarMark;
