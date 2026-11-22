/**
 * Shape - Base class for all shape primitives in SwiftUI-For-Web
 *
 * Matches SwiftUI's Shape protocol where shapes can be used as views
 * and support fill, stroke, and other shape-specific modifiers.
 *
 * @example
 * Rectangle()
 *   .fill(Color.blue)
 *   .frame({ width: 100, height: 50 })
 *
 * Circle()
 *   .stroke(Color.red, { lineWidth: 2 })
 *   .frame({ width: 100, height: 100 })
 */

import { createDescriptor } from '../Core/ViewDescriptor.js';
import { chainable } from '../Core/Chainable.js';
import { registerRenderer } from '../Core/Renderer.js';

// .fill(_:) and .stroke(_:lineWidth:), shared by every shape.
const shapeMethods = ({ withProps }) => ({
  fill: (color) => withProps({ fill: color }),
  // stroke(color, lineWidth) or stroke(color, { lineWidth, style }), where
  // style is 'solid', 'dashed' or 'dotted'.
  stroke: (color, options = {}) => withProps({
    stroke: typeof options === 'number'
      ? { color, width: options, style: 'solid' }
      : { color, width: options.lineWidth ?? 1, style: options.style ?? 'solid' },
  }),
});

function shape(type, props = {}) {
  return chainable(createDescriptor(type, { fill: null, stroke: null, ...props }), shapeMethods);
}

function colorValue(color) {
  if (!color) return 'transparent';
  if (typeof color.rgba === 'function') return color.rgba();
  if (typeof color.css === 'function') return color.css();
  return String(color);
}

/** A rectangle. */
export function Rectangle() {
  return shape('Rectangle');
}

/**
 * A rectangle with rounded corners.
 * @param {number|{cornerRadius?: number, style?: string}} [options]
 */
export function RoundedRectangle(options = {}) {
  const cornerRadius = typeof options === 'number' ? options : options.cornerRadius ?? 10;
  return shape('RoundedRectangle', {
    cornerRadius,
    style: options.style ?? 'circular',
    radius: `${cornerRadius}px`,
  });
}

/** A circle, as wide as it is tall. */
export function Circle() {
  return shape('Circle', { radius: '50%' });
}

/** An ellipse that fills its frame. */
export function Ellipse() {
  return shape('Ellipse', { radius: '50%' });
}

/** A capsule: fully rounded ends along its shorter side. */
export function Capsule() {
  // CSS scales an oversized radius down to half the shorter side.
  return shape('Capsule', { radius: '9999px' });
}

/**
 * A rectangle with a different radius for each corner.
 * @param {{topLeading?: number, topTrailing?: number, bottomLeading?: number, bottomTrailing?: number}} [options]
 */
export function UnevenRoundedRectangle(options = {}) {
  const { topLeading = 0, topTrailing = 0, bottomLeading = 0, bottomTrailing = 0 } = options;
  // CSS order: top-left top-right bottom-right bottom-left
  return shape('UnevenRoundedRectangle', {
    radius: `${topLeading}px ${topTrailing}px ${bottomTrailing}px ${bottomLeading}px`,
  });
}

const BOX_SHAPES = {
  Rectangle: 'rectangle',
  RoundedRectangle: 'rounded-rectangle',
  Circle: 'circle',
  Ellipse: 'ellipse',
  Capsule: 'capsule',
  UnevenRoundedRectangle: 'uneven-rounded-rectangle',
};

for (const [type, name] of Object.entries(BOX_SHAPES)) {
  registerRenderer(type, (props) => {
    const el = document.createElement('div');
    el.dataset.shape = name;
    if (props.radius) el.style.borderRadius = props.radius;
    if (type === 'Circle') el.style.aspectRatio = '1';
    const { fill, stroke } = props;
    if (fill) {
      // A gradient's css() is a gradient image; a color's is a color.
      const value = typeof fill.css === 'function' ? fill.css() : colorValue(fill);
      if (typeof value === 'string' && value.includes('gradient')) el.style.backgroundImage = value;
      else el.style.backgroundColor = value;
    }
    if (stroke?.color && stroke.width > 0) {
      el.style.border = `${stroke.width}px ${stroke.style} ${colorValue(stroke.color)}`;
    }
    return el;
  });
}

/**
 * Path - a custom shape built from SVG path commands.
 *
 * @param {(path: Object) => void} builder - Receives a path with move,
 *   addLine, addQuadCurve, addCurve, addArc and closeSubpath
 * @returns {Object} Chainable view descriptor
 *
 * @example
 * Path((path) => {
 *   path.move({ x: 0, y: 0 });
 *   path.addLine({ x: 100, y: 0 });
 *   path.addLine({ x: 50, y: 100 });
 *   path.closeSubpath();
 * }).fill(Color.yellow)
 */
export function Path(builder) {
  const commands = [];
  const path = {
    move: (p) => (commands.push(`M ${p.x} ${p.y}`), path),
    addLine: (p) => (commands.push(`L ${p.x} ${p.y}`), path),
    addQuadCurve: (c, end) => (commands.push(`Q ${c.x} ${c.y} ${end.x} ${end.y}`), path),
    addCurve: (c1, c2, end) => (commands.push(`C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`), path),
    // Angles in radians.
    addArc(center, radius, startAngle, endAngle, clockwise = true) {
      const at = (angle) => `${center.x + radius * Math.cos(angle)} ${center.y + radius * Math.sin(angle)}`;
      const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
      commands.push(`M ${at(startAngle)}`, `A ${radius} ${radius} 0 ${largeArc} ${clockwise ? 1 : 0} ${at(endAngle)}`);
      return path;
    },
    closeSubpath: () => (commands.push('Z'), path),
  };
  if (typeof builder === 'function') builder(path);
  return shape('Path', { d: commands.join(' ') });
}

const SVG_NS = 'http://www.w3.org/2000/svg';

registerRenderer('Path', (props) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('data-shape', 'path');
  svg.style.display = 'block';
  svg.style.overflow = 'visible';

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', props.d);
  path.setAttribute('fill', props.fill ? colorValue(props.fill) : 'none');
  const { stroke } = props;
  if (stroke?.color && stroke.width > 0) {
    path.setAttribute('stroke', colorValue(stroke.color));
    path.setAttribute('stroke-width', String(stroke.width));
    if (stroke.style === 'dashed') path.setAttribute('stroke-dasharray', '5,5');
    else if (stroke.style === 'dotted') path.setAttribute('stroke-dasharray', '2,2');
  }
  svg.appendChild(path);
  return svg;
});

export default {
  Rectangle,
  RoundedRectangle,
  Circle,
  Ellipse,
  Capsule,
  Path,
  UnevenRoundedRectangle
};
