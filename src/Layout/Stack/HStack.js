/**
 * HStack - A view that arranges its children in a horizontal line.
 *
 * Matches SwiftUI's HStack for horizontal layout composition.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * // Basic usage
 * HStack(
 *   Text('Left'),
 *   Text('Center'),
 *   Text('Right')
 * )
 *
 * // With options
 * HStack({ alignment: 'top', spacing: 20 },
 *   Image('icon.png'),
 *   Text('Label')
 * )
 */

import { chainable as sharedChainable } from '../../Core/Chainable.js';
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
 * HStack - Horizontal stack layout
 *
 * @param {Object|...Object} optionsOrChildren - Options or first child
 * @param {...Object} children - Child views
 * @returns {Object} Chainable view descriptor
 */
export function HStack(optionsOrChildren, ...children) {
  let options = {};
  let actualChildren = children;

  // Handle different call signatures
  if (optionsOrChildren && typeof optionsOrChildren === 'object') {
    // Check if it's a descriptor or view (has type or $$typeof or _render)
    const isView = optionsOrChildren.$$typeof ||
                   optionsOrChildren.type ||
                   optionsOrChildren._render ||
                   Array.isArray(optionsOrChildren);

    if (!isView) {
      options = optionsOrChildren;
    } else {
      actualChildren = [optionsOrChildren, ...children];
    }
  } else if (optionsOrChildren != null) {
    actualChildren = [optionsOrChildren, ...children];
  }

  // Flatten and filter children
  actualChildren = actualChildren.flat().filter(c => c != null);

  return chainable(createDescriptor('HStack', {
    alignment: options.alignment ?? 'center',
    spacing: options.spacing ?? 8
  }, actualChildren));
}

export default HStack;
