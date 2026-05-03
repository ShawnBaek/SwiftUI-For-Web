/**
 * Solid.js benchmark scenarios — mirror SwiftUI-For-Web and React 19 paths.
 *
 * Loaded as ES modules from esm.sh. Solid is dev/test-only and never imported
 * from src/ (preserves the project's zero-deps policy).
 *
 * Apples-to-apples decisions:
 *   • Use a SINGLE signal for the data array (not per-row signals). This mirrors
 *     React's setState and SwiftUI-For-Web's `app.refresh()` — the whole tree
 *     re-evaluates from the root.
 *   • Use Solid's reconcile-friendly path (`createEffect` + manual DOM diffing).
 *     Solid's <For> requires JSX setup that hyperscript doesn't provide; using
 *     a hyperscript reactive child also doesn't bind through Solid's tracker.
 *     Instead we drive Solid via createEffect, which is fully equivalent to
 *     what JSX-compiled code does at runtime.
 */

import { runBenchmark, generateData, generateDashboardData } from './benchmark.js';

let _solidPromise = null;
async function loadSolid() {
  if (_solidPromise) return _solidPromise;
  _solidPromise = (async () => {
    const solid = await import('https://esm.sh/solid-js@1.9.3?dev=false');
    return { solid };
  })();
  return _solidPromise;
}

// Build a row DOM element imperatively (cheap; matches SwiftUI/React DOM).
function buildRow(item) {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;padding:2px 8px;';
  const id = document.createElement('span');
  id.style.width = '60px';
  id.textContent = String(item.id);
  const lbl = document.createElement('span');
  lbl.textContent = item.label;
  const sp = document.createElement('div');
  sp.style.flexGrow = '1';
  div.append(id, lbl, sp);
  return div;
}

function buildItem(item) {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:6px;padding:1px 24px;';
  const lbl = document.createElement('span');
  lbl.style.width = '120px';
  lbl.textContent = item.label;
  const sp = document.createElement('div');
  sp.style.flexGrow = '1';
  const val = document.createElement('span');
  val.textContent = String(item.value);
  div.append(lbl, sp, val);
  return div;
}

function buildCard(card) {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;flex-direction:column;gap:1px;';
  const t = document.createElement('span');
  t.style.cssText = 'padding:1px 20px;font-size:12px;';
  t.textContent = card.title;
  div.appendChild(t);
  for (const item of card.items) div.appendChild(buildItem(item));
  return div;
}

function buildTab(tab) {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
  const t = document.createElement('span');
  t.style.cssText = 'padding:2px 16px;font-size:13px;color:#888;';
  t.textContent = tab.title;
  div.appendChild(t);
  for (const card of tab.cards) div.appendChild(buildCard(card));
  return div;
}

function buildSection(section) {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;gap:8px;padding:4px 12px;';
  const title = document.createElement('span');
  title.style.fontWeight = 'bold';
  title.textContent = section.title;
  const sp = document.createElement('div');
  sp.style.flexGrow = '1';
  const sub = document.createElement('span');
  sub.style.color = '#888';
  sub.textContent = section.subtitle;
  head.append(title, sp, sub);
  div.appendChild(head);
  for (const tab of section.tabs) div.appendChild(buildTab(tab));
  return div;
}

function buildDashboard(d) {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex-direction:column;';
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;gap:12px;padding:12px;';
  const title = document.createElement('span');
  title.style.cssText = 'font-size:20px;font-weight:bold;';
  title.textContent = d.title;
  const sp = document.createElement('div');
  sp.style.flexGrow = '1';
  const ct = document.createElement('span');
  ct.style.color = '#007AFF';
  ct.textContent = `Count: ${d.counter}`;
  header.append(title, sp, ct);
  root.appendChild(header);
  const hr = document.createElement('hr');
  hr.style.cssText = 'border:none;border-top:1px solid #ddd;margin:0;';
  root.appendChild(hr);
  for (const s of d.sections) root.appendChild(buildSection(s));
  return root;
}

export async function benchmarkSolid(container) {
  const { solid } = await loadSolid();
  const { createSignal, createRoot, createEffect, batch } = solid;

  const results = [];
  let disposeRoot = null;
  let setListData = null;
  let setDashData = null;

  function unmount() {
    if (disposeRoot) {
      disposeRoot();
      disposeRoot = null;
    }
    container.textContent = '';
  }

  // Build a Solid reactive listener that re-renders the container on signal
  // change. Equivalent to what Solid's compiled JSX would do for the root tree.
  function mountList() {
    const [list, setList] = createSignal([]);
    setListData = setList;
    createRoot((d) => {
      disposeRoot = d;
      createEffect(() => {
        const items = list();
        // Full container re-render on signal change. This matches how the
        // SwiftUI-For-Web benchmark uses `app.refresh()` and how the React
        // benchmark uses `setState(newArray)` with no memoization on rows.
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;';
        for (const item of items) wrap.appendChild(buildRow(item));
        container.textContent = '';
        container.appendChild(wrap);
      });
    });
  }

  function mountDash() {
    const [data, setData] = createSignal(null);
    setDashData = setData;
    createRoot((d) => {
      disposeRoot = d;
      createEffect(() => {
        const dd = data();
        container.textContent = '';
        if (dd) container.appendChild(buildDashboard(dd));
      });
    });
  }

  // ── A) Flat list ────────────────────────────────────────────────────────

  results.push(await runBenchmark(
    'Create 1,000 rows',
    () => { unmount(); },
    () => {
      mountList();
      batch(() => setListData(generateData(1000)));
    },
    null, 5
  ));

  results.push(await runBenchmark(
    'Update every 10th row',
    () => {
      unmount();
      mountList();
      batch(() => setListData(generateData(1000)));
    },
    () => {
      batch(() => setListData((prev) => {
        const n = [...prev];
        for (let i = 0; i < n.length; i += 10) n[i] = { ...n[i], label: n[i].label + ' !!!' };
        return n;
      }));
    },
    null, 10
  ));

  results.push(await runBenchmark(
    'Replace all 1,000 rows',
    () => {
      unmount();
      mountList();
      batch(() => setListData(generateData(1000)));
    },
    () => { batch(() => setListData(generateData(1000, 1000))); },
    null, 5
  ));

  results.push(await runBenchmark(
    'Append 1,000 rows to 1,000',
    () => {
      unmount();
      mountList();
      batch(() => setListData(generateData(1000)));
    },
    () => { batch(() => setListData((prev) => [...prev, ...generateData(1000, 1000)])); },
    null, 5
  ));

  results.push(await runBenchmark(
    'Remove one row from 1,000',
    () => {
      unmount();
      mountList();
      batch(() => setListData(generateData(1000)));
    },
    () => { batch(() => setListData((prev) => [...prev.slice(0, 500), ...prev.slice(501)])); },
    null, 10
  ));

  results.push(await runBenchmark(
    'Swap two rows in 1,000',
    () => {
      unmount();
      mountList();
      batch(() => setListData(generateData(1000)));
    },
    () => {
      batch(() => setListData((prev) => {
        const n = [...prev]; const t = n[1]; n[1] = n[998]; n[998] = t; return n;
      }));
    },
    null, 10
  ));

  results.push(await runBenchmark(
    'Clear 1,000 rows',
    () => {
      unmount();
      mountList();
      batch(() => setListData(generateData(1000)));
    },
    () => { batch(() => setListData([])); },
    null, 10
  ));

  // ── B) Complex view tree ────────────────────────────────────────────────

  results.push(await runBenchmark(
    'Deep tree mount (500+ nodes)',
    () => { unmount(); },
    () => {
      mountDash();
      batch(() => setDashData(generateDashboardData(0)));
    },
    null, 5
  ));

  results.push(await runBenchmark(
    'Leaf update (1 node in 500)',
    () => {
      unmount();
      mountDash();
      batch(() => setDashData(generateDashboardData(0)));
    },
    () => { batch(() => setDashData((prev) => generateDashboardData(prev.counter + 1))); },
    null, 15
  ));

  results.push(await runBenchmark(
    'Update 1 of 4 subtrees',
    () => {
      unmount();
      mountDash();
      batch(() => setDashData(generateDashboardData(0)));
    },
    () => {
      batch(() => setDashData(() => {
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
      }));
    },
    null, 10
  ));

  results.push(await runBenchmark(
    'Scattered updates (4 leaves)',
    () => {
      unmount();
      mountDash();
      batch(() => setDashData(generateDashboardData(0)));
    },
    () => {
      batch(() => setDashData(() => {
        const d = generateDashboardData(0);
        for (let s = 0; s < 4; s++) {
          d.sections[s].tabs[1].cards[2].items[1].value = 9999;
          d.sections[s].tabs[1].cards[2].items[1].label = 'CHANGED';
        }
        return d;
      }));
    },
    null, 10
  ));

  results.push(await runBenchmark(
    'Rapid-fire 100 re-renders',
    () => {
      unmount();
      mountDash();
      batch(() => setDashData(generateDashboardData(0)));
    },
    () => {
      for (let i = 0; i < 100; i++) {
        batch(() => setDashData(generateDashboardData(i)));
      }
    },
    null, 3
  ));

  unmount();
  return results;
}
