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

import { View } from '../../Core/View.js';
import { Color } from '../../Graphic/Color.js';
import { VIEW_DESCRIPTOR, ModifierType } from '../../Core/ViewDescriptor.js';
import { render as renderDescriptor } from '../../Core/Renderer.js';
import { createOwnedSlot } from '../../Core/OwnedSlot.js';
import { releaseChildren } from '../../Core/ElementPool.js';

/**
 * Helper to check if something is a descriptor
 */
function isDescriptor(obj) {
  return obj && obj.$$typeof === VIEW_DESCRIPTOR;
}

/**
 * Helper to get tabItem from view or descriptor
 */
function getTabItem(tab) {
  if (isDescriptor(tab)) {
    return tab.props._tabItem;
  }
  return tab._tabItem;
}

/**
 * Helper to get tag from view or descriptor
 */
function getTag(tab, index) {
  if (isDescriptor(tab)) {
    // The last .tag(_:) modifier wins, as in SwiftUI (#48); props._tag is the
    // older descriptor form.
    for (let i = tab.modifiers.length - 1; i >= 0; i--) {
      if (tab.modifiers[i].type === ModifierType.TAG) return tab.modifiers[i].value;
    }
    return tab.props._tag ?? index;
  }
  return tab._tag ?? index;
}

/**
 * Helper to render a view or descriptor
 */
function renderTab(tab) {
  if (isDescriptor(tab)) {
    return renderDescriptor(tab);
  }
  return tab._render();
}

/**
 * TabView style enum
 */
export const TabViewStyle = {
  automatic: 'automatic',
  page: 'page',         // Page-style (swipeable)
  tabBar: 'tabBar'      // Bottom tab bar (default)
};

let tabViewCount = 0;
/**
 * Give the first tab the Tab stop when no tab is selected (#51), so the
 * tablist stays reachable from the keyboard.
 */
function ensureTabStop(tabList) {
  const tabs = Array.from(tabList.children);
  if (tabs.length > 0 && !tabs.some((tab) => tab.tabIndex === 0)) tabs[0].tabIndex = 0;
}

function nextTabViewId() {
  tabViewCount += 1;
  return `swiftui-tabview-${tabViewCount}`;
}

/**
 * TabView view class
 */
export class TabViewView extends View {
  constructor(selectionOrChildren, ...children) {
    super();

    this._selection = null;
    this._tabs = [];
    this._tabViewStyle = TabViewStyle.automatic;
    this._pageIndicatorVisibility = 'automatic';

    // Parse arguments
    if (selectionOrChildren && ('value' in selectionOrChildren || 'wrappedValue' in selectionOrChildren)) {
      // TabView($selection, tab1, tab2, ...)
      this._selection = selectionOrChildren;
      this._tabs = children.flat();
    } else if (selectionOrChildren instanceof View) {
      // TabView(tab1, tab2, ...)
      this._tabs = [selectionOrChildren, ...children].flat();
    } else if (Array.isArray(selectionOrChildren)) {
      this._tabs = selectionOrChildren.flat();
    }
  }

  /**
   * Set the tab view style
   * @param {string} style - TabViewStyle value
   * @returns {TabViewView} Returns this for chaining
   */
  tabViewStyle(style) {
    this._tabViewStyle = style;
    return this;
  }

  /**
   * Get current selection
   * @private
   */
  _getSelection() {
    if (this._selection) {
      return this._selection.value ?? this._selection.wrappedValue ?? null;
    }
    // Default to first tab's tag
    if (this._tabs.length > 0) {
      return getTag(this._tabs[0], 0);
    }
    return null;
  }

  /**
   * Set selection
   * @private
   */
  _setSelection(value) {
    if (this._selection) {
      if ('value' in this._selection) {
        this._selection.value = value;
      } else if ('wrappedValue' in this._selection) {
        this._selection.wrappedValue = value;
      }
    }
  }

  _render() {
    if (this._tabViewStyle === TabViewStyle.page) {
      return this._renderPageStyle();
    }
    return this._renderTabBar();
  }

  /**
   * Render as tab bar (iOS style bottom tabs)
   * @private
   */
  _renderTabBar() {
    // Tab content is replaced later from click handlers, where there is no
    // current owner. The slot keeps each tab's effects owned and disposes them
    // on every switch and when the app unmounts.
    const contentSlot = createOwnedSlot();
    const container = document.createElement('div');
    container.dataset.view = 'tabview';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';

    // Content area
    const contentArea = document.createElement('div');
    contentArea.dataset.tabviewPart = 'content';
    contentArea.style.flex = '1';
    contentArea.style.overflow = 'auto';
    contentArea.style.position = 'relative';

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.dataset.tabviewPart = 'tabbar';

    // #51: WAI-ARIA tabs pattern. The tab bar is a tablist, each button a tab
    // with aria-selected and roving tabindex, and the content area a tabpanel
    // labelled by the selected tab.
    const tabIdBase = nextTabViewId();
    contentArea.id = `${tabIdBase}-panel`;
    contentArea.setAttribute('role', 'tabpanel');
    tabBar.setAttribute('role', 'tablist');
    tabBar.addEventListener('keydown', (e) => {
      const tabs = Array.from(tabBar.children);
      const current = tabs.indexOf(document.activeElement);
      if (current < 0 || tabs.length === 0) return;
      let next = -1;
      if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next < 0) return;
      e.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
    tabBar.style.display = 'flex';
    tabBar.style.justifyContent = 'space-around';
    tabBar.style.alignItems = 'center';
    tabBar.style.padding = '8px 0 20px 0'; // Extra bottom padding for safe area
    tabBar.style.backgroundColor = 'rgba(249, 249, 249, 0.94)';
    tabBar.style.backdropFilter = 'blur(20px)';
    tabBar.style.WebkitBackdropFilter = 'blur(20px)';
    tabBar.style.borderTop = '1px solid rgba(60, 60, 67, 0.1)';

    const currentSelection = this._getSelection();

    // Render tabs
    this._tabs.forEach((tab, index) => {
      const tag = getTag(tab, index);
      const isSelected = tag === currentSelection;

      // Tab button
      const tabButton = document.createElement('button');
      tabButton.type = 'button';
      tabButton.id = `${tabIdBase}-tab-${index}`;
      tabButton.setAttribute('role', 'tab');
      tabButton.setAttribute('aria-controls', contentArea.id);
      tabButton.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      tabButton.tabIndex = isSelected ? 0 : -1;
      if (isSelected) contentArea.setAttribute('aria-labelledby', tabButton.id);
      tabButton.style.display = 'flex';
      tabButton.style.flexDirection = 'column';
      tabButton.style.alignItems = 'center';
      tabButton.style.gap = '4px';
      tabButton.style.padding = '4px 20px';
      tabButton.style.border = 'none';
      tabButton.style.background = 'transparent';
      tabButton.style.cursor = 'pointer';
      tabButton.style.transition = 'opacity 0.2s ease';
      tabButton.style.color = isSelected ? 'rgba(0, 122, 255, 1)' : 'rgba(153, 153, 153, 1)';

      // Render tab item content
      const tabItemBuilder = getTabItem(tab);
      if (tabItemBuilder) {
        const tabItemView = tabItemBuilder();
        if (tabItemView instanceof View) {
          const rendered = tabItemView._render();
          rendered.style.color = 'inherit';
          rendered.style.fontSize = '10px';
          tabButton.appendChild(rendered);
        } else if (isDescriptor(tabItemView)) {
          const rendered = renderDescriptor(tabItemView);
          rendered.style.color = 'inherit';
          rendered.style.fontSize = '10px';
          tabButton.appendChild(rendered);
        }
      } else {
        const defaultLabel = document.createElement('span');
        defaultLabel.textContent = `Tab ${index + 1}`;
        defaultLabel.style.fontSize = '10px';
        tabButton.appendChild(defaultLabel);
      }

      tabButton.addEventListener('click', () => {
        this._setSelection(tag);
        this._updateTabView(contentSlot, contentArea, tabBar, tag);
      });

      tabBar.appendChild(tabButton);

      // Show content for selected tab
      if (isSelected) {
        const rendered = contentSlot.render(() => renderTab(tab));
        if (rendered) {
          rendered.style.height = '100%';
          contentArea.appendChild(rendered);
        }
      }
    });

    // With no tab matching the selection, keep the tablist reachable by Tab.
    ensureTabStop(tabBar);

    container.appendChild(contentArea);
    container.appendChild(tabBar);

    return this._applyModifiers(container);
  }

  /**
   * Update tab view when selection changes
   * @private
   */
  _updateTabView(contentSlot, contentArea, tabBar, newSelection) {
    if (contentSlot.isDisposed()) return;

    // Update content: dispose the previous tab's effects, then release its
    // elements to the pool (handlers and lifecycle callbacks included).
    contentSlot.clear();
    releaseChildren(contentArea);
    const selectedTab = this._tabs.find((tab, index) => getTag(tab, index) === newSelection);
    if (selectedTab) {
      const rendered = contentSlot.render(() => renderTab(selectedTab));
      if (rendered) {
        rendered.style.height = '100%';
        contentArea.appendChild(rendered);
      }
    } else {
      contentSlot.render(() => null);
    }

    // Update tab bar colors
    Array.from(tabBar.children).forEach((tabButton, index) => {
      const tag = this._tabs[index] ? getTag(this._tabs[index], index) : index;
      const isSelected = tag === newSelection;
      tabButton.style.color = isSelected ? 'rgba(0, 122, 255, 1)' : 'rgba(153, 153, 153, 1)';
      tabButton.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      tabButton.tabIndex = isSelected ? 0 : -1;
      if (isSelected && tabButton.id) contentArea.setAttribute('aria-labelledby', tabButton.id);
    });
    ensureTabStop(tabBar);
  }

  /**
   * Render as page style (swipeable pages)
   * @private
   */
  _renderPageStyle() {
    const container = document.createElement('div');
    container.dataset.view = 'tabview';
    container.dataset.style = 'page';
    container.style.position = 'relative';
    container.style.height = '100%';
    container.style.overflow = 'hidden';

    // Pages container
    const pagesContainer = document.createElement('div');
    pagesContainer.style.display = 'flex';
    pagesContainer.style.height = '100%';
    pagesContainer.style.transition = 'transform 0.3s ease';
    pagesContainer.style.willChange = 'transform';

    // #51: the page indicator is a WAI-ARIA tablist. Each dot is a tab that
    // controls its page (a tabpanel). Off-screen pages are inert and hidden
    // from assistive technology, so Tab never lands on content you can't see.
    const tabIdBase = nextTabViewId();
    const count = this._tabs.length;
    // With the indicator hidden there are no tabs, so the pages are plain
    // regions (still inert when off-screen).
    const showsIndicator = this._pageIndicatorVisibility !== 'never';
    const currentSelection = this._getSelection();
    let selectedIndex = this._tabs.findIndex((tab, index) => getTag(tab, index) === currentSelection);
    if (selectedIndex === -1) selectedIndex = 0;

    const pages = this._tabs.map((tab, index) => {
      const page = document.createElement('div');
      page.id = `${tabIdBase}-panel-${index}`;
      if (showsIndicator) page.setAttribute('role', 'tabpanel');
      page.style.flexShrink = '0';
      page.style.width = '100%';
      page.style.height = '100%';
      page.style.overflow = 'auto';
      const rendered = renderTab(tab);
      if (rendered) page.appendChild(rendered);
      pagesContainer.appendChild(page);
      return page;
    });

    const pageIndicator = document.createElement('div');
    pageIndicator.dataset.tabviewPart = 'pageindicator';
    pageIndicator.setAttribute('role', 'tablist');
    pageIndicator.setAttribute('aria-label', 'Pages');
    pageIndicator.style.position = 'absolute';
    pageIndicator.style.bottom = '20px';
    pageIndicator.style.left = '50%';
    pageIndicator.style.transform = 'translateX(-50%)';
    pageIndicator.style.display = 'flex';
    pageIndicator.style.gap = '8px';

    const dots = this._tabs.map((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.id = `${tabIdBase}-tab-${index}`;
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-controls', pages[index].id);
      dot.setAttribute('aria-label', `Page ${index + 1} of ${count}`);
      if (showsIndicator) pages[index].setAttribute('aria-labelledby', dot.id);
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.padding = '0';
      dot.style.border = 'none';
      dot.style.borderRadius = '50%';
      dot.style.transition = 'background-color 0.2s ease';
      dot.style.cursor = 'pointer';
      dot.addEventListener('click', () => goTo(index));
      pageIndicator.appendChild(dot);
      return dot;
    });

    const show = (index) => {
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
      selectedIndex = index;
      this._setSelection(getTag(this._tabs[index], index));
      show(index);
    };

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

    if (count > 0) show(selectedIndex);

    container.appendChild(pagesContainer);
    if (showsIndicator) container.appendChild(pageIndicator);

    // Touch handling for swiping
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

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for TabView
 */
export function TabView(selectionOrChildren, ...children) {
  return new TabViewView(selectionOrChildren, ...children);
}

// Add tabItem method to View class
View.prototype.tabItem = function (builder) {
  this._tabItem = builder;
  return this;
};

export default TabView;
