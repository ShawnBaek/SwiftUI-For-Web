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

import { PlottableValue, value } from './PlottableValue.js';
import { Chart } from './Chart.js';
import { BarMark } from './BarMark.js';
import { LineMark } from './LineMark.js';
import { PointMark } from './PointMark.js';
import { AreaMark } from './AreaMark.js';
import { RuleMark } from './RuleMark.js';
import { RectangleMark } from './RectangleMark.js';
import { SectorMark, MarkDimension } from './SectorMark.js';

// Chart and the marks are descriptor factories (#48): call them directly.
export { Chart, BarMark, LineMark, PointMark, AreaMark, RuleMark, RectangleMark, SectorMark };
export { PlottableValue, value };
export { MarkDimension };

// Aliases of the factories, kept for existing code.
export const createChart = Chart;
export const createBarMark = BarMark;
export const createLineMark = LineMark;
export const createPointMark = PointMark;
export const createAreaMark = AreaMark;
export const createRuleMark = RuleMark;
export const createRectangleMark = RectangleMark;
export const createSectorMark = SectorMark;

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
  PlottableValue,
  value,
  MarkDimension
};

export default Charts;
