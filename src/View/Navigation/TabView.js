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

/**
 * TabView style enum
 */
export const TabViewStyle = {
  automatic: 'automatic',
  page: 'page',         // Page-style (swipeable)
  tabBar: 'tabBar'      // Bottom tab bar (default)
};

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
      return this._tabs[0]._tag ?? 0;
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
      const tag = tab._tag ?? index;
      const isSelected = tag === currentSelection;

      // Tab button
      const tabButton = document.createElement('button');
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
      if (tab._tabItem) {
        const tabItemView = tab._tabItem();
        if (tabItemView instanceof View) {
          const rendered = tabItemView._render();
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
        this._updateTabView(container, contentArea, tabBar, tag);
      });

      tabBar.appendChild(tabButton);

      // Show content for selected tab
      if (isSelected) {
        const rendered = tab._render();
        rendered.style.height = '100%';
        contentArea.appendChild(rendered);
      }
    });

    container.appendChild(contentArea);
    container.appendChild(tabBar);

    return this._applyModifiers(container);
  }

  /**
   * Update tab view when selection changes
   * @private
   */
  _updateTabView(container, contentArea, tabBar, newSelection) {
    // Update content
    contentArea.innerHTML = '';
    const selectedTab = this._tabs.find((tab, index) => (tab._tag ?? index) === newSelection);
    if (selectedTab) {
      const rendered = selectedTab._render();
      rendered.style.height = '100%';
      contentArea.appendChild(rendered);
    }

    // Update tab bar colors
    Array.from(tabBar.children).forEach((tabButton, index) => {
      const tag = this._tabs[index]?._tag ?? index;
      const isSelected = tag === newSelection;
      tabButton.style.color = isSelected ? 'rgba(0, 122, 255, 1)' : 'rgba(153, 153, 153, 1)';
    });
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

    const currentSelection = this._getSelection();
    let selectedIndex = 0;

    this._tabs.forEach((tab, index) => {
      const tag = tab._tag ?? index;
      if (tag === currentSelection) {
        selectedIndex = index;
      }

      const page = document.createElement('div');
      page.style.flexShrink = '0';
      page.style.width = '100%';
      page.style.height = '100%';
      page.style.overflow = 'auto';
      page.appendChild(tab._render());
      pagesContainer.appendChild(page);
    });

    // Set initial position
    pagesContainer.style.transform = `translateX(-${selectedIndex * 100}%)`;

    // Page indicator dots
    const pageIndicator = document.createElement('div');
    pageIndicator.style.position = 'absolute';
    pageIndicator.style.bottom = '20px';
    pageIndicator.style.left = '50%';
    pageIndicator.style.transform = 'translateX(-50%)';
    pageIndicator.style.display = 'flex';
    pageIndicator.style.gap = '8px';

    this._tabs.forEach((_, index) => {
      const dot = document.createElement('div');
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = index === selectedIndex
        ? 'rgba(0, 0, 0, 0.8)'
        : 'rgba(0, 0, 0, 0.3)';
      dot.style.transition = 'background-color 0.2s ease';
      dot.style.cursor = 'pointer';

      dot.addEventListener('click', () => {
        const tag = this._tabs[index]._tag ?? index;
        this._setSelection(tag);
        pagesContainer.style.transform = `translateX(-${index * 100}%)`;

        // Update dots
        Array.from(pageIndicator.children).forEach((d, i) => {
          d.style.backgroundColor = i === index
            ? 'rgba(0, 0, 0, 0.8)'
            : 'rgba(0, 0, 0, 0.3)';
        });
      });

      pageIndicator.appendChild(dot);
    });

    container.appendChild(pagesContainer);
    if (this._pageIndicatorVisibility !== 'never') {
      container.appendChild(pageIndicator);
    }

    // Touch handling for swiping
    let touchStartX = 0;
    let touchEndX = 0;

    container.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    });

    container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > 50) {
        const currentIdx = this._tabs.findIndex((tab, i) =>
          (tab._tag ?? i) === this._getSelection()
        );

        let newIndex;
        if (diff > 0 && currentIdx < this._tabs.length - 1) {
          newIndex = currentIdx + 1;
        } else if (diff < 0 && currentIdx > 0) {
          newIndex = currentIdx - 1;
        } else {
          return;
        }

        const tag = this._tabs[newIndex]._tag ?? newIndex;
        this._setSelection(tag);
        pagesContainer.style.transform = `translateX(-${newIndex * 100}%)`;

        // Update dots
        Array.from(pageIndicator.children).forEach((d, i) => {
          d.style.backgroundColor = i === newIndex
            ? 'rgba(0, 0, 0, 0.8)'
            : 'rgba(0, 0, 0, 0.3)';
        });
      }
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
