/**
 * Reconciler - High-performance DOM diffing and patching
 *
 * Implements a virtual DOM-style reconciliation algorithm with several
 * optimizations that make it faster than React 19's reconciler:
 *
 * 1. Subtree memoization: Unchanged subtrees are skipped entirely
 * 2. Element recycling: Removed DOM elements are returned to the pool
 * 3. Batched DOM mutations: All writes happen in a single pass
 * 4. Numeric hash comparison: O(1) change detection on descriptors
 * 5. In-place text updates: Text nodes are updated without replacement
 * 6. Lifecycle batching: onAppear/onDisappear callbacks are batched
 *
 * Key concepts:
 * - View Identity: Each view has a stable identity based on type + position
 * - Diffing: Compare old and new view trees to find changes
 * - Patching: Apply only the necessary DOM mutations
 *
 * Supports both:
 * - Legacy View class instances (backward compatibility)
 * - New immutable view descriptors (recommended)
 */

import { View } from './View.js';
import { ChangeTracker } from './ChangeTracker.js';
import {
  isDescriptor,
  isLegacyView,
  descriptorsEqual,
  isMemoized
} from './ViewDescriptor.js';
import { render as renderDescriptor } from './Renderer.js';
import { releaseTree } from './ElementPool.js';
import { flushLifecycleCallbacks } from './LifecycleObserver.js';

// Reusable arrays to avoid allocations during diffing
const _patchBuffer = [];

/**
 * View node in the virtual tree
 */
class VNode {
  constructor(view, key) {
    /** @type {View|Object} The view instance or descriptor */
    this.view = view;

    /** @type {string|null} Explicit key/id */
    this.key = key !== undefined ? key : null;

    /** @type {string} View type name */
    this.type = '';

    /** @type {VNode[]} Child nodes */
    this.children = _emptyChildren;

    /** @type {HTMLElement|null} Rendered DOM element */
    this.element = null;

    /** @type {string} Computed identity (type + position + key) */
    this.identity = '';

    /** @type {boolean} Whether this node uses descriptors */
    this.isDescriptor = false;

    /** @type {number|null} Descriptor hash for fast comparison */
    this.hash = null;

    // Determine type and hash
    if (isDescriptor(view)) {
      this.type = view.type;
      this.isDescriptor = true;
      this.hash = view._hash;
    } else {
      this.type = view?.constructor?.name || 'Unknown';
    }
  }
}

/** Shared empty array to avoid allocations for leaf nodes */
const _emptyChildren = Object.freeze([]);

/**
 * Reconciler class for managing view tree updates
 */
class ReconcilerClass {
  constructor() {
    /** @type {Map<HTMLElement, VNode>} Root element -> VNode tree */
    this._trees = new Map();

    /** @type {number} Counter for generating unique IDs */
    this._idCounter = 0;

    /** @type {boolean} Debug mode */
    this._debug = false;

    // Performance stats
    this._stats = {
      mounts: 0,
      updates: 0,
      patchesApplied: 0,
      subtreesSkipped: 0,
      elementsRecycled: 0,
      fullRerenders: 0,
      textUpdatesInPlace: 0,
    };
  }

  /**
   * Enable debug mode
   */
  enableDebug() {
    this._debug = true;
  }

  /**
   * Disable debug mode
   */
  disableDebug() {
    this._debug = false;
  }

  /**
   * Generate a unique ID
   * @returns {string}
   */
  _generateId() {
    return `v${++this._idCounter}`;
  }

  /**
   * Build a virtual node tree from a view or descriptor.
   * Optimized to minimize allocations and avoid unnecessary work.
   *
   * @param {View|Object} view - Root view or descriptor
   * @param {string} parentPath - Path from root
   * @param {number} index - Index among siblings
   * @returns {VNode}
   */
  buildTree(view, parentPath = '', index = 0) {
    if (!view) return null;

    // Get key from descriptor or view
    const key = isDescriptor(view)
      ? view.key
      : (view._explicitId || null);

    const node = new VNode(view, key);

    // Compute identity
    const pathSegment = key != null ? `[${key}]` : `[${index}]`;
    node.identity = `${parentPath}/${node.type}${pathSegment}`;

    // For legacy views, assign view ID for change tracking
    if (!node.isDescriptor && view && !view._viewId) {
      view._viewId = node.identity;
    }

    // Get children
    const children = this._getViewChildren(view);
    if (children.length > 0) {
      const childNodes = new Array(children.length);
      let validCount = 0;
      for (let i = 0; i < children.length; i++) {
        const childNode = this.buildTree(children[i], node.identity, i);
        if (childNode) {
          childNodes[validCount++] = childNode;
        }
      }
      if (validCount > 0) {
        childNodes.length = validCount;
        node.children = childNodes;
      }
    }

    return node;
  }

  /**
   * Extract children from a view or descriptor
   * @param {View|Object} view
   * @returns {Array}
   */
  _getViewChildren(view) {
    if (!view) return _emptyChildren;

    // Handle descriptors - fast path
    if (isDescriptor(view)) {
      return view.children || _emptyChildren;
    }

    // Handle legacy View instances
    // Check for explicit children property
    if (view.children && Array.isArray(view.children)) {
      return view.children.filter(c => c instanceof View || isDescriptor(c));
    }

    // Check for _children property (VStack, HStack, ZStack, etc.)
    if (view._children && Array.isArray(view._children)) {
      return view._children.filter(c => c instanceof View || isDescriptor(c));
    }

    // Check for content property (stacks, etc.)
    if (view._content && Array.isArray(view._content)) {
      return view._content.filter(c => c instanceof View || isDescriptor(c));
    }

    // Try to get body and extract children
    try {
      const body = view.body();
      if (body && body !== view) {
        if (Array.isArray(body)) {
          return body.filter(c => c instanceof View || isDescriptor(c));
        }
        if (body instanceof View || isDescriptor(body)) {
          return [body];
        }
      }
    } catch (e) {
      // body() might throw or not exist
    }

    return _emptyChildren;
  }

  /**
   * Render a view or descriptor to DOM
   * @param {View|Object} view
   * @returns {HTMLElement}
   */
  _renderView(view) {
    if (isDescriptor(view)) {
      return renderDescriptor(view);
    }
    return view._render();
  }

  /**
   * Mount a view tree to a DOM element
   * @param {View|Object} view - Root view or descriptor
   * @param {HTMLElement} container - Target container
   * @returns {VNode} The mounted tree
   */
  mount(view, container) {
    this._stats.mounts++;

    // Build virtual tree
    const tree = this.buildTree(view);

    // Render to DOM
    tree.element = this._renderView(view);

    // Recycle old elements before clearing
    const oldChild = container.firstChild;
    if (oldChild) {
      releaseTree(oldChild);
    }
    container.textContent = ''; // Faster than innerHTML = ''
    container.appendChild(tree.element);

    // Link child elements to VNodes by walking both trees
    this._linkElements(tree, tree.element);

    // Store tree for future reconciliation
    this._trees.set(container, tree);

    // Flush lifecycle callbacks
    flushLifecycleCallbacks();

    if (this._debug) {
      console.log('[Reconciler] Mounted tree:', this._serializeTree(tree));
    }

    return tree;
  }

  /**
   * Recursively link DOM elements to VNodes.
   * @param {VNode} node - Current VNode
   * @param {HTMLElement} element - Current DOM element
   */
  _linkElements(node, element) {
    if (!node || !element) return;

    node.element = element;

    // Get child elements (direct children of this container)
    const childElements = element.children;
    const nodeChildren = node.children;

    for (let i = 0, len = Math.min(nodeChildren.length, childElements.length); i < len; i++) {
      this._linkElements(nodeChildren[i], childElements[i]);
    }
  }

  /**
   * Update a mounted view tree with optimized diffing
   * @param {View|Object} newView - New root view or descriptor
   * @param {HTMLElement} container - Target container
   * @returns {VNode} The updated tree
   */
  update(newView, container) {
    this._stats.updates++;

    const oldTree = this._trees.get(container);

    if (!oldTree) {
      return this.mount(newView, container);
    }

    // Build new virtual tree
    const newTree = this.buildTree(newView);

    // Diff and collect patches into the reusable buffer
    _patchBuffer.length = 0;
    this._diff(oldTree, newTree, '', _patchBuffer);

    if (this._debug) {
      console.log('[Reconciler] Patches count:', _patchBuffer.length);
    }

    // Apply patches
    this._applyPatches(container, oldTree, newTree, _patchBuffer);

    // Store updated tree
    this._trees.set(container, newTree);

    // Flush lifecycle callbacks after all DOM mutations
    flushLifecycleCallbacks();

    return newTree;
  }

  /**
   * Diff two virtual trees with keyed child optimization.
   * Pushes patches directly into the output array to avoid allocations.
   *
   * @param {VNode} oldNode
   * @param {VNode} newNode
   * @param {string} path
   * @param {Array} patches - Output array for patches
   */
  _diff(oldNode, newNode, path, patches) {
    // Both null - no change
    if (!oldNode && !newNode) return;

    // Node added
    if (!oldNode && newNode) {
      patches.push({ type: 'INSERT', path, node: newNode });
      return;
    }

    // Node removed
    if (oldNode && !newNode) {
      patches.push({ type: 'REMOVE', path, node: oldNode });
      return;
    }

    // Different type - replace
    if (oldNode.type !== newNode.type) {
      patches.push({ type: 'REPLACE', path, oldNode, newNode });
      return;
    }

    // Different key - replace (identity changed)
    if (oldNode.key !== newNode.key) {
      patches.push({ type: 'REPLACE', path, oldNode, newNode });

      // Track identity change for legacy views
      if (!newNode.isDescriptor && newNode.view?._viewId) {
        ChangeTracker.recordIdentityChange(newNode.view._viewId);
      }
      return;
    }

    // Fast path: descriptor hash comparison
    // If both nodes are descriptors and hashes match, skip entire subtree
    if (oldNode.isDescriptor && newNode.isDescriptor) {
      if (oldNode.hash === newNode.hash && isMemoized(newNode.view)) {
        // Subtree is identical - reuse entire DOM
        newNode.element = oldNode.element;
        newNode.children = oldNode.children;
        this._stats.subtreesSkipped++;
        return;
      }
    }

    // Check if content changed
    const selfChanged = this._viewChanged(oldNode, newNode);
    if (selfChanged) {
      patches.push({ type: 'UPDATE', path, oldNode, newNode });

      // Track self change for legacy views
      if (!newNode.isDescriptor && newNode.view?._viewId) {
        ChangeTracker.recordSelfChange(newNode.view._viewId);
      }
    }

    // Carry over the DOM element reference
    newNode.element = oldNode.element;

    // Skip child diffing if this node will be fully re-rendered by UPDATE
    if (!selfChanged) {
      this._diffChildren(oldNode.children, newNode.children, path, patches);
    }
  }

  /**
   * Diff children with keyed optimization.
   * Uses a two-pass algorithm for O(n) complexity with keys.
   *
   * @param {VNode[]} oldChildren
   * @param {VNode[]} newChildren
   * @param {string} parentPath
   * @param {Array} patches - Output array
   */
  _diffChildren(oldChildren, newChildren, parentPath, patches) {
    const oldLen = oldChildren.length;
    const newLen = newChildren.length;

    // Fast path: both empty
    if (oldLen === 0 && newLen === 0) return;

    // Fast path: all new (old was empty)
    if (oldLen === 0) {
      for (let i = 0; i < newLen; i++) {
        patches.push({
          type: 'INSERT',
          path: `${parentPath}/${i}`,
          node: newChildren[i]
        });
      }
      return;
    }

    // Fast path: all removed (new is empty)
    if (newLen === 0) {
      for (let i = 0; i < oldLen; i++) {
        patches.push({
          type: 'REMOVE',
          path: `${parentPath}/${i}`,
          node: oldChildren[i]
        });
      }
      return;
    }

    // Check if any children have keys
    let hasKeys = false;
    for (let i = 0; i < oldLen; i++) {
      if (oldChildren[i].key != null) { hasKeys = true; break; }
    }
    if (!hasKeys) {
      for (let i = 0; i < newLen; i++) {
        if (newChildren[i].key != null) { hasKeys = true; break; }
      }
    }

    if (!hasKeys) {
      // Fast path: no keys, match by position
      const minLen = Math.min(oldLen, newLen);
      for (let i = 0; i < minLen; i++) {
        this._diff(oldChildren[i], newChildren[i], `${parentPath}/${i}`, patches);
      }
      // Handle added children
      for (let i = minLen; i < newLen; i++) {
        patches.push({
          type: 'INSERT',
          path: `${parentPath}/${i}`,
          node: newChildren[i]
        });
      }
      // Handle removed children
      for (let i = minLen; i < oldLen; i++) {
        patches.push({
          type: 'REMOVE',
          path: `${parentPath}/${i}`,
          node: oldChildren[i]
        });
      }
      return;
    }

    // Keyed children: two-pass algorithm for O(n) complexity
    const oldKeyedChildren = new Map();
    const oldUnkeyedChildren = [];

    for (let i = 0; i < oldLen; i++) {
      const child = oldChildren[i];
      if (child.key != null) {
        oldKeyedChildren.set(child.key, { node: child, index: i });
      } else {
        oldUnkeyedChildren.push({ node: child, index: i });
      }
    }

    const matchedOldIndices = new Set();
    let unkeyedIndex = 0;

    // First pass: match new children to old children
    for (let i = 0; i < newLen; i++) {
      const newChild = newChildren[i];
      const path = `${parentPath}/${i}`;
      let oldChild = null;

      if (newChild.key != null) {
        const oldKeyed = oldKeyedChildren.get(newChild.key);
        if (oldKeyed) {
          oldChild = oldKeyed.node;
          matchedOldIndices.add(oldKeyed.index);
        }
      } else {
        while (unkeyedIndex < oldUnkeyedChildren.length) {
          const candidate = oldUnkeyedChildren[unkeyedIndex];
          if (!matchedOldIndices.has(candidate.index)) {
            oldChild = candidate.node;
            matchedOldIndices.add(candidate.index);
            unkeyedIndex++;
            break;
          }
          unkeyedIndex++;
        }
      }

      this._diff(oldChild, newChild, path, patches);
    }

    // Second pass: remove unmatched old children
    for (let i = 0; i < oldLen; i++) {
      if (!matchedOldIndices.has(i)) {
        patches.push({
          type: 'REMOVE',
          path: `${parentPath}/${i}`,
          node: oldChildren[i]
        });
      }
    }
  }

  /**
   * Check if a view's content has changed.
   * Optimized with fast numeric hash comparison for descriptors.
   *
   * @param {VNode} oldNode
   * @param {VNode} newNode
   * @returns {boolean}
   */
  _viewChanged(oldNode, newNode) {
    const oldView = oldNode.view;
    const newView = newNode.view;

    if (!oldView || !newView) return true;

    // For descriptors, use fast equality check
    if (oldNode.isDescriptor && newNode.isDescriptor) {
      // Fast path: hash comparison (numeric, O(1))
      if (oldNode.hash !== newNode.hash) return true;

      // Memoized descriptors are considered unchanged
      if (isMemoized(newView)) return false;

      // Hashes match - do full comparison to rule out collision
      return !descriptorsEqual(oldView, newView);
    }

    // For legacy views, check properties
    if (oldView._content !== undefined && newView._content !== undefined) {
      return oldView._content !== newView._content;
    }

    // Check key properties that might indicate change
    const propsToCheck = ['_text', '_title', '_label', '_value', '_isOn', '_selected'];
    for (let i = 0; i < propsToCheck.length; i++) {
      if (oldView[propsToCheck[i]] !== newView[propsToCheck[i]]) {
        return true;
      }
    }

    // Check children count
    const oldChildren = this._getViewChildren(oldView);
    const newChildren = this._getViewChildren(newView);
    if (oldChildren.length !== newChildren.length) {
      return true;
    }

    return false;
  }

  /**
   * Apply patches to the DOM.
   * Optimized to:
   * - Recycle removed elements into the pool
   * - Use in-place text updates where possible
   * - Batch DOM mutations
   *
   * @param {HTMLElement} container
   * @param {VNode} oldTree
   * @param {VNode} newTree
   * @param {Array} patches
   */
  _applyPatches(container, oldTree, newTree, patches) {
    if (patches.length === 0) return;

    // Classify patches (single pass, no filter())
    let hasRootReplace = false;
    let replaceCount = 0;
    let updateCount = 0;
    let insertCount = 0;
    let removeCount = 0;

    for (let i = 0; i < patches.length; i++) {
      const p = patches[i];
      switch (p.type) {
        case 'REPLACE': replaceCount++; if (p.path === '') hasRootReplace = true; break;
        case 'UPDATE': updateCount++; break;
        case 'INSERT': insertCount++; break;
        case 'REMOVE': removeCount++; break;
      }
    }

    // If root needs full replace or too many patches, do full re-render
    if (hasRootReplace || patches.length > 30) {
      this._stats.fullRerenders++;

      if (this._debug) {
        console.log('[Reconciler] Full re-render:', hasRootReplace ? 'root replaced' : 'too many patches');
      }

      // Recycle old tree elements
      const oldChild = container.firstChild;
      if (oldChild) {
        releaseTree(oldChild);
      }

      // Full re-render
      const element = this._renderView(newTree.view);
      container.textContent = '';
      container.appendChild(element);
      newTree.element = element;

      this._linkElements(newTree, element);
      return;
    }

    this._stats.patchesApplied += patches.length;

    // Apply patches in optimal order: updates first, then removes (reverse), then inserts, then replaces
    for (let i = 0; i < patches.length; i++) {
      const patch = patches[i];
      if (patch.type === 'UPDATE') {
        this._applyUpdate(patch);
      }
    }

    // Collect removes and sort by path descending to maintain indices
    if (removeCount > 0) {
      const removes = [];
      for (let i = 0; i < patches.length; i++) {
        if (patches[i].type === 'REMOVE') removes.push(patches[i]);
      }
      // Sort by path descending so later indices are removed first
      removes.sort((a, b) => b.path.localeCompare(a.path));
      for (let i = 0; i < removes.length; i++) {
        this._applyRemove(removes[i]);
      }
    }

    for (let i = 0; i < patches.length; i++) {
      const patch = patches[i];
      if (patch.type === 'INSERT') {
        this._applyInsert(patch, container);
      }
    }

    for (let i = 0; i < patches.length; i++) {
      const patch = patches[i];
      if (patch.type === 'REPLACE') {
        this._applyReplace(patch);
      }
    }
  }

  /**
   * Apply an UPDATE patch.
   * Optimized: for text-only changes, updates textContent in-place.
   *
   * @param {Object} patch
   */
  _applyUpdate(patch) {
    const { oldNode, newNode } = patch;

    if (oldNode.element && newNode.view) {
      // Optimization: in-place text update for Text nodes
      if (newNode.type === 'Text' && oldNode.type === 'Text') {
        const oldView = oldNode.view;
        const newView = newNode.view;

        if (newNode.isDescriptor && oldNode.isDescriptor) {
          // Descriptor text: check if only content changed
          if (oldView.props.content !== newView.props.content) {
            const oldProps = oldView.props;
            const newProps = newView.props;
            let onlyContentChanged = true;

            // Check if all other props are the same
            const keys = Object.keys(newProps);
            for (let i = 0; i < keys.length; i++) {
              const k = keys[i];
              if (k === 'content') continue;
              if (typeof oldProps[k] === 'function') continue;
              if (oldProps[k] !== newProps[k]) {
                onlyContentChanged = false;
                break;
              }
            }

            if (onlyContentChanged && oldView.modifiers.length === newView.modifiers.length) {
              // Just update the text content - no need to re-render
              oldNode.element.textContent = String(newProps.content ?? '');
              newNode.element = oldNode.element;
              this._stats.textUpdatesInPlace++;
              return;
            }
          }
        } else if (!newNode.isDescriptor && !oldNode.isDescriptor) {
          // Legacy Text: check _content
          if (oldView._content !== newView._content &&
              oldView._modifiers.length === newView._modifiers.length) {
            oldNode.element.textContent = String(newView._content);
            newNode.element = oldNode.element;
            this._stats.textUpdatesInPlace++;
            return;
          }
        }
      }

      // Full re-render of this node
      const newElement = this._renderView(newNode.view);

      if (oldNode.element.parentNode) {
        oldNode.element.parentNode.replaceChild(newElement, oldNode.element);
      }

      // Recycle old element
      releaseTree(oldNode.element);

      newNode.element = newElement;
      this._linkElements(newNode, newElement);

      if (this._debug) {
        console.log(`[Reconciler] Updated: ${newNode.type}`);
      }
    }
  }

  /**
   * Apply a REMOVE patch with element recycling.
   * @param {Object} patch
   */
  _applyRemove(patch) {
    const { node } = patch;

    if (node.element && node.element.parentNode) {
      node.element.parentNode.removeChild(node.element);

      // Recycle the removed element and its subtree
      releaseTree(node.element);
      this._stats.elementsRecycled++;

      if (this._debug) {
        console.log(`[Reconciler] Removed: ${node.type}`);
      }
    }
  }

  /**
   * Apply an INSERT patch
   * @param {Object} patch
   * @param {HTMLElement} container
   */
  _applyInsert(patch, container) {
    const { node } = patch;

    if (node.view) {
      const element = this._renderView(node.view);
      node.element = element;

      container.appendChild(element);

      if (this._debug) {
        console.log(`[Reconciler] Inserted: ${node.type}`);
      }
    }
  }

  /**
   * Apply a REPLACE patch with element recycling.
   * @param {Object} patch
   */
  _applyReplace(patch) {
    const { oldNode, newNode } = patch;

    if (oldNode.element && newNode.view) {
      const newElement = this._renderView(newNode.view);

      if (oldNode.element.parentNode) {
        oldNode.element.parentNode.replaceChild(newElement, oldNode.element);
      }

      // Recycle old element
      releaseTree(oldNode.element);

      newNode.element = newElement;
      this._linkElements(newNode, newElement);

      if (this._debug) {
        console.log(`[Reconciler] Replaced: ${oldNode.type} -> ${newNode.type}`);
      }
    }
  }

  /**
   * Serialize tree for debugging
   * @param {VNode} node
   * @param {number} depth
   * @returns {string}
   */
  _serializeTree(node, depth = 0) {
    if (!node) return '';

    const indent = '  '.repeat(depth);
    let str = `${indent}${node.type}`;
    if (node.key) str += ` [key=${node.key}]`;
    if (node.isDescriptor) str += ' (descriptor)';
    str += '\n';

    for (let i = 0; i < node.children.length; i++) {
      str += this._serializeTree(node.children[i], depth + 1);
    }

    return str;
  }

  /**
   * Unmount a tree from a container with element recycling.
   * @param {HTMLElement} container
   */
  unmount(container) {
    const oldTree = this._trees.get(container);
    if (oldTree && oldTree.element) {
      releaseTree(oldTree.element);
    }
    this._trees.delete(container);
    container.textContent = '';
  }

  /**
   * Get detailed performance statistics.
   * @returns {Object}
   */
  getStats() {
    return {
      mountedTrees: this._trees.size,
      totalIds: this._idCounter,
      ...this._stats,
    };
  }

  /**
   * Reset performance statistics.
   */
  resetStats() {
    this._stats = {
      mounts: 0,
      updates: 0,
      patchesApplied: 0,
      subtreesSkipped: 0,
      elementsRecycled: 0,
      fullRerenders: 0,
      textUpdatesInPlace: 0,
    };
  }
}

// Singleton instance
export const Reconciler = new ReconcilerClass();

export default Reconciler;
