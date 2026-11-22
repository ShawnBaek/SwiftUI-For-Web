/**
 * SectorMark - a slice of a pie or donut chart (Swift Charts SectorMark).
 *
 *   SectorMark({ angle: value('Value', item.value), innerRadius: MarkDimension.ratio(0.5) })
 *     .foregroundStyle({ by: value('Category', item.category) })
 */

import { mark, svg, markColor } from './Mark.js';

/**
 * @param {Object} options - angle, and optionally innerRadius, outerRadius
 *   and angularInset (degrees)
 * @returns {Object} Chainable mark descriptor
 */
export function SectorMark(options = {}) {
  return mark('SectorMark', options, {
    angle: options.angle || null,
    innerRadius: options.innerRadius || { ratio: 0 },
    outerRadius: options.outerRadius || { ratio: 1 },
    angularInset: options.angularInset || 0,
  });
}

/** Radius configs for SectorMark: `MarkDimension.ratio(0.5)`. */
export const MarkDimension = {
  ratio: (value) => ({ ratio: value }),
  fixed: (value) => ({ value: value }),
  inset: (value) => ({ inset: value })
};

/** The slice size of a sector. */
export const angleOf = (props) => (props.angle ? props.angle.numericValue : 0);

function radiusOf(dimension, radius, fallback) {
  if (dimension.ratio !== undefined) return radius * dimension.ratio;
  if (dimension.value !== undefined) return dimension.value;
  return fallback;
}

function polar(cx, cy, radius, angle) {
  return { x: cx + radius * Math.cos(angle - Math.PI / 2), y: cy + radius * Math.sin(angle - Math.PI / 2) };
}

/** Draw a sector between startAngle and endAngle (radians). */
export function drawSectorMark(props, { centerX: cx, centerY: cy, radius, startAngle, endAngle, colorScale }) {
  const inner = radiusOf(props.innerRadius, radius, 0);
  const outer = radiusOf(props.outerRadius, radius, radius);
  const inset = (props.angularInset * Math.PI) / 180;
  const start = startAngle + inset / 2;
  const end = endAngle - inset / 2;

  const startOuter = polar(cx, cy, outer, start);
  const endOuter = polar(cx, cy, outer, end);
  const large = end - start > Math.PI ? 1 : 0;
  let d;
  if (inner === 0) {
    d = `M ${cx} ${cy} L ${startOuter.x} ${startOuter.y} A ${outer} ${outer} 0 ${large} 1 ${endOuter.x} ${endOuter.y} Z`;
  } else {
    const startInner = polar(cx, cy, inner, start);
    const endInner = polar(cx, cy, inner, end);
    d = `M ${startOuter.x} ${startOuter.y} A ${outer} ${outer} 0 ${large} 1 ${endOuter.x} ${endOuter.y} L ${endInner.x} ${endInner.y} A ${inner} ${inner} 0 ${large} 0 ${startInner.x} ${startInner.y} Z`;
  }

  const color = markColor(props, colorScale);
  const path = svg('path', { d, fill: color, opacity: props.opacity });
  if (props.cornerRadius > 0) {
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '1');
    path.setAttribute('stroke-linejoin', 'round');
  }
  return path;
}
