# Testing

## Principles

1. **Zero dependencies.** Every test runs either by opening an HTML page in a
   browser or with plain `node`. No `npm install`, jsdom, or test framework.
   Playwright specs in `Tests/e2e` are optional extra validation and must never
   be required for development, release builds, or CI.
2. **Test behavior on the live path.** Mount views the way an app does
   (`App(…).mount`, or `render` of a descriptor), change state, and assert the
   DOM, ARIA, or events a user would observe. Don't assert private fields.
3. **One invariant, at least one test.** Each invariant in
   [ARCHITECTURE.md § 3](ARCHITECTURE.md#3-invariants) needs a test that fails
   when it's broken.
4. **For a bug, write the failing test first.** Commit the test that
   reproduces it, then the fix.
5. **No tautologies.** A test must be able to fail when the feature is broken.
   "Returns `this` for chaining" or "constant equals itself" doesn't count.
6. **Isolated and deterministic.** Clean up in `finally`, flush the scheduler
   explicitly (`flushSync`), and don't depend on test order or real time.
7. **Assert what the browser normalizes, not literal strings.** Browsers
   rewrite some values. For example, Chrome reads `url(#id)` back as
   `url("#id")`, and `border: none` back as `borderStyle: none`.

## How to run

| Suite | Command | Needs |
|---|---|---|
| Browser unit tests | Serve the repo (`python3 -m http.server 8000`) and open `http://localhost:8000/Tests/TestRunner.html` | Any browser |
| Node unit tests | `node run-tests.js` (also `npm test`) | Node ≥ 20 |
| Release-build tests | `node scripts/build-tests.js` | Node ≥ 20 |
| Optional e2e/visual | `Tests/e2e`, `Tests/visual` with Playwright | Optional only |

**Target (#53):** CI runs both the node suites and `Tests/TestRunner.html` in
the runner's installed browser (headless), with no npm dependencies.

## Current assessment (October 2026)

The 14 `Tests/**/*Tests.js` files contain **490** tests.
`Tests/TestRunner.html` runs 465 of them, plus 16 harness sanity checks:
474 pass and 7 fail. `Tests/Data/SignalTests.js` (25 tests) isn't imported by
the runner, so it never runs; it passes 25/25 under plain `node`. Neither
`npm test` nor CI runs any of these files. `npm test` runs a separate set of
96 tests in `run-tests.js`.

| Category | Share | Meaning |
|---|---|---|
| A. Behavior on the live path | 37.6% (184) | Keep. Most render a single descriptor into a detached element. |
| B. Behavior only through legacy `_render()` | 18.8% (92) | For Toggle and TextField this is the live path for now. Keep the strong ones (two-way binding, disabled, initial values). |
| C. Asserts internals (`.type`, frozen, private fields) | 25.3% (124) | Collapse into one immutability test per view family. |
| D. Trivial or tautological (`returns this`, constants) | 16.3% (80) | Delete. |
| E. Stale, or passes for the wrong reason | 2.0% (10) | Rewrite. |

About **43% (≈210)** are meaningful. None of the tests that run mount an app,
write state, and check the DOM. The suite would catch **none** of the 8 known
core bugs (#44–#51).

### The 7 current failures (all stale tests; no product regressions)

| Test | Cause | Fix |
|---|---|---|
| ViewTests `onTapGesture` click; ButtonTests "call action when clicked" | `delegateEvent` only attaches a root listener when one is passed, and the tests never call `initDelegation`. | Mount into a root that has delegation. |
| ShaderTests `style.filter` url, chained effects | Chrome serializes `url(#id)` as `url("#id")`. It also exposes a real de-duplication bug: `Renderer.js:461-463` never matches, so reapplying an effect duplicates it. | Assert `filter.includes(id)`. File the de-duplication bug. |
| AppTests `refresh()` | `refresh()` is intentionally a no-op on the signals engine. | Replace with a reactive test: `Text(() => s.value)`, write, `flushSync`. |
| AppTests `.element` | Knock-on from the failing test above: cleanup runs inline and is skipped. `afterEach` doesn't run when a test fails (`TestUtils.js:92-100`). | Run hooks in `finally`. |
| TextFieldTests plain style | Chrome reads `border: none` back as `border: ''`. | Assert `borderStyle`. |

## Required tests (by invariant)

Write these first, as browser-runner tests. Each one should fail on today's
code where a bug is noted.

1. **Counter:** mount, click `+` through delegation, `flushSync`, and the text reads "1".
2. **I2 / #44:** `Show(cond, Text(() => s.value), …)`. Toggling and updating `s` updates the visible branch, and the hidden branch stops writing.
3. **Keyed `For`:** insert, reorder, and remove keep each row's DOM node, and row thunks still update.
4. **I4 / #45:** an effect that throws doesn't block other effects in the same or later flushes.
5. **I3 / #46:** after unmounting, a reused pooled element doesn't fire the old action or `onAppear`. After unmounting, a state write doesn't touch detached nodes.
6. **I7 / #50:** `Button(a).onTapGesture(f)` fires both handlers. `frame({ maxWidth: 'infinity' })` produces valid CSS. The modifier-order spec needs the #50 design first.
7. **I9 / #51:** Toggle has `role="switch"`, and `aria-checked` follows both clicks and external state writes.
8. **I8 / #47:** every package entry loads, and the `.d.ts` exports match the runtime exports.
9. **I5 / I6 / #49:** sibling subtrees with different `.environment` values each read their own. Importing the library in plain `node` doesn't throw.

## Cleanup plan

- **Harness:** import `SignalTests.js` in the runner, run `afterEach` in `finally`, and add async support to `it`. Add a `node` entry for DOM-free suites (Signal, Scheduler, Color, Binding).
- **Keep:**
  - SignalTests
  - Text and Stack `render()` tests
  - Color conversions and Font `css()` output
  - Binding transforms
  - Toggle/TextField two-way binding
  - ObservableObject snapshot/restore
- **Rewrite:**
  - the 7 failures, as described above
  - State/ObservableObject tests that use the legacy `subscribe()`: assert through effect tracking instead
  - the "View class" App test: it has no assertion and hides a real bug
  - "applies modifiers in order": it checks unrelated properties, so it can't fail
- **Delete or collapse:**
  - the ~80 trivial tests
  - most of the ~124 internal-structure tests, replaced by one immutability test per view family and one table-driven modifier test
