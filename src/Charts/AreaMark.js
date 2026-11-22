/**
 * AreaMark - a point on a filled area (Swift Charts AreaMark). Chart fills
 * each series down to the zero baseline.
 *
 *   AreaMark({ x: value('Date', item.date), y: value('Value', item.value) })
 *     .interpolationMethod('monotone')
 */

import { mark } from './Mark.js';
import { linePath } from './LineMark.js';

/**
 * @param {Object} options - x and y
 * @returns {Object} Chainable mark descriptor
 */
export function AreaMark(options) {
  return mark('AreaMark', options, { opacity: 0.3 });
}

/** The SVG path of an area: the line through the points, closed at `baseline`. */
export function areaPath(points, interpolation, baseline) {
  if (!points || points.length === 0) return '';
  return `${linePath(points, interpolation)} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
}
