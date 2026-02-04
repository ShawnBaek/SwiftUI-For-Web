/**
 * LineMark - Represents a line in a line chart
 * Mirrors Swift Charts LineMark API
 *
 * Usage:
 *   LineMark(
 *     x: .value("Date", item.date),
 *     y: .value("Value", item.value)
 *   )
 *   .foregroundStyle(Color.blue)
 *   .lineStyle({ lineWidth: 2 })
 *   .interpolationMethod('catmullRom')
 */

import { Mark } from './Mark.js';

export class LineMark extends Mark {
  constructor(options = {}) {
    super(options);
    this._lineStyle = { lineWidth: 2, lineCap: 'round', lineJoin: 'round' };
    this._interpolationMethod = 'linear';
  }

  get markType() {
    return 'LineMark';
  }

  /**
   * Render line segment (single point - actual line is drawn by Chart)
   * @param {Object} context - Rendering context
   * @returns {Object} Point data for line rendering
   */
  getPointData(context) {
    const { xScale, yScale } = context;

    const x = this.x;
    const y = this.y;

    if (!x || !y) return null;

    const px = x.type === 'nominal' ? xScale(x.rawValue) + (xScale.bandwidth?.() || 0) / 2 : xScale(x.numericValue);
    const py = y.type === 'nominal' ? yScale(y.rawValue) + (yScale.bandwidth?.() || 0) / 2 : yScale(y.numericValue);

    return {
      x: px,
      y: py,
      rawX: x.rawValue,
      rawY: y.rawValue,
      color: this._foregroundStyle || '#007AFF',
      series: this._foregroundStyleField?.rawValue,
      lineStyle: this._lineStyle,
      interpolation: this._interpolationMethod
    };
  }

  /**
   * Generate SVG path from points
   * @param {Array} points - Array of point data
   * @param {string} interpolation - Interpolation method
   * @returns {string} SVG path d attribute
   */
  static generatePath(points, interpolation = 'linear') {
    if (!points || points.length === 0) return '';

    switch (interpolation) {
      case 'catmullRom':
        return LineMark._catmullRomPath(points);
      case 'monotone':
        return LineMark._monotonePath(points);
      case 'step':
        return LineMark._stepPath(points, 0.5);
      case 'stepStart':
        return LineMark._stepPath(points, 0);
      case 'stepEnd':
        return LineMark._stepPath(points, 1);
      case 'linear':
      default:
        return LineMark._linearPath(points);
    }
  }

  static _linearPath(points) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  static _stepPath(points, position = 0.5) {
    if (points.length < 2) return LineMark._linearPath(points);

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = prev.x + (curr.x - prev.x) * position;

      if (position === 0) {
        path += ` V ${curr.y} H ${curr.x}`;
      } else if (position === 1) {
        path += ` H ${curr.x} V ${curr.y}`;
      } else {
        path += ` H ${midX} V ${curr.y} H ${curr.x}`;
      }
    }
    return path;
  }

  static _catmullRomPath(points, tension = 0.5) {
    if (points.length < 2) return LineMark._linearPath(points);
    if (points.length === 2) return LineMark._linearPath(points);

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
      const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
      const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
      const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  }

  static _monotonePath(points) {
    if (points.length < 2) return LineMark._linearPath(points);

    // Compute tangents using finite differences
    const tangents = [];
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        tangents.push((points[1].y - points[0].y) / (points[1].x - points[0].x || 1));
      } else if (i === points.length - 1) {
        tangents.push((points[i].y - points[i - 1].y) / (points[i].x - points[i - 1].x || 1));
      } else {
        const d1 = (points[i].y - points[i - 1].y) / (points[i].x - points[i - 1].x || 1);
        const d2 = (points[i + 1].y - points[i].y) / (points[i + 1].x - points[i].x || 1);
        tangents.push((d1 + d2) / 2);
      }
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const cp1x = p1.x + dx / 3;
      const cp1y = p1.y + tangents[i] * dx / 3;
      const cp2x = p2.x - dx / 3;
      const cp2y = p2.y - tangents[i + 1] * dx / 3;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  }
}

export function createLineMark(options) {
  return new LineMark(options);
}

export default LineMark;
