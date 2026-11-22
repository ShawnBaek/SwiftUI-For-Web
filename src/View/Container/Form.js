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

import { createDescriptor, isView } from '../../Core/ViewDescriptor.js';
import { chainable } from '../../Core/Chainable.js';
import { registerRenderer, render } from '../../Core/Renderer.js';

/**
 * Form style enum
 */
export const FormStyle = {
  automatic: 'automatic',
  grouped: 'grouped',
  columns: 'columns'
};

/**
 * Section - groups related content, with an optional header and footer.
 *
 * Signatures: Section({ header, footer }, ...content) and
 * Section(...content). A header or footer is a string, a view, or a
 * function returning one.
 */
export function Section(optionsOrChildren, ...children) {
  const hasOptions = optionsOrChildren && typeof optionsOrChildren === 'object'
    && !isView(optionsOrChildren) && !Array.isArray(optionsOrChildren);
  const options = hasOptions ? optionsOrChildren : {};
  const content = hasOptions ? children : [optionsOrChildren, ...children];
  return chainable(createDescriptor('Section', {
    header: options.header ?? null,
    footer: options.footer ?? null,
  }, content.flat()));
}

const SECONDARY = 'rgba(60, 60, 67, 0.6)';

// A header or footer: its text styles come from the part's container.
function renderPart(name, value, inherited, style) {
  const part = document.createElement('div');
  part.dataset.sectionPart = name;
  Object.assign(part.style, style);
  const view = typeof value === 'function' ? value() : value;
  if (typeof view === 'string') {
    const span = document.createElement('span');
    span.textContent = view;
    part.appendChild(span);
  } else if (isView(view)) {
    const rendered = render(view);
    for (const property of inherited) rendered.style[property] = 'inherit';
    part.appendChild(rendered);
  }
  return part;
}

registerRenderer('Section', (props, children) => {
  const section = document.createElement('div');
  section.dataset.view = 'section';
  section.style.marginBottom = '24px';

  if (props.header) {
    section.appendChild(renderPart('header', props.header, ['fontSize', 'color', 'textTransform', 'letterSpacing'], {
      padding: '8px 16px 8px 16px',
      fontSize: '13px',
      fontWeight: '400',
      color: SECONDARY,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }));
  }

  const content = document.createElement('div');
  content.dataset.sectionPart = 'content';
  content.style.backgroundColor = 'white';
  content.style.borderRadius = '10px';
  content.style.overflow = 'hidden';
  children.forEach((child, index) => {
    const row = document.createElement('div');
    row.style.padding = '11px 16px';
    // A separator between rows
    if (index > 0) row.style.borderTop = '1px solid rgba(60, 60, 67, 0.1)';
    row.appendChild(render(child));
    content.appendChild(row);
  });
  section.appendChild(content);

  if (props.footer) {
    section.appendChild(renderPart('footer', props.footer, ['fontSize', 'color'], {
      padding: '8px 16px',
      fontSize: '13px',
      color: SECONDARY,
    }));
  }

  return section;
});

/**
 * Form - a container for data-entry controls, usually Sections.
 */
export function Form(...children) {
  return chainable(createDescriptor('Form', { formStyle: FormStyle.automatic }, children.flat()), ({ withProps }) => ({
    formStyle: (style) => withProps({ formStyle: style }),
  }));
}

registerRenderer('Form', (props, children) => {
  const form = document.createElement('div');
  form.dataset.view = 'form';
  form.setAttribute('role', 'form');
  form.style.backgroundColor = 'rgba(242, 242, 247, 1)';
  form.style.padding = '16px';
  form.style.minHeight = '100%';
  for (const child of children) form.appendChild(render(child));
  return form;
});

export default Form;
