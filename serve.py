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

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

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


class FastHandler(SimpleHTTPRequestHandler):
    # Short browser cache so reloads are fast but recent edits show up.
    def end_headers(self):
        self.send_header("Cache-Control", "max-age=2")
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
        data = source.read()
        head = data.lower().find(b"<head>")
        at = head + len(b"<head>") if head >= 0 else 0
        outputfile.write(data[:at] + LOAD_GUARD + data[at:])

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


with Server(("", port), FastHandler) as httpd:
    print(f"Serving on http://localhost:{port}/  (multi-threaded)")
    httpd.serve_forever()
