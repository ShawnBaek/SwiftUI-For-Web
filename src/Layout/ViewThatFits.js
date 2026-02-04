/**
 * ViewThatFits - Selects the first child view that fits within the available space
 *
 * Matches SwiftUI's ViewThatFits container introduced in iOS 16.
 *
 * SwiftUI Implementation Details:
 * - ViewThatFits applies fixedSize() to each child view to get its "ideal size"
 * - The ideal size is the size a view would occupy with no constraints (unlimited space)
 * - It compares each child's ideal size against the parent's proposed size
 * - Selects the FIRST child whose ideal size fits within the proposed size
 * - If no child fits, falls back to the LAST child
 *
 * @see https://developer.apple.com/documentation/swiftui/viewthatfits
 * @see https://fatbobman.com/en/posts/mastering-viewthatfits/
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
 * Determines which axes to consider when measuring fit
 */
export const Axis = {
  horizontal: 'horizontal',
  vertical: 'vertical',
  both: 'both'
};

/**
 * Proposed size (matches SwiftUI's ProposedViewSize concept)
 * nil in SwiftUI corresponds to undefined here - means "use ideal size"
 */
class ProposedViewSize {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  static get unspecified() {
    return new ProposedViewSize(undefined, undefined);
  }

  static get zero() {
    return new ProposedViewSize(0, 0);
  }

  static get infinity() {
    return new ProposedViewSize(Infinity, Infinity);
  }

  replacingUnspecifiedDimensions(defaults = { width: 10, height: 10 }) {
    return new ProposedViewSize(
      this.width ?? defaults.width,
      this.height ?? defaults.height
    );
  }
}

export class ViewThatFitsClass extends View {
  /**
   * Create a ViewThatFits container
   * @param {Object|View} optionsOrFirstChild - Options object or first child view
   * @param {...View} children - Child views (checked in order)
   */
  constructor(optionsOrFirstChild, ...children) {
    super();

    // Parse arguments (SwiftUI-style overloading)
    if (optionsOrFirstChild instanceof View || typeof optionsOrFirstChild === 'function') {
      this.children = [optionsOrFirstChild, ...children].flat();
      this.axis = Axis.both;
    } else {
      this.children = children.flat();
      this.axis = optionsOrFirstChild?.in ?? Axis.both;
    }

    this._selectedIndex = 0;
    this._measurementContainer = null;
  }

  /**
   * Measure a view's ideal size (like SwiftUI's fixedSize behavior)
   *
   * In SwiftUI, the ideal size is what a view returns when proposed .unspecified
   * This is achieved by fixedSize() which proposes nil for both dimensions
   *
   * @param {View} view - View to measure
   * @returns {{width: number, height: number}} The view's ideal size
   * @private
   */
  _measureIdealSize(view) {
    // Create or reuse measurement container
    if (!this._measurementContainer) {
      this._measurementContainer = document.createElement('div');
      this._measurementContainer.style.cssText = `
        position: absolute;
        visibility: hidden;
        pointer-events: none;
        top: -9999px;
        left: -9999px;
        width: max-content;
        height: max-content;
      `;
      document.body.appendChild(this._measurementContainer);
    }

    // Render view to measure its ideal size
    const element = view._render();

    // Apply fixedSize-like behavior: allow view to take its ideal size
    // In CSS, this means no width/height constraints
    element.style.width = 'max-content';
    element.style.height = 'max-content';
    element.style.whiteSpace = 'nowrap'; // Prevent text wrapping for ideal width
    element.style.overflow = 'visible';

    this._measurementContainer.innerHTML = '';
    this._measurementContainer.appendChild(element);

    // Force layout calculation
    const rect = element.getBoundingClientRect();
    const idealSize = {
      width: rect.width,
      height: rect.height
    };

    // Clean up
    this._measurementContainer.innerHTML = '';

    return idealSize;
  }

  /**
   * Check if a view's ideal size fits within the proposed size
   *
   * SwiftUI's ViewThatFits compares:
   * - Child's ideal size (what it wants)
   * - Parent's proposed size (what's available)
   *
   * @param {Object} idealSize - The view's ideal size {width, height}
   * @param {Object} proposedSize - Available size {width, height}
   * @returns {boolean} Whether the ideal size fits
   * @private
   */
  _idealSizeFits(idealSize, proposedSize) {
    let fits = true;

    // Check horizontal fit
    if (this.axis === Axis.horizontal || this.axis === Axis.both) {
      if (proposedSize.width !== undefined && proposedSize.width !== Infinity) {
        fits = fits && (idealSize.width <= proposedSize.width);
      }
    }

    // Check vertical fit
    if (this.axis === Axis.vertical || this.axis === Axis.both) {
      if (proposedSize.height !== undefined && proposedSize.height !== Infinity) {
        fits = fits && (idealSize.height <= proposedSize.height);
      }
    }

    return fits;
  }

  /**
   * Select the first child view that fits
   *
   * SwiftUI's algorithm:
   * 1. For each child (in order):
   *    a. Apply fixedSize() to get ideal size
   *    b. Compare ideal size to proposed size
   *    c. If it fits, select this child
   * 2. If no child fits, select the LAST child
   *
   * @param {Object} proposedSize - Available size from parent
   * @returns {number} Index of selected view
   * @private
   */
  _selectViewIndex(proposedSize) {
    if (this.children.length === 0) return -1;
    if (this.children.length === 1) return 0;

    // Try each child in order (SwiftUI behavior)
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const idealSize = this._measureIdealSize(child);

      if (this._idealSizeFits(idealSize, proposedSize)) {
        return i;
      }
    }

    // Fallback: last child (SwiftUI behavior when nothing fits)
    return this.children.length - 1;
  }

  /**
   * Clean up measurement container
   * @private
   */
  _cleanup() {
    if (this._measurementContainer && this._measurementContainer.parentNode) {
      this._measurementContainer.parentNode.removeChild(this._measurementContainer);
      this._measurementContainer = null;
    }
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'ViewThatFits';
    container.style.cssText = `
      width: 100%;
      height: 100%;
    `;

    // Store container reference for resize handling
    this._container = container;

    // Initial render with deferred measurement
    // We need to wait for the container to be in the DOM to know its size
    requestAnimationFrame(() => {
      this._updateSelection();
    });

    // Set up resize observer for dynamic adaptation
    this._setupResizeObserver(container);

    return this._applyModifiers(container);
  }

  /**
   * Update the selected view based on current container size
   * @private
   */
  _updateSelection() {
    if (!this._container) return;

    // Get proposed size from container (available space)
    const rect = this._container.getBoundingClientRect();
    const proposedSize = {
      width: rect.width,
      height: rect.height
    };

    // Handle case where container isn't laid out yet
    if (proposedSize.width === 0 && proposedSize.height === 0) {
      // Use viewport as fallback
      proposedSize.width = window.innerWidth;
      proposedSize.height = window.innerHeight;
    }

    // Select the first fitting child
    const newIndex = this._selectViewIndex(proposedSize);

    if (newIndex !== this._selectedIndex || this._container.children.length === 0) {
      this._selectedIndex = newIndex;

      // Render selected view
      this._container.innerHTML = '';

      if (newIndex >= 0 && newIndex < this.children.length) {
        const selectedView = this.children[newIndex];
        const element = selectedView._render();
        this._container.appendChild(element);
      }
    }

    // Clean up measurement container
    this._cleanup();
  }

  /**
   * Set up resize observer for dynamic adaptation
   * @param {HTMLElement} container - Container element
   * @private
   */
  _setupResizeObserver(container) {
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Debounce rapid resize events
        if (this._resizeTimeout) {
          clearTimeout(this._resizeTimeout);
        }
        this._resizeTimeout = setTimeout(() => {
          this._updateSelection();
        }, 16); // ~60fps
      }
    });

    observer.observe(container);

    // Store observer for potential cleanup
    this._resizeObserver = observer;
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

export { ProposedViewSize };
export default ViewThatFits;
