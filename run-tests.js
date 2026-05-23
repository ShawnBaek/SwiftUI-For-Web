/**
 * Node.js Test Runner
 * Runs browser-based tests using jsdom
 */

// Simple jsdom-like implementation for testing
class MockDocument {
  constructor() {
    this.body = this.createElement('body');
    this.head = this.createElement('head');
    this.elements = new Map();
  }

  createElement(tag) {
    const element = new MockElement(tag);
    element.ownerDocument = this;
    return element;
  }

  // Used by the Shader renderer to mount SVG <filter> definitions.
  // Tag the element with its namespace so tests can introspect.
  createElementNS(ns, tag) {
    const element = new MockElement(tag);
    element.ownerDocument = this;
    element.namespaceURI = ns;
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
    this.checked = false;
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

    // Test Signal core (Phase 1 — internal reactive primitives)
    const Signal = await import('./src/Data/Signal.js');
    const Scheduler = await import('./src/Core/Scheduler.js');
    describe('Signal', () => {
      it('createSignal returns [read, write]', () => {
        const [read, write] = Signal.createSignal(0);
        expect(typeof read).toBe('function');
        expect(typeof write).toBe('function');
        expect(read()).toBe(0);
      });

      it('write updates the value', () => {
        const [read, write] = Signal.createSignal(1);
        write(42);
        expect(read()).toBe(42);
      });

      it('write(prev => next) uses the updater form', () => {
        const [read, write] = Signal.createSignal(5);
        write(p => p + 10);
        expect(read()).toBe(15);
      });

      it('createEffect runs immediately', () => {
        let runs = 0;
        Signal.createRoot(() => { Signal.createEffect(() => { runs++; }); });
        expect(runs).toBe(1);
      });

      it('createEffect re-runs when a tracked signal changes', () => {
        const [read, write] = Signal.createSignal(0);
        let last = -1;
        Signal.createRoot(() => {
          Signal.createEffect(() => { last = read(); });
        });
        expect(last).toBe(0);
        write(7);
        Scheduler.flushSync();
        expect(last).toBe(7);
      });

      it('createEffect ignores untracked signals', () => {
        const [readA, writeA] = Signal.createSignal(0);
        const [, writeB] = Signal.createSignal(0);
        let runs = 0;
        Signal.createRoot(() => {
          Signal.createEffect(() => { readA(); runs++; });
        });
        expect(runs).toBe(1);
        writeB(99);
        Scheduler.flushSync();
        expect(runs).toBe(1);
        writeA(1);
        Scheduler.flushSync();
        expect(runs).toBe(2);
      });

      it('createEffect detaches stale sources between runs', () => {
        const [readA, writeA] = Signal.createSignal(true);
        const [readB, writeB] = Signal.createSignal('B');
        const [readC, writeC] = Signal.createSignal('C');
        let runs = 0;
        Signal.createRoot(() => {
          Signal.createEffect(() => { runs++; readA() ? readB() : readC(); });
        });
        expect(runs).toBe(1);
        writeA(false);
        Scheduler.flushSync();
        expect(runs).toBe(2);
        writeB('B-updated');     // now unsubscribed
        Scheduler.flushSync();
        expect(runs).toBe(2);
        writeC('C-updated');
        Scheduler.flushSync();
        expect(runs).toBe(3);
      });

      it('disposer stops re-runs', () => {
        const [read, write] = Signal.createSignal(0);
        let runs = 0;
        Signal.createRoot(() => {
          const dispose = Signal.createEffect(() => { read(); runs++; });
          write(1);
          Scheduler.flushSync();
          expect(runs).toBe(2);
          dispose();
          write(2);
          Scheduler.flushSync();
          expect(runs).toBe(2);
        });
      });

      it('createRoot dispose cascades to child effects', () => {
        const [read, write] = Signal.createSignal(0);
        let runs = 0;
        let dispose;
        Signal.createRoot((d) => {
          dispose = d;
          Signal.createEffect(() => { read(); runs++; });
        });
        expect(runs).toBe(1);
        dispose();
        write(1);
        Scheduler.flushSync();
        expect(runs).toBe(1);
      });

      it('createMemo caches and recomputes only on dep change', () => {
        const [read, write] = Signal.createSignal(2);
        let computeCount = 0;
        let memo;
        Signal.createRoot(() => {
          memo = Signal.createMemo(() => { computeCount++; return read() * 10; });
        });
        expect(memo()).toBe(20);
        expect(memo()).toBe(20);
        expect(computeCount).toBe(1);
        write(3);
        Scheduler.flushSync();
        expect(memo()).toBe(30);
        expect(computeCount).toBe(2);
      });

      it('createMemo only notifies downstream when result changes', () => {
        const [read, write] = Signal.createSignal(1);
        let downstreamRuns = 0;
        Signal.createRoot(() => {
          const memo = Signal.createMemo(() => read() > 5);
          Signal.createEffect(() => { memo(); downstreamRuns++; });
        });
        expect(downstreamRuns).toBe(1);
        write(2);
        Scheduler.flushSync();
        expect(downstreamRuns).toBe(1);
        write(10);
        Scheduler.flushSync();
        expect(downstreamRuns).toBe(2);
        write(20);
        Scheduler.flushSync();
        expect(downstreamRuns).toBe(2);
      });

      it('untrack reads do not subscribe', () => {
        const [read, write] = Signal.createSignal(0);
        let runs = 0;
        Signal.createRoot(() => {
          Signal.createEffect(() => { runs++; Signal.untrack(read); });
        });
        expect(runs).toBe(1);
        write(7);
        Scheduler.flushSync();
        expect(runs).toBe(1);
      });

      it('batch coalesces writes across signals', () => {
        const [readA, writeA] = Signal.createSignal(0);
        const [readB, writeB] = Signal.createSignal(0);
        let runs = 0;
        Signal.createRoot(() => {
          Signal.createEffect(() => { readA(); readB(); runs++; });
        });
        expect(runs).toBe(1);
        Signal.batch(() => { writeA(1); writeB(1); });
        Scheduler.flushSync();
        expect(runs).toBe(2);
      });

      it('onCleanup runs before re-execution and on dispose', () => {
        const [read, write] = Signal.createSignal(0);
        const log = [];
        let dispose;
        Signal.createRoot((d) => {
          dispose = d;
          Signal.createEffect(() => {
            const v = read();
            log.push('run:' + v);
            Signal.onCleanup(() => log.push('cleanup:' + v));
          });
        });
        expect(log.join(',')).toBe('run:0');
        write(1);
        Scheduler.flushSync();
        expect(log.join(',')).toBe('run:0,cleanup:0,run:1');
        dispose();
        expect(log.join(',')).toBe('run:0,cleanup:0,run:1,cleanup:1');
      });

      it('isTracking reports the active state', () => {
        expect(Signal.isTracking()).toBe(false);
        Signal.createRoot(() => {
          Signal.createEffect(() => {
            expect(Signal.isTracking()).toBe(true);
          });
        });
        expect(Signal.isTracking()).toBe(false);
      });

      it('trackObservers/notifyObserversSet bridges an external Set', () => {
        const observers = new Set();
        let runs = 0;
        Signal.createRoot(() => {
          Signal.createEffect(() => { Signal.trackObservers(observers); runs++; });
        });
        expect(runs).toBe(1);
        expect(observers.size).toBe(1);
        Signal.notifyObserversSet(observers);
        Scheduler.flushSync();
        expect(runs).toBe(2);
      });
    });

    // Phase 2 — compat shim: existing State / ObservableObject reads
    // auto-track when a signal computation is active.
    describe('Compat shim: State auto-tracks in createEffect', () => {
      it('createEffect over state.value re-runs on write — no explicit subscribe', () => {
        const state = new State(0);
        let last = -1;
        Signal.createRoot(() => {
          Signal.createEffect(() => { last = state.value; });
        });
        expect(last).toBe(0);
        state.value = 5;
        Scheduler.flushSync();
        expect(last).toBe(5);
      });

      it('binding reads also auto-track', () => {
        const state = new State(10);
        let last = -1;
        Signal.createRoot(() => {
          Signal.createEffect(() => { last = state.binding.value; });
        });
        expect(last).toBe(10);
        state.value = 20;
        Scheduler.flushSync();
        expect(last).toBe(20);
      });

      it('writes outside a tracking scope still notify legacy subscribers', () => {
        const state = new State(0);
        let received = -1;
        const dispose = state.subscribe((v) => { received = v; });
        state.value = 7;
        Scheduler.flushSync();
        expect(received).toBe(7);
        dispose();
      });

      it('untrack inside effect prevents re-runs', () => {
        const state = new State(0);
        let runs = 0;
        Signal.createRoot(() => {
          Signal.createEffect(() => { Signal.untrack(() => state.value); runs++; });
        });
        expect(runs).toBe(1);
        state.value = 1;
        Scheduler.flushSync();
        expect(runs).toBe(1);
      });
    });

    // Test ObservableObject
    const { ObservableObject, Published, createObservable } = await import('./src/Data/ObservableObject.js');
    describe('ObservableObject', () => {
      it('should create an instance', () => {
        const observable = new ObservableObject();
        expect(observable).toBeInstanceOf(ObservableObject);
      });

      it('should define published properties', () => {
        const observable = new ObservableObject();
        observable.published('count', 0);
        expect(observable.count).toBe(0);
      });

      it('should notify subscribers on change', () => {
        const observable = new ObservableObject();
        observable.published('count', 0);

        let notified = false;
        observable.subscribe(() => { notified = true; });
        observable.count = 1;

        expect(notified).toBe(true);
      });

      it('should provide binding for property', () => {
        const observable = new ObservableObject();
        observable.published('count', 42);
        const binding = observable.binding('count');
        expect(binding.value).toBe(42);
      });

      it('should update via binding', () => {
        const observable = new ObservableObject();
        observable.published('count', 0);
        observable.binding('count').value = 100;
        expect(observable.count).toBe(100);
      });

      it('should batch updates', () => {
        const observable = new ObservableObject();
        observable.published('a', 0);
        observable.published('b', 0);

        let notifications = 0;
        observable.subscribe(() => { notifications++; });

        observable.batch(() => {
          observable.a = 1;
          observable.b = 2;
        });

        expect(notifications).toBe(1);
      });
    });

    describe('createObservable', () => {
      it('should create observable with properties', () => {
        const observable = createObservable({ name: 'John', age: 30 });
        expect(observable.name).toBe('John');
        expect(observable.age).toBe(30);
      });
    });

    describe('Compat shim: ObservableObject auto-tracks in createEffect', () => {
      it('published-property reads register the active computation', () => {
        class VM extends ObservableObject {
          constructor() { super(); this.published('count', 0); this.published('name', 'a'); }
        }
        const vm = new VM();
        let lastCount = -1;
        let countRuns = 0;
        let nameRuns = 0;
        Signal.createRoot(() => {
          Signal.createEffect(() => { lastCount = vm.count; countRuns++; });
          Signal.createEffect(() => { vm.name; nameRuns++; });
        });
        expect(lastCount).toBe(0);
        expect(countRuns).toBe(1);
        expect(nameRuns).toBe(1);

        vm.count = 5;
        Scheduler.flushSync();
        expect(lastCount).toBe(5);
        expect(countRuns).toBe(2);
        // The 'name' effect must NOT re-run on a 'count' write.
        expect(nameRuns).toBe(1);

        vm.name = 'b';
        Scheduler.flushSync();
        expect(nameRuns).toBe(2);
        expect(countRuns).toBe(2);
      });

      it('binding(name) reads also auto-track', () => {
        class VM extends ObservableObject {
          constructor() { super(); this.published('text', ''); }
        }
        const vm = new VM();
        let last = '?';
        Signal.createRoot(() => {
          Signal.createEffect(() => { last = vm.binding('text').value; });
        });
        expect(last).toBe('');
        vm.text = 'hi';
        Scheduler.flushSync();
        expect(last).toBe('hi');
      });
    });

    // Note: Environment auto-tracking is verified via e2e tests; this Node
    // runner can't import src/Data/Environment.js (it touches window/navigator
    // at module-load time).

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

    // Test Shader / ShaderLibrary
    const { Shader, ShaderLibrary, ShaderKind } = await import('./src/Graphic/Shader.js');
    const RendererMod = await import('./src/Core/Renderer.js');
    const { Text: ShaderText } = await import('./src/View/Text.js');

    describe('Shader / ShaderLibrary', () => {
      it('should expose ShaderKind enum', () => {
        expect(ShaderKind.color).toBe('color');
        expect(ShaderKind.distortion).toBe('distortion');
        expect(ShaderKind.layer).toBe('layer');
      });

      it('should produce a frozen Shader from ShaderLibrary.default.colorize()', () => {
        const s = ShaderLibrary.default.colorize([1, 0, 0, 1]);
        expect(s).toBeInstanceOf(Shader);
        expect(s.kind).toBe('color');
        expect(s.name).toBe('colorize');
        expect(Object.isFrozen(s)).toBeTruthy();
      });

      it('should give the same id for the same args (filter reuse)', () => {
        const a = ShaderLibrary.default.brightness(0.5);
        const b = ShaderLibrary.default.brightness(0.5);
        expect(a.id).toBe(b.id);
      });

      it('should give different ids for different args', () => {
        const a = ShaderLibrary.default.brightness(0.5);
        const b = ShaderLibrary.default.brightness(0.7);
        expect(a.id).not.toBe(b.id);
      });

      it('should tag distortion shaders with the distortion kind', () => {
        const s = ShaderLibrary.default.ripple({ amplitude: 8 });
        expect(s.kind).toBe('distortion');
      });

      it('should tag layer shaders with the layer kind', () => {
        const s = ShaderLibrary.default.blur(4);
        expect(s.kind).toBe('layer');
      });
    });

    describe('Text · shader effect modifiers', () => {
      it('.colorEffect() should set element.style.filter to url(#shaderId)', () => {
        const shader = ShaderLibrary.default.hueRotate(90);
        const view = ShaderText('Hi').colorEffect(shader);
        const el = RendererMod.render(view);
        expect(String(el.style.filter)).toContain(`url(#${shader.id})`);
      });

      it('should compose two effects via space-separated url() refs', () => {
        const a = ShaderLibrary.default.saturation(0.5);
        const b = ShaderLibrary.default.blur(3);
        const view = ShaderText('Hi').colorEffect(a).layerEffect(b);
        const el = RendererMod.render(view);
        expect(String(el.style.filter)).toContain(`url(#${a.id})`);
        expect(String(el.style.filter)).toContain(`url(#${b.id})`);
      });

      it('.distortionEffect() should use the same filter machinery', () => {
        const shader = ShaderLibrary.default.ripple({ amplitude: 4 });
        const view = ShaderText('Hi').distortionEffect(shader);
        const el = RendererMod.render(view);
        expect(String(el.style.filter)).toContain(`url(#${shader.id})`);
      });

      it('should return a new immutable descriptor', () => {
        const base = ShaderText('Hi');
        const next = base.colorEffect(ShaderLibrary.default.grayscale(1));
        expect(next).not.toBe(base);
        expect(next.type).toBe('Text');
      });

      it('should silently skip when isEnabled:false', () => {
        const shader = ShaderLibrary.default.hueRotate(180);
        const view = ShaderText('Hi').colorEffect(shader, { isEnabled: false });
        const el = RendererMod.render(view);
        expect(String(el.style.filter || '')).not.toContain(`url(#${shader.id})`);
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
    const { Text, AccessibilityHeadingLevel } = await import('./src/View/Text.js');
    const { render: renderText } = await import('./src/Core/Renderer.js');

    describe('Text · accessibilityHeading()', () => {
      it('should expose h1..h6 + unspecified on AccessibilityHeadingLevel', () => {
        expect(AccessibilityHeadingLevel.h1).toBe('h1');
        expect(AccessibilityHeadingLevel.h6).toBe('h6');
        expect(AccessibilityHeadingLevel.unspecified).toBe('unspecified');
      });

      it('should render <h1> when level is .h1', () => {
        const el = renderText(Text('Title').accessibilityHeading(AccessibilityHeadingLevel.h1));
        expect(el.tagName).toBe('H1');
        expect(el.textContent).toBe('Title');
      });

      it('should render the matching tag for h2..h6', () => {
        for (const level of ['h2', 'h3', 'h4', 'h5', 'h6']) {
          const el = renderText(Text('x').accessibilityHeading(AccessibilityHeadingLevel[level]));
          expect(el.tagName).toBe(level.toUpperCase());
        }
      });

      it('should fall back to <span> for .unspecified', () => {
        const el = renderText(Text('x').accessibilityHeading(AccessibilityHeadingLevel.unspecified));
        expect(el.tagName).toBe('SPAN');
      });

      it('should not change tag when no heading is set', () => {
        const el = renderText(Text('plain'));
        expect(el.tagName).toBe('SPAN');
      });

      it('should neutralise user-agent heading styles so visuals stay modifier-driven', () => {
        const el = renderText(Text('Hi').accessibilityHeading(AccessibilityHeadingLevel.h1));
        expect(el.style.fontSize).toBe('inherit');
        expect(el.style.fontWeight).toBe('inherit');
      });

      it('should let .bold() / .fontWeight() override the heading reset', () => {
        const el = renderText(Text('Hi').accessibilityHeading(AccessibilityHeadingLevel.h2).bold());
        expect(el.tagName).toBe('H2');
        expect(el.style.fontWeight).toBe('700');
      });

      it('should return a new immutable descriptor', () => {
        const base = Text('Hi');
        const heading = base.accessibilityHeading(AccessibilityHeadingLevel.h1);
        expect(heading).not.toBe(base);
        expect(heading.type).toBe('Text');
      });
    });

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

    // Test Toggle
    const { Toggle, ToggleView } = await import('./src/View/Control/Toggle.js');
    describe('Toggle', () => {
      it('should create a ToggleView instance', () => {
        const state = new State(false);
        const toggle = Toggle(state.binding);
        expect(toggle).toBeInstanceOf(ToggleView);
      });

      it('should accept label and binding', () => {
        const state = new State(false);
        const toggle = Toggle('Enable', state.binding);
        expect(toggle._label).toBe('Enable');
      });

      it('should render a div for switch style', () => {
        const state = new State(false);
        const toggle = Toggle(state.binding);
        const element = toggle._render();
        expect(element.tagName).toBe('DIV');
      });

      it('should set data-view to Toggle', () => {
        const state = new State(false);
        const toggle = Toggle(state.binding);
        const element = toggle._render();
        expect(element.dataset.view).toBe('Toggle');
      });

      it('should update binding when clicked', () => {
        const state = new State(false);
        const toggle = Toggle(state.binding);
        const element = toggle._render();

        element.click();

        expect(state.value).toBe(true);
      });

      it('should not toggle when disabled', () => {
        const state = new State(false);
        const toggle = Toggle(state.binding).disabled();
        const element = toggle._render();

        element.click();

        expect(state.value).toBe(false);
      });

      it('should render checkbox style', () => {
        const state = new State(false);
        const toggle = Toggle(state.binding).toggleStyle('checkbox');
        const element = toggle._render();
        expect(element.tagName).toBe('LABEL');
      });

      it('should render button style', () => {
        const state = new State(false);
        const toggle = Toggle('Toggle', state.binding).toggleStyle('button');
        const element = toggle._render();
        expect(element.tagName).toBe('BUTTON');
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
