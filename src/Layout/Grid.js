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

import { createDescriptor, isView } from '../Core/ViewDescriptor.js';
import { chainable } from '../Core/Chainable.js';
import { registerRenderer, renderChildren } from '../Core/Renderer.js';
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
export function GridRow(...children) {
  return chainable(createDescriptor('GridRow', { anchor: null }, children.flat()), ({ withProps }) => ({
    gridCellAnchor: (alignment) => withProps({ anchor: alignment }),
  }));
}

registerRenderer('GridRow', (props, children) => {
  const row = document.createElement('div');
  row.dataset.view = 'grid-row';
  row.style.display = 'contents'; // Let CSS Grid handle layout
  row.appendChild(renderChildren(children));
  return row;
});

// Options first, or only children.
function splitOptions(options, children) {
  return isView(options) || Array.isArray(options) || options == null
    ? [{}, [options, ...children].flat()]
    : [options, children.flat()];
}

/**
 * Grid({ alignment, horizontalSpacing, verticalSpacing }?, ...rows)
 */
export function Grid(options, ...children) {
  const [opts, content] = splitOptions(options, children);
  return chainable(createDescriptor('Grid', {
    alignment: opts.alignment ?? Alignment.center,
    horizontalSpacing: opts.horizontalSpacing ?? 8,
    verticalSpacing: opts.verticalSpacing ?? 8,
  }, content));
}

registerRenderer('Grid', (props, children) => {
  const container = document.createElement('div');
  container.dataset.view = 'grid';
  container.style.display = 'grid';
  container.style.gap = `${props.verticalSpacing}px ${props.horizontalSpacing}px`;
  // As many columns as the longest GridRow
  let columns = 1;
  for (const child of children) {
    if (child?.type === 'GridRow') columns = Math.max(columns, child.children.length);
  }
  container.style.gridTemplateColumns = `repeat(${columns}, auto)`;
  const { alignment } = props;
  container.style.justifyItems = alignment === Alignment.leading ? 'start' : alignment === Alignment.trailing ? 'end' : 'center';
  container.style.alignItems = 'center';
  container.appendChild(renderChildren(children));
  return container;
});

// A GridItem's CSS track size.
function trackSize({ size }, adaptive) {
  if (size.type === 'fixed') return `${size.size}px`;
  if (size.type === 'flexible') {
    return `minmax(${size.minimum ? `${size.minimum}px` : '0'}, ${size.maximum === Infinity ? '1fr' : `${size.maximum}px`})`;
  }
  if (size.type === 'adaptive' && adaptive) return `repeat(auto-fill, minmax(${size.minimum}px, 1fr))`;
  return adaptive ? '1fr' : 'auto';
}

/**
 * LazyVGrid({ columns, alignment, spacing, pinnedViews }, ...content)
 */
export function LazyVGrid(options = {}, ...children) {
  return chainable(createDescriptor('LazyVGrid', {
    columns: options.columns ?? [GridItem.flexible()],
    alignment: options.alignment ?? Alignment.center,
    spacing: options.spacing ?? 8,
    pinnedViews: options.pinnedViews ?? [],
  }, children.flat()));
}

/**
 * LazyHGrid({ rows, alignment, spacing }, ...content)
 */
export function LazyHGrid(options = {}, ...children) {
  return chainable(createDescriptor('LazyHGrid', {
    rows: options.rows ?? [GridItem.flexible()],
    alignment: options.alignment ?? Alignment.center,
    spacing: options.spacing ?? 8,
  }, children.flat()));
}

registerRenderer('LazyVGrid', (props, children) => {
  const container = document.createElement('div');
  container.dataset.view = 'lazy-v-grid';
  container.style.display = 'grid';
  container.style.gap = `${props.spacing}px`;
  container.style.gridTemplateColumns = props.columns.map((column) => trackSize(column, true)).join(' ');
  // A ForEach renders a display: contents wrapper, so its rows are cells.
  container.appendChild(renderChildren(children));
  return container;
});

registerRenderer('LazyHGrid', (props, children) => {
  const container = document.createElement('div');
  container.dataset.view = 'lazy-h-grid';
  container.style.display = 'grid';
  container.style.gridAutoFlow = 'column';
  container.style.gap = `${props.spacing}px`;
  container.style.overflowX = 'auto';
  container.style.gridTemplateRows = props.rows.map((row) => trackSize(row, false)).join(' ');
  container.appendChild(renderChildren(children));
  return container;
});

export default {
  Grid,
  GridRow,
  GridItem,
  GridItemSize,
  LazyVGrid,
  LazyHGrid
};
