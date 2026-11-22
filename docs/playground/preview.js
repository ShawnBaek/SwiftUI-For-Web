/**
 * Preview: runs code in a fresh sandboxed iframe for every run.
 *
 * The frame is sandbox="allow-scripts" without allow-same-origin, so it has
 * an opaque origin: shared code can't read the Playground's storage or
 * reach its page. It imports the framework from the deployed src/ as
 * cross-origin module scripts (GitHub Pages and serve.py both send
 * Access-Control-Allow-Origin: *). The harness (harness.js) reports back
 * with postMessage, tagged with a per-run token.
 */

const here = new URL('.', import.meta.url);
const src = new URL('../../src/', import.meta.url);

/** Bare specifiers the preview resolves, as the package's exports map does. */
export const IMPORTS = {
  'swiftui-for-web': new URL('index.js', src).href,
  'swiftui-for-web/core': new URL('core.js', src).href,
  'swiftui-for-web/charts': new URL('Charts/index.js', src).href,
  'swiftui-for-web/server': new URL('server.js', src).href,
  'swiftui-for-web/islands': new URL('islands.js', src).href,
  'swiftui-for-web/performance': new URL('performance.js', src).href,
  // Unstable internals, as the package's "./internal/*" export.
  'swiftui-for-web/internal/': src.href,
};

// The framework's colour tokens (src/styles/base.css), for a theme chosen
// in the Playground rather than by the system.
const THEME_TOKENS = {
  light: '--color-primary:#000000;--color-secondary:#8E8E93;--color-background:#FFFFFF;--color-secondary-background:#F2F2F7;--color-tertiary-background:#FFFFFF;--color-separator:rgba(60,60,67,0.29);--color-fill-tertiary:rgba(118,118,128,0.12);--color-segmented-selected:#FFFFFF;color-scheme:light;',
  dark: '--color-primary:#FFFFFF;--color-secondary:#8E8E93;--color-background:#000000;--color-secondary-background:#1C1C1E;--color-tertiary-background:#2C2C2E;--color-separator:rgba(84,84,88,0.65);--color-fill-tertiary:rgba(118,118,128,0.24);--color-segmented-selected:#636366;color-scheme:dark;',
};

/** Code that imports the server entry runs as a static render in a Worker. */
export function isServerCode(code) {
  return /from\s*['"]swiftui-for-web\/server['"]|import\s*\(\s*['"]swiftui-for-web\/server['"]/.test(code);
}

const jsonForScript = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

function srcdoc({ code, token, theme, mode }) {
  const config = {
    code,
    token,
    mode,
    imports: IMPORTS,
    highlightURL: new URL('highlight.js', here).href,
  };
  const themeCSS = THEME_TOKENS[theme] ? `html:root{${THEME_TOKENS[theme]}}` : ':root{color-scheme:light dark;}';
  const themeAttribute = THEME_TOKENS[theme] ? ` data-theme="${theme}"` : '';
  return `<!DOCTYPE html>
<html lang="en"${themeAttribute}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview</title>
<link rel="stylesheet" href="${new URL('index.css', new URL('styles/', src)).href}">
<style>
${themeCSS}
body{margin:0;padding:16px;min-height:100vh;box-sizing:border-box}
.pg-static h2{font:600 13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--color-secondary);margin:0 0 8px;text-transform:uppercase;letter-spacing:.04em}
.pg-static-source{margin:0 0 20px;padding:12px;border-radius:8px;background:var(--color-secondary-background);color:var(--color-primary);font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word;max-height:50vh;overflow:auto}
.pg-static-source:focus-visible{outline:2px solid var(--color-blue);outline-offset:2px}
.pg-static-preview{padding:16px;border:1px dashed var(--color-separator);border-radius:8px;background:#fff;color:#000;color-scheme:light}
.pg-static-note{color:var(--color-secondary)}
.tok-tag{color:#d73a8b}.tok-attr{color:#7a5af8}.tok-string{color:#c4372c}.tok-comment{color:#6b7785}
@media (prefers-color-scheme:dark){.tok-tag{color:#ff7ab2}.tok-attr{color:#b18cff}.tok-string{color:#fc6a5d}}
html[data-theme=dark] .tok-tag{color:#ff7ab2}html[data-theme=dark] .tok-attr{color:#b18cff}html[data-theme=dark] .tok-string{color:#fc6a5d}
html[data-theme=light] .tok-tag{color:#d73a8b}html[data-theme=light] .tok-attr{color:#7a5af8}html[data-theme=light] .tok-string{color:#c4372c}
</style>
<script type="importmap">${jsonForScript({ imports: IMPORTS })}</script>
<script type="application/json" id="pg-config">${jsonForScript(config)}</script>
</head>
<body>
<div id="root"></div>
<script src="${new URL('harness.js', here).href}"></script>
</body>
</html>`;
}

export class Preview {
  /**
   * @param {HTMLElement} container - Element the iframe goes in
   * @param {(message: Object) => void} onMessage - Harness messages for the current run
   */
  constructor(container, onMessage) {
    this.container = container;
    this.onMessage = onMessage;
    this.frame = null;
    this.token = null;
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.source !== 'swiftui-playground' || data.token !== this.token) return;
      if (!this.frame || event.source !== this.frame.contentWindow) return;
      this.onMessage(data);
    });
  }

  /**
   * Run code in a new frame, replacing the previous one.
   * @param {string} code
   * @param {{ theme?: 'auto'|'light'|'dark' }} [options]
   * @returns {{ mode: 'window'|'server' }}
   */
  run(code, { theme = 'auto' } = {}) {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const mode = isServerCode(code) ? 'server' : 'window';
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('title', 'Live preview');
    frame.className = 'preview-frame';
    frame.srcdoc = srcdoc({ code, token, theme, mode });
    this.token = token;
    if (this.frame) this.frame.replaceWith(frame);
    else this.container.appendChild(frame);
    this.frame = frame;
    return { mode };
  }
}
