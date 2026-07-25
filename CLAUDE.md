# CLAUDE.md - AI Assistant Guide for SwiftUI-For-Web

This document provides guidance for AI assistants working on the SwiftUI-For-Web project.

## Project Overview

**SwiftUI-For-Web** brings Apple's SwiftUI declarative paradigm to web development using pure JavaScript, CSS, and HTML at the user's edge. Users add no `npm install` and need no build step for development. An optional Node built-ins-only release compiler removes unreachable modules and resources. Runtime code has no third-party or vendored animation dependency.

### Vision

- Build a SwiftUI-like framework using **vanilla JavaScript, CSS, and HTML**
- **No dependencies**: users author against the SwiftUI API and the framework imports its own source directly
- **Native animation engine**: `withAnimation` / `.animation` / `.transition` / `matchedGeometryEffect` route through SwiftUI-shaped APIs backed by Web Animations API, CSS transitions, and View Transitions API.
- Implement **declarative UI** patterns matching SwiftUI's component model
- Follow **MVVM (Model-View-ViewModel)** architecture
- Provide familiar APIs for iOS/macOS developers transitioning to web
- **Stay as close to SwiftUI's API as possible** - use OpenSwiftUI as reference

### Core Principles

1. **No required build step, no deps**: users add zero npm packages; release optimization is optional and built in
2. **Native animation engine**: animation APIs live in `src/Animation/Animation.js`
3. **Declarative**: Describe what the UI should look like, not how to build it
4. **MVVM Architecture**: Clear separation between Model, View, and ViewModel
5. **SwiftUI Parity**: Match SwiftUI component names, behaviors, and API signatures exactly

### Current State

This project is in **active development** with extensive functionality complete. As of now:
- ✅ Core View system with modifier chaining
- ✅ Layout components (VStack, HStack, ZStack, Spacer, Divider, GeometryReader)
- ✅ Controls (Button, TextField, SecureField, Toggle, Slider, Stepper, Picker)
- ✅ State management (State, Binding, ObservableObject)
- ✅ List, ForEach, Section for dynamic lists
- ✅ Containers (ScrollView, Group, Form, DisclosureGroup)
- ✅ Navigation (NavigationStack, NavigationLink, TabView)
- ✅ Shapes (Rectangle, RoundedRectangle, Circle, Ellipse, Capsule, Path)
- ✅ Color, Font, and Gradient systems
- ✅ Animation system (withAnimation, Animation, AnyTransition, matchedGeometryEffect)
- ✅ Gestures (Tap, LongPress, Drag, Magnification, Rotation)
- ✅ App mounting and refresh
- ✅ 4 example apps (HelloWorld, Counter, TodoApp, Netflix)

**Progress: 100% of SwiftUI components implemented** 🎉

## Feature Support Status

### Comparison Table: SwiftUI vs SwiftUI-For-Web

| Category | SwiftUI Feature | Status | Priority | Notes |
|----------|----------------|--------|----------|-------|
| **Core** | View protocol | 🟢 Done | P0 | Base class with modifiers |
| **Core** | body property | 🟢 Done | P0 | Via _render() method |
| **Core** | ViewBuilder | 🟢 Done | P1 | DSL for building views |
| **Layout** | VStack | 🟢 Done | P0 | Flexbox column |
| **Layout** | HStack | 🟢 Done | P0 | Flexbox row |
| **Layout** | ZStack | 🟢 Done | P1 | CSS Grid layering |
| **Layout** | Spacer | 🟢 Done | P0 | Flex-grow element |
| **Layout** | Divider | 🟢 Done | P2 | HR element |
| **Layout** | Grid | 🔴 Planned | P2 | CSS Grid |
| **Layout** | LazyVStack | 🟢 Done | P3 | Virtual scrolling |
| **Layout** | LazyHStack | 🟢 Done | P3 | Virtual scrolling |
| **Layout** | LazyVGrid | 🟢 Done | P3 | CSS Grid lazy |
| **Layout** | LazyHGrid | 🟢 Done | P3 | CSS Grid lazy |
| **Layout** | Grid | 🟢 Done | P2 | CSS Grid |
| **Layout** | GridRow | 🟢 Done | P2 | Grid row container |
| **Layout** | GeometryReader | 🟢 Done | P2 | Parent size access |
| **Layout** | ViewThatFits | 🟢 Done | P2 | Adaptive view selection |
| **View** | Text | 🟢 Done | P0 | Full modifier support |
| **View** | Image | 🟢 Done | P1 | Img element with modifiers |
| **View** | Label | 🟢 Done | P2 | Icon + text |
| **Control** | Button | 🟢 Done | P0 | With buttonStyle |
| **Control** | TextField | 🟢 Done | P1 | With binding |
| **Control** | SecureField | 🟢 Done | P2 | Password input |
| **Control** | Toggle | 🟢 Done | P1 | 3 styles (switch/checkbox/button) |
| **Control** | Slider | 🟢 Done | P2 | Input range with tint |
| **Control** | Stepper | 🟢 Done | P2 | +/- buttons |
| **Control** | Picker | 🟢 Done | P2 | Multiple styles (menu/segmented/wheel) |
| **Control** | DatePicker | 🟢 Done | P3 | Input date |
| **Control** | ColorPicker | 🟢 Done | P3 | Color selector |
| **Control** | Menu | 🟢 Done | P2 | Dropdown menu |
| **List** | List | 🟢 Done | P1 | Scrollable list with selection |
| **List** | ForEach | 🟢 Done | P0 | Array iteration with id |
| **List** | Section | 🟢 Done | P2 | Grouped content in Form |
| **Container** | ScrollView | 🟢 Done | P1 | Overflow scroll (H/V) |
| **Container** | Group | 🟢 Done | P1 | Logical grouping |
| **Container** | Form | 🟢 Done | P2 | Form container with sections |
| **Container** | DisclosureGroup | 🟢 Done | P2 | Expandable sections |
| **Navigation** | NavigationStack | 🟢 Done | P2 | Router-based nav |
| **Navigation** | NavigationSplitView | 🟢 Done | P2 | Adaptive multi-column nav |
| **Navigation** | NavigationLink | 🟢 Done | P2 | Nav trigger |
| **Navigation** | NavigationPath | 🟢 Done | P2 | Nav state |
| **Navigation** | TabView | 🟢 Done | P2 | Tab bar and page styles |
| **State** | @State | 🟢 Done | P0 | State class |
| **State** | @Binding | 🟢 Done | P0 | Binding class |
| **State** | @ObservableObject | 🟢 Done | P1 | ObservableObject class |
| **State** | @Published | 🟢 Done | P1 | published() method |
| **State** | @StateObject | 🟢 Done | P2 | Owned observable |
| **State** | @EnvironmentObject | 🟢 Done | P2 | Shared state |
| **State** | @Environment | 🟢 Done | P2 | System values |
| **State** | @Observable (iOS 17+) | 🟢 Done | P3 | Proxy-based |
| **Modifier** | .padding() | 🟢 Done | P0 | CSS padding |
| **Modifier** | .frame() | 🟢 Done | P0 | Width/height |
| **Modifier** | .foregroundColor() | 🟢 Done | P0 | Text/icon color |
| **Modifier** | .background() | 🟢 Done | P0 | Background color/view |
| **Modifier** | .font() | 🟢 Done | P0 | Typography |
| **Modifier** | .opacity() | 🟢 Done | P1 | CSS opacity |
| **Modifier** | .cornerRadius() | 🟢 Done | P1 | Border radius |
| **Modifier** | .shadow() | 🟢 Done | P2 | Box shadow |
| **Modifier** | .border() | 🟢 Done | P1 | CSS border |
| **Modifier** | .clipShape() | 🟢 Done | P2 | Clip to shape |
| **Modifier** | .onTapGesture() | 🟢 Done | P1 | Click handler |
| **Modifier** | .onAppear() | 🟢 Done | P1 | Mount lifecycle |
| **Modifier** | .onDisappear() | 🟢 Done | P2 | Unmount lifecycle |
| **Shape** | Rectangle | 🟢 Done | P1 | Div element with fill/stroke |
| **Shape** | RoundedRectangle | 🟢 Done | P1 | Border radius |
| **Shape** | Circle | 🟢 Done | P1 | Border radius 50% |
| **Shape** | Ellipse | 🟢 Done | P2 | Oval shape |
| **Shape** | Capsule | 🟢 Done | P2 | Pill shape |
| **Shape** | Path | 🟢 Done | P2 | SVG paths |
| **Graphic** | Color | 🟢 Done | P0 | System colors + hex/rgb |
| **Graphic** | Font | 🟢 Done | P0 | Presets + system() |
| **Graphic** | LinearGradient | 🟢 Done | P2 | CSS linear-gradient |
| **Graphic** | RadialGradient | 🟢 Done | P2 | CSS radial-gradient |
| **Graphic** | AngularGradient | 🟢 Done | P3 | CSS conic-gradient |
| **Animation** | withAnimation | 🟢 Done | P2 | View Transition API |
| **Animation** | Animation | 🟢 Done | P2 | Spring, easing curves |
| **Animation** | AnyTransition | 🟢 Done | P2 | opacity, scale, slide, move |
| **Animation** | matchedGeometryEffect | 🟢 Done | P2 | Hero animations |
| **Gesture** | TapGesture | 🟢 Done | P1 | Via onTapGesture |
| **Gesture** | LongPressGesture | 🟢 Done | P2 | Long press |
| **Gesture** | DragGesture | 🟢 Done | P2 | Drag tracking |
| **Gesture** | MagnificationGesture | 🟢 Done | P2 | Pinch to zoom |
| **Gesture** | RotationGesture | 🟢 Done | P2 | Two-finger rotation |
| **App** | App | 🟢 Done | P1 | mount/refresh |
| **App** | WindowGroup | 🟢 Done | P2 | Scene container |

**Legend:** 🟢 Done | 🟡 In Progress | 🔴 Planned

**Priority:** P0 = MVP | P1 = Core | P2 = Important | P3 = Nice to have

### Implementation Summary

| Category | Done | Planned | Total |
|----------|------|---------|-------|
| Core | 3 | 0 | 3 |
| Layout | 13 | 0 | 13 |
| View | 3 | 0 | 3 |
| Control | 10 | 0 | 10 |
| List | 3 | 0 | 3 |
| Container | 4 | 0 | 4 |
| Navigation | 5 | 0 | 5 |
| State | 8 | 0 | 8 |
| Modifier | 13 | 0 | 13 |
| Shape | 6 | 0 | 6 |
| Graphic | 5 | 0 | 5 |
| Animation | 4 | 0 | 4 |
| Gesture | 5 | 0 | 5 |
| App | 2 | 0 | 2 |
| **Total** | **84** | **0** | **84** |

**Progress: 100% of SwiftUI components implemented** 🎉

## Reference: OpenSwiftUI Project

This project uses [OpenSwiftUI](https://github.com/OpenSwiftUIProject/OpenSwiftUI) as the primary reference for API design and architecture patterns.

### OpenSwiftUI Architecture (Reference)

OpenSwiftUI organizes its source code into functional modules:

```
OpenSwiftUI/Sources/
├── OpenSwiftUICore/           # Core functionality
│   ├── View/                  # Core view components
│   ├── Layout/                # Layout system (alignment, edges)
│   ├── Data/                  # State management, environment
│   ├── Modifier/              # View modifiers
│   ├── Animation/             # Animation system
│   ├── Graphic/               # Colors, graphics
│   ├── Event/                 # Event handling
│   ├── Render/                # Rendering engine
│   └── Shape/                 # Shape primitives
├── OpenSwiftUI/               # Primary implementation
│   ├── View/
│   │   ├── Control/           # Button, Toggle, Slider, etc.
│   │   ├── List/              # List views
│   │   ├── Navigation/        # Navigation views
│   │   ├── Image/             # Image views
│   │   └── Toggle/            # Toggle components
│   ├── Layout/                # VStack, HStack, ZStack, etc.
│   ├── Data/                  # @State, @Binding, @Environment
│   ├── Modifier/              # All view modifiers
│   └── App/                   # App lifecycle
└── OpenSwiftUIExtension/      # Additional APIs
```

**Key Insight**: OpenSwiftUI separates concerns by **functionality** (Animation, Layout, Data, View) rather than grouping all components together. We follow this pattern.

## Repository Structure

```
SwiftUI-For-Web/
├── README.md          # Project description
├── CLAUDE.md          # This file - AI assistant guidance
└── (implementation to come)
```

### Target Directory Structure (OpenSwiftUI-Inspired)

```
SwiftUI-For-Web/
├── src/
│   ├── Core/                      # Core framework (like OpenSwiftUICore)
│   │   ├── View.js                # Base View protocol/class
│   │   ├── ViewBuilder.js         # View builder pattern
│   │   ├── Body.js                # Body computation
│   │   └── index.js
│   │
│   ├── Data/                      # State management (like OpenSwiftUI/Data)
│   │   ├── State.js               # @State equivalent
│   │   ├── Binding.js             # @Binding equivalent
│   │   ├── ObservableObject.js    # @ObservableObject equivalent
│   │   ├── Published.js           # @Published equivalent
│   │   ├── StateObject.js         # @StateObject equivalent
│   │   ├── EnvironmentObject.js   # @EnvironmentObject equivalent
│   │   ├── Environment.js         # @Environment equivalent
│   │   └── index.js
│   │
│   ├── View/                      # View components (like OpenSwiftUI/View)
│   │   ├── Text.js                # Text view
│   │   ├── Image.js               # Image view
│   │   ├── Control/               # Interactive controls
│   │   │   ├── Button.js
│   │   │   ├── TextField.js
│   │   │   ├── SecureField.js
│   │   │   ├── Toggle.js
│   │   │   ├── Slider.js
│   │   │   ├── Stepper.js
│   │   │   ├── Picker.js
│   │   │   ├── DatePicker.js
│   │   │   └── index.js
│   │   ├── List/                  # List views
│   │   │   ├── List.js
│   │   │   ├── ForEach.js
│   │   │   ├── Section.js
│   │   │   └── index.js
│   │   ├── Navigation/            # Navigation
│   │   │   ├── NavigationView.js
│   │   │   ├── NavigationLink.js
│   │   │   ├── NavigationStack.js
│   │   │   └── index.js
│   │   ├── Container/             # Container views
│   │   │   ├── Group.js
│   │   │   ├── ScrollView.js
│   │   │   ├── Form.js
│   │   │   └── index.js
│   │   └── index.js
│   │
│   ├── Layout/                    # Layout system (like OpenSwiftUI/Layout)
│   │   ├── Stack/
│   │   │   ├── VStack.js          # Vertical stack
│   │   │   ├── HStack.js          # Horizontal stack
│   │   │   ├── ZStack.js          # Z-axis stack
│   │   │   ├── LazyVStack.js      # Lazy vertical stack
│   │   │   ├── LazyHStack.js      # Lazy horizontal stack
│   │   │   └── index.js
│   │   ├── Grid/
│   │   │   ├── LazyVGrid.js
│   │   │   ├── LazyHGrid.js
│   │   │   ├── GridItem.js
│   │   │   └── index.js
│   │   ├── Spacer.js
│   │   ├── Divider.js
│   │   ├── Alignment.js           # Alignment types
│   │   ├── Edge.js                # Edge insets
│   │   └── index.js
│   │
│   ├── Modifier/                  # View modifiers (like OpenSwiftUI/Modifier)
│   │   ├── ViewModifier.js        # Base modifier protocol
│   │   ├── LayoutModifiers.js     # padding, frame, offset, position
│   │   ├── StyleModifiers.js      # foregroundColor, background, font
│   │   ├── EffectModifiers.js     # opacity, shadow, blur, clipShape
│   │   ├── EventModifiers.js      # onTapGesture, onAppear, onDisappear
│   │   └── index.js
│   │
│   ├── Shape/                     # Shape primitives (like OpenSwiftUICore/Shape)
│   │   ├── Shape.js               # Base Shape protocol
│   │   ├── Rectangle.js
│   │   ├── RoundedRectangle.js
│   │   ├── Circle.js
│   │   ├── Ellipse.js
│   │   ├── Capsule.js
│   │   ├── Path.js
│   │   └── index.js
│   │
│   ├── Animation/                 # Animation system
│   │   ├── Animation.js
│   │   ├── Transaction.js
│   │   ├── withAnimation.js
│   │   └── index.js
│   │
│   ├── Graphic/                   # Graphics (like OpenSwiftUICore/Graphic)
│   │   ├── Color.js               # Color type
│   │   ├── Gradient.js            # LinearGradient, RadialGradient
│   │   ├── Font.js                # Font definitions
│   │   └── index.js
│   │
│   ├── App/                       # App lifecycle (like OpenSwiftUI/App)
│   │   ├── App.js                 # @main App protocol
│   │   ├── Scene.js               # Scene protocol
│   │   ├── WindowGroup.js
│   │   └── index.js
│   │
│   ├── Render/                    # DOM rendering engine
│   │   ├── Renderer.js            # Core renderer
│   │   ├── DOMNode.js             # DOM node abstraction
│   │   ├── Reconciler.js          # Diff and update
│   │   └── index.js
│   │
│   ├── styles/                    # CSS styles
│   │   ├── reset.css              # CSS reset
│   │   ├── base.css               # Base component styles
│   │   └── index.css              # Main stylesheet
│   │
│   └── index.js                   # Main entry point - exports all public API
│
├── Examples/                      # Example applications
│   ├── HelloWorld/
│   ├── Counter/
│   ├── TodoApp/
│   ├── NavigationDemo/
│   └── ComponentShowcase/
│
├── Tests/                         # Test suite
│   ├── Core/
│   ├── Data/
│   ├── View/
│   ├── Layout/
│   ├── TestRunner.html
│   └── TestUtils.js
│
├── Docs/                          # Documentation
│   ├── GettingStarted.md
│   ├── Components.md
│   ├── StateManagement.md
│   ├── Modifiers.md
│   └── Architecture.md
│
├── index.html                     # Demo page
├── README.md
└── CLAUDE.md
```

## Architecture

### MVVM Pattern

```
┌─────────────────────────────────────────────────────┐
│                      View                            │
│   (Declarative UI - VStack, Text, Button, etc.)     │
│                        ▲                             │
│                        │ @Binding / @ObservedObject │
│                        ▼                             │
│                   ViewModel                          │
│   (@Observable class with @Published properties)    │
│                        ▲                             │
│                        │                             │
│                        ▼                             │
│                     Model                            │
│   (Data structures, API calls, persistence)         │
└─────────────────────────────────────────────────────┘
```

### SwiftUI Component Lifecycle

```javascript
// Match SwiftUI's View protocol pattern
class ContentView extends View {
  // State properties
  @State count = 0

  // Body is computed/called when state changes
  body() {
    return VStack(
      Text(`Count: ${this.count}`),
      Button('Increment', () => this.count++)
    )
  }
}
```

### Declarative Syntax Goal

```javascript
// Target API - as close to SwiftUI as JavaScript allows
const ContentView = () => View({
  @State: { count: 0 },

  body: (state) =>
    VStack({ alignment: .center, spacing: 20 },
      Text('Hello, SwiftUI for Web!')
        .font(.title)
        .foregroundColor(.blue),

      HStack({ spacing: 10 },
        Button('−', () => state.count--),
        Text(String(state.count))
          .font(.largeTitle)
          .monospacedDigit(),
        Button('+', () => state.count++)
      ),

      Spacer()
    )
    .padding()
})

// Mount to DOM
App(ContentView).mount('#root')
```

## Development Guidelines

### Technology Constraints

**IMPORTANT: No-Required-Build, No-Install Policy**

- ✅ Pure JavaScript (ES6+)
- ✅ CSS3
- ✅ HTML5
- ❌ No npm packages in user apps
- ✅ Optional `scripts/build.js` release optimization using Node built-ins
- ❌ No third-party build tools (webpack, vite, etc.)
- ❌ No transpilers (Babel, TypeScript)
- ❌ No CSS preprocessors (Sass, Less)

**No vendored animation engine** — the SwiftUI animation API
(`withAnimation`, `animate`, `animateStyles`, `.animation`, `.transition`,
`matchedGeometryEffect`) is backed by native browser primitives only.

**Rules around animation:**

- Do not add runtime dependencies, package animation engines, or vendored
  third-party JavaScript.
- Product and sample code should express motion through SwiftUI-shaped APIs:
  `Animation`, `withAnimation`, `animate`, and `animateStyles`.
- Keep raw Web Animations API, CSS transition, and View Transitions details
  inside the framework implementation.

### SwiftUI API Parity Guidelines

When implementing components, **always reference the actual SwiftUI API**:

1. **Check SwiftUI documentation** for exact method signatures
2. **Check OpenSwiftUI source** for implementation patterns
3. **Match parameter names** exactly (e.g., `alignment`, `spacing`, not `align`, `gap`)
4. **Match modifier names** exactly (e.g., `.foregroundColor()` not `.color()`)
5. **Match type names** (e.g., `Color.blue` not `'blue'` where possible)

### Naming Conventions (Match SwiftUI)

| SwiftUI | JavaScript Equivalent |
|---------|----------------------|
| `struct ContentView: View` | `class ContentView extends View` |
| `@State var count = 0` | `@State count = 0` (via decorator or state object) |
| `@Binding var isOn: Bool` | `@Binding isOn` |
| `@ObservableObject` | `class extends ObservableObject` |
| `@Published var name` | `@Published name` |
| `.foregroundColor(.blue)` | `.foregroundColor(Color.blue)` |
| `VStack(alignment: .center)` | `VStack({ alignment: Alignment.center })` |

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Views | PascalCase | `Text.js`, `Button.js`, `VStack.js` |
| Modifiers | PascalCase | `ViewModifier.js`, `LayoutModifiers.js` |
| State | PascalCase | `State.js`, `Binding.js`, `Observable.js` |
| Utilities | camelCase | `utils.js`, `helpers.js` |
| Directories | PascalCase | `View/`, `Layout/`, `Data/` |

### Code Patterns

#### View Protocol Implementation

```javascript
// src/Core/View.js
export class View {
  constructor() {
    this._modifiers = [];
  }

  // Override in subclasses
  body() {
    throw new Error('View subclass must implement body()');
  }

  // Modifier chain support
  modifier(mod) {
    this._modifiers.push(mod);
    return this;
  }

  // Render to DOM
  _render() {
    const content = this.body();
    return this._applyModifiers(content._render());
  }

  _applyModifiers(element) {
    for (const mod of this._modifiers) {
      mod.apply(element);
    }
    return element;
  }
}
```

#### Text View (Match SwiftUI Text)

```javascript
// src/View/Text.js
import { View } from '../Core/View.js';

export class Text extends View {
  constructor(content) {
    super();
    this._content = content;
  }

  body() {
    return this; // Text is a leaf view
  }

  // SwiftUI Text modifiers
  font(font) {
    return this.modifier(new FontModifier(font));
  }

  fontWeight(weight) {
    return this.modifier(new FontWeightModifier(weight));
  }

  foregroundColor(color) {
    return this.modifier(new ForegroundColorModifier(color));
  }

  bold() {
    return this.fontWeight(Font.Weight.bold);
  }

  italic() {
    return this.modifier(new ItalicModifier());
  }

  _render() {
    const span = document.createElement('span');
    span.textContent = String(this._content);
    return this._applyModifiers(span);
  }
}

// Factory function for cleaner syntax
export function Text(content) {
  return new Text(content);
}
```

#### State Management (Match SwiftUI @State)

```javascript
// src/Data/State.js
export class State {
  constructor(initialValue) {
    this._value = initialValue;
    this._subscribers = new Set();
  }

  get wrappedValue() {
    return this._value;
  }

  set wrappedValue(newValue) {
    if (this._value !== newValue) {
      this._value = newValue;
      this._notifySubscribers();
    }
  }

  // Projected value for binding
  get projectedValue() {
    return new Binding(
      () => this._value,
      (newValue) => { this.wrappedValue = newValue; }
    );
  }

  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  _notifySubscribers() {
    this._subscribers.forEach(cb => cb(this._value));
  }
}
```

#### VStack (Match SwiftUI VStack)

```javascript
// src/Layout/Stack/VStack.js
import { View } from '../../Core/View.js';
import { Alignment } from '../Alignment.js';

export class VStack extends View {
  constructor(options = {}, ...children) {
    super();
    // Handle SwiftUI-style parameters
    if (typeof options === 'function' || options instanceof View) {
      children = [options, ...children];
      options = {};
    }

    this.alignment = options.alignment ?? Alignment.center;
    this.spacing = options.spacing ?? 8;
    this.children = children.flat();
  }

  body() {
    return this;
  }

  _render() {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = this._alignmentToCSS(this.alignment);
    div.style.gap = `${this.spacing}px`;

    for (const child of this.children) {
      if (child instanceof View) {
        div.appendChild(child._render());
      }
    }

    return this._applyModifiers(div);
  }

  _alignmentToCSS(alignment) {
    switch (alignment) {
      case Alignment.leading: return 'flex-start';
      case Alignment.trailing: return 'flex-end';
      case Alignment.center:
      default: return 'center';
    }
  }
}

// Factory function
export function VStack(options, ...children) {
  return new VStack(options, ...children);
}
```

### SwiftUI Components Priority List

Implement in this order (based on OpenSwiftUI structure and usage frequency):

#### Phase 1: Core Foundation
1. `View` - Base view protocol
2. `Text` - Text display
3. `VStack`, `HStack`, `ZStack` - Basic layout
4. `Spacer` - Flexible space
5. `State`, `Binding` - Basic state management
6. `Color` - Color type
7. Basic modifiers: `padding`, `frame`, `foregroundColor`, `background`

#### Phase 2: Controls
1. `Button` - Tap interaction
2. `Image` - Image display
3. `TextField` - Text input
4. `Toggle` - Boolean switch
5. `Slider` - Range input
6. `Picker` - Selection

#### Phase 3: Lists & Navigation
1. `List` - Scrollable list
2. `ForEach` - Collection iteration
3. `ScrollView` - Scrollable container
4. `NavigationView` / `NavigationStack`
5. `NavigationLink`

#### Phase 4: Advanced Features
1. `ObservableObject`, `@Published`
2. `@EnvironmentObject`, `@Environment`
3. `Animation`, `withAnimation`
4. `Shape` primitives
5. `Gesture` handling

## Step-by-Step TDD Approach

Follow this test-driven development workflow for each component:

### Step 1: Write the Test First

```javascript
// Tests/View/TextTests.js
import { describe, it, expect } from '../TestUtils.js';
import { Text } from '../../src/View/Text.js';

describe('Text', () => {
  it('should render text content', () => {
    const view = Text('Hello, World!');
    const element = view._render();

    expect(element.tagName).toBe('SPAN');
    expect(element.textContent).toBe('Hello, World!');
  });

  it('should apply foregroundColor modifier', () => {
    const view = Text('Hello').foregroundColor(Color.blue);
    const element = view._render();

    expect(element.style.color).toBe('rgb(0, 122, 255)'); // iOS blue
  });

  it('should chain multiple modifiers', () => {
    const view = Text('Hello')
      .font(Font.title)
      .foregroundColor(Color.red)
      .bold();
    const element = view._render();

    expect(element.style.fontSize).toBe('28px');
    expect(element.style.fontWeight).toBe('bold');
  });
});
```

### Step 2: Implement Minimum Code to Pass

```javascript
// src/View/Text.js - Minimal implementation
export class Text {
  constructor(content) {
    this._content = content;
    this._modifiers = [];
  }

  _render() {
    const span = document.createElement('span');
    span.textContent = String(this._content);
    // Apply modifiers...
    return span;
  }
}
```

### Step 3: Refactor and Expand

Add more tests, then implement additional features.

### Step 4: Integration Test

```javascript
// Tests/Integration/BasicAppTests.js
describe('Basic App Integration', () => {
  it('should render a complete view hierarchy', () => {
    const view = VStack(
      Text('Title').font(Font.title),
      Text('Subtitle').foregroundColor(Color.gray)
    );

    const container = document.createElement('div');
    container.appendChild(view._render());

    expect(container.children.length).toBe(1);
    expect(container.querySelector('span').textContent).toBe('Title');
  });
});
```

### TDD Cycle Summary

```
┌─────────────────────────────────────────────────────┐
│  1. RED: Write failing test                         │
│     ↓                                               │
│  2. GREEN: Write minimum code to pass               │
│     ↓                                               │
│  3. REFACTOR: Clean up, optimize                    │
│     ↓                                               │
│  4. REPEAT: Next feature                            │
└─────────────────────────────────────────────────────┘
```

## MVP Examples

### Example 1: Hello World (Simplest)

```html
<!-- Examples/HelloWorld/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Hello World - SwiftUI for Web</title>
  <link rel="stylesheet" href="../../src/styles/index.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.js"></script>
</body>
</html>
```

```javascript
// Examples/HelloWorld/main.js
import { Text, VStack } from '../../src/index.js';
import { App } from '../../src/App/App.js';
import { Color, Font } from '../../src/Graphic/index.js';

// Define the view
const ContentView = () =>
  VStack({ spacing: 10 },
    Text('Hello, SwiftUI for Web!')
      .font(Font.largeTitle)
      .foregroundColor(Color.blue),

    Text('Built with pure JavaScript')
      .font(Font.subheadline)
      .foregroundColor(Color.gray)
  )
  .padding(20);

// Mount the app
App(ContentView).mount('#root');
```

**Expected Output:**
```
┌─────────────────────────────────┐
│                                 │
│    Hello, SwiftUI for Web!     │
│   Built with pure JavaScript   │
│                                 │
└─────────────────────────────────┘
```

### Example 2: Counter (State Management)

```javascript
// Examples/Counter/main.js
import { Text, VStack, HStack, Button, Spacer } from '../../src/index.js';
import { State } from '../../src/Data/State.js';
import { App } from '../../src/App/App.js';
import { Color, Font } from '../../src/Graphic/index.js';

// ViewModel
class CounterViewModel {
  constructor() {
    this.count = new State(0);
  }

  increment() {
    this.count.wrappedValue += 1;
  }

  decrement() {
    this.count.wrappedValue -= 1;
  }
}

// View
const CounterView = (viewModel) => {
  const vm = viewModel || new CounterViewModel();

  return VStack({ spacing: 20 },
    Text('Counter')
      .font(Font.title)
      .foregroundColor(Color.primary),

    Text(String(vm.count.wrappedValue))
      .font(Font.system(60, Font.Weight.bold))
      .foregroundColor(Color.blue),

    HStack({ spacing: 20 },
      Button('−', () => vm.decrement())
        .font(Font.title)
        .padding({ horizontal: 20, vertical: 10 })
        .background(Color.red)
        .foregroundColor(Color.white)
        .cornerRadius(8),

      Button('+', () => vm.increment())
        .font(Font.title)
        .padding({ horizontal: 20, vertical: 10 })
        .background(Color.green)
        .foregroundColor(Color.white)
        .cornerRadius(8)
    ),

    Spacer()
  )
  .padding(40);
};

// Mount
App(CounterView).mount('#root');
```

**Expected Output:**
```
┌─────────────────────────────────┐
│           Counter               │
│                                 │
│              0                  │
│                                 │
│      [ − ]      [ + ]          │
│                                 │
└─────────────────────────────────┘
```

### Example 3: Todo List (MVVM Complete)

```javascript
// Examples/TodoApp/main.js
import {
  Text, VStack, HStack, Button, TextField, List, ForEach, Spacer, Toggle
} from '../../src/index.js';
import { State, ObservableObject, Published } from '../../src/Data/index.js';
import { App } from '../../src/App/App.js';
import { Color, Font } from '../../src/Graphic/index.js';

// Model
class TodoItem {
  constructor(id, title, isCompleted = false) {
    this.id = id;
    this.title = title;
    this.isCompleted = isCompleted;
  }
}

// ViewModel
class TodoViewModel extends ObservableObject {
  @Published todos = [];
  @Published newTodoText = '';

  addTodo() {
    if (this.newTodoText.trim()) {
      const todo = new TodoItem(
        Date.now(),
        this.newTodoText,
        false
      );
      this.todos = [...this.todos, todo];
      this.newTodoText = '';
    }
  }

  toggleTodo(id) {
    this.todos = this.todos.map(todo =>
      todo.id === id
        ? new TodoItem(todo.id, todo.title, !todo.isCompleted)
        : todo
    );
  }

  deleteTodo(id) {
    this.todos = this.todos.filter(todo => todo.id !== id);
  }
}

// View
const TodoView = () => {
  const vm = new TodoViewModel();

  return VStack({ alignment: 'leading', spacing: 16 },
    // Header
    Text('My Todos')
      .font(Font.largeTitle)
      .foregroundColor(Color.primary),

    // Input Row
    HStack({ spacing: 12 },
      TextField('Add a new todo...', vm.$newTodoText)
        .padding(12)
        .background(Color.secondarySystemBackground)
        .cornerRadius(8),

      Button('Add', () => vm.addTodo())
        .padding({ horizontal: 16, vertical: 12 })
        .background(Color.blue)
        .foregroundColor(Color.white)
        .cornerRadius(8)
    ),

    // Todo List
    List(
      ForEach(vm.todos, (todo) =>
        HStack({ spacing: 12 },
          Toggle(vm.binding(todo, 'isCompleted'))
            .onTapGesture(() => vm.toggleTodo(todo.id)),

          Text(todo.title)
            .strikethrough(todo.isCompleted)
            .foregroundColor(todo.isCompleted ? Color.gray : Color.primary),

          Spacer(),

          Button('Delete', () => vm.deleteTodo(todo.id))
            .foregroundColor(Color.red)
        )
        .padding(12)
        .background(Color.secondarySystemBackground)
        .cornerRadius(8)
      )
    ),

    Spacer()
  )
  .padding(20);
};

// Mount
App(TodoView).mount('#root');
```

**Expected Output:**
```
┌─────────────────────────────────────────┐
│  My Todos                               │
│                                         │
│  ┌─────────────────────────┐ ┌─────┐   │
│  │ Add a new todo...       │ │ Add │   │
│  └─────────────────────────┘ └─────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ☐  Buy groceries       [Delete] │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ ☑  ̶W̶a̶l̶k̶ ̶t̶h̶e̶ ̶d̶o̶g̶       [Delete] │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Example 4: Component Showcase

```javascript
// Examples/ComponentShowcase/main.js
import {
  Text, VStack, HStack, Button, TextField, Toggle,
  Slider, Spacer, Divider, Image
} from '../../src/index.js';
import { State } from '../../src/Data/State.js';
import { App } from '../../src/App/App.js';
import { Color, Font } from '../../src/Graphic/index.js';

const ComponentShowcase = () => {
  const toggleState = new State(true);
  const sliderValue = new State(50);
  const textInput = new State('');

  return VStack({ alignment: 'leading', spacing: 24 },
    // Title
    Text('Component Showcase')
      .font(Font.largeTitle)
      .foregroundColor(Color.primary),

    Divider(),

    // Text Styles
    VStack({ alignment: 'leading', spacing: 8 },
      Text('Text Styles').font(Font.headline),
      Text('Large Title').font(Font.largeTitle),
      Text('Title').font(Font.title),
      Text('Headline').font(Font.headline),
      Text('Body').font(Font.body),
      Text('Caption').font(Font.caption).foregroundColor(Color.gray)
    ),

    Divider(),

    // Buttons
    VStack({ alignment: 'leading', spacing: 8 },
      Text('Buttons').font(Font.headline),
      HStack({ spacing: 12 },
        Button('Primary', () => alert('Primary'))
          .padding({ horizontal: 16, vertical: 8 })
          .background(Color.blue)
          .foregroundColor(Color.white)
          .cornerRadius(8),

        Button('Secondary', () => alert('Secondary'))
          .padding({ horizontal: 16, vertical: 8 })
          .background(Color.gray.opacity(0.2))
          .cornerRadius(8),

        Button('Destructive', () => alert('Delete'))
          .foregroundColor(Color.red)
      )
    ),

    Divider(),

    // Controls
    VStack({ alignment: 'leading', spacing: 12 },
      Text('Controls').font(Font.headline),

      HStack({ spacing: 12 },
        Text('Toggle'),
        Spacer(),
        Toggle(toggleState.$projectedValue)
      ),

      HStack({ spacing: 12 },
        Text('Slider'),
        Slider(sliderValue.$projectedValue, { min: 0, max: 100 }),
        Text(String(sliderValue.wrappedValue))
      ),

      TextField('Enter text...', textInput.$projectedValue)
        .padding(12)
        .background(Color.secondarySystemBackground)
        .cornerRadius(8)
    ),

    Spacer()
  )
  .padding(24);
};

App(ComponentShowcase).mount('#root');
```

## Implementation Roadmap

This roadmap breaks down the project into small, incremental tasks. Each task is designed to be completed independently with tests.

### Sprint 0: Project Setup (Foundation)

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 0.1 | Create directory structure | `src/`, `Tests/`, `Examples/` folders | Folders exist |
| 0.2 | Create test utilities | `Tests/TestUtils.js` with describe/it/expect | Tests run in browser |
| 0.3 | Create base CSS | `src/styles/reset.css`, `base.css` | Styles load |
| 0.4 | Create index.html | Demo page with module loading | Page loads |
| 0.5 | Create main entry point | `src/index.js` with exports | Module imports work |

**Goal**: Project skeleton that can load ES modules in browser.

---

### Sprint 1: Core View System

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 1.1 | Create View base class | `src/Core/View.js` | View can be instantiated |
| 1.2 | Add _render() method | Base render to DOM | Returns HTMLElement |
| 1.3 | Add modifier support | `_modifiers` array, `modifier()` method | Modifiers chain |
| 1.4 | Add _applyModifiers() | Apply all modifiers to element | Styles applied |
| 1.5 | Export from index | `src/Core/index.js` | Import works |

**Goal**: Base View class that supports modifier chaining.

```javascript
// After Sprint 1, this should work:
const view = new View();
view.modifier(someMod);
```

---

### Sprint 2: Text Component

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 2.1 | Create Text class | `src/View/Text.js` extends View | Text instantiates |
| 2.2 | Implement _render() | Create `<span>` with content | Renders span |
| 2.3 | Add factory function | `Text('hello')` syntax | Factory works |
| 2.4 | Write Text tests | `Tests/View/TextTests.js` | All tests pass |
| 2.5 | Export from index | Add to `src/index.js` | Import works |

**Goal**: Render text to DOM.

```javascript
// After Sprint 2:
Text('Hello, World!')._render() // → <span>Hello, World!</span>
```

---

### Sprint 3: Color & Font Types

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 3.1 | Create Color class | `src/Graphic/Color.js` | Color.blue exists |
| 3.2 | Add system colors | blue, red, green, gray, primary, etc. | All colors defined |
| 3.3 | Add rgba() method | Convert to CSS color string | Returns valid CSS |
| 3.4 | Create Font class | `src/Graphic/Font.js` | Font.title exists |
| 3.5 | Add font presets | largeTitle, title, headline, body, caption | All fonts defined |
| 3.6 | Add Font.system() | Custom size/weight | Returns Font object |
| 3.7 | Write tests | `Tests/Graphic/` | All tests pass |
| 3.8 | Export from index | `src/Graphic/index.js` | Imports work |

**Goal**: Type-safe color and font definitions matching SwiftUI.

```javascript
// After Sprint 3:
Color.blue.rgba()     // → 'rgba(0, 122, 255, 1)'
Font.title.css()      // → { fontSize: '28px', fontWeight: '400' }
```

---

### Sprint 4: Basic Modifiers

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 4.1 | Create ViewModifier base | `src/Modifier/ViewModifier.js` | Base class exists |
| 4.2 | Implement .padding() | `PaddingModifier` | Adds CSS padding |
| 4.3 | Implement .foregroundColor() | `ForegroundColorModifier` | Sets color |
| 4.4 | Implement .background() | `BackgroundModifier` | Sets background |
| 4.5 | Implement .font() | `FontModifier` | Sets font styles |
| 4.6 | Implement .frame() | `FrameModifier` | Sets width/height |
| 4.7 | Add modifiers to View | Mixin or inheritance | View has .padding() etc |
| 4.8 | Write modifier tests | `Tests/Modifier/` | All tests pass |

**Goal**: Chainable modifiers on Text.

```javascript
// After Sprint 4:
Text('Hello')
  .font(Font.title)
  .foregroundColor(Color.blue)
  .padding(20)
  ._render() // → styled <span>
```

---

### Sprint 5: VStack & HStack

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 5.1 | Create Alignment enum | `src/Layout/Alignment.js` | Alignment.center exists |
| 5.2 | Create VStack class | `src/Layout/Stack/VStack.js` | VStack instantiates |
| 5.3 | Add alignment param | `VStack({ alignment: ... })` | Aligns children |
| 5.4 | Add spacing param | `VStack({ spacing: 10 })` | Adds gap |
| 5.5 | Implement _render() | Flexbox column with children | Renders div |
| 5.6 | Create HStack class | `src/Layout/Stack/HStack.js` | Same as VStack |
| 5.7 | Add factory functions | `VStack()`, `HStack()` | Factory works |
| 5.8 | Write Stack tests | `Tests/Layout/StackTests.js` | All tests pass |

**Goal**: Layout containers for arranging views.

```javascript
// After Sprint 5:
VStack({ spacing: 10 },
  Text('Line 1'),
  Text('Line 2')
)._render() // → flexbox column div
```

---

### Sprint 6: Spacer & App Mount

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 6.1 | Create Spacer class | `src/Layout/Spacer.js` | Spacer instantiates |
| 6.2 | Implement _render() | flex-grow: 1 div | Renders spacer |
| 6.3 | Create App class | `src/App/App.js` | App instantiates |
| 6.4 | Implement mount() | Render to DOM selector | Mounts to #root |
| 6.5 | Write tests | `Tests/App/AppTests.js` | All tests pass |

**Goal**: Complete Hello World example.

```javascript
// After Sprint 6 - Hello World works!
App(() =>
  VStack({ spacing: 10 },
    Text('Hello, SwiftUI for Web!')
      .font(Font.largeTitle)
      .foregroundColor(Color.blue),
    Spacer()
  )
).mount('#root');
```

---

### Sprint 7: State Management

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 7.1 | Create State class | `src/Data/State.js` | State instantiates |
| 7.2 | Add wrappedValue | Getter/setter | Get/set value |
| 7.3 | Add subscribers | subscribe() method | Callbacks fire |
| 7.4 | Add projectedValue | Returns Binding | $state works |
| 7.5 | Create Binding class | `src/Data/Binding.js` | Two-way binding |
| 7.6 | Implement re-render | State change triggers update | UI updates |
| 7.7 | Write State tests | `Tests/Data/StateTests.js` | All tests pass |

**Goal**: Reactive state that updates UI.

```javascript
// After Sprint 7:
const count = new State(0);
count.wrappedValue = 1; // UI re-renders
```

---

### Sprint 8: Button Component

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 8.1 | Create Button class | `src/View/Control/Button.js` | Button instantiates |
| 8.2 | Add label and action | `Button('Click', () => {})` | Stores action |
| 8.3 | Implement _render() | `<button>` with click handler | Renders button |
| 8.4 | Add button modifiers | .buttonStyle(), etc. | Styles work |
| 8.5 | Write Button tests | `Tests/View/Control/ButtonTests.js` | All tests pass |

**Goal**: Counter example works.

```javascript
// After Sprint 8 - Counter works!
const count = new State(0);
VStack(
  Text(String(count.wrappedValue)),
  Button('+', () => count.wrappedValue++)
)
```

---

### Sprint 9: More Modifiers

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 9.1 | Implement .cornerRadius() | Border radius | Rounds corners |
| 9.2 | Implement .opacity() | CSS opacity | Sets opacity |
| 9.3 | Implement .border() | CSS border | Adds border |
| 9.4 | Implement .shadow() | Box shadow | Adds shadow |
| 9.5 | Implement .onTapGesture() | Click handler | Fires callback |
| 9.6 | Write tests | Modifier tests | All pass |

**Goal**: Rich styling options.

---

### Sprint 10: ForEach & List Basics

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 10.1 | Create ForEach class | `src/View/List/ForEach.js` | ForEach instantiates |
| 10.2 | Implement iteration | Map array to views | Renders children |
| 10.3 | Add id parameter | `ForEach(items, { id: 'id' })` | Tracks identity |
| 10.4 | Create List class | `src/View/List/List.js` | Scrollable list |
| 10.5 | Write tests | `Tests/View/List/` | All pass |

**Goal**: Render dynamic lists.

```javascript
// After Sprint 10:
ForEach(['A', 'B', 'C'], item => Text(item))
```

---

### Sprint 11: TextField

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 11.1 | Create TextField class | `src/View/Control/TextField.js` | TextField instantiates |
| 11.2 | Add placeholder | First parameter | Shows placeholder |
| 11.3 | Add text binding | `TextField('...', $text)` | Two-way binding |
| 11.4 | Implement _render() | `<input type="text">` | Renders input |
| 11.5 | Write tests | `Tests/View/Control/TextFieldTests.js` | All pass |

**Goal**: Text input with binding.

---

### Sprint 12: Toggle

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 12.1 | Create Toggle class | `src/View/Control/Toggle.js` | Toggle instantiates |
| 12.2 | Add isOn binding | `Toggle($isOn)` | Two-way binding |
| 12.3 | Implement _render() | Checkbox or switch | Renders toggle |
| 12.4 | Write tests | `Tests/View/Control/ToggleTests.js` | All pass |

**Goal**: Boolean toggle with binding.

---

### Sprint 13: Complete Todo Example

| Task | Description | Deliverable | Test |
|------|-------------|-------------|------|
| 13.1 | Create ObservableObject | `src/Data/ObservableObject.js` | Base class |
| 13.2 | Create @Published | Property decorator pattern | Auto-notify |
| 13.3 | Build TodoApp example | `Examples/TodoApp/` | Example runs |
| 13.4 | Test MVVM pattern | Integration test | All works |

**Goal**: Full MVVM Todo app working.

---

### Future Sprints (P1-P3 Features)

| Sprint | Features |
|--------|----------|
| 14 | ZStack, Image, Divider |
| 15 | ScrollView, Group |
| 16 | NavigationStack, NavigationLink |
| 17 | Shapes (Rectangle, Circle, Capsule) |
| 18 | Animation basics (withAnimation) |
| 19 | @Environment, @EnvironmentObject |
| 20 | Slider, Stepper, Picker |
| 21 | Gestures (tap, long press, drag) |

---

### Progress Tracking

Update this section as sprints are completed:

| Sprint | Status | Description |
|--------|--------|-------------|
| Sprint 0 | 🟢 Complete | Project setup, directory structure |
| Sprint 1 | 🟢 Complete | Core View system |
| Sprint 2 | 🟢 Complete | Text component |
| Sprint 3 | 🟢 Complete | Color & Font types |
| Sprint 4 | 🟢 Complete | Basic modifiers (built into View) |
| Sprint 5 | 🟢 Complete | VStack & HStack |
| Sprint 6 | 🟢 Complete | Spacer & App mount |
| Sprint 7 | 🟢 Complete | State & Binding |
| Sprint 8 | 🟢 Complete | Button component |
| Sprint 9 | 🟢 Complete | More modifiers |
| Sprint 10 | 🟢 Complete | ForEach |
| Sprint 11 | 🟢 Complete | TextField & SecureField |
| Sprint 12 | 🟢 Complete | Toggle |
| Sprint 13 | 🟢 Complete | ObservableObject & TodoApp |

**Legend:** 🟢 Complete | 🟡 In Progress | 🔴 Not Started

---

### Milestone Checkpoints

| Milestone | Sprints | Status | Deliverable |
|-----------|---------|--------|-------------|
| **M1: Hello World** | 0-6 | 🟢 Complete | Static text rendering with layout |
| **M2: Counter App** | 7-8 | 🟢 Complete | Interactive state management |
| **M3: Styled App** | 9 | 🟢 Complete | Rich visual styling |
| **M4: Todo App** | 10-13 | 🟢 Complete | Full MVVM application |

## Development Workflow

### Getting Started

No build step is required for development:

```bash
# Clone the repository
git clone <repo-url>
cd SwiftUI-For-Web

# Open in browser (use HTTP server for ES modules)
python -m http.server 8000
# Then visit http://localhost:8000
```

### Making Changes

1. **Reference SwiftUI docs** - Check Apple's documentation for API design
2. **Reference OpenSwiftUI** - Check implementation patterns at [OpenSwiftUI GitHub](https://github.com/OpenSwiftUIProject/OpenSwiftUI)
3. **Create feature branch** from `main`
4. **Implement** following zero-dependency constraint
5. **Test locally and in browser** (`node run-tests.js` and
   `node scripts/build-tests.js`; no release build required)
6. **Add example** demonstrating the feature
7. **Submit pull request**

### Commit Message Format

```
feat(View): add Text component with font modifiers
feat(Layout): implement VStack with alignment and spacing
feat(Data): add State and Binding for reactive updates
fix(Modifier): correct padding calculation for nested views
docs: update component API documentation
test(View): add unit tests for Text rendering
refactor(Core): simplify modifier chain implementation
```

## Testing

Browser-based tests (no build tools):

```html
<!-- Tests/TestRunner.html -->
<!DOCTYPE html>
<html>
<head>
  <title>SwiftUI-For-Web Tests</title>
</head>
<body>
  <div id="test-output"></div>
  <script type="module" src="./TestUtils.js"></script>
  <script type="module" src="./Core/ViewTests.js"></script>
  <script type="module" src="./View/TextTests.js"></script>
</body>
</html>
```

```javascript
// Tests/TestUtils.js
export function describe(name, fn) {
  console.group(name);
  fn();
  console.groupEnd();
}

export function it(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}:`, e.message);
  }
}

export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    }
  };
}
```

## Important Notes for AI Assistants

### When Working on This Project

1. **Zero dependencies**: Never suggest adding npm packages or build tools
2. **SwiftUI parity**: Always reference SwiftUI docs and OpenSwiftUI for API design
3. **Check existing code**: Read files before making changes
4. **Match SwiftUI naming**: Use exact SwiftUI method and parameter names
5. **Keep it simple**: Vanilla JS can do more than you think

### Reference Checklist

Before implementing any component:

- [ ] Check [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui/)
- [ ] Check [OpenSwiftUI Source](https://github.com/OpenSwiftUIProject/OpenSwiftUI)
- [ ] Match parameter names exactly
- [ ] Match modifier method names exactly
- [ ] Follow the established directory structure

### Common Tasks

| Task | Approach |
|------|----------|
| Add View component | Create in `src/View/`, check SwiftUI API, export from index.js |
| Add Layout component | Create in `src/Layout/`, match SwiftUI parameters |
| Add modifier | Add to appropriate file in `src/Modifier/`, return `this` for chaining |
| Add state feature | Implement in `src/Data/`, follow SwiftUI property wrapper patterns |
| Add example | Create folder in `Examples/` with index.html + main.js |

### What to Avoid

- ❌ Adding any npm dependencies
- ❌ Using TypeScript or other transpiled languages
- ❌ Adding required or third-party build steps or configuration files
- ❌ Deviating from SwiftUI API without good reason
- ❌ Inventing new modifier names (use SwiftUI's names)
- ❌ Over-engineering - match SwiftUI's simplicity

### Browser Support Target

Modern browsers with ES6 module support:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

## Resources

### Primary References
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui/) - Official API reference
- [OpenSwiftUI GitHub](https://github.com/OpenSwiftUIProject/OpenSwiftUI) - Open source implementation reference
- [SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui) - Official tutorials

### Web Development
- [MDN Web Docs](https://developer.mozilla.org/)
- [CSS Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)

---

*This CLAUDE.md will be updated as the project evolves and patterns are established.*
