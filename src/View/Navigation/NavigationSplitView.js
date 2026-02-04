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

import { View } from '../../Core/View.js';
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
 * NavigationSplitView column widths
 */
const ColumnWidths = {
  sidebar: {
    min: 200,
    ideal: 250,
    max: 320
  },
  content: {
    min: 250,
    ideal: 300,
    max: 400
  }
};

class NavigationSplitViewClass extends View {
  /**
   * Create a NavigationSplitView
   * @param {Object} options - Configuration options
   * @param {Function} options.sidebar - Sidebar view builder
   * @param {Function} [options.content] - Content view builder (for 3-column)
   * @param {Function} options.detail - Detail view builder
   * @param {string} [options.columnVisibility='automatic'] - Column visibility
   * @param {Object} [options.sidebarWidth] - Sidebar width constraints
   * @param {Object} [options.contentWidth] - Content width constraints
   */
  constructor(options) {
    super();

    this.sidebarBuilder = options.sidebar;
    this.contentBuilder = options.content ?? null;
    this.detailBuilder = options.detail;
    this.columnVisibility = options.columnVisibility ?? NavigationSplitViewVisibility.automatic;
    this.sidebarWidth = { ...ColumnWidths.sidebar, ...options.sidebarWidth };
    this.contentWidth = { ...ColumnWidths.content, ...options.contentWidth };

    this._selectedItem = null;
    this._container = null;
    this._sizeClassUnsubscribe = null;
    this._isCollapsed = false;
    this._showSidebar = true;
  }

  /**
   * Get current layout mode based on size class
   * @returns {'compact'|'regular'|'wide'} Layout mode
   * @private
   */
  _getLayoutMode() {
    const horizontalSizeClass = Environment.get(EnvironmentValues.horizontalSizeClass);
    const width = window.innerWidth;

    if (horizontalSizeClass === UserInterfaceSizeClass.compact) {
      return 'compact'; // Stack navigation (mobile)
    } else if (width >= 1200 && this.contentBuilder) {
      return 'wide'; // Three-column (desktop with content)
    } else {
      return 'regular'; // Two-column (tablet/desktop)
    }
  }

  /**
   * Check if sidebar should be visible based on column visibility setting
   * @returns {boolean}
   * @private
   */
  _shouldShowSidebar() {
    if (this.columnVisibility === NavigationSplitViewVisibility.detailOnly) {
      return false;
    }
    return true;
  }

  /**
   * Check if content column should be visible
   * @returns {boolean}
   * @private
   */
  _shouldShowContent() {
    if (!this.contentBuilder) return false;
    if (this.columnVisibility === NavigationSplitViewVisibility.detailOnly) {
      return false;
    }
    if (this.columnVisibility === NavigationSplitViewVisibility.doubleColumn) {
      return false;
    }
    return true;
  }

  /**
   * Render compact (mobile) layout - stack navigation
   * @returns {HTMLElement}
   * @private
   */
  _renderCompactLayout() {
    const container = document.createElement('div');
    container.dataset.layout = 'compact';
    container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    `;

    // In compact mode, show sidebar as main view with navigation to detail
    const sidebarWrapper = document.createElement('div');
    sidebarWrapper.style.cssText = `
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      transition: transform 0.3s ease;
      background: var(--background, white);
    `;

    if (this.sidebarBuilder) {
      const sidebarView = this.sidebarBuilder(this._createNavigationContext());
      if (sidebarView instanceof View) {
        sidebarWrapper.appendChild(sidebarView._render());
      }
    }

    // Detail view (hidden initially)
    const detailWrapper = document.createElement('div');
    detailWrapper.style.cssText = `
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      background: var(--background, white);
    `;

    // Back button for detail
    const backButton = document.createElement('button');
    backButton.innerHTML = '‹ Back';
    backButton.style.cssText = `
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 10;
      background: transparent;
      border: none;
      font-size: 17px;
      color: var(--primary, #007AFF);
      cursor: pointer;
      padding: 8px;
    `;
    backButton.addEventListener('click', () => {
      sidebarWrapper.style.transform = 'translateX(0)';
      detailWrapper.style.transform = 'translateX(100%)';
    });
    detailWrapper.appendChild(backButton);

    // Detail content
    const detailContent = document.createElement('div');
    detailContent.style.cssText = `
      width: 100%;
      height: 100%;
      padding-top: 44px;
    `;
    if (this.detailBuilder) {
      const detailView = this.detailBuilder();
      if (detailView instanceof View) {
        detailContent.appendChild(detailView._render());
      }
    }
    detailWrapper.appendChild(detailContent);

    container.appendChild(sidebarWrapper);
    container.appendChild(detailWrapper);

    // Store references for navigation
    this._sidebarWrapper = sidebarWrapper;
    this._detailWrapper = detailWrapper;

    return container;
  }

  /**
   * Render regular (tablet) layout - two columns
   * @returns {HTMLElement}
   * @private
   */
  _renderRegularLayout() {
    const container = document.createElement('div');
    container.dataset.layout = 'regular';
    container.style.cssText = `
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    `;

    // Sidebar
    if (this._shouldShowSidebar()) {
      const sidebar = document.createElement('div');
      sidebar.dataset.column = 'sidebar';
      sidebar.style.cssText = `
        width: ${this.sidebarWidth.ideal}px;
        min-width: ${this.sidebarWidth.min}px;
        max-width: ${this.sidebarWidth.max}px;
        height: 100%;
        border-right: 1px solid var(--border, #E5E5E5);
        background: var(--background-secondary, #F7F7F7);
        overflow-y: auto;
        flex-shrink: 0;
      `;

      if (this.sidebarBuilder) {
        const sidebarView = this.sidebarBuilder(this._createNavigationContext());
        if (sidebarView instanceof View) {
          sidebar.appendChild(sidebarView._render());
        }
      }
      container.appendChild(sidebar);
    }

    // Detail
    const detail = document.createElement('div');
    detail.dataset.column = 'detail';
    detail.style.cssText = `
      flex: 1;
      height: 100%;
      overflow-y: auto;
      background: var(--background, white);
    `;

    if (this.detailBuilder) {
      const detailView = this.detailBuilder();
      if (detailView instanceof View) {
        detail.appendChild(detailView._render());
      }
    }
    container.appendChild(detail);

    return container;
  }

  /**
   * Render wide (desktop) layout - three columns
   * @returns {HTMLElement}
   * @private
   */
  _renderWideLayout() {
    const container = document.createElement('div');
    container.dataset.layout = 'wide';
    container.style.cssText = `
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    `;

    // Sidebar
    if (this._shouldShowSidebar()) {
      const sidebar = document.createElement('div');
      sidebar.dataset.column = 'sidebar';
      sidebar.style.cssText = `
        width: ${this.sidebarWidth.ideal}px;
        min-width: ${this.sidebarWidth.min}px;
        max-width: ${this.sidebarWidth.max}px;
        height: 100%;
        border-right: 1px solid var(--border, #E5E5E5);
        background: var(--background-secondary, #F7F7F7);
        overflow-y: auto;
        flex-shrink: 0;
      `;

      if (this.sidebarBuilder) {
        const sidebarView = this.sidebarBuilder(this._createNavigationContext());
        if (sidebarView instanceof View) {
          sidebar.appendChild(sidebarView._render());
        }
      }
      container.appendChild(sidebar);
    }

    // Content (middle column)
    if (this._shouldShowContent() && this.contentBuilder) {
      const content = document.createElement('div');
      content.dataset.column = 'content';
      content.style.cssText = `
        width: ${this.contentWidth.ideal}px;
        min-width: ${this.contentWidth.min}px;
        max-width: ${this.contentWidth.max}px;
        height: 100%;
        border-right: 1px solid var(--border, #E5E5E5);
        background: var(--background, white);
        overflow-y: auto;
        flex-shrink: 0;
      `;

      const contentView = this.contentBuilder();
      if (contentView instanceof View) {
        content.appendChild(contentView._render());
      }
      container.appendChild(content);
    }

    // Detail
    const detail = document.createElement('div');
    detail.dataset.column = 'detail';
    detail.style.cssText = `
      flex: 1;
      height: 100%;
      overflow-y: auto;
      background: var(--background, white);
    `;

    if (this.detailBuilder) {
      const detailView = this.detailBuilder();
      if (detailView instanceof View) {
        detail.appendChild(detailView._render());
      }
    }
    container.appendChild(detail);

    return container;
  }

  /**
   * Create navigation context for sidebar items
   * @returns {Object} Navigation context
   * @private
   */
  _createNavigationContext() {
    return {
      navigate: (view) => {
        if (this._getLayoutMode() === 'compact') {
          // In compact mode, slide to detail
          if (this._sidebarWrapper && this._detailWrapper) {
            this._sidebarWrapper.style.transform = 'translateX(-30%)';
            this._detailWrapper.style.transform = 'translateX(0)';

            // Update detail content
            const detailContent = this._detailWrapper.querySelector('div:last-child');
            if (detailContent && view instanceof View) {
              detailContent.innerHTML = '';
              detailContent.appendChild(view._render());
            }
          }
        } else {
          // In regular/wide mode, update detail column
          this._updateDetail(view);
        }
      },
      setSelectedItem: (item) => {
        this._selectedItem = item;
      },
      selectedItem: this._selectedItem
    };
  }

  /**
   * Update detail column content
   * @param {View} view - New detail view
   * @private
   */
  _updateDetail(view) {
    if (!this._container) return;

    const detailColumn = this._container.querySelector('[data-column="detail"]');
    if (detailColumn && view instanceof View) {
      detailColumn.innerHTML = '';
      detailColumn.appendChild(view._render());
    }
  }

  /**
   * Handle size class changes
   * @private
   */
  _handleSizeClassChange() {
    if (!this._container) return;

    const layoutMode = this._getLayoutMode();
    const currentLayout = this._container.firstChild?.dataset?.layout;

    if (currentLayout !== layoutMode) {
      // Re-render with new layout
      this._container.innerHTML = '';
      this._container.appendChild(this._renderLayout());
    }
  }

  /**
   * Render the appropriate layout based on size class
   * @returns {HTMLElement}
   * @private
   */
  _renderLayout() {
    const layoutMode = this._getLayoutMode();

    switch (layoutMode) {
      case 'compact':
        return this._renderCompactLayout();
      case 'wide':
        return this._renderWideLayout();
      case 'regular':
      default:
        return this._renderRegularLayout();
    }
  }

  _render() {
    this._container = document.createElement('div');
    this._container.dataset.view = 'NavigationSplitView';
    this._container.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: hidden;
    `;

    // Render initial layout
    this._container.appendChild(this._renderLayout());

    // Subscribe to size class changes
    this._sizeClassUnsubscribe = Environment.subscribe(
      EnvironmentValues.horizontalSizeClass,
      () => this._handleSizeClassChange()
    );

    // Also listen for resize
    window.addEventListener('resize', () => this._handleSizeClassChange());

    return this._applyModifiers(this._container);
  }
}

/**
 * Factory function for NavigationSplitView
 * @param {Object} options - Configuration options
 * @returns {NavigationSplitViewClass}
 */
export function NavigationSplitView(options) {
  return new NavigationSplitViewClass(options);
}

export { NavigationSplitViewClass };
export default NavigationSplitView;
