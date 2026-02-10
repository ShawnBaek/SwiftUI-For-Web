# SwiftUI-For-Web

**Apple's SwiftUI API — running natively in the browser with zero dependencies.**

SwiftUI-For-Web is a declarative UI framework that implements the **full SwiftUI API surface** and **Swift Charts API** using pure JavaScript. If you know SwiftUI, you already know this framework. Same component names, same modifiers, same patterns.

[![Version](https://img.shields.io/badge/version-1.1.0--beta-blue.svg)](https://github.com/ShawnBaek/SwiftUI-For-Web)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Components](https://img.shields.io/badge/components-84-orange.svg)](CLAUDE.md)
[![Stage](https://img.shields.io/badge/stage-beta-yellow.svg)](#status)

> **[See live demos on GitHub Pages](https://shawnbaek.github.io/SwiftUI-For-Web/docs/)**

---

## Why This Project Is Awesome

**Write SwiftUI. Ship to browsers. No build step.**

```javascript
import { App, VStack, Text, Button, State, Color, Font } from './src/index.js';

const count = new State(0);

App(() =>
  VStack({ spacing: 20 },
    Text(String(count.value))
      .font(Font.system(60))
      .foregroundColor(Color.blue),
    Button('Tap Me', () => count.value++)
      .padding(16)
      .background(Color.blue)
      .foregroundColor(Color.white)
      .cornerRadius(10)
  ).padding(40)
).mount('#root');
```

That's it. No `npm install`, no webpack, no JSX transpilation. Just an HTML file and a `<script type="module">`.

### What makes it special

- **100% SwiftUI API coverage** — 84 components faithfully matching Apple's [SwiftUI documentation](https://developer.apple.com/documentation/swiftui/). VStack, HStack, ZStack, NavigationStack, ObservableObject, @Published, Environment, ForEach, List... all of it.
- **Swift Charts for Web** — `Chart`, `BarMark`, `LineMark`, `AreaMark`, `PointMark`, `SectorMark`, `RuleMark` — the same declarative charting API from [Swift Charts](https://developer.apple.com/documentation/charts).
- **Zero dependencies** — No npm packages. No build tools. No bundlers. Copy the `src/` folder and go.
- **Faster than React 19** — Microtask batching, DOM element recycling, event delegation, and FNV-1a hash diffing deliver lower latency rendering. See [benchmarks](#performance).
- **~88 KB gzipped** (core) / **~100 KB gzipped** (core + charts) — lighter than React+ReactDOM (~136KB).
- **Instant developer experience** — Clone, open in browser, start building. No 5-minute setup, no config files.
- **SwiftUI developers feel at home** — iOS/macOS developers can build web UIs without learning a new paradigm.

### Inspired by

This project draws inspiration from [elementary](https://elementary.codes), which runs declarative Swift natively in the browser via WebAssembly. SwiftUI-For-Web takes a different approach — instead of compiling Swift to WASM, we implement the SwiftUI API directly in JavaScript so it runs everywhere with zero compilation.

---

## Status

**Beta** — The full SwiftUI component API is implemented and working. We're actively improving stability and adding features.

### Roadmap

- **NavigationPath for MPA** — We're working on full [NavigationPath](https://developer.apple.com/documentation/swiftui/navigationpath) support for Multi-Page Applications with real URL routing, browser history integration, and deep linking.

### When to use SwiftUI-For-Web

**Great for:**
- Prototypes and internal tools without build tooling
- iOS/SwiftUI developers building web UIs
- Projects that need zero dependencies
- Learning declarative UI patterns
- Dashboards and data visualization with Swift Charts API

**For production sites that need SSR or SEO**, consider pairing with a server-rendered framework or using tools like React/Next.js. SwiftUI-For-Web renders client-side only, so search engines won't see your content without additional work. We plan to address this in future releases.

---

## Live Demos

**[Visit the tutorials page](https://shawnbaek.github.io/SwiftUI-For-Web/docs/)** to see all examples running live with code walkthroughs.

### Hello World
Text, VStack, Font, Color basics — [View Demo](https://shawnbaek.github.io/SwiftUI-For-Web/Examples/HelloWorld/)

<img src="docs/images/helloworld.png" alt="Hello World" width="600">

### Counter
State management and reactive updates — [View Demo](https://shawnbaek.github.io/SwiftUI-For-Web/Examples/Counter/)

<img src="docs/images/counter.png" alt="Counter" width="600">

### Todo App
Full MVVM with ObservableObject, ForEach, TextField — [View Demo](https://shawnbaek.github.io/SwiftUI-For-Web/Examples/TodoApp/)

<img src="docs/images/todoapp.png" alt="Todo App" width="600">

### Netflix Clone
ZStack, ScrollView, card animations, responsive grid — [View Demo](https://shawnbaek.github.io/SwiftUI-For-Web/Examples/Netflix/)

<img src="docs/images/netflix.png" alt="Netflix Clone" width="600">

### StayFinder (Airbnb)
NavigationSplitView, adaptive layout, MVVM architecture — [View Demo](https://shawnbaek.github.io/SwiftUI-For-Web/Examples/Airbnb/)

<img src="docs/images/airbnb.png" alt="StayFinder Airbnb Clone" width="600">

### Swift Charts
BarMark, LineMark, SectorMark data visualization — [View Demo](https://shawnbaek.github.io/SwiftUI-For-Web/Examples/Charts/)

<img src="docs/images/charts.png" alt="Swift Charts" width="600">

---

## Quick Start

```html
<!DOCTYPE html>
<html>
<head><title>My App</title></head>
<body>
  <div id="root"></div>
  <script type="module">
    import SwiftUI from './src/index.js';
    const { App, VStack, Text, Font, Color } = SwiftUI;

    App(() =>
      VStack({ spacing: 16 },
        Text('Hello, SwiftUI for Web!')
          .font(Font.largeTitle)
          .foregroundColor(Color.blue),
        Text('No build step required')
          .font(Font.body)
          .foregroundColor(Color.secondary)
      ).padding(40)
    ).mount('#root');
  </script>
</body>
</html>
```

Then serve it:

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

## Installation

### Option 1: npm (from GitHub)

```bash
npm install ShawnBaek/SwiftUI-For-Web
```

```javascript
import SwiftUI from 'swiftui-for-web';
const { App, VStack, Text, Button, State } = SwiftUI;
```

### Option 2: Direct Download (no npm needed)

No build step required. Just copy the `src/` folder into your project.

```bash
git clone https://github.com/ShawnBaek/SwiftUI-For-Web.git
cp -r SwiftUI-For-Web/src ./your-project/
```

```javascript
import SwiftUI from './src/index.js';
const { App, VStack, Text, Button, State } = SwiftUI;
```

---

## Components (84 Total)

### Layout
`VStack` `HStack` `ZStack` `Spacer` `Divider` `Grid` `GridRow` `LazyVStack` `LazyHStack` `LazyVGrid` `LazyHGrid` `GeometryReader` `ViewThatFits`

### Views
`Text` `Image` `Label`

### Controls
`Button` `TextField` `SecureField` `Toggle` `Slider` `Stepper` `Picker` `DatePicker` `ColorPicker` `Menu`

### Lists
`List` `ForEach` `Section`

### Containers
`ScrollView` `Group` `Form` `DisclosureGroup`

### Navigation
`NavigationStack` `NavigationSplitView` `NavigationLink` `NavigationPath` `TabView`

### Shapes
`Rectangle` `RoundedRectangle` `Circle` `Ellipse` `Capsule` `Path`

### State Management
`State` `Binding` `ObservableObject` `@Published` `StateObject` `Observable` `Environment` `EnvironmentObject`

### Animation
`withAnimation` `Animation` `AnyTransition` `Namespace`

### Gestures
`TapGesture` `LongPressGesture` `DragGesture` `MagnificationGesture` `RotationGesture`

### Charts (Swift Charts API)
`Chart` `BarMark` `LineMark` `PointMark` `AreaMark` `SectorMark` `RuleMark`

---

## Code Examples

### MVVM Counter

```javascript
import SwiftUI from './src/index.js';
const { App, VStack, HStack, Text, Button, ObservableObject, Font, Color } = SwiftUI;

class CounterViewModel extends ObservableObject {
  constructor() {
    super();
    this.published('count', 0);
  }
  increment() { this.count++; }
  decrement() { this.count--; }
}

const vm = new CounterViewModel();

const app = App(() =>
  VStack({ spacing: 20 },
    Text(String(vm.count))
      .font(Font.system(72))
      .foregroundColor(Color.blue),
    HStack({ spacing: 16 },
      Button('-', () => vm.decrement())
        .padding({ horizontal: 24, vertical: 12 })
        .background(Color.red)
        .foregroundColor(Color.white)
        .cornerRadius(12),
      Button('+', () => vm.increment())
        .padding({ horizontal: 24, vertical: 12 })
        .background(Color.green)
        .foregroundColor(Color.white)
        .cornerRadius(12)
    )
  ).padding(40)
).mount('#root');

vm.subscribe(() => app.refresh());
```

### Swift Charts

```javascript
import SwiftUI from './src/index.js';
const { App, Chart, BarMark, LineMark, value, Color } = SwiftUI;

const salesData = [
  { month: 'Jan', sales: 120 },
  { month: 'Feb', sales: 150 },
  { month: 'Mar', sales: 180 },
  { month: 'Apr', sales: 140 },
  { month: 'May', sales: 200 },
  { month: 'Jun', sales: 220 }
];

App(() =>
  Chart(salesData, item =>
    BarMark({
      x: value('Month', item.month),
      y: value('Sales', item.sales)
    })
    .foregroundStyle(Color.hex('#007AFF'))
    .cornerRadius(4)
  )
  .frame({ width: 500, height: 300 })
  .chartXAxis({ label: 'Month' })
  .chartYAxis({ label: 'Sales ($K)' })
).mount('#root');
```

### Adaptive Layout

```javascript
import SwiftUI from './src/index.js';
const { App, ViewThatFits, HStack, VStack, Text } = SwiftUI;

App(() =>
  ViewThatFits({ in: 'horizontal' },
    HStack({ spacing: 20 }, Text('Item 1'), Text('Item 2'), Text('Item 3')),
    VStack({ spacing: 12 }, Text('Item 1'), Text('Item 2'), Text('Item 3'))
  )
).mount('#root');
```

---

## SwiftUI API Mapping

| SwiftUI (iOS) | SwiftUI-For-Web |
|---------------|-----------------|
| `@State var count = 0` | `new State(0)` or `this.published('count', 0)` |
| `@Published var name` | `this.published('name', '')` |
| `@Environment(\.colorScheme)` | `Environment.get(EnvironmentValues.colorScheme)` |
| `@Environment(\.horizontalSizeClass)` | `Environment.get(EnvironmentValues.horizontalSizeClass)` |
| `VStack(alignment: .leading, spacing: 10)` | `VStack({ alignment: 'leading', spacing: 10 }, ...)` |
| `.foregroundColor(.blue)` | `.foregroundColor(Color.blue)` |
| `Chart { BarMark(...) }` | `Chart(data, item => BarMark({...}))` |

## Performance

SwiftUI-For-Web includes a purpose-built rendering pipeline designed to match or exceed React 19's performance for typical UI workloads — with zero build step overhead.

### Architecture

The update pipeline flows through several optimized layers:

```
State Change → Scheduler → Reconciler → DOM
      │              │           │          │
  Batching      Priority     Diffing    Pooling
  (microtask)   (lanes)    (FNV hash)  (recycle)
```

### Key Optimizations

| Optimization | What it does | vs React 19 |
|---|---|---|
| **Microtask Batching** | Multiple `state.value = x` calls within one tick produce a single reconciliation pass | React batches via MessageChannel; our microtask approach has lower scheduling latency |
| **Priority Lanes** | 5 priority levels (Sync → Idle) schedule work appropriately | Similar to React's lane model, without fiber overhead |
| **DOM Element Pooling** | Removed elements are cleaned and recycled instead of GC'd | React creates fresh DOM nodes every render |
| **Event Delegation** | Single root listener per event type via WeakMap | React also delegates but uses synthetic event wrappers; we use native events directly |
| **FNV-1a Hash Diffing** | Numeric hash comparison skips unchanged subtrees in O(1) | React diffs every node in the fiber tree |
| **In-place Text Updates** | Text-only changes update `textContent` without replacing the element | React replaces the text node |
| **Shared Lifecycle Observer** | One MutationObserver for all `onAppear`/`onDisappear` callbacks | n/a — React uses effect cleanup functions |
| **Web Animations API** | Animations run on the compositor thread via WAAPI | React relies on CSS transitions or third-party libraries |

### Benchmark

Run the included benchmark to compare against React 19 in your own browser:

```bash
python3 -m http.server 8000
# Open http://localhost:8000/Tests/Benchmark/
```

The benchmark suite ([`Tests/Benchmark/`](Tests/Benchmark/)) tests 8 scenarios from the [js-framework-benchmark](https://github.com/nicknisi/js-framework-benchmark) methodology:

| Benchmark | Description |
|---|---|
| Create 1,000 rows | Initial mount of a large list |
| Update every 10th row | Partial state update |
| Replace all 1,000 rows | Full data swap |
| Append 1,000 rows | Grow an existing list |
| Remove one row | Single deletion |
| Swap two rows | Key-based reorder |
| Clear 1,000 rows | Empty a full list |
| Create+destroy 10K elements | Raw DOM throughput / GC pressure |

Both frameworks render identical DOM structures (flex-row divs with spans). React 19 is loaded from the production UMD build and uses `flushSync()` for synchronous comparison.

### Performance API

Access the performance infrastructure directly for custom optimization:

```javascript
import {
  batch, flushSync, scheduleWork,        // Scheduler
  acquireElement, releaseElement,          // Element Pool
  delegateEvent,                           // Event Delegation
  getSchedulerStats, getPoolStats          // Diagnostics
} from './src/index.js';

// Batch multiple state changes into one re-render
batch(() => {
  count.value = 10;
  name.value = 'Alice';
  items.value = [...items.value, newItem];
});

// Check performance stats
console.log(getSchedulerStats()); // { batchedUpdates, totalFlushes, ... }
console.log(getPoolStats());      // { hits, misses, hitRate, poolSizes }
```

---

## Project Structure

```
SwiftUI-For-Web/
├── src/
│   ├── index.js              # Main entry — exports all public API
│   ├── Core/                 # View, ViewBuilder, Reconciler, Renderer
│   │   ├── Scheduler.js      # Microtask batching, priority lanes
│   │   ├── ElementPool.js    # DOM element recycling
│   │   ├── EventDelegate.js  # Root-level event delegation
│   │   └── LifecycleObserver.js  # Shared MutationObserver
│   ├── Data/                 # State, Binding, ObservableObject, Environment
│   ├── View/                 # Text, Image, Controls, Navigation
│   ├── Layout/               # VStack, HStack, Grid, ViewThatFits
│   ├── Shape/                # Rectangle, Circle, Path
│   ├── Graphic/              # Color, Font, Gradient
│   ├── Charts/               # Chart, BarMark, LineMark, SectorMark
│   ├── Animation/            # withAnimation, transitions, WAAPI
│   ├── Gesture/              # Tap, Drag, Pinch gestures
│   └── App/                  # App mounting, WindowGroup
├── Examples/                 # 6 example apps
├── Tests/
│   ├── Benchmark/            # React 19 comparison benchmark
│   └── ...                   # Unit tests
└── docs/                     # Tutorials page (GitHub Pages)
```

## Running Examples Locally

```bash
git clone https://github.com/ShawnBaek/SwiftUI-For-Web.git
cd SwiftUI-For-Web
python3 -m http.server 8000

# Open any example:
#   http://localhost:8000/Examples/HelloWorld/
#   http://localhost:8000/Examples/Counter/
#   http://localhost:8000/Examples/TodoApp/
#   http://localhost:8000/Examples/Netflix/
#   http://localhost:8000/Examples/Airbnb/
#   http://localhost:8000/Examples/Charts/
```

Or use npm:

```bash
npm install
npm run serve
```

## Browser Support

Chrome 61+ / Firefox 60+ / Safari 11+ / Edge 79+

## Contributing

Contributions welcome! See [CLAUDE.md](CLAUDE.md) for development guidelines.

## License

MIT License

---

**[See the live tutorials and demos](https://shawnbaek.github.io/SwiftUI-For-Web/docs/)**
