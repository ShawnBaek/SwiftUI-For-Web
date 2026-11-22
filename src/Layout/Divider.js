/**
 * Divider - A visual separator between views
 *
 * Matches SwiftUI's Divider view that creates a horizontal or vertical line.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * VStack(
 *   Text('Item 1'),
 *   Divider(),
 *   Text('Item 2')
 * )
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
 * Divider - Visual separator
 *
 * @returns {Object} Chainable view descriptor
 *
 * @example
 * Divider()
 */
export function Divider() {
  return chainable(createDescriptor('Divider', {}));
}

export default Divider;
