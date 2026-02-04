/**
 * ChangeTracker - Tracks property changes for debugging
 *
 * Provides SwiftUI-style _printChanges() functionality to help debug
 * why views are being re-rendered.
 *
 * @see https://developer.apple.com/documentation/swiftui/view/printchanges()
 *
 * Change reasons:
 * - @self: The view struct/instance itself changed
 * - @identity: View identity changed (recycled for new instance)
 * - _propertyName: Specific property changed
 */

/**
 * Global change tracker instance
 */
class ChangeTrackerClass {
  constructor() {
    /** @type {Map<string, Map<string, any>>} View ID -> property name -> previous value */
    this._previousValues = new Map();

    /** @type {Map<string, string[]>} View ID -> array of change reasons */
    this._pendingChanges = new Map();

    /** @type {boolean} Whether logging is enabled */
    this._enabled = false;

    /** @type {Set<string>} Views that have _printChanges enabled */
    this._trackedViews = new Set();

    /** @type {string|null} Current property being set (for tracking) */
    this._currentProperty = null;

    /** @type {string|null} Current view being updated */
    this._currentViewId = null;
  }

  /**
   * Enable change tracking for a view
   * @param {string} viewId - View identifier
   */
  enableForView(viewId) {
    this._trackedViews.add(viewId);
    this._enabled = true;
  }

  /**
   * Disable change tracking for a view
   * @param {string} viewId - View identifier
   */
  disableForView(viewId) {
    this._trackedViews.delete(viewId);
    if (this._trackedViews.size === 0) {
      this._enabled = false;
    }
  }

  /**
   * Check if tracking is enabled for a view
   * @param {string} viewId - View identifier
   * @returns {boolean}
   */
  isTracking(viewId) {
    return this._trackedViews.has(viewId);
  }

  /**
   * Record a property change
   * @param {string} viewId - View identifier
   * @param {string} propertyName - Name of the property that changed
   * @param {any} oldValue - Previous value
   * @param {any} newValue - New value
   */
  recordChange(viewId, propertyName, oldValue, newValue) {
    if (!this._enabled) return;

    // Initialize view tracking if needed
    if (!this._previousValues.has(viewId)) {
      this._previousValues.set(viewId, new Map());
    }
    if (!this._pendingChanges.has(viewId)) {
      this._pendingChanges.set(viewId, []);
    }

    // Record the change reason
    const changes = this._pendingChanges.get(viewId);
    const changeReason = `_${propertyName}`;

    if (!changes.includes(changeReason)) {
      changes.push(changeReason);
    }

    // Store previous value for next comparison
    this._previousValues.get(viewId).set(propertyName, newValue);
  }

  /**
   * Record that a view's identity changed
   * @param {string} viewId - View identifier
   */
  recordIdentityChange(viewId) {
    if (!this._enabled) return;

    if (!this._pendingChanges.has(viewId)) {
      this._pendingChanges.set(viewId, []);
    }

    const changes = this._pendingChanges.get(viewId);
    if (!changes.includes('@identity')) {
      changes.push('@identity');
    }
  }

  /**
   * Record that a view itself changed
   * @param {string} viewId - View identifier
   */
  recordSelfChange(viewId) {
    if (!this._enabled) return;

    if (!this._pendingChanges.has(viewId)) {
      this._pendingChanges.set(viewId, []);
    }

    const changes = this._pendingChanges.get(viewId);
    if (!changes.includes('@self')) {
      changes.push('@self');
    }
  }

  /**
   * Get and clear pending changes for a view
   * @param {string} viewId - View identifier
   * @returns {string[]} Array of change reasons
   */
  getChanges(viewId) {
    const changes = this._pendingChanges.get(viewId) || [];
    this._pendingChanges.set(viewId, []);
    return changes;
  }

  /**
   * Print changes for a view (SwiftUI's _printChanges() equivalent)
   * @param {string} viewName - Name of the view class
   * @param {string} viewId - View identifier
   */
  printChanges(viewName, viewId) {
    const changes = this.getChanges(viewId);

    if (changes.length === 0) {
      // No tracked changes - view was created fresh
      console.log(`%c${viewName}: %c@self changed`, 'font-weight: bold', 'color: #666');
    } else {
      const changeStr = changes.join(', ');
      console.log(`%c${viewName}: %c${changeStr}`, 'font-weight: bold', 'color: #0066cc');
    }
  }

  /**
   * Log changes using structured logging (SwiftUI's _logChanges() equivalent)
   * @param {string} viewName - Name of the view class
   * @param {string} viewId - View identifier
   */
  logChanges(viewName, viewId) {
    const changes = this.getChanges(viewId);
    const timestamp = new Date().toISOString();

    console.info(
      `[SwiftUI] [Changed Body Properties] ${timestamp}`,
      {
        view: viewName,
        viewId,
        changes: changes.length > 0 ? changes : ['@self'],
        subsystem: 'com.swiftui-for-web',
        category: 'Changed Body Properties'
      }
    );
  }

  /**
   * Clear all tracking data
   */
  clear() {
    this._previousValues.clear();
    this._pendingChanges.clear();
  }
}

// Singleton instance
export const ChangeTracker = new ChangeTrackerClass();

/**
 * Create a tracked property that records changes
 * @param {object} target - Target object
 * @param {string} propertyName - Property name
 * @param {any} initialValue - Initial value
 * @param {string} viewId - View identifier for tracking
 */
export function createTrackedProperty(target, propertyName, initialValue, viewId) {
  let value = initialValue;

  Object.defineProperty(target, propertyName, {
    get() {
      return value;
    },
    set(newValue) {
      if (value !== newValue) {
        ChangeTracker.recordChange(viewId, propertyName, value, newValue);
        value = newValue;
      }
    },
    enumerable: true,
    configurable: true
  });
}

export default ChangeTracker;
