/**
 * defineControl - expose a class-based control as a view descriptor (#48).
 *
 * The factory (Toggle(...), Slider(...), …) returns a chainable descriptor
 * with the full modifier table plus the control's own methods. Rendering
 * builds the control class, replays those methods in order and renders it,
 * so every control goes through Renderer.render: modifiers apply in order
 * (#50), reactive modifiers bind under the owner (#44) and static rendering
 * works (#40). The classes stay exported for one minor release.
 */

import { createDescriptor } from './ViewDescriptor.js';
import { chainable } from './Chainable.js';
import { registerRenderer } from './Renderer.js';

/**
 * @param {string} type - Descriptor type, e.g. 'Toggle'
 * @param {Function} ViewClass - The control class
 * @param {string[]} methods - The control's own chainable methods
 * @returns {(...args: any[]) => Object} The factory
 */
export function defineControl(type, ViewClass, methods = []) {
  registerRenderer(type, (props) => {
    const view = new ViewClass(...props.args);
    for (const [name, args] of props.calls) view[name](...args);
    return view._render();
  });
  const extras = ({ descriptor, withProps }) => Object.fromEntries(methods.map((name) => [
    name,
    (...args) => withProps({ calls: [...descriptor.props.calls, [name, args]] }),
  ]));
  return (...args) => chainable(createDescriptor(type, { args, calls: [] }), extras);
}
