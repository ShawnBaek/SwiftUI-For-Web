/**
 * Animation - SwiftUI-style animation system using CSS View Transitions API
 *
 * Provides smooth animations for state changes and navigation transitions
 * using the modern View Transition API with fallbacks.
 *
 * @see https://developer.chrome.com/docs/web-platform/view-transitions
 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
 *
 * @example
 * // Animate a state change
 * withAnimation(() => {
 *   count.value++;
 * });
 *
 * // With custom animation
 * withAnimation(Animation.easeInOut(0.3), () => {
 *   isExpanded.value = !isExpanded.value;
 * });
 */

/**
 * Animation timing curves and configurations
 */
export class Animation {
  /**
   * Creates an Animation configuration
   *
   * @param {Object} options - Animation options
   * @param {number} [options.duration=0.3] - Duration in seconds
   * @param {string} [options.timingFunction='ease'] - CSS timing function
   * @param {number} [options.delay=0] - Delay in seconds
   */
  constructor(options = {}) {
    this.duration = options.duration ?? 0.3;
    this.timingFunction = options.timingFunction ?? 'ease';
    this.delay = options.delay ?? 0;
  }

  /**
   * Get CSS string for this animation
   *
   * @returns {string} CSS animation/transition properties
   */
  toCSS() {
    return `${this.duration}s ${this.timingFunction} ${this.delay}s`;
  }

  // =========================================================================
  // Static Factory Methods - Match SwiftUI Animation presets
  // =========================================================================

  /**
   * Default animation
   *
   * @returns {Animation}
   */
  static get default() {
    return new Animation({ duration: 0.3, timingFunction: 'ease' });
  }

  /**
   * Linear animation
   *
   * @param {number} [duration=0.3] - Duration in seconds
   * @returns {Animation}
   */
  static linear(duration = 0.3) {
    return new Animation({ duration, timingFunction: 'linear' });
  }

  /**
   * Ease-in animation
   *
   * @param {number} [duration=0.3] - Duration in seconds
   * @returns {Animation}
   */
  static easeIn(duration = 0.3) {
    return new Animation({ duration, timingFunction: 'ease-in' });
  }

  /**
   * Ease-out animation
   *
   * @param {number} [duration=0.3] - Duration in seconds
   * @returns {Animation}
   */
  static easeOut(duration = 0.3) {
    return new Animation({ duration, timingFunction: 'ease-out' });
  }

  /**
   * Ease-in-out animation
   *
   * @param {number} [duration=0.3] - Duration in seconds
   * @returns {Animation}
   */
  static easeInOut(duration = 0.3) {
    return new Animation({ duration, timingFunction: 'ease-in-out' });
  }

  /**
   * Spring animation (approximated with CSS)
   *
   * @param {Object} [options] - Spring options
   * @param {number} [options.response=0.5] - Response time
   * @param {number} [options.dampingRatio=0.8] - Damping ratio
   * @returns {Animation}
   */
  static spring(options = {}) {
    const { response = 0.5, dampingRatio = 0.8 } = options;
    // Approximate spring with cubic-bezier
    const bezier = dampingRatio < 1
      ? 'cubic-bezier(0.5, 1.5, 0.5, 1)' // Bouncy
      : 'cubic-bezier(0.25, 0.1, 0.25, 1)'; // Smooth
    return new Animation({ duration: response, timingFunction: bezier });
  }

  /**
   * Bouncy spring animation
   *
   * @returns {Animation}
   */
  static get bouncy() {
    return new Animation({
      duration: 0.5,
      timingFunction: 'cubic-bezier(0.5, 1.8, 0.5, 0.8)'
    });
  }

  /**
   * Smooth spring animation
   *
   * @returns {Animation}
   */
  static get smooth() {
    return new Animation({
      duration: 0.4,
      timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
    });
  }

  /**
   * Interactive spring (quick response)
   *
   * @returns {Animation}
   */
  static get interactiveSpring() {
    return new Animation({
      duration: 0.25,
      timingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    });
  }

  /**
   * Add delay to animation
   *
   * @param {number} delay - Delay in seconds
   * @returns {Animation}
   */
  delay(delay) {
    return new Animation({
      duration: this.duration,
      timingFunction: this.timingFunction,
      delay
    });
  }

  /**
   * Repeat the animation
   *
   * @param {number} [count=Infinity] - Number of repetitions
   * @param {boolean} [autoreverses=false] - Auto-reverse on each iteration
   * @returns {Animation}
   */
  repeatCount(count = Infinity, autoreverses = false) {
    const anim = new Animation(this);
    anim._repeatCount = count;
    anim._autoreverses = autoreverses;
    return anim;
  }

  /**
   * Repeat forever
   *
   * @param {boolean} [autoreverses=false] - Auto-reverse on each iteration
   * @returns {Animation}
   */
  repeatForever(autoreverses = false) {
    return this.repeatCount(Infinity, autoreverses);
  }
}

/**
 * Check if View Transition API is supported
 *
 * @returns {boolean} True if supported
 */
export function isViewTransitionSupported() {
  return typeof document !== 'undefined' &&
         typeof document.startViewTransition === 'function';
}

/**
 * Check if user prefers reduced motion
 *
 * @returns {boolean} True if user prefers reduced motion
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Execute a function with animation using View Transition API
 *
 * @param {Animation|Function} animationOrCallback - Animation config or callback
 * @param {Function} [callback] - Callback function that performs DOM updates
 * @returns {Promise} Promise that resolves when animation completes
 *
 * @example
 * // Simple usage
 * withAnimation(() => {
 *   element.classList.toggle('expanded');
 * });
 *
 * // With custom animation
 * withAnimation(Animation.spring(), () => {
 *   showDetail.value = true;
 * });
 */
export function withAnimation(animationOrCallback, callback) {
  // Handle both withAnimation(callback) and withAnimation(animation, callback)
  let animation = Animation.default;
  let updateFn = animationOrCallback;

  if (animationOrCallback instanceof Animation) {
    animation = animationOrCallback;
    updateFn = callback;
  }

  // Skip animation if user prefers reduced motion
  if (prefersReducedMotion()) {
    updateFn();
    return Promise.resolve();
  }

  // Use View Transition API if available
  if (isViewTransitionSupported()) {
    // Set animation duration via CSS custom property
    document.documentElement.style.setProperty(
      '--view-transition-duration',
      `${animation.duration}s`
    );

    const transition = document.startViewTransition(() => {
      updateFn();
    });

    return transition.finished;
  }

  // Fallback: just execute the update
  updateFn();
  return Promise.resolve();
}

/**
 * Execute animation with specific transition types (for directional transitions)
 *
 * @param {string[]} types - Transition types (e.g., ['forwards'], ['backwards'])
 * @param {Animation} animation - Animation config
 * @param {Function} callback - Callback function
 * @returns {Promise} Promise that resolves when animation completes
 */
export function withAnimationTypes(types, animation, callback) {
  if (prefersReducedMotion()) {
    callback();
    return Promise.resolve();
  }

  if (isViewTransitionSupported()) {
    document.documentElement.style.setProperty(
      '--view-transition-duration',
      `${animation.duration}s`
    );

    const transition = document.startViewTransition({
      update: callback,
      types
    });

    return transition.finished;
  }

  callback();
  return Promise.resolve();
}

/**
 * Apply a view-transition-name to an element for custom transitions
 *
 * @param {HTMLElement} element - Element to name
 * @param {string} name - Unique transition name
 */
export function setViewTransitionName(element, name) {
  if (element) {
    element.style.viewTransitionName = name;
  }
}

/**
 * Create CSS styles for view transitions
 * Include this in your page to enable custom transitions
 *
 * @returns {string} CSS styles
 */
export function getViewTransitionStyles() {
  return `
/* View Transition API styles */
::view-transition-group(root) {
  animation-duration: var(--view-transition-duration, 0.3s);
  animation-timing-function: ease-in-out;
}

::view-transition-old(root) {
  animation: var(--view-transition-duration, 0.3s) ease-in-out fade-out;
}

::view-transition-new(root) {
  animation: var(--view-transition-duration, 0.3s) ease-in-out fade-in;
}

/* Slide transitions */
html:active-view-transition-type(slide-forward) {
  &::view-transition-old(root) {
    animation-name: slide-out-left;
  }
  &::view-transition-new(root) {
    animation-name: slide-in-right;
  }
}

html:active-view-transition-type(slide-backward) {
  &::view-transition-old(root) {
    animation-name: slide-out-right;
  }
  &::view-transition-new(root) {
    animation-name: slide-in-left;
  }
}

/* Scale transitions */
html:active-view-transition-type(scale) {
  &::view-transition-old(root) {
    animation-name: scale-down;
  }
  &::view-transition-new(root) {
    animation-name: scale-up;
  }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-out-left {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-100%); opacity: 0; }
}

@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slide-out-right {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

@keyframes slide-in-left {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes scale-down {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.9); opacity: 0; }
}

@keyframes scale-up {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
`;
}

/**
 * Inject view transition styles into the document
 */
export function injectViewTransitionStyles() {
  if (typeof document === 'undefined') return;

  // Check if already injected
  if (document.getElementById('swiftui-view-transitions')) return;

  const style = document.createElement('style');
  style.id = 'swiftui-view-transitions';
  style.textContent = getViewTransitionStyles();
  document.head.appendChild(style);
}

// Auto-inject styles when module loads (in browser)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectViewTransitionStyles);
  } else {
    injectViewTransitionStyles();
  }
}

export default {
  Animation,
  withAnimation,
  withAnimationTypes,
  isViewTransitionSupported,
  prefersReducedMotion,
  setViewTransitionName,
  getViewTransitionStyles,
  injectViewTransitionStyles
};
