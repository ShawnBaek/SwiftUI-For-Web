/**
 * BarMark - a bar in a bar chart (Swift Charts BarMark).
 *
 *   BarMark({ x: value('Month', item.month), y: value('Sales', item.sales) })
 *     .foregroundStyle(Color.blue)
 *     .cornerRadius(4)
 */

import { mark, svg, markColor } from './Mark.js';

/**
 * @param {Object} options - x, y, and optionally yStart/yEnd (ranged bars)
 * @returns {Object} Chainable mark descriptor
 */
export function BarMark(options) {
  return mark('BarMark', options);
}

/** Draw a bar in the plot area. */
export function drawBarMark(props, { xScale, yScale, colorScale, width, height }) {
  const { x, y } = props;
  if (!x || !y) return null;

  let barX, barY, barWidth, barHeight;
  if (x.type === 'nominal') {
    barWidth = xScale.bandwidth ? xScale.bandwidth() : width / 10;
    barX = xScale(x.rawValue);
  } else {
    // Horizontal bars
    barX = Math.min(xScale(0), xScale(x.numericValue));
    barWidth = Math.abs(xScale(x.numericValue) - xScale(0));
  }
  if (y.type === 'nominal') {
    barHeight = yScale.bandwidth ? yScale.bandwidth() : height / 10;
    barY = yScale(y.rawValue);
  } else {
    barY = yScale(Math.max(0, y.numericValue));
    barHeight = Math.abs(yScale(y.numericValue) - yScale(0));
  }
  // Ranged bars
  if (props.yStart && props.yEnd) {
    barY = yScale(props.yEnd.numericValue);
    barHeight = yScale(props.yStart.numericValue) - barY;
  }

  const rect = svg('rect', {
    x: barX,
    y: barY,
    width: Math.max(0, barWidth),
    height: Math.max(0, barHeight),
    fill: markColor(props, colorScale),
    opacity: props.opacity,
  });
  if (props.cornerRadius > 0) {
    rect.setAttribute('rx', props.cornerRadius);
    rect.setAttribute('ry', props.cornerRadius);
  }
  return rect;
}
