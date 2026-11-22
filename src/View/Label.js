/**
 * Label - A view that combines an icon and text
 *
 * Matches SwiftUI's Label view for displaying text with an accompanying icon.
 *
 * @example
 * Label('Favorites', { systemImage: 'star.fill' })
 *
 * @example
 * Label({ title: () => Text('Custom'), icon: () => Image.systemName('heart') })
 */

import { createDescriptor, isView } from '../Core/ViewDescriptor.js';
import { chainable } from '../Core/Chainable.js';
import { registerRenderer, render } from '../Core/Renderer.js';

/**
 * Label style enum
 */
export const LabelStyle = {
  automatic: 'automatic',
  titleOnly: 'titleOnly',
  iconOnly: 'iconOnly',
  titleAndIcon: 'titleAndIcon'
};

/**
 * System icon mapping (subset of SF Symbols)
 */
const SystemIcons = {
  // Common icons using Unicode/emoji approximations
  'star': '☆',
  'star.fill': '★',
  'heart': '♡',
  'heart.fill': '❤',
  'plus': '+',
  'minus': '−',
  'xmark': '×',
  'checkmark': '✓',
  'chevron.right': '›',
  'chevron.left': '‹',
  'chevron.up': '∧',
  'chevron.down': '∨',
  'arrow.right': '→',
  'arrow.left': '←',
  'arrow.up': '↑',
  'arrow.down': '↓',
  'magnifyingglass': '🔍',
  'gear': '⚙',
  'person': '👤',
  'person.fill': '👤',
  'house': '🏠',
  'house.fill': '🏠',
  'folder': '📁',
  'folder.fill': '📁',
  'trash': '🗑',
  'trash.fill': '🗑',
  'pencil': '✏',
  'square.and.pencil': '📝',
  'doc': '📄',
  'doc.fill': '📄',
  'bell': '🔔',
  'bell.fill': '🔔',
  'envelope': '✉',
  'envelope.fill': '✉',
  'phone': '📞',
  'phone.fill': '📞',
  'message': '💬',
  'message.fill': '💬',
  'camera': '📷',
  'camera.fill': '📷',
  'photo': '🖼',
  'photo.fill': '🖼',
  'play': '▶',
  'play.fill': '▶',
  'pause': '⏸',
  'pause.fill': '⏸',
  'stop': '■',
  'stop.fill': '■',
  'forward': '⏩',
  'backward': '⏪',
  'speaker': '🔈',
  'speaker.fill': '🔈',
  'speaker.wave.3': '🔊',
  'speaker.slash': '🔇',
  'lock': '🔒',
  'lock.fill': '🔒',
  'lock.open': '🔓',
  'key': '🔑',
  'key.fill': '🔑',
  'wifi': '📶',
  'airplane': '✈',
  'sun.max': '☀',
  'sun.max.fill': '☀',
  'moon': '☾',
  'moon.fill': '🌙',
  'cloud': '☁',
  'cloud.fill': '☁',
  'bolt': '⚡',
  'bolt.fill': '⚡'
};

/**
 * Label('Title', { systemImage | image }) or Label({ title, icon }), where
 * title and icon are functions returning views.
 *
 * @returns {Object} Chainable view descriptor
 */
export function Label(titleOrOptions, options = {}) {
  const custom = typeof titleOrOptions === 'object' && titleOrOptions !== null;
  return chainable(createDescriptor('Label', {
    title: custom ? null : titleOrOptions,
    systemImage: custom ? null : options.systemImage ?? null,
    image: custom ? null : options.image ?? null,
    titleBuilder: custom ? titleOrOptions.title ?? null : null,
    iconBuilder: custom ? titleOrOptions.icon ?? null : null,
    labelStyle: LabelStyle.automatic,
  }), ({ withProps }) => ({
    labelStyle: (style) => withProps({ labelStyle: style }),
  }));
}

function labelPart(name, builder) {
  const part = document.createElement('span');
  part.dataset.labelPart = name;
  const view = builder?.();
  if (isView(view)) part.appendChild(render(view));
  return part;
}

registerRenderer('Label', (props) => {
  const el = document.createElement('div');
  el.dataset.view = 'label';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.gap = '6px';

  const style = props.labelStyle;
  if (style !== LabelStyle.titleOnly) {
    const icon = labelPart('icon', props.iconBuilder);
    if (props.iconBuilder) {
      // labelPart rendered it.
    } else if (props.systemImage) {
      icon.textContent = SystemIcons[props.systemImage] ?? '●';
      icon.style.fontSize = '1.1em';
    } else if (props.image) {
      const img = document.createElement('img');
      img.src = props.image;
      img.style.width = '1.2em';
      img.style.height = '1.2em';
      img.style.objectFit = 'contain';
      icon.appendChild(img);
    }
    el.appendChild(icon);
  }

  if (style !== LabelStyle.iconOnly) {
    const title = labelPart('title', props.titleBuilder);
    if (!props.titleBuilder && props.title) title.textContent = props.title;
    el.appendChild(title);
  }

  return el;
});

export { SystemIcons };
export default Label;
