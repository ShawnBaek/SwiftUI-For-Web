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

import { createDescriptor, isView } from '../Core/ViewDescriptor.js';
import { chainable } from '../Core/Chainable.js';
import { registerRenderer, render } from '../Core/Renderer.js';
import { getOwner, onCleanup } from '../Data/Signal.js';
import { createOwnedSlot } from '../Core/OwnedSlot.js';
import { releaseChildren } from '../Core/ElementPool.js';

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
 * GeometryReader((geometry) => View): content built from the size of the
 * space it is offered, rebuilt when that size changes.
 *
 * @param {(geometry: GeometryProxy) => Object} builder
 * @returns {Object} Chainable view descriptor
 */
export function GeometryReader(builder) {
  return chainable(createDescriptor('GeometryReader', { builder }));
}

registerRenderer('GeometryReader', ({ builder }) => {
  const container = document.createElement('div');
  container.dataset.view = 'geometry-reader';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.position = 'relative';
  const geometry = new GeometryProxy(container);

  // Content is rendered later from requestAnimationFrame and ResizeObserver
  // callbacks, where there is no current owner. The slot keeps its effects
  // owned, disposes them on each re-render, and stops rendering once the
  // owner (for example, the app) is disposed.
  const contentSlot = createOwnedSlot();
  let observer = null;
  const stop = () => {
    observer?.disconnect();
    observer = null;
  };

  // Rendered once the container is in the document and can be measured.
  const renderContent = () => {
    if (contentSlot.isDisposed()) return stop();
    // Dispose the previous content's effects, then release its elements.
    contentSlot.clear();
    releaseChildren(container);
    geometry._invalidate();
    const node = contentSlot.render(() => {
      const content = typeof builder === 'function' ? builder(geometry) : null;
      return isView(content) ? render(content) : null;
    });
    if (node) container.appendChild(node);
  };

  requestAnimationFrame(renderContent);
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(renderContent);
    observer.observe(container);
  }
  if (getOwner()) onCleanup(stop);

  return container;
});

export default GeometryReader;
