# Bug Documentation

This document catalogs all failed test cases identified during the full test suite execution for both backend and frontend components.

## Recent Updates (October 2025)

### ✅ Resolved Issues

The following issues have been resolved through recent fixes and improvements:

#### Priority 1 Critical Fixes Applied
- **✅ Guest Dashboard Authentication Issue**: Fixed critical bug preventing guest users from accessing dashboard (October 23, 2025)
  - **Root Cause**: Auth context failed to recognize guest users as authenticated, causing login redirects
  - **Solution**: Updated auth context to check guest users first before regular authentication
  - **Impact**: Guest users can now access dashboard without login redirect
  - **Files Modified**: [`frontend/src/ts/components/auth/auth-context.ts`](frontend/src/ts/components/auth/auth-context.ts)
  - **Testing**: All authentication and guest-related tests pass, no regressions introduced

#### Puppeteer Test Suite Fixes Applied
- **✅ TypeScript Compilation Errors**: Fixed "Cannot find name 'page'" errors throughout the test file
- **✅ Jest Force Exit Due to Open Async Operations**: Resolved Jest force exit warnings by properly cleaning up event listeners
- **✅ Deprecated waitForTimeout Method**: Replaced deprecated Puppeteer method with Promise-based timeout implementation

#### Backend Fixes Applied
- **✅ Database Engine Configuration**: Fixed async SQLAlchemy configuration with proper async/sync engine separation
- **✅ PostgreSQL Connection Issues**: Resolved PostgreSQL connection failures with improved fallback handling
- **✅ Migration Import Errors**: Fixed missing `migrate_csv_to_db` function and async migration issues
- **✅ Async Fixture Issues**: Updated all async fixtures to use proper `@pytest_asyncio.fixture` decorators
- **✅ HTTP Method Issues**: Corrected HTTP method usage in CRUD operation tests
- **✅ Type Errors**: Fixed async/await patterns in database operations

#### Frontend Fixes Applied
- **✅ JavaScript Module Loading**: Fixed 404 errors for JavaScript modules by updating file paths and build configuration
- **✅ ES Module Compatibility**: Resolved `import.meta` usage issues in integration tests
- **✅ Missing matchMedia Mock**: Added proper `matchMedia` mock to Jest setup for responsive design testing
- **✅ Component Registration**: Fixed component registration conflicts and improved error handling

### 🔄 Partially Resolved Issues

#### Backend (In Progress)
- **TypeScript Compilation Issues**: ✅ **RESOLVED** - Updated to ES2015 module generation for better browser compatibility
- **SCSS Deprecation Warnings**: ✅ **RESOLVED** - Fixed Dart Sass 2.0.0 division operator warnings using `math.div()` function
- **Database Migration Conflicts**: ✅ **RESOLVED** - Fixed Alembic revision conflicts and data synchronization issues

#### Frontend (In Progress)
- **Static File Serving Issues**: ✅ **RESOLVED** - Updated build configuration to properly serve ES6 modules
- **Test Environment Issues**: ✅ **RESOLVED** - Enhanced Jest configuration with proper mocking and ES module support

## Puppeteer Test Suite Bug Fixes

### Bug 1: TypeScript Compilation Errors

**Description**: Multiple "Cannot find name 'page'" errors throughout the file, preventing TypeScript compilation and causing test failures.

**Root Cause**: Missing type declarations for jest-puppeteer global variables. The `page` object is provided by jest-puppeteer but TypeScript didn't recognize it as a global variable.

**Resolution**: Added proper type declarations and references at the top of the test file.

**Before (Error-Prone Code)**:
```typescript
// Missing type declarations - TypeScript errors on every 'page' usage
describe('Comprehensive UI Testing', () => {
  it('should test something', async () => {
    await page.goto('http://example.com'); // TypeScript error: Cannot find name 'page'
  });
});
```

**After (Fixed Code)**:
```typescript
/// <reference types="jest-environment-puppeteer" />

declare const page: import('puppeteer').Page;

// Now TypeScript recognizes 'page' as a global variable
describe('Comprehensive UI Testing', () => {
  it('should test something', async () => {
    await page.goto('http://example.com'); // ✅ No TypeScript errors
  });
});
```

**Why This Fix Was Necessary**: Without proper type declarations, TypeScript compilation would fail, preventing the test suite from running. The jest-puppeteer package provides global variables that need explicit type declarations for TypeScript compatibility.

### Bug 2: Jest Force Exit Due to Open Async Operations

**Description**: Jest was force exiting with "Have you considered using `--detectOpenHandles`" message, indicating that asynchronous operations were keeping the test process alive after completion.

**Root Cause**: Event listener attached to page object was never removed, keeping the page instance alive and preventing Jest from properly closing the test environment.

**Resolution**: Added proper cleanup by storing listener reference and removing it after test completion.

**Before (Memory Leak Code)**:
```typescript
it('should document UI issues', async () => {
  const consoleMessages = [];
  const consoleListener = msg => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text());
    }
  };
  page.on('console', consoleListener); // Listener added but never removed

  // Test logic here...

  // Missing cleanup - listener keeps page instance alive
  expect(true).toBe(true);
});
```

**After (Proper Cleanup Code)**:
```typescript
it('should document UI issues', async () => {
  const issues = [];
  const consoleMessages = [];
  const consoleListener = msg => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text());
    }
  };
  page.on('console', consoleListener);

  // Test logic here...

  // Proper cleanup - remove listener to prevent keeping page instance alive
  page.off('console', consoleListener);

  expect(true).toBe(true);
});
```

**Why This Fix Was Necessary**: Jest's `--detectOpenHandles` flag helps identify asynchronous operations that prevent clean test shutdown. Event listeners attached to Puppeteer page objects create handles that keep the Node.js process alive. Proper cleanup ensures tests complete cleanly and prevents resource leaks.

### Bug 3: Deprecated waitForTimeout Method

**Description**: TypeScript compilation error due to deprecated Puppeteer method usage.

**Root Cause**: Using deprecated `page.waitForTimeout()` method which was removed in newer versions of Puppeteer.

**Resolution**: Replaced with Promise-based timeout implementation using `new Promise(resolve => setTimeout(resolve, ms))`.

**Before (Deprecated Method)**:
```typescript
it('should wait for something', async () => {
  await page.click('#some-button');
  await page.waitForTimeout(1000); // ❌ Deprecated method - compilation error
  // Continue with test...
});
```

**After (Promise-Based Timeout)**:
```typescript
it('should wait for something', async () => {
  await page.click('#some-button');
  await new Promise(resolve => setTimeout(resolve, 1000)); // ✅ Modern Promise-based approach
  // Continue with test...
});
```

**Why This Fix Was Necessary**: Puppeteer deprecated `waitForTimeout()` in favor of native Promise-based timeouts to encourage better asynchronous programming practices. The deprecated method was removed in Puppeteer v13+, causing compilation failures in updated environments.

## Backend Bugs