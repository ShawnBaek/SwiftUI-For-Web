/**
 * Text - A view that displays one or more lines of read-only text.
 *
 * Matches SwiftUI's Text view for displaying static text content.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * // Basic usage
 * Text('Hello, World!')
 *
 * // With modifiers
 * Text('Welcome')
 *   .font(Font.title)
 *   .foregroundColor(Color.blue)
 *   .bold()
 */

import {
  createDescriptor,
  addModifier,
  setKey,
  createModifier,
  ModifierType
} from '../Core/ViewDescriptor.js';

/**
 * Create a chainable descriptor with Text-specific modifier methods
 */
function chainable(descriptor) {
  const chain = Object.create(null);
  Object.assign(chain, descriptor);

  // Standard modifiers
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

  // Text-specific modifiers
  chain.bold = () => {
    const newProps = { ...descriptor.props, fontWeight: 'bold' };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.italic = () => {
    const newProps = { ...descriptor.props, isItalic: true };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.fontWeight = (weight) => {
    const newProps = { ...descriptor.props, fontWeight: weight };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.underline = (active = true, color = null) => {
    const newProps = { ...descriptor.props, isUnderline: active, underlineColor: color };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.strikethrough = (active = true, color = null) => {
    const newProps = { ...descriptor.props, isStrikethrough: active, strikethroughColor: color };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.multilineTextAlignment = (alignment) => {
    const newProps = { ...descriptor.props, textAlignment: alignment };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.lineLimit = (limit) => {
    const newProps = { ...descriptor.props, lineLimit: limit };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.truncationMode = (mode) => {
    const newProps = { ...descriptor.props, truncationMode: mode };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.kerning = (spacing) => {
    const newProps = { ...descriptor.props, kerning: spacing };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.lineSpacing = (spacing) => {
    const newProps = { ...descriptor.props, lineSpacing: spacing };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.monospacedDigit = () => {
    const newProps = { ...descriptor.props, monospacedDigit: true };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.baselineOffset = (offset) => {
    const newProps = { ...descriptor.props, baselineOffset: offset };
    return chainable(createDescriptor('Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  return Object.freeze(chain);
}

/**
 * Text - Display text content
 *
 * @param {string|number} content - The text content to display
 * @returns {Object} Chainable view descriptor
 *
 * @example
 * Text('Hello, World!')
 *   .font(Font.title)
 *   .foregroundColor(Color.blue)
 */
export function Text(content) {
  return chainable(createDescriptor('Text', { content: String(content) }));
}

export default Text;
