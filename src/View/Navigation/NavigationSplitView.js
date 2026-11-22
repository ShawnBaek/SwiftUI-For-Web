/**
 * NavigationSplitView - Adaptive multi-column navigation
 *
 * Matches SwiftUI's NavigationSplitView behavior:
 * - On compact width (mobile): Collapses to NavigationStack-style navigation
 * - On regular width (tablet): Shows 2-column layout (sidebar + detail)
 * - On wide screens (desktop): Can show 3-column layout (sidebar + content + detail)
 *
 * @example
 * // Two-column layout
 * NavigationSplitView({
 *   sidebar: () => SidebarView(),
 *   detail: () => DetailView()
 * })
 *
 * @example
 * // Three-column layout
 * NavigationSplitView({
 *   sidebar: () => SidebarView(),
 *   content: () => ContentView(),
 *   detail: () => DetailView()
 * })
 *
 * @example
 * // With column visibility control
 * NavigationSplitView({
 *   sidebar: () => SidebarView(),
 *   detail: () => DetailView(),
 *   columnVisibility: NavigationSplitViewVisibility.doubleColumn
 * })
 */

import { createDescriptor, isView } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render } from '../../Core/Renderer.js';
import { createOwnedSlot } from '../../Core/OwnedSlot.js';
import { releaseChildren } from '../../Core/ElementPool.js';
import { getOwner, onCleanup } from '../../Data/Signal.js';
import { Environment, EnvironmentValues, UserInterfaceSizeClass } from '../../Data/Environment.js';

/**
 * Column visibility options (matches SwiftUI)
 */
export const NavigationSplitViewVisibility = {
  /** Show all columns (three-column mode) */
  all: 'all',
  /** Show sidebar and detail only (two-column mode) */
  doubleColumn: 'doubleColumn',
  /** Show only detail column */
  detailOnly: 'detailOnly',
  /** Automatic based on available space */
  automatic: 'automatic'
};

/**
 * NavigationSplitView({ sidebar, content?, detail, columnVisibility?,
 * sidebarWidth?, contentWidth? })
 *
 * The sidebar builder receives a navigation context: `navigate(view)` shows
 * a view in the detail column (or slides to it in compact width) and
 * `setSelectedItem(item)` records the selection.
 *
 * @returns {Object} Chainable view descriptor
 */
export function NavigationSplitView(options) {
  return chainable(createDescriptor('NavigationSplitView', {
    sidebar: options.sidebar ?? null,
    content: options.content ?? null,
    detail: options.detail ?? null,
    columnVisibility: options.columnVisibility ?? NavigationSplitViewVisibility.automatic,
    sidebarWidth: { min: 200, ideal: 250, max: 320, ...options.sidebarWidth },
    contentWidth: { min: 250, ideal: 300, max: 400, ...options.contentWidth },
  }));
}

const FILL = 'width: 100%; height: 100%;';

function box(css, name) {
  const el = document.createElement('div');
  if (name) el.dataset.column = name;
  el.style.cssText = css;
  return el;
}

registerRenderer('NavigationSplitView', (props) => {
  const visibility = props.columnVisibility;
  const root = box(`${FILL} overflow: hidden;`);
  root.dataset.view = 'NavigationSplitView';

  // The layout is rebuilt when the width class changes and the detail is
  // replaced on navigation, both from callbacks with no current owner; the
  // slots keep their effects owned and dispose the content they replace.
  const layoutSlot = createOwnedSlot();
  const detailSlot = createOwnedSlot();
  let detailHost = null;
  let slide = null; // compact width: slide(toDetail)
  let selectedItem = null;

  // compact: one column at a time (stack navigation); regular: sidebar and
  // detail; wide (1200px and a content builder): all three.
  const layoutMode = () => {
    if (Environment.get(EnvironmentValues.horizontalSizeClass) === UserInterfaceSizeClass.compact) return 'compact';
    return window.innerWidth >= 1200 && props.content ? 'wide' : 'regular';
  };

  const showDetail = (view) => {
    detailSlot.clear();
    releaseChildren(detailHost);
    const node = detailSlot.render(() => (isView(view) ? render(view) : null));
    if (node) detailHost.appendChild(node);
  };

  const context = () => ({
    navigate: (view) => {
      if (!detailHost || !isView(view)) return;
      slide?.(true);
      showDetail(view);
    },
    setSelectedItem: (item) => { selectedItem = item; },
    selectedItem,
  });

  const fill = (host, view) => {
    if (isView(view)) host.appendChild(render(view));
    return host;
  };

  const buildLayout = (mode) => {
    const layout = document.createElement('div');
    layout.dataset.layout = mode;
    if (mode === 'compact') {
      layout.style.cssText = `${FILL} position: relative; overflow: hidden;`;
      const pane = (transform) => box(`${FILL} position: absolute; top: 0; left: 0;${transform} transition: transform 0.3s ease; background: var(--background, white);`);
      const sidebar = fill(pane(''), props.sidebar?.(context()));
      const detail = pane(' transform: translateX(100%);');
      const back = document.createElement('button');
      back.textContent = '‹ Back';
      back.style.cssText = 'position: absolute; top: 12px; left: 12px; z-index: 10; background: transparent; border: none; font-size: 17px; color: var(--primary, #007AFF); cursor: pointer; padding: 8px;';
      back.addEventListener('click', () => slide(false));
      detail.appendChild(back);
      detailHost = box(`${FILL} padding-top: 44px;`);
      detail.appendChild(detailHost);
      slide = (toDetail) => {
        sidebar.style.transform = toDetail ? 'translateX(-30%)' : 'translateX(0)';
        detail.style.transform = toDetail ? 'translateX(0)' : 'translateX(100%)';
      };
      layout.appendChild(sidebar);
      layout.appendChild(detail);
    } else {
      layout.style.cssText = `display: flex; ${FILL} overflow: hidden;`;
      slide = null;
      const side = (name, width, background, view) => layout.appendChild(fill(box(
        `width: ${width.ideal}px; min-width: ${width.min}px; max-width: ${width.max}px; height: 100%; border-right: 1px solid var(--border, #E5E5E5); background: ${background}; overflow-y: auto; flex-shrink: 0;`,
        name
      ), view));
      if (visibility !== NavigationSplitViewVisibility.detailOnly) {
        side('sidebar', props.sidebarWidth, 'var(--background-secondary, #F7F7F7)', props.sidebar?.(context()));
        if (mode === 'wide' && visibility !== NavigationSplitViewVisibility.doubleColumn) {
          side('content', props.contentWidth, 'var(--background, white)', props.content());
        }
      }
      detailHost = layout.appendChild(box('flex: 1; height: 100%; overflow-y: auto; background: var(--background, white);', 'detail'));
    }
    showDetail(props.detail?.());
    return layout;
  };

  let mode = null;
  const update = () => {
    const next = layoutMode();
    if (next === mode || layoutSlot.isDisposed()) return;
    mode = next;
    detailSlot.clear();
    layoutSlot.clear();
    releaseChildren(root);
    const layout = layoutSlot.render(() => buildLayout(next));
    if (layout) root.appendChild(layout);
  };
  update();

  const unsubscribe = Environment.subscribe(EnvironmentValues.horizontalSizeClass, update);
  window.addEventListener('resize', update);
  if (getOwner()) {
    onCleanup(() => {
      unsubscribe();
      window.removeEventListener('resize', update);
    });
  }

  return root;
});

export default NavigationSplitView;
