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
import { createDescriptor, isView } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render } from '../../Core/Renderer.js';
import { createEffect, getOwner, untrack } from '../../Data/Signal.js';

const isBinding = (value) => value && typeof value === 'object' && ('value' in value || 'wrappedValue' in value);

/**
 * DisclosureGroup
 *
 * Signatures:
 * - DisclosureGroup('Label', ...content)
 * - DisclosureGroup($isExpanded, { label }?, ...content)
 * - DisclosureGroup({ label }, ...content)
 * - DisclosureGroup(...content)
 *
 * @returns {Object} Chainable view descriptor
 */
export function DisclosureGroup(...args) {
  let isExpanded = null;
  let label = null;
  if (typeof args[0] === 'string') {
    label = args.shift();
  } else if (isBinding(args[0]) && !isView(args[0])) {
    isExpanded = args.shift();
  }
  if (args[0] && typeof args[0] === 'object' && !isView(args[0]) && !Array.isArray(args[0])) {
    label = args.shift().label ?? null;
  }
  return chainable(createDescriptor('DisclosureGroup', { isExpanded, label }, args.flat()));
}

registerRenderer('DisclosureGroup', (props, children) => {
  const binding = props.isExpanded;
  let expandedInternal = false;
  const getExpanded = () => binding ? Boolean(binding.value ?? binding.wrappedValue) : expandedInternal;
  const setExpanded = (value) => {
    if (!binding) expandedInternal = value;
    else if ('value' in binding) binding.value = value;
    else binding.wrappedValue = value;
  };

  const container = document.createElement('div');
  container.dataset.view = 'disclosure-group';
  container.style.backgroundColor = 'white';
  container.style.borderRadius = '10px';
  container.style.overflow = 'hidden';

  const isExpanded = untrack(getExpanded);

  // Header (clickable to expand/collapse)
  const header = document.createElement('button');
  header.type = 'button';
  header.dataset.disclosurePart = 'header';
  Object.assign(header.style, {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '11px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '17px',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
  });
  header.addEventListener('mouseenter', () => { header.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'; });
  header.addEventListener('mouseleave', () => { header.style.backgroundColor = 'transparent'; });

  // The label is text, a view, or a builder function.
  const labelContainer = document.createElement('span');
  const label = typeof props.label === 'function' ? props.label() : props.label;
  if (typeof label === 'string') labelContainer.textContent = label;
  else if (isView(label)) labelContainer.appendChild(render(label));
  header.appendChild(labelContainer);

  const chevron = document.createElement('span');
  chevron.textContent = '›';
  chevron.style.fontSize = '20px';
  chevron.style.color = 'rgba(60, 60, 67, 0.3)';
  chevron.style.transform = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
  chevron.style.transition = 'transform 0.2s ease';
  header.appendChild(chevron);

  const content = document.createElement('div');
  content.dataset.disclosurePart = 'content';
  content.style.overflow = 'hidden';
  content.style.maxHeight = isExpanded ? 'none' : '0';
  content.style.transition = 'max-height 0.3s ease';
  // #51: the header reports the state and the region it controls, and the
  // collapsed region is removed from keyboard and screen-reader access
  // (max-height 0 alone still exposes it).
  content.id = nextElementId('swiftui-disclosure');
  header.setAttribute('aria-controls', content.id);
  const applyExpandedState = (expanded) => {
    header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    content.inert = !expanded;
    if (expanded) content.removeAttribute('aria-hidden');
    else content.setAttribute('aria-hidden', 'true');
  };
  applyExpandedState(isExpanded);

  const contentWrapper = document.createElement('div');
  contentWrapper.style.borderTop = '1px solid rgba(60, 60, 67, 0.1)';
  children.forEach((child, index) => {
    const row = document.createElement('div');
    row.style.padding = '11px 16px';
    if (index > 0) row.style.borderTop = '1px solid rgba(60, 60, 67, 0.1)';
    row.appendChild(render(child));
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
    content.style.maxHeight = content.scrollHeight + 'px';
    if (expanded) {
      setTimeout(() => {
        if (shown) content.style.maxHeight = 'none';
      }, 300);
    } else {
      requestAnimationFrame(() => {
        if (!shown) content.style.maxHeight = '0';
      });
    }
  };

  header.addEventListener('click', () => {
    const next = !untrack(getExpanded);
    setExpanded(next);
    show(next);
  });

  // Follow writes to the isExpanded binding made elsewhere (#48), such as
  // an "Expand all" button. Needs a reactive owner (the App mount has one).
  if (binding && getOwner()) createEffect(() => show(getExpanded()));

  container.appendChild(header);
  container.appendChild(content);
  return container;
});

export default DisclosureGroup;
