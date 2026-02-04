/**
 * Stepper - A control for incrementing/decrementing a value
 *
 * Matches SwiftUI's Stepper view with +/- buttons.
 *
 * @example
 * Stepper('Quantity', $quantity)
 *
 * @example
 * Stepper($value, { in: 0...10, step: 1 }, () => Text(`Value: ${value}`))
 *
 * @example
 * Stepper({
 *   onIncrement: () => count++,
 *   onDecrement: () => count--,
 *   label: () => Text(`Count: ${count}`)
 * })
 */

import { View } from '../../Core/View.js';
import { Color } from '../../Graphic/Color.js';

/**
 * Stepper view class
 */
export class StepperView extends View {
  constructor(...args) {
    super();

    this._valueBinding = null;
    this._min = null;
    this._max = null;
    this._step = 1;
    this._onIncrement = null;
    this._onDecrement = null;
    this._label = null;
    this._labelText = null;

    // Parse arguments - multiple signatures
    if (args.length === 1 && typeof args[0] === 'object' && !('value' in args[0]) && !('wrappedValue' in args[0])) {
      // Stepper({ onIncrement, onDecrement, label })
      const options = args[0];
      this._onIncrement = options.onIncrement ?? null;
      this._onDecrement = options.onDecrement ?? null;
      this._label = options.label ?? null;
    } else if (typeof args[0] === 'string') {
      // Stepper('Label', $value, options?)
      this._labelText = args[0];
      this._valueBinding = args[1] ?? null;
      if (args[2]) {
        this._min = args[2].in?.[0] ?? args[2].min ?? null;
        this._max = args[2].in?.[1] ?? args[2].max ?? null;
        this._step = args[2].step ?? 1;
      }
    } else {
      // Stepper($value, options?, label?)
      this._valueBinding = args[0] ?? null;
      if (typeof args[1] === 'object') {
        this._min = args[1].in?.[0] ?? args[1].min ?? null;
        this._max = args[1].in?.[1] ?? args[1].max ?? null;
        this._step = args[1].step ?? 1;
        this._label = args[2] ?? null;
      } else if (typeof args[1] === 'function') {
        this._label = args[1];
      }
    }
  }

  /**
   * Get current value from binding
   * @private
   */
  _getValue() {
    if (this._valueBinding) {
      return this._valueBinding.value ?? this._valueBinding.wrappedValue ?? 0;
    }
    return 0;
  }

  /**
   * Set value to binding
   * @private
   */
  _setValue(newValue) {
    if (this._valueBinding) {
      if ('value' in this._valueBinding) {
        this._valueBinding.value = newValue;
      } else if ('wrappedValue' in this._valueBinding) {
        this._valueBinding.wrappedValue = newValue;
      }
    }
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'stepper';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    container.style.gap = '12px';

    // Label
    const labelContainer = document.createElement('div');
    labelContainer.style.flex = '1';

    if (this._label) {
      const labelView = this._label();
      if (labelView instanceof View) {
        labelContainer.appendChild(labelView._render());
      }
    } else if (this._labelText) {
      labelContainer.textContent = this._labelText;
    }

    container.appendChild(labelContainer);

    // Stepper buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.alignItems = 'center';
    buttonsContainer.style.border = '1px solid rgba(60, 60, 67, 0.2)';
    buttonsContainer.style.borderRadius = '8px';
    buttonsContainer.style.overflow = 'hidden';

    // Decrement button
    const decrementBtn = document.createElement('button');
    decrementBtn.textContent = '−';
    decrementBtn.style.width = '44px';
    decrementBtn.style.height = '32px';
    decrementBtn.style.border = 'none';
    decrementBtn.style.background = 'transparent';
    decrementBtn.style.fontSize = '20px';
    decrementBtn.style.fontWeight = '300';
    decrementBtn.style.color = 'rgba(0, 122, 255, 1)';
    decrementBtn.style.cursor = 'pointer';
    decrementBtn.style.transition = 'background-color 0.15s ease';

    decrementBtn.addEventListener('mouseenter', () => {
      decrementBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
    });
    decrementBtn.addEventListener('mouseleave', () => {
      decrementBtn.style.backgroundColor = 'transparent';
    });

    decrementBtn.addEventListener('click', () => {
      if (this._onDecrement) {
        this._onDecrement();
      } else {
        const current = this._getValue();
        const newValue = current - this._step;
        if (this._min === null || newValue >= this._min) {
          this._setValue(newValue);
        }
      }
      this._updateButtonStates(decrementBtn, incrementBtn);
    });

    // Divider
    const divider = document.createElement('div');
    divider.style.width = '1px';
    divider.style.height = '20px';
    divider.style.backgroundColor = 'rgba(60, 60, 67, 0.2)';

    // Increment button
    const incrementBtn = document.createElement('button');
    incrementBtn.textContent = '+';
    incrementBtn.style.width = '44px';
    incrementBtn.style.height = '32px';
    incrementBtn.style.border = 'none';
    incrementBtn.style.background = 'transparent';
    incrementBtn.style.fontSize = '20px';
    incrementBtn.style.fontWeight = '300';
    incrementBtn.style.color = 'rgba(0, 122, 255, 1)';
    incrementBtn.style.cursor = 'pointer';
    incrementBtn.style.transition = 'background-color 0.15s ease';

    incrementBtn.addEventListener('mouseenter', () => {
      incrementBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
    });
    incrementBtn.addEventListener('mouseleave', () => {
      incrementBtn.style.backgroundColor = 'transparent';
    });

    incrementBtn.addEventListener('click', () => {
      if (this._onIncrement) {
        this._onIncrement();
      } else {
        const current = this._getValue();
        const newValue = current + this._step;
        if (this._max === null || newValue <= this._max) {
          this._setValue(newValue);
        }
      }
      this._updateButtonStates(decrementBtn, incrementBtn);
    });

    // Initial button states
    this._updateButtonStates(decrementBtn, incrementBtn);

    buttonsContainer.appendChild(decrementBtn);
    buttonsContainer.appendChild(divider);
    buttonsContainer.appendChild(incrementBtn);
    container.appendChild(buttonsContainer);

    return this._applyModifiers(container);
  }

  /**
   * Update button disabled states based on min/max
   * @private
   */
  _updateButtonStates(decrementBtn, incrementBtn) {
    const current = this._getValue();

    if (this._min !== null && current <= this._min) {
      decrementBtn.style.opacity = '0.3';
      decrementBtn.style.pointerEvents = 'none';
    } else {
      decrementBtn.style.opacity = '1';
      decrementBtn.style.pointerEvents = 'auto';
    }

    if (this._max !== null && current >= this._max) {
      incrementBtn.style.opacity = '0.3';
      incrementBtn.style.pointerEvents = 'none';
    } else {
      incrementBtn.style.opacity = '1';
      incrementBtn.style.pointerEvents = 'auto';
    }
  }
}

/**
 * Factory function for Stepper
 */
export function Stepper(...args) {
  return new StepperView(...args);
}

export default Stepper;
