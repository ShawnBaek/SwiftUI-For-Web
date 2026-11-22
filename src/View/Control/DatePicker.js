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

import { isView, createDescriptor } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer } from '../../Core/Renderer.js';
import { untrack, createEffect, getOwner } from '../../Data/Signal.js';

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

// DatePicker's own modifiers (#48: everything else comes from the shared table).
const datePickerModifiers = ({ withProps }) => ({
  // Stored; every style currently renders the native input.
  datePickerStyle: (style) => withProps({ pickerStyle: style }),
});

function parseOptions(props, options) {
  if (options.displayedComponents) props.displayedComponents = options.displayedComponents;
  if (options.in) props.dateRange = options.in;
}

/**
 * DatePicker - date/time selector
 *
 * Signatures: DatePicker('Label', $selection, options?) and
 * DatePicker($selection, options?).
 *
 * @returns {Object} Chainable view descriptor
 */
export function DatePicker(...args) {
  const props = {
    selection: null,
    labelText: null,
    displayedComponents: DatePickerComponents.date,
    dateRange: null,
    pickerStyle: DatePickerStyle.automatic,
  };

  if (typeof args[0] === 'string') {
    props.labelText = args[0];
    props.selection = args[1];
    if (args[2]) parseOptions(props, args[2]);
  } else if (args[0] && ('value' in args[0] || 'wrappedValue' in args[0])) {
    props.selection = args[0];
    if (args[1] && !isView(args[1])) parseOptions(props, args[1]);
  }

  return chainable(createDescriptor('DatePicker', props), datePickerModifiers);
}

function readDate(selection, tracked = false) {
  if (selection) {
    const read = () => selection.value ?? selection.wrappedValue;
    const val = tracked ? read() : untrack(read);
    return val instanceof Date ? val : new Date();
  }
  return new Date();
}

function writeDate(selection, date) {
  if (!selection) return;
  untrack(() => {
    if ('value' in selection) selection.value = date;
    else if ('wrappedValue' in selection) selection.wrappedValue = date;
  });
}

function formatDateForInput(date, components) {
  const pad = (n) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  switch (components) {
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

function inputType(components) {
  switch (components) {
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

registerRenderer('DatePicker', (props) => {
  const { selection, displayedComponents: components, dateRange } = props;
  const container = document.createElement('div');
  container.dataset.view = 'date-picker';
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

  const input = document.createElement('input');
  input.type = inputType(components);
  input.value = formatDateForInput(readDate(selection), components);
  input.style.padding = '8px 12px';
  input.style.fontSize = '17px';
  input.style.border = '1px solid rgba(60, 60, 67, 0.2)';
  input.style.borderRadius = '8px';
  input.style.backgroundColor = 'white';
  input.style.color = 'rgba(0, 122, 255, 1)';
  input.style.cursor = 'pointer';

  if (dateRange) {
    if (dateRange.start) input.min = formatDateForInput(dateRange.start, components);
    if (dateRange.end) input.max = formatDateForInput(dateRange.end, components);
  }

  input.addEventListener('change', (e) => {
    const value = e.target.value;
    let newDate;

    if (components === DatePickerComponents.date) {
      newDate = new Date(value + 'T00:00:00');
    } else if (components === DatePickerComponents.hourAndMinute ||
               components === DatePickerComponents.hourMinuteAndSecond) {
      const [hours, minutes] = value.split(':');
      newDate = new Date();
      newDate.setHours(parseInt(hours), parseInt(minutes), 0);
    } else {
      newDate = new Date(value);
    }

    writeDate(selection, newDate);
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

  // Follow writes made elsewhere (SwiftUI: the control shows its binding).
  if (getOwner() && selection) {
    createEffect(() => {
      const formatted = formatDateForInput(readDate(selection, true), components);
      if (input.value !== formatted) input.value = formatted;
    });
  }

  container.appendChild(input);

  return container;
});

export default DatePicker;
