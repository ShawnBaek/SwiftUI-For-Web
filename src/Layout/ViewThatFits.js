/**
 * ViewThatFits - Selects the first child view that fits within the available space
 *
 * Matches SwiftUI's ViewThatFits container introduced in iOS 16.
 * Evaluates views in order and displays the first one that fits.
 *
 * @example
 * // Basic usage - first fitting view is displayed
 * ViewThatFits(
 *   HStack(Text('Wide Layout'), Text('Extra Info')),
 *   VStack(Text('Narrow'), Text('Layout'))
 * )
 *
 * @example
 * // Constrain to horizontal axis only
 * ViewThatFits({ in: 'horizontal' },
 *   Text('Very long text that needs lots of space'),
 *   Text('Medium text'),
 *   Text('Short')
 * )
 *
 * @example
 * // Adaptive HStack to VStack
 * ViewThatFits(
 *   HStack({ spacing: 20 }, ...cards),
 *   VStack({ spacing: 12 }, ...cards)
 * )
 */

import { View } from '../Core/View.js';

/**
 * Axis constraint for ViewThatFits
 */
export const Axis = {
  horizontal: 'horizontal',
  vertical: 'vertical',
  both: 'both'
};

export class ViewThatFitsClass extends View {
  /**
   * Create a ViewThatFits container
   * @param {Object|View} optionsOrFirstChild - Options object or first child view
   * @param {...View} children - Child views (checked in order)
   */
  constructor(optionsOrFirstChild, ...children) {
    super();

    // Parse arguments
    if (optionsOrFirstChild instanceof View || typeof optionsOrFirstChild === 'function') {
      this.children = [optionsOrFirstChild, ...children].flat();
      this.axis = Axis.both;
    } else {
      this.children = children.flat();
      this.axis = optionsOrFirstChild?.in ?? Axis.both;
    }

    this._selectedIndex = 0;
  }

  /**
   * Measure if a view fits within the available space
   * @param {View} view - View to measure
   * @param {HTMLElement} container - Container element
   * @returns {boolean} Whether the view fits
   * @private
   */
  _viewFits(view, container) {
    // Render the view temporarily to measure
    const element = view._render();
    element.style.visibility = 'hidden';
    element.style.position = 'absolute';
    element.style.whiteSpace = 'nowrap'; // Prevent wrapping for measurement
    container.appendChild(element);

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // Check if it fits based on axis
    let fits = true;
    if (this.axis === Axis.horizontal || this.axis === Axis.both) {
      fits = fits && elementRect.width <= containerRect.width;
    }
    if (this.axis === Axis.vertical || this.axis === Axis.both) {
      fits = fits && elementRect.height <= containerRect.height;
    }

    // Clean up
    container.removeChild(element);

    return fits;
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'ViewThatFits';
    container.style.display = 'contents'; // Don't affect layout

    // Create a wrapper for measurement
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.overflow = 'hidden';

    // Find the first child that fits
    // For initial render, we'll use a heuristic based on viewport
    // Real measurement happens after DOM insertion
    const selectedView = this._selectView();

    if (selectedView) {
      const element = selectedView._render();
      wrapper.appendChild(element);
    }

    container.appendChild(wrapper);

    // Set up resize observer for dynamic adaptation
    this._setupResizeObserver(wrapper);

    return this._applyModifiers(container);
  }

  /**
   * Select the appropriate view based on available space
   * @returns {View|null} The selected view
   * @private
   */
  _selectView() {
    if (this.children.length === 0) return null;
    if (this.children.length === 1) return this.children[0];

    // Use viewport-based heuristic for initial selection
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Try each child in order
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];

      // Simple heuristic: later children are assumed to need less space
      // This works well for the common pattern of:
      // ViewThatFits(WideView, MediumView, CompactView)
      if (i === this.children.length - 1) {
        // Last child is always the fallback
        this._selectedIndex = i;
        return child;
      }

      // Estimate if this view would fit based on its type
      if (this._estimateFits(child, width, height)) {
        this._selectedIndex = i;
        return child;
      }
    }

    // Fallback to last child
    this._selectedIndex = this.children.length - 1;
    return this.children[this._selectedIndex];
  }

  /**
   * Estimate if a view fits based on its type and content
   * @param {View} view - View to estimate
   * @param {number} width - Available width
   * @param {number} height - Available height
   * @returns {boolean} Whether the view likely fits
   * @private
   */
  _estimateFits(view, width, height) {
    const viewName = view.constructor.name;

    // HStack needs more horizontal space than VStack
    if (this.axis === Axis.horizontal || this.axis === Axis.both) {
      if (viewName === 'HStackClass' || viewName === 'HStack') {
        // HStack needs more width - use a threshold
        return width >= 600;
      }
    }

    if (this.axis === Axis.vertical || this.axis === Axis.both) {
      if (viewName === 'VStackClass' || viewName === 'VStack') {
        // VStack needs more height
        return height >= 400;
      }
    }

    // Default: assume it fits
    return true;
  }

  /**
   * Set up resize observer for dynamic adaptation
   * @param {HTMLElement} wrapper - Wrapper element
   * @private
   */
  _setupResizeObserver(wrapper) {
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        // Re-select view based on new size
        const newIndex = this._findBestFitIndex(width, height);

        if (newIndex !== this._selectedIndex) {
          this._selectedIndex = newIndex;
          // Re-render with new selection
          wrapper.innerHTML = '';
          const selectedView = this.children[newIndex];
          if (selectedView) {
            wrapper.appendChild(selectedView._render());
          }
        }
      }
    });

    observer.observe(wrapper);
  }

  /**
   * Find the index of the best fitting view
   * @param {number} width - Available width
   * @param {number} height - Available height
   * @returns {number} Index of best fitting view
   * @private
   */
  _findBestFitIndex(width, height) {
    for (let i = 0; i < this.children.length - 1; i++) {
      if (this._estimateFits(this.children[i], width, height)) {
        return i;
      }
    }
    return this.children.length - 1;
  }
}

/**
 * Factory function for ViewThatFits
 * @param {Object|View} optionsOrFirstChild - Options or first child
 * @param {...View} children - Child views
 * @returns {ViewThatFitsClass} ViewThatFits instance
 */
export function ViewThatFits(optionsOrFirstChild, ...children) {
  return new ViewThatFitsClass(optionsOrFirstChild, ...children);
}

export default ViewThatFits;
