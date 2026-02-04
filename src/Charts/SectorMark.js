/**
 * SectorMark - Represents a sector/slice in a pie or donut chart
 * Mirrors Swift Charts SectorMark API
 *
 * Usage:
 *   SectorMark(
 *     angle: .value("Value", item.value),
 *     innerRadius: .ratio(0.5),  // For donut chart
 *     outerRadius: .ratio(1.0)
 *   )
 *   .foregroundStyle(by: .value("Category", item.category))
 */

import { Mark } from './Mark.js';

export class SectorMark extends Mark {
  /**
   * Create a SectorMark
   * @param {Object} options
   * @param {PlottableValue} options.angle - Angular value (determines slice size)
   * @param {Object} [options.innerRadius] - Inner radius config
   * @param {Object} [options.outerRadius] - Outer radius config
   * @param {PlottableValue} [options.angularInset] - Gap between slices
   */
  constructor(options = {}) {
    super(options);
    this.angle = options.angle || null;
    this.innerRadius = options.innerRadius || { ratio: 0 };
    this.outerRadius = options.outerRadius || { ratio: 1 };
    this.angularInset = options.angularInset || 0;
  }

  get markType() {
    return 'SectorMark';
  }

  /**
   * Get the angular value
   * @returns {number}
   */
  getAngleValue() {
    return this.angle ? this.angle.numericValue : 0;
  }

  /**
   * Render sector to SVG path element
   * @param {Object} context - Rendering context with centerX, centerY, radius, startAngle, endAngle
   * @returns {SVGElement}
   */
  render(context) {
    const {
      centerX,
      centerY,
      radius,
      startAngle,
      endAngle,
      colorScale
    } = context;

    // Calculate inner and outer radii
    let innerR, outerR;

    if (this.innerRadius.ratio !== undefined) {
      innerR = radius * this.innerRadius.ratio;
    } else if (this.innerRadius.value !== undefined) {
      innerR = this.innerRadius.value;
    } else {
      innerR = 0;
    }

    if (this.outerRadius.ratio !== undefined) {
      outerR = radius * this.outerRadius.ratio;
    } else if (this.outerRadius.value !== undefined) {
      outerR = this.outerRadius.value;
    } else {
      outerR = radius;
    }

    // Apply angular inset
    const inset = (this.angularInset * Math.PI) / 180;
    const actualStartAngle = startAngle + inset / 2;
    const actualEndAngle = endAngle - inset / 2;

    // Get color
    let color = this._foregroundStyle || '#007AFF';
    if (this._foregroundStyleField && colorScale) {
      color = colorScale(this._foregroundStyleField.rawValue);
    }

    // Generate arc path
    const path = this._generateArcPath(
      centerX,
      centerY,
      innerR,
      outerR,
      actualStartAngle,
      actualEndAngle
    );

    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.setAttribute('d', path);
    pathElement.setAttribute('fill', color);
    pathElement.setAttribute('opacity', this._opacity);

    if (this._cornerRadius > 0) {
      // Add subtle stroke for rounded effect
      pathElement.setAttribute('stroke', color);
      pathElement.setAttribute('stroke-width', '1');
      pathElement.setAttribute('stroke-linejoin', 'round');
    }

    return pathElement;
  }

  /**
   * Generate SVG arc path
   * @private
   */
  _generateArcPath(cx, cy, innerRadius, outerRadius, startAngle, endAngle) {
    // Convert to x, y coordinates
    const startOuter = this._polarToCartesian(cx, cy, outerRadius, startAngle);
    const endOuter = this._polarToCartesian(cx, cy, outerRadius, endAngle);
    const startInner = this._polarToCartesian(cx, cy, innerRadius, startAngle);
    const endInner = this._polarToCartesian(cx, cy, innerRadius, endAngle);

    // Determine if arc should be large (> 180 degrees)
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

    if (innerRadius === 0) {
      // Pie slice (triangle with curved edge)
      return [
        `M ${cx} ${cy}`,
        `L ${startOuter.x} ${startOuter.y}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
        'Z'
      ].join(' ');
    } else {
      // Donut slice (arc)
      return [
        `M ${startOuter.x} ${startOuter.y}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
        `L ${endInner.x} ${endInner.y}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInner.x} ${startInner.y}`,
        'Z'
      ].join(' ');
    }
  }

  /**
   * Convert polar coordinates to cartesian
   * @private
   */
  _polarToCartesian(cx, cy, radius, angle) {
    return {
      x: cx + radius * Math.cos(angle - Math.PI / 2),
      y: cy + radius * Math.sin(angle - Math.PI / 2)
    };
  }
}

/**
 * Helper for creating inner/outer radius configs
 */
export const MarkDimension = {
  ratio: (value) => ({ ratio: value }),
  fixed: (value) => ({ value: value }),
  inset: (value) => ({ inset: value })
};

export function createSectorMark(options) {
  return new SectorMark(options);
}

export default SectorMark;
