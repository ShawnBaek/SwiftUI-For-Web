/**
 * In-place update benchmark (#53).
 *
 * Measures what the signal engine actually does on a state change: the
 * js-framework-benchmark scenarios, each driven by State writes and run to
 * completion (Scheduler.flushSync, then a forced layout read), on one
 * mounted app. Nothing remounts. Everything is synchronous, so the results
 * are in the page before its load event (the headless runner reads them
 * with --dump-dom).
 *
 *   node scripts/run-browser-tests.js --bench
 */
import { App, VStack, HStack, Text, ForEach, State } from '../../src/index.js';
import { flushSync } from '../../src/Core/Scheduler.js';

const ADJECTIVES = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint'];
const NOUNS = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger'];
let nextId = 1;
let seed = 1;
const random = (max) => {
  seed = (seed * 16807) % 2147483647;
  return seed % max;
};
const buildRows = (count) => Array.from({ length: count }, () => ({
  id: nextId++,
  label: new State(`${ADJECTIVES[random(ADJECTIVES.length)]} ${NOUNS[random(NOUNS.length)]}`),
}));

function runScenario(name, iterations, setup, run) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    setup();
    flushSync();
    void document.body.offsetHeight;
    const start = performance.now();
    run();
    flushSync();
    void document.body.offsetHeight;
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return { name, median: times[Math.floor(times.length / 2)], min: times[0], max: times[times.length - 1], iterations };
}

export function runUpdateBenchmarks(host) {
  const rows = new State([]);
  const selected = new State(0);
  const app = App(() => VStack(
    ForEach(rows, { id: 'id' }, (row) => HStack(
      Text(String(row.id)),
      Text(row.label),
      Text(() => (selected.value === row.id ? 'selected' : '')),
    )),
  )).mount(host);

  const results = [
    runScenario('Create 1,000 rows', 10, () => { rows.value = []; }, () => { rows.value = buildRows(1000); }),
    runScenario('Replace all 1,000 rows', 10, () => { rows.value = buildRows(1000); }, () => { rows.value = buildRows(1000); }),
    runScenario('Update every 10th row', 10, () => { if (rows.value.length !== 1000) rows.value = buildRows(1000); }, () => {
      const list = rows.value;
      for (let i = 0; i < list.length; i += 10) list[i].label.value += ' !!!';
    }),
    runScenario('Select a row', 10, () => { if (rows.value.length !== 1000) rows.value = buildRows(1000); }, () => {
      selected.value = rows.value[random(1000)].id;
    }),
    runScenario('Swap two rows', 10, () => { if (rows.value.length !== 1000) rows.value = buildRows(1000); }, () => {
      const list = rows.value.slice();
      [list[1], list[998]] = [list[998], list[1]];
      rows.value = list;
    }),
    runScenario('Remove one row', 10, () => { rows.value = buildRows(1000); }, () => {
      rows.value = rows.value.filter((_, i) => i !== 500);
    }),
    runScenario('Append 1,000 rows to 1,000', 5, () => { rows.value = buildRows(1000); }, () => {
      rows.value = [...rows.value, ...buildRows(1000)];
    }),
    runScenario('Clear 1,000 rows', 10, () => { rows.value = buildRows(1000); }, () => { rows.value = []; }),
  ];
  app.unmount();
  return results;
}
