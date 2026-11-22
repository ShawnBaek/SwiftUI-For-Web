/**
 * Frame layout shared by descriptor views (Renderer) and legacy View.frame.
 */
const isInfinite = (value) => value === Infinity || value === 'infinity' || value === '.infinity';
const cssLength = (value) => (typeof value === 'number' ? `${value}px` : value);


/**
 * Apply frame options to an element. Descriptor views and legacy View.frame
 * share it, so both handle `Infinity` and CSS-string lengths the same way.
 *
 * @param {HTMLElement} element
 * @param {Object} value - width, height, minWidth, maxWidth, minHeight, maxHeight
 */
// The axis of the stack whose children are being rendered: 'horizontal'
// (HStack), 'vertical' (VStack), or null (anything else). A child's
// modifiers are applied while its parent stack renders it, so frame and
// Spacer can resolve "fill" along the right axis (#50).
let stackAxis = null;

/**
 * Run `fn` (rendering a stack's children) with the given stack axis.
 * @internal
 */
export function withStackAxis(axis, fn) {
  const previous = stackAxis;
  stackAxis = axis;
  try {
    return fn();
  } finally {
    stackAxis = previous;
  }
}

/** @internal */
export function currentStackAxis() {
  return stackAxis;
}

export function applyFrame(element, value) {
  const style = element.style;
  // Padding and borders sit inside the frame, as in SwiftUI, so
  // .padding(8).frame({ maxWidth: Infinity }) never overflows (#50).
  style.boxSizing = 'border-box';
  if (value.width !== undefined) style.width = cssLength(value.width);
  if (value.height !== undefined) style.height = cssLength(value.height);
  if (value.minWidth !== undefined) style.minWidth = cssLength(value.minWidth);
  if (value.minHeight !== undefined) style.minHeight = cssLength(value.minHeight);
  // SwiftUI's frame(maxWidth: .infinity) fills the available space (#50).
  // Inside a stack, fill along the stack's axis with flex growth (sharing
  // the space with Spacers and other flexible views) and across it by
  // stretching. Elsewhere, take 100% of the parent.
  if (value.maxWidth !== undefined) {
    if (isInfinite(value.maxWidth)) {
      style.maxWidth = 'none';
      fill(style, 'horizontal', value.width === undefined);
    } else {
      style.maxWidth = cssLength(value.maxWidth);
    }
  }
  if (value.maxHeight !== undefined) {
    if (isInfinite(value.maxHeight)) {
      style.maxHeight = 'none';
      fill(style, 'vertical', value.height === undefined);
    } else {
      style.maxHeight = cssLength(value.maxHeight);
    }
  }
  if (value.alignment !== undefined && value.alignment !== null) applyFrameAlignment(style, value.alignment);
}

// frame(alignment:) positions the content inside the frame (#50): the
// element becomes a flex container (unless it is a grid) and its main and
// cross axis alignment follow the requested edge.
function applyFrameAlignment(style, alignment) {
  const name = String(alignment).toLowerCase();
  const vertical = name.includes('top') ? 'flex-start' : name.includes('bottom') ? 'flex-end' : 'center';
  const horizontal = name.includes('leading') || name.includes('left')
    ? 'flex-start'
    : name.includes('trailing') || name.includes('right') ? 'flex-end' : 'center';
  if (style.display === 'grid') {
    style.alignItems = vertical === 'flex-start' ? 'start' : vertical === 'flex-end' ? 'end' : 'center';
    style.justifyItems = horizontal === 'flex-start' ? 'start' : horizontal === 'flex-end' ? 'end' : 'center';
    return;
  }
  if (!style.display || style.display.startsWith('inline') || style.display === 'block') {
    style.display = 'flex';
  }
  if (style.flexDirection === 'column') {
    style.justifyContent = vertical;
    style.alignItems = horizontal;
  } else {
    style.justifyContent = horizontal;
    style.alignItems = vertical;
  }
  // Text inside follows the horizontal edge too.
  style.textAlign = horizontal === 'flex-start' ? 'start' : horizontal === 'flex-end' ? 'end' : 'center';
}

function fill(style, axis, sizeIsFree) {
  if (stackAxis === axis) {
    style.flexGrow = '1';
    style.flexBasis = '0';
    if (axis === 'horizontal') style.minWidth ||= '0';
    else style.minHeight ||= '0';
  } else if (stackAxis) {
    style.alignSelf = 'stretch';
  } else if (sizeIsFree) {
    if (axis === 'horizontal') style.width = '100%';
    else style.height = '100%';
  }
}
