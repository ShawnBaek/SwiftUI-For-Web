import { trackObservers, notifyObserversSet } from './Signal.js';

/**
 * Environment - Provides access to environment values
 *
 * Matches SwiftUI's @Environment and @EnvironmentObject property wrappers.
 *
 * @example
 * // Define environment values
 * const env = Environment.shared;
 * env.set('colorScheme', 'dark');
 * env.set('locale', 'en-US');
 *
 * // Access in views
 * const colorScheme = Environment.get('colorScheme');
 *
 * @example
 * // EnvironmentObject for shared observable state
 * class UserSettings extends ObservableObject {
 *   @Published theme = 'light';
 * }
 *
 * const settings = new UserSettings();
 * Environment.setObject(UserSettings, settings);
 *
 * // Access in views
 * const settings = Environment.object(UserSettings);
 */

import { ObservableObject } from './ObservableObject.js';

/**
 * Built-in environment key values (matching SwiftUI)
 */
export const EnvironmentValues = {
  // Color Scheme
  colorScheme: 'colorScheme',

  // Locale
  locale: 'locale',
  calendar: 'calendar',
  timeZone: 'timeZone',

  // Accessibility
  accessibilityEnabled: 'accessibilityEnabled',
  accessibilityReduceMotion: 'accessibilityReduceMotion',
  accessibilityReduceTransparency: 'accessibilityReduceTransparency',
  accessibilityDifferentiateWithoutColor: 'accessibilityDifferentiateWithoutColor',
  accessibilityInvertColors: 'accessibilityInvertColors',

  // Layout
  layoutDirection: 'layoutDirection',
  sizeCategory: 'sizeCategory',
  horizontalSizeClass: 'horizontalSizeClass',
  verticalSizeClass: 'verticalSizeClass',

  // Interaction
  isEnabled: 'isEnabled',
  isFocused: 'isFocused',

  // Presentation
  presentationMode: 'presentationMode',
  dismiss: 'dismiss',

  // Edit Mode
  editMode: 'editMode',

  // Open URL
  openURL: 'openURL'
};

/**
 * Color scheme values
 */
export const ColorScheme = {
  light: 'light',
  dark: 'dark'
};

/**
 * Layout direction values
 */
export const LayoutDirection = {
  leftToRight: 'ltr',
  rightToLeft: 'rtl'
};

/**
 * Size class values (matches SwiftUI)
 *
 * SwiftUI Size Class Reference:
 * - compact: Constrained space (smaller devices, split-screen)
 * - regular: Ample space (larger devices, full-screen)
 *
 * Web Mapping:
 * - Mobile Portrait: compact width, regular height
 * - Mobile Landscape: compact width, compact height
 * - Tablet Portrait: regular width, regular height
 * - Tablet Landscape: regular width, regular height
 * - Desktop: regular width, regular height
 */
export const UserInterfaceSizeClass = {
  compact: 'compact',
  regular: 'regular'
};

/**
 * Device idiom (extension for web)
 * Maps to SwiftUI's UIUserInterfaceIdiom
 */
export const UserInterfaceIdiom = {
  phone: 'phone',     // Mobile devices (< 768px)
  pad: 'pad',         // Tablet devices (768px - 1024px)
  mac: 'mac',         // Desktop devices (> 1024px)
  unspecified: 'unspecified'
};

/**
 * Get current device idiom based on screen characteristics
 * @returns {string} Device idiom
 */
export function currentDeviceIdiom() {
  if (typeof window === 'undefined') return UserInterfaceIdiom.unspecified;
  const width = window.innerWidth;
  const hasTouch = 'ontouchstart' in window
    || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

  if (width < 768) {
    return UserInterfaceIdiom.phone;
  } else if (width < 1024 || (hasTouch && width < 1366)) {
    return UserInterfaceIdiom.pad;
  } else {
    return UserInterfaceIdiom.mac;
  }
}

/**
 * Environment - Global environment for storing values
 */
class EnvironmentStore {
  constructor() {
    this._values = new Map();
    this._objects = new Map();
    this._subscribers = new Map();
    // Per-key observer Sets for the signal-tracking machinery.
    // Lazily populated on first tracked read.
    this._keyObservers = new Map();

    // System defaults are created on first use, not at import, so importing
    // the library never touches `window` or `document` (#49). In an
    // environment without them (Node, static rendering) fixed defaults apply.
    this._defaultsReady = false;
  }

  /** @private */
  _ensureDefaults() {
    if (this._defaultsReady) return;
    this._defaultsReady = true;
    this._initializeDefaults();
  }

  /**
   * Get (or lazily create) the observer Set for a key.
   * @private
   */
  _observersForKey(key) {
    let set = this._keyObservers.get(key);
    if (!set) {
      set = new Set();
      this._keyObservers.set(key, set);
    }
    return set;
  }

  /**
   * Initialize default environment values based on system
   * @private
   */
  _initializeDefaults() {
    const hasWindow = typeof window !== 'undefined';
    const media = (query) => (hasWindow ? window.matchMedia?.(query) : undefined);

    // Color scheme from system preference
    const darkQuery = media('(prefers-color-scheme: dark)');
    this._values.set(EnvironmentValues.colorScheme, darkQuery?.matches ? ColorScheme.dark : ColorScheme.light);
    darkQuery?.addEventListener?.('change', (e) => {
      this.set(EnvironmentValues.colorScheme, e.matches ? ColorScheme.dark : ColorScheme.light);
    });

    // Locale
    const language = typeof navigator !== 'undefined' ? navigator.language : undefined;
    this._values.set(EnvironmentValues.locale, language ?? 'en-US');

    // Timezone
    this._values.set(EnvironmentValues.timeZone, Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Accessibility
    const motionQuery = media('(prefers-reduced-motion: reduce)');
    this._values.set(EnvironmentValues.accessibilityReduceMotion, Boolean(motionQuery?.matches));
    motionQuery?.addEventListener?.('change', (e) => {
      this.set(EnvironmentValues.accessibilityReduceMotion, e.matches);
    });

    // Layout direction
    const dir = (typeof document !== 'undefined' && document.documentElement?.dir) || 'ltr';
    this._values.set(EnvironmentValues.layoutDirection, dir === 'rtl' ? LayoutDirection.rightToLeft : LayoutDirection.leftToRight);

    // Size classes based on viewport
    this._updateSizeClasses();
    if (hasWindow) window.addEventListener?.('resize', () => this._updateSizeClasses());

    // OpenURL handler. noopener keeps the opened page from reaching back
    // through window.opener.
    this._values.set(EnvironmentValues.openURL, (url) => {
      if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  /**
   * Update size classes based on viewport
   * Follows SwiftUI's size class behavior:
   *
   * SwiftUI Reference (approximate):
   * - iPhone Portrait: compact width, regular height
   * - iPhone Landscape (standard): compact width, compact height
   * - iPhone Landscape (Plus/Max): regular width, compact height
   * - iPad (all orientations): regular width, regular height
   * - iPad Split View (1/3): compact width, regular height
   * - iPad Split View (1/2+): regular width, regular height
   * - Mac: regular width, regular height
   *
   * Web Breakpoints:
   * - Horizontal: compact < 768px (mobile), regular >= 768px (tablet/desktop)
   * - Vertical: compact < 480px (landscape phone), regular >= 480px
   *
   * @private
   */
  _updateSizeClasses() {
    // Without a window (Node, static rendering) assume a regular-size viewport.
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    const isLandscape = width > height;

    // Horizontal size class
    // compact: phone-like width (< 768px)
    // regular: tablet/desktop width (>= 768px)
    const horizontalClass = width < 768
      ? UserInterfaceSizeClass.compact
      : UserInterfaceSizeClass.regular;

    // Vertical size class
    // compact: landscape phone-like height (< 480px)
    // regular: portrait or tablet/desktop height (>= 480px)
    const verticalClass = height < 480
      ? UserInterfaceSizeClass.compact
      : UserInterfaceSizeClass.regular;

    // Route through set() so legacy subscribers AND signal-tracking
    // observers both get notified. Direct _values.set bypasses the
    // signal-engine observer notification (Phase 2 shim).
    this.set(EnvironmentValues.horizontalSizeClass, horizontalClass);
    this.set(EnvironmentValues.verticalSizeClass, verticalClass);
    this.set('deviceIdiom', currentDeviceIdiom());
  }

  /**
   * Get an environment value
   * @param {string} key - Environment key
   * @returns {*} The environment value
   */
  get(key) {
    this._ensureDefaults();
    trackObservers(this._observersForKey(key));
    return this._values.get(key);
  }

  /**
   * Set an environment value
   * @param {string} key - Environment key
   * @param {*} value - Value to set
   */
  set(key, value) {
    this._ensureDefaults();
    const oldValue = this._values.get(key);
    this._values.set(key, value);

    if (oldValue !== value) {
      // Wake signal observers FIRST so a throwing legacy subscriber can't
      // strand fine-grained reactive bindings.
      notifyObserversSet(this._observersForKey(key));
      try {
        this._notifySubscribers(key, value, oldValue);
      } catch (e) {
        console.error('[Environment] subscriber threw:', e);
      }
    }
  }

  /**
   * Subscribe to environment value changes
   * @param {string} key - Environment key to watch
   * @param {Function} callback - Callback when value changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    // Subscribing alone must start the system listeners (color scheme,
    // reduced motion, resize), or a subscribe-only caller never hears changes.
    this._ensureDefaults();
    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, new Set());
    }
    this._subscribers.get(key).add(callback);

    return () => {
      this._subscribers.get(key)?.delete(callback);
    };
  }

  /**
   * Notify subscribers of a value change
   * @private
   */
  _notifySubscribers(key, newValue, oldValue) {
    this._subscribers.get(key)?.forEach(callback => {
      callback(newValue, oldValue);
    });
  }

  /**
   * Set an environment object (for @EnvironmentObject pattern)
   * @param {Function} type - Object constructor/class
   * @param {Object} object - Object instance
   */
  setObject(type, object) {
    this._objects.set(type, object);
  }

  /**
   * Get an environment object
   * @param {Function} type - Object constructor/class
   * @returns {Object|null} The object instance or null
   */
  object(type) {
    return this._objects.get(type) ?? null;
  }

  /**
   * Remove an environment object
   * @param {Function} type - Object constructor/class
   */
  removeObject(type) {
    this._objects.delete(type);
  }
}

/**
 * Shared environment instance
 */
export const Environment = new EnvironmentStore();

/**
 * EnvironmentObject - Wrapper for accessing shared observable objects
 *
 * @example
 * class Settings extends ObservableObject {
 *   @Published theme = 'light';
 * }
 *
 * // Register
 * Environment.setObject(Settings, new Settings());
 *
 * // Access
 * const settings = EnvironmentObject(Settings);
 */
export function EnvironmentObject(type) {
  return Environment.object(type);
}

/**
 * Extend View with environment modifier
 * @param {Function} ViewClass - View class to extend
 */
export function extendViewWithEnvironment(ViewClass) {
  /**
   * Set environment values for this view and its descendants
   * @param {string} keyPath - Environment key
   * @param {*} value - Value to set
   */
  ViewClass.prototype.environment = function (keyPath, value) {
    // Store environment override for this view tree
    if (!this._environmentOverrides) {
      this._environmentOverrides = new Map();
    }
    this._environmentOverrides.set(keyPath, value);
    return this;
  };

  /**
   * Inject an environment object for this view and its descendants
   * @param {Object} object - Observable object to inject
   */
  ViewClass.prototype.environmentObject = function (object) {
    if (object && object.constructor) {
      Environment.setObject(object.constructor, object);
    }
    return this;
  };
}

export default Environment;
