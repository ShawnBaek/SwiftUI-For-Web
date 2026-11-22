/**
 * Docs pages: highlight code samples with the Playground's highlighter, add
 * a Copy button to each, and an "Open in Playground" link to the runnable
 * ones (<pre data-run>), carrying the code in the link's hash.
 */

import { highlightJS, highlightHTML, highlightShell } from '../playground/highlight.js';
import { encodeCode } from '../playground/share.js';

const highlighters = { js: highlightJS, html: highlightHTML, shell: highlightShell };
const playground = new URL('../playground/', import.meta.url);

for (const pre of document.querySelectorAll('pre[data-lang]')) {
  const code = pre.querySelector('code') || pre;
  const source = code.textContent;
  const highlight = highlighters[pre.dataset.lang];
  if (highlight) code.innerHTML = highlight(source);

  const bar = document.createElement('div');
  bar.className = 'sample-bar';
  const label = document.createElement('span');
  label.className = 'sample-label';
  label.textContent = pre.dataset.title || { js: 'JavaScript', html: 'HTML', shell: 'Terminal' }[pre.dataset.lang] || '';
  bar.append(label);

  const actions = document.createElement('span');
  actions.className = 'sample-actions';
  if (pre.hasAttribute('data-run')) {
    const link = document.createElement('a');
    link.className = 'sample-button';
    link.href = playground.href;
    link.textContent = 'Open in Playground';
    encodeCode(source).then((encoded) => { link.href = `${playground.href}#code=${encoded}`; });
    actions.append(link);
  }
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'sample-button';
  copy.textContent = 'Copy';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(source);
      copy.textContent = 'Copied';
    } catch (error) {
      copy.textContent = 'Select and copy';
    }
    setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
  });
  actions.append(copy);
  bar.append(actions);
  pre.before(bar);
  pre.tabIndex = 0;
}
