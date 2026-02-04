/**
 * WindowGroup - A scene that presents a group of identically structured windows
 *
 * Matches SwiftUI's WindowGroup for defining the app's window structure.
 *
 * @example
 * const MyApp = App({
 *   body: () =>
 *     WindowGroup(
 *       ContentView()
 *     )
 * });
 *
 * MyApp.main();
 *
 * @example
 * // With title
 * WindowGroup('My App',
 *   ContentView()
 * )
 *
 * @example
 * // Multiple windows (web: tabs/windows)
 * WindowGroup({ id: 'main' },
 *   MainView()
 * )
 * WindowGroup({ id: 'settings' },
 *   SettingsView()
 * )
 */

import { View } from '../Core/View.js';

/**
 * WindowGroup - Scene container for app windows
 */
export class WindowGroupView extends View {
  constructor(...args) {
    super();

    this._title = null;
    this._id = null;
    this._content = null;
    this._defaultValue = null;

    // Parse arguments
    if (typeof args[0] === 'string') {
      // WindowGroup('Title', content)
      this._title = args[0];
      this._content = args[1];
    } else if (typeof args[0] === 'object' && !(args[0] instanceof View)) {
      // WindowGroup({ id, title }, content)
      const options = args[0];
      this._id = options.id ?? null;
      this._title = options.title ?? null;
      this._defaultValue = options.defaultValue ?? null;
      this._content = args[1];
    } else {
      // WindowGroup(content)
      this._content = args[0];
    }

    // Set document title if provided
    if (this._title && typeof document !== 'undefined') {
      document.title = this._title;
    }
  }

  /**
   * Set the window's default size
   * @param {Object} size - { width, height }
   * @returns {WindowGroupView}
   */
  defaultSize(size) {
    this._defaultSize = size;
    return this;
  }

  /**
   * Set minimum size constraints
   * @param {Object} size - { minWidth, minHeight }
   * @returns {WindowGroupView}
   */
  windowResizability(resizability) {
    this._resizability = resizability;
    return this;
  }

  /**
   * Handle new window requests
   * @param {Function} handler
   * @returns {WindowGroupView}
   */
  handlesExternalEvents(matching) {
    this._externalEventMatching = matching;
    return this;
  }

  /**
   * Set the window style
   * @param {string} style
   * @returns {WindowGroupView}
   */
  windowStyle(style) {
    this._windowStyle = style;
    return this;
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.scene = 'window-group';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    if (this._id) {
      container.dataset.windowId = this._id;
    }

    // Apply default size if specified
    if (this._defaultSize) {
      if (this._defaultSize.width) {
        container.style.width = `${this._defaultSize.width}px`;
      }
      if (this._defaultSize.height) {
        container.style.height = `${this._defaultSize.height}px`;
      }
    }

    // Render content
    if (this._content) {
      if (this._content instanceof View) {
        container.appendChild(this._content._render());
      } else if (typeof this._content === 'function') {
        const view = this._content();
        if (view instanceof View) {
          container.appendChild(view._render());
        }
      }
    }

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for WindowGroup
 */
export function WindowGroup(...args) {
  return new WindowGroupView(...args);
}

/**
 * Window resizability options
 */
export const WindowResizability = {
  automatic: 'automatic',
  contentSize: 'contentSize',
  contentMinSize: 'contentMinSize'
};

/**
 * Window style options
 */
export const WindowStyle = {
  automatic: 'automatic',
  hiddenTitleBar: 'hiddenTitleBar',
  plain: 'plain',
  titleBar: 'titleBar'
};

/**
 * Scene - Base protocol for scene types
 */
export class Scene {
  constructor() {
    this._body = null;
  }

  get body() {
    return this._body;
  }
}

/**
 * Settings scene for preferences window
 */
export class SettingsView extends View {
  constructor(content) {
    super();
    this._content = content;
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.scene = 'settings';
    container.style.padding = '20px';

    if (this._content instanceof View) {
      container.appendChild(this._content._render());
    }

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for Settings
 */
export function Settings(content) {
  return new SettingsView(content);
}

/**
 * DocumentGroup - Scene for document-based apps
 */
export class DocumentGroupView extends View {
  constructor(documentType, content) {
    super();
    this._documentType = documentType;
    this._content = content;
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.scene = 'document-group';
    container.style.width = '100%';
    container.style.height = '100%';

    if (typeof this._content === 'function') {
      // Content receives document binding
      const view = this._content({ document: null });
      if (view instanceof View) {
        container.appendChild(view._render());
      }
    }

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for DocumentGroup
 */
export function DocumentGroup(documentType, content) {
  return new DocumentGroupView(documentType, content);
}

export default WindowGroup;
