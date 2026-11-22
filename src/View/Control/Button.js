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

import { chainable as sharedChainable } from '../../Core/Chainable.js';
import {
  createDescriptor,
  addModifier,
  setKey,
  createModifier,
  ModifierType
} from '../../Core/ViewDescriptor.js';

// Button-only modifiers (#48: everything else comes from the shared table).
const buttonModifiers = ({ withProps }) => ({
  disabled: (isDisabled = true) => withProps({ isDisabled }),
  buttonStyle: (style) => withProps({ buttonStyle: style }),
});

function chainable(descriptor) {
  return sharedChainable(descriptor, buttonModifiers);
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
export function Button(labelOrAction, actionOrLabel, roleAction) {
  let label = null;
  let role = null;
  let action = () => {};
  let children = [];

  // Parse arguments to support multiple signatures
  if (typeof labelOrAction === 'string' && actionOrLabel && typeof actionOrLabel === 'object' && !actionOrLabel.type) {
    // Button('Delete', { role: 'destructive' }, action), SwiftUI's
    // Button(_:role:action:) (#38)
    label = labelOrAction;
    role = actionOrLabel.role ?? null;
    action = roleAction || (() => {});
  } else if (typeof labelOrAction === 'string') {
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
    role,
    isDisabled: false,
    buttonStyle: 'default'
  }, children));
}

export default Button;
