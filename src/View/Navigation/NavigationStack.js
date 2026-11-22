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
import { isDescriptor } from '../../Core/ViewDescriptor.js';
import { render as renderDescriptor } from '../../Core/Renderer.js';
import { State } from '../../Data/State.js';
import { createOwnedSlot } from '../../Core/OwnedSlot.js';
import { releaseChildren, releaseTree } from '../../Core/ElementPool.js';

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
 * Render a stack entry: a legacy View, a view descriptor (`VStack(...)`,
 * `Text(...)`), or a function returning either (#48).
 *
 * @param {View|Object|Function} entry
 * @returns {HTMLElement|null}
 */
function renderStackView(entry) {
  const view = typeof entry === 'function' && !(entry instanceof View) && !isDescriptor(entry)
    ? entry()
    : entry;
  if (view instanceof View) return view._render();
  if (isDescriptor(view)) return renderDescriptor(view);
  return null;
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

    if (!this._contentSlot || this._contentSlot.isDisposed()) return;

    // Set navigation context for NavigationLinks
    const previousStack = _currentNavigationStack;
    _currentNavigationStack = this;

    // Render the view. Push and pop run from event handlers, outside any
    // owner; the slot disposes the previous screen's effects and keeps the
    // new screen's effects owned until the next transition or unmount.
    const rendered = this._contentSlot.render(() => renderStackView(currentView));
    if (rendered) newContent.appendChild(rendered);

    // Restore previous context
    _currentNavigationStack = previousStack;

    if (!animated || this._transitionStyle === 'none') {
      // No animation. The slot already disposed the previous screen's
      // effects, so its elements can go back to the pool.
      releaseChildren(this._container);
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

    // Cleanup after animation. If the stack was disposed meanwhile (the app
    // unmounted), its elements went back to the pool and may already belong
    // to another view, so leave them alone.
    const container = this._container;
    const slot = this._contentSlot;
    setTimeout(() => {
      if (slot.isDisposed()) return;
      if (existingContent && existingContent.parentNode === container) {
        existingContent.remove();
        releaseTree(existingContent);
      }
      if (newContent.parentNode === container) {
        newContent.style.position = 'relative';
        newContent.style.transform = '';
        newContent.style.transition = '';
      }
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

    // One slot owns whichever screen is visible: the root now, and each
    // pushed or popped screen later (see _animateTransition).
    this._contentSlot = createOwnedSlot();

    // Set navigation context
    const previousStack = _currentNavigationStack;
    _currentNavigationStack = this;

    // Render root view
    const rendered = this._contentSlot.render(() => renderStackView(this._rootView));
    if (rendered) this._container.appendChild(rendered);

    // Restore previous context
    _currentNavigationStack = previousStack;

    wrapper.appendChild(this._container);

    return this._applyModifiers(wrapper);
  }
}

// Schemes a link may navigate to. Anything else with a scheme (javascript:,
// data:, vbscript:, …) is dropped, so a URL built from user data can't run
// script when the link is opened in a new tab or without JavaScript.
const SAFE_LINK_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function safeLinkURL(url) {
  if (url === null || url === undefined || url === '') return null;
  const value = String(url).trim();
  // Browsers ignore ASCII whitespace and control characters inside a scheme
  // ("java\tscript:"), so strip them before reading it.
  const compact = value.replace(/[\u0000-\u0020\u007f]/g, '');
  const scheme = compact.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
  if (!scheme) return value; // relative URL, path, query or fragment
  if (SAFE_LINK_SCHEMES.has(`${scheme.toLowerCase()}:`)) return value;
  if (typeof console !== 'undefined') {
    console.warn(`SwiftUI-For-Web: NavigationLink ignored a "${scheme}:" URL; it renders as a button.`);
  }
  return null;
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
   * @param {string} [options.title] - Title shown for the destination
   * @param {string} [options.url] - URL of the destination. When given, the
   *   link renders as `<a href>` so it can be opened in a new tab, copied and
   *   crawled; a plain click still navigates in place.
   */
  constructor(label, destination, options = {}) {
    super();
    this._label = label;
    this._destination = destination;
    this._title = options.title ?? '';
    this._url = safeLinkURL(options.url);
    this._isActive = false;
  }

  /**
   * Trigger navigation
   *
   * @private
   */
  _navigate(navStack = getCurrentNavigationStack()) {
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
    // #51: a native element, so the link is focusable and keyboard-operable.
    // `<a href>` when the destination has a URL, otherwise `<button>`.
    // The stack context only exists while the stack renders, so capture it
    // now; a click arrives after rendering has finished.
    const navStack = getCurrentNavigationStack();
    const el = document.createElement(this._url ? 'a' : 'button');
    el.dataset.view = 'NavigationLink';
    if (this._url) {
      el.setAttribute('href', String(this._url));
    } else {
      el.setAttribute('type', 'button');
      // Undo the user-agent button look so the label renders as before.
      el.style.background = 'none';
      el.style.border = '0';
      el.style.padding = '0';
      el.style.margin = '0';
      el.style.font = 'inherit';
      el.style.textAlign = 'inherit';
      // No width: inside the framework's flex containers (stacks, List rows)
      // a <button> sizes exactly like the <div> it replaces, while width:100%
      // would stretch links in centered stacks and rows. Only a block-flow
      // parent differs (a width:auto button shrinks to its content); use
      // .frame(maxWidth: Infinity) there.
    }
    el.style.display = 'block';
    el.style.color = 'inherit';
    el.style.textDecoration = 'none';
    el.style.cursor = 'pointer';

    // Render label
    if (this._label instanceof View) {
      el.appendChild(this._label._render());
    } else if (isDescriptor(this._label)) {
      el.appendChild(renderDescriptor(this._label));
    } else {
      el.textContent = String(this._label);
    }

    el.addEventListener('click', (event) => {
      // Let the browser handle new-tab and download gestures on a URL link.
      if (this._url && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (event.button ?? 0) !== 0)) {
        return;
      }
      if (this._url) event.preventDefault?.();
      this._navigate(navStack ?? getCurrentNavigationStack());
    });

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
