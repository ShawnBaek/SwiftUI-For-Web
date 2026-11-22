/**
 * accessibilityLabel / accessibilityValue / accessibilityHint on the web
 * (#51 decision).
 *
 * - The value maps to aria-valuetext only on range roles (slider,
 *   spinbutton, progressbar, meter, scrollbar), where it is defined.
 *   Elsewhere it joins the accessible name: appended to an aria-label
 *   ("Volume, 50%"), or as visually hidden text inside the element.
 * - The hint is a hidden node the element points at with aria-describedby
 *   (aria-description is not reliably announced).
 */

import { nextElementId } from './ElementID.js';

const RANGE_ROLES = new Set(['slider', 'spinbutton', 'progressbar', 'meter', 'scrollbar']);

function isRange(element) {
  const role = element.getAttribute?.('role');
  if (role) return RANGE_ROLES.has(role);
  const tag = String(element.tagName || '').toLowerCase();
  if (tag === 'progress' || tag === 'meter') return true;
  if (tag === 'input') return element.type === 'range' || element.type === 'number';
  return false;
}

function visuallyHide(node) {
  node.className = 'swiftui-visually-hidden';
  Object.assign(node.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });
}

export function applyAccessibilityLabel(element, label) {
  element._accessibilityLabel = label;
  const value = element._accessibilityValue;
  element.setAttribute('aria-label', value && !isRange(element) ? `${label}, ${value}` : label);
  // The value now lives in the aria-label.
  element._accessibilityValueNode?.remove?.();
  element._accessibilityValueNode = null;
}

export function applyAccessibilityValue(element, value) {
  element._accessibilityValue = value;
  if (isRange(element)) {
    element.setAttribute('aria-valuetext', value);
    return;
  }
  if (element._accessibilityLabel !== undefined) {
    element.setAttribute('aria-label', `${element._accessibilityLabel}, ${value}`);
    return;
  }
  let node = element._accessibilityValueNode;
  if (!node) {
    node = document.createElement('span');
    node.dataset.accessibilityValue = '';
    visuallyHide(node);
    element.appendChild(node);
    element._accessibilityValueNode = node;
  }
  node.textContent = `, ${value}`;
}

export function applyAccessibilityHint(element, hint) {
  let node = element._accessibilityHintNode;
  if (!node) {
    node = document.createElement('span');
    node.id = nextElementId('swiftui-hint');
    node.dataset.accessibilityHint = '';
    // A hidden node still provides an aria-describedby description, and it
    // stays out of the element's name.
    node.hidden = true;
    element.appendChild(node);
    element._accessibilityHintNode = node;
    const described = element.getAttribute('aria-describedby');
    element.setAttribute('aria-describedby', described ? `${described} ${node.id}` : node.id);
  }
  node.textContent = hint;
}
