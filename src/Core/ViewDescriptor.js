/**
 * ViewDescriptor - Immutable view description system
 *
 * Inspired by:
 * - SwiftUI: Views are value types (structs) that describe UI
 * - React: Elements are immutable plain objects
 *
 * Key principles:
 * 1. Views are descriptions, not DOM elements
 * 2. Descriptions are immutable (frozen objects)
 * 3. Rendering is a separate phase
 * 4. Identity is explicit (keys) or structural (position)
 *
 * @example
 * // Create a descriptor
 * const desc = createDescriptor('VStack', { spacing: 10 }, [
 *   createDescriptor('Text', { content: 'Hello' }),
 *   createDescriptor('Text', { content: 'World' })
 * ]);
 *
 * // Render to DOM
 * const element = renderDescriptor(desc);
 */

import { DEV_BUILD } from './Dev.js';

/**
 * Symbol to identify view descriptors
 * @type {symbol}
 */
export const VIEW_DESCRIPTOR = Symbol.for('swiftui.descriptor');

/**
 * Create an immutable view descriptor
 *
 * @param {string} type - View type name (e.g., 'VStack', 'Text', 'Button')
 * @param {Object} props - View properties (will be frozen)
 * @param {Array} children - Child descriptors (will be frozen)
 * @param {string|number|null} key - Explicit key for reconciliation
 * @param {Array} modifiers - Modifier descriptors (will be frozen)
 * @returns {Object} Frozen view descriptor
 */
export function createDescriptor(type, props = {}, children = [], key = null, modifiers = []) {
  const descriptor = {
    $$typeof: VIEW_DESCRIPTOR,
    type,
    props: Object.freeze({ ...props }),
    children: Object.freeze(children.filter(c => c != null)),
    key,
    modifiers: Object.freeze([...modifiers]),
  };

  // Development builds remember where the view was created, so render
  // errors can point at the user's code (#42). The stack is only formatted
  // if an error is reported.
  if (DEV_BUILD) {
    const limit = Error.stackTraceLimit;
    Error.stackTraceLimit = 16;
    Object.defineProperty(descriptor, '_source', { value: new Error(), enumerable: false });
    Error.stackTraceLimit = limit;
  }

  return Object.freeze(descriptor);
}

/**
 * Check if a value is a view descriptor
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a view descriptor
 */
export function isDescriptor(value) {
  return value != null &&
         typeof value === 'object' &&
         value.$$typeof === VIEW_DESCRIPTOR;
}

/**
 * Check if a value is a legacy View class instance
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a View instance
 */
export function isLegacyView(value) {
  return value != null &&
         typeof value === 'object' &&
         typeof value._render === 'function' &&
         !isDescriptor(value);
}

/**
 * Add a modifier to a descriptor (returns new descriptor)
 *
 * @param {Object} descriptor - View descriptor
 * @param {Object} modifier - Modifier to add
 * @returns {Object} New descriptor with modifier added
 */
export function addModifier(descriptor, modifier) {
  if (!isDescriptor(descriptor)) {
    throw new Error('addModifier requires a view descriptor');
  }

  return createDescriptor(
    descriptor.type,
    descriptor.props,
    descriptor.children,
    descriptor.key,
    [...descriptor.modifiers, modifier]
  );
}

/**
 * Set the key on a descriptor (returns new descriptor)
 *
 * @param {Object} descriptor - View descriptor
 * @param {string|number} key - Key to set
 * @returns {Object} New descriptor with key set
 */
export function setKey(descriptor, key) {
  if (!isDescriptor(descriptor)) {
    throw new Error('setKey requires a view descriptor');
  }

  return createDescriptor(
    descriptor.type,
    descriptor.props,
    descriptor.children,
    key,
    descriptor.modifiers
  );
}

/**
 * Modifier descriptor types
 */
export const ModifierType = {
  PADDING: 'padding',
  FRAME: 'frame',
  FOREGROUND_COLOR: 'foregroundColor',
  BACKGROUND: 'background',
  FONT: 'font',
  OPACITY: 'opacity',
  CORNER_RADIUS: 'cornerRadius',
  BORDER: 'border',
  SHADOW: 'shadow',
  ON_TAP: 'onTap',
  ON_APPEAR: 'onAppear',
  ON_DISAPPEAR: 'onDisappear',
  ON_CHANGE: 'onChange',
  TASK: 'task',
  SEARCHABLE: 'searchable',
  SHEET: 'sheet',
  // fullScreenCover, alert and confirmationDialog (#38); value.kind says which.
  PRESENTATION: 'presentation',
  ACCESSIBILITY_LABEL: 'accessibilityLabel',
  ACCESSIBILITY_VALUE: 'accessibilityValue',
  ACCESSIBILITY_HINT: 'accessibilityHint',
  ACCESSIBILITY_IDENTIFIER: 'accessibilityIdentifier',
  CLIP_SHAPE: 'clipShape',
  COLOR_EFFECT: 'colorEffect',
  DISTORTION_EFFECT: 'distortionEffect',
  LAYER_EFFECT: 'layerEffect',
  // Identifies a view inside a Picker or TabView, like SwiftUI's .tag(_:).
  // It carries data only and renders nothing.
  TAG: 'tag',
  // .navigationTitle(_:) (#40): the document title while the view is shown.
  NAVIGATION_TITLE: 'navigationTitle',
  // Scoped environment for this view and its descendants (#49):
  // { values: [[key, value]], objects: [object] }.
  ENVIRONMENT: 'environment',
  CUSTOM: 'custom'
};

/**
 * Create a modifier descriptor
 *
 * @param {string} type - Modifier type
 * @param {Object} value - Modifier value/options
 * @returns {Object} Frozen modifier descriptor
 */
export function createModifier(type, value) {
  // Preserve objects with prototype methods (like Color, Font)
  // These have methods like rgba() or css() that we need to keep
  let frozenValue = value;
  if (typeof value === 'object' && value !== null) {
    // Check if it has prototype methods (not a plain object)
    const hasPrototypeMethods = Object.getPrototypeOf(value) !== Object.prototype &&
                                Object.getPrototypeOf(value) !== null;
    if (!hasPrototypeMethods && !Array.isArray(value)) {
      // Plain object - freeze a copy
      frozenValue = Object.freeze({ ...value });
    }
    // Objects with prototype methods (Color, Font, etc.) are kept as-is
  }
  return Object.freeze({
    type,
    value: frozenValue
  });
}

export default {
  createDescriptor,
  isDescriptor,
  isLegacyView,
  addModifier,
  setKey,
  createModifier,
  ModifierType,
  VIEW_DESCRIPTOR
};
