/**
 * List - A scrollable list container
 *
 * Matches SwiftUI's List view for displaying scrollable content with optional selection.
 *
 * @example
 * List(items, { id: 'id' }, (item) =>
 *   Text(item.name)
 * )
 *
 * @example
 * List({ selection: $selection },
 *   ForEach(items, (item) => Text(item.name))
 * )
 */

import { createDescriptor, isDescriptor, isView, tagOf } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render } from '../../Core/Renderer.js';
import { createEffect, getOwner, onCleanup, untrack } from '../../Data/Signal.js';

/**
 * List style enum
 */
export const ListStyle = {
  automatic: 'automatic',
  plain: 'plain',
  inset: 'inset',
  insetGrouped: 'insetGrouped',
  grouped: 'grouped',
  sidebar: 'sidebar'
};

const GROUPED_BACKGROUND = 'rgba(242, 242, 247, 1)';

// The CSS each list style adds to the base list styles.
const LIST_STYLE_CSS = {
  [ListStyle.inset]: { padding: '0 16px' },
  [ListStyle.grouped]: { backgroundColor: GROUPED_BACKGROUND },
  [ListStyle.insetGrouped]: { padding: '0 16px', backgroundColor: GROUPED_BACKGROUND },
  [ListStyle.sidebar]: { padding: '8px', backgroundColor: 'rgba(242, 242, 247, 0.5)' },
};

const SELECTED = 'rgba(0, 122, 255, 0.1)';

/**
 * List
 *
 * Signatures:
 * - List(data, rowBuilder) / List(data, { id, selection }, rowBuilder)
 * - List({ selection }, ...rows)
 * - List(...rows)
 *
 * @returns {Object} Chainable view descriptor
 */
export function List(...args) {
  const props = { data: null, idKeyPath: 'id', rowBuilder: null, selection: null, listStyle: ListStyle.automatic };
  let children = [];
  if (Array.isArray(args[0])) {
    props.data = args[0];
    if (typeof args[1] === 'function') {
      props.rowBuilder = args[1];
    } else if (args[1] && typeof args[2] === 'function') {
      props.idKeyPath = args[1].id ?? 'id';
      props.selection = args[1].selection ?? null;
      props.rowBuilder = args[2];
    }
  } else if (args[0] && typeof args[0] === 'object' && !isView(args[0])) {
    props.selection = args[0].selection ?? null;
    children = args.slice(1);
  } else {
    children = args;
  }
  return chainable(createDescriptor('List', props, children.flat()), ({ withProps }) => ({
    listStyle: (style) => withProps({ listStyle: style }),
  }));
}

registerRenderer('List', (props, children) => {
  const { selection } = props;
  const el = document.createElement('div');
  el.dataset.view = 'list';
  el.setAttribute('role', 'list');
  Object.assign(el.style, {
    listStyle: 'none',
    margin: '0',
    padding: '0',
    overflowY: 'auto',
    overflowX: 'hidden',
  }, LIST_STYLE_CSS[props.listStyle]);
  let selectionInstalled = false;

  const readSelection = () => (selection ? ('value' in selection ? selection.value : selection.wrappedValue) : null);
  const writeSelection = (value) => {
    if ('value' in selection) selection.value = value;
    else selection.wrappedValue = value;
  };
  const isSelected = (id) => {
    const value = readSelection();
    return value instanceof Set ? value.has(id) : value === id;
  };

  // The selectable rows now in the list, in order, including rows a
  // reactive ForEach added after the first render.
  const currentRows = () => {
    const rows = [];
    const walk = (node) => {
      for (const child of Array.from(node.children || [])) {
        if (child._listId !== undefined) rows.push({ row: child, id: child._listId });
        else if (child.dataset?.listRow === undefined) walk(child);
      }
    };
    walk(el);
    return rows;
  };

  const syncSelection = () => {
    for (const { row, id } of currentRows()) {
      const selected = isSelected(id);
      row.setAttribute('aria-selected', selected ? 'true' : 'false');
      row.style.backgroundColor = selected ? SELECTED : 'white';
    }
  };

  // Select a row: replace the selection, or toggle membership when the
  // selection is a Set (multiple selection).
  const selectRow = (id) => {
    const value = readSelection();
    if (value instanceof Set) {
      const next = new Set(value);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeSelection(next);
    } else {
      writeSelection(id);
    }
    syncSelection();
  };

  // Keyboard and click selection for one row. Rows are looked up when the
  // event happens, so rows added later by a reactive ForEach take part.
  const wireSelectableRow = (row, id) => {
    const moveFocus = (index) => {
      const rows = currentRows();
      rows.forEach(({ row: other }, i) => { other.tabIndex = i === index ? 0 : -1; });
      rows[index]?.row.focus?.();
    };
    row.addEventListener('keydown', (event) => {
      // Keys typed in a control inside the row belong to that control.
      if (event.target && event.target !== row) return;
      const rows = currentRows();
      const index = rows.findIndex((entry) => entry.row === row);
      const last = rows.length - 1;
      switch (event.key) {
        case 'ArrowDown': moveFocus(Math.min(index + 1, last)); break;
        case 'ArrowUp': moveFocus(Math.max(index - 1, 0)); break;
        case 'Home': moveFocus(0); break;
        case 'End': moveFocus(last); break;
        case ' ':
        case 'Spacebar': selectRow(id); break;
        default: return;
      }
      event.preventDefault?.();
    });
    row.addEventListener('click', () => {
      for (const { row: other } of currentRows()) other.tabIndex = other === row ? 0 : -1;
      selectRow(id);
    });
  };

  // A list row around rendered content.
  const createRow = (content, id) => {
    const row = document.createElement('div');
    row.dataset.listRow = 'true';
    row.setAttribute('role', 'listitem');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      padding: '11px 16px',
      backgroundColor: 'white',
      borderBottom: '1px solid rgba(60, 60, 67, 0.1)',
      transition: 'background-color 0.15s ease',
    });
    const selectable = Boolean(selection) && id !== undefined && id !== null;
    row.addEventListener('mouseenter', () => { row.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'; });
    row.addEventListener('mouseleave', () => {
      row.style.backgroundColor = selectable && isSelected(id) ? SELECTED : 'white';
    });

    // Roles and the roving tabindex are set by installSelection for the
    // first render, and here for rows added later.
    if (selectable) {
      row.style.cursor = 'pointer';
      row._listId = id;
      wireSelectableRow(row, id);
      if (selectionInstalled) {
        const selected = isSelected(id);
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', selected ? 'true' : 'false');
        row.style.backgroundColor = selected ? SELECTED : 'white';
        // Keep one Tab stop: the first row of a list that was empty gets it.
        row.tabIndex = currentRows().some(({ row: other }) => other.tabIndex === 0) ? -1 : 0;
      }
    }
    if (content) row.appendChild(content);
    return row;
  };

  // Keep one selectable row in the Tab order.
  const ensureTabStop = () => {
    if (!selectionInstalled) return;
    const rows = currentRows();
    if (rows.length === 0 || rows.some(({ row }) => row.tabIndex === 0)) return;
    (rows.find(({ id }) => isSelected(id)) ?? rows[0]).row.tabIndex = 0;
  };

  const list = { createRow, ensureTabStop };

  if (props.data && props.rowBuilder) {
    for (const item of props.data) {
      el.appendChild(createRow(render(props.rowBuilder(item)), item?.[props.idKeyPath]));
    }
  } else {
    for (const child of children) {
      // A reactive ForEach (For): each of its rows renders as a list row
      // (chrome, role and selection), keyed like the ForEach (#52).
      if (isDescriptor(child) && child.type === 'For') {
        const { render: renderRow, keyFn } = child.props;
        const rows = createDescriptor('For', {
          ...child.props,
          render: (item, index) => createDescriptor('ListRow', { list, content: renderRow(item, index), id: keyFn(item, index) }),
        }, child.children, child.key, child.modifiers);
        const rendered = render(rows);
        // The For updates its own children in place, so its wrapper stays
        // (moving its rows would detach them on the next update). It has no
        // role of its own, so the rows belong to the list.
        rendered.setAttribute('role', 'none');
        el.appendChild(rendered);
        continue;
      }
      const rendered = render(child);
      const view = rendered.dataset?.view;
      if (view === 'Show') {
        // A Show updates its children in place too.
        rendered.setAttribute('role', 'none');
        el.appendChild(rendered);
      } else if (view === 'ForEach' || (rendered.style?.display === 'contents' && rendered.childNodes.length > 1)) {
        // A static ForEach (or another display: contents wrapper): one list
        // row per item.
        for (const itemEl of Array.from(rendered.childNodes)) {
          if (itemEl.nodeType === 1) el.appendChild(createRow(itemEl));
        }
      } else {
        // A child tagged with .tag(_:) is selectable by that value, as in SwiftUI.
        el.appendChild(createRow(rendered, tagOf(child)));
      }
    }
  }

  // #51: a selectable list is a WAI-ARIA listbox. Rows are options with
  // aria-selected and a roving tabindex; ↑/↓, Home and End move focus and
  // Space selects the focused row.
  if (selection) {
    el.setAttribute('role', 'listbox');
    if (untrack(readSelection) instanceof Set) el.setAttribute('aria-multiselectable', 'true');
    const rows = currentRows();
    let focusIndex = untrack(() => rows.findIndex(({ id }) => isSelected(id)));
    if (focusIndex === -1) focusIndex = 0;
    rows.forEach(({ row }, index) => {
      row.setAttribute('role', 'option');
      row.tabIndex = index === focusIndex ? 0 : -1;
    });
    // A listbox may only own options: a row with no id is an option that
    // can't be selected.
    for (const row of el.children) {
      if (row.getAttribute('role') === 'listitem') {
        row.setAttribute('role', 'option');
        row.setAttribute('aria-disabled', 'true');
      }
    }
    selectionInstalled = true;
    untrack(syncSelection);
    // Follow writes to the selection made elsewhere.
    if (getOwner()) {
      createEffect(() => {
        readSelection();
        untrack(syncSelection);
      });
    }
  }

  return el;
});

// A row of a reactive ForEach inside a List (#52).
registerRenderer('ListRow', ({ list, content, id }) => {
  const row = list.createRow(render(content), id);
  // When the row holding the Tab stop goes away, give it to another row.
  if (getOwner()) onCleanup(() => queueMicrotask(list.ensureTabStop));
  return row;
});

export { ListStyle as ListStyleType };
export default List;
