/**
 * LazyVStack & LazyHStack
 *
 * Lazy (#50): a row's view is built when it nears the viewport and kept
 * once built, as in SwiftUI. Rows are not recycled.
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

import { isDescriptor } from '../../Core/ViewDescriptor.js';
import { View } from '../../Core/View.js';
import { createOwnedSlot } from '../../Core/OwnedSlot.js';
import { getOwner, onCleanup } from '../../Data/Signal.js';
import { render as renderDescriptor } from '../../Core/Renderer.js';

/**
 * Lazy rows (#50): like SwiftUI's lazy stacks, a row's view is built only
 * when its placeholder comes near the viewport (overscan beyond it), and
 * kept once built. Each row renders through an owned slot created now, so
 * its effects belong to the stack's owner although it renders later. With
 * no IntersectionObserver (old browsers, static rendering, tests) every row
 * renders at once.
 */
function renderLazyRows(container, children, { axis, estimate, overscan }) {
  const canObserve = typeof IntersectionObserver === 'function';
  const pending = new Map();
  const observer = canObserve
    ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const build = pending.get(entry.target);
        if (!build) continue;
        pending.delete(entry.target);
        observer.unobserve(entry.target);
        build();
      }
      if (pending.size === 0) observer.disconnect();
    }, {
      root: null,
      rootMargin: axis === 'vertical' ? `${estimate * overscan}px 0px` : `0px ${estimate * overscan}px`,
      threshold: 0,
    })
    : null;

  // A static ForEach gives one lazy row per item, laid out by the stack.
  const rows = [];
  for (const child of children) {
    if (isDescriptor(child) && child.type === 'ForEach') rows.push(...child.children);
    else rows.push(child);
  }

  rows.forEach((child, index) => {
    if (!(child instanceof View) && !isDescriptor(child)) return;
    // A reactive ForEach (For) or Show manages its own rows: render it in
    // place (display: contents keeps its rows in the stack's layout).
    if (isDescriptor(child) && (child.type === 'For' || child.type === 'Show')) {
      const rendered = renderAny(child);
      if (rendered) container.appendChild(rendered);
      return;
    }
    const wrapper = document.createElement('div');
    wrapper.dataset.lazyIndex = String(index);
    const slot = createOwnedSlot();
    const build = () => {
      if (slot.isDisposed()) return;
      const rendered = slot.render(() => renderAny(child));
      if (rendered) wrapper.appendChild(rendered);
      wrapper.dataset.lazyRendered = '';
      // The placeholder size was only an estimate.
      if (axis === 'vertical') wrapper.style.minHeight = '';
      else wrapper.style.minWidth = '';
    };
    if (axis === 'vertical') wrapper.style.minHeight = `${estimate}px`;
    else {
      wrapper.style.minWidth = `${estimate}px`;
      wrapper.style.flexShrink = '0';
    }
    container.appendChild(wrapper);
    if (observer) {
      pending.set(wrapper, build);
      observer.observe(wrapper);
    } else {
      build();
    }
  });

  container._lazyObserver = observer;
  if (observer && getOwner()) onCleanup(() => observer.disconnect());
}

// A child that is a legacy View or a view descriptor.
function renderAny(child) {
  return isDescriptor(child) ? renderDescriptor(child) : child._render();
}
import { Alignment } from '../Alignment.js';

/**
 * LazyVStack - A vertically stacked view that creates items lazily
 */
export class LazyVStackView extends View {
  constructor(options = {}, ...children) {
    super();

    // Handle case where first arg is a child
    if (options instanceof View || isDescriptor(options) || Array.isArray(options)) {
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

    renderLazyRows(container, this._children, { axis: 'vertical', estimate: this._itemHeight, overscan: this._overscan });

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
    if (options instanceof View || isDescriptor(options) || Array.isArray(options)) {
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

    renderLazyRows(container, this._children, { axis: 'horizontal', estimate: this._itemWidth, overscan: this._overscan });

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
