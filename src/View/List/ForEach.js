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

import { chainable as sharedChainable } from '../../Core/Chainable.js';
import { For } from '../ControlFlow/For.js';
import { State } from '../../Data/State.js';
import { Binding } from '../../Data/Binding.js';
import {
  createDescriptor,
  addModifier,
  setKey,
  createModifier,
  ModifierType
} from '../../Core/ViewDescriptor.js';

function chainable(descriptor) {
  return sharedChainable(descriptor);
}

/**
 * Range helper for SwiftUI-like range syntax
 * Usage: Range(0, 5) creates [0, 1, 2, 3, 4]
 */
function isReactiveData(data) {
  return typeof data === 'function' || data instanceof State || data instanceof Binding;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && 'start' in value && 'end' in value) {
    return Array.from({ length: value.end - value.start }, (_, i) => value.start + i);
  }
  return [];
}

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

  // #52: reactive, keyed ForEach. Given a State, a Binding or a function
  // returning the array, ForEach renders through the keyed For renderer:
  // when the data changes, rows with a stable id keep their DOM and state.
  if (isReactiveData(data)) {
    const each = typeof data === 'function' ? () => toArray(data()) : () => toArray(data.value);
    const keyFn = typeof idKey === 'function'
      ? (item) => idKey(item)
      : idKey
        ? (item) => item[idKey]
        : undefined;
    return chainable(For(each, (item, index) => builderFn(item, index), keyFn));
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
