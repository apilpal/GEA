# Frontend Common Issues and Solutions Guide

## Overview

This comprehensive guide covers common issues encountered during frontend development, their symptoms, root causes, and proven solutions. It includes practical examples, debugging techniques, and preventive measures.

## 1. Module Loading Issues

### Issue 1.1: TypeScript/JavaScript Module Loading Failures

**Symptoms:**
```
Failed to load module script: The server responded with a non-JavaScript MIME type
Uncaught TypeError: Failed to resolve custom element
```

**Root Causes:**
- Incorrect MIME type configuration
- Module resolution problems
- Import/export syntax errors
- TypeScript compilation issues

**Solutions:**

#### 1.1.1 Fix MIME Types
```python
# Enhanced MIME type handler
class FrontendHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    CUSTOM_MIME_TYPES = {
        '.ts': 'application/javascript',
        '.tsx': 'application/javascript',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.scss': 'text/scss',
        '.map': 'application/json'
    }

    def guess_type(self, path):
        mime_type, encoding = super().guess_type(path)
        if mime_type is None:
            ext = Path(path).suffix.lower()
            if ext in self.CUSTOM_MIME_TYPES:
                mime_type = self.CUSTOM_MIME_TYPES[ext]
        return mime_type, encoding
```

#### 1.1.2 Fix Module Resolution
```javascript
// vite.config.js
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '~': resolve(__dirname, 'src')
    }
  }
})
```

#### 1.1.3 Verify TypeScript Configuration
```json
{
  "compilerOptions": {
    "module": "ES2015",
    "target": "ES2015",
    "moduleResolution": "node",
    "outDir": "./src/js",
    "rootDir": "./src/ts"
  }
}
```

**Verification:**
```bash
# Check MIME types
curl -I http://localhost:5173/src/ts/index.ts

# Should return: Content-Type: application/javascript
```

### Issue 1.2: ES6 Module Import/Export Errors

**Symptoms:**
```
Uncaught SyntaxError: Cannot use import statement outside a module
Unexpected token 'export'
```

**Root Causes:**
- Mixing CommonJS and ES6 modules
- Incorrect script type attributes
- Browser compatibility issues

**Solutions:**

#### 1.2.1 Fix HTML Script Tags
```html
<!-- Correct -->
<script type="module" src="src/js/script.js"></script>

<!-- Incorrect -->
<script src="src/js/script.js"></script>
```

#### 1.2.2 Fix TypeScript Module Generation
```json
{
  "compilerOptions": {
    "module": "ES2015",  // NOT CommonJS
    "target": "ES2015"
  }
}
```

#### 1.2.3 Use Vite for Development
```bash
# Use Vite instead of Python server for development
cd frontend
npm run dev
```

## 2. Component Registration Issues

### Issue 2.1: Custom Element Registration Failures

**Symptoms:**
```
Uncaught TypeError: Failed to resolve custom element: 'component-name'
Component registration failed: Component already registered
```

**Root Causes:**
- Component not registered before use
- Duplicate registration attempts
- Missing component class

**Solutions:**

#### 2.1.1 Ensure Proper Registration Order
```typescript
// main.ts or index.ts
import './components/registry'  // Register components first
import './app'                  // Then use them

// In HTML - ensure registration before DOM parsing
document.addEventListener('DOMContentLoaded', () => {
  // Components should already be registered here
})
```

#### 2.1.2 Fix Registry Configuration
```typescript
const COMPONENT_REGISTRY = {
  'my-component': {
    componentClass: MyComponent,  // Ensure class is imported
    tagName: 'my-component',
    description: 'My component description'
  }
}
```

#### 2.1.3 Handle Registration Conflicts
```typescript
import { registerComponent, getComponentRegistry } from './components/registry'

const registry = getComponentRegistry()

// Check if already registered
if (!customElements.get('my-component')) {
  registerComponent('my-component')
}

// Or force re-registration
registerComponent('my-component', true)
```

### Issue 2.2: Component Dependencies Not Met

**Symptoms:**
```
Component missing dependency: chart-component -> data-service
Registration failed due to missing dependencies
```

**Solutions:**

#### 2.2.1 Register Dependencies First
```typescript
// Register dependencies before dependent components
registerComponent('data-service')
registerComponent('chart-component')
```

#### 2.2.2 Validate Registry Before Registration
```typescript
import { getComponentRegistry } from './components/registry'

const registry = getComponentRegistry()
const validation = registry.validateRegistry()

if (!validation.valid) {
  console.error('Fix these issues before proceeding:')
  validation.missing.forEach(dep => console.error(`Missing: ${dep}`))
}
```

## 3. Styling and CSS Issues

### Issue 3.1: SCSS Compilation Errors

**Symptoms:**
```
SassError: Expected expression
DEPRECATION WARNING: Using / for division is deprecated
```

**Root Causes:**
- Sass syntax errors
- Deprecated division operator
- Missing imports or incorrect paths

**Solutions:**

#### 3.1.1 Fix Sass Division Operator
```scss
// Old (deprecated)
.element {
  width: 100px / 2;
  margin: (10px / 2);
}

// New (recommended)
@use 'sass:math';
.element {
  width: math.div(100px, 2);
  margin: math.div(10px, 2);
}
```

#### 3.1.2 Fix Import Paths
```scss
// Incorrect
@import 'variables';

// Correct
@import 'src/scss/base/variables';
@import 'src/scss/base/mixins';
```

#### 3.1.3 Update Vite Configuration for SCSS
```javascript
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "src/scss/base/variables.scss";`
      }
    }
  }
})
```

### Issue 3.2: CSS Not Loading or Applying

**Symptoms:**
- Styles not applied to components
- CSS files return 404
- Styles load but don't affect elements

**Root Causes:**
- Incorrect CSS file paths
- Shadow DOM encapsulation issues
- CSS specificity problems

**Solutions:**

#### 3.2.1 Fix CSS File Paths
```html
<!-- Ensure correct paths -->
<link rel="stylesheet" href="styles.css">
```

#### 3.2.2 Fix Shadow DOM CSS
```typescript
class MyComponent extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.render()
  }

  render() {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
          }
          .content {
            color: red;
          }
        </style>
        <div class="content">Hello World</div>
      `
    }
  }
}
```

## 4. Build and Compilation Issues

### Issue 4.1: Vite Build Failures

**Symptoms:**
```
[vite] Build failed in 1.23s
Error: ENOENT: no such file or directory
Module not found: Cannot resolve './component'
```

**Root Causes:**
- Missing files or incorrect paths
- TypeScript compilation errors
- Missing dependencies

**Solutions:**

#### 4.1.1 Check File Paths
```bash
# Verify all imported files exist
find src -name "*.ts" -exec grep -l "import.*component" {} \;
```

#### 4.1.2 Fix TypeScript Errors First
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Fix any errors before building
npm run build
```

#### 4.1.3 Clean Build Directory
```bash
# Remove old build artifacts
rm -rf dist
npm run build
```

### Issue 4.2: Asset Optimization Problems

**Symptoms:**
- Large bundle sizes
- Slow loading times
- Missing assets in production

**Solutions:**

#### 4.2.1 Optimize Bundle Size
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
```

#### 4.2.2 Analyze Bundle Contents
```bash
# Generate bundle analysis
npm run analyze

# Check for large dependencies
du -sh node_modules/* | sort -hr | head -10
```

## 5. Development Server Issues

### Issue 5.1: Hot Module Replacement (HMR) Not Working

**Symptoms:**
- Changes not reflected in browser
- HMR disconnected errors
- Manual page refresh required

**Root Causes:**
- HMR configuration issues
- File watching problems
- Network connectivity issues

**Solutions:**

#### 5.1.1 Check HMR Configuration
```javascript
export default defineConfig({
  server: {
    hmr: {
      port: 3001,
      overlay: true
    }
  }
})
```

#### 5.1.2 Restart Development Server
```bash
# Stop server (Ctrl+C)
# Restart server
npm run dev
```

#### 5.1.3 Check File Watching
```javascript
export default defineConfig({
  server: {
    watch: {
      usePolling: false,
      interval: 100,
      ignored: ['**/node_modules/**', '**/dist/**']
    }
  }
})
```

### Issue 5.2: Port Conflicts

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::5173
Port 5173 is already in use
```

**Solutions:**

#### 5.2.1 Kill Existing Processes
```bash
# Find and kill processes using port 5173
lsof -ti:5173 | xargs kill -9

# Alternative: use different port
PORT=3001 npm run dev
```

#### 5.2.2 Configure Dynamic Ports
```bash
# Use environment variable for port
PORT=5173 npm run dev

# Check available ports
netstat -tulpn | grep :300
```

## 6. Testing Issues

### Issue 6.1: Jest Test Failures

**Symptoms:**
```
Test suite failed to run
TypeScript compilation error in test files
```

**Root Causes:**
- Missing test environment configuration
- TypeScript configuration issues
- Missing polyfills or mocks

**Solutions:**

#### 6.1.1 Fix Jest Configuration
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}
```

#### 6.1.2 Fix Jest Setup
```javascript
// jest.setup.js
import '@testing-library/jest-dom'

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
```

### Issue 6.2: Component Testing Problems

**Symptoms:**
- Custom elements not defined in test environment
- Shadow DOM not accessible in tests
- Event handling not working in tests

**Solutions:**

#### 6.2.1 Setup Component Tests Properly
```typescript
import { MyComponent } from './MyComponent'

beforeEach(() => {
  // Register component before each test
  if (!customElements.get('my-component')) {
    customElements.define('my-component', MyComponent)
  }
})

test('should render component', () => {
  const element = document.createElement('my-component')
  document.body.appendChild(element)

  expect(element.shadowRoot).toBeTruthy()
})
```

## 7. Performance Issues

### Issue 7.1: Slow Initial Load

**Symptoms:**
- Large bundle sizes
- Slow time to interactive
- Poor Core Web Vitals scores

**Solutions:**

#### 7.1.1 Implement Code Splitting
```typescript
// Dynamic imports for route-based splitting
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Students = lazy(() => import('./pages/Students'))
```

#### 7.1.2 Optimize Assets
```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'd3']
        }
      }
    }
  }
})
```

### Issue 7.2: Memory Leaks

**Symptoms:**
- Increasing memory usage over time
- Browser becomes slow or unresponsive
- Frequent garbage collection

**Solutions:**

#### 7.2.1 Fix Event Listener Leaks
```typescript
class MyComponent extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.handleClick)
  }

  disconnectedCallback() {
    // Clean up event listeners
    this.removeEventListener('click', this.handleClick)
  }
}
```

#### 7.2.2 Monitor Memory Usage
```javascript
// Monitor memory usage in development
if (performance.memory) {
  console.log('Memory Usage:', {
    used: Math.round(performance.memory.usedJSHeapSize / 1048576),
    total: Math.round(performance.memory.totalJSHeapSize / 1048576),
    limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
  })
}
```

## 8. Browser Compatibility Issues

### Issue 8.1: Modern JavaScript Features Not Working

**Symptoms:**
- ES6+ features not working in older browsers
- Custom elements not supported
- Module loading fails

**Solutions:**

#### 8.1.1 Configure Browser Targets
```javascript
export default defineConfig({
  build: {
    target: ['es2015', 'chrome58', 'firefox57', 'safari11']
  }
})
```

#### 8.1.2 Add Polyfills
```javascript
// Polyfills for older browsers
import 'core-js/stable'
import 'regenerator-runtime/runtime'
```

## 9. Deployment Issues

### Issue 9.1: Production Build Problems

**Symptoms:**
- Development works but production fails
- Assets not loading in production
- Different behavior between environments

**Solutions:**

#### 9.1.1 Environment-Specific Configuration
```javascript
export default defineConfig(({ mode }) => {
  return {
    build: {
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false
    }
  }
})
```

#### 9.1.2 Check Production Assets
```bash
# Verify production build
npm run build
ls -la dist/
ls -la dist/assets/

# Serve production build
npm run preview
```

## 10. Debugging Techniques

### 10.1 Browser Developer Tools

#### Network Tab Debugging
```javascript
// Check MIME types in Network tab
// Filter by XHR/Fetch to see API calls
// Check response headers for MIME types
```

#### Console Debugging
```javascript
// Enable verbose logging
localStorage.setItem('debug', 'true')

// Log component lifecycle
class MyComponent extends HTMLElement {
  connectedCallback() {
    console.log('Component connected:', this.tagName)
  }

  disconnectedCallback() {
    console.log('Component disconnected:', this.tagName)
  }
}
```

#### Performance Debugging
```javascript
// Measure performance
console.time('Component render')
this.render()
console.timeEnd('Component render')

// Check memory usage
console.log(performance.memory)
```

### 10.2 Logging and Monitoring

#### Enhanced Error Logging
```typescript
class ErrorHandler {
  static logError(error: Error, context?: any) {
    console.error('Error:', error.message, {
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    })
  }

  static logInfo(message: string, data?: any) {
    console.info(`ℹ️ ${message}`, data)
  }
}
```

#### Component State Debugging
```typescript
class DebuggableComponent extends HTMLElement {
  getState() {
    return {
      tagName: this.tagName,
      attributes: Array.from(this.attributes).map(attr => ({
        name: attr.name,
        value: attr.value
      })),
      shadowRoot: this.shadowRoot ? 'present' : 'none'
    }
  }

  debug() {
    console.log('Component state:', this.getState())
  }
}
```

## 11. Preventive Measures

### 11.1 Development Best Practices

1. **Always use TypeScript** for better error catching
2. **Implement proper error boundaries** for component trees
3. **Use semantic versioning** for dependencies
4. **Regularly update dependencies** to avoid security issues
5. **Implement automated testing** for critical functionality

### 11.2 Code Quality Measures

```bash
# Run quality checks regularly
npm run lint
npm run type-check
npm run test:ci
npm run build

# Check bundle size
npm run analyze

# Monitor performance
npm run lighthouse
```

### 11.3 Environment Consistency

```javascript
// environment-check.js
export function validateEnvironment() {
  const requiredEnvVars = ['API_URL', 'NODE_ENV']
  const missing = requiredEnvVars.filter(env => !process.env[env])

  if (missing.length > 0) {
    console.error('Missing environment variables:', missing)
    return false
  }

  return true
}
```

## 12. Getting Help

### 12.1 Diagnostic Commands

```bash
# Complete diagnostic check
npm run diagnose

# Check system requirements
node --version
npm --version

# Verify file structure
find src -name "*.ts" | wc -l
find src -name "*.scss" | wc -l
```

### 12.2 Common Fix Scripts

```bash
# Quick fixes for common issues
npm run fix:mime-types    # Fix MIME type issues
npm run fix:imports       # Fix import/export issues
npm run fix:build         # Fix build problems
npm run fix:all           # Apply all fixes
```

## Related Documentation

- [MIME Type Troubleshooting](frontend-mime-types.md)
- [Build Optimization Guide](build-optimization.md)
- [Development Workflow](development-workflow.md)
- [Component Registry System](../architecture/component-registry.md)
- [Comprehensive Test Issues Documentation](test-issues-comprehensive.md)
- [Issue Tracker](issue-tracker.md)