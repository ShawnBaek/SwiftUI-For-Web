/**
 * Animator — internal animation engine facade.
 *
 * This is the ONLY file in the framework that touches GSAP directly. Every
 * other call site (the Netflix demo, .transition, withAnimation, etc.)
 * uses `Animator.*` so the engine can be swapped without touching the
 * SwiftUI API surface — exactly the "system layer" architecture asked for.
 *
 * GSAP is loaded on demand via dynamic <script> injection so the framework
 * itself remains pure ES modules with no build step. If a tween is requested
 * before GSAP has finished loading (the very first frame of the very first
 * animated thing on a page), Animator falls back to the Web Animations API
 * — same compositor-thread guarantees, slightly less expressive — so the
 * UI never breaks because of a network hiccup.
 *
 * Public surface (used by the rest of the framework):
 *
 *   Animator.ready()           Promise that resolves when GSAP is loaded.
 *                              Call once at app init (or idle prewarm) so
 *                              subsequent calls hit the fast path.
 *
 *   Animator.to(el, vars)      gsap.to under the hood. Returns the tween.
 *   Animator.fromTo(el,        gsap.fromTo. Returns the tween.
 *      fromVars, toVars)
 *   Animator.timeline(vars)    gsap.timeline. Returns the Timeline.
 *   Animator.killAll(el)       Kill all tweens on a target.
 *
 *   Animator.gsap              The raw gsap instance if loaded; null otherwise.
 *                              Escape hatch — avoid in framework code.
 *
 * @internal Do not surface this in src/index.js. Users author against the
 *           SwiftUI animation modifiers (`withAnimation`, `.transition`,
 *           `.animation`, `matchedGeometryEffect`) — not Animator.
 */

let _gsap = null;
let _readyPromise = null;

/**
 * Resolve the path to the vendored GSAP bundle relative to THIS file.
 * `import.meta.url` resolves to the absolute URL of `Animator.js` at
 * runtime, so this works whether the framework is served from
 * `/src/...`, a CDN, or a sub-path.
 */
function gsapBundleUrl() {
  // ../internal/gsap/gsap.min.js relative to src/Animation/Animator.js
  return new URL('../internal/gsap/gsap.min.js', import.meta.url).href;
}

/**
 * Kick off (or return) the in-flight load of GSAP. Idempotent.
 *
 * @returns {Promise<object|null>} The gsap instance once loaded, or null
 *          in non-browser environments (Node test runners, SSR).
 */
export function ready() {
  if (_gsap) return Promise.resolve(_gsap);
  if (_readyPromise) return _readyPromise;

  _readyPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(null);
      return;
    }
    // Already loaded (e.g. by a previous instance of the framework, or a
    // host page that included GSAP via <script> for its own purposes).
    if (window.gsap) {
      _gsap = window.gsap;
      resolve(_gsap);
      return;
    }
    const script = document.createElement('script');
    script.src = gsapBundleUrl();
    script.async = true;
    script.onload = () => {
      _gsap = window.gsap || null;
      if (_gsap) {
        // Use the default ticker; smooth interrupts when the user
        // backgrounds the tab.
        _gsap.ticker.lagSmoothing(500, 33);
        resolve(_gsap);
      } else {
        reject(new Error('GSAP script loaded but window.gsap is unset'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load GSAP from ' + script.src));
    document.head.appendChild(script);
  });

  return _readyPromise;
}

// Eagerly start loading the moment something imports Animator. This means
// by the time the user's first click reaches `openCard()` / a withAnimation
// callsite, GSAP is almost certainly already loaded.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  ready().catch(err => {
    // eslint-disable-next-line no-console
    console.warn('[Animator] GSAP preload failed — falling back to WAAPI for animations.', err);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Public methods
// ─────────────────────────────────────────────────────────────────────────

/**
 * Tween an element to a target state.
 *
 * @param {Element|Element[]} target
 * @param {object} vars - GSAP-style vars: { x, y, opacity, scale, duration, ease, delay, onComplete, ... }
 * @returns {object|null} GSAP Tween if loaded; WAAPI Animation as a graceful fallback; null on hard failure.
 */
export function to(target, vars) {
  if (_gsap) return _gsap.to(target, vars);
  return _waapiFallback(target, null, vars);
}

/**
 * Tween from an explicit start state to an explicit end state. The most
 * SwiftUI-shaped primitive — matches `.transition(.scale)` semantics.
 *
 * @param {Element|Element[]} target
 * @param {object} fromVars - starting state (transform, opacity, etc.)
 * @param {object} toVars - ending state + animation options (duration, ease, ...)
 */
export function fromTo(target, fromVars, toVars) {
  if (_gsap) return _gsap.fromTo(target, fromVars, toVars);
  return _waapiFallback(target, fromVars, toVars);
}

/**
 * Compose tweens with shared timing. Maps to SwiftUI's `withAnimation`
 * body: all child tweens added to this timeline play together with
 * declared offsets.
 *
 * @param {object} [vars] - timeline options (paused, delay, repeat, ...)
 * @returns {object|null} GSAP Timeline if loaded; null otherwise (caller
 *          should check and fall back).
 */
export function timeline(vars) {
  if (_gsap) return _gsap.timeline(vars);
  return null;
}

/** Kill all tweens currently running on a target. */
export function killAll(target) {
  if (_gsap) _gsap.killTweensOf(target);
  // Best-effort fallback: cancel any WAAPI animations on the target.
  try {
    if (target && typeof target.getAnimations === 'function') {
      for (const a of target.getAnimations()) a.cancel();
    }
  } catch (_) {}
}

/** The raw gsap instance, if loaded. Null otherwise. Avoid in framework code. */
export const gsap = new Proxy({}, {
  get(_t, k) { return _gsap ? _gsap[k] : undefined; }
});

// ─────────────────────────────────────────────────────────────────────────
// Fallback: WAAPI when GSAP hasn't loaded yet
//
// First tween on a freshly-loaded page may fire before the GSAP <script>
// has finished. We use Element.animate() as a graceful fallback so the
// UI still moves. Subsequent tweens hit GSAP.
// ─────────────────────────────────────────────────────────────────────────

function _waapiFallback(target, fromVars, toVars) {
  if (typeof Element === 'undefined') return null;
  const el = Array.isArray(target) ? target[0] : (target && target.nodeType ? target : null);
  if (!el || typeof el.animate !== 'function') return null;

  const duration = ((toVars && toVars.duration) ?? 0.35) * 1000;
  const delay = ((toVars && toVars.delay) ?? 0) * 1000;
  const easing = _easingToCSS((toVars && toVars.ease) ?? 'power2.out');

  // Build keyframes from the vars dicts. Only the most common SwiftUI-y
  // properties are supported in the fallback path: transform parts
  // (x, y, scale, rotation), opacity, and direct CSS string properties.
  const fromKF = _varsToKeyframe(fromVars, el);
  const toKF = _varsToKeyframe(toVars, el);

  const keyframes = fromKF ? [fromKF, toKF] : [toKF];
  return el.animate(keyframes, { duration, delay, easing, fill: 'forwards' });
}

function _varsToKeyframe(vars, el) {
  if (!vars) return null;
  const kf = {};
  const tx = [];
  if ('x' in vars)        tx.push(`translateX(${typeof vars.x === 'number' ? vars.x + 'px' : vars.x})`);
  if ('y' in vars)        tx.push(`translateY(${typeof vars.y === 'number' ? vars.y + 'px' : vars.y})`);
  if ('scale' in vars)    tx.push(`scale(${vars.scale})`);
  if ('scaleX' in vars)   tx.push(`scaleX(${vars.scaleX})`);
  if ('scaleY' in vars)   tx.push(`scaleY(${vars.scaleY})`);
  if ('rotation' in vars) tx.push(`rotate(${vars.rotation}deg)`);
  if (vars.transform)     tx.push(vars.transform);
  if (tx.length) kf.transform = tx.join(' ');
  if ('opacity' in vars)  kf.opacity = vars.opacity;
  // Pass through any explicit CSS property that's not a known GSAP option.
  const SKIP = new Set(['x','y','scale','scaleX','scaleY','rotation','transform','opacity','duration','delay','ease','onComplete','onStart','onUpdate','overwrite','stagger','repeat','yoyo']);
  for (const k in vars) if (!SKIP.has(k)) kf[k] = vars[k];
  return kf;
}

function _easingToCSS(ease) {
  // GSAP ease names → CSS cubic-bezier approximations. Only the common ones.
  if (typeof ease === 'string') {
    switch (ease) {
      case 'none':
      case 'linear':       return 'linear';
      case 'power1.in':    return 'cubic-bezier(0.55, 0.085, 0.68, 0.53)';
      case 'power1.out':   return 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      case 'power1.inOut': return 'cubic-bezier(0.455, 0.03, 0.515, 0.955)';
      case 'power2.in':    return 'cubic-bezier(0.55, 0.055, 0.675, 0.19)';
      case 'power2.out':   return 'cubic-bezier(0.215, 0.61, 0.355, 1)';
      case 'power2.inOut': return 'cubic-bezier(0.645, 0.045, 0.355, 1)';
      case 'power3.in':    return 'cubic-bezier(0.755, 0.05, 0.855, 0.06)';
      case 'power3.out':   return 'cubic-bezier(0.23, 1, 0.32, 1)';
      case 'power3.inOut': return 'cubic-bezier(0.77, 0, 0.175, 1)';
      case 'power4.out':   return 'cubic-bezier(0.165, 0.84, 0.44, 1)';
      case 'expo.out':     return 'cubic-bezier(0.19, 1, 0.22, 1)';
      case 'circ.out':     return 'cubic-bezier(0.075, 0.82, 0.165, 1)';
      case 'back.out':     return 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      default:             return 'ease';
    }
  }
  return 'ease';
}

// ─────────────────────────────────────────────────────────────────────────
// Default export — a namespace that matches the way GSAP itself is used,
// so downstream framework files read naturally:
//
//     import { Animator } from '../Animation/Animator.js';
//     Animator.fromTo(el, { scale: 0.5 }, { scale: 1, duration: 0.22, ease: 'power2.out' });
// ─────────────────────────────────────────────────────────────────────────

export const Animator = { ready, to, fromTo, timeline, killAll, gsap };
export default Animator;
