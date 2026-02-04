/**
 * Text - A view that displays one or more lines of read-only text.
 *
 * Matches SwiftUI's Text view for displaying static text content.
 * Text is a leaf view that renders directly to a span element.
 *
 * @example
 * // Basic usage
 * Text('Hello, World!')
 *
 * // With modifiers
 * Text('Welcome')
 *   .font(Font.title)
 *   .foregroundColor(Color.blue)
 *   .bold()
 *
 * // Multiline
 * Text('Line 1\nLine 2')
 *   .multilineTextAlignment('center')
 */

import { View } from '../Core/View.js';

/**
 * Text view class implementation.
 * @extends View
 */
class TextView extends View {
  /**
   * Creates a new Text view.
   *
   * @param {string|number} content - The text content to display
   */
  constructor(content) {
    super();
    this._content = content;
    this._fontWeight = null;
    this._isItalic = false;
    this._isUnderline = false;
    this._isStrikethrough = false;
    this._underlineColor = null;
    this._strikethroughColor = null;
    this._textAlignment = null;
    this._lineLimit = null;
    this._truncationMode = null;
  }

  /**
   * Text is a leaf view - body returns itself.
   *
   * @returns {TextView} Returns this
   */
  body() {
    return this;
  }

  // ===========================================================================
  // Text-Specific Modifiers (SwiftUI Text API)
  // ===========================================================================

  /**
   * Sets the font weight of the text.
   *
   * @param {string} weight - Font weight ('ultraLight', 'thin', 'light', 'regular', 'medium', 'semibold', 'bold', 'heavy', 'black')
   * @returns {TextView} Returns this for chaining
   */
  fontWeight(weight) {
    this._fontWeight = weight;
    return this;
  }

  /**
   * Applies bold font weight to the text.
   *
   * @returns {TextView} Returns this for chaining
   */
  bold() {
    this._fontWeight = 'bold';
    return this;
  }

  /**
   * Applies italic style to the text.
   *
   * @returns {TextView} Returns this for chaining
   */
  italic() {
    this._isItalic = true;
    return this;
  }

  /**
   * Applies underline decoration to the text.
   *
   * @param {boolean} [active=true] - Whether underline is active
   * @param {Object|string} [color] - Optional underline color
   * @returns {TextView} Returns this for chaining
   */
  underline(active = true, color = null) {
    this._isUnderline = active;
    this._underlineColor = color;
    return this;
  }

  /**
   * Applies strikethrough decoration to the text.
   *
   * @param {boolean} [active=true] - Whether strikethrough is active
   * @param {Object|string} [color] - Optional strikethrough color
   * @returns {TextView} Returns this for chaining
   */
  strikethrough(active = true, color = null) {
    this._isStrikethrough = active;
    this._strikethroughColor = color;
    return this;
  }

  /**
   * Sets the alignment of multiline text.
   *
   * @param {string} alignment - Text alignment ('leading', 'center', 'trailing')
   * @returns {TextView} Returns this for chaining
   */
  multilineTextAlignment(alignment) {
    this._textAlignment = alignment;
    return this;
  }

  /**
   * Sets the maximum number of lines for the text.
   *
   * @param {number|null} limit - Maximum number of lines, or null for unlimited
   * @returns {TextView} Returns this for chaining
   */
  lineLimit(limit) {
    this._lineLimit = limit;
    return this;
  }

  /**
   * Sets how text is truncated when it doesn't fit.
   *
   * @param {string} mode - Truncation mode ('head', 'middle', 'tail')
   * @returns {TextView} Returns this for chaining
   */
  truncationMode(mode) {
    this._truncationMode = mode;
    return this;
  }

  /**
   * Sets the spacing between characters.
   *
   * @param {number} spacing - Character spacing in pixels
   * @returns {TextView} Returns this for chaining
   */
  kerning(spacing) {
    return this.modifier({
      apply(element) {
        element.style.letterSpacing = `${spacing}px`;
      }
    });
  }

  /**
   * Sets the spacing between lines.
   *
   * @param {number} spacing - Line spacing value
   * @returns {TextView} Returns this for chaining
   */
  lineSpacing(spacing) {
    return this.modifier({
      apply(element) {
        element.style.lineHeight = `${1.5 + spacing / 16}`;
      }
    });
  }

  /**
   * Applies monospaced digit styling for numbers.
   *
   * @returns {TextView} Returns this for chaining
   */
  monospacedDigit() {
    return this.modifier({
      apply(element) {
        element.style.fontVariantNumeric = 'tabular-nums';
      }
    });
  }

  /**
   * Sets the baseline offset for the text.
   *
   * @param {number} offset - Baseline offset in pixels
   * @returns {TextView} Returns this for chaining
   */
  baselineOffset(offset) {
    return this.modifier({
      apply(element) {
        element.style.verticalAlign = `${offset}px`;
      }
    });
  }

  /**
   * Renders the Text view to a DOM element.
   *
   * @returns {HTMLSpanElement} The rendered span element
   * @protected
   */
  _render() {
    const span = document.createElement('span');
    span.textContent = String(this._content);
    span.dataset.view = 'Text';

    // Apply text-specific styles
    if (this._fontWeight) {
      span.style.fontWeight = this._getFontWeightValue(this._fontWeight);
    }

    if (this._isItalic) {
      span.style.fontStyle = 'italic';
    }

    // Handle text decorations
    const decorations = [];
    if (this._isUnderline) {
      decorations.push('underline');
    }
    if (this._isStrikethrough) {
      decorations.push('line-through');
    }
    if (decorations.length > 0) {
      span.style.textDecoration = decorations.join(' ');

      // Apply decoration colors if specified
      if (this._underlineColor || this._strikethroughColor) {
        const color = this._underlineColor || this._strikethroughColor;
        const colorValue = color && typeof color.rgba === 'function' ? color.rgba() : color;
        span.style.textDecorationColor = colorValue;
      }
    }

    // Apply text alignment
    if (this._textAlignment) {
      span.style.textAlign = this._getTextAlignValue(this._textAlignment);
      span.style.display = 'block'; // Required for text-align to work
    }

    // Apply line limit and truncation
    if (this._lineLimit !== null) {
      span.style.display = '-webkit-box';
      span.style.webkitLineClamp = String(this._lineLimit);
      span.style.webkitBoxOrient = 'vertical';
      span.style.overflow = 'hidden';
    }

    return this._applyModifiers(span);
  }

  /**
   * Converts SwiftUI font weight names to CSS values.
   *
   * @param {string} weight - SwiftUI font weight name
   * @returns {string} CSS font weight value
   * @private
   */
  _getFontWeightValue(weight) {
    const weights = {
      ultraLight: '100',
      thin: '200',
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      heavy: '800',
      black: '900'
    };
    return weights[weight] || weight;
  }

  /**
   * Converts SwiftUI text alignment to CSS values.
   *
   * @param {string} alignment - SwiftUI alignment
   * @returns {string} CSS text-align value
   * @private
   */
  _getTextAlignValue(alignment) {
    const alignments = {
      leading: 'left',
      center: 'center',
      trailing: 'right'
    };
    return alignments[alignment] || alignment;
  }
}

/**
 * Factory function for creating Text views.
 * Provides cleaner syntax without the `new` keyword.
 *
 * @param {string|number} content - The text content to display
 * @returns {TextView} A new Text view instance
 *
 * @example
 * Text('Hello, World!')
 *   .font(Font.title)
 *   .foregroundColor(Color.blue)
 */
export function Text(content) {
  return new TextView(content);
}

// Export the class for those who want to extend it
export { TextView };

export default Text;
