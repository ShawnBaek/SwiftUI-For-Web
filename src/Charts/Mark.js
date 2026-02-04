/**
 * Mark - Base class for all chart marks
 * Provides common functionality for BarMark, LineMark, PointMark, etc.
 */

import { PlottableValue } from './PlottableValue.js';

export class Mark {
  constructor(options = {}) {
    this.x = options.x || null;
    this.y = options.y || null;
    this.xStart = options.xStart || null;
    this.xEnd = options.xEnd || null;
    this.yStart = options.yStart || null;
    this.yEnd = options.yEnd || null;
    this.width = options.width || null;
    this.height = options.height || null;

    // Styling
    this._foregroundStyle = null;
    this._foregroundStyleField = null;
    this._opacity = 1;
    this._cornerRadius = 0;

    // Annotation
    this._annotation = null;
    this._annotationPosition = 'top';

    // Symbol (for PointMark)
    this._symbol = 'circle';
    this._symbolSize = 64; // Area in points squared

    // Line style (for LineMark)
    this._lineStyle = { lineWidth: 2 };
    this._interpolationMethod = 'linear';

    // Area (for AreaMark)
    this._stacking = 'standard';
  }

  /**
   * Set foreground color/style
   * @param {string|Object} style - Color or style config
   * @returns {this}
   */
  foregroundStyle(style) {
    if (typeof style === 'object' && style.by) {
      // .foregroundStyle(by: .value("Series", item.series))
      this._foregroundStyleField = style.by;
    } else {
      this._foregroundStyle = style;
    }
    return this;
  }

  /**
   * Set opacity
   * @param {number} value - Opacity 0-1
   * @returns {this}
   */
  opacity(value) {
    this._opacity = value;
    return this;
  }

  /**
   * Set corner radius (for BarMark)
   * @param {number} radius - Corner radius in pixels
   * @returns {this}
   */
  cornerRadius(radius) {
    this._cornerRadius = radius;
    return this;
  }

  /**
   * Add annotation to mark
   * @param {string} position - 'top', 'bottom', 'leading', 'trailing', 'overlay'
   * @param {Function} content - Function returning content view
   * @returns {this}
   */
  annotation(position = 'top', content = null) {
    if (typeof position === 'function') {
      content = position;
      position = 'top';
    }
    this._annotation = content;
    this._annotationPosition = position;
    return this;
  }

  /**
   * Set symbol type (for PointMark)
   * @param {string|Object} symbol - Symbol type or by-field config
   * @returns {this}
   */
  symbol(symbol) {
    if (typeof symbol === 'object' && symbol.by) {
      this._symbolField = symbol.by;
    } else {
      this._symbol = symbol;
    }
    return this;
  }

  /**
   * Set symbol size
   * @param {number} size - Size in points squared
   * @returns {this}
   */
  symbolSize(size) {
    this._symbolSize = size;
    return this;
  }

  /**
   * Set line style (for LineMark)
   * @param {Object} style - StrokeStyle config
   * @returns {this}
   */
  lineStyle(style) {
    this._lineStyle = { ...this._lineStyle, ...style };
    return this;
  }

  /**
   * Set interpolation method (for LineMark, AreaMark)
   * @param {string} method - 'linear', 'monotone', 'catmullRom', 'step', 'stepStart', 'stepEnd'
   * @returns {this}
   */
  interpolationMethod(method) {
    this._interpolationMethod = method;
    return this;
  }

  /**
   * Set stacking mode (for AreaMark, BarMark)
   * @param {string} mode - 'standard', 'normalized', 'center'
   * @returns {this}
   */
  stacking(mode) {
    this._stacking = mode;
    return this;
  }

  /**
   * Get X value for this mark
   * @returns {PlottableValue|null}
   */
  getX() {
    return this.x;
  }

  /**
   * Get Y value for this mark
   * @returns {PlottableValue|null}
   */
  getY() {
    return this.y;
  }

  /**
   * Get mark type name
   * @returns {string}
   */
  get markType() {
    return 'Mark';
  }

  /**
   * Clone this mark with optional overrides
   * @param {Object} overrides - Properties to override
   * @returns {Mark}
   */
  clone(overrides = {}) {
    const cloned = Object.create(Object.getPrototypeOf(this));
    Object.assign(cloned, this, overrides);
    return cloned;
  }
}

export default Mark;
