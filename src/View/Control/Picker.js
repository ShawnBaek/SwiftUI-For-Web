/**
 * Picker - A control for selecting from a set of options
 *
 * Matches SwiftUI's Picker view for selection interfaces.
 *
 * @example
 * Picker('Flavor', $selection,
 *   Text('Chocolate').tag('chocolate'),
 *   Text('Vanilla').tag('vanilla'),
 *   Text('Strawberry').tag('strawberry')
 * )
 *
 * @example
 * Picker($selection, {
 *   ForEach(flavors, (flavor) =>
 *     Text(flavor.name).tag(flavor.id)
 *   )
 * })
 * .pickerStyle(PickerStyle.wheel)
 */

import { View } from '../../Core/View.js';
import { Color } from '../../Graphic/Color.js';

/**
 * Picker style enum
 */
export const PickerStyle = {
  automatic: 'automatic',
  menu: 'menu',
  wheel: 'wheel',
  segmented: 'segmented',
  inline: 'inline',
  navigationLink: 'navigationLink'
};

/**
 * Picker view class
 */
export class PickerView extends View {
  constructor(...args) {
    super();

    this._selection = null;
    this._label = null;
    this._labelText = null;
    this._options = [];
    this._pickerStyle = PickerStyle.automatic;

    // Parse arguments
    if (typeof args[0] === 'string') {
      // Picker('Label', $selection, ...options)
      this._labelText = args[0];
      this._selection = args[1];
      this._options = args.slice(2).flat();
    } else {
      // Picker($selection, ...options) or Picker($selection, { label })
      this._selection = args[0];
      const rest = args.slice(1).flat();
      this._options = rest;
    }
  }

  /**
   * Set the picker style
   * @param {string} style - PickerStyle value
   * @returns {PickerView} Returns this for chaining
   */
  pickerStyle(style) {
    this._pickerStyle = style;
    return this;
  }

  /**
   * Get the tag value from a view
   * @private
   */
  _getTag(view) {
    return view._tag ?? null;
  }

  /**
   * Get current selection value
   * @private
   */
  _getSelection() {
    if (this._selection) {
      return this._selection.value ?? this._selection.wrappedValue ?? null;
    }
    return null;
  }

  /**
   * Set selection value
   * @private
   */
  _setSelection(value) {
    if (this._selection) {
      if ('value' in this._selection) {
        this._selection.value = value;
      } else if ('wrappedValue' in this._selection) {
        this._selection.wrappedValue = value;
      }
    }
  }

  _render() {
    switch (this._pickerStyle) {
      case PickerStyle.segmented:
        return this._renderSegmented();
      case PickerStyle.wheel:
        return this._renderWheel();
      case PickerStyle.inline:
        return this._renderInline();
      case PickerStyle.menu:
      case PickerStyle.automatic:
      default:
        return this._renderMenu();
    }
  }

  /**
   * Render as dropdown menu (default)
   * @private
   */
  _renderMenu() {
    const container = document.createElement('div');
    container.dataset.view = 'picker';
    container.dataset.style = 'menu';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    container.style.gap = '8px';

    // Label
    if (this._labelText) {
      const label = document.createElement('span');
      label.textContent = this._labelText;
      container.appendChild(label);
    }

    // Select element
    const select = document.createElement('select');
    select.style.padding = '8px 12px';
    select.style.fontSize = '16px';
    select.style.border = '1px solid rgba(60, 60, 67, 0.2)';
    select.style.borderRadius = '8px';
    select.style.backgroundColor = 'white';
    select.style.color = 'rgba(0, 122, 255, 1)';
    select.style.cursor = 'pointer';
    select.style.outline = 'none';
    select.style.minWidth = '120px';

    // Add options
    const currentSelection = this._getSelection();
    for (const option of this._options) {
      if (option instanceof View) {
        const opt = document.createElement('option');
        const tag = this._getTag(option);
        opt.value = tag ?? '';

        // Get text content from view
        const rendered = option._render();
        opt.textContent = rendered.textContent || tag || '';

        if (tag === currentSelection) {
          opt.selected = true;
        }

        select.appendChild(opt);
      }
    }

    // Handle selection change
    select.addEventListener('change', (e) => {
      this._setSelection(e.target.value);
    });

    container.appendChild(select);

    return this._applyModifiers(container);
  }

  /**
   * Render as segmented control
   * @private
   */
  _renderSegmented() {
    const container = document.createElement('div');
    container.dataset.view = 'picker';
    container.dataset.style = 'segmented';
    container.style.display = 'inline-flex';
    container.style.backgroundColor = 'rgba(120, 120, 128, 0.12)';
    container.style.borderRadius = '8px';
    container.style.padding = '2px';

    const currentSelection = this._getSelection();

    for (const option of this._options) {
      if (option instanceof View) {
        const segment = document.createElement('button');
        segment.style.padding = '6px 12px';
        segment.style.border = 'none';
        segment.style.borderRadius = '6px';
        segment.style.fontSize = '13px';
        segment.style.fontWeight = '500';
        segment.style.cursor = 'pointer';
        segment.style.transition = 'all 0.2s ease';

        const tag = this._getTag(option);
        const rendered = option._render();
        segment.textContent = rendered.textContent || tag || '';

        if (tag === currentSelection) {
          segment.style.backgroundColor = 'white';
          segment.style.color = 'black';
          segment.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        } else {
          segment.style.backgroundColor = 'transparent';
          segment.style.color = 'rgba(60, 60, 67, 1)';
        }

        segment.addEventListener('click', () => {
          this._setSelection(tag);
          // Update all segments
          const segments = container.querySelectorAll('button');
          segments.forEach(s => {
            s.style.backgroundColor = 'transparent';
            s.style.color = 'rgba(60, 60, 67, 1)';
            s.style.boxShadow = 'none';
          });
          segment.style.backgroundColor = 'white';
          segment.style.color = 'black';
          segment.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        });

        container.appendChild(segment);
      }
    }

    return this._applyModifiers(container);
  }

  /**
   * Render as wheel picker
   * @private
   */
  _renderWheel() {
    const container = document.createElement('div');
    container.dataset.view = 'picker';
    container.dataset.style = 'wheel';
    container.style.position = 'relative';
    container.style.height = '150px';
    container.style.overflow = 'hidden';
    container.style.backgroundColor = 'rgba(242, 242, 247, 1)';
    container.style.borderRadius = '8px';

    // Selection indicator
    const indicator = document.createElement('div');
    indicator.style.position = 'absolute';
    indicator.style.top = '50%';
    indicator.style.transform = 'translateY(-50%)';
    indicator.style.left = '0';
    indicator.style.right = '0';
    indicator.style.height = '34px';
    indicator.style.backgroundColor = 'rgba(120, 120, 128, 0.12)';
    indicator.style.borderRadius = '4px';
    indicator.style.margin = '0 4px';
    indicator.style.pointerEvents = 'none';
    container.appendChild(indicator);

    // Scrollable options
    const scroll = document.createElement('div');
    scroll.style.height = '100%';
    scroll.style.overflowY = 'auto';
    scroll.style.scrollSnapType = 'y mandatory';
    scroll.style.paddingTop = '58px';
    scroll.style.paddingBottom = '58px';

    // Hide scrollbar
    scroll.style.scrollbarWidth = 'none';
    scroll.style.msOverflowStyle = 'none';

    const currentSelection = this._getSelection();
    let selectedIndex = 0;

    this._options.forEach((option, index) => {
      if (option instanceof View) {
        const item = document.createElement('div');
        item.style.height = '34px';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'center';
        item.style.scrollSnapAlign = 'center';
        item.style.cursor = 'pointer';

        const tag = this._getTag(option);
        const rendered = option._render();
        item.textContent = rendered.textContent || tag || '';

        if (tag === currentSelection) {
          selectedIndex = index;
        }

        item.addEventListener('click', () => {
          this._setSelection(tag);
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        scroll.appendChild(item);
      }
    });

    // Scroll to selected item
    requestAnimationFrame(() => {
      const items = scroll.children;
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'center' });
      }
    });

    // Handle scroll selection
    scroll.addEventListener('scrollend', () => {
      const scrollCenter = scroll.scrollTop + scroll.clientHeight / 2 - 58;
      const itemHeight = 34;
      const index = Math.round(scrollCenter / itemHeight);
      if (this._options[index] instanceof View) {
        const tag = this._getTag(this._options[index]);
        this._setSelection(tag);
      }
    });

    container.appendChild(scroll);

    return this._applyModifiers(container);
  }

  /**
   * Render as inline list
   * @private
   */
  _renderInline() {
    const container = document.createElement('div');
    container.dataset.view = 'picker';
    container.dataset.style = 'inline';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '2px';

    const currentSelection = this._getSelection();

    for (const option of this._options) {
      if (option instanceof View) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.padding = '11px 16px';
        row.style.borderRadius = '8px';
        row.style.cursor = 'pointer';
        row.style.transition = 'background-color 0.15s ease';

        const tag = this._getTag(option);
        const rendered = option._render();

        // Checkmark for selected item
        const checkmark = document.createElement('span');
        checkmark.textContent = tag === currentSelection ? '✓' : '';
        checkmark.style.color = 'rgba(0, 122, 255, 1)';
        checkmark.style.marginRight = '12px';
        checkmark.style.width = '20px';
        row.appendChild(checkmark);

        const content = document.createElement('span');
        content.textContent = rendered.textContent || tag || '';
        row.appendChild(content);

        row.addEventListener('mouseenter', () => {
          row.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
        });
        row.addEventListener('mouseleave', () => {
          row.style.backgroundColor = 'transparent';
        });

        row.addEventListener('click', () => {
          this._setSelection(tag);
          // Update all checkmarks
          container.querySelectorAll('span:first-child').forEach(c => c.textContent = '');
          checkmark.textContent = '✓';
        });

        container.appendChild(row);
      }
    }

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for Picker
 */
export function Picker(...args) {
  return new PickerView(...args);
}

// Add tag method to View class
View.prototype.tag = function (value) {
  this._tag = value;
  return this;
};

export { PickerStyle };
export default Picker;
