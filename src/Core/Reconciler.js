/**
 * Reconciler - Efficient DOM diffing and patching
 *
 * Implements a virtual DOM-style reconciliation algorithm to enable
 * partial updates instead of full re-renders.
 *
 * Key concepts:
 * - View Identity: Each view has a stable identity based on type + position
 * - Diffing: Compare old and new view trees to find changes
 * - Patching: Apply only the necessary DOM mutations
 *
 * SwiftUI uses similar concepts:
 * - Structural identity (position in view hierarchy)
 * - Explicit identity (via .id() modifier)
 * - Attribute graph for dependency tracking
 */

import { View } from './View.js';
import { ChangeTracker } from './ChangeTracker.js';

/**
 * View node in the virtual tree
 */
class VNode {
  constructor(view, key = null) {
    /** @type {View} The view instance */
    this.view = view;

    /** @type {string|null} Explicit key/id */
    this.key = key;

    /** @type {string} View type name */
    this.type = view?.constructor?.name || 'Unknown';

    /** @type {VNode[]} Child nodes */
    this.children = [];

    /** @type {HTMLElement|null} Rendered DOM element */
    this.element = null;

    /** @type {string} Computed identity (type + position + key) */
    this.identity = '';
  }
}

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
   * Build a virtual node tree from a view
   * @param {View} view - Root view
   * @param {string} parentPath - Path from root
   * @param {number} index - Index among siblings
   * @returns {VNode}
   */
  buildTree(view, parentPath = '', index = 0) {
    if (!view) return null;

    const key = view._explicitId || null;
    const node = new VNode(view, key);

    // Compute identity
    const pathSegment = key ? `[${key}]` : `[${index}]`;
    node.identity = `${parentPath}/${node.type}${pathSegment}`;

    // Assign view ID for change tracking
    if (!view._viewId) {
      view._viewId = node.identity;
    }

    // Get children if this is a container view
    const children = this._getViewChildren(view);
    node.children = children.map((child, i) =>
      this.buildTree(child, node.identity, i)
    ).filter(Boolean);

    return node;
  }

  /**
   * Extract children from a view
   * @param {View} view
   * @returns {View[]}
   */
  _getViewChildren(view) {
    if (!view) return [];

    // Check for explicit children property
    if (view.children && Array.isArray(view.children)) {
      return view.children.filter(c => c instanceof View);
    }

    // Check for _children property (VStack, HStack, ZStack, etc.)
    if (view._children && Array.isArray(view._children)) {
      return view._children.filter(c => c instanceof View);
    }

    // Check for content property (stacks, etc.)
    if (view._content && Array.isArray(view._content)) {
      return view._content.filter(c => c instanceof View);
    }

    // Try to get body and extract children
    try {
      const body = view.body();
      if (body && body !== view) {
        if (Array.isArray(body)) {
          return body.filter(c => c instanceof View);
        }
        if (body instanceof View) {
          return [body];
        }
      }
    } catch (e) {
      // body() might throw or not exist
    }

    return [];
  }

  /**
   * Mount a view tree to a DOM element
   * @param {View} view - Root view
   * @param {HTMLElement} container - Target container
   * @returns {VNode} The mounted tree
   */
  mount(view, container) {
    // Build virtual tree
    const tree = this.buildTree(view);

    // Render to DOM
    tree.element = view._render();
    container.innerHTML = '';
    container.appendChild(tree.element);

    // Link child elements to VNodes by walking both trees
    this._linkElements(tree, tree.element);

    // Store tree for future reconciliation
    this._trees.set(container, tree);

    if (this._debug) {
      console.log('[Reconciler] Mounted tree:', this._serializeTree(tree));
    }

    return tree;
  }

  /**
   * Recursively link DOM elements to VNodes.
   * SwiftUI matches children by position index (TupleView pattern).
   * @param {VNode} node - Current VNode
   * @param {HTMLElement} element - Current DOM element
   */
  _linkElements(node, element) {
    if (!node || !element) return;

    node.element = element;

    // Get child elements (direct children of this container)
    const childElements = Array.from(element.children);

    // Match VNode children to DOM children by position index
    // This mirrors SwiftUI's TupleView behavior where children
    // at the same index are considered the same identity
    for (let i = 0; i < node.children.length; i++) {
      const childNode = node.children[i];
      const childElement = childElements[i];

      if (childNode && childElement) {
        this._linkElements(childNode, childElement);
      }
    }
  }

  /**
   * Update a mounted view tree
   * @param {View} newView - New root view
   * @param {HTMLElement} container - Target container
   * @returns {VNode} The updated tree
   */
  update(newView, container) {
    const oldTree = this._trees.get(container);

    if (!oldTree) {
      // No existing tree, do a full mount
      return this.mount(newView, container);
    }

    // Build new virtual tree
    const newTree = this.buildTree(newView);

    // Diff and patch
    const patches = this._diff(oldTree, newTree);

    if (this._debug) {
      console.log('[Reconciler] Patches:', patches);
      console.log('[Reconciler] Patches count:', patches.length);
      patches.forEach((p, i) => {
        console.log(`[Reconciler] Patch ${i}: type=${p.type}, path=${p.path}`);
        if (p.newNode) {
          console.log(`[Reconciler] Patch ${i}: newNode.type=${p.newNode.type}, content=${p.newNode.view?._content}`);
        }
        if (p.oldNode) {
          console.log(`[Reconciler] Patch ${i}: oldNode.type=${p.oldNode.type}, content=${p.oldNode.view?._content}, element=${p.oldNode.element?.tagName}`);
        }
      });
    }

    // Apply patches
    this._applyPatches(container, oldTree, newTree, patches);

    // Store updated tree
    this._trees.set(container, newTree);

    return newTree;
  }

  /**
   * Diff two virtual trees
   * @param {VNode} oldNode
   * @param {VNode} newNode
   * @param {string} path
   * @returns {Array} Array of patch operations
   */
  _diff(oldNode, newNode, path = '') {
    const patches = [];

    // Both null - no change
    if (!oldNode && !newNode) {
      return patches;
    }

    // Node added
    if (!oldNode && newNode) {
      patches.push({
        type: 'INSERT',
        path,
        node: newNode
      });
      return patches;
    }

    // Node removed
    if (oldNode && !newNode) {
      patches.push({
        type: 'REMOVE',
        path,
        node: oldNode
      });
      return patches;
    }

    // Different type or key - replace
    if (oldNode.type !== newNode.type || oldNode.key !== newNode.key) {
      patches.push({
        type: 'REPLACE',
        path,
        oldNode,
        newNode
      });

      // Track identity change
      if (newNode.view && newNode.view._viewId) {
        ChangeTracker.recordIdentityChange(newNode.view._viewId);
      }

      return patches;
    }

    // Same type - check if view content changed
    if (this._viewChanged(oldNode.view, newNode.view)) {
      patches.push({
        type: 'UPDATE',
        path,
        oldNode,
        newNode
      });

      // Track self change
      if (newNode.view && newNode.view._viewId) {
        ChangeTracker.recordSelfChange(newNode.view._viewId);
      }
    }

    // Carry over the DOM element reference
    newNode.element = oldNode.element;

    // Diff children
    const maxChildren = Math.max(oldNode.children.length, newNode.children.length);
    for (let i = 0; i < maxChildren; i++) {
      const childPatches = this._diff(
        oldNode.children[i],
        newNode.children[i],
        `${path}/${i}`
      );
      patches.push(...childPatches);
    }

    return patches;
  }

  /**
   * Check if a view's content has changed
   * @param {View} oldView
   * @param {View} newView
   * @returns {boolean}
   */
  _viewChanged(oldView, newView) {
    if (!oldView || !newView) return true;

    // Check text content for Text views
    if (oldView._content !== undefined && newView._content !== undefined) {
      return oldView._content !== newView._content;
    }

    // Check key properties that might indicate change
    const propsToCheck = ['_text', '_title', '_label', '_value', '_isOn', '_selected'];
    for (const prop of propsToCheck) {
      if (oldView[prop] !== newView[prop]) {
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
   * Apply patches to the DOM
   * @param {HTMLElement} container
   * @param {VNode} oldTree
   * @param {VNode} newTree
   * @param {Array} patches
   */
  _applyPatches(container, oldTree, newTree, patches) {
    // Group patches by type for efficient processing
    const replacePatches = patches.filter(p => p.type === 'REPLACE');
    const updatePatches = patches.filter(p => p.type === 'UPDATE');
    const insertPatches = patches.filter(p => p.type === 'INSERT');
    const removePatches = patches.filter(p => p.type === 'REMOVE');

    // If root needs full replace or too many patches, do full re-render
    const rootReplace = replacePatches.some(p => p.path === '');
    const tooManyPatches = patches.length > 10;

    if (rootReplace || tooManyPatches) {
      if (this._debug) {
        console.log('[Reconciler] Full re-render:', rootReplace ? 'root replaced' : 'too many patches');
      }

      // Full re-render
      const element = newTree.view._render();
      container.innerHTML = '';
      container.appendChild(element);
      newTree.element = element;
      return;
    }

    // Apply updates in place
    for (const patch of updatePatches) {
      this._applyUpdate(patch);
    }

    // Handle removes (process in reverse order to maintain indices)
    for (const patch of removePatches.reverse()) {
      this._applyRemove(patch);
    }

    // Handle inserts
    for (const patch of insertPatches) {
      this._applyInsert(patch, container);
    }

    // Handle replacements
    for (const patch of replacePatches) {
      this._applyReplace(patch);
    }
  }

  /**
   * Apply an UPDATE patch
   * @param {Object} patch
   */
  _applyUpdate(patch) {
    const { oldNode, newNode } = patch;

    if (oldNode.element && newNode.view) {
      // Re-render just this node
      const newElement = newNode.view._render();

      if (oldNode.element.parentNode) {
        oldNode.element.parentNode.replaceChild(newElement, oldNode.element);
      }

      newNode.element = newElement;

      if (this._debug) {
        console.log(`[Reconciler] Updated: ${newNode.type}`);
      }
    }
  }

  /**
   * Apply a REMOVE patch
   * @param {Object} patch
   */
  _applyRemove(patch) {
    const { node } = patch;

    if (node.element && node.element.parentNode) {
      node.element.parentNode.removeChild(node.element);

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
      const element = node.view._render();
      node.element = element;

      // Find parent and insert position
      // For simplicity, append to container
      container.appendChild(element);

      if (this._debug) {
        console.log(`[Reconciler] Inserted: ${node.type}`);
      }
    }
  }

  /**
   * Apply a REPLACE patch
   * @param {Object} patch
   */
  _applyReplace(patch) {
    const { oldNode, newNode } = patch;

    if (oldNode.element && newNode.view) {
      const newElement = newNode.view._render();

      if (oldNode.element.parentNode) {
        oldNode.element.parentNode.replaceChild(newElement, oldNode.element);
      }

      newNode.element = newElement;

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
    str += '\n';

    for (const child of node.children) {
      str += this._serializeTree(child, depth + 1);
    }

    return str;
  }

  /**
   * Unmount a tree from a container
   * @param {HTMLElement} container
   */
  unmount(container) {
    this._trees.delete(container);
    container.innerHTML = '';
  }

  /**
   * Get statistics about current reconciliation
   * @returns {Object}
   */
  getStats() {
    return {
      mountedTrees: this._trees.size,
      totalIds: this._idCounter
    };
  }
}

// Singleton instance
export const Reconciler = new ReconcilerClass();

export default Reconciler;
