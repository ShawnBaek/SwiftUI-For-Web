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

import { createDescriptor, isView } from '../Core/ViewDescriptor.js';
import { chainable } from '../Core/Chainable.js';
import { registerRenderer, render } from '../Core/Renderer.js';

// Scene content: a view, or a function returning one (called with `arg`).
function renderSceneContent(content, arg) {
  const view = typeof content === 'function' && !isView(content) ? content(arg) : content;
  return isView(view) ? render(view) : null;
}

function scene(type, props, extras) {
  return chainable(createDescriptor(type, props), extras);
}

/**
 * WindowGroup - the app's main scene.
 *
 * Signatures: WindowGroup('Title', content), WindowGroup({ id, title,
 * defaultValue, metadata }, content) and WindowGroup(content). `metadata`
 * is scene-level document metadata (#40), read by renderDocument.
 *
 * @returns {Object} Chainable view descriptor
 */
export function WindowGroup(...args) {
  let options = {};
  if (typeof args[0] === 'string') options = { title: args.shift() };
  else if (args[0] && typeof args[0] === 'object' && !isView(args[0])) options = args.shift();
  const title = options.title ?? null;
  // The title names the document.
  if (title && typeof document !== 'undefined') document.title = title;
  return scene('WindowGroup', {
    title,
    id: options.id ?? null,
    defaultValue: options.defaultValue ?? null,
    metadata: options.metadata ?? null,
    content: args[0] ?? null,
    defaultSize: null,
  }, ({ withProps }) => ({
    defaultSize: (size) => withProps({ defaultSize: size }),
    // Window chrome is the browser's: accepted and ignored on the web.
    windowResizability: (resizability) => withProps({ resizability }),
    handlesExternalEvents: (matching) => withProps({ externalEvents: matching }),
    windowStyle: (style) => withProps({ windowStyle: style }),
  }));
}

registerRenderer('WindowGroup', (props) => {
  const container = document.createElement('div');
  container.dataset.scene = 'window-group';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  if (props.id) container.dataset.windowId = props.id;
  const { defaultSize } = props;
  if (defaultSize?.width) container.style.width = `${defaultSize.width}px`;
  if (defaultSize?.height) container.style.height = `${defaultSize.height}px`;
  const rendered = renderSceneContent(props.content);
  if (rendered) container.appendChild(rendered);
  return container;
});

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
 * Settings - the preferences scene.
 */
export function Settings(content) {
  return scene('Settings', { content });
}

registerRenderer('Settings', (props) => {
  const container = document.createElement('div');
  container.dataset.scene = 'settings';
  container.style.padding = '20px';
  const rendered = renderSceneContent(props.content);
  if (rendered) container.appendChild(rendered);
  return container;
});

/**
 * DocumentGroup - the scene of a document-based app. The content function
 * receives `{ document }`.
 */
export function DocumentGroup(documentType, content) {
  return scene('DocumentGroup', { documentType, content });
}

registerRenderer('DocumentGroup', (props) => {
  const container = document.createElement('div');
  container.dataset.scene = 'document-group';
  container.style.width = '100%';
  container.style.height = '100%';
  if (typeof props.content === 'function') {
    const rendered = renderSceneContent(props.content, { document: null });
    if (rendered) container.appendChild(rendered);
  }
  return container;
});

export default WindowGroup;
