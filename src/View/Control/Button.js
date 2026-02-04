/**
 * Button - A control that initiates an action.
 *
 * Matches SwiftUI's Button for triggering actions on tap/click.
 *
 * @example
 * // Basic usage with string label
 * Button('Click Me', () => console.log('Clicked!'))
 *
 * // With custom label view
 * Button(() => handleTap(),
 *   HStack(
 *     Image('icon.png'),
 *     Text('Custom Label')
 *   )
 * )
 *
 * // With modifiers
 * Button('Submit', onSubmit)
 *   .padding(16)
 *   .background(Color.blue)
 *   .foregroundColor(Color.white)
 *   .cornerRadius(8)
 */

import { View } from '../../Core/View.js';

/**
 * Button view class implementation.
 * @extends View
 */
class ButtonView extends View {
  /**
   * Creates a new Button.
   *
   * Supports multiple call signatures:
   * - Button(label, action) - String label with action
   * - Button(action, label) - SwiftUI-style with action first, then label view
   *
   * @param {string|Function|View} labelOrAction - Button label string, action function, or label view
   * @param {Function|View} [actionOrLabel] - Action function or label view
   */
  constructor(labelOrAction, actionOrLabel) {
    super();

    // Parse arguments to support multiple signatures
    if (typeof labelOrAction === 'string') {
      // Button('Label', action)
      this._label = labelOrAction;
      this._labelView = null;
      this._action = actionOrLabel || (() => {});
    } else if (typeof labelOrAction === 'function' && !(labelOrAction instanceof View)) {
      // Button(action, labelView) - SwiftUI style
      this._action = labelOrAction;
      if (actionOrLabel instanceof View) {
        this._label = null;
        this._labelView = actionOrLabel;
      } else if (typeof actionOrLabel === 'string') {
        this._label = actionOrLabel;
        this._labelView = null;
      } else {
        this._label = 'Button';
        this._labelView = null;
      }
    } else if (labelOrAction instanceof View) {
      // Button(labelView, action)
      this._labelView = labelOrAction;
      this._label = null;
      this._action = actionOrLabel || (() => {});
    } else {
      // Default
      this._label = 'Button';
      this._labelView = null;
      this._action = () => {};
    }

    this._isDisabled = false;
    this._buttonStyle = 'default';
  }

  /**
   * Button returns itself as the body (leaf view).
   *
   * @returns {ButtonView} Returns this
   */
  body() {
    return this;
  }

  /**
   * Disables the button.
   *
   * @param {boolean} [disabled=true] - Whether the button is disabled
   * @returns {ButtonView} Returns this for chaining
   */
  disabled(disabled = true) {
    this._isDisabled = disabled;
    return this;
  }

  /**
   * Sets the button style.
   *
   * @param {string} style - Button style ('default', 'bordered', 'borderedProminent', 'borderless', 'plain')
   * @returns {ButtonView} Returns this for chaining
   */
  buttonStyle(style) {
    this._buttonStyle = style;
    return this;
  }

  /**
   * Renders the Button to a DOM element.
   *
   * @returns {HTMLButtonElement} The rendered button element
   * @protected
   */
  _render() {
    const button = document.createElement('button');
    button.dataset.view = 'Button';

    // Set button content
    if (this._labelView) {
      button.appendChild(this._labelView._render());
    } else {
      button.textContent = this._label;
    }

    // Apply disabled state
    if (this._isDisabled) {
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    } else {
      button.style.cursor = 'pointer';
    }

    // Apply button style
    this._applyButtonStyle(button);

    // Add click handler
    button.addEventListener('click', (event) => {
      if (!this._isDisabled) {
        event.preventDefault();
        this._action();
      }
    });

    return this._applyModifiers(button);
  }

  /**
   * Applies the button style to the element.
   *
   * @param {HTMLButtonElement} button - The button element
   * @private
   */
  _applyButtonStyle(button) {
    // Reset default button styles
    button.style.border = 'none';
    button.style.background = 'none';
    button.style.fontFamily = 'inherit';
    button.style.fontSize = 'inherit';
    button.style.padding = '0';
    button.style.margin = '0';

    switch (this._buttonStyle) {
      case 'bordered':
        button.style.padding = '8px 16px';
        button.style.border = '1px solid currentColor';
        button.style.borderRadius = '8px';
        button.style.background = 'transparent';
        break;

      case 'borderedProminent':
        button.style.padding = '8px 16px';
        button.style.borderRadius = '8px';
        button.style.background = 'rgba(0, 122, 255, 1)';
        button.style.color = 'white';
        break;

      case 'borderless':
        button.style.padding = '8px 16px';
        button.style.background = 'transparent';
        break;

      case 'plain':
        // No additional styling
        break;

      case 'default':
      default:
        // Default iOS-style button appearance
        button.style.color = 'rgba(0, 122, 255, 1)';
        break;
    }
  }
}

/**
 * Factory function for creating Button views.
 * Provides cleaner syntax without the `new` keyword.
 *
 * @param {string|Function|View} labelOrAction - Button label, action, or label view
 * @param {Function|View} [actionOrLabel] - Action function or label view
 * @returns {ButtonView} A new Button instance
 *
 * @example
 * // String label with action
 * Button('Tap Me', () => console.log('Tapped'))
 *
 * // SwiftUI style: action first, then label
 * Button(() => doSomething(), Text('Do It').bold())
 *
 * // With modifiers
 * Button('Submit', onSubmit)
 *   .buttonStyle('borderedProminent')
 *   .disabled(isLoading)
 */
export function Button(labelOrAction, actionOrLabel) {
  return new ButtonView(labelOrAction, actionOrLabel);
}

// Export the class for those who want to extend it
export { ButtonView };

export default Button;
