/**
 * Form - A container for grouping controls used for data entry
 *
 * Matches SwiftUI's Form view which provides a standard appearance for forms.
 *
 * @example
 * Form(
 *   Section({ header: () => Text('Personal Info') },
 *     TextField('Name', $name),
 *     TextField('Email', $email)
 *   ),
 *   Section({ header: () => Text('Preferences') },
 *     Toggle('Notifications', $notifications),
 *     Picker('Theme', $theme, ...)
 *   )
 * )
 */

import { View } from '../../Core/View.js';
import { Color } from '../../Graphic/Color.js';
import { VIEW_DESCRIPTOR } from '../../Core/ViewDescriptor.js';
import { render as renderDescriptor } from '../../Core/Renderer.js';

/**
 * Helper to render both View instances and descriptors
 */
function renderChild(child) {
  if (child instanceof View) {
    return child._render();
  } else if (child && child.$$typeof === VIEW_DESCRIPTOR) {
    return renderDescriptor(child);
  }
  return null;
}

/**
 * Form style enum
 */
export const FormStyle = {
  automatic: 'automatic',
  grouped: 'grouped',
  columns: 'columns'
};

/**
 * Section view class - Used within Form to group related controls
 */
export class SectionView extends View {
  constructor(optionsOrChildren, ...children) {
    super();

    this._header = null;
    this._footer = null;
    this._children = [];

    // Parse arguments
    if (typeof optionsOrChildren === 'object' && !(optionsOrChildren instanceof View) && !Array.isArray(optionsOrChildren)) {
      // Section({ header, footer }, children...)
      this._header = optionsOrChildren.header ?? null;
      this._footer = optionsOrChildren.footer ?? null;
      this._children = children.flat();
    } else {
      // Section(children...)
      if (optionsOrChildren instanceof View) {
        this._children = [optionsOrChildren, ...children].flat();
      } else if (Array.isArray(optionsOrChildren)) {
        this._children = optionsOrChildren.flat();
      } else {
        this._children = children.flat();
      }
    }
  }

  _render() {
    const section = document.createElement('div');
    section.dataset.view = 'section';
    section.style.marginBottom = '24px';

    // Header
    if (this._header) {
      const headerContainer = document.createElement('div');
      headerContainer.dataset.sectionPart = 'header';
      headerContainer.style.padding = '8px 16px 8px 16px';
      headerContainer.style.fontSize = '13px';
      headerContainer.style.fontWeight = '400';
      headerContainer.style.color = 'rgba(60, 60, 67, 0.6)';
      headerContainer.style.textTransform = 'uppercase';
      headerContainer.style.letterSpacing = '0.5px';

      // Handle header as function, View, or string
      let headerView = null;
      if (typeof this._header === 'function') {
        headerView = this._header();
      } else if (this._header instanceof View) {
        headerView = this._header;
      } else if (typeof this._header === 'string') {
        // Create a text span for string headers
        const textSpan = document.createElement('span');
        textSpan.textContent = this._header;
        headerContainer.appendChild(textSpan);
      }

      const rendered = renderChild(headerView);
      if (rendered) {
        // Inherit text styles
        rendered.style.fontSize = 'inherit';
        rendered.style.color = 'inherit';
        rendered.style.textTransform = 'inherit';
        rendered.style.letterSpacing = 'inherit';
        headerContainer.appendChild(rendered);
      }

      section.appendChild(headerContainer);
    }

    // Content
    const content = document.createElement('div');
    content.dataset.sectionPart = 'content';
    content.style.backgroundColor = 'white';
    content.style.borderRadius = '10px';
    content.style.overflow = 'hidden';

    this._children.forEach((child, index) => {
      const rendered = renderChild(child);
      if (rendered) {
        const row = document.createElement('div');
        row.style.padding = '11px 16px';

        // Add separator between rows
        if (index > 0) {
          row.style.borderTop = '1px solid rgba(60, 60, 67, 0.1)';
        }

        row.appendChild(rendered);
        content.appendChild(row);
      }
    });

    section.appendChild(content);

    // Footer
    if (this._footer) {
      const footerContainer = document.createElement('div');
      footerContainer.dataset.sectionPart = 'footer';
      footerContainer.style.padding = '8px 16px';
      footerContainer.style.fontSize = '13px';
      footerContainer.style.color = 'rgba(60, 60, 67, 0.6)';

      const footerView = this._footer();
      const footerRendered = renderChild(footerView);
      if (footerRendered) {
        footerRendered.style.fontSize = 'inherit';
        footerRendered.style.color = 'inherit';
        footerContainer.appendChild(footerRendered);
      }

      section.appendChild(footerContainer);
    }

    return this._applyModifiers(section);
  }
}

/**
 * Factory function for Section
 */
export function Section(optionsOrChildren, ...children) {
  return new SectionView(optionsOrChildren, ...children);
}

/**
 * Form view class
 */
export class FormView extends View {
  constructor(...children) {
    super();
    this._children = children.flat();
    this._formStyle = FormStyle.automatic;
  }

  /**
   * Set the form style
   * @param {string} style - FormStyle value
   * @returns {FormView} Returns this for chaining
   */
  formStyle(style) {
    this._formStyle = style;
    return this;
  }

  _render() {
    const form = document.createElement('div');
    form.dataset.view = 'form';
    form.setAttribute('role', 'form');

    // Form styles
    form.style.backgroundColor = 'rgba(242, 242, 247, 1)';
    form.style.padding = '16px';
    form.style.minHeight = '100%';

    // Render children
    for (const child of this._children) {
      const rendered = renderChild(child);
      if (rendered) {
        form.appendChild(rendered);
      }
    }

    return this._applyModifiers(form);
  }
}

/**
 * Factory function for Form
 */
export function Form(...children) {
  return new FormView(...children);
}

export default Form;
