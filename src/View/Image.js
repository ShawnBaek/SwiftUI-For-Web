/**
 * Image - SwiftUI-style image component
 *
 * Displays images with support for various resize modes and styling.
 *
 * @example
 * Image('photo.jpg')
 *   .resizable()
 *   .aspectRatio('fill')
 *   .frame({ width: 200, height: 150 })
 *   .cornerRadius(8)
 *
 * // System symbol (SF Symbols style)
 * Image.systemName('star.fill')
 *   .foregroundColor(Color.yellow)
 */

import { View } from '../Core/View.js';

/**
 * ContentMode enum - matches SwiftUI's ContentMode
 */
export const ContentMode = {
  fit: 'fit',     // Scales to fit within bounds, maintains aspect ratio
  fill: 'fill'    // Scales to fill bounds, maintains aspect ratio (may clip)
};

/**
 * ImageView class - renders images to the DOM
 */
export class ImageView extends View {
  /**
   * Create an Image view
   *
   * @param {string} source - Image source URL or path
   */
  constructor(source) {
    super();
    this._source = source;
    this._isSystemName = false;
    this._isResizable = false;
    this._contentMode = ContentMode.fit;
    this._alt = '';
    this._renderingMode = 'original'; // 'original' or 'template'
    this._interpolation = 'high'; // 'none', 'low', 'medium', 'high'
    this._onLoadHandler = null;
    this._onErrorHandler = null;
  }

  /**
   * Create a system symbol image (like SF Symbols)
   * Maps common symbols to Unicode characters or CSS
   *
   * @param {string} systemName - The system symbol name
   * @returns {ImageView} A new ImageView configured as a system symbol
   */
  static systemName(systemName) {
    const image = new ImageView(systemName);
    image._isSystemName = true;
    return image;
  }

  /**
   * Make the image resizable
   *
   * @returns {ImageView} Returns `this` for chaining
   */
  resizable() {
    this._isResizable = true;
    return this;
  }

  /**
   * Set the aspect ratio behavior
   *
   * @param {string} contentMode - 'fit' or 'fill'
   * @returns {ImageView} Returns `this` for chaining
   */
  aspectRatio(contentMode = ContentMode.fit) {
    this._contentMode = contentMode;
    return this;
  }

  /**
   * Scale to fit within bounds
   *
   * @returns {ImageView} Returns `this` for chaining
   */
  scaledToFit() {
    this._contentMode = ContentMode.fit;
    return this;
  }

  /**
   * Scale to fill bounds
   *
   * @returns {ImageView} Returns `this` for chaining
   */
  scaledToFill() {
    this._contentMode = ContentMode.fill;
    return this;
  }

  /**
   * Set the rendering mode
   *
   * @param {string} mode - 'original' or 'template'
   * @returns {ImageView} Returns `this` for chaining
   */
  renderingMode(mode) {
    this._renderingMode = mode;
    return this;
  }

  /**
   * Set image interpolation quality
   *
   * @param {string} quality - 'none', 'low', 'medium', 'high'
   * @returns {ImageView} Returns `this` for chaining
   */
  interpolation(quality) {
    this._interpolation = quality;
    return this;
  }

  /**
   * Set alt text for accessibility
   *
   * @param {string} text - Alternative text
   * @returns {ImageView} Returns `this` for chaining
   */
  accessibilityLabel(text) {
    this._alt = text;
    return this;
  }

  /**
   * Handler called when image loads successfully
   *
   * @param {Function} handler - Callback function
   * @returns {ImageView} Returns `this` for chaining
   */
  onLoad(handler) {
    this._onLoadHandler = handler;
    return this;
  }

  /**
   * Handler called when image fails to load
   *
   * @param {Function} handler - Callback function
   * @returns {ImageView} Returns `this` for chaining
   */
  onError(handler) {
    this._onErrorHandler = handler;
    return this;
  }

  /**
   * Clip the image to a shape
   *
   * @param {string} shape - 'circle', 'rounded', or CSS border-radius value
   * @returns {ImageView} Returns `this` for chaining
   */
  clipShape(shape) {
    return this.modifier({
      apply(element) {
        element.style.overflow = 'hidden';
        if (shape === 'circle') {
          element.style.borderRadius = '50%';
        } else if (shape === 'rounded') {
          element.style.borderRadius = '8px';
        } else {
          element.style.borderRadius = shape;
        }
      }
    });
  }

  /**
   * Get the system symbol character for a given name
   *
   * @param {string} name - System symbol name
   * @returns {string} Unicode character or emoji
   * @private
   */
  _getSystemSymbol(name) {
    // Map common SF Symbol names to Unicode/emoji equivalents
    const symbols = {
      // Navigation
      'chevron.left': '‹',
      'chevron.right': '›',
      'chevron.up': '‹',
      'chevron.down': '›',
      'arrow.left': '←',
      'arrow.right': '→',
      'arrow.up': '↑',
      'arrow.down': '↓',

      // Common actions
      'plus': '+',
      'minus': '−',
      'xmark': '✕',
      'checkmark': '✓',
      'star': '☆',
      'star.fill': '★',
      'heart': '♡',
      'heart.fill': '♥',

      // Media
      'play': '▶',
      'play.fill': '▶',
      'pause': '⏸',
      'stop': '⏹',
      'forward': '⏩',
      'backward': '⏪',

      // Communication
      'envelope': '✉',
      'phone': '📞',
      'message': '💬',

      // System
      'gear': '⚙',
      'magnifyingglass': '🔍',
      'house': '🏠',
      'house.fill': '🏠',
      'person': '👤',
      'person.fill': '👤',
      'bell': '🔔',
      'bell.fill': '🔔',

      // Info
      'info.circle': 'ℹ',
      'info.circle.fill': 'ℹ',
      'questionmark.circle': '?',
      'exclamationmark.triangle': '⚠',

      // Default
      'square': '□',
      'circle': '○',
      'circle.fill': '●'
    };

    return symbols[name] || '□';
  }

  /**
   * Render the image to a DOM element
   *
   * @returns {HTMLElement} The rendered element
   * @protected
   */
  _render() {
    if (this._isSystemName) {
      // Render as a text symbol
      const span = document.createElement('span');
      span.textContent = this._getSystemSymbol(this._source);
      span.style.display = 'inline-flex';
      span.style.alignItems = 'center';
      span.style.justifyContent = 'center';
      span.style.fontFamily = 'system-ui, -apple-system, sans-serif';

      if (this._renderingMode === 'template') {
        // Template mode: use currentColor for tinting
        span.style.color = 'currentColor';
      }

      span.setAttribute('role', 'img');
      span.setAttribute('aria-label', this._alt || this._source);

      return this._applyModifiers(span);
    }

    // Regular image
    const img = document.createElement('img');
    img.src = this._source;
    img.alt = this._alt;

    // Set default styles
    img.style.display = 'block';

    // Handle resizable
    if (this._isResizable) {
      img.style.width = '100%';
      img.style.height = '100%';
    }

    // Handle content mode
    if (this._contentMode === ContentMode.fill) {
      img.style.objectFit = 'cover';
    } else {
      img.style.objectFit = 'contain';
    }

    // Handle interpolation
    const interpolationMap = {
      none: 'pixelated',
      low: 'auto',
      medium: 'auto',
      high: 'auto'
    };
    img.style.imageRendering = interpolationMap[this._interpolation] || 'auto';

    // Event handlers
    if (this._onLoadHandler) {
      img.addEventListener('load', this._onLoadHandler);
    }
    if (this._onErrorHandler) {
      img.addEventListener('error', this._onErrorHandler);
    }

    return this._applyModifiers(img);
  }
}

/**
 * Factory function to create an Image view
 *
 * @param {string} source - Image source URL or path
 * @returns {ImageView} A new ImageView instance
 */
export function Image(source) {
  return new ImageView(source);
}

// Attach static method to factory function
Image.systemName = ImageView.systemName.bind(ImageView);

export default Image;
