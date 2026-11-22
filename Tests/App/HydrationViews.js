/**
 * Views rendered on the "server" (renderToString in Node, served by
 * scripts/run-browser-tests.js) and adopted in the page (HydrationTests.js)
 * (#39).
 * Each fixture builds fresh state with the same initial values on both sides.
 */

import { VStack, HStack, Text, Button, TextField, Toggle, Spacer, State, Color } from '../../src/index.js';
import { Chart, BarMark, LineMark, value } from '../../src/Charts/index.js';

export const fixtures = {
  counter() {
    const count = new State(0);
    const name = new State('Ada');
    const on = new State(false);
    let taps = 0;
    const view = () => VStack({ spacing: 8 },
      Text(() => `Count: ${count.value}`).padding(8).background(Color.gray).padding(4),
      HStack(
        Button('Increment', () => { taps++; count.value += 1; }),
        Spacer(),
        Text(() => (on.value ? 'On' : 'Off')),
      ),
      TextField('Name', name.binding),
      Toggle('Enabled', on.binding),
      Text(() => `Hello, ${name.value}`).onTapGesture(() => { count.value += 10; }),
    );
    return { view, count, name, on, taps: () => taps };
  },

  // The server rendered an older version of the middle section.
  mismatchServer() {
    const count = new State(0);
    const view = () => VStack(
      Text('Title'),
      VStack(Text('Old line')),
      Button('Add', () => { count.value += 1; }),
      Text(() => `Total: ${count.value}`),
    );
    return { view, count };
  },
  mismatchClient() {
    const count = new State(0);
    const view = () => VStack(
      Text('Title'),
      HStack(Button('New', () => {}), Text('New line'), Text('Second')),
      Button('Add', () => { count.value += 1; }),
      Text(() => `Total: ${count.value}`),
    );
    return { view, count };
  },

  // A chart (#48): SVG marks, axes and a legend; the data is a State.
  chart() {
    const rows = new State([{ m: 'Jan', v: 3, s: 'A' }, { m: 'Feb', v: 5, s: 'A' }, { m: 'Jan', v: 2, s: 'B' }, { m: 'Feb', v: 4, s: 'B' }]);
    const view = () => VStack(
      Text('Sales'),
      Chart(rows, (row) => [
        BarMark({ x: value('Month', row.m), y: value('Sales', row.v) }).foregroundStyle({ by: value('Series', row.s) }),
        LineMark({ x: value('Month', row.m), y: value('Sales', row.v) }).foregroundStyle({ by: value('Series', row.s) }),
      ]).frame({ width: 300, height: 200 }),
    );
    return { view, rows };
  },
};
