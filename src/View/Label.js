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

import { View } from '../Core/View.js';
import { Color } from '../Graphic/Color.js';

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
 * Label view class
 */
export class LabelView extends View {
  constructor(titleOrOptions, options = {}) {
    super();

    this._labelStyle = LabelStyle.automatic;

    if (typeof titleOrOptions === 'string') {
      // Label('Title', { systemImage: 'star' })
      this._title = titleOrOptions;
      this._systemImage = options.systemImage ?? null;
      this._image = options.image ?? null;
      this._titleBuilder = null;
      this._iconBuilder = null;
    } else if (typeof titleOrOptions === 'object') {
      // Label({ title: () => Text('...'), icon: () => Image(...) })
      this._title = null;
      this._systemImage = null;
      this._image = null;
      this._titleBuilder = titleOrOptions.title ?? null;
      this._iconBuilder = titleOrOptions.icon ?? null;
    }
  }

  /**
   * Set the label style
   * @param {string} style - LabelStyle value
   * @returns {LabelView} Returns this for chaining
   */
  labelStyle(style) {
    this._labelStyle = style;
    return this;
  }

  _render() {
    const el = document.createElement('div');
    el.dataset.view = 'label';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '6px';

    const showIcon = this._labelStyle === LabelStyle.automatic ||
      this._labelStyle === LabelStyle.iconOnly ||
      this._labelStyle === LabelStyle.titleAndIcon;

    const showTitle = this._labelStyle === LabelStyle.automatic ||
      this._labelStyle === LabelStyle.titleOnly ||
      this._labelStyle === LabelStyle.titleAndIcon;

    // Render icon
    if (showIcon) {
      const iconEl = document.createElement('span');
      iconEl.dataset.labelPart = 'icon';

      if (this._iconBuilder) {
        const iconView = this._iconBuilder();
        if (iconView instanceof View) {
          const rendered = iconView._render();
          iconEl.appendChild(rendered);
        }
      } else if (this._systemImage) {
        iconEl.textContent = SystemIcons[this._systemImage] ?? '●';
        iconEl.style.fontSize = '1.1em';
      } else if (this._image) {
        const img = document.createElement('img');
        img.src = this._image;
        img.style.width = '1.2em';
        img.style.height = '1.2em';
        img.style.objectFit = 'contain';
        iconEl.appendChild(img);
      }

      el.appendChild(iconEl);
    }

    // Render title
    if (showTitle) {
      const titleEl = document.createElement('span');
      titleEl.dataset.labelPart = 'title';

      if (this._titleBuilder) {
        const titleView = this._titleBuilder();
        if (titleView instanceof View) {
          const rendered = titleView._render();
          titleEl.appendChild(rendered);
        }
      } else if (this._title) {
        titleEl.textContent = this._title;
      }

      el.appendChild(titleEl);
    }

    return this._applyModifiers(el);
  }
}

/**
 * Factory function for Label
 */
export function Label(titleOrOptions, options = {}) {
  return new LabelView(titleOrOptions, options);
}

export { LabelStyle, SystemIcons };
export default Label;
