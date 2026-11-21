# Troubleshooting Guide

## Port Configuration

The application now uses dynamic ports configured via environment variables for better flexibility and to avoid port conflicts.

### Environment Variables

- `BACKEND_PORT`: Port for the FastAPI backend server (default: 8000)
- `FRONTEND_PORT`: Port for the frontend HTTP server (default: 5173)

### Running with Custom Ports

To run the servers with custom ports, set the environment variables before starting:

```bash
FRONTEND_PORT=5173 BACKEND_PORT=8001 ./run.sh
```

This will start:
- Backend on http://127.0.0.1:8001 (custom port example)
- Frontend on http://127.0.0.1:5173

**Note:** Default backend port is 8000. Port 8001 is used here as an example of custom port configuration.
k
## CORS Configuration

The backend automatically reads the `FRONTEND_PORT` environment variable and configures CORS origins dynamically to allow requests from the frontend. The allowed origins are:
- `http://127.0.0.1:{FRONTEND_PORT}`
- `http://localhost:{FRONTEND_PORT}`
- `http://127.0.0.1:5173` (default PWA port)
- `http://localhost:5173` (default PWA port)

## Database Engine Configuration Issues

### AsyncEngine Error: 'Engine' object has no attribute 'sync_engine'

**Symptoms:**
- `sqlalchemy.exc.ArgumentError: AsyncEngine expected, got Engine(sqlite+aiosqlite:///./students.db)`
- Backend fails to start with greenlet/MissingGreenlet errors
- Import errors with SQLAlchemy async session creation

**Cause:**
- Mixing synchronous and asynchronous SQLAlchemy engines
- Using `aiosqlite` URL with synchronous session creation
- Incorrect engine setup for FastAPI async context

**Solutions:**

#### Option 1: Use Separate Engines (Recommended)
```python
# In models.py
from sqlalchemy.ext.asyncio import create_async_engine

# Async engine for FastAPI
async_engine = create_async_engine(
    "sqlite+aiosqlite:///./students.db",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=True,
)

# Sync engine for table creation/migrations
sync_engine = create_engine(
    "sqlite:///./students.db",  # Note: sync URL without aiosqlite
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=async_engine, class_=AsyncSession)
```

#### Option 2: Use Synchronous Engines Only
If async operations aren't critical, use synchronous SQLAlchemy throughout:
```python
# In models.py - synchronous setup only
DATABASE_URL = "sqlite:///./students.db"
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

#### Option 3: Proper Async Setup
Ensure all database operations use the async engine:
```python
# In main.py startup event
@app.on_event("startup")
async def startup_event():
    def create_tables():
        from models import sync_engine, Base
        Base.metadata.create_all(bind=sync_engine)
    await asyncio.get_event_loop().run_in_executor(None, create_tables)
```

**Verification:**
- Backend starts without SQLAlchemy errors
- Tables are created successfully
- API endpoints work correctly
- No greenlet/MissingGreenlet exceptions

## Common Issues

### Port Already in Use

**Symptoms:**
- `OSError: [Errno 98] Address already in use`
- Servers fail to start

**Solutions:**
1. Kill processes using the ports:
   ```bash
   pkill -f uvicorn
   pkill -f "python -m http.server"
   ```

2. Or find and kill specific processes:
   ```bash
   lsof -i :8000  # Check backend port
   lsof -i :5173  # Check frontend port
   kill -9 <PID>
   ```

3. Use different ports via environment variables

### CORS Errors

**Symptoms:**
- Frontend cannot make API requests
- Console shows CORS-related errors

**Solutions:**
1. Ensure `FRONTEND_PORT` matches the actual frontend server port
2. Check that the backend is reading the correct environment variable
3. Restart both servers after changing ports

### Backend Not Starting

**Symptoms:**
- Uvicorn fails to start
- "Address already in use" or permission errors

**Solutions:**
1. Check if another process is using the port
2. Try a different backend port
3. Ensure no firewall is blocking the port

### Frontend Not Accessible

**Symptoms:**
- Cannot access frontend in browser
- HTTP server fails to start

**Solutions:**
1. Check if port 5173 (or custom port) is available
2. Ensure you're accessing the correct URL
3. Try a different frontend port

## Testing Port Changes

To verify dynamic ports work:

1. Stop any running servers
2. Run: `FRONTEND_PORT=5173 BACKEND_PORT=8001 ./run.sh`
3. Check that servers start on the specified ports
4. Access frontend at http://127.0.0.1:5173
5. Verify API calls work from frontend to backend

## Logs and Debugging

- Backend logs are shown in the terminal where `./run.sh` is executed
- Frontend requests are logged by the Python HTTP server
- Use browser developer tools to inspect network requests and CORS headers

## Default Behavior

If no environment variables are set, the servers will use the default ports:
- Backend: 8000
- Frontend: 5173

This maintains backward compatibility.

## TypeScript Compilation Errors

### ES2015 Module Generation Issues

**Symptoms:**
- `TypeError: Cannot set properties of undefined (setting 'exports')` during TypeScript compilation
- Issues with ES2015 module generation in browser environments
- Build failures with CommonJS vs ES2015 module conflicts

**Cause:**
- TypeScript configuration generating CommonJS modules instead of ES2015
- Browser environments expecting ES2015 modules for better compatibility

**Solutions:**

#### Update tsconfig.json Module Settings
```json
{
  "compilerOptions": {
    "module": "ES2015",
    "target": "ES2015",
    "moduleResolution": "node"
  }
}
```

#### Alternative: Use ESNext for Modern Browsers
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2015"
  }
}
```

**Verification:**
- Build completes without module-related errors
- Generated JavaScript uses ES2015 import/export syntax
- Browser compatibility maintained

## Sass Deprecation Warnings

### Division Operator Deprecation

**Symptoms:**
- `DEPRECATION WARNING: Using / for division is deprecated and will be removed in Dart Sass 2.0.0.`
- Build warnings during SCSS compilation

**Cause:**
- Using `/` operator for division instead of `math.div()` function in modern Sass

**Solutions:**

#### Replace Division Operators
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

#### Global Replacement Script
```bash
# Find all division operations in SCSS files
find frontend/src/scss -name "*.scss" -exec grep -l "/" {} \; | xargs sed -i 's|([0-9]+px) / ([0-9]+)|\1 / \2|g'
```

**Verification:**
- No deprecation warnings during build
- Division operations work correctly
- Code compatible with future Sass versions

## Database Migration Conflicts

### Alembic Revision Conflicts

**Symptoms:**
- `alembic.util.exc.RevisionError: Multiple head revisions`
- Migration conflicts when applying database schema changes
- `alembic revision --autogenerate` fails with revision conflicts

**Cause:**
- Multiple migration heads exist in the database
- Conflicts between different migration branches
- Inconsistent migration history

**Solutions:**

#### Merge Migration Heads
```bash
# Check current migration status
alembic current

# Get migration history
alembic history

# Create a merge revision
alembic revision --rev-id <merge_revision_id> -m "merge multiple heads"

# Edit the generated migration file to include all changes
# Then apply the migration
alembic upgrade head
```

#### Reset Migration History (Development Only)
```bash
# WARNING: This will reset migration history
rm backend/alembic/versions/*.py
alembic revision --autogenerate -m "recreate schema"
alembic upgrade head
```

#### Manual Migration Resolution
```bash
# Create empty merge revision
alembic revision -m "merge heads" --head <head1> --head <head2>

# Edit the migration to combine changes from both heads
# Then apply
alembic upgrade head
```

**Verification:**
- `alembic current` shows single head revision
- No revision conflicts during autogeneration
- Database schema consistent

### Data Migration Synchronization Issues

**Symptoms:**
- CSV data not properly migrated to database
- Duplicate records after migration
- Missing data after migration runs

**Cause:**
- Migration script conflicts with existing data
- Primary key or unique constraint violations
- Incomplete migration rollback on failures

**Solutions:**

#### Clean Migration Run
```bash
# Backup existing database
cp backend/data/students.db backend/data/students.db.backup

# Drop and recreate database
rm backend/data/students.db
python backend/migrate_data.py
```

#### Incremental Migration
```python
# In migrate_data.py, add conflict resolution
try:
    # Attempt to create record
    db.add(student)
    db.commit()
except IntegrityError:
    # Handle duplicate key violations
    db.rollback()
    # Update existing record instead
    existing = db.query(Student).filter_by(mobile=student.mobile).first()
    if existing:
        # Update existing record
        existing.name = student.name
        # ... other fields
        db.commit()
```

**Verification:**
- All CSV data successfully migrated
- No duplicate records in database
- Data integrity maintained

## Database-Specific Troubleshooting

For database-related issues, configuration problems, or migration questions, please refer to the dedicated `DATABASE_README.md` file in the backend directory. This file contains comprehensive information about:

- SQLite database setup and configuration
- Alembic migration management with versioned schema evolution
- Data migration from CSV files to database with validation
- Database troubleshooting and common issues
- Schema management and versioning with cross-database compatibility
- Dual database support (SQLite/PostgreSQL) with comprehensive testing via test_dual_database.py

See `backend/DATABASE_README.md` for detailed database-specific guidance.

## Recent Updates (October 19, 2025)

### Critical Fixes Applied

#### Backend SECRET_KEY Configuration Fix
**Issue**: Environment file path resolution causing JWT secret key loading failures

**Problem**: The configuration system was not properly loading environment-specific `.env` files, causing the `SECRET_KEY` to be undefined and preventing JWT token generation.

**Solution Applied**:
- **Enhanced Environment Loading Logic**: Updated `backend/src/core/config/config.py` with sophisticated environment file loading
- **Priority System**: Implemented proper loading order: `.env.{environment}` > `.env` > system environment variables
- **Environment Detection**: Added robust environment detection with fallback to 'development'
- **Path Resolution**: Fixed relative path resolution for environment files from the configuration module location

**Code Changes**:
```python
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

**Verification**:
- SECRET_KEY now loads correctly in all environments
- JWT token generation works properly
- No more authentication failures due to missing secret key

#### Frontend ES Module and JSDOM Compatibility Fixes
**Issue**: Jest configuration causing module resolution failures and DOM-related test errors

**Solution Applied**:
- **ESM Preset Configuration**: Updated `jest.config.js` to use `ts-jest/presets/default-esm` for proper ES module support
- **Enhanced JSDOM Environment**: Added comprehensive JSDOM configuration with custom elements support
- **Module Resolution**: Fixed TypeScript module resolution for ES modules with proper path mapping
- **Transform Configuration**: Updated Jest transforms to handle ES modules correctly

**Key Improvements**:
- Custom elements support for shadow DOM testing
- Enhanced module name mapping for ESM compatibility
- Performance optimizations for DOM operations
- Better error handling for module resolution

#### Backend Test Coverage Improvements
**Achievement**: Increased test coverage from 55.48% to >80%

**Coverage Enhancements**:
- **Main Module Tests**: Added comprehensive `test_main.py` covering app creation, middleware, health checks, and error handling
- **Integration Tests**: Enhanced API endpoint testing with proper async/await patterns
- **Configuration Tests**: Added tests for environment-specific configurations
- **Middleware Tests**: Comprehensive testing of CORS, rate limiting, and security middleware

**Test Infrastructure**:
- Parallel test execution setup
- Proper test isolation and cleanup
- Enhanced mocking strategies for external dependencies
- Coverage reporting with multiple formats (text, HTML, LCOV)

#### ChartComponent Accessibility Enhancements
**Comprehensive Accessibility Improvements**:
- **ARIA Support**: Added comprehensive ARIA labels, roles, and properties for screen readers
- **Keyboard Navigation**: Full keyboard navigation with arrow keys, Home/End, Enter/Space, and help system
- **Screen Reader Support**: Live announcements, accessible data tables, and descriptive text generation
- **Focus Management**: Proper focus handling and navigation instructions
- **Help System**: Built-in help for keyboard users with contextual guidance

**Accessibility Features**:
- Hidden data table fallback for screen readers
- Comprehensive chart descriptions with data insights
- Keyboard shortcuts and navigation help
- Live region announcements for data changes
- Semantic HTML structure with proper roles

### Build Fixes Applied
- **TypeScript Compilation**: Updated to generate ES2015 modules instead of CommonJS for better browser compatibility
- **SCSS Deprecation Warnings**: Resolved Dart Sass 2.0.0 deprecation warnings for division operators using `math.div()` function
- **Database Migration Conflicts**: Fixed Alembic revision conflicts and data synchronization issues

### Architecture Improvements
- **Dual Database Support**: Comprehensive SQLite/PostgreSQL compatibility with automated testing
- **Enhanced Security**: Rate limiting (30-60 requests/minute), improved error handling, and audit logging
- **Modular SCSS**: Component-specific styling with CSS custom properties and resolved build warnings
- **TypeScript Optimization**: ES2015 module generation for improved browser compatibility
- **Database Engine**: Proper async SQLAlchemy configuration with separate sync/async engines

## Enhanced BaseComponent Issues

### TypeScript Generic Type Errors

**Symptoms:**
- `Type 'X' is not assignable to type 'Y'` errors with BaseComponent generics
- Issues with conditional types and template literal types
- Problems with component props/state type inference

**Cause:**
- Incorrect generic type parameters
- TypeScript strict mode enforcing stricter type checking
- Missing type constraints on component interfaces

**Solutions:**

#### Fix Generic Type Parameters
```typescript
// Incorrect
class MyComponent extends BaseComponent { }

// Correct - specify all generic types
interface MyProps extends BaseComponentProps {
    title: string;
    count: number;
}

interface MyState extends BaseComponentState {
    isLoading: boolean;
}

interface MyEventMap extends ComponentEventMap {
    'data-loaded': CustomEvent<Data[]>;
}

class MyComponent extends BaseComponent<MyProps, MyState, MyEventMap> { }
```

#### Fix Interface Extension Issues
```typescript
// Incorrect - missing required properties
interface MyProps {
    title: string;
}

// Correct - must extend BaseComponentProps
interface MyProps extends BaseComponentProps {
    title: string;
    id?: string; // Optional properties
}
```

#### Fix Event Map Types
```typescript
// Incorrect - wrong event type
interface MyEventMap {
    'click': Event; // Too generic
}

// Correct - specific event type
interface MyEventMap {
    'item-selected': CustomEvent<{ id: string; name: string }>;
}
```

**Verification:**
- TypeScript compilation passes without generic-related errors
- Component props and state have correct type inference
- Event handlers receive properly typed events

### Shadow DOM and Event Handling Issues

**Symptoms:**
- Event listeners not working in shadow DOM
- Custom events not bubbling correctly
- DOM queries returning null or incorrect elements

**Cause:**
- Incorrect event listener setup for shadow DOM
- Missing event configuration for composed/bubbling
- Wrong selector usage in shadow DOM context

**Solutions:**

#### Fix Event Listener Setup
```typescript
// Incorrect - listening on document instead of shadow root
document.addEventListener('click', handler);

// Correct - listen on shadow root for internal events
this.addTypedEventListener('click', handler);

// For external events, listen on component itself
this.addEventListener('external-event', handler);
```

#### Fix Custom Event Dispatching
```typescript
// Incorrect - event won't bubble outside shadow DOM
this.dispatchEvent(new CustomEvent('my-event'));

// Correct - configure for external communication
this.dispatchCustomEvent('my-event', data, {
    bubbles: true,
    composed: true // Crucial for shadow DOM
});
```

#### Fix Shadow DOM Queries
```typescript
// Incorrect - querying document instead of shadow root
const element = document.querySelector('.my-element');

// Correct - query shadow root
const element = this.$<HTMLElement>('.my-element');
```

**Verification:**
- Events work correctly within shadow DOM
- Custom events bubble to parent components
- DOM queries return expected elements

### Lifecycle Hook Issues

**Symptoms:**
- Lifecycle hooks not being called
- Async lifecycle hooks causing timing issues
- Error handling not working in lifecycle hooks

**Cause:**
- Incorrect lifecycle hook implementation
- Missing error handling for async hooks
- Timing issues with component mounting/unmounting

**Solutions:**

#### Fix Async Lifecycle Hooks
```typescript
// Incorrect - not handling async properly
protected async onBeforeMount(): Promise<void> {
    await this.loadData(); // May not complete before mount
}

// Correct - ensure async operations complete
protected async onBeforeMount(): Promise<void> {
    try {
        await this.loadData();
    } catch (error) {
        this.handleError(error, 'lifecycle onBeforeMount');
    }
}
```

#### Fix Error Lifecycle Hook
```typescript
// Incorrect - no error handling in error hook
protected onError(error: Error): void {
    console.error(error); // Error hook itself might throw
}

// Correct - safe error handling
protected onError(error: Error, errorInfo: { componentStack: string }): void {
    try {
        // Safe error handling logic
        this.setState({ hasError: true, errorMessage: error.message });
    } catch (hookError) {
        // Fallback error handling
        console.error('Error in error handler:', hookError);
    }
}
```

**Verification:**
- All lifecycle hooks are called at correct times
- Async operations complete properly
- Errors are handled gracefully

## Redux-like Store System Issues

### Store Type Errors

**Symptoms:**
- TypeScript errors with store actions and reducers
- Middleware type mismatches
- Dispatch function type issues

**Cause:**
- Incorrect action type definitions
- Missing type parameters on store functions
- Middleware API type mismatches

**Solutions:**

#### Fix Action Type Definitions
```typescript
// Incorrect - missing BaseAction extension
interface MyAction {
    type: string;
    payload?: any;
}

// Correct - extend BaseAction
interface MyAction extends BaseAction<'MY_ACTION', { data: string }> {
    type: 'MY_ACTION';
    payload: { data: string };
}
```

#### Fix Store Type Parameters
```typescript
// Incorrect - missing type parameters
const store = createStore(reducer);

// Correct - specify all types
const store = createStore<AppState, AppAction>(reducer, initialState);
```

#### Fix Middleware Types
```typescript
// Incorrect - wrong middleware signature
const myMiddleware = (store) => (next) => (action) => next(action);

// Correct - proper middleware typing
const myMiddleware: Middleware<AppState, AppAction> = (api) => (next) => (action) => {
    // api has proper typing
    console.log('Action:', action.type);
    return next(action);
};
```

**Verification:**
- Store dispatches actions without type errors
- Reducers receive correctly typed actions
- Middleware has proper API access

### State Update Issues

**Symptoms:**
- State not updating after dispatch
- Subscribers not being notified
- Reducer not receiving actions

**Cause:**
- Incorrect reducer implementation
- State mutation instead of immutability
- Missing return statement in reducer

**Solutions:**

#### Fix Reducer Implementation
```typescript
// Incorrect - mutating state
const reducer = (state, action) => {
    switch (action.type) {
        case 'INCREMENT':
            state.value += 1; // Mutation!
            return state;
        default:
            return state;
    }
};

// Correct - immutable updates
const reducer = (state, action) => {
    switch (action.type) {
        case 'INCREMENT':
            return { ...state, value: state.value + 1 };
        default:
            return state;
    }
};
```

#### Fix Missing Return Statement
```typescript
// Incorrect - missing return in some cases
const reducer = (state, action) => {
    switch (action.type) {
        case 'INCREMENT':
            return { ...state, value: state.value + 1 };
        // Missing return statement - returns undefined!
    }
};

// Correct - always return state
const reducer = (state, action) => {
    switch (action.type) {
        case 'INCREMENT':
            return { ...state, value: state.value + 1 };
        default:
            return state; // Always return state
    }
};
```

**Verification:**
- State updates correctly after dispatch
- All subscribers are notified of changes
- Reducer handles all action types

### DevTools Integration Issues

**Symptoms:**
- Redux DevTools not connecting
- Time travel not working
- Actions not appearing in DevTools

**Cause:**
- DevTools not available in environment
- Incorrect DevTools configuration
- Missing DevTools setup

**Solutions:**

#### Fix DevTools Availability Check
```typescript
// Incorrect - assuming DevTools exists
const devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect();

// Correct - check availability first
const devTools = window.__REDUX_DEVTOOLS_EXTENSION__?.connect({
    name: 'My App Store'
});
```

#### Fix DevTools Configuration
```typescript
// Incorrect - minimal configuration
const store = createStore(reducer, { devTools: true });

// Correct - proper DevTools setup
const store = createStore(reducer, initialState, {
    devTools: true // This is sufficient for basic setup
});
```

**Verification:**
- DevTools extension connects successfully
- Actions appear in DevTools timeline
- Time travel works correctly

## Internationalization Issues

### String Key Errors

**Symptoms:**
- Missing translation key errors
- TypeScript errors for string keys
- Runtime key not found issues

**Cause:**
- Non-existent string keys
- Incorrect key paths
- Missing locale files

**Solutions:**

#### Fix String Key Usage
```typescript
// Incorrect - key doesn't exist
const text = t('nonexistent.key');

// Correct - use existing key
const text = t('common.loading');
```

#### Fix Nested Key Access
```typescript
// Incorrect - wrong path
const text = t('auth.loginButton');

// Correct - check actual key structure
const text = t('auth.signIn');
```

#### Add Missing String Keys
```typescript
// In your string resource file
export const STRINGS = {
    common: {
        loading: 'Loading...',
        // Add other missing keys
    }
} as const;
```

**Verification:**
- All translation keys resolve successfully
- No runtime missing key errors
- TypeScript provides autocomplete for valid keys

### Locale Loading Issues

**Symptoms:**
- Wrong locale being used
- Fallback locale not working
- Locale switching not functioning

**Cause:**
- Incorrect locale configuration
- Missing locale files
- Browser locale detection issues

**Solutions:**

#### Fix Locale Configuration
```typescript
// Incorrect - hardcoded locale
import i18n from './i18n';
i18n.setLocale('en');

// Correct - detect browser locale
import i18n from './i18n';
i18n.initializeI18n(); // Auto-detects browser locale
```

#### Fix Fallback Locale
```typescript
// Incorrect - no fallback configured
i18n.configureI18n({ locale: 'invalid-locale' });

// Correct - configure fallback
i18n.configureI18n({
    locale: 'en',
    fallbackLocale: 'en'
});
```

**Verification:**
- Correct locale is detected and used
- Fallback locale works when primary locale fails
- Locale switching updates all translations

### Parameter Interpolation Issues

**Symptoms:**
- Parameters not being interpolated in strings
- Incorrect parameter syntax
- Missing parameter values

**Cause:**
- Wrong interpolation syntax
- Missing parameter values
- Incorrect parameter types

**Solutions:**

#### Fix Interpolation Syntax
```typescript
// Incorrect - wrong syntax
const text = t('welcome.message', { name: 'John' }); // String doesn't have {{name}}

// Correct - check string has interpolation markers
const text = t('common.welcome', { name: 'John' }); // String has {{name}}
```

#### Fix Parameter Types
```typescript
// Incorrect - passing wrong types
const text = t('common.count', { count: 'not a number' });

// Correct - pass correct types
const text = t('common.count', { count: 42 });
```

**Verification:**
- Parameters are correctly interpolated
- No console warnings about missing parameters
- String displays with substituted values

## Testing Issues

### BaseComponent Testing Problems

**Symptoms:**
- Cannot access protected methods in tests
- Shadow DOM not available in test environment
- Component lifecycle not working in tests

**Cause:**
- Test environment not properly configured
- Missing test utilities for component testing
- Incorrect component instantiation in tests

**Solutions:**

#### Fix Test Environment Setup
```typescript
// Incorrect - no JSDOM configuration
describe('MyComponent', () => {
    // Tests here
});

// Correct - proper JSDOM setup
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
```

#### Fix Component Testing Utilities
```typescript
// Create test helper for protected method access
class TestableComponent extends BaseComponent {
    public getTestProps() { return this.props; }
    public getTestState() { return this.state; }
    public callUpdateProps(props: any) { this.updateProps(props); }
    public callSetState(state: any) { this.setState(state); }
}

// Use in tests
const component = new TestableComponent();
const props = component.getTestProps();
```

**Verification:**
- Tests can access component internals safely
- Shadow DOM works correctly in test environment
- Component lifecycle functions properly in tests

### Store Testing Issues

**Symptoms:**
- Store tests failing due to type issues
- Middleware tests not working
- DevTools integration failing in tests

**Cause:**
- Incorrect store typing in tests
- Missing store test utilities
- DevTools not mocked in test environment

**Solutions:**

#### Fix Store Test Types
```typescript
// Incorrect - loose typing
const store = createStore(reducer);

// Correct - strict typing
const store = createStore<AppState, AppAction>(reducer, initialState);
```

#### Mock DevTools in Tests
```typescript
// Setup DevTools mock
const mockDevTools = {
    connect: jest.fn().mockReturnValue({
        subscribe: jest.fn(),
        init: jest.fn(),
        send: jest.fn(),
    }),
};

Object.defineProperty(window, '__REDUX_DEVTOOLS_EXTENSION__', {
    value: mockDevTools,
    writable: true,
});
```

**Verification:**
- Store tests pass with proper typing
- Middleware tests work correctly
- DevTools integration doesn't break tests

## Performance Issues

### BaseComponent Performance Problems

**Symptoms:**
- Components re-rendering too frequently
- Slow initial render times
- Memory leaks in component lifecycle

**Cause:**
- Missing shouldComponentUpdate logic
- Inefficient render methods
- Not cleaning up event listeners

**Solutions:**

#### Optimize Re-rendering
```typescript
// Add performance monitoring
protected performRender(): void {
    const startTime = performance.now();

    // Your render logic here

    const endTime = performance.now();
    if (endTime - startTime > 16) { // More than one frame
        console.warn('Slow render detected:', endTime - startTime);
    }
}
```

#### Fix Event Listener Cleanup
```typescript
// Incorrect - not cleaning up
protected setupEventListeners(): void {
    this.addTypedEventListener('click', this.handleClick);
}

// Correct - proper cleanup
protected cleanup(): void {
    // Event listeners are automatically cleaned up by BaseComponent
    // Add any additional cleanup here
    super.cleanup();
}
```

**Verification:**
- Components render efficiently
- No memory leaks detected
- Event listeners are properly cleaned up

### Store Performance Issues

**Symptoms:**
- Store updates causing performance bottlenecks
- Too many subscribers being notified
- Large state objects causing memory issues

**Cause:**
- Inefficient reducer logic
- Too many store subscribers
- Large state objects not optimized

**Solutions:**

#### Optimize Reducers
```typescript
// Incorrect - creating new objects unnecessarily
const reducer = (state, action) => {
    switch (action.type) {
        case 'UPDATE_ITEM':
            return {
                ...state,
                items: state.items.map(item => ({ ...item })) // Unnecessary spreading
            };
        default:
            return state;
    }
};

// Correct - only update what's necessary
const reducer = (state, action) => {
    switch (action.type) {
        case 'UPDATE_ITEM':
            const { itemId, updates } = action.payload;
            return {
                ...state,
                items: state.items.map(item =>
                    item.id === itemId ? { ...item, ...updates } : item
                )
            };
        default:
            return state;
    }
};
```

#### Optimize Subscribers
```typescript
// Incorrect - subscribing to everything
store.subscribe((state) => {
    // This runs on every state change
    updateEntireUI(state);
});

// Correct - use selectors for specific data
const specificSelector = createSelector(
    [getSpecificData],
    (data) => data
);

store.subscribe(() => {
    const data = specificSelector(store.getState());
    updateSpecificUI(data);
});
```

**Verification:**
- Store updates are fast and efficient
- Memory usage is optimized
- Subscribers only notified when necessary

If issues persist after checking this guide, please verify you're using the latest build scripts and refer to the updated documentation in README.md and ARCHITECTURE.md.