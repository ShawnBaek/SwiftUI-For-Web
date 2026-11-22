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
 * Text(() => ...) thunks and reactive modifiers are bound by Renderer.render
 * while each element is built, under the current owner. This module mounts
 * the tree and implements the reactive modifiers (onChange, task, searchable,
 * sheet) that the renderer and legacy View subclasses install.
 */

import { buildingView, DEV_BUILD } from './Dev.js';
import { nextElementId } from './ElementID.js';
import { withEnvironment, EnvironmentValues } from '../Data/Environment.js';
import { render } from './Renderer.js';
import { ModifierType } from './ViewDescriptor.js';
import { releaseTree } from './ElementPool.js';
import { initDelegation, teardownDelegation } from './EventDelegate.js';
import {
  onAppear as lifecycleOnAppear,
  onDisappear as lifecycleOnDisappear,
  cancelAppear
} from './LifecycleObserver.js';
import { createRoot, createEffect, onCleanup, untrack, getOwner } from '../Data/Signal.js';

/**
 * Mount a view tree into a container with fine-grained reactivity.
 *
 * @param {() => Object|Object} viewFactory - Returns the root descriptor.
 * @param {HTMLElement} container - Target container.
 * @returns {() => void} Disposer.
 */
export function mount(viewFactory, container, options = {}) {
  let dispose;

  createRoot((d) => {
    dispose = d;

    const view = typeof viewFactory === 'function' ? buildingView(viewFactory) : viewFactory;
    const element = render(view);

    if (options.replace && typeof container.replaceChildren === 'function') {
      // adopt: compare with the server markup and remember focus first.
      const focusPath = options.adopt ? adoptPrepare(container, element) : null;
      // Swap the host's static fallback for the view in one step (#39).
      if (element) container.replaceChildren(element);
      else container.replaceChildren();
      if (focusPath) restoreFocus(container, focusPath);
    } else {
      const oldChild = container.firstChild;
      if (oldChild) releaseTree(oldChild);
      container.textContent = '';
      if (element) container.appendChild(element);
    }

    onCleanup(() => {
      if (element && element.parentNode === container) {
        container.removeChild(element);
      }
      if (element) releaseTree(element);
    });
  });

  return dispose;
}

// ---------------------------------------------------------------------------
// mount mode 'adopt' (#39)
// ---------------------------------------------------------------------------

// Tag, sorted attributes and text: the parts server and client markup must
// share. Not style (serializers format it differently) and not generated
// ids or the attributes that reference them (counters differ per page).
const UNCOMPARED = new Set(['style', 'id', 'for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant']);
// Form state is compared as properties: one side may set the property and
// the other the attribute.
const FORM_STATE = new Set(['value', 'checked', 'selected']);
const FORM_TAGS = new Set(['input', 'textarea', 'select', 'option']);

function signature(node) {
  if (!node) return '';
  if (node.nodeType === 3) return (node.textContent || node.data || '').trim() ? `#${(node.textContent ?? node.data).trim()}` : '';
  if (node.nodeType !== 1) return '';
  const tag = String(node.tagName).toLowerCase();
  const form = FORM_TAGS.has(tag);
  const attributes = (node.getAttributeNames?.() ?? [])
    .filter((name) => !UNCOMPARED.has(name) && !(form && FORM_STATE.has(name)))
    .sort()
    .map((name) => `${name}=${node.getAttribute(name)}`);
  if (form) {
    if (tag === 'option') attributes.push(`:selected=${Boolean(node.selected)}`);
    else if (node.type === 'checkbox' || node.type === 'radio') attributes.push(`:checked=${Boolean(node.checked)}`);
    else attributes.push(`:value=${node.value ?? ''}`);
  }
  return `<${tag} ${attributes.join(' ')}>`;
}

function firstDifference(server, client, path = 'root') {
  if (signature(server) !== signature(client)) return `${path}: server ${signature(server) || '(none)'} vs client ${signature(client) || '(none)'}`;
  const a = Array.from(server?.childNodes || []).filter((n) => signature(n));
  const b = Array.from(client?.childNodes || []).filter((n) => signature(n));
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const difference = firstDifference(a[i], b[i], `${path} > ${i}`);
    if (difference) return difference;
  }
  return null;
}

function pathTo(container, node) {
  const path = [];
  for (let current = node; current && current !== container; current = current.parentNode) {
    const parent = current.parentNode;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.children || [], current));
  }
  return path;
}

function adoptPrepare(container, element) {
  if (DEV_BUILD) {
    // Compare every top-level node the server rendered with the client's.
    const serverRoot = { nodeType: 0, childNodes: Array.from(container.childNodes || []) };
    const clientRoot = { nodeType: 0, childNodes: element ? [element] : [] };
    const difference = firstDifference(serverRoot, clientRoot);
    if (difference) {
      console.warn(`SwiftUI-For-Web: mount(host, { mode: 'adopt' }) found client markup that differs from the server markup at ${difference}. Render both from the same state.`);
    }
  }
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  return active && container.contains?.(active) ? pathTo(container, active) : null;
}

function restoreFocus(container, path) {
  let node = container;
  for (const index of path) {
    node = node?.children?.[index];
    if (!node) return;
  }
  node.focus?.({ preventScroll: true });
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
    case ModifierType.TASK:
      installTask(element, modifier.value);
      break;
    case ModifierType.SEARCHABLE:
      installSearchable(element, modifier.value);
      break;
    case ModifierType.SHEET:
      installSheet(element, modifier.value);
      break;
    case ModifierType.PRESENTATION:
      installPresentation(element, modifier.value?.kind, modifier.value);
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

/**
 * `.task(_:)` and `.task(id:_:)`: asynchronous work tied to the view's
 * lifetime. The action starts when the element appears and is cancelled when
 * the element disappears or its owner is disposed. With an `id`, a change of
 * the id cancels the running action and starts a new one.
 *
 * The action receives an AbortSignal, the JavaScript counterpart of Swift's
 * task cancellation: `signal.aborted` is `Task.isCancelled`, and
 * `signal.throwIfAborted()` is `Task.checkCancellation()`. An error the action
 * throws after it was cancelled is ignored; any other error is reported.
 *
 * @see https://developer.apple.com/documentation/swiftui/view/task(priority:_:)
 * @see https://developer.apple.com/documentation/swiftui/view/task(id:priority:_:)
 */
function installTask(element, value) {
  const { optionsOrAction, action: explicitAction } = value || {};
  const options = typeof optionsOrAction === 'object' && optionsOrAction !== null
    ? optionsOrAction
    : {};
  const action = typeof optionsOrAction === 'function' ? optionsOrAction : explicitAction;
  if (typeof action !== 'function') return;

  const owned = Boolean(getOwner());
  let controller = null;
  let visible = false;
  let disposed = false;

  const report = (error, signal) => {
    if (!signal.aborted) console.error('task action error:', error);
  };
  const cancel = () => {
    if (!controller) return;
    const running = controller;
    controller = null;
    running.abort();
  };
  const start = () => {
    cancel();
    const current = new AbortController();
    controller = current;
    try {
      const result = action(current.signal);
      if (result && typeof result.then === 'function') {
        result.then(undefined, (error) => report(error, current.signal));
      }
    } catch (error) {
      report(error, current.signal);
    }
  };
  const appear = () => {
    if (disposed || visible) return;
    visible = true;
    start();
    lifecycleOnDisappear(element, disappear);
  };
  const disappear = () => {
    if (!visible) return;
    visible = false;
    cancel();
    // The view can appear again while its owner is alive (for example when a
    // container re-attaches its content), and the task then starts again.
    if (owned && !disposed) lifecycleOnAppear(element, appear);
  };

  lifecycleOnAppear(element, appear);
  if (!owned) return;

  if ('id' in options) {
    let isInitialRead = true;
    let previousID;
    createEffect(() => {
      const id = readValue(options.id);
      if (isInitialRead) {
        isInitialRead = false;
        previousID = id;
        return;
      }
      if (Object.is(previousID, id)) return;
      previousID = id;
      if (visible) untrack(start);
    });
  }

  onCleanup(() => {
    disposed = true;
    visible = false;
    cancel();
    cancelAppear(element);
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

// ---------------------------------------------------------------------------
// Presentations (#38): .sheet, .fullScreenCover, .alert and
// .confirmationDialog share one controller built on <dialog>.showModal(),
// which makes the page inert and traps focus. The controller adds scroll
// lock, focus return to the presenter, a stack for nested presentations and
// the `dismiss` environment value. The isPresented binding is the single
// source of truth: Escape, a backdrop click (sheet, cover, dialog) and an
// action all write false, and onDismiss runs once when it turns false.
// ---------------------------------------------------------------------------

const presentationStack = [];
let savedScrollStyle = null;

function lockScroll() {
  if (presentationStack.length !== 1 || typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root?.style) return;
  savedScrollStyle = root.style.overflow;
  root.style.overflow = 'hidden';
}

function unlockScroll() {
  if (presentationStack.length !== 0 || savedScrollStyle === null) return;
  const root = document.documentElement;
  if (root?.style) root.style.overflow = savedScrollStyle;
  savedScrollStyle = null;
}

function presentationOptions(kind, value) {
  if (kind === 'sheet' || kind === 'fullScreenCover') return sheetOptions(value);
  const options = value?.options && typeof value.options === 'object' ? value.options : {};
  return {
    title: value?.title ?? '',
    actions: options.actions,
    message: options.message,
    titleVisibility: options.titleVisibility ?? 'automatic',
    onDismiss: typeof options.onDismiss === 'function' ? options.onDismiss : null,
  };
}

// Alert and confirmation dialog actions: Button descriptors (with an
// optional role in their props) or plain { title, role, action } objects,
// given directly or by a builder function.
function normalizeActions(actions) {
  const list = (typeof actions === 'function' ? actions() : actions) ?? [];
  return (Array.isArray(list) ? list : [list]).flat().filter(Boolean).map((item) => {
    if (item && item.type === 'Button' && item.props) {
      return { label: item.props.label, children: item.children, role: item.props.role ?? null, action: item.props.action };
    }
    return { label: item.title ?? item.label ?? '', children: [], role: item.role ?? null, action: item.action };
  });
}

function buildMessageContent(kind, options, requestDismiss, titleId, messageId) {
  return () => {
    const parts = [];
    const panel = document.createElement('div');
    panel.dataset.view = kind === 'alert' ? 'Alert' : 'ConfirmationDialog';
    panel.classList.add('swiftui-alert-panel');
    const showTitle = options.title && !(kind === 'confirmationDialog' && options.titleVisibility === 'hidden');
    if (showTitle) {
      const title = document.createElement('h2');
      title.id = titleId;
      title.classList.add('swiftui-alert-title');
      title.textContent = String(options.title);
      parts.push(title);
    }
    if (options.message) {
      const message = document.createElement('div');
      message.id = messageId;
      message.classList.add('swiftui-alert-message');
      const content = typeof options.message === 'function' ? options.message() : options.message;
      if (typeof content === 'string') message.textContent = content;
      else if (content) message.appendChild(render(content));
      parts.push(message);
    }
    let actions = normalizeActions(options.actions);
    if (actions.length === 0) actions = [{ label: 'OK', children: [], role: 'cancel', action: null }];
    const row = document.createElement('div');
    row.classList.add('swiftui-alert-actions');
    for (const spec of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('swiftui-alert-action');
      if (spec.role) button.dataset.role = spec.role;
      if (typeof spec.label === 'string' && spec.label) button.textContent = spec.label;
      else if (spec.label) button.appendChild(render(spec.label));
      for (const child of spec.children || []) button.appendChild(render(child));
      button.addEventListener('click', () => {
        requestDismiss();
        if (typeof spec.action === 'function') untrack(spec.action);
      });
      row.appendChild(button);
    }
    parts.push(row);
    for (const part of parts) panel.appendChild(part);
    return { element: panel, hasTitle: Boolean(showTitle), cancel: actions.find((spec) => spec.role === 'cancel') ?? null };
  };
}

function installPresentation(element, kind, value) {
  const binding = value?.isPresented;
  const options = presentationOptions(kind, value);
  const isMessage = kind === 'alert' || kind === 'confirmationDialog';
  if (!binding || typeof binding !== 'object' || !('value' in binding)) return;
  if (!isMessage && typeof options.content !== 'function') return;

  let dialog = null;
  let host = null;
  let contentDispose = null;
  let wasPresented = false;
  let focusBeforePresentation = null;
  let cancelAction = null;

  const requestDismiss = () => {
    untrack(() => writeValue(binding, false));
  };

  const dismissElement = () => {
    if (contentDispose) {
      contentDispose();
      contentDispose = null;
    }
    if (host) {
      teardownDelegation(host);
      host = null;
    }
    if (dialog) {
      const oldDialog = dialog;
      dialog = null;
      const index = presentationStack.indexOf(oldDialog);
      if (index !== -1) presentationStack.splice(index, 1);
      if (oldDialog.open && typeof oldDialog.close === 'function') oldDialog.close();
      oldDialog.remove?.();
      unlockScroll();
    }
  };

  const present = () => {
    focusBeforePresentation = document.activeElement;
    dialog = document.createElement('dialog');
    const view = { sheet: 'Sheet', fullScreenCover: 'FullScreenCover', alert: 'Alert', confirmationDialog: 'ConfirmationDialog' }[kind];
    dialog.dataset.view = view;
    dialog.classList.add('swiftui-sheet');
    if (kind === 'fullScreenCover') dialog.classList.add('swiftui-full-screen-cover');
    if (isMessage) dialog.classList.add('swiftui-alert');
    dialog.setAttribute('role', kind === 'alert' ? 'alertdialog' : 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    host = document.createElement('div');
    host.dataset.view = `${view}Content`;
    host.classList.add('swiftui-sheet-content');
    dialog.appendChild(host);

    dialog.addEventListener('cancel', (event) => {
      // Escape: an alert or dialog runs its cancel action.
      event.preventDefault();
      requestDismiss();
      if (cancelAction && typeof cancelAction.action === 'function') untrack(cancelAction.action);
    });
    dialog.addEventListener('click', (event) => {
      // A backdrop click dismisses, except for an alert (as in SwiftUI).
      if (event.target !== dialog || kind === 'alert') return;
      requestDismiss();
      if (cancelAction && typeof cancelAction.action === 'function') untrack(cancelAction.action);
    });
    document.body.appendChild(dialog);
    presentationStack.push(dialog);
    lockScroll();
    initDelegation(host);

    // `dismiss` in the environment of the presented content.
    const environment = new Map([[EnvironmentValues.dismiss, requestDismiss]]);
    if (isMessage) {
      const titleId = nextElementId('swiftui-alert-title');
      const messageId = nextElementId('swiftui-alert-message');
      const built = buildMessageContent(kind, options, requestDismiss, titleId, messageId)();
      cancelAction = built.cancel;
      host.appendChild(built.element);
      if (built.hasTitle) dialog.setAttribute('aria-labelledby', titleId);
      else if (options.title) dialog.setAttribute('aria-label', String(options.title));
      if (options.message) dialog.setAttribute('aria-describedby', messageId);
    } else {
      contentDispose = withEnvironment(environment, [], () => mount(() => options.content(), host));
    }

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
      cancelAction = null;
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

function installSheet(element, value) {
  installPresentation(element, 'sheet', value);
}

export default { mount };
