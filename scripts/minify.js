/**
 * Token-aware JavaScript minifier for the release build (#41). Node
 * built-ins only; no identifier mangling.
 *
 * It removes comments and collapses whitespace while copying every string,
 * template literal (with nested `${…}` expressions) and regular-expression
 * literal verbatim. A run of whitespace that contains a line break becomes a
 * single "\n", so automatic semicolon insertion still sees the same lines;
 * other runs become one space only where two tokens would otherwise merge
 * (identifiers, numbers, `+ +`, `- -`).
 */

const IDENTIFIER_CHAR = /[$_\p{ID_Continue}\u200c\u200d]/u;

// After these tokens a `/` starts a regular expression, not a division.
const REGEX_AFTER_PUNCTUATOR = new Set([
  '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%',
  '<', '>', '~', '^', '=>',
]);
const REGEX_AFTER_KEYWORD = new Set([
  'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void',
  'throw', 'instanceof', 'yield', 'await',
]);

function isIdentifierChar(character) {
  return character !== undefined && IDENTIFIER_CHAR.test(character);
}

function needsSpace(previous, next) {
  if (!previous || !next) return false;
  if (isIdentifierChar(previous) && isIdentifierChar(next)) return true;
  // `a + +b`, `a - -b`, and `a / /re/` must not merge into `++`, `--`, `//`.
  if ((previous === '+' || previous === '-' || previous === '/') && next === previous) return true;
  // A number followed by `.` (e.g. `1 .toString()`) keeps its space.
  if (/[0-9]/.test(previous) && next === '.') return true;
  return false;
}

/**
 * @param {string} source
 * @returns {string}
 */
export function minifyJavaScript(source) {
  let out = '';
  let index = 0;
  const length = source.length;
  // What the last significant token was, to tell regex from division.
  let lastToken = '';
  // Brace depth for each open template expression `${ … }`.
  const templateStack = [];
  let braceDepth = 0;
  let pendingSpace = false;
  let pendingNewline = false;

  const emit = (text, tokenForRegex) => {
    if (pendingNewline) {
      if (out.length && out[out.length - 1] !== '\n') out += '\n';
    } else if (pendingSpace && needsSpace(out[out.length - 1], text[0])) {
      out += ' ';
    }
    pendingSpace = false;
    pendingNewline = false;
    out += text;
    lastToken = tokenForRegex;
  };

  // Copy a template literal from `start` (just after a backtick or the `}`
  // closing an expression) up to the closing backtick or the next `${`.
  const readTemplate = (start) => {
    let i = start;
    while (i < length) {
      const character = source[i];
      if (character === '\\') { i += 2; continue; }
      if (character === '`') return { end: i + 1, opensExpression: false };
      if (character === '$' && source[i + 1] === '{') return { end: i + 2, opensExpression: true };
      i++;
    }
    return { end: length, opensExpression: false };
  };

  const regexAllowed = () => {
    if (lastToken === '') return true;
    if (REGEX_AFTER_PUNCTUATOR.has(lastToken)) return true;
    return REGEX_AFTER_KEYWORD.has(lastToken);
  };

  while (index < length) {
    const character = source[index];
    const next = source[index + 1];

    // Whitespace.
    if (/\s/.test(character)) {
      if (character === '\n' || character === '\r' || character === '\u2028' || character === '\u2029') pendingNewline = true;
      else pendingSpace = true;
      index++;
      continue;
    }

    // Comments. A block comment spanning lines counts as a line break.
    if (character === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end === -1 ? length : end + 2;
      if (/[\n\r\u2028\u2029]/.test(source.slice(index, stop))) pendingNewline = true;
      else pendingSpace = true;
      index = stop;
      continue;
    }
    if (character === '/' && next === '/') {
      const end = source.indexOf('\n', index + 2);
      index = end === -1 ? length : end;
      continue;
    }

    // Strings.
    if (character === '"' || character === '\'') {
      let i = index + 1;
      while (i < length && source[i] !== character) {
        if (source[i] === '\\') i++;
        i++;
      }
      emit(source.slice(index, i + 1), 'string');
      index = i + 1;
      continue;
    }

    // Template literals.
    if (character === '`') {
      const { end, opensExpression } = readTemplate(index + 1);
      emit(source.slice(index, end), opensExpression ? '{' : 'template');
      if (opensExpression) templateStack.push(braceDepth);
      index = end;
      continue;
    }

    // Braces, tracking template expressions.
    if (character === '{') {
      braceDepth++;
      emit('{', '{');
      index++;
      continue;
    }
    if (character === '}') {
      if (templateStack.length && templateStack[templateStack.length - 1] === braceDepth) {
        // The `}` closing a `${ … }`: continue the template literal.
        templateStack.pop();
        const { end, opensExpression } = readTemplate(index + 1);
        emit(source.slice(index, end), opensExpression ? '{' : 'template');
        if (opensExpression) templateStack.push(braceDepth);
        index = end;
        continue;
      }
      braceDepth--;
      emit('}', '}');
      index++;
      continue;
    }

    // Regular-expression literals.
    if (character === '/' && regexAllowed()) {
      let i = index + 1;
      let inClass = false;
      while (i < length) {
        const c = source[i];
        if (c === '\\') { i += 2; continue; }
        if (c === '\n') break;
        if (inClass) {
          if (c === ']') inClass = false;
        } else if (c === '[') {
          inClass = true;
        } else if (c === '/') {
          break;
        }
        i++;
      }
      i++;
      while (i < length && isIdentifierChar(source[i])) i++;
      emit(source.slice(index, i), 'regex');
      index = i;
      continue;
    }

    // Identifiers, keywords and numbers.
    if (isIdentifierChar(character)) {
      let i = index + 1;
      while (i < length && isIdentifierChar(source[i])) i++;
      // Numbers like 1.5e-3 or 0x1F: let the exponent sign through.
      if (/[0-9]/.test(character)) {
        while (i < length && (isIdentifierChar(source[i]) || source[i] === '.'
          || ((source[i] === '+' || source[i] === '-') && /[eE]/.test(source[i - 1]) && !/^0[xX]/.test(source.slice(index, i))))) i++;
      }
      const word = source.slice(index, i);
      emit(word, /[0-9]/.test(character) ? 'number' : word);
      index = i;
      continue;
    }

    // `++` and `--` (postfix or prefix): a following `/` divides.
    if ((character === '+' || character === '-') && next === character) {
      emit(character + character, 'expression');
      index += 2;
      continue;
    }

    // Punctuators. `=>` matters for regex detection; others are single chars.
    if (character === '=' && next === '>') {
      emit('=>', '=>');
      index += 2;
      continue;
    }
    // `)` and `]` end an expression, so a following `/` divides.
    emit(character, character === ')' || character === ']' ? 'expression' : character);
    index++;
  }

  return out.trim() + '\n';
}
