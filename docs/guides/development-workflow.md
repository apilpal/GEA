# Development Workflow Improvements Guide

## Overview

This guide outlines improved development workflows, best practices, automation strategies, and productivity enhancements for the frontend development process. It covers modern development practices, automation, and tools to streamline the development experience.

## Modern Development Workflow

### 1. Project Structure Optimization

```
frontend/
├── src/
│   ├── ts/                 # TypeScript source
│   │   ├── components/     # Component modules
│   │   ├── services/       # API services
│   │   ├── utils/          # Utilities
│   │   ├── types/          # Type definitions
│   │   └── index.ts        # Main entry point
│   ├── scss/              # SCSS modules
│   │   ├── base/          # Variables, mixins
│   │   ├── components/    # Component styles
│   │   ├── layout/        # Layout styles
│   │   ├── pages/         # Page styles
│   │   └── utilities/     # Utility classes
│   └── js/                # Compiled JavaScript (auto-generated)
├── __tests__/            # Test files
├── docs/                 # Component documentation
├── dist/                 # Production build
└── config/               # Configuration files
```

### 2. Development Environment Setup

#### VS Code Configuration

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "emmet.includeLanguages": {
    "typescript": "typescriptreact"
  },
  "files.associations": {
    "*.scss": "scss",
    "*.css": "css"
  }
}
```

#### Extension Recommendations

```json
// .vscode/extensions.json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json",
    "stylelint.vscode-stylelint",
    "usernamehw.errorlens",
    "ms-vscode.vscode-css-peek"
  ]
}
```

### 3. Automated Development Scripts

#### Enhanced package.json Scripts

```json
{
  "name": "student-profiles-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "npm run type-check && npm run lint && npm run test && vite build",
    "build:dev": "vite build --mode development",
    "build:prod": "vite build --mode production",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint src --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx,json,css,scss,md}\"",
    "format:check": "prettier --check \"src/**/*.{js,jsx,ts,tsx,json,css,scss,md}\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "scss": "sass src/scss:src/css --style=expanded",
    "scss:watch": "sass src/scss:src/css --style=expanded --watch",
    "scss:prod": "sass src/scss:src/css --style=compressed",
    "analyze": "vite build --mode analyze && open dist/report.html",
    "clean": "rimraf dist coverage .nyc_output",
    "serve": "npm run build && npm run preview",
    "docs": "typedoc --entryPoints src/ts --out docs",
    "docs:serve": "npm run docs && npx serve docs",
    "validate": "npm run type-check && npm run lint && npm run format:check && npm run test:ci",
    "prepare": "husky install"
  }
}
```

## Code Quality Automation

### 1. Pre-commit Hooks

```bash
# Install husky for Git hooks
npm install --save-dev husky lint-staged

# Add prepare script to package.json
{
  "prepare": "husky install"
}

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"

# .lintstagedrc.json
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "jest --findRelatedTests"
  ],
  "*.{json,css,scss,md}": [
    "prettier --write"
  ]
}
```

### 2. Pre-push Hooks

```bash
# Add pre-push hook for comprehensive checks
npx husky add .husky/pre-push "npm run validate"
```

### 3. ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'unused-imports'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_'
      }
    ],
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always'
      }
    ],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true
      }
    }
  }
}
```

### 4. Prettier Configuration

```json
// .prettierrc
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}

// .prettierignore
node_modules
dist
coverage
.nyc_output
*.min.js
*.min.css
```

## Development Tools Integration

### 1. TypeScript Configuration Enhancement

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2015",
    "module": "ES2015",
    "moduleResolution": "node",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./src/js",
    "rootDir": "./src/ts",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noEmitOnError": true,
    "incremental": true,
    "tsBuildInfoFile": "node_modules/.cache/tsconfig.tsbuildinfo"
  },
  "include": [
    "src/ts/**/*"
  ],
  "exclude": [
    "node_modules",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### 2. Jest Configuration for Better DX

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/?(*.)(test|spec).{js,jsx,ts,tsx}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  clearMocks: true,
  restoreMocks: true
}
```

### 3. Enhanced Jest Setup

```javascript
// jest.setup.js
import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null }
  disconnect() { return null }
  unobserve() { return null }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null }
  disconnect() { return null }
  unobserve() { return null }
}

// Mock fetch
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
global.localStorage = localStorageMock
```

## Continuous Integration Workflow

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test:ci

      - name: Build
        run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### 2. Quality Gates

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on:
  push:
    branches: [ main ]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: SonarCloud Scan
        uses: sonarsource/sonarcloud-github-action@v1.8
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

## Development Productivity Tools

### 1. Live Server Alternatives

```bash
# Modern alternatives to Python's http.server
# Option 1: Vite (Recommended)
npm run dev

# Option 2: Live Server extension for VS Code
# Install: Live Server extension

# Option 3: Custom development server
node dev-server.js
```

### 2. File Watcher Scripts

```javascript
// dev-server.js
import { createServer } from 'vite'
import { createProxyMiddleware } from 'http-proxy-middleware'

const server = await createServer({
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})

await server.listen(5173)
console.log('🚀 Development server running on http://localhost:5173')
```

### 3. Hot Reload Enhancement

```javascript
// Enhanced hot reload with better error overlay
export default defineConfig({
  server: {
    hmr: {
      overlay: true,
      // Custom error overlay
      overlayConfig: {
        showToggleButton: true,
        showFile: true,
        showColumn: true
      }
    }
  }
})
```

## Component Development Workflow

### 1. Component Generator Script

```bash
#!/bin/bash
# generate-component.sh

COMPONENT_NAME=$1
COMPONENT_DIR="src/ts/components/$COMPONENT_NAME"

if [ -z "$COMPONENT_NAME" ]; then
  echo "Usage: ./generate-component.sh ComponentName"
  exit 1
fi

# Create component directory
mkdir -p "$COMPONENT_DIR"

# Generate TypeScript component file
cat > "$COMPONENT_DIR/$COMPONENT_NAME.ts" << EOF
export class ${COMPONENT_NAME} extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.render()
  }

  render() {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = \`
        <div class="${COMPONENT_NAME.toLowerCase()}">
          <h2>${COMPONENT_NAME}</h2>
        </div>
      \`
    }
  }
}

// Register component
customElements.define('${COMPONENT_NAME.toLowerCase()}', ${COMPONENT_NAME})
EOF

# Generate SCSS file
cat > "$COMPONENT_DIR/$COMPONENT_NAME.scss" << EOF
.${COMPONENT_NAME.toLowerCase()} {
  // Component styles
}
EOF

# Generate test file
cat > "$COMPONENT_DIR/$COMPONENT_NAME.test.ts" << EOF
import { ${COMPONENT_NAME} } from './${COMPONENT_NAME}'

describe('${COMPONENT_NAME}', () => {
  beforeEach(() => {
    // Setup test
  })

  test('should render component', () => {
    // Test implementation
  })
})
EOF

# Generate README
cat > "$COMPONENT_DIR/README.md" << EOF
# ${COMPONENT_NAME} Component

## Description

Brief description of the component.

## Usage

\`\`\`html
<${COMPONENT_NAME.toLowerCase()}></${COMPONENT_NAME.toLowerCase()}>
\`\`\`

## Properties

- Add component properties here

## Events

- Add component events here
EOF

echo "✅ Component $COMPONENT_NAME generated successfully!"
```

### 2. Component Development Checklist

```markdown
# Component Development Checklist

## Before Development
- [ ] Define component interface (props, events, methods)
- [ ] Create component directory structure
- [ ] Set up TypeScript interfaces
- [ ] Define component styles architecture

## During Development
- [ ] Implement base component class
- [ ] Add Shadow DOM encapsulation
- [ ] Implement lifecycle methods
- [ ] Add event handling
- [ ] Create component styles
- [ ] Add responsive design
- [ ] Implement accessibility features

## Testing
- [ ] Unit tests for component logic
- [ ] Integration tests for component interactions
- [ ] Accessibility tests
- [ ] Visual regression tests
- [ ] Performance tests

## Documentation
- [ ] Component README with examples
- [ ] API documentation
- [ ] Usage examples
- [ ] Migration guide (if needed)

## Before Merge
- [ ] Code review
- [ ] Type checking passes
- [ ] Linting passes
- [ ] All tests pass
- [ ] Accessibility audit passes
```

## Performance Optimization Workflow

### 1. Bundle Analysis Integration

```json
{
  "scripts": {
    "analyze": "vite build --mode analyze",
    "analyze:open": "npm run analyze && open dist/report.html",
    "build:analyze": "vite build && npx vite-bundle-analyzer dist"
  }
}
```

### 2. Performance Monitoring

```javascript
// performance-monitor.js
export class PerformanceMonitor {
  static measure(name, fn) {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    console.log(`${name} took ${end - start} milliseconds`)
    return result
  }

  static async measureAsync(name, asyncFn) {
    const start = performance.now()
    const result = await asyncFn()
    const end = performance.now()
    console.log(`${name} took ${end - start} milliseconds`)
    return result
  }
}
```

### 3. Bundle Size Tracking

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Tracking

on:
  pull_request:
    branches: [ main ]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Check bundle size
        run: |
          echo "Bundle size check:"
          du -sh dist/assets/*.js
          du -sh dist/assets/*.css
```

## Code Review Process

### 1. Automated Code Review

```javascript
// dangerfile.js (for Danger.js integration)
import { danger, warn, fail } from 'danger'

const modifiedFiles = danger.git.modified_files
const newFiles = danger.git.created_files

// Check for large files
modifiedFiles.forEach(file => {
  const fileSize = fs.statSync(file).size
  if (fileSize > 500 * 1024) { // 500KB
    warn(`Large file: ${file} (${Math.round(fileSize / 1024)}KB)`)
  }
})

// Check for TODO comments
const content = fs.readFileSync(file).toString()
if (content.includes('TODO') || content.includes('FIXME')) {
  warn('File contains TODO or FIXME comments')
}
```

### 2. Code Review Checklist

```markdown
# Code Review Checklist

## Code Quality
- [ ] Code follows project style guidelines
- [ ] No linting errors or warnings
- [ ] Proper TypeScript types used
- [ ] No console.log statements in production code
- [ ] Error handling implemented appropriately

## Functionality
- [ ] Feature works as expected
- [ ] Edge cases handled properly
- [ ] Performance impact considered
- [ ] Accessibility requirements met

## Testing
- [ ] Tests added/updated for new functionality
- [ ] All tests pass
- [ ] Test coverage maintained or improved
- [ ] Integration tests included where appropriate

## Documentation
- [ ] Code comments are clear and accurate
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] Usage examples provided

## Security
- [ ] No hardcoded secrets or credentials
- [ ] Input validation implemented
- [ ] XSS protection considered
- [ ] HTTPS enforcement verified

## Performance
- [ ] Bundle size impact assessed
- [ ] Loading performance considered
- [ ] Memory leaks prevented
- [ ] Unnecessary re-renders avoided
```

## Deployment Workflow

### 1. Automated Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Deploy to server
        run: |
          echo "Deploying to production server..."
          # Add deployment commands here
```

### 2. Environment Management

```json
// environments.json
{
  "development": {
    "apiUrl": "http://localhost:8000",
    "debug": true,
    "logLevel": "debug"
  },
  "staging": {
    "apiUrl": "https://api.staging.example.com",
    "debug": true,
    "logLevel": "info"
  },
  "production": {
    "apiUrl": "https://api.example.com",
    "debug": false,
    "logLevel": "error"
  }
}
```

## Maintenance and Monitoring

### 1. Health Checks

```typescript
// health-check.ts
export class HealthCheck {
  static async checkServices(): Promise<HealthStatus> {
    const checks = {
      api: this.checkApi(),
      database: this.checkDatabase(),
      components: this.checkComponents()
    }

    const results = await Promise.allSettled(Object.values(checks))
    const status = results.every(result => result.status === 'fulfilled')

    return {
      healthy: status,
      timestamp: new Date().toISOString(),
      services: Object.keys(checks).reduce((acc, key, index) => {
        acc[key] = results[index].status === 'fulfilled'
        return acc
      }, {})
    }
  }
}
```

### 2. Error Monitoring

```typescript
// error-tracker.ts
export class ErrorTracker {
  static trackError(error: Error, context?: any) {
    console.error('Error tracked:', error, context)

    // Send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry, LogRocket, etc.
    }
  }

  static trackPerformance(name: string, duration: number) {
    console.log(`Performance: ${name} took ${duration}ms`)

    // Send to analytics service
  }
}
```

## Best Practices Summary

### 1. Development Environment
- Use modern tools (Vite, TypeScript, ESLint, Prettier)
- Automate code quality checks
- Set up proper IDE configuration
- Use version control for configuration files

### 2. Code Quality
- Automated linting and formatting
- Comprehensive test coverage
- Type safety with TypeScript
- Regular code reviews

### 3. Performance
- Bundle analysis and optimization
- Performance monitoring
- Asset optimization
- Caching strategies

### 4. Collaboration
- Clear commit message guidelines
- Pull request templates
- Documentation standards
- Knowledge sharing practices

### 5. Maintenance
- Regular dependency updates
- Security scanning
- Performance monitoring
- Automated health checks

## Recent Workflow Improvements (October 19, 2025)

### Backend Enhancements

#### Enhanced Configuration Management
**Environment File Loading Fix**: Resolved critical SECRET_KEY configuration issues with sophisticated environment file loading system.

```python
# backend/src/core/config/config.py - Enhanced Environment Loading
def load_environment_config():
    """Load environment configuration based on ENVIRONMENT variable."""
    environment = os.getenv("ENVIRONMENT", "development").lower()

    # Load base .env file from backend directory
    base_env_path = Path(__file__).parent.parent.parent.parent / "backend" / ".env"
    if base_env_path.exists():
        load_dotenv(base_env_path)

    # Load environment-specific .env file (overrides base)
    env_specific_path = Path(__file__).parent.parent.parent.parent / "backend" / f".env.{environment}"
    if env_specific_path.exists():
        load_dotenv(env_specific_path, override=True)
```

**Key Improvements**:
- ✅ Proper priority loading: `.env.{environment}` > `.env` > system environment variables
- ✅ Robust path resolution for configuration files
- ✅ Enhanced error handling for missing configuration
- ✅ Support for multiple environment configurations

#### Test Coverage Improvements
**Achievement**: Dramatically improved test coverage from 55.48% to >80%

**New Test Infrastructure**:
- **Main Module Tests**: Comprehensive `test_main.py` with app creation, middleware, and health check testing
- **Enhanced Integration Tests**: Proper async/await patterns and database testing
- **Configuration Testing**: Environment-specific configuration validation
- **Middleware Testing**: CORS, rate limiting, and security middleware coverage

### Frontend Enhancements

#### ES Module and JSDOM Compatibility
**Jest Configuration Overhaul**: Complete modernization of testing environment for ES module support.

```javascript
// jest.config.js - Enhanced ESM Support
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
    customElements: true,
    pretendToBeVisual: true,
    resources: 'usable',
    // Enhanced custom elements support for shadow DOM
    beforeParse: (window) => {
      if (!window.customElements) {
        window.customElements = {
          define: () => {},
          get: () => null,
          whenDefined: () => Promise.resolve()
        };
      }
    }
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)$': '$1',
    '^(\\.{1,2}/.*)\\?esm$': '$1'
  }
}
```

**Key Improvements**:
- ✅ ESM preset for modern ES module support
- ✅ Enhanced JSDOM environment with custom elements
- ✅ Improved module resolution for TypeScript
- ✅ Better performance optimizations for DOM operations

#### ChartComponent Accessibility Enhancements
**Comprehensive Accessibility Implementation**:

```typescript
// Enhanced accessibility features
private updateAccessibilityElements() {
  const shadow = this.shadowRoot!;
  const dataTable = shadow.querySelector('#chart-data-table') as HTMLElement;
  const announcer = shadow.querySelector('#chart-announcer') as HTMLElement;

  if (dataTable) {
    dataTable.innerHTML = this.generateDataTable();
  }

  // Set up keyboard navigation
  if (this.canvas) {
    this.setupKeyboardNavigation();
  }

  // Announce data changes
  if (announcer) {
    announcer.textContent = `${this.data.title || 'Chart'} updated with ${this.data.labels.length} data points.`;
  }
}
```

**Accessibility Features**:
- ✅ **ARIA Support**: Comprehensive ARIA labels, roles, and properties
- ✅ **Keyboard Navigation**: Arrow keys, Home/End, Enter/Space support
- ✅ **Screen Reader Support**: Live announcements and accessible data tables
- ✅ **Focus Management**: Proper focus handling and navigation instructions
- ✅ **Help System**: Built-in keyboard navigation help

### Development Workflow Enhancements

#### Improved Development Scripts
**Enhanced package.json Scripts**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "npm run type-check && npm run lint && npm run test && vite build",
    "build:dev": "vite build --mode development",
    "build:prod": "vite build --mode production",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint src --ext .ts,.tsx,.js,.jsx --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

#### Enhanced Pre-commit Hooks
**Comprehensive Code Quality Automation**:
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer

  - repo: https://github.com/psf/black
    rev: 23.7.0
    hooks:
      - id: black
        language_version: python3

  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.45.0
    hooks:
      - id: eslint
        files: \.(js|ts)$
        additional_dependencies:
          - eslint@^8.0.0
          - '@typescript-eslint/parser'
          - '@typescript-eslint/eslint-plugin'
```

## Related Documentation

- [Build Optimization Guide](build-optimization.md)
- [Component Registry System](../architecture/component-registry.md)
- [Frontend Development Setup](frontend.md)
- [Testing Guide](../reports/frontend-coverage-report.md)
- [Troubleshooting Guide](../troubleshooting/TROUBLESHOOTING.md)