/**
 * ForEach - SwiftUI ForEach equivalent
 *
 * Iterates over a collection and creates views for each element.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * ForEach(items, item => Text(item.name))
 * ForEach(items, { id: 'id' }, item => Text(item.name))
 */

import {
  createDescriptor,
  addModifier,
  setKey,
  createModifier,
  ModifierType
} from '../../Core/ViewDescriptor.js';

/**
 * Create a chainable descriptor with modifier methods
 */
function chainable(descriptor) {
  const chain = Object.create(null);
  Object.assign(chain, descriptor);

  chain.padding = (value) => chainable(addModifier(descriptor, createModifier(ModifierType.PADDING, value)));
  chain.frame = (options) => chainable(addModifier(descriptor, createModifier(ModifierType.FRAME, options)));
  chain.foregroundColor = (color) => chainable(addModifier(descriptor, createModifier(ModifierType.FOREGROUND_COLOR, color)));
  chain.background = (color) => chainable(addModifier(descriptor, createModifier(ModifierType.BACKGROUND, color)));
  chain.opacity = (value) => chainable(addModifier(descriptor, createModifier(ModifierType.OPACITY, value)));
  chain.id = (key) => chainable(setKey(descriptor, key));
  chain.modifier = (mod) => chainable(addModifier(descriptor, createModifier(ModifierType.CUSTOM, mod)));

  return Object.freeze(chain);
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
 * ForEach - Iterate over a collection
 *
 * @param {Array|Range} data - Array of items or Range
 * @param {Object|Function} optionsOrContent - Options object or content function
 * @param {Function} [contentFn] - Content function if options provided
 * @returns {Object} Chainable view descriptor
 *
 * @example
 * ForEach(items, { id: 'id' }, item => Text(item.name))
 * ForEach(['a', 'b', 'c'], (item, index) => Text(item).id(index))
 */
export function ForEach(data, optionsOrContent, contentFn) {
  let idKey = null;
  let builderFn = contentFn;

  // Parse arguments
  if (typeof optionsOrContent === 'function') {
    builderFn = optionsOrContent;
  } else if (optionsOrContent && typeof optionsOrContent === 'object' && !Array.isArray(optionsOrContent)) {
    idKey = optionsOrContent.id || null;
  }

  if (!builderFn) {
    throw new Error('ForEach requires a content function');
  }

  // Handle range syntax
  let actualData = data;
  if (data && typeof data === 'object' && 'start' in data && 'end' in data) {
    actualData = Array.from(
      { length: data.end - data.start },
      (_, i) => data.start + i
    );
  }

  // Ensure data is an array
  if (!Array.isArray(actualData)) {
    actualData = [];
  }

  // Build children with keys
  const children = actualData.map((item, index) => {
    const child = builderFn(item, index);
    if (child == null) return null;

    // Set key based on idKey or index
    let key;
    if (idKey) {
      if (typeof idKey === 'function') {
        key = idKey(item);
      } else {
        key = item[idKey];
      }
    } else {
      key = index;
    }

    // Use the id method if available, otherwise use setKey
    return child.id ? child.id(key) : setKey(child, key);
  }).filter(c => c != null);

  return chainable(createDescriptor('ForEach', { idKey }, children));
}

export default ForEach;
