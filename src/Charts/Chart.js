/**
 * Chart - Main container for Swift Charts
 * Mirrors Swift Charts Chart API
 *
 * Usage:
 *   Chart(data, item =>
 *     BarMark(
 *       x: .value("Month", item.month),
 *       y: .value("Sales", item.sales)
 *     )
 *   )
 *   .chartXAxis { ... }
 *   .chartYAxis { ... }
 *   .chartLegend(.visible)
 */

import { View } from '../Core/View.js';
import { BarMark } from './BarMark.js';
import { LineMark } from './LineMark.js';
import { PointMark } from './PointMark.js';
import { AreaMark } from './AreaMark.js';
import { RuleMark } from './RuleMark.js';
import { RectangleMark } from './RectangleMark.js';
import { SectorMark } from './SectorMark.js';

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

export class Chart extends View {
  /**
   * Create a Chart
   * @param {Array|Function} dataOrContent - Data array or content builder function
   * @param {Function} [contentBuilder] - Function that returns marks for each data item
   */
  constructor(dataOrContent, contentBuilder) {
    super();

    this._data = [];
    this._marks = [];
    this._width = 400;
    this._height = 300;
    this._padding = { top: 20, right: 20, bottom: 40, left: 50 };

    // Axis configuration
    this._xAxisConfig = { visible: true, label: null, gridLines: true };
    this._yAxisConfig = { visible: true, label: null, gridLines: true };

    // Legend
    this._legendConfig = { visible: 'automatic', position: 'bottom' };

    // Color scale
    this._colorScale = null;
    this._colorDomain = [];

    // Parse arguments
    if (Array.isArray(dataOrContent)) {
      this._data = dataOrContent;
      if (typeof contentBuilder === 'function') {
        this._contentBuilder = contentBuilder;
      }
    } else if (typeof dataOrContent === 'function') {
      // Chart { ... } syntax - content is array of marks
      this._contentBuilder = null;
      this._directMarks = dataOrContent;
    } else {
      this._directMarks = dataOrContent;
    }
  }

  /**
   * Set chart frame size
   * @param {Object} frame - { width, height }
   * @returns {this}
   */
  frame(frame) {
    if (frame.width) this._width = frame.width;
    if (frame.height) this._height = frame.height;
    return this;
  }

  /**
   * Configure X axis
   * @param {Object|Function} config - Axis configuration
   * @returns {this}
   */
  chartXAxis(config) {
    if (typeof config === 'function') {
      config = config();
    }
    if (config === 'hidden' || config?.visibility === 'hidden') {
      this._xAxisConfig.visible = false;
    } else if (config) {
      this._xAxisConfig = { ...this._xAxisConfig, ...config };
    }
    return this;
  }

  /**
   * Configure Y axis
   * @param {Object|Function} config - Axis configuration
   * @returns {this}
   */
  chartYAxis(config) {
    if (typeof config === 'function') {
      config = config();
    }
    if (config === 'hidden' || config?.visibility === 'hidden') {
      this._yAxisConfig.visible = false;
    } else if (config) {
      this._yAxisConfig = { ...this._yAxisConfig, ...config };
    }
    return this;
  }

  /**
   * Configure legend
   * @param {string|Object} config - 'visible', 'hidden', or config object
   * @returns {this}
   */
  chartLegend(config) {
    if (config === 'hidden') {
      this._legendConfig.visible = false;
    } else if (config === 'visible') {
      this._legendConfig.visible = true;
    } else if (typeof config === 'object') {
      this._legendConfig = { ...this._legendConfig, ...config };
    }
    return this;
  }

  /**
   * Set chart background
   * @param {string} color - Background color
   * @returns {this}
   */
  chartBackground(color) {
    this._backgroundColor = color;
    return this;
  }

  /**
   * Set plot area background
   * @param {string} color - Plot area background color
   * @returns {this}
   */
  chartPlotStyle(config) {
    this._plotStyle = config;
    return this;
  }

  /**
   * Set Y axis domain
   * @param {Array} domain - [min, max]
   * @returns {this}
   */
  chartYScale(config) {
    if (config.domain) {
      this._yDomain = config.domain;
    }
    return this;
  }

  /**
   * Set X axis domain
   * @param {Array} domain - [min, max]
   * @returns {this}
   */
  chartXScale(config) {
    if (config.domain) {
      this._xDomain = config.domain;
    }
    return this;
  }

  /**
   * Build marks from data
   * @private
   */
  _buildMarks() {
    this._marks = [];

    if (this._contentBuilder && this._data.length > 0) {
      // Data-driven marks
      for (const item of this._data) {
        const mark = this._contentBuilder(item);
        if (Array.isArray(mark)) {
          this._marks.push(...mark);
        } else if (mark) {
          this._marks.push(mark);
        }
      }
    } else if (this._directMarks) {
      // Direct marks
      if (typeof this._directMarks === 'function') {
        const result = this._directMarks();
        if (Array.isArray(result)) {
          this._marks = result;
        } else {
          this._marks = [result];
        }
      } else if (Array.isArray(this._directMarks)) {
        this._marks = this._directMarks;
      } else {
        this._marks = [this._directMarks];
      }
    }

    return this._marks;
  }

  /**
   * Compute scales for the chart
   * @private
   */
  _computeScales() {
    const marks = this._buildMarks();
    const plotWidth = this._width - this._padding.left - this._padding.right;
    const plotHeight = this._height - this._padding.top - this._padding.bottom;

    // Collect all x and y values
    const xValues = [];
    const yValues = [];
    const colorValues = new Set();

    for (const mark of marks) {
      if (mark.x) xValues.push(mark.x);
      if (mark.y) yValues.push(mark.y);
      if (mark.xStart) xValues.push(mark.xStart);
      if (mark.xEnd) xValues.push(mark.xEnd);
      if (mark.yStart) yValues.push(mark.yStart);
      if (mark.yEnd) yValues.push(mark.yEnd);
      if (mark._foregroundStyleField) {
        colorValues.add(mark._foregroundStyleField.rawValue);
      }
    }

    // Determine x scale type and create scale
    const xScale = this._createScale(xValues, plotWidth, 'x');

    // Determine y scale type and create scale
    const yScale = this._createScale(yValues, plotHeight, 'y', true);

    // Create color scale
    this._colorDomain = Array.from(colorValues);
    const colorScale = (value) => {
      const index = this._colorDomain.indexOf(value);
      return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    };

    return { xScale, yScale, colorScale, plotWidth, plotHeight };
  }

  /**
   * Create a scale function
   * @private
   */
  _createScale(values, size, axis, invert = false) {
    if (values.length === 0) {
      return (v) => 0;
    }

    const firstValue = values[0];

    if (firstValue.type === 'nominal') {
      // Categorical scale (band scale)
      const uniqueValues = [...new Set(values.map(v => v.rawValue))];
      const bandwidth = size / uniqueValues.length;
      const padding = bandwidth * 0.1;

      const scale = (value) => {
        const index = uniqueValues.indexOf(value);
        return index * bandwidth + padding;
      };
      scale.bandwidth = () => bandwidth - padding * 2;
      scale.domain = () => uniqueValues;
      scale.range = () => [0, size];
      return scale;
    } else {
      // Quantitative scale (linear scale)
      const numericValues = values.map(v => v.numericValue);
      let min = this[`_${axis}Domain`]?.[0] ?? Math.min(0, ...numericValues);
      let max = this[`_${axis}Domain`]?.[1] ?? Math.max(...numericValues);

      // Add some padding
      const range = max - min;
      if (range === 0) {
        min -= 1;
        max += 1;
      }

      const scale = (value) => {
        const normalized = (value - min) / (max - min);
        return invert ? size * (1 - normalized) : size * normalized;
      };
      scale.domain = () => [min, max];
      scale.range = () => invert ? [size, 0] : [0, size];
      scale.invert = (pixel) => {
        const normalized = invert ? (size - pixel) / size : pixel / size;
        return min + normalized * (max - min);
      };
      return scale;
    }
  }

  /**
   * Check if chart contains pie/donut marks
   * @private
   */
  _isPieChart() {
    const marks = this._buildMarks();
    return marks.some(m => m instanceof SectorMark);
  }

  /**
   * Render the chart
   * @returns {HTMLElement}
   */
  _render() {
    const container = document.createElement('div');
    container.style.width = `${this._width}px`;
    container.style.height = `${this._height}px`;
    container.style.position = 'relative';

    if (this._backgroundColor) {
      container.style.backgroundColor = this._backgroundColor;
    }

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', this._width);
    svg.setAttribute('height', this._height);
    svg.style.display = 'block';

    const marks = this._buildMarks();

    // Check if this is a pie chart
    if (this._isPieChart()) {
      this._renderPieChart(svg, marks);
    } else {
      this._renderCartesianChart(svg, marks);
    }

    container.appendChild(svg);

    // Render legend if visible
    if (this._legendConfig.visible === true ||
        (this._legendConfig.visible === 'automatic' && this._colorDomain.length > 1)) {
      const legend = this._renderLegend();
      container.appendChild(legend);
    }

    return this._applyModifiers(container);
  }

  /**
   * Render cartesian (bar, line, area) chart
   * @private
   */
  _renderCartesianChart(svg, marks) {
    const { xScale, yScale, colorScale, plotWidth, plotHeight } = this._computeScales();

    // Create plot area group
    const plotGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    plotGroup.setAttribute('transform', `translate(${this._padding.left}, ${this._padding.top})`);

    // Render grid lines
    if (this._yAxisConfig.gridLines) {
      this._renderYGridLines(plotGroup, yScale, plotWidth, plotHeight);
    }
    if (this._xAxisConfig.gridLines && xScale.domain && typeof xScale.domain()[0] === 'number') {
      this._renderXGridLines(plotGroup, xScale, plotWidth, plotHeight);
    }

    // Group marks by type for proper rendering order
    const areaMarks = marks.filter(m => m instanceof AreaMark);
    const rectMarks = marks.filter(m => m instanceof RectangleMark);
    const barMarks = marks.filter(m => m instanceof BarMark);
    const ruleMarks = marks.filter(m => m instanceof RuleMark);
    const lineMarks = marks.filter(m => m instanceof LineMark);
    const pointMarks = marks.filter(m => m instanceof PointMark);

    const context = {
      xScale,
      yScale,
      colorScale,
      width: plotWidth,
      height: plotHeight
    };

    // Render in order: rectangles, areas, bars, rules, lines, points
    for (const mark of rectMarks) {
      const el = mark.render(context);
      if (el) plotGroup.appendChild(el);
    }

    // Render area marks (group by series)
    this._renderAreaMarks(plotGroup, areaMarks, context);

    for (const mark of barMarks) {
      const el = mark.render(context);
      if (el) plotGroup.appendChild(el);
    }

    for (const mark of ruleMarks) {
      const el = mark.render(context);
      if (el) plotGroup.appendChild(el);
    }

    // Render line marks (group by series)
    this._renderLineMarks(plotGroup, lineMarks, context);

    for (const mark of pointMarks) {
      const el = mark.render(context);
      if (el) plotGroup.appendChild(el);
    }

    svg.appendChild(plotGroup);

    // Render axes
    if (this._xAxisConfig.visible) {
      this._renderXAxis(svg, xScale, plotWidth, plotHeight);
    }
    if (this._yAxisConfig.visible) {
      this._renderYAxis(svg, yScale, plotWidth, plotHeight);
    }
  }

  /**
   * Render line marks grouped by series
   * @private
   */
  _renderLineMarks(group, marks, context) {
    if (marks.length === 0) return;

    // Group by series
    const seriesMap = new Map();
    for (const mark of marks) {
      const series = mark._foregroundStyleField?.rawValue || 'default';
      if (!seriesMap.has(series)) {
        seriesMap.set(series, []);
      }
      seriesMap.get(series).push(mark);
    }

    // Render each series as a path
    for (const [series, seriesMarks] of seriesMap) {
      const points = seriesMarks
        .map(m => m.getPointData(context))
        .filter(p => p)
        .sort((a, b) => a.x - b.x);

      if (points.length > 0) {
        const interpolation = seriesMarks[0]._interpolationMethod;
        const pathD = LineMark.generatePath(points, interpolation);
        const lineStyle = seriesMarks[0]._lineStyle;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', context.colorScale(series) || points[0].color);
        path.setAttribute('stroke-width', lineStyle.lineWidth || 2);
        path.setAttribute('stroke-linecap', lineStyle.lineCap || 'round');
        path.setAttribute('stroke-linejoin', lineStyle.lineJoin || 'round');

        group.appendChild(path);
      }
    }
  }

  /**
   * Render area marks grouped by series
   * @private
   */
  _renderAreaMarks(group, marks, context) {
    if (marks.length === 0) return;

    // Group by series
    const seriesMap = new Map();
    for (const mark of marks) {
      const series = mark._foregroundStyleField?.rawValue || 'default';
      if (!seriesMap.has(series)) {
        seriesMap.set(series, []);
      }
      seriesMap.get(series).push(mark);
    }

    // Render each series as a filled path
    for (const [series, seriesMarks] of seriesMap) {
      const points = seriesMarks
        .map(m => m.getPointData(context))
        .filter(p => p)
        .sort((a, b) => a.x - b.x);

      if (points.length > 0) {
        const interpolation = seriesMarks[0]._interpolationMethod;
        const baseline = context.yScale(0);
        const pathD = AreaMark.generateAreaPath(points, interpolation, baseline);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('fill', context.colorScale(series) || points[0].color);
        path.setAttribute('opacity', points[0].opacity || 0.3);

        group.appendChild(path);
      }
    }
  }

  /**
   * Render pie/donut chart
   * @private
   */
  _renderPieChart(svg, marks) {
    const sectorMarks = marks.filter(m => m instanceof SectorMark);
    if (sectorMarks.length === 0) return;

    const centerX = this._width / 2;
    const centerY = this._height / 2;
    const radius = Math.min(this._width, this._height) / 2 - 20;

    // Calculate total for angles
    const total = sectorMarks.reduce((sum, m) => sum + m.getAngleValue(), 0);

    // Create color scale
    const colorValues = sectorMarks.map(m => m._foregroundStyleField?.rawValue).filter(Boolean);
    this._colorDomain = [...new Set(colorValues)];
    const colorScale = (value) => {
      const index = this._colorDomain.indexOf(value);
      return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    };

    // Render sectors
    let currentAngle = 0;
    for (const mark of sectorMarks) {
      const value = mark.getAngleValue();
      const sliceAngle = (value / total) * Math.PI * 2;

      const context = {
        centerX,
        centerY,
        radius,
        startAngle: currentAngle,
        endAngle: currentAngle + sliceAngle,
        colorScale
      };

      const el = mark.render(context);
      if (el) svg.appendChild(el);

      currentAngle += sliceAngle;
    }
  }

  /**
   * Render X axis
   * @private
   */
  _renderXAxis(svg, scale, plotWidth, plotHeight) {
    const axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const y = this._padding.top + plotHeight;

    // Axis line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', this._padding.left);
    line.setAttribute('y1', y);
    line.setAttribute('x2', this._padding.left + plotWidth);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#e0e0e0');
    axisGroup.appendChild(line);

    // Ticks and labels
    const domain = scale.domain?.() || [];
    const ticks = typeof domain[0] === 'number'
      ? this._generateNumericTicks(domain[0], domain[1], 5)
      : domain;

    for (const tick of ticks) {
      const x = this._padding.left + scale(tick) + (scale.bandwidth?.() || 0) / 2;

      // Tick mark
      const tickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tickLine.setAttribute('x1', x);
      tickLine.setAttribute('y1', y);
      tickLine.setAttribute('x2', x);
      tickLine.setAttribute('y2', y + 6);
      tickLine.setAttribute('stroke', '#e0e0e0');
      axisGroup.appendChild(tickLine);

      // Label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', y + 20);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '12');
      label.setAttribute('fill', '#666');
      label.textContent = typeof tick === 'number' ? tick.toLocaleString() : String(tick);
      axisGroup.appendChild(label);
    }

    svg.appendChild(axisGroup);
  }

  /**
   * Render Y axis
   * @private
   */
  _renderYAxis(svg, scale, plotWidth, plotHeight) {
    const axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const x = this._padding.left;

    // Axis line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', this._padding.top);
    line.setAttribute('x2', x);
    line.setAttribute('y2', this._padding.top + plotHeight);
    line.setAttribute('stroke', '#e0e0e0');
    axisGroup.appendChild(line);

    // Ticks and labels
    const domain = scale.domain?.() || [];
    const ticks = typeof domain[0] === 'number'
      ? this._generateNumericTicks(domain[0], domain[1], 5)
      : domain;

    for (const tick of ticks) {
      const y = this._padding.top + scale(tick) + (scale.bandwidth?.() || 0) / 2;

      // Tick mark
      const tickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tickLine.setAttribute('x1', x - 6);
      tickLine.setAttribute('y1', y);
      tickLine.setAttribute('x2', x);
      tickLine.setAttribute('y2', y);
      tickLine.setAttribute('stroke', '#e0e0e0');
      axisGroup.appendChild(tickLine);

      // Label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x - 10);
      label.setAttribute('y', y + 4);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('font-size', '12');
      label.setAttribute('fill', '#666');
      label.textContent = typeof tick === 'number' ? tick.toLocaleString() : String(tick);
      axisGroup.appendChild(label);
    }

    svg.appendChild(axisGroup);
  }

  /**
   * Render Y grid lines
   * @private
   */
  _renderYGridLines(group, scale, plotWidth, plotHeight) {
    const domain = scale.domain?.() || [];
    if (typeof domain[0] !== 'number') return;

    const ticks = this._generateNumericTicks(domain[0], domain[1], 5);

    for (const tick of ticks) {
      const y = scale(tick);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', y);
      line.setAttribute('x2', plotWidth);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#f0f0f0');
      group.appendChild(line);
    }
  }

  /**
   * Render X grid lines
   * @private
   */
  _renderXGridLines(group, scale, plotWidth, plotHeight) {
    const domain = scale.domain?.() || [];
    if (typeof domain[0] !== 'number') return;

    const ticks = this._generateNumericTicks(domain[0], domain[1], 5);

    for (const tick of ticks) {
      const x = scale(tick);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', 0);
      line.setAttribute('x2', x);
      line.setAttribute('y2', plotHeight);
      line.setAttribute('stroke', '#f0f0f0');
      group.appendChild(line);
    }
  }

  /**
   * Generate nice tick values for numeric axis
   * @private
   */
  _generateNumericTicks(min, max, count) {
    const range = max - min;
    const step = range / (count - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(step)));
    const normalizedStep = step / magnitude;

    let niceStep;
    if (normalizedStep <= 1) niceStep = magnitude;
    else if (normalizedStep <= 2) niceStep = 2 * magnitude;
    else if (normalizedStep <= 5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    const ticks = [];
    let tick = Math.ceil(min / niceStep) * niceStep;
    while (tick <= max) {
      ticks.push(tick);
      tick += niceStep;
    }

    return ticks;
  }

  /**
   * Render legend
   * @private
   */
  _renderLegend() {
    const legend = document.createElement('div');
    legend.style.display = 'flex';
    legend.style.flexWrap = 'wrap';
    legend.style.justifyContent = 'center';
    legend.style.gap = '16px';
    legend.style.padding = '8px';
    legend.style.fontSize = '12px';

    for (let i = 0; i < this._colorDomain.length; i++) {
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
      label.textContent = String(this._colorDomain[i]);

      item.appendChild(swatch);
      item.appendChild(label);
      legend.appendChild(item);
    }

    return legend;
  }
}

/**
 * Factory function for creating charts
 * Matches Swift Charts syntax
 */
export function createChart(dataOrContent, contentBuilder) {
  return new Chart(dataOrContent, contentBuilder);
}

export default Chart;
