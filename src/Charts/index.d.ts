/**
 * Swift Charts for Web - TypeScript Declarations
 * Declarative charting library matching Apple's Swift Charts API
 *
 * @module swiftui-for-web/charts
 * @version 1.1.0
 */

import { View, Color } from '../index';

// =============================================================================
// PlottableValue
// =============================================================================

/**
 * Represents a data value for chart axes
 *
 * @example
 * BarMark({
 *   x: value("Month", item.month),
 *   y: value("Sales", item.sales)
 * })
 */
export class PlottableValue {
  /** The label/name for this value (shown in axes/legends) */
  readonly label: string;

  /** The raw data value */
  readonly rawValue: any;

  /** Numeric representation of the value */
  readonly numericValue: number;

  /** Inferred type: 'temporal', 'quantitative', or 'nominal' */
  readonly type: 'temporal' | 'quantitative' | 'nominal';

  /**
   * Create a plottable value
   * @param label - Display label for axes/legends
   * @param value - The data value
   */
  static value(label: string, value: any): PlottableValue;
}

/**
 * Helper function to create a PlottableValue
 *
 * @example
 * // In a BarMark
 * BarMark({
 *   x: value("Category", item.name),
 *   y: value("Amount", item.value)
 * })
 *
 * @example
 * // In a LineMark
 * LineMark({
 *   x: value("Date", item.date),
 *   y: value("Price", item.price)
 * })
 */
export function value(label: string, val: any): PlottableValue;

// =============================================================================
// Mark Base Class
// =============================================================================

/** Mark styling options */
export interface MarkStyle {
  /** Line width for strokes */
  lineWidth?: number;
  /** Dash pattern [dashLength, gapLength] */
  dash?: number[];
}

/** Foreground style options */
export interface ForegroundStyleOptions {
  /** Style by a data field for automatic coloring */
  by: PlottableValue;
}

/**
 * Base class for all chart marks
 * Provides common modifiers for styling
 */
export class Mark {
  /** X-axis value */
  x: PlottableValue | null;

  /** Y-axis value */
  y: PlottableValue | null;

  /**
   * Set the fill/stroke color
   * @param style - Color or automatic styling by field
   *
   * @example
   * // Solid color
   * BarMark({...}).foregroundStyle(Color.blue)
   *
   * @example
   * // Automatic coloring by category
   * BarMark({...}).foregroundStyle({ by: value("Category", item.category) })
   */
  foregroundStyle(style: Color | string | ForegroundStyleOptions): this;

  /**
   * Set opacity (0.0 - 1.0)
   * @param value - Opacity value
   */
  opacity(value: number): this;

  /**
   * Round bar corners
   * @param radius - Corner radius in pixels
   */
  cornerRadius(radius: number): this;

  /**
   * Add annotation label
   * @param position - Position relative to mark: 'top', 'bottom', 'leading', 'trailing', 'overlay'
   * @param content - Content builder function returning a View
   */
  annotation(position: 'top' | 'bottom' | 'leading' | 'trailing' | 'overlay', content: () => View): this;

  /**
   * Set symbol type for point marks
   * @param symbol - Symbol type
   */
  symbol(symbol: SymbolType): this;

  /**
   * Set line style for line/rule marks
   * @param style - Line styling options
   */
  lineStyle(style: MarkStyle): this;

  /**
   * Set interpolation method for line/area marks
   * @param method - Interpolation method
   */
  interpolationMethod(method: InterpolationMethod): this;
}

// =============================================================================
// Chart Marks
// =============================================================================

/** Symbol types for PointMark */
export type SymbolType = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'plus' | 'star';

/** Interpolation methods for LineMark and AreaMark */
export type InterpolationMethod = 'linear' | 'catmullRom' | 'monotone' | 'step' | 'stepStart' | 'stepEnd';

/** Bar mark options */
export interface BarMarkOptions {
  /** X-axis value (category or numeric) */
  x: PlottableValue;
  /** Y-axis value (typically numeric) */
  y: PlottableValue;
  /** Optional width specification */
  width?: number | { ratio: number };
  /** Optional height specification */
  height?: number | { ratio: number };
  /** Optional stacking */
  stacking?: 'standard' | 'normalized' | 'center';
}

/**
 * Bar/column chart mark
 *
 * @example
 * // Simple bar chart
 * Chart(data, item =>
 *   BarMark({
 *     x: value("Category", item.category),
 *     y: value("Value", item.value)
 *   })
 * )
 *
 * @example
 * // Grouped bar chart
 * Chart(data, item =>
 *   BarMark({
 *     x: value("Month", item.month),
 *     y: value("Sales", item.sales)
 *   })
 *   .foregroundStyle({ by: value("Product", item.product) })
 * )
 */
export class BarMark extends Mark {
  constructor(options: BarMarkOptions);
}

/** Line mark options */
export interface LineMarkOptions {
  /** X-axis value */
  x: PlottableValue;
  /** Y-axis value */
  y: PlottableValue;
  /** Optional series grouping */
  series?: PlottableValue;
}

/**
 * Line chart mark
 *
 * @example
 * // Simple line chart
 * Chart(data, item =>
 *   LineMark({
 *     x: value("Date", item.date),
 *     y: value("Price", item.price)
 *   })
 *   .interpolationMethod('catmullRom')
 * )
 *
 * @example
 * // Multi-series line chart
 * Chart(data, item =>
 *   LineMark({
 *     x: value("Month", item.month),
 *     y: value("Temperature", item.temp)
 *   })
 *   .foregroundStyle({ by: value("City", item.city) })
 * )
 */
export class LineMark extends Mark {
  constructor(options: LineMarkOptions);

  /**
   * Set line interpolation method
   * - 'linear': Straight lines between points
   * - 'catmullRom': Smooth curves through all points
   * - 'monotone': Smooth curves that preserve monotonicity
   * - 'step': Step function (horizontal then vertical)
   * - 'stepStart': Step starting with vertical
   * - 'stepEnd': Step ending with vertical
   */
  interpolationMethod(method: InterpolationMethod): this;
}

/** Point mark options */
export interface PointMarkOptions {
  /** X-axis value */
  x: PlottableValue;
  /** Y-axis value */
  y: PlottableValue;
}

/**
 * Point/scatter chart mark
 *
 * @example
 * // Scatter plot
 * Chart(data, item =>
 *   PointMark({
 *     x: value("X", item.x),
 *     y: value("Y", item.y)
 *   })
 *   .symbol('circle')
 * )
 *
 * @example
 * // Colored by category
 * Chart(data, item =>
 *   PointMark({
 *     x: value("X", item.x),
 *     y: value("Y", item.y)
 *   })
 *   .foregroundStyle({ by: value("Type", item.type) })
 *   .symbol('diamond')
 * )
 */
export class PointMark extends Mark {
  constructor(options: PointMarkOptions);

  /**
   * Set the symbol type
   * Options: 'circle', 'square', 'triangle', 'diamond', 'cross', 'plus', 'star'
   */
  symbol(symbol: SymbolType): this;
}

/** Area mark options */
export interface AreaMarkOptions {
  /** X-axis value */
  x: PlottableValue;
  /** Y-axis value */
  y: PlottableValue;
  /** Optional Y start value for range areas */
  yStart?: PlottableValue;
  /** Optional Y end value for range areas */
  yEnd?: PlottableValue;
  /** Optional series grouping */
  series?: PlottableValue;
  /** Stacking behavior */
  stacking?: 'standard' | 'normalized' | 'center';
}

/**
 * Filled area chart mark
 *
 * @example
 * Chart(data, item =>
 *   AreaMark({
 *     x: value("Date", item.date),
 *     y: value("Value", item.value)
 *   })
 *   .interpolationMethod('monotone')
 *   .foregroundStyle(Color.blue)
 *   .opacity(0.3)
 * )
 */
export class AreaMark extends Mark {
  constructor(options: AreaMarkOptions);

  /** Set line interpolation method */
  interpolationMethod(method: InterpolationMethod): this;
}

/** Rule mark options */
export interface RuleMarkOptions {
  /** X-axis value (for vertical line) */
  x?: PlottableValue;
  /** Y-axis value (for horizontal line) */
  y?: PlottableValue;
  /** Start X for custom line */
  xStart?: PlottableValue;
  /** End X for custom line */
  xEnd?: PlottableValue;
  /** Start Y for custom line */
  yStart?: PlottableValue;
  /** End Y for custom line */
  yEnd?: PlottableValue;
}

/**
 * Reference line mark (horizontal or vertical)
 *
 * @example
 * // Horizontal target line
 * RuleMark({
 *   y: value("Target", 100)
 * })
 * .foregroundStyle(Color.red)
 * .lineStyle({ lineWidth: 2, dash: [5, 5] })
 *
 * @example
 * // Vertical threshold line
 * RuleMark({
 *   x: value("Threshold", 50)
 * })
 */
export class RuleMark extends Mark {
  constructor(options: RuleMarkOptions);

  /** Set line style (width, dash pattern) */
  lineStyle(style: MarkStyle): this;
}

/** Rectangle mark options */
export interface RectangleMarkOptions {
  /** X start value */
  xStart?: PlottableValue;
  /** X end value */
  xEnd?: PlottableValue;
  /** Y start value */
  yStart?: PlottableValue;
  /** Y end value */
  yEnd?: PlottableValue;
}

/**
 * Rectangle region mark for highlighting areas
 *
 * @example
 * // Highlight a region
 * RectangleMark({
 *   xStart: value("Start", 10),
 *   xEnd: value("End", 20),
 *   yStart: value("Min", 0),
 *   yEnd: value("Max", 100)
 * })
 * .foregroundStyle(Color.yellow)
 * .opacity(0.2)
 */
export class RectangleMark extends Mark {
  constructor(options: RectangleMarkOptions);
}

/** Dimension specification for radius */
export interface MarkDimensionRatio {
  ratio: number;
}

export interface MarkDimensionFixed {
  value: number;
}

export interface MarkDimensionInset {
  inset: number;
}

export type MarkDimensionValue = MarkDimensionRatio | MarkDimensionFixed | MarkDimensionInset;

/** Sector mark options */
export interface SectorMarkOptions {
  /** Angular value (determines slice size) */
  angle: PlottableValue;
  /** Inner radius (0 for pie, > 0 for donut) */
  innerRadius?: MarkDimensionValue;
  /** Outer radius */
  outerRadius?: MarkDimensionValue;
  /** Gap between slices in degrees */
  angularInset?: number;
}

/**
 * Pie/donut chart sector mark
 *
 * @example
 * // Pie chart
 * Chart(data, item =>
 *   SectorMark({
 *     angle: value("Value", item.value)
 *   })
 *   .foregroundStyle({ by: value("Category", item.category) })
 * )
 *
 * @example
 * // Donut chart
 * Chart(data, item =>
 *   SectorMark({
 *     angle: value("Value", item.value),
 *     innerRadius: MarkDimension.ratio(0.5),
 *     outerRadius: MarkDimension.ratio(1.0)
 *   })
 * )
 */
export class SectorMark extends Mark {
  constructor(options: SectorMarkOptions);
}

/**
 * Helper for creating radius dimension values
 *
 * @example
 * SectorMark({
 *   angle: value("Value", item.value),
 *   innerRadius: MarkDimension.ratio(0.5),  // 50% of available radius
 *   outerRadius: MarkDimension.fixed(100)   // Fixed 100px
 * })
 */
export const MarkDimension: {
  /** Ratio of available radius (0.0 - 1.0) */
  ratio(value: number): MarkDimensionRatio;
  /** Fixed pixel value */
  fixed(value: number): MarkDimensionFixed;
  /** Inset from edge */
  inset(value: number): MarkDimensionInset;
};

// =============================================================================
// Chart Container
// =============================================================================

/** Chart axis configuration */
export interface ChartAxisConfig {
  /** Axis label */
  label?: string;
  /** Hide the axis */
  hidden?: boolean;
  /** Grid lines visibility */
  gridLines?: boolean;
  /** Tick count hint */
  tickCount?: number;
  /** Custom tick values */
  tickValues?: any[];
  /** Format function for tick labels */
  formatLabel?: (value: any) => string;
}

/** Chart scale configuration */
export interface ChartScaleConfig {
  /** Domain range [min, max] */
  domain?: [number, number];
  /** Scale type */
  type?: 'linear' | 'log' | 'time' | 'band';
  /** Nice rounding */
  nice?: boolean;
}

/** Chart legend configuration */
export type ChartLegendConfig = 'visible' | 'hidden' | {
  position?: 'top' | 'bottom' | 'leading' | 'trailing';
};

/** Mark content builder */
export type MarkBuilder<T> = (item: T, index: number) => Mark | Mark[];

/**
 * Chart container - the main charting component
 *
 * @example
 * // With data array
 * Chart(salesData, item =>
 *   BarMark({
 *     x: value("Month", item.month),
 *     y: value("Sales", item.sales)
 *   })
 * )
 * .frame({ width: 500, height: 300 })
 *
 * @example
 * // With direct marks
 * Chart([
 *   BarMark({...}),
 *   RuleMark({...})
 * ])
 */
export class Chart extends View {
  /**
   * Create a chart with data and mark builder
   * @param data - Array of data items
   * @param content - Function that creates marks for each item
   */
  constructor<T>(data: T[], content: MarkBuilder<T>);

  /**
   * Create a chart with direct marks array
   * @param marks - Array of marks to render
   */
  constructor(marks: Mark[]);

  /**
   * Set chart dimensions
   * @param frame - Width and height
   */
  frame(frame: { width?: number; height?: number }): this;

  /**
   * Configure the X axis
   * @param config - Axis configuration
   *
   * @example
   * .chartXAxis({ label: 'Month', gridLines: true })
   */
  chartXAxis(config: ChartAxisConfig): this;

  /**
   * Configure the Y axis
   * @param config - Axis configuration
   *
   * @example
   * .chartYAxis({ label: 'Sales ($)', tickCount: 5 })
   */
  chartYAxis(config: ChartAxisConfig): this;

  /**
   * Configure the X scale
   * @param config - Scale configuration
   *
   * @example
   * .chartXScale({ domain: [0, 100] })
   */
  chartXScale(config: ChartScaleConfig): this;

  /**
   * Configure the Y scale
   * @param config - Scale configuration
   *
   * @example
   * .chartYScale({ domain: [0, 1000], nice: true })
   */
  chartYScale(config: ChartScaleConfig): this;

  /**
   * Configure the legend
   * @param config - Legend visibility or configuration
   *
   * @example
   * .chartLegend('visible')
   * .chartLegend({ position: 'bottom' })
   */
  chartLegend(config: ChartLegendConfig): this;

  /**
   * Set chart background
   * @param color - Background color
   */
  chartBackground(color: Color | string): this;

  /**
   * Add chart overlay content
   * @param content - Overlay view builder
   */
  chartOverlay(content: () => View): this;

  /**
   * Set plot area insets
   * @param insets - Edge insets
   */
  chartPlotStyle(insets: { top?: number; leading?: number; bottom?: number; trailing?: number }): this;
}

/**
 * Factory function to create a Chart
 *
 * @example
 * createChart(data, item => BarMark({...}))
 */
export function createChart<T>(data: T[], content: MarkBuilder<T>): Chart;
export function createChart(marks: Mark[]): Chart;

// =============================================================================
// Factory Functions for Marks
// =============================================================================

export function createBarMark(options: BarMarkOptions): BarMark;
export function createLineMark(options: LineMarkOptions): LineMark;
export function createPointMark(options: PointMarkOptions): PointMark;
export function createAreaMark(options: AreaMarkOptions): AreaMark;
export function createRuleMark(options: RuleMarkOptions): RuleMark;
export function createRectangleMark(options: RectangleMarkOptions): RectangleMark;
export function createSectorMark(options: SectorMarkOptions): SectorMark;

// =============================================================================
// Charts Namespace
// =============================================================================

/**
 * Namespace containing all chart components
 *
 * @example
 * import { Charts } from 'swiftui-for-web/charts';
 * const { Chart, BarMark, value } = Charts;
 */
export const Charts: {
  Chart: typeof Chart;
  BarMark: typeof BarMark;
  LineMark: typeof LineMark;
  PointMark: typeof PointMark;
  AreaMark: typeof AreaMark;
  RuleMark: typeof RuleMark;
  RectangleMark: typeof RectangleMark;
  SectorMark: typeof SectorMark;
  PlottableValue: typeof PlottableValue;
  value: typeof value;
  Mark: typeof Mark;
  MarkDimension: typeof MarkDimension;
};

export default Charts;
