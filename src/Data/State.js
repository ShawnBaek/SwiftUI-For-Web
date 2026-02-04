/**
 * State - A property wrapper that provides reactive state management.
 *
 * Matches SwiftUI's @State pattern for local view state.
 * When the value changes, all subscribers are notified to update the UI.
 *
 * @example
 * // Create state
 * const count = new State(0);
 *
 * // Read value
 * console.log(count.value); // 0
 *
 * // Write value (triggers subscribers)
 * count.value = 1;
 *
 * // Subscribe to changes
 * count.subscribe((newValue) => {
 *   console.log('Count changed to:', newValue);
 * });
 *
 * // Get binding for two-way binding
 * const binding = count.binding;
 */

import { Binding } from './Binding.js';

/**
 * State class for reactive state management.
 */
export class State {
  /**
   * Creates a new State instance.
   *
   * @param {*} initialValue - The initial value of the state
   */
  constructor(initialValue) {
    this._value = initialValue;
    this._subscribers = new Set();
    this._binding = null;
  }

  /**
   * Gets the current value (SwiftUI's wrappedValue).
   *
   * @returns {*} The current value
   */
  get value() {
    return this._value;
  }

  /**
   * Sets the value and notifies subscribers (SwiftUI's wrappedValue).
   *
   * @param {*} newValue - The new value
   */
  set value(newValue) {
    if (this._value !== newValue) {
      this._value = newValue;
      this._notifySubscribers();
    }
  }

  /**
   * Gets the current value (alias for value, matches SwiftUI).
   *
   * @returns {*} The current value
   */
  get wrappedValue() {
    return this._value;
  }

  /**
   * Sets the value (alias for value, matches SwiftUI).
   *
   * @param {*} newValue - The new value
   */
  set wrappedValue(newValue) {
    this.value = newValue;
  }

  /**
   * Gets a Binding to this state (SwiftUI's projectedValue / $state).
   *
   * @returns {Binding} A binding to this state
   */
  get binding() {
    if (!this._binding) {
      this._binding = new Binding(
        () => this._value,
        (newValue) => { this.value = newValue; }
      );
    }
    return this._binding;
  }

  /**
   * Gets the projected value (alias for binding, matches SwiftUI's $).
   *
   * @returns {Binding} A binding to this state
   */
  get projectedValue() {
    return this.binding;
  }

  /**
   * Subscribes to value changes.
   *
   * @param {Function} callback - Function to call when value changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * Notifies all subscribers of a value change.
   *
   * @private
   */
  _notifySubscribers() {
    for (const callback of this._subscribers) {
      try {
        callback(this._value);
      } catch (error) {
        console.error('State subscriber error:', error);
      }
    }
  }

  /**
   * Updates the value using a function.
   *
   * @param {Function} updater - Function that receives current value and returns new value
   */
  update(updater) {
    this.value = updater(this._value);
  }

  /**
   * Resets the state to the initial value.
   * Note: This requires storing the initial value.
   */
  // reset() is not implemented as SwiftUI doesn't have this
}

/**
 * Factory function for creating State instances.
 *
 * @param {*} initialValue - The initial value
 * @returns {State} A new State instance
 *
 * @example
 * const count = State(0);
 * count.value++; // Triggers update
 */
export function createState(initialValue) {
  return new State(initialValue);
}

export default State;
