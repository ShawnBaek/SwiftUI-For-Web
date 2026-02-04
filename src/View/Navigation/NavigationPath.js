/**
 * NavigationPath - A type-erased list of navigation destinations
 *
 * Matches SwiftUI's NavigationPath for programmatic navigation.
 *
 * @example
 * const path = new NavigationPath();
 * path.append('detail');
 * path.append({ id: 123, title: 'Item' });
 *
 * NavigationStack({ path: path },
 *   HomeView()
 * )
 * .navigationDestination('detail', (value) => DetailView(value))
 *
 * @example
 * // Pop navigation
 * path.removeLast();
 * path.removeLast(2); // Pop 2 items
 *
 * // Reset to root
 * path.clear();
 */

import { ObservableObject, Published } from '../../Data/ObservableObject.js';

/**
 * NavigationPath - Manages navigation state
 */
export class NavigationPath {
  constructor(initialPath = []) {
    this._path = [...initialPath];
    this._subscribers = new Set();
    this._codable = null;
  }

  /**
   * Get the current path as an array
   * @returns {Array}
   */
  get path() {
    return [...this._path];
  }

  /**
   * Get the number of elements in the path
   * @returns {number}
   */
  get count() {
    return this._path.length;
  }

  /**
   * Check if the path is empty
   * @returns {boolean}
   */
  get isEmpty() {
    return this._path.length === 0;
  }

  /**
   * Append a value to the path
   * @param {*} value - Value to append
   */
  append(value) {
    this._path.push(value);
    this._notifySubscribers();
  }

  /**
   * Remove the last element(s) from the path
   * @param {number} count - Number of elements to remove (default 1)
   */
  removeLast(count = 1) {
    const toRemove = Math.min(count, this._path.length);
    for (let i = 0; i < toRemove; i++) {
      this._path.pop();
    }
    this._notifySubscribers();
  }

  /**
   * Clear the entire path (return to root)
   */
  clear() {
    this._path = [];
    this._notifySubscribers();
  }

  /**
   * Get element at index
   * @param {number} index - Index to get
   * @returns {*}
   */
  get(index) {
    return this._path[index];
  }

  /**
   * Get the last element
   * @returns {*}
   */
  get last() {
    return this._path[this._path.length - 1];
  }

  /**
   * Subscribe to path changes
   * @param {Function} callback - Callback when path changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * Notify subscribers of changes
   * @private
   */
  _notifySubscribers() {
    this._subscribers.forEach(cb => cb(this._path));
  }

  /**
   * Convert to codable representation (for persistence)
   * @returns {CodableRepresentation}
   */
  get codable() {
    if (!this._codable) {
      this._codable = new CodableRepresentation(this);
    }
    return this._codable;
  }

  /**
   * Create from codable representation
   * @param {CodableRepresentation} codable
   * @returns {NavigationPath}
   */
  static fromCodable(codable) {
    return new NavigationPath(codable.path);
  }
}

/**
 * CodableRepresentation - Codable representation of NavigationPath
 */
export class CodableRepresentation {
  constructor(navigationPath) {
    this._navigationPath = navigationPath;
  }

  /**
   * Get path as JSON-serializable array
   * @returns {Array}
   */
  get path() {
    return this._navigationPath.path.map(item => {
      // Convert to plain objects for serialization
      if (typeof item === 'object' && item !== null) {
        return JSON.parse(JSON.stringify(item));
      }
      return item;
    });
  }

  /**
   * Serialize to JSON string
   * @returns {string}
   */
  toJSON() {
    return JSON.stringify(this.path);
  }

  /**
   * Create from JSON string
   * @param {string} json
   * @returns {CodableRepresentation}
   */
  static fromJSON(json) {
    const path = JSON.parse(json);
    return new CodableRepresentation(new NavigationPath(path));
  }
}

/**
 * NavigationDestination - Describes a destination for navigation
 */
export class NavigationDestination {
  constructor(dataType, destination) {
    this._dataType = dataType;
    this._destination = destination;
  }

  /**
   * Check if this destination matches a value
   * @param {*} value
   * @returns {boolean}
   */
  matches(value) {
    // Type checking
    if (typeof this._dataType === 'string') {
      return typeof value === this._dataType || value?.type === this._dataType;
    }
    if (typeof this._dataType === 'function') {
      return value instanceof this._dataType;
    }
    return true;
  }

  /**
   * Build the destination view
   * @param {*} value
   * @returns {View}
   */
  build(value) {
    return this._destination(value);
  }
}

/**
 * Extend NavigationStack to support NavigationPath
 * This should be called after NavigationStack is imported
 */
export function extendNavigationStackWithPath(NavigationStackClass) {
  const originalRender = NavigationStackClass.prototype._render;

  NavigationStackClass.prototype._render = function () {
    // If using NavigationPath, sync with it
    if (this._options?.path instanceof NavigationPath) {
      const navPath = this._options.path;

      // Subscribe to path changes
      navPath.subscribe((path) => {
        // Update navigation based on path
        this._currentPath = path;
        if (this._element) {
          this.rerender();
        }
      });
    }

    return originalRender.call(this);
  };

  /**
   * Add navigationDestination modifier
   */
  NavigationStackClass.prototype.navigationDestination = function (dataType, destination) {
    if (!this._destinations) {
      this._destinations = [];
    }
    this._destinations.push(new NavigationDestination(dataType, destination));
    return this;
  };
}

export default NavigationPath;
