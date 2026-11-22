/**
 * ColorPicker - A control for selecting colors
 *
 * Matches SwiftUI's ColorPicker for color selection.
 *
 * @example
 * ColorPicker('Background Color', $backgroundColor)
 *
 * @example
 * ColorPicker($color, { supportsOpacity: false })
 */

import { isDescriptor, isLegacyView, createDescriptor } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer } from '../../Core/Renderer.js';
import { untrack, createEffect, getOwner } from '../../Data/Signal.js';
import { Color } from '../../Graphic/Color.js';

/**
 * ColorPicker - color selector
 *
 * Signatures: ColorPicker('Label', $selection, options?) and
 * ColorPicker($selection, options?).
 *
 * @returns {Object} Chainable view descriptor
 */
export function ColorPicker(...args) {
  const props = { selection: null, labelText: null, supportsOpacity: true };

  if (typeof args[0] === 'string') {
    props.labelText = args[0];
    props.selection = args[1];
    if (args[2]) props.supportsOpacity = args[2].supportsOpacity ?? true;
  } else if (args[0] && ('value' in args[0] || 'wrappedValue' in args[0])) {
    props.selection = args[0];
    if (args[1] && !isLegacyView(args[1]) && !isDescriptor(args[1])) {
      props.supportsOpacity = args[1].supportsOpacity ?? true;
    }
  }

  return chainable(createDescriptor('ColorPicker', props));
}

function readColor(selection, tracked = false) {
  if (selection) {
    const read = () => selection.value ?? selection.wrappedValue;
    const val = tracked ? read() : untrack(read);
    if (val && typeof val.hex === 'function') return val.hex();
    if (typeof val === 'string') return val;
  }
  return '#007AFF';
}

function writeColor(selection, hexColor) {
  if (!selection) return;
  const newValue = Color.hex(hexColor);
  untrack(() => {
    if ('value' in selection) selection.value = newValue;
    else if ('wrappedValue' in selection) selection.wrappedValue = newValue;
  });
}

registerRenderer('ColorPicker', (props) => {
  const { selection } = props;
  const container = document.createElement('div');
  container.dataset.view = 'color-picker';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'space-between';
  container.style.gap = '12px';

  if (props.labelText) {
    const label = document.createElement('span');
    label.textContent = props.labelText;
    label.style.fontSize = '17px';
    container.appendChild(label);
  }

  const pickerWrapper = document.createElement('div');
  pickerWrapper.style.position = 'relative';
  pickerWrapper.style.display = 'flex';
  pickerWrapper.style.alignItems = 'center';
  pickerWrapper.style.gap = '8px';

  const initial = readColor(selection);

  // Visible swatch
  const swatch = document.createElement('div');
  swatch.dataset.colorPickerPart = 'swatch';
  swatch.style.width = '28px';
  swatch.style.height = '28px';
  swatch.style.borderRadius = '6px';
  swatch.style.backgroundColor = initial;
  swatch.style.border = '2px solid rgba(0, 0, 0, 0.1)';
  swatch.style.cursor = 'pointer';
  swatch.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';

  swatch.addEventListener('mouseenter', () => {
    swatch.style.transform = 'scale(1.05)';
    swatch.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
  });
  swatch.addEventListener('mouseleave', () => {
    swatch.style.transform = 'scale(1)';
    swatch.style.boxShadow = 'none';
  });

  // Hidden color input
  const input = document.createElement('input');
  input.type = 'color';
  input.value = initial;
  input.style.position = 'absolute';
  input.style.opacity = '0';
  input.style.width = '28px';
  input.style.height = '28px';
  input.style.cursor = 'pointer';

  swatch.addEventListener('click', () => {
    input.click();
  });

  const colorCode = document.createElement('span');
  colorCode.style.fontSize = '15px';
  colorCode.style.fontFamily = 'ui-monospace, monospace';
  colorCode.style.color = 'rgba(60, 60, 67, 0.6)';
  colorCode.textContent = initial.toUpperCase();

  input.addEventListener('input', (e) => {
    const color = e.target.value;
    swatch.style.backgroundColor = color;
    writeColor(selection, color);
    colorCode.textContent = color.toUpperCase();
  });

  // Follow writes made elsewhere: swatch, input and colour code.
  if (getOwner() && selection) {
    createEffect(() => {
      const color = readColor(selection, true);
      swatch.style.backgroundColor = color;
      if (input.value !== color) input.value = color;
      colorCode.textContent = color.toUpperCase();
    });
  }

  pickerWrapper.appendChild(input);
  pickerWrapper.appendChild(swatch);
  pickerWrapper.appendChild(colorCode);
  container.appendChild(pickerWrapper);

  return container;
});

export default ColorPicker;
