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
export function withAnimation(animationOrBody, body) {
  // Handle both withAnimation(body) and withAnimation(animation, body)
  let animation = Animation.default;
  let updateFn = animationOrBody;

  if (animationOrBody instanceof Animation) {
    animation = animationOrBody;
    updateFn = body;
  }

  // Check for reduced motion preference
  if (prefersReducedMotion()) {
    updateFn();
    return;
  }

  // Set global animation state
  _isAnimating = true;
  _currentAnimation = animation;

  // Use View Transition API if available (Chrome 111+)
  if (typeof document !== 'undefined' && document.startViewTransition) {
    document.documentElement.style.setProperty(
      '--swiftui-animation-duration',
      `${animation.duration}s`
    );
    document.documentElement.style.setProperty(
      '--swiftui-animation-timing',
      animation.timingFunction
    );

    const transition = document.startViewTransition(() => {
      updateFn();
    });

    transition.finished.then(() => {
      _isAnimating = false;
      _currentAnimation = null;
    });
  } else {
    // Fallback: Apply CSS transitions manually
    updateFn();

    // Reset after animation duration
    setTimeout(() => {
      _isAnimating = false;
      _currentAnimation = null;
    }, animation.duration * 1000);
  }
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
  withAnimation,
  isAnimating,
  currentAnimation,
  extendViewWithAnimation,
  isViewTransitionSupported,
  prefersReducedMotion,
  getAnimationStyles,
  injectAnimationStyles
};
