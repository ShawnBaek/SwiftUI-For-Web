// Capture full benchmark results to disk. Tagged so it doesn't run by default
// (would slow down CI). Run via:
//   npx playwright test Tests/Benchmark/capture.spec.js --grep @capture --workers=1
import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('@capture full benchmark suite (long-running)', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000); // 20 min ceiling

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('requestfailed', (req) => {
    const f = req.failure();
    console.log('[netfail]', req.url(), f && f.errorText);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (/favicon|404 \(File not found\)/.test(t)) return;
      errors.push('[console] ' + t);
    } else if (msg.type() === 'log') {
      console.log('[page]', msg.text());
    }
  });

  await page.goto('/Tests/Benchmark/index.html');
  await page.waitForLoadState('networkidle');

  // Trigger the chosen benchmark suite. Default: 3-way; override via env var.
  const mode = process.env.BENCH_MODE || 'all'; // 'all' | 'no-solid' | 'sw'
  await page.evaluate((m) => {
    if (m === 'sw') return window.runSW();
    if (m === 'no-solid') return window.runNoSolid();
    return window.runAll();
  }, mode);

  // Wait until the results table renders OR an error message appears.
  await Promise.race([
    page.waitForSelector('.bench-table', { timeout: 15 * 60 * 1000 }),
    page.waitForSelector('.status.active', { state: 'attached', timeout: 60_000 })
      .then(async () => {
        const txt = await page.locator('#status').textContent();
        if (txt && /^Error:/.test(txt)) throw new Error(`Page status: ${txt}`);
      }),
  ]);

  // Pull the captured results back out via the same API the export uses.
  const payload = await page.evaluate(() => {
    const slim = (arr) => arr && arr.map((r) => ({
      name: r.name, median: r.median, min: r.min, max: r.max, avg: r.avg,
    }));
    const res = window.__lastResults || null;
    if (res) return {
      capturedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      swiftui: slim(res.swiftui), react: slim(res.react), solid: slim(res.solid),
    };
    return null;
  });

  expect(payload, 'page must expose results via window.__lastResults').not.toBeNull();
  expect(errors, 'no page errors').toEqual([]);

  const outDir = path.resolve(__dirname);
  const target = path.join(outDir, process.env.BENCH_OUT || 'results-baseline.json');
  fs.writeFileSync(target, JSON.stringify(payload, null, 2));
  console.log(`[capture] wrote ${target}`);
});
