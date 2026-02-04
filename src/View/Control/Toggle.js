/**
 * Toggle - SwiftUI Toggle equivalent
 *
 * A control that toggles between on and off states.
 * Matches SwiftUI's Toggle API.
 *
 * Usage:
 *   Toggle('Label', isOnBinding)
 *   Toggle(isOnBinding)
 *   Toggle({ label: 'Label', isOn: binding })
 */

import { View } from '../../Core/View.js';
import { Binding } from '../../Data/Binding.js';

/**
 * ToggleView class - boolean switch control
 */
export class ToggleView extends View {
  /**
   * Create a Toggle
   * @param {string|Binding|Object} labelOrBindingOrOptions - Label string, binding, or options
   * @param {Binding} [isOnBinding] - Binding to the boolean state
   */
  constructor(labelOrBindingOrOptions, isOnBinding) {
    super();

    // Parse arguments
    if (labelOrBindingOrOptions instanceof Binding) {
      // Toggle(isOnBinding)
      this._label = null;
      this._labelView = null;
      this._isOn = labelOrBindingOrOptions;
    } else if (typeof labelOrBindingOrOptions === 'object' && !(labelOrBindingOrOptions instanceof View)) {
      // Options object style
      const options = labelOrBindingOrOptions;
      this._label = options.label || null;
      this._labelView = options.labelView || null;
      this._isOn = options.isOn || Binding.constant(false);
    } else if (typeof labelOrBindingOrOptions === 'string') {
      // Toggle('Label', isOnBinding)
      this._label = labelOrBindingOrOptions;
      this._labelView = null;
      this._isOn = isOnBinding || Binding.constant(false);
    } else if (labelOrBindingOrOptions instanceof View) {
      // Toggle(labelView, isOnBinding)
      this._label = null;
      this._labelView = labelOrBindingOrOptions;
      this._isOn = isOnBinding || Binding.constant(false);
    } else {
      this._label = null;
      this._labelView = null;
      this._isOn = Binding.constant(false);
    }

    // Internal state
    this._isDisabled = false;
    this._style = 'switch'; // 'switch', 'checkbox', 'button'
    this._tint = null;
  }

  /**
   * Disable the toggle
   * @param {boolean} [isDisabled=true] - Whether to disable
   * @returns {ToggleView}
   */
  disabled(isDisabled = true) {
    this._isDisabled = isDisabled;
    return this;
  }

  /**
   * Set the toggle style
   * @param {string} style - 'switch', 'checkbox', 'button'
   * @returns {ToggleView}
   */
  toggleStyle(style) {
    this._style = style;
    return this;
  }

  /**
   * Set the tint color when on
   * @param {string|ColorValue} color - The tint color
   * @returns {ToggleView}
   */
  tint(color) {
    this._tint = typeof color === 'string' ? color : color.rgba?.() || color;
    return this;
  }

  /**
   * Render the switch-style toggle
   * @returns {HTMLElement}
   */
  _renderSwitch() {
    const container = document.createElement('div');
    container.dataset.view = 'Toggle';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    container.style.cursor = this._isDisabled ? 'not-allowed' : 'pointer';

    // Create the switch track
    const track = document.createElement('div');
    track.style.width = '51px';
    track.style.height = '31px';
    track.style.borderRadius = '15.5px';
    track.style.position = 'relative';
    track.style.transition = 'background-color 0.2s ease';

    // Create the switch thumb
    const thumb = document.createElement('div');
    thumb.style.width = '27px';
    thumb.style.height = '27px';
    thumb.style.borderRadius = '50%';
    thumb.style.backgroundColor = 'white';
    thumb.style.position = 'absolute';
    thumb.style.top = '2px';
    thumb.style.transition = 'left 0.2s ease';
    thumb.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';

    // Update visual state based on isOn
    const updateState = () => {
      const isOn = this._isOn.value;
      if (isOn) {
        track.style.backgroundColor = this._tint || 'rgba(52, 199, 89, 1)'; // iOS green
        thumb.style.left = '22px';
      } else {
        track.style.backgroundColor = 'rgba(120, 120, 128, 0.16)';
        thumb.style.left = '2px';
      }
    };

    updateState();
    track.appendChild(thumb);

    // Label
    if (this._label) {
      const label = document.createElement('span');
      label.textContent = this._label;
      container.appendChild(label);
    } else if (this._labelView) {
      container.appendChild(this._labelView._render());
    }

    container.appendChild(track);

    // Click handler
    if (!this._isDisabled) {
      container.addEventListener('click', () => {
        this._isOn.value = !this._isOn.value;
        updateState();
      });
    }

    // Disabled styling
    if (this._isDisabled) {
      container.style.opacity = '0.5';
    }

    return container;
  }

  /**
   * Render the checkbox-style toggle
   * @returns {HTMLElement}
   */
  _renderCheckbox() {
    const container = document.createElement('label');
    container.dataset.view = 'Toggle';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    container.style.cursor = this._isDisabled ? 'not-allowed' : 'pointer';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this._isOn.value;
    checkbox.disabled = this._isDisabled;
    checkbox.style.width = '18px';
    checkbox.style.height = '18px';
    checkbox.style.cursor = 'inherit';

    if (this._tint) {
      checkbox.style.accentColor = this._tint;
    }

    checkbox.addEventListener('change', () => {
      this._isOn.value = checkbox.checked;
    });

    container.appendChild(checkbox);

    // Label
    if (this._label) {
      const label = document.createElement('span');
      label.textContent = this._label;
      container.appendChild(label);
    } else if (this._labelView) {
      container.appendChild(this._labelView._render());
    }

    // Disabled styling
    if (this._isDisabled) {
      container.style.opacity = '0.5';
    }

    return container;
  }

  /**
   * Render the button-style toggle
   * @returns {HTMLElement}
   */
  _renderButton() {
    const button = document.createElement('button');
    button.dataset.view = 'Toggle';
    button.disabled = this._isDisabled;
    button.style.cursor = this._isDisabled ? 'not-allowed' : 'pointer';
    button.style.padding = '8px 16px';
    button.style.borderRadius = '8px';
    button.style.border = 'none';
    button.style.fontFamily = 'inherit';
    button.style.fontSize = 'inherit';
    button.style.transition = 'background-color 0.2s ease';

    // Update visual state
    const updateState = () => {
      const isOn = this._isOn.value;
      if (isOn) {
        button.style.backgroundColor = this._tint || 'rgba(0, 122, 255, 1)';
        button.style.color = 'white';
      } else {
        button.style.backgroundColor = 'rgba(120, 120, 128, 0.16)';
        button.style.color = 'inherit';
      }
    };

    updateState();

    // Label
    if (this._label) {
      button.textContent = this._label;
    } else if (this._labelView) {
      button.appendChild(this._labelView._render());
    }

    // Click handler
    button.addEventListener('click', () => {
      if (!this._isDisabled) {
        this._isOn.value = !this._isOn.value;
        updateState();
      }
    });

    // Disabled styling
    if (this._isDisabled) {
      button.style.opacity = '0.5';
    }

    return button;
  }

  /**
   * Render to DOM
   * @returns {HTMLElement}
   */
  _render() {
    let element;

    switch (this._style) {
      case 'checkbox':
        element = this._renderCheckbox();
        break;
      case 'button':
        element = this._renderButton();
        break;
      case 'switch':
      default:
        element = this._renderSwitch();
        break;
    }

    return this._applyModifiers(element);
  }
}

/**
 * Factory function for Toggle
 * @param {string|Binding|Object} labelOrBindingOrOptions - Label, binding, or options
 * @param {Binding} [isOnBinding] - Boolean binding
 * @returns {ToggleView}
 */
export function Toggle(labelOrBindingOrOptions, isOnBinding) {
  return new ToggleView(labelOrBindingOrOptions, isOnBinding);
}

export default Toggle;
