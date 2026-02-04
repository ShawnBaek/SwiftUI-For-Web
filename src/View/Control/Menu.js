/**
 * Menu - A control for presenting a menu of actions
 *
 * Matches SwiftUI's Menu for dropdown action menus.
 *
 * @example
 * Menu('Options',
 *   Button('Copy', () => handleCopy()),
 *   Button('Paste', () => handlePaste()),
 *   Divider(),
 *   Button('Delete', () => handleDelete())
 *     .foregroundColor(Color.red)
 * )
 *
 * @example
 * Menu({
 *   label: () => Label('Sort', { systemImage: 'arrow.up.arrow.down' })
 * },
 *   Button('Name', () => sortBy('name')),
 *   Button('Date', () => sortBy('date')),
 *   Button('Size', () => sortBy('size'))
 * )
 */

import { View } from '../../Core/View.js';
import { Color } from '../../Graphic/Color.js';

/**
 * Menu view class
 */
export class MenuView extends View {
  constructor(...args) {
    super();

    this._label = null;
    this._labelText = null;
    this._content = [];
    this._isOpen = false;

    // Parse arguments
    if (typeof args[0] === 'string') {
      // Menu('Label', ...content)
      this._labelText = args[0];
      this._content = args.slice(1).flat();
    } else if (typeof args[0] === 'object' && !(args[0] instanceof View)) {
      // Menu({ label: () => View }, ...content)
      this._label = args[0].label ?? null;
      this._content = args.slice(1).flat();
    } else {
      // Menu(...content)
      this._content = args.flat();
    }
  }

  /**
   * Set primary action (shown on tap, menu on long press)
   * @param {Function} action - Primary action
   * @returns {MenuView} Returns this for chaining
   */
  primaryAction(action) {
    this._primaryAction = action;
    return this;
  }

  _render() {
    const container = document.createElement('div');
    container.dataset.view = 'menu';
    container.style.position = 'relative';
    container.style.display = 'inline-block';

    // Menu button/trigger
    const trigger = document.createElement('button');
    trigger.dataset.menuPart = 'trigger';
    trigger.style.display = 'flex';
    trigger.style.alignItems = 'center';
    trigger.style.gap = '4px';
    trigger.style.padding = '8px 12px';
    trigger.style.border = 'none';
    trigger.style.background = 'transparent';
    trigger.style.cursor = 'pointer';
    trigger.style.fontSize = '17px';
    trigger.style.color = 'rgba(0, 122, 255, 1)';
    trigger.style.borderRadius = '8px';
    trigger.style.transition = 'background-color 0.15s ease';

    trigger.addEventListener('mouseenter', () => {
      trigger.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
    });
    trigger.addEventListener('mouseleave', () => {
      if (!this._isOpen) {
        trigger.style.backgroundColor = 'transparent';
      }
    });

    // Render label
    if (this._label) {
      const labelView = this._label();
      if (labelView instanceof View) {
        trigger.appendChild(labelView._render());
      }
    } else if (this._labelText) {
      trigger.textContent = this._labelText;
    } else {
      trigger.textContent = '•••';
    }

    // Dropdown indicator
    const chevron = document.createElement('span');
    chevron.textContent = '▾';
    chevron.style.fontSize = '10px';
    chevron.style.marginLeft = '2px';
    trigger.appendChild(chevron);

    // Menu dropdown
    const dropdown = document.createElement('div');
    dropdown.dataset.menuPart = 'dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.top = '100%';
    dropdown.style.left = '0';
    dropdown.style.marginTop = '4px';
    dropdown.style.minWidth = '200px';
    dropdown.style.backgroundColor = 'white';
    dropdown.style.borderRadius = '12px';
    dropdown.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 10px rgba(0, 0, 0, 0.1)';
    dropdown.style.padding = '6px';
    dropdown.style.zIndex = '1000';
    dropdown.style.opacity = '0';
    dropdown.style.transform = 'scale(0.95) translateY(-8px)';
    dropdown.style.transformOrigin = 'top left';
    dropdown.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    dropdown.style.pointerEvents = 'none';
    dropdown.style.display = 'flex';
    dropdown.style.flexDirection = 'column';

    // Render menu items
    this._content.forEach((item, index) => {
      if (item instanceof View) {
        const menuItem = document.createElement('div');
        menuItem.dataset.menuItem = 'true';

        // Check if it's a divider
        if (item.constructor.name === 'DividerView') {
          menuItem.style.height = '1px';
          menuItem.style.backgroundColor = 'rgba(60, 60, 67, 0.1)';
          menuItem.style.margin = '6px 0';
        } else {
          menuItem.style.padding = '10px 12px';
          menuItem.style.borderRadius = '8px';
          menuItem.style.cursor = 'pointer';
          menuItem.style.transition = 'background-color 0.1s ease';
          menuItem.style.display = 'flex';
          menuItem.style.alignItems = 'center';
          menuItem.style.gap = '10px';

          menuItem.addEventListener('mouseenter', () => {
            menuItem.style.backgroundColor = 'rgba(0, 122, 255, 0.1)';
          });
          menuItem.addEventListener('mouseleave', () => {
            menuItem.style.backgroundColor = 'transparent';
          });

          // Render the item content
          const rendered = item._render();

          // If it's a button, extract and wrap the click handler
          if (item.constructor.name === 'ButtonView' && item._action) {
            const originalAction = item._action;
            menuItem.addEventListener('click', (e) => {
              e.stopPropagation();
              this._closeMenu(dropdown, trigger);
              originalAction();
            });
            menuItem.textContent = rendered.textContent;

            // Preserve color if set
            if (rendered.style.color) {
              menuItem.style.color = rendered.style.color;
            }
          } else {
            menuItem.appendChild(rendered);
          }
        }

        dropdown.appendChild(menuItem);
      }
    });

    // Toggle menu
    const openMenu = () => {
      this._isOpen = true;
      dropdown.style.opacity = '1';
      dropdown.style.transform = 'scale(1) translateY(0)';
      dropdown.style.pointerEvents = 'auto';
      trigger.style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
    };

    const closeMenu = () => {
      this._isOpen = false;
      dropdown.style.opacity = '0';
      dropdown.style.transform = 'scale(0.95) translateY(-8px)';
      dropdown.style.pointerEvents = 'none';
      trigger.style.backgroundColor = 'transparent';
    };

    this._closeMenu = closeMenu;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target) && this._isOpen) {
        closeMenu();
      }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isOpen) {
        closeMenu();
      }
    });

    container.appendChild(trigger);
    container.appendChild(dropdown);

    return this._applyModifiers(container);
  }
}

/**
 * Factory function for Menu
 */
export function Menu(...args) {
  return new MenuView(...args);
}

export default Menu;
