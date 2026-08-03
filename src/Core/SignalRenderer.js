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
import { ModifierType } from './ViewDescriptor.js';
import { releaseTree } from './ElementPool.js';
import { initDelegation, teardownDelegation } from './EventDelegate.js';
import { createRoot, createEffect, onCleanup, untrack } from '../Data/Signal.js';

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

    for (const modifier of desc.modifiers || []) {
      installReactiveModifier(element, modifier);
    }
  }

  const kids = element.children;
  for (let i = 0; i < kids.length; i++) {
    bindReactive(kids[i]);
  }
}

/**
 * Install a modifier whose behavior depends on State or Binding reads.
 * Exported so legacy View subclasses can share the same semantics.
 *
 * @param {HTMLElement} element
 * @param {{type: string, value: *}} modifier
 */
export function installReactiveModifier(element, modifier) {
  if (!element || !modifier) return;

  switch (modifier.type) {
    case ModifierType.ON_CHANGE:
      installOnChange(modifier.value);
      break;
    case ModifierType.SEARCHABLE:
      installSearchable(element, modifier.value);
      break;
    case ModifierType.SHEET:
      installSheet(element, modifier.value);
      break;
  }
}

function readValue(source) {
  if (typeof source === 'function') return source();
  if (source && typeof source === 'object' && 'value' in source) return source.value;
  return source;
}

function writeValue(binding, value) {
  if (binding && typeof binding === 'object' && 'value' in binding) {
    binding.value = value;
  }
}

function installOnChange(value) {
  const { of, optionsOrAction, action: explicitAction } = value || {};
  const options = typeof optionsOrAction === 'object' && optionsOrAction !== null
    ? optionsOrAction
    : {};
  const action = typeof optionsOrAction === 'function' ? optionsOrAction : explicitAction;
  if (typeof action !== 'function') return;

  let isInitialRead = true;
  let previousValue;
  createEffect(() => {
    const currentValue = readValue(of);
    if (isInitialRead) {
      isInitialRead = false;
      previousValue = currentValue;
      if (options.initial === true) {
        untrack(() => action(currentValue, currentValue));
      }
      return;
    }
    if (Object.is(previousValue, currentValue)) return;
    const oldValue = previousValue;
    previousValue = currentValue;
    untrack(() => action(oldValue, currentValue));
  });
}

function installSearchable(element, value) {
  const binding = value?.text;
  if (!binding || typeof binding !== 'object' || !('value' in binding)) return;

  const options = value.options || {};
  const prompt = String(options.prompt ?? 'Search');
  const placement = String(options.placement ?? 'automatic');
  const search = document.createElement('div');
  search.dataset.view = 'SearchField';
  search.dataset.searchFieldPlacement = placement;
  search.classList.add('swiftui-searchable');
  search.setAttribute('role', 'search');

  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = prompt;
  input.setAttribute('aria-label', String(options.accessibilityLabel ?? prompt));
  input.setAttribute('enterkeyhint', 'search');
  input.autocomplete = options.autocomplete ?? 'off';
  input.dataset.view = 'SearchFieldInput';
  input.classList.add('swiftui-searchable-input');
  input.style.boxSizing = 'border-box';
  input.style.width = '100%';
  input.style.minWidth = '0';
  search.appendChild(input);

  const handleInput = (event) => {
    untrack(() => writeValue(binding, event.target.value));
  };
  input.addEventListener('input', handleInput);
  if (typeof element.insertBefore === 'function') {
    element.insertBefore(search, element.firstChild || null);
  } else {
    element.appendChild(search);
  }

  createEffect(() => {
    const desired = String(readValue(binding) ?? '');
    if (input.value !== desired) input.value = desired;
  });

  onCleanup(() => {
    input.removeEventListener?.('input', handleInput);
    search.remove?.();
  });
}

function sheetOptions(value) {
  const second = value?.optionsOrContent;
  if (typeof second === 'function') {
    return { content: second, onDismiss: null };
  }
  const options = second && typeof second === 'object' ? second : {};
  return {
    content: typeof value?.content === 'function' ? value.content : options.content,
    onDismiss: typeof options.onDismiss === 'function' ? options.onDismiss : null
  };
}

function installSheet(element, value) {
  const binding = value?.isPresented;
  const options = sheetOptions(value);
  if (!binding || typeof binding !== 'object' || !('value' in binding) || typeof options.content !== 'function') return;

  let dialog = null;
  let sheetHost = null;
  let sheetDispose = null;
  let wasPresented = false;
  let focusBeforePresentation = null;

  const dismissElement = () => {
    if (sheetDispose) {
      sheetDispose();
      sheetDispose = null;
    }
    if (sheetHost) {
      teardownDelegation(sheetHost);
      sheetHost = null;
    }
    if (dialog) {
      const oldDialog = dialog;
      dialog = null;
      if (oldDialog.open && typeof oldDialog.close === 'function') oldDialog.close();
      oldDialog.remove?.();
    }
  };

  const requestDismiss = () => {
    untrack(() => writeValue(binding, false));
  };

  const present = () => {
    focusBeforePresentation = document.activeElement;
    dialog = document.createElement('dialog');
    dialog.dataset.view = 'Sheet';
    dialog.classList.add('swiftui-sheet');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const host = document.createElement('div');
    host.dataset.view = 'SheetContent';
    host.classList.add('swiftui-sheet-content');
    dialog.appendChild(host);
    sheetHost = host;

    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      requestDismiss();
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) requestDismiss();
    });
    document.body.appendChild(dialog);
    initDelegation(host);
    sheetDispose = mount(() => options.content(), host);

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');

    queueMicrotask(() => {
      const focusTarget = dialog?.querySelector?.(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      (focusTarget || dialog)?.focus?.({ preventScroll: true });
    });
  };

  createEffect(() => {
    const isPresented = Boolean(readValue(binding));
    if (isPresented && !wasPresented) {
      present();
    } else if (!isPresented && wasPresented) {
      dismissElement();
      if (focusBeforePresentation?.isConnected) {
        focusBeforePresentation.focus?.({ preventScroll: true });
      }
      focusBeforePresentation = null;
      if (options.onDismiss) untrack(options.onDismiss);
    }
    wasPresented = isPresented;
  });

  onCleanup(() => {
    dismissElement();
    wasPresented = false;
    focusBeforePresentation = null;
  });
}

export default { mount };
