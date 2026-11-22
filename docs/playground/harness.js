/*
 * Playground preview harness. A classic script that runs inside the preview
 * iframe (sandbox="allow-scripts", so the frame has an opaque origin and
 * cannot reach the Playground page). It reads its configuration from
 * #pg-config, runs the user's code and reports to the parent with
 * postMessage: console output, errors with the user's line numbers, and the
 * end of the run.
 *
 * Browser code runs as an ES module from a Blob URL, inserted with a
 * <script type="module"> so that syntax errors arrive at window.onerror with
 * a line number. Bare imports ('swiftui-for-web', '/server', …) resolve
 * through the frame's import map to the deployed src/.
 *
 * Code that imports 'swiftui-for-web/server' runs in a Worker instead
 * (imported there with import()), which has no window or document, the way Node runs it: the
 * server entry installs its DOM shim as globals for each render, and a
 * window's own `window` and `document` can't be replaced.
 */
(function () {
  'use strict';

  var config = JSON.parse(document.getElementById('pg-config').textContent);
  var code = config.code;
  var token = config.token;
  var USER_FILE = 'playground.js';
  var SENTINEL = '__swiftui_playground_syntax_ok__';
  var userURLs = [];
  var finished = false;

  function post(message) {
    message.source = 'swiftui-playground';
    message.token = token;
    parent.postMessage(message, '*');
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Blob URLs in messages and stacks become "playground.js".
  function clean(text, extraURL) {
    var result = String(text);
    var urls = extraURL ? userURLs.concat([extraURL]) : userURLs;
    for (var i = 0; i < urls.length; i++) result = result.split(urls[i]).join(USER_FILE);
    return result;
  }

  // The first "playground.js:<line>" in a cleaned text: a "created at" site
  // or a stack frame in the user's code.
  function lineIn(text) {
    var match = new RegExp(escapeRegExp(USER_FILE) + ':(\\d+)').exec(text || '');
    return match ? Number(match[1]) : null;
  }

  function format(value) {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return describe(value);
    if (value === undefined) return 'undefined';
    if (typeof value === 'function') return 'function ' + (value.name || '(anonymous)');
    if (value && value.nodeType === 1) return '<' + value.tagName.toLowerCase() + '>';
    try {
      var json = JSON.stringify(value);
      return json === undefined ? String(value) : json;
    } catch (error) {
      return String(value);
    }
  }

  function describe(error) {
    if (!error || typeof error !== 'object') return String(error);
    var text = (error.name || 'Error') + ': ' + error.message;
    if (/Failed to resolve module specifier/.test(error.message)) {
      text += "\nImport from 'swiftui-for-web', 'swiftui-for-web/server', 'swiftui-for-web/charts' or 'swiftui-for-web/islands'.";
    }
    return text;
  }

  function reportError(text, line, stack) {
    var cleaned = clean(text);
    var cleanedStack = clean(stack || '');
    var at = lineIn(cleaned) || line || lineIn(cleanedStack);
    post({ type: 'error', text: cleaned, line: at || null });
  }

  // Console output goes to the page's console and to the Playground.
  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (level) {
    var original = console[level] ? console[level].bind(console) : function () {};
    console[level] = function () {
      original.apply(null, arguments);
      var text = clean(Array.prototype.map.call(arguments, format).join(' '));
      post({ type: 'console', level: level, text: text, line: level === 'log' || level === 'info' ? null : lineIn(text) });
    };
  });

  window.addEventListener('error', function (event) {
    if (event.target && event.target !== window) return; // a resource; handled by the script's own listener
    var error = event.error;
    if (error === SENTINEL || String(event.message).indexOf(SENTINEL) >= 0) {
      event.preventDefault();
      return;
    }
    var fromUser = userURLs.indexOf(event.filename) >= 0;
    reportError(error ? describe(error) : event.message, fromUser ? event.lineno : null, error && error.stack);
  });

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    reportError('Unhandled promise rejection: ' + (reason instanceof Error ? describe(reason) : format(reason)), null, reason && reason.stack);
  });

  function finish() {
    if (finished) return;
    finished = true;
    post({ type: 'done' });
  }

  function blobURL(source) {
    var url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    userURLs.push(url);
    return url;
  }

  // Insert a module script; resolve with true if it loaded (it ran, or
  // reported its error to window.onerror), false if a file failed to load.
  function loadModule(url) {
    return new Promise(function (resolve) {
      var script = document.createElement('script');
      script.type = 'module';
      script.src = url;
      script.addEventListener('load', function () { resolve(true); });
      script.addEventListener('error', function () {
        reportError('A module failed to load, so the code did not run. Check the import paths; the browser console names the file.', null);
        resolve(false);
      });
      document.head.appendChild(script);
    });
  }

  function root() {
    return document.getElementById('root');
  }

  // ---------------------------------------------------------------------
  // Browser code
  // ---------------------------------------------------------------------

  function runInWindow() {
    var url = blobURL(code);
    loadModule(url).then(function (loaded) {
      if (!loaded) return null;
      return import(url).then(function (namespace) {
        // `export default` a view (or a function returning one) and the
        // harness mounts it, unless the code mounted something itself.
        if (!namespace || !('default' in namespace) || root().hasChildNodes()) return null;
        var view = namespace.default;
        if (typeof view === 'string') {
          root().textContent = view;
          return null;
        }
        return import('swiftui-for-web').then(function (SwiftUI) {
          try {
            SwiftUI.App(view).mount('#root');
          } catch (error) {
            reportError(describe(error), null, error && error.stack);
          }
        });
      }, function () { /* already reported by window.onerror */ });
    }).then(finish, function (error) {
      reportError(describe(error), null, error && error.stack);
      finish();
    });
  }

  // ---------------------------------------------------------------------
  // Server code (renderToString / renderDocument) in a Worker
  // ---------------------------------------------------------------------

  // Find syntax errors with line numbers without running the code: the
  // module throws before its first statement, and a parse error is
  // reported at window.onerror with the line instead.
  function syntaxCheck() {
    var before = 0;
    var errors = 0;
    var listener = function (event) {
      if (event.target && event.target !== window) return;
      if (String(event.message).indexOf(SENTINEL) < 0 && event.error !== SENTINEL) errors++;
    };
    window.addEventListener('error', listener);
    before = errors;
    return loadModule(blobURL('throw ' + JSON.stringify(SENTINEL) + ';' + code)).then(function (loaded) {
      window.removeEventListener('error', listener);
      return loaded && errors === before;
    });
  }

  function absoluteSpecifiers(source) {
    return source.replace(/(['"])(swiftui-for-web(?:\/[\w./-]+)?)\1/g, function (match, quote, specifier) {
      var url = config.imports[specifier];
      var prefix = 'swiftui-for-web/internal/';
      if (!url && specifier.indexOf(prefix) === 0) url = config.imports[prefix] + specifier.slice(prefix.length);
      return url ? quote + url + quote : match;
    });
  }

  function workerMain() {
    /* global self */
    var url = null;
    function format(value) {
      if (typeof value === 'string') return value;
      if (value instanceof Error) return value.name + ': ' + value.message;
      try { return JSON.stringify(value); } catch (error) { return String(value); }
    }
    ['log', 'info', 'warn', 'error', 'debug'].forEach(function (level) {
      console[level] = function () {
        self.postMessage({ type: 'console', level: level, text: Array.prototype.map.call(arguments, format).join(' '), url: url });
      };
    });
    self.onmessage = function (event) {
      url = URL.createObjectURL(new Blob([event.data.code], { type: 'text/javascript' }));
      import(url).then(function (namespace) {
        var value = namespace && 'default' in namespace ? namespace.default : null;
        self.postMessage({ type: 'result', value: typeof value === 'string' ? value : null, kind: typeof value, url: url });
      }, function (error) {
        self.postMessage({
          type: 'error',
          text: error && error.name ? error.name + ': ' + error.message : String(error),
          stack: (error && error.stack) || '',
          url: url
        });
        self.postMessage({ type: 'result', value: null, kind: 'error', url: url });
      });
    };
  }

  function runInWorker() {
    syntaxCheck().then(function (ok) {
      if (!ok) return finish();
      var source = '(' + workerMain.toString() + ')();';
      var worker;
      try {
        // A classic worker that imports the code with import(): an opaque
        // origin can't start a module worker from a Blob URL.
        worker = new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
      } catch (error) {
        reportError('Could not start a Worker for the static render: ' + describe(error), null);
        return finish();
      }
      worker.onmessage = function (event) {
        var message = event.data;
        if (message.type === 'console') {
          var text = clean(message.text, message.url);
          post({ type: 'console', level: message.level, text: text, line: message.level === 'log' || message.level === 'info' ? null : lineIn(text) });
        } else if (message.type === 'error') {
          var cleaned = clean(message.text, message.url);
          var stack = clean(message.stack, message.url);
          post({ type: 'error', text: cleaned, line: lineIn(cleaned) || lineIn(stack) });
        } else if (message.type === 'result') {
          showStatic(message.value, message.kind);
          worker.terminate();
          finish();
        }
      };
      worker.onerror = function (event) {
        reportError('The static render failed to start: ' + (event.message || 'a module failed to load'), null);
        finish();
      };
      worker.postMessage({ code: absoluteSpecifiers(code) });
    });
  }

  var VOID = /^<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b/i;

  // Put each element on its own line, indented by depth (display only).
  function prettyHTML(html) {
    var tokens = html.match(/<[^>]+>|[^<]+/g) || [];
    var depth = 0;
    var lines = [];
    for (var i = 0; i < tokens.length; i++) {
      var tokenText = tokens[i];
      if (/^<\//.test(tokenText)) {
        depth = Math.max(0, depth - 1);
        var last = lines[lines.length - 1];
        // Keep <span>text</span> on one line.
        if (last && last.open && last.depth === depth && !last.closed) {
          last.text += tokenText;
          last.closed = true;
          continue;
        }
        lines.push({ depth: depth, text: tokenText });
      } else if (/^</.test(tokenText)) {
        var selfContained = VOID.test(tokenText) || /\/>$/.test(tokenText) || /^<!/.test(tokenText);
        lines.push({ depth: depth, text: tokenText, open: !selfContained });
        if (!selfContained) depth++;
      } else if (tokenText.trim()) {
        var previous = lines[lines.length - 1];
        if (previous && previous.open && !previous.closed && previous.depth === depth - 1 && !previous.hasText) {
          previous.text += tokenText;
          previous.hasText = true;
        } else {
          lines.push({ depth: depth, text: tokenText.trim() });
        }
      }
    }
    return lines.map(function (line) { return new Array(line.depth + 1).join('  ') + line.text; }).join('\n');
  }

  function showStatic(html, kind) {
    var container = root();
    container.textContent = '';
    container.className = 'pg-static';
    if (typeof html !== 'string') {
      var note = document.createElement('p');
      note.className = 'pg-static-note';
      note.textContent = kind === 'error'
        ? 'The render failed; see the console below the preview.'
        : 'Export the HTML string as the default export (export default renderToString(view)) to see it here.';
      container.appendChild(note);
      return;
    }
    var isDocument = /^\s*<!DOCTYPE/i.test(html);
    var isMarkup = !isDocument && /^\s*<(?![?!])/.test(html);
    var heading = document.createElement('h2');
    heading.textContent = (isDocument ? 'renderDocument output' : isMarkup ? 'renderToString output' : 'Default export')
      + ' (' + html.length + ' characters)';
    var pre = document.createElement('pre');
    pre.className = 'pg-static-source';
    pre.tabIndex = 0;
    pre.setAttribute('aria-label', 'Rendered output');
    var source = isMarkup ? prettyHTML(html) : html;
    pre.textContent = source;
    container.appendChild(heading);
    container.appendChild(pre);
    if (isDocument || isMarkup) {
      var previewHeading = document.createElement('h2');
      previewHeading.textContent = 'The same markup, shown with the framework stylesheet';
      var preview = document.createElement('div');
      preview.className = 'pg-static-preview';
      if (isDocument) {
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        for (var i = 0; i < parsed.body.childNodes.length; i++) {
          var node = parsed.body.childNodes[i];
          if (node.nodeName !== 'SCRIPT') preview.appendChild(document.importNode(node, true));
        }
      } else {
        preview.innerHTML = html;
      }
      container.appendChild(previewHeading);
      container.appendChild(preview);
    }
    import(config.highlightURL).then(function (module) {
      pre.innerHTML = module.highlightHTML(source);
    }, function () { /* plain text is fine */ });
  }

  // Run once the page has parsed (the module script needs <head>).
  if (config.mode === 'server') runInWorker();
  else runInWindow();
})();
