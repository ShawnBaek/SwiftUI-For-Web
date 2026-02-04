/**
 * App - The entry point for a SwiftUI-For-Web application.
 *
 * Matches SwiftUI's @main App pattern for bootstrapping the application.
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
 */

import { View } from '../Core/View.js';

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
      // Render and append to root
      const element = this._mountedView._render();
      this._rootElement.appendChild(element);

      // Mark as mounted
      this._rootElement.dataset.swiftuiMounted = 'true';
    }

    return this;
  }

  /**
   * Creates the view from the content.
   *
   * @returns {View|null} The created view instance
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
      if (result instanceof View) {
        return result;
      }
    }

    // If it's already a View instance
    if (content instanceof View) {
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
      this._rootElement.innerHTML = '';
      delete this._rootElement.dataset.swiftuiMounted;
      this._mountedView = null;
    }
    return this;
  }

  /**
   * Re-renders the entire app.
   *
   * @returns {AppInstance} Returns this for chaining
   */
  refresh() {
    if (this._rootElement) {
      this.unmount();
      this.mount(this._rootElement);
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
 */
export function App(content) {
  return new AppInstance(content);
}

// Export the class for those who want to extend it
export { AppInstance };

export default App;
