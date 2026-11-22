/**
 * RectangleMark - a rectangular region (Swift Charts RectangleMark).
 *
 *   RectangleMark({ xStart, xEnd, yStart, yEnd }).foregroundStyle(Color.blue)
 */

import { mark, svg, position } from './Mark.js';

/**
 * @param {Object} options - xStart/xEnd or x, yStart/yEnd or y
 * @returns {Object} Chainable mark descriptor
 */
export function RectangleMark(options) {
  return mark('RectangleMark', options, { opacity: 0.3 });
}

// The start and size of the rectangle along one axis.
function span(start, end, single, scale, whole) {
  if (start && end) {
    const a = position(start, scale, 0);
    const b = position(end, scale, 1);
    return [Math.min(a, b), Math.abs(b - a)];
  }
  if (single) return [position(single, scale, 0), scale.bandwidth?.() || 10];
  return [0, whole];
}

/** Draw a rectangle in the plot area. */
export function drawRectangleMark(props, { xScale, yScale, width, height }) {
  const [x, w] = span(props.xStart, props.xEnd, props.x, xScale, width);
  const [y, h] = span(props.yStart, props.yEnd, props.y, yScale, height);
  const rect = svg('rect', {
    x,
    y,
    width: Math.max(0, w),
    height: Math.max(0, h),
    fill: props.foregroundStyle || '#007AFF',
    opacity: props.opacity,
  });
  if (props.cornerRadius > 0) {
    rect.setAttribute('rx', props.cornerRadius);
    rect.setAttribute('ry', props.cornerRadius);
  }
  return rect;
}
