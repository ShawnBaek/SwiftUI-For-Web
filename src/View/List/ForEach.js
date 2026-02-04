/**
 * ForEach - SwiftUI ForEach equivalent
 *
 * Iterates over a collection and creates views for each element.
 * Matches SwiftUI's ForEach API.
 *
 * Usage:
 *   ForEach(items, item => Text(item.name))
 *   ForEach(items, { id: 'id' }, item => Text(item.name))
 *   ForEach(0..<5, i => Text(`Item ${i}`))
 */

import { View } from '../../Core/View.js';

/**
 * ForEachView class - renders a collection of views
 */
export class ForEachView extends View {
  /**
   * Create a ForEach view
   * @param {Array|Object} data - Array of items or range object
   * @param {Object|Function} optionsOrContent - Options object or content function
   * @param {Function} [contentFn] - Content function if options provided
   */
  constructor(data, optionsOrContent, contentFn) {
    super();

    // Parse arguments
    if (typeof optionsOrContent === 'function') {
      // ForEach(data, item => View)
      this._data = data;
      this._content = optionsOrContent;
      this._id = null;
    } else if (typeof optionsOrContent === 'object' && !Array.isArray(optionsOrContent)) {
      // ForEach(data, { id: 'key' }, item => View)
      this._data = data;
      this._id = optionsOrContent.id || null;
      this._content = contentFn;
    } else {
      throw new Error('ForEach requires a content function');
    }

    // Handle range syntax (0..<5 style via Range object)
    if (this._data && typeof this._data === 'object' && 'start' in this._data && 'end' in this._data) {
      this._data = Array.from(
        { length: this._data.end - this._data.start },
        (_, i) => this._data.start + i
      );
    }

    // Ensure data is an array
    if (!Array.isArray(this._data)) {
      this._data = [];
    }
  }

  /**
   * Get the identity key for an item
   * @param {*} item - The item
   * @param {number} index - The index
   * @returns {string} The identity key
   */
  _getKey(item, index) {
    if (this._id) {
      // Use specified id property
      if (typeof this._id === 'function') {
        return String(this._id(item));
      }
      return String(item[this._id]);
    }
    // Fall back to index
    return String(index);
  }

  /**
   * Get the child views
   * @returns {Array<View>} Array of child views
   */
  get children() {
    return this._data.map((item, index) => {
      const view = this._content(item, index);
      // Store identity on view for reconciliation
      if (view) {
        view._forEachKey = this._getKey(item, index);
      }
      return view;
    }).filter(v => v != null);
  }

  /**
   * Render to DOM
   * @returns {HTMLElement}
   */
  _render() {
    // ForEach is a "transparent" container - it returns a fragment
    const fragment = document.createDocumentFragment();

    for (const child of this.children) {
      if (child instanceof View) {
        const element = child._render();
        if (child._forEachKey) {
          element.dataset.forEachKey = child._forEachKey;
        }
        fragment.appendChild(element);
      }
    }

    // Wrap in a container div for modifier support
    const container = document.createElement('div');
    container.dataset.view = 'ForEach';
    container.style.display = 'contents'; // Makes container "invisible" in layout
    container.appendChild(fragment);

    return this._applyModifiers(container);
  }
}

/**
 * Range helper for SwiftUI-like range syntax
 * Usage: Range(0, 5) creates [0, 1, 2, 3, 4]
 */
export class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  /**
   * Convert to array
   * @returns {Array<number>}
   */
  toArray() {
    return Array.from({ length: this.end - this.start }, (_, i) => this.start + i);
  }
}

/**
 * Factory function for ForEach
 * @param {Array|Range} data - Array of items or Range
 * @param {Object|Function} optionsOrContent - Options or content function
 * @param {Function} [contentFn] - Content function if options provided
 * @returns {ForEachView}
 */
export function ForEach(data, optionsOrContent, contentFn) {
  return new ForEachView(data, optionsOrContent, contentFn);
}

export default ForEach;
