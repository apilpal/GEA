#!/usr/bin/env python3
"""
Test script to demonstrate MIME type handling in Python HTTP server
"""
import http.server
import socketserver
import os
from pathlib import Path

class LoggingHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Log the MIME type being served
        file_path = self.translate_path(self.path)
        if os.path.isfile(file_path):
            file_extension = Path(file_path).suffix.lower()
            mime_type = self.guess_type(file_path)
            print(f"DEBUG: Serving {file_path}")
            print(f"DEBUG: Extension: {file_extension}")
            print(f"DEBUG: MIME type: {mime_type}")
            print(f"DEBUG: Content-Type header: {self.headers.get('Content-Type', 'Not set')}")
            print("---"
        return super().end_headers()

if __name__ == "__main__":
    PORT = 3001  # Use different port to avoid conflict

    with socketserver.TCPServer(("", PORT), LoggingHTTPRequestHandler) as httpd:
        print(f"Test server running on port {PORT}")
        print("Visit http://localhost:{PORT}/src/ts/index.ts to see MIME type handling")
        httpd.serve_forever()