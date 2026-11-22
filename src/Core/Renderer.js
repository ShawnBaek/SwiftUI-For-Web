/**
 * Renderer - High-performance DOM rendering from view descriptors
 *
 * This module converts immutable view descriptors into DOM elements.
 * It is the bridge between declarative descriptions and the imperative DOM API.
 *
 * Performance optimizations over the original:
 * 1. Element pooling: Reuses recycled DOM elements instead of creating new ones
 * 2. Shared lifecycle observer: Single MutationObserver for all onAppear/onDisappear
 * 3. Event delegation: Click/input events use root-level delegation
 * 4. Modifier batching: All style writes happen in a single pass per element
 * 5. Reduced reflows: Uses cssText for bulk style application where possible
 * 6. Eliminated data-view attributes in production (removed debug overhead)
 */

import { applyAccessibilityLabel, applyAccessibilityValue, applyAccessibilityHint, restoreAccessibilityNodes } from './Accessibility.js';
import { DEV_BUILD, userFrame } from './Dev.js';
import {
  isDescriptor,
  isLegacyView,
  ModifierType
} from './ViewDescriptor.js';
import { acquireElement, releaseTree, onRelease } from './ElementPool.js';
import { onAppear, onDisappear, cancelAppear } from './LifecycleObserver.js';
import { delegateEvent } from './EventDelegate.js';
import { gestureAllowed } from '../Gesture/Gesture.js';
import { removeWithTransition } from '../Animation/Animation.js';
import { isHydrating, hydrationFrame, withoutHydration } from './Hydration.js';
import { createRoot, createEffect, getOwner, onCleanup, untrack } from '../Data/Signal.js';
import { installReactiveModifier } from './SignalRenderer.js';
import { applyFrame, withStackAxis, currentStackAxis } from './Frame.js';
import { withEnvironment } from '../Data/Environment.js';
import { State } from '../Data/State.js';
import { Binding } from '../Data/Binding.js';

// Style modifiers that accept a State or Binding as their value (#52,
// signal-as-value): `.opacity(isVisible)` re-applies when the state changes.
const SIGNAL_STYLE_MODIFIERS = new Set([
  ModifierType.PADDING,
  ModifierType.FRAME,
  ModifierType.FOREGROUND_COLOR,
  ModifierType.BACKGROUND,
  ModifierType.FONT,
  ModifierType.OPACITY,
  ModifierType.CORNER_RADIUS,
  ModifierType.SHADOW,
  ModifierType.ACCESSIBILITY_LABEL,
  ModifierType.ACCESSIBILITY_VALUE,
  ModifierType.ACCESSIBILITY_HINT,
]);

/**
 * Whether a value is a reactive source that views accept directly in place
 * of a thunk: a State or a Binding.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isSignalValue(value) {
  return value instanceof State || value instanceof Binding;
}

/**
 * Registry of view type renderers
 * Maps type name to render function
 * @type {Map<string, Function>}
 */
const viewRenderers = new Map();

/**
 * Register a renderer for a view type
 *
 * @param {string} type - View type name
 * @param {Function} renderer - Function that takes (props, children) and returns DOM element
 */
export function registerRenderer(type, renderer) {
  viewRenderers.set(type, renderer);
}

/**
 * Render a view descriptor to a DOM element
 *
 * @param {Object} descriptor - View descriptor or legacy View
 * @returns {HTMLElement} DOM element
 */
export function render(descriptor) {
  // mount mode 'adopt' (#39): each view is a frame of the hydrating render.
  return isHydrating() ? hydrationFrame(() => renderNode(descriptor)) : renderNode(descriptor);
}

function renderNode(descriptor) {
  // Handle null/undefined
  if (descriptor == null) {
    return document.createComment('empty');
  }

  // Handle legacy View instances (backward compatibility). Their content
  // is not a stack's children (#50).
  if (isLegacyView(descriptor)) {
    return withStackAxis(null, () => descriptor._render());
  }

  // Handle non-descriptor values (strings, numbers)
  if (!isDescriptor(descriptor)) {
    if (typeof descriptor === 'string' || typeof descriptor === 'number') {
      const textNode = acquireElement('span');
      textNode.textContent = String(descriptor);
      return textNode;
    }
    console.warn('Renderer: Invalid descriptor', descriptor);
    return document.createComment('invalid');
  }

  // Get the renderer for this type
  const renderer = viewRenderers.get(descriptor.type);

  if (!renderer) {
    console.warn(`Renderer: No renderer registered for type "${descriptor.type}"`);
    return renderUnknown(descriptor);
  }

  // .environment / .environmentObject scope this view and its descendants
  // (#49): render the whole subtree inside those context entries.
  let values = null;
  let objects = null;
  for (let i = 0; i < descriptor.modifiers.length; i++) {
    const modifier = descriptor.modifiers[i];
    if (modifier.type !== ModifierType.ENVIRONMENT) continue;
    values ??= new Map();
    objects ??= [];
    for (const [key, value] of modifier.value.values) values.set(key, value);
    objects.push(...modifier.value.objects);
  }
  if (values) {
    return withEnvironment(values, objects, () => renderDescriptorBody(descriptor, renderer));
  }
  return renderDescriptorBody(descriptor, renderer);
}

// Views whose children are laid out by the enclosing stack, as in SwiftUI
// (ForEach and Group are transparent; Spacer reads its parent's axis).
const AXIS_TRANSPARENT = new Set(['Spacer', 'ForEach', 'Group']);

// Errors thrown while rendering a view or applying its modifiers name the
// view, the modifier and, in development builds, where the view was created
// (#42). The original error is the `cause`; an error already described by a
// nested view passes through unchanged.
function describeRenderError(error, descriptor, modifier) {
  if (error && error.swiftuiView) return error;
  const what = modifier ? `${descriptor.type}.${modifier.type}()` : descriptor.type;
  const site = DEV_BUILD ? userFrame(descriptor._source) : '';
  const message = `SwiftUI-For-Web: ${what} failed to render: ${error?.message ?? error}`
    + (site ? `\n    created at ${site}` : '');
  const described = new Error(message, { cause: error });
  described.swiftuiView = descriptor.type;
  return described;
}

function renderDescriptorBody(descriptor, renderer) {
  // Render the element
  let element;
  try {
    // A view's children see no stack axis unless the view is itself a
    // stack (VStack/HStack set it for their children), so frame and Spacer
    // inside a Button, ScrollView or List don't act on an outer stack's
    // axis (#50). See AXIS_TRANSPARENT for the exceptions.
    element = AXIS_TRANSPARENT.has(descriptor.type)
      ? renderer(descriptor.props, descriptor.children)
      : withStackAxis(null, () => renderer(descriptor.props, descriptor.children));
  } catch (error) {
    throw describeRenderError(error, descriptor, null);
  }

  // Apply modifiers in declaration order; a modifier whose meaning depends
  // on an earlier one gets its own layer (#50), so the result may be a
  // wrapper around the view's element.
  let outer = element;
  if (descriptor.modifiers.length > 0) {
    try {
      outer = applyModifiers(element, descriptor.modifiers);
    } catch (error) {
      throw describeRenderError(error, descriptor, error?.swiftuiModifier ?? null);
    }
  }

  bindReactive(element, descriptor);

  // Tag with descriptor type for e2e selectors and devtools inspection.
  // Per-type renderers may override (e.g. TextField sets 'TextField' on
  // the inner <input>) — we don't clobber a more specific value.
  if (element && element.dataset && !element.dataset.view) {
    element.dataset.view = descriptor.type;
  }

  // Store descriptor reference for reconciliation
  element._descriptor = descriptor;

  return outer;
}

/**
 * Apply a legacy View's modifiers (descriptor modifiers or `{ apply }`
 * objects) and bind its reactive ones, as render() does for a descriptor.
 *
 * @param {HTMLElement} element
 * @param {Array} modifiers
 * @param {string} type - Name for warnings
 * @returns {HTMLElement} The outermost layer
 */
export function applyViewModifiers(element, modifiers, type) {
  const list = modifiers.filter((modifier) => modifier && (modifier.type || typeof modifier.apply === 'function'));
  const outer = applyModifiers(element, list);
  bindReactive(element, { type, props: {}, modifiers: list });
  return outer;
}

/**
 * Create the reactive bindings a descriptor declares, at the moment its
 * element is built. The effects belong to the current owner (the mount root,
 * a Show branch, or a For row), so they are disposed together with that
 * owner. Binding later by walking the mounted DOM would miss content that
 * Show and For render after mount (invariant I2, #44).
 *
 * Without a current owner (for example, a legacy container re-rendering from
 * an event or observer callback), effects could never be disposed. In that
 * case the content stays static and a one-time warning is logged; render the
 * region through createOwnedSlot (src/Core/OwnedSlot.js) to make it reactive.
 *
 * @param {HTMLElement} element - Element rendered for the descriptor
 * @param {Object} descriptor - View descriptor
 */
function bindReactive(element, descriptor) {
  const thunk = descriptor.props && descriptor.props.contentThunk;
  const hasThunk = descriptor.type === 'Text' && typeof thunk === 'function';
  const hasReactiveModifier = descriptor.modifiers.some(isReactiveModifier);
  if (!hasThunk && !hasReactiveModifier) return;

  if (!getOwner()) {
    if (hasThunk) {
      element.textContent = String(untrack(thunk) ?? '');
      restoreAccessibilityNodes(element);
    }
    // A task without an id needs no effect: it still starts when the element
    // appears and is cancelled when the element disappears. A task with an id
    // needs an owner to restart when the id changes, so warn like any other
    // reactive modifier.
    let needsOwner = hasThunk;
    for (let i = 0; i < descriptor.modifiers.length; i++) {
      const modifier = descriptor.modifiers[i];
      if (modifier.type === ModifierType.TASK) {
        installReactiveModifier(element, modifier);
        if (taskHasID(modifier)) needsOwner = true;
      } else if (isReactiveModifier(modifier)) needsOwner = true;
    }
    if (needsOwner) warnUnownedRender(descriptor.type);
    return;
  }

  if (hasThunk) {
    createEffect(() => {
      element.textContent = String(thunk() ?? '');
      // textContent removed accessibilityValue/Hint nodes (#51).
      restoreAccessibilityNodes(element);
    });
  }

  for (let i = 0; i < descriptor.modifiers.length; i++) {
    installReactiveModifier(element, descriptor.modifiers[i]);
  }
}

function isReactiveModifier(modifier) {
  return modifier.type === ModifierType.ON_CHANGE
    || modifier.type === ModifierType.TASK
    || modifier.type === ModifierType.SEARCHABLE
    || modifier.type === ModifierType.SHEET
    || modifier.type === ModifierType.PRESENTATION;
}

/**
 * Whether a TASK modifier was given an id, as in `.task({ id }, action)`.
 * Only such a task needs a reactive owner (to restart when the id changes).
 *
 * @param {Object} modifier - A TASK modifier
 * @returns {boolean}
 */
export function taskHasID(modifier) {
  const options = modifier?.value?.optionsOrAction;
  return typeof options === 'object' && options !== null && 'id' in options;
}

let warnedUnownedRender = false;

function warnUnownedRender(type) {
  if (warnedUnownedRender) return;
  warnedUnownedRender = true;
  console.warn(
    `SwiftUI-For-Web: ${type} with reactive content was rendered outside a ` +
    'reactive owner, so it will not update. Render it during mount, or ' +
    'through createOwnedSlot when re-rendering later.'
  );
}

/**
 * Render children of a descriptor
 *
 * @param {Array} children - Array of child descriptors
 * @returns {DocumentFragment} Fragment containing rendered children
 */
export function renderChildren(children) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child != null) {
      fragment.appendChild(render(child));
    }
  }

  return fragment;
}

/**
 * Render an unknown view type (fallback)
 *
 * @param {Object} descriptor - View descriptor
 * @returns {HTMLElement} DOM element
 */
function renderUnknown(descriptor) {
  const element = acquireElement('div');

  if (descriptor.children.length > 0) {
    element.appendChild(renderChildren(descriptor.children));
  }

  return element;
}

// Ordered modifier layers (#50). Each layout or drawing modifier marks a
// category on the layer it writes to. A modifier that would change the
// meaning of a category already on that layer (SwiftUI applies modifiers
// outside-in, each wrapping the previous result) starts a new wrapper layer.
// Chains whose order can't change the result stay on one element.
const LAYER_CATEGORY = {
  [ModifierType.PADDING]: 'padding',
  [ModifierType.BACKGROUND]: 'background',
  [ModifierType.FRAME]: 'frame',
  [ModifierType.BORDER]: 'border',
  [ModifierType.CORNER_RADIUS]: 'clip',
  [ModifierType.CLIP_SHAPE]: 'clip',
  [ModifierType.OPACITY]: 'opacity',
  [ModifierType.SHADOW]: 'shadow',
  [ModifierType.CONTENT_SHAPE]: 'clip',
  [ModifierType.MASK]: 'mask',
};

// For each modifier, the categories already on the layer that force a new
// layer before it is applied. For example .background(c).padding(8) pads
// outside the background, and .padding(8).padding(4) adds up.
// A mask is a clip-path, which also clips the element's own box-shadow,
// border and background, so anything drawn after a mask goes on a new layer.
const WRAPS_AFTER = {
  [ModifierType.PADDING]: new Set(['padding', 'background', 'frame', 'border', 'clip', 'shadow', 'mask']),
  [ModifierType.BACKGROUND]: new Set(['background', 'clip', 'opacity', 'mask']),
  [ModifierType.FRAME]: new Set(['frame', 'background', 'border', 'clip', 'shadow', 'mask']),
  [ModifierType.BORDER]: new Set(['border', 'clip', 'mask']),
  [ModifierType.CORNER_RADIUS]: new Set(['clip']),
  [ModifierType.CLIP_SHAPE]: new Set(['clip']),
  [ModifierType.OPACITY]: new Set(['opacity']),
  [ModifierType.SHADOW]: new Set(['shadow', 'mask']),
  [ModifierType.CONTENT_SHAPE]: new Set(['clip']),
  [ModifierType.MASK]: new Set(['mask']),
};

// Properties that place an element in its parent. A new layer takes them
// over, so the wrapped view keeps its position in a stack or grid.
const PLACEMENT_PROPERTIES = ['flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'justifySelf', 'gridArea', 'order'];

function wrapInLayer(inner) {
  const layer = document.createElement('div');
  layer.dataset.modifierLayer = '';
  const display = inner.style.display || '';
  const inline = inner.tagName === 'SPAN' || display.startsWith('inline');
  layer.style.display = inline ? 'inline-flex' : 'flex';
  layer.style.flexDirection = 'column';
  for (const property of PLACEMENT_PROPERTIES) {
    if (inner.style[property]) {
      layer.style[property] = inner.style[property];
      inner.style[property] = '';
    }
  }
  // A view that fills its parent keeps filling: the layer fills the parent
  // and the view fills the layer.
  // The view fills its layer (stretched across by the column layer, grown
  // along it), so a size set on the layer later, such as a container's
  // height: 100%, reaches the view.
  inner.style.flexGrow = '1';
  if (inner.style.width === '100%') layer.style.width = '100%';
  if (inner.style.height === '100%') layer.style.height = '100%';
  layer.appendChild(inner);
  return layer;
}

/**
 * Apply modifiers to a DOM element in declaration order.
 *
 * @param {HTMLElement} element - DOM element
 * @param {Array} modifiers - Array of modifier descriptors
 * @returns {HTMLElement} The outermost element: `element`, or the last layer
 *   wrapped around it when order matters.
 */
export function applyModifiers(element, modifiers) {
  let layer = element;
  let categories = null;
  for (let i = 0; i < modifiers.length; i++) {
    const modifier = modifiers[i];
    const category = LAYER_CATEGORY[modifier.type];
    if (category) {
      const wrapsAfter = WRAPS_AFTER[modifier.type];
      if (categories && [...categories].some((existing) => wrapsAfter.has(existing))) {
        layer = wrapInLayer(layer);
        categories = null;
      }
      (categories ??= new Set()).add(category);
    }
    try {
      if (SIGNAL_STYLE_MODIFIERS.has(modifier.type) && isSignalValue(modifier.value)) {
        applySignalModifier(layer, modifier);
      } else {
        applyModifier(layer, modifier);
      }
    } catch (error) {
      // Tell the caller which modifier failed.
      if (error && typeof error === 'object' && !error.swiftuiModifier && Object.isExtensible(error)) {
        error.swiftuiModifier = modifier;
      }
      throw error;
    }
  }
  return layer;
}

function applySignalModifier(element, modifier) {
  const source = modifier.value;
  if (!getOwner()) {
    applyModifier(element, { ...modifier, value: untrack(() => source.value) });
    warnUnownedRender(`.${modifier.type}`);
    return;
  }
  // Each run records the style properties and attributes it writes, with
  // their previous values. The next run restores exactly those before
  // applying the new value, so nothing from an older value is left behind
  // (an italic font switched to a plain one, `{ top }` padding switched to
  // `{ left }`, a color switched to null) and other modifiers on the element
  // are untouched.
  let previous = null;
  // Re-runs happen after the parent stack has rendered; keep its axis so a
  // State-driven frame fills the same way every time (#50).
  const axis = currentStackAxis();
  createEffect(() => {
    const value = source.value;
    if (previous) restoreWrites(element, previous);
    previous = recordWrites(element, (target) => {
      withStackAxis(axis, () => applyModifier(target, { ...modifier, value }));
    });
  });
}

function recordWrites(element, apply) {
  const styles = new Map();
  const attributes = new Map();
  const style = new Proxy(element.style, {
    set(target, property, value) {
      if (typeof property === 'string' && !styles.has(property)) {
        styles.set(property, target[property]);
      }
      target[property] = value;
      return true;
    },
  });
  const rememberAttribute = (name) => {
    if (!attributes.has(name)) {
      const current = element.getAttribute(name);
      attributes.set(name, current === undefined ? null : current);
    }
  };
  const target = new Proxy(element, {
    get(object, property) {
      if (property === 'style') return style;
      if (property === 'setAttribute') {
        return (name, value) => { rememberAttribute(name); object.setAttribute(name, value); };
      }
      if (property === 'removeAttribute') {
        return (name) => { rememberAttribute(name); object.removeAttribute(name); };
      }
      const value = Reflect.get(object, property, object);
      return typeof value === 'function' ? value.bind(object) : value;
    },
    set(object, property, value) {
      object[property] = value;
      return true;
    },
  });
  apply(target);
  return { styles, attributes };
}

function restoreWrites(element, { styles, attributes }) {
  for (const [property, value] of styles) {
    element.style[property] = value ?? '';
  }
  for (const [name, value] of attributes) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
}

/**
 * Apply a single modifier to a DOM element
 *
 * @param {HTMLElement} element - DOM element
 * @param {Object} modifier - Modifier descriptor
 */
function applyModifier(element, modifier) {
  const { type, value } = modifier;

  switch (type) {
    case ModifierType.PADDING:
      applyPadding(element, value);
      break;

    case ModifierType.FRAME:
      applyFrame(element, value);
      break;

    case ModifierType.FOREGROUND_COLOR:
      applyForegroundColor(element, value);
      break;

    case ModifierType.BACKGROUND:
      applyBackground(element, value);
      break;

    case ModifierType.FONT:
      applyFont(element, value);
      break;

    case ModifierType.OPACITY:
      element.style.opacity = String(value);
      break;

    case ModifierType.CORNER_RADIUS:
      element.style.borderRadius = `${value}px`;
      break;

    case ModifierType.BORDER:
      applyBorder(element, value);
      break;

    case ModifierType.SHADOW:
      applyShadow(element, value);
      break;

    case ModifierType.ON_TAP:
      element.style.cursor = 'pointer';
      // Use event delegation instead of direct listener. A tap is a tap
      // gesture: a .highPriorityGesture(TapGesture()) on this view or an
      // ancestor wins over it.
      delegateEvent(element, 'click', function onTapGesture(event) {
        if (gestureAllowed(element, 'tap')) value.call(this, event);
      });
      break;

    case ModifierType.ON_APPEAR:
      // Use shared lifecycle observer instead of per-element MutationObserver
      onAppear(element, value);
      // If the owner is disposed before the element ever appears, drop the
      // pending callback so it neither leaks nor fires later (#46).
      if (getOwner()) onCleanup(() => cancelAppear(element));
      break;

    case ModifierType.ON_DISAPPEAR:
      // Use shared lifecycle observer instead of per-element MutationObserver
      onDisappear(element, value);
      break;

    case ModifierType.ACCESSIBILITY_LABEL:
      applyAccessibilityLabel(element, accessibilityText(value));
      break;

    case ModifierType.ACCESSIBILITY_VALUE:
      applyAccessibilityValue(element, accessibilityText(value));
      break;

    case ModifierType.ACCESSIBILITY_HINT:
      applyAccessibilityHint(element, accessibilityText(value));
      break;

    case ModifierType.ACCESSIBILITY_IDENTIFIER:
      element.setAttribute('data-accessibility-identifier', accessibilityText(value));
      break;

    // Reactive modifiers are not styles. bindReactive() installs them in
    // render(), under the current owner, so they are disposed with it.
    case ModifierType.ON_CHANGE:
    case ModifierType.TASK:
    case ModifierType.SEARCHABLE:
    case ModifierType.SHEET:
    case ModifierType.PRESENTATION:
      break;

    case ModifierType.CLIP_SHAPE:
      applyClipShape(element, value);
      break;

    case ModifierType.NAVIGATION_TITLE:
      applyNavigationTitle(element, value);
      break;

    case ModifierType.COLOR_EFFECT:
    case ModifierType.DISTORTION_EFFECT:
    case ModifierType.LAYER_EFFECT:
      applyShaderEffect(element, value, type);
      break;

    // Motion and gestures (src/Animation, src/Gesture). The value carries
    // the shared implementation; whatever it returns to undo (gesture
    // listeners, a pending transition frame) is released with the element
    // and with the current owner.
    case ModifierType.ANIMATION:
    case ModifierType.TRANSITION:
    case ModifierType.MATCHED_GEOMETRY:
    case ModifierType.GESTURE:
      ownElementResource(element, value.apply(element));
      break;

    case ModifierType.MASK:
      applyMask(element, value);
      break;

    case ModifierType.CONTENT_SHAPE:
      applyContentShape(element, value);
      break;

    case ModifierType.CUSTOM:
      if (typeof value === 'function') {
        value(element);
      } else if (value && typeof value.apply === 'function') {
        value.apply(element);
      }
      break;

    default:
      // Unknown modifier type - try legacy apply
      if (modifier && typeof modifier.apply === 'function') {
        modifier.apply(element);
      }
  }
}

// .navigationTitle(_:) (#40). SwiftUI shows it in the navigation bar; on
// the web it is the document title while the view is shown. Titles form a
// stack: the latest shown wins, and when a view is disposed (a popped
// screen, a closed Show branch) its entry leaves the stack and the title
// falls back to the one below, or to the page's own title.
const titleStack = [];
let baseTitle = null;
let titleCheckQueued = false;

// The entry whose view is last in document order among the views on the
// page: an inner view comes after its ancestors, and a detail column after
// its sidebar, so the most specific title wins whatever order the views
// rendered in. Entries whose views aren't in the document yet (or a DOM
// without compareDocumentPosition) fall back to the latest shown.
function topTitleEntry() {
  let top = null;
  for (const entry of titleStack) {
    const element = entry.element;
    if (!element?.isConnected || typeof element.compareDocumentPosition !== 'function') continue;
    // DOCUMENT_POSITION_FOLLOWING (4): element comes after top.
    if (!top || (top.element.compareDocumentPosition(element) & 4)) top = entry;
  }
  return top ?? titleStack[titleStack.length - 1] ?? null;
}

function showTopTitle() {
  const top = topTitleEntry();
  document.title = top ? top.text : (baseTitle ?? '');
  if (!top) baseTitle = null;
}

// Views are attached after they render: check the order again then. An
// entry whose view is still not in the document (attached later from a
// frame, a timer or after an await) is checked again when it appears, through
// the shared lifecycle observer.
function queueTitleCheck() {
  if (titleCheckQueued) return;
  titleCheckQueued = true;
  queueMicrotask(() => {
    titleCheckQueued = false;
    if (!titleStack.length) return;
    showTopTitle();
    for (const entry of titleStack) watchTitleAttach(entry);
  });
}

function watchTitleAttach(entry) {
  const element = entry.element;
  if (entry.onAttach || !element || element.isConnected !== false) return;
  if (typeof MutationObserver !== 'function') return;
  entry.onAttach = () => {
    entry.onAttach = null;
    if (titleStack.includes(entry)) showTopTitle();
  };
  onAppear(element, entry.onAttach);
}

function applyNavigationTitle(element, value) {
  if (typeof document === 'undefined') return;
  const owner = getOwner();
  if (!owner) {
    // Nothing will dispose it: just set the title.
    document.title = String(isSignalValue(value) ? untrack(() => value.value) : (value ?? ''));
    return;
  }
  if (titleStack.length === 0) baseTitle = document.title;
  const entry = { text: '', element, onAttach: null };
  titleStack.push(entry);
  if (isSignalValue(value)) {
    createEffect(() => {
      entry.text = String(value.value ?? '');
      if (titleStack.includes(entry)) showTopTitle();
    });
  } else {
    entry.text = String(value ?? '');
    showTopTitle();
  }
  queueTitleCheck();
  onCleanup(() => {
    const index = titleStack.indexOf(entry);
    if (index !== -1) titleStack.splice(index, 1);
    if (entry.onAttach) {
      cancelAppear(element, entry.onAttach);
      entry.onAttach = null;
    }
    showTopTitle();
  });
}

function accessibilityText(value) {
  if (value && value.props) {
    if (value.props.content != null) return String(value.props.content);
    if (typeof value.props.contentThunk === 'function') {
      return String(untrack(value.props.contentThunk) ?? '');
    }
  }
  return String(value ?? '');
}

/**
 * Apply padding modifier
 */
function applyPadding(element, value) {
  if (typeof value === 'number') {
    element.style.padding = `${value}px`;
  } else if (typeof value === 'object') {
    if (value.horizontal !== undefined) {
      element.style.paddingLeft = `${value.horizontal}px`;
      element.style.paddingRight = `${value.horizontal}px`;
    }
    if (value.vertical !== undefined) {
      element.style.paddingTop = `${value.vertical}px`;
      element.style.paddingBottom = `${value.vertical}px`;
    }
    if (value.top !== undefined) element.style.paddingTop = `${value.top}px`;
    if (value.right !== undefined) element.style.paddingRight = `${value.right}px`;
    if (value.bottom !== undefined) element.style.paddingBottom = `${value.bottom}px`;
    if (value.left !== undefined) element.style.paddingLeft = `${value.left}px`;
  }
}

/**
 * Apply frame modifier
 */

/**
 * Apply foreground color modifier
 */
function applyForegroundColor(element, value) {
  if (value && typeof value.rgba === 'function') {
    element.style.color = value.rgba();
  } else if (typeof value === 'string') {
    element.style.color = value;
  }
}

/**
 * Apply background modifier
 */
function applyBackground(element, value) {
  if (value && typeof value.rgba === 'function') {
    element.style.backgroundColor = value.rgba();
  } else if (typeof value === 'string') {
    element.style.backgroundColor = value;
  }
}

/**
 * Apply font modifier
 */
function applyFont(element, value) {
  if (value && typeof value.css === 'function') {
    const styles = value.css();
    Object.assign(element.style, styles);
  }
}

/**
 * Apply border modifier
 */
function applyBorder(element, value) {
  const { color, width = 1 } = value;
  const colorValue = color && typeof color.rgba === 'function' ? color.rgba() : color;
  element.style.border = `${width}px solid ${colorValue}`;
}

/**
 * Apply shadow modifier
 */
function applyShadow(element, value) {
  const { color = 'rgba(0,0,0,0.2)', radius = 4, x = 0, y = 2 } = value;
  const colorValue = color && typeof color.rgba === 'function' ? color.rgba() : color;
  element.style.boxShadow = `${x}px ${y}px ${radius}px ${colorValue}`;
}

/**
 * Tie a cleanup function to an element: it runs once, when the element is
 * released to the pool or when the current owner is disposed, whichever
 * comes first.
 */
function ownElementResource(element, dispose) {
  if (typeof dispose !== 'function') return;
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    dispose();
  };
  onRelease(element, once);
  if (getOwner()) onCleanup(once);
}

// The lower-case shape name of a shape value: 'circle', 'roundedrectangle',
// … from a string or a shape descriptor's type.
function shapeName(value) {
  return String(typeof value === 'string' ? value : value?.type ?? '').toLowerCase();
}

// A RoundedRectangle's radius.
function cornerRadiusOf(value) {
  const radius = value?.props?.cornerRadius ?? value?.cornerRadius;
  return typeof radius === 'number' ? radius : 10;
}

// The CSS clip-path for a shape, or null when it isn't a known shape.
function shapeClipPath(value) {
  switch (shapeName(value)) {
    case 'circle': return 'circle(50%)';
    case 'ellipse': return 'ellipse(50% 50%)';
    case 'capsule': return 'inset(0 round 9999px)';
    case 'roundedrectangle': return `inset(0 round ${cornerRadiusOf(value)}px)`;
    case 'rectangle': return 'inset(0)';
    default: return null;
  }
}

/**
 * .mask(_:alignment:) (SwiftUI: mask(alignment:_:)). A shape masks with a
 * clip-path; a gradient masks with its alpha through mask-image.
 * @see https://developer.apple.com/documentation/swiftui/view/mask(alignment:_:)
 */
function applyMask(element, { shape, alignment }) {
  const clipPath = shapeClipPath(shape);
  if (clipPath) {
    element.style.clipPath = clipPath;
    return;
  }
  const gradient = shape && typeof shape.css === 'function' ? shape.css() : null;
  if (typeof gradient === 'string' && gradient) {
    element.style.maskImage = gradient;
    element.style.webkitMaskImage = gradient;
    const position = String(alignment ?? 'center').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
      .replace('leading', 'left').replace('trailing', 'right');
    element.style.maskPosition = position;
    element.style.maskRepeat = 'no-repeat';
  }
}

/**
 * .contentShape(_:eoFill:): the shape that receives taps. The whole box is
 * hit-testable (even where it draws nothing); a rounded shape rounds the hit
 * area like clipShape does, as the legacy View modifier did. A rectangle
 * doesn't clip: in SwiftUI contentShape never changes what is drawn.
 * @see https://developer.apple.com/documentation/swiftui/view/contentshape(_:eofill:)
 */
function applyContentShape(element, { shape }) {
  element.style.pointerEvents = 'auto';
  const name = shapeName(shape);
  if (name && name !== 'rectangle') applyClipShape(element, shape);
}

/**
 * Apply clip shape modifier
 */
function applyClipShape(element, value) {
  const radius = { circle: '50%', ellipse: '50%', capsule: '9999px', rectangle: '0', roundedrectangle: `${cornerRadiusOf(value)}px` }[shapeName(value)];
  if (radius) element.style.borderRadius = radius;
  element.style.overflow = 'hidden';
}

// ============================================================================
// Shader effect modifiers
//
// SwiftUI's `.colorEffect()` / `.distortionEffect()` / `.layerEffect()`
// are backed here by SVG filter graphs (W3C Filter Effects Module 1).
// Each Shader instance owns a stable id; the renderer keeps a single
// hidden <svg><defs> in document.head and lazily mounts each unique
// filter exactly once. Composing multiple effects on a view appends to
// the element's `style.filter` (e.g. "url(#a) url(#b)").
// ============================================================================

/** @type {Set<string>} ids of <filter> elements already mounted */
const _mountedShaderFilters = new Set();
let _shaderDefsRoot = null;

/**
 * Lazily create the shared hidden <svg> in document.head that holds all
 * registered filter definitions.
 */
function getShaderDefsRoot() {
  if (_shaderDefsRoot && _shaderDefsRoot.ownerDocument) return _shaderDefsRoot;
  if (typeof document === 'undefined' || !document.head) return null;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.style.overflow = 'hidden';
  svg.style.pointerEvents = 'none';
  const defs = document.createElementNS(SVG_NS, 'defs');
  svg.appendChild(defs);
  document.head.appendChild(svg);
  _shaderDefsRoot = defs;
  return defs;
}

/**
 * Apply a shader effect modifier. `value` shape is either a raw Shader
 * instance OR `{ shader, isEnabled, maxSampleOffset }` from the
 * `.distortionEffect` / `.layerEffect` modifiers (whose extra options
 * are accepted but currently informational — SVG filters don't need a
 * sample-offset hint).
 */
/**
 * Mount a Shader's <filter> into the shared defs (if not already) and
 * append its `url(#id)` to the element's `style.filter`. Exported so
 * class-based views (e.g. ImageView) can drive shader effects without
 * going through the descriptor-modifier pipeline.
 */
export function applyShaderToElement(element, shader) {
  if (!shader || !shader.id || typeof shader._populate !== 'function') return;

  // The shared defs live outside the view tree: never server nodes.
  if (!_mountedShaderFilters.has(shader.id)) withoutHydration(() => {
    const defs = getShaderDefsRoot();
    if (defs) {
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const filter = defs.ownerDocument.createElementNS(SVG_NS, 'filter');
      filter.setAttribute('id', shader.id);
      filter.setAttribute('x', '-20%');
      filter.setAttribute('y', '-20%');
      filter.setAttribute('width', '140%');
      filter.setAttribute('height', '140%');
      filter.setAttribute('color-interpolation-filters', 'sRGB');
      shader._populate(filter);
      defs.appendChild(filter);
      _mountedShaderFilters.add(shader.id);
    }
  });

  // Compose: append this filter to whatever the element already has so
  // chained .colorEffect().layerEffect() builds "url(#a) url(#b)".
  const existing = element.style.filter || '';
  const ref = `url(#${shader.id})`;
  // Browsers read the value back as url("#id"), so look for the id itself,
  // up to the closing quote or parenthesis.
  const applied = existing.split(`#${shader.id}`).slice(1).some((rest) => /^["')]/.test(rest));
  element.style.filter = applied ? existing : (existing ? `${existing} ${ref}` : ref);
}

function applyShaderEffect(element, value, modifierType) {
  const shader = value && value.shader ? value.shader : value;
  const isEnabled = value && value.isEnabled !== undefined ? value.isEnabled : true;
  if (!shader || !isEnabled) return;

  // Guard: warn if the wrong kind was passed (e.g. blur into .colorEffect).
  // Don't throw — silent best-effort matches SwiftUI's behavior.
  const expected = {
    [ModifierType.COLOR_EFFECT]: 'color',
    [ModifierType.DISTORTION_EFFECT]: 'distortion',
    [ModifierType.LAYER_EFFECT]: 'layer'
  }[modifierType];
  if (expected && shader.kind && shader.kind !== expected) {
    // eslint-disable-next-line no-console
    console.warn(`Shader '${shader.name}' is kind '${shader.kind}' but was passed to .${expected}Effect()`);
  }

  applyShaderToElement(element, shader);
}

// ============================================================================
// Built-in View Type Renderers
// ============================================================================

// Text
const TEXT_HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
registerRenderer('Text', (props) => {
  // Default <span>; `.accessibilityHeading(.h1..h6)` swaps to a heading tag
  // so both screen readers and search engines see the right semantics.
  const tag = TEXT_HEADING_TAGS.has(props.headingLevel) ? props.headingLevel : 'span';
  const element = acquireElement(tag);
  element.textContent = String(props.content ?? '');

  if (tag !== 'span') {
    // Match SwiftUI: `.accessibilityHeading(_:)` changes semantics only, not
    // appearance. Neutralise the user-agent <h1>..<h6> styling so visuals
    // stay driven by `.font()` / `.fontWeight()` modifiers.
    element.style.fontSize = 'inherit';
    element.style.fontWeight = 'inherit';
    element.style.margin = '0';
    element.style.display = 'inline';
  }

  if (props.fontWeight) {
    element.style.fontWeight = getFontWeightValue(props.fontWeight);
  }

  if (props.isItalic) {
    element.style.fontStyle = 'italic';
  }

  const decorations = [];
  if (props.isUnderline) decorations.push('underline');
  if (props.isStrikethrough) decorations.push('line-through');
  if (decorations.length > 0) {
    element.style.textDecoration = decorations.join(' ');
    if (props.underlineColor || props.strikethroughColor) {
      const color = props.underlineColor || props.strikethroughColor;
      const colorValue = color && typeof color.rgba === 'function' ? color.rgba() : color;
      element.style.textDecorationColor = colorValue;
    }
  }

  if (props.textAlignment) {
    const alignMap = { leading: 'left', center: 'center', trailing: 'right' };
    element.style.textAlign = alignMap[props.textAlignment] || props.textAlignment;
    element.style.display = 'block';
  }

  if (props.lineLimit != null) {
    element.style.display = '-webkit-box';
    element.style.webkitLineClamp = String(props.lineLimit);
    element.style.webkitBoxOrient = 'vertical';
    element.style.overflow = 'hidden';
  }

  if (props.kerning != null) {
    element.style.letterSpacing = `${props.kerning}px`;
  }

  if (props.lineSpacing != null) {
    element.style.lineHeight = `${1.5 + props.lineSpacing / 16}`;
  }

  if (props.monospacedDigit) {
    element.style.fontVariantNumeric = 'tabular-nums';
  }

  if (props.baselineOffset != null) {
    element.style.verticalAlign = `${props.baselineOffset}px`;
  }

  return element;
});

function getFontWeightValue(weight) {
  const weights = {
    ultraLight: '100',
    thin: '200',
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
    black: '900'
  };
  return weights[weight] || weight;
}

// VStack
registerRenderer('VStack', (props, children) => {
  const element = acquireElement('div');
  element.style.display = 'flex';
  element.style.flexDirection = 'column';
  element.style.alignItems = alignmentToCSS(props.alignment, 'horizontal');
  element.style.gap = `${props.spacing ?? 8}px`;
  element.appendChild(withStackAxis('vertical', () => renderChildren(children)));
  return element;
});

// HStack
registerRenderer('HStack', (props, children) => {
  const element = acquireElement('div');
  element.style.display = 'flex';
  element.style.flexDirection = 'row';
  element.style.alignItems = alignmentToCSS(props.alignment, 'vertical');
  element.style.gap = `${props.spacing ?? 8}px`;
  element.appendChild(withStackAxis('horizontal', () => renderChildren(children)));
  return element;
});

// ZStack
registerRenderer('ZStack', (props, children) => {
  const element = acquireElement('div');
  element.style.display = 'grid';
  element.style.gridTemplate = '1fr / 1fr';

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child != null) {
      const childEl = withStackAxis(null, () => render(child));
      childEl.style.gridArea = '1 / 1';
      if (childEl.style.display === 'contents') {
        // ForEach, For and Show render a display:contents wrapper. Make it
        // an overlay cell of its own, so its rows stack too (#50); rows it
        // adds later get grid-area from the [data-zstack-layer] rule in
        // base.css.
        childEl.style.display = 'grid';
        childEl.style.gridTemplate = '1fr / 1fr';
        childEl.style.justifySelf = 'stretch';
        childEl.style.alignSelf = 'stretch';
        childEl.dataset.zstackLayer = '';
        for (const row of Array.from(childEl.children || [])) {
          row.style.gridArea = '1 / 1';
          applyZStackAlignment(row, props.alignment);
        }
        applyZStackItemsAlignment(childEl, props.alignment);
      } else {
        applyZStackAlignment(childEl, props.alignment);
      }
      element.appendChild(childEl);
    }
  }

  return element;
});

// Spacer
registerRenderer('Spacer', (props) => {
  const element = acquireElement('div');
  element.style.flexGrow = '1';
  element.style.flexShrink = '1';
  element.style.flexBasis = '0';
  element.style.alignSelf = 'stretch';

  // SwiftUI's minLength applies along the containing stack's axis only
  // (#50); outside a stack it applies to both.
  if (props.minLength != null) {
    const axis = currentStackAxis();
    if (axis !== 'vertical') element.style.minWidth = `${props.minLength}px`;
    if (axis !== 'horizontal') element.style.minHeight = `${props.minLength}px`;
  }

  return element;
});

// Divider
registerRenderer('Divider', () => {
  const element = acquireElement('hr');
  element.style.border = 'none';
  element.style.borderTop = '1px solid rgba(60, 60, 67, 0.3)';
  element.style.margin = '0';
  element.style.width = '100%';
  return element;
});

// Button
registerRenderer('Button', (props, children) => {
  const element = acquireElement('button');
  element.style.cursor = 'pointer';
  element.style.border = 'none';
  element.style.background = 'transparent';
  element.style.padding = '0';
  element.style.font = 'inherit';

  if (children.length > 0) {
    element.appendChild(renderChildren(children));
  } else if (props.label) {
    element.textContent = props.label;
  }

  if (props.isDisabled) {
    element.disabled = true;
    element.style.opacity = '0.5';
    element.style.cursor = 'not-allowed';
  }

  applyButtonStyle(element, props.buttonStyle);

  if (props.action && !props.isDisabled) {
    // Use event delegation for click handling
    delegateEvent(element, 'click', (event) => {
      event.preventDefault();
      props.action();
    });
  }

  return element;
});

function applyButtonStyle(element, style) {
  switch (style) {
    case 'bordered':
      element.style.padding = '8px 16px';
      element.style.border = '1px solid currentColor';
      element.style.borderRadius = '8px';
      element.style.background = 'transparent';
      break;
    case 'borderedProminent':
      element.style.padding = '8px 16px';
      element.style.borderRadius = '8px';
      element.style.background = 'rgba(0, 122, 255, 1)';
      element.style.color = 'white';
      break;
    case 'borderless':
      element.style.padding = '8px 16px';
      element.style.background = 'transparent';
      break;
    case 'plain':
      break;
    case 'default':
    default:
      element.style.color = 'rgba(0, 122, 255, 1)';
      break;
  }
}

// ForEach
registerRenderer('ForEach', (props, children) => {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child != null) {
      fragment.appendChild(render(child));
    }
  }
  const element = acquireElement('div');
  element.style.display = 'contents';
  element.appendChild(fragment);
  return element;
});

// ---------------------------------------------------------------------------
// Reactive control flow primitives. Registered here so they Just Work when
// nested inside any container's children (where renderChildren calls
// render() eagerly). Each runs its own createEffect under the current
// signal owner — the SignalRenderer's mount() establishes that root.
// ---------------------------------------------------------------------------

// Remove a view's node: its effects are already disposed. A view with a
// .transition stays in the document while the removal animation runs
// (removeWithTransition); otherwise it goes now.
function removeNode(node) {
  if (!node) return;
  const release = () => {
    if (node.parentNode) node.parentNode.removeChild(node);
    releaseTree(node);
  };
  if (!removeWithTransition(node, release)) release();
}

// Show — reactive conditional branch
registerRenderer('Show', (props) => {
  const { when, then: thenView, else: elseView } = props;
  const wrapper = document.createElement('div');
  wrapper.style.display = 'contents';

  let currentNode = null;
  let currentDispose = null;
  let lastBranch = null;

  createEffect(() => {
    const truthy = !!when();
    const branch = truthy ? 'then' : 'else';
    if (branch === lastBranch) return;
    lastBranch = branch;

    if (currentDispose) { currentDispose(); currentDispose = null; }
    removeNode(currentNode);
    currentNode = null;

    const view = truthy ? thenView : elseView;
    if (view != null) {
      createRoot((d) => {
        currentDispose = d;
        currentNode = untrack(() => render(view));
        if (currentNode) wrapper.appendChild(currentNode);
      });
    }
  });

  onCleanup(() => {
    if (currentDispose) currentDispose();
  });

  return wrapper;
});

// For — reactive keyed list
registerRenderer('For', (props) => {
  const { each, render: renderRow, keyFn } = props;
  const wrapper = document.createElement('div');
  wrapper.style.display = 'contents';

  /** @type {Map<any, { node: Node, dispose: () => void, item: any }>} */
  const rows = new Map();

  createEffect(() => {
    const items = each() || [];
    const seen = new Set();

    let prevSibling = null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = keyFn(item, i);
      if (seen.has(key)) {
        console.warn('[For] duplicate key:', key, '— behavior undefined');
      }
      seen.add(key);

      let entry = rows.get(key);
      // Identity-aware: a new object with the same key (immutable update)
      // remounts the row so its render closure captures the new item.
      if (entry && entry.item !== item) {
        entry.dispose();
        if (entry.node && entry.node.parentNode) {
          entry.node.parentNode.removeChild(entry.node);
        }
        if (entry.node) releaseTree(entry.node);
        rows.delete(key);
        entry = null;
      }
      if (!entry) {
        let dispose;
        let node;
        createRoot((d) => {
          dispose = d;
          node = untrack(() => render(renderRow(item, i)));
        });
        entry = { node, dispose, item };
        rows.set(key, entry);
      }

      const target = prevSibling ? prevSibling.nextSibling : wrapper.firstChild;
      if (entry.node && entry.node !== target) {
        wrapper.insertBefore(entry.node, target);
      }
      prevSibling = entry.node;
    }

    for (const [key, entry] of rows) {
      if (!seen.has(key)) {
        entry.dispose();
        removeNode(entry.node);
        rows.delete(key);
      }
    }
  });

  onCleanup(() => {
    for (const [, entry] of rows) entry.dispose();
    rows.clear();
  });

  return wrapper;
});

// ============================================================================
// Helper Functions
// ============================================================================

function alignmentToCSS(alignment, direction) {
  if (!alignment) return 'center';

  const alignmentStr = typeof alignment === 'string' ? alignment : alignment.toString?.() || 'center';

  switch (alignmentStr.toLowerCase()) {
    case 'leading':
    case 'top':
    case 'topleft':
    case 'topleading':
      return 'flex-start';
    case 'trailing':
    case 'bottom':
    case 'bottomright':
    case 'bottomtrailing':
      return 'flex-end';
    case 'center':
    default:
      return 'center';
  }
}

// The same alignment for every item of a grid (rows a ZStack layer adds
// later).
function applyZStackItemsAlignment(element, alignment) {
  const probe = { style: {} };
  applyZStackAlignment(probe, alignment);
  element.style.justifyItems = probe.style.justifySelf;
  element.style.alignItems = probe.style.alignSelf;
}

function applyZStackAlignment(element, alignment) {
  if (!alignment) {
    element.style.justifySelf = 'center';
    element.style.alignSelf = 'center';
    return;
  }

  const alignmentStr = typeof alignment === 'string' ? alignment : alignment.toString?.() || 'center';
  const lower = alignmentStr.toLowerCase();

  if (lower.includes('top')) {
    element.style.alignSelf = 'start';
  } else if (lower.includes('bottom')) {
    element.style.alignSelf = 'end';
  } else {
    element.style.alignSelf = 'center';
  }

  if (lower.includes('leading') || lower.includes('left')) {
    element.style.justifySelf = 'start';
  } else if (lower.includes('trailing') || lower.includes('right')) {
    element.style.justifySelf = 'end';
  } else {
    element.style.justifySelf = 'center';
  }
}

export default {
  render,
  renderChildren,
  applyModifiers,
  registerRenderer
};
