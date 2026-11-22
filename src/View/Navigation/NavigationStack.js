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
 *
 * // Or with a NavigationPath and destinations per data type
 * const path = new NavigationPath();
 * NavigationStack(MovieListView(), { path })
 *   .navigationDestination('movie', (movie) => MovieDetailView(movie));
 * path.append({ type: 'movie', id: 7 });
 */

import { createDescriptor, isView } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render } from '../../Core/Renderer.js';
import { createOwnedSlot } from '../../Core/OwnedSlot.js';
import { releaseTree, onRelease } from '../../Core/ElementPool.js';
import { removeWithTransition } from '../../Animation/Animation.js';
import { getOwner, onCleanup } from '../../Data/Signal.js';
import { NavigationDestination } from './NavigationPath.js';

/**
 * The navigation stack whose content is rendering now (read by
 * NavigationLink and BackButton while they render).
 */
let _currentNavigationStack = null;

/**
 * Get the current navigation stack (used by NavigationLink)
 *
 * @returns {Object|null} Its navigator: push, pop, popToRoot, depth, canGoBack
 */
export function getCurrentNavigationStack() {
  return _currentNavigationStack;
}

// Render a screen (a view, or a function returning one) with `nav` as the
// current stack.
function renderScreen(nav, entry) {
  const previous = _currentNavigationStack;
  _currentNavigationStack = nav;
  try {
    const view = typeof entry === 'function' && !isView(entry) ? entry() : entry;
    return isView(view) ? render(view) : null;
  } finally {
    _currentNavigationStack = previous;
  }
}

// The imperative side of a NavigationStack, shared by every descriptor made
// from the same NavigationStack(...) call.
function createNavigator(root, options) {
  const path = options.path ?? null;
  const nav = {
    stack: [], // { view, title }
    container: null,
    slot: null,
    destinations: [],
    push(view, title = '', animated = true) {
      nav.stack.push({ view, title });
      transition(nav, 'push', animated);
    },
    pop(animated = true) {
      if (nav.stack.length === 0) return null;
      // With a NavigationPath the path is the truth; removing its last value
      // pops the screen.
      if (path) return path.removeLast();
      const popped = nav.stack.pop();
      transition(nav, 'pop', animated);
      return popped;
    },
    popToRoot(animated = true) {
      if (nav.stack.length === 0) return;
      if (path) return path.clear();
      nav.stack = [];
      transition(nav, 'pop', animated);
    },
    get depth() {
      return nav.stack.length;
    },
    get canGoBack() {
      return nav.stack.length > 0;
    },
    root,
    path,
    transitionStyle: options.transitionStyle ?? 'slide',
    duration: options.transitionDuration ?? 300,
  };
  return nav;
}

// One screen per path value, built by the first matching destination.
function screensForPath(nav) {
  return nav.path.path.map((value) => ({
    view: () => nav.destinations.find((destination) => destination.matches(value))?.build(value) ?? null,
    title: '',
  }));
}

/**
 * NavigationStack(root, options?)
 *
 * @param {View|Function} root - Root view, or a function returning it
 * @param {Object} [options]
 * @param {string} [options.transitionStyle='slide'] - 'slide', 'fade' or 'none'
 * @param {number} [options.transitionDuration=300] - In milliseconds
 * @param {NavigationPath} [options.path] - Values shown above the root,
 *   built by `.navigationDestination(for:destination:)`
 * @returns {Object} Chainable view descriptor with push, pop, popToRoot,
 *   depth and canGoBack
 */
export function NavigationStack(root, options = {}) {
  const nav = createNavigator(root, options);
  return chainable(createDescriptor('NavigationStack', { nav, destinations: [] }), ({ descriptor, withProps }) => ({
    push: nav.push,
    pop: nav.pop,
    popToRoot: nav.popToRoot,
    get depth() {
      return nav.depth;
    },
    get canGoBack() {
      return nav.canGoBack;
    },
    // The view for a path value of a type: a typeof name, a `type` field's
    // value, or a class.
    navigationDestination: (dataType, destination) => withProps({
      destinations: [...descriptor.props.destinations, new NavigationDestination(dataType, destination)],
    }),
  }));
}

registerRenderer('NavigationStack', ({ nav, destinations }) => {
  const wrapper = document.createElement('div');
  wrapper.dataset.view = 'NavigationStack';
  wrapper.style.position = 'relative';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  wrapper.style.overflow = 'hidden';

  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.width = '100%';
  container.style.height = '100%';
  nav.container = container;
  nav.destinations = destinations;

  // One slot owns whichever screen is visible: the top one now, and each
  // pushed or popped screen later (see transition).
  nav.slot = createOwnedSlot();
  if (nav.path) {
    nav.stack = screensForPath(nav);
    // The path changes: show its last value's screen.
    const unsubscribe = nav.path.subscribe(() => {
      const direction = nav.path.count >= nav.stack.length ? 'push' : 'pop';
      nav.stack = screensForPath(nav);
      transition(nav, direction, true);
    });
    // Unsubscribe with the owner; rendered outside any owner, unsubscribe
    // when the stack's element is released instead, so the path doesn't keep
    // a detached stack alive.
    if (getOwner()) onCleanup(unsubscribe);
    else onRelease(wrapper, unsubscribe);
  }
  const top = nav.stack[nav.stack.length - 1];
  const rendered = nav.slot.render(() => renderScreen(nav, top ? top.view : nav.root));
  if (rendered) container.appendChild(rendered);

  wrapper.appendChild(container);
  return wrapper;
});

// Screens being removed by their own .transition; their removal callback
// releases them, so the slide cleanup must not release them a second time.
const _leaving = new WeakSet();

// Show the top screen, sliding or fading it in.
function transition(nav, direction, animated) {
  const { container, slot } = nav;
  if (!container || !slot || slot.isDisposed()) return;
  const top = nav.stack[nav.stack.length - 1];

  const newContent = document.createElement('div');
  // removeWithTransition looks through this wrapper for the screen's view.
  newContent.dataset.navigationScreen = '';
  newContent.style.position = 'absolute';
  newContent.style.top = '0';
  newContent.style.left = '0';
  newContent.style.width = '100%';
  newContent.style.height = '100%';

  // Push and pop run from event handlers, outside any owner; the slot
  // disposes the previous screen's effects and keeps the new screen's
  // effects owned until the next transition or unmount.
  const rendered = slot.render(() => renderScreen(nav, top ? top.view : nav.root));
  if (rendered) newContent.appendChild(rendered);

  if (!animated || nav.transitionStyle === 'none') {
    // No animation. The slot already disposed the previous screen's
    // effects, so its elements can go back to the pool, after the screen's
    // own .transition removal if it has one: it then lies over the incoming
    // screen until the animation ends.
    for (const child of Array.from(container.children)) {
      const release = () => {
        if (child.parentNode) child.parentNode.removeChild(child);
        releaseTree(child);
      };
      if (removeWithTransition(child, release)) {
        _leaving.add(child);
        Object.assign(child.style, { position: 'absolute', top: '0', left: '0', width: '100%' });
      } else {
        release();
      }
    }
    container.appendChild(newContent);
    newContent.style.position = 'relative';
    nav.currentScreen = newContent;
    return;
  }

  // The visible screen: the last one shown, or the first render's screen.
  const existingContent = nav.currentScreen && nav.currentScreen.parentNode === container
    ? nav.currentScreen
    : container.lastElementChild;
  nav.currentScreen = newContent;
  const duration = nav.duration;
  const animate = (property, from, to, existingTo) => {
    newContent.style[property] = from;
    requestAnimationFrame(() => {
      // A cleanup that ran first (a hidden page delays frames, not timers)
      // may have released these elements to the pool: leave them alone.
      if (existingContent && existingContent.parentNode === container) {
        existingContent.style.transition = `${property} ${duration}ms ease-out`;
        existingContent.style[property] = existingTo;
      }
      if (newContent.parentNode !== container) return;
      newContent.style.transition = `${property} ${duration}ms ease-out`;
      newContent.style[property] = to;
    });
  };

  if (nav.transitionStyle === 'fade') {
    container.appendChild(newContent);
    animate('opacity', '0', '1', '0');
  } else if (direction === 'push') {
    container.appendChild(newContent);
    animate('transform', 'translateX(100%)', 'translateX(0)', 'translateX(-30%)');
  } else {
    container.insertBefore(newContent, existingContent);
    animate('transform', 'translateX(-30%)', 'translateX(0)', 'translateX(100%)');
  }

  // Cleanup after the animation. If the stack was disposed meanwhile (the
  // app unmounted), its elements went back to the pool and may already
  // belong to another view, so leave them alone. If another transition
  // started meanwhile, its own cleanup runs later and removes this screen.
  // Otherwise remove every other layer, not only the one this transition
  // slid out: two pushes within the duration leave the middle screen too.
  setTimeout(() => {
    if (slot.isDisposed() || nav.currentScreen !== newContent) return;
    for (const child of Array.from(container.children)) {
      if (child === newContent || _leaving.has(child)) continue;
      child.remove();
      releaseTree(child);
    }
    if (newContent.parentNode === container) {
      newContent.style.position = 'relative';
      newContent.style.transform = '';
      newContent.style.transition = '';
    }
  }, duration);
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
 * NavigationLink(label, destination, { title, url }?)
 *
 * A native element, so the link is focusable and keyboard-operable (#51):
 * `<a href>` when the destination has a URL (it can be opened in a new tab,
 * copied and crawled; a plain click still navigates in place), otherwise a
 * `<button>`.
 *
 * @param {string|View} label - Label text or view
 * @param {View|Function} destination - Destination view or view builder
 * @param {Object} [options]
 * @param {string} [options.title] - Title shown for the destination
 * @param {string} [options.url] - URL of the destination
 * @returns {Object} Chainable view descriptor
 */
export function NavigationLink(label, destination, options = {}) {
  return chainable(createDescriptor('NavigationLink', {
    label,
    destination,
    title: options.title ?? '',
    url: safeLinkURL(options.url),
  }));
}

registerRenderer('NavigationLink', ({ label, destination, title, url }) => {
  // The stack context only exists while the stack renders, so capture it
  // now; a click arrives after rendering has finished.
  const navStack = getCurrentNavigationStack();
  const el = document.createElement(url ? 'a' : 'button');
  el.dataset.view = 'NavigationLink';
  if (url) {
    el.setAttribute('href', String(url));
  } else {
    el.setAttribute('type', 'button');
    // Undo the user-agent button look so the label renders as before.
    // No width: inside the framework's flex containers (stacks, List rows)
    // a <button> sizes exactly like a <div>, while width:100% would
    // stretch links in centered stacks and rows. Only a block-flow parent
    // differs (a width:auto button shrinks to its content); use
    // .frame(maxWidth: Infinity) there.
    Object.assign(el.style, { background: 'none', border: '0', padding: '0', margin: '0', font: 'inherit', textAlign: 'inherit' });
  }
  el.style.display = 'block';
  el.style.color = 'inherit';
  el.style.textDecoration = 'none';
  el.style.cursor = 'pointer';

  if (isView(label)) el.appendChild(render(label));
  else el.textContent = String(label);

  el.addEventListener('click', (event) => {
    if (url) {
      // Let the browser handle new-tab and download gestures on a URL link.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (event.button ?? 0) !== 0) return;
      event.preventDefault?.();
    }
    const stack = navStack ?? getCurrentNavigationStack();
    stack?.push(typeof destination === 'function' ? destination() : destination, title);
  });

  return el;
});

/**
 * BackButton(label = 'Back'): pops the enclosing NavigationStack.
 */
export function BackButton(label = 'Back') {
  return chainable(createDescriptor('BackButton', { label }));
}

registerRenderer('BackButton', ({ label }) => {
  const navStack = getCurrentNavigationStack();
  const el = document.createElement('button');
  el.dataset.view = 'BackButton';
  el.textContent = `‹ ${label}`;
  el.style.background = 'transparent';
  el.style.border = 'none';
  el.style.color = 'inherit';
  el.style.cursor = 'pointer';
  el.style.fontSize = '16px';
  el.style.padding = '8px';
  el.addEventListener('click', () => {
    const stack = navStack ?? getCurrentNavigationStack();
    if (stack?.canGoBack) stack.pop();
  });
  return el;
});

export default { NavigationStack, NavigationLink, BackButton };
