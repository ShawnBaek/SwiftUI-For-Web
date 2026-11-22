/**
 * TabView - A view that switches between multiple child views using tabs
 *
 * Matches SwiftUI's TabView for tab-based navigation.
 *
 * @example
 * TabView($selection,
 *   HomeView()
 *     .tabItem(() => Label('Home', { systemImage: 'house' }))
 *     .tag('home'),
 *
 *   SearchView()
 *     .tabItem(() => Label('Search', { systemImage: 'magnifyingglass' }))
 *     .tag('search'),
 *
 *   ProfileView()
 *     .tabItem(() => Label('Profile', { systemImage: 'person' }))
 *     .tag('profile')
 * )
 */

import { nextElementId } from '../../Core/ElementID.js';
import { createDescriptor, isView, tagOf } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render } from '../../Core/Renderer.js';
import { createOwnedSlot } from '../../Core/OwnedSlot.js';
import { releaseChildren } from '../../Core/ElementPool.js';
import { createEffect, getOwner, untrack } from '../../Data/Signal.js';

/**
 * TabView style enum
 */
export const TabViewStyle = {
  automatic: 'automatic',
  page: 'page',         // Page-style (swipeable)
  tabBar: 'tabBar'      // Bottom tab bar (default)
};

const isBinding = (value) => value && typeof value === 'object' && !isView(value) && ('value' in value || 'wrappedValue' in value);

// A tab's .tag(_:) (the last wins, as in SwiftUI), or its index.
const tagAt = (tab, index) => tagOf(tab) ?? tab.props?._tag ?? index;

// A tab's .tabItem(_:) builder.
const tabItemOf = (tab) => tab.props?._tabItem ?? tab._tabItem;

/**
 * TabView($selection?, ...tabs)
 *
 * Each tab is a view with `.tabItem(() => Label(...))` and `.tag(value)`.
 * The selection binding follows clicks, and the TabView follows writes to
 * it made elsewhere.
 *
 * @returns {Object} Chainable view descriptor
 */
export function TabView(...args) {
  const selection = isBinding(args[0]) ? args.shift() : null;
  return chainable(createDescriptor('TabView', {
    selection,
    tabViewStyle: TabViewStyle.automatic,
    indexDisplayMode: 'automatic',
  }, args.flat()), ({ withProps }) => ({
    // .tabViewStyle(TabViewStyle.page, { indexDisplayMode: 'never' }) hides
    // the page dots, like SwiftUI's .page(indexDisplayMode: .never).
    tabViewStyle: (style, options = {}) => withProps({ tabViewStyle: style, indexDisplayMode: options.indexDisplayMode ?? 'automatic' }),
  }));
}

registerRenderer('TabView', (props, tabs) => {
  const { selection } = props;
  const readSelection = () => (selection ? selection.value ?? selection.wrappedValue ?? null : tabs.length ? tagAt(tabs[0], 0) : null);
  const writeSelection = (value) => {
    if (!selection) return;
    if ('value' in selection) selection.value = value;
    else selection.wrappedValue = value;
  };
  const container = document.createElement('div');
  container.dataset.view = 'tabview';
  const idBase = nextElementId('swiftui-tabview');
  // #51: WAI-ARIA tabs pattern in both styles; show(tag) updates it.
  const show = props.tabViewStyle === TabViewStyle.page
    ? renderPages(container, props, tabs, idBase, writeSelection)
    : renderTabBar(container, tabs, idBase, writeSelection);
  show(untrack(readSelection));
  // Follow writes to the selection made elsewhere.
  if (selection && getOwner()) createEffect(() => { const tag = readSelection(); untrack(() => show(tag)); });
  return container;
});

// Bottom tab bar (iOS style). Returns show(tag).
function renderTabBar(container, tabs, idBase, writeSelection) {
  // Tab content is replaced later from click handlers, where there is no
  // current owner. The slot keeps each tab's effects owned and disposes them
  // on every switch and when the app unmounts.
  const contentSlot = createOwnedSlot();
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';

  const contentArea = document.createElement('div');
  contentArea.dataset.tabviewPart = 'content';
  contentArea.style.flex = '1';
  contentArea.style.overflow = 'auto';
  contentArea.style.position = 'relative';

  // The tab bar is a tablist, each button a tab with aria-selected and a
  // roving tabindex, and the content area a tabpanel labelled by the
  // selected tab.
  const tabBar = document.createElement('div');
  tabBar.dataset.tabviewPart = 'tabbar';
  contentArea.id = `${idBase}-panel`;
  contentArea.setAttribute('role', 'tabpanel');
  tabBar.setAttribute('role', 'tablist');
  tabBar.addEventListener('keydown', (e) => {
    const buttons = Array.from(tabBar.children);
    const current = buttons.indexOf(document.activeElement);
    if (current < 0 || buttons.length === 0) return;
    let next = -1;
    if (e.key === 'ArrowRight') next = (current + 1) % buttons.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    if (next < 0) return;
    e.preventDefault();
    buttons[next].focus();
    buttons[next].click();
  });
  Object.assign(tabBar.style, {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '8px 0 20px 0', // Extra bottom padding for the safe area
    backgroundColor: 'rgba(249, 249, 249, 0.94)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(60, 60, 67, 0.1)',
  });

  const buttons = tabs.map((tab, index) => {
    const tag = tagAt(tab, index);
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `${idBase}-tab-${index}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', contentArea.id);
    Object.assign(button.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 20px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      transition: 'opacity 0.2s ease',
    });
    const item = tabItemOf(tab)?.();
    if (isView(item)) {
      const rendered = render(item);
      rendered.style.color = 'inherit';
      rendered.style.fontSize = '10px';
      button.appendChild(rendered);
    } else {
      const fallback = document.createElement('span');
      fallback.textContent = `Tab ${index + 1}`;
      fallback.style.fontSize = '10px';
      button.appendChild(fallback);
    }
    button.addEventListener('click', () => {
      writeSelection(tag);
      show(tag);
    });
    tabBar.appendChild(button);
    return button;
  });

  container.appendChild(contentArea);
  container.appendChild(tabBar);

  let shown;
  const show = (selected) => {
    if (selected === shown || contentSlot.isDisposed()) return;
    shown = selected;
    // Dispose the previous tab's effects, then release its elements to the
    // pool (handlers and lifecycle callbacks included).
    contentSlot.clear();
    releaseChildren(contentArea);
    const index = tabs.findIndex((tab, i) => tagAt(tab, i) === selected);
    const rendered = contentSlot.render(() => (index >= 0 ? render(tabs[index]) : null));
    if (rendered) {
      rendered.style.height = '100%';
      contentArea.appendChild(rendered);
    }
    buttons.forEach((button, i) => {
      const isSelected = i === index;
      button.style.color = isSelected ? 'rgba(0, 122, 255, 1)' : 'rgba(153, 153, 153, 1)';
      button.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      button.tabIndex = isSelected ? 0 : -1;
      if (isSelected) contentArea.setAttribute('aria-labelledby', button.id);
    });
    // With no tab selected, the first tab keeps the tablist reachable by Tab.
    if (index < 0 && buttons.length) buttons[0].tabIndex = 0;
  };
  return show;
}

// Page style (swipeable pages). Returns show(tag).
function renderPages(container, props, tabs, idBase, writeSelection) {
  container.dataset.style = 'page';
  container.style.position = 'relative';
  container.style.height = '100%';
  container.style.overflow = 'hidden';

  const pagesContainer = document.createElement('div');
  pagesContainer.style.display = 'flex';
  pagesContainer.style.height = '100%';
  pagesContainer.style.transition = 'transform 0.3s ease';
  pagesContainer.style.willChange = 'transform';

  // The page indicator is a tablist. Each dot is a tab that controls its
  // page (a tabpanel). Off-screen pages are inert and hidden from assistive
  // technology, so Tab never lands on content you can't see. With the
  // indicator hidden there are no tabs, so the pages are plain regions
  // (still inert when off-screen).
  const count = tabs.length;
  const showsIndicator = props.indexDisplayMode !== 'never';
  let selectedIndex = 0;

  const pages = tabs.map((tab, index) => {
    const page = document.createElement('div');
    page.id = `${idBase}-panel-${index}`;
    if (showsIndicator) page.setAttribute('role', 'tabpanel');
    page.style.flexShrink = '0';
    page.style.width = '100%';
    page.style.height = '100%';
    page.style.overflow = 'auto';
    page.appendChild(render(tab));
    pagesContainer.appendChild(page);
    return page;
  });

  const pageIndicator = document.createElement('div');
  pageIndicator.dataset.tabviewPart = 'pageindicator';
  pageIndicator.setAttribute('role', 'tablist');
  pageIndicator.setAttribute('aria-label', 'Pages');
  Object.assign(pageIndicator.style, {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px',
  });

  const showIndex = (index) => {
    selectedIndex = index;
    pagesContainer.style.transform = `translateX(-${index * 100}%)`;
    pages.forEach((page, i) => {
      const hidden = i !== index;
      page.inert = hidden;
      if (hidden) page.setAttribute('aria-hidden', 'true');
      else page.removeAttribute('aria-hidden');
    });
    dots.forEach((dot, i) => {
      const selected = i === index;
      dot.setAttribute('aria-selected', selected ? 'true' : 'false');
      dot.tabIndex = selected ? 0 : -1;
      dot.style.backgroundColor = selected ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.3)';
    });
  };

  const goTo = (index) => {
    showIndex(index);
    writeSelection(tagAt(tabs[index], index));
  };

  const dots = tabs.map((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.id = `${idBase}-tab-${index}`;
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-controls', pages[index].id);
    dot.setAttribute('aria-label', `Page ${index + 1} of ${count}`);
    if (showsIndicator) pages[index].setAttribute('aria-labelledby', dot.id);
    Object.assign(dot.style, {
      width: '8px',
      height: '8px',
      padding: '0',
      border: 'none',
      borderRadius: '50%',
      transition: 'background-color 0.2s ease',
      cursor: 'pointer',
    });
    dot.addEventListener('click', () => goTo(index));
    pageIndicator.appendChild(dot);
    return dot;
  });

  pageIndicator.addEventListener('keydown', (e) => {
    if (count === 0) return;
    const current = dots.indexOf(document.activeElement);
    const from = current < 0 ? selectedIndex : current;
    let next = -1;
    if (e.key === 'ArrowRight') next = (from + 1) % count;
    else if (e.key === 'ArrowLeft') next = (from - 1 + count) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    if (next < 0) return;
    e.preventDefault();
    goTo(next);
    dots[next].focus();
  });

  container.appendChild(pagesContainer);
  if (showsIndicator) container.appendChild(pageIndicator);

  // Swipe between pages.
  let touchStartX = 0;
  container.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  container.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) <= 50) return;
    if (diff > 0 && selectedIndex < count - 1) goTo(selectedIndex + 1);
    else if (diff < 0 && selectedIndex > 0) goTo(selectedIndex - 1);
  });

  return (tag) => {
    if (count === 0) return;
    const index = tabs.findIndex((tab, i) => tagAt(tab, i) === tag);
    showIndex(index < 0 ? 0 : index);
  };
}

export default TabView;
