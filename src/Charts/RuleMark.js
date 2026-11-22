/**
 * RuleMark - a horizontal or vertical rule (Swift Charts RuleMark).
 *
 *   RuleMark({ y: value('Threshold', 100) })    // horizontal
 *   RuleMark({ x: value('Date', targetDate) })  // vertical
 *   RuleMark({ xStart, xEnd, y })               // horizontal segment
 */

import { mark, svg, position } from './Mark.js';

/**
 * @param {Object} options - x, y, or a start/end pair with the other axis
 * @returns {Object} Chainable mark descriptor
 */
export function RuleMark(options) {
  return mark('RuleMark', options, { lineStyle: { lineWidth: 1, dash: null } });
}

/** Draw a rule in the plot area. */
export function drawRuleMark(props, { xScale, yScale, width, height }) {
  const { x, y, xStart, xEnd, yStart, yEnd } = props;
  let x1, y1, x2, y2;
  if (x && !y) {
    x1 = x2 = position(x, xScale);
    y1 = 0;
    y2 = height;
  } else if (y && !x) {
    y1 = y2 = position(y, yScale);
    x1 = 0;
    x2 = width;
  } else if (xStart && xEnd && y) {
    x1 = position(xStart, xScale, 0);
    x2 = position(xEnd, xScale, 1);
    y1 = y2 = position(y, yScale);
  } else if (yStart && yEnd && x) {
    y1 = position(yStart, yScale, 0);
    y2 = position(yEnd, yScale, 1);
    x1 = x2 = position(x, xScale);
  } else {
    return null;
  }

  const line = svg('line', {
    x1,
    y1,
    x2,
    y2,
    stroke: props.foregroundStyle || '#999999',
    'stroke-width': props.lineStyle.lineWidth || 1,
    opacity: props.opacity,
  });
  if (props.lineStyle.dash) line.setAttribute('stroke-dasharray', props.lineStyle.dash);
  return line;
}
