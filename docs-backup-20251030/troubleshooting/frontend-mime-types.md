# Frontend MIME Type Troubleshooting Guide

## Overview

MIME type issues are common when serving frontend assets, especially with modern build tools, TypeScript files, and custom file extensions. This guide covers common MIME type problems and their solutions.

## Common MIME Type Issues

### TypeScript Files Not Loading (.ts, .tsx)

**Symptoms:**
- Browser console shows: `Failed to load module script: The server responded with a non-JavaScript MIME type`
- TypeScript files served with incorrect MIME type (text/plain instead of application/javascript)
- ES6 modules fail to load in browser

**Root Cause:**
- Python's `http.server` doesn't recognize `.ts` and `.tsx` files as JavaScript modules
- Default MIME type mapping doesn't include TypeScript extensions
- Build process generates `.js` files but references `.ts` extensions

**Solutions:**

#### Option 1: Custom MIME Type Handler (Recommended)
```python
#!/usr/bin/env python3
"""
Custom HTTP server with proper MIME type handling for frontend development
"""
import http.server
import socketserver
import os
from pathlib import Path

class FrontendHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Enhanced HTTP request handler with proper MIME type support for frontend development
    """

    # Custom MIME type mappings for frontend development
    CUSTOM_MIME_TYPES = {
        '.ts': 'application/javascript',
        '.tsx': 'application/javascript',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.scss': 'text/css',
        '.sass': 'text/css',
        '.html': 'text/html',
        '.json': 'application/json',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.map': 'application/json'
    }

    def guess_type(self, path):
        """
        Override guess_type to handle custom MIME types
        """
        mime_type, encoding = super().guess_type(path)

        if mime_type is None:
            # Get file extension and check custom mappings
            file_extension = Path(path).suffix.lower()

            if file_extension in self.CUSTOM_MIME_TYPES:
                mime_type = self.CUSTOM_MIME_TYPES[file_extension]
                print(f"🔧 Applied custom MIME type: {file_extension} -> {mime_type}")

        return mime_type, encoding

    def end_headers(self):
        """
        Log MIME type information for debugging
        """
        file_path = self.translate_path(self.path)
        if os.path.isfile(file_path):
            file_extension = Path(file_path).suffix.lower()
            mime_type, _ = self.guess_type(file_path)

            print(f"📁 Serving: {os.path.basename(file_path)}")
            print(f"📎 Extension: {file_extension}")
            print(f"🏷️ MIME type: {mime_type}")
            print("---")

        return super().end_headers()

    def log_message(self, format, *args):
        """
        Enhanced logging with MIME type information
        """
        file_path = self.translate_path(self.path)
        if os.path.isfile(file_path):
            mime_type, _ = self.guess_type(file_path)
            return super().log_message(
                f"{format} [MIME: {mime_type}]",
                *args
            )
        return super().log_message(format, *args)

def run_server(port=5173):
    """
    Start the custom frontend development server
    """
    with socketserver.TCPServer(("", port), FrontendHTTPRequestHandler) as httpd:
        print(f"🚀 Frontend development server running on port {port}")
        print(f"📂 Serving from: {os.getcwd()}")
        print(f"🔧 Enhanced MIME type support enabled")
        print("---")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
            httpd.shutdown()

if __name__ == "__main__":
    import sys

    port = 5173
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number. Using default port 5173.")

    run_server(port)
```

#### Option 2: Vite Development Server (Production Alternative)
```bash
# Use Vite's built-in development server instead of Python's http.server
cd frontend
npm run dev
```

#### Option 3: Quick Fix for Existing Python Server
```python
# Add to existing Python HTTP server
import mimetypes

# Register TypeScript MIME types
mimetypes.add_type('application/javascript', '.ts')
mimetypes.add_type('application/javascript', '.tsx')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')
```

**Verification:**
- TypeScript files load without MIME type errors
- ES6 modules work correctly in browser
- No console errors related to module loading
- Network tab shows correct Content-Type headers

### CSS/SCSS Files Not Loading Properly

**Symptoms:**
- Styles not applied to the page
- CSS files return 404 or incorrect MIME type
- SCSS files not compiled to CSS

**Solutions:**

#### Fix 1: Proper MIME Type Registration
```python
# Ensure CSS MIME types are registered
CUSTOM_MIME_TYPES = {
    '.css': 'text/css',
    '.scss': 'text/scss',
    '.sass': 'text/sass',
    '.map': 'application/json'  # Source maps
}
```

#### Fix 2: Build Process Integration
```json
// package.json scripts
{
  "scripts": {
    "build:css": "sass src/scss:dist/css --style=compressed",
    "watch:css": "sass src/scss:dist/css --style=expanded --watch",
    "dev": "npm run watch:css & python server.py"
  }
}
```

### Font Files MIME Type Issues

**Symptoms:**
- Custom fonts not loading
- Font files served as `application/octet-stream`
- Web font icons not displaying

**Solutions:**

```python
# Comprehensive font MIME type support
FONT_MIME_TYPES = {
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject'
}
```

## Build Configuration Fixes

### Vite Configuration for MIME Types

```javascript
// vite.config.js
export default defineConfig({
  server: {
    // Ensure proper MIME types in development
    middlewares: [
      (req, res, next) => {
        if (req.url.endsWith('.ts')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
        next();
      }
    ]
  },
  build: {
    rollupOptions: {
      output: {
        // Ensure proper MIME types for built assets
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];

          // Map extensions to proper MIME type groups
          const mimeGroups = {
            'css': 'css',
            'js': 'js',
            'png': 'images',
            'jpg': 'images',
            'svg': 'images',
            'woff': 'fonts',
            'woff2': 'fonts'
          };

          const group = mimeGroups[ext] || 'assets';
          return `${group}/[name]-[hash][extname]`;
        }
      }
    }
  }
});
```

### TypeScript Configuration for Module Resolution

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2015",
    "module": "ES2015",
    "moduleResolution": "node",
    "outDir": "./src/js",
    "rootDir": "./src/ts",
    "declaration": false,
    "sourceMap": true,
    "removeComments": true,
    "noEmitOnError": true,
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Development Server Setup

### Enhanced Development Server Script

```python
#!/usr/bin/env python3
"""
Enhanced frontend development server with comprehensive MIME type support
"""
import http.server
import socketserver
import os
import sys
import json
from pathlib import Path

class EnhancedFrontendHandler(http.server.SimpleHTTPRequestHandler):
    """
    Complete frontend development server with all necessary MIME type fixes
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.setup_mime_types()

    def setup_mime_types(self):
        """Setup comprehensive MIME type mappings"""
        mimetypes.add_type('application/javascript', '.ts')
        mimetypes.add_type('application/javascript', '.tsx')
        mimetypes.add_type('application/javascript', '.js')
        mimetypes.add_type('application/javascript', '.mjs')
        mimetypes.add_type('text/css', '.css')
        mimetypes.add_type('text/scss', '.scss')
        mimetypes.add_type('text/sass', '.sass')
        mimetypes.add_type('application/json', '.map')
        mimetypes.add_type('font/woff', '.woff')
        mimetypes.add_type('font/woff2', '.woff2')
        mimetypes.add_type('font/ttf', '.ttf')
        mimetypes.add_type('application/vnd.ms-fontobject', '.eot')

    def log_message(self, format, *args):
        """Enhanced logging with file type information"""
        return super().log_message(
            f"{format} [Type: {self.get_content_type()}]",
            *args
        )

    def get_content_type(self):
        """Get the content type for current request"""
        file_path = self.translate_path(self.path)
        if os.path.isfile(file_path):
            return self.guess_type(file_path)[0]
        return 'unknown'

def main():
    port = 5173

    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number")
            sys.exit(1)

    print("🚀 Enhanced Frontend Development Server")
    print(f"📂 Serving from: {os.getcwd()}")
    print(f"🔧 MIME types configured for: .ts, .tsx, .js, .css, .scss, .map")
    print(f"🌐 Server running at: http://localhost:{port}")
    print("---")

    try:
        with socketserver.TCPServer(("", port), EnhancedFrontendHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {port} is already in use")
            print("💡 Try a different port: python server.py 3001")
        else:
            print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Testing MIME Type Configuration

### Test Script for MIME Type Validation

```python
#!/usr/bin/env python3
"""
Test script to validate MIME type configuration
"""
import mimetypes
import os

def test_mime_types():
    """Test that all required MIME types are configured"""
    test_files = [
        'test.ts',
        'test.tsx',
        'test.js',
        'test.css',
        'test.scss',
        'test.woff',
        'test.woff2',
        'test.json',
        'test.map'
    ]

    expected_types = {
        '.ts': 'application/javascript',
        '.tsx': 'application/javascript',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.scss': 'text/scss',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.json': 'application/json',
        '.map': 'application/json'
    }

    print("🔍 Testing MIME type configuration...")
    all_passed = True

    for file in test_files:
        ext = os.path.splitext(file)[1]
        expected = expected_types.get(ext, 'unknown')
        actual, _ = mimetypes.guess_type(file)

        if actual == expected:
            print(f"✅ {file}: {actual}")
        else:
            print(f"❌ {file}: {actual} (expected: {expected})")
            all_passed = False

    print("---")
    if all_passed:
        print("🎉 All MIME types configured correctly!")
    else:
        print("⚠️ Some MIME types need configuration")

    return all_passed

if __name__ == "__main__":
    test_mime_types()
```

## Best Practices

### 1. Always Use Build Tools for Production

- Use Vite, Webpack, or similar for production builds
- Avoid serving source files (.ts, .scss) directly in production
- Compile to optimized JavaScript and CSS bundles

### 2. Development Server Configuration

```bash
# Use Vite for development (recommended)
cd frontend
npm run dev

# Alternative: Use custom Python server with proper MIME types
python frontend/server.py 5173
```

### 3. Production Deployment

```bash
# Build optimized assets
npm run build:prod

# Serve built files with proper MIME types
# (Most web servers handle this correctly)
```

### 4. MIME Type Headers in HTML

```html
<!-- Ensure proper MIME type headers in HTML -->
<script type="application/javascript" src="src/js/script.js"></script>
<link rel="stylesheet" type="text/css" href="styles.css">
```

## Troubleshooting Checklist

1. **Check browser console** for MIME type errors
2. **Verify server MIME type configuration**
3. **Use browser Network tab** to check response headers
4. **Test with different servers** (Python vs Vite)
5. **Check file extensions** match expected types
6. **Validate build process** generates correct files

## Related Documentation

- [Frontend Development Setup](frontend-README.md)
- [Build Configuration Guide](build-optimization.md)
- [Development Workflow](development-workflow.md)
- [Comprehensive Test Issues Documentation](test-issues-comprehensive.md)
- [Issue Tracker](issue-tracker.md)