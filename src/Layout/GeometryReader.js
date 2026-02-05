/**
 * GeometryReader - A container view that provides access to its size and position
 *
 * Matches SwiftUI's GeometryReader for creating views that adapt to their container.
 *
 * @example
 * GeometryReader((geometry) =>
 *   Text(`Width: ${geometry.size.width}`)
 * )
 *
 * @example
 * GeometryReader((geometry) =>
 *   Circle()
 *     .fill(Color.blue)
 *     .frame({ width: geometry.size.width * 0.5 })
 * )
 */

import { View } from '../Core/View.js';

/**
 * GeometryProxy - Provides size and coordinate space information
 */
export class GeometryProxy {
  constructor(element) {
    this._element = element;
    this._cachedSize = null;
    this._cachedFrame = null;
  }

  /**
   * The size of the container
   */
  get size() {
    if (!this._cachedSize && this._element) {
      const rect = this._element.getBoundingClientRect();
      this._cachedSize = {
        width: rect.width,
        height: rect.height
      };
    }
    return this._cachedSize ?? { width: 0, height: 0 };
  }

  /**
   * Get the frame in a specific coordinate space
   * @param {string} coordinateSpace - 'local' or 'global'
   * @returns {Object} Frame with x, y, width, height
   */
  frame(coordinateSpace = 'local') {
    if (!this._element) {
      return { x: 0, y: 0, width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0, midX: 0, midY: 0 };
    }

    const rect = this._element.getBoundingClientRect();

    if (coordinateSpace === 'global') {
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        minX: rect.left,
        minY: rect.top,
        maxX: rect.right,
        maxY: rect.bottom,
        midX: rect.left + rect.width / 2,
        midY: rect.top + rect.height / 2
      };
    }

    // Local coordinate space
    return {
      x: 0,
      y: 0,
      width: rect.width,
      height: rect.height,
      minX: 0,
      minY: 0,
      maxX: rect.width,
      maxY: rect.height,
      midX: rect.width / 2,
      midY: rect.height / 2
    };
  }

  /**
   * Safe area insets (for web, we estimate based on common patterns)
   */
  get safeAreaInsets() {
    // In web, we can check for env() CSS variables
    return {
      top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'),
      bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0'),
      leading: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0'),
      trailing: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0')
    };
  }

  /**
   * Invalidate cached values (call when element resizes)
   * @internal
   */
  _invalidate() {
    this._cachedSize = null;
    this._cachedFrame = null;
  }
}

/**
 * GeometryReader view class
 */
export class GeometryReaderView extends View {
  constructor(builder) {
    super();
    this._builder = builder;
    this._geometry = null;
    this._resizeObserver = null;
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'geometry-reader';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';

    // Create geometry proxy
    this._geometry = new GeometryProxy(container);

    // We need to render content after the container is in the DOM
    // so we can measure its size
    const renderContent = () => {
      // Clear existing content
      container.innerHTML = '';

      // Invalidate cached measurements
      this._geometry._invalidate();

      // Build content with geometry
      if (typeof this._builder === 'function') {
        const content = this._builder(this._geometry);
        if (content instanceof View) {
          container.appendChild(content._render());
        }
      }
    };

    // Initial render with requestAnimationFrame to ensure container is in DOM
    requestAnimationFrame(() => {
      renderContent();
    });

    // Set up resize observer for dynamic updates
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => {
        renderContent();
      });
      this._resizeObserver.observe(container);
    }

    return this._applyModifiers(container);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }
}

/**
 * Factory function for GeometryReader
 */
export function GeometryReader(builder) {
  return new GeometryReaderView(builder);
}

export default GeometryReader;
