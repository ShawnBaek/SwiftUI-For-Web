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

/**
 * Add listeners to targets and return one function that removes them all.
 * Every recognizer returns this from _apply, so a view that is released
 * (its owner disposed, or its element returned to the pool) leaves no
 * listeners behind.
 *
 * @returns {{ on: Function, dispose: Function }}
 */
function listenerGroup() {
  const removers = [];
  return {
    on(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      removers.push(() => target.removeEventListener(type, handler, options));
    },
    dispose() {
      while (removers.length) removers.pop()();
    }
  };
}

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
  }

  _apply(element) {
    element.style.cursor = 'pointer';
    element.style.userSelect = 'none';

    const listeners = listenerGroup();
    let tapCount = 0;
    let tapTimer = null;

    listeners.on(element, 'click', (e) => {
      const value = { location: { x: e.clientX, y: e.clientY } };
      if (this._count === 1) {
        if (this._onEndedHandler) this._onEndedHandler(value);
        return;
      }
      // Multi-tap (double-tap, triple-tap, etc.)
      tapCount++;
      if (tapTimer) clearTimeout(tapTimer);
      tapTimer = null;
      if (tapCount === this._count) {
        tapCount = 0;
        if (this._onEndedHandler) this._onEndedHandler(value);
      } else {
        tapTimer = setTimeout(() => { tapCount = 0; tapTimer = null; }, 300);
      }
    });

    return () => {
      if (tapTimer) clearTimeout(tapTimer);
      listeners.dispose();
    };
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
  }

  _apply(element) {
    element.style.cursor = 'pointer';
    element.style.userSelect = 'none';
    element.style.webkitTouchCallout = 'none';

    // Per-element state: one recognizer may be attached to several elements
    // (a descriptor rendered in a ForEach).
    const listeners = listenerGroup();
    let timer = null;
    let feedbackTimer = null;
    let startLocation = null;

    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      startLocation = null;
    };

    const startHandler = (e) => {
      const point = e.touches ? e.touches[0] : e;
      startLocation = { x: point.clientX, y: point.clientY };
      if (timer) clearTimeout(timer);

      timer = setTimeout(() => {
        timer = null;
        const value = { location: startLocation, startLocation };
        if (this._onChangedHandler) this._onChangedHandler(value);
        if (this._onEndedHandler) this._onEndedHandler(value);

        // Visual feedback
        element.style.opacity = '0.7';
        feedbackTimer = setTimeout(() => {
          feedbackTimer = null;
          element.style.opacity = '1';
        }, 100);
      }, this._minimumDuration);
    };

    const moveHandler = (e) => {
      if (!startLocation || !timer) return;
      const point = e.touches ? e.touches[0] : e;
      const distance = Math.hypot(point.clientX - startLocation.x, point.clientY - startLocation.y);
      if (distance > this._maximumDistance) cancel();
    };

    listeners.on(element, 'mousedown', startHandler);
    listeners.on(element, 'mousemove', moveHandler);
    listeners.on(element, 'mouseup', cancel);
    listeners.on(element, 'mouseleave', cancel);

    listeners.on(element, 'touchstart', startHandler, { passive: true });
    listeners.on(element, 'touchmove', moveHandler, { passive: true });
    listeners.on(element, 'touchend', cancel);
    listeners.on(element, 'touchcancel', cancel);

    // Prevent context menu on long press
    listeners.on(element, 'contextmenu', (e) => e.preventDefault());

    return () => {
      cancel();
      if (feedbackTimer) clearTimeout(feedbackTimer);
      listeners.dispose();
    };
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
  }

  _apply(element) {
    element.style.cursor = 'grab';
    element.style.userSelect = 'none';

    const listeners = listenerGroup();
    let isDragging = false;
    let startLocation = null;
    let currentLocation = null;

    const getPoint = (e) => {
      const point = e.touches ? e.touches[0] : e;
      return { x: point.clientX, y: point.clientY };
    };

    const createValue = (point) => ({
      startLocation,
      location: point,
      translation: {
        width: point.x - startLocation.x,
        height: point.y - startLocation.y
      },
      velocity: { width: 0, height: 0 },
      time: Date.now()
    });

    const startHandler = (e) => {
      startLocation = getPoint(e);
      currentLocation = startLocation;
      element.style.cursor = 'grabbing';
    };

    const moveHandler = (e) => {
      if (!startLocation) return;

      const point = getPoint(e);
      const distance = Math.hypot(point.x - startLocation.x, point.y - startLocation.y);

      if (!isDragging && distance >= this._minimumDistance) {
        isDragging = true;
      }

      if (isDragging) {
        currentLocation = point;
        if (this._onChangedHandler) this._onChangedHandler(createValue(point));
        // Prevent default to avoid text selection during drag
        if (e.cancelable) e.preventDefault();
      }
    };

    const endHandler = () => {
      if (!startLocation) return;
      if (isDragging && currentLocation && this._onEndedHandler) {
        this._onEndedHandler(createValue(currentLocation));
      }
      isDragging = false;
      startLocation = null;
      currentLocation = null;
      element.style.cursor = 'grab';
    };

    // Mouse moves are tracked on the document so a drag continues outside
    // the element; dispose removes those listeners too.
    const doc = element.ownerDocument || document;
    listeners.on(element, 'mousedown', startHandler);
    listeners.on(doc, 'mousemove', moveHandler);
    listeners.on(doc, 'mouseup', endHandler);

    listeners.on(element, 'touchstart', startHandler, { passive: true });
    listeners.on(element, 'touchmove', moveHandler, { passive: false });
    listeners.on(element, 'touchend', endHandler);
    listeners.on(element, 'touchcancel', endHandler);

    return listeners.dispose;
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
  }

  _apply(element) {
    element.style.touchAction = 'none';

    const listeners = listenerGroup();
    let initialDistance = null;
    let magnification = 1;

    const getDistance = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const startHandler = (e) => {
      if (e.touches && e.touches.length === 2) {
        initialDistance = getDistance(e.touches[0], e.touches[1]);
        magnification = 1;
      }
    };

    const moveHandler = (e) => {
      if (e.touches && e.touches.length === 2 && initialDistance) {
        magnification = getDistance(e.touches[0], e.touches[1]) / initialDistance;
        if (this._onChangedHandler) this._onChangedHandler({ magnification, velocity: 0 });
        e.preventDefault();
      }
    };

    const endHandler = () => {
      if (initialDistance && this._onEndedHandler) {
        this._onEndedHandler({ magnification, velocity: 0 });
      }
      initialDistance = null;
    };

    listeners.on(element, 'touchstart', startHandler, { passive: true });
    listeners.on(element, 'touchmove', moveHandler, { passive: false });
    listeners.on(element, 'touchend', endHandler);
    listeners.on(element, 'touchcancel', endHandler);

    // Trackpad pinch arrives as a wheel event with ctrlKey on desktop.
    listeners.on(element, 'wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        magnification *= e.deltaY > 0 ? 0.9 : 1.1;
        if (this._onChangedHandler) this._onChangedHandler({ magnification, velocity: 0 });
      }
    }, { passive: false });

    return listeners.dispose;
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
  }

  _apply(element) {
    element.style.touchAction = 'none';

    const listeners = listenerGroup();
    let initialAngle = null;
    let rotation = 0;

    const getAngle = (t1, t2) => Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);

    const startHandler = (e) => {
      if (e.touches && e.touches.length === 2) {
        initialAngle = getAngle(e.touches[0], e.touches[1]);
        rotation = 0;
      }
    };

    const moveHandler = (e) => {
      if (e.touches && e.touches.length === 2 && initialAngle !== null) {
        rotation = getAngle(e.touches[0], e.touches[1]) - initialAngle;
        if (this._onChangedHandler) this._onChangedHandler({ rotation, velocity: 0 });
        e.preventDefault();
      }
    };

    const endHandler = () => {
      if (initialAngle !== null && this._onEndedHandler) {
        this._onEndedHandler({ rotation, velocity: 0 });
      }
      initialAngle = null;
    };

    listeners.on(element, 'touchstart', startHandler, { passive: true });
    listeners.on(element, 'touchmove', moveHandler, { passive: false });
    listeners.on(element, 'touchend', endHandler);
    listeners.on(element, 'touchcancel', endHandler);

    return listeners.dispose;
  }
}

/**
 * Factory function for RotationGesture
 */
export function RotationGesture(options = {}) {
  return new RotationGestureRecognizer(options);
}

// =============================================================================
// Modifier implementations, shared by descriptor views (Chainable) and the
// legacy View prototype. Each returns { apply(element) }, where apply returns
// a function that removes the gesture's listeners.
// =============================================================================

/**
 * `.gesture(_:)`: attach a gesture recognizer.
 * @see https://developer.apple.com/documentation/swiftui/view/gesture(_:including:)
 * @param {GestureBase} gesture
 */
export function gestureModifier(gesture) {
  return {
    gesture,
    apply(element) {
      if (gesture && typeof gesture._apply === 'function') {
        return gesture._apply(element);
      }
      return undefined;
    }
  };
}

/**
 * `.onLongPressGesture(perform:)`.
 * @see https://developer.apple.com/documentation/swiftui/view/onlongpressgesture(minimumduration:maximumdistance:perform:onpressingchanged:)
 */
export function longPressGestureModifier(handler, options = {}) {
  return gestureModifier(LongPressGesture(options).onEnded(handler));
}

/**
 * `.onDrag(onChanged, onEnded)`: a DragGesture with both handlers.
 */
export function dragGestureModifier(onChanged, onEnded) {
  const gesture = DragGesture();
  if (onChanged) gesture.onChanged(onChanged);
  if (onEnded) gesture.onEnded(onEnded);
  return gestureModifier(gesture);
}

// Extend View with gesture methods
const extendViewWithGestures = (ViewClass) => {
  /**
   * Attach a gesture recognizer to this view
   * @param {GestureBase} gesture - Gesture recognizer to attach
   */
  ViewClass.prototype.gesture = function (gesture) {
    return this.modifier(gestureModifier(gesture));
  };

  /**
   * Add a long press gesture handler
   * @param {Function} handler - Called when long press is recognized
   * @param {Object} options - Long press options
   */
  ViewClass.prototype.onLongPressGesture = function (handler, options = {}) {
    return this.modifier(longPressGestureModifier(handler, options));
  };

  /**
   * Add a drag gesture handler
   * @param {Function} onChanged - Called during drag
   * @param {Function} onEnded - Called when drag ends
   */
  ViewClass.prototype.onDrag = function (onChanged, onEnded) {
    return this.modifier(dragGestureModifier(onChanged, onEnded));
  };
};

export {
  extendViewWithGestures
};

export default {
  TapGesture,
  LongPressGesture,
  DragGesture,
  MagnificationGesture,
  RotationGesture
};
