"""Multi-threaded static server for SwiftUI-For-Web examples and tests.

The framework loads 70+ ES modules per page; Python's default single-threaded
`http.server` serializes those requests and makes the first paint very slow.
ThreadingHTTPServer parallelizes file serving so a fresh page load is fast.

Usage:  python3 serve.py [port]   (default port 8000)
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


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


with ThreadingHTTPServer(("", port), FastHandler) as httpd:
    print(f"Serving on http://localhost:{port}/  (multi-threaded)")
    httpd.serve_forever()
