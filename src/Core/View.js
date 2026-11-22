/**
 * View - Deprecated base class for user-defined class views (#48).
 *
 * Every built-in view is a descriptor (see ViewDescriptor.js and
 * Chainable.js). This class stays as a thin adapter so existing
 * `class MyView extends View { body() { … } }` code keeps rendering: its
 * modifiers are the same descriptor modifiers, applied by the same renderer
 * code, in the same order. New code should use factory functions that
 * return descriptors.
 *
 * @deprecated Write views as functions that return descriptors.
 */

import { createDescriptor } from './ViewDescriptor.js';
import { chainable } from './Chainable.js';
import { render, applyViewModifiers } from './Renderer.js';
import { DEV_BUILD } from './Dev.js';

let warned = false;

export class View {
  constructor() {
    /** Descriptor modifiers, or `{ apply(element) }` objects from `.modifier()`. */
    this._modifiers = [];
    this._element = null;
    this._explicitId = null;
    if (DEV_BUILD && !warned && this.constructor !== View && !this.constructor.builtIn) {
      warned = true;
      console.warn(`SwiftUI-For-Web: ${this.constructor.name} extends the deprecated View class; write it as a function that returns views (#48).`);
    }
  }

  /** `.id(_:)`: an explicit identity. */
  id(identifier) {
    this._explicitId = String(identifier);
    return this;
  }

  /** Subclasses return their content; a leaf view returns `this`. */
  body() {
    return this;
  }

  /** Add a modifier: a descriptor modifier or `{ apply(element) }`. */
  modifier(modifier) {
    this._modifiers.push(modifier);
    return this;
  }

  /** `.tabItem(_:)`, read by TabView. */
  tabItem(builder) {
    this._tabItem = builder;
    return this;
  }

  /** Apply this view's modifiers to its element; returns the outermost layer. */
  _applyModifiers(element) {
    return applyViewModifiers(element, this._modifiers, this.constructor.name);
  }

  _render() {
    const content = this.body();
    if (content !== this && !Array.isArray(content)) return render(content);
    const el = document.createElement('div');
    if (content === this) el.dataset.view = this.constructor.name;
    else for (const child of content) if (child) el.appendChild(render(child));
    return this._applyModifiers(el);
  }

  getElement() {
    return (this._element ??= this._render());
  }

  rerender() {
    const old = this._element;
    this._element = this._render();
    old?.parentNode?.replaceChild(this._element, old);
    return this._element;
  }
}

// The descriptor modifiers (Chainable.js), as mutating methods: each pushes
// the modifier the descriptor method would add and returns `this`.
// environment/environmentObject come from extendViewWithEnvironment.
const probe = chainable(createDescriptor('View'));
for (const name of Object.keys(probe)) {
  if (typeof probe[name] !== 'function' || name in View.prototype || name.startsWith('environment')) continue;
  View.prototype[name] = function (...args) {
    const { modifiers } = probe[name](...args);
    if (modifiers.length) this._modifiers.push(modifiers[0]);
    return this;
  };
}

export default View;
