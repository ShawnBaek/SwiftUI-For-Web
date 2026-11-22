// Swift Charts: Chart and marks are descriptors; modifiers chain as usual.
import { App, VStack, Text, Font, Color, Chart, BarMark, LineMark, value } from 'swiftui-for-web';

const sales = [
  { month: 'Jan', sales: 120 },
  { month: 'Feb', sales: 150 },
  { month: 'Mar', sales: 180 },
  { month: 'Apr', sales: 140 },
  { month: 'May', sales: 200 },
  { month: 'Jun', sales: 220 },
];

const ChartsView = () =>
  VStack({ alignment: 'leading', spacing: 16 },
    Text('Monthly sales').font(Font.title2),
    Chart(sales, (item) =>
      BarMark({ x: value('Month', item.month), y: value('Sales', item.sales) })
        .foregroundStyle(Color.blue)
        .cornerRadius(4)
    )
      .frame({ width: 420, height: 220 })
      .chartYAxis({ label: 'Sales ($K)' }),

    Text('Trend').font(Font.title2),
    Chart(sales, (item) =>
      LineMark({ x: value('Month', item.month), y: value('Sales', item.sales) })
        .foregroundStyle(Color.green)
        .interpolationMethod('catmullRom')
    )
      .frame({ width: 420, height: 180 })
  )
  .padding(20);

App(ChartsView).mount('#root');
