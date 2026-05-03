/**
 * SignalRenderer — fine-grained reactive mount for view descriptors.
 *
 * Replaces the VDOM Reconciler's "rebuild and diff on every state change"
 * model with: mount once, then bind reactive expressions (e.g. Text(() => …))
 * to their target DOM nodes via createEffect. Subsequent state changes
 * execute only the small effect closures, never the view body.
 *
 * Phase 3 scope (MVP):
 *   - Reactive Text content via Text(() => ...) — implemented.
 *   - Reactive list/conditional rendering via Show/For/Switch — Phase 4.
 *   - Reactive modifier values (e.g. .foregroundColor(() => ...)) — deferred
 *     to Phase 5 when an example actually needs it (Counter doesn't).
 *
 * Reuses src/Core/Renderer.js for static element creation and the per-type
 * registry. After the eager render, we walk the DOM tree, find descriptors
 * with reactive bindings, and wrap the binding-apply step in createEffect.
 */

import { render } from './Renderer.js';
import { releaseTree } from './ElementPool.js';
import { createRoot, createEffect, onCleanup } from '../Data/Signal.js';

/**
 * Mount a view tree into a container with fine-grained reactivity.
 *
 * @param {() => Object|Object} viewFactory - A function that returns the root
 *   descriptor, or the descriptor itself. Function form is preferred so the
 *   factory runs inside the root tracking scope (any signal reads at the
 *   top-level become subscriptions of the mount).
 * @param {HTMLElement} container - Target container.
 * @returns {() => void} Disposer that tears down all effects + DOM.
 */
export function mount(viewFactory, container) {
  let dispose;

  createRoot((d) => {
    dispose = d;

    const view = typeof viewFactory === 'function' ? viewFactory() : viewFactory;
    const element = render(view);

    // Patch reactive bindings on the rendered tree.
    bindReactive(element);

    // Clear and append. Mirrors Reconciler.mount() semantics.
    const oldChild = container.firstChild;
    if (oldChild) releaseTree(oldChild);
    container.textContent = '';
    container.appendChild(element);

    // When the root is disposed, drop the DOM too.
    onCleanup(() => {
      if (element.parentNode === container) {
        container.removeChild(element);
      }
      releaseTree(element);
    });
  });

  return dispose;
}

/**
 * Walk a rendered DOM tree and install reactive bindings for any descriptor
 * that carries one. Currently handles:
 *
 *   Text(() => …)   →   effect that updates element.textContent
 *
 * Modifier thunks and Show/For/Switch are added in later phases.
 *
 * @param {HTMLElement} element
 */
function bindReactive(element) {
  if (!element || element.nodeType !== 1) return; // Element nodes only

  const desc = element._descriptor;
  if (desc) {
    if (desc.type === 'Text' && desc.props && typeof desc.props.contentThunk === 'function') {
      const thunk = desc.props.contentThunk;
      createEffect(() => {
        element.textContent = String(thunk() ?? '');
      });
    }
  }

  // Recurse into children.
  const kids = element.children;
  for (let i = 0; i < kids.length; i++) {
    bindReactive(kids[i]);
  }
}

export default { mount };
