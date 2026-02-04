/**
 * StateObject - An owned observable object
 *
 * Matches SwiftUI's @StateObject property wrapper.
 * StateObject creates and owns an instance of an ObservableObject,
 * persisting it across view updates.
 *
 * @example
 * class ViewModel extends ObservableObject {
 *   @Published count = 0;
 * }
 *
 * // In a view
 * const vm = StateObject(() => new ViewModel());
 *
 * // Access the object
 * vm.wrappedValue.count++;
 *
 * // Get binding
 * const countBinding = vm.projectedValue.count;
 */

import { ObservableObject } from './ObservableObject.js';
import { Binding } from './Binding.js';

/**
 * StateObject - Creates and owns an ObservableObject instance
 */
export class StateObject {
  /**
   * Create a StateObject
   * @param {Function} initializer - Function that creates the object
   */
  constructor(initializer) {
    this._initializer = initializer;
    this._object = null;
    this._isInitialized = false;
    this._subscribers = new Set();
  }

  /**
   * Get the wrapped value (the object itself)
   * Creates the object on first access
   * @returns {ObservableObject}
   */
  get wrappedValue() {
    if (!this._isInitialized) {
      this._object = this._initializer();
      this._isInitialized = true;

      // Subscribe to changes on the object
      if (this._object && typeof this._object.subscribe === 'function') {
        this._object.subscribe(() => {
          this._notifySubscribers();
        });
      }
    }
    return this._object;
  }

  /**
   * Set is not typically used, but provided for compatibility
   */
  set wrappedValue(newValue) {
    this._object = newValue;
    this._notifySubscribers();
  }

  /**
   * Get the projected value (binding access)
   * Returns a proxy that creates bindings for each property
   * @returns {Proxy}
   */
  get projectedValue() {
    const self = this;

    return new Proxy({}, {
      get(target, prop) {
        // Return a binding to the property
        return new Binding(
          () => self.wrappedValue[prop],
          (newValue) => {
            self.wrappedValue[prop] = newValue;
          }
        );
      }
    });
  }

  /**
   * Shorthand accessor for the value
   */
  get value() {
    return this.wrappedValue;
  }

  set value(newValue) {
    this.wrappedValue = newValue;
  }

  /**
   * Subscribe to changes
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * Notify subscribers
   * @private
   */
  _notifySubscribers() {
    this._subscribers.forEach(cb => cb(this._object));
  }

  /**
   * Reset to initial state (recreates the object)
   */
  reset() {
    this._object = this._initializer();
    this._notifySubscribers();
  }
}

/**
 * Factory function for StateObject
 * @param {Function} initializer - Function that creates the ObservableObject
 * @returns {StateObject}
 */
export function createStateObject(initializer) {
  return new StateObject(initializer);
}

/**
 * Decorator-style usage helper
 * @param {Function} ObjectClass - ObservableObject class
 * @param {...any} args - Constructor arguments
 * @returns {StateObject}
 */
export function stateObject(ObjectClass, ...args) {
  return new StateObject(() => new ObjectClass(...args));
}

export default StateObject;
