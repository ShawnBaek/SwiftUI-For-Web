/**
 * TextField - SwiftUI TextField equivalent
 *
 * A control that displays an editable text interface.
 * Matches SwiftUI's TextField API.
 *
 * Usage:
 *   TextField('Placeholder', textBinding)
 *   TextField('Placeholder', textBinding, onEditingChanged)
 *   TextField({ placeholder: 'Enter text', text: binding })
 */

import { View } from '../../Core/View.js';
import { Binding } from '../../Data/Binding.js';

/**
 * TextFieldView class - text input control
 */
export class TextFieldView extends View {
  /**
   * Create a TextField
   * @param {string|Object} placeholderOrOptions - Placeholder text or options object
   * @param {Binding} [textBinding] - Binding to the text value
   * @param {Function} [onEditingChanged] - Called when editing state changes
   */
  constructor(placeholderOrOptions, textBinding, onEditingChanged) {
    super();

    // Parse arguments
    if (typeof placeholderOrOptions === 'object' && !(placeholderOrOptions instanceof Binding)) {
      // Options object style
      const options = placeholderOrOptions;
      this._placeholder = options.placeholder || '';
      this._text = options.text || Binding.constant('');
      this._onEditingChanged = options.onEditingChanged || null;
      this._onCommit = options.onCommit || null;
    } else {
      // SwiftUI style: TextField("Placeholder", text: $binding)
      this._placeholder = placeholderOrOptions || '';
      this._text = textBinding || Binding.constant('');
      this._onEditingChanged = onEditingChanged || null;
      this._onCommit = null;
    }

    // Internal state
    this._isDisabled = false;
    this._isSecure = false;
    this._style = 'default';
    this._autocapitalization = 'sentences';
    this._autocorrection = true;
    this._keyboardType = 'default';
  }

  /**
   * Set the onCommit callback (called when user presses return)
   * @param {Function} callback - The callback function
   * @returns {TextFieldView}
   */
  onCommit(callback) {
    this._onCommit = callback;
    return this;
  }

  /**
   * Disable the text field
   * @param {boolean} [isDisabled=true] - Whether to disable
   * @returns {TextFieldView}
   */
  disabled(isDisabled = true) {
    this._isDisabled = isDisabled;
    return this;
  }

  /**
   * Apply a text field style
   * @param {string} style - 'default', 'roundedBorder', 'plain'
   * @returns {TextFieldView}
   */
  textFieldStyle(style) {
    this._style = style;
    return this;
  }

  /**
   * Set autocapitalization behavior
   * @param {string} type - 'none', 'words', 'sentences', 'characters'
   * @returns {TextFieldView}
   */
  autocapitalization(type) {
    this._autocapitalization = type;
    return this;
  }

  /**
   * Enable/disable autocorrection
   * @param {boolean} [enabled=true] - Whether to enable
   * @returns {TextFieldView}
   */
  disableAutocorrection(disabled = true) {
    this._autocorrection = !disabled;
    return this;
  }

  /**
   * Set keyboard type
   * @param {string} type - 'default', 'email', 'number', 'phone', 'url'
   * @returns {TextFieldView}
   */
  keyboardType(type) {
    this._keyboardType = type;
    return this;
  }

  /**
   * Get the input type based on keyboard type
   * @returns {string}
   */
  _getInputType() {
    if (this._isSecure) return 'password';

    switch (this._keyboardType) {
      case 'email': return 'email';
      case 'number': return 'number';
      case 'phone': return 'tel';
      case 'url': return 'url';
      default: return 'text';
    }
  }

  /**
   * Get autocapitalize attribute value
   * @returns {string}
   */
  _getAutocapitalize() {
    switch (this._autocapitalization) {
      case 'none': return 'none';
      case 'words': return 'words';
      case 'characters': return 'characters';
      case 'sentences':
      default: return 'sentences';
    }
  }

  /**
   * Apply text field style to element
   * @param {HTMLInputElement} element
   */
  _applyStyle(element) {
    // Base styles
    element.style.fontFamily = 'inherit';
    element.style.fontSize = 'inherit';

    switch (this._style) {
      case 'roundedBorder':
        element.style.border = '1px solid rgba(0, 0, 0, 0.2)';
        element.style.borderRadius = '6px';
        element.style.padding = '8px 12px';
        element.style.backgroundColor = 'white';
        break;

      case 'plain':
        element.style.border = 'none';
        element.style.borderRadius = '0';
        element.style.padding = '8px 0';
        element.style.backgroundColor = 'transparent';
        element.style.outline = 'none';
        break;

      case 'default':
      default:
        element.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        element.style.borderRadius = '4px';
        element.style.padding = '8px 12px';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
        break;
    }
  }

  /**
   * Render to DOM
   * @returns {HTMLInputElement}
   */
  _render() {
    const input = document.createElement('input');
    input.type = this._getInputType();
    input.placeholder = this._placeholder;
    input.value = this._text.value || '';
    input.disabled = this._isDisabled;
    input.dataset.view = 'TextField';

    // Autocomplete attributes
    input.autocapitalize = this._getAutocapitalize();
    input.autocomplete = this._autocorrection ? 'on' : 'off';
    if (!this._autocorrection) {
      input.setAttribute('spellcheck', 'false');
    }

    // Apply style
    this._applyStyle(input);

    // Disabled styling
    if (this._isDisabled) {
      input.style.opacity = '0.5';
      input.style.cursor = 'not-allowed';
    }

    // Event handlers
    input.addEventListener('input', (e) => {
      this._text.value = e.target.value;
    });

    input.addEventListener('focus', () => {
      if (this._onEditingChanged) {
        this._onEditingChanged(true);
      }
    });

    input.addEventListener('blur', () => {
      if (this._onEditingChanged) {
        this._onEditingChanged(false);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this._onCommit) {
        this._onCommit();
      }
    });

    return this._applyModifiers(input);
  }
}

/**
 * SecureFieldView class - password input control
 */
export class SecureFieldView extends TextFieldView {
  constructor(placeholderOrOptions, textBinding, onCommit) {
    super(placeholderOrOptions, textBinding);
    this._isSecure = true;
    this._onCommit = onCommit || null;
  }
}

/**
 * Factory function for TextField
 * @param {string|Object} placeholderOrOptions - Placeholder or options
 * @param {Binding} [textBinding] - Text binding
 * @param {Function} [onEditingChanged] - Editing changed callback
 * @returns {TextFieldView}
 */
export function TextField(placeholderOrOptions, textBinding, onEditingChanged) {
  return new TextFieldView(placeholderOrOptions, textBinding, onEditingChanged);
}

/**
 * Factory function for SecureField
 * @param {string|Object} placeholderOrOptions - Placeholder or options
 * @param {Binding} [textBinding] - Text binding
 * @param {Function} [onCommit] - Commit callback
 * @returns {SecureFieldView}
 */
export function SecureField(placeholderOrOptions, textBinding, onCommit) {
  return new SecureFieldView(placeholderOrOptions, textBinding, onCommit);
}

export default TextField;
