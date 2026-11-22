/**
 * A small JavaScript highlighter for the Playground editor and the docs'
 * code samples. It tokenizes one pass, left to right, and returns escaped
 * HTML with <span class="tok-…"> around each token. It is not a parser: a
 * regular expression literal is read as punctuation, which only affects the
 * colours. Line breaks are kept exactly, so the result lines up with the
 * source character for character.
 */

const KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
  'for', 'from', 'function', 'get', 'if', 'import', 'in', 'instanceof', 'let',
  'new', 'of', 'return', 'set', 'static', 'super', 'switch', 'this', 'throw',
  'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
]);
const LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escapeHTML = (text) => text.replace(/[&<>"]/g, (c) => ESCAPES[c]);

const span = (kind, text) => `<span class="tok-${kind}">${escapeHTML(text)}</span>`;

/**
 * Highlight JavaScript source.
 * @param {string} source
 * @returns {string} HTML
 */
export function highlightJS(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  let previousSignificant = '';

  while (i < n) {
    const c = source[i];
    const next = source[i + 1];

    // Comments
    if (c === '/' && next === '/') {
      let end = source.indexOf('\n', i);
      if (end < 0) end = n;
      out += span('comment', source.slice(i, end));
      i = end;
      continue;
    }
    if (c === '/' && next === '*') {
      let end = source.indexOf('*/', i + 2);
      end = end < 0 ? n : end + 2;
      out += span('comment', source.slice(i, end));
      i = end;
      continue;
    }

    // Strings and template literals (a template is one token)
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && source[j] !== c) {
        if (source[j] === '\\') j++;
        else if (c !== '`' && source[j] === '\n') break;
        j++;
      }
      j = Math.min(j + 1, n);
      out += span('string', source.slice(i, j));
      i = j;
      previousSignificant = 'string';
      continue;
    }

    // Numbers
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(next ?? ''))) {
      const match = /^(0[xob][0-9a-f_]+|[0-9_]*\.?[0-9_]+(e[+-]?[0-9]+)?n?)/i.exec(source.slice(i));
      const text = match ? match[0] : c;
      out += span('number', text);
      i += text.length;
      previousSignificant = 'number';
      continue;
    }

    // Identifiers and keywords
    if (/[A-Za-z_$]/.test(c)) {
      const match = /^[A-Za-z0-9_$]+/.exec(source.slice(i));
      const word = match[0];
      const after = source.slice(i + word.length).match(/^\s*(.)/)?.[1];
      let kind;
      if (previousSignificant === '.') kind = after === '(' ? 'method' : 'property';
      else if (KEYWORDS.has(word)) kind = 'keyword';
      else if (LITERALS.has(word)) kind = 'literal';
      else if (/^[A-Z]/.test(word)) kind = 'type';
      else if (after === '(') kind = 'function';
      else kind = null;
      out += kind ? span(kind, word) : escapeHTML(word);
      i += word.length;
      previousSignificant = 'word';
      continue;
    }

    if (!/\s/.test(c)) previousSignificant = c;
    out += escapeHTML(c);
    i++;
  }
  return out;
}

/**
 * Highlight HTML markup (used for the static-render output and the docs'
 * HTML samples): tags, attribute names and attribute values.
 * @param {string} source
 * @returns {string} HTML
 */
export function highlightHTML(source) {
  let out = '';
  const pattern = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|<!DOCTYPE[^>]*>/gi;
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    out += escapeHTML(source.slice(last, match.index));
    const tag = match[0];
    if (tag.startsWith('<!--')) {
      out += span('comment', tag);
    } else {
      out += tag.replace(/^(<\/?!?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?>)$/, (_, open, name, attrs, close) =>
        escapeHTML(open) + span('tag', name)
        + attrs.replace(/([\w:-]+)(=)?("[^"]*"|'[^']*')?|[^\w]+/g, (part, attr, eq, value) => {
          if (!attr) return escapeHTML(part);
          return span('attr', attr) + (eq ? escapeHTML(eq) : '') + (value ? span('string', value) : '');
        })
        + escapeHTML(close));
    }
    last = match.index + tag.length;
  }
  out += escapeHTML(source.slice(last));
  return out;
}

/**
 * Highlight shell commands: comments and the first word of each line.
 * @param {string} source
 * @returns {string} HTML
 */
export function highlightShell(source) {
  return source.split('\n').map((line) => {
    const comment = line.indexOf('#');
    const code = comment >= 0 ? line.slice(0, comment) : line;
    const rest = comment >= 0 ? span('comment', line.slice(comment)) : '';
    const highlighted = escapeHTML(code)
      .replace(/^(\s*)([\w./-]+)/, (_, space, word) => space + `<span class="tok-function">${word}</span>`)
      .replace(/(\s)(--?[\w-]+)/g, (_, space, flag) => space + `<span class="tok-keyword">${flag}</span>`);
    return highlighted + rest;
  }).join('\n');
}
