# SwiftUI-For-Web

**Inspired by Apple's SwiftUI. Making web development simpler, more fun, and performant.**

A zero-dependency UI framework that brings SwiftUI's declarative paradigm to web development using pure JavaScript, CSS, and HTML.

> **Work in Progress** - This project is actively being developed. Contributions and support are welcome!

## Why SwiftUI-For-Web?

- **Zero Dependencies** - No npm packages, no build tools, no bundlers. Just vanilla JavaScript.
- **Declarative UI** - Describe what your UI should look like, not how to build it.
- **SwiftUI Familiarity** - If you know SwiftUI, you already know this framework.
- **Lightweight & Fast** - No virtual DOM overhead, direct DOM manipulation.
- **MVVM Architecture** - Clean separation of concerns with ObservableObject.

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="src/styles/index.css">
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import { App, VStack, Text, Button, State, Color, Font } from './src/index.js';

    const count = new State(0);

    App(() =>
      VStack({ spacing: 20 },
        Text('Counter')
          .font(Font.largeTitle),
        Text(String(count.value))
          .font(Font.system(60))
          .foregroundColor(Color.blue),
        Button('Increment', () => count.value++)
          .padding(16)
          .background(Color.blue)
          .foregroundColor('white')
          .cornerRadius(8)
      )
      .padding(40)
    ).mount('#root');

    count.subscribe(() => location.reload());
  </script>
</body>
</html>
```

## SwiftUI-For-Web vs React

Here's the same Counter app in both frameworks:

### SwiftUI-For-Web

```javascript
import { App, VStack, HStack, Text, Button, State, Color, Font } from './src/index.js';

// State
const count = new State(0);

// View
App(() =>
  VStack({ spacing: 20 },
    Text('Counter').font(Font.title),
    Text(String(count.value))
      .font(Font.system(48))
      .foregroundColor(Color.blue),
    HStack({ spacing: 16 },
      Button('-', () => count.value--)
        .padding({ horizontal: 20, vertical: 10 })
        .background(Color.red)
        .foregroundColor('white')
        .cornerRadius(8),
      Button('+', () => count.value++)
        .padding({ horizontal: 20, vertical: 10 })
        .background(Color.green)
        .foregroundColor('white')
        .cornerRadius(8)
    )
  ).padding(40)
).mount('#root');
```

### React (for comparison)

```jsx
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: 40 }}>
      <h1 style={{ fontSize: 28 }}>Counter</h1>
      <span style={{ fontSize: 48, color: 'rgb(0, 122, 255)' }}>{count}</span>
      <div style={{ display: 'flex', gap: 16 }}>
        <button
          onClick={() => setCount(count - 1)}
          style={{ padding: '10px 20px', background: 'rgb(255, 59, 48)', color: 'white', borderRadius: 8, border: 'none' }}
        >
          -
        </button>
        <button
          onClick={() => setCount(count + 1)}
          style={{ padding: '10px 20px', background: 'rgb(52, 199, 89)', color: 'white', borderRadius: 8, border: 'none' }}
        >
          +
        </button>
      </div>
    </div>
  );
}
```

**Key Differences:**
| Feature | SwiftUI-For-Web | React |
|---------|-----------------|-------|
| Dependencies | 0 | 40+ MB node_modules |
| Build Step | None | Required (webpack, vite, etc.) |
| Styling | Chainable modifiers | Inline styles or CSS-in-JS |
| State | `State` class | `useState` hook |
| Learning Curve | Familiar to iOS devs | Web-specific concepts |

## Components

### Layout

```javascript
// Vertical Stack
VStack({ alignment: 'center', spacing: 16 },
  Text('Item 1'),
  Text('Item 2'),
  Text('Item 3')
)

// Horizontal Stack
HStack({ spacing: 10 },
  Text('Left'),
  Spacer(),
  Text('Right')
)
```

### Controls

```javascript
// Button
Button('Click Me', () => console.log('Clicked!'))
  .buttonStyle('borderedProminent')

// TextField
const text = new State('');
TextField('Enter your name', text.binding)
  .textFieldStyle('roundedBorder')

// Toggle
const isOn = new State(false);
Toggle('Enable notifications', isOn.binding)

// SecureField (Password)
const password = new State('');
SecureField('Password', password.binding)
```

### Lists

```javascript
const items = ['Apple', 'Banana', 'Cherry'];

ForEach(items, (item, index) =>
  Text(`${index + 1}. ${item}`)
)

// With ID for complex objects
const todos = [
  { id: 1, title: 'Learn SwiftUI-For-Web' },
  { id: 2, title: 'Build something awesome' }
];

ForEach(todos, { id: 'id' }, (todo) =>
  Text(todo.title)
)
```

### Modifiers

```javascript
Text('Styled Text')
  .font(Font.title)
  .foregroundColor(Color.blue)
  .padding(20)
  .background(Color.yellow.opacity(0.3))
  .cornerRadius(12)
  .shadow({ radius: 4, x: 0, y: 2 })
```

## State Management

### Simple State

```javascript
import { State } from './src/index.js';

const count = new State(0);

// Read
console.log(count.value); // 0

// Write
count.value = 10;

// Subscribe to changes
count.subscribe((newValue) => {
  console.log('Count changed to:', newValue);
});
```

### ObservableObject (MVVM)

```javascript
import { ObservableObject } from './src/index.js';

class TodoViewModel extends ObservableObject {
  constructor() {
    super();
    this.published('todos', []);
    this.published('newTodoText', '');
  }

  addTodo() {
    if (this.newTodoText.trim()) {
      this.todos = [...this.todos, {
        id: Date.now(),
        title: this.newTodoText,
        completed: false
      }];
      this.newTodoText = '';
    }
  }

  toggleTodo(id) {
    this.todos = this.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
  }
}

const viewModel = new TodoViewModel();

// Use in view
TextField('New todo...', viewModel.binding('newTodoText'))
Button('Add', () => viewModel.addTodo())
```

## Examples

Check out the `/Examples` folder:

- **HelloWorld** - Basic text rendering
- **Counter** - State management with buttons
- **TodoApp** - Full MVVM application

```bash
# Run examples locally
python -m http.server 8000
# Then open http://localhost:8000/Examples/TodoApp/
```

## Running Tests

```bash
# Node.js tests
npm test

# Browser tests
# Open Tests/TestRunner.html in your browser
```

## Project Status

### Completed
- [x] Core View system with modifiers
- [x] Text, Button, TextField, Toggle
- [x] VStack, HStack, Spacer
- [x] State, Binding, ObservableObject
- [x] ForEach for dynamic lists
- [x] Color and Font systems
- [x] App mounting and refresh

### In Progress
- [ ] ZStack (layered views)
- [ ] List (scrollable)
- [ ] NavigationStack
- [ ] Animations
- [ ] More controls (Slider, Picker, etc.)

## Contributing

Contributions are welcome! This project is in active development and there's plenty to do:

1. **Report bugs** - Open an issue
2. **Suggest features** - Open an issue with your idea
3. **Submit PRs** - Pick an item from the roadmap or fix a bug
4. **Improve docs** - Help make the documentation better
5. **Share** - Star the repo and spread the word!

### Development Guidelines

- Zero dependencies - don't add npm packages
- Match SwiftUI API as closely as possible
- Write tests for new features
- Keep it simple and performant

## Support

If you find this project useful, consider:

- Starring the repository
- Sharing it with others
- Contributing code or documentation
- [Sponsoring the project](https://github.com/sponsors/ShawnBaek)

## License

ISC License

---

**Made with love for the SwiftUI and Web communities.**

*Bringing the joy of SwiftUI to the web, one component at a time.*
