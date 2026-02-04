/**
 * View - Base class for all SwiftUI-For-Web views
 *
 * Matches SwiftUI's View protocol pattern where all UI elements
 * inherit from a common base that supports modifier chaining.
 *
 * @example
 * class Text extends View {
 *   constructor(content) {
 *     super();
 *     this._content = content;
 *   }
 *
 *   body() {
 *     return this;
 *   }
 *
 *   _render() {
 *     const el = document.createElement('span');
 *     el.textContent = this._content;
 *     return this._applyModifiers(el);
 *   }
 * }
 */
export class View {
  constructor() {
    /**
     * Array of modifiers to apply when rendering
     * @type {Array<{apply: Function}>}
     * @private
     */
    this._modifiers = [];

    /**
     * Cached DOM element after rendering
     * @type {HTMLElement|null}
     * @private
     */
    this._element = null;
  }

  /**
   * Returns the view's body content.
   * Subclasses should override this to return their child views.
   * Leaf views (like Text) return `this`.
   *
   * @returns {View} The body content
   */
  body() {
    return this;
  }

  /**
   * Add a modifier to this view.
   * Modifiers are applied in order when the view is rendered.
   *
   * @param {Object} modifier - Modifier object with an `apply(element)` method
   * @returns {View} Returns `this` for chaining
   */
  modifier(modifier) {
    this._modifiers.push(modifier);
    return this;
  }

  /**
   * Apply all modifiers to a DOM element.
   *
   * @param {HTMLElement} element - The DOM element to modify
   * @returns {HTMLElement} The modified element
   * @protected
   */
  _applyModifiers(element) {
    for (const mod of this._modifiers) {
      if (mod && typeof mod.apply === 'function') {
        mod.apply(element);
      }
    }
    return element;
  }

  /**
   * Render this view to a DOM element.
   * Subclasses should override this method.
   *
   * @returns {HTMLElement} The rendered DOM element
   * @protected
   */
  _render() {
    // Base implementation creates a container and renders body
    const content = this.body();

    if (content === this) {
      // Leaf view - subclass should override _render
      const el = document.createElement('div');
      el.dataset.view = this.constructor.name;
      return this._applyModifiers(el);
    }

    // Composite view - render the body content
    if (content instanceof View) {
      return content._render();
    }

    // Handle array of views
    if (Array.isArray(content)) {
      const fragment = document.createDocumentFragment();
      for (const child of content) {
        if (child instanceof View) {
          fragment.appendChild(child._render());
        }
      }
      const container = document.createElement('div');
      container.appendChild(fragment);
      return this._applyModifiers(container);
    }

    // Fallback
    const el = document.createElement('div');
    return this._applyModifiers(el);
  }

  /**
   * Get the rendered DOM element, creating it if necessary.
   *
   * @returns {HTMLElement} The rendered DOM element
   */
  getElement() {
    if (!this._element) {
      this._element = this._render();
    }
    return this._element;
  }

  /**
   * Force re-render of this view.
   * Replaces the existing DOM element if one exists.
   *
   * @returns {HTMLElement} The newly rendered element
   */
  rerender() {
    const oldElement = this._element;
    this._element = this._render();

    if (oldElement && oldElement.parentNode) {
      oldElement.parentNode.replaceChild(this._element, oldElement);
    }

    return this._element;
  }

  // ===========================================================================
  // Common Modifiers - These are convenience methods that create inline modifiers
  // More complex modifiers are in src/Modifier/
  // ===========================================================================

  /**
   * Set padding around the view.
   *
   * @param {number|Object} value - Padding in pixels, or object with top/right/bottom/left/horizontal/vertical
   * @returns {View} Returns `this` for chaining
   */
  padding(value) {
    return this.modifier({
      apply(element) {
        if (typeof value === 'number') {
          element.style.padding = `${value}px`;
        } else if (typeof value === 'object') {
          if (value.horizontal !== undefined) {
            element.style.paddingLeft = `${value.horizontal}px`;
            element.style.paddingRight = `${value.horizontal}px`;
          }
          if (value.vertical !== undefined) {
            element.style.paddingTop = `${value.vertical}px`;
            element.style.paddingBottom = `${value.vertical}px`;
          }
          if (value.top !== undefined) element.style.paddingTop = `${value.top}px`;
          if (value.right !== undefined) element.style.paddingRight = `${value.right}px`;
          if (value.bottom !== undefined) element.style.paddingBottom = `${value.bottom}px`;
          if (value.left !== undefined) element.style.paddingLeft = `${value.left}px`;
        }
      }
    });
  }

  /**
   * Set the frame (width/height) of the view.
   *
   * @param {Object} options - Frame options
   * @param {number} [options.width] - Width in pixels
   * @param {number} [options.height] - Height in pixels
   * @param {number} [options.minWidth] - Minimum width
   * @param {number} [options.maxWidth] - Maximum width
   * @param {number} [options.minHeight] - Minimum height
   * @param {number} [options.maxHeight] - Maximum height
   * @returns {View} Returns `this` for chaining
   */
  frame(options = {}) {
    return this.modifier({
      apply(element) {
        if (options.width !== undefined) element.style.width = `${options.width}px`;
        if (options.height !== undefined) element.style.height = `${options.height}px`;
        if (options.minWidth !== undefined) element.style.minWidth = `${options.minWidth}px`;
        if (options.maxWidth !== undefined) element.style.maxWidth = `${options.maxWidth}px`;
        if (options.minHeight !== undefined) element.style.minHeight = `${options.minHeight}px`;
        if (options.maxHeight !== undefined) element.style.maxHeight = `${options.maxHeight}px`;
      }
    });
  }

  /**
   * Set the foreground (text) color.
   *
   * @param {Object|string} color - Color object with rgba() method, or CSS color string
   * @returns {View} Returns `this` for chaining
   */
  foregroundColor(color) {
    return this.modifier({
      apply(element) {
        if (color && typeof color.rgba === 'function') {
          element.style.color = color.rgba();
        } else if (typeof color === 'string') {
          element.style.color = color;
        }
      }
    });
  }

  /**
   * Set the background color or style.
   *
   * @param {Object|string} color - Color object with rgba() method, or CSS color string
   * @returns {View} Returns `this` for chaining
   */
  background(color) {
    return this.modifier({
      apply(element) {
        if (color && typeof color.rgba === 'function') {
          element.style.backgroundColor = color.rgba();
        } else if (typeof color === 'string') {
          element.style.backgroundColor = color;
        }
      }
    });
  }

  /**
   * Set the font style.
   *
   * @param {Object|string} font - Font object with css() method, or font preset name
   * @returns {View} Returns `this` for chaining
   */
  font(font) {
    return this.modifier({
      apply(element) {
        if (font && typeof font.css === 'function') {
          const styles = font.css();
          Object.assign(element.style, styles);
        }
      }
    });
  }

  /**
   * Set the opacity of the view.
   *
   * @param {number} value - Opacity value between 0 and 1
   * @returns {View} Returns `this` for chaining
   */
  opacity(value) {
    return this.modifier({
      apply(element) {
        element.style.opacity = String(value);
      }
    });
  }

  /**
   * Set the corner radius.
   *
   * @param {number} radius - Radius in pixels
   * @returns {View} Returns `this` for chaining
   */
  cornerRadius(radius) {
    return this.modifier({
      apply(element) {
        element.style.borderRadius = `${radius}px`;
      }
    });
  }

  /**
   * Add a border to the view.
   *
   * @param {Object|string} color - Border color
   * @param {number} [width=1] - Border width in pixels
   * @returns {View} Returns `this` for chaining
   */
  border(color, width = 1) {
    return this.modifier({
      apply(element) {
        const colorValue = color && typeof color.rgba === 'function' ? color.rgba() : color;
        element.style.border = `${width}px solid ${colorValue}`;
      }
    });
  }

  /**
   * Add a shadow to the view.
   *
   * @param {Object} options - Shadow options
   * @param {Object|string} [options.color] - Shadow color
   * @param {number} [options.radius=4] - Blur radius
   * @param {number} [options.x=0] - X offset
   * @param {number} [options.y=2] - Y offset
   * @returns {View} Returns `this` for chaining
   */
  shadow(options = {}) {
    return this.modifier({
      apply(element) {
        const { color = 'rgba(0,0,0,0.2)', radius = 4, x = 0, y = 2 } = options;
        const colorValue = color && typeof color.rgba === 'function' ? color.rgba() : color;
        element.style.boxShadow = `${x}px ${y}px ${radius}px ${colorValue}`;
      }
    });
  }

  /**
   * Add a tap gesture handler.
   *
   * @param {Function} handler - Function to call when tapped/clicked
   * @returns {View} Returns `this` for chaining
   */
  onTapGesture(handler) {
    return this.modifier({
      apply(element) {
        element.style.cursor = 'pointer';
        element.addEventListener('click', handler);
      }
    });
  }

  /**
   * Add an onAppear lifecycle handler.
   *
   * @param {Function} handler - Function to call when view appears
   * @returns {View} Returns `this` for chaining
   */
  onAppear(handler) {
    return this.modifier({
      apply(element) {
        // Use requestAnimationFrame to ensure element is in DOM
        requestAnimationFrame(() => {
          if (document.contains(element)) {
            handler();
          } else {
            // Use MutationObserver to detect when added to DOM
            const observer = new MutationObserver((mutations, obs) => {
              if (document.contains(element)) {
                handler();
                obs.disconnect();
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });
          }
        });
      }
    });
  }

  /**
   * Add an onDisappear lifecycle handler.
   *
   * @param {Function} handler - Function to call when view disappears
   * @returns {View} Returns `this` for chaining
   */
  onDisappear(handler) {
    return this.modifier({
      apply(element) {
        const observer = new MutationObserver((mutations) => {
          if (!document.contains(element)) {
            handler();
            observer.disconnect();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  }

  /**
   * Clip the view to a shape.
   *
   * @param {Object|string} shape - Shape to clip to (Circle, RoundedRectangle, etc.) or shape name
   * @returns {View} Returns `this` for chaining
   */
  clipShape(shape) {
    return this.modifier({
      apply(element) {
        // Handle shape objects
        if (shape && shape.constructor) {
          const shapeName = shape.constructor.name;

          if (shapeName === 'CircleView' || shape._shapeName === 'circle') {
            element.style.borderRadius = '50%';
            element.style.overflow = 'hidden';
          } else if (shapeName === 'CapsuleView' || shape._shapeName === 'capsule') {
            element.style.borderRadius = '9999px';
            element.style.overflow = 'hidden';
          } else if (shapeName === 'RoundedRectangleView' || shape._shapeName === 'rounded-rectangle') {
            const radius = shape._cornerRadius ?? 10;
            element.style.borderRadius = `${radius}px`;
            element.style.overflow = 'hidden';
          } else if (shapeName === 'RectangleView' || shape._shapeName === 'rectangle') {
            element.style.borderRadius = '0';
            element.style.overflow = 'hidden';
          } else if (shapeName === 'EllipseView' || shape._shapeName === 'ellipse') {
            element.style.borderRadius = '50%';
            element.style.overflow = 'hidden';
          }
        }

        // Handle string shape names
        if (typeof shape === 'string') {
          switch (shape.toLowerCase()) {
            case 'circle':
              element.style.borderRadius = '50%';
              break;
            case 'capsule':
              element.style.borderRadius = '9999px';
              break;
            case 'rectangle':
              element.style.borderRadius = '0';
              break;
          }
          element.style.overflow = 'hidden';
        }
      }
    });
  }

  /**
   * Set the content shape for hit testing.
   *
   * @param {Object} shape - Shape to use for content area
   * @param {boolean} eoFill - Use even-odd fill rule
   * @returns {View} Returns `this` for chaining
   */
  contentShape(shape, eoFill = false) {
    // For web, contentShape is primarily for hit testing
    // We can approximate this with pointer-events and clip-path
    return this.clipShape(shape);
  }

  /**
   * Mask the view with another view or shape.
   *
   * @param {View|Object} mask - View or shape to use as mask
   * @param {string} alignment - Alignment of mask
   * @returns {View} Returns `this` for chaining
   */
  mask(mask, alignment = 'center') {
    return this.modifier({
      apply(element) {
        // For shapes, we can use CSS clip-path or mask-image
        if (mask && mask.constructor) {
          const shapeName = mask.constructor.name;

          if (shapeName === 'CircleView') {
            element.style.clipPath = 'circle(50%)';
          } else if (shapeName === 'EllipseView') {
            element.style.clipPath = 'ellipse(50% 50%)';
          } else if (shapeName === 'RectangleView') {
            element.style.clipPath = 'inset(0)';
          }
        }
      }
    });
  }
}

export default View;
