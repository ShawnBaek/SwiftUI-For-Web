/**
 * Swift Charts for Web - Demo Application
 * Demonstrates all chart types matching Apple's Swift Charts API
 */

import SwiftUI from '../../src/index.js';

const {
  VStack, HStack, Text, Spacer, Divider, ScrollView,
  Font, Color, App,
  // Charts
  Chart, BarMark, LineMark, PointMark, AreaMark, RuleMark, SectorMark,
  value, MarkDimension
} = SwiftUI;

// =============================================================================
// Sample Data
// =============================================================================

// Monthly sales data
const salesData = [
  { month: 'Jan', sales: 120, profit: 45 },
  { month: 'Feb', sales: 150, profit: 55 },
  { month: 'Mar', sales: 180, profit: 70 },
  { month: 'Apr', sales: 140, profit: 50 },
  { month: 'May', sales: 200, profit: 85 },
  { month: 'Jun', sales: 220, profit: 95 }
];

// Time series data
const stockData = [
  { day: 1, price: 150.5, volume: 1200 },
  { day: 2, price: 152.3, volume: 1400 },
  { day: 3, price: 148.7, volume: 1100 },
  { day: 4, price: 155.2, volume: 1800 },
  { day: 5, price: 158.9, volume: 2000 },
  { day: 6, price: 157.1, volume: 1600 },
  { day: 7, price: 162.4, volume: 2200 }
];

// Multi-series data
const temperatureData = [
  { month: 'Jan', city: 'San Francisco', temp: 52 },
  { month: 'Feb', city: 'San Francisco', temp: 55 },
  { month: 'Mar', city: 'San Francisco', temp: 58 },
  { month: 'Apr', city: 'San Francisco', temp: 62 },
  { month: 'May', city: 'San Francisco', temp: 65 },
  { month: 'Jun', city: 'San Francisco', temp: 68 },
  { month: 'Jan', city: 'New York', temp: 35 },
  { month: 'Feb', city: 'New York', temp: 38 },
  { month: 'Mar', city: 'New York', temp: 45 },
  { month: 'Apr', city: 'New York', temp: 55 },
  { month: 'May', city: 'New York', temp: 65 },
  { month: 'Jun', city: 'New York', temp: 75 }
];

// Category data for pie chart
const marketShareData = [
  { company: 'Apple', share: 28 },
  { company: 'Samsung', share: 22 },
  { company: 'Xiaomi', share: 13 },
  { company: 'Oppo', share: 10 },
  { company: 'Others', share: 27 }
];

// Scatter data
const scatterData = [
  { x: 10, y: 25, category: 'A' },
  { x: 20, y: 45, category: 'A' },
  { x: 30, y: 35, category: 'A' },
  { x: 40, y: 55, category: 'B' },
  { x: 50, y: 65, category: 'B' },
  { x: 60, y: 50, category: 'B' },
  { x: 70, y: 75, category: 'A' },
  { x: 80, y: 85, category: 'B' }
];

// =============================================================================
// Chart Section Component
// =============================================================================

const ChartSection = (title, description, chartView) => {
  return VStack({ alignment: 'leading', spacing: 12 },
    Text(title)
      .font(Font.system(20, Font.Weight.semibold))
      .foregroundColor(Color.hex('#1d1d1f')),
    Text(description)
      .font(Font.system(14))
      .foregroundColor(Color.hex('#86868b')),
    chartView
      .modifier({
        apply(el) {
          el.style.backgroundColor = 'white';
          el.style.borderRadius = '12px';
          el.style.padding = '20px';
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }
      })
  )
  .padding({ bottom: 32 });
};

// =============================================================================
// Chart Examples
// =============================================================================

// 1. Bar Chart
const BarChartExample = () => {
  return Chart(salesData, item =>
    BarMark({
      x: value('Month', item.month),
      y: value('Sales', item.sales)
    })
    .foregroundStyle(Color.hex('#007AFF'))
    .cornerRadius(4)
  )
  .frame({ width: 500, height: 300 })
  .chartXAxis({ label: 'Month' })
  .chartYAxis({ label: 'Sales ($K)' });
};

// 2. Grouped Bar Chart
const GroupedBarChartExample = () => {
  const groupedData = salesData.flatMap(item => [
    { month: item.month, value: item.sales, type: 'Sales' },
    { month: item.month, value: item.profit, type: 'Profit' }
  ]);

  return Chart(groupedData, item =>
    BarMark({
      x: value('Month', item.month),
      y: value('Value', item.value)
    })
    .foregroundStyle({ by: value('Type', item.type) })
    .cornerRadius(2)
  )
  .frame({ width: 500, height: 300 })
  .chartLegend('visible');
};

// 3. Line Chart
const LineChartExample = () => {
  return Chart(stockData, item =>
    LineMark({
      x: value('Day', item.day),
      y: value('Price', item.price)
    })
    .foregroundStyle(Color.hex('#34C759'))
    .interpolationMethod('catmullRom')
  )
  .frame({ width: 500, height: 300 })
  .chartYScale({ domain: [145, 170] });
};

// 4. Multi-Series Line Chart
const MultiLineChartExample = () => {
  return Chart(temperatureData, item =>
    LineMark({
      x: value('Month', item.month),
      y: value('Temperature', item.temp)
    })
    .foregroundStyle({ by: value('City', item.city) })
    .interpolationMethod('monotone')
  )
  .frame({ width: 500, height: 300 })
  .chartLegend('visible');
};

// 5. Area Chart
const AreaChartExample = () => {
  return Chart(stockData, item =>
    AreaMark({
      x: value('Day', item.day),
      y: value('Volume', item.volume)
    })
    .foregroundStyle(Color.hex('#5856D6'))
    .interpolationMethod('monotone')
  )
  .frame({ width: 500, height: 300 });
};

// 6. Line + Point Chart (Combo)
const ComboChartExample = () => {
  return Chart(stockData, item => [
    LineMark({
      x: value('Day', item.day),
      y: value('Price', item.price)
    })
    .foregroundStyle(Color.hex('#FF9500'))
    .interpolationMethod('catmullRom'),

    PointMark({
      x: value('Day', item.day),
      y: value('Price', item.price)
    })
    .foregroundStyle(Color.hex('#FF9500'))
    .symbol('circle')
  ])
  .frame({ width: 500, height: 300 });
};

// 7. Scatter Plot
const ScatterPlotExample = () => {
  return Chart(scatterData, item =>
    PointMark({
      x: value('X', item.x),
      y: value('Y', item.y)
    })
    .foregroundStyle({ by: value('Category', item.category) })
    .symbol('circle')
  )
  .frame({ width: 500, height: 300 })
  .chartLegend('visible');
};

// 8. Pie Chart
const PieChartExample = () => {
  return Chart(marketShareData, item =>
    SectorMark({
      angle: value('Share', item.share)
    })
    .foregroundStyle({ by: value('Company', item.company) })
  )
  .frame({ width: 400, height: 300 })
  .chartLegend('visible');
};

// 9. Donut Chart
const DonutChartExample = () => {
  return Chart(marketShareData, item =>
    SectorMark({
      angle: value('Share', item.share),
      innerRadius: MarkDimension.ratio(0.5),
      outerRadius: MarkDimension.ratio(1.0)
    })
    .foregroundStyle({ by: value('Company', item.company) })
  )
  .frame({ width: 400, height: 300 })
  .chartLegend('visible');
};

// 10. Bar Chart with Rule (Target Line)
const BarWithRuleExample = () => {
  const targetValue = 170;

  return Chart([
    ...salesData.map(item =>
      BarMark({
        x: value('Month', item.month),
        y: value('Sales', item.sales)
      })
      .foregroundStyle(Color.hex('#007AFF'))
      .cornerRadius(4)
    ),
    RuleMark({
      y: value('Target', targetValue)
    })
    .foregroundStyle(Color.hex('#FF3B30'))
    .lineStyle({ lineWidth: 2, dash: [5, 5] })
  ])
  .frame({ width: 500, height: 300 });
};

// =============================================================================
// Main App
// =============================================================================

const ChartsDemo = () => {
  return ScrollView({ axis: 'vertical' },
    VStack({ alignment: 'leading', spacing: 0 },
      // Header
      VStack({ alignment: 'leading', spacing: 8 },
        Text('Swift Charts for Web')
          .font(Font.system(34, Font.Weight.bold))
          .foregroundColor(Color.hex('#1d1d1f')),
        Text('A declarative charting library that mirrors Apple\'s Swift Charts API')
          .font(Font.system(17))
          .foregroundColor(Color.hex('#86868b'))
      )
      .padding({ bottom: 40 }),

      // Chart Examples
      ChartSection(
        'Bar Chart',
        'Display categorical data with vertical bars using BarMark',
        BarChartExample()
      ),

      ChartSection(
        'Grouped Bar Chart',
        'Compare multiple data series side by side with foregroundStyle(by:)',
        GroupedBarChartExample()
      ),

      ChartSection(
        'Line Chart',
        'Show trends over time with LineMark and interpolation methods',
        LineChartExample()
      ),

      ChartSection(
        'Multi-Series Line Chart',
        'Compare trends across multiple categories',
        MultiLineChartExample()
      ),

      ChartSection(
        'Area Chart',
        'Emphasize volume or magnitude with filled areas using AreaMark',
        AreaChartExample()
      ),

      ChartSection(
        'Line + Point Combo',
        'Combine multiple mark types for rich visualizations',
        ComboChartExample()
      ),

      ChartSection(
        'Scatter Plot',
        'Show correlation between two variables using PointMark',
        ScatterPlotExample()
      ),

      ChartSection(
        'Pie Chart',
        'Display proportions with SectorMark',
        PieChartExample()
      ),

      ChartSection(
        'Donut Chart',
        'Pie chart with inner radius for a modern look',
        DonutChartExample()
      ),

      ChartSection(
        'Bar Chart with Target Line',
        'Combine BarMark with RuleMark to show targets or thresholds',
        BarWithRuleExample()
      ),

      // Code Example
      VStack({ alignment: 'leading', spacing: 12 },
        Text('Usage Example')
          .font(Font.system(20, Font.Weight.semibold))
          .foregroundColor(Color.hex('#1d1d1f')),
        Text('import { Chart, BarMark, value } from \'swiftui-for-web\';\n\n' +
             'Chart(salesData, item =>\n' +
             '  BarMark({\n' +
             '    x: value("Month", item.month),\n' +
             '    y: value("Sales", item.sales)\n' +
             '  })\n' +
             '  .foregroundStyle(Color.blue)\n' +
             '  .cornerRadius(4)\n' +
             ')\n' +
             '.frame({ width: 500, height: 300 })')
          .font(Font.system(13))
          .modifier({
            apply(el) {
              el.style.fontFamily = 'SF Mono, Menlo, Monaco, monospace';
              el.style.backgroundColor = '#1d1d1f';
              el.style.color = '#f5f5f7';
              el.style.padding = '20px';
              el.style.borderRadius = '12px';
              el.style.whiteSpace = 'pre';
              el.style.overflow = 'auto';
            }
          })
      )
      .padding({ top: 20 }),

      Spacer()
    )
    .padding(40)
  );
};

// Mount the app
App(ChartsDemo).mount('#root');
