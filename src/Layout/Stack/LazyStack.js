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

import { createDescriptor, isDescriptor, isView } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { createOwnedSlot } from '../../Core/OwnedSlot.js';
import { getOwner, onCleanup } from '../../Data/Signal.js';
import { registerRenderer, render as renderAny } from '../../Core/Renderer.js';
import { Alignment } from '../Alignment.js';

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
  let observer = null;
  let disposed = false;
  const onEntries = (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const build = pending.get(entry.target);
      if (!build) continue;
      pending.delete(entry.target);
      observer.unobserve(entry.target);
      build();
    }
    if (pending.size === 0) observer.disconnect();
  };
  // The scrolling ancestor the rows scroll in (a ScrollView), so overscan
  // applies to it; the viewport when there is none.
  const scrollRoot = () => {
    for (let node = container.parentElement; node; node = node.parentElement) {
      const style = typeof getComputedStyle === 'function' ? getComputedStyle(node) : node.style;
      const overflow = axis === 'vertical' ? style.overflowY : style.overflowX;
      if (overflow === 'auto' || overflow === 'scroll') return node;
    }
    return null;
  };
  const observe = (root) => {
    observer?.disconnect();
    observer = new IntersectionObserver(onEntries, {
      root,
      rootMargin: axis === 'vertical' ? `${estimate * overscan}px 0px` : `0px ${estimate * overscan}px`,
      threshold: 0,
    });
    for (const wrapper of pending.keys()) observer.observe(wrapper);
    container._lazyObserver = observer;
  };

  // A static ForEach gives one lazy row per item, laid out by the stack.
  const rows = [];
  for (const child of children) {
    // (A ForEach with modifiers of its own stays one row, so they apply.)
    if (isDescriptor(child) && child.type === 'ForEach' && child.modifiers.length === 0) rows.push(...child.children);
    else rows.push(child);
  }

  rows.forEach((child, index) => {
    if (!isView(child)) return;
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
    if (canObserve) pending.set(wrapper, build);
    else build();
  });

  if (canObserve && pending.size) {
    // Observe against the viewport now; once the stack is attached, switch
    // to its scrolling ancestor if it has one.
    observe(null);
    queueMicrotask(() => {
      if (disposed || pending.size === 0 || !container.isConnected) return;
      const root = scrollRoot();
      if (root) observe(root);
    });
  }
  if (getOwner()) {
    onCleanup(() => {
      disposed = true;
      observer?.disconnect();
    });
  }
}

// LazyVStack/LazyHStack(options?, ...content). Options: alignment,
// spacing, pinnedViews, and the placeholder size (itemHeight/itemWidth)
// and overscan in rows.
function lazyStack(type, options, children, estimateKey, estimate, overscan) {
  if (isView(options) || Array.isArray(options) || options == null) {
    children = [options, ...children];
    options = {};
  }
  return chainable(createDescriptor(type, {
    alignment: options.alignment ?? Alignment.center,
    spacing: options.spacing ?? 8,
    pinnedViews: options.pinnedViews ?? [],
    estimate: options[estimateKey] ?? estimate,
    overscan: options.overscan ?? overscan,
  }, children.flat()));
}

/** A vertical stack whose rows are built as they near the viewport. */
export function LazyVStack(options, ...children) {
  return lazyStack('LazyVStack', options, children, 'itemHeight', 44, 5);
}

/** A horizontal stack whose items are built as they near the viewport. */
export function LazyHStack(options, ...children) {
  return lazyStack('LazyHStack', options, children, 'itemWidth', 100, 3);
}

for (const [type, axis] of [['LazyVStack', 'vertical'], ['LazyHStack', 'horizontal']]) {
  registerRenderer(type, (props, children) => {
    const vertical = axis === 'vertical';
    const container = document.createElement('div');
    container.dataset.view = vertical ? 'lazy-v-stack' : 'lazy-h-stack';
    container.style.display = 'flex';
    container.style.flexDirection = vertical ? 'column' : 'row';
    container.style.gap = `${props.spacing}px`;
    // A VStack aligns horizontally (leading/trailing), an HStack vertically.
    const align = vertical ? { leading: 'flex-start', trailing: 'flex-end' } : { top: 'flex-start', bottom: 'flex-end' };
    container.style.alignItems = align[props.alignment] ?? 'center';
    container.style[vertical ? 'minHeight' : 'minWidth'] = '0';
    renderLazyRows(container, children, { axis, estimate: props.estimate, overscan: props.overscan });
    return container;
  });
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
