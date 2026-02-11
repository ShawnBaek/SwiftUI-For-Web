/**
 * Benchmark Suite: SwiftUI-For-Web vs React 19
 *
 * Measures real-world rendering performance across two categories:
 *
 * A) Flat-list benchmarks (classic js-framework-benchmark style):
 *  1. Mount 1000 rows
 *  2. Update every 10th row
 *  3. Replace all rows
 *  4. Append 1000 rows
 *  5. Remove a row
 *  6. Swap two rows
 *  7. Clear all rows
 *
 * B) Complex view tree benchmarks (realistic app scenarios):
 *  8.  Deep tree mount — 5-level nested dashboard (header/sidebar/tabs/cards/items)
 *  9.  Leaf-only update — change 1 text node deep in a 500-node tree
 *  10. Sibling subtree update — change 1 of 4 independent panels
 *  11. Multiple scattered updates — change nodes at 5 different depths
 *  12. Rapid-fire partial re-renders — 100 consecutive single-field updates
 *
 * Each benchmark runs multiple iterations and reports median, min, max.
 *
 * Run with:
 *   Open Tests/Benchmark/index.html in a browser
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

/**
 * Generate dashboard-like data for complex tree benchmarks.
 * Produces a 5-level deep structure:
 *   Dashboard → Sections(4) → Tabs(3) → Cards(5) → Items(4)
 *   Total nodes: 1 + 4 + 12 + 60 + 240 = 317 containers + text = ~500+ DOM nodes
 */
function generateDashboardData(counterValue = 0) {
  const sections = [];
  for (let s = 0; s < 4; s++) {
    const tabs = [];
    for (let t = 0; t < 3; t++) {
      const cards = [];
      for (let c = 0; c < 5; c++) {
        const items = [];
        for (let i = 0; i < 4; i++) {
          items.push({
            id: `s${s}-t${t}-c${c}-i${i}`,
            label: `${ADJECTIVES[(s * 60 + t * 20 + c * 4 + i) % ADJECTIVES.length]} ${NOUNS[(s * 60 + t * 20 + c * 4 + i) % NOUNS.length]}`,
            value: ((s + 1) * 100 + (t + 1) * 10 + c + i) + counterValue
          });
        }
        cards.push({
          id: `s${s}-t${t}-c${c}`,
          title: `Card ${s}.${t}.${c}`,
          items
        });
      }
      tabs.push({
        id: `s${s}-t${t}`,
        title: `Tab ${t + 1}`,
        cards
      });
    }
    sections.push({
      id: `s${s}`,
      title: `Section ${s + 1}`,
      subtitle: `${3 * 5 * 4} items`,
      tabs
    });
  }
  return {
    title: 'Dashboard',
    counter: counterValue,
    sections
  };
}

// ---------------------------------------------------------------------------
// Benchmark Runner
// ---------------------------------------------------------------------------

async function runBenchmark(name, setupFn, benchFn, teardownFn, iterations = 10) {
  const times = [];

  for (let i = 0; i < iterations; i++) {
    if (setupFn) await setupFn();
    if (typeof gc === 'function') gc();

    const start = performance.now();
    await benchFn();
    const end = performance.now();

    times.push(end - start);
    if (teardownFn) await teardownFn();
  }

  const med = median(times);
  return {
    name,
    median: med,
    min: Math.min(...times),
    max: Math.max(...times),
    avg: times.reduce((s, t) => s + t, 0) / times.length,
    opsPerSec: 1000 / med,
    times
  };
}

// ---------------------------------------------------------------------------
// SwiftUI-For-Web Benchmarks
// ---------------------------------------------------------------------------

async function benchmarkSwiftUI(container) {
  const SwiftUI = await import('../../src/index.js');
  const {
    App, VStack, HStack, Text, Button, Spacer, Font, Color, Divider,
    State, batch
  } = SwiftUI;

  const results = [];
  let app = null;
  let data = new State([]);

  function createListApp() {
    if (app) app.unmount();
    data = new State([]);
    app = App(() =>
      VStack({ spacing: 0 },
        ...data.value.map(item =>
          HStack({ spacing: 8 },
            Text(String(item.id)).frame({ width: 60 }).foregroundColor(Color.secondary),
            Text(item.label),
            Spacer()
          ).padding({ vertical: 2, horizontal: 8 }).id(item.id)
        )
      )
    ).mount(container);
    return app;
  }

  // ── A) Flat list benchmarks ─────────────────────────────────────────────

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
    null, 5
  ));

  results.push(await runBenchmark(
    'Update every 10th row',
    () => { createListApp(); data.value = generateData(1000); app.refresh(); },
    () => {
      const nd = [...data.value];
      for (let i = 0; i < nd.length; i += 10) nd[i] = { ...nd[i], label: nd[i].label + ' !!!' };
      data._value = nd; app.refresh();
    },
    null, 10
  ));

  results.push(await runBenchmark(
    'Replace all 1,000 rows',
    () => { createListApp(); data.value = generateData(1000); app.refresh(); },
    () => { data._value = generateData(1000, 1000); app.refresh(); },
    null, 5
  ));

  results.push(await runBenchmark(
    'Append 1,000 rows to 1,000',
    () => { createListApp(); data.value = generateData(1000); app.refresh(); },
    () => { data._value = [...data.value, ...generateData(1000, 1000)]; app.refresh(); },
    null, 5
  ));

  results.push(await runBenchmark(
    'Remove one row from 1,000',
    () => { createListApp(); data.value = generateData(1000); app.refresh(); },
    () => {
      const nd = [...data.value]; nd.splice(500, 1); data._value = nd; app.refresh();
    },
    null, 10
  ));

  results.push(await runBenchmark(
    'Swap two rows in 1,000',
    () => { createListApp(); data.value = generateData(1000); app.refresh(); },
    () => {
      const nd = [...data.value]; const t = nd[1]; nd[1] = nd[998]; nd[998] = t;
      data._value = nd; app.refresh();
    },
    null, 10
  ));

  results.push(await runBenchmark(
    'Clear 1,000 rows',
    () => { createListApp(); data.value = generateData(1000); app.refresh(); },
    () => { data._value = []; app.refresh(); },
    null, 10
  ));

  // ── B) Complex view tree benchmarks ────────────────────────────────────

  // Helper: build the deep dashboard tree in SwiftUI-For-Web
  function buildDashboard(d) {
    return VStack({ spacing: 0 },
      // Header
      HStack({ spacing: 12 },
        Text(d.title).font(Font.title).foregroundColor(Color.primary),
        Spacer(),
        Text(`Count: ${d.counter}`).foregroundColor(Color.blue)
      ).padding(12),
      Divider(),
      // Sections
      ...d.sections.map(section =>
        VStack({ alignment: 'leading', spacing: 4 },
          HStack({ spacing: 8 },
            Text(section.title).font(Font.headline),
            Spacer(),
            Text(section.subtitle).foregroundColor(Color.secondary)
          ).padding({ horizontal: 12, vertical: 4 }),
          // Tabs
          ...section.tabs.map(tab =>
            VStack({ alignment: 'leading', spacing: 2 },
              Text(tab.title)
                .font(Font.subheadline)
                .foregroundColor(Color.secondary)
                .padding({ horizontal: 16, vertical: 2 }),
              // Cards
              ...tab.cards.map(card =>
                VStack({ alignment: 'leading', spacing: 1 },
                  Text(card.title)
                    .font(Font.caption)
                    .padding({ horizontal: 20, vertical: 1 }),
                  // Items
                  ...card.items.map(item =>
                    HStack({ spacing: 6 },
                      Text(item.label).frame({ width: 120 }),
                      Spacer(),
                      Text(String(item.value))
                    ).padding({ horizontal: 24, vertical: 1 }).id(item.id)
                  )
                ).id(card.id)
              )
            ).id(tab.id)
          )
        ).id(section.id)
      )
    );
  }

  let dashData;

  // 8. Deep tree mount
  results.push(await runBenchmark(
    'Deep tree mount (500+ nodes)',
    () => { if (app) app.unmount(); container.textContent = ''; },
    () => {
      dashData = generateDashboardData(0);
      app = App(() => buildDashboard(dashData)).mount(container);
    },
    null, 5
  ));

  // 9. Leaf-only update — change 1 counter text in header, rest is identical
  results.push(await runBenchmark(
    'Leaf update (1 node in 500)',
    () => {
      if (app) app.unmount();
      container.textContent = '';
      dashData = generateDashboardData(0);
      app = App(() => buildDashboard(dashData)).mount(container);
    },
    () => {
      dashData = generateDashboardData(dashData.counter + 1);
      app = App(() => buildDashboard(dashData)).mount(container);
    },
    null, 15
  ));

  // 10. Sibling subtree update — change 1 of 4 sections entirely
  results.push(await runBenchmark(
    'Update 1 of 4 subtrees',
    () => {
      if (app) app.unmount();
      container.textContent = '';
      dashData = generateDashboardData(0);
      app = App(() => buildDashboard(dashData)).mount(container);
    },
    () => {
      // Only section 2 items get new values
      const d = generateDashboardData(0);
      for (const tab of d.sections[2].tabs) {
        for (const card of tab.cards) {
          for (const item of card.items) {
            item.value += 999;
            item.label = item.label + ' *';
          }
        }
      }
      d.sections[2].subtitle = 'UPDATED';
      dashData = d;
      app = App(() => buildDashboard(dashData)).mount(container);
    },
    null, 10
  ));

  // 11. Multiple scattered updates — change 1 item in each of the 4 sections
  results.push(await runBenchmark(
    'Scattered updates (4 leaves)',
    () => {
      if (app) app.unmount();
      container.textContent = '';
      dashData = generateDashboardData(0);
      app = App(() => buildDashboard(dashData)).mount(container);
    },
    () => {
      const d = generateDashboardData(0);
      for (let s = 0; s < 4; s++) {
        d.sections[s].tabs[1].cards[2].items[1].value = 9999;
        d.sections[s].tabs[1].cards[2].items[1].label = 'CHANGED';
      }
      dashData = d;
      app = App(() => buildDashboard(dashData)).mount(container);
    },
    null, 10
  ));

  // 12. Rapid-fire partial re-renders — 100 increments as fast as possible
  results.push(await runBenchmark(
    'Rapid-fire 100 re-renders',
    () => {
      if (app) app.unmount();
      container.textContent = '';
      dashData = generateDashboardData(0);
      app = App(() => buildDashboard(dashData)).mount(container);
    },
    () => {
      for (let i = 0; i < 100; i++) {
        dashData = generateDashboardData(i);
        app = App(() => buildDashboard(dashData)).mount(container);
      }
    },
    null, 3
  ));

  // Cleanup
  if (app) app.unmount();
  return results;
}

// ---------------------------------------------------------------------------
// React 19 Benchmarks
// ---------------------------------------------------------------------------

async function benchmarkReact(container) {
  if (!window.React || !window.ReactDOM) {
    await loadScript('https://unpkg.com/react@19/umd/react.production.min.js');
    await loadScript('https://unpkg.com/react-dom@19/umd/react-dom.production.min.js');
  }

  const React = window.React;
  const ReactDOM = window.ReactDOM;
  const { createElement: h, useState, memo } = React;

  const results = [];
  let root = null;

  function createRoot() {
    if (root) root.unmount();
    container.textContent = '';
    root = ReactDOM.createRoot(container);
    return root;
  }

  // ── Flat list components ─────────────────────────────────────────────────

  function Row({ item }) {
    return h('div', { style: { display: 'flex', gap: '8px', padding: '2px 8px' } },
      h('span', { style: { width: '60px', color: '#888' } }, String(item.id)),
      h('span', null, item.label),
      h('div', { style: { flexGrow: 1 } })
    );
  }

  let setListDataFn = null;
  function ListApp() {
    const [data, setData] = useState([]);
    setListDataFn = setData;
    return h('div', { style: { display: 'flex', flexDirection: 'column' } },
      data.map(item => h(Row, { key: item.id, item }))
    );
  }

  // ── Flat list benchmarks ─────────────────────────────────────────────────

  results.push(await runBenchmark(
    'Create 1,000 rows',
    () => { createRoot(); },
    async () => {
      ReactDOM.flushSync(() => root.render(h(ListApp)));
      ReactDOM.flushSync(() => setListDataFn(generateData(1000)));
    },
    null, 5
  ));

  results.push(await runBenchmark(
    'Update every 10th row',
    async () => {
      createRoot();
      ReactDOM.flushSync(() => root.render(h(ListApp)));
      ReactDOM.flushSync(() => setListDataFn(generateData(1000)));
    },
    async () => {
      ReactDOM.flushSync(() => {
        setListDataFn(prev => {
          const n = [...prev];
          for (let i = 0; i < n.length; i += 10) n[i] = { ...n[i], label: n[i].label + ' !!!' };
          return n;
        });
      });
    },
    null, 10
  ));

  results.push(await runBenchmark(
    'Replace all 1,000 rows',
    async () => {
      createRoot(); ReactDOM.flushSync(() => root.render(h(ListApp)));
      ReactDOM.flushSync(() => setListDataFn(generateData(1000)));
    },
    async () => { ReactDOM.flushSync(() => setListDataFn(generateData(1000, 1000))); },
    null, 5
  ));

  results.push(await runBenchmark(
    'Append 1,000 rows to 1,000',
    async () => {
      createRoot(); ReactDOM.flushSync(() => root.render(h(ListApp)));
      ReactDOM.flushSync(() => setListDataFn(generateData(1000)));
    },
    async () => {
      ReactDOM.flushSync(() => setListDataFn(prev => [...prev, ...generateData(1000, 1000)]));
    },
    null, 5
  ));

  results.push(await runBenchmark(
    'Remove one row from 1,000',
    async () => {
      createRoot(); ReactDOM.flushSync(() => root.render(h(ListApp)));
      ReactDOM.flushSync(() => setListDataFn(generateData(1000)));
    },
    async () => {
      ReactDOM.flushSync(() => {
        setListDataFn(prev => [...prev.slice(0, 500), ...prev.slice(501)]);
      });
    },
    null, 10
  ));

  results.push(await runBenchmark(
    'Swap two rows in 1,000',
    async () => {
      createRoot(); ReactDOM.flushSync(() => root.render(h(ListApp)));
      ReactDOM.flushSync(() => setListDataFn(generateData(1000)));
    },
    async () => {
      ReactDOM.flushSync(() => {
        setListDataFn(prev => {
          const n = [...prev]; const t = n[1]; n[1] = n[998]; n[998] = t; return n;
        });
      });
    },
    null, 10
  ));

  results.push(await runBenchmark(
    'Clear 1,000 rows',
    async () => {
      createRoot(); ReactDOM.flushSync(() => root.render(h(ListApp)));
      ReactDOM.flushSync(() => setListDataFn(generateData(1000)));
    },
    async () => { ReactDOM.flushSync(() => setListDataFn([])); },
    null, 10
  ));

  // ── Complex view tree components ─────────────────────────────────────────

  // Equivalent deep dashboard in React (same structure as the SwiftUI version)
  // Using React.memo on leaf components to give React the best chance
  const DashItem = memo(function DashItem({ item }) {
    return h('div', { style: { display: 'flex', gap: '6px', padding: '1px 24px' } },
      h('span', { style: { width: '120px' } }, item.label),
      h('div', { style: { flexGrow: 1 } }),
      h('span', null, String(item.value))
    );
  });

  const DashCard = memo(function DashCard({ card }) {
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '1px' } },
      h('span', { style: { padding: '1px 20px', fontSize: '12px' } }, card.title),
      card.items.map(item => h(DashItem, { key: item.id, item }))
    );
  });

  const DashTab = memo(function DashTab({ tab }) {
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
      h('span', { style: { padding: '2px 16px', fontSize: '13px', color: '#888' } }, tab.title),
      tab.cards.map(card => h(DashCard, { key: card.id, card }))
    );
  });

  const DashSection = memo(function DashSection({ section }) {
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
      h('div', { style: { display: 'flex', gap: '8px', padding: '4px 12px' } },
        h('span', { style: { fontWeight: 'bold' } }, section.title),
        h('div', { style: { flexGrow: 1 } }),
        h('span', { style: { color: '#888' } }, section.subtitle)
      ),
      section.tabs.map(tab => h(DashTab, { key: tab.id, tab }))
    );
  });

  function Dashboard({ data }) {
    return h('div', { style: { display: 'flex', flexDirection: 'column' } },
      h('div', { style: { display: 'flex', gap: '12px', padding: '12px' } },
        h('span', { style: { fontSize: '20px', fontWeight: 'bold' } }, data.title),
        h('div', { style: { flexGrow: 1 } }),
        h('span', { style: { color: '#007AFF' } }, `Count: ${data.counter}`)
      ),
      h('hr', { style: { border: 'none', borderTop: '1px solid #ddd', margin: 0 } }),
      data.sections.map(section => h(DashSection, { key: section.id, section }))
    );
  }

  let setDashDataFn = null;
  function DashApp() {
    const [data, setData] = useState(null);
    setDashDataFn = setData;
    return data ? h(Dashboard, { data }) : null;
  }

  // ── Complex tree benchmarks ─────────────────────────────────────────────

  // 8. Deep tree mount
  results.push(await runBenchmark(
    'Deep tree mount (500+ nodes)',
    () => { createRoot(); },
    async () => {
      ReactDOM.flushSync(() => root.render(h(DashApp)));
      ReactDOM.flushSync(() => setDashDataFn(generateDashboardData(0)));
    },
    null, 5
  ));

  // 9. Leaf-only update — change counter in header
  results.push(await runBenchmark(
    'Leaf update (1 node in 500)',
    async () => {
      createRoot();
      ReactDOM.flushSync(() => root.render(h(DashApp)));
      ReactDOM.flushSync(() => setDashDataFn(generateDashboardData(0)));
    },
    async () => {
      ReactDOM.flushSync(() => {
        setDashDataFn(prev => generateDashboardData(prev.counter + 1));
      });
    },
    null, 15
  ));

  // 10. Sibling subtree update — change 1 of 4 sections
  results.push(await runBenchmark(
    'Update 1 of 4 subtrees',
    async () => {
      createRoot();
      ReactDOM.flushSync(() => root.render(h(DashApp)));
      ReactDOM.flushSync(() => setDashDataFn(generateDashboardData(0)));
    },
    async () => {
      ReactDOM.flushSync(() => {
        setDashDataFn(() => {
          const d = generateDashboardData(0);
          for (const tab of d.sections[2].tabs) {
            for (const card of tab.cards) {
              for (const item of card.items) {
                item.value += 999;
                item.label = item.label + ' *';
              }
            }
          }
          d.sections[2].subtitle = 'UPDATED';
          return d;
        });
      });
    },
    null, 10
  ));

  // 11. Scattered updates — 1 item per section
  results.push(await runBenchmark(
    'Scattered updates (4 leaves)',
    async () => {
      createRoot();
      ReactDOM.flushSync(() => root.render(h(DashApp)));
      ReactDOM.flushSync(() => setDashDataFn(generateDashboardData(0)));
    },
    async () => {
      ReactDOM.flushSync(() => {
        setDashDataFn(() => {
          const d = generateDashboardData(0);
          for (let s = 0; s < 4; s++) {
            d.sections[s].tabs[1].cards[2].items[1].value = 9999;
            d.sections[s].tabs[1].cards[2].items[1].label = 'CHANGED';
          }
          return d;
        });
      });
    },
    null, 10
  ));

  // 12. Rapid-fire 100 re-renders
  results.push(await runBenchmark(
    'Rapid-fire 100 re-renders',
    async () => {
      createRoot();
      ReactDOM.flushSync(() => root.render(h(DashApp)));
      ReactDOM.flushSync(() => setDashDataFn(generateDashboardData(0)));
    },
    async () => {
      for (let i = 0; i < 100; i++) {
        ReactDOM.flushSync(() => setDashDataFn(generateDashboardData(i)));
      }
    },
    null, 3
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
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
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
  lines.push('╔════════════════════════════════════════════════════════════════════════════╗');
  lines.push('║            BENCHMARK: SwiftUI-For-Web vs React 19                        ║');
  lines.push('╠════════════════════════════════════════════════════════════════════════════╣');
  lines.push('');

  const header = [
    padRight('Benchmark', 35),
    padRight('SwiftUI-FW', 12),
    padRight('React 19', 12),
    padRight('Winner', 12),
    padRight('Speedup', 10)
  ].join('│');
  lines.push(header);
  lines.push('─'.repeat(81));

  let swWins = 0;
  let reWins = 0;

  for (let i = 0; i < swiftuiResults.length; i++) {
    const sw = swiftuiResults[i];
    const re = reactResults[i];
    const swMs = sw.median;
    const reMs = re.median;

    // Separator between flat list and complex tree sections
    if (i === 7) {
      lines.push('─'.repeat(81));
      lines.push(padRight(' Complex View Tree', 81));
      lines.push('─'.repeat(81));
    }

    const faster = swMs <= reMs ? 'SwiftUI-FW' : 'React 19';
    if (swMs <= reMs) swWins++; else reWins++;
    const speedup = swMs <= reMs
      ? `${(reMs / swMs).toFixed(1)}x`
      : `${(swMs / reMs).toFixed(1)}x`;

    lines.push([
      padRight(sw.name, 35),
      padRight(formatMs(swMs), 12),
      padRight(formatMs(reMs), 12),
      padRight(faster, 12),
      padRight(speedup, 10)
    ].join('│'));
  }

  lines.push('─'.repeat(81));
  lines.push(`SwiftUI-For-Web wins: ${swWins}/${swiftuiResults.length}   React 19 wins: ${reWins}/${reactResults.length}`);
  lines.push('');
  lines.push('Lower is better. Median of multiple iterations in the same tab.');
  lines.push('React uses React.memo on leaf components for optimal comparison.');
  lines.push('');

  return lines.join('\n');
}

function padRight(str, len) {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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

  console.log('%c[Benchmark] Running SwiftUI-For-Web...', 'color: #007AFF; font-weight: bold');
  const swiftuiResults = await benchmarkSwiftUI(swContainer);

  console.log('%c[Benchmark] Running React 19...', 'color: #61DAFB; font-weight: bold');
  const reactResults = await benchmarkReact(reactContainer);

  const report = generateReport(swiftuiResults, reactResults);
  console.log(report);

  return { swiftui: swiftuiResults, react: reactResults, report };
}

export async function runSwiftUIBenchmarks(container) {
  if (!container) { container = document.createElement('div'); document.body.appendChild(container); }
  return benchmarkSwiftUI(container);
}

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
      .bench-section { background: #f0f0f5; font-weight: 600; color: #555; }
      .bench-section td { padding: 6px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    </style>
    <div class="bench-title">SwiftUI-For-Web vs React 19 — Benchmark Results</div>
    <table class="bench-table">
      <tr><th>Benchmark</th><th>SwiftUI-For-Web</th><th>React 19</th><th>Winner</th><th>Speedup</th></tr>
  `;

  let swWins = 0, reWins = 0;

  for (let i = 0; i < swiftui.length; i++) {
    // Section separator
    if (i === 7) {
      html += `<tr class="bench-section"><td colspan="5">Complex View Tree (500+ nodes, partial re-renders)</td></tr>`;
    }

    const sw = swiftui[i];
    const re = react[i];
    const swW = sw.median <= re.median;
    if (swW) swWins++; else reWins++;
    const speedup = swW ? (re.median / sw.median).toFixed(1) : (sw.median / re.median).toFixed(1);
    const winner = swW ? 'SwiftUI-FW' : 'React 19';

    html += `<tr>
      <td>${sw.name}</td>
      <td class="${swW ? 'bench-winner' : 'bench-loser'}">${formatMs(sw.median)}</td>
      <td class="${!swW ? 'bench-winner' : 'bench-loser'}">${formatMs(re.median)}</td>
      <td>${winner}</td>
      <td class="bench-speedup">${speedup}x</td>
    </tr>`;
  }

  html += `</table>
    <div class="bench-note">
      Lower is better. Median of multiple iterations. React uses <code>React.memo</code> on all leaf components.<br>
      <strong>Score: SwiftUI-For-Web ${swWins}/${swiftui.length} &nbsp;|&nbsp; React 19 ${reWins}/${react.length}</strong>
    </div>`;

  container.innerHTML = html;
}

export default { runAllBenchmarks, runSwiftUIBenchmarks, renderBenchmarkResults };
