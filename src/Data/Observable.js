/**
 * Observable - Modern observation system (iOS 17+ style)
 *
 * Matches SwiftUI's @Observable macro from iOS 17.
 * Uses JavaScript Proxy to automatically track property access.
 *
 * @example
 * class CounterModel {
 *   count = 0;
 *   name = 'Counter';
 *
 *   increment() {
 *     this.count++;
 *   }
 * }
 *
 * // Make it observable
 * const model = Observable(new CounterModel());
 *
 * // Automatic observation - views re-render when accessed properties change
 * model.count = 5; // Triggers updates
 *
 * @example
 * // Using @Observable decorator style
 * @Observable
 * class UserModel {
 *   name = '';
 *   email = '';
 * }
 */

/**
 * Current tracking context for automatic observation
 */
let currentTrackingContext = null;

/**
 * Set the current tracking context
 * @param {Object} context - Tracking context
 */
export function withTracking(context, fn) {
  const previous = currentTrackingContext;
  currentTrackingContext = context;
  try {
    return fn();
  } finally {
    currentTrackingContext = previous;
  }
}

/**
 * Observable - Creates an observable object using Proxy
 *
 * @param {Object} target - Object to make observable
 * @returns {Proxy} Observable proxy
 */
export function Observable(target) {
  // If used as a decorator
  if (typeof target === 'function') {
    return function (...args) {
      const instance = new target(...args);
      return createObservableProxy(instance);
    };
  }

  // Direct usage
  return createObservableProxy(target);
}

/**
 * Create an observable proxy for an object
 * @param {Object} target
 * @returns {Proxy}
 */
function createObservableProxy(target) {
  const subscribers = new Map(); // property -> Set of callbacks
  const propertyAccessors = new Map(); // For nested observation
  const globalSubscribers = new Set(); // Subscribe to any change

  const proxy = new Proxy(target, {
    get(obj, prop) {
      // Track property access
      if (currentTrackingContext && typeof prop === 'string') {
        if (!currentTrackingContext.accessedProperties) {
          currentTrackingContext.accessedProperties = new Set();
        }
        currentTrackingContext.accessedProperties.add(prop);

        // Register for updates
        if (currentTrackingContext.onUpdate) {
          if (!subscribers.has(prop)) {
            subscribers.set(prop, new Set());
          }
          subscribers.get(prop).add(currentTrackingContext.onUpdate);
        }
      }

      const value = obj[prop];

      // Return methods bound to the proxy
      if (typeof value === 'function') {
        return value.bind(proxy);
      }

      // Make nested objects observable
      if (value && typeof value === 'object' && !propertyAccessors.has(prop)) {
        const nestedProxy = createObservableProxy(value);
        propertyAccessors.set(prop, nestedProxy);
        return nestedProxy;
      }

      return propertyAccessors.get(prop) ?? value;
    },

    set(obj, prop, value) {
      const oldValue = obj[prop];

      if (oldValue !== value) {
        obj[prop] = value;

        // Clear nested proxy cache
        propertyAccessors.delete(prop);

        // Notify property subscribers
        if (subscribers.has(prop)) {
          subscribers.get(prop).forEach(callback => {
            try {
              callback(value, oldValue, prop);
            } catch (e) {
              console.error('Observable callback error:', e);
            }
          });
        }

        // Notify global subscribers
        globalSubscribers.forEach(callback => {
          try {
            callback(prop, value, oldValue);
          } catch (e) {
            console.error('Observable callback error:', e);
          }
        });
      }

      return true;
    }
  });

  // Add subscription methods
  Object.defineProperty(proxy, '_subscribe', {
    value: function (callback) {
      globalSubscribers.add(callback);
      return () => globalSubscribers.delete(callback);
    },
    enumerable: false
  });

  Object.defineProperty(proxy, '_subscribeToProperty', {
    value: function (prop, callback) {
      if (!subscribers.has(prop)) {
        subscribers.set(prop, new Set());
      }
      subscribers.get(prop).add(callback);
      return () => subscribers.get(prop)?.delete(callback);
    },
    enumerable: false
  });

  return proxy;
}

/**
 * ObservationTracking - Tracks property access in a block
 *
 * @example
 * const tracking = new ObservationTracking();
 * tracking.track(() => {
 *   console.log(model.count); // Tracks 'count'
 *   console.log(model.name);  // Tracks 'name'
 * });
 * console.log(tracking.accessedProperties); // ['count', 'name']
 */
export class ObservationTracking {
  constructor() {
    this.accessedProperties = new Set();
    this._context = null;
  }

  /**
   * Track property access in a block
   * @param {Function} fn - Function to track
   * @returns {*} Result of fn
   */
  track(fn) {
    this._context = {
      accessedProperties: this.accessedProperties
    };

    return withTracking(this._context, fn);
  }

  /**
   * Subscribe to changes on tracked properties
   * @param {Object} observable - Observable object
   * @param {Function} callback - Change callback
   * @returns {Function} Unsubscribe function
   */
  onChange(observable, callback) {
    const unsubscribers = [];

    this.accessedProperties.forEach(prop => {
      if (observable._subscribeToProperty) {
        const unsub = observable._subscribeToProperty(prop, callback);
        unsubscribers.push(unsub);
      }
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }
}

/**
 * Bindable - Creates a bindable property (similar to @Bindable)
 *
 * @example
 * class Editor {
 *   text = Bindable('');
 * }
 *
 * const editor = Observable(new Editor());
 * TextField('Edit', editor.text.$binding)
 */
export function Bindable(initialValue) {
  return {
    _value: initialValue,
    get value() {
      return this._value;
    },
    set value(newValue) {
      this._value = newValue;
    },
    get $binding() {
      const self = this;
      return {
        get value() { return self._value; },
        set value(v) { self._value = v; },
        get wrappedValue() { return self._value; },
        set wrappedValue(v) { self._value = v; }
      };
    }
  };
}

/**
 * withObservationTracking - Track property access and respond to changes
 *
 * @param {Function} apply - Function where property access is tracked
 * @param {Function} onChange - Called when tracked properties change
 * @returns {*} Result of apply function
 */
export function withObservationTracking(apply, onChange) {
  const tracking = new ObservationTracking();
  const result = tracking.track(apply);

  // This is a simplified implementation
  // In a real implementation, we'd need a way to access the observables
  // that were accessed during tracking

  return result;
}

export default Observable;
