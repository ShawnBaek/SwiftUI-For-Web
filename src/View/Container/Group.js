/**
 * Group - A container that groups multiple views without affecting layout
 *
 * Matches SwiftUI's Group view which is useful for applying modifiers
 * to multiple views at once or for working around the 10-child limit.
 * Its children are laid out by the enclosing stack.
 *
 * @example
 * Group(
 *   Text('First'),
 *   Text('Second'),
 *   Text('Third')
 * )
 * .foregroundColor(Color.blue)
 */

import { createDescriptor } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, renderChildren } from '../../Core/Renderer.js';

export function Group(...children) {
  return chainable(createDescriptor('Group', {}, children.flat()));
}

registerRenderer('Group', (props, children) => {
  const el = document.createElement('div');
  el.dataset.view = 'group';
  el.style.display = 'contents';
  el.appendChild(renderChildren(children));
  return el;
});

export default Group;
