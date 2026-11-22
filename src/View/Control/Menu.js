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
import { createDescriptor, isDescriptor, isView, ModifierType } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render, applyModifiers } from '../../Core/Renderer.js';
import { getOwner, onCleanup } from '../../Data/Signal.js';

/**
 * Menu
 *
 * Signatures: Menu('Label', ...items), Menu({ label: () => View }, ...items)
 * and Menu(...items).
 *
 * @returns {Object} Chainable view descriptor
 */
export function Menu(...args) {
  let label = null;
  if (typeof args[0] === 'string' || (args[0] && typeof args[0] === 'object' && !isView(args[0]) && !Array.isArray(args[0]))) {
    label = args.shift();
  }
  return chainable(createDescriptor('Menu', { label, primaryAction: null }, args.flat()), ({ withProps }) => ({
    // A tap runs the action; a secondary click (or long press) opens the menu.
    primaryAction: (action) => withProps({ primaryAction: action }),
  }));
}

registerRenderer('Menu', (props, items) => {
  const container = document.createElement('div');
  container.dataset.view = 'menu';
  container.style.position = 'relative';
  container.style.display = 'inline-block';
  let isOpen = false;

  const trigger = document.createElement('button');
  trigger.dataset.menuPart = 'trigger';
  Object.assign(trigger.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '17px',
    color: 'rgba(0, 122, 255, 1)',
    borderRadius: '8px',
    transition: 'background-color 0.15s ease',
  });
  trigger.addEventListener('mouseenter', () => { trigger.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'; });
  trigger.addEventListener('mouseleave', () => {
    if (!isOpen) trigger.style.backgroundColor = 'transparent';
  });

  const { label } = props;
  if (typeof label === 'string') trigger.textContent = label;
  else if (label) {
    const view = typeof label.label === 'function' ? label.label() : label.label;
    if (isView(view)) trigger.appendChild(render(view));
  } else trigger.textContent = '•••';

  const chevron = document.createElement('span');
  chevron.textContent = '▾';
  chevron.style.fontSize = '10px';
  chevron.style.marginLeft = '2px';
  trigger.appendChild(chevron);

  const dropdown = document.createElement('div');
  dropdown.dataset.menuPart = 'dropdown';
  Object.assign(dropdown.style, {
    position: 'absolute',
    top: '100%',
    left: '0',
    marginTop: '4px',
    minWidth: '200px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 10px rgba(0, 0, 0, 0.1)',
    padding: '6px',
    zIndex: '1000',
    opacity: '0',
    transform: 'scale(0.95) translateY(-8px)',
    transformOrigin: 'top left',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
    pointerEvents: 'none',
  });
  // #51: menu-button pattern. The closed menu is hidden from keyboard and
  // screen-reader access, not only made transparent.
  dropdown.setAttribute('role', 'menu');
  dropdown.id = nextElementId('swiftui-menu');
  dropdown.inert = true;
  dropdown.setAttribute('aria-hidden', 'true');
  trigger.type = 'button';
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', dropdown.id);
  dropdown.style.display = 'flex';
  dropdown.style.flexDirection = 'column';

  // Focusable items, in order, for the menu keyboard pattern.
  const focusable = [];

  // Button items run their action and close the menu, Divider items are
  // separators, any other view renders as an item.
  for (const item of items) {
    if (!isView(item)) continue;
    const descriptor = isDescriptor(item) ? item : null;
    const menuItem = document.createElement('div');
    menuItem.dataset.menuItem = 'true';

    if (descriptor?.type === 'Divider') {
      menuItem.setAttribute('role', 'separator');
      menuItem.style.height = '1px';
      menuItem.style.backgroundColor = 'rgba(60, 60, 67, 0.1)';
      menuItem.style.margin = '6px 0';
      dropdown.appendChild(menuItem);
      continue;
    }

    menuItem.setAttribute('role', 'menuitem');
    // Roving focus: items are reachable with the arrow keys, not Tab.
    menuItem.tabIndex = -1;
    focusable.push(menuItem);
    Object.assign(menuItem.style, {
      padding: '10px 12px',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'background-color 0.1s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    });
    menuItem.addEventListener('mouseenter', () => { menuItem.style.backgroundColor = 'rgba(0, 122, 255, 0.1)'; });
    menuItem.addEventListener('mouseleave', () => { menuItem.style.backgroundColor = 'transparent'; });

    if (descriptor?.type === 'Button') {
      // Render the label, not a nested <button>: the menu item is the control.
      const { label: text, action, isDisabled } = descriptor.props;
      if (typeof text === 'string') menuItem.textContent = text;
      else if (text) menuItem.appendChild(render(text));
      // Button(action, Label(...)) and Button(Text(...), action) keep the
      // label view in children.
      for (const child of descriptor.children) menuItem.appendChild(render(child));
      // Keep the item's tint (a destructive item's red, for example).
      const tint = descriptor.modifiers.filter((modifier) => modifier.type === ModifierType.FOREGROUND_COLOR);
      if (tint.length) applyModifiers(menuItem, tint);
      if (isDisabled) menuItem.setAttribute('aria-disabled', 'true');
      menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDisabled) return;
        closeMenu();
        action?.();
      });
    } else {
      menuItem.appendChild(render(item));
    }

    dropdown.appendChild(menuItem);
  }

  const openMenu = () => {
    isOpen = true;
    trigger.setAttribute('aria-expanded', 'true');
    dropdown.inert = false;
    dropdown.removeAttribute('aria-hidden');
    focusable[0]?.focus?.();
    dropdown.style.opacity = '1';
    dropdown.style.transform = 'scale(1) translateY(0)';
    dropdown.style.pointerEvents = 'auto';
    trigger.style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
  };

  const closeMenu = () => {
    isOpen = false;
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

  // Menu keyboard pattern (#51): arrows, Home and End move focus between
  // items; Enter and Space activate the focused item; Tab closes the menu.
  dropdown.addEventListener('keydown', (e) => {
    const current = focusable.indexOf(document.activeElement);
    const focusAt = (index) => {
      if (focusable.length === 0) return;
      focusable[(index + focusable.length) % focusable.length].focus();
    };
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusAt(current + 1); break;
      case 'ArrowUp': e.preventDefault(); focusAt(current < 0 ? focusable.length - 1 : current - 1); break;
      case 'Home': e.preventDefault(); focusAt(0); break;
      case 'End': e.preventDefault(); focusAt(focusable.length - 1); break;
      case 'Enter':
      case ' ':
        if (current >= 0) { e.preventDefault(); focusable[current].click(); }
        break;
      case 'Tab': closeMenu(); break;
      default: break;
    }
  });
  trigger.addEventListener('keydown', (e) => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isOpen) {
      e.preventDefault();
      openMenu();
      if (e.key === 'ArrowUp') focusable[focusable.length - 1]?.focus?.();
    }
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) closeMenu();
    else if (props.primaryAction) props.primaryAction();
    else openMenu();
  });
  if (props.primaryAction) {
    trigger.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!isOpen) openMenu();
    });
  }

  // Close on an outside click and on Escape. The listeners go away with
  // the view's owner.
  const onDocumentClick = (e) => {
    if (isOpen && !container.contains(e.target)) closeMenu();
  };
  const onDocumentKey = (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeMenu();
      trigger.focus?.();
    }
  };
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKey);
  if (getOwner()) {
    onCleanup(() => {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKey);
    });
  }

  container.appendChild(trigger);
  container.appendChild(dropdown);
  return container;
});

export default Menu;
