# CLAUDE.md - AI Assistant Guide for SwiftUI-For-Web

This document provides guidance for AI assistants working on the SwiftUI-For-Web project.

## Project Overview

**SwiftUI-For-Web** is a zero-dependency UI framework that brings Apple's SwiftUI declarative paradigm to web development using pure JavaScript, CSS, and HTML.

### Vision

- Build a SwiftUI-like framework using **only vanilla JavaScript, CSS, and HTML**
- **No external dependencies** - the framework is entirely self-contained
- Implement **declarative UI** patterns matching SwiftUI's component model
- Follow **MVVM (Model-View-ViewModel)** architecture
- Provide familiar APIs for iOS/macOS developers transitioning to web

### Core Principles

1. **Zero Dependencies**: No npm packages, no build tools required
2. **Declarative**: Describe what the UI should look like, not how to build it
3. **MVVM Architecture**: Clear separation between Model, View, and ViewModel
4. **SwiftUI Parity**: Match SwiftUI component names and behaviors where possible

### Current State

This project is in its **early inception phase**. As of now:
- Project vision and architecture are being established
- No implementation code has been written yet

## Repository Structure

```
SwiftUI-For-Web/
├── README.md          # Project description
├── CLAUDE.md          # This file - AI assistant guidance
└── (implementation to come)
```

### Target Directory Structure

```
SwiftUI-For-Web/
├── src/
│   ├── core/
│   │   ├── View.js            # Base View class/protocol
│   │   ├── Component.js       # Component lifecycle management
│   │   ├── Renderer.js        # DOM rendering engine
│   │   └── index.js           # Core exports
│   ├── components/
│   │   ├── Text.js            # Text component
│   │   ├── Button.js          # Button component
│   │   ├── Image.js           # Image component
│   │   ├── VStack.js          # Vertical stack layout
│   │   ├── HStack.js          # Horizontal stack layout
│   │   ├── ZStack.js          # Z-axis stack layout
│   │   ├── List.js            # List component
│   │   ├── ForEach.js         # Collection iteration
│   │   ├── Spacer.js          # Flexible space
│   │   └── index.js           # Component exports
│   ├── modifiers/
│   │   ├── ViewModifier.js    # Base modifier class
│   │   ├── layout.js          # padding, frame, offset
│   │   ├── styling.js         # colors, fonts, backgrounds
│   │   ├── effects.js         # opacity, shadow, blur
│   │   └── index.js           # Modifier exports
│   ├── state/
│   │   ├── State.js           # @State equivalent
│   │   ├── Binding.js         # @Binding equivalent
│   │   ├── Observable.js      # @Observable equivalent
│   │   ├── Environment.js     # @Environment equivalent
│   │   └── index.js           # State exports
│   ├── mvvm/
│   │   ├── Model.js           # Base Model class
│   │   ├── ViewModel.js       # Base ViewModel class
│   │   └── index.js           # MVVM exports
│   ├── styles/
│   │   ├── base.css           # Reset and base styles
│   │   ├── components.css     # Component-specific styles
│   │   └── utilities.css      # Utility classes
│   └── index.js               # Main entry point
├── examples/
│   ├── hello-world/           # Basic example
│   ├── counter/               # State management example
│   ├── todo-app/              # Full MVVM example
│   └── components-demo/       # Component showcase
├── tests/
│   ├── core/
│   ├── components/
│   ├── state/
│   └── test-runner.html       # Browser-based test runner
├── docs/
│   ├── getting-started.md
│   ├── components.md
│   ├── state-management.md
│   └── mvvm-architecture.md
├── index.html                 # Demo/development page
├── README.md
└── CLAUDE.md
```

## Architecture

### MVVM Pattern

```
┌─────────────────────────────────────────────────┐
│                     View                         │
│  (Declarative UI components - VStack, Text, etc)│
│                       ▲                          │
│                       │ Binding                  │
│                       ▼                          │
│                  ViewModel                       │
│  (State management, business logic, @State)     │
│                       ▲                          │
│                       │                          │
│                       ▼                          │
│                    Model                         │
│  (Data structures, API calls, persistence)      │
└─────────────────────────────────────────────────┘
```

### Component Hierarchy

```javascript
// SwiftUI-style declarative component tree
App(
  VStack({ alignment: 'center', spacing: 20 },
    Text('Hello, SwiftUI for Web!')
      .font('title')
      .foregroundColor('blue'),

    HStack({ spacing: 10 },
      Button('Decrement', () => counter.decrement()),
      Text(counter.value),
      Button('Increment', () => counter.increment())
    ),

    Spacer()
  )
)
```

## Development Guidelines

### Technology Constraints

**IMPORTANT: Zero Dependencies Policy**

- ✅ Pure JavaScript (ES6+)
- ✅ CSS3
- ✅ HTML5
- ❌ No npm packages
- ❌ No build tools (webpack, vite, etc.)
- ❌ No transpilers (Babel, TypeScript)
- ❌ No CSS preprocessors (Sass, Less)

### File Loading

Since there's no build system, use ES6 modules:

```html
<script type="module" src="src/index.js"></script>
```

```javascript
// src/index.js
export { View } from './core/View.js';
export { Text, Button, VStack, HStack } from './components/index.js';
export { State, Binding } from './state/index.js';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Text`, `VStack`, `Button` |
| Modifiers | camelCase methods | `.padding()`, `.font()` |
| State | camelCase with prefix | `@State` → `state`, `@Binding` → `binding` |
| Files | PascalCase for components | `VStack.js`, `Button.js` |
| CSS classes | kebab-case | `.v-stack`, `.h-stack` |

### Code Patterns

#### Component Definition

```javascript
// src/components/Text.js
import { View } from '../core/View.js';

export class Text extends View {
  constructor(content) {
    super();
    this.content = content;
    this._modifiers = [];
  }

  // Modifier methods return `this` for chaining
  font(style) {
    this._modifiers.push({ type: 'font', value: style });
    return this;
  }

  foregroundColor(color) {
    this._modifiers.push({ type: 'color', value: color });
    return this;
  }

  // Render to DOM element
  render() {
    const el = document.createElement('span');
    el.textContent = this.content;
    this._applyModifiers(el);
    return el;
  }
}

// Factory function for cleaner syntax
export function Text(content) {
  return new TextComponent(content);
}
```

#### State Management

```javascript
// src/state/State.js
export class State {
  constructor(initialValue) {
    this._value = initialValue;
    this._subscribers = [];
  }

  get value() {
    return this._value;
  }

  set value(newValue) {
    this._value = newValue;
    this._notify();
  }

  subscribe(callback) {
    this._subscribers.push(callback);
    return () => {
      this._subscribers = this._subscribers.filter(cb => cb !== callback);
    };
  }

  _notify() {
    this._subscribers.forEach(cb => cb(this._value));
  }
}
```

#### ViewModel Pattern

```javascript
// Example ViewModel
class CounterViewModel {
  constructor() {
    this.count = new State(0);
  }

  increment() {
    this.count.value += 1;
  }

  decrement() {
    this.count.value -= 1;
  }
}
```

### SwiftUI Components to Implement

#### Layout Components

| SwiftUI | Web Implementation |
|---------|-------------------|
| `VStack` | Flexbox column |
| `HStack` | Flexbox row |
| `ZStack` | CSS position absolute/relative |
| `Spacer` | Flex-grow element |
| `ScrollView` | Overflow scroll container |
| `List` | Virtualized list |
| `ForEach` | Array iteration helper |

#### Basic Components

| SwiftUI | Web Implementation |
|---------|-------------------|
| `Text` | `<span>` or `<p>` |
| `Image` | `<img>` |
| `Button` | `<button>` |
| `TextField` | `<input type="text">` |
| `Toggle` | `<input type="checkbox">` |
| `Slider` | `<input type="range">` |
| `Picker` | `<select>` |

#### View Modifiers

```javascript
// Chainable modifier pattern
Text('Hello')
  .padding(16)                    // padding: 16px
  .padding({ horizontal: 20 })    // padding-left/right: 20px
  .frame({ width: 200 })          // width: 200px
  .background('lightgray')        // background-color: lightgray
  .cornerRadius(8)                // border-radius: 8px
  .foregroundColor('blue')        // color: blue
  .font('title')                  // predefined font style
  .opacity(0.8)                   // opacity: 0.8
  .shadow({ radius: 4 })          // box-shadow
```

## Development Workflow

### Getting Started

No build step required:

```bash
# Clone the repository
git clone <repo-url>
cd SwiftUI-For-Web

# Open in browser
open index.html
# Or use a simple HTTP server for ES modules
python -m http.server 8000
```

### Making Changes

1. Create feature branch from `main`
2. Implement changes following zero-dependency constraint
3. Test in browser (no build step needed)
4. Add example demonstrating the feature
5. Submit pull request

### Commit Message Format

```
feat: add VStack component with alignment support
fix: correct padding calculation in nested views
docs: update component API documentation
test: add tests for state management
refactor: simplify modifier chain implementation
```

## Testing

Since we have no build tools, tests run in the browser:

```html
<!-- tests/test-runner.html -->
<!DOCTYPE html>
<html>
<head>
  <title>SwiftUI-For-Web Tests</title>
</head>
<body>
  <div id="test-results"></div>
  <script type="module" src="./run-tests.js"></script>
</body>
</html>
```

```javascript
// Simple assertion library (no dependencies)
function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
  }
}
```

## Important Notes for AI Assistants

### When Working on This Project

1. **Zero dependencies**: Never suggest adding npm packages or build tools
2. **Check existing code**: Read files before making changes
3. **Maintain SwiftUI parity**: Reference SwiftUI docs for API design
4. **Browser compatibility**: Use ES6+ features supported in modern browsers
5. **Keep it simple**: Vanilla JS can do more than you think

### Common Tasks

| Task | Approach |
|------|----------|
| Add component | Create in `src/components/`, export from index.js |
| Add modifier | Extend View class, return `this` for chaining |
| Add state feature | Implement in `src/state/`, use observer pattern |
| Add example | Create folder in `examples/` with HTML + JS |

### What to Avoid

- ❌ Adding any npm dependencies
- ❌ Using TypeScript or other transpiled languages
- ❌ Adding build steps or configuration files
- ❌ Breaking SwiftUI API conventions without reason
- ❌ Over-engineering - keep implementations simple

### Browser Support Target

Modern browsers with ES6 module support:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 16+

## Resources

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui/)
- [SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui)
- [MDN Web Docs](https://developer.mozilla.org/)
- [CSS Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)

---

*This CLAUDE.md will be updated as the project evolves and patterns are established.*
