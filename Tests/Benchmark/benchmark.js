/**
 * Benchmark Suite: SwiftUI-For-Web vs React 19
 *
 * This module measures real-world rendering performance across several
 * scenarios that stress different parts of the rendering pipeline.
 *
 * Benchmarks:
 * 1. Mount 1000 rows — initial render of a large list
 * 2. Update every 10th row — partial update (state change)
 * 3. Replace all rows — full replacement of list data
 * 4. Append 1000 rows — adding to an existing list
 * 5. Remove a row — single item deletion
 * 6. Swap two rows — reorder by key
 * 7. Clear all rows — empty a full list
 * 8. Create & destroy 10000 elements — raw DOM throughput / GC pressure
 *
 * Each benchmark runs multiple iterations and reports median, min, max, and ops/sec.
 *
 * Run with:
 *   Open Tests/Benchmark/index.html in a browser
 *   Or: import { runAllBenchmarks } from './benchmark.js'; runAllBenchmarks();
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatMs(ms) {
  return ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;
}

function generateData(count, offset = 0) {
  const data = new Array(count);
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: offset + i + 1,
      label: `Item #${offset + i + 1} — ${ADJECTIVES[i % ADJECTIVES.length]} ${NOUNS[i % NOUNS.length]}`
    };
  }
  return data;
}

const ADJECTIVES = [
  'pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome',
  'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful',
  'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive',
  'cheap', 'expensive', 'fancy'
];

const NOUNS = [
  'table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie',
  'sandwich', 'burger', 'pizza', 'mouse', 'keyboard', 'screen', 'computer',
  'bottle', 'glass', 'frame', 'lamp', 'camera'
];

// ---------------------------------------------------------------------------
// Benchmark Runner
// ---------------------------------------------------------------------------

/**
 * Run a single benchmark function multiple times and collect timings.
 *
 * @param {string} name - Benchmark name
 * @param {Function} setupFn - Setup function (called once before iterations)
 * @param {Function} benchFn - Function to benchmark
 * @param {Function} [teardownFn] - Cleanup function
 * @param {number} [iterations=10] - Number of iterations
 * @returns {Object} Benchmark result
 */
async function runBenchmark(name, setupFn, benchFn, teardownFn, iterations = 10) {
  const times = [];

  for (let i = 0; i < iterations; i++) {
    if (setupFn) await setupFn();

    // Force GC if available
    if (typeof gc === 'function') gc();

    const start = performance.now();
    await benchFn();
    const end = performance.now();

    times.push(end - start);

    if (teardownFn) await teardownFn();
  }

  const med = median(times);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = times.reduce((s, t) => s + t, 0) / times.length;

  return {
    name,
    median: med,
    min,
    max,
    avg,
    opsPerSec: 1000 / med,
    times
  };
}

// ---------------------------------------------------------------------------
// SwiftUI-For-Web Benchmarks
// ---------------------------------------------------------------------------

async function benchmarkSwiftUI(container) {
  // Dynamic import to avoid module errors in non-module contexts
  const SwiftUI = await import('../../src/index.js');
  const {
    App, VStack, HStack, Text, Button, ForEach, Spacer, Font, Color,
    State, batch
  } = SwiftUI;

  const results = [];
  let app = null;
  let data = new State([]);

  function createApp() {
    if (app) app.unmount();
    data = new State([]);
    app = App(() =>
      VStack({ spacing: 0 },
        ...data.value.map(item =>
          HStack({ spacing: 8 },
            Text(String(item.id))
              .frame({ width: 60 })
              .foregroundColor(Color.secondary),
            Text(item.label),
            Spacer()
          )
          .padding({ vertical: 2, horizontal: 8 })
          .id(item.id)
        )
      )
    ).mount(container);
    return app;
  }

  // 1. Mount 1000 rows
  results.push(await runBenchmark(
    'Create 1,000 rows',
    () => { if (app) app.unmount(); container.textContent = ''; },
    () => {
      data = new State(generateData(1000));
      app = App(() =>
        VStack({ spacing: 0 },
          ...data.value.map(item =>
            HStack({ spacing: 8 },
              Text(String(item.id)).frame({ width: 60 }),
              Text(item.label),
              Spacer()
            ).padding({ vertical: 2, horizontal: 8 }).id(item.id)
          )
        )
      ).mount(container);
    },
    null,
    5
  ));

  // 2. Update every 10th row
  results.push(await runBenchmark(
    'Update every 10th row',
    () => {
      createApp();
      data.value = generateData(1000);
      app.refresh();
    },
    () => {
      const newData = [...data.value];
      for (let i = 0; i < newData.length; i += 10) {
        newData[i] = { ...newData[i], label: newData[i].label + ' !!!' };
      }
      data._value = newData;
      app.refresh();
    },
    null,
    10
  ));

  // 3. Replace all rows
  results.push(await runBenchmark(
    'Replace all 1,000 rows',
    () => {
      createApp();
      data.value = generateData(1000);
      app.refresh();
    },
    () => {
      data._value = generateData(1000, 1000);
      app.refresh();
    },
    null,
    5
  ));

  // 4. Append 1000 rows
  results.push(await runBenchmark(
    'Append 1,000 rows to 1,000',
    () => {
      createApp();
      data.value = generateData(1000);
      app.refresh();
    },
    () => {
      data._value = [...data.value, ...generateData(1000, 1000)];
      app.refresh();
    },
    null,
    5
  ));

  // 5. Remove a row
  results.push(await runBenchmark(
    'Remove one row from 1,000',
    () => {
      createApp();
      data.value = generateData(1000);
      app.refresh();
    },
    () => {
      const idx = Math.floor(data.value.length / 2);
      const newData = [...data.value];
      newData.splice(idx, 1);
      data._value = newData;
      app.refresh();
    },
    null,
    10
  ));

  // 6. Swap two rows
  results.push(await runBenchmark(
    'Swap two rows in 1,000',
    () => {
      createApp();
      data.value = generateData(1000);
      app.refresh();
    },
    () => {
      const newData = [...data.value];
      const tmp = newData[1];
      newData[1] = newData[998];
      newData[998] = tmp;
      data._value = newData;
      app.refresh();
    },
    null,
    10
  ));

  // 7. Clear all rows
  results.push(await runBenchmark(
    'Clear 1,000 rows',
    () => {
      createApp();
      data.value = generateData(1000);
      app.refresh();
    },
    () => {
      data._value = [];
      app.refresh();
    },
    null,
    10
  ));

  // 8. Raw element create/destroy throughput
  results.push(await runBenchmark(
    'Create+destroy 10,000 elements',
    () => { container.textContent = ''; },
    () => {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 10000; i++) {
        const el = document.createElement('span');
        el.textContent = `Item ${i}`;
        frag.appendChild(el);
      }
      container.appendChild(frag);
      container.textContent = '';
    },
    null,
    5
  ));

  // Cleanup
  if (app) app.unmount();

  return results;
}

// ---------------------------------------------------------------------------
// React 19 Benchmarks (via CDN)
// ---------------------------------------------------------------------------

async function benchmarkReact(container) {
  // Load React from CDN
  if (!window.React || !window.ReactDOM) {
    await loadScript('https://unpkg.com/react@19/umd/react.production.min.js');
    await loadScript('https://unpkg.com/react-dom@19/umd/react-dom.production.min.js');
  }

  const React = window.React;
  const ReactDOM = window.ReactDOM;
  const { createElement: h, useState } = React;

  const results = [];
  let root = null;

  function createRoot() {
    if (root) root.unmount();
    container.textContent = '';
    root = ReactDOM.createRoot(container);
    return root;
  }

  // Row component
  function Row({ item }) {
    return h('div', {
      key: item.id,
      style: { display: 'flex', gap: '8px', padding: '2px 8px' }
    },
      h('span', { style: { width: '60px', color: '#888' } }, String(item.id)),
      h('span', null, item.label),
      h('div', { style: { flexGrow: 1 } })
    );
  }

  // App component with external state control
  let setDataFn = null;
  function AppComponent() {
    const [data, setData] = useState([]);
    setDataFn = setData;
    return h('div', { style: { display: 'flex', flexDirection: 'column' } },
      data.map(item => h(Row, { key: item.id, item }))
    );
  }

  // Helper to flush React work synchronously
  function flushReact() {
    // ReactDOM.flushSync ensures synchronous rendering
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  // 1. Create 1000 rows
  results.push(await runBenchmark(
    'Create 1,000 rows',
    () => { createRoot(); },
    async () => {
      const data = generateData(1000);
      ReactDOM.flushSync(() => {
        root.render(h(AppComponent));
      });
      ReactDOM.flushSync(() => {
        setDataFn(data);
      });
    },
    null,
    5
  ));

  // 2. Update every 10th row
  results.push(await runBenchmark(
    'Update every 10th row',
    async () => {
      createRoot();
      const data = generateData(1000);
      ReactDOM.flushSync(() => root.render(h(AppComponent)));
      ReactDOM.flushSync(() => setDataFn(data));
    },
    async () => {
      ReactDOM.flushSync(() => {
        setDataFn(prev => {
          const next = [...prev];
          for (let i = 0; i < next.length; i += 10) {
            next[i] = { ...next[i], label: next[i].label + ' !!!' };
          }
          return next;
        });
      });
    },
    null,
    10
  ));

  // 3. Replace all rows
  results.push(await runBenchmark(
    'Replace all 1,000 rows',
    async () => {
      createRoot();
      ReactDOM.flushSync(() => root.render(h(AppComponent)));
      ReactDOM.flushSync(() => setDataFn(generateData(1000)));
    },
    async () => {
      ReactDOM.flushSync(() => setDataFn(generateData(1000, 1000)));
    },
    null,
    5
  ));

  // 4. Append 1000 rows
  results.push(await runBenchmark(
    'Append 1,000 rows to 1,000',
    async () => {
      createRoot();
      ReactDOM.flushSync(() => root.render(h(AppComponent)));
      ReactDOM.flushSync(() => setDataFn(generateData(1000)));
    },
    async () => {
      ReactDOM.flushSync(() => {
        setDataFn(prev => [...prev, ...generateData(1000, 1000)]);
      });
    },
    null,
    5
  ));

  // 5. Remove a row
  results.push(await runBenchmark(
    'Remove one row from 1,000',
    async () => {
      createRoot();
      ReactDOM.flushSync(() => root.render(h(AppComponent)));
      ReactDOM.flushSync(() => setDataFn(generateData(1000)));
    },
    async () => {
      ReactDOM.flushSync(() => {
        setDataFn(prev => {
          const idx = Math.floor(prev.length / 2);
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        });
      });
    },
    null,
    10
  ));

  // 6. Swap two rows
  results.push(await runBenchmark(
    'Swap two rows in 1,000',
    async () => {
      createRoot();
      ReactDOM.flushSync(() => root.render(h(AppComponent)));
      ReactDOM.flushSync(() => setDataFn(generateData(1000)));
    },
    async () => {
      ReactDOM.flushSync(() => {
        setDataFn(prev => {
          const next = [...prev];
          const tmp = next[1];
          next[1] = next[998];
          next[998] = tmp;
          return next;
        });
      });
    },
    null,
    10
  ));

  // 7. Clear all rows
  results.push(await runBenchmark(
    'Clear 1,000 rows',
    async () => {
      createRoot();
      ReactDOM.flushSync(() => root.render(h(AppComponent)));
      ReactDOM.flushSync(() => setDataFn(generateData(1000)));
    },
    async () => {
      ReactDOM.flushSync(() => setDataFn([]));
    },
    null,
    10
  ));

  // 8. Raw element throughput
  results.push(await runBenchmark(
    'Create+destroy 10,000 elements',
    () => { container.textContent = ''; },
    () => {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 10000; i++) {
        const el = document.createElement('span');
        el.textContent = `Item ${i}`;
        frag.appendChild(el);
      }
      container.appendChild(frag);
      container.textContent = '';
    },
    null,
    5
  ));

  // Cleanup
  if (root) root.unmount();

  return results;
}

// ---------------------------------------------------------------------------
// Script Loader
// ---------------------------------------------------------------------------

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

function generateReport(swiftuiResults, reactResults) {
  const lines = [];
  lines.push('');
  lines.push('╔════════════════════════════════════════════════════════════════════════╗');
  lines.push('║          BENCHMARK: SwiftUI-For-Web vs React 19                      ║');
  lines.push('╠════════════════════════════════════════════════════════════════════════╣');
  lines.push('');

  const header = [
    padRight('Benchmark', 32),
    padRight('SwiftUI-FW', 12),
    padRight('React 19', 12),
    padRight('Winner', 12),
    padRight('Speedup', 10)
  ].join('│');

  lines.push(header);
  lines.push('─'.repeat(78));

  for (let i = 0; i < swiftuiResults.length; i++) {
    const sw = swiftuiResults[i];
    const re = reactResults[i];

    const swMs = sw.median;
    const reMs = re.median;
    const faster = swMs <= reMs ? 'SwiftUI-FW' : 'React 19';
    const speedup = swMs <= reMs
      ? `${(reMs / swMs).toFixed(1)}x`
      : `${(swMs / reMs).toFixed(1)}x`;

    lines.push([
      padRight(sw.name, 32),
      padRight(formatMs(swMs), 12),
      padRight(formatMs(reMs), 12),
      padRight(faster, 12),
      padRight(speedup, 10)
    ].join('│'));
  }

  lines.push('');
  lines.push('Lower times are better. Speedup shows how much faster the winner is.');
  lines.push('Median of multiple iterations. Tests run sequentially in the same browser tab.');
  lines.push('');

  return lines.join('\n');
}

function padRight(str, len) {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all benchmarks and return results.
 * @param {HTMLElement} [swContainer] - Container for SwiftUI benchmarks
 * @param {HTMLElement} [reactContainer] - Container for React benchmarks
 * @returns {Object} { swiftui, react, report }
 */
export async function runAllBenchmarks(swContainer, reactContainer) {
  if (!swContainer) {
    swContainer = document.createElement('div');
    swContainer.id = 'bench-swiftui';
    document.body.appendChild(swContainer);
  }
  if (!reactContainer) {
    reactContainer = document.createElement('div');
    reactContainer.id = 'bench-react';
    document.body.appendChild(reactContainer);
  }

  console.log('%c[Benchmark] Starting SwiftUI-For-Web benchmarks...', 'color: #007AFF; font-weight: bold');
  const swiftuiResults = await benchmarkSwiftUI(swContainer);

  console.log('%c[Benchmark] Starting React 19 benchmarks...', 'color: #61DAFB; font-weight: bold');
  const reactResults = await benchmarkReact(reactContainer);

  const report = generateReport(swiftuiResults, reactResults);
  console.log(report);

  return { swiftui: swiftuiResults, react: reactResults, report };
}

/**
 * Run only SwiftUI-For-Web benchmarks.
 * @param {HTMLElement} [container]
 * @returns {Array} Results
 */
export async function runSwiftUIBenchmarks(container) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  return benchmarkSwiftUI(container);
}

/**
 * Render benchmark results to the page.
 * @param {Object} results - { swiftui, react, report }
 * @param {HTMLElement} container - Where to render
 */
export function renderBenchmarkResults(results, container) {
  const { swiftui, react } = results;

  let html = `
    <style>
      .bench-table { border-collapse: collapse; width: 100%; font-family: -apple-system, system-ui, sans-serif; font-size: 14px; }
      .bench-table th, .bench-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
      .bench-table th { background: #f5f5f5; font-weight: 600; }
      .bench-winner { color: #34C759; font-weight: 600; }
      .bench-loser { color: #999; }
      .bench-speedup { font-weight: 700; }
      .bench-title { font-size: 20px; font-weight: 700; margin: 20px 0 10px; }
      .bench-note { color: #666; font-size: 12px; margin-top: 8px; }
    </style>
    <div class="bench-title">SwiftUI-For-Web vs React 19 — Benchmark Results</div>
    <table class="bench-table">
      <tr>
        <th>Benchmark</th>
        <th>SwiftUI-For-Web</th>
        <th>React 19</th>
        <th>Winner</th>
        <th>Speedup</th>
      </tr>
  `;

  for (let i = 0; i < swiftui.length; i++) {
    const sw = swiftui[i];
    const re = react[i];
    const swWins = sw.median <= re.median;
    const speedup = swWins
      ? (re.median / sw.median).toFixed(1)
      : (sw.median / re.median).toFixed(1);
    const winner = swWins ? 'SwiftUI-FW' : 'React 19';

    html += `<tr>
      <td>${sw.name}</td>
      <td class="${swWins ? 'bench-winner' : 'bench-loser'}">${formatMs(sw.median)}</td>
      <td class="${!swWins ? 'bench-winner' : 'bench-loser'}">${formatMs(re.median)}</td>
      <td>${winner}</td>
      <td class="bench-speedup">${speedup}x faster</td>
    </tr>`;
  }

  html += `</table>
    <div class="bench-note">
      Lower times are better. Median of multiple iterations.
      Run in the same browser tab for fair comparison.
    </div>`;

  container.innerHTML = html;
}

export default { runAllBenchmarks, runSwiftUIBenchmarks, renderBenchmarkResults };
