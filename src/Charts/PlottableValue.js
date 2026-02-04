/**
 * PlottableValue - Represents a value to be plotted on a chart axis
 * Mirrors Swift Charts' PlottableValue API
 *
 * Usage:
 *   .value("Label", 100)
 *   .value("Category", "January")
 *   .value("Date", new Date())
 */

export class PlottableValue {
  /**
   * Create a plottable value
   * @param {string} label - The label for this value (used in axis/legend)
   * @param {number|string|Date} value - The actual value
   */
  constructor(label, value) {
    this.label = label;
    this.rawValue = value;
    this._inferType();
  }

  /**
   * Static factory method matching Swift Charts API
   * @param {string} label - The label for this value
   * @param {number|string|Date} value - The value
   * @returns {PlottableValue}
   */
  static value(label, value) {
    return new PlottableValue(label, value);
  }

  /**
   * Infer the data type (quantitative, nominal, temporal)
   * @private
   */
  _inferType() {
    if (this.rawValue instanceof Date) {
      this.type = 'temporal';
    } else if (typeof this.rawValue === 'number') {
      this.type = 'quantitative';
    } else {
      this.type = 'nominal';
    }
  }

  /**
   * Get the value as a number for plotting
   * @returns {number}
   */
  get numericValue() {
    if (this.type === 'temporal') {
      return this.rawValue.getTime();
    }
    if (this.type === 'quantitative') {
      return this.rawValue;
    }
    return 0; // Nominal values don't have numeric representation
  }

  /**
   * Get display string for the value
   * @returns {string}
   */
  get displayValue() {
    if (this.type === 'temporal') {
      return this.rawValue.toLocaleDateString();
    }
    return String(this.rawValue);
  }
}

/**
 * Convenience function for creating PlottableValues
 * Matches Swift Charts' .value() syntax
 *
 * @param {string} label - The label
 * @param {number|string|Date} value - The value
 * @returns {PlottableValue}
 */
export function value(label, val) {
  return PlottableValue.value(label, val);
}

export default PlottableValue;
