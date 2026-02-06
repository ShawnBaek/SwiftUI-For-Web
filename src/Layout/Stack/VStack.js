/**
 * VStack - A view that arranges its children in a vertical line.
 *
 * Matches SwiftUI's VStack for vertical layout composition.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * // Basic usage
 * VStack(
 *   Text('Line 1'),
 *   Text('Line 2'),
 *   Text('Line 3')
 * )
 *
 * // With options
 * VStack({ alignment: 'leading', spacing: 10 },
 *   Text('Left aligned'),
 *   Text('Also left aligned')
 * )
 */

import {
  createDescriptor,
  addModifier,
  setKey,
  createModifier,
  ModifierType
} from '../../Core/ViewDescriptor.js';

/**
 * Create a chainable descriptor with modifier methods
 */
function chainable(descriptor) {
  const chain = Object.create(null);
  Object.assign(chain, descriptor);

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
  chain.modifier = (mod) => chainable(addModifier(descriptor, createModifier(ModifierType.CUSTOM, mod)));

  // TabView support - store tabItem builder function
  chain.tabItem = (builder) => {
    const newDesc = createDescriptor(descriptor.type, { ...descriptor.props, _tabItem: builder }, descriptor.children, descriptor.key, descriptor.modifiers);
    return chainable(newDesc);
  };

  // TabView support - store tag for identification
  chain.tag = (value) => {
    const newDesc = createDescriptor(descriptor.type, { ...descriptor.props, _tag: value }, descriptor.children, descriptor.key, descriptor.modifiers);
    return chainable(newDesc);
  };

  return Object.freeze(chain);
}

/**
 * VStack - Vertical stack layout
 *
 * @param {Object|...Object} optionsOrChildren - Options or first child
 * @param {...Object} children - Child views
 * @returns {Object} Chainable view descriptor
 */
export function VStack(optionsOrChildren, ...children) {
  let options = {};
  let actualChildren = children;

  // Handle different call signatures
  if (optionsOrChildren && typeof optionsOrChildren === 'object') {
    // Check if it's a descriptor or view (has type or $$typeof or _render)
    const isView = optionsOrChildren.$$typeof ||
                   optionsOrChildren.type ||
                   optionsOrChildren._render ||
                   Array.isArray(optionsOrChildren);

    if (!isView) {
      options = optionsOrChildren;
    } else {
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

export default VStack;
