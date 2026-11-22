/**
 * Slider - A control for selecting a value from a range
 *
 * Matches SwiftUI's Slider view for selecting values within a range.
 *
 * @example
 * Slider($value, { in: [0, 100] })
 *
 * @example
 * Slider($value, { in: [0, 100], step: 5 }, {
 *   label: () => Text('Volume'),
 *   minimumValueLabel: () => Text('0'),
 *   maximumValueLabel: () => Text('100')
 * })
 */

import { isDescriptor, isLegacyView, createDescriptor } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render as renderLabelView } from '../../Core/Renderer.js';
import { createEffect, untrack } from '../../Data/Signal.js';

// Slider's own modifiers (#48: everything else comes from the shared table).
const sliderModifiers = ({ withProps }) => ({
  tint: (color) => withProps({ tint: color }),
});

/**
 * Slider - range input bound to a number
 *
 * @param {Binding} valueBinding - Binding to the value
 * @param {Object} [options] - { in: [min, max], min, max, step, onEditingChanged }
 * @param {Object} [labels] - { label, minimumValueLabel, maximumValueLabel } builders
 * @returns {Object} Chainable view descriptor
 */
export function Slider(valueBinding, options = {}, labels = {}) {
  return chainable(createDescriptor('Slider', {
    value: valueBinding,
    min: options.in?.[0] ?? options.min ?? 0,
    max: options.in?.[1] ?? options.max ?? 1,
    step: options.step ?? null,
    onEditingChanged: options.onEditingChanged ?? null,
    label: labels.label ?? null,
    minimumValueLabel: labels.minimumValueLabel ?? null,
    maximumValueLabel: labels.maximumValueLabel ?? null,
    tint: null,
  }), sliderModifiers);
}

function readValue(binding) {
  return binding?.value ?? binding?.wrappedValue ?? 0;
}

function writeValue(binding, value) {
  if (!binding) return;
  if ('value' in binding) binding.value = value;
  else if ('wrappedValue' in binding) binding.wrappedValue = value;
}

function appendLabel(container, builder) {
  if (!builder) return;
  const view = builder();
  if (isLegacyView(view) || isDescriptor(view)) container.appendChild(renderLabelView(view));
}

const THUMB_CSS = `
      input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 28px;
        height: 28px;
        background: white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
      }
      input[type="range"]::-moz-range-thumb {
        width: 28px;
        height: 28px;
        background: white;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
      }
    `;

registerRenderer('Slider', (props) => {
  const { value: binding, min, max, step, onEditingChanged, tint } = props;
  const container = document.createElement('div');
  container.dataset.view = 'slider';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '8px';
  container.style.width = '100%';

  appendLabel(container, props.minimumValueLabel);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  if (step !== null) input.step = String(step);

  // Initial value, untracked; the effect below tracks the binding.
  input.value = String(untrack(() => readValue(binding)));

  input.style.flex = '1';
  input.style.height = '4px';
  input.style.appearance = 'none';
  input.style.background = 'rgba(120, 120, 128, 0.2)';
  input.style.borderRadius = '2px';
  input.style.cursor = 'pointer';

  const tintColor = tint
    ? (typeof tint.rgba === 'function' ? tint.rgba() : tint)
    : 'rgba(0, 122, 255, 1)';

  const updateTrackFill = (v) => {
    const percent = ((v - min) / (max - min)) * 100;
    input.style.background = `linear-gradient(to right, ${tintColor} 0%, ${tintColor} ${percent}%, rgba(120, 120, 128, 0.2) ${percent}%, rgba(120, 120, 128, 0.2) 100%)`;
  };

  // Keep input.value and the track fill aligned with the binding when it
  // changes from any source (a drag or a write elsewhere).
  createEffect(() => {
    const v = readValue(binding);
    const desired = String(v);
    if (input.value !== desired) input.value = desired;
    updateTrackFill(v);
  });

  input.addEventListener('input', (e) => {
    const newValue = parseFloat(e.target.value);
    untrack(() => writeValue(binding, newValue));
  });

  if (onEditingChanged) {
    input.addEventListener('mousedown', () => onEditingChanged(true));
    input.addEventListener('mouseup', () => onEditingChanged(false));
    input.addEventListener('touchstart', () => onEditingChanged(true));
    input.addEventListener('touchend', () => onEditingChanged(false));
  }

  const style = document.createElement('style');
  style.textContent = THUMB_CSS;
  container.appendChild(style);
  container.appendChild(input);

  appendLabel(container, props.maximumValueLabel);

  return container;
});

export default Slider;
