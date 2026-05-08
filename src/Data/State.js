/**
 * State - A property wrapper that provides reactive state management.
 *
 * Matches SwiftUI's @State pattern for local view state.
 * When the value changes, all subscribers are notified to update the UI.
 *
 * Performance optimizations:
 * - Automatic update batching via the Scheduler
 * - Notifications are coalesced: multiple synchronous changes = 1 notification
 * - Structural equality check prevents unnecessary re-renders
 *
 * @example
 * // Create state
 * const count = new State(0);
 *
 * // Read value
 * console.log(count.value); // 0
 *
 * // Write value (triggers subscribers via Scheduler batching)
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
import { scheduleWork, DefaultLane, batch as schedulerBatch } from '../Core/Scheduler.js';
import { trackObservers, notifyObserversSet } from './Signal.js';

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
    this._notificationScheduled = false;
    // Observers from the signal-tracking machinery (Phase 2 compat shim).
    // Lazily populated when a tracked computation reads `state.value`.
    this._observers = new Set();
  }

  /**
   * Gets the current value (SwiftUI's wrappedValue).
   *
   * @returns {*} The current value
   */
  get value() {
    // If a signal computation is currently executing, register it as an
    // observer so writes auto-trigger re-execution. No-op outside a tracking
    // scope.
    trackObservers(this._observers);
    return this._value;
  }

  /**
   * Sets the value and schedules subscriber notification.
   * Multiple synchronous changes are automatically batched into a single notification.
   *
   * @param {*} newValue - The new value
   */
  set value(newValue) {
    if (this._value !== newValue) {
      this._value = newValue;
      this._scheduleNotification();
      // Wake any signal-tracked computations. Safe when _observers is empty.
      notifyObserversSet(this._observers);
    }
  }

  /**
   * Gets the current value (alias for value, matches SwiftUI).
   *
   * @returns {*} The current value
   */
  get wrappedValue() {
    trackObservers(this._observers);
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
      // Route through the getter so binding reads also register with the
      // active signal-tracking computation.
      this._binding = new Binding(
        () => this.value,
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
   * Schedule a notification via the Scheduler.
   * This coalesces multiple changes within the same microtask.
   *
   * @private
   */
  _scheduleNotification() {
    if (this._notificationScheduled) return;
    this._notificationScheduled = true;

    // Use a bound reference so the Scheduler can deduplicate
    if (!this._boundNotify) {
      this._boundNotify = () => {
        this._notificationScheduled = false;
        this._notifySubscribers();
      };
    }

    scheduleWork(this._boundNotify, DefaultLane);
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
