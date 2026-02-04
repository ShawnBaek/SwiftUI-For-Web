/**
 * Slider - A control for selecting a value from a range
 *
 * Matches SwiftUI's Slider view for selecting values within a range.
 *
 * @example
 * Slider($value, { in: 0...100 })
 *
 * @example
 * Slider($value, { in: 0...100, step: 5 }, {
 *   label: () => Text('Volume'),
 *   minimumValueLabel: () => Text('0'),
 *   maximumValueLabel: () => Text('100')
 * })
 */

import { View } from '../../Core/View.js';
import { Color } from '../../Graphic/Color.js';

/**
 * Slider view class
 */
export class SliderView extends View {
  constructor(valueBinding, options = {}, labels = {}) {
    super();

    this._valueBinding = valueBinding;
    this._min = options.in?.[0] ?? options.min ?? 0;
    this._max = options.in?.[1] ?? options.max ?? 1;
    this._step = options.step ?? null;
    this._onEditingChanged = options.onEditingChanged ?? null;

    this._label = labels.label ?? null;
    this._minimumValueLabel = labels.minimumValueLabel ?? null;
    this._maximumValueLabel = labels.maximumValueLabel ?? null;

    this._tint = null;
  }

  /**
   * Set the tint color for the slider track
   * @param {Object|string} color - Tint color
   * @returns {SliderView} Returns this for chaining
   */
  tint(color) {
    this._tint = color;
    return this;
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'slider';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    container.style.width = '100%';

    // Minimum value label
    if (this._minimumValueLabel) {
      const minLabel = this._minimumValueLabel();
      if (minLabel instanceof View) {
        container.appendChild(minLabel._render());
      }
    }

    // Create the slider input
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(this._min);
    input.max = String(this._max);
    if (this._step !== null) {
      input.step = String(this._step);
    }

    // Set initial value from binding
    const currentValue = this._valueBinding?.value ?? this._valueBinding?.wrappedValue ?? 0;
    input.value = String(currentValue);

    // Style the slider
    input.style.flex = '1';
    input.style.height = '4px';
    input.style.appearance = 'none';
    input.style.background = 'rgba(120, 120, 128, 0.2)';
    input.style.borderRadius = '2px';
    input.style.outline = 'none';
    input.style.cursor = 'pointer';

    // Apply tint color for filled portion
    const tintColor = this._tint
      ? (typeof this._tint.rgba === 'function' ? this._tint.rgba() : this._tint)
      : 'rgba(0, 122, 255, 1)';

    // Update the track fill
    const updateTrackFill = (value) => {
      const percent = ((value - this._min) / (this._max - this._min)) * 100;
      input.style.background = `linear-gradient(to right, ${tintColor} 0%, ${tintColor} ${percent}%, rgba(120, 120, 128, 0.2) ${percent}%, rgba(120, 120, 128, 0.2) 100%)`;
    };

    updateTrackFill(currentValue);

    // Handle value changes
    input.addEventListener('input', (e) => {
      const newValue = parseFloat(e.target.value);

      // Update binding
      if (this._valueBinding) {
        if ('value' in this._valueBinding) {
          this._valueBinding.value = newValue;
        } else if ('wrappedValue' in this._valueBinding) {
          this._valueBinding.wrappedValue = newValue;
        }
      }

      updateTrackFill(newValue);
    });

    // Handle editing changed
    if (this._onEditingChanged) {
      input.addEventListener('mousedown', () => this._onEditingChanged(true));
      input.addEventListener('mouseup', () => this._onEditingChanged(false));
      input.addEventListener('touchstart', () => this._onEditingChanged(true));
      input.addEventListener('touchend', () => this._onEditingChanged(false));
    }

    // Add custom thumb styles via CSS
    const style = document.createElement('style');
    style.textContent = `
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
    container.appendChild(style);
    container.appendChild(input);

    // Maximum value label
    if (this._maximumValueLabel) {
      const maxLabel = this._maximumValueLabel();
      if (maxLabel instanceof View) {
        container.appendChild(maxLabel._render());
      }
    }

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for Slider
 */
export function Slider(valueBinding, options = {}, labels = {}) {
  return new SliderView(valueBinding, options, labels);
}

export default Slider;
