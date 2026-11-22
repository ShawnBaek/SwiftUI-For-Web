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

import { nextElementId } from '../../Core/ElementID.js';
import { View } from '../../Core/View.js';
import { isDescriptor } from '../../Core/ViewDescriptor.js';
import { render as renderDescriptor } from '../../Core/Renderer.js';
import { createEffect, getOwner } from '../../Data/Signal.js';

// A child or label that is a legacy View or a view descriptor (#48).
function renderContent(view) {
  if (view instanceof View) return view._render();
  if (isDescriptor(view)) return renderDescriptor(view);
  return null;
}
import { Color } from '../../Graphic/Color.js';

function nextDisclosureId() {
  return nextElementId('swiftui-disclosure');
}

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
    header.type = 'button';
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
      // The label is a builder function, a view, or plain text.
      const label = typeof this._label === 'function' ? this._label() : this._label;
      if (typeof label === 'string') labelContainer.textContent = label;
      else {
        const rendered = renderContent(label);
        if (rendered) labelContainer.appendChild(rendered);
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
    // #51: the header reports the state and the region it controls, and the
    // collapsed region is removed from keyboard and screen-reader access
    // (max-height 0 alone still exposes it).
    content.id = nextDisclosureId();
    header.setAttribute('aria-controls', content.id);
    const applyExpandedState = (expanded) => {
      header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      content.inert = !expanded;
      if (expanded) content.removeAttribute('aria-hidden');
      else content.setAttribute('aria-hidden', 'true');
    };
    applyExpandedState(isExpanded);

    // Content wrapper for proper padding
    const contentWrapper = document.createElement('div');
    contentWrapper.style.borderTop = '1px solid rgba(60, 60, 67, 0.1)';

    let rowIndex = 0;
    this._children.forEach((child) => {
      const rendered = renderContent(child);
      if (!rendered) return;
      const row = document.createElement('div');
      row.style.padding = '11px 16px';
      if (rowIndex > 0) {
        row.style.borderTop = '1px solid rgba(60, 60, 67, 0.1)';
      }
      rowIndex++;
      row.appendChild(rendered);
      contentWrapper.appendChild(row);
    });

    content.appendChild(contentWrapper);

    // Show an expanded state, animating the height.
    let shown = isExpanded;
    const show = (expanded) => {
      if (expanded === shown) return;
      shown = expanded;
      applyExpandedState(expanded);
      chevron.style.transform = expanded ? 'rotate(90deg)' : 'rotate(0deg)';
      if (expanded) {
        content.style.maxHeight = content.scrollHeight + 'px';
        setTimeout(() => {
          if (shown) content.style.maxHeight = 'none';
        }, 300);
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        requestAnimationFrame(() => {
          if (!shown) content.style.maxHeight = '0';
        });
      }
    };

    // Toggle handler
    header.addEventListener('click', () => {
      const newExpanded = !this._getExpanded();
      this._setExpanded(newExpanded);
      show(newExpanded);
    });

    // Follow writes to the isExpanded binding made elsewhere (#48), such as
    // an "Expand all" button. Needs a reactive owner (the App mount has one).
    if (this._isExpanded && getOwner()) {
      createEffect(() => {
        show(Boolean(this._getExpanded()));
      });
    }

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
