/**
 * ObservableObject - SwiftUI ObservableObject equivalent
 *
 * A base class for objects that publish changes to their properties.
 * Properties marked with @Published will notify subscribers when changed.
 *
 * Performance optimizations:
 * - Automatic batching via Scheduler (multiple property changes = 1 notification)
 * - Per-property subscribers for fine-grained reactivity
 * - Coalesced notifications prevent redundant re-renders
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
import { scheduleWork, DefaultLane } from '../Core/Scheduler.js';

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
    this._notificationScheduled = false;
    this._boundNotify = null;
    this._batchDepth = 0;
    this._batchDirty = false;
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
          this._scheduleNotification();
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
   * Schedule a notification via the Scheduler.
   * Multiple property changes within the same microtask are coalesced.
   * @private
   */
  _scheduleNotification() {
    // If we're in a manual batch, just mark dirty
    if (this._batchDepth > 0) {
      this._batchDirty = true;
      return;
    }

    if (this._notificationScheduled) return;
    this._notificationScheduled = true;

    if (!this._boundNotify) {
      this._boundNotify = () => {
        this._notificationScheduled = false;
        this._notifyChange();
      };
    }

    scheduleWork(this._boundNotify, DefaultLane);
  }

  /**
   * Notify all subscribers of a change
   */
  _notifyChange() {
    for (const callback of this._subscribers) {
      try {
        callback(this);
      } catch (e) {
        console.error('ObservableObject subscriber error:', e);
      }
    }
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
      for (const callback of subscribers) {
        try {
          callback(newValue, oldValue);
        } catch (e) {
          console.error('ObservableObject property subscriber error:', e);
        }
      }
    }
  }

  /**
   * Batch multiple property updates into a single notification.
   * This is an explicit batching API for cases where you want guaranteed
   * single-notification behavior (the Scheduler also batches automatically).
   *
   * @param {Function} updateFn - Function that performs updates
   */
  batch(updateFn) {
    this._batchDepth++;
    this._batchDirty = false;

    try {
      updateFn();
    } finally {
      this._batchDepth--;
      if (this._batchDepth === 0 && this._batchDirty) {
        this._batchDirty = false;
        this._scheduleNotification();
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
