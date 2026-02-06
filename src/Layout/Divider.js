/**
 * Divider - A visual separator between views
 *
 * Matches SwiftUI's Divider view that creates a horizontal or vertical line.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * VStack(
 *   Text('Item 1'),
 *   Divider(),
 *   Text('Item 2')
 * )
 */

import {
  createDescriptor,
  addModifier,
  setKey,
  createModifier,
  ModifierType
} from '../Core/ViewDescriptor.js';

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
  chain.opacity = (value) => chainable(addModifier(descriptor, createModifier(ModifierType.OPACITY, value)));
  chain.id = (key) => chainable(setKey(descriptor, key));
  chain.modifier = (mod) => chainable(addModifier(descriptor, createModifier(ModifierType.CUSTOM, mod)));

  return Object.freeze(chain);
}

/**
 * Divider - Visual separator
 *
 * @returns {Object} Chainable view descriptor
 *
 * @example
 * Divider()
 */
export function Divider() {
  return chainable(createDescriptor('Divider', {}));
}

export default Divider;
