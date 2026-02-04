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
 * Size class values
 */
export const UserInterfaceSizeClass = {
  compact: 'compact',
  regular: 'regular'
};

/**
 * Environment - Global environment for storing values
 */
class EnvironmentStore {
  constructor() {
    this._values = new Map();
    this._objects = new Map();
    this._subscribers = new Map();

    // Initialize with system defaults
    this._initializeDefaults();
  }

  /**
   * Initialize default environment values based on system
   * @private
   */
  _initializeDefaults() {
    // Color scheme from system preference
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    this._values.set(EnvironmentValues.colorScheme, prefersDark ? ColorScheme.dark : ColorScheme.light);

    // Listen for system color scheme changes
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.set(EnvironmentValues.colorScheme, e.matches ? ColorScheme.dark : ColorScheme.light);
    });

    // Locale
    this._values.set(EnvironmentValues.locale, navigator.language ?? 'en-US');

    // Timezone
    this._values.set(EnvironmentValues.timeZone, Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Accessibility
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this._values.set(EnvironmentValues.accessibilityReduceMotion, prefersReducedMotion);

    window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.set(EnvironmentValues.accessibilityReduceMotion, e.matches);
    });

    // Layout direction
    const dir = document.documentElement.dir || 'ltr';
    this._values.set(EnvironmentValues.layoutDirection, dir === 'rtl' ? LayoutDirection.rightToLeft : LayoutDirection.leftToRight);

    // Size classes based on viewport
    this._updateSizeClasses();
    window.addEventListener('resize', () => this._updateSizeClasses());

    // OpenURL handler
    this._values.set(EnvironmentValues.openURL, (url) => {
      window.open(url, '_blank');
    });
  }

  /**
   * Update size classes based on viewport
   * @private
   */
  _updateSizeClasses() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Horizontal: compact < 600px, regular >= 600px
    this._values.set(
      EnvironmentValues.horizontalSizeClass,
      width < 600 ? UserInterfaceSizeClass.compact : UserInterfaceSizeClass.regular
    );

    // Vertical: compact < 400px, regular >= 400px
    this._values.set(
      EnvironmentValues.verticalSizeClass,
      height < 400 ? UserInterfaceSizeClass.compact : UserInterfaceSizeClass.regular
    );
  }

  /**
   * Get an environment value
   * @param {string} key - Environment key
   * @returns {*} The environment value
   */
  get(key) {
    return this._values.get(key);
  }

  /**
   * Set an environment value
   * @param {string} key - Environment key
   * @param {*} value - Value to set
   */
  set(key, value) {
    const oldValue = this._values.get(key);
    this._values.set(key, value);

    // Notify subscribers
    if (oldValue !== value) {
      this._notifySubscribers(key, value, oldValue);
    }
  }

  /**
   * Subscribe to environment value changes
   * @param {string} key - Environment key to watch
   * @param {Function} callback - Callback when value changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
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
