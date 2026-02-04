/**
 * Group - A container that groups multiple views without affecting layout
 *
 * Matches SwiftUI's Group view which is useful for applying modifiers
 * to multiple views at once or for working around the 10-child limit.
 *
 * @example
 * Group(
 *   Text('First'),
 *   Text('Second'),
 *   Text('Third')
 * )
 * .foregroundColor(Color.blue)
 */

import { View } from '../../Core/View.js';

/**
 * Group view class
 */
export class GroupView extends View {
  constructor(...children) {
    super();
    this._children = children.flat();
  }

  _render() {
    // Group renders as a transparent container
    const el = document.createElement('div');
    el.dataset.view = 'group';
    el.style.display = 'contents'; // Makes the wrapper invisible to layout

    for (const child of this._children) {
      if (child instanceof View) {
        el.appendChild(child._render());
      }
    }

    return this._applyModifiers(el);
  }
}

/**
 * Factory function for Group
 */
export function Group(...children) {
  return new GroupView(...children);
}

export default Group;
