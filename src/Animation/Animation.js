/**
 * Animation - SwiftUI-style animation system
 *
 * Follows SwiftUI's official animation approach:
 * 1. Implicit Animation - .animation(_, value:) modifier
 * 2. Explicit Animation - withAnimation {} wrapper
 * 3. Transitions - .transition() for view insertion/removal
 * 4. matchedGeometryEffect - ID-based hero animations
 *
 * @see https://developer.apple.com/documentation/swiftui/animations
 * @see https://fatbobman.com/en/snippet/swiftui-implicit-vs-explicit-animations/
 *
 * @example
 * // Implicit animation (on view)
 * Text(count.value)
 *   .animation(Animation.spring(), count)
 *
 * // Explicit animation (wrapping state change)
 * withAnimation(Animation.easeInOut(0.3), () => {
 *   isExpanded.value = true;
 * });
 */

// =============================================================================
// Animation Class - Matches SwiftUI's Animation type
// =============================================================================

/**
 * Animation timing curves and configurations
 * Matches SwiftUI's Animation API exactly
 */
export class Animation {
  /**
   * Creates an Animation configuration
   *
   * @param {Object} options - Animation options
   * @param {number} [options.duration=0.35] - Duration in seconds
   * @param {string} [options.timingFunction='ease'] - CSS timing function
   * @param {number} [options.delay=0] - Delay in seconds
   * @param {number} [options.repeatCount=1] - Number of repetitions
   * @param {boolean} [options.autoreverses=false] - Auto-reverse on each iteration
   */
  constructor(options = {}) {
    this._duration = options.duration ?? 0.35;
    this._timingFunction = options.timingFunction ?? 'ease';
    this._delay = options.delay ?? 0;
    this._repeatCount = options.repeatCount ?? 1;
    this._autoreverses = options.autoreverses ?? false;
  }

  /**
   * Get duration in seconds
   * @returns {number}
   */
  get duration() {
    return this._duration;
  }

  /**
   * Get CSS timing function
   * @returns {string}
   */
  get timingFunction() {
    return this._timingFunction;
  }

  /**
   * Get delay in seconds
   * @returns {number}
   */
  get delay() {
    return this._delay;
  }

  /**
   * Convert to CSS transition string
   * @returns {string}
   */
  toCSS() {
    return `all ${this._duration}s ${this._timingFunction} ${this._delay}s`;
  }

  /**
   * Convert to Web Animations API keyframe effect options.
   * The Web Animations API provides better performance than CSS transitions
   * because it runs on the compositor thread and avoids main thread jank.
   *
   * @returns {Object} KeyframeEffect options
   */
  toWAAPIOptions() {
    return {
      duration: this._duration * 1000,
      easing: this._timingFunction,
      delay: this._delay * 1000,
      iterations: this._repeatCount === Infinity ? Infinity : this._repeatCount,
      direction: this._autoreverses ? 'alternate' : 'normal',
      fill: 'forwards',
    };
  }

  /**
   * Animate an element using native browser animation APIs.
   *
   * @param {HTMLElement} element   - Target DOM element
   * @param {Object}      from      - Starting state: { opacity, transform, scale, x, y, … }
   * @param {Object}      to        - Ending state (same keys)
   * @param {Object}      [options] - Extra options: { completion, properties }
   * @returns {Animation|null} WAAPI Animation object, or null
   *
   * @example
   * // Opens a card from its thumbnail position to full-screen
   * Animation.easeOut(0.22).animate(
   *   cardEl,
   *   { transform: thumbnailTransform, opacity: 0 },
   *   { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }
   * );
   *
   * // With completion callback
   * Animation.easeIn(0.18).animate(
   *   backdropEl,
   *   { opacity: 1 }, { opacity: 0 },
   *   { onComplete: () => overlay.style.visibility = 'hidden' }
   * );
   */
  animate(element, from, to, options = {}) {
    if (!element) return null;
    const properties = options.properties ?? Object.keys({ ...from, ...to });
    const compositorProperties = properties.filter(property =>
      property === 'transform' || property === 'opacity'
    );

    if (compositorProperties.length > 0) {
      element.style.willChange = compositorProperties.join(', ');
    }

    if (typeof element.animate === 'function') {
      try {
        const player = element.animate([from, to], this.toWAAPIOptions());
        player.onfinish = () => {
          Object.assign(element.style, to);
          element.style.willChange = '';
          if (typeof options.completion === 'function') options.completion();
        };
        return player;
      } catch {
        // Fall through to CSS transitions.
      }
    }

    Object.assign(element.style, from);
    element.style.transition = this.toCSS();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        Object.assign(element.style, to);
      });
    });

    return null;
  }

  // ===========================================================================
  // Static Factory Methods - Match SwiftUI Animation presets exactly
  // ===========================================================================

  /**
   * A default animation instance
   * @returns {Animation}
   */
  static get default() {
    return new Animation({ duration: 0.35, timingFunction: 'ease' });
  }

  /**
   * An animation with a linear timing curve
   * @param {number} [duration=0.35] - Duration in seconds
   * @returns {Animation}
   */
  static linear(duration = 0.35) {
    if (typeof duration === 'object') {
      return new Animation({ ...duration, timingFunction: 'linear' });
    }
    return new Animation({ duration, timingFunction: 'linear' });
  }

  /**
   * An animation that starts slowly and speeds up
   * @param {number} [duration=0.35] - Duration in seconds
   * @returns {Animation}
   */
  static easeIn(duration = 0.35) {
    if (typeof duration === 'object') {
      return new Animation({ ...duration, timingFunction: 'ease-in' });
    }
    return new Animation({ duration, timingFunction: 'ease-in' });
  }

  /**
   * An animation that starts quickly and slows down
   * @param {number} [duration=0.35] - Duration in seconds
   * @returns {Animation}
   */
  static easeOut(duration = 0.35) {
    if (typeof duration === 'object') {
      return new Animation({ ...duration, timingFunction: 'ease-out' });
    }
    return new Animation({ duration, timingFunction: 'ease-out' });
  }

  /**
   * An animation that starts slowly, speeds up, then slows down
   * @param {number} [duration=0.35] - Duration in seconds
   * @returns {Animation}
   */
  static easeInOut(duration = 0.35) {
    if (typeof duration === 'object') {
      return new Animation({ ...duration, timingFunction: 'ease-in-out' });
    }
    return new Animation({ duration, timingFunction: 'ease-in-out' });
  }

  /**
   * A spring animation with default parameters
   * @param {Object} [options] - Spring options
   * @param {number} [options.response=0.5] - Response time (affects duration)
   * @param {number} [options.dampingFraction=0.825] - Damping ratio (0 = no damping, 1 = critical)
   * @param {number} [options.blendDuration=0] - Blend duration
   * @returns {Animation}
   */
  static spring(options = {}) {
    const { response = 0.5, dampingFraction = 0.825, blendDuration = 0 } = options;

    // Convert spring parameters to CSS cubic-bezier approximation
    // Based on SwiftUI's spring animation behavior
    let bezier;
    if (dampingFraction < 0.5) {
      // Very bouncy
      bezier = 'cubic-bezier(0.5, 1.8, 0.5, 0.8)';
    } else if (dampingFraction < 0.8) {
      // Bouncy
      bezier = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    } else if (dampingFraction < 1) {
      // Slightly bouncy
      bezier = 'cubic-bezier(0.22, 1, 0.36, 1)';
    } else {
      // Critically damped (no bounce)
      bezier = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
    }

    return new Animation({ duration: response, timingFunction: bezier });
  }

  /**
   * A spring animation suitable for interactive gestures
   * @returns {Animation}
   */
  static get interactiveSpring() {
    return Animation.spring({ response: 0.15, dampingFraction: 0.86 });
  }

  /**
   * A smooth spring animation
   * @returns {Animation}
   */
  static get smooth() {
    return Animation.spring({ response: 0.5, dampingFraction: 1 });
  }

  /**
   * A snappy spring animation
   * @returns {Animation}
   */
  static get snappy() {
    return Animation.spring({ response: 0.3, dampingFraction: 0.85 });
  }

  /**
   * A bouncy spring animation
   * @returns {Animation}
   */
  static get bouncy() {
    return Animation.spring({ response: 0.5, dampingFraction: 0.7 });
  }

  // ===========================================================================
  // Instance Modifiers - Chain to customize animation
  // ===========================================================================

  /**
   * Adds a delay before the animation starts
   * @param {number} delay - Delay in seconds
   * @returns {Animation} New Animation with delay
   */
  delay(delay) {
    return new Animation({
      duration: this._duration,
      timingFunction: this._timingFunction,
      delay,
      repeatCount: this._repeatCount,
      autoreverses: this._autoreverses
    });
  }

  /**
   * Sets the animation speed multiplier
   * @param {number} speed - Speed multiplier (2 = twice as fast)
   * @returns {Animation} New Animation with adjusted speed
   */
  speed(speed) {
    return new Animation({
      duration: this._duration / speed,
      timingFunction: this._timingFunction,
      delay: this._delay,
      repeatCount: this._repeatCount,
      autoreverses: this._autoreverses
    });
  }

  /**
   * Repeats the animation a specific number of times
   * @param {number} count - Number of repetitions
   * @param {boolean} [autoreverses=false] - Auto-reverse on each iteration
   * @returns {Animation} New Animation with repeat
   */
  repeatCount(count, autoreverses = false) {
    return new Animation({
      duration: this._duration,
      timingFunction: this._timingFunction,
      delay: this._delay,
      repeatCount: count,
      autoreverses
    });
  }

  /**
   * Repeats the animation forever
   * @param {boolean} [autoreverses=false] - Auto-reverse on each iteration
   * @returns {Animation} New Animation that repeats forever
   */
  repeatForever(autoreverses = false) {
    return this.repeatCount(Infinity, autoreverses);
  }
}

// =============================================================================
// AnyTransition - Matches SwiftUI's AnyTransition type
// =============================================================================

/**
 * AnyTransition - Describes how a view appears or disappears
 * Matches SwiftUI's AnyTransition API
 */
export class AnyTransition {
  /**
   * Creates a transition
   * @param {Object} options - Transition options
   * @param {Object} options.insertion - Styles for view insertion
   * @param {Object} options.removal - Styles for view removal
   */
  constructor(options = {}) {
    this._insertion = options.insertion ?? {};
    this._removal = options.removal ?? {};
    this._animation = options.animation ?? Animation.default;
  }

  /**
   * Get insertion styles (initial state when appearing)
   * @returns {Object}
   */
  get insertion() {
    return this._insertion;
  }

  /**
   * Get removal styles (final state when disappearing)
   * @returns {Object}
   */
  get removal() {
    return this._removal;
  }

  // ===========================================================================
  // Static Factory Methods - Built-in transitions matching SwiftUI
  // ===========================================================================

  /**
   * A transition that fades the view in/out
   * @returns {AnyTransition}
   */
  static get opacity() {
    return new AnyTransition({
      insertion: { opacity: '0' },
      removal: { opacity: '0' }
    });
  }

  /**
   * A transition that scales the view
   * @param {number} [scale=0] - Scale value (0 = invisible, 1 = full size)
   * @returns {AnyTransition}
   */
  static scale(scale = 0) {
    const scaleValue = typeof scale === 'number' ? scale : 0;
    return new AnyTransition({
      insertion: { transform: `scale(${scaleValue})` },
      removal: { transform: `scale(${scaleValue})` }
    });
  }

  /**
   * A transition that slides the view in from one edge
   * @returns {AnyTransition}
   */
  static get slide() {
    return new AnyTransition({
      insertion: { transform: 'translateX(-100%)' },
      removal: { transform: 'translateX(100%)' }
    });
  }

  /**
   * A transition that moves the view from a specific edge
   * @param {string} edge - 'top', 'bottom', 'leading', 'trailing'
   * @returns {AnyTransition}
   */
  static move(edge) {
    const transforms = {
      top: 'translateY(-100%)',
      bottom: 'translateY(100%)',
      leading: 'translateX(-100%)',
      trailing: 'translateX(100%)'
    };
    const transform = transforms[edge] ?? transforms.leading;
    return new AnyTransition({
      insertion: { transform },
      removal: { transform }
    });
  }

  /**
   * A push transition (like navigation)
   * @param {string} edge - 'top', 'bottom', 'leading', 'trailing'
   * @returns {AnyTransition}
   */
  static push(edge) {
    return AnyTransition.move(edge);
  }

  /**
   * The identity transition (no animation)
   * @returns {AnyTransition}
   */
  static get identity() {
    return new AnyTransition({
      insertion: {},
      removal: {}
    });
  }

  // ===========================================================================
  // Instance Methods - Combine and customize transitions
  // ===========================================================================

  /**
   * Combines this transition with another
   * @param {AnyTransition} other - Another transition to combine
   * @returns {AnyTransition} Combined transition
   */
  combined(other) {
    return new AnyTransition({
      insertion: { ...this._insertion, ...other._insertion },
      removal: { ...this._removal, ...other._removal },
      animation: this._animation
    });
  }

  /**
   * Creates an asymmetric transition with different insertion/removal
   * @param {AnyTransition} insertion - Transition for insertion
   * @param {AnyTransition} removal - Transition for removal
   * @returns {AnyTransition}
   */
  static asymmetric(insertion, removal) {
    return new AnyTransition({
      insertion: insertion._insertion,
      removal: removal._removal
    });
  }

  /**
   * Associates an animation with this transition
   * @param {Animation} animation - Animation to use
   * @returns {AnyTransition}
   */
  animation(animation) {
    return new AnyTransition({
      insertion: this._insertion,
      removal: this._removal,
      animation
    });
  }
}

// =============================================================================
// Namespace - For matchedGeometryEffect (ID-based animations)
// =============================================================================

let _namespaceCounter = 0;

/**
 * Creates a namespace for matchedGeometryEffect
 * Equivalent to SwiftUI's @Namespace property wrapper
 * @returns {Object} Namespace object
 */
export function Namespace() {
  const id = `ns-${++_namespaceCounter}`;
  return {
    id,
    /**
     * Get a unique identifier for a view in this namespace
     * @param {string} viewId - View identifier
     * @returns {string} Full view-transition-name
     */
    name(viewId) {
      return `${id}-${viewId}`;
    }
  };
}

// =============================================================================
// Global Animation State
// =============================================================================

let _isAnimating = false;
let _currentAnimation = Animation.default;
let _animationTransaction = null;

/**
 * Check if an animation is currently in progress
 * @returns {boolean}
 */
export function isAnimating() {
  return _isAnimating;
}

/**
 * Get the current animation (if any)
 * @returns {Animation|null}
 */
export function currentAnimation() {
  return _isAnimating ? _currentAnimation : null;
}

// =============================================================================
// withAnimation - Explicit Animation
// =============================================================================

/**
 * Executes state changes with animation (explicit animation)
 * Matches SwiftUI's withAnimation {} API
 *
 * @param {Animation|Function} animationOrBody - Animation config or body function
 * @param {Function} [body] - Body function containing state changes
 * @returns {void}
 *
 * @example
 * // With default animation
 * withAnimation(() => {
 *   isExpanded.value = true;
 * });
 *
 * // With custom animation
 * withAnimation(Animation.spring(), () => {
 *   selectedIndex.value = newIndex;
 * });
 */
/**
 * Runs state/style changes with animation.
 *
 * The runtime uses native browser animation primitives internally; callers
 * stay on the SwiftUI-shaped API surface.
 *
 * @see https://developer.apple.com/documentation/swiftui/withanimation(_:_:)
 *
 * @param {Animation|Function} animationOrBody
 * @param {Function}           [body]
 *
 * @example
 * withAnimation(Animation.spring(), () => {
 *   isExpanded.value = true;
 * });
 */
export function withAnimation(animationOrBody, body) {
  return animate(animationOrBody, body);
}

/**
 * Runs imperative changes inside a SwiftUI-shaped animation transaction.
 *
 * This mirrors SwiftUI's closure-oriented animation APIs: callers describe
 * the end-state change, while the framework owns timing, scheduling, reduced
 * motion, and transaction cleanup.
 *
 * @param {Animation|Function} animationOrBody - Animation config or body function
 * @param {Function} [body] - Body function containing state changes
 * @param {Function} [completion] - Called after the animation duration
 * @returns {Promise<void>}
 */
export function animate(animationOrBody, body, completion) {
  let animation = Animation.default;
  let updateFn = animationOrBody;
  let completionFn = body;

  if (animationOrBody instanceof Animation) {
    animation = animationOrBody;
    updateFn = body;
    completionFn = completion;
  }

  if (typeof updateFn !== 'function') {
    return Promise.resolve();
  }

  // Respect the system "reduce motion" accessibility setting.
  if (prefersReducedMotion()) {
    if (typeof updateFn === 'function') updateFn();
    if (typeof completionFn === 'function') completionFn();
    return Promise.resolve();
  }

  // Set global animation context so .transition() modifiers can read it.
  _isAnimating = true;
  _currentAnimation = animation;

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateFn();

        const totalMs = (animation.duration + (animation.delay ?? 0)) * 1000;
        setTimeout(() => {
          _isAnimating = false;
          _currentAnimation = null;
          if (typeof completionFn === 'function') completionFn();
          resolve();
        }, totalMs);
      });
    });
  });
}

/**
 * Applies a SwiftUI Animation to DOM-backed style changes.
 *
 * The caller provides the final visual state. This helper owns transition
 * setup and cleanup so examples do not hand-code CSS transition strings.
 *
 * @param {HTMLElement} element - Element to animate
 * @param {Animation|Object} animationOrStyles - Animation configuration or final style values
 * @param {Object} [stylesOrOptions] - Final style values or options
 * @param {Object} [maybeOptions] - Animation options when an animation is provided
 * @returns {Promise<void>}
 */
export function animateStyles(element, animationOrStyles = Animation.default, stylesOrOptions = {}, maybeOptions = {}) {
  if (!element) return Promise.resolve();

  const animation = animationOrStyles instanceof Animation
    ? animationOrStyles
    : (_currentAnimation ?? Animation.default);
  const styles = animationOrStyles instanceof Animation
    ? stylesOrOptions
    : animationOrStyles;
  const options = animationOrStyles instanceof Animation
    ? maybeOptions
    : stylesOrOptions;

  const properties = Array.isArray(options.properties)
    ? options.properties
    : typeof options.properties === 'string'
      ? [options.properties]
      : Object.keys(styles);

  const compositorProperties = properties.filter(property =>
    property === 'transform' || property === 'opacity'
  );

  if (compositorProperties.length > 0) {
    element.style.willChange = compositorProperties.join(', ');
  }

  if (typeof element.animate === 'function') {
    const from = {};
    const computed = getComputedStyle(element);
    for (const property of properties) {
      from[property] = computed[property] || element.style[property] || '';
    }

    try {
      const player = element.animate([from, styles], animation.toWAAPIOptions());
      player.onfinish = () => {
        Object.assign(element.style, styles);
        element.style.willChange = '';
        if (typeof options.completion === 'function') options.completion();
      };
      return player.finished.catch(() => {});
    } catch {
      // Fall through to CSS transitions.
    }
  }

  const transition = properties
    .map(property => `${property} ${animation.duration}s ${animation.timingFunction} ${animation.delay}s`)
    .join(', ');

  element.style.transition = transition;

  return animate(animation, () => {
    Object.assign(element.style, styles);
  }, () => {
    element.style.willChange = '';
    if (typeof options.completion === 'function') options.completion();
  });
}

// =============================================================================
// View Extension Methods - Add to View prototype
// =============================================================================

/**
 * Adds animation modifier to a View class
 * Call this with your View class to enable .animation() modifier
 *
 * @param {Function} ViewClass - The View class to extend
 */
export function extendViewWithAnimation(ViewClass) {
  /**
   * Implicit animation modifier
   * Animates changes when the specified value changes
   *
   * @param {Animation} animation - Animation to use
   * @param {Object} value - State value to watch (e.g., a State instance)
   * @returns {View} this
   */
  ViewClass.prototype.animation = function(animation, value) {
    const anim = animation instanceof Animation ? animation : Animation.default;

    return this.modifier({
      _animation: anim,
      _value: value,
      apply(element) {
        // Apply CSS transition
        element.style.transition = anim.toCSS();

        // If value is a State, subscribe to changes
        if (value && typeof value.subscribe === 'function') {
          value.subscribe(() => {
            // Animation is already applied via CSS transition
          });
        }
      }
    });
  };

  /**
   * Transition modifier for view insertion/removal
   *
   * @param {AnyTransition} transition - Transition to apply
   * @returns {View} this
   */
  ViewClass.prototype.transition = function(transition) {
    const trans = transition instanceof AnyTransition ? transition : AnyTransition.opacity;

    return this.modifier({
      _transition: trans,
      apply(element) {
        // Store transition for later use
        element._swiftuiTransition = trans;

        // Apply insertion styles initially (for appearing views)
        if (_isAnimating) {
          Object.assign(element.style, trans.insertion);

          // Animate to identity after a frame
          requestAnimationFrame(() => {
            element.style.transition = _currentAnimation?.toCSS() ?? Animation.default.toCSS();
            // Reset to normal state
            Object.keys(trans.insertion).forEach(key => {
              element.style[key] = '';
            });
          });
        }
      }
    });
  };

  /**
   * matchedGeometryEffect - Synchronizes geometry between views
   * Uses CSS view-transition-name for hero animations
   *
   * @param {string} id - Unique identifier for matching
   * @param {Object} namespace - Namespace from Namespace()
   * @param {Object} [options] - Options
   * @param {boolean} [options.isSource=true] - Whether this is the source view
   * @returns {View} this
   */
  ViewClass.prototype.matchedGeometryEffect = function(id, namespace, options = {}) {
    const { isSource = true } = options;
    const transitionName = namespace.name(id);

    return this.modifier({
      apply(element) {
        // Use CSS view-transition-name for cross-view animations
        element.style.viewTransitionName = transitionName;

        // Store metadata for the animation system
        element._matchedGeometry = {
          id,
          namespace: namespace.id,
          isSource
        };
      }
    });
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if View Transition API is supported
 * @returns {boolean}
 */
export function isViewTransitionSupported() {
  return typeof document !== 'undefined' &&
         typeof document.startViewTransition === 'function';
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// =============================================================================
// GPU Layer Promotion Utilities
// =============================================================================

/**
 * Promote an element to its own GPU compositing layer.
 * This enables hardware-accelerated transforms and opacity changes
 * that bypass the main thread layout/paint pipeline.
 *
 * @param {HTMLElement} element - Element to promote
 */
export function promoteToGPULayer(element) {
  if (!element) return;
  // Use translateZ(0) as a lightweight promotion hint
  // This is more widely supported than will-change
  if (!element.style.transform || element.style.transform === 'none') {
    element.style.transform = 'translateZ(0)';
  }
  element.style.backfaceVisibility = 'hidden';
}

/**
 * Remove GPU layer promotion from an element.
 * Call this after animations complete to free GPU memory.
 *
 * @param {HTMLElement} element - Element to demote
 */
export function demoteFromGPULayer(element) {
  if (!element) return;
  element.style.willChange = '';
  element.style.backfaceVisibility = '';
  if (element.style.transform === 'translateZ(0)') {
    element.style.transform = '';
  }
}

// =============================================================================
// CSS Styles for View Transitions
// =============================================================================

/**
 * Get CSS styles for view transitions
 * Include these in your page for proper animation support
 * @returns {string}
 */
export function getAnimationStyles() {
  return `
/* SwiftUI-For-Web Animation Styles */

/* View Transition API customization */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: var(--swiftui-animation-duration, 0.35s);
  animation-timing-function: var(--swiftui-animation-timing, ease);
}

/* Default fade transition */
::view-transition-old(root) {
  animation-name: swiftui-fade-out;
}

::view-transition-new(root) {
  animation-name: swiftui-fade-in;
}

@keyframes swiftui-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes swiftui-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide transitions */
@keyframes swiftui-slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes swiftui-slide-out-left {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}

@keyframes swiftui-slide-in-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes swiftui-slide-out-right {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}

/* Scale transitions */
@keyframes swiftui-scale-in {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes swiftui-scale-out {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0); opacity: 0; }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
    transition: none !important;
  }

  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`;
}

/**
 * Inject animation styles into the document
 */
export function injectAnimationStyles() {
  if (typeof document === 'undefined') return;

  // Check if already injected
  if (document.getElementById('swiftui-animation-styles')) return;

  const style = document.createElement('style');
  style.id = 'swiftui-animation-styles';
  style.textContent = getAnimationStyles();
  document.head.appendChild(style);
}

// Auto-inject styles when module loads in browser
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAnimationStyles);
  } else {
    injectAnimationStyles();
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  Animation,
  AnyTransition,
  Namespace,
  animate,
  animateStyles,
  withAnimation,
  isAnimating,
  currentAnimation,
  extendViewWithAnimation,
  isViewTransitionSupported,
  prefersReducedMotion,
  getAnimationStyles,
  injectAnimationStyles,
  promoteToGPULayer,
  demoteFromGPULayer
};
