/**
 * Grid - A container that arranges views in a grid
 *
 * Matches SwiftUI's Grid for flexible grid layouts.
 *
 * @example
 * Grid(
 *   GridRow(
 *     Text('A'),
 *     Text('B'),
 *     Text('C')
 *   ),
 *   GridRow(
 *     Text('D'),
 *     Text('E'),
 *     Text('F')
 *   )
 * )
 *
 * @example
 * LazyVGrid({ columns: [GridItem(.flexible()), GridItem(.flexible())] },
 *   ForEach(items, item => ItemView(item))
 * )
 */

import { View } from '../Core/View.js';
import { Alignment } from './Alignment.js';

/**
 * GridItem size type
 */
export const GridItemSize = {
  /**
   * Fixed size
   * @param {number} size - Fixed size in pixels
   */
  fixed(size) {
    return { type: 'fixed', size };
  },

  /**
   * Flexible size
   * @param {Object} options - { minimum, maximum }
   */
  flexible(options = {}) {
    return {
      type: 'flexible',
      minimum: options.minimum ?? 10,
      maximum: options.maximum ?? Infinity
    };
  },

  /**
   * Adaptive size - fits as many as possible
   * @param {Object} options - { minimum, maximum }
   */
  adaptive(options = {}) {
    return {
      type: 'adaptive',
      minimum: options.minimum ?? 10,
      maximum: options.maximum ?? Infinity
    };
  }
};

/**
 * GridItem - Describes a column or row in a grid
 */
export class GridItem {
  constructor(size = GridItemSize.flexible(), options = {}) {
    this.size = size;
    this.spacing = options.spacing ?? null;
    this.alignment = options.alignment ?? null;
  }

  /**
   * Create a fixed-size grid item
   * @param {number} size - Size in pixels
   */
  static fixed(size, options = {}) {
    return new GridItem(GridItemSize.fixed(size), options);
  }

  /**
   * Create a flexible grid item
   * @param {Object} options - { minimum, maximum }
   */
  static flexible(options = {}) {
    return new GridItem(GridItemSize.flexible(options), options);
  }

  /**
   * Create an adaptive grid item
   * @param {Object} options - { minimum, maximum }
   */
  static adaptive(options = {}) {
    return new GridItem(GridItemSize.adaptive(options), options);
  }
}

/**
 * GridRow - A horizontal row in a Grid
 */
export class GridRowView extends View {
  constructor(...children) {
    super();
    this._children = children.flat();
    this._alignment = null;
  }

  /**
   * Set vertical alignment for this row
   * @param {string} alignment - Alignment value
   */
  gridCellAnchor(alignment) {
    this._alignment = alignment;
    return this;
  }

  _render() {
    // GridRow is rendered by parent Grid
    const row = document.createElement('div');
    row.dataset.view = 'grid-row';
    row.style.display = 'contents'; // Let CSS Grid handle layout

    this._children.forEach(child => {
      if (child instanceof View) {
        row.appendChild(child._render());
      }
    });

    return this._applyModifiers(row);
  }
}

/**
 * Factory function for GridRow
 */
export function GridRow(...children) {
  return new GridRowView(...children);
}

/**
 * Grid view class
 */
export class GridView extends View {
  constructor(options = {}, ...children) {
    super();

    // Handle case where first arg is a child, not options
    if (options instanceof View || Array.isArray(options)) {
      children = [options, ...children];
      options = {};
    }

    this._alignment = options.alignment ?? Alignment.center;
    this._horizontalSpacing = options.horizontalSpacing ?? 8;
    this._verticalSpacing = options.verticalSpacing ?? 8;
    this._children = children.flat();
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'grid';
    container.style.display = 'grid';
    container.style.gap = `${this._verticalSpacing}px ${this._horizontalSpacing}px`;

    // Count max columns from GridRows
    let maxColumns = 1;
    this._children.forEach(child => {
      if (child instanceof GridRowView) {
        maxColumns = Math.max(maxColumns, child._children.length);
      }
    });

    // Set grid template
    container.style.gridTemplateColumns = `repeat(${maxColumns}, auto)`;

    // Set alignment
    container.style.justifyItems = this._getAlignmentCSS(this._alignment);
    container.style.alignItems = 'center';

    // Render children
    this._children.forEach(child => {
      if (child instanceof View) {
        container.appendChild(child._render());
      }
    });

    return this._applyModifiers(container);
  }

  _getAlignmentCSS(alignment) {
    if (alignment === Alignment.leading) return 'start';
    if (alignment === Alignment.trailing) return 'end';
    return 'center';
  }
}

/**
 * Factory function for Grid
 */
export function Grid(options, ...children) {
  return new GridView(options, ...children);
}

/**
 * LazyVGrid - A container that arranges views in a vertically scrolling grid
 */
export class LazyVGridView extends View {
  constructor(options = {}, ...children) {
    super();

    this._columns = options.columns ?? [GridItem.flexible()];
    this._alignment = options.alignment ?? Alignment.center;
    this._spacing = options.spacing ?? 8;
    this._pinnedViews = options.pinnedViews ?? [];
    this._children = children.flat();
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'lazy-v-grid';
    container.style.display = 'grid';
    container.style.gap = `${this._spacing}px`;

    // Build grid-template-columns from column definitions
    const columnDefs = this._columns.map(col => {
      if (col.size.type === 'fixed') {
        return `${col.size.size}px`;
      } else if (col.size.type === 'flexible') {
        const min = col.size.minimum ? `${col.size.minimum}px` : '0';
        const max = col.size.maximum === Infinity ? '1fr' : `${col.size.maximum}px`;
        return `minmax(${min}, ${max})`;
      } else if (col.size.type === 'adaptive') {
        return `repeat(auto-fill, minmax(${col.size.minimum}px, 1fr))`;
      }
      return '1fr';
    });

    container.style.gridTemplateColumns = columnDefs.join(' ');

    // Render children
    this._children.forEach(child => {
      if (child instanceof View) {
        const rendered = child._render();

        // If it's a ForEach, it returns multiple items
        if (rendered instanceof DocumentFragment || rendered.dataset?.view === 'for-each') {
          const items = rendered.querySelectorAll ?
            Array.from(rendered.children) :
            [rendered];
          items.forEach(item => container.appendChild(item));
        } else {
          container.appendChild(rendered);
        }
      }
    });

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for LazyVGrid
 */
export function LazyVGrid(options, ...children) {
  return new LazyVGridView(options, ...children);
}

/**
 * LazyHGrid - A container that arranges views in a horizontally scrolling grid
 */
export class LazyHGridView extends View {
  constructor(options = {}, ...children) {
    super();

    this._rows = options.rows ?? [GridItem.flexible()];
    this._alignment = options.alignment ?? Alignment.center;
    this._spacing = options.spacing ?? 8;
    this._children = children.flat();
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'lazy-h-grid';
    container.style.display = 'grid';
    container.style.gridAutoFlow = 'column';
    container.style.gap = `${this._spacing}px`;
    container.style.overflowX = 'auto';

    // Build grid-template-rows from row definitions
    const rowDefs = this._rows.map(row => {
      if (row.size.type === 'fixed') {
        return `${row.size.size}px`;
      } else if (row.size.type === 'flexible') {
        const min = row.size.minimum ? `${row.size.minimum}px` : '0';
        const max = row.size.maximum === Infinity ? '1fr' : `${row.size.maximum}px`;
        return `minmax(${min}, ${max})`;
      }
      return 'auto';
    });

    container.style.gridTemplateRows = rowDefs.join(' ');

    // Render children
    this._children.forEach(child => {
      if (child instanceof View) {
        container.appendChild(child._render());
      }
    });

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for LazyHGrid
 */
export function LazyHGrid(options, ...children) {
  return new LazyHGridView(options, ...children);
}

export default {
  Grid,
  GridRow,
  GridItem,
  GridItemSize,
  LazyVGrid,
  LazyHGrid
};
