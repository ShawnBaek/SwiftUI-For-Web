/**
 * App - The entry point for a SwiftUI-For-Web application.
 *
 * Matches SwiftUI's @main App pattern for bootstrapping the application.
 *
 * Engine: fine-grained reactive (no virtual DOM, no diffing). The view
 * factory runs once at mount inside a signal root scope; subsequent state
 * changes execute only the small effect closures bound to the affected
 * DOM nodes. There is no app.refresh() — state writes auto-propagate.
 *
 * @example
 * App(() =>
 *   VStack(
 *     Text(() => 'Count: ' + count.value)
 *       .font(Font.largeTitle)
 *   )
 * ).mount('#root')
 */

import { View } from '../Core/View.js';
import { isDescriptor } from '../Core/ViewDescriptor.js';
import { initDelegation, teardownDelegation } from '../Core/EventDelegate.js';
import { mount as signalMount } from '../Core/SignalRenderer.js';

/**
 * App class implementation for mounting views to the DOM.
 */
class AppInstance {
  /**
   * Creates a new App instance.
   *
   * @param {Function|View} content - View factory function or View class/instance
   * @param {Object} [options] - Reserved for future use (e.g. dev-mode flags).
   */
  constructor(content, options) {
    this._content = content;
    this._options = options || {};
    this._rootElement = null;
    this._mountedView = null;
    this._debugMode = false;
    this._renderCount = 0;
    this._signalDispose = null;
  }

  /**
   * Enable debug mode (logs mount events).
   * @returns {AppInstance}
   */
  debug() {
    this._debugMode = true;
    return this;
  }

  /**
   * Mounts the app to a DOM element.
   *
   * @param {string|HTMLElement} selector - CSS selector or DOM element
   * @returns {AppInstance} Returns this for chaining
   */
  mount(selector) {
    if (typeof selector === 'string') {
      this._rootElement = document.querySelector(selector);
    } else if (selector instanceof HTMLElement) {
      this._rootElement = selector;
    }

    if (!this._rootElement) {
      console.error(`SwiftUI-For-Web: Could not find element "${selector}"`);
      return this;
    }

    initDelegation(this._rootElement);
    this._rootElement.textContent = '';

    // Fine-grained mount. The factory runs inside the signal root scope,
    // so any signal reads at the top-level become subscriptions and
    // re-execute the appropriate effects on write — no refresh() call.
    this._signalDispose = signalMount(
      () => (this._mountedView = this._createView()),
      this._rootElement,
    );

    this._renderCount++;
    if (this._debugMode) console.log(`[App] Mount #${this._renderCount}`);
    this._rootElement.dataset.swiftuiMounted = 'true';

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
      teardownDelegation(this._rootElement);

      if (this._signalDispose) {
        this._signalDispose();
        this._signalDispose = null;
      }

      delete this._rootElement.dataset.swiftuiMounted;
      this._mountedView = null;
    }
    return this;
  }

  /**
   * No-op on the signals engine — state writes auto-propagate.
   * Kept for backwards compatibility with un-migrated callers; warns in
   * debug mode so they can be found and removed.
   *
   * @returns {AppInstance}
   */
  refresh() {
    if (this._debugMode) {
      console.warn('[App] refresh() is a no-op on the signals engine — state writes auto-propagate via tracked effects.');
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
   * Gets the render count (mount count, since there are no re-renders).
   * @returns {number}
   */
  get renderCount() {
    return this._renderCount;
  }

  /**
   * Diagnostic stats (mostly empty since there's no reconciler to ask).
   * @returns {Object}
   */
  getStats() {
    return {
      renderCount: this._renderCount,
      engine: 'signals',
      debugMode: this._debugMode,
    };
  }
}

/**
 * Factory function for creating App instances.
 *
 * @param {Function|View} content - View factory function or View class/instance
 * @param {Object} [options] - Reserved for future use.
 * @returns {AppInstance} A new App instance
 */
export function App(content, options) {
  return new AppInstance(content, options);
}

export { AppInstance };

export default App;
