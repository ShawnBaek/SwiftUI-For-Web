/**
 * Color - A representation of a color with support for SwiftUI-style color constants.
 *
 * Matches SwiftUI's Color type providing system colors and custom color creation.
 *
 * @example
 * // System colors
 * Color.blue
 * Color.red
 * Color.primary
 *
 * // Custom colors
 * Color.rgb(255, 0, 0)
 * Color.rgba(255, 0, 0, 0.5)
 * Color.hex('#FF0000')
 *
 * // With opacity
 * Color.blue.opacity(0.5)
 */

/**
 * Color class implementation.
 */
class ColorValue {
  /**
   * Creates a new Color instance.
   *
   * @param {number} r - Red component (0-255)
   * @param {number} g - Green component (0-255)
   * @param {number} b - Blue component (0-255)
   * @param {number} [a=1] - Alpha component (0-1)
   */
  constructor(r, g, b, a = 1) {
    this._r = r;
    this._g = g;
    this._b = b;
    this._a = a;
  }

  /**
   * Returns the color as an RGBA CSS string.
   *
   * @returns {string} CSS rgba() color string
   */
  rgba() {
    return `rgba(${this._r}, ${this._g}, ${this._b}, ${this._a})`;
  }

  /**
   * Returns the color as an RGB CSS string (ignores alpha).
   *
   * @returns {string} CSS rgb() color string
   */
  rgb() {
    return `rgb(${this._r}, ${this._g}, ${this._b})`;
  }

  /**
   * Returns the color as a hex string.
   *
   * @returns {string} Hex color string (e.g., '#FF0000')
   */
  hex() {
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(this._r)}${toHex(this._g)}${toHex(this._b)}`;
  }

  /**
   * Creates a new color with the specified opacity.
   *
   * @param {number} value - Opacity value (0-1)
   * @returns {ColorValue} New color with adjusted opacity
   */
  opacity(value) {
    return new ColorValue(this._r, this._g, this._b, value);
  }

  /**
   * Returns the CSS string representation (alias for rgba).
   *
   * @returns {string} CSS color string
   */
  toString() {
    return this.rgba();
  }

  /**
   * Returns the CSS string for use in styles.
   *
   * @returns {string} CSS color string
   */
  css() {
    return this.rgba();
  }
}

/**
 * Color factory and namespace for SwiftUI-style color constants.
 */
const Color = {
  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  /**
   * Creates a color from RGB values.
   *
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {ColorValue} New color instance
   */
  rgb(r, g, b) {
    return new ColorValue(r, g, b, 1);
  },

  /**
   * Creates a color from RGBA values.
   *
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @param {number} a - Alpha (0-1)
   * @returns {ColorValue} New color instance
   */
  rgba(r, g, b, a) {
    return new ColorValue(r, g, b, a);
  },

  /**
   * Creates a color from a hex string.
   *
   * @param {string} hexString - Hex color (e.g., '#FF0000' or 'FF0000')
   * @returns {ColorValue} New color instance
   */
  hex(hexString) {
    let hex = hexString.replace('#', '');

    // Handle shorthand hex (e.g., 'F00' -> 'FF0000')
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return new ColorValue(r, g, b, 1);
  },

  /**
   * Creates a color from HSL values.
   *
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {ColorValue} New color instance
   */
  hsl(h, s, l) {
    // Convert HSL to RGB
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }

    return new ColorValue(
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
      1
    );
  },

  // ===========================================================================
  // SwiftUI System Colors (iOS/macOS)
  // ===========================================================================

  /** Standard blue color */
  blue: new ColorValue(0, 122, 255),

  /** Standard green color */
  green: new ColorValue(52, 199, 89),

  /** Standard indigo color */
  indigo: new ColorValue(88, 86, 214),

  /** Standard orange color */
  orange: new ColorValue(255, 149, 0),

  /** Standard pink color */
  pink: new ColorValue(255, 45, 85),

  /** Standard purple color */
  purple: new ColorValue(175, 82, 222),

  /** Standard red color */
  red: new ColorValue(255, 59, 48),

  /** Standard teal color */
  teal: new ColorValue(90, 200, 250),

  /** Standard yellow color */
  yellow: new ColorValue(255, 204, 0),

  /** Standard cyan color */
  cyan: new ColorValue(50, 173, 230),

  /** Standard mint color */
  mint: new ColorValue(0, 199, 190),

  /** Standard brown color */
  brown: new ColorValue(162, 132, 94),

  // ===========================================================================
  // Gray Scale
  // ===========================================================================

  /** Standard gray color */
  gray: new ColorValue(142, 142, 147),

  /** Secondary gray */
  gray2: new ColorValue(174, 174, 178),

  /** Tertiary gray */
  gray3: new ColorValue(199, 199, 204),

  /** Quaternary gray */
  gray4: new ColorValue(209, 209, 214),

  /** Quinary gray */
  gray5: new ColorValue(229, 229, 234),

  /** Senary gray */
  gray6: new ColorValue(242, 242, 247),

  // ===========================================================================
  // Semantic Colors
  // ===========================================================================

  /** Primary content color (adapts to light/dark mode) */
  primary: new ColorValue(0, 0, 0),

  /** Secondary content color */
  secondary: new ColorValue(142, 142, 147),

  /** Tertiary content color */
  tertiary: new ColorValue(199, 199, 204),

  /** Quaternary content color */
  quaternary: new ColorValue(209, 209, 214),

  // ===========================================================================
  // Background Colors
  // ===========================================================================

  /** Primary background color */
  background: new ColorValue(255, 255, 255),

  /** Secondary background color */
  secondarySystemBackground: new ColorValue(242, 242, 247),

  /** Tertiary background color */
  tertiarySystemBackground: new ColorValue(255, 255, 255),

  /** Grouped background color */
  systemGroupedBackground: new ColorValue(242, 242, 247),

  /** Secondary grouped background */
  secondarySystemGroupedBackground: new ColorValue(255, 255, 255),

  /** Tertiary grouped background */
  tertiarySystemGroupedBackground: new ColorValue(242, 242, 247),

  // ===========================================================================
  // Label Colors
  // ===========================================================================

  /** Primary label color */
  label: new ColorValue(0, 0, 0),

  /** Secondary label color */
  secondaryLabel: new ColorValue(60, 60, 67, 0.6),

  /** Tertiary label color */
  tertiaryLabel: new ColorValue(60, 60, 67, 0.3),

  /** Quaternary label color */
  quaternaryLabel: new ColorValue(60, 60, 67, 0.18),

  // ===========================================================================
  // Other UI Colors
  // ===========================================================================

  /** Link color */
  link: new ColorValue(0, 122, 255),

  /** Placeholder text color */
  placeholderText: new ColorValue(60, 60, 67, 0.3),

  /** Separator color */
  separator: new ColorValue(60, 60, 67, 0.29),

  /** Opaque separator color */
  opaqueSeparator: new ColorValue(198, 198, 200),

  // ===========================================================================
  // Basic Colors
  // ===========================================================================

  /** Pure white */
  white: new ColorValue(255, 255, 255),

  /** Pure black */
  black: new ColorValue(0, 0, 0),

  /** Fully transparent */
  clear: new ColorValue(0, 0, 0, 0),

  // ===========================================================================
  // Accent Color
  // ===========================================================================

  /** System accent color (defaults to blue) */
  accentColor: new ColorValue(0, 122, 255),
};

// Export both the Color namespace and ColorValue class
export { Color, ColorValue };
export default Color;
