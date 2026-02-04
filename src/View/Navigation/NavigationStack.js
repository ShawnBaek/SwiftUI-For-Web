/**
 * NavigationStack - SwiftUI-style navigation container
 *
 * Provides stack-based navigation with smooth transitions.
 *
 * @example
 * const navigator = NavigationStack(
 *   MovieListView()
 * );
 *
 * // Push a new view
 * NavigationLink('View Details', MovieDetailView(movie))
 *
 * // Or programmatically
 * navigator.push(MovieDetailView(movie));
 */

import { View } from '../../Core/View.js';
import { State } from '../../Data/State.js';

/**
 * Global navigation context for nested NavigationLinks
 */
let _currentNavigationStack = null;

/**
 * Get the current navigation stack (used by NavigationLink)
 *
 * @returns {NavigationStackView|null} Current navigation stack
 */
export function getCurrentNavigationStack() {
  return _currentNavigationStack;
}

/**
 * NavigationStackView class
 * @extends View
 */
class NavigationStackView extends View {
  /**
   * Creates a NavigationStack
   *
   * @param {View|Function} root - Root view of the navigation
   * @param {Object} [options] - Navigation options
   * @param {string} [options.transitionStyle='slide'] - Transition style: 'slide', 'fade', 'none'
   * @param {number} [options.transitionDuration=300] - Transition duration in ms
   */
  constructor(root, options = {}) {
    super();

    this._rootView = root;
    this._stack = []; // Stack of { view, title }
    this._transitionStyle = options.transitionStyle ?? 'slide';
    this._transitionDuration = options.transitionDuration ?? 300;
    this._container = null;
    this._title = new State('');

    // Store reference for NavigationLink access
    this._navigationContext = this;
  }

  /**
   * Push a view onto the navigation stack
   *
   * @param {View} view - View to push
   * @param {string} [title] - Optional title for the view
   * @param {boolean} [animated=true] - Animate the transition
   */
  push(view, title = '', animated = true) {
    this._stack.push({ view, title });
    this._title.value = title;
    this._animateTransition('push', animated);
  }

  /**
   * Pop the top view from the stack
   *
   * @param {boolean} [animated=true] - Animate the transition
   * @returns {Object|null} The popped view info, or null if at root
   */
  pop(animated = true) {
    if (this._stack.length === 0) return null;

    const popped = this._stack.pop();
    const current = this._stack[this._stack.length - 1];
    this._title.value = current ? current.title : '';
    this._animateTransition('pop', animated);
    return popped;
  }

  /**
   * Pop to the root view
   *
   * @param {boolean} [animated=true] - Animate the transition
   */
  popToRoot(animated = true) {
    if (this._stack.length === 0) return;

    this._stack = [];
    this._title.value = '';
    this._animateTransition('pop', animated);
  }

  /**
   * Get the current navigation path depth
   *
   * @returns {number} Number of views in the stack (not including root)
   */
  get depth() {
    return this._stack.length;
  }

  /**
   * Check if we can go back
   *
   * @returns {boolean} True if there's at least one view to pop
   */
  get canGoBack() {
    return this._stack.length > 0;
  }

  /**
   * Animate transition between views
   *
   * @param {string} direction - 'push' or 'pop'
   * @param {boolean} animated - Whether to animate
   * @private
   */
  _animateTransition(direction, animated) {
    if (!this._container) return;

    // Get current view
    const currentView = this._stack.length > 0
      ? this._stack[this._stack.length - 1].view
      : this._rootView;

    // Create new content
    const newContent = document.createElement('div');
    newContent.style.position = 'absolute';
    newContent.style.top = '0';
    newContent.style.left = '0';
    newContent.style.width = '100%';
    newContent.style.height = '100%';

    // Set navigation context for NavigationLinks
    const previousStack = _currentNavigationStack;
    _currentNavigationStack = this;

    // Render the view
    if (currentView instanceof View) {
      newContent.appendChild(currentView._render());
    } else if (typeof currentView === 'function') {
      const result = currentView();
      if (result instanceof View) {
        newContent.appendChild(result._render());
      }
    }

    // Restore previous context
    _currentNavigationStack = previousStack;

    if (!animated || this._transitionStyle === 'none') {
      // No animation
      this._container.innerHTML = '';
      this._container.appendChild(newContent);
      newContent.style.position = 'relative';
      return;
    }

    // Get existing content
    const existingContent = this._container.firstChild;

    // Setup animation
    const duration = this._transitionDuration;

    if (this._transitionStyle === 'slide') {
      // Slide animation
      if (direction === 'push') {
        newContent.style.transform = 'translateX(100%)';
        this._container.appendChild(newContent);

        requestAnimationFrame(() => {
          if (existingContent) {
            existingContent.style.transition = `transform ${duration}ms ease-out`;
            existingContent.style.transform = 'translateX(-30%)';
          }
          newContent.style.transition = `transform ${duration}ms ease-out`;
          newContent.style.transform = 'translateX(0)';
        });
      } else {
        // Pop
        newContent.style.transform = 'translateX(-30%)';
        this._container.insertBefore(newContent, existingContent);

        requestAnimationFrame(() => {
          if (existingContent) {
            existingContent.style.transition = `transform ${duration}ms ease-out`;
            existingContent.style.transform = 'translateX(100%)';
          }
          newContent.style.transition = `transform ${duration}ms ease-out`;
          newContent.style.transform = 'translateX(0)';
        });
      }
    } else if (this._transitionStyle === 'fade') {
      // Fade animation
      newContent.style.opacity = '0';
      this._container.appendChild(newContent);

      requestAnimationFrame(() => {
        if (existingContent) {
          existingContent.style.transition = `opacity ${duration}ms ease-out`;
          existingContent.style.opacity = '0';
        }
        newContent.style.transition = `opacity ${duration}ms ease-out`;
        newContent.style.opacity = '1';
      });
    }

    // Cleanup after animation
    setTimeout(() => {
      if (existingContent && existingContent.parentNode) {
        existingContent.remove();
      }
      newContent.style.position = 'relative';
      newContent.style.transform = '';
      newContent.style.transition = '';
    }, duration);
  }

  /**
   * Renders the NavigationStack
   *
   * @returns {HTMLDivElement} The rendered element
   * @protected
   */
  _render() {
    const wrapper = document.createElement('div');
    wrapper.dataset.view = 'NavigationStack';
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.overflow = 'hidden';

    // Content container
    this._container = document.createElement('div');
    this._container.style.position = 'relative';
    this._container.style.width = '100%';
    this._container.style.height = '100%';

    // Set navigation context
    const previousStack = _currentNavigationStack;
    _currentNavigationStack = this;

    // Render root view
    if (this._rootView instanceof View) {
      this._container.appendChild(this._rootView._render());
    } else if (typeof this._rootView === 'function') {
      const result = this._rootView();
      if (result instanceof View) {
        this._container.appendChild(result._render());
      }
    }

    // Restore previous context
    _currentNavigationStack = previousStack;

    wrapper.appendChild(this._container);

    return this._applyModifiers(wrapper);
  }
}

/**
 * NavigationLink - A view that controls navigation
 * @extends View
 */
class NavigationLinkView extends View {
  /**
   * Creates a NavigationLink
   *
   * @param {string|View} label - Label text or view
   * @param {View|Function} destination - Destination view or view builder
   * @param {Object} [options] - Link options
   */
  constructor(label, destination, options = {}) {
    super();
    this._label = label;
    this._destination = destination;
    this._title = options.title ?? '';
    this._isActive = false;
  }

  /**
   * Trigger navigation
   *
   * @private
   */
  _navigate() {
    const navStack = getCurrentNavigationStack();
    if (navStack) {
      const view = typeof this._destination === 'function'
        ? this._destination()
        : this._destination;
      navStack.push(view, this._title);
    }
  }

  /**
   * Renders the NavigationLink
   *
   * @returns {HTMLElement} The rendered element
   * @protected
   */
  _render() {
    const el = document.createElement('div');
    el.dataset.view = 'NavigationLink';
    el.style.cursor = 'pointer';

    // Render label
    if (this._label instanceof View) {
      el.appendChild(this._label._render());
    } else {
      el.textContent = String(this._label);
    }

    // Add click handler
    el.addEventListener('click', () => this._navigate());

    return this._applyModifiers(el);
  }
}

/**
 * BackButton - Standard back navigation button
 * @extends View
 */
class BackButtonView extends View {
  /**
   * Creates a BackButton
   *
   * @param {string} [label='Back'] - Button label
   */
  constructor(label = 'Back') {
    super();
    this._label = label;
  }

  /**
   * Renders the BackButton
   *
   * @returns {HTMLElement} The rendered element
   * @protected
   */
  _render() {
    const el = document.createElement('button');
    el.dataset.view = 'BackButton';
    el.textContent = `‹ ${this._label}`;
    el.style.background = 'transparent';
    el.style.border = 'none';
    el.style.color = 'inherit';
    el.style.cursor = 'pointer';
    el.style.fontSize = '16px';
    el.style.padding = '8px';

    el.addEventListener('click', () => {
      const navStack = getCurrentNavigationStack();
      if (navStack && navStack.canGoBack) {
        navStack.pop();
      }
    });

    return this._applyModifiers(el);
  }
}

/**
 * Factory function for NavigationStack
 *
 * @param {View|Function} root - Root view
 * @param {Object} [options] - Navigation options
 * @returns {NavigationStackView} A new NavigationStack instance
 */
export function NavigationStack(root, options) {
  return new NavigationStackView(root, options);
}

/**
 * Factory function for NavigationLink
 *
 * @param {string|View} label - Link label
 * @param {View|Function} destination - Destination view
 * @param {Object} [options] - Link options
 * @returns {NavigationLinkView} A new NavigationLink instance
 */
export function NavigationLink(label, destination, options) {
  return new NavigationLinkView(label, destination, options);
}

/**
 * Factory function for BackButton
 *
 * @param {string} [label] - Button label
 * @returns {BackButtonView} A new BackButton instance
 */
export function BackButton(label) {
  return new BackButtonView(label);
}

// Export classes
export { NavigationStackView, NavigationLinkView, BackButtonView };

export default { NavigationStack, NavigationLink, BackButton };
