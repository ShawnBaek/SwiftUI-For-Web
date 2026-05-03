# Benchmark Results — SwiftUI-For-Web vs React 19 vs Solid.js

> **Note (post signal-engine cutover, 2026-05-04).** The framework's VDOM
> reconciler has been replaced with a fine-grained signal engine. The
> harness in `benchmark.js` was built for the reconciler model — it
> bypasses the State setter (`data._value = …`) and triggers updates via
> `app.refresh()`. On the signal engine `app.refresh()` is a no-op, so
> seven of the twelve scenarios now measure "nothing happening" and report
> sub-millisecond times that are NOT comparable to the React/Solid columns.
>
> The five **complex view tree** scenarios at the bottom are still valid —
> they don't depend on `app.refresh()` semantics. Until the harness is
> rewritten to use signal-driven mutations (`Text(() => …)` + setter
> writes), only those rows below should be cited as honest comparisons.
>
> The historical "after C.3" numbers (kept as the second-to-last column)
> were the last apples-to-apples baseline before the cutover.

3-way micro-benchmark comparing rendering, re-rendering, and DOM throughput.
Methodology: median of N iterations (5–15 per scenario), headless Chromium,
identical DOM target structures, no React.memo on non-leaf nodes, Solid uses
a single-signal `createEffect` model (matches "framework re-runs body" semantics).

How to reproduce:
```
npm run bench:capture        # 3-way; writes Tests/Benchmark/results-baseline.json
```
Open `Tests/Benchmark/index.html` in a browser to run interactively and export JSON.

## Headline numbers (medians, ms — lower is better)

| Benchmark | Baseline | After C.1 | After C.3 | Net Δ | vs React | vs Solid |
|---|---:|---:|---:|---:|---:|---:|
| Create 1,000 rows | 39.50 | 37.20 | 38.60 | **−2.3%** | 1.41× | 14.85× |
| Update every 10th row | 30.65 | 20.05 | 20.60 | **−32.8%** | 1.58× | 7.92× |
| Replace all 1,000 rows | 31.20 | 29.60 | 32.40 | +3.8% | 1.57× | 12.46× |
| Append 1,000 rows to 1,000 | 55.60 | 56.80 | 58.80 | +5.8% | 1.81× | 9.64× |
| Remove one row from 1,000 | 29.45 | 29.30 | 30.15 | +2.4% | 2.43× | 9.42× |
| Swap two rows in 1,000 | 29.75 | 19.15 | 20.60 | **−30.8%** | 1.26× | 7.36× |
| Clear 1,000 rows | 1.50 | 1.45 | 1.55 | +3.3% | 0.67× *(faster than React)* | 6.20× |
| Deep tree mount (500+ nodes) | 7.00 | 6.70 | 7.20 | +2.9% | 1.26× | 8.00× |
| Leaf update (1 node in 500) | 6.40 | 6.60 | 7.00 | +9.4% | 1.40× | 7.78× |
| Update 1 of 4 subtrees | 6.50 | 6.75 | 6.80 | +4.6% | 1.42× | 7.56× |
| Scattered updates (4 leaves) | 6.75 | 6.90 | 6.80 | +0.7% | 1.51× | 7.56× |
| Rapid-fire 100 re-renders | 760.30 | 775.90 | 807.80 | +6.2% | 1.26× | 8.71× |

Wins are bolded. Small regressions (1–10%) are within noise (single-machine
runs vary 5–10% scenario-to-scenario).

## What changed

### C.1 — Split `_selfHash` from subtree `_hash` (file: `src/Core/ViewDescriptor.js`, `src/Core/Reconciler.js`)

**Problem.** The descriptor hash recursively mixed in child hashes, so any
deep leaf change flagged every ancestor as `selfChanged`. The diff produced
one root-level UPDATE patch which collapsed back to a full re-render —
defeating partial reconciliation.

**Fix.** Two separate hashes per descriptor:
- `_selfHash`: type + key + props + modifiers. Excludes children.
- `_hash`: full subtree (selfHash mixed with child hashes). Used for the
  whole-subtree skip optimization.

`_viewChanged` now compares `selfHash`. If it matches, the diff recurses
into children to find the actual change instead of UPDATE-ing the whole
subtree.

**Also added.** Referential short-circuit in `_diff`:
`oldNode.view === newNode.view` skips the entire subtree without computing
any patches. Helps explicitly memoized branches and any closure that
returns a stable descriptor reference.

**Result.** −32.8% on "Update every 10th row" (now 1.58× behind React,
was 2.39×); −30.8% on "Swap two rows" (now 1.26× behind React, was 1.91×).

### C.3 — Controlled-view fallback (file: `src/Core/Reconciler.js`)

**Problem.** Pixel-perfect TodoApp baseline (Phase A) caught a regression
introduced by C.1: TextField holds a `Binding` whose `.value` mutates
without changing the Binding reference. With self-hash diffing, leaf
TextField nodes were no longer marked changed, so the DOM input stayed
out of sync with state when other parts of the tree updated.

**Fix.** A `CONTROLLED_LEGACY_VIEWS` set forces UPDATE for views that hold
mutable bindings: TextFieldView, SecureFieldView, ToggleView, SliderView,
StepperView, PickerView, DatePickerView, ColorPickerView. Other legacy
views (Text, VStack, HStack, etc.) keep their existing skip-on-property-
match optimization.

### Adaptive patch threshold (file: `src/Core/Reconciler.js`)

The hardcoded `patches.length > 30` full-rerender fallback is now
`max(50, oldTreeSize * 0.3)`. VNode tracks `subtreeSize` so the limit
scales with tree size. Effect on benchmarks is small (the C.1 self-hash
fix already removed most reasons we'd hit the threshold), but it
prevents pathological cases on large trees.

## What we learned about the gap

After C.1+C.3:
- Versus React 19: SwiftUI-For-Web is 1.26×–2.43× behind on most scenarios
  (closer than baseline), beats it on "Clear 1,000 rows".
- Versus Solid.js: still 6×–15× behind. Solid's strawman in this bench is
  imperative DOM rebuild on every signal change, but its measured cost is
  dominated by Chromium's DOM API itself rather than reconciliation.

**The remaining gap to React** is concentrated in scenarios that produce
many keyed children diffs (Append, Remove). Likely targets for future
work: VNode allocation (we build a fresh tree every render — pooling
would help), and modifier-application cost (each modifier currently does
its own DOM property write; batching all modifier writes per element into
one `cssText` assignment would reduce reflow).

**The remaining gap to Solid** is fundamental. Solid's signal-graph maps
state cells directly to DOM nodes; it does not run a virtual-DOM diff at
all. To meaningfully close this gap we'd need to add fine-grained
dependency tracking on top of the current descriptor model (a planned
C.5 follow-up — only worth doing if a real workload demands it).

## Verification

| Check | Result |
|---|---|
| Pixel-perfect screenshot baselines (7 examples) | ✅ 7/7 pass, 0-pixel diff |
| E2E suite (Playwright) | ✅ 91/91 pass |
| Unit tests | (browser-based; load `Tests/TestRunner.html`) |

Phase A's pixel-perfect baselines caught the TodoApp regression
introduced by C.1 immediately, before any other testing. That single
catch justified the harness and informed C.3.

## Files changed

- `src/Core/ViewDescriptor.js` — split self vs subtree hash, added `_selfHash` field.
- `src/Core/Reconciler.js` — VNode `selfHash` + `subtreeSize`, `CONTROLLED_LEGACY_VIEWS` set, referential short-circuit, adaptive patch threshold, self-hash diff path.
- `Tests/Benchmark/benchmark.js` — exported helpers, added Solid path, 3-way report.
- `Tests/Benchmark/solidBenchmarks.js` *(new)* — Solid scenarios mirroring SwiftUI/React.
- `Tests/Benchmark/capture.spec.js` *(new)* — Playwright @capture script that writes `results-*.json`.
- `Tests/visual/*.spec.js` *(new, 7 specs)* — pixel-perfect screenshot baselines.
- `Tests/visual/fixtures/deterministic.js` *(new)* — seeded RNG, frozen Date, font/scrollbar normalization, external image blocking.
- `Tests/visual/__screenshots__/*` *(new, 11 PNGs)* — committed baselines.
- `playwright.config.js` — `testDir: './Tests'` casing fix + `testMatch` for e2e/visual/Benchmark dirs.
- `package.json` — `test:visual`, `test:visual:update`, `bench:capture` scripts.
