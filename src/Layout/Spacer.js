/**
 * Spacer - A flexible space that expands along the major axis of its parent.
 *
 * Matches SwiftUI's Spacer for flexible layout spacing.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * // Push content to edges
 * HStack(
 *   Text('Left'),
 *   Spacer(),
 *   Text('Right')
 * )
 *
 * // Push content to bottom
 * VStack(
 *   Text('Top'),
 *   Spacer(),
 *   Text('Bottom')
 * )
 *
 * // With minimum length
 * Spacer({ minLength: 20 })
 */

import { chainable as sharedChainable } from '../Core/Chainable.js';
import {
  createDescriptor,
  addModifier,
  setKey,
  createModifier,
  ModifierType
} from '../Core/ViewDescriptor.js';

function chainable(descriptor) {
  return sharedChainable(descriptor);
}

/**
 * Spacer - Flexible space
 *
 * @param {Object} [options] - Spacer options
 * @param {number} [options.minLength] - Minimum length in pixels
 * @returns {Object} Chainable view descriptor
 *
 * @example
 * // Default spacer
 * Spacer()
 *
 * // With minimum length
 * Spacer({ minLength: 16 })
 */
export function Spacer(options = {}) {
  return chainable(createDescriptor('Spacer', {
    minLength: options.minLength ?? null
  }));
}

export default Spacer;
