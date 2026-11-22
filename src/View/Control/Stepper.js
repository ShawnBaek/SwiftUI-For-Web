/**
 * Stepper - A control for incrementing/decrementing a value
 *
 * Matches SwiftUI's Stepper view with +/- buttons.
 *
 * @example
 * Stepper('Quantity', $quantity)
 *
 * @example
 * Stepper($value, { in: [0, 10], step: 1 }, () => Text(`Value: ${value}`))
 *
 * @example
 * Stepper({
 *   onIncrement: () => count++,
 *   onDecrement: () => count--,
 *   label: () => Text(`Count: ${count}`)
 * })
 */

import { isDescriptor, isLegacyView, createDescriptor } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render as renderLabelView } from '../../Core/Renderer.js';
import { untrack, createEffect, getOwner } from '../../Data/Signal.js';

function isView(value) {
  return isLegacyView(value) || isDescriptor(value);
}

function parseRange(props, options) {
  props.min = options.in?.[0] ?? options.min ?? null;
  props.max = options.in?.[1] ?? options.max ?? null;
  props.step = options.step ?? 1;
}

/**
 * Stepper - +/- control
 *
 * Signatures:
 * - Stepper('Label', $value, options?)
 * - Stepper(labelView, $value, options?)
 * - Stepper($value, options?, label?) / Stepper($value, label)
 * - Stepper({ onIncrement, onDecrement, label })
 *
 * @returns {Object} Chainable view descriptor
 */
export function Stepper(...args) {
  const props = {
    value: null,
    min: null,
    max: null,
    step: 1,
    onIncrement: null,
    onDecrement: null,
    label: null,
    labelText: null,
  };

  if (args.length === 1 && typeof args[0] === 'object' && !isView(args[0]) && !('value' in args[0]) && !('wrappedValue' in args[0])) {
    // Stepper({ onIncrement, onDecrement, label })
    const options = args[0];
    props.onIncrement = options.onIncrement ?? null;
    props.onDecrement = options.onDecrement ?? null;
    props.label = options.label ?? null;
  } else if (isView(args[0])) {
    // Stepper(labelView, $value, options?)
    const labelView = args[0];
    props.label = () => labelView;
    props.value = args[1] ?? null;
    if (args[2]) parseRange(props, args[2]);
  } else if (typeof args[0] === 'string') {
    // Stepper('Label', $value, options?)
    props.labelText = args[0];
    props.value = args[1] ?? null;
    if (args[2]) parseRange(props, args[2]);
  } else {
    // Stepper($value, options?, label?)
    props.value = args[0] ?? null;
    if (typeof args[1] === 'object') {
      parseRange(props, args[1]);
      props.label = args[2] ?? null;
    } else if (typeof args[1] === 'function') {
      props.label = args[1];
    }
  }

  return chainable(createDescriptor('Stepper', props));
}

function readValue(binding) {
  if (!binding) return 0;
  return binding.value ?? binding.wrappedValue ?? 0;
}

function writeValue(binding, value) {
  if (!binding) return;
  if ('value' in binding) binding.value = value;
  else if ('wrappedValue' in binding) binding.wrappedValue = value;
}

function makeStepButton(text) {
  const button = document.createElement('button');
  button.textContent = text;
  button.style.width = '44px';
  button.style.height = '32px';
  button.style.border = 'none';
  button.style.background = 'transparent';
  button.style.fontSize = '20px';
  button.style.fontWeight = '300';
  button.style.color = 'rgba(0, 122, 255, 1)';
  button.style.cursor = 'pointer';
  button.style.transition = 'background-color 0.15s ease';
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = 'transparent';
  });
  return button;
}

// Disable and dim a button at the end of the range. `disabled` also stops
// keyboard activation and reaches assistive technology.
function setButtonEnabled(button, enabled) {
  button.style.opacity = enabled ? '1' : '0.3';
  button.style.cursor = enabled ? 'pointer' : 'default';
  button.disabled = !enabled;
}

registerRenderer('Stepper', (props) => {
  const { value: binding, min, max, step } = props;
  const container = document.createElement('div');
  container.dataset.view = 'stepper';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'space-between';
  container.style.gap = '12px';

  const labelContainer = document.createElement('div');
  labelContainer.style.flex = '1';
  if (props.label) {
    const labelView = props.label();
    if (isView(labelView)) labelContainer.appendChild(renderLabelView(labelView));
  } else if (props.labelText) {
    labelContainer.textContent = props.labelText;
  }
  container.appendChild(labelContainer);

  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.alignItems = 'center';
  buttonsContainer.style.border = '1px solid rgba(60, 60, 67, 0.2)';
  buttonsContainer.style.borderRadius = '8px';
  buttonsContainer.style.overflow = 'hidden';

  const decrementBtn = makeStepButton('−');
  const incrementBtn = makeStepButton('+');

  // Reads the value tracked: under an owner it runs in an effect, so the
  // end-of-range dimming follows writes made elsewhere too.
  const updateButtonStates = () => {
    const current = readValue(binding);
    setButtonEnabled(decrementBtn, !(min !== null && current <= min));
    setButtonEnabled(incrementBtn, !(max !== null && current >= max));
  };

  decrementBtn.addEventListener('click', () => {
    if (props.onDecrement) {
      props.onDecrement();
    } else {
      const newValue = untrack(() => readValue(binding)) - step;
      if (min === null || newValue >= min) untrack(() => writeValue(binding, newValue));
    }
    if (!followsBinding) untrack(updateButtonStates);
  });

  incrementBtn.addEventListener('click', () => {
    if (props.onIncrement) {
      props.onIncrement();
    } else {
      const newValue = untrack(() => readValue(binding)) + step;
      if (max === null || newValue <= max) untrack(() => writeValue(binding, newValue));
    }
    if (!followsBinding) untrack(updateButtonStates);
  });

  const followsBinding = Boolean(getOwner() && binding);
  if (followsBinding) createEffect(updateButtonStates);
  else untrack(updateButtonStates);

  const divider = document.createElement('div');
  divider.style.width = '1px';
  divider.style.height = '20px';
  divider.style.backgroundColor = 'rgba(60, 60, 67, 0.2)';

  buttonsContainer.appendChild(decrementBtn);
  buttonsContainer.appendChild(divider);
  buttonsContainer.appendChild(incrementBtn);
  container.appendChild(buttonsContainer);

  return container;
});

export default Stepper;
