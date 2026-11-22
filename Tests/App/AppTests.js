/**
 * App Tests
 * Tests for the App mounting functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '../TestUtils.js';
import { App, AppInstance } from '../../src/App/App.js';
import { View } from '../../src/Core/View.js';
import { Text } from '../../src/View/Text.js';
import { VStack } from '../../src/Layout/Stack/VStack.js';
import { flushSync } from '../../src/Core/Scheduler.js';
import { State } from '../../src/Data/State.js';

describe('App', () => {
  // Create a test container before each test
  let testContainer;

  beforeEach(() => {
    // Create a fresh test container
    testContainer = document.createElement('div');
    testContainer.id = 'test-root';
    document.body.appendChild(testContainer);
  });

  // Remove the container after each test, also when the test fails, so the
  // next test never mounts into a stale '#test-root'.
  const cleanup = () => {
    if (testContainer && testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
  };
  afterEach(cleanup);

  describe('Factory Function', () => {
    it('should create an AppInstance', () => {
      const app = App(() => Text('Hello'));
      expect(app).toBeInstanceOf(AppInstance);
      cleanup();
    });
  });

  describe('mount()', () => {
    it('should mount to a selector string', () => {
      const app = App(() => Text('Hello'));
      app.mount('#test-root');
      expect(testContainer.children.length).toBeGreaterThan(0);
      cleanup();
    });

    it('should mount to a DOM element', () => {
      const app = App(() => Text('Hello'));
      app.mount(testContainer);
      expect(testContainer.children.length).toBeGreaterThan(0);
      cleanup();
    });

    it('should clear existing content before mounting', () => {
      testContainer.innerHTML = '<p>Existing content</p>';
      const app = App(() => Text('New content'));
      app.mount('#test-root');
      expect(testContainer.innerHTML).not.toContain('Existing content');
      cleanup();
    });

    it('should set data-swiftui-mounted attribute', () => {
      const app = App(() => Text('Hello'));
      app.mount('#test-root');
      expect(testContainer.dataset.swiftuiMounted).toBe('true');
      cleanup();
    });

    it('should return the app instance for chaining', () => {
      const app = App(() => Text('Hello'));
      const result = app.mount('#test-root');
      expect(result).toBe(app);
      cleanup();
    });

    it('should handle invalid selector gracefully', () => {
      const app = App(() => Text('Hello'));
      // Should not throw
      app.mount('#non-existent-element');
      cleanup();
    });
  });

  describe('Content Types', () => {
    it('should accept a factory function returning descriptor', () => {
      const app = App(() => Text('Hello'));
      app.mount('#test-root');
      expect(testContainer.textContent).toContain('Hello');
      cleanup();
    });

    it('should accept a descriptor directly', () => {
      const view = Text('Direct View');
      const app = App(view);
      app.mount('#test-root');
      expect(testContainer.textContent).toContain('Direct View');
      cleanup();
    });

    it('should accept a View class', () => {
      class MyView extends View {
        body() {
          return Text('From Class');
        }
      }
      const app = App(MyView);
      app.mount('#test-root');
      // The class creates a View that returns Text in body()
      cleanup();
    });

    it('should render complex view hierarchies', () => {
      const app = App(() =>
        VStack(
          Text('Title'),
          Text('Subtitle')
        )
      );
      app.mount('#test-root');
      // VStack renders as a flex-column div
      const flexColumn = testContainer.querySelector('div');
      expect(flexColumn).toBeTruthy();
      expect(flexColumn.style.flexDirection).toBe('column');
      cleanup();
    });
  });

  describe('unmount()', () => {
    it('should clear the root element content', () => {
      const app = App(() => Text('Hello'));
      app.mount('#test-root');
      app.unmount();
      expect(testContainer.children.length).toBe(0);
      cleanup();
    });

    it('should remove data-swiftui-mounted attribute', () => {
      const app = App(() => Text('Hello'));
      app.mount('#test-root');
      app.unmount();
      expect(testContainer.dataset.swiftuiMounted).toBeUndefined();
      cleanup();
    });

    it('should return the app instance for chaining', () => {
      const app = App(() => Text('Hello'));
      app.mount('#test-root');
      const result = app.unmount();
      expect(result).toBe(app);
      cleanup();
    });
  });

  describe('refresh()', () => {
    it('is not needed: a state write updates the mounted view', () => {
      const counter = new State(0);
      const app = App(() => Text(() => `Count: ${counter.value}`));
      app.mount('#test-root');
      expect(testContainer.textContent).toContain('Count: 0');

      counter.value = 1;
      flushSync();
      expect(testContainer.textContent).toContain('Count: 1');
      app.unmount();
    });

    it('should return the app instance for chaining', () => {
      const app = App(() => Text('Hello'));
      app.mount('#test-root');
      const result = app.refresh();
      expect(result).toBe(app);
      cleanup();
    });
  });

  describe('Properties', () => {
    it('should expose the mounted view via .view', () => {
      const app = App(() => Text('Hello'));
      app.mount('#test-root');
      // View is a descriptor (plain object) or View instance
      expect(app.view).toBeTruthy();
      cleanup();
    });

    it('should expose the root element via .element', () => {
      const app = App(() => Text('Hello'));
      app.mount('#test-root');
      expect(app.element).toBe(testContainer);
      cleanup();
    });
  });
});

// #48: containers are descriptors; these follow state written elsewhere.
describe('Containers (#48)', () => {
  const mount = (factory) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const app = App(factory).mount(host);
    return { host, done: () => { app.unmount(); host.remove(); } };
  };

  it('TabView shows a selection written elsewhere and moves the tab stop', async () => {
    const { TabView } = await import('../../src/View/Navigation/TabView.js');
    const selection = new State('a');
    const { host, done } = mount(() => TabView(selection, Text('Alpha').tag('a'), Text('Beta').tag('b')));
    selection.value = 'b';
    flushSync();
    const tabs = Array.from(host.querySelectorAll('[role="tab"]'));
    expect(host.querySelector('[role="tabpanel"]').textContent).toBe('Beta');
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0]);
    done();
  });

  it('NavigationStack follows a NavigationPath and BackButton pops it', async () => {
    const { NavigationStack, BackButton } = await import('../../src/View/Navigation/NavigationStack.js');
    const { NavigationPath } = await import('../../src/View/Navigation/NavigationPath.js');
    const path = new NavigationPath();
    const { host, done } = mount(() => NavigationStack(Text('Home'), { path, transitionStyle: 'none' })
      .navigationDestination('string', (name) => VStack(Text(`Hello ${name}`), BackButton())));
    path.append('Ada');
    expect(host.textContent).toBe('Hello Ada‹ Back');
    host.querySelector('[data-view="BackButton"]').click();
    expect(path.count).toBe(0);
    expect(host.textContent).toBe('Home');
    done();
  });
});
