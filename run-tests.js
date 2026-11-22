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

  contains(element) {
    const visit = (node) => node === element || node.children?.some(visit);
    return visit(this.body) || visit(this.head);
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
    this.defaultPrevented = false;
    this.cancelBubble = false;
    this.preventDefault = () => { this.defaultPrevented = true; };
    this.stopPropagation = () => { this.cancelBubble = true; };
  }
}

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = {};
    this._textContent = '';
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
    this._attributes[name] = String(value);
    if (name === 'open') this.open = true;
  }

  removeAttribute(name) {
    delete this._attributes[name];
    if (name.startsWith('data-')) {
      const key = name
        .slice(5)
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      delete this.dataset[key];
    }
    if (name === 'open') this.open = false;
  }

  get attributes() {
    const entries = { ...this._attributes };
    for (const [key, value] of Object.entries(this.dataset)) {
      const name = `data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
      entries[name] = value;
    }
    return Object.entries(entries).map(([name, value]) => ({ name, value }));
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
    if (value === '') {
      for (const child of this.children) child.parentNode = null;
      this.children = [];
    }
  }

  getAttribute(name) {
    return this._attributes[name] || null;
  }

  appendChild(child) {
    // Handle DocumentFragment - append all children
    if (child instanceof MockDocumentFragment) {
      for (const fragmentChild of child.children) {
        fragmentChild.parentNode = this;
        this.children.push(fragmentChild);
      }
      return child;
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child, reference) {
    child.parentNode = this;
    const index = reference ? this.children.indexOf(reference) : -1;
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  remove() {
    this.parentNode?.removeChild(this);
  }

  get firstChild() {
    return this.children[0] || null;
  }

  get parentElement() {
    return this.parentNode instanceof MockElement ? this.parentNode : null;
  }

  get isConnected() {
    return global.document?.contains(this) || false;
  }

  addEventListener(event, handler) {
    this._eventListeners[event] = this._eventListeners[event] || [];
    this._eventListeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    const listeners = this._eventListeners[event];
    if (!listeners) return;
    this._eventListeners[event] = listeners.filter((candidate) => candidate !== handler);
  }

  focus() {
    global.document.activeElement = this;
  }

  click() {
    this.dispatchEvent(new MockEvent('click'));
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    event.currentTarget = this;
    if (this._eventListeners[event.type]) {
      this._eventListeners[event.type].forEach(h => h(event));
    }
    if (!event.cancelBubble && this.parentNode?.dispatchEvent) {
      this.parentNode.dispatchEvent(event);
    }
    return !event.defaultPrevented;
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

// Async variant for behavior that only happens after a microtask or timer.
// Call it with `await` directly inside runTests (not inside describe).
async function itAsync(name, fn) {
  try {
    await fn();
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
    const Scheduler = await import('./src/Core/Scheduler.js');
    const { App } = await import('./src/App/App.js');
    const { Text: ModifierText } = await import('./src/View/Text.js');
    const { VStack } = await import('./src/Layout/Stack/VStack.js');
    const { Button } = await import('./src/View/Control/Button.js');
    const { render, taskHasID } = await import('./src/Core/Renderer.js');
    const { Font: SignalFont } = await import('./src/Graphic/Font.js');
    const { Show } = await import('./src/View/ControlFlow/Show.js');
    const { For } = await import('./src/View/ControlFlow/For.js');
    const { TabView } = await import('./src/View/Navigation/TabView.js');
    const { GeometryReader } = await import('./src/Layout/GeometryReader.js');
    const { GroupView } = await import('./src/View/Container/Group.js');
    const { NavigationStack } = await import('./src/View/Navigation/NavigationStack.js');
    const { Picker } = await import('./src/View/Control/Picker.js');
    const { Stepper } = await import('./src/View/Control/Stepper.js');

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
        Scheduler.flushSync();
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

    describe('SwiftUI-style modifiers', () => {
      it('maps accessibility modifiers to semantic attributes', () => {
        const element = render(
          ModifierText('Status')
            .accessibilityLabel('Build status')
            .accessibilityValue('Passing')
            .accessibilityHint('Opens the build details')
            .accessibilityIdentifier('build-status')
        );
        expect(element.getAttribute('aria-label')).toBe('Build status');
        expect(element.getAttribute('aria-valuetext')).toBe('Passing');
        expect(element.getAttribute('aria-description')).toBe('Opens the build details');
        expect(element.getAttribute('data-accessibility-identifier')).toBe('build-status');
      });

      it('runs onChange for actual changes and supports initial', () => {
        const count = new State(2);
        const changes = [];
        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = App(() =>
          ModifierText('Counter').onChange(
            () => count.value,
            { initial: true },
            (oldValue, newValue) => changes.push([oldValue, newValue])
          )
        ).mount(root);

        expect(changes).toEqual([[2, 2]]);
        count.value = 3;
        Scheduler.flushSync();
        expect(changes).toEqual([[2, 2], [2, 3]]);
        count.value = 3;
        Scheduler.flushSync();
        expect(changes).toHaveLength(2);
        app.unmount();
        root.remove();
      });

      it('keeps searchable text synchronized through a Binding', () => {
        const query = new State('');
        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = App(() =>
          VStack(ModifierText('Results')).searchable(query.binding, { prompt: 'Find samples' })
        ).mount(root);
        const input = root.querySelector('[data-view="SearchFieldInput"]');

        expect(input).toBeDefined();
        expect(input.placeholder).toBe('Find samples');
        input.value = 'Shazam';
        input.dispatchEvent(new Event('input'));
        expect(query.value).toBe('Shazam');
        query.value = 'Audio';
        Scheduler.flushSync();
        expect(input.value).toBe('Audio');
        app.unmount();
        root.remove();
      });

      it('presents and dismisses sheet content from a Binding', () => {
        const isPresented = new State(false);
        let dismissCount = 0;
        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = App(() =>
          Button('Details', () => { isPresented.value = true; })
            .sheet(isPresented.binding, {
              onDismiss: () => { dismissCount++; },
              content: () => VStack(
                ModifierText('Sheet details'),
                Button('Dismiss', () => { isPresented.value = false; })
              )
            })
        ).mount(root);

        root.querySelector('[data-view="Button"]').click();
        expect(document.body.querySelector('[data-view="Sheet"]')).toBeDefined();
        document.body
          .querySelector('[data-view="Sheet"]')
          .querySelector('[data-view="Button"]')
          .click();
        expect(document.body.querySelector('[data-view="Sheet"]')).toBeNull();
        expect(dismissCount).toBe(1);
        app.unmount();
        root.remove();
      });
    });

    // Invariant I2 (#44): reactive bindings are created when their element is
    // rendered, under the current owner. Content that Show/For render after
    // mount must be as reactive as content rendered at mount.
    describe('Reactive bindings inside Show and For (#44)', () => {
      const mountInRoot = (viewFactory) => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = App(viewFactory).mount(root);
        return {
          root,
          // App root → VStack → control-flow wrapper
          wrapper: () => root.children[0].children[0],
          teardown: () => { app.unmount(); root.remove(); },
        };
      };

      // #52 signal-as-value: a State or Binding passed directly subscribes.
      it('Text(state) and Text(binding) update without a thunk', () => {
        const count = new State(1);
        const { root, teardown } = mountInRoot(() =>
          VStack(ModifierText(count), ModifierText(count.binding))
        );
        const stack = root.children[0];
        expect(stack.children[0].textContent).toBe('1');
        expect(stack.children[1].textContent).toBe('1');
        count.value = 2;
        Scheduler.flushSync();
        expect(stack.children[0].textContent).toBe('2');
        expect(stack.children[1].textContent).toBe('2');
        teardown();
      });

      it('a style modifier given a State re-applies when it changes', () => {
        const visible = new State(1);
        const label = new State('Hidden');
        const { root, teardown } = mountInRoot(() =>
          VStack(ModifierText('A').opacity(visible).accessibilityLabel(label))
        );
        const text = root.children[0].children[0];
        expect(String(text.style.opacity)).toBe('1');
        expect(text.getAttribute('aria-label')).toBe('Hidden');
        visible.value = 0.25;
        label.value = 'Shown';
        Scheduler.flushSync();
        expect(String(text.style.opacity)).toBe('0.25');
        expect(text.getAttribute('aria-label')).toBe('Shown');
        teardown();
      });

      it('a State-driven modifier clears what its previous value set', () => {
        const font = new State(SignalFont.body.italic().textCase('uppercase'));
        const padding = new State({ top: 8 });
        const color = new State('red');
        const { root, teardown } = mountInRoot(() =>
          VStack(ModifierText('A').font(font).padding(padding).foregroundColor(color).opacity(0.5))
        );
        const text = root.children[0].children[0];
        expect(text.style.fontStyle).toBe('italic');
        expect(text.style.textTransform).toBe('uppercase');
        expect(text.style.paddingTop).toBe('8px');
        expect(text.style.color).toBe('red');

        font.value = SignalFont.body;
        padding.value = { left: 4 };
        color.value = null;
        Scheduler.flushSync();
        expect(text.style.fontStyle || '').toBe('');
        expect(text.style.textTransform || '').toBe('');
        expect(text.style.paddingTop || '').toBe('');
        expect(text.style.paddingLeft).toBe('4px');
        expect(text.style.color || '').toBe('');
        // A static modifier on the same element is left alone.
        expect(String(text.style.opacity)).toBe('0.5');
        teardown();
      });

      // #50: frame(maxWidth: .infinity) fills the available space.
      it('frame(maxWidth: Infinity) fills the width instead of emitting infinitypx', () => {
        const { root, teardown } = mountInRoot(() => VStack(
          ModifierText('A').frame({ maxWidth: Infinity }),
          ModifierText('B').frame({ maxWidth: 'infinity', maxHeight: Infinity }),
          ModifierText('C').frame({ width: 80, maxWidth: Infinity, minWidth: '4rem' }),
          ModifierText('D').frame({ maxWidth: 200 })
        ));
        const [a, b, c, d] = root.children[0].children;
        expect(a.style.width).toBe('100%');
        expect(a.style.maxWidth).toBe('none');
        expect(b.style.width).toBe('100%');
        expect(b.style.height).toBe('100%');
        expect(b.style.maxHeight).toBe('none');
        expect(c.style.width).toBe('80px');
        expect(c.style.minWidth).toBe('4rem');
        expect(d.style.maxWidth).toBe('200px');
        for (const el of [a, b, c, d]) {
          expect(String(el.style.maxWidth).includes('infinity')).toBe(false);
        }
        teardown();
      });

      it('Text(state.value) stays a static snapshot', () => {
        const count = new State(1);
        const { root, teardown } = mountInRoot(() => VStack(ModifierText(count.value)));
        const text = root.children[0].children[0];
        count.value = 2;
        Scheduler.flushSync();
        expect(text.textContent).toBe('1');
        teardown();
      });

      it('binds a Text thunk in the branch Show switches to after mount', () => {
        const on = new State(false);
        const n = new State(1);
        const { wrapper, teardown } = mountInRoot(() =>
          VStack(Show(() => on.value, ModifierText(() => 'A' + n.value), ModifierText(() => 'B' + n.value)))
        );
        expect(wrapper().children[0].textContent).toBe('B1');

        on.value = true;
        Scheduler.flushSync();
        expect(wrapper().children[0].textContent).toBe('A1');

        n.value = 2;
        Scheduler.flushSync();
        expect(wrapper().children[0].textContent).toBe('A2');
        teardown();
      });

      it('stops thunk effects of the removed branch, in both directions and after unmount', () => {
        const on = new State(false);
        const n = new State(1);
        let aRuns = 0;
        let bRuns = 0;
        const { wrapper, teardown } = mountInRoot(() =>
          VStack(Show(
            () => on.value,
            ModifierText(() => { aRuns++; return 'A' + n.value; }),
            ModifierText(() => { bRuns++; return 'B' + n.value; })
          ))
        );

        // else → then: the else branch's thunk must not run again.
        on.value = true;
        Scheduler.flushSync();
        const bAfterSwitch = bRuns;
        n.value = 2;
        Scheduler.flushSync();
        expect(bRuns).toBe(bAfterSwitch);

        // then → else: the then branch's thunk must not run again.
        on.value = false;
        Scheduler.flushSync();
        expect(wrapper().children[0].textContent).toBe('B2');
        const aAfterSwitch = aRuns;
        n.value = 3;
        Scheduler.flushSync();
        expect(aRuns).toBe(aAfterSwitch);
        expect(wrapper().children[0].textContent).toBe('B3');

        // After unmount, no thunk runs at all.
        teardown();
        const totalRuns = aRuns + bRuns;
        n.value = 4;
        Scheduler.flushSync();
        expect(aRuns + bRuns).toBe(totalRuns);
      });

      it('installs reactive modifiers in a Show branch and disposes them with it', () => {
        const on = new State(false);
        const n = new State(0);
        const seen = [];
        const { teardown } = mountInRoot(() =>
          VStack(Show(() => on.value, ModifierText('watcher').onChange(() => n.value, (_, value) => seen.push(value))))
        );

        on.value = true;
        Scheduler.flushSync();
        n.value = 1;
        Scheduler.flushSync();
        expect(seen).toEqual([1]);

        on.value = false;
        Scheduler.flushSync();
        n.value = 2;
        Scheduler.flushSync();
        expect(seen).toEqual([1]);
        teardown();
      });

      it('binds Text thunks in For rows added after mount', () => {
        const items = new State([{ id: 'a' }]);
        const suffix = new State('1');
        const { wrapper, teardown } = mountInRoot(() =>
          VStack(For(() => items.value, (item) => ModifierText(() => item.id + suffix.value), (item) => item.id))
        );

        items.value = [{ id: 'a' }, { id: 'b' }];
        Scheduler.flushSync();
        suffix.value = '2';
        Scheduler.flushSync();
        const texts = wrapper().children.map((row) => row.textContent);
        expect(texts).toEqual(['a2', 'b2']);
        teardown();
      });

      it('TabView selects tabs by their .tag(_:) values', () => {
        const selection = new State('settings');
        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = App(() => TabView(
          selection,
          ModifierText('Home screen').tag('home'),
          ModifierText('Settings screen').tag('settings')
        )).mount(root);
        const parts = root.children[0].children;
        const content = parts.find((child) => child.dataset.tabviewPart !== 'tabbar');
        const collect = (node, out = []) => { if (node._textContent) out.push(node._textContent); (node.children || []).forEach((c) => collect(c, out)); return out; };
        expect(collect(content).join(' ').includes('Settings screen')).toBe(true);
        const tabBar = parts.find((child) => child.dataset.tabviewPart === 'tabbar');
        tabBar.children[0].click();
        expect(selection.value).toBe('home');
        app.unmount();
        root.remove();
      });

      it('a menu Picker keeps a number tag as a number', () => {
        const count = new State(1);
        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = App(() => Picker('Count', count.binding,
          ModifierText('One').tag(1),
          ModifierText('Two').tag(2))).mount(root);
        let select = null;
        const find = (node) => { if (!select && (node.tagName === 'SELECT' || node.tagName === 'select')) select = node; (node.children || []).forEach(find); };
        find(root);
        select.selectedIndex = 1;
        select.value = '2';
        select.dispatchEvent({ type: 'change', target: select });
        expect(count.value).toBe(2);
        app.unmount();
        root.remove();
      });

      it('disposes the previous tab\'s effects when TabView switches tabs and on unmount', () => {
        const selection = new State(0);
        const n = new State(0);
        const actions = [];
        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = App(() => TabView(
          selection,
          VStack(ModifierText(() => 'T0:' + n.value).onChange(() => n.value, (_, value) => actions.push(value))),
          VStack(ModifierText('tab1'))
        )).mount(root);
        const tabBar = root.children[0].children.find((child) => child.dataset.tabviewPart === 'tabbar');

        for (const index of [1, 0, 1, 0]) tabBar.children[index].click();
        n.value = 1;
        Scheduler.flushSync();
        expect(actions).toEqual([1]);

        app.unmount();
        root.remove();
        n.value = 2;
        Scheduler.flushSync();
        expect(actions).toEqual([1]);
      });

      it('keeps GeometryReader content reactive and disposes it on unmount', () => {
        // Queue frames and run them after mount, like a browser does: the
        // content is then rendered outside any current owner.
        const previousRAF = globalThis.requestAnimationFrame;
        const frames = [];
        globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
        try {
          const n = new State(0);
          let runs = 0;
          const root = document.createElement('div');
          document.body.appendChild(root);
          const app = App(() => GeometryReader(() => ModifierText(() => { runs++; return 'g' + n.value; }))).mount(root);
          frames.splice(0).forEach((callback) => callback());
          const reader = root.children[0];

          n.value = 1;
          Scheduler.flushSync();
          expect(reader.children[0].textContent).toBe('g1');

          app.unmount();
          root.remove();
          const runsAtUnmount = runs;
          n.value = 2;
          Scheduler.flushSync();
          expect(runs).toBe(runsAtUnmount);
        } finally {
          globalThis.requestAnimationFrame = previousRAF;
        }
      });

      // #48 bridge: legacy containers render view descriptors.
      it('NavigationStack renders a descriptor root and pushed descriptor screens', () => {
        const count = new State(1);
        let stack;
        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = App(() => (stack = NavigationStack(VStack(ModifierText('Home'), ModifierText(count))))).mount(root);
        // The test DOM's textContent does not include children, so collect it.
        const text = () => {
          const parts = [];
          const walk = (node) => { if (node._textContent) parts.push(node._textContent); (node.children || []).forEach(walk); };
          walk(root);
          return parts.join(' ');
        };
        expect(text().includes('Home')).toBe(true);
        expect(text().includes('1')).toBe(true);
        count.value = 2;
        Scheduler.flushSync();
        expect(text().includes('2')).toBe(true);
        stack.push(() => ModifierText('Detail'), '', false);
        expect(text().includes('Detail')).toBe(true);
        app.unmount();
        root.remove();
      });

      it('Picker keeps Text options tagged with .tag(_:)', () => {
        const flavor = new State('vanilla');
        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = App(() => Picker('Flavor', flavor.binding,
          ModifierText('Chocolate').tag('chocolate'),
          ModifierText('Vanilla').tag('vanilla'))).mount(root);
        const options = [];
        const walk = (node) => { if (node.tagName === 'OPTION' || node.tagName === 'option') options.push(node); (node.children || []).forEach(walk); };
        walk(root);
        expect(options.map((option) => option.value)).toEqual(['chocolate', 'vanilla']);
        expect(options.map((option) => option.textContent)).toEqual(['Chocolate', 'Vanilla']);
        expect(options[1].selected).toBe(true);
        app.unmount();
        root.remove();
      });

      it('owns the effects of screens NavigationStack pushes and pops', () => {
        const n = new State(0);
        const actions = [];
        const detail = () => new GroupView(
          ModifierText(() => 'd' + n.value).onChange(() => n.value, (_, value) => actions.push(value))
        );
        let stack;
        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = App(() => (stack = NavigationStack(new GroupView(ModifierText('root'))))).mount(root);

        stack.push(detail(), '', false);
        stack.pop(false);
        stack.push(detail(), '', false);
        n.value = 1;
        Scheduler.flushSync();
        expect(actions).toEqual([1]);

        app.unmount();
        root.remove();
        n.value = 2;
        Scheduler.flushSync();
        expect(actions).toEqual([1]);
      });

      it('does not leak when a slot-based container is itself rendered outside an owner', () => {
        const n = new State(0);
        const actions = [];
        const reactive = (tag) => VStack(
          ModifierText(() => tag + n.value).onChange(() => n.value, (_, value) => actions.push(tag + value))
        );
        const previousWarn = console.warn;
        console.warn = () => {};
        try {
          // Rendered from a callback with no owner (as NavigationSplitView does
          // for its detail): content stays static, no effects are created.
          TabView(new State(0), reactive('B'), VStack(ModifierText('y')))._render();
          n.value = 1;
          Scheduler.flushSync();
          expect(actions).toEqual([]);

          // View.rerender() of a mounted NavigationStack (as NavigationPath
          // does): nothing keeps firing after the app unmounts.
          let stack;
          const root = document.createElement('div');
          document.body.appendChild(root);
          const app = App(() => (stack = NavigationStack(new GroupView(reactive('C'))))).mount(root);
          stack.rerender();
          app.unmount();
          root.remove();
          actions.length = 0;
          n.value = 2;
          Scheduler.flushSync();
          expect(actions).toEqual([]);
        } finally {
          console.warn = previousWarn;
        }
      });

      it('leaves reactive content static, instead of leaking effects, when rendered outside an owner', () => {
        const n = new State(1);
        let runs = 0;
        const previousWarn = console.warn;
        console.warn = () => {};
        try {
          const element = render(ModifierText(() => { runs++; return 'v' + n.value; }));
          expect(element.textContent).toBe('v1');
          const runsAfterRender = runs;
          n.value = 2;
          Scheduler.flushSync();
          expect(runs).toBe(runsAfterRender);
          expect(element.textContent).toBe('v1');
        } finally {
          console.warn = previousWarn;
        }
      });
    });

    // Test Signal core (Phase 1 — internal reactive primitives)
    const Signal = await import('./src/Data/Signal.js');

    // Invariant I3 (#46): releasing an element releases everything keyed on it
    // (delegated handlers, lifecycle callbacks), so a pooled element that is
    // reused never carries the previous view's behavior.
    const ElementPool = await import('./src/Core/ElementPool.js');
    const Lifecycle = await import('./src/Core/LifecycleObserver.js');
    const Delegate = await import('./src/Core/EventDelegate.js');
    describe('Element pool release cleanup (#46)', () => {
      const withLifecycleStub = (fn) => {
        const previous = globalThis.MutationObserver;
        globalThis.MutationObserver = class { observe() {} disconnect() {} };
        try {
          fn();
        } finally {
          Lifecycle.flushLifecycleCallbacks();
          globalThis.MutationObserver = previous;
        }
      };
      const attachedRoot = () => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        return root;
      };

      it('releases delegated handlers, so a reused button does not fire the previous action', () => {
        ElementPool.clearPools();
        const actions = [];
        const root = attachedRoot();
        const app = App(() => Button('Old', () => actions.push('old'))).mount(root);
        const oldButton = root.children[0];
        app.unmount();
        root.remove();

        const reused = ElementPool.acquireElement('button');
        expect(reused).toBe(oldButton);
        const other = attachedRoot();
        Delegate.initDelegation(other);
        other.appendChild(reused);
        reused.click();
        expect(actions).toEqual([]);
        Delegate.teardownDelegation(other);
        other.remove();
      });

      it('does not fire a released element\'s onAppear on the view that reuses it', () => {
        withLifecycleStub(() => {
          ElementPool.clearPools();
          let appeared = 0;
          const detached = document.createElement('div');
          const app = App(() => ModifierText('never attached').onAppear(() => { appeared++; })).mount(detached);
          const oldText = detached.children[0];
          app.unmount();

          const reused = ElementPool.acquireElement('span');
          expect(reused).toBe(oldText);
          const root = attachedRoot();
          root.appendChild(reused);
          Lifecycle.flushLifecycleCallbacks();
          expect(appeared).toBe(0);
          root.remove();
        });
      });

      it('fires onDisappear once when released, even if the element is reused at once', () => {
        withLifecycleStub(() => {
          ElementPool.clearPools();
          let disappeared = 0;
          const root = attachedRoot();
          const app = App(() => ModifierText('leaving').onDisappear(() => { disappeared++; })).mount(root);
          const oldText = root.children[0];
          Lifecycle.flushLifecycleCallbacks();
          app.unmount();
          root.remove();

          // Reused and attached before the lifecycle flush runs.
          const reused = ElementPool.acquireElement('span');
          expect(reused).toBe(oldText);
          const other = attachedRoot();
          other.appendChild(reused);
          Lifecycle.flushLifecycleCallbacks();
          expect(disappeared).toBe(1);

          other.remove();
          Lifecycle.flushLifecycleCallbacks();
          expect(disappeared).toBe(1);
        });
      });

      it('drops onAppear of content disposed before it ever appeared', () => {
        withLifecycleStub(() => {
          const baseline = Lifecycle.getLifecycleStats().pendingAppear;
          const dispose = Signal.createRoot((d) => {
            render(ModifierText('never shown').onAppear(() => {}));
            return d;
          });
          expect(Lifecycle.getLifecycleStats().pendingAppear).toBe(baseline + 1);
          dispose();
          expect(Lifecycle.getLifecycleStats().pendingAppear).toBe(baseline);
        });
      });

      it('returns lifecycle maps to baseline after mounting and unmounting 1,000 rows', () => {
        withLifecycleStub(() => {
          const before = Lifecycle.getLifecycleStats();
          const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
          const detached = document.createElement('div');
          const app = App(() => VStack(For(
            () => rows,
            (row) => ModifierText('row ' + row.id).onAppear(() => {}).onDisappear(() => {}),
            (row) => row.id
          ))).mount(detached);
          app.unmount();
          Lifecycle.flushLifecycleCallbacks();
          const after = Lifecycle.getLifecycleStats();
          expect(after.pendingAppear).toBe(before.pendingAppear);
          expect(after.pendingDisappear).toBe(before.pendingDisappear);
        });
      });

      it('releases replaced TabView content to the pool without its handlers', () => {
        ElementPool.clearPools();
        const actions = [];
        const root = attachedRoot();
        const app = App(() => TabView(
          new State(0),
          VStack(Button('In tab 0', () => actions.push('tab0'))),
          VStack(ModifierText('tab 1'))
        )).mount(root);
        const tabView = root.children[0];
        const content = tabView.children.find((child) => child.dataset.tabviewPart === 'content');
        const tabBar = tabView.children.find((child) => child.dataset.tabviewPart === 'tabbar');
        const oldButton = content.children[0].children[0];
        tabBar.children[1].click();

        const reused = ElementPool.acquireElement('button');
        expect(reused).toBe(oldButton);
        const other = attachedRoot();
        Delegate.initDelegation(other);
        other.appendChild(reused);
        reused.click();
        expect(actions).toEqual([]);
        Delegate.teardownDelegation(other);
        other.remove();
        app.unmount();
        root.remove();
      });

      const findTag = (element, tag) => element.tagName === tag
        ? element
        : element.children.map((child) => findTag(child, tag)).find(Boolean);

      it('does not pool legacy elements that carry their own listeners', () => {
        // Stepper is a legacy View: its buttons get listeners through
        // addEventListener, which release cannot remove. Switching tabs must
        // not hand those buttons to the next tab's Button.
        ElementPool.clearPools();
        const count = new State(0);
        const actions = [];
        const root = attachedRoot();
        const app = App(() => TabView(
          new State(0),
          Stepper('Count', count),
          VStack(Button('Tab 1 action', () => actions.push('tab1')))
        )).mount(root);
        const tabView = root.children[0];
        const content = tabView.children.find((child) => child.dataset.tabviewPart === 'content');
        const tabBar = tabView.children.find((child) => child.dataset.tabviewPart === 'tabbar');
        tabBar.children[1].click();

        findTag(content, 'BUTTON').click();
        expect(actions).toEqual(['tab1']);
        expect(count.value).toBe(0);
        app.unmount();
        root.remove();
      });

      it('releases a popped NavigationStack screen to the pool without its handlers', () => {
        ElementPool.clearPools();
        const actions = [];
        let stack;
        const root = attachedRoot();
        const app = App(() => (stack = NavigationStack(new GroupView(ModifierText('root'))))).mount(root);
        stack.push(new GroupView(Button('Save', () => actions.push('save'))), '', false);
        const saveButton = findTag(root, 'BUTTON');
        stack.pop(false);

        const reused = ElementPool.acquireElement('button');
        expect(reused).toBe(saveButton);
        const other = attachedRoot();
        Delegate.initDelegation(other);
        other.appendChild(reused);
        reused.click();
        expect(actions).toEqual([]);
        Delegate.teardownDelegation(other);
        other.remove();
        app.unmount();
        root.remove();
      });

      it('releases replaced GeometryReader content to the pool without its handlers', () => {
        const previousRAF = globalThis.requestAnimationFrame;
        const previousRO = globalThis.ResizeObserver;
        const frames = [];
        const resizeCallbacks = [];
        globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
        globalThis.ResizeObserver = class {
          constructor(callback) { resizeCallbacks.push(callback); }
          observe() {}
          disconnect() {}
        };
        try {
          ElementPool.clearPools();
          const actions = [];
          let renders = 0;
          const root = attachedRoot();
          const app = App(() => GeometryReader(() => {
            const id = ++renders;
            return Button('Render ' + id, () => actions.push(id));
          })).mount(root);
          frames.splice(0).forEach((callback) => callback());
          const firstButton = findTag(root, 'BUTTON');

          // A resize re-renders the content. The previous button is released
          // and the new content takes it back from the pool, without the old
          // handler.
          resizeCallbacks[0]();
          const secondButton = findTag(root, 'BUTTON');
          expect(secondButton === firstButton).toBe(true);
          secondButton.click();
          expect(actions).toEqual([2]);
          app.unmount();
          root.remove();
        } finally {
          globalThis.requestAnimationFrame = previousRAF;
          globalThis.ResizeObserver = previousRO;
        }
      });
    });

    // Invariant I4 (#45): the scheduler isolates each callback. An error is
    // reported, and every other queued callback still runs; no lane drops work.
    describe('Scheduler error isolation and lanes (#45)', () => {
      const withConsoleErrorSpy = (fn) => {
        const previous = console.error;
        const errors = [];
        console.error = (...args) => errors.push(args);
        try {
          fn(errors);
        } finally {
          console.error = previous;
        }
      };

      // Stub requestAnimationFrame / requestIdleCallback with manual queues.
      // `finally` always drains them so a failing test cannot leave the
      // scheduler's rAF/idle flags stuck for the tests that follow.
      const withLaneStubs = (fn) => {
        const previousRAF = globalThis.requestAnimationFrame;
        const previousIdle = globalThis.requestIdleCallback;
        const frames = [];
        const idles = [];
        const plenty = { timeRemaining: () => 50, didTimeout: false };
        globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
        globalThis.requestIdleCallback = (callback) => { idles.push(callback); return idles.length; };
        const previousError = console.error;
        try {
          fn({ frames, idles, plenty });
        } finally {
          console.error = () => {};
          for (let i = 0; i < 100 && (frames.length > 0 || idles.length > 0); i++) {
            try { if (frames.length > 0) frames.shift()(); } catch (_) { /* draining only */ }
            try { if (idles.length > 0) idles.shift()(plenty); } catch (_) { /* draining only */ }
          }
          console.error = previousError;
          globalThis.requestAnimationFrame = previousRAF;
          globalThis.requestIdleCallback = previousIdle;
        }
      };

      it('runs the rest of a flush when one callback throws', () => {
        withConsoleErrorSpy((errors) => {
          let ran = false;
          Scheduler.scheduleWork(() => { throw new Error('boom'); });
          Scheduler.scheduleWork(() => { ran = true; });
          Scheduler.flushSync();
          expect(ran).toBe(true);
          expect(errors).toHaveLength(1);
        });
      });

      it('is not left mid-flush after a callback throws', () => {
        withConsoleErrorSpy(() => {
          Scheduler.scheduleWork(() => { throw new Error('first'); });
          Scheduler.flushSync();
          expect(Scheduler.isFlushing()).toBe(false);
          let ran = false;
          Scheduler.scheduleWork(() => { ran = true; });
          Scheduler.flushSync();
          expect(ran).toBe(true);
        });
      });

      it('isolates errors in Sync lane work, inside and outside a batch', () => {
        withConsoleErrorSpy((errors) => {
          const ran = [];
          Scheduler.batch(() => {
            Scheduler.scheduleWork(() => { throw new Error('sync in batch'); }, Scheduler.SyncLane);
            Scheduler.scheduleWork(() => ran.push('batched'), Scheduler.SyncLane);
          });
          Scheduler.scheduleWork(() => { throw new Error('sync immediate'); }, Scheduler.SyncLane);
          Scheduler.scheduleWork(() => ran.push('immediate'), Scheduler.SyncLane);
          expect(ran).toEqual(['batched', 'immediate']);
          expect(errors).toHaveLength(2);
          expect(String(errors[0][0])).toContain('sync');
        });
      });

      it('isolates errors in Idle lane work', () => {
        withLaneStubs(({ frames, idles, plenty }) => {
          withConsoleErrorSpy((errors) => {
            const ran = [];
            Scheduler.scheduleWork(() => { throw new Error('idle failed'); }, Scheduler.IdleLane);
            Scheduler.scheduleWork(() => ran.push('after'), Scheduler.IdleLane);
            for (let i = 0; i < 5 && idles.length > 0; i++) idles.shift()(plenty);
            expect(ran).toEqual(['after']);
            expect(errors).toHaveLength(1);
          });
        });
      });

      it('isolates errors in queued DOM writes', () => {
        withLaneStubs(({ frames, idles, plenty }) => {
          withConsoleErrorSpy((errors) => {
            let ran = false;
            Scheduler.enqueueDOMWrite(() => { throw new Error('write failed'); });
            Scheduler.enqueueDOMWrite(() => { ran = true; });
            for (let i = 0; i < 5 && frames.length > 0; i++) frames.shift()();
            expect(ran).toBe(true);
            expect(errors).toHaveLength(1);
          });
        });
      });

      it('does not starve re-queued Transition work behind work rescheduled every frame', () => {
        withLaneStubs(({ frames, idles, plenty }) => {
          const ran = [];
          let slowRuns = 0;
          const slow = () => {
            const start = performance.now();
            while (performance.now() - start < 10) { /* exceed the 8 ms budget */ }
            ran.push('slow');
            if (++slowRuns < 5) Scheduler.scheduleWork(slow, Scheduler.TransitionLane);
          };
          Scheduler.scheduleWork(slow, Scheduler.TransitionLane);
          Scheduler.scheduleWork(() => ran.push('cheap'), Scheduler.TransitionLane);

          // Two frames are enough for the cheap callback when the queue is FIFO.
          for (let i = 0; i < 2 && frames.length > 0; i++) frames.shift()();
          expect(ran.includes('cheap')).toBe(true);
          while (frames.length > 0) frames.shift()();
        });
      });

      it('moves re-queued work back to its lane if it was rescheduled at lower priority', () => {
        withLaneStubs(({ frames, idles, plenty }) => {
          const ran = [];
          const later = () => ran.push('later');
          Scheduler.scheduleWork(() => {
            Scheduler.scheduleWork(later, Scheduler.IdleLane);
            const start = performance.now();
            while (performance.now() - start < 10) { /* exceed the 8 ms budget */ }
          }, Scheduler.TransitionLane);
          Scheduler.scheduleWork(later, Scheduler.TransitionLane);

          // Run animation frames only: `later` must not wait for an idle period.
          for (let i = 0; i < 3 && frames.length > 0; i++) frames.shift()();
          expect(ran).toEqual(['later']);
          while (idles.length > 0) idles.shift()(plenty);
          expect(ran).toEqual(['later']);
        });
      });

      it('updates other effects when one effect throws on a signal write', () => {
        withConsoleErrorSpy((errors) => {
          const [count, setCount] = Signal.createSignal(0);
          let seen = null;
          const disposeThrowing = Signal.createEffect(() => {
            if (count() > 0) throw new Error('effect failed');
          });
          const disposeObserver = Signal.createEffect(() => { seen = count(); });
          setCount(1);
          Scheduler.flushSync();
          expect(seen).toBe(1);
          expect(errors).toHaveLength(1);
          disposeThrowing();
          disposeObserver();
        });
      });

      it('runs post-flush callbacks after a callback throws', () => {
        withConsoleErrorSpy(() => {
          let postRan = false;
          Scheduler.scheduleWork(() => { throw new Error('boom'); });
          Scheduler.schedulePostFlush(() => { postRan = true; });
          Scheduler.flushSync();
          expect(postRan).toBe(true);
        });
      });

      it('re-queues Transition lane work that exceeds the frame budget', () => {
        withLaneStubs(({ frames, idles, plenty }) => {
          const ran = [];
          Scheduler.scheduleWork(() => {
            const start = performance.now();
            while (performance.now() - start < 12) { /* exceed the 8 ms budget */ }
            ran.push('slow');
          }, Scheduler.TransitionLane);
          Scheduler.scheduleWork(() => ran.push('next'), Scheduler.TransitionLane);

          for (let i = 0; i < 5 && frames.length > 0; i++) frames.shift()();
          expect(ran).toEqual(['slow', 'next']);
        });
      });

      it('re-queues Idle lane work that exceeds the idle deadline', () => {
        withLaneStubs(({ frames, idles, plenty }) => {
          const ran = [];
          Scheduler.scheduleWork(() => ran.push('first'), Scheduler.IdleLane);
          Scheduler.scheduleWork(() => ran.push('second'), Scheduler.IdleLane);

          const exhausted = { timeRemaining: () => 0, didTimeout: false };
          for (let i = 0; i < 5 && idles.length > 0; i++) idles.shift()(exhausted);
          expect(ran).toEqual(['first', 'second']);
        });
      });

      it('isolates errors in Transition lane work', () => {
        withLaneStubs(({ frames, idles, plenty }) => {
          withConsoleErrorSpy((errors) => {
            let ran = false;
            Scheduler.scheduleWork(() => { throw new Error('transition failed'); }, Scheduler.TransitionLane);
            Scheduler.scheduleWork(() => { ran = true; }, Scheduler.TransitionLane);
            for (let i = 0; i < 5 && frames.length > 0; i++) frames.shift()();
            expect(ran).toBe(true);
            expect(errors).toHaveLength(1);
          });
        });
      });
    });

    console.log('\n📦 Element pool release cleanup, timers (#46)');
    await itAsync('leaves a remounted view alone when NavigationStack\'s animation timer fires after unmount', async () => {
      const previousRAF = globalThis.requestAnimationFrame;
      globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
      try {
        ElementPool.clearPools();
        let stack;
        const first = document.createElement('div');
        document.body.appendChild(first);
        const app = App(() => (stack = NavigationStack(new GroupView(ModifierText('root')), { transitionDuration: 10 }))).mount(first);
        stack.push(new GroupView(ModifierText('detail')), '', true);
        app.unmount();
        first.remove();

        // The new view reuses the stack's pooled elements before the timer fires.
        const second = document.createElement('div');
        document.body.appendChild(second);
        const next = App(() => VStack(VStack(VStack(ModifierText('new'))))).mount(second);
        const depth = (element) => (element.children[0] ? 1 + depth(element.children[0]) : 0);
        const before = depth(second);
        await new Promise((resolve) => setTimeout(resolve, 40));
        expect(depth(second)).toBe(before);
        next.unmount();
        second.remove();
      } finally {
        globalThis.requestAnimationFrame = previousRAF;
      }
    });

    // #57: a mutation batch is processed by walking only the subtrees it added
    // or removed, not by checking every registered element.
    console.log('\n📦 LifecycleObserver processes only mutated subtrees (#57)');
    {
      const microtask = () => new Promise((resolve) => queueMicrotask(resolve));
      // Installs a MutationObserver that the test drives by hand, and records
      // every element passed to document.contains.
      const withObserver = async (fn) => {
        const previousObserver = globalThis.MutationObserver;
        const originalContains = document.contains;
        const observers = [];
        const checked = [];
        globalThis.MutationObserver = class {
          constructor(callback) { this.callback = callback; observers.push(this); }
          observe() {}
          disconnect() { this.disconnected = true; }
        };
        document.contains = function (element) {
          checked.push(element);
          return originalContains.call(this, element);
        };
        const registered = [];
        const context = {
          checked,
          track(element) { registered.push(element); return element; },
          async deliver(record) {
            const active = observers.filter((observer) => !observer.disconnected).pop();
            if (!active) throw new Error('No active MutationObserver');
            active.callback([{ addedNodes: [], removedNodes: [], ...record }]);
            await microtask();
          },
        };
        try {
          await fn(context);
        } finally {
          for (const element of registered) Lifecycle.removeCallbacks(element);
          Lifecycle.flushLifecycleCallbacks();
          document.contains = originalContains;
          globalThis.MutationObserver = previousObserver;
        }
      };
      // A long list: `count` attached rows with onDisappear, and `count`
      // detached rows still waiting for onAppear.
      const longList = async (context, count, log) => {
        const list = document.createElement('div');
        document.body.appendChild(list);
        const rows = [];
        for (let i = 0; i < count; i++) {
          const row = context.track(document.createElement('div'));
          list.appendChild(row);
          Lifecycle.onDisappear(row, () => log.push('disappear ' + i));
          rows.push(row);
          const waiting = context.track(document.createElement('div'));
          Lifecycle.onAppear(waiting, () => log.push('appear ' + i));
        }
        await microtask();
        return { list, rows };
      };

      await itAsync('an added subtree does not check registered elements outside it', async () => {
        await withObserver(async (context) => {
          const log = [];
          const { list } = await longList(context, 50, log);
          const other = document.createElement('div');
          const inner = document.createElement('div');
          const target = context.track(document.createElement('span'));
          inner.appendChild(target);
          other.appendChild(inner);
          Lifecycle.onAppear(target, () => log.push('target appeared'));
          await microtask();

          context.checked.length = 0;
          document.body.appendChild(other);
          await context.deliver({ addedNodes: [other] });
          expect(log).toEqual(['target appeared']);
          expect(context.checked.every((element) => element === other)).toBe(true);

          other.remove();
          list.remove();
        });
      });

      await itAsync('a removed subtree does not check registered elements outside it', async () => {
        await withObserver(async (context) => {
          const log = [];
          const { list, rows } = await longList(context, 50, log);

          context.checked.length = 0;
          const removed = rows[7];
          removed.remove();
          await context.deliver({ removedNodes: [removed] });
          expect(log).toEqual(['disappear 7']);
          expect(context.checked.every((element) => element === removed)).toBe(true);

          list.remove();
        });
      });

      await itAsync('fires for registered descendants of an added or removed ancestor', async () => {
        await withObserver(async (context) => {
          const log = [];
          const { list } = await longList(context, 20, log);
          const section = document.createElement('div');
          const group = document.createElement('div');
          const leaf = context.track(document.createElement('span'));
          group.appendChild(leaf);
          section.appendChild(group);
          Lifecycle.onAppear(leaf, () => log.push('leaf appeared'));
          Lifecycle.onDisappear(leaf, () => log.push('leaf disappeared'));
          await microtask();

          document.body.appendChild(section);
          await context.deliver({ addedNodes: [section] });
          expect(log).toEqual(['leaf appeared']);

          section.remove();
          await context.deliver({ removedNodes: [section] });
          expect(log).toEqual(['leaf appeared', 'leaf disappeared']);

          // Each fires once.
          await context.deliver({ addedNodes: [section], removedNodes: [section] });
          expect(log).toHaveLength(2);
          list.remove();
        });
      });

      await itAsync('does not fire onDisappear for a subtree moved within the document', async () => {
        await withObserver(async (context) => {
          const log = [];
          const { list, rows } = await longList(context, 20, log);
          const elsewhere = document.createElement('div');
          document.body.appendChild(elsewhere);

          const moved = rows[3];
          moved.remove();
          elsewhere.appendChild(moved);
          await context.deliver({ removedNodes: [moved] });
          await context.deliver({ addedNodes: [moved] });
          expect(log).toEqual([]);

          elsewhere.remove();
          await context.deliver({ removedNodes: [elsewhere] });
          expect(log).toEqual(['disappear 3']);
          list.remove();
        });
      });

      await itAsync('does not fire onAppear for a subtree added and removed in one batch', async () => {
        await withObserver(async (context) => {
          const log = [];
          const { list } = await longList(context, 20, log);
          const flash = document.createElement('div');
          const child = context.track(document.createElement('span'));
          flash.appendChild(child);
          Lifecycle.onAppear(child, () => log.push('flash appeared'));
          await microtask();

          document.body.appendChild(flash);
          flash.remove();
          await context.deliver({ addedNodes: [flash], removedNodes: [flash] });
          expect(log).toEqual([]);

          document.body.appendChild(flash);
          await context.deliver({ addedNodes: [flash] });
          expect(log).toEqual(['flash appeared']);
          flash.remove();
          list.remove();
        });
      });

      await itAsync('keeps appear and disappear working with only a few registered elements', async () => {
        await withObserver(async (context) => {
          const log = [];
          const holder = document.createElement('div');
          const element = context.track(document.createElement('span'));
          holder.appendChild(element);
          Lifecycle.onAppear(element, () => log.push('appeared'));
          Lifecycle.onDisappear(element, () => log.push('disappeared'));
          await microtask();
          expect(log).toEqual([]);

          document.body.appendChild(holder);
          await context.deliver({ addedNodes: [holder] });
          expect(log).toEqual(['appeared']);

          holder.remove();
          await context.deliver({ removedNodes: [holder] });
          expect(log).toEqual(['appeared', 'disappeared']);
        });
      });

      await itAsync('fires onAppear for an element attached right after it registers, with no mutation record', async () => {
        await withObserver(async (context) => {
          const log = [];
          const { list } = await longList(context, 20, log);
          const element = context.track(document.createElement('span'));
          Lifecycle.onAppear(element, () => log.push('appeared'));
          document.body.appendChild(element);
          await microtask();
          expect(log).toEqual(['appeared']);
          element.remove();
          list.remove();
        });
      });

      await itAsync('an explicit flushLifecycleCallbacks() still checks every registered element', async () => {
        await withObserver(async (context) => {
          const log = [];
          const { list, rows } = await longList(context, 20, log);
          const late = context.track(document.createElement('span'));
          Lifecycle.onAppear(late, () => log.push('late appeared'));
          await microtask();

          // No mutation record is delivered for either change.
          document.body.appendChild(late);
          rows[5].remove();
          Lifecycle.flushLifecycleCallbacks();
          expect(log).toEqual(['late appeared', 'disappear 5']);
          late.remove();
          list.remove();
        });
      });
    }

    // #37: .task(_:) and .task(id:_:) run asynchronous work for the view's
    // lifetime. https://developer.apple.com/documentation/swiftui/view/task(priority:_:)
    console.log('\n📦 .task and .task(id:) (#37)');
    {
      const { HStack: TaskHStack } = await import('./src/Layout/Stack/HStack.js');
      const { ZStack: TaskZStack } = await import('./src/Layout/Stack/ZStack.js');
      const { Spacer: TaskSpacer } = await import('./src/Layout/Spacer.js');
      const { Divider: TaskDivider } = await import('./src/Layout/Divider.js');
      const { ForEach: TaskForEach } = await import('./src/View/List/ForEach.js');
      const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
      // Lifecycle changes are flushed by hand, as in the #46 tests.
      const withTaskHarness = async (fn) => {
        const previousObserver = globalThis.MutationObserver;
        const previousError = console.error;
        const errors = [];
        globalThis.MutationObserver = class { observe() {} disconnect() {} };
        console.error = (...args) => errors.push(args);
        const roots = [];
        const attachedRoot = () => {
          const root = document.createElement('div');
          document.body.appendChild(root);
          roots.push(root);
          return root;
        };
        try {
          await fn({ attachedRoot, errors, appear: () => Lifecycle.flushLifecycleCallbacks() });
        } finally {
          for (const root of roots) root.remove();
          Lifecycle.flushLifecycleCallbacks();
          console.error = previousError;
          globalThis.MutationObserver = previousObserver;
        }
      };
      // An awaitable that rejects when the signal aborts, the way fetch does.
      const abortable = (signal) => {
        let resolve;
        const promise = new Promise((res, reject) => {
          resolve = res;
          signal.addEventListener('abort', () => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          });
        });
        return { promise, resolve };
      };

      await itAsync('starts the action when the view appears, not before', async () => {
        await withTaskHarness(async ({ attachedRoot, appear }) => {
          const signals = [];
          const detached = document.createElement('div');
          const app = App(() => ModifierText('Loading').task((signal) => { signals.push(signal); })).mount(detached);
          appear();
          expect(signals).toHaveLength(0);

          attachedRoot().appendChild(detached);
          appear();
          expect(signals).toHaveLength(1);
          expect(signals[0].aborted).toBe(false);
          appear();
          expect(signals).toHaveLength(1);
          app.unmount();
        });
      });

      await itAsync('cancels the action when the view disappears', async () => {
        await withTaskHarness(async ({ attachedRoot, appear }) => {
          const signals = [];
          const visible = new State(true);
          const app = App(() => VStack(
            Show(() => visible.value, ModifierText('Row').task((signal) => { signals.push(signal); }))
          )).mount(attachedRoot());
          appear();
          expect(signals).toHaveLength(1);

          visible.value = false;
          Scheduler.flushSync();
          expect(signals[0].aborted).toBe(true);

          // Appearing again runs a new task.
          visible.value = true;
          Scheduler.flushSync();
          appear();
          expect(signals).toHaveLength(2);
          expect(signals[1].aborted).toBe(false);

          app.unmount();
          expect(signals[1].aborted).toBe(true);
        });
      });

      await itAsync('never starts when the view is disposed before it appears', async () => {
        await withTaskHarness(async ({ attachedRoot, appear }) => {
          let started = 0;
          const detached = document.createElement('div');
          const app = App(() => ModifierText('Never shown').task(() => { started++; })).mount(detached);
          app.unmount();
          attachedRoot().appendChild(detached);
          appear();
          expect(started).toBe(0);
        });
      });

      await itAsync('.task(id:) cancels and restarts the action when the id changes', async () => {
        await withTaskHarness(async ({ attachedRoot, appear }) => {
          const query = new State('swift');
          const runs = [];
          const app = App(() => ModifierText('Results').task(
            { id: () => query.value },
            (signal) => { runs.push({ query: query.value, signal }); }
          )).mount(attachedRoot());
          appear();
          expect(runs.map((run) => run.query)).toEqual(['swift']);

          query.value = 'swiftui';
          Scheduler.flushSync();
          expect(runs.map((run) => run.query)).toEqual(['swift', 'swiftui']);
          expect(runs[0].signal.aborted).toBe(true);
          expect(runs[1].signal.aborted).toBe(false);

          // Writing an equal value does not restart it.
          query.value = 'swiftui';
          Scheduler.flushSync();
          expect(runs).toHaveLength(2);

          app.unmount();
          expect(runs[1].signal.aborted).toBe(true);
          query.value = 'after unmount';
          Scheduler.flushSync();
          expect(runs).toHaveLength(2);
        });
      });

      it('.task(id:) needs a reactive owner but .task(_:) does not', () => {
        // Rendered outside an owner, a task with an id cannot restart when the
        // id changes, so it must trigger the unowned-render warning.
        const modifierOf = (view) => view._descriptor
          ? view._descriptor.modifiers.find((m) => m.type === 'task')
          : view.modifiers?.find((m) => m.type === 'task');
        const withID = ModifierText('A').task({ id: 1 }, () => {});
        const withoutID = ModifierText('B').task(() => {});
        const describe = (view) => (typeof view.toDescriptor === 'function' ? view.toDescriptor() : view);
        expect(taskHasID(modifierOf(describe(withID)))).toBe(true);
        expect(taskHasID(modifierOf(describe(withoutID)))).toBe(false);
        expect(taskHasID(undefined)).toBe(false);
      });

      await itAsync('.task(id:) accepts a State or Binding as the id', async () => {
        await withTaskHarness(async ({ attachedRoot, appear }) => {
          const page = new State(1);
          const pages = [];
          const app = App(() => VStack(
            ModifierText('A').task({ id: page }, () => { pages.push('state ' + page.value); }),
            ModifierText('B').task({ id: page.binding }, () => { pages.push('binding ' + page.value); })
          )).mount(attachedRoot());
          appear();
          page.value = 2;
          Scheduler.flushSync();
          expect(pages).toEqual(['state 1', 'binding 1', 'state 2', 'binding 2']);
          app.unmount();
        });
      });

      await itAsync('.task(id:) does not start a task for an id change before the view appears', async () => {
        await withTaskHarness(async ({ attachedRoot, appear }) => {
          const id = new State(0);
          const seen = [];
          const detached = document.createElement('div');
          const app = App(() => ModifierText('Waiting').task({ id: () => id.value }, () => { seen.push(id.value); })).mount(detached);
          id.value = 1;
          Scheduler.flushSync();
          expect(seen).toEqual([]);
          attachedRoot().appendChild(detached);
          appear();
          expect(seen).toEqual([1]);
          app.unmount();
        });
      });

      await itAsync('writes no State after cancellation when the awaited work is aborted', async () => {
        await withTaskHarness(async ({ attachedRoot, appear, errors }) => {
          const result = new State('none');
          const requests = [];
          const app = App(() => ModifierText(() => result.value).task(async (signal) => {
            const request = abortable(signal);
            requests.push(request);
            result.value = await request.promise;
          })).mount(attachedRoot());
          appear();
          expect(requests).toHaveLength(1);

          app.unmount();
          requests[0].resolve('late response');
          await tick();
          expect(result.value).toBe('none');
          // Cancellation is not an error.
          expect(errors).toHaveLength(0);
        });
      });

      await itAsync('a superseded .task(id:) run cannot overwrite the newer result', async () => {
        await withTaskHarness(async ({ attachedRoot, appear }) => {
          const query = new State('a');
          const result = new State('');
          const requests = [];
          const app = App(() => ModifierText(() => result.value).task({ id: () => query.value }, async (signal) => {
            const request = abortable(signal);
            requests.push(request);
            const value = await request.promise;
            if (signal.aborted) return;
            result.value = value;
          })).mount(attachedRoot());
          appear();
          query.value = 'b';
          Scheduler.flushSync();
          expect(requests).toHaveLength(2);

          requests[1].resolve('result for b');
          await tick();
          requests[0].resolve('result for a');
          await tick();
          expect(result.value).toBe('result for b');
          app.unmount();
        });
      });

      await itAsync('reports an error from the action, but not one thrown after cancellation', async () => {
        await withTaskHarness(async ({ attachedRoot, appear, errors }) => {
          const app = App(() => VStack(
            ModifierText('Async').task(async () => { throw new Error('async failure'); }),
            ModifierText('Sync').task(() => { throw new Error('sync failure'); }),
            ModifierText('Cancelled').task(async (signal) => {
              await new Promise((resolve) => signal.addEventListener('abort', resolve));
              throw new Error('thrown after cancel');
            })
          )).mount(attachedRoot());
          appear();
          await tick();
          app.unmount();
          await tick();
          const messages = errors.map((args) => args[1] && args[1].message);
          expect(messages.includes('async failure')).toBe(true);
          expect(messages.includes('sync failure')).toBe(true);
          expect(messages.includes('thrown after cancel')).toBe(false);
          expect(errors.every((args) => args[0] === 'task action error:')).toBe(true);
        });
      });

      await itAsync('cancels when the element leaves the document and restarts when it returns', async () => {
        await withTaskHarness(async ({ attachedRoot, appear }) => {
          const signals = [];
          const root = attachedRoot();
          const app = App(() => ModifierText('Tab content').task((signal) => { signals.push(signal); })).mount(root);
          appear();
          const element = root.children[0];

          // A container detaches the element without disposing its owner.
          root.removeChild(element);
          appear();
          expect(signals[0].aborted).toBe(true);

          root.appendChild(element);
          appear();
          expect(signals).toHaveLength(2);
          expect(signals[1].aborted).toBe(false);
          app.unmount();
          expect(signals[1].aborted).toBe(true);
        });
      });

      await itAsync('does not run the previous view\'s task on a reused pooled element', async () => {
        await withTaskHarness(async ({ attachedRoot, appear }) => {
          ElementPool.clearPools();
          let started = 0;
          const root = attachedRoot();
          const app = App(() => ModifierText('Old').task(() => { started++; })).mount(root);
          appear();
          const oldText = root.children[0];
          app.unmount();
          expect(started).toBe(1);

          const reused = ElementPool.acquireElement('span');
          expect(reused).toBe(oldText);
          root.appendChild(reused);
          appear();
          root.removeChild(reused);
          appear();
          root.appendChild(reused);
          appear();
          expect(started).toBe(1);
        });
      });

      await itAsync('runs next to onAppear and onDisappear on the same view, and repeated onAppear all fire', async () => {
        await withTaskHarness(async ({ attachedRoot, appear }) => {
          const log = [];
          const app = App(() => ModifierText('Composed')
            .onAppear(() => log.push('appear 1'))
            .task((signal) => {
              log.push('task');
              signal.addEventListener('abort', () => log.push('task cancelled'));
            })
            .onAppear(() => log.push('appear 2'))
            .onDisappear(() => log.push('disappear 1'))
            .onDisappear(() => log.push('disappear 2'))
          ).mount(attachedRoot());
          appear();
          expect(log).toEqual(['appear 1', 'appear 2', 'task']);
          app.unmount();
          appear();
          expect(log).toEqual(['appear 1', 'appear 2', 'task', 'task cancelled', 'disappear 1', 'disappear 2']);
        });
      });

      await itAsync('is available on every descriptor view family and on legacy views', async () => {
        await withTaskHarness(async ({ attachedRoot, appear }) => {
          const started = [];
          const signals = [];
          const run = (name) => (signal) => { started.push(name); signals.push(signal); };
          const app = App(() => VStack(
            ModifierText('t').task(run('Text')),
            Button('b', () => {}).task(run('Button')),
            VStack().task(run('VStack')),
            TaskHStack().task(run('HStack')),
            TaskZStack().task(run('ZStack')),
            TaskSpacer().task(run('Spacer')),
            TaskDivider().task(run('Divider')),
            TaskForEach([1], () => ModifierText('row')).task(run('ForEach')),
            new GroupView(ModifierText('legacy')).task(run('legacy View'))
          )).mount(attachedRoot());
          appear();
          await tick();
          expect([...started].sort()).toEqual(['Button', 'Divider', 'ForEach', 'HStack', 'Spacer', 'Text', 'VStack', 'ZStack', 'legacy View']);
          app.unmount();
          appear();
          expect(signals.every((signal) => signal.aborted)).toBe(true);
        });
      });
    }

    console.log('\n📦 Scheduler microtask flush (#45)');
    await itAsync('isolates errors in Discrete lane work flushed by the microtask', async () => {
      const uncaught = [];
      const onUncaught = (error) => uncaught.push(error);
      process.on('uncaughtException', onUncaught);
      const previousError = console.error;
      const errors = [];
      console.error = (...args) => errors.push(args);
      try {
        const ran = [];
        Scheduler.scheduleWork(() => { throw new Error('discrete failed'); }, Scheduler.DiscreteLane);
        Scheduler.scheduleWork(() => ran.push('after'), Scheduler.DiscreteLane);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(uncaught).toHaveLength(0);
        expect(ran).toEqual(['after']);
        expect(errors).toHaveLength(1);
      } finally {
        console.error = previousError;
        process.off('uncaughtException', onUncaught);
      }
    });

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
        Scheduler.flushSync();

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
        Scheduler.flushSync();

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

    // #49: the environment store creates its system defaults on first use, so
    // it imports in Node and falls back to fixed defaults without a browser.
    const { Environment: EnvStore, EnvironmentValues: EnvKeys, ColorScheme: EnvColorScheme, extendViewWithEnvironment } =
      await import('./src/Data/Environment.js');
    describe('Environment without a browser', () => {
      it('reads defaults without window, document or navigator', () => {
        expect(typeof globalThis.window).toBe('undefined');
        expect(EnvStore.get(EnvKeys.colorScheme)).toBe(EnvColorScheme.light);
        expect(typeof EnvStore.get(EnvKeys.locale)).toBe('string');
        expect(typeof EnvStore.get(EnvKeys.openURL)).toBe('function');
      });

      it('.environment scopes a value to its subtree; nested values shadow outer ones', () => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        const read = () => ModifierText(() => String(EnvStore.get('theme') ?? 'global'));
        const app = App(() => VStack(
          VStack(read(), VStack(read()).environment('theme', 'inner')).environment('theme', 'outer'),
          VStack(read()).environment('theme', 'sibling'),
          read()
        )).mount(root);
        const texts = [];
        const walk = (node) => { if (node._textContent) texts.push(node._textContent); (node.children || []).forEach(walk); };
        walk(root);
        expect(texts).toEqual(['outer', 'inner', 'sibling', 'global']);
        // Outside any render, the app-wide value applies.
        expect(EnvStore.get('theme')).toBe(undefined);
        app.unmount();
        root.remove();
      });

      it('legacy View.environment scopes its subtree too', () => {
        // GroupView extends the legacy View base class; install .environment on it.
        extendViewWithEnvironment(Object.getPrototypeOf(GroupView));
        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = App(() => VStack(
          new GroupView(ModifierText(() => String(EnvStore.get('theme') ?? 'global'))).environment('theme', 'legacy'),
          ModifierText(() => String(EnvStore.get('theme') ?? 'global'))
        )).mount(root);
        const texts = [];
        const walk = (node) => { if (node._textContent) texts.push(node._textContent); (node.children || []).forEach(walk); };
        walk(root);
        expect(texts).toEqual(['legacy', 'global']);
        app.unmount();
        root.remove();
      });

      it('.environmentObject scopes an object to its subtree', () => {
        class Settings { constructor(name) { this.name = name; } }
        const root = document.createElement('div');
        document.body.appendChild(root);
        const read = () => ModifierText(() => EnvStore.object(Settings)?.name ?? 'none');
        const app = App(() => VStack(
          VStack(read()).environmentObject(new Settings('A')),
          VStack(read()).environmentObject(new Settings('B'))
        )).mount(root);
        const texts = [];
        const walk = (node) => { if (node._textContent) texts.push(node._textContent); (node.children || []).forEach(walk); };
        walk(root);
        expect(texts).toEqual(['A', 'B']);
        app.unmount();
        root.remove();
      });

      it('openURL opens with noopener and noreferrer', () => {
        const calls = [];
        const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
        globalThis.window = { open: (...args) => { calls.push(args); } };
        try {
          EnvStore.get(EnvKeys.openURL)('https://example.com');
        } finally {
          if (previous) Object.defineProperty(globalThis, 'window', previous);
          else delete globalThis.window;
        }
        expect(calls.length).toBe(1);
        expect(calls[0][1]).toBe('_blank');
        expect(calls[0][2]).toBe('noopener,noreferrer');
      });
    });
    await itAsync('subscribe() alone starts the system listeners', async () => {
      const listeners = [];
      const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
      globalThis.window = {
        innerWidth: 1024,
        innerHeight: 768,
        addEventListener() {},
        matchMedia: (query) => ({
          matches: false,
          addEventListener: (type, listener) => { listeners.push({ query, listener }); },
        }),
      };
      try {
        // A fresh module instance, so no earlier get() has initialized it.
        const fresh = await import('./src/Data/Environment.js?subscribe-only');
        const seen = [];
        fresh.Environment.subscribe(fresh.EnvironmentValues.colorScheme, (value) => { seen.push(value); });
        const dark = listeners.find((entry) => entry.query.includes('prefers-color-scheme'));
        expect(Boolean(dark)).toBe(true);
        dark.listener({ matches: true });
        expect(seen).toEqual([fresh.ColorScheme.dark]);
      } finally {
        if (previous) Object.defineProperty(globalThis, 'window', previous);
        else delete globalThis.window;
      }
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
    const { ForEach, Range } = await import('./src/View/List/ForEach.js');
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
      it('should create an immutable ForEach descriptor', () => {
        const forEach = ForEach(['a', 'b'], item => Text(item));
        expect(forEach.type).toBe('ForEach');
        expect(Object.isFrozen(forEach)).toBe(true);
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
        expect(children[0].key).toBe('a');
        expect(children[1].key).toBe('b');
      });

      it('should support Range object', () => {
        const range = new Range(0, 5);
        const forEach = ForEach(range, i => Text(String(i)));
        expect(forEach.children).toHaveLength(5);
      });

      it('should render container with data-view', () => {
        const forEach = ForEach(['a', 'b'], item => Text(item));
        const element = renderText(forEach);
        expect(element.tagName).toBe('DIV');
        expect(element.dataset.view).toBe('ForEach');
      });

      it('should render children elements', () => {
        const forEach = ForEach(['a', 'b', 'c'], item => Text(item));
        const element = renderText(forEach);
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
