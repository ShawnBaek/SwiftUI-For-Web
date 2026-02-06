/**
 * ViewFactory - Factory functions for creating immutable view descriptors
 *
 * This module provides SwiftUI-like factory functions that create
 * immutable view descriptors instead of mutable class instances.
 *
 * Benefits:
 * - Immutable (safer, more predictable)
 * - Lighter weight (plain objects vs class instances)
 * - Better diffing (structural comparison)
 * - Memoization support
 *
 * Usage:
 * import { Text, VStack, Button } from './ViewFactory.js';
 *
 * const view = VStack({ spacing: 10 },
 *   Text('Hello').font(Font.title),
 *   Button('Click', () => console.log('clicked'))
 * );
 *
 * @example
 * // These return immutable descriptors, not class instances
 * const text = Text('Hello');  // { type: 'Text', props: { content: 'Hello' }, ... }
 */

import {
  createDescriptor,
  addModifier,
  setKey,
  createModifier,
  ModifierType,
  memo
} from './ViewDescriptor.js';

/**
 * Create a chainable descriptor with modifier methods
 * This allows SwiftUI-style modifier chaining on descriptors
 *
 * @param {Object} descriptor - Base descriptor
 * @returns {Object} Descriptor with modifier methods
 */
function chainable(descriptor) {
  // Create a new object that wraps the descriptor
  // with modifier methods that return new chainables
  const chain = Object.create(null);

  // Copy all descriptor properties
  Object.assign(chain, descriptor);

  // Add modifier methods
  chain.padding = (value) => chainable(addModifier(descriptor, createModifier(ModifierType.PADDING, value)));
  chain.frame = (options) => chainable(addModifier(descriptor, createModifier(ModifierType.FRAME, options)));
  chain.foregroundColor = (color) => chainable(addModifier(descriptor, createModifier(ModifierType.FOREGROUND_COLOR, color)));
  chain.background = (color) => chainable(addModifier(descriptor, createModifier(ModifierType.BACKGROUND, color)));
  chain.font = (font) => chainable(addModifier(descriptor, createModifier(ModifierType.FONT, font)));
  chain.opacity = (value) => chainable(addModifier(descriptor, createModifier(ModifierType.OPACITY, value)));
  chain.cornerRadius = (radius) => chainable(addModifier(descriptor, createModifier(ModifierType.CORNER_RADIUS, radius)));
  chain.border = (color, width = 1) => chainable(addModifier(descriptor, createModifier(ModifierType.BORDER, { color, width })));
  chain.shadow = (options) => chainable(addModifier(descriptor, createModifier(ModifierType.SHADOW, options)));
  chain.onTapGesture = (handler) => chainable(addModifier(descriptor, createModifier(ModifierType.ON_TAP, handler)));
  chain.onAppear = (handler) => chainable(addModifier(descriptor, createModifier(ModifierType.ON_APPEAR, handler)));
  chain.onDisappear = (handler) => chainable(addModifier(descriptor, createModifier(ModifierType.ON_DISAPPEAR, handler)));
  chain.clipShape = (shape) => chainable(addModifier(descriptor, createModifier(ModifierType.CLIP_SHAPE, shape)));
  chain.id = (key) => chainable(setKey(descriptor, key));

  // Custom modifier support
  chain.modifier = (mod) => chainable(addModifier(descriptor, createModifier(ModifierType.CUSTOM, mod)));

  // Freeze the chain to prevent modifications
  return Object.freeze(chain);
}

// ============================================================================
// View Factory Functions
// ============================================================================

/**
 * Text view - displays a string
 *
 * @param {string|number} content - Text content
 * @returns {Object} Chainable descriptor
 *
 * @example
 * Text('Hello, World!')
 *   .font(Font.title)
 *   .foregroundColor(Color.blue)
 */
export function Text(content) {
  return chainable(createDescriptor('Text', { content: String(content) }));
}

/**
 * VStack - Vertical stack layout
 *
 * @param {Object|...Object} optionsOrChildren - Options or first child
 * @param {...Object} children - Child views
 * @returns {Object} Chainable descriptor
 *
 * @example
 * VStack({ spacing: 16, alignment: 'leading' },
 *   Text('Title'),
 *   Text('Subtitle')
 * )
 */
export function VStack(optionsOrChildren, ...children) {
  let options = {};
  let actualChildren = children;

  // Handle different call signatures
  if (optionsOrChildren && typeof optionsOrChildren === 'object' && !optionsOrChildren.$$typeof) {
    // First arg is options
    if (!Array.isArray(optionsOrChildren) && !optionsOrChildren.type) {
      options = optionsOrChildren;
    } else {
      // First arg is a child
      actualChildren = [optionsOrChildren, ...children];
    }
  } else if (optionsOrChildren != null) {
    actualChildren = [optionsOrChildren, ...children];
  }

  // Flatten and filter children
  actualChildren = actualChildren.flat().filter(c => c != null);

  return chainable(createDescriptor('VStack', {
    alignment: options.alignment ?? 'center',
    spacing: options.spacing ?? 8
  }, actualChildren));
}

/**
 * HStack - Horizontal stack layout
 *
 * @param {Object|...Object} optionsOrChildren - Options or first child
 * @param {...Object} children - Child views
 * @returns {Object} Chainable descriptor
 */
export function HStack(optionsOrChildren, ...children) {
  let options = {};
  let actualChildren = children;

  if (optionsOrChildren && typeof optionsOrChildren === 'object' && !optionsOrChildren.$$typeof) {
    if (!Array.isArray(optionsOrChildren) && !optionsOrChildren.type) {
      options = optionsOrChildren;
    } else {
      actualChildren = [optionsOrChildren, ...children];
    }
  } else if (optionsOrChildren != null) {
    actualChildren = [optionsOrChildren, ...children];
  }

  actualChildren = actualChildren.flat().filter(c => c != null);

  return chainable(createDescriptor('HStack', {
    alignment: options.alignment ?? 'center',
    spacing: options.spacing ?? 8
  }, actualChildren));
}

/**
 * ZStack - Layered stack (z-axis)
 *
 * @param {Object|...Object} optionsOrChildren - Options or first child
 * @param {...Object} children - Child views
 * @returns {Object} Chainable descriptor
 */
export function ZStack(optionsOrChildren, ...children) {
  let options = {};
  let actualChildren = children;

  if (optionsOrChildren && typeof optionsOrChildren === 'object' && !optionsOrChildren.$$typeof) {
    if (!Array.isArray(optionsOrChildren) && !optionsOrChildren.type) {
      options = optionsOrChildren;
    } else {
      actualChildren = [optionsOrChildren, ...children];
    }
  } else if (optionsOrChildren != null) {
    actualChildren = [optionsOrChildren, ...children];
  }

  actualChildren = actualChildren.flat().filter(c => c != null);

  return chainable(createDescriptor('ZStack', {
    alignment: options.alignment ?? 'center'
  }, actualChildren));
}

/**
 * Spacer - Flexible space
 *
 * @returns {Object} Chainable descriptor
 */
export function Spacer() {
  return chainable(createDescriptor('Spacer', {}));
}

/**
 * Divider - Visual separator
 *
 * @returns {Object} Chainable descriptor
 */
export function Divider() {
  return chainable(createDescriptor('Divider', {}));
}

/**
 * Button - Clickable control
 *
 * @param {string|Object} labelOrChild - Button label string or child view
 * @param {Function} action - Click handler
 * @returns {Object} Chainable descriptor
 *
 * @example
 * Button('Click Me', () => console.log('clicked'))
 * Button(Text('Submit').bold(), onSubmit)
 */
export function Button(labelOrChild, action) {
  let children = [];
  let label = null;

  if (typeof labelOrChild === 'string') {
    label = labelOrChild;
  } else if (labelOrChild != null) {
    children = [labelOrChild];
  }

  return chainable(createDescriptor('Button', { label, action }, children));
}

/**
 * Image - Displays an image
 *
 * @param {string} source - Image URL or path
 * @returns {Object} Chainable descriptor
 */
export function Image(source) {
  const desc = chainable(createDescriptor('Image', { source }));

  // Add Image-specific modifiers
  const extended = Object.create(desc);
  extended.resizable = () => chainable(createDescriptor('Image', { ...desc.props, resizable: true }, desc.children, desc.key, desc.modifiers));
  extended.aspectRatio = (ratio) => chainable(createDescriptor('Image', { ...desc.props, aspectRatio: ratio }, desc.children, desc.key, desc.modifiers));

  return Object.freeze(extended);
}

/**
 * Group - Logical grouping of views
 *
 * @param {...Object} children - Child views
 * @returns {Object} Chainable descriptor
 */
export function Group(...children) {
  return chainable(createDescriptor('Group', {}, children.flat().filter(c => c != null)));
}

/**
 * ScrollView - Scrollable container
 *
 * @param {Object|...Object} optionsOrChildren - Options or first child
 * @param {...Object} children - Child views
 * @returns {Object} Chainable descriptor
 */
export function ScrollView(optionsOrChildren, ...children) {
  let options = {};
  let actualChildren = children;

  if (optionsOrChildren && typeof optionsOrChildren === 'object' && !optionsOrChildren.$$typeof) {
    if (!Array.isArray(optionsOrChildren) && !optionsOrChildren.type) {
      options = optionsOrChildren;
    } else {
      actualChildren = [optionsOrChildren, ...children];
    }
  } else if (optionsOrChildren != null) {
    actualChildren = [optionsOrChildren, ...children];
  }

  actualChildren = actualChildren.flat().filter(c => c != null);

  return chainable(createDescriptor('ScrollView', {
    axis: options.axis ?? 'vertical',
    showsIndicators: options.showsIndicators ?? true
  }, actualChildren));
}

/**
 * ForEach - Iterate over a collection
 *
 * @param {Array} data - Array of items
 * @param {Object|Function} optionsOrBuilder - Options with id key, or builder function
 * @param {Function} [builder] - Function that takes item and returns view
 * @returns {Object} Chainable descriptor
 *
 * @example
 * ForEach(items, { id: 'id' }, item => Text(item.name))
 * ForEach(['a', 'b', 'c'], (item, index) => Text(item).id(index))
 */
export function ForEach(data, optionsOrBuilder, builder) {
  let idKey = null;
  let builderFn = builder;

  if (typeof optionsOrBuilder === 'function') {
    builderFn = optionsOrBuilder;
  } else if (optionsOrBuilder && typeof optionsOrBuilder === 'object') {
    idKey = optionsOrBuilder.id;
  }

  if (!builderFn) {
    throw new Error('ForEach requires a builder function');
  }

  // Build children with keys
  const children = data.map((item, index) => {
    const child = builderFn(item, index);
    // Set key based on idKey or index
    const key = idKey ? item[idKey] : index;
    return child.id ? child.id(key) : setKey(child, key);
  });

  return chainable(createDescriptor('ForEach', { idKey }, children));
}

// ============================================================================
// Memoization Helpers
// ============================================================================

/**
 * Memoize a view component
 * The component will only re-render if its props change
 *
 * @param {Function} component - Component function
 * @returns {Function} Memoized component
 *
 * @example
 * const ExpensiveList = Memo((items) =>
 *   VStack(
 *     ForEach(items, item => ExpensiveItem(item))
 *   )
 * );
 */
export const Memo = memo;

// ============================================================================
// Export all
// ============================================================================

export default {
  Text,
  VStack,
  HStack,
  ZStack,
  Spacer,
  Divider,
  Button,
  Image,
  Group,
  ScrollView,
  ForEach,
  Memo
};
