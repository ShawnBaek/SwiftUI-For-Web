/**
 * Font - A representation of a font with support for SwiftUI-style font constants.
 *
 * Matches SwiftUI's Font type providing system fonts and custom font creation.
 *
 * @example
 * // System font presets
 * Font.largeTitle
 * Font.title
 * Font.body
 * Font.caption
 *
 * // Custom system font
 * Font.system(20)
 * Font.system(24, Font.Weight.bold)
 * Font.system(18, Font.Weight.medium, Font.Design.rounded)
 *
 * // With modifiers
 * Font.body.bold()
 * Font.title.italic()
 */

/**
 * Font value class implementation.
 */
class FontValue {
  /**
   * Creates a new Font instance.
   *
   * @param {number} size - Font size in pixels
   * @param {string} [weight='400'] - Font weight
   * @param {string} [design='default'] - Font design
   */
  constructor(size, weight = '400', design = 'default') {
    this._size = size;
    this._weight = weight;
    this._design = design;
    this._isItalic = false;
    this._isMonospaced = false;
    this._textCase = null;
    this._leading = null;
  }

  /**
   * Returns CSS styles object for this font.
   *
   * @returns {Object} CSS styles object
   */
  css() {
    const styles = {
      fontSize: `${this._size}px`,
      fontWeight: this._weight,
    };

    // Apply font family based on design
    styles.fontFamily = this._getFontFamily();

    // Apply italic
    if (this._isItalic) {
      styles.fontStyle = 'italic';
    }

    // Apply text transform
    if (this._textCase) {
      styles.textTransform = this._textCase;
    }

    // Apply leading (line height)
    if (this._leading) {
      styles.lineHeight = this._leading;
    }

    return styles;
  }

  /**
   * Gets the font family based on design.
   *
   * @returns {string} CSS font-family value
   * @private
   */
  _getFontFamily() {
    if (this._isMonospaced) {
      return "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace";
    }

    switch (this._design) {
      case 'rounded':
        return "'SF Pro Rounded', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
      case 'serif':
        return "'New York', 'Georgia', 'Times New Roman', serif";
      case 'monospaced':
        return "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace";
      default:
        return "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";
    }
  }

  /**
   * Returns a bold version of this font.
   *
   * @returns {FontValue} New font with bold weight
   */
  bold() {
    const font = this._clone();
    font._weight = '700';
    return font;
  }

  /**
   * Returns an italic version of this font.
   *
   * @returns {FontValue} New font with italic style
   */
  italic() {
    const font = this._clone();
    font._isItalic = true;
    return font;
  }

  /**
   * Returns a monospaced version of this font.
   *
   * @returns {FontValue} New font with monospace family
   */
  monospaced() {
    const font = this._clone();
    font._isMonospaced = true;
    return font;
  }

  /**
   * Returns a version with monospaced digits.
   *
   * @returns {FontValue} New font with tabular numbers
   */
  monospacedDigit() {
    const font = this._clone();
    // This will be handled via CSS font-variant-numeric
    return font;
  }

  /**
   * Sets the font weight.
   *
   * @param {string} weight - Font weight value
   * @returns {FontValue} New font with specified weight
   */
  weight(weight) {
    const font = this._clone();
    font._weight = this._resolveWeight(weight);
    return font;
  }

  /**
   * Sets the text case transformation.
   *
   * @param {string} textCase - Text case ('uppercase', 'lowercase', 'capitalize')
   * @returns {FontValue} New font with text case
   */
  textCase(textCase) {
    const font = this._clone();
    font._textCase = textCase;
    return font;
  }

  /**
   * Sets the leading (line height).
   *
   * @param {string} leading - Leading style ('tight', 'standard', 'loose')
   * @returns {FontValue} New font with specified leading
   */
  leading(leading) {
    const font = this._clone();
    const leadingValues = {
      tight: '1.2',
      standard: '1.5',
      loose: '1.8'
    };
    font._leading = leadingValues[leading] || leading;
    return font;
  }

  /**
   * Creates a clone of this font.
   *
   * @returns {FontValue} Cloned font
   * @private
   */
  _clone() {
    const font = new FontValue(this._size, this._weight, this._design);
    font._isItalic = this._isItalic;
    font._isMonospaced = this._isMonospaced;
    font._textCase = this._textCase;
    font._leading = this._leading;
    return font;
  }

  /**
   * Resolves weight name to CSS value.
   *
   * @param {string} weight - Weight name or value
   * @returns {string} CSS font weight
   * @private
   */
  _resolveWeight(weight) {
    if (typeof weight === 'string' && Font.Weight[weight]) {
      return Font.Weight[weight];
    }
    return weight;
  }
}

/**
 * Font factory and namespace for SwiftUI-style font constants.
 */
const Font = {
  // ===========================================================================
  // Font Weights
  // ===========================================================================

  Weight: {
    ultraLight: '100',
    thin: '200',
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
    black: '900'
  },

  // ===========================================================================
  // Font Designs
  // ===========================================================================

  Design: {
    default: 'default',
    rounded: 'rounded',
    serif: 'serif',
    monospaced: 'monospaced'
  },

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  /**
   * Creates a system font with specified size, weight, and design.
   *
   * @param {number} size - Font size in pixels
   * @param {string} [weight] - Font weight (use Font.Weight constants)
   * @param {string} [design] - Font design (use Font.Design constants)
   * @returns {FontValue} New font instance
   */
  system(size, weight = Font.Weight.regular, design = Font.Design.default) {
    const resolvedWeight = Font.Weight[weight] || weight;
    return new FontValue(size, resolvedWeight, design);
  },

  /**
   * Creates a custom font with specified name and size.
   *
   * @param {string} name - Font family name
   * @param {number} size - Font size in pixels
   * @returns {FontValue} New font instance
   */
  custom(name, size) {
    const font = new FontValue(size);
    font._customFamily = name;
    font._getFontFamily = () => `'${name}', sans-serif`;
    return font;
  },

  // ===========================================================================
  // SwiftUI Text Styles (matching iOS Dynamic Type sizes)
  // ===========================================================================

  /** Extra large title style (34pt) */
  largeTitle: new FontValue(34, '400'),

  /** Primary title style (28pt) */
  title: new FontValue(28, '400'),

  /** Secondary title style (22pt) */
  title2: new FontValue(22, '400'),

  /** Tertiary title style (20pt) */
  title3: new FontValue(20, '400'),

  /** Headline style (17pt semibold) */
  headline: new FontValue(17, '600'),

  /** Subheadline style (15pt) */
  subheadline: new FontValue(15, '400'),

  /** Body text style (17pt) */
  body: new FontValue(17, '400'),

  /** Callout style (16pt) */
  callout: new FontValue(16, '400'),

  /** Footnote style (13pt) */
  footnote: new FontValue(13, '400'),

  /** Caption style (12pt) */
  caption: new FontValue(12, '400'),

  /** Secondary caption style (11pt) */
  caption2: new FontValue(11, '400'),
};

// Export both the Font namespace and FontValue class
export { Font, FontValue };
export default Font;
