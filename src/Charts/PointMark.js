/**
 * PointMark - Represents a point/dot in a scatter or point chart
 * Mirrors Swift Charts PointMark API
 *
 * Usage:
 *   PointMark(
 *     x: .value("X", item.x),
 *     y: .value("Y", item.y)
 *   )
 *   .symbol('circle')
 *   .symbolSize(100)
 */

import { Mark } from './Mark.js';

export class PointMark extends Mark {
  constructor(options = {}) {
    super(options);
    this._symbol = 'circle';
    this._symbolSize = 64; // Area in points squared
  }

  get markType() {
    return 'PointMark';
  }

  /**
   * Render point mark to SVG element
   * @param {Object} context - Rendering context
   * @returns {SVGElement}
   */
  render(context) {
    const { xScale, yScale, colorScale } = context;

    const x = this.x;
    const y = this.y;

    if (!x || !y) return null;

    // Calculate position
    const px = x.type === 'nominal'
      ? xScale(x.rawValue) + (xScale.bandwidth?.() || 0) / 2
      : xScale(x.numericValue);
    const py = y.type === 'nominal'
      ? yScale(y.rawValue) + (yScale.bandwidth?.() || 0) / 2
      : yScale(y.numericValue);

    // Get color
    let color = this._foregroundStyle || '#007AFF';
    if (this._foregroundStyleField && colorScale) {
      color = colorScale(this._foregroundStyleField.rawValue);
    }

    // Calculate symbol size (area to radius)
    const radius = Math.sqrt(this._symbolSize / Math.PI);

    // Create symbol element
    const symbol = this._createSymbol(this._symbol, px, py, radius, color);
    symbol.setAttribute('opacity', this._opacity);

    return symbol;
  }

  /**
   * Create SVG symbol element
   * @private
   */
  _createSymbol(type, cx, cy, r, fill) {
    const ns = 'http://www.w3.org/2000/svg';

    switch (type) {
      case 'circle':
        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', r);
        circle.setAttribute('fill', fill);
        return circle;

      case 'square':
        const rect = document.createElementNS(ns, 'rect');
        const size = r * 2;
        rect.setAttribute('x', cx - r);
        rect.setAttribute('y', cy - r);
        rect.setAttribute('width', size);
        rect.setAttribute('height', size);
        rect.setAttribute('fill', fill);
        return rect;

      case 'triangle':
        const tri = document.createElementNS(ns, 'polygon');
        const triPoints = [
          `${cx},${cy - r * 1.2}`,
          `${cx - r},${cy + r * 0.7}`,
          `${cx + r},${cy + r * 0.7}`
        ].join(' ');
        tri.setAttribute('points', triPoints);
        tri.setAttribute('fill', fill);
        return tri;

      case 'diamond':
        const diamond = document.createElementNS(ns, 'polygon');
        const dPoints = [
          `${cx},${cy - r * 1.2}`,
          `${cx + r},${cy}`,
          `${cx},${cy + r * 1.2}`,
          `${cx - r},${cy}`
        ].join(' ');
        diamond.setAttribute('points', dPoints);
        diamond.setAttribute('fill', fill);
        return diamond;

      case 'cross':
        const cross = document.createElementNS(ns, 'path');
        const w = r * 0.4;
        cross.setAttribute('d', `
          M ${cx - w} ${cy - r} L ${cx + w} ${cy - r} L ${cx + w} ${cy - w}
          L ${cx + r} ${cy - w} L ${cx + r} ${cy + w} L ${cx + w} ${cy + w}
          L ${cx + w} ${cy + r} L ${cx - w} ${cy + r} L ${cx - w} ${cy + w}
          L ${cx - r} ${cy + w} L ${cx - r} ${cy - w} L ${cx - w} ${cy - w} Z
        `);
        cross.setAttribute('fill', fill);
        return cross;

      case 'plus':
        const plus = document.createElementNS(ns, 'path');
        const pw = r * 0.3;
        plus.setAttribute('d', `
          M ${cx - pw} ${cy - r} L ${cx + pw} ${cy - r} L ${cx + pw} ${cy - pw}
          L ${cx + r} ${cy - pw} L ${cx + r} ${cy + pw} L ${cx + pw} ${cy + pw}
          L ${cx + pw} ${cy + r} L ${cx - pw} ${cy + r} L ${cx - pw} ${cy + pw}
          L ${cx - r} ${cy + pw} L ${cx - r} ${cy - pw} L ${cx - pw} ${cy - pw} Z
        `);
        plus.setAttribute('fill', fill);
        return plus;

      case 'star':
        const star = document.createElementNS(ns, 'polygon');
        const points = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i * 36 - 90) * Math.PI / 180;
          const rad = i % 2 === 0 ? r * 1.2 : r * 0.5;
          points.push(`${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`);
        }
        star.setAttribute('points', points.join(' '));
        star.setAttribute('fill', fill);
        return star;

      default:
        // Default to circle
        const def = document.createElementNS(ns, 'circle');
        def.setAttribute('cx', cx);
        def.setAttribute('cy', cy);
        def.setAttribute('r', r);
        def.setAttribute('fill', fill);
        return def;
    }
  }
}

export function createPointMark(options) {
  return new PointMark(options);
}

export default PointMark;
