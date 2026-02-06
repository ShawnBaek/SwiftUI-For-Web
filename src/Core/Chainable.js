/**
 * Chainable - Utility for creating chainable view descriptors
 *
 * Provides SwiftUI-style modifier chaining for immutable descriptors.
 * Each modifier call returns a new frozen descriptor.
 */

import {
  addModifier,
  setKey,
  createModifier,
  ModifierType
} from './ViewDescriptor.js';

/**
 * Create a chainable descriptor with modifier methods
 * Each modifier returns a new chainable with the modifier added.
 *
 * @param {Object} descriptor - Base descriptor
 * @returns {Object} Frozen descriptor with modifier methods
 */
export function chainable(descriptor) {
  const chain = Object.create(null);

  // Copy all descriptor properties
  Object.assign(chain, descriptor);

  // Layout modifiers
  chain.padding = (value) => chainable(addModifier(descriptor, createModifier(ModifierType.PADDING, value)));
  chain.frame = (options) => chainable(addModifier(descriptor, createModifier(ModifierType.FRAME, options)));

  // Style modifiers
  chain.foregroundColor = (color) => chainable(addModifier(descriptor, createModifier(ModifierType.FOREGROUND_COLOR, color)));
  chain.background = (color) => chainable(addModifier(descriptor, createModifier(ModifierType.BACKGROUND, color)));
  chain.font = (font) => chainable(addModifier(descriptor, createModifier(ModifierType.FONT, font)));
  chain.opacity = (value) => chainable(addModifier(descriptor, createModifier(ModifierType.OPACITY, value)));
  chain.cornerRadius = (radius) => chainable(addModifier(descriptor, createModifier(ModifierType.CORNER_RADIUS, radius)));
  chain.border = (color, width = 1) => chainable(addModifier(descriptor, createModifier(ModifierType.BORDER, { color, width })));
  chain.shadow = (options) => chainable(addModifier(descriptor, createModifier(ModifierType.SHADOW, options)));
  chain.clipShape = (shape) => chainable(addModifier(descriptor, createModifier(ModifierType.CLIP_SHAPE, shape)));

  // Event modifiers
  chain.onTapGesture = (handler) => chainable(addModifier(descriptor, createModifier(ModifierType.ON_TAP, handler)));
  chain.onAppear = (handler) => chainable(addModifier(descriptor, createModifier(ModifierType.ON_APPEAR, handler)));
  chain.onDisappear = (handler) => chainable(addModifier(descriptor, createModifier(ModifierType.ON_DISAPPEAR, handler)));

  // Identity
  chain.id = (key) => chainable(setKey(descriptor, key));

  // Custom modifier support (for backward compatibility)
  chain.modifier = (mod) => chainable(addModifier(descriptor, createModifier(ModifierType.CUSTOM, mod)));

  return Object.freeze(chain);
}

export default chainable;
