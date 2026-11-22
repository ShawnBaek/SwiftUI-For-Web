/**
 * VStack - A view that arranges its children in a vertical line.
 *
 * Matches SwiftUI's VStack for vertical layout composition.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * // Basic usage
 * VStack(
 *   Text('Line 1'),
 *   Text('Line 2'),
 *   Text('Line 3')
 * )
 *
 * // With options
 * VStack({ alignment: 'leading', spacing: 10 },
 *   Text('Left aligned'),
 *   Text('Also left aligned')
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
 * VStack - Vertical stack layout
 *
 * @param {Object|...Object} optionsOrChildren - Options or first child
 * @param {...Object} children - Child views
 * @returns {Object} Chainable view descriptor
 */
export function VStack(optionsOrChildren, ...children) {
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

  return chainable(createDescriptor('VStack', {
    alignment: options.alignment ?? 'center',
    spacing: options.spacing ?? 8
  }, actualChildren));
}

export default VStack;
