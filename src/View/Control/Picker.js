/**
 * Picker - A control for selecting from a set of options
 *
 * Matches SwiftUI's Picker view for selection interfaces.
 *
 * @example
 * Picker('Flavor', $selection,
 *   Text('Chocolate').tag('chocolate'),
 *   Text('Vanilla').tag('vanilla'),
 *   Text('Strawberry').tag('strawberry')
 * )
 *
 * @example
 * Picker($selection, {
 *   ForEach(flavors, (flavor) =>
 *     Text(flavor.name).tag(flavor.id)
 *   )
 * })
 * .pickerStyle(PickerStyle.wheel)
 */

import { View } from '../../Core/View.js';
import { isDescriptor, isLegacyView, createDescriptor, ModifierType } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render as renderDescriptor } from '../../Core/Renderer.js';
import { untrack, createEffect, getOwner } from '../../Data/Signal.js';

/**
 * Picker style enum
 */
export const PickerStyle = {
  automatic: 'automatic',
  menu: 'menu',
  wheel: 'wheel',
  segmented: 'segmented',
  inline: 'inline',
  navigationLink: 'navigationLink'
};

// Picker's own modifiers (#48: everything else comes from the shared table).
const pickerModifiers = ({ withProps }) => ({
  pickerStyle: (style) => withProps({ pickerStyle: style }),
});

/**
 * Picker - selection from a set of tagged views
 *
 * Signatures: Picker('Label', $selection, ...options) and
 * Picker($selection, ...options). Options are views (descriptors or legacy
 * Views) identified by `.tag(_:)`; arrays are flattened.
 *
 * @returns {Object} Chainable view descriptor
 */
export function Picker(...args) {
  let labelText = null;
  let selection;
  let options;
  if (typeof args[0] === 'string') {
    labelText = args[0];
    selection = args[1];
    options = args.slice(2).flat();
  } else {
    selection = args[0];
    options = args.slice(1).flat();
  }
  return chainable(createDescriptor('Picker', {
    labelText,
    selection,
    options,
    pickerStyle: PickerStyle.automatic,
  }), pickerModifiers);
}

// Whether an option is a view: a legacy View or a view descriptor such as
// `Text('A').tag('a')` (#48).
function isOption(option) {
  return isLegacyView(option) || isDescriptor(option);
}

function renderOption(option) {
  return renderDescriptor(option);
}

function getTag(view) {
  if (isDescriptor(view)) {
    // The last .tag(_:) wins, as in SwiftUI (#48).
    for (let i = view.modifiers.length - 1; i >= 0; i--) {
      if (view.modifiers[i].type === ModifierType.TAG) return view.modifiers[i].value;
    }
    return null;
  }
  return view._tag ?? null;
}

function selectionAccessors(selection) {
  return {
    getSelection: () => {
      if (!selection) return null;
      return untrack(() => selection.value ?? selection.wrappedValue ?? null);
    },
    setSelection: (value) => {
      if (!selection) return;
      untrack(() => {
        if ('value' in selection) selection.value = value;
        else if ('wrappedValue' in selection) selection.wrappedValue = value;
      });
    },
    // Show writes made elsewhere: under an owner, run `apply` with the
    // selection now and whenever it changes.
    followSelection: (apply) => {
      if (!selection || !getOwner()) return;
      createEffect(() => apply(selection.value ?? selection.wrappedValue ?? null));
    },
  };
}

function renderMenu(ctx) {
  const container = document.createElement('div');
  container.dataset.view = 'picker';
  container.dataset.style = 'menu';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'space-between';
  container.style.gap = '8px';

  // Label
  if (ctx.labelText) {
    const label = document.createElement('span');
    label.textContent = ctx.labelText;
    container.appendChild(label);
  }

  // Select element
  const select = document.createElement('select');
  select.style.padding = '8px 12px';
  select.style.fontSize = '16px';
  select.style.border = '1px solid rgba(60, 60, 67, 0.2)';
  select.style.borderRadius = '8px';
  select.style.backgroundColor = 'white';
  select.style.color = 'rgba(0, 122, 255, 1)';
  select.style.cursor = 'pointer';
  select.style.minWidth = '120px';

  // Add options
  const currentSelection = ctx.getSelection();
  for (const option of ctx.options) {
    if (isOption(option)) {
      const opt = document.createElement('option');
      const tag = getTag(option);
      opt.value = tag ?? '';

      // Get text content from view
      const rendered = renderOption(option);
      opt.textContent = rendered.textContent || tag || '';

      if (tag === currentSelection) {
        opt.selected = true;
      }

      select.appendChild(opt);
    }
  }

  // Handle selection change. <option>.value is always a string, so map the
  // chosen option back to its original tag (a number tag stays a number).
  const optionTags = ctx.options.filter((option) => isOption(option)).map((option) => getTag(option));
  select.addEventListener('change', (e) => {
    const index = e.target.selectedIndex;
    ctx.setSelection(index >= 0 && index < optionTags.length ? optionTags[index] : e.target.value);
  });
  ctx.followSelection((value) => {
    const index = optionTags.indexOf(value);
    if (select.selectedIndex !== index) select.selectedIndex = index;
  });

  container.appendChild(select);

  return container;
}

function renderSegmented(ctx) {
  // #51: a WAI-ARIA radio group. Each segment is a radio button with
  // aria-checked and a roving tabindex; arrow keys move and select. Colors
  // come from the theme tokens in base.css, so dark mode works.
  const container = document.createElement('div');
  container.dataset.view = 'picker';
  container.dataset.style = 'segmented';
  container.setAttribute('role', 'radiogroup');
  if (ctx.labelText) container.setAttribute('aria-label', ctx.labelText);
  container.style.display = 'inline-flex';
  container.style.backgroundColor = 'var(--color-fill-tertiary, rgba(118, 118, 128, 0.12))';
  container.style.borderRadius = '8px';
  container.style.padding = '2px';
  container.style.gap = '2px';

  const segments = [];
  const tags = [];

  const select = (index, focus) => {
    segments.forEach((segment, i) => {
      const checked = i === index;
      segment.setAttribute('aria-checked', checked ? 'true' : 'false');
      segment.tabIndex = checked ? 0 : -1;
      segment.style.backgroundColor = checked
        ? 'var(--color-segmented-selected, #FFFFFF)'
        : 'transparent';
      segment.style.boxShadow = checked ? '0 1px 3px rgba(0, 0, 0, 0.12)' : 'none';
    });
    if (focus) segments[index].focus?.();
  };

  for (const option of ctx.options) {
    if (!isOption(option)) continue;
    const index = segments.length;
    const tag = getTag(option);
    const segment = document.createElement('button');
    segment.setAttribute('type', 'button');
    segment.setAttribute('role', 'radio');
    segment.style.padding = '6px 12px';
    segment.style.border = 'none';
    segment.style.borderRadius = '6px';
    segment.style.font = 'inherit';
    segment.style.fontSize = '13px';
    segment.style.fontWeight = '500';
    segment.style.color = 'var(--color-primary, #000000)';
    segment.style.cursor = 'pointer';
    segment.style.transition = 'background-color 0.2s ease, box-shadow 0.2s ease';

    const rendered = renderOption(option);
    segment.textContent = rendered.textContent || tag || '';

    segment.addEventListener('click', () => {
      ctx.setSelection(tag);
      select(index, false);
    });
    segment.addEventListener('keydown', (event) => {
      const last = segments.length - 1;
      let next = null;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = index === last ? 0 : index + 1;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          next = index === 0 ? last : index - 1;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = last;
          break;
        default:
          return;
      }
      event.preventDefault?.();
      // Radio groups select on focus move.
      ctx.setSelection(tags[next]);
      select(next, true);
    });

    segments.push(segment);
    tags.push(tag);
    container.appendChild(segment);
  }

  if (segments.length > 0) {
    const selectedIndex = tags.indexOf(ctx.getSelection());
    select(selectedIndex, false);
    // With no matching selection, keep the group reachable by Tab.
    if (selectedIndex === -1) segments[0].tabIndex = 0;
    ctx.followSelection((value) => {
      const index = tags.indexOf(value);
      select(index, false);
      if (index === -1) segments[0].tabIndex = 0;
    });
  }

  return container;
}

function renderWheel(ctx) {
  const container = document.createElement('div');
  container.dataset.view = 'picker';
  container.dataset.style = 'wheel';
  container.style.position = 'relative';
  container.style.height = '150px';
  container.style.overflow = 'hidden';
  container.style.backgroundColor = 'rgba(242, 242, 247, 1)';
  container.style.borderRadius = '8px';

  // Selection indicator
  const indicator = document.createElement('div');
  indicator.style.position = 'absolute';
  indicator.style.top = '50%';
  indicator.style.transform = 'translateY(-50%)';
  indicator.style.left = '0';
  indicator.style.right = '0';
  indicator.style.height = '34px';
  indicator.style.backgroundColor = 'rgba(120, 120, 128, 0.12)';
  indicator.style.borderRadius = '4px';
  indicator.style.margin = '0 4px';
  indicator.style.pointerEvents = 'none';
  container.appendChild(indicator);

  // Scrollable options
  const scroll = document.createElement('div');
  scroll.style.height = '100%';
  scroll.style.overflowY = 'auto';
  scroll.style.scrollSnapType = 'y mandatory';
  scroll.style.paddingTop = '58px';
  scroll.style.paddingBottom = '58px';

  // Hide scrollbar
  scroll.style.scrollbarWidth = 'none';
  scroll.style.msOverflowStyle = 'none';

  const currentSelection = ctx.getSelection();
  let selectedIndex = 0;

  ctx.options.forEach((option, index) => {
    if (isOption(option)) {
      const item = document.createElement('div');
      item.style.height = '34px';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'center';
      item.style.scrollSnapAlign = 'center';
      item.style.cursor = 'pointer';

      const tag = getTag(option);
      const rendered = renderOption(option);
      item.textContent = rendered.textContent || tag || '';

      if (tag === currentSelection) {
        selectedIndex = index;
      }

      item.addEventListener('click', () => {
        ctx.setSelection(tag);
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      scroll.appendChild(item);
    }
  });

  // Scroll to selected item
  requestAnimationFrame(() => {
    const items = scroll.children;
    if (items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: 'center' });
    }
  });

  // Handle scroll selection
  scroll.addEventListener('scrollend', () => {
    const scrollCenter = scroll.scrollTop + scroll.clientHeight / 2 - 58;
    const itemHeight = 34;
    const index = Math.round(scrollCenter / itemHeight);
    if (isOption(ctx.options[index])) {
      const tag = getTag(ctx.options[index]);
      ctx.setSelection(tag);
    }
  });

  // A write made elsewhere scrolls the wheel to the new selection.
  const itemTags = ctx.options.filter((option) => isOption(option)).map((option) => getTag(option));
  let firstRun = true;
  ctx.followSelection((value) => {
    if (firstRun) { firstRun = false; return; }
    const item = scroll.children[itemTags.indexOf(value)];
    if (item && typeof item.scrollIntoView === 'function') item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  container.appendChild(scroll);

  return container;
}

function renderInline(ctx) {
  const container = document.createElement('div');
  container.dataset.view = 'picker';
  container.dataset.style = 'inline';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '2px';

  const currentSelection = ctx.getSelection();
  const marks = [];

  for (const option of ctx.options) {
    if (isOption(option)) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.padding = '11px 16px';
      row.style.borderRadius = '8px';
      row.style.cursor = 'pointer';
      row.style.transition = 'background-color 0.15s ease';

      const tag = getTag(option);
      const rendered = renderOption(option);

      // Checkmark for selected item
      const checkmark = document.createElement('span');
      checkmark.textContent = tag === currentSelection ? '✓' : '';
      checkmark.style.color = 'rgba(0, 122, 255, 1)';
      checkmark.style.marginRight = '12px';
      checkmark.style.width = '20px';
      row.appendChild(checkmark);
      marks.push({ tag, checkmark });

      const content = document.createElement('span');
      content.textContent = rendered.textContent || tag || '';
      row.appendChild(content);

      row.addEventListener('mouseenter', () => {
        row.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
      });
      row.addEventListener('mouseleave', () => {
        row.style.backgroundColor = 'transparent';
      });

      row.addEventListener('click', () => {
        ctx.setSelection(tag);
        // Update all checkmarks
        for (const mark of marks) mark.checkmark.textContent = '';
        checkmark.textContent = '✓';
      });

      container.appendChild(row);
    }
  }

  ctx.followSelection((value) => {
    for (const mark of marks) mark.checkmark.textContent = mark.tag === value ? '✓' : '';
  });

  return container;
}

registerRenderer('Picker', (props) => {
  const ctx = { labelText: props.labelText, options: props.options, ...selectionAccessors(props.selection) };
  switch (props.pickerStyle) {
    case PickerStyle.segmented:
      return renderSegmented(ctx);
    case PickerStyle.wheel:
      return renderWheel(ctx);
    case PickerStyle.inline:
      return renderInline(ctx);
    case PickerStyle.menu:
    case PickerStyle.automatic:
    default:
      return renderMenu(ctx);
  }
});

// Legacy views get .tag(_:) too, so they can be Picker and TabView options.
View.prototype.tag = function (value) {
  this._tag = value;
  return this;
};

export default Picker;
