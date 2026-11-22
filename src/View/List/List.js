/**
 * List - A scrollable list container
 *
 * Matches SwiftUI's List view for displaying scrollable content with optional selection.
 *
 * @example
 * List(items, { id: 'id' }, (item) =>
 *   Text(item.name)
 * )
 *
 * @example
 * List({ selection: $selection },
 *   ForEach(items, (item) => Text(item.name))
 * )
 */

import { View } from '../../Core/View.js';
import { Color } from '../../Graphic/Color.js';
import { VIEW_DESCRIPTOR, isDescriptor, ModifierType } from '../../Core/ViewDescriptor.js';
import { render as renderDescriptor } from '../../Core/Renderer.js';

/**
 * Helper to render both View instances and descriptors
 */
function renderChild(child) {
  if (child instanceof View) {
    return child._render();
  } else if (child && child.$$typeof === VIEW_DESCRIPTOR) {
    return renderDescriptor(child);
  }
  return null;
}

/**
 * List style enum
 */
export const ListStyle = {
  automatic: 'automatic',
  plain: 'plain',
  inset: 'inset',
  insetGrouped: 'insetGrouped',
  grouped: 'grouped',
  sidebar: 'sidebar'
};

/**
 * List view class
 */
export class ListView extends View {
  constructor(...args) {
    super();

    this._children = [];
    this._data = null;
    this._idKeyPath = 'id';
    this._rowBuilder = null;
    this._selection = null;
    this._listStyle = ListStyle.automatic;

    // Parse arguments - multiple signatures supported
    if (args.length === 0) {
      // Empty list
    } else if (Array.isArray(args[0])) {
      // List(data, options?, rowBuilder)
      this._data = args[0];
      if (typeof args[1] === 'function') {
        this._rowBuilder = args[1];
      } else if (typeof args[1] === 'object' && typeof args[2] === 'function') {
        this._idKeyPath = args[1].id ?? 'id';
        this._selection = args[1].selection ?? null;
        this._rowBuilder = args[2];
      }
    } else if (typeof args[0] === 'object' && !Array.isArray(args[0]) && !(args[0] instanceof View) && !isDescriptor(args[0])) {
      // List({ selection: binding }, children...) - but NOT view descriptors
      const options = args[0];
      this._selection = options.selection ?? null;
      this._children = args.slice(1).flat();
    } else {
      // List(children...) - includes View instances and view descriptors
      this._children = args.flat();
    }
  }

  /**
   * Set the list style
   * @param {string} style - ListStyle value
   * @returns {ListView} Returns this for chaining
   */
  listStyle(style) {
    this._listStyle = style;
    return this;
  }

  /**
   * Get CSS styles for the list style
   * @private
   */
  _getListStyleCSS() {
    const base = {
      listStyle: 'none',
      margin: '0',
      padding: '0',
      overflowY: 'auto',
      overflowX: 'hidden'
    };

    switch (this._listStyle) {
      case ListStyle.plain:
        return { ...base };

      case ListStyle.inset:
        return {
          ...base,
          padding: '0 16px'
        };

      case ListStyle.grouped:
        return {
          ...base,
          backgroundColor: 'rgba(242, 242, 247, 1)'
        };

      case ListStyle.insetGrouped:
        return {
          ...base,
          padding: '0 16px',
          backgroundColor: 'rgba(242, 242, 247, 1)'
        };

      case ListStyle.sidebar:
        return {
          ...base,
          padding: '8px',
          backgroundColor: 'rgba(242, 242, 247, 0.5)'
        };

      case ListStyle.automatic:
      default:
        return base;
    }
  }

  _render() {
    const el = document.createElement('div');
    el.dataset.view = 'list';
    el.setAttribute('role', 'list');
    this._selectableRows = [];

    // Apply list styles
    const styles = this._getListStyleCSS();
    Object.assign(el.style, styles);

    // Render content
    if (this._data && this._rowBuilder) {
      // Data-driven list
      for (const item of this._data) {
        const rowContent = this._rowBuilder(item);
        const row = this._createListRow(rowContent, item, item?.[this._idKeyPath]);
        el.appendChild(row);
      }
    } else {
      // Children-based list - v2 fix
      for (const child of this._children) {
        // Render the child first
        const rendered = renderChild(child);
        if (rendered) {
          // Check if rendered element is a ForEach container (display:contents wrapper)
          // ForEach renderer creates a div with display:contents containing the items
          if (rendered.dataset && (rendered.dataset.view === 'For' || rendered.dataset.view === 'Show')) {
            // A reactive ForEach (For) or Show updates its own children in
            // place, so keep its wrapper intact: moving its rows into list
            // rows would detach them on the next update (#52). Its rows are
            // not given list-row chrome or selection.
            el.appendChild(rendered);
          } else if (rendered.dataset && rendered.dataset.view === 'ForEach') {
            // Extract children from ForEach and add each as a list row
            for (const itemEl of Array.from(rendered.childNodes)) {
              if (itemEl.nodeType === Node.ELEMENT_NODE) {
                const row = this._createListRow(itemEl, null);
                el.appendChild(row);
              }
            }
          } else if (rendered.style && rendered.style.display === 'contents' && rendered.childNodes.length > 1) {
            // Fallback: check for display:contents with multiple children
            for (const itemEl of Array.from(rendered.childNodes)) {
              if (itemEl.nodeType === Node.ELEMENT_NODE) {
                const row = this._createListRow(itemEl, null);
                el.appendChild(row);
              }
            }
          } else {
            // Regular child - wrap in a list row. A child tagged with
            // .tag(_:) is selectable by that value, as in SwiftUI.
            const row = this._createListRow(rendered, null, this._getTag(child));
            el.appendChild(row);
          }
        }
      }
    }

    if (this._selection && this._selectableRows.length > 0) {
      this._installSelection(el);
    }

    return this._applyModifiers(el);
  }

  /**
   * The value of a child's last `.tag(_:)`, or undefined.
   * @private
   */
  _getTag(child) {
    if (isDescriptor(child)) {
      for (let i = child.modifiers.length - 1; i >= 0; i--) {
        if (child.modifiers[i].type === ModifierType.TAG) return child.modifiers[i].value;
      }
      return undefined;
    }
    return child instanceof View ? (child._tag ?? undefined) : undefined;
  }

  /** @private */
  _readSelection() {
    const selection = this._selection;
    if (!selection) return null;
    return 'value' in selection ? selection.value : selection.wrappedValue;
  }

  /** @private */
  _writeSelection(value) {
    const selection = this._selection;
    if ('value' in selection) selection.value = value;
    else selection.wrappedValue = value;
  }

  /** @private */
  _isSelected(id) {
    const value = this._readSelection();
    return value instanceof Set ? value.has(id) : value === id;
  }

  /**
   * Select a row: replace the selection, or toggle membership when the
   * selection is a Set (multiple selection).
   * @private
   */
  _selectRow(id) {
    const value = this._readSelection();
    if (value instanceof Set) {
      const next = new Set(value);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      this._writeSelection(next);
    } else {
      this._writeSelection(id);
    }
    this._syncSelection();
  }

  /** @private */
  _syncSelection() {
    for (const { row, id } of this._selectableRows) {
      const selected = this._isSelected(id);
      row.setAttribute('aria-selected', selected ? 'true' : 'false');
      row.style.backgroundColor = selected ? 'rgba(0, 122, 255, 0.1)' : 'white';
    }
  }

  /**
   * #51: a selectable list is a WAI-ARIA listbox. Rows are options with
   * aria-selected and a roving tabindex; ↑/↓, Home and End move focus and
   * Space selects the focused row.
   * @private
   */
  _installSelection(el) {
    const rows = this._selectableRows;
    el.setAttribute('role', 'listbox');
    if (this._readSelection() instanceof Set) el.setAttribute('aria-multiselectable', 'true');
    let focusIndex = rows.findIndex(({ id }) => this._isSelected(id));
    if (focusIndex === -1) focusIndex = 0;
    rows.forEach(({ row }, index) => {
      row.setAttribute('role', 'option');
      row.tabIndex = index === focusIndex ? 0 : -1;
    });
    // A listbox may only own options: a row with no id is an option that
    // can't be selected.
    for (const row of el.children) {
      if (row.getAttribute('role') === 'listitem') {
        row.setAttribute('role', 'option');
        row.setAttribute('aria-disabled', 'true');
      }
    }
    this._syncSelection();

    const moveFocus = (index) => {
      rows.forEach(({ row }, i) => { row.tabIndex = i === index ? 0 : -1; });
      rows[index].row.focus?.();
    };

    rows.forEach(({ row, id }, index) => {
      row.addEventListener('keydown', (event) => {
        // Keys typed in a control inside the row belong to that control.
        if (event.target && event.target !== row) return;
        const last = rows.length - 1;
        switch (event.key) {
          case 'ArrowDown':
            moveFocus(Math.min(index + 1, last));
            break;
          case 'ArrowUp':
            moveFocus(Math.max(index - 1, 0));
            break;
          case 'Home':
            moveFocus(0);
            break;
          case 'End':
            moveFocus(last);
            break;
          case ' ':
          case 'Spacebar':
            this._selectRow(id);
            break;
          default:
            return;
        }
        event.preventDefault?.();
      });
      row.addEventListener('click', () => {
        rows.forEach(({ row: other }, i) => { other.tabIndex = i === index ? 0 : -1; });
        this._selectRow(id);
      });
    });
  }

  /**
   * Create a list row wrapper
   * @private
   */
  _createListRow(content, item, id) {
    const row = document.createElement('div');
    row.dataset.listRow = 'true';
    row.setAttribute('role', 'listitem');

    // Row styles
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.padding = '11px 16px';
    row.style.backgroundColor = 'white';
    row.style.borderBottom = '1px solid rgba(60, 60, 67, 0.1)';
    row.style.transition = 'background-color 0.15s ease';

    // Hover effect
    row.addEventListener('mouseenter', () => {
      row.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
    });
    row.addEventListener('mouseleave', () => {
      const isSelected = selectable && this._isSelected(id);
      row.style.backgroundColor = isSelected ? 'rgba(0, 122, 255, 0.1)' : 'white';
    });

    // Selection: wired up in _installSelection once every row exists.
    const selectable = Boolean(this._selection) && id !== undefined && id !== null;
    if (selectable) {
      row.style.cursor = 'pointer';
      this._selectableRows.push({ row, id });
    }

    // Append content
    if (content instanceof HTMLElement) {
      row.appendChild(content);
    } else {
      const rendered = renderChild(content);
      if (rendered) {
        row.appendChild(rendered);
      }
    }

    return row;
  }
}

/**
 * Factory function for List
 */
export function List(...args) {
  return new ListView(...args);
}

export { ListStyle as ListStyleType };
export default List;
