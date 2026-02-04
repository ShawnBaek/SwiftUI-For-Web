/**
 * Node.js Test Runner
 * Runs browser-based tests using jsdom
 */

// Simple jsdom-like implementation for testing
class MockDocument {
  constructor() {
    this.body = this.createElement('body');
    this.elements = new Map();
  }

  createElement(tag) {
    const element = new MockElement(tag);
    return element;
  }

  createDocumentFragment() {
    return new MockDocumentFragment();
  }

  querySelector(selector) {
    return this.elements.get(selector) || null;
  }
}

class MockDocumentFragment {
  constructor() {
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.target = options.target || null;
    this.preventDefault = () => {};
    this.stopPropagation = () => {};
  }
}

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.textContent = '';
    this.innerHTML = '';
    this.disabled = false;
    // Input-specific properties
    this.type = 'text';
    this.placeholder = '';
    this.value = '';
    this.autocapitalize = '';
    this.autocomplete = '';
    this._attributes = {};
    this.classList = {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    };
    this._eventListeners = {};
  }

  setAttribute(name, value) {
    this._attributes[name] = value;
  }

  getAttribute(name) {
    return this._attributes[name] || null;
  }

  appendChild(child) {
    // Handle DocumentFragment - append all children
    if (child instanceof MockDocumentFragment) {
      for (const fragmentChild of child.children) {
        this.children.push(fragmentChild);
      }
      return child;
    }
    this.children.push(child);
    return child;
  }

  addEventListener(event, handler) {
    this._eventListeners[event] = this._eventListeners[event] || [];
    this._eventListeners[event].push(handler);
  }

  click() {
    if (this._eventListeners.click) {
      this._eventListeners.click.forEach(h => h({ preventDefault: () => {} }));
    }
  }

  dispatchEvent(event) {
    event.target = this;
    if (this._eventListeners[event.type]) {
      this._eventListeners[event.type].forEach(h => h(event));
    }
  }

  querySelector(selector) {
    // Simple selector implementation
    for (const child of this.children) {
      if (selector.startsWith('[data-view="')) {
        const viewName = selector.match(/\[data-view="(.+?)"\]/)?.[1];
        if (child.dataset.view === viewName) return child;
      }
      const found = child.querySelector?.(selector);
      if (found) return found;
    }
    return null;
  }
}

// Set up global mocks
global.document = new MockDocument();
global.HTMLElement = MockElement;
global.HTMLButtonElement = MockElement;
global.HTMLDivElement = MockElement;
global.HTMLSpanElement = MockElement;
global.HTMLInputElement = MockElement;
global.Event = MockEvent;
global.console = console;

// Test tracking
let passed = 0;
let failed = 0;
let currentSuite = '';

function describe(name, fn) {
  currentSuite = name;
  console.log(`\n📦 ${name}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${actual}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${actual}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null, got ${actual}`);
    },
    toBeUndefined() {
      if (actual !== undefined) throw new Error(`Expected undefined, got ${actual}`);
    },
    toBeDefined() {
      if (actual === undefined) throw new Error(`Expected defined, got undefined`);
    },
    toBeInstanceOf(cls) {
      if (!(actual instanceof cls)) throw new Error(`Expected instance of ${cls.name}`);
    },
    toContain(item) {
      if (typeof actual === 'string') {
        if (!actual.includes(item)) throw new Error(`Expected "${actual}" to contain "${item}"`);
      } else if (Array.isArray(actual)) {
        if (!actual.includes(item)) throw new Error(`Expected array to contain ${item}`);
      }
    },
    toHaveLength(len) {
      if (actual.length !== len) throw new Error(`Expected length ${len}, got ${actual.length}`);
    },
    toBeGreaterThan(num) {
      if (actual <= num) throw new Error(`Expected ${actual} > ${num}`);
    },
    toBeLessThan(num) {
      if (actual >= num) throw new Error(`Expected ${actual} < ${num}`);
    },
    toThrow(msg) {
      try {
        actual();
        throw new Error('Expected function to throw');
      } catch (e) {
        if (msg && !e.message.includes(msg)) {
          throw new Error(`Expected error containing "${msg}", got "${e.message}"`);
        }
      }
    },
    not: {
      toBe(expected) {
        if (actual === expected) throw new Error(`Expected not ${expected}`);
      },
      toEqual(expected) {
        if (JSON.stringify(actual) === JSON.stringify(expected)) {
          throw new Error(`Expected not equal to ${JSON.stringify(expected)}`);
        }
      },
      toBeTruthy() {
        if (actual) throw new Error(`Expected not truthy`);
      },
      toContain(item) {
        if (typeof actual === 'string' && actual.includes(item)) {
          throw new Error(`Expected not to contain "${item}"`);
        }
      }
    }
  };
}

function beforeEach(fn) {
  // Store for later use - simplified implementation
  global._beforeEach = fn;
}

// Make test utilities global
global.describe = describe;
global.it = it;
global.expect = expect;
global.beforeEach = beforeEach;

// Run tests
async function runTests() {
  console.log('🧪 SwiftUI-For-Web Test Runner (Node.js)\n');
  console.log('=' .repeat(50));

  try {
    // Import and test core modules
    const { State } = await import('./src/Data/State.js');
    const { Binding } = await import('./src/Data/Binding.js');

    // Test State
    describe('State', () => {
      it('should initialize with a value', () => {
        const state = new State(42);
        expect(state.value).toBe(42);
      });

      it('should update value', () => {
        const state = new State(0);
        state.value = 10;
        expect(state.value).toBe(10);
      });

      it('should notify subscribers', () => {
        const state = new State(0);
        let received = null;
        state.subscribe(v => received = v);
        state.value = 5;
        expect(received).toBe(5);
      });

      it('should provide binding', () => {
        const state = new State(0);
        expect(state.binding).toBeInstanceOf(Binding);
      });

      it('should update via binding', () => {
        const state = new State(0);
        state.binding.value = 100;
        expect(state.value).toBe(100);
      });
    });

    // Test Binding
    describe('Binding', () => {
      it('should get/set value', () => {
        let val = 0;
        const binding = new Binding(() => val, v => val = v);
        expect(binding.value).toBe(0);
        binding.value = 5;
        expect(val).toBe(5);
      });

      it('should create constant binding', () => {
        const binding = Binding.constant(42);
        expect(binding.value).toBe(42);
        binding.value = 100;
        expect(binding.value).toBe(42);
      });

      it('should transform values', () => {
        const state = new State(5);
        const doubled = state.binding.transform(x => x * 2);
        expect(doubled.value).toBe(10);
      });
    });

    // Test Color
    const { Color, ColorValue } = await import('./src/Graphic/Color.js');
    describe('Color', () => {
      it('should have system colors', () => {
        expect(Color.blue).toBeInstanceOf(ColorValue);
        expect(Color.red).toBeInstanceOf(ColorValue);
      });

      it('should output rgba string', () => {
        expect(Color.blue.rgba()).toBe('rgba(0, 122, 255, 1)');
      });

      it('should support opacity', () => {
        const transparent = Color.blue.opacity(0.5);
        expect(transparent.rgba()).toBe('rgba(0, 122, 255, 0.5)');
      });

      it('should create from hex', () => {
        const color = Color.hex('#FF0000');
        expect(color.rgba()).toBe('rgba(255, 0, 0, 1)');
      });
    });

    // Test Font
    const { Font, FontValue } = await import('./src/Graphic/Font.js');
    describe('Font', () => {
      it('should have preset fonts', () => {
        expect(Font.title._size).toBe(28);
        expect(Font.body._size).toBe(17);
        expect(Font.largeTitle._size).toBe(34);
      });

      it('should create system font', () => {
        const font = Font.system(20, Font.Weight.bold);
        expect(font._size).toBe(20);
        expect(font._weight).toBe('700');
      });

      it('should support bold modifier', () => {
        const font = Font.body.bold();
        expect(font._weight).toBe('700');
      });
    });

    // Test View
    const { View } = await import('./src/Core/View.js');
    describe('View', () => {
      it('should initialize with empty modifiers', () => {
        const view = new View();
        expect(view._modifiers).toEqual([]);
      });

      it('should chain modifiers', () => {
        const view = new View();
        view.modifier({ apply: () => {} });
        view.modifier({ apply: () => {} });
        expect(view._modifiers).toHaveLength(2);
      });

      it('should render to element', () => {
        const view = new View();
        const el = view._render();
        expect(el.tagName).toBe('DIV');
      });
    });

    // Test ForEach
    const { ForEach, ForEachView, Range } = await import('./src/View/List/ForEach.js');
    const { Text } = await import('./src/View/Text.js');
    describe('ForEach', () => {
      it('should create a ForEachView instance', () => {
        const forEach = ForEach(['a', 'b'], item => Text(item));
        expect(forEach).toBeInstanceOf(ForEachView);
      });

      it('should iterate over array', () => {
        const items = ['Apple', 'Banana', 'Cherry'];
        const forEach = ForEach(items, item => Text(item));
        expect(forEach.children).toHaveLength(3);
      });

      it('should handle empty array', () => {
        const forEach = ForEach([], item => Text(item));
        expect(forEach.children).toHaveLength(0);
      });

      it('should use id property for identity', () => {
        const items = [{ id: 'a', name: 'Apple' }, { id: 'b', name: 'Banana' }];
        const forEach = ForEach(items, { id: 'id' }, item => Text(item.name));
        const children = forEach.children;
        expect(children[0]._forEachKey).toBe('a');
        expect(children[1]._forEachKey).toBe('b');
      });

      it('should support Range object', () => {
        const range = new Range(0, 5);
        const forEach = ForEach(range, i => Text(String(i)));
        expect(forEach.children).toHaveLength(5);
      });

      it('should render container with data-view', () => {
        const forEach = ForEach(['a', 'b'], item => Text(item));
        const element = forEach._render();
        expect(element.tagName).toBe('DIV');
        expect(element.dataset.view).toBe('ForEach');
      });

      it('should render children elements', () => {
        const forEach = ForEach(['a', 'b', 'c'], item => Text(item));
        const element = forEach._render();
        expect(element.children.length).toBe(3);
      });
    });

    // Test TextField
    const { TextField, TextFieldView, SecureField, SecureFieldView } = await import('./src/View/Control/TextField.js');
    describe('TextField', () => {
      it('should create a TextFieldView instance', () => {
        const field = TextField('Placeholder');
        expect(field).toBeInstanceOf(TextFieldView);
      });

      it('should set placeholder', () => {
        const field = TextField('Enter name');
        expect(field._placeholder).toBe('Enter name');
      });

      it('should render an input element', () => {
        const field = TextField('Placeholder');
        const element = field._render();
        expect(element.tagName).toBe('INPUT');
      });

      it('should set data-view to TextField', () => {
        const field = TextField('Placeholder');
        const element = field._render();
        expect(element.dataset.view).toBe('TextField');
      });

      it('should set placeholder attribute', () => {
        const field = TextField('Enter name');
        const element = field._render();
        expect(element.placeholder).toBe('Enter name');
      });

      it('should update binding when input changes', () => {
        const state = new State('');
        const field = TextField('Placeholder', state.binding);
        const element = field._render();

        element.value = 'New Value';
        element.dispatchEvent(new Event('input'));

        expect(state.value).toBe('New Value');
      });

      it('should disable the input', () => {
        const field = TextField('Placeholder').disabled();
        const element = field._render();
        expect(element.disabled).toBe(true);
      });

      it('should apply roundedBorder style', () => {
        const field = TextField('Placeholder').textFieldStyle('roundedBorder');
        const element = field._render();
        expect(element.style.borderRadius).toBe('6px');
      });

      it('should set input type for email keyboard', () => {
        const field = TextField('Email').keyboardType('email');
        const element = field._render();
        expect(element.type).toBe('email');
      });
    });

    describe('SecureField', () => {
      it('should create a SecureFieldView instance', () => {
        const field = SecureField('Password');
        expect(field).toBeInstanceOf(SecureFieldView);
      });

      it('should render input with type password', () => {
        const field = SecureField('Password');
        const element = field._render();
        expect(element.type).toBe('password');
      });
    });

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('✅ All tests passed!\n');
    } else {
      console.log('❌ Some tests failed\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('Test runner error:', error);
    process.exit(1);
  }
}

runTests();
