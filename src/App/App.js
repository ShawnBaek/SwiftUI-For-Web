/**
 * App - The entry point for a SwiftUI-For-Web application.
 *
 * Matches SwiftUI's @main App pattern for bootstrapping the application.
 *
 * Features:
 * - Full mount and unmount lifecycle
 * - Partial updates via Reconciler (diff algorithm)
 * - Debug mode for tracking view changes
 *
 * @example
 * // Basic usage
 * App(() =>
 *   VStack(
 *     Text('Hello, SwiftUI for Web!')
 *       .font(Font.largeTitle)
 *   )
 * ).mount('#root')
 *
 * // With a view class
 * class ContentView extends View {
 *   body() {
 *     return Text('Hello World')
 *   }
 * }
 * App(ContentView).mount('#root')
 *
 * // With debug mode
 * App(ContentView).debug().mount('#root')
 */

import { View } from '../Core/View.js';
import { Reconciler } from '../Core/Reconciler.js';
import { ChangeTracker } from '../Core/ChangeTracker.js';
import { isDescriptor } from '../Core/ViewDescriptor.js';

/**
 * App class implementation for mounting views to the DOM.
 */
class AppInstance {
  /**
   * Creates a new App instance.
   *
   * @param {Function|View} content - View factory function or View class/instance
   */
  constructor(content) {
    this._content = content;
    this._rootElement = null;
    this._mountedView = null;
    this._useReconciler = true; // Enable partial updates by default
    this._debugMode = false;
    this._renderCount = 0;
  }

  /**
   * Enable debug mode - logs render information and enables change tracking.
   *
   * @returns {AppInstance} Returns this for chaining
   */
  debug() {
    this._debugMode = true;
    Reconciler.enableDebug();
    return this;
  }

  /**
   * Disable partial updates (use full re-render).
   * Useful for debugging or when reconciliation causes issues.
   *
   * @returns {AppInstance} Returns this for chaining
   */
  disableReconciler() {
    this._useReconciler = false;
    return this;
  }

  /**
   * Enable partial updates via reconciler.
   *
   * @returns {AppInstance} Returns this for chaining
   */
  enableReconciler() {
    this._useReconciler = true;
    return this;
  }

  /**
   * Mounts the app to a DOM element.
   *
   * @param {string|HTMLElement} selector - CSS selector or DOM element
   * @returns {AppInstance} Returns this for chaining
   */
  mount(selector) {
    // Get the root element
    if (typeof selector === 'string') {
      this._rootElement = document.querySelector(selector);
    } else if (selector instanceof HTMLElement) {
      this._rootElement = selector;
    }

    if (!this._rootElement) {
      console.error(`SwiftUI-For-Web: Could not find element "${selector}"`);
      return this;
    }

    // Clear existing content
    this._rootElement.innerHTML = '';

    // Create the view
    this._mountedView = this._createView();

    if (this._mountedView) {
      this._renderCount++;

      if (this._debugMode) {
        console.log(`[App] Mount #${this._renderCount}`);
      }

      if (this._useReconciler) {
        // Use reconciler for initial mount
        Reconciler.mount(this._mountedView, this._rootElement);
      } else {
        // Direct render
        const element = this._mountedView._render();
        this._rootElement.appendChild(element);
      }

      // Mark as mounted
      this._rootElement.dataset.swiftuiMounted = 'true';
    }

    return this;
  }

  /**
   * Creates the view from the content.
   *
   * @returns {View|Object|null} The created view instance or descriptor
   * @private
   */
  _createView() {
    const content = this._content;

    // If it's a function, call it to get the view
    if (typeof content === 'function') {
      // Check if it's a class constructor (View subclass)
      if (content.prototype instanceof View) {
        return new content();
      }
      // Otherwise it's a factory function
      const result = content();

      // Accept both View instances and descriptors
      if (result instanceof View || isDescriptor(result)) {
        return result;
      }

      // Return result anyway - Reconciler will handle it
      return result;
    }

    // If it's already a View instance or descriptor
    if (content instanceof View || isDescriptor(content)) {
      return content;
    }

    console.error('SwiftUI-For-Web: Invalid content provided to App');
    return null;
  }

  /**
   * Unmounts the app from the DOM.
   *
   * @returns {AppInstance} Returns this for chaining
   */
  unmount() {
    if (this._rootElement) {
      if (this._useReconciler) {
        Reconciler.unmount(this._rootElement);
      } else {
        this._rootElement.innerHTML = '';
      }
      delete this._rootElement.dataset.swiftuiMounted;
      this._mountedView = null;
    }
    return this;
  }

  /**
   * Re-renders the app with partial updates (reconciliation).
   * Only changed parts of the view tree will be updated.
   *
   * @returns {AppInstance} Returns this for chaining
   */
  refresh() {
    if (!this._rootElement) return this;

    this._renderCount++;

    // Create new view tree
    const newView = this._createView();

    if (!newView) return this;

    if (this._debugMode) {
      console.log(`[App] Refresh #${this._renderCount}`);
    }

    if (this._useReconciler) {
      // Use reconciler for partial updates
      Reconciler.update(newView, this._rootElement);
    } else {
      // Full re-render (old behavior)
      this._rootElement.innerHTML = '';
      const element = newView._render();
      this._rootElement.appendChild(element);
    }

    this._mountedView = newView;

    return this;
  }

  /**
   * Force a full re-render (bypasses reconciler).
   * Use when you know the entire UI needs to be rebuilt.
   *
   * @returns {AppInstance} Returns this for chaining
   */
  forceRefresh() {
    if (this._rootElement) {
      this._renderCount++;

      if (this._debugMode) {
        console.log(`[App] Force Refresh #${this._renderCount}`);
      }

      this._rootElement.innerHTML = '';
      this._mountedView = this._createView();

      if (this._mountedView) {
        const element = this._mountedView._render();
        this._rootElement.appendChild(element);
      }
    }
    return this;
  }

  /**
   * Gets the mounted view instance.
   *
   * @returns {View|null} The mounted view
   */
  get view() {
    return this._mountedView;
  }

  /**
   * Gets the root DOM element.
   *
   * @returns {HTMLElement|null} The root element
   */
  get element() {
    return this._rootElement;
  }

  /**
   * Gets the render count (useful for debugging).
   *
   * @returns {number} Number of times the app has been rendered
   */
  get renderCount() {
    return this._renderCount;
  }

  /**
   * Get reconciler statistics.
   *
   * @returns {Object} Stats about the reconciler
   */
  getStats() {
    return {
      renderCount: this._renderCount,
      reconcilerEnabled: this._useReconciler,
      debugMode: this._debugMode,
      ...Reconciler.getStats()
    };
  }
}

/**
 * Factory function for creating App instances.
 * Provides cleaner syntax without the `new` keyword.
 *
 * @param {Function|View} content - View factory function or View class/instance
 * @returns {AppInstance} A new App instance
 *
 * @example
 * // With factory function
 * App(() => Text('Hello')).mount('#root')
 *
 * // With View instance
 * App(Text('Hello')).mount('#root')
 *
 * // With View class
 * App(MyContentView).mount('#root')
 *
 * // With debug mode
 * App(ContentView).debug().mount('#root')
 */
export function App(content) {
  return new AppInstance(content);
}

// Export the class for those who want to extend it
export { AppInstance };

export default App;
