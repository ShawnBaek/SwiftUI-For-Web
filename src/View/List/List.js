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
        this._rowBuilder = args[2];
      }
    } else if (typeof args[0] === 'object' && !Array.isArray(args[0]) && !(args[0] instanceof View)) {
      // List({ selection: binding }, children...)
      const options = args[0];
      this._selection = options.selection ?? null;
      this._children = args.slice(1).flat();
    } else {
      // List(children...)
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

    // Apply list styles
    const styles = this._getListStyleCSS();
    Object.assign(el.style, styles);

    // Render content
    if (this._data && this._rowBuilder) {
      // Data-driven list
      for (const item of this._data) {
        const row = this._createListRow(this._rowBuilder(item), item);
        el.appendChild(row);
      }
    } else {
      // Children-based list
      for (const child of this._children) {
        if (child instanceof View) {
          const renderedChild = child._render();
          const row = this._createListRow(renderedChild, null);
          el.appendChild(row);
        }
      }
    }

    return this._applyModifiers(el);
  }

  /**
   * Create a list row wrapper
   * @private
   */
  _createListRow(content, item) {
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
      const isSelected = this._selection && item && this._selection.value === item[this._idKeyPath];
      row.style.backgroundColor = isSelected ? 'rgba(0, 122, 255, 0.1)' : 'white';
    });

    // Selection handling
    if (this._selection && item) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        this._selection.value = item[this._idKeyPath];
      });

      // Check if selected
      if (this._selection.value === item[this._idKeyPath]) {
        row.style.backgroundColor = 'rgba(0, 122, 255, 0.1)';
      }
    }

    // Append content
    if (content instanceof HTMLElement) {
      row.appendChild(content);
    } else if (content instanceof View) {
      row.appendChild(content._render());
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
