# Architecture

This document describes how SwiftUI-For-Web works today, the invariants the
code must uphold, and where the current implementation still falls short of
them. [ROADMAP.md](ROADMAP.md) tracks the work that closes each gap.

## 1. Product principles

1. **Zero setup while developing.** An app is plain HTML, CSS, and native ES
   modules served by any static server. Nobody needs `npm install`, a bundler,
   a transpiler, or a compile step to write, run, or debug an app.
2. **Optional, optimized deployment.** `node scripts/build.js` produces a
   smaller release build that is tree-shaken and minified. Over time it will
   also bundle and content-hash the output. It uses only Node built-ins. The
   unbuilt source must always remain a valid, deployable app.
3. **SwiftUI is the reference design.** Public names, parameter labels,
   ownership, and update timing follow Apple's SwiftUI. Where JavaScript or the
   web platform forces a difference, it is recorded as a documented exception
   (section 5), never silently.
4. **Correctness before features.** A new API is added only on a core whose
   ownership, cleanup, and error handling are tested.

## 2. Layers

```text
App code         VStack(…).padding(), State, Binding, ObservableObject
   │  factory functions return frozen view descriptors
Descriptors      { type, props, children, modifiers, key }   src/Core/ViewDescriptor.js
   │  render(descriptor) → registerRenderer(type, fn)
Renderer         per-type DOM builders + applyModifiers       src/Core/Renderer.js
   │  effects created under the current owner
Reactive core    signals, owners, effects, scheduler          src/Data/Signal.js, src/Core/Scheduler.js
   │
Platform         EventDelegate, ElementPool, LifecycleObserver, Environment
Features         Animation, Gesture, Shader, Charts (separate entry: ./charts)
Build (opt.)     scripts/build.js: reachable graph, minify, report
```

**Update model.** A view body runs once, at mount. Reading a signal inside a
thunk (`Text(() => …)`) or a reactive modifier creates an effect. A state write
re-runs only the effects that read it. There is no virtual DOM and no diffing.
`For` keeps keyed rows, and `Show` swaps branches. Each row or branch has its
own owner.

## 3. Invariants

Each invariant applies to all code. Where the current code doesn't yet uphold
one, the gap is linked to the issue that fixes it.

| # | Invariant | Status |
|---|---|---|
| I1 | Views are immutable descriptors. Modifiers return new descriptors, and there is one view model with one shared modifier table. | Partial. About 30 legacy `View` subclasses remain, and generic modifiers are copied into 8 per-view `chainable()`s (#48). |
| I2 | Reactive bindings are created when their element is rendered, under the current owner. Nothing is bound later by walking the DOM. | Holds. `Renderer.render` binds Text thunks and reactive modifiers as each element is built (#44). Containers that re-render later outside an owner (TabView, GeometryReader, NavigationStack) render through `createOwnedSlot` (`src/Core/OwnedSlot.js`). Anything else rendered without an owner stays static and logs a one-time warning instead of leaking effects; NavigationSplitView and NavigationPath re-renders are in that state until #48. Tests: "Reactive bindings inside Show and For" in `run-tests.js`. |
| I3 | Every effect, listener, lifecycle callback, and pooled element belongs to an owner and is released when that owner is disposed. | Partial. Only elements created by `acquireElement` are pooled; elements that legacy `View` subclasses create with `document.createElement` may carry listeners added with `addEventListener`, so they are released but never reused. Releasing an element (`releaseElement`) clears its delegated handlers and lifecycle callbacks: a pending `onAppear` is dropped, and a registered `onDisappear` runs once on the next flush. An `onAppear` whose owner is disposed before the element appears is dropped too (#46). A `.task` is cancelled when its owner is disposed or its element leaves the document (#37). TabView, GeometryReader, and NavigationStack dispose the old content's effects through their slot and then release its elements (`releaseChildren`); NavigationStack's animation cleanup does nothing once the stack is disposed. ViewThatFits and NavigationSplitView still clear with `innerHTML` without disposing effects (#48). Tests: "Element pool release cleanup" in `run-tests.js`. |
| I4 | The scheduler isolates each effect. An error is reported with context, and other work still runs. | Holds. Every scheduled callback (all lanes, post-flush callbacks, DOM writes) runs in isolation: an error is logged with `console.error`, naming the lane or queue it came from, and the rest of the queue still runs. Transition and Idle work that exceeds its time budget is re-queued ahead of newer work (so it cannot starve) and keeps its priority, not dropped (#45). Tests: "Scheduler error isolation and lanes" in `run-tests.js`. |
| I5 | Environment values flow down the owner tree, and there is no global mutable app state. | Mostly holds. `.environment()` and `.environmentObject()` scope a view and its descendants through owner context (`runWithContext` / `readContext` in `src/Data/Signal.js`), and the nearest value wins (#49). Roots created by `Show`, `For` and owned slots keep the creating owner as `contextParent`, used only for lookups, so scoped values reach their content. A context owner with no reactive owner above it is marked unowned, so such a render stays static and warns as before. A plain scoped value is fixed per render; a `State` value updates its readers. Reads happen at render time, so a value read in a view function body before the modifier attaches still sees the app-wide value; `environmentObject` also registers the object app-wide as a fallback for such reads. |
| I6 | Importing the library never touches `window` or `document`. Platform access is lazy. | Holds. The environment store creates its system defaults on first use and falls back to fixed defaults without a browser (#49). `scripts/check-package.js` imports every entry in plain Node with no browser globals. |
| I7 | Modifier order has SwiftUI meaning. When order changes the result, a modifier wraps a new layer. | Violated. All modifiers write to one element (#50). |
| I8 | The public API is an explicit export list that matches `index.d.ts`. Internals aren't importable. | Partial. Every entry loads, `./core` exports exactly `.` minus `./charts`, and `./src/*` is no longer exported (internals are under the unstable `./internal/*`). `scripts/check-package.js` enforces this, and that every value and class member `index.d.ts` declares exists at runtime. Still open (#47): 86 runtime exports have no declaration (`scripts/types-baseline.json`, which may only shrink), scheduler, pool, and event-delegation internals are still exported from the main entry, and `index.js` and `core.js` each still spell out their export list twice. |
| I9 | Controls use native elements, or the WAI-ARIA pattern with keyboard support. | Partial. Button, Slider, select, NavigationLink (`<button>`, or `<a href>` with a URL) and the switch-style Toggle (a `<button role="switch">`) are native, and the tab-bar TabView follows the WAI-ARIA tabs pattern; the segmented Picker and List selection aren't yet (#51). |
| I10 | Every invariant has a test that fails when it's broken. | Missing. See [TESTING.md](TESTING.md) (#53). |

## 4. Source map

| Area | Files | Notes |
|---|---|---|
| Descriptors | `src/Core/ViewDescriptor.js`, `src/View/Text.js`, `src/View/Control/Button.js`, `src/Layout/Stack/*`, `src/Layout/Spacer.js`, `src/Layout/Divider.js`, `src/View/List/ForEach.js` | The live model. |
| Legacy views | `src/Core/View.js` and subclasses (`Toggle`, `TextField`, `Image`, `List`, `Picker`, `NavigationStack`, `TabView`, `WindowGroup`, …) | Mutable, `_render()`. Migrating them to descriptors is tracked in #48. |
| Rendering | `src/Core/Renderer.js`, `src/Core/SignalRenderer.js`, `src/Core/OwnedSlot.js` | `SignalRenderer.mount` is the entry point. `Renderer.render` creates reactive bindings during render. |
| Reactivity | `src/Data/Signal.js`, `State.js`, `Binding.js`, `ObservableObject.js`, `StateObject.js`, `src/Core/Scheduler.js` | `State` and `ObservableObject` still keep a legacy `subscribe` channel next to the signals. |
| Platform | `src/Core/EventDelegate.js`, `ElementPool.js`, `LifecycleObserver.js`, `src/Data/Environment.js` | Root-level event delegation; one shared MutationObserver that processes only the subtrees a mutation batch added or removed (#57). |
| Dead code | `src/Core/Chainable.js`, `src/Core/ViewFactory.js`, `src/Core/index.js`, descriptor hashing and `memo` in `ViewDescriptor.js` | Nothing imports these. Delete them in #48. |
| Entries | `src/index.js` (full), `src/core.js` (`./core`), `src/Charts/index.js` (`./charts`) | Each entry re-exports one list (`src/exports.js`, `src/core-exports.js`) and builds its default from it with `namespaceObject`; the core list is the full list without Charts, and `scripts/check-package.js` fails when they drift. `./styles/*` serves the CSS, and `./internal/*` reaches any module with no stability promise. |

## 5. Documented exceptions to SwiftUI

These differences are deliberate or unavoidable today. The model as a whole is
under review in #52, and changes to this list go through that RFC.

| SwiftUI | SwiftUI-For-Web | Reason |
|---|---|---|
| `@State var count = 0` | `const count = new State(0)`; `count.value`, `count.binding` | JavaScript has no property wrappers. |
| `body` re-evaluated on change | `body` runs once. Reactive reads pass a `State` or `Binding` directly (`Text(count)`, `.opacity(isVisible)`) or a thunk for derived values (`Text(() => …)`) | Fine-grained updates with no virtual DOM. A plain `Text(count.value)` doesn't update. See [ADR 0001](adr/0001-reactivity.md). |
| `if`, `switch` in a result builder | `Show(when, then, else)` | JavaScript has no result builders. |
| `ForEach(data, id:)` (always reactive) | `For(each, render, key)` is reactive; `ForEach` is a static snapshot | Historical. To be resolved in #52. |
| Argument labels | An options object, e.g. `VStack({ spacing: 8 }, …)` | JavaScript has no argument labels. |
| `.task(priority:) { … }`, cancellation through `Task.isCancelled` | `.task(action)` and `.task({ id }, action)`; the action receives an `AbortSignal` (`signal.aborted`, `signal.throwIfAborted()`); no `priority` | JavaScript has no task-local cancellation state and no task priorities. The signal is the platform's cancellation token, and `fetch` accepts it (#37). |

Any other divergence is a bug, unless it's added here through review.

## 6. Development and release builds

| | Development | Release (optional) |
|---|---|---|
| Tooling | None. A static file server is enough. | `node scripts/build.js --entry index.html` (Node built-ins only) |
| Modules | Native ES modules straight from `src/` | Only modules the entry statically reaches; public imports rewritten to their defining modules |
| Minification | None | Per-file JS and CSS minification |
| Report | — | `build-report.json` lists retained and removed files and their sizes |
| Planned | — | Optional bundling into fewer files, content-hashed names with a manifest, and export-level tree shaking (#41). An optional compile step could hoist static templates, which the README says is how Solid outperforms this framework. |

The release build must never become a requirement: everything it produces must
behave exactly like the unbuilt source. Build tests (`scripts/build-tests.js`)
enforce this.
