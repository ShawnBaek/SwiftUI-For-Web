/**
 * Swift Charts for Web
 * A charting library that mirrors Apple's Swift Charts API
 * Integrates seamlessly with SwiftUI-For-Web
 *
 * Usage:
 *   import { Chart, BarMark, LineMark, value } from './Charts/index.js';
 *
 *   // Bar Chart
 *   Chart(salesData, item =>
 *     BarMark({
 *       x: value("Month", item.month),
 *       y: value("Sales", item.sales)
 *     })
 *     .foregroundStyle(Color.blue)
 *   )
 *
 *   // Line Chart
 *   Chart(priceData, item =>
 *     LineMark({
 *       x: value("Date", item.date),
 *       y: value("Price", item.price)
 *     })
 *     .interpolationMethod('catmullRom')
 *   )
 *
 *   // Pie Chart
 *   Chart(categoryData, item =>
 *     SectorMark({
 *       angle: value("Amount", item.amount)
 *     })
 *     .foregroundStyle({ by: value("Category", item.category) })
 *   )
 */

// Core
export { PlottableValue, value } from './PlottableValue.js';
export { Mark } from './Mark.js';
export { Chart, createChart } from './Chart.js';

// Marks
export { BarMark, createBarMark } from './BarMark.js';
export { LineMark, createLineMark } from './LineMark.js';
export { PointMark, createPointMark } from './PointMark.js';
export { AreaMark, createAreaMark } from './AreaMark.js';
export { RuleMark, createRuleMark } from './RuleMark.js';
export { RectangleMark, createRectangleMark } from './RectangleMark.js';
export { SectorMark, createSectorMark, MarkDimension } from './SectorMark.js';

/**
 * Convenience factory functions matching Swift Charts syntax
 * These allow: BarMark({ x: value(...), y: value(...) })
 */
import { BarMark as BarMarkClass } from './BarMark.js';
import { LineMark as LineMarkClass } from './LineMark.js';
import { PointMark as PointMarkClass } from './PointMark.js';
import { AreaMark as AreaMarkClass } from './AreaMark.js';
import { RuleMark as RuleMarkClass } from './RuleMark.js';
import { RectangleMark as RectangleMarkClass } from './RectangleMark.js';
import { SectorMark as SectorMarkClass } from './SectorMark.js';
import { Chart as ChartClass } from './Chart.js';
import { value as valueFunc } from './PlottableValue.js';

// Re-export as callable functions
export const Charts = {
  Chart: (dataOrContent, contentBuilder) => new ChartClass(dataOrContent, contentBuilder),
  BarMark: (options) => new BarMarkClass(options),
  LineMark: (options) => new LineMarkClass(options),
  PointMark: (options) => new PointMarkClass(options),
  AreaMark: (options) => new AreaMarkClass(options),
  RuleMark: (options) => new RuleMarkClass(options),
  RectangleMark: (options) => new RectangleMarkClass(options),
  SectorMark: (options) => new SectorMarkClass(options),
  value: valueFunc,
  MarkDimension: {
    ratio: (val) => ({ ratio: val }),
    fixed: (val) => ({ value: val }),
    inset: (val) => ({ inset: val })
  }
};

export default Charts;
