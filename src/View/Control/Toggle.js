/**
 * Toggle - SwiftUI Toggle equivalent
 *
 * A control that toggles between on and off states.
 * Matches SwiftUI's Toggle API.
 *
 * Usage:
 *   Toggle('Label', isOnBinding)
 *   Toggle(isOnBinding)
 *   Toggle(labelView, isOnBinding)
 *   Toggle({ label: 'Label', isOn: binding })
 */

import { nextElementId } from '../../Core/ElementID.js';
import { isView, createDescriptor } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render as renderLabelView } from '../../Core/Renderer.js';
import { Binding } from '../../Data/Binding.js';
import { createEffect, untrack } from '../../Data/Signal.js';

function nextToggleLabelId() {
  return nextElementId('swiftui-toggle-label');
}

// Toggle's own modifiers (#48: everything else comes from the shared table).
const toggleModifiers = ({ withProps }) => ({
  disabled: (isDisabled = true) => withProps({ isDisabled }),
  // 'switch', 'checkbox', 'button'
  toggleStyle: (style) => withProps({ style }),
  tint: (color) => withProps({ tint: typeof color === 'string' ? color : color.rgba?.() || color }),
});

/**
 * Toggle - boolean switch control
 *
 * @param {string|Binding|Object} labelOrBindingOrOptions - Label string, label view, binding, or options
 * @param {Binding} [isOnBinding] - Binding to the boolean state
 * @returns {Object} Chainable view descriptor
 */
export function Toggle(labelOrBindingOrOptions, isOnBinding) {
  let label = null;
  let labelView = null;
  let isOn;

  if (labelOrBindingOrOptions instanceof Binding) {
    // Toggle(isOnBinding)
    isOn = labelOrBindingOrOptions;
  } else if (typeof labelOrBindingOrOptions === 'string') {
    // Toggle('Label', isOnBinding)
    label = labelOrBindingOrOptions;
    isOn = isOnBinding || Binding.constant(false);
  } else if (isView(labelOrBindingOrOptions)) {
    // Toggle(labelView, isOnBinding), the view a legacy View or a descriptor
    labelView = labelOrBindingOrOptions;
    isOn = isOnBinding || Binding.constant(false);
  } else if (labelOrBindingOrOptions && typeof labelOrBindingOrOptions === 'object') {
    // Options object style
    const options = labelOrBindingOrOptions;
    label = options.label || null;
    labelView = options.labelView || null;
    isOn = options.isOn || Binding.constant(false);
  } else {
    isOn = Binding.constant(false);
  }

  return chainable(createDescriptor('Toggle', {
    label,
    labelView,
    isOn,
    isDisabled: false,
    style: 'switch',
    tint: null,
  }), toggleModifiers);
}

function renderSwitch(props) {
  const { label, labelView, isOn, isDisabled, tint } = props;
  const container = document.createElement('div');
  container.dataset.view = 'Toggle';
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.gap = '8px';
  container.style.cursor = isDisabled ? 'not-allowed' : 'pointer';

  // The track is a native button with the WAI-ARIA switch role (#51): it is
  // focusable, Space and Enter activate it, and aria-checked reports the
  // state. The click bubbles to the container handler below.
  const track = document.createElement('button');
  track.type = 'button';
  track.setAttribute('role', 'switch');
  track.style.border = 'none';
  track.style.padding = '0';
  track.style.margin = '0';
  track.style.flexShrink = '0';
  track.style.cursor = 'inherit';
  track.style.appearance = 'none';
  if (isDisabled) {
    track.disabled = true;
    track.setAttribute('aria-disabled', 'true');
  }
  track.style.width = '51px';
  track.style.height = '31px';
  track.style.borderRadius = '15.5px';
  track.style.position = 'relative';
  track.style.transition = 'background-color 0.2s ease';

  const thumb = document.createElement('div');
  thumb.style.width = '27px';
  thumb.style.height = '27px';
  thumb.style.borderRadius = '50%';
  thumb.style.backgroundColor = 'white';
  thumb.style.position = 'absolute';
  thumb.style.top = '2px';
  thumb.style.transition = 'left 0.2s ease';
  thumb.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';

  // Re-runs when the binding changes from any source (a click or a write
  // elsewhere).
  createEffect(() => {
    const on = isOn.value;
    track.setAttribute('aria-checked', on ? 'true' : 'false');
    if (on) {
      track.style.backgroundColor = tint || 'rgba(52, 199, 89, 1)'; // iOS green
      thumb.style.left = '22px';
    } else {
      track.style.backgroundColor = 'rgba(120, 120, 128, 0.16)';
      thumb.style.left = '2px';
    }
  });

  track.appendChild(thumb);

  // The visible label names the switch.
  if (label) {
    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    labelElement.id = nextToggleLabelId();
    track.setAttribute('aria-labelledby', labelElement.id);
    container.appendChild(labelElement);
  } else if (labelView) {
    const labelElement = renderLabelView(labelView);
    if (!labelElement.id) labelElement.id = nextToggleLabelId();
    track.setAttribute('aria-labelledby', labelElement.id);
    container.appendChild(labelElement);
  }

  container.appendChild(track);

  if (!isDisabled) {
    container.addEventListener('click', () => {
      untrack(() => { isOn.value = !isOn.value; });
    });
  } else {
    container.style.opacity = '0.5';
  }

  return container;
}

function renderCheckbox(props) {
  const { label, labelView, isOn, isDisabled, tint } = props;
  const container = document.createElement('label');
  container.dataset.view = 'Toggle';
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.gap = '8px';
  container.style.cursor = isDisabled ? 'not-allowed' : 'pointer';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.disabled = isDisabled;
  checkbox.style.width = '18px';
  checkbox.style.height = '18px';
  checkbox.style.cursor = 'inherit';
  if (tint) checkbox.style.accentColor = tint;

  createEffect(() => {
    const desired = !!isOn.value;
    if (checkbox.checked !== desired) checkbox.checked = desired;
  });

  checkbox.addEventListener('change', () => {
    untrack(() => { isOn.value = checkbox.checked; });
  });

  container.appendChild(checkbox);

  if (label) {
    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    container.appendChild(labelElement);
  } else if (labelView) {
    container.appendChild(renderLabelView(labelView));
  }

  if (isDisabled) container.style.opacity = '0.5';

  return container;
}

function renderButton(props) {
  const { label, labelView, isOn, isDisabled, tint } = props;
  const button = document.createElement('button');
  button.dataset.view = 'Toggle';
  button.disabled = isDisabled;
  button.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
  button.style.padding = '8px 16px';
  button.style.borderRadius = '8px';
  button.style.border = 'none';
  button.style.fontFamily = 'inherit';
  button.style.fontSize = 'inherit';
  button.style.transition = 'background-color 0.2s ease';

  createEffect(() => {
    if (isOn.value) {
      button.style.backgroundColor = tint || 'rgba(0, 122, 255, 1)';
      button.style.color = 'white';
    } else {
      button.style.backgroundColor = 'rgba(120, 120, 128, 0.16)';
      button.style.color = 'inherit';
    }
  });

  if (label) {
    button.textContent = label;
  } else if (labelView) {
    button.appendChild(renderLabelView(labelView));
  }

  button.addEventListener('click', () => {
    if (!isDisabled) {
      untrack(() => { isOn.value = !isOn.value; });
    }
  });

  if (isDisabled) button.style.opacity = '0.5';

  return button;
}

registerRenderer('Toggle', (props) => {
  switch (props.style) {
    case 'checkbox':
      return renderCheckbox(props);
    case 'button':
      return renderButton(props);
    case 'switch':
    default:
      return renderSwitch(props);
  }
});

export default Toggle;
