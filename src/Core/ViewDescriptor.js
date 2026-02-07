/**
 * ViewDescriptor - Immutable view description system
 *
 * Inspired by:
 * - SwiftUI: Views are value types (structs) that describe UI
 * - React: Elements are immutable plain objects
 *
 * Key principles:
 * 1. Views are descriptions, not DOM elements
 * 2. Descriptions are immutable (frozen objects)
 * 3. Rendering is a separate phase
 * 4. Identity is explicit (keys) or structural (position)
 *
 * @example
 * // Create a descriptor
 * const desc = createDescriptor('VStack', { spacing: 10 }, [
 *   createDescriptor('Text', { content: 'Hello' }),
 *   createDescriptor('Text', { content: 'World' })
 * ]);
 *
 * // Render to DOM
 * const element = renderDescriptor(desc);
 */

/**
 * Symbol to identify view descriptors
 * @type {symbol}
 */
export const VIEW_DESCRIPTOR = Symbol.for('swiftui.descriptor');

/**
 * Symbol for memoized descriptors
 * @type {symbol}
 */
export const MEMOIZED = Symbol.for('swiftui.memoized');

/**
 * Create an immutable view descriptor
 *
 * @param {string} type - View type name (e.g., 'VStack', 'Text', 'Button')
 * @param {Object} props - View properties (will be frozen)
 * @param {Array} children - Child descriptors (will be frozen)
 * @param {string|number|null} key - Explicit key for reconciliation
 * @param {Array} modifiers - Modifier descriptors (will be frozen)
 * @returns {Object} Frozen view descriptor
 */
export function createDescriptor(type, props = {}, children = [], key = null, modifiers = []) {
  const descriptor = {
    $$typeof: VIEW_DESCRIPTOR,
    type,
    props: Object.freeze({ ...props }),
    children: Object.freeze(children.filter(c => c != null)),
    key,
    modifiers: Object.freeze([...modifiers]),
    // Optimization: cache hash for fast comparison
    _hash: null
  };

  // Compute a simple hash for fast equality checks
  descriptor._hash = computeHash(descriptor);

  return Object.freeze(descriptor);
}

/**
 * Check if a value is a view descriptor
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a view descriptor
 */
export function isDescriptor(value) {
  return value != null &&
         typeof value === 'object' &&
         value.$$typeof === VIEW_DESCRIPTOR;
}

/**
 * Check if a value is a legacy View class instance
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a View instance
 */
export function isLegacyView(value) {
  return value != null &&
         typeof value === 'object' &&
         typeof value._render === 'function' &&
         !isDescriptor(value);
}

/**
 * Add a modifier to a descriptor (returns new descriptor)
 *
 * @param {Object} descriptor - View descriptor
 * @param {Object} modifier - Modifier to add
 * @returns {Object} New descriptor with modifier added
 */
export function addModifier(descriptor, modifier) {
  if (!isDescriptor(descriptor)) {
    throw new Error('addModifier requires a view descriptor');
  }

  return createDescriptor(
    descriptor.type,
    descriptor.props,
    descriptor.children,
    descriptor.key,
    [...descriptor.modifiers, modifier]
  );
}

/**
 * Set the key on a descriptor (returns new descriptor)
 *
 * @param {Object} descriptor - View descriptor
 * @param {string|number} key - Key to set
 * @returns {Object} New descriptor with key set
 */
export function setKey(descriptor, key) {
  if (!isDescriptor(descriptor)) {
    throw new Error('setKey requires a view descriptor');
  }

  return createDescriptor(
    descriptor.type,
    descriptor.props,
    descriptor.children,
    key,
    descriptor.modifiers
  );
}

/**
 * Compute a hash for a descriptor for fast comparison
 *
 * @param {Object} descriptor - View descriptor
 * @returns {string} Hash string
 */
function computeHash(descriptor) {
  const parts = [
    descriptor.type,
    descriptor.key ?? '',
    Object.keys(descriptor.props).sort().join(','),
    descriptor.children.length,
    descriptor.modifiers.length
  ];

  // Include prop values in hash for change detection
  for (const key of Object.keys(descriptor.props).sort()) {
    const v = descriptor.props[key];
    if (typeof v === 'function') {
      // Functions change identity each render; skip to avoid false positives
      continue;
    }
    parts.push(`${key}=${v}`);
  }

  // Include modifier types and simple values in hash
  for (const mod of descriptor.modifiers) {
    const mv = mod.value;
    if (typeof mv === 'string' || typeof mv === 'number' || typeof mv === 'boolean') {
      parts.push(`m:${mod.type}=${mv}`);
    } else if (mv && typeof mv === 'object' && typeof mv.rgba === 'function') {
      parts.push(`m:${mod.type}=${mv.rgba()}`);
    } else {
      parts.push(`m:${mod.type}`);
    }
  }

  // Include child hashes for content-sensitive diffing
  for (const child of descriptor.children) {
    if (child && child._hash) {
      parts.push(`c:${child._hash}`);
    }
  }

  return parts.join('|');
}

/**
 * Check if two descriptors are shallowly equal
 *
 * @param {Object} a - First descriptor
 * @param {Object} b - Second descriptor
 * @returns {boolean} True if descriptors are equal
 */
export function descriptorsEqual(a, b) {
  if (a === b) return true;
  if (!isDescriptor(a) || !isDescriptor(b)) return false;

  // Fast path: different hashes mean definitely different
  if (a._hash !== b._hash) return false;

  // Same type and key
  if (a.type !== b.type) return false;
  if (a.key !== b.key) return false;

  // Same number of children and modifiers
  if (a.children.length !== b.children.length) return false;
  if (a.modifiers.length !== b.modifiers.length) return false;

  // Shallow props comparison (skip functions - they change identity each render)
  const aKeys = Object.keys(a.props);
  const bKeys = Object.keys(b.props);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    const av = a.props[key];
    const bv = b.props[key];
    if (typeof av === 'function' && typeof bv === 'function') continue;
    if (av !== bv) return false;
  }

  // Compare modifier values (not just count)
  for (let i = 0; i < a.modifiers.length; i++) {
    const am = a.modifiers[i];
    const bm = b.modifiers[i];
    if (am.type !== bm.type) return false;
    if (typeof am.value !== typeof bm.value) return false;
    if (typeof am.value === 'function') continue;
    if (typeof am.value === 'object' && am.value !== null) {
      if (typeof am.value.rgba === 'function' && typeof bm.value?.rgba === 'function') {
        if (am.value.rgba() !== bm.value.rgba()) return false;
      } else if (am.value !== bm.value) {
        // Different object references for non-Color objects
        const amJSON = JSON.stringify(am.value);
        const bmJSON = JSON.stringify(bm.value);
        if (amJSON !== bmJSON) return false;
      }
    } else if (am.value !== bm.value) {
      return false;
    }
  }

  return true;
}

/**
 * Memoize a descriptor factory function
 * Returns cached descriptor if inputs haven't changed
 *
 * @param {Function} factory - Function that returns a descriptor
 * @returns {Function} Memoized factory
 */
export function memo(factory) {
  let lastArgs = null;
  let lastResult = null;

  const memoized = (...args) => {
    // Check if args are the same
    if (lastArgs !== null && args.length === lastArgs.length) {
      let same = true;
      for (let i = 0; i < args.length; i++) {
        if (args[i] !== lastArgs[i]) {
          same = false;
          break;
        }
      }
      if (same) {
        return lastResult;
      }
    }

    lastArgs = args;
    lastResult = factory(...args);
    lastResult[MEMOIZED] = true;
    return lastResult;
  };

  memoized.isMemo = true;
  return memoized;
}

/**
 * Check if a descriptor was memoized (unchanged from previous render)
 *
 * @param {Object} descriptor - View descriptor
 * @returns {boolean} True if memoized
 */
export function isMemoized(descriptor) {
  return descriptor && descriptor[MEMOIZED] === true;
}

/**
 * Modifier descriptor types
 */
export const ModifierType = {
  PADDING: 'padding',
  FRAME: 'frame',
  FOREGROUND_COLOR: 'foregroundColor',
  BACKGROUND: 'background',
  FONT: 'font',
  OPACITY: 'opacity',
  CORNER_RADIUS: 'cornerRadius',
  BORDER: 'border',
  SHADOW: 'shadow',
  ON_TAP: 'onTap',
  ON_APPEAR: 'onAppear',
  ON_DISAPPEAR: 'onDisappear',
  CLIP_SHAPE: 'clipShape',
  CUSTOM: 'custom'
};

/**
 * Create a modifier descriptor
 *
 * @param {string} type - Modifier type
 * @param {Object} value - Modifier value/options
 * @returns {Object} Frozen modifier descriptor
 */
export function createModifier(type, value) {
  // Preserve objects with prototype methods (like Color, Font)
  // These have methods like rgba() or css() that we need to keep
  let frozenValue = value;
  if (typeof value === 'object' && value !== null) {
    // Check if it has prototype methods (not a plain object)
    const hasPrototypeMethods = Object.getPrototypeOf(value) !== Object.prototype &&
                                Object.getPrototypeOf(value) !== null;
    if (!hasPrototypeMethods && !Array.isArray(value)) {
      // Plain object - freeze a copy
      frozenValue = Object.freeze({ ...value });
    }
    // Objects with prototype methods (Color, Font, etc.) are kept as-is
  }
  return Object.freeze({
    type,
    value: frozenValue
  });
}

export default {
  createDescriptor,
  isDescriptor,
  isLegacyView,
  addModifier,
  setKey,
  descriptorsEqual,
  memo,
  isMemoized,
  createModifier,
  ModifierType,
  VIEW_DESCRIPTOR,
  MEMOIZED
};
