/**
 * Playwright-based rendering verification script.
 *
 * 1. Runs the full test suite (462 tests) in a real browser
 * 2. Verifies example apps render correctly (DOM structure, visual output)
 * 3. Verifies the Reconciler produces correct DOM after incremental updates
 *
 * Usage: node Tests/verify-rendering.mjs
 */

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PORT = 8077;

// ---------------------------------------------------------------------------
// Simple HTTP server
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  let filePath = join(ROOT, req.url === '/' ? '/index.html' : req.url.split('?')[0]);
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'text/plain' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise(r => server.listen(PORT, r));
console.log(`Server running on http://localhost:${PORT}`);

// ---------------------------------------------------------------------------
// Launch browser
// ---------------------------------------------------------------------------
const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-gpu', '--single-process', '--no-zygote']
});

// Reuse a single page to avoid Chromium single-process crash on newPage()
const page = await browser.newPage();

let allPassed = true;
let totalChecks = 0;
let passedChecks = 0;

function check(name, condition, detail = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    allPassed = false;
    console.log(`  \x1b[31m✗\x1b[0m ${name} ${detail}`);
  }
}

// ---------------------------------------------------------------------------
// 1. Run test suite
// ---------------------------------------------------------------------------
console.log('\n\x1b[1m=== Running Test Suite ===\x1b[0m');
{
  const consoleLogs = [];
  const logHandler = msg => consoleLogs.push(msg.text());
  page.on('console', logHandler);

  await page.goto(`http://localhost:${PORT}/Tests/TestRunner.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Count pass/fail from console output
  const passes = consoleLogs.filter(l => l.includes('✓')).length;
  const fails = consoleLogs.filter(l => l.includes('✗')).length;
  const summaryLine = consoleLogs.find(l => l.includes('passed') || l.includes('Tests:'));

  console.log(`  Tests: ${passes} passed, ${fails} failed`);
  if (summaryLine) console.log(`  Summary: ${summaryLine}`);

  check('Test suite has no failures', fails === 0, `(${fails} failures)`);
  check('Test suite ran >400 tests', passes > 400, `(only ${passes} passed)`);

  // Print any failing tests
  if (fails > 0) {
    console.log('\n  Failed tests:');
    consoleLogs.filter(l => l.includes('✗')).slice(0, 20).forEach(l => console.log(`    ${l}`));
  }

  page.removeListener('console', logHandler);
}

// ---------------------------------------------------------------------------
// 2. Verify Counter example renders and updates correctly
// ---------------------------------------------------------------------------
console.log('\n\x1b[1m=== Verifying Counter Example ===\x1b[0m');
{
  // reuse shared page
  await page.goto(`http://localhost:${PORT}/Examples/Counter/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check basic structure
  const rootChildren = await page.evaluate(() => {
    const root = document.querySelector('#root');
    return root ? root.children.length : 0;
  });
  check('Counter: root has content', rootChildren > 0);

  // Check counter text is visible
  const hasCounterText = await page.evaluate(() => {
    const spans = document.querySelectorAll('span');
    return Array.from(spans).some(s => s.textContent.includes('0') || s.textContent.includes('Counter'));
  });
  check('Counter: shows counter value', hasCounterText);

  // Check buttons exist
  const buttonCount = await page.evaluate(() => document.querySelectorAll('button').length);
  check('Counter: has buttons', buttonCount >= 2, `(found ${buttonCount})`);

  // Click increment and verify update (Counter uses rAF debounce, wait for it)
  const afterClick = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    const plusBtn = Array.from(buttons).find(b => b.textContent.includes('+'));
    if (plusBtn) {
      plusBtn.click();
      plusBtn.click(); // Click twice to get to 2
    }
    // Wait for rAF + DOM update
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const spans = document.querySelectorAll('span');
            const values = Array.from(spans).map(s => s.textContent);
            resolve(values);
          }, 300);
        });
      });
    });
  });
  // After clicking +, value should no longer be 0
  check('Counter: increment updates DOM', afterClick.some(v => /^[1-9]\d*$/.test(v.trim())), `(values: ${afterClick.join(', ')})`);

  // page reused
}

// ---------------------------------------------------------------------------
// 3. Verify HelloWorld example renders
// ---------------------------------------------------------------------------
console.log('\n\x1b[1m=== Verifying HelloWorld Example ===\x1b[0m');
{
  // reuse shared page
  await page.goto(`http://localhost:${PORT}/Examples/HelloWorld/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const content = await page.evaluate(() => {
    const root = document.querySelector('#root');
    return {
      hasContent: root && root.children.length > 0,
      text: root ? root.textContent : '',
      childCount: root ? root.querySelectorAll('*').length : 0
    };
  });
  check('HelloWorld: root has content', content.hasContent);
  check('HelloWorld: contains "Hello" text', content.text.includes('Hello'));
  check('HelloWorld: has DOM elements', content.childCount > 2, `(${content.childCount} elements)`);

  // page reused
}

// ---------------------------------------------------------------------------
// 4. Verify Reconciler produces correct DOM after incremental updates
// ---------------------------------------------------------------------------
console.log('\n\x1b[1m=== Verifying Reconciler Incremental Updates ===\x1b[0m');
{
  // reuse shared page
  await page.goto(`http://localhost:${PORT}/Tests/TestRunner.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const reconcilerResult = await page.evaluate(async () => {
    const { App, VStack, HStack, Text, Spacer, Color, Font, State } = await import('/src/index.js');

    const container = document.createElement('div');
    container.id = 'reconciler-test';
    document.body.appendChild(container);

    // Create a list app with State-driven updates
    const data = new State([
      { id: 1, label: 'Item 1' },
      { id: 2, label: 'Item 2' },
      { id: 3, label: 'Item 3' },
    ]);

    const app = App(() =>
      VStack({ spacing: 4 },
        ...data.value.map(item =>
          HStack({ spacing: 8 },
            Text(String(item.id)),
            Text(item.label),
            Spacer()
          ).id(item.id)
        )
      )
    ).mount(container);

    const results = {};

    // Initial render check
    results.initialChildCount = container.querySelectorAll('*').length;
    results.initialText = container.textContent;

    // Update: change one item's label
    const nd = [...data.value];
    nd[1] = { ...nd[1], label: 'Updated Item 2' };
    data._value = nd;
    app._doRefresh();

    results.afterUpdateText = container.textContent;
    results.hasUpdatedLabel = container.textContent.includes('Updated Item 2');
    results.stillHasItem1 = container.textContent.includes('Item 1');
    results.stillHasItem3 = container.textContent.includes('Item 3');

    // Update: add an item
    data._value = [...data.value, { id: 4, label: 'Item 4' }];
    app._doRefresh();

    results.afterAddText = container.textContent;
    results.hasItem4 = container.textContent.includes('Item 4');
    results.afterAddChildCount = container.querySelectorAll('*').length;

    // Update: remove an item
    data._value = data.value.filter(i => i.id !== 2);
    app._doRefresh();

    results.afterRemoveText = container.textContent;
    results.noItem2 = !container.textContent.includes('Updated Item 2');
    results.stillHasItem4 = container.textContent.includes('Item 4');

    // Update: swap items
    const swapped = [...data.value];
    const tmp = swapped[0];
    swapped[0] = swapped[swapped.length - 1];
    swapped[swapped.length - 1] = tmp;
    data._value = swapped;
    app._doRefresh();

    results.afterSwapText = container.textContent;

    // Update: clear all
    data._value = [];
    app._doRefresh();

    results.afterClearChildCount = container.querySelectorAll('span').length;

    // Cleanup
    app.unmount();
    document.body.removeChild(container);

    return results;
  });

  check('Reconciler: initial render has content', reconcilerResult.initialChildCount > 5);
  check('Reconciler: update changes label', reconcilerResult.hasUpdatedLabel);
  check('Reconciler: update preserves other items', reconcilerResult.stillHasItem1 && reconcilerResult.stillHasItem3);
  check('Reconciler: add item works', reconcilerResult.hasItem4);
  check('Reconciler: add increases DOM nodes', reconcilerResult.afterAddChildCount > reconcilerResult.initialChildCount);
  check('Reconciler: remove item works', reconcilerResult.noItem2);
  check('Reconciler: remove preserves others', reconcilerResult.stillHasItem4);
  check('Reconciler: clear removes all spans', reconcilerResult.afterClearChildCount === 0, `(${reconcilerResult.afterClearChildCount} spans remain)`);

  // page reused
}

// ---------------------------------------------------------------------------
// 5. Verify benchmark dashboard renders correctly after incremental update
// ---------------------------------------------------------------------------
console.log('\n\x1b[1m=== Verifying Dashboard Incremental Update ===\x1b[0m');
{
  // reuse shared page
  await page.goto(`http://localhost:${PORT}/Tests/TestRunner.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const dashResult = await page.evaluate(async () => {
    const { App, VStack, HStack, Text, Spacer, Divider, Font, Color } = await import('/src/index.js');

    function buildDashboard(d) {
      return VStack({ spacing: 0 },
        HStack({ spacing: 12 },
          Text(d.title).font(Font.title).foregroundColor(Color.primary),
          Spacer(),
          Text(`Count: ${d.counter}`).foregroundColor(Color.blue)
        ).padding(12),
        Divider(),
        ...d.sections.map(section =>
          VStack({ alignment: 'leading', spacing: 4 },
            Text(section.title).font(Font.headline),
            ...section.items.map(item =>
              HStack({ spacing: 6 },
                Text(item.label),
                Spacer(),
                Text(String(item.value))
              ).id(item.id)
            )
          ).id(section.id)
        )
      );
    }

    function makeData(counter) {
      return {
        title: 'Dashboard',
        counter,
        sections: [
          { id: 's1', title: 'Section A', items: [
            { id: 'a1', label: 'Metric A1', value: 100 + counter },
            { id: 'a2', label: 'Metric A2', value: 200 },
          ]},
          { id: 's2', title: 'Section B', items: [
            { id: 'b1', label: 'Metric B1', value: 300 },
            { id: 'b2', label: 'Metric B2', value: 400 + counter },
          ]},
        ]
      };
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    let dashData = makeData(0);
    const app = App(() => buildDashboard(dashData)).mount(container);

    const results = {};
    results.initialText = container.textContent;
    results.hasCount0 = container.textContent.includes('Count: 0');
    results.hasMetricA1_100 = container.textContent.includes('100');

    // Incremental update via Reconciler
    dashData = makeData(5);
    app._doRefresh();

    results.afterUpdateText = container.textContent;
    results.hasCount5 = container.textContent.includes('Count: 5');
    results.hasMetricA1_105 = container.textContent.includes('105');
    results.hasMetricB2_405 = container.textContent.includes('405');
    results.stillHasSection = container.textContent.includes('Section A');

    app.unmount();
    document.body.removeChild(container);
    return results;
  });

  check('Dashboard: initial render has Count: 0', dashResult.hasCount0);
  check('Dashboard: initial has metric value 100', dashResult.hasMetricA1_100);
  check('Dashboard: after update shows Count: 5', dashResult.hasCount5);
  check('Dashboard: after update shows 105', dashResult.hasMetricA1_105);
  check('Dashboard: after update shows 405', dashResult.hasMetricB2_405);
  check('Dashboard: after update preserves sections', dashResult.stillHasSection);

  // page reused
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n\x1b[1m=== Results: ${passedChecks}/${totalChecks} checks passed ===\x1b[0m`);
if (allPassed) {
  console.log('\x1b[32mAll rendering verifications passed!\x1b[0m\n');
} else {
  console.log('\x1b[31mSome checks failed. See above for details.\x1b[0m\n');
}

await browser.close();
server.close();
process.exit(allPassed ? 0 : 1);
