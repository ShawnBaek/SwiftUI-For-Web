/**
 * ObservableObject - SwiftUI ObservableObject equivalent
 *
 * A base class for objects that publish changes to their properties.
 * Properties marked with @Published will notify subscribers when changed.
 *
 * Usage:
 *   class TodoViewModel extends ObservableObject {
 *     constructor() {
 *       super();
 *       this.published('todos', []);
 *       this.published('newTodoText', '');
 *     }
 *   }
 */

import { Binding } from './Binding.js';

/**
 * ObservableObject base class
 * Provides reactive property publishing and subscription
 */
export class ObservableObject {
  constructor() {
    this._subscribers = new Set();
    this._propertySubscribers = new Map();
    this._publishedProperties = new Map();
    this._bindings = new Map();
  }

  /**
   * Define a published property with initial value
   * @param {string} name - Property name
   * @param {*} initialValue - Initial value
   * @returns {ObservableObject}
   */
  published(name, initialValue) {
    this._publishedProperties.set(name, initialValue);

    // Define getter/setter on this object
    Object.defineProperty(this, name, {
      get: () => this._publishedProperties.get(name),
      set: (newValue) => {
        const oldValue = this._publishedProperties.get(name);
        if (oldValue !== newValue) {
          this._publishedProperties.set(name, newValue);
          this._notifyPropertyChange(name, newValue, oldValue);
          this._notifyChange();
        }
      },
      enumerable: true,
      configurable: true
    });

    return this;
  }

  /**
   * Get a binding for a published property
   * @param {string} propertyName - The property name
   * @returns {Binding}
   */
  binding(propertyName) {
    if (!this._bindings.has(propertyName)) {
      const binding = new Binding(
        () => this[propertyName],
        (value) => { this[propertyName] = value; }
      );
      this._bindings.set(propertyName, binding);
    }
    return this._bindings.get(propertyName);
  }

  /**
   * Subscribe to all property changes
   * @param {Function} callback - Called when any property changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * Subscribe to a specific property's changes
   * @param {string} propertyName - The property to observe
   * @param {Function} callback - Called with (newValue, oldValue) when property changes
   * @returns {Function} Unsubscribe function
   */
  subscribeToProperty(propertyName, callback) {
    if (!this._propertySubscribers.has(propertyName)) {
      this._propertySubscribers.set(propertyName, new Set());
    }
    this._propertySubscribers.get(propertyName).add(callback);
    return () => this._propertySubscribers.get(propertyName).delete(callback);
  }

  /**
   * Notify all subscribers of a change
   */
  _notifyChange() {
    this._subscribers.forEach(callback => {
      try {
        callback(this);
      } catch (e) {
        console.error('ObservableObject subscriber error:', e);
      }
    });
  }

  /**
   * Notify property-specific subscribers
   * @param {string} propertyName
   * @param {*} newValue
   * @param {*} oldValue
   */
  _notifyPropertyChange(propertyName, newValue, oldValue) {
    const subscribers = this._propertySubscribers.get(propertyName);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (e) {
          console.error('ObservableObject property subscriber error:', e);
        }
      });
    }
  }

  /**
   * Batch multiple property updates into a single notification
   * @param {Function} updateFn - Function that performs updates
   */
  batch(updateFn) {
    const originalNotify = this._notifyChange.bind(this);
    let shouldNotify = false;

    this._notifyChange = () => {
      shouldNotify = true;
    };

    try {
      updateFn();
    } finally {
      this._notifyChange = originalNotify;
      if (shouldNotify) {
        this._notifyChange();
      }
    }
  }

  /**
   * Get all published property names
   * @returns {Array<string>}
   */
  get publishedPropertyNames() {
    return Array.from(this._publishedProperties.keys());
  }

  /**
   * Create a snapshot of all published properties
   * @returns {Object}
   */
  snapshot() {
    const result = {};
    for (const [key, value] of this._publishedProperties) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Restore from a snapshot
   * @param {Object} snapshot
   */
  restore(snapshot) {
    this.batch(() => {
      for (const key in snapshot) {
        if (this._publishedProperties.has(key)) {
          this[key] = snapshot[key];
        }
      }
    });
  }
}

/**
 * Published decorator function (for use without decorators)
 * Creates a published property on an ObservableObject
 *
 * Usage:
 *   const vm = new ObservableObject();
 *   Published(vm, 'count', 0);
 *
 * @param {ObservableObject} target - The observable object
 * @param {string} propertyName - Property name
 * @param {*} initialValue - Initial value
 */
export function Published(target, propertyName, initialValue) {
  if (!(target instanceof ObservableObject)) {
    throw new Error('Published can only be used with ObservableObject instances');
  }
  target.published(propertyName, initialValue);
}

/**
 * Helper to create an ObservableObject with published properties
 *
 * Usage:
 *   const viewModel = createObservable({
 *     count: 0,
 *     name: 'John'
 *   });
 *
 * @param {Object} properties - Object with property names and initial values
 * @returns {ObservableObject}
 */
export function createObservable(properties) {
  const observable = new ObservableObject();
  for (const [name, value] of Object.entries(properties)) {
    observable.published(name, value);
  }
  return observable;
}

export default ObservableObject;
