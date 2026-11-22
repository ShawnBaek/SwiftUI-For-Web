/**
 * Chart marks as view descriptors (#48).
 *
 * A mark is a descriptor whose props hold its plottable values and style:
 * `BarMark({ x, y }).foregroundStyle(c)` returns a new descriptor, like any
 * other view. The mark methods below are the descriptor's `extras`; they
 * replace the shared `.opacity()`, `.cornerRadius()` and
 * `.foregroundStyle()` because inside a chart they style the mark, as in
 * Swift Charts. `Chart` reads the props and draws the SVG.
 */

import { createDescriptor } from '../Core/ViewDescriptor.js';
import { chainable } from '../Core/Chainable.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** An SVG element with the given attributes. */
export function svg(tag, attributes) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const name in attributes) element.setAttribute(name, attributes[name]);
  return element;
}

// Methods every mark has (Swift Charts' ChartContent modifiers).
const markMethods = ({ descriptor, withProps }) => ({
  /** A color, or `{ by: value(...) }` to color by series. */
  foregroundStyle: (style) => withProps(style?.by ? { foregroundStyleField: style.by } : { foregroundStyle: style }),
  opacity: (value) => withProps({ opacity: value }),
  cornerRadius: (radius) => withProps({ cornerRadius: radius }),
  annotation(position = 'top', content = null) {
    if (typeof position === 'function') {
      content = position;
      position = 'top';
    }
    return withProps({ annotation: content, annotationPosition: position });
  },
  symbol: (symbol) => withProps(symbol?.by ? { symbolField: symbol.by } : { symbol }),
  symbolSize: (size) => withProps({ symbolSize: size }),
  lineStyle: (style) => withProps({ lineStyle: { ...descriptor.props.lineStyle, ...style } }),
  interpolationMethod: (method) => withProps({ interpolationMethod: method }),
  stacking: (mode) => withProps({ stacking: mode }),
});

/**
 * Build a mark descriptor.
 *
 * @param {string} type - 'BarMark', 'LineMark', …
 * @param {Object} options - The plottable values
 * @param {Object} [defaults] - Style defaults of this mark type
 */
export function mark(type, options = {}, defaults = null) {
  return chainable(createDescriptor(type, {
    x: options.x || null,
    y: options.y || null,
    xStart: options.xStart || null,
    xEnd: options.xEnd || null,
    yStart: options.yStart || null,
    yEnd: options.yEnd || null,
    width: options.width || null,
    height: options.height || null,
    foregroundStyle: null,
    foregroundStyleField: null,
    opacity: 1,
    cornerRadius: 0,
    annotation: null,
    annotationPosition: 'top',
    symbol: 'circle',
    symbolSize: 64,
    lineStyle: { lineWidth: 2 },
    interpolationMethod: 'linear',
    stacking: 'standard',
    ...defaults,
  }), markMethods);
}

/**
 * The pixel position of a plottable value on a scale: the start of its band
 * plus `band` times the bandwidth for a category, the scaled number
 * otherwise.
 */
export function position(value, scale, band = 0.5) {
  return value.type === 'nominal'
    ? scale(value.rawValue) + (scale.bandwidth?.() || 0) * band
    : scale(value.numericValue);
}

/** The fill of a mark: its series color, its own style, or the default. */
export function markColor(props, colorScale, fallback = '#007AFF') {
  if (props.foregroundStyleField && colorScale) return colorScale(props.foregroundStyleField.rawValue);
  return props.foregroundStyle || fallback;
}
