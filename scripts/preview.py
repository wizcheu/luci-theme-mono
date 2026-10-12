#!/usr/bin/env python3
"""Serve the theme's local preview. Fictional data, no router connection."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    "/": "overview", "/cgi-bin/luci/admin": "overview",
    "/cgi-bin/luci/admin/status/overview": "overview",
    "/cgi-bin/luci/admin/network/network": "network",
    "/cgi-bin/luci/admin/system/system": "system",
    "/cgi-bin/luci/admin/status/components": "components",
    "/cgi-bin/luci/admin/logout": "login", "/login": "login", "/login-error": "login-error",
}


class Preview(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path.rstrip("/") or "/"
        if path in PAGES:
            self.path = "/preview/generated/" + PAGES[path] + ".html"
        elif path.startswith("/cgi-bin/luci/admin/translations/"):
            self.path = "/preview/runtime.js"
        elif path == "/luci-static/resources/cbi.js":
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript")
            self.end_headers()
            return
        elif path.startswith("/luci-static/"):
            self.path = "/htdocs" + self.path
        super().do_GET()

    def do_POST(self):
        # A preview cannot authenticate or write settings. Do not log credentials.
        length = min(int(self.headers.get("Content-Length", 0)), 8192)
        self.rfile.read(length)
        self.send_response(303)
        self.send_header("Location", "/login-error")
        self.end_headers()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):
        pass


class PreviewServer(ThreadingHTTPServer):
    request_queue_size = 128


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8098)
    args = parser.parse_args()
    server = PreviewServer(("127.0.0.1", args.port), lambda *a, **k: Preview(*a, directory=str(ROOT), **k))
    print(f"Mono preview: http://127.0.0.1:{args.port} (fictional data)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
