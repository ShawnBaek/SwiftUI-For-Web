/**
 * Spacer - A flexible space that expands along the major axis of its parent.
 *
 * Matches SwiftUI's Spacer for flexible layout spacing.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * // Push content to edges
 * HStack(
 *   Text('Left'),
 *   Spacer(),
 *   Text('Right')
 * )
 *
 * // Push content to bottom
 * VStack(
 *   Text('Top'),
 *   Spacer(),
 *   Text('Bottom')
 * )
 *
 * // With minimum length
 * Spacer({ minLength: 20 })
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
  chain.onChange = (of, optionsOrAction, action) => chainable(addModifier(descriptor, createModifier(ModifierType.ON_CHANGE, { of, optionsOrAction, action })));
  chain.searchable = (text, options = {}) => chainable(addModifier(descriptor, createModifier(ModifierType.SEARCHABLE, { text, options })));
  chain.sheet = (isPresented, optionsOrContent, content) => chainable(addModifier(descriptor, createModifier(ModifierType.SHEET, { isPresented, optionsOrContent, content })));
  chain.accessibilityLabel = (label) => chainable(addModifier(descriptor, createModifier(ModifierType.ACCESSIBILITY_LABEL, label)));
  chain.accessibilityValue = (value) => chainable(addModifier(descriptor, createModifier(ModifierType.ACCESSIBILITY_VALUE, value)));
  chain.accessibilityHint = (hint) => chainable(addModifier(descriptor, createModifier(ModifierType.ACCESSIBILITY_HINT, hint)));
  chain.accessibilityIdentifier = (identifier) => chainable(addModifier(descriptor, createModifier(ModifierType.ACCESSIBILITY_IDENTIFIER, identifier)));
  chain.id = (key) => chainable(setKey(descriptor, key));
  chain.modifier = (mod) => chainable(addModifier(descriptor, createModifier(ModifierType.CUSTOM, mod)));

  return Object.freeze(chain);
}

/**
 * Spacer - Flexible space
 *
 * @param {Object} [options] - Spacer options
 * @param {number} [options.minLength] - Minimum length in pixels
 * @returns {Object} Chainable view descriptor
 *
 * @example
 * // Default spacer
 * Spacer()
 *
 * // With minimum length
 * Spacer({ minLength: 16 })
 */
export function Spacer(options = {}) {
  return chainable(createDescriptor('Spacer', {
    minLength: options.minLength ?? null
  }));
}

export default Spacer;
