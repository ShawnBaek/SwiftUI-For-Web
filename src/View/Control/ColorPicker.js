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

import { View } from '../../Core/View.js';
import { Color } from '../../Graphic/Color.js';

/**
 * ColorPicker view class
 */
export class ColorPickerView extends View {
  constructor(...args) {
    super();

    this._selection = null;
    this._label = null;
    this._labelText = null;
    this._supportsOpacity = true;

    // Parse arguments
    if (typeof args[0] === 'string') {
      // ColorPicker('Label', $selection, options?)
      this._labelText = args[0];
      this._selection = args[1];
      if (args[2]) {
        this._supportsOpacity = args[2].supportsOpacity ?? true;
      }
    } else if (args[0] && ('value' in args[0] || 'wrappedValue' in args[0])) {
      // ColorPicker($selection, options?)
      this._selection = args[0];
      if (args[1] && !(args[1] instanceof View)) {
        this._supportsOpacity = args[1].supportsOpacity ?? true;
      }
    }
  }

  /**
   * Get current color value
   * @private
   */
  _getColor() {
    if (this._selection) {
      const val = this._selection.value ?? this._selection.wrappedValue;
      if (val && typeof val.hex === 'function') {
        return val.hex();
      }
      if (typeof val === 'string') {
        return val;
      }
    }
    return '#007AFF';
  }

  /**
   * Set color value
   * @private
   */
  _setColor(hexColor) {
    if (this._selection) {
      // Try to create a Color object if the original value was a Color
      const newValue = Color.hex(hexColor);

      if ('value' in this._selection) {
        this._selection.value = newValue;
      } else if ('wrappedValue' in this._selection) {
        this._selection.wrappedValue = newValue;
      }
    }
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'color-picker';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    container.style.gap = '12px';

    // Label
    if (this._labelText) {
      const label = document.createElement('span');
      label.textContent = this._labelText;
      label.style.fontSize = '17px';
      container.appendChild(label);
    }

    // Color picker wrapper
    const pickerWrapper = document.createElement('div');
    pickerWrapper.style.position = 'relative';
    pickerWrapper.style.display = 'flex';
    pickerWrapper.style.alignItems = 'center';
    pickerWrapper.style.gap = '8px';

    // Color swatch (visible button)
    const swatch = document.createElement('div');
    swatch.dataset.colorPickerPart = 'swatch';
    swatch.style.width = '28px';
    swatch.style.height = '28px';
    swatch.style.borderRadius = '6px';
    swatch.style.backgroundColor = this._getColor();
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
    input.value = this._getColor();
    input.style.position = 'absolute';
    input.style.opacity = '0';
    input.style.width = '28px';
    input.style.height = '28px';
    input.style.cursor = 'pointer';

    // Click swatch to open picker
    swatch.addEventListener('click', () => {
      input.click();
    });

    // Handle color change
    input.addEventListener('input', (e) => {
      const color = e.target.value;
      swatch.style.backgroundColor = color;
      this._setColor(color);
    });

    // Color code display
    const colorCode = document.createElement('span');
    colorCode.style.fontSize = '15px';
    colorCode.style.fontFamily = 'ui-monospace, monospace';
    colorCode.style.color = 'rgba(60, 60, 67, 0.6)';
    colorCode.textContent = this._getColor().toUpperCase();

    input.addEventListener('input', (e) => {
      colorCode.textContent = e.target.value.toUpperCase();
    });

    pickerWrapper.appendChild(input);
    pickerWrapper.appendChild(swatch);
    pickerWrapper.appendChild(colorCode);
    container.appendChild(pickerWrapper);

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for ColorPicker
 */
export function ColorPicker(...args) {
  return new ColorPickerView(...args);
}

export default ColorPicker;
