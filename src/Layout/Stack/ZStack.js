/**
 * ZStack - A view that overlays its children, aligning them on both axes.
 *
 * Matches SwiftUI's ZStack for layered layout composition.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * // Basic usage - image with text overlay
 * ZStack(
 *   Image('background.jpg'),
 *   Text('Overlay Text')
 *     .foregroundColor('white')
 * )
 *
 * // With alignment
 * ZStack({ alignment: 'bottomLeading' },
 *   Image('photo.jpg'),
 *   Text('Caption')
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
 * ZStack - Layered stack layout (z-axis)
 *
 * @param {Object|...Object} optionsOrChildren - Options or first child
 * @param {...Object} children - Child views
 * @returns {Object} Chainable view descriptor
 */
export function ZStack(optionsOrChildren, ...children) {
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

  return chainable(createDescriptor('ZStack', {
    alignment: options.alignment ?? 'center'
  }, actualChildren));
}

export default ZStack;
