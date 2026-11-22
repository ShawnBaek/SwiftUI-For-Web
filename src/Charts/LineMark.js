/**
 * LineMark - a point on a line (Swift Charts LineMark). Chart joins the
 * marks of each series into one path.
 *
 *   LineMark({ x: value('Date', item.date), y: value('Value', item.value) })
 *     .lineStyle({ lineWidth: 2 })
 *     .interpolationMethod('catmullRom')
 */

import { mark, position } from './Mark.js';

/**
 * @param {Object} options - x and y
 * @returns {Object} Chainable mark descriptor
 */
export function LineMark(options) {
  return mark('LineMark', options, { lineStyle: { lineWidth: 2, lineCap: 'round', lineJoin: 'round' } });
}

/** Where a LineMark or AreaMark sits in the plot area, or null. */
export function pointOf(props, { xScale, yScale }) {
  const { x, y } = props;
  if (!x || !y) return null;
  return { x: position(x, xScale), y: position(y, yScale) };
}

const linear = (points) => points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

function step(points, at) {
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (at === 0) path += ` V ${curr.y} H ${curr.x}`;
    else if (at === 1) path += ` H ${curr.x} V ${curr.y}`;
    else path += ` H ${prev.x + (curr.x - prev.x) * at} V ${curr.y} H ${curr.x}`;
  }
  return path;
}

// Cubic segments between neighbours, with control points from `controls`.
function cubic(points, controls) {
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [cp1x, cp1y, cp2x, cp2y] = controls(i);
    const p2 = points[i + 1];
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

function catmullRom(points, tension = 0.5) {
  if (points.length <= 2) return linear(points);
  return cubic(points, (i) => {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    return [
      p1.x + (p2.x - p0.x) / 6 * tension,
      p1.y + (p2.y - p0.y) / 6 * tension,
      p2.x - (p3.x - p1.x) / 6 * tension,
      p2.y - (p3.y - p1.y) / 6 * tension,
    ];
  });
}

function monotone(points) {
  const slope = (a, b) => (b.y - a.y) / (b.x - a.x || 1);
  const last = points.length - 1;
  const tangents = points.map((p, i) => {
    if (i === 0) return slope(points[0], points[1]);
    if (i === last) return slope(points[i - 1], p);
    return (slope(points[i - 1], p) + slope(p, points[i + 1])) / 2;
  });
  return cubic(points, (i) => {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    return [p1.x + dx / 3, p1.y + tangents[i] * dx / 3, p2.x - dx / 3, p2.y - tangents[i + 1] * dx / 3];
  });
}

const STEP = { step: 0.5, stepStart: 0, stepEnd: 1 };

/**
 * The SVG path through points sorted by x.
 * @param {Array<{x: number, y: number}>} points
 * @param {string} [interpolation] - linear, catmullRom, monotone, step, stepStart, stepEnd
 */
export function linePath(points, interpolation = 'linear') {
  if (!points || points.length === 0) return '';
  if (points.length < 2) return linear(points);
  if (interpolation === 'catmullRom') return catmullRom(points);
  if (interpolation === 'monotone') return monotone(points);
  if (interpolation in STEP) return step(points, STEP[interpolation]);
  return linear(points);
}
