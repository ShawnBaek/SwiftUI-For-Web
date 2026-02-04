/**
 * Gesture - Gesture recognition system for SwiftUI-For-Web
 *
 * Matches SwiftUI's gesture system including TapGesture, LongPressGesture,
 * DragGesture, and gesture composition.
 *
 * @example
 * Text('Long press me')
 *   .onLongPressGesture(() => console.log('Long pressed!'))
 *
 * @example
 * Rectangle()
 *   .gesture(DragGesture()
 *     .onChanged((value) => console.log(value.translation))
 *     .onEnded((value) => console.log('Drag ended'))
 *   )
 */

import { View } from '../Core/View.js';

/**
 * Base Gesture class
 */
export class GestureBase {
  constructor() {
    this._onChangedHandler = null;
    this._onEndedHandler = null;
  }

  /**
   * Add handler for gesture value changes
   * @param {Function} handler - Called with gesture value during gesture
   * @returns {GestureBase} Returns this for chaining
   */
  onChanged(handler) {
    this._onChangedHandler = handler;
    return this;
  }

  /**
   * Add handler for gesture end
   * @param {Function} handler - Called with final gesture value
   * @returns {GestureBase} Returns this for chaining
   */
  onEnded(handler) {
    this._onEndedHandler = handler;
    return this;
  }

  /**
   * Apply gesture to an element
   * @param {HTMLElement} element - Element to attach gesture to
   * @internal
   */
  _apply(element) {
    // Override in subclasses
  }
}

/**
 * TapGesture - Recognizes tap/click gestures
 *
 * @example
 * TapGesture()
 *   .onEnded(() => console.log('Tapped!'))
 */
export class TapGestureRecognizer extends GestureBase {
  constructor(count = 1) {
    super();
    this._count = count;
    this._tapCount = 0;
    this._tapTimer = null;
  }

  _apply(element) {
    element.style.cursor = 'pointer';
    element.style.userSelect = 'none';

    if (this._count === 1) {
      element.addEventListener('click', (e) => {
        const value = {
          location: { x: e.clientX, y: e.clientY }
        };
        if (this._onEndedHandler) {
          this._onEndedHandler(value);
        }
      });
    } else {
      // Multi-tap (double-tap, triple-tap, etc.)
      element.addEventListener('click', (e) => {
        this._tapCount++;

        if (this._tapTimer) {
          clearTimeout(this._tapTimer);
        }

        if (this._tapCount === this._count) {
          const value = {
            location: { x: e.clientX, y: e.clientY }
          };
          if (this._onEndedHandler) {
            this._onEndedHandler(value);
          }
          this._tapCount = 0;
        } else {
          this._tapTimer = setTimeout(() => {
            this._tapCount = 0;
          }, 300);
        }
      });
    }
  }
}

/**
 * Factory function for TapGesture
 */
export function TapGesture(count = 1) {
  return new TapGestureRecognizer(count);
}

/**
 * LongPressGesture - Recognizes long press gestures
 *
 * @example
 * LongPressGesture({ minimumDuration: 0.5 })
 *   .onEnded(() => console.log('Long pressed!'))
 */
export class LongPressGestureRecognizer extends GestureBase {
  constructor(options = {}) {
    super();
    this._minimumDuration = (options.minimumDuration ?? 0.5) * 1000; // Convert to ms
    this._maximumDistance = options.maximumDistance ?? 10;
    this._timer = null;
    this._startLocation = null;
  }

  _apply(element) {
    element.style.cursor = 'pointer';
    element.style.userSelect = 'none';
    element.style.webkitTouchCallout = 'none';

    const startHandler = (e) => {
      const point = e.touches ? e.touches[0] : e;
      this._startLocation = { x: point.clientX, y: point.clientY };

      this._timer = setTimeout(() => {
        const value = {
          location: this._startLocation,
          startLocation: this._startLocation
        };

        if (this._onChangedHandler) {
          this._onChangedHandler(value);
        }
        if (this._onEndedHandler) {
          this._onEndedHandler(value);
        }

        // Add visual feedback
        element.style.opacity = '0.7';
        setTimeout(() => {
          element.style.opacity = '1';
        }, 100);
      }, this._minimumDuration);
    };

    const moveHandler = (e) => {
      if (!this._startLocation || !this._timer) return;

      const point = e.touches ? e.touches[0] : e;
      const distance = Math.sqrt(
        Math.pow(point.clientX - this._startLocation.x, 2) +
        Math.pow(point.clientY - this._startLocation.y, 2)
      );

      if (distance > this._maximumDistance) {
        this._cancel();
      }
    };

    const endHandler = () => {
      this._cancel();
    };

    element.addEventListener('mousedown', startHandler);
    element.addEventListener('mousemove', moveHandler);
    element.addEventListener('mouseup', endHandler);
    element.addEventListener('mouseleave', endHandler);

    element.addEventListener('touchstart', startHandler, { passive: true });
    element.addEventListener('touchmove', moveHandler, { passive: true });
    element.addEventListener('touchend', endHandler);
    element.addEventListener('touchcancel', endHandler);

    // Prevent context menu on long press
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  _cancel() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._startLocation = null;
  }
}

/**
 * Factory function for LongPressGesture
 */
export function LongPressGesture(options = {}) {
  return new LongPressGestureRecognizer(options);
}

/**
 * DragGesture - Recognizes drag/pan gestures
 *
 * @example
 * DragGesture({ minimumDistance: 10 })
 *   .onChanged((value) => console.log(value.translation))
 *   .onEnded((value) => console.log('Final:', value.translation))
 */
export class DragGestureRecognizer extends GestureBase {
  constructor(options = {}) {
    super();
    this._minimumDistance = options.minimumDistance ?? 10;
    this._coordinateSpace = options.coordinateSpace ?? 'local';
    this._isDragging = false;
    this._startLocation = null;
    this._currentLocation = null;
  }

  _apply(element) {
    element.style.cursor = 'grab';
    element.style.userSelect = 'none';

    const getPoint = (e) => {
      const point = e.touches ? e.touches[0] : e;
      return { x: point.clientX, y: point.clientY };
    };

    const createValue = (point) => {
      const translation = {
        width: point.x - this._startLocation.x,
        height: point.y - this._startLocation.y
      };

      const velocity = {
        width: 0,
        height: 0
      };

      return {
        startLocation: this._startLocation,
        location: point,
        translation: translation,
        velocity: velocity,
        time: Date.now()
      };
    };

    const startHandler = (e) => {
      this._startLocation = getPoint(e);
      this._currentLocation = this._startLocation;
      element.style.cursor = 'grabbing';
    };

    const moveHandler = (e) => {
      if (!this._startLocation) return;

      const point = getPoint(e);
      const distance = Math.sqrt(
        Math.pow(point.x - this._startLocation.x, 2) +
        Math.pow(point.y - this._startLocation.y, 2)
      );

      if (!this._isDragging && distance >= this._minimumDistance) {
        this._isDragging = true;
      }

      if (this._isDragging) {
        this._currentLocation = point;
        const value = createValue(point);

        if (this._onChangedHandler) {
          this._onChangedHandler(value);
        }

        // Prevent default to avoid text selection during drag
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const endHandler = (e) => {
      if (this._isDragging && this._currentLocation) {
        const value = createValue(this._currentLocation);

        if (this._onEndedHandler) {
          this._onEndedHandler(value);
        }
      }

      this._isDragging = false;
      this._startLocation = null;
      this._currentLocation = null;
      element.style.cursor = 'grab';
    };

    element.addEventListener('mousedown', startHandler);
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);

    element.addEventListener('touchstart', startHandler, { passive: true });
    element.addEventListener('touchmove', moveHandler, { passive: false });
    element.addEventListener('touchend', endHandler);
    element.addEventListener('touchcancel', endHandler);
  }
}

/**
 * Factory function for DragGesture
 */
export function DragGesture(options = {}) {
  return new DragGestureRecognizer(options);
}

/**
 * MagnificationGesture - Recognizes pinch/zoom gestures
 *
 * @example
 * MagnificationGesture()
 *   .onChanged((value) => console.log('Scale:', value.magnification))
 */
export class MagnificationGestureRecognizer extends GestureBase {
  constructor(options = {}) {
    super();
    this._minimumScaleDelta = options.minimumScaleDelta ?? 0.01;
    this._initialDistance = null;
    this._currentMagnification = 1;
  }

  _apply(element) {
    element.style.touchAction = 'none';

    // Track pinch with two fingers
    let touches = [];

    const getDistance = (t1, t2) => {
      return Math.sqrt(
        Math.pow(t2.clientX - t1.clientX, 2) +
        Math.pow(t2.clientY - t1.clientY, 2)
      );
    };

    const startHandler = (e) => {
      if (e.touches && e.touches.length === 2) {
        touches = Array.from(e.touches);
        this._initialDistance = getDistance(touches[0], touches[1]);
        this._currentMagnification = 1;
      }
    };

    const moveHandler = (e) => {
      if (e.touches && e.touches.length === 2 && this._initialDistance) {
        touches = Array.from(e.touches);
        const currentDistance = getDistance(touches[0], touches[1]);
        this._currentMagnification = currentDistance / this._initialDistance;

        const value = {
          magnification: this._currentMagnification,
          velocity: 0
        };

        if (this._onChangedHandler) {
          this._onChangedHandler(value);
        }

        e.preventDefault();
      }
    };

    const endHandler = () => {
      if (this._initialDistance) {
        const value = {
          magnification: this._currentMagnification,
          velocity: 0
        };

        if (this._onEndedHandler) {
          this._onEndedHandler(value);
        }
      }

      this._initialDistance = null;
      touches = [];
    };

    element.addEventListener('touchstart', startHandler, { passive: true });
    element.addEventListener('touchmove', moveHandler, { passive: false });
    element.addEventListener('touchend', endHandler);
    element.addEventListener('touchcancel', endHandler);

    // Also handle wheel for desktop pinch simulation
    element.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this._currentMagnification *= delta;

        const value = {
          magnification: this._currentMagnification,
          velocity: 0
        };

        if (this._onChangedHandler) {
          this._onChangedHandler(value);
        }
      }
    }, { passive: false });
  }
}

/**
 * Factory function for MagnificationGesture
 */
export function MagnificationGesture(options = {}) {
  return new MagnificationGestureRecognizer(options);
}

/**
 * RotationGesture - Recognizes two-finger rotation gestures
 */
export class RotationGestureRecognizer extends GestureBase {
  constructor(options = {}) {
    super();
    this._minimumAngleDelta = options.minimumAngleDelta ?? 0.01;
    this._initialAngle = null;
    this._currentRotation = 0;
  }

  _apply(element) {
    element.style.touchAction = 'none';

    const getAngle = (t1, t2) => {
      return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
    };

    const startHandler = (e) => {
      if (e.touches && e.touches.length === 2) {
        this._initialAngle = getAngle(e.touches[0], e.touches[1]);
        this._currentRotation = 0;
      }
    };

    const moveHandler = (e) => {
      if (e.touches && e.touches.length === 2 && this._initialAngle !== null) {
        const currentAngle = getAngle(e.touches[0], e.touches[1]);
        this._currentRotation = currentAngle - this._initialAngle;

        const value = {
          rotation: this._currentRotation,
          velocity: 0
        };

        if (this._onChangedHandler) {
          this._onChangedHandler(value);
        }

        e.preventDefault();
      }
    };

    const endHandler = () => {
      if (this._initialAngle !== null) {
        const value = {
          rotation: this._currentRotation,
          velocity: 0
        };

        if (this._onEndedHandler) {
          this._onEndedHandler(value);
        }
      }

      this._initialAngle = null;
    };

    element.addEventListener('touchstart', startHandler, { passive: true });
    element.addEventListener('touchmove', moveHandler, { passive: false });
    element.addEventListener('touchend', endHandler);
    element.addEventListener('touchcancel', endHandler);
  }
}

/**
 * Factory function for RotationGesture
 */
export function RotationGesture(options = {}) {
  return new RotationGestureRecognizer(options);
}

// Extend View with gesture methods
const extendViewWithGestures = (ViewClass) => {
  /**
   * Attach a gesture recognizer to this view
   * @param {GestureBase} gesture - Gesture recognizer to attach
   */
  ViewClass.prototype.gesture = function (gesture) {
    return this.modifier({
      apply(element) {
        if (gesture && typeof gesture._apply === 'function') {
          gesture._apply(element);
        }
      }
    });
  };

  /**
   * Add a long press gesture handler
   * @param {Function} handler - Called when long press is recognized
   * @param {Object} options - Long press options
   */
  ViewClass.prototype.onLongPressGesture = function (handler, options = {}) {
    const gesture = LongPressGesture(options).onEnded(handler);
    return this.gesture(gesture);
  };

  /**
   * Add a drag gesture handler
   * @param {Function} onChanged - Called during drag
   * @param {Function} onEnded - Called when drag ends
   */
  ViewClass.prototype.onDrag = function (onChanged, onEnded) {
    const gesture = DragGesture();
    if (onChanged) gesture.onChanged(onChanged);
    if (onEnded) gesture.onEnded(onEnded);
    return this.gesture(gesture);
  };
};

export {
  GestureBase,
  extendViewWithGestures
};

export default {
  TapGesture,
  LongPressGesture,
  DragGesture,
  MagnificationGesture,
  RotationGesture
};
