/**
 * Animation profiling spec — runs each example through a scripted
 * interaction and dumps a per-example report (FPS, dropped frames, long
 * tasks, LoAF). Filter with --grep <name> to profile one example.
 *
 * Usage:
 *   npx playwright test Tests/Benchmark/animation-profile.spec.js --reporter=list
 *
 * Output goes to Tests/Benchmark/animation-results-<timestamp>.json
 * AND printed to stdout.
 */

import { test } from '@playwright/test';
import { writeFileSync } from 'fs';
import { profileWindow } from './animation-profiler.js';

const out = [];

test.afterAll(() => {
  if (out.length === 0) return;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `Tests/Benchmark/animation-results-${ts}.json`;
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(`\n[animation profile] wrote ${path}\n`);
  console.log('Summary (lower is better for everything except FPS):');
  console.log('─'.repeat(110));
  console.log(
    'Scenario'.padEnd(38) +
    'FPS'.padStart(7) +
    'avgFrame'.padStart(10) +
    'p95Frame'.padStart(10) +
    'longest'.padStart(10) +
    'jank%'.padStart(8) +
    'longTasks'.padStart(11) +
    'LoAF max'.padStart(11)
  );
  console.log('─'.repeat(110));
  for (const r of out) {
    console.log(
      String(r.label).padEnd(38) +
      String(r.fps).padStart(7) +
      String(r.avgFrameMs + 'ms').padStart(10) +
      String(r.p95FrameMs + 'ms').padStart(10) +
      String(r.longestFrameMs + 'ms').padStart(10) +
      String(r.jankPct + '%').padStart(8) +
      String(r.longTaskCount).padStart(11) +
      String((r.loafLongestMs || 0) + 'ms').padStart(11)
    );
  }
  console.log('─'.repeat(110));
});

async function record(page, label, durationMs, action) {
  // Inject the profiler module by reading it as text — it's an ES module
  // so we expose its export onto window via addInitScript.
  await page.exposeFunction('__captureResult', (r) => out.push(r));

  // Start profiler in the page, run the action concurrently, await both.
  const [report] = await Promise.all([
    page.evaluate(({ duration, label }) => {
      // Re-define a copy here so we don't need to bundle the module.
      // Keep this in sync with animation-profiler.js (it's small enough).
      return (async () => {
        const frameDeltas = [];
        let lastTs = performance.now();
        let stop = false;
        const tick = (ts) => {
          if (stop) return;
          const d = ts - lastTs;
          if (d > 0) frameDeltas.push(d);
          lastTs = ts;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        const longTasks = [];
        let ltObs = null;
        try {
          ltObs = new PerformanceObserver((list) => {
            for (const e of list.getEntries()) longTasks.push({ start: e.startTime, duration: e.duration });
          });
          ltObs.observe({ entryTypes: ['longtask'] });
        } catch {}

        const loafs = [];
        let loafObs = null;
        try {
          loafObs = new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              loafs.push({
                duration: e.duration,
                blocking: e.blockingDuration,
                scripts: (e.scripts || []).slice(0, 3).map((s) => ({
                  duration: s.duration,
                  fn: s.sourceFunctionName,
                  url: s.sourceURL,
                })),
              });
            }
          });
          loafObs.observe({ type: 'long-animation-frame', buffered: true });
        } catch {}

        await new Promise((r) => setTimeout(r, duration));
        stop = true;
        if (ltObs) ltObs.disconnect();
        if (loafObs) loafObs.disconnect();

        const total = frameDeltas.reduce((a, b) => a + b, 0);
        const fps = total > 0 ? (frameDeltas.length * 1000) / total : 0;
        const target = 1000 / 60;
        const dropped = frameDeltas.filter((d) => d > target * 1.5).length;
        const sorted = [...frameDeltas].sort((a, b) => a - b);
        const pct = (p) => sorted[Math.min(Math.floor(p * sorted.length), sorted.length - 1)] || 0;
        const round = (n, d) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

        return {
          label,
          fps: round(fps, 1),
          avgFrameMs: round(total / Math.max(frameDeltas.length, 1), 2),
          p95FrameMs: round(pct(0.95), 2),
          p99FrameMs: round(pct(0.99), 2),
          longestFrameMs: round(Math.max(0, ...frameDeltas), 2),
          jankPct: round((dropped / Math.max(frameDeltas.length, 1)) * 100, 1),
          droppedFrames: dropped,
          totalFrames: frameDeltas.length,
          longTaskCount: longTasks.length,
          loafCount: loafs.length,
          loafLongestMs: loafs.length ? round(Math.max(...loafs.map((f) => f.duration)), 2) : 0,
          loafTopScripts: loafs
            .flatMap((f) => f.scripts.map((s) => ({ ...s, frameDur: f.duration })))
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5),
        };
      })();
    }, { duration: durationMs, label }),
    (async () => { await page.waitForTimeout(50); if (action) await action(); })(),
  ]);

  await page.evaluate((r) => window.__captureResult(r), report);
  return report;
}

// ── Tests ────────────────────────────────────────────────────────────────

test('Counter — rapid increments', async ({ page }) => {
  await page.goto('/Examples/Counter/');
  await page.waitForSelector('[data-swiftui-mounted="true"]');
  const inc = page.locator('button:has-text("+")');
  await record(page, 'Counter rapid increments', 1500, async () => {
    for (let i = 0; i < 80; i++) {
      await inc.click({ timeout: 1000 });
      await page.waitForTimeout(8);
    }
  });
});

test('TodoApp — type 30 chars then add 5 todos', async ({ page }) => {
  await page.goto('/Examples/TodoApp/');
  await page.waitForSelector('[data-swiftui-mounted="true"]');
  const input = page.locator('input[type="text"]');
  const add = page.locator('button:has-text("Add")');
  await record(page, 'TodoApp typing + add', 2000, async () => {
    for (let i = 0; i < 5; i++) {
      await input.fill(`Buy milk ${i} — long enough text`);
      await page.waitForTimeout(100);
      await add.click();
      await page.waitForTimeout(100);
    }
  });
});

test('Netflix — open card then close', async ({ page }) => {
  await page.goto('/Examples/Netflix/');
  await page.waitForSelector('[data-swiftui-mounted="true"]');
  await page.waitForTimeout(500);
  await record(page, 'Netflix card open + close', 2500, async () => {
    const firstCard = page.locator('img').first();
    await firstCard.click({ force: true });
    await page.waitForTimeout(800);
    // Try common close affordances
    const closeBtn = page.locator('button:has-text("×"), button:has-text("✕"), button:has-text("Close")').first();
    if (await closeBtn.count()) {
      await closeBtn.click({ timeout: 2000 }).catch(() => {});
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(800);
  });
});

test('Netflix — scroll the page', async ({ page }) => {
  await page.goto('/Examples/Netflix/');
  await page.waitForSelector('[data-swiftui-mounted="true"]');
  await page.waitForTimeout(400);
  await record(page, 'Netflix page scroll', 1500, async () => {
    for (let i = 0; i < 25; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(40);
    }
  });
});

test('Charts — initial mount + idle', async ({ page }) => {
  await page.goto('/Examples/Charts/');
  await page.waitForSelector('[data-swiftui-mounted="true"]');
  await record(page, 'Charts idle (post-mount)', 1200, async () => {
    await page.waitForTimeout(1000);
  });
});

test('Airbnb — scroll the listing grid', async ({ page }) => {
  await page.goto('/Examples/Airbnb/');
  await page.waitForSelector('[data-swiftui-mounted="true"]');
  await page.waitForTimeout(800); // wait for mock API
  await record(page, 'Airbnb scroll grid', 1500, async () => {
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, 250);
      await page.waitForTimeout(40);
    }
  });
});
