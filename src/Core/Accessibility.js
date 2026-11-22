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
// Elements that can't hold child nodes (or whose children aren't content).
const VOID_TAGS = new Set(['input', 'img', 'textarea', 'select', 'hr', 'br', 'area', 'video', 'audio', 'canvas', 'iframe']);

function isVoid(element) {
  return VOID_TAGS.has(String(element.tagName || '').toLowerCase());
}

// The name a void element has without aria-label.
function nativeName(element) {
  return element.getAttribute?.('alt') || element.getAttribute?.('placeholder') || element.getAttribute?.('title') || '';
}

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
  if (isVoid(element)) {
    // No children to hold hidden text: extend the element's own name.
    const base = nativeName(element);
    element.setAttribute('aria-label', base ? `${base}, ${value}` : value);
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
  if (isVoid(element)) {
    applyVoidHint(element, hint);
    return;
  }
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

// A void element can't contain its hint node: describe it right away with
// aria-description, then, once it is in the document, move the hint to a
// hidden sibling referenced by aria-describedby.
function applyVoidHint(element, hint) {
  element.setAttribute('aria-description', hint);
  let node = element._accessibilityHintNode;
  if (node) {
    node.textContent = hint;
    return;
  }
  node = document.createElement('span');
  node.id = nextElementId('swiftui-hint');
  node.dataset.accessibilityHint = '';
  node.hidden = true;
  node.textContent = hint;
  element._accessibilityHintNode = node;
  queueMicrotask(() => {
    const parent = element.parentNode;
    if (!parent || typeof parent.insertBefore !== 'function') return;
    parent.insertBefore(node, element.nextSibling);
    const described = element.getAttribute('aria-describedby');
    element.setAttribute('aria-describedby', described ? `${described} ${node.id}` : node.id);
    element.removeAttribute('aria-description');
  });
}

/**
 * Put back the value and hint nodes after the element's content was
 * replaced (a reactive Text writes textContent on every update).
 */
export function restoreAccessibilityNodes(element) {
  for (const node of [element._accessibilityValueNode, element._accessibilityHintNode]) {
    if (node && node.parentNode !== element && !isVoid(element)) element.appendChild(node);
  }
}
