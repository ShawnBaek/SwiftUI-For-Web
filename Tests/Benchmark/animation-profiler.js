/**
 * Animation profiler — measures runtime smoothness during a scripted
 * interaction.
 *
 * Captures, per run:
 *   - Frame timing via requestAnimationFrame deltas → FPS, dropped frames,
 *     longest frame.
 *   - Long Tasks (>50 ms) via PerformanceObserver — main-thread blockers.
 *   - Long Animation Frames (LoAF) via PerformanceObserver where supported —
 *     gives per-frame work breakdown (style/layout/render).
 *   - getAnimations().length snapshots so we know how many WAAPI animations
 *     were live during the window.
 *
 * Designed to be injected into a Playwright page; the page-side function
 * starts a window, runs whatever you want to measure, then resolves with
 * the report. See Tests/Benchmark/animation-profile.spec.js for use.
 */

/**
 * Page-context profiler. Exposed to window so a Playwright spec can call
 * `await page.evaluate(profileWindow, { duration: 1500, label: 'expand' })`.
 *
 * @param {Object} opts
 * @param {number} opts.duration  How long to record, in ms.
 * @param {string} [opts.label]   Label for the report.
 * @returns {Promise<Object>}     Report object.
 */
export async function profileWindow({ duration = 1000, label = 'window' } = {}) {
  // ── frame timing via rAF ──────────────────────────────────────────────
  const frameDeltas = [];
  let lastTs = performance.now();
  let stop = false;
  const tick = (ts) => {
    if (stop) return;
    const delta = ts - lastTs;
    if (delta > 0) frameDeltas.push(delta);
    lastTs = ts;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // ── long tasks (>50 ms blocks) ────────────────────────────────────────
  const longTasks = [];
  let longTaskObs = null;
  try {
    longTaskObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.push({
          start: entry.startTime,
          duration: entry.duration,
          name: entry.name,
        });
      }
    });
    longTaskObs.observe({ entryTypes: ['longtask'] });
  } catch { /* not supported in some browsers */ }

  // ── long animation frames (LoAF) — newer, much richer ─────────────────
  const longAnimFrames = [];
  let loafObs = null;
  try {
    loafObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longAnimFrames.push({
          start: entry.startTime,
          duration: entry.duration,
          renderStart: entry.renderStart,
          styleAndLayoutStart: entry.styleAndLayoutStart,
          blockingDuration: entry.blockingDuration,
          // Top scripts that contributed
          scripts: (entry.scripts || []).slice(0, 5).map((s) => ({
            duration: s.duration,
            name: s.name,
            invoker: s.invoker,
            invokerType: s.invokerType,
            sourceURL: s.sourceURL,
            sourceFunctionName: s.sourceFunctionName,
          })),
        });
      }
    });
    loafObs.observe({ type: 'long-animation-frame', buffered: true });
  } catch { /* LoAF not supported */ }

  // ── live WAAPI animation count snapshots ─────────────────────────────
  const animationCounts = [];
  const sampleAnimations = () => {
    try {
      const n = document.getAnimations ? document.getAnimations().length : 0;
      animationCounts.push({ at: performance.now(), count: n });
    } catch {}
  };
  const sampleInterval = setInterval(sampleAnimations, 50);

  // Wait the window out.
  await new Promise((r) => setTimeout(r, duration));
  stop = true;
  clearInterval(sampleInterval);
  if (longTaskObs) longTaskObs.disconnect();
  if (loafObs) loafObs.disconnect();

  // ── derive metrics ────────────────────────────────────────────────────
  const totalFrames = frameDeltas.length;
  const totalTime = frameDeltas.reduce((a, b) => a + b, 0);
  const avgDelta = totalTime / Math.max(totalFrames, 1);
  const fps = totalTime > 0 ? (totalFrames * 1000) / totalTime : 0;

  const targetFrameMs = 1000 / 60; // 16.67
  const droppedFrames = frameDeltas.filter((d) => d > targetFrameMs * 1.5).length;
  const jankPct = totalFrames > 0 ? (droppedFrames / totalFrames) * 100 : 0;
  const longestFrame = frameDeltas.length ? Math.max(...frameDeltas) : 0;
  const p95Frame = percentile(frameDeltas, 0.95);
  const p99Frame = percentile(frameDeltas, 0.99);

  return {
    label,
    duration,
    fps: round(fps, 1),
    avgFrameMs: round(avgDelta, 2),
    longestFrameMs: round(longestFrame, 2),
    p95FrameMs: round(p95Frame, 2),
    p99FrameMs: round(p99Frame, 2),
    droppedFrames,
    jankPct: round(jankPct, 1),
    totalFrames,
    longTaskCount: longTasks.length,
    longTaskTotalMs: round(longTasks.reduce((a, b) => a + b.duration, 0), 2),
    longestLongTaskMs: longTasks.length ? round(Math.max(...longTasks.map((t) => t.duration)), 2) : 0,
    loafCount: longAnimFrames.length,
    loafLongestMs: longAnimFrames.length ? round(Math.max(...longAnimFrames.map((f) => f.duration)), 2) : 0,
    loafTopScripts: topScripts(longAnimFrames),
    peakLiveAnimations: animationCounts.length ? Math.max(...animationCounts.map((s) => s.count)) : 0,
  };
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(Math.floor(p * sorted.length), sorted.length - 1)];
}

function round(n, digits) {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

function topScripts(loafEntries) {
  const byKey = new Map();
  for (const f of loafEntries) {
    for (const s of f.scripts || []) {
      const key = s.sourceFunctionName || s.name || s.sourceURL || '?';
      const cur = byKey.get(key) || { totalMs: 0, hits: 0 };
      cur.totalMs += s.duration;
      cur.hits += 1;
      byKey.set(key, cur);
    }
  }
  return Array.from(byKey.entries())
    .map(([k, v]) => ({ src: k, totalMs: round(v.totalMs, 2), hits: v.hits }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 5);
}
