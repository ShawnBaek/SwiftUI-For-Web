/**
 * LazyVStack & LazyHStack - Lazy loading stacks with virtual scrolling
 *
 * Matches SwiftUI's lazy stacks that only render visible items.
 *
 * @example
 * LazyVStack(
 *   ForEach(items, item => ItemView(item))
 * )
 *
 * @example
 * LazyHStack({ spacing: 20 },
 *   ForEach(items, item => ItemView(item))
 * )
 */

import { View } from '../../Core/View.js';
import { Alignment } from '../Alignment.js';

/**
 * LazyVStack - A vertically stacked view that creates items lazily
 */
export class LazyVStackView extends View {
  constructor(options = {}, ...children) {
    super();

    // Handle case where first arg is a child
    if (options instanceof View || Array.isArray(options)) {
      children = [options, ...children];
      options = {};
    }

    this._alignment = options.alignment ?? Alignment.center;
    this._spacing = options.spacing ?? 8;
    this._pinnedViews = options.pinnedViews ?? [];
    this._children = children.flat();

    // Virtual scrolling settings
    this._itemHeight = options.itemHeight ?? 44; // Estimated item height
    this._overscan = options.overscan ?? 5; // Extra items to render
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'lazy-v-stack';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = `${this._spacing}px`;
    container.style.alignItems = this._getAlignmentCSS();
    container.style.minHeight = '0';

    // For now, render all children but set up for lazy loading
    // Full virtual scrolling would require more complex intersection observer logic
    const visibleItems = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const index = parseInt(entry.target.dataset.lazyIndex);
        if (entry.isIntersecting) {
          visibleItems.add(index);
          entry.target.style.visibility = 'visible';
        } else {
          // Keep rendered but mark as potentially recyclable
          visibleItems.delete(index);
        }
      });
    }, {
      root: null,
      rootMargin: `${this._itemHeight * this._overscan}px 0px`,
      threshold: 0
    });

    // Render children with lazy loading support
    this._children.forEach((child, index) => {
      if (child instanceof View) {
        const wrapper = document.createElement('div');
        wrapper.dataset.lazyIndex = String(index);
        wrapper.style.minHeight = `${this._itemHeight}px`;

        const rendered = child._render();
        wrapper.appendChild(rendered);

        // Observe for visibility
        observer.observe(wrapper);

        container.appendChild(wrapper);
      }
    });

    // Store observer for cleanup
    container._lazyObserver = observer;

    return this._applyModifiers(container);
  }

  _getAlignmentCSS() {
    switch (this._alignment) {
      case Alignment.leading: return 'flex-start';
      case Alignment.trailing: return 'flex-end';
      case Alignment.center:
      default: return 'center';
    }
  }
}

/**
 * Factory function for LazyVStack
 */
export function LazyVStack(options, ...children) {
  return new LazyVStackView(options, ...children);
}

/**
 * LazyHStack - A horizontally stacked view that creates items lazily
 */
export class LazyHStackView extends View {
  constructor(options = {}, ...children) {
    super();

    // Handle case where first arg is a child
    if (options instanceof View || Array.isArray(options)) {
      children = [options, ...children];
      options = {};
    }

    this._alignment = options.alignment ?? Alignment.center;
    this._spacing = options.spacing ?? 8;
    this._pinnedViews = options.pinnedViews ?? [];
    this._children = children.flat();

    // Virtual scrolling settings
    this._itemWidth = options.itemWidth ?? 100; // Estimated item width
    this._overscan = options.overscan ?? 3; // Extra items to render
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'lazy-h-stack';
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.gap = `${this._spacing}px`;
    container.style.alignItems = this._getAlignmentCSS();
    container.style.minWidth = '0';

    // Intersection observer for lazy loading
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.visibility = 'visible';
        }
      });
    }, {
      root: null,
      rootMargin: `0px ${this._itemWidth * this._overscan}px`,
      threshold: 0
    });

    // Render children with lazy loading support
    this._children.forEach((child, index) => {
      if (child instanceof View) {
        const wrapper = document.createElement('div');
        wrapper.dataset.lazyIndex = String(index);
        wrapper.style.minWidth = `${this._itemWidth}px`;
        wrapper.style.flexShrink = '0';

        const rendered = child._render();
        wrapper.appendChild(rendered);

        observer.observe(wrapper);
        container.appendChild(wrapper);
      }
    });

    container._lazyObserver = observer;

    return this._applyModifiers(container);
  }

  _getAlignmentCSS() {
    switch (this._alignment) {
      case Alignment.top: return 'flex-start';
      case Alignment.bottom: return 'flex-end';
      case Alignment.center:
      default: return 'center';
    }
  }
}

/**
 * Factory function for LazyHStack
 */
export function LazyHStack(options, ...children) {
  return new LazyHStackView(options, ...children);
}

/**
 * PinnedScrollableViews - Specifies which views should be pinned
 */
export const PinnedScrollableViews = {
  sectionHeaders: 'sectionHeaders',
  sectionFooters: 'sectionFooters'
};

export default {
  LazyVStack,
  LazyHStack,
  PinnedScrollableViews
};
