# SwiftUI-For-Web

**Apple's SwiftUI API, running in the browser. Fine-grained reactive engine. Zero dependencies, no build step.**

If you know SwiftUI, you already know this framework. Same component names (`VStack`, `Text`, `Button`, `NavigationStack`, `ForEach`, `ObservableObject`), same modifier chain (`.padding()`, `.foregroundColor()`, `.cornerRadius()`), the same `Chart`/`BarMark`/`LineMark` API from Swift Charts — implemented in plain JavaScript, mounted with a `<script type="module">`.

Under the hood, view bodies run **once at mount**. State changes execute only the small effect closures bound to the affected DOM nodes — no virtual DOM, no diff, no patches. Closer in spirit to Solid than to React.

[![Version](https://img.shields.io/badge/version-2.0.0--alpha-blue.svg)](https://github.com/ShawnBaek/SwiftUI-For-Web)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Engine](https://img.shields.io/badge/engine-fine--grained%20reactive-purple.svg)](#architecture)
[![Bundle](https://img.shields.io/badge/gzipped-~98KB-brightgreen.svg)](#bundle-size)

> **[Live demos](https://shawnbaek.github.io/SwiftUI-For-Web/docs/)** · **[Architecture](#architecture)** · **[Migration from v1](#migrating-from-v1-reconciler)**

---

## A complete app, end to end

```javascript
import { App, VStack, Text, Button, State, Color, Font } from './src/index.js';

const count = new State(0);

App(() =>
  VStack({ spacing: 20 },
    // Reactive: thunk auto-tracks count.value
    Text(() => String(count.value))
      .font(Font.system(60))
      .foregroundColor(Color.blue),

    // Handler just mutates state — no app.refresh(), no subscribe wiring
    Button('Tap Me', () => count.value++)
      .padding(16)
      .background(Color.blue)
      .foregroundColor(Color.white)
      .cornerRadius(10)
  ).padding(40)
).mount('#root');
```

Mount once, mutate freely. The `Text(() => …)` thunk subscribes to whatever signals it reads. When `count.value++` runs, the framework re-executes only that one closure and updates that one text node — nothing else in the tree re-runs.

No `npm install`, no bundler, no JSX. Save as `index.html` + `main.js`, serve with any static server, done.

---

## Why this exists

- **SwiftUI parity, not inspiration.** Component names, modifier names, parameter names match Apple's API. Porting a SwiftUI snippet usually means changing `var` to `let` and a few syntax bits — the structure stays the same.
- **No build pipeline.** ES modules in the browser do the work that webpack/vite usually do. Edit, refresh, see it.
- **MVVM out of the box.** `State`, `Binding`, `ObservableObject`, `@Published`, `Environment` — same observation semantics as SwiftUI, but reads inside view bodies auto-track.
- **No virtual DOM.** Phase out React's "rebuild and diff" model in favor of fine-grained effects. Mount once, update only what changed.
- **Swift Charts too.** `Chart { BarMark(x: ..., y: ...) }` works as you'd expect, alongside `LineMark`, `AreaMark`, `PointMark`, `SectorMark`, `RuleMark`, `RectangleMark`.

---

## Install

```bash
# Option A — npm
npm install swiftui-for-web

# Option B — direct from GitHub
npm install github:ShawnBaek/SwiftUI-For-Web

# Option C — clone and copy src/ into your project
git clone https://github.com/ShawnBaek/SwiftUI-For-Web
```

Subpath imports if you want a smaller bundle:

```javascript
import { App, VStack, Text } from 'swiftui-for-web';          // everything
import { signalMount } from 'swiftui-for-web/core';            // engine + Renderer
import { Chart, BarMark, LineMark } from 'swiftui-for-web/charts';
```

Run any example locally:

```bash
python3 serve.py 8000        # multi-threaded server (recommended; serves
                              # 70+ ES modules in parallel)
# or:
npm run serve                 # single-threaded fallback
```

Then open `http://localhost:8000/Examples/Counter/`.

---

## How reactivity works (the one important page)

You write SwiftUI-shaped code. The framework runs it once at mount and looks for **reactive surfaces** — places where a binding must update when state changes.

### Reactive Text content

Wrap reads in a thunk and the framework binds the textContent to a tracked effect:

```javascript
Text(() => `Hello, ${user.name}`)
```

Plain `Text(user.name)` (no thunk) snapshots at mount and never updates. The thunk is the opt-in.

### Conditional rendering — `Show`

```javascript
import { Show } from 'swiftui-for-web';

Show(
  () => vm.todos.length === 0,
  Text('No todos yet'),                 // when truthy
  Text('You have things to do'),        // when falsy (optional)
)
```

The `when` thunk is tracked. Branch swap mounts/unmounts the children, disposing effects on the way out.

### Lists — `For`

```javascript
import { For } from 'swiftui-for-web';

For(
  () => vm.todos,
  (todo) => TodoRow(todo),
  (todo) => todo.id,    // optional — defaults to item.id or index
)
```

Keyed reconciliation at the data level (compare key arrays only). Stable items keep their DOM and effects; new items mount; removed items dispose. Identity-aware: a new object with the same key (immutable update via `map`/`filter`) remounts the row so its render closure captures the new item.

### State primitives are unchanged

```javascript
import { State, Binding, ObservableObject, Environment } from 'swiftui-for-web';

const count = new State(0);
count.value++;                          // setter triggers tracked observers
count.binding;                          // two-way binding for controls

class VM extends ObservableObject {
  constructor() {
    super();
    this.published('items', []);
  }
}
const vm = new VM();
vm.items = [...vm.items, item];         // setter notifies tracked observers
```

`State.subscribe(cb)` still works (re-implemented over `createEffect` internally) so existing `vm.subscribe(...)` callers keep functioning during migration.

---

## Examples

Seven runnable examples in `Examples/`, each a self-contained HTML + module:

| Example | What it shows |
|---|---|
| **HelloWorld** | Static layout — minimal mount path |
| **Counter** | `State`, thunks, button actions — proof of fine-grained reactivity |
| **TodoApp** | `ObservableObject`, `For`, `Show`, two-way `Binding`, MVVM end-to-end |
| **Netflix** | Carousels, hero sections, image grids, scroll-driven layout |
| **Charts** | Bar / Line / Area / Point / Pie / Donut / target-line — Swift Charts API |
| **Airbnb** | Sticky header, modal detail view, responsive grid, image gallery |
| **TestShowcase** | Every component in one page — integration smoke test |

```bash
python3 serve.py
# open http://localhost:8000/Examples/Airbnb/
```

---

## Component coverage

84 components matching SwiftUI 1:1, plus `Show`/`For` for reactive control flow. Highlights:

| Category | Components |
|---|---|
| **Layout** | `VStack`, `HStack`, `ZStack`, `LazyVStack/HStack`, `LazyVGrid/HGrid`, `Grid` + `GridRow`, `Spacer`, `Divider`, `GeometryReader`, `ViewThatFits` |
| **Controls** | `Button`, `TextField`, `SecureField`, `Toggle`, `Slider`, `Stepper`, `Picker`, `Menu`, `DatePicker`, `ColorPicker` |
| **Lists** | `List` (with `ListStyle`), `ForEach`, `Section`, `DisclosureGroup` |
| **Containers** | `ScrollView`, `Group`, `Form` |
| **Navigation** | `NavigationStack`, `NavigationLink`, `NavigationPath`, `NavigationSplitView`, `TabView` |
| **State** | `State`, `Binding`, `ObservableObject` + `@Published`, `StateObject`, `Observable`, `Environment`, `EnvironmentObject` |
| **Reactive control flow** | `Show`, `For` *(new — required for conditional/list rendering on the signal engine)* |
| **Shapes** | `Rectangle`, `RoundedRectangle`, `UnevenRoundedRectangle`, `Circle`, `Ellipse`, `Capsule`, `Path` |
| **Graphics** | `Color`, `Font`, `LinearGradient`, `RadialGradient`, `AngularGradient` |
| **Animation** | `withAnimation`, `Animation` (spring/easing), `AnyTransition`, `matchedGeometryEffect` |
| **Gestures** | `TapGesture`, `LongPressGesture`, `DragGesture`, `MagnificationGesture`, `RotationGesture` |
| **App** | `App`, `WindowGroup`, `Scene`, `Settings`, `DocumentGroup` |

Plus the full **Swift Charts** surface: `Chart`, `BarMark`, `LineMark`, `AreaMark`, `PointMark`, `SectorMark`, `RuleMark`, `RectangleMark`, `PlottableValue`, `MarkDimension`.

---

## Architecture

```
src/
├── Core/
│   ├── Signal.js          createSignal/createEffect/createMemo/onCleanup/
│   │                       createRoot/untrack/batch — the reactive engine
│   ├── Renderer.js        Per-type DOM creation registry. Show/For
│   │                       registered here so they work nested anywhere.
│   ├── SignalRenderer.js  Mount path: createRoot → render → walk for
│   │                       Text(() => …) bindings → attach
│   ├── Scheduler.js       Microtask batching, 5 priority lanes,
│   │                       flushSync (loops until quiescent)
│   ├── ElementPool.js     Recycle removed elements
│   ├── EventDelegate.js   Single root listener per event type, WeakMap
│   ├── LifecycleObserver  Shared MutationObserver for onAppear/onDisappear
│   ├── ViewDescriptor.js  Frozen descriptor objects, FNV-1a hashing
│   └── ChangeTracker.js   Debug-mode change logs (legacy View only)
├── Data/                  State, Binding, ObservableObject, StateObject,
│                          Observable, Environment, EnvironmentObject —
│                          all wired into Signal's tracking via lazy
│                          per-property observer Sets
├── View/                  Text, Image, Label, Control/, List/,
│                          Container/, Navigation/, ControlFlow/{Show,For}
├── Layout/                VStack, HStack, ZStack, Lazy*, Grid,
│                          GeometryReader, ViewThatFits
├── Modifier/              padding, frame, font, color, background, etc.
├── Shape/, Graphic/, Animation/, Gesture/, App/, Charts/
└── styles/                reset.css, base.css
```

Render pipeline:

```
Mount:
  view factory ─► descriptors (frozen)
                       │
              SignalRenderer.mount: createRoot
                       │
                       ▼
              Renderer.js dispatch by type
                ├─ static types: build DOM via registered renderer
                ├─ Text(() => ...): wrap textContent set in createEffect
                ├─ Show: createEffect(when) → mount/unmount branch
                └─ For: createEffect(each) → keyed mount/unmount/move

Subsequent state writes:
  state.value = x
       │
       ▼
  observers (registered during render's tracked reads)
       │
       ▼
  Scheduler.scheduleWork(observer, DefaultLane)
       │
       ▼ microtask flush
  effect.execute()
       │
       ▼
  ONE DOM property update — nothing else re-runs
```

### What's reused from non-VDOM frameworks

This **is** a fine-grained reactive engine, not just a reconciler optimization. Inspirations from prior art (verifiable in source):

- **Solid** — signal/effect/memo/owner/cleanup primitives, keyed reconciliation in `For` (`Tests/Benchmark/solidBenchmarks.js` runs head-to-head).
- **SwiftUI** — the public API surface, modifier chain, `ObservableObject`/`@Published`/`Environment` semantics.
- **OpenSwiftUI** — module organization (Core / Data / View / Layout / Modifier / Animation / Graphic).
- **React** — Priority Lanes are explicitly *"inspired by React lanes, simplified"* (`Scheduler.js:23`). Root-level event delegation.

What we **don't** have that Solid does: a JSX → DOM-creation compiler. Without a build step, we can't hoist static templates. Reactive bindings must be opt-in via thunks (`Text(() => …)`). The framework is a hybrid: signal-based reactive engine, SwiftUI-shaped public API.

---

## Migrating from v1 (reconciler)

If you used the previous reconciler-based v1 API:

| v1 (reconciler) | v2 (signals) |
|---|---|
| `Text(String(count.value))` | `Text(() => String(count.value))` |
| `vm.foo === 'x' ? A : B` | `Show(() => vm.foo === 'x', A, B)` |
| `ForEach(vm.items, ...)` | `For(() => vm.items, ...)` |
| `vm.subscribe(() => app.refresh())` | (delete — auto-propagates) |
| `app.refresh()` calls in handlers | (delete — auto-propagates) |

Eager-read patterns that snapshot to a local then pass it into a binding lose reactivity:

```javascript
const filtered = vm.todos.filter(...);          // ❌ snapshot
For(() => filtered, ...)                         // never updates

For(() => vm.todos.filter(...), ...)             // ✅ thunked
```

The `Counter`, `HelloWorld`, `TodoApp`, and `Airbnb/Views/Listing/ListingGrid` examples in this repo are reference migrations.

---

## Performance

The benchmark harness (`npm run bench:capture`) was built for the v1 reconciler model — it bypasses State setters and triggers updates via the now-no-op `app.refresh()`. The first 7 list-workload scenarios therefore measure "nothing happening" on the v2 engine and report sub-millisecond times that are NOT comparable.

Until the harness is rewritten to use signal-driven mutations, only the **5 complex view tree** scenarios at the bottom are honest comparisons. See [`Tests/Benchmark/RESULTS.md`](Tests/Benchmark/RESULTS.md) for the full table and the historical "after C.3" v1 baseline.

| Benchmark (complex view trees, valid) | SwiftUI-FW | React 19 | Solid |
|---|---:|---:|---:|
| Deep tree mount (500+ nodes) | 9.7 ms | 5.4 ms | 0.9 ms |
| Leaf update (1 node in 500) | 7.0 ms | 4.6 ms | 0.9 ms |
| Update 1 of 4 subtrees | 6.7 ms | 4.5 ms | 0.85 ms |
| Scattered updates (4 leaves) | 6.85 ms | 4.45 ms | 0.9 ms |
| Rapid 100 re-renders | 729 ms | 628 ms | 105 ms |

Honest take: **competitive with React 19 on real workloads** (within 1.4–1.6× on the valid scenarios). **Solid is meaningfully faster** across the board — Solid's compile step hoists static templates and produces minimum-allocation DOM ops. We can't match that without a build step. Set expectations accordingly: faster than the v1 reconciler on partial updates; structurally cannot equal Solid.

### What makes the new engine fast

- **No view-body re-execution.** Mount once. State writes run only the small effect closures that read the changed signal.
- **Per-property observer sets.** `vm.foo` and `vm.bar` have independent observer sets — an effect over `vm.foo` doesn't re-run on a `vm.bar` write.
- **Microtask batching.** Scheduler dedups: many writes in one tick produce at most one effect re-run per affected target.
- **In-place sync for controlled inputs.** `TextField` has an effect that mutates `input.value` from the bound signal — preserves focus/selection across writes.
- **DOM element pool.** Removed elements get reused on next mount.
- **Root-level event delegation.** Single listener per event type per root, WeakMap dispatch.

---

## Bundle size

| Build | Gzipped |
|---|---:|
| Core (no charts) | ~98 KB |
| Core + charts | ~109 KB |

For honest perspective:

| Framework | Gzipped runtime |
|---|---:|
| Solid 1.x (`solid-js` + `solid-js/web`) | ~10 KB |
| Vue 3 (`vue` runtime + compiler) | ~34 KB |
| React 18 + ReactDOM (production) | ~44 KB |
| **SwiftUI-For-Web (core)** | **98 KB** |
| **SwiftUI-For-Web (core + charts)** | **109 KB** |

We are **larger** than React+ReactDOM at the runtime level. The trade-off is API surface: 84 components covering layout, controls, lists, navigation, shapes, animation, gestures, charts, and the SwiftUI state primitives all in the box. To match the surface area with React you'd add React Router, Recharts, Framer Motion, react-hook-form, and a chunk of Material UI / Radix; the resulting bundle ends up substantially larger. If you only need React's runtime, React is smaller. Pick what fits.

A real bundler with tree-shaking will cut this further if you only import a subset.

---

## Testing

Three layers, all driven by Playwright:

```bash
npm test              # unit tests (Signal core, State/Binding, components)
npm run test:e2e      # end-to-end behaviour over real DOM
npm run test:visual   # pixel-perfect baselines, maxDiffPixels: 0
                       # — 8 baselines × 7 examples
```

The visual harness uses seeded RNG, frozen `Date`, normalized fonts, and blocks external image hosts so screenshots are byte-identical across machines. It is the load-bearing safety net for engine changes.

Re-record baselines after intentional UI changes:

```bash
npm run test:visual:update
```

---

## Browser support

ES2020 + ES modules. Confirmed working on:

- Chrome / Edge ≥ 90
- Firefox ≥ 90
- Safari ≥ 15

Uses the View Transitions API for animations where available, with a graceful fallback when not.

---

## Contributing

Issues and PRs welcome. Before opening a PR:

1. `npm run test:visual` — all 8 baselines should match with `maxDiffPixels: 0`.
2. If you touched any rendered output, regenerate baselines (`test:visual:update`) only when the change is intentional.
3. If you touched the reactive engine, add a test in `run-tests.js` Signal section.

---

## License

MIT © Shawn Baek
