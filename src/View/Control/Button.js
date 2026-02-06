/**
 * Button - A control that initiates an action.
 *
 * Matches SwiftUI's Button for triggering actions on tap/click.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * // Basic usage with string label
 * Button('Click Me', () => console.log('Clicked!'))
 *
 * // With modifiers
 * Button('Submit', onSubmit)
 *   .padding(16)
 *   .background(Color.blue)
 *   .foregroundColor(Color.white)
 *   .cornerRadius(8)
 */

import {
  createDescriptor,
  addModifier,
  setKey,
  createModifier,
  ModifierType
} from '../../Core/ViewDescriptor.js';

/**
 * Create a chainable descriptor with Button-specific modifier methods
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

  // Button-specific modifiers
  chain.disabled = (isDisabled = true) => {
    const newProps = { ...descriptor.props, isDisabled };
    return chainable(createDescriptor('Button', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  chain.buttonStyle = (style) => {
    const newProps = { ...descriptor.props, buttonStyle: style };
    return chainable(createDescriptor('Button', newProps, descriptor.children, descriptor.key, descriptor.modifiers));
  };

  return Object.freeze(chain);
}

/**
 * Button - Clickable control
 *
 * Supports multiple call signatures:
 * - Button(label, action) - String label with action
 * - Button(action, label) - SwiftUI-style with action first
 *
 * @param {string|Function|Object} labelOrAction - Button label string, action function, or label view
 * @param {Function|Object} [actionOrLabel] - Action function or label view
 * @returns {Object} Chainable view descriptor
 *
 * @example
 * Button('Tap Me', () => console.log('Tapped'))
 * Button('Submit', onSubmit)
 *   .buttonStyle('borderedProminent')
 *   .disabled(isLoading)
 */
export function Button(labelOrAction, actionOrLabel) {
  let label = null;
  let action = () => {};
  let children = [];

  // Parse arguments to support multiple signatures
  if (typeof labelOrAction === 'string') {
    // Button('Label', action)
    label = labelOrAction;
    action = actionOrLabel || (() => {});
  } else if (typeof labelOrAction === 'function' && !labelOrAction.type) {
    // Button(action, labelView) - SwiftUI style
    action = labelOrAction;
    if (actionOrLabel && typeof actionOrLabel === 'object' && actionOrLabel.type) {
      children = [actionOrLabel];
    } else if (typeof actionOrLabel === 'string') {
      label = actionOrLabel;
    } else {
      label = 'Button';
    }
  } else if (labelOrAction && typeof labelOrAction === 'object' && labelOrAction.type) {
    // Button(labelView, action)
    children = [labelOrAction];
    action = actionOrLabel || (() => {});
  } else {
    // Default
    label = 'Button';
  }

  return chainable(createDescriptor('Button', {
    label,
    action,
    isDisabled: false,
    buttonStyle: 'default'
  }, children));
}

export default Button;
