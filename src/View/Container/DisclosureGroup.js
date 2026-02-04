/**
 * DisclosureGroup - A view that shows or hides content based on a disclosure state
 *
 * Matches SwiftUI's DisclosureGroup for expandable/collapsible sections.
 *
 * @example
 * DisclosureGroup('Options',
 *   Toggle('Option 1', $option1),
 *   Toggle('Option 2', $option2)
 * )
 *
 * @example
 * DisclosureGroup($isExpanded, {
 *   label: () => Text('Advanced Settings')
 * },
 *   TextField('API Key', $apiKey),
 *   Toggle('Debug Mode', $debugMode)
 * )
 */

import { View } from '../../Core/View.js';
import { Color } from '../../Graphic/Color.js';

/**
 * DisclosureGroup view class
 */
export class DisclosureGroupView extends View {
  constructor(...args) {
    super();

    this._isExpanded = null;
    this._isExpandedInternal = false;
    this._label = null;
    this._labelText = null;
    this._children = [];

    // Parse arguments
    if (typeof args[0] === 'string') {
      // DisclosureGroup('Label', children...)
      this._labelText = args[0];
      this._children = args.slice(1).flat();
    } else if (args[0] && ('value' in args[0] || 'wrappedValue' in args[0])) {
      // DisclosureGroup($isExpanded, { label }, children...)
      this._isExpanded = args[0];
      if (typeof args[1] === 'object' && !(args[1] instanceof View)) {
        this._label = args[1].label ?? null;
        this._children = args.slice(2).flat();
      } else {
        this._children = args.slice(1).flat();
      }
    } else if (typeof args[0] === 'object' && !(args[0] instanceof View)) {
      // DisclosureGroup({ label }, children...)
      this._label = args[0].label ?? null;
      this._children = args.slice(1).flat();
    } else {
      // DisclosureGroup(children...)
      this._children = args.flat();
    }
  }

  /**
   * Get expanded state
   * @private
   */
  _getExpanded() {
    if (this._isExpanded) {
      return this._isExpanded.value ?? this._isExpanded.wrappedValue ?? false;
    }
    return this._isExpandedInternal;
  }

  /**
   * Set expanded state
   * @private
   */
  _setExpanded(value) {
    if (this._isExpanded) {
      if ('value' in this._isExpanded) {
        this._isExpanded.value = value;
      } else if ('wrappedValue' in this._isExpanded) {
        this._isExpanded.wrappedValue = value;
      }
    } else {
      this._isExpandedInternal = value;
    }
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'disclosure-group';
    container.style.backgroundColor = 'white';
    container.style.borderRadius = '10px';
    container.style.overflow = 'hidden';

    const isExpanded = this._getExpanded();

    // Header (clickable to expand/collapse)
    const header = document.createElement('button');
    header.dataset.disclosurePart = 'header';
    header.style.width = '100%';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '11px 16px';
    header.style.border = 'none';
    header.style.background = 'transparent';
    header.style.cursor = 'pointer';
    header.style.fontSize = '17px';
    header.style.textAlign = 'left';
    header.style.transition = 'background-color 0.15s ease';

    header.addEventListener('mouseenter', () => {
      header.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
    });
    header.addEventListener('mouseleave', () => {
      header.style.backgroundColor = 'transparent';
    });

    // Label
    const labelContainer = document.createElement('span');
    if (this._label) {
      const labelView = this._label();
      if (labelView instanceof View) {
        labelContainer.appendChild(labelView._render());
      }
    } else if (this._labelText) {
      labelContainer.textContent = this._labelText;
    }
    header.appendChild(labelContainer);

    // Chevron indicator
    const chevron = document.createElement('span');
    chevron.textContent = '›';
    chevron.style.fontSize = '20px';
    chevron.style.color = 'rgba(60, 60, 67, 0.3)';
    chevron.style.transform = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
    chevron.style.transition = 'transform 0.2s ease';
    header.appendChild(chevron);

    // Content area
    const content = document.createElement('div');
    content.dataset.disclosurePart = 'content';
    content.style.overflow = 'hidden';
    content.style.maxHeight = isExpanded ? 'none' : '0';
    content.style.transition = 'max-height 0.3s ease';

    // Content wrapper for proper padding
    const contentWrapper = document.createElement('div');
    contentWrapper.style.borderTop = '1px solid rgba(60, 60, 67, 0.1)';

    this._children.forEach((child, index) => {
      if (child instanceof View) {
        const row = document.createElement('div');
        row.style.padding = '11px 16px';

        if (index > 0) {
          row.style.borderTop = '1px solid rgba(60, 60, 67, 0.1)';
        }

        row.appendChild(child._render());
        contentWrapper.appendChild(row);
      }
    });

    content.appendChild(contentWrapper);

    // Toggle handler
    header.addEventListener('click', () => {
      const newExpanded = !this._getExpanded();
      this._setExpanded(newExpanded);

      // Animate
      chevron.style.transform = newExpanded ? 'rotate(90deg)' : 'rotate(0deg)';

      if (newExpanded) {
        // Expand
        content.style.maxHeight = content.scrollHeight + 'px';
        setTimeout(() => {
          content.style.maxHeight = 'none';
        }, 300);
      } else {
        // Collapse
        content.style.maxHeight = content.scrollHeight + 'px';
        requestAnimationFrame(() => {
          content.style.maxHeight = '0';
        });
      }
    });

    container.appendChild(header);
    container.appendChild(content);

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for DisclosureGroup
 */
export function DisclosureGroup(...args) {
  return new DisclosureGroupView(...args);
}

export default DisclosureGroup;
