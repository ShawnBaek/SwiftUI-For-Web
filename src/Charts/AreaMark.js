/**
 * AreaMark - Represents a filled area in an area chart
 * Mirrors Swift Charts AreaMark API
 *
 * Usage:
 *   AreaMark(
 *     x: .value("Date", item.date),
 *     y: .value("Value", item.value)
 *   )
 *   .foregroundStyle(Color.blue.opacity(0.3))
 *   .interpolationMethod('monotone')
 */

import { Mark } from './Mark.js';
import { LineMark } from './LineMark.js';

export class AreaMark extends Mark {
  constructor(options = {}) {
    super(options);
    this._interpolationMethod = 'linear';
    this._stacking = 'standard';
    this._opacity = 0.3;
  }

  get markType() {
    return 'AreaMark';
  }

  /**
   * Get point data for area rendering
   * @param {Object} context - Rendering context
   * @returns {Object} Point data
   */
  getPointData(context) {
    const { xScale, yScale } = context;

    const x = this.x;
    const y = this.y;

    if (!x || !y) return null;

    const px = x.type === 'nominal' ? xScale(x.rawValue) + (xScale.bandwidth?.() || 0) / 2 : xScale(x.numericValue);
    const py = y.type === 'nominal' ? yScale(y.rawValue) + (yScale.bandwidth?.() || 0) / 2 : yScale(y.numericValue);

    // For area, we also need the baseline
    const baseline = this.yStart ? yScale(this.yStart.numericValue) : yScale(0);

    return {
      x: px,
      y: py,
      baseline,
      rawX: x.rawValue,
      rawY: y.rawValue,
      color: this._foregroundStyle || '#007AFF',
      series: this._foregroundStyleField?.rawValue,
      interpolation: this._interpolationMethod,
      opacity: this._opacity
    };
  }

  /**
   * Generate SVG path for area from points
   * @param {Array} points - Array of point data
   * @param {string} interpolation - Interpolation method
   * @param {number} baselineY - Y position of baseline
   * @returns {string} SVG path d attribute
   */
  static generateAreaPath(points, interpolation = 'linear', baselineY) {
    if (!points || points.length === 0) return '';

    // Get the line path
    const linePath = LineMark.generatePath(points, interpolation);

    // Close the path to baseline
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const baseline = baselineY ?? points[0].baseline ?? 0;

    return `${linePath} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
  }
}

export function createAreaMark(options) {
  return new AreaMark(options);
}

export default AreaMark;
