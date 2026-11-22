"""Multi-threaded static server for SwiftUI-For-Web examples and tests.

The framework loads 70+ ES modules per page; Python's default single-threaded
`http.server` serializes those requests and makes the first paint very slow.
ThreadingHTTPServer parallelizes file serving so a fresh page load is fast.

A cold load opens many connections at once. Python's servers listen with a
backlog of 5, so the operating system resets the connections that overflow
it; one reset module fails the whole module graph and the page renders
nothing until a reload finds the modules cached (#53). This server listens
with a large backlog instead, and every HTML page it serves reports a module
that failed to load, in the console and on the page, instead of staying blank.

Usage:  python3 serve.py [port]   (default port 8000)
"""

import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Reports a <script> that failed to load. A module script's error event also
# fires when any module it imports fails to load, so this catches a reset
# connection anywhere in the graph. Error events don't bubble; listen in the
# capture phase.
LOAD_GUARD = b"""<script>addEventListener('error',function(e){var s=e.target;
if(!s||s.tagName!=='SCRIPT')return;var m='SwiftUI-For-Web: '+(s.src||'an inline module')+
' or a module it imports failed to load, so nothing rendered. The network tab names the failed file; reload to retry.';
console.error(m);var p=document.createElement('pre');p.textContent=m;p.setAttribute('role','alert');
p.style.cssText='margin:16px;padding:12px;border:1px solid #c00;color:#c00;white-space:pre-wrap;font:13px ui-monospace,monospace';
(document.body||document.documentElement).prepend(p)},true)</script>"""


_HEAD_OPEN = re.compile(rb"<head(?:\s[^>]*)?>", re.IGNORECASE)
_HEAD_CLOSE = re.compile(rb"</head\s*>", re.IGNORECASE)
_DOCTYPE = re.compile(rb"<!doctype[^>]*>", re.IGNORECASE)
_BODY_OPEN = re.compile(rb"<body[\s>]", re.IGNORECASE)


def inject_guard(data, guard=LOAD_GUARD):
    """Insert `guard` into the HTML `data` without moving the doctype.

    After the opening <head ...> tag (attributes allowed); otherwise before
    </head>; otherwise after the doctype; otherwise before <body. Writing it
    before <!DOCTYPE html> would put the page in quirks mode.
    """
    match = _HEAD_OPEN.search(data)
    if match:
        at = match.end()
    elif (match := _HEAD_CLOSE.search(data)):
        at = match.start()
    elif (match := _DOCTYPE.search(data)):
        at = match.end()
    elif (match := _BODY_OPEN.search(data)):
        at = match.start()
    else:
        at = 0
    return data[:at] + guard + data[at:]


class FastHandler(SimpleHTTPRequestHandler):
    # Short browser cache so reloads are fast but recent edits show up.
    # Allow any origin to read files, as GitHub Pages does: the Playground's
    # preview runs in a sandboxed iframe with an opaque origin and imports
    # src/ as cross-origin module scripts.
    def end_headers(self):
        self.send_header("Cache-Control", "max-age=2")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    # Skip reverse-DNS lookup — it adds ~200ms PER REQUEST on localhost,
    # making module-heavy pages take 30+ seconds to load.
    def address_string(self):
        return self.client_address[0]

    # Quiet logs.
    def log_message(self, fmt, *args):
        pass

    def copyfile(self, source, outputfile):
        if not getattr(self, "_guard", False):
            return super().copyfile(source, outputfile)
        outputfile.write(inject_guard(source.read()))

    def send_response(self, *args, **kwargs):
        self._guard = False
        super().send_response(*args, **kwargs)

    def send_header(self, keyword, value):
        # HTML pages grow by the guard: correct their Content-Length.
        if keyword == "Content-type":
            self._guard = value.startswith("text/html")
        if keyword == "Content-Length" and getattr(self, "_guard", False):
            value = str(int(value) + len(LOAD_GUARD))
        super().send_header(keyword, value)


class Server(ThreadingHTTPServer):
    daemon_threads = True
    # Python's default is 5: cold loads overflow it and get reset (#53).
    request_queue_size = 1024


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    with Server(("", port), FastHandler) as httpd:
        print(f"Serving on http://localhost:{port}/  (multi-threaded)")
        httpd.serve_forever()
