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
// Names the shared table already provides; computed once.
let tableMethods = null;
function sharedMethodNames() {
  tableMethods ??= new Set(Object.keys(chainable(createDescriptor('Probe', {}))).filter((key) => key !== '$$typeof'));
  return tableMethods;
}

// Instance helpers that return values rather than configure the view.
const NOT_MODIFIERS = new Set(['body', 'getElement', 'rerender', 'trackChanges', 'mount']);

// Every public method of the class (and its View ancestors), so a method
// the shared table lacks (.animation, .transition, .gesture, .mask, …)
// still works on the control: it is replayed on the class instance.
function classMethodNames(ViewClass) {
  const names = new Set();
  for (let proto = ViewClass.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === 'constructor' || name.startsWith('_') || NOT_MODIFIERS.has(name)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(proto, name);
      if (typeof descriptor?.value === 'function') names.add(name);
    }
  }
  return names;
}

export function defineControl(type, ViewClass, methods = []) {
  registerRenderer(type, (props) => {
    const view = new ViewClass(...props.args);
    for (const [name, args] of props.calls) view[name](...args);
    return view._render();
  });
  // The control's own methods, plus inherited View methods the shared table
  // doesn't have (#48: nothing a control had before is lost).
  const forwarded = new Set(methods);
  for (const name of classMethodNames(ViewClass)) {
    if (!sharedMethodNames().has(name)) forwarded.add(name);
  }
  const extras = ({ descriptor, withProps }) => Object.fromEntries([...forwarded].map((name) => [
    name,
    (...args) => withProps({ calls: [...descriptor.props.calls, [name, args]] }),
  ]));
  return (...args) => chainable(createDescriptor(type, { args, calls: [] }), extras);
}
