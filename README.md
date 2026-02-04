# SwiftUI-For-Web

**Build web apps the SwiftUI way. Zero dependencies. ~52KB gzipped.**

A declarative UI framework that brings Apple's SwiftUI paradigm to web development using pure JavaScript.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/ShawnBaek/SwiftUI-For-Web)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Components](https://img.shields.io/badge/components-84-orange.svg)](CLAUDE.md)

## Features

- **Zero Dependencies** - No npm, no bundlers, no build step
- **Tiny Size** - ~52KB gzipped (React+ReactDOM is ~136KB)
- **100% SwiftUI Coverage** - 84 components matching SwiftUI's API
- **Adaptive Layouts** - Size classes, ViewThatFits, NavigationSplitView
- **MVVM Architecture** - ObservableObject, @Published, Environment

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import SwiftUI from './src/index.js';
    const { App, VStack, Text, Button, State, Color, Font } = SwiftUI;

    const count = new State(0);

    App(() =>
      VStack({ spacing: 20 },
        Text('Hello SwiftUI-For-Web!')
          .font(Font.largeTitle),
        Text(String(count.value))
          .font(Font.system(60))
          .foregroundColor(Color.blue),
        Button('Tap Me', () => {
          count.value++;
        })
          .padding(16)
          .background(Color.blue)
          .foregroundColor(Color.white)
          .cornerRadius(10)
      )
      .padding(40)
    ).mount('#root');

    count.subscribe(() => App.refresh());
  </script>
</body>
</html>
```

## Installation

### Option 1: npm (Recommended)

```bash
npm install swiftui-for-web
```

Then import in your JavaScript:

```javascript
import SwiftUI from 'swiftui-for-web';
const { App, VStack, Text, Button, State } = SwiftUI;
```

### Option 2: Direct Download

No build step required! Just copy the `src/` folder to your project.

```bash
git clone https://github.com/ShawnBaek/SwiftUI-For-Web.git
cp -r SwiftUI-For-Web/src ./your-project/
```

Then import directly:

```javascript
import SwiftUI from './src/index.js';
```

## Running Examples

Examples require a local HTTP server (ES modules don't work with `file://`).

### Using npm scripts

```bash
# Clone the repo
git clone https://github.com/ShawnBaek/SwiftUI-For-Web.git
cd SwiftUI-For-Web

# Install (optional, only needed for npm scripts)
npm install

# Run examples
npm run serve
# Then open in browser:
#   http://localhost:8000/Examples/Airbnb/
#   http://localhost:8000/Examples/Counter/
#   http://localhost:8000/Examples/TodoApp/
#   http://localhost:8000/Examples/Netflix/
#   http://localhost:8000/Examples/HelloWorld/
```

### Using Python (no npm needed)

```bash
cd SwiftUI-For-Web
python3 -m http.server 8000
# Open http://localhost:8000/Examples/Airbnb/
```

### Using Node.js

```bash
npx serve .
# Open http://localhost:3000/Examples/Airbnb/
```

### Using VS Code Live Server

1. Install the "Live Server" extension
2. Right-click `Examples/Airbnb/index.html`
3. Select "Open with Live Server"

## Import Styles

```javascript
// Simple (recommended)
import SwiftUI from './src/index.js';
const { VStack, Text, Button, App } = SwiftUI;

// Named imports (tree-shakeable)
import { VStack, Text, Button, App } from './src/index.js';
```

## Size Comparison

| Framework | Gzipped Size |
|-----------|-------------|
| **SwiftUI-For-Web** | **~52 KB** |
| React + ReactDOM | ~136 KB |
| Vue 3 | ~33 KB |
| Angular | ~130 KB |

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

## Examples

### 1. Hello World
```javascript
import SwiftUI from './src/index.js';
const { App, Text, Font, Color } = SwiftUI;

App(() =>
  Text('Hello, World!')
    .font(Font.largeTitle)
    .foregroundColor(Color.blue)
).mount('#root');
```

### 2. Counter with MVVM
```javascript
import SwiftUI from './src/index.js';
const { App, VStack, HStack, Text, Button, ObservableObject, Published, Font, Color } = SwiftUI;

class CounterViewModel extends ObservableObject {
  @Published count = 0;

  increment() { this.count++; }
  decrement() { this.count--; }
}

const vm = new CounterViewModel();

App(() =>
  VStack({ spacing: 20 },
    Text(String(vm.count))
      .font(Font.system(72))
      .foregroundColor(Color.blue),
    HStack({ spacing: 16 },
      Button('-', () => vm.decrement())
        .font(Font.title)
        .padding({ horizontal: 24, vertical: 12 })
        .background(Color.red)
        .foregroundColor(Color.white)
        .cornerRadius(12),
      Button('+', () => vm.increment())
        .font(Font.title)
        .padding({ horizontal: 24, vertical: 12 })
        .background(Color.green)
        .foregroundColor(Color.white)
        .cornerRadius(12)
    )
  )
  .padding(40)
).mount('#root');
```

### 3. Adaptive Layout
```javascript
import SwiftUI from './src/index.js';
const {
  App, VStack, HStack, Text,
  Environment, EnvironmentValues, UserInterfaceSizeClass,
  ViewThatFits
} = SwiftUI;

// Automatically switches layout based on available space
App(() =>
  ViewThatFits({ in: 'horizontal' },
    // Wide layout (desktop)
    HStack({ spacing: 20 },
      Text('Item 1'),
      Text('Item 2'),
      Text('Item 3')
    ),
    // Narrow layout (mobile)
    VStack({ spacing: 12 },
      Text('Item 1'),
      Text('Item 2'),
      Text('Item 3')
    )
  )
).mount('#root');
```

### 4. Navigation
```javascript
import SwiftUI from './src/index.js';
const { App, NavigationStack, NavigationLink, VStack, Text, List, ForEach } = SwiftUI;

const items = ['Apple', 'Banana', 'Cherry'];

App(() =>
  NavigationStack(
    VStack(
      Text('Fruits').font(Font.largeTitle),
      List(
        ForEach(items, (item) =>
          NavigationLink(
            Text(item),
            () => Text(`You selected: ${item}`).font(Font.title)
          )
        )
      )
    )
  )
).mount('#root');
```

## Project Structure

```
SwiftUI-For-Web/
├── src/
│   ├── index.js              # Main entry (import SwiftUI from here)
│   ├── Core/                 # View, ViewBuilder
│   ├── Data/                 # State, Binding, ObservableObject, Environment
│   ├── View/                 # Text, Image, Controls, Navigation
│   ├── Layout/               # VStack, HStack, Grid, ViewThatFits
│   ├── Shape/                # Rectangle, Circle, Path
│   ├── Graphic/              # Color, Font, Gradient
│   ├── Animation/            # withAnimation, transitions
│   ├── Gesture/              # Tap, Drag, Pinch gestures
│   └── App/                  # App mounting, WindowGroup
├── Examples/
│   ├── HelloWorld/           # Basic example
│   ├── Counter/              # State management
│   ├── TodoApp/              # MVVM pattern
│   ├── Netflix/              # Complex UI
│   └── Airbnb/               # Full app with adaptive layout
│       ├── index.html
│       ├── main.js           # App entry
│       ├── ViewModels/       # App state
│       ├── Views/            # UI components
│       ├── Services/         # API layer
│       └── Components/       # Reusable UI
└── CLAUDE.md                 # Development guide
```

## Recommended App Structure

```
MyApp/
├── index.html
├── main.js                   # App entry point
├── ViewModels/
│   ├── AppViewModel.js       # Main app state
│   └── SettingsViewModel.js
├── Views/
│   ├── Home/
│   │   ├── HomeView.js
│   │   └── index.js
│   ├── Detail/
│   │   ├── DetailView.js
│   │   └── index.js
│   └── Settings/
│       └── SettingsView.js
├── Components/               # Reusable UI
│   ├── Card.js
│   ├── Avatar.js
│   └── LoadingSpinner.js
└── Services/
    └── api.js
```

## SwiftUI Mapping

| SwiftUI (iOS) | SwiftUI-For-Web |
|---------------|-----------------|
| `@State var count = 0` | `@Published count = 0` |
| `@Environment(\.colorScheme)` | `Environment.get(EnvironmentValues.colorScheme)` |
| `@Environment(\.horizontalSizeClass)` | `Environment.get(EnvironmentValues.horizontalSizeClass)` |
| `UIDevice.current.userInterfaceIdiom` | `currentDeviceIdiom()` returns `'phone'`, `'pad'`, `'mac'` |

## Browser Support

- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

## Contributing

Contributions welcome! See [CLAUDE.md](CLAUDE.md) for development guidelines.

## License

ISC License

---

**Made with love for the SwiftUI and Web communities.**
