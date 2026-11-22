/**
 * SwiftUI for Web Playground: wires the editor, the preview, the console,
 * the examples, share links and the theme together. No dependencies.
 */

import { CodeEditor } from './editor.js';
import { Preview } from './preview.js';
import { EXAMPLES, loadExample } from './examples.js';
import { encodeCode, decodeCode, parseHash } from './share.js';

const DEBOUNCE_MS = 300;
const THEME_KEY = 'swiftui-playground-theme';
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const $ = (selector) => document.querySelector(selector);
const exampleSelect = $('#example-select');
const runButton = $('#run-button');
const autoRun = $('#auto-run');
const shareButton = $('#share-button');
const themeSelect = $('#theme-select');
const runStatus = $('#run-status');
const consoleList = $('#console-list');
const consoleCount = $('#console-count');
const status = $('#status');

let runTimer = 0;
let hashTimer = 0;
let errorLines = [];
let messageCount = 0;
let errorCount = 0;
let currentExample = null;
let runStartedAt = 0;

function announce(message) {
  status.textContent = '';
  // A new text node each time, so the same message is announced again.
  requestAnimationFrame(() => { status.textContent = message; });
}

if (!isMac) {
  for (const element of document.querySelectorAll('.pg-mod')) element.textContent = 'Ctrl';
  const kbd = runButton.querySelector('.pg-kbd');
  if (kbd) kbd.textContent = 'Ctrl+↵';
}

// ---------------------------------------------------------------------------
// Console
// ---------------------------------------------------------------------------

function clearConsole() {
  consoleList.textContent = '';
  messageCount = 0;
  errorCount = 0;
  errorLines = [];
  editor.setErrorLines([]);
  updateCount();
}

function updateCount() {
  consoleCount.textContent = messageCount ? `(${messageCount}${errorCount ? `, ${errorCount} error${errorCount === 1 ? '' : 's'}` : ''})` : '';
}

function addEntry(level, text, line) {
  const item = document.createElement('li');
  const kind = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  item.className = `pg-entry is-${kind}`;
  const label = document.createElement('span');
  label.className = 'pg-entry-level';
  label.textContent = kind === 'log' ? (level === 'info' || level === 'debug' ? level : 'log') : kind === 'warn' ? 'warning' : 'error';
  const body = document.createElement('span');
  if (line) {
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'pg-line-link';
    link.textContent = `Line ${line}`;
    link.setAttribute('aria-label', `Go to line ${line}`);
    link.addEventListener('click', () => editor.goToLine(line));
    body.append(link);
  }
  body.append(text);
  item.append(label, body);
  consoleList.append(item);
  item.scrollIntoView({ block: 'nearest' });
  messageCount++;
  if (kind === 'error') {
    errorCount++;
    if (line) {
      errorLines.push(line);
      editor.setErrorLines(errorLines);
    }
  }
  updateCount();
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

const preview = new Preview($('#preview'), (message) => {
  if (message.type === 'console') {
    addEntry(message.level, message.text, message.line);
  } else if (message.type === 'error') {
    addEntry('error', message.text, message.line);
    runStatus.textContent = message.line ? `Error on line ${message.line}` : 'Error';
    runStatus.classList.add('is-error');
    announce(`Error${message.line ? ` on line ${message.line}` : ''}: ${message.text.split('\n')[0]}`);
  } else if (message.type === 'done') {
    if (!errorCount) {
      runStatus.textContent = `Ran in ${Math.round(performance.now() - runStartedAt)} ms`;
      runStatus.classList.remove('is-error');
    }
    document.body.dataset.runState = errorCount ? 'error' : 'done';
  }
});

function run() {
  clearTimeout(runTimer);
  clearConsole();
  runStartedAt = performance.now();
  document.body.dataset.runState = 'running';
  runStatus.textContent = 'Running…';
  runStatus.classList.remove('is-error');
  const { mode } = preview.run(editor.value, { theme: themeSelect.value });
  if (mode === 'server') runStatus.textContent = 'Rendering on a Worker…';
}

function scheduleRun() {
  clearTimeout(runTimer);
  if (autoRun.checked) runTimer = setTimeout(run, DEBOUNCE_MS);
}

// ---------------------------------------------------------------------------
// Share links (#code=gz.<base64url>)
// ---------------------------------------------------------------------------

async function writeHash() {
  const encoded = await encodeCode(editor.value);
  const url = `${location.pathname}${location.search}#code=${encoded}`;
  history.replaceState(null, '', url);
  return new URL(url, location.href).href;
}

function scheduleHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => { writeHash().catch(() => {}); }, DEBOUNCE_MS);
}

async function copyLink() {
  clearTimeout(hashTimer);
  const link = await writeHash();
  try {
    await navigator.clipboard.writeText(link);
    shareButton.textContent = 'Link copied';
    announce('Link to this code copied to the clipboard.');
  } catch (error) {
    // No clipboard access (an insecure context, or permission denied): show
    // the link to copy by hand.
    window.prompt('Copy this link:', link);
  }
  setTimeout(() => { shareButton.textContent = 'Copy link'; }, 2000);
}

// ---------------------------------------------------------------------------
// Examples
// ---------------------------------------------------------------------------

for (const example of EXAMPLES) {
  const option = document.createElement('option');
  option.value = example.id;
  option.textContent = example.title;
  exampleSelect.append(option);
}
const custom = document.createElement('option');
custom.value = '';
custom.textContent = 'Your code';
custom.hidden = true;
exampleSelect.append(custom);

async function showExample(id, { updateHash = true } = {}) {
  const code = await loadExample(id);
  currentExample = id;
  exampleSelect.value = id;
  editor.setValue(code);
  if (updateHash) history.replaceState(null, '', `${location.pathname}${location.search}#example=${id}`);
  run();
}

exampleSelect.addEventListener('change', () => {
  if (exampleSelect.value) {
    showExample(exampleSelect.value).catch((error) => addEntry('error', error.message));
  }
});

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  try {
    if (theme === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch (error) { /* storage unavailable */ }
}

themeSelect.value = document.documentElement.dataset.theme || 'auto';
themeSelect.addEventListener('change', () => {
  applyTheme(themeSelect.value);
  run();
});

// ---------------------------------------------------------------------------
// Editor and startup
// ---------------------------------------------------------------------------

const editor = new CodeEditor($('[data-editor]'), {
  onChange: () => {
    if (currentExample) {
      currentExample = null;
      exampleSelect.value = '';
    }
    scheduleHash();
    scheduleRun();
  },
  onRun: run,
  onStatus: announce,
});

runButton.addEventListener('click', run);
shareButton.addEventListener('click', () => { copyLink().catch((error) => addEntry('error', error.message)); });
$('#console-clear').addEventListener('click', clearConsole);
autoRun.addEventListener('change', () => { if (autoRun.checked) run(); });

// Cmd/Ctrl+Enter runs from anywhere on the page.
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && event.target !== editor.textarea) {
    event.preventDefault();
    run();
  }
});

async function loadFromHash() {
  const { code, example } = parseHash(location.hash);
  if (code) {
    try {
      editor.setValue(await decodeCode(code));
      currentExample = null;
      exampleSelect.value = '';
      run();
      return;
    } catch (error) {
      await showExample(EXAMPLES[0].id, { updateHash: false });
      addEntry('error', `Could not open the shared code: ${error.message}`);
      return;
    }
  }
  const id = EXAMPLES.some((item) => item.id === example) ? example : EXAMPLES[0].id;
  await showExample(id, { updateHash: Boolean(example) });
}

window.addEventListener('hashchange', () => { loadFromHash().catch((error) => addEntry('error', error.message)); });

loadFromHash().catch((error) => addEntry('error', error.message));

// For tests and debugging.
window.playground = { editor, run, writeHash, showExample };
