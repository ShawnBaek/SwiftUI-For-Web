/**
 * DatePicker - A control for selecting dates
 *
 * Matches SwiftUI's DatePicker for date/time selection.
 *
 * @example
 * DatePicker('Select Date', $selectedDate)
 *
 * @example
 * DatePicker('Birthday', $birthday, {
 *   displayedComponents: DatePickerComponents.date
 * })
 *
 * @example
 * DatePicker($date, {
 *   in: { start: new Date(2020, 0, 1), end: new Date() }
 * })
 */

import { View } from '../../Core/View.js';
import { Color } from '../../Graphic/Color.js';

/**
 * DatePicker displayed components
 */
export const DatePickerComponents = {
  date: 'date',
  hourAndMinute: 'time',
  hourMinuteAndSecond: 'time-seconds',
  all: 'datetime-local'
};

/**
 * DatePicker style
 */
export const DatePickerStyle = {
  automatic: 'automatic',
  compact: 'compact',
  graphical: 'graphical',
  wheel: 'wheel'
};

/**
 * DatePicker view class
 */
export class DatePickerView extends View {
  constructor(...args) {
    super();

    this._selection = null;
    this._label = null;
    this._labelText = null;
    this._displayedComponents = DatePickerComponents.date;
    this._dateRange = null;
    this._pickerStyle = DatePickerStyle.automatic;

    // Parse arguments
    if (typeof args[0] === 'string') {
      // DatePicker('Label', $selection, options?)
      this._labelText = args[0];
      this._selection = args[1];
      if (args[2]) {
        this._parseOptions(args[2]);
      }
    } else if (args[0] && ('value' in args[0] || 'wrappedValue' in args[0])) {
      // DatePicker($selection, options?)
      this._selection = args[0];
      if (args[1] && !(args[1] instanceof View)) {
        this._parseOptions(args[1]);
      }
    }
  }

  _parseOptions(options) {
    if (options.displayedComponents) {
      this._displayedComponents = options.displayedComponents;
    }
    if (options.in) {
      this._dateRange = options.in;
    }
  }

  /**
   * Set the picker style
   * @param {string} style - DatePickerStyle value
   * @returns {DatePickerView} Returns this for chaining
   */
  datePickerStyle(style) {
    this._pickerStyle = style;
    return this;
  }

  /**
   * Get current date value
   * @private
   */
  _getDate() {
    if (this._selection) {
      const val = this._selection.value ?? this._selection.wrappedValue;
      return val instanceof Date ? val : new Date();
    }
    return new Date();
  }

  /**
   * Set date value
   * @private
   */
  _setDate(date) {
    if (this._selection) {
      if ('value' in this._selection) {
        this._selection.value = date;
      } else if ('wrappedValue' in this._selection) {
        this._selection.wrappedValue = date;
      }
    }
  }

  /**
   * Format date for input value
   * @private
   */
  _formatDateForInput(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    switch (this._displayedComponents) {
      case DatePickerComponents.date:
        return `${year}-${month}-${day}`;
      case DatePickerComponents.hourAndMinute:
      case DatePickerComponents.hourMinuteAndSecond:
        return `${hours}:${minutes}`;
      case DatePickerComponents.all:
      default:
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  }

  /**
   * Get input type based on displayed components
   * @private
   */
  _getInputType() {
    switch (this._displayedComponents) {
      case DatePickerComponents.date:
        return 'date';
      case DatePickerComponents.hourAndMinute:
      case DatePickerComponents.hourMinuteAndSecond:
        return 'time';
      case DatePickerComponents.all:
      default:
        return 'datetime-local';
    }
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'date-picker';
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

    // Date input
    const input = document.createElement('input');
    input.type = this._getInputType();
    input.value = this._formatDateForInput(this._getDate());
    input.style.padding = '8px 12px';
    input.style.fontSize = '17px';
    input.style.border = '1px solid rgba(60, 60, 67, 0.2)';
    input.style.borderRadius = '8px';
    input.style.backgroundColor = 'white';
    input.style.color = 'rgba(0, 122, 255, 1)';
    input.style.cursor = 'pointer';
    input.style.outline = 'none';

    // Set min/max if range specified
    if (this._dateRange) {
      if (this._dateRange.start) {
        input.min = this._formatDateForInput(this._dateRange.start);
      }
      if (this._dateRange.end) {
        input.max = this._formatDateForInput(this._dateRange.end);
      }
    }

    // Handle change
    input.addEventListener('change', (e) => {
      const value = e.target.value;
      let newDate;

      if (this._displayedComponents === DatePickerComponents.date) {
        newDate = new Date(value + 'T00:00:00');
      } else if (this._displayedComponents === DatePickerComponents.hourAndMinute ||
                 this._displayedComponents === DatePickerComponents.hourMinuteAndSecond) {
        const [hours, minutes] = value.split(':');
        newDate = new Date();
        newDate.setHours(parseInt(hours), parseInt(minutes), 0);
      } else {
        newDate = new Date(value);
      }

      this._setDate(newDate);
    });

    // Focus styles
    input.addEventListener('focus', () => {
      input.style.borderColor = 'rgba(0, 122, 255, 1)';
      input.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.2)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'rgba(60, 60, 67, 0.2)';
      input.style.boxShadow = 'none';
    });

    container.appendChild(input);

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for DatePicker
 */
export function DatePicker(...args) {
  return new DatePickerView(...args);
}

export default DatePicker;
