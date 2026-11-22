/**
 * Image - SwiftUI-style image component
 *
 * Displays images with support for various resize modes and styling.
 *
 * @example
 * Image('photo.jpg')
 *   .resizable()
 *   .aspectRatio('fill')
 *   .frame({ width: 200, height: 150 })
 *   .cornerRadius(8)
 *
 * // System symbol (SF Symbols style)
 * Image.systemName('star.fill')
 *   .foregroundColor(Color.yellow)
 */

import { createDescriptor } from '../Core/ViewDescriptor.js';
import { chainable } from '../Core/Chainable.js';
import { registerRenderer } from '../Core/Renderer.js';

/**
 * ContentMode enum - matches SwiftUI's ContentMode
 */
export const ContentMode = {
  fit: 'fit',     // Scales to fit within bounds, maintains aspect ratio
  fill: 'fill'    // Scales to fill bounds, maintains aspect ratio (may clip)
};

// Image's own modifiers. Shader effects, clipShape and the rest come from
// the shared table (Chainable.js).
const imageMethods = ({ withProps }) => ({
  resizable: () => withProps({ resizable: true }),
  aspectRatio: (contentMode = ContentMode.fit) => withProps({ contentMode }),
  scaledToFit: () => withProps({ contentMode: ContentMode.fit }),
  scaledToFill: () => withProps({ contentMode: ContentMode.fill }),
  // 'original' or 'template'
  renderingMode: (mode) => withProps({ renderingMode: mode }),
  // 'none', 'low', 'medium' or 'high'
  interpolation: (quality) => withProps({ interpolation: quality }),
  // An image's label is its alt text (the symbol's aria-label).
  accessibilityLabel: (text) => withProps({ alt: text }),
  onLoad: (handler) => withProps({ onLoad: handler }),
  onError: (handler) => withProps({ onError: handler }),
});

function makeImage(source, isSystemName) {
  return chainable(createDescriptor('Image', {
    source,
    isSystemName,
    resizable: false,
    contentMode: ContentMode.fit,
    alt: '',
    renderingMode: 'original',
    interpolation: 'high',
    onLoad: null,
    onError: null,
  }), imageMethods);
}

/**
 * Image(source): an image from a URL or path.
 *
 * @param {string} source - Image source URL or path
 * @returns {Object} Chainable view descriptor
 */
export function Image(source) {
  return makeImage(source, false);
}

/**
 * Image.systemName(name): a system symbol (SF Symbols style), drawn with a
 * Unicode character.
 */
Image.systemName = (systemName) => makeImage(systemName, true);

// Common SF Symbol names and their Unicode/emoji stand-ins.
const SYMBOLS = {
  'chevron.left': '‹',
  'chevron.right': '›',
  'chevron.up': '‹',
  'chevron.down': '›',
  'arrow.left': '←',
  'arrow.right': '→',
  'arrow.up': '↑',
  'arrow.down': '↓',
  'plus': '+',
  'minus': '−',
  'xmark': '✕',
  'checkmark': '✓',
  'star': '☆',
  'star.fill': '★',
  'heart': '♡',
  'heart.fill': '♥',
  'play': '▶',
  'play.fill': '▶',
  'pause': '⏸',
  'stop': '⏹',
  'forward': '⏩',
  'backward': '⏪',
  'envelope': '✉',
  'phone': '📞',
  'message': '💬',
  'gear': '⚙',
  'magnifyingglass': '🔍',
  'house': '🏠',
  'house.fill': '🏠',
  'person': '👤',
  'person.fill': '👤',
  'bell': '🔔',
  'bell.fill': '🔔',
  'info.circle': 'ℹ',
  'info.circle.fill': 'ℹ',
  'questionmark.circle': '?',
  'exclamationmark.triangle': '⚠',
  'square': '□',
  'circle': '○',
  'circle.fill': '●'
};

registerRenderer('Image', (props) => {
  if (props.isSystemName) {
    const span = document.createElement('span');
    span.textContent = SYMBOLS[props.source] || '□';
    span.style.display = 'inline-flex';
    span.style.alignItems = 'center';
    span.style.justifyContent = 'center';
    span.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    // Template mode tints with the current color.
    if (props.renderingMode === 'template') span.style.color = 'currentColor';
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', props.alt || props.source);
    return span;
  }

  const img = document.createElement('img');
  img.src = props.source;
  img.alt = props.alt;
  img.style.display = 'block';
  if (props.resizable) {
    img.style.width = '100%';
    img.style.height = '100%';
  }
  img.style.objectFit = props.contentMode === ContentMode.fill ? 'cover' : 'contain';
  img.style.imageRendering = props.interpolation === 'none' ? 'pixelated' : 'auto';
  if (props.onLoad) img.addEventListener('load', props.onLoad);
  if (props.onError) img.addEventListener('error', props.onError);
  return img;
});

export default Image;
