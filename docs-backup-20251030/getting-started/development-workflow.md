# Development Workflow

## Branching Strategy

The project follows a Git Flow branching model:

```
main (production) ← develop ← feature/feature-name
                        ← hotfix/bug-name
                        ← release/v1.2.0
```

### Branch Types

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/***: Individual feature development
- **hotfix/***: Critical bug fixes for production
- **release/***: Release preparation and testing

## Development Environment Setup

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd student-profiles-pwa
   ./build.sh
   ```

2. **Create feature branch:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

3. **Start development servers:**
   ```bash
   ./run.sh
   ```

## Code Development Workflow

For detailed SCSS development guidelines and architecture documentation, see:
- **[SCSS Architecture Guide](../development/SCSS_ARCHITECTURE.md)**: Technical architecture and build process
- **[SCSS Style Guide](../development/SCSS_STYLE_GUIDE.md)**: Coding standards and best practices
- **[SCSS Action Plan](../development/SCSS_ACTION_PLAN.md)**: Strategic improvement roadmap

### Backend Development

1. **Create new endpoint:**
   ```python
   # backend/routers/students.py
   @router.post("/bulk-import")
   async def bulk_import_students(file: UploadFile = File(...)):
       # Implementation
   ```

2. **Add business logic:**
   ```python
   # backend/services/student_service.py
   async def bulk_import_students(self, file_content: bytes) -> List[Student]:
       # Parse and validate data
       # Return processed students
   ```

3. **Update models if needed:**
   ```python
   # backend/models.py
   class BulkImportResponse(BaseModel):
       imported: int
       failed: int
       errors: List[str]
   ```

4. **Add tests:**
   ```python
   # backend/test_main.py
   def test_bulk_import_students():
       # Test implementation
   ```

### Frontend Development

1. **Create new component:**
   ```typescript
   // frontend/src/ts/components/new-component.ts
   export class NewComponent extends BaseComponent {
       // Implementation
   }
   ```

2. **Add styling:**
   ```scss
   // frontend/src/scss/components/_new-component.scss
   .new-component {
       // Styles
   }
   ```

3. **Update router if needed:**
   ```typescript
   // frontend/src/ts/router.ts
   routes.set('/new-page', 'new-manager');
   ```

4. **Add tests:**
   ```typescript
   // frontend/__tests__/new-component.test.ts
   describe('NewComponent', () => {
       // Tests
   });
   ```

## Testing Strategy

### Unit Testing

- **Backend:** pytest with async support
- **Frontend:** Jest with JSDOM environment
- **Coverage:** Minimum 80% coverage required

```bash
# Run all tests
./test.sh

# Run backend tests only
./test_backend.sh

# Run frontend tests only
./test_frontend.sh

# Run with coverage
pytest --cov=backend --cov-report=html
```

### Integration Testing

- **API Integration:** Test service-to-service communication
- **Database Integration:** Verify data persistence and retrieval
- **Component Integration:** Test component interactions

### End-to-End Testing

- **Browser Automation:** Selenium WebDriver
- **User Journeys:** Complete workflow testing
- **PWA Features:** Offline functionality and service workers

```bash
# Run E2E tests
python e2e_tests.py
```

## Code Quality Standards

### Python Standards (PEP 8)

```python
# Good: Descriptive names, proper spacing
def calculate_student_fees(
    base_fees: float,
    discount_percentage: float = 0.0
) -> float:
    """Calculate final fees after applying discount."""
    return base_fees * (1 - discount_percentage)

# Avoid: Poor naming, no type hints
def calc_fee(f, d=0):
    return f*(1-d)
```

### TypeScript Standards

```typescript
// Good: Type safety, clear interfaces
interface StudentData {
    readonly id: number;
    name: string;
    fees: number;
}

export class StudentService {
    async getStudents(params: PaginationParams): Promise<StudentList> {
        // Implementation
    }
}

// Avoid: Any types, unclear interfaces
export class StudentService {
    async getStudents(params: any): Promise<any> {
        // Implementation
    }
}
```

### SCSS Standards

```scss
// Good: Modular, BEM-like naming
.student-card {
    &__header {
        display: flex;
        align-items: center;
    }

    &__name {
        font-weight: bold;
        margin: 0;
    }
}

// Avoid: Global styles, !important
.student-card .name {
    font-weight: bold !important;
}
```

## Commit Message Conventions

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes
- **refactor**: Code refactoring
- **test**: Test additions/modifications
- **chore**: Maintenance tasks

### Examples

```
feat(auth): add JWT refresh token support

fix(students): resolve pagination bug in student list

docs(api): update endpoint documentation

test(charts): add unit tests for chart components
```

## Pull Request Process

1. **Create PR:**
   - Branch from feature branch to develop
   - Descriptive title and detailed description
   - Link to related issues

2. **Code Review Checklist:**
   - [ ] Tests pass locally
   - [ ] Code coverage maintained
   - [ ] Linting passes
   - [ ] Documentation updated
   - [ ] Security review completed

3. **Review Process:**
   - Minimum 1 reviewer approval required
   - Address all review comments
   - CI/CD checks must pass

4. **Merge Strategy:**
   - Squash merge for feature branches
   - Merge commit for releases
   - Delete feature branches after merge

## Release Process

1. **Version Bump:**
   ```bash
   # Update version in package.json and setup.py
   npm version patch  # or minor/major
   ```

2. **Create Release Branch:**
   ```bash
   git checkout -b release/v1.2.0 develop
   ```

3. **Testing:**
   ```bash
   ./test.sh  # All tests pass
   ./build.sh # Build successful
   ```

4. **Tag Release:**
   ```bash
   git tag -a v1.2.0 -m "Release version 1.2.0"
   git push origin v1.2.0
   ```

5. **Deploy:**
   - Merge release branch to main
   - Deploy to production environment
   - Update documentation

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.8'
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Run tests
        run: ./test.sh
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Development Tools

### Recommended IDE Setup

**VS Code Extensions:**
- Python (Microsoft)
- TypeScript Importer
- Prettier
- ESLint
- SCSS IntelliSense
- GitLens

**VS Code Settings:**
```json
{
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,
    "typescript.preferences.importModuleSpecifier": "relative",
    "scss.validate": true,
    "editor.formatOnSave": true
}
```

### Debugging Configuration

**Backend Debugging:**
```json
{
    "name": "Python: FastAPI",
    "type": "python",
    "request": "launch",
    "module": "uvicorn",
    "args": ["main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
}
```

**Frontend Debugging:**
```json
{
    "name": "Launch Frontend",
    "type": "node",
    "request": "launch",
    "program": "${workspaceFolder}/frontend/node_modules/.bin/vite",
    "args": ["--host", "0.0.0.0", "--port", "5173"]
}
```

## Build Scripts

1. **Full application build**:
   ```bash
   ./build.sh
   ```
   - Creates virtual environment for backend
   - Installs Python dependencies
   - Sets up database schema
   - Installs Node.js dependencies
   - Builds TypeScript for frontend
   - Runs linting (if available)

## Running Tests

1. **Full test suite (recommended)**:
   ```bash
   ./test.sh
   ```
   Runs all backend, frontend, and E2E tests with colored output and comprehensive reporting.

2. **Backend unit tests with coverage**:
   ```bash
   ./test_backend.sh
   ```
   - Tests API endpoints with comprehensive validation
   - Validates data processing, error handling, and rate limiting
   - Includes pagination, input validation, and CRUD operations
   - Generates detailed coverage reports in `backend_coverage/`

3. **Frontend unit tests with coverage**:
   ```bash
   ./test_frontend.sh
   ```
   - Tests UI interactions and DOM manipulation for TypeScript components
   - Validates custom elements, Shadow DOM, accessibility features
   - Tests API integration, error handling, and component interactions
   - Uses JSDOM for browser environment simulation
   - Generates coverage reports in `frontend_coverage/`

4. **End-to-end tests with coverage**:
   ```bash
   python e2e_tests.py
   ```
   - Tests complete application flow from browser to backend
   - Validates user interactions, responsive design, and PWA features
   - Includes API testing, CRUD operations, and error scenarios
   - Generates backend coverage reports in `e2e_coverage/`

## Building the Frontend

```bash
cd frontend && npm run build
```

This compiles SCSS to CSS and TypeScript to JavaScript with ES2015 modules for better browser compatibility. For development with live SCSS watching:

```bash
cd frontend && npm run watch:scss
```

For SCSS compilation in production builds:

```bash
cd frontend && npm run build:scss
```

This processes modular SCSS files from `src/scss/` directory structure and compiles them to optimized CSS with compression. SCSS compilation has been updated to resolve Dart Sass 2.0.0 deprecation warnings for division operators.

## Stopping Servers

```bash
pkill -f uvicorn && pkill -f "http.server"
```

## Prerequisites

- Python 3.8+ with pip
- Node.js and npm
- ChromeDriver (for E2E tests)
- Git (optional, for cloning)

## Testing Strategy

The application includes comprehensive testing at multiple levels:

### Unit Tests

- **Backend**: Tests API endpoints, data validation, pagination, and business logic (pytest)
  - **Coverage**: Generated automatically with pytest-cov
  - **Coverage Report**: Available at `backend_coverage/htmlcov/index.html`
  - **XML Report**: Available at `backend_coverage.xml` for CI/CD integration

- **Frontend**: Tests UI components, API integration, and user interactions (Jest + JSDOM)
  - **Coverage**: 84% statements, 65% branches, 72% functions, 86% lines
  - **Test Suite**: 10 tests (9 passing, 1 skipped) covering core functionality, data validation, chart components, and error handling
  - **Coverage Report**: Available at `frontend_coverage/lcov-report/index.html`
  - **Status**: All tests passing with comprehensive coverage
  - **Chart Component Tests**: Comprehensive unit tests for custom chart component with bar/pie chart functionality
  - **AI Chat Bot**: Integrated AI assistant for school management queries with floating chat button and modal interface
  - **Page Manager Integration**: Page-manager controllers now handle specialized logic for each application section

### Integration Tests

- **API Testing**: Validates request/response cycles and data transformation
- **Component Integration**: Ensures frontend components work with backend APIs
- **Data Flow**: CSV processing → API → Frontend rendering

### End-to-End Tests

- **Browser Automation**: Simulates real user interactions using Selenium WebDriver
- **Full Application Flow**: Tests complete user journeys from page load to data display
- **Error Scenarios**: Validates error handling and recovery mechanisms
- **PWA Features**: Service worker registration and offline functionality
- **Coverage**: Backend code coverage captured during E2E test execution
  - **Coverage Report**: Available at `e2e_coverage/htmlcov/index.html`
  - **XML Report**: Available at `e2e_coverage/coverage.xml`

### Test Coverage

- **Backend Coverage**: API endpoints, data validation, pagination, error handling - see `backend_coverage/`
- **Frontend Coverage**: 84% statements, 65% branches, 72% functions, 86% lines - see `frontend_coverage/`
- **E2E Coverage**: Complete user journeys, browser automation, error scenarios with backend code coverage - see `e2e_coverage/`
- **Dual Database Testing**: test_dual_database.py provides comprehensive cross-database compatibility testing (SQLite/PostgreSQL)
- **Integration Testing**: API-to-UI data flow, service worker functionality
- **Cross-browser Compatibility**: JSDOM environment simulation

### Coverage Reports

Coverage reports are automatically generated when running tests:

```bash
# Run all tests with coverage
./test_backend.sh    # Backend coverage: backend_coverage/
./test_frontend.sh   # Frontend coverage: frontend_coverage/
python e2e_tests.py  # E2E coverage: e2e_coverage/
```

**Report Locations:**
- **Backend**: `backend_coverage/htmlcov/index.html`
- **Frontend**: `frontend_coverage/lcov-report/index.html`
- **E2E**: `e2e_coverage/htmlcov/index.html`

**CI/CD Integration:**
- XML reports available: `backend_coverage.xml`, `e2e_coverage/coverage.xml`

## Additional Scripts

- **`npm-install-32988.sh`**: Automated NPM installation script for frontend dependencies
- **`test_backend.sh`**: Dedicated script for running backend tests with coverage
- **`test_frontend.sh`**: Dedicated script for running frontend tests with coverage

## Component Documentation

For detailed information about specific components:

- **[Backend Documentation](../backend/README.md)**: API endpoints, data processing, setup instructions
- **[Frontend Documentation](../frontend/README.md)**: PWA features, development setup, architecture details

This development workflow provides a structured approach to contributing to the Student Profiles PWA project while maintaining code quality and consistency.