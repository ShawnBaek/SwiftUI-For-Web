/**
 * Renderer - High-performance DOM rendering from view descriptors
 *
 * This module converts immutable view descriptors into DOM elements.
 * It is the bridge between declarative descriptions and the imperative DOM API.
 *
 * Performance optimizations over the original:
 * 1. Element pooling: Reuses recycled DOM elements instead of creating new ones
 * 2. Shared lifecycle observer: Single MutationObserver for all onAppear/onDisappear
 * 3. Event delegation: Click/input events use root-level delegation
 * 4. Modifier batching: All style writes happen in a single pass per element
 * 5. Reduced reflows: Uses cssText for bulk style application where possible
 * 6. Eliminated data-view attributes in production (removed debug overhead)
 */

import {
  isDescriptor,
  isLegacyView,
  ModifierType
} from './ViewDescriptor.js';
import { acquireElement } from './ElementPool.js';
import { onAppear, onDisappear } from './LifecycleObserver.js';
import { delegateEvent } from './EventDelegate.js';

/**
 * Registry of view type renderers
 * Maps type name to render function
 * @type {Map<string, Function>}
 */
const viewRenderers = new Map();

/**
 * Register a renderer for a view type
 *
 * @param {string} type - View type name
 * @param {Function} renderer - Function that takes (props, children) and returns DOM element
 */
export function registerRenderer(type, renderer) {
  viewRenderers.set(type, renderer);
}

/**
 * Render a view descriptor to a DOM element
 *
 * @param {Object} descriptor - View descriptor or legacy View
 * @returns {HTMLElement} DOM element
 */
export function render(descriptor) {
  // Handle null/undefined
  if (descriptor == null) {
    return document.createComment('empty');
  }

  // Handle legacy View instances (backward compatibility)
  if (isLegacyView(descriptor)) {
    return descriptor._render();
  }

  // Handle non-descriptor values (strings, numbers)
  if (!isDescriptor(descriptor)) {
    if (typeof descriptor === 'string' || typeof descriptor === 'number') {
      const textNode = acquireElement('span');
      textNode.textContent = String(descriptor);
      return textNode;
    }
    console.warn('Renderer: Invalid descriptor', descriptor);
    return document.createComment('invalid');
  }

  // Get the renderer for this type
  const renderer = viewRenderers.get(descriptor.type);

  if (!renderer) {
    console.warn(`Renderer: No renderer registered for type "${descriptor.type}"`);
    return renderUnknown(descriptor);
  }

  // Render the element
  const element = renderer(descriptor.props, descriptor.children);

  // Apply modifiers in a single pass
  if (descriptor.modifiers.length > 0) {
    applyModifiers(element, descriptor.modifiers);
  }

  // Store descriptor reference for reconciliation
  element._descriptor = descriptor;

  return element;
}

/**
 * Render children of a descriptor
 *
 * @param {Array} children - Array of child descriptors
 * @returns {DocumentFragment} Fragment containing rendered children
 */
export function renderChildren(children) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child != null) {
      fragment.appendChild(render(child));
    }
  }

  return fragment;
}

/**
 * Render an unknown view type (fallback)
 *
 * @param {Object} descriptor - View descriptor
 * @returns {HTMLElement} DOM element
 */
function renderUnknown(descriptor) {
  const element = acquireElement('div');

  if (descriptor.children.length > 0) {
    element.appendChild(renderChildren(descriptor.children));
  }

  return element;
}

/**
 * Apply modifiers to a DOM element in a single pass.
 *
 * @param {HTMLElement} element - DOM element
 * @param {Array} modifiers - Array of modifier descriptors
 */
export function applyModifiers(element, modifiers) {
  for (let i = 0; i < modifiers.length; i++) {
    applyModifier(element, modifiers[i]);
  }
}

/**
 * Apply a single modifier to a DOM element
 *
 * @param {HTMLElement} element - DOM element
 * @param {Object} modifier - Modifier descriptor
 */
function applyModifier(element, modifier) {
  const { type, value } = modifier;

  switch (type) {
    case ModifierType.PADDING:
      applyPadding(element, value);
      break;

    case ModifierType.FRAME:
      applyFrame(element, value);
      break;

    case ModifierType.FOREGROUND_COLOR:
      applyForegroundColor(element, value);
      break;

    case ModifierType.BACKGROUND:
      applyBackground(element, value);
      break;

    case ModifierType.FONT:
      applyFont(element, value);
      break;

    case ModifierType.OPACITY:
      element.style.opacity = String(value);
      break;

    case ModifierType.CORNER_RADIUS:
      element.style.borderRadius = `${value}px`;
      break;

    case ModifierType.BORDER:
      applyBorder(element, value);
      break;

    case ModifierType.SHADOW:
      applyShadow(element, value);
      break;

    case ModifierType.ON_TAP:
      element.style.cursor = 'pointer';
      // Use event delegation instead of direct listener
      delegateEvent(element, 'click', value);
      break;

    case ModifierType.ON_APPEAR:
      // Use shared lifecycle observer instead of per-element MutationObserver
      onAppear(element, value);
      break;

    case ModifierType.ON_DISAPPEAR:
      // Use shared lifecycle observer instead of per-element MutationObserver
      onDisappear(element, value);
      break;

    case ModifierType.CLIP_SHAPE:
      applyClipShape(element, value);
      break;

    case ModifierType.CUSTOM:
      if (typeof value === 'function') {
        value(element);
      } else if (value && typeof value.apply === 'function') {
        value.apply(element);
      }
      break;

    default:
      // Unknown modifier type - try legacy apply
      if (modifier && typeof modifier.apply === 'function') {
        modifier.apply(element);
      }
  }
}

/**
 * Apply padding modifier
 */
function applyPadding(element, value) {
  if (typeof value === 'number') {
    element.style.padding = `${value}px`;
  } else if (typeof value === 'object') {
    if (value.horizontal !== undefined) {
      element.style.paddingLeft = `${value.horizontal}px`;
      element.style.paddingRight = `${value.horizontal}px`;
    }
    if (value.vertical !== undefined) {
      element.style.paddingTop = `${value.vertical}px`;
      element.style.paddingBottom = `${value.vertical}px`;
    }
    if (value.top !== undefined) element.style.paddingTop = `${value.top}px`;
    if (value.right !== undefined) element.style.paddingRight = `${value.right}px`;
    if (value.bottom !== undefined) element.style.paddingBottom = `${value.bottom}px`;
    if (value.left !== undefined) element.style.paddingLeft = `${value.left}px`;
  }
}

/**
 * Apply frame modifier
 */
function applyFrame(element, value) {
  if (value.width !== undefined) {
    element.style.width = typeof value.width === 'number' ? `${value.width}px` : value.width;
  }
  if (value.height !== undefined) {
    element.style.height = typeof value.height === 'number' ? `${value.height}px` : value.height;
  }
  if (value.minWidth !== undefined) element.style.minWidth = `${value.minWidth}px`;
  if (value.maxWidth !== undefined) element.style.maxWidth = `${value.maxWidth}px`;
  if (value.minHeight !== undefined) element.style.minHeight = `${value.minHeight}px`;
  if (value.maxHeight !== undefined) element.style.maxHeight = `${value.maxHeight}px`;
}

/**
 * Apply foreground color modifier
 */
function applyForegroundColor(element, value) {
  if (value && typeof value.rgba === 'function') {
    element.style.color = value.rgba();
  } else if (typeof value === 'string') {
    element.style.color = value;
  }
}

/**
 * Apply background modifier
 */
function applyBackground(element, value) {
  if (value && typeof value.rgba === 'function') {
    element.style.backgroundColor = value.rgba();
  } else if (typeof value === 'string') {
    element.style.backgroundColor = value;
  }
}

/**
 * Apply font modifier
 */
function applyFont(element, value) {
  if (value && typeof value.css === 'function') {
    const styles = value.css();
    Object.assign(element.style, styles);
  }
}

/**
 * Apply border modifier
 */
function applyBorder(element, value) {
  const { color, width = 1 } = value;
  const colorValue = color && typeof color.rgba === 'function' ? color.rgba() : color;
  element.style.border = `${width}px solid ${colorValue}`;
}

/**
 * Apply shadow modifier
 */
function applyShadow(element, value) {
  const { color = 'rgba(0,0,0,0.2)', radius = 4, x = 0, y = 2 } = value;
  const colorValue = color && typeof color.rgba === 'function' ? color.rgba() : color;
  element.style.boxShadow = `${x}px ${y}px ${radius}px ${colorValue}`;
}

/**
 * Apply clip shape modifier
 */
function applyClipShape(element, value) {
  const shapeName = typeof value === 'string' ? value : value?.type || value?.constructor?.name;

  switch (shapeName?.toLowerCase?.() || shapeName) {
    case 'circle':
    case 'circleview':
      element.style.borderRadius = '50%';
      break;
    case 'capsule':
    case 'capsuleview':
      element.style.borderRadius = '9999px';
      break;
    case 'roundedrectangle':
    case 'roundedrectangleview':
      const radius = value?.cornerRadius ?? value?._cornerRadius ?? 10;
      element.style.borderRadius = `${radius}px`;
      break;
    case 'rectangle':
    case 'rectangleview':
      element.style.borderRadius = '0';
      break;
    case 'ellipse':
    case 'ellipseview':
      element.style.borderRadius = '50%';
      break;
  }
  element.style.overflow = 'hidden';
}

// ============================================================================
// Built-in View Type Renderers
// ============================================================================

// Text
registerRenderer('Text', (props) => {
  const element = acquireElement('span');
  element.textContent = String(props.content ?? '');

  if (props.fontWeight) {
    element.style.fontWeight = getFontWeightValue(props.fontWeight);
  }

  if (props.isItalic) {
    element.style.fontStyle = 'italic';
  }

  const decorations = [];
  if (props.isUnderline) decorations.push('underline');
  if (props.isStrikethrough) decorations.push('line-through');
  if (decorations.length > 0) {
    element.style.textDecoration = decorations.join(' ');
    if (props.underlineColor || props.strikethroughColor) {
      const color = props.underlineColor || props.strikethroughColor;
      const colorValue = color && typeof color.rgba === 'function' ? color.rgba() : color;
      element.style.textDecorationColor = colorValue;
    }
  }

  if (props.textAlignment) {
    const alignMap = { leading: 'left', center: 'center', trailing: 'right' };
    element.style.textAlign = alignMap[props.textAlignment] || props.textAlignment;
    element.style.display = 'block';
  }

  if (props.lineLimit != null) {
    element.style.display = '-webkit-box';
    element.style.webkitLineClamp = String(props.lineLimit);
    element.style.webkitBoxOrient = 'vertical';
    element.style.overflow = 'hidden';
  }

  if (props.kerning != null) {
    element.style.letterSpacing = `${props.kerning}px`;
  }

  if (props.lineSpacing != null) {
    element.style.lineHeight = `${1.5 + props.lineSpacing / 16}`;
  }

  if (props.monospacedDigit) {
    element.style.fontVariantNumeric = 'tabular-nums';
  }

  if (props.baselineOffset != null) {
    element.style.verticalAlign = `${props.baselineOffset}px`;
  }

  return element;
});

function getFontWeightValue(weight) {
  const weights = {
    ultraLight: '100',
    thin: '200',
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
    black: '900'
  };
  return weights[weight] || weight;
}

// VStack
registerRenderer('VStack', (props, children) => {
  const element = acquireElement('div');
  element.style.display = 'flex';
  element.style.flexDirection = 'column';
  element.style.alignItems = alignmentToCSS(props.alignment, 'horizontal');
  element.style.gap = `${props.spacing ?? 8}px`;
  element.appendChild(renderChildren(children));
  return element;
});

// HStack
registerRenderer('HStack', (props, children) => {
  const element = acquireElement('div');
  element.style.display = 'flex';
  element.style.flexDirection = 'row';
  element.style.alignItems = alignmentToCSS(props.alignment, 'vertical');
  element.style.gap = `${props.spacing ?? 8}px`;
  element.appendChild(renderChildren(children));
  return element;
});

// ZStack
registerRenderer('ZStack', (props, children) => {
  const element = acquireElement('div');
  element.style.display = 'grid';
  element.style.gridTemplate = '1fr / 1fr';

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child != null) {
      const childEl = render(child);
      childEl.style.gridArea = '1 / 1';
      applyZStackAlignment(childEl, props.alignment);
      element.appendChild(childEl);
    }
  }

  return element;
});

// Spacer
registerRenderer('Spacer', (props) => {
  const element = acquireElement('div');
  element.style.flexGrow = '1';
  element.style.flexShrink = '1';
  element.style.flexBasis = '0';
  element.style.alignSelf = 'stretch';

  if (props.minLength != null) {
    element.style.minWidth = `${props.minLength}px`;
    element.style.minHeight = `${props.minLength}px`;
  }

  return element;
});

// Divider
registerRenderer('Divider', () => {
  const element = acquireElement('hr');
  element.style.border = 'none';
  element.style.borderTop = '1px solid rgba(60, 60, 67, 0.3)';
  element.style.margin = '0';
  element.style.width = '100%';
  return element;
});

// Button
registerRenderer('Button', (props, children) => {
  const element = acquireElement('button');
  element.style.cursor = 'pointer';
  element.style.border = 'none';
  element.style.background = 'transparent';
  element.style.padding = '0';
  element.style.font = 'inherit';

  if (children.length > 0) {
    element.appendChild(renderChildren(children));
  } else if (props.label) {
    element.textContent = props.label;
  }

  if (props.isDisabled) {
    element.disabled = true;
    element.style.opacity = '0.5';
    element.style.cursor = 'not-allowed';
  }

  applyButtonStyle(element, props.buttonStyle);

  if (props.action && !props.isDisabled) {
    // Use event delegation for click handling
    delegateEvent(element, 'click', (event) => {
      event.preventDefault();
      props.action();
    });
  }

  return element;
});

function applyButtonStyle(element, style) {
  switch (style) {
    case 'bordered':
      element.style.padding = '8px 16px';
      element.style.border = '1px solid currentColor';
      element.style.borderRadius = '8px';
      element.style.background = 'transparent';
      break;
    case 'borderedProminent':
      element.style.padding = '8px 16px';
      element.style.borderRadius = '8px';
      element.style.background = 'rgba(0, 122, 255, 1)';
      element.style.color = 'white';
      break;
    case 'borderless':
      element.style.padding = '8px 16px';
      element.style.background = 'transparent';
      break;
    case 'plain':
      break;
    case 'default':
    default:
      element.style.color = 'rgba(0, 122, 255, 1)';
      break;
  }
}

// Image
registerRenderer('Image', (props) => {
  const element = acquireElement('img');
  element.src = props.source || props.src || '';
  element.alt = props.alt || '';

  if (props.resizable) {
    element.style.maxWidth = '100%';
    element.style.height = 'auto';
  }

  return element;
});

// Group
registerRenderer('Group', (props, children) => {
  const element = acquireElement('div');
  element.appendChild(renderChildren(children));
  return element;
});

// ScrollView
registerRenderer('ScrollView', (props, children) => {
  const element = acquireElement('div');
  element.style.overflow = 'auto';

  if (props.axis === 'horizontal' || props.axes?.includes?.('horizontal')) {
    element.style.overflowX = 'auto';
    element.style.overflowY = 'hidden';
  } else if (props.axis === 'vertical' || props.axes?.includes?.('vertical')) {
    element.style.overflowX = 'hidden';
    element.style.overflowY = 'auto';
  }

  if (props.showsIndicators === false) {
    element.style.scrollbarWidth = 'none';
    element.style.msOverflowStyle = 'none';
  }

  element.appendChild(renderChildren(children));
  return element;
});

// ForEach
registerRenderer('ForEach', (props, children) => {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child != null) {
      fragment.appendChild(render(child));
    }
  }
  const element = acquireElement('div');
  element.style.display = 'contents';
  element.appendChild(fragment);
  return element;
});

// ============================================================================
// Helper Functions
// ============================================================================

function alignmentToCSS(alignment, direction) {
  if (!alignment) return 'center';

  const alignmentStr = typeof alignment === 'string' ? alignment : alignment.toString?.() || 'center';

  switch (alignmentStr.toLowerCase()) {
    case 'leading':
    case 'top':
    case 'topleft':
    case 'topleading':
      return 'flex-start';
    case 'trailing':
    case 'bottom':
    case 'bottomright':
    case 'bottomtrailing':
      return 'flex-end';
    case 'center':
    default:
      return 'center';
  }
}

function applyZStackAlignment(element, alignment) {
  if (!alignment) {
    element.style.justifySelf = 'center';
    element.style.alignSelf = 'center';
    return;
  }

  const alignmentStr = typeof alignment === 'string' ? alignment : alignment.toString?.() || 'center';
  const lower = alignmentStr.toLowerCase();

  if (lower.includes('top')) {
    element.style.alignSelf = 'start';
  } else if (lower.includes('bottom')) {
    element.style.alignSelf = 'end';
  } else {
    element.style.alignSelf = 'center';
  }

  if (lower.includes('leading') || lower.includes('left')) {
    element.style.justifySelf = 'start';
  } else if (lower.includes('trailing') || lower.includes('right')) {
    element.style.justifySelf = 'end';
  } else {
    element.style.justifySelf = 'center';
  }
}

export default {
  render,
  renderChildren,
  applyModifiers,
  registerRenderer
};
