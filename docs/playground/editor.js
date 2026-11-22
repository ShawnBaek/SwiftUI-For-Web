/**
 * CodeEditor: a <textarea> with a highlighted <pre> laid exactly under it
 * and a line-number gutter. The textarea owns the text, the caret, the
 * selection, undo and the keyboard; its text is transparent, so what shows
 * is the highlighted copy. Both use the same font metrics and no wrapping,
 * and the copy follows the textarea's scroll position.
 *
 * Keys: Tab inserts two spaces (Shift+Tab removes them from the selected
 * lines), Enter keeps the current indentation. Escape releases Tab for one
 * press, so the next Tab moves focus out of the editor instead of indenting
 * (the editor never traps keyboard focus).
 */

import { highlightJS } from './highlight.js';

const INDENT = '  ';

export class CodeEditor {
  /**
   * @param {HTMLElement} root - Container with [data-editor-gutter],
   *   [data-editor-highlight] (a <pre>) and a <textarea>
   * @param {Object} [options]
   * @param {(code: string) => void} [options.onChange]
   * @param {() => void} [options.onRun] - Cmd/Ctrl+Enter
   * @param {(message: string) => void} [options.onStatus] - Announcements
   */
  constructor(root, { onChange = () => {}, onRun = () => {}, onStatus = () => {} } = {}) {
    this.root = root;
    this.textarea = root.querySelector('textarea');
    this.highlight = root.querySelector('[data-editor-highlight]');
    this.gutter = root.querySelector('[data-editor-gutter]');
    this.onChange = onChange;
    this.onRun = onRun;
    this.onStatus = onStatus;
    this.lineCount = 0;
    this.errorLines = new Set();
    this.tabReleased = false;

    this.textarea.addEventListener('input', () => {
      this.render();
      this.onChange(this.value);
    });
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    this.textarea.addEventListener('keydown', (event) => this.handleKey(event));
    this.textarea.addEventListener('blur', () => { this.tabReleased = false; });
    this.render();
  }

  get value() {
    return this.textarea.value;
  }

  /** Replace the whole text (resets undo history). */
  setValue(code) {
    this.textarea.value = code;
    this.textarea.setSelectionRange(0, 0);
    this.textarea.scrollTop = 0;
    this.textarea.scrollLeft = 0;
    this.render();
  }

  focus() {
    this.textarea.focus();
  }

  /** Mark lines (1-based) that have errors in the gutter. */
  setErrorLines(lines) {
    this.errorLines = new Set(lines.filter((line) => Number.isInteger(line) && line > 0));
    this.renderGutter(true);
  }

  /** Put the caret at the start of a line and scroll it into view. */
  goToLine(line) {
    const lines = this.value.split('\n');
    const index = Math.max(0, Math.min(line, lines.length) - 1);
    let offset = 0;
    for (let i = 0; i < index; i++) offset += lines[i].length + 1;
    this.textarea.focus();
    this.textarea.setSelectionRange(offset, offset + lines[index].length);
    const lineHeight = parseFloat(getComputedStyle(this.textarea).lineHeight) || 20;
    const top = index * lineHeight;
    if (top < this.textarea.scrollTop || top > this.textarea.scrollTop + this.textarea.clientHeight - lineHeight * 2) {
      this.textarea.scrollTop = Math.max(0, top - this.textarea.clientHeight / 3);
    }
  }

  render() {
    // A trailing newline keeps the last (empty) line's height in the copy.
    this.highlight.innerHTML = highlightJS(this.value) + '\n';
    this.renderGutter(false);
    this.syncScroll();
  }

  renderGutter(force) {
    const count = this.value.split('\n').length;
    if (!force && count === this.lineCount) return;
    this.lineCount = count;
    let html = '';
    for (let line = 1; line <= count; line++) {
      html += this.errorLines.has(line)
        ? `<span class="has-error" title="Error on line ${line}">${line}</span>\n`
        : `<span>${line}</span>\n`;
    }
    this.gutter.innerHTML = html;
  }

  syncScroll() {
    const { scrollTop, scrollLeft } = this.textarea;
    this.highlight.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    this.gutter.style.transform = `translateY(${-scrollTop}px)`;
  }

  /** Insert text at the selection, keeping the browser's undo history. */
  insert(text) {
    this.textarea.focus();
    const ok = typeof document.execCommand === 'function' && document.execCommand('insertText', false, text);
    if (!ok) {
      this.textarea.setRangeText(text, this.textarea.selectionStart, this.textarea.selectionEnd, 'end');
      this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  handleKey(event) {
    const { textarea } = this;
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      this.onRun();
      return;
    }
    if (event.key === 'Escape') {
      this.tabReleased = true;
      this.onStatus('Tab now moves focus out of the editor.');
      return;
    }
    if (event.key === 'Tab') {
      if (this.tabReleased || event.altKey || event.metaKey || event.ctrlKey) {
        this.tabReleased = false;
        return; // let the browser move focus
      }
      event.preventDefault();
      const { selectionStart: start, selectionEnd: end, value } = textarea;
      const multiLine = value.slice(start, end).includes('\n');
      if (!event.shiftKey && !multiLine) {
        this.insert(INDENT);
        return;
      }
      // Indent or outdent every selected line.
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const block = value.slice(lineStart, end);
      const changed = event.shiftKey
        ? block.replace(/^ {1,2}/gm, '')
        : block.replace(/^/gm, INDENT);
      if (changed === block) return;
      textarea.setSelectionRange(lineStart, end);
      this.insert(changed);
      textarea.setSelectionRange(lineStart, lineStart + changed.length);
      return;
    }
    this.tabReleased = false;
    if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
      const { selectionStart: start, value } = textarea;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const indent = /^[ \t]*/.exec(value.slice(lineStart, start))[0];
      const before = value[start - 1];
      const extra = before === '{' || before === '(' || before === '[' ? INDENT : '';
      if (!indent && !extra) return;
      event.preventDefault();
      this.insert('\n' + indent + extra);
    }
  }
}
