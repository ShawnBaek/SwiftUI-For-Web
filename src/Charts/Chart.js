/**
 * Chart - the Swift Charts container, as a view descriptor (#48).
 *
 *   Chart(data, item =>
 *     BarMark({ x: value('Month', item.month), y: value('Sales', item.sales) })
 *   )
 *   .frame({ width: 500, height: 300 })
 *   .chartXAxis({ label: 'Month' })
 *   .chartLegend('visible')
 *
 * The marks are descriptors too (Mark.js). The renderer draws them into one
 * SVG inside an effect, so a chart whose data or content reads a State
 * redraws when the State changes.
 */

import { createDescriptor } from '../Core/ViewDescriptor.js';
import { chainable } from '../Core/Chainable.js';
import { registerRenderer, isSignalValue } from '../Core/Renderer.js';
import { createEffect, getOwner } from '../Data/Signal.js';
import { svg } from './Mark.js';
import { drawBarMark } from './BarMark.js';
import { pointOf, linePath } from './LineMark.js';
import { areaPath } from './AreaMark.js';
import { drawPointMark } from './PointMark.js';
import { drawRuleMark } from './RuleMark.js';
import { drawRectangleMark } from './RectangleMark.js';
import { drawSectorMark, angleOf } from './SectorMark.js';

// Default color palette matching Apple's chart colors
const DEFAULT_COLORS = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#FF2D55', // Pink
  '#AF52DE', // Purple
  '#5856D6', // Indigo
  '#FF3B30', // Red
  '#FFCC00', // Yellow
  '#00C7BE', // Teal
  '#8E8E93'  // Gray
];

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

const CHART_PROPS = {
  data: null,
  content: null,
  marks: null,
  width: 400,
  height: 300,
  xAxis: { visible: true, label: null, gridLines: true },
  yAxis: { visible: true, label: null, gridLines: true },
  legend: { visible: 'automatic', position: 'bottom' },
  background: null,
  plotStyle: null,
  xDomain: null,
  yDomain: null,
};

// .chartXAxis / .chartYAxis: 'hidden', { visibility: 'hidden' }, a config
// to merge, or a function returning one of those.
function axis(current, config) {
  if (typeof config === 'function') config = config();
  if (config === 'hidden' || config?.visibility === 'hidden') return { ...current, visible: false };
  return config ? { ...current, ...config } : current;
}

const chartMethods = ({ descriptor, withProps }) => {
  const { props } = descriptor;
  return {
    /** The chart's size: `.frame({ width, height })`. */
    frame: (frame) => withProps({
      ...(frame.width ? { width: frame.width } : null),
      ...(frame.height ? { height: frame.height } : null),
    }),
    chartXAxis: (config) => withProps({ xAxis: axis(props.xAxis, config) }),
    chartYAxis: (config) => withProps({ yAxis: axis(props.yAxis, config) }),
    /** 'visible', 'hidden' or `{ position }`. */
    chartLegend(config) {
      if (config === 'hidden' || config === 'visible') return withProps({ legend: { ...props.legend, visible: config === 'visible' } });
      return typeof config === 'object' ? withProps({ legend: { ...props.legend, ...config } }) : withProps({});
    },
    chartBackground: (color) => withProps({ background: color }),
    chartPlotStyle: (config) => withProps({ plotStyle: config }),
    chartXScale: (config) => (config.domain ? withProps({ xDomain: config.domain }) : withProps({})),
    chartYScale: (config) => (config.domain ? withProps({ yDomain: config.domain }) : withProps({})),
  };
};

/**
 * A chart.
 *
 * @param {Array|Object|Function} dataOrContent - Data items (with a content
 *   builder), a State or Binding holding them, or the marks themselves: an
 *   array, one mark, or a function returning marks
 * @param {Function} [content] - Builds the mark(s) for one data item
 * @returns {Object} Chainable view descriptor
 */
export function Chart(dataOrContent, content) {
  const props = typeof content === 'function'
    ? { ...CHART_PROPS, data: dataOrContent, content }
    : { ...CHART_PROPS, marks: dataOrContent };
  return chainable(createDescriptor('Chart', props), chartMethods);
}

// The marks to draw. Reads State values, so the caller's effect tracks them.
function buildMarks({ data, content, marks }) {
  const result = [];
  if (content) {
    const items = isSignalValue(data) ? data.wrappedValue : typeof data === 'function' ? data() : data;
    for (const item of items || []) {
      const built = content(item);
      if (Array.isArray(built)) result.push(...built);
      else if (built) result.push(built);
    }
    return result;
  }
  if (typeof marks === 'function') marks = marks();
  return (Array.isArray(marks) ? marks : [marks]).filter(Boolean);
}

const colorScaleFor = (domain) => (value) => DEFAULT_COLORS[domain.indexOf(value) % DEFAULT_COLORS.length];

function createScale(values, size, domain, invert = false) {
  if (values.length === 0) return () => 0;

  if (values[0].type === 'nominal') {
    // Band scale
    const unique = [...new Set(values.map((v) => v.rawValue))];
    const bandwidth = size / unique.length;
    const padding = bandwidth * 0.1;
    const scale = (value) => unique.indexOf(value) * bandwidth + padding;
    scale.bandwidth = () => bandwidth - padding * 2;
    scale.domain = () => unique;
    return scale;
  }

  // Linear scale
  const numbers = values.map((v) => v.numericValue);
  let min = domain?.[0] ?? Math.min(0, ...numbers);
  let max = domain?.[1] ?? Math.max(...numbers);
  if (max - min === 0) {
    min -= 1;
    max += 1;
  }
  const scale = (value) => {
    const normalized = (value - min) / (max - min);
    return invert ? size * (1 - normalized) : size * normalized;
  };
  scale.domain = () => [min, max];
  return scale;
}

// Nice tick values between min and max.
function numericTicks(min, max, count = 5) {
  const step = (max - min) / (count - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(step)));
  const normalized = step / magnitude;
  const nice = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const ticks = [];
  for (let tick = Math.ceil(min / nice) * nice; tick <= max; tick += nice) ticks.push(tick);
  return ticks;
}

// LineMarks or AreaMarks joined into one path per series.
function seriesPaths(group, marks, context, attributes) {
  const series = new Map();
  for (const mark of marks) {
    const key = mark.props.foregroundStyleField?.rawValue || 'default';
    if (!series.has(key)) series.set(key, []);
    series.get(key).push(mark.props);
  }
  for (const [key, members] of series) {
    const points = [];
    for (const props of members) {
      const point = pointOf(props, context);
      if (point) points.push({ ...point, props });
    }
    if (points.length === 0) continue;
    points.sort((a, b) => a.x - b.x);
    // The leftmost point's mark gives the color and opacity, the first
    // mark the interpolation and line style.
    const color = context.colorScale(key) || points[0].props.foregroundStyle || '#007AFF';
    group.appendChild(svg('path', attributes(points, members[0], color)));
  }
}

// One axis: its line, then a tick and label per tick value.
function drawAxis(root, scale, horizontal, plotWidth, plotHeight) {
  const group = svg('g');
  const at = horizontal ? PADDING.top + plotHeight : PADDING.left;
  group.appendChild(svg('line', horizontal
    ? { x1: PADDING.left, y1: at, x2: PADDING.left + plotWidth, y2: at, stroke: '#e0e0e0' }
    : { x1: at, y1: PADDING.top, x2: at, y2: PADDING.top + plotHeight, stroke: '#e0e0e0' }));

  const domain = scale.domain?.() || [];
  const ticks = typeof domain[0] === 'number' ? numericTicks(domain[0], domain[1]) : domain;
  for (const tick of ticks) {
    const p = (horizontal ? PADDING.left : PADDING.top) + scale(tick) + (scale.bandwidth?.() || 0) / 2;
    group.appendChild(svg('line', horizontal
      ? { x1: p, y1: at, x2: p, y2: at + 6, stroke: '#e0e0e0' }
      : { x1: at - 6, y1: p, x2: at, y2: p, stroke: '#e0e0e0' }));
    const label = svg('text', horizontal
      ? { x: p, y: at + 20, 'text-anchor': 'middle', 'font-size': '12', fill: '#666' }
      : { x: at - 10, y: p + 4, 'text-anchor': 'end', 'font-size': '12', fill: '#666' });
    label.textContent = typeof tick === 'number' ? tick.toLocaleString() : String(tick);
    group.appendChild(label);
  }
  root.appendChild(group);
}

function gridLines(group, scale, horizontal, plotWidth, plotHeight) {
  const domain = scale.domain?.() || [];
  if (typeof domain[0] !== 'number') return;
  for (const tick of numericTicks(domain[0], domain[1])) {
    const p = scale(tick);
    group.appendChild(svg('line', horizontal
      ? { x1: 0, y1: p, x2: plotWidth, y2: p, stroke: '#f0f0f0' }
      : { x1: p, y1: 0, x2: p, y2: plotHeight, stroke: '#f0f0f0' }));
  }
}

const DRAW = {
  RectangleMark: drawRectangleMark,
  BarMark: drawBarMark,
  RuleMark: drawRuleMark,
  PointMark: drawPointMark,
};

// Bars, lines, areas, points, rules and rectangles. Returns the color domain.
function drawCartesian(root, marks, props) {
  const plotWidth = props.width - PADDING.left - PADDING.right;
  const plotHeight = props.height - PADDING.top - PADDING.bottom;

  const xValues = [];
  const yValues = [];
  const colors = new Set();
  for (const { props: m } of marks) {
    if (m.x) xValues.push(m.x);
    if (m.y) yValues.push(m.y);
    if (m.xStart) xValues.push(m.xStart);
    if (m.xEnd) xValues.push(m.xEnd);
    if (m.yStart) yValues.push(m.yStart);
    if (m.yEnd) yValues.push(m.yEnd);
    if (m.foregroundStyleField) colors.add(m.foregroundStyleField.rawValue);
  }
  const xScale = createScale(xValues, plotWidth, props.xDomain);
  const yScale = createScale(yValues, plotHeight, props.yDomain, true);
  const colorDomain = [...colors];
  const context = { xScale, yScale, colorScale: colorScaleFor(colorDomain), width: plotWidth, height: plotHeight };

  const plot = svg('g', { transform: `translate(${PADDING.left}, ${PADDING.top})` });
  if (props.yAxis.gridLines) gridLines(plot, yScale, true, plotWidth, plotHeight);
  if (props.xAxis.gridLines && xScale.domain && typeof xScale.domain()[0] === 'number') {
    gridLines(plot, xScale, false, plotWidth, plotHeight);
  }

  const ofType = (type) => marks.filter((mark) => mark.type === type);
  const draw = (type) => {
    for (const mark of ofType(type)) {
      const element = DRAW[type](mark.props, context);
      if (element) plot.appendChild(element);
    }
  };

  // Drawing order: rectangles, areas, bars, rules, lines, points.
  draw('RectangleMark');
  const baseline = yScale(0);
  seriesPaths(plot, ofType('AreaMark'), context, (points, first, color) => ({
    d: areaPath(points, first.interpolationMethod, baseline),
    fill: color,
    opacity: points[0].props.opacity || 0.3,
  }));
  draw('BarMark');
  draw('RuleMark');
  seriesPaths(plot, ofType('LineMark'), context, (points, first, color) => ({
    d: linePath(points, first.interpolationMethod),
    fill: 'none',
    stroke: color,
    'stroke-width': first.lineStyle.lineWidth || 2,
    'stroke-linecap': first.lineStyle.lineCap || 'round',
    'stroke-linejoin': first.lineStyle.lineJoin || 'round',
  }));
  draw('PointMark');
  root.appendChild(plot);

  if (props.xAxis.visible) drawAxis(root, xScale, true, plotWidth, plotHeight);
  if (props.yAxis.visible) drawAxis(root, yScale, false, plotWidth, plotHeight);
  return colorDomain;
}

// A pie or donut. Returns the color domain.
function drawPie(root, marks, { width, height }) {
  const sectors = marks.filter((mark) => mark.type === 'SectorMark').map((mark) => mark.props);
  const colorDomain = [...new Set(sectors.map((props) => props.foregroundStyleField?.rawValue).filter(Boolean))];
  if (sectors.length === 0) return colorDomain;

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20;
  const total = sectors.reduce((sum, props) => sum + angleOf(props), 0);
  const colorScale = colorScaleFor(colorDomain);

  let startAngle = 0;
  for (const props of sectors) {
    const endAngle = startAngle + (angleOf(props) / total) * Math.PI * 2;
    root.appendChild(drawSectorMark(props, { centerX, centerY, radius, startAngle, endAngle, colorScale }));
    startAngle = endAngle;
  }
  return colorDomain;
}

function drawLegend(colorDomain) {
  const legend = document.createElement('div');
  legend.style.display = 'flex';
  legend.style.flexWrap = 'wrap';
  legend.style.justifyContent = 'center';
  legend.style.gap = '16px';
  legend.style.padding = '8px';
  legend.style.fontSize = '12px';

  colorDomain.forEach((value, i) => {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '6px';

    const swatch = document.createElement('div');
    swatch.style.width = '12px';
    swatch.style.height = '12px';
    swatch.style.borderRadius = '2px';
    swatch.style.backgroundColor = DEFAULT_COLORS[i % DEFAULT_COLORS.length];

    const label = document.createElement('span');
    label.style.color = '#666';
    label.textContent = String(value);

    item.appendChild(swatch);
    item.appendChild(label);
    legend.appendChild(item);
  });
  return legend;
}

// The SVG and legend of a chart, into `container`.
function drawChart(container, props) {
  while (container.firstChild) container.removeChild(container.firstChild);

  const root = svg('svg', { width: props.width, height: props.height });
  root.style.display = 'block';

  const marks = buildMarks(props);
  const colorDomain = marks.some((mark) => mark.type === 'SectorMark')
    ? drawPie(root, marks, props)
    : drawCartesian(root, marks, props);
  container.appendChild(root);

  const { visible } = props.legend;
  if (visible === true || (visible === 'automatic' && colorDomain.length > 1)) {
    container.appendChild(drawLegend(colorDomain));
  }
}

function renderChart(props) {
  const container = document.createElement('div');
  container.style.width = `${props.width}px`;
  // min-height (not height) so the legend appended after the SVG can grow
  // the container instead of overflowing into the next section.
  container.style.minHeight = `${props.height}px`;
  container.style.position = 'relative';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  if (props.background) container.style.backgroundColor = props.background;

  // Under an owner, the effect redraws when a State the data or content
  // reads changes; it is disposed with the owner.
  if (getOwner()) createEffect(() => drawChart(container, props));
  else drawChart(container, props);
  return container;
}

registerRenderer('Chart', renderChart);

// A mark used outside a Chart renders as a chart of that one mark.
for (const type of ['BarMark', 'LineMark', 'AreaMark', 'PointMark', 'RuleMark', 'RectangleMark', 'SectorMark']) {
  registerRenderer(type, (props) => renderChart({ ...CHART_PROPS, marks: [{ type, props }] }));
}

export default Chart;
