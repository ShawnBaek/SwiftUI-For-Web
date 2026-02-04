/**
 * Binding - A property wrapper that provides two-way access to a value.
 *
 * Matches SwiftUI's @Binding pattern for passing state between views.
 * Binding doesn't own the data - it provides read/write access to state owned elsewhere.
 *
 * @example
 * // Create from State
 * const count = new State(0);
 * const countBinding = count.binding;
 *
 * // Read/write through binding
 * console.log(countBinding.value); // 0
 * countBinding.value = 5; // Updates the source State
 *
 * // Create custom binding
 * const binding = new Binding(
 *   () => myObject.property,
 *   (newValue) => { myObject.property = newValue; }
 * );
 */

/**
 * Binding class for two-way data access.
 */
export class Binding {
  /**
   * Creates a new Binding instance.
   *
   * @param {Function} getter - Function that returns the current value
   * @param {Function} setter - Function that sets a new value
   */
  constructor(getter, setter) {
    this._get = getter;
    this._set = setter;
  }

  /**
   * Gets the current value.
   *
   * @returns {*} The current value
   */
  get value() {
    return this._get();
  }

  /**
   * Sets a new value.
   *
   * @param {*} newValue - The new value
   */
  set value(newValue) {
    this._set(newValue);
  }

  /**
   * Gets the current value (alias, matches SwiftUI).
   *
   * @returns {*} The current value
   */
  get wrappedValue() {
    return this._get();
  }

  /**
   * Sets a new value (alias, matches SwiftUI).
   *
   * @param {*} newValue - The new value
   */
  set wrappedValue(newValue) {
    this._set(newValue);
  }

  /**
   * Creates a derived binding that transforms the value.
   *
   * @param {Function} transform - Function to transform value when reading
   * @param {Function} [reverseTransform] - Function to reverse transform when writing
   * @returns {Binding} A new transformed binding
   *
   * @example
   * const stringBinding = numberBinding.transform(
   *   (num) => String(num),
   *   (str) => parseInt(str, 10)
   * );
   */
  transform(transform, reverseTransform) {
    return new Binding(
      () => transform(this._get()),
      reverseTransform
        ? (newValue) => this._set(reverseTransform(newValue))
        : (newValue) => this._set(newValue)
    );
  }

  /**
   * Creates a binding to a property of the current value (for objects).
   *
   * @param {string} keyPath - The property key
   * @returns {Binding} A binding to the property
   *
   * @example
   * const nameBinding = userBinding.property('name');
   */
  property(keyPath) {
    return new Binding(
      () => {
        const value = this._get();
        return value ? value[keyPath] : undefined;
      },
      (newValue) => {
        const current = this._get();
        if (current && typeof current === 'object') {
          this._set({ ...current, [keyPath]: newValue });
        }
      }
    );
  }

  /**
   * Creates a binding to an element at an index (for arrays).
   *
   * @param {number} index - The array index
   * @returns {Binding} A binding to the array element
   *
   * @example
   * const firstItemBinding = itemsBinding.index(0);
   */
  index(index) {
    return new Binding(
      () => {
        const value = this._get();
        return Array.isArray(value) ? value[index] : undefined;
      },
      (newValue) => {
        const current = this._get();
        if (Array.isArray(current)) {
          const newArray = [...current];
          newArray[index] = newValue;
          this._set(newArray);
        }
      }
    );
  }

  /**
   * Creates a constant binding that always returns the same value.
   * Useful for previews and testing.
   *
   * @param {*} value - The constant value
   * @returns {Binding} A constant binding
   *
   * @example
   * const alwaysTrue = Binding.constant(true);
   */
  static constant(value) {
    return new Binding(
      () => value,
      () => { /* no-op for constant binding */ }
    );
  }
}

/**
 * Factory function for creating Binding instances.
 *
 * @param {Function} getter - Function that returns the current value
 * @param {Function} setter - Function that sets a new value
 * @returns {Binding} A new Binding instance
 */
export function createBinding(getter, setter) {
  return new Binding(getter, setter);
}

export default Binding;
