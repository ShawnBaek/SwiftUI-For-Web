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
 *   SecureField('Password', textBinding, onCommit)
 */

import { createDescriptor } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer } from '../../Core/Renderer.js';
import { Binding } from '../../Data/Binding.js';
import { createEffect, untrack } from '../../Data/Signal.js';

// TextField's own modifiers (#48: everything else comes from the shared table).
const textFieldModifiers = ({ withProps }) => ({
  // Called when the user presses return.
  onCommit: (callback) => withProps({ onCommit: callback }),
  disabled: (isDisabled = true) => withProps({ isDisabled }),
  // 'default', 'roundedBorder', 'plain'
  textFieldStyle: (style) => withProps({ style }),
  // 'none', 'words', 'sentences', 'characters'
  autocapitalization: (type) => withProps({ autocapitalization: type }),
  disableAutocorrection: (disabled = true) => withProps({ autocorrection: !disabled }),
  // 'default', 'email', 'number', 'phone', 'url'
  keyboardType: (type) => withProps({ keyboardType: type }),
});

function fieldProps(placeholderOrOptions, textBinding, onEditingChanged, isSecure) {
  const base = {
    isSecure,
    isDisabled: false,
    style: 'default',
    autocapitalization: 'sentences',
    autocorrection: true,
    keyboardType: 'default',
  };
  if (placeholderOrOptions && typeof placeholderOrOptions === 'object' && !(placeholderOrOptions instanceof Binding)) {
    // Options object style
    const options = placeholderOrOptions;
    return {
      ...base,
      placeholder: options.placeholder || '',
      text: options.text || Binding.constant(''),
      onEditingChanged: options.onEditingChanged || null,
      onCommit: options.onCommit || null,
    };
  }
  // SwiftUI style: TextField("Placeholder", text: $binding)
  return {
    ...base,
    placeholder: placeholderOrOptions || '',
    text: textBinding || Binding.constant(''),
    onEditingChanged: onEditingChanged || null,
    onCommit: null,
  };
}

/**
 * TextField - text input control
 *
 * @param {string|Object} placeholderOrOptions - Placeholder text or options object
 * @param {Binding} [textBinding] - Binding to the text value
 * @param {Function} [onEditingChanged] - Called when editing state changes
 * @returns {Object} Chainable view descriptor
 */
export function TextField(placeholderOrOptions, textBinding, onEditingChanged) {
  return chainable(
    createDescriptor('TextField', fieldProps(placeholderOrOptions, textBinding, onEditingChanged, false)),
    textFieldModifiers
  );
}

/**
 * SecureField - password input control
 *
 * @param {string|Object} placeholderOrOptions - Placeholder text or options object
 * @param {Binding} [textBinding] - Binding to the text value
 * @param {Function} [onCommit] - Called when the user presses return
 * @returns {Object} Chainable view descriptor
 */
export function SecureField(placeholderOrOptions, textBinding, onCommit) {
  const props = fieldProps(placeholderOrOptions, textBinding, null, true);
  props.onCommit = onCommit || props.onCommit;
  return chainable(createDescriptor('SecureField', props), textFieldModifiers);
}

function inputType(props) {
  if (props.isSecure) return 'password';
  switch (props.keyboardType) {
    case 'email': return 'email';
    case 'number': return 'number';
    case 'phone': return 'tel';
    case 'url': return 'url';
    default: return 'text';
  }
}

function autocapitalizeValue(type) {
  switch (type) {
    case 'none': return 'none';
    case 'words': return 'words';
    case 'characters': return 'characters';
    case 'sentences':
    default: return 'sentences';
  }
}

function applyFieldStyle(element, style) {
  element.style.fontFamily = 'inherit';
  element.style.fontSize = 'inherit';

  switch (style) {
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

function renderField(props) {
  const { text, onEditingChanged, onCommit, isDisabled } = props;
  const input = document.createElement('input');
  input.type = inputType(props);
  input.placeholder = props.placeholder;
  input.value = untrack(() => text.value) || '';
  input.disabled = isDisabled;
  // Both TextField and SecureField report 'TextField', as before.
  input.dataset.view = 'TextField';

  input.autocapitalize = autocapitalizeValue(props.autocapitalization);
  input.autocomplete = props.autocorrection ? 'on' : 'off';
  if (!props.autocorrection) input.setAttribute('spellcheck', 'false');

  applyFieldStyle(input, props.style);

  if (isDisabled) {
    input.style.opacity = '0.5';
    input.style.cursor = 'not-allowed';
  }

  input.addEventListener('input', (e) => {
    // Untracked, so this write doesn't subscribe an outer effect to itself.
    untrack(() => { text.value = e.target.value; });
  });

  // When the binding changes elsewhere (vm.newTodoText = '' after Add),
  // update the value in place; focus and selection survive.
  createEffect(() => {
    const desired = text.value || '';
    if (input.value !== desired) input.value = desired;
  });

  input.addEventListener('focus', () => {
    if (onEditingChanged) onEditingChanged(true);
  });
  input.addEventListener('blur', () => {
    if (onEditingChanged) onEditingChanged(false);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && onCommit) onCommit();
  });

  return input;
}

registerRenderer('TextField', renderField);
registerRenderer('SecureField', renderField);

export default TextField;
