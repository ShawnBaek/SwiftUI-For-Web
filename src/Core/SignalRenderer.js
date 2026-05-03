/**
 * SignalRenderer — fine-grained reactive mount for view descriptors.
 *
 * Replaces the deleted VDOM Reconciler. View bodies run once at mount;
 * subsequent state changes execute only the small effect closures bound
 * to specific DOM nodes via createEffect. No tree diff, no patches.
 *
 * The reactive control-flow primitives (Show, For) are registered as
 * regular type renderers in src/Core/Renderer.js so they Just Work when
 * nested inside any container's children. SignalRenderer wraps the whole
 * mount in createRoot — those handlers run their effects under that root.
 *
 * This module's remaining job is the post-render walk that wires
 * Text(() => ...) thunks to their textContent updates.
 */

import { render } from './Renderer.js';
import { releaseTree } from './ElementPool.js';
import { createRoot, createEffect, onCleanup } from '../Data/Signal.js';

/**
 * Mount a view tree into a container with fine-grained reactivity.
 *
 * @param {() => Object|Object} viewFactory - Returns the root descriptor.
 * @param {HTMLElement} container - Target container.
 * @returns {() => void} Disposer.
 */
export function mount(viewFactory, container) {
  let dispose;

  createRoot((d) => {
    dispose = d;

    const view = typeof viewFactory === 'function' ? viewFactory() : viewFactory;
    const element = render(view);
    bindReactive(element);

    const oldChild = container.firstChild;
    if (oldChild) releaseTree(oldChild);
    container.textContent = '';
    if (element) container.appendChild(element);

    onCleanup(() => {
      if (element && element.parentNode === container) {
        container.removeChild(element);
      }
      if (element) releaseTree(element);
    });
  });

  return dispose;
}

/**
 * Walk the rendered DOM tree and install reactive bindings for any
 * descriptor that carries one. Currently handles Text(() => ...).
 * Show/For are handled by their own Renderer handlers.
 *
 * @param {Node} element
 */
function bindReactive(element) {
  if (!element || element.nodeType !== 1) return;

  const desc = element._descriptor;
  if (desc) {
    if (desc.type === 'Text' && desc.props && typeof desc.props.contentThunk === 'function') {
      const thunk = desc.props.contentThunk;
      createEffect(() => {
        element.textContent = String(thunk() ?? '');
      });
    }
  }

  const kids = element.children;
  for (let i = 0; i < kids.length; i++) {
    bindReactive(kids[i]);
  }
}

export default { mount };
