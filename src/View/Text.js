/**
 * Text - A view that displays one or more lines of read-only text.
 *
 * Matches SwiftUI's Text view for displaying static text content.
 * Uses immutable view descriptors for efficient rendering.
 *
 * @example
 * // Basic usage
 * Text('Hello, World!')
 *
 * // With modifiers
 * Text('Welcome')
 *   .font(Font.title)
 *   .foregroundColor(Color.blue)
 *   .bold()
 */

import { chainable as sharedChainable } from '../Core/Chainable.js';
import {
  createDescriptor,
  addModifier,
  setKey,
  createModifier,
  ModifierType
} from '../Core/ViewDescriptor.js';
import { State } from '../Data/State.js';
import { Binding } from '../Data/Binding.js';

/**
 * Heading level for `.accessibilityHeading(_:)`.
 *
 * Matches SwiftUI's `AccessibilityHeadingLevel`. On the web this also drives
 * semantic markup: a non-`unspecified` level renders the underlying element
 * as `<h1>`–`<h6>` instead of `<span>`, so headings are picked up by
 * assistive tech AND search engines without introducing non-SwiftUI views.
 *
 * @see https://developer.apple.com/documentation/swiftui/accessibilityheadinglevel
 */
export const AccessibilityHeadingLevel = Object.freeze({
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  unspecified: 'unspecified'
});

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

// Text-only modifiers (#48: everything else comes from the shared table).
const textModifiers = ({ withProps }) => ({
  bold: () => withProps({ fontWeight: 'bold' }),
  italic: () => withProps({ isItalic: true }),
  fontWeight: (weight) => withProps({ fontWeight: weight }),
  underline: (active = true, color = null) => withProps({ isUnderline: active, underlineColor: color }),
  strikethrough: (active = true, color = null) => withProps({ isStrikethrough: active, strikethroughColor: color }),
  multilineTextAlignment: (alignment) => withProps({ textAlignment: alignment }),
  lineLimit: (limit) => withProps({ lineLimit: limit }),
  truncationMode: (mode) => withProps({ truncationMode: mode }),
  kerning: (spacing) => withProps({ kerning: spacing }),
  lineSpacing: (spacing) => withProps({ lineSpacing: spacing }),
  monospacedDigit: () => withProps({ monospacedDigit: true }),
  baselineOffset: (offset) => withProps({ baselineOffset: offset }),
  // Accessibility: marks the Text as a heading. On the web this maps to
  // <h1>..<h6>, giving both VoiceOver/screen-reader semantics and SEO.
  // Passing AccessibilityHeadingLevel.unspecified (or null) reverts to <span>.
  accessibilityHeading: (level) => withProps({ headingLevel: HEADING_TAGS.has(level) ? level : null }),
});

function chainable(descriptor) {
  return sharedChainable(descriptor, textModifiers);
}

/**
 * Text - Display text content
 *
 * @param {string|number} content - The text content to display
 * @returns {Object} Chainable view descriptor
 *
 * @example
 * Text('Hello, World!')
 *   .font(Font.title)
 *   .foregroundColor(Color.blue)
 */
export function Text(content) {
  // Reactive content: Renderer.render binds the thunk to textContent with
  // createEffect under the current owner. Eager content is set once.
  if (typeof content === 'function') {
    return chainable(createDescriptor('Text', { contentThunk: content }));
  }
  // A State or Binding passed directly subscribes like a thunk would (#52).
  if (content instanceof State || content instanceof Binding) {
    const source = content;
    return chainable(createDescriptor('Text', { contentThunk: () => source.value }));
  }
  return chainable(createDescriptor('Text', { content: String(content) }));
}

export default Text;
