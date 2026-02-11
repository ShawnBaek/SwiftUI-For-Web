/**
 * App - The entry point for a SwiftUI-For-Web application.
 *
 * Matches SwiftUI's @main App pattern for bootstrapping the application.
 *
 * Performance features:
 * - Automatic update batching via Scheduler (multiple state changes = 1 re-render)
 * - Event delegation (single root listener per event type)
 * - Partial updates via Reconciler with element pooling
 * - Lifecycle callback batching
 *
 * @example
 * App(() =>
 *   VStack(
 *     Text('Hello, SwiftUI for Web!')
 *       .font(Font.largeTitle)
 *   )
 * ).mount('#root')
 */

import { View } from '../Core/View.js';
import { Reconciler } from '../Core/Reconciler.js';
import { ChangeTracker } from '../Core/ChangeTracker.js';
import { isDescriptor } from '../Core/ViewDescriptor.js';
import { scheduleWork, DefaultLane } from '../Core/Scheduler.js';
import { initDelegation, teardownDelegation } from '../Core/EventDelegate.js';

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
    this._useReconciler = true;
    this._debugMode = false;
    this._renderCount = 0;
    this._refreshScheduled = false;

    // Bound function for scheduler deduplication
    this._boundRefresh = () => {
      this._refreshScheduled = false;
      this._doRefresh();
    };
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

    // Initialize event delegation on the root element
    initDelegation(this._rootElement);

    // Clear existing content
    this._rootElement.textContent = '';

    // Create the view
    this._mountedView = this._createView();

    if (this._mountedView) {
      this._renderCount++;

      if (this._debugMode) {
        console.log(`[App] Mount #${this._renderCount}`);
      }

      if (this._useReconciler) {
        Reconciler.mount(this._mountedView, this._rootElement);
      } else {
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

    if (typeof content === 'function') {
      if (content.prototype instanceof View) {
        return new content();
      }
      const result = content();

      if (result instanceof View || isDescriptor(result)) {
        return result;
      }

      return result;
    }

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
      // Tear down event delegation
      teardownDelegation(this._rootElement);

      if (this._useReconciler) {
        Reconciler.unmount(this._rootElement);
      } else {
        this._rootElement.textContent = '';
      }
      delete this._rootElement.dataset.swiftuiMounted;
      this._mountedView = null;
    }
    return this;
  }

  /**
   * Schedule a re-render via the Scheduler.
   * Multiple calls within the same microtask are coalesced into a single re-render.
   * This is the primary way state changes trigger UI updates.
   *
   * @returns {AppInstance} Returns this for chaining
   */
  refresh() {
    if (!this._rootElement) return this;

    if (!this._refreshScheduled) {
      this._refreshScheduled = true;
      scheduleWork(this._boundRefresh, DefaultLane);
    }

    return this;
  }

  /**
   * Actually perform the re-render. Called by the Scheduler.
   * @private
   */
  _doRefresh() {
    if (!this._rootElement) return;

    this._renderCount++;

    const newView = this._createView();
    if (!newView) return;

    if (this._debugMode) {
      console.log(`[App] Refresh #${this._renderCount}`);
    }

    if (this._useReconciler) {
      Reconciler.update(newView, this._rootElement);
    } else {
      this._rootElement.textContent = '';
      const element = newView._render();
      this._rootElement.appendChild(element);
    }

    this._mountedView = newView;
  }

  /**
   * Force a full re-render (bypasses reconciler and scheduler).
   *
   * @returns {AppInstance} Returns this for chaining
   */
  forceRefresh() {
    if (this._rootElement) {
      this._renderCount++;

      if (this._debugMode) {
        console.log(`[App] Force Refresh #${this._renderCount}`);
      }

      this._rootElement.textContent = '';
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
   * @returns {View|null}
   */
  get view() {
    return this._mountedView;
  }

  /**
   * Gets the root DOM element.
   * @returns {HTMLElement|null}
   */
  get element() {
    return this._rootElement;
  }

  /**
   * Gets the render count.
   * @returns {number}
   */
  get renderCount() {
    return this._renderCount;
  }

  /**
   * Get comprehensive performance statistics.
   * @returns {Object}
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
 *
 * @param {Function|View} content - View factory function or View class/instance
 * @returns {AppInstance} A new App instance
 */
export function App(content) {
  return new AppInstance(content);
}

export { AppInstance };

export default App;
