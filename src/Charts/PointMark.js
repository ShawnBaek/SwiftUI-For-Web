/**
 * PointMark - a symbol in a scatter or point chart (Swift Charts PointMark).
 *
 *   PointMark({ x: value('X', item.x), y: value('Y', item.y) })
 *     .symbol('circle')
 *     .symbolSize(100)
 */

import { mark, svg, position, markColor } from './Mark.js';

/**
 * @param {Object} options - x and y
 * @returns {Object} Chainable mark descriptor
 */
export function PointMark(options) {
  return mark('PointMark', options);
}

const polygon = (corners) => ({ points: corners.map(([x, y]) => `${x},${y}`).join(' ') });

// A cross (w = 0.4) or plus (w = 0.3) of radius r centred at (cx, cy).
function crossPath(cx, cy, r, w) {
  const corners = [[-w, -r], [w, -r], [w, -w], [r, -w], [r, w], [w, w], [w, r], [-w, r], [-w, w], [-r, w], [-r, -w], [-w, -w]];
  return { d: corners.map(([x, y], i) => `${i ? 'L' : 'M'} ${cx + x} ${cy + y}`).join(' ') + ' Z' };
}

function symbolShape(type, cx, cy, r) {
  switch (type) {
    case 'square':
      return ['rect', { x: cx - r, y: cy - r, width: r * 2, height: r * 2 }];
    case 'triangle':
      return ['polygon', polygon([[cx, cy - r * 1.2], [cx - r, cy + r * 0.7], [cx + r, cy + r * 0.7]])];
    case 'diamond':
      return ['polygon', polygon([[cx, cy - r * 1.2], [cx + r, cy], [cx, cy + r * 1.2], [cx - r, cy]])];
    case 'cross':
      return ['path', crossPath(cx, cy, r, r * 0.4)];
    case 'plus':
      return ['path', crossPath(cx, cy, r, r * 0.3)];
    case 'star': {
      const corners = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * 36 - 90) * Math.PI / 180;
        const radius = i % 2 === 0 ? r * 1.2 : r * 0.5;
        corners.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
      }
      return ['polygon', polygon(corners)];
    }
    default:
      return ['circle', { cx, cy, r }];
  }
}

/** Draw a point in the plot area. */
export function drawPointMark(props, { xScale, yScale, colorScale }) {
  const { x, y } = props;
  if (!x || !y) return null;
  // symbolSize is an area in points squared.
  const [tag, attributes] = symbolShape(props.symbol, position(x, xScale), position(y, yScale), Math.sqrt(props.symbolSize / Math.PI));
  attributes.fill = markColor(props, colorScale);
  const element = svg(tag, attributes);
  element.setAttribute('opacity', props.opacity);
  return element;
}
