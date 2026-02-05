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

// Import classes
import { PlottableValue, value } from './PlottableValue.js';
import { Mark } from './Mark.js';
import { Chart as ChartClass, createChart } from './Chart.js';
import { BarMark as BarMarkClass, createBarMark } from './BarMark.js';
import { LineMark as LineMarkClass, createLineMark } from './LineMark.js';
import { PointMark as PointMarkClass, createPointMark } from './PointMark.js';
import { AreaMark as AreaMarkClass, createAreaMark } from './AreaMark.js';
import { RuleMark as RuleMarkClass, createRuleMark } from './RuleMark.js';
import { RectangleMark as RectangleMarkClass, createRectangleMark } from './RectangleMark.js';
import { SectorMark as SectorMarkClass, createSectorMark, MarkDimension } from './SectorMark.js';

// Export factory functions (callable without 'new')
export function Chart(dataOrContent, contentBuilder) {
  return new ChartClass(dataOrContent, contentBuilder);
}

export function BarMark(options) {
  return new BarMarkClass(options);
}

export function LineMark(options) {
  return new LineMarkClass(options);
}

export function PointMark(options) {
  return new PointMarkClass(options);
}

export function AreaMark(options) {
  return new AreaMarkClass(options);
}

export function RuleMark(options) {
  return new RuleMarkClass(options);
}

export function RectangleMark(options) {
  return new RectangleMarkClass(options);
}

export function SectorMark(options) {
  return new SectorMarkClass(options);
}

// Re-export other items
export { PlottableValue, value };
export { Mark };
export { MarkDimension };
export { createChart, createBarMark, createLineMark, createPointMark, createAreaMark, createRuleMark, createRectangleMark, createSectorMark };

// Charts namespace
export const Charts = {
  Chart,
  BarMark,
  LineMark,
  PointMark,
  AreaMark,
  RuleMark,
  RectangleMark,
  SectorMark,
  value,
  MarkDimension
};

export default Charts;
