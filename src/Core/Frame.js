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
export function applyFrame(element, value) {
  if (value.width !== undefined) element.style.width = cssLength(value.width);
  if (value.height !== undefined) element.style.height = cssLength(value.height);
  if (value.minWidth !== undefined) element.style.minWidth = cssLength(value.minWidth);
  if (value.minHeight !== undefined) element.style.minHeight = cssLength(value.minHeight);
  // SwiftUI's frame(maxWidth: .infinity) fills the available space (#50).
  // Without this, the value became "infinitypx", which CSS ignores.
  if (value.maxWidth !== undefined) {
    if (isInfinite(value.maxWidth)) {
      element.style.maxWidth = 'none';
      if (value.width === undefined) element.style.width = '100%';
    } else {
      element.style.maxWidth = cssLength(value.maxWidth);
    }
  }
  if (value.maxHeight !== undefined) {
    if (isInfinite(value.maxHeight)) {
      element.style.maxHeight = 'none';
      if (value.height === undefined) element.style.height = '100%';
    } else {
      element.style.maxHeight = cssLength(value.maxHeight);
    }
  }
}
