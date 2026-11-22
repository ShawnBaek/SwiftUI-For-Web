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

import { nextElementId } from '../../Core/ElementID.js';
import { View } from '../../Core/View.js';
import { isDescriptor, ModifierType } from '../../Core/ViewDescriptor.js';
import { render as renderDescriptor, applyModifiers } from '../../Core/Renderer.js';
import { Color } from '../../Graphic/Color.js';

function nextMenuId() {
  return nextElementId('swiftui-menu');
}

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
    // #51: menu-button pattern. The closed menu is hidden from keyboard and
    // screen-reader access, not only made transparent.
    dropdown.setAttribute('role', 'menu');
    dropdown.id = nextMenuId();
    dropdown.inert = true;
    dropdown.setAttribute('aria-hidden', 'true');
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', dropdown.id);
    dropdown.style.display = 'flex';
    dropdown.style.flexDirection = 'column';

    // Focusable items, in order, for the menu keyboard pattern.
    const items = [];

    // Render menu items: Button items run their action and close the menu,
    // Divider items are separators, anything else renders as an item. Items
    // are view descriptors (Button(...), Divider()) or legacy Views (#48).
    this._content.forEach((item) => {
      const descriptor = isDescriptor(item) ? item : null;
      if (!descriptor && !(item instanceof View)) return;
      const menuItem = document.createElement('div');
      menuItem.dataset.menuItem = 'true';

      if (descriptor?.type === 'Divider') {
        menuItem.setAttribute('role', 'separator');
        menuItem.style.height = '1px';
        menuItem.style.backgroundColor = 'rgba(60, 60, 67, 0.1)';
        menuItem.style.margin = '6px 0';
        dropdown.appendChild(menuItem);
        return;
      }

      menuItem.setAttribute('role', 'menuitem');
      // Roving focus: items are reachable with the arrow keys, not Tab.
      menuItem.tabIndex = -1;
      items.push(menuItem);
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

      if (descriptor?.type === 'Button') {
        // Render the label, not a nested <button>: the menu item is the control.
        const { label, action, isDisabled } = descriptor.props;
        if (typeof label === 'string') menuItem.textContent = label;
        else if (label) menuItem.appendChild(renderDescriptor(label));
        // Button(action, Label(...)) and Button(Text(...), action) keep the
        // label view in children.
        for (const child of descriptor.children) menuItem.appendChild(renderDescriptor(child));
        // Keep the item's tint (a destructive item's red, for example).
        const tint = descriptor.modifiers.filter((modifier) => modifier.type === ModifierType.FOREGROUND_COLOR);
        if (tint.length) applyModifiers(menuItem, tint);
        if (isDisabled) menuItem.setAttribute('aria-disabled', 'true');
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isDisabled) return;
          this._closeMenu(dropdown, trigger);
          action?.();
        });
      } else {
        menuItem.appendChild(descriptor ? renderDescriptor(descriptor) : item._render());
      }

      dropdown.appendChild(menuItem);
    });

    // Toggle menu
    const openMenu = () => {
      this._isOpen = true;
      trigger.setAttribute('aria-expanded', 'true');
      dropdown.inert = false;
      dropdown.removeAttribute('aria-hidden');
      items[0]?.focus?.();
      dropdown.style.opacity = '1';
      dropdown.style.transform = 'scale(1) translateY(0)';
      dropdown.style.pointerEvents = 'auto';
      trigger.style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
    };

    const closeMenu = () => {
      this._isOpen = false;
      trigger.setAttribute('aria-expanded', 'false');
      // Return focus before the menu becomes inert, or it falls to <body>.
      if (typeof document !== 'undefined' && dropdown.contains?.(document.activeElement)) {
        trigger.focus?.();
      }
      dropdown.inert = true;
      dropdown.setAttribute('aria-hidden', 'true');
      dropdown.style.opacity = '0';
      dropdown.style.transform = 'scale(0.95) translateY(-8px)';
      dropdown.style.pointerEvents = 'none';
      trigger.style.backgroundColor = 'transparent';
    };

    this._closeMenu = closeMenu;

    // Menu keyboard pattern (#51): arrows, Home and End move focus between
    // items; Enter and Space activate the focused item; Tab closes the menu.
    dropdown.addEventListener('keydown', (e) => {
      const current = items.indexOf(document.activeElement);
      const focusAt = (index) => {
        if (items.length === 0) return;
        items[(index + items.length) % items.length].focus();
      };
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); focusAt(current + 1); break;
        case 'ArrowUp': e.preventDefault(); focusAt(current < 0 ? items.length - 1 : current - 1); break;
        case 'Home': e.preventDefault(); focusAt(0); break;
        case 'End': e.preventDefault(); focusAt(items.length - 1); break;
        case 'Enter':
        case ' ':
          if (current >= 0) { e.preventDefault(); items[current].click(); }
          break;
        case 'Tab': closeMenu(); break;
        default: break;
      }
    });
    trigger.addEventListener('keydown', (e) => {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !this._isOpen) {
        e.preventDefault();
        openMenu();
        if (e.key === 'ArrowUp') items[items.length - 1]?.focus?.();
      }
    });

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
        trigger.focus?.();
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
