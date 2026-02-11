/**
 * App Tests
 * Tests for the App mounting functionality
 */

import { describe, it, expect, beforeEach } from '../TestUtils.js';
import { App, AppInstance } from '../../src/App/App.js';
import { View } from '../../src/Core/View.js';
import { Text } from '../../src/View/Text.js';
import { VStack } from '../../src/Layout/Stack/VStack.js';
import { flushSync } from '../../src/Core/Scheduler.js';

describe('App', () => {
  // Create a test container before each test
  let testContainer;

  beforeEach(() => {
    // Create a fresh test container
    testContainer = document.createElement('div');
    testContainer.id = 'test-root';
    document.body.appendChild(testContainer);
  });

  // Clean up after each test (using a simple approach)
  const cleanup = () => {
    if (testContainer && testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
  };

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
    it('should schedule a re-render', () => {
      let counter = 0;
      const app = App(() => Text(`Count: ${counter}`));
      app.mount('#test-root');
      expect(testContainer.textContent).toContain('Count: 0');

      counter = 1;
      app.refresh();
      flushSync(); // Flush the scheduled refresh
      expect(testContainer.textContent).toContain('Count: 1');
      cleanup();
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
