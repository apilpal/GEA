# Student Profiles PWA - Developer Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [API Reference](#api-reference)
6. [Frontend Components](#frontend-components)
7. [Styling Guide](#styling-guide)
8. [Testing Strategy](#testing-strategy)
9. [Contributing Guidelines](#contributing-guidelines)
10. [Troubleshooting](#troubleshooting)
11. [Security](#security)
12. [Performance](#performance)

## Introduction

### Project Overview

The Student Profiles Progressive Web App (PWA) is a comprehensive school management system that enables educational institutions to manage student profiles, driver assignments, and transportation routes. The application provides a modern, responsive web interface with full CRUD operations, real-time analytics, and offline capabilities.

### Purpose and Scope

This application serves multiple user types within educational institutions:

- **School Administrators**: Manage student data, driver assignments, and system analytics
- **Teachers**: Access student information and academic records
- **Drivers**: View assigned routes and student pickup/drop-off details
- **IT Administrators**: Deploy and maintain the application infrastructure

### Technology Stack

#### Backend
- **Framework**: FastAPI (Python async web framework)
- **Database**: Dual support for SQLite (development) and PostgreSQL (production)
- **ORM**: SQLAlchemy 2.0 with async support
- **Authentication**: JWT tokens with bcrypt password hashing
- **Migrations**: Alembic for database schema versioning
- **Rate Limiting**: SlowAPI for request throttling
- **Documentation**: Automatic OpenAPI/Swagger generation

#### Frontend
- **Language**: TypeScript for type safety
- **Architecture**: Custom Web Components with Shadow DOM
- **Styling**: Modular SCSS with CSS custom properties
- **Build Tool**: Vite for fast development and optimized production builds
- **Testing**: Jest with JSDOM environment
- **PWA Features**: Service Worker for offline functionality

#### Development Tools
- **Version Control**: Git with Git Flow branching strategy
- **Testing**: pytest (backend), Jest (frontend), Selenium (E2E)
- **Code Quality**: Black (Python), ESLint/Stylelint (frontend)
- **Documentation**: Comprehensive README and API docs

### Architecture Overview

The application follows a modern layered architecture:

```
┌─────────────────┐
│   Frontend PWA  │ ← TypeScript, Web Components, SCSS
├─────────────────┤
│   FastAPI Backend│ ← Python, Async Operations
├─────────────────┤
│   Database Layer │ ← SQLite/PostgreSQL with SQLAlchemy
├─────────────────┤
│   Infrastructure │ ← Docker, CI/CD, Monitoring
└─────────────────┘
```

#### Data Flow
1. User interacts with PWA interface
2. Frontend makes API calls to FastAPI backend
3. Backend processes requests with business logic
4. Data operations performed via SQLAlchemy ORM
5. Responses returned through the API layer
6. Frontend updates UI with real-time data

## Getting Started

### Prerequisites

#### System Requirements
- **Python**: 3.8 or higher
- **Node.js**: 16.x or higher with npm
- **Git**: For version control
- **ChromeDriver**: For end-to-end testing (automatically handled by scripts)

#### Optional Dependencies
- **PostgreSQL**: For production database deployment
- **Chrome Browser**: For manual E2E testing

### Installation Steps

#### Automated Setup (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd student-profiles-pwa
   ```

2. **Run the build script:**
   ```bash
   ./build.sh
   ```
   This script performs:
   - Creates Python virtual environment
   - Installs backend dependencies from `backend/requirements.txt`
   - Sets up database schema with Alembic migrations
   - Installs frontend dependencies from `frontend/package.json`
   - Builds TypeScript and SCSS assets

3. **Start the application:**
   ```bash
   ./run.sh
   ```
   This launches:
   - Backend API server on `http://127.0.0.1:8000`
   - Frontend PWA on `http://127.0.0.1:5173`

#### Manual Setup

##### Backend Setup
1. Navigate to backend directory: `cd backend`
2. Create virtual environment: `python -m venv venv`
3. Activate environment: `source venv/bin/activate` (Windows: `venv\Scripts\activate`)
4. Install dependencies: `pip install -r requirements.txt`
5. Set up environment variables (copy `.env.example` to `.env.development`)
6. Run migrations: `python migrate.py upgrade head`
7. Start server: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

##### Frontend Setup
1. Navigate to frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Build assets: `npm run build`
4. Start development server: `npm run dev`

### Environment Configuration

#### Backend Environment Variables
Create `.env.development` or `.env.production` in the `backend/` directory:

```bash
# Required for JWT security
SECRET_KEY=your-256-bit-secret-key-here

# Optional token settings
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database configuration
DATABASE_URL=sqlite+aiosqlite:///./students.db
# For PostgreSQL: DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname

# Optional settings
LOG_LEVEL=INFO
FRONTEND_PORT=5173
```

#### Frontend Environment Variables
Create `.env.development` or `.env.production` in the `frontend/` directory:

```bash
# API configuration
VITE_API_BASE_URL=http://127.0.0.1:8000

# Environment settings
NODE_ENV=development
```

### Verification

After setup, verify the installation:

1. **API Health Check:**
   ```bash
   curl http://127.0.0.1:8000/api/health
   ```

2. **Frontend Access:**
   - Open `http://127.0.0.1:5173` in browser
   - Verify PWA loads and displays student data

3. **API Documentation:**
   - Interactive docs: `http://127.0.0.1:8000/docs`
   - Alternative docs: `http://127.0.0.1:8000/redoc`

4. **Run Tests:**
   ```bash
   ./test.sh
   ```

## Project Structure

### Root Directory Structure

```
student-profiles-pwa/
├── .gitignore              # Git ignore patterns
├── build.sh                # Automated build script
├── run.sh                  # Development server launcher
├── test.sh                 # Test runner script
├── backend/                # FastAPI backend application
├── frontend/               # Progressive Web App frontend
├── docs/                   # Documentation files
├── images/                 # Static image assets
└── e2e_tests.py           # End-to-end test suite
```

### Backend Structure (`backend/`)

```
backend/
├── alembic/                    # Database migration management
│   ├── env.py                  # Migration environment
│   ├── versions/               # Migration scripts
│   └── script.py.mako          # Migration templates
├── routers/                    # API route definitions
│   ├── __init__.py
│   ├── students.py             # Student CRUD endpoints
│   ├── drivers.py              # Driver management endpoints
│   ├── reports.py              # Analytics endpoints
│   ├── charts.py               # Chart data endpoints
│   ├── auth.py                 # Authentication endpoints
│   └── __pycache__/            # Python bytecode cache
├── services/                   # Business logic layer
│   ├── __init__.py
│   ├── student_service.py      # Student operations
│   ├── driver_service.py       # Driver operations
│   ├── report_service.py       # Analytics logic
│   ├── chart_service.py        # Chart data preparation
│   └── auth_service.py         # Authentication logic
├── data/                       # CSV data files
│   └── drivers/                # Driver CSV files
├── server/                     # Server utilities
│   └── utils/                  # Helper utilities
├── main.py                     # FastAPI application entry point
├── models.py                   # SQLAlchemy models and Pydantic schemas
├── config.py                   # Application configuration
├── utils.py                    # Utility functions
├── requirements.txt            # Python dependencies
├── test_*.py                   # Unit and integration tests
├── build.py                    # Database setup script
├── migrate.py                  # Migration management tool
├── migrate_data.py             # CSV to database migration
├── alembic.ini                 # Alembic configuration
├── .env.example                # Environment template
└── students.db                 # SQLite database (generated)
```

### Frontend Structure (`frontend/`)

```
frontend/
├── index.html                  # Main PWA page
├── styles.scss                 # Main SCSS entry point
├── styles.css                  # Compiled CSS
├── styles.css.map              # CSS source map
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker
├── package.json                # Node.js dependencies
├── tsconfig.json               # TypeScript configuration
├── vite.config.js              # Vite build configuration
├── jest.setup.js               # Jest test setup
├── mock-server.js              # Mock API server for testing
├── src/
│   ├── ts/                     # TypeScript source code
│   │   ├── app-controller.ts        # Central application controller
│   │   ├── router.ts                # Client-side routing
│   │   ├── script.ts                # Main application entry point
│   │   ├── page-managers/           # Page-specific controllers
│   │   │   ├── dashboard-manager.ts     # Dashboard logic
│   │   │   ├── students-manager.ts      # Students page logic
│   │   │   ├── transport-manager.ts     # Transport page logic
│   │   │   └── reports-manager.ts       # Reports page logic
│   │   ├── components/              # Custom web components
│   │   │   ├── base-component.ts        # Base component class
│   │   │   ├── students/                # Student components
│   │   │   │   ├── student-table.ts         # Data table component
│   │   │   │   ├── student-profile-card.ts  # Profile display
│   │   │   │   └── index.ts
│   │   │   ├── charts/                  # Chart components
│   │   │   │   ├── chart-component.ts       # Chart visualization
│   │   │   │   └── index.ts
│   │   │   ├── drivers/                 # Driver components
│   │   │   │   ├── driver-info.ts           # Driver information
│   │   │   │   └── index.ts
│   │   │   ├── auth/                    # Authentication components
│   │   │   │   ├── login-component.ts       # Login form
│   │   │   │   ├── logout-component.ts      # Logout button
│   │   │   │   └── index.ts
│   │   │   └── core/                    # Core components
│   │   │       ├── base-component.ts        # Base component
│   │   │       └── loading-component.ts     # Loading indicator
│   │   ├── services/                # Service layer
│   │   │   ├── api-service.ts           # HTTP client
│   │   │   ├── auth-service.ts          # Authentication service
│   │   │   └── student-service.ts       # Student data service
│   │   ├── utils/                   # Utility functions
│   │   │   └── error-handler.ts         # Error handling
│   │   └── icons.ts                 # Icon components
│   └── scss/                    # Modular SCSS architecture
│       ├── base/                 # Base styles and utilities
│       │   ├── _base.scss         # Base element styles
│       │   ├── _variables.scss    # CSS custom properties
│       │   ├── _mixins.scss       # SCSS mixins
│       │   └── _reset.scss        # CSS reset
│       ├── components/            # Component-specific styles
│       │   ├── _student-table.scss     # Student table styles
│       │   ├── _student-profile-card.scss # Profile card styles
│       │   ├── _chart-component.scss   # Chart styles
│       │   ├── _driver-info.scss       # Driver info styles
│       │   └── _icons.scss             # Icon styles
│       ├── layout/                # Layout and grid systems
│       │   ├── _app.scss           # Main app layout
│       │   └── _navigation.scss    # Navigation styles
│       ├── pages/                 # Page-specific styles
│       │   ├── _dashboard.scss      # Dashboard page styles
│       │   ├── _students.scss       # Students page styles
│       │   ├── _transport.scss      # Transport page styles
│       │   └── _reports.scss        # Reports page styles
│       └── utilities/              # Utility classes
│           ├── _buttons.scss        # Button utilities
│           ├── _forms.scss          # Form utilities
│           ├── _responsive.scss     # Responsive utilities
│           └── _tables.scss         # Table utilities
├── __tests__/                 # Unit test files
│   ├── api-service.test.ts     # API service tests
│   ├── app-controller.test.ts  # App controller tests
│   └── component tests...      # Component-specific tests
└── node_modules/              # NPM dependencies (generated)
```

### Documentation Structure (`docs/`)

```
docs/
├── index.md                   # Main documentation entry point
├── getting-started/
│   ├── README.md             # Main project overview and setup
│   └── faqs.md               # Frequently asked questions
├── development/
│   ├── ARCHITECTURE.md       # System architecture details
│   ├── developer-guide.md    # This comprehensive guide
│   ├── backend-README.md     # Backend-specific documentation
│   └── frontend-README.md    # Frontend PWA documentation
├── api/
│   └── backend-DATABASE_README.md # Database and API documentation
├── troubleshooting/
│   ├── TROUBLESHOOTING.md    # Common issues and solutions
│   └── bugs.md               # Bug reports and known issues
├── deployment/               # Deployment documentation (future)
├── testing/
│   └── frontend-COVERAGE_REPORT.md # Test coverage reports
└── *.md                      # Additional documentation files
```

## Development Workflow

### Branching Strategy

The project uses Git Flow branching model:

```
main (production) ← develop ← feature/feature-name
                        ← hotfix/bug-name
                        ← release/v1.2.0
```

#### Branch Types
- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/***: Individual feature development
- **hotfix/***: Critical bug fixes for production
- **release/***: Release preparation and testing

### Development Environment Setup

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

### Code Development Workflow

#### Backend Development

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
   async def bulk_import_students(self, file_content: bytes) -> BulkImportResult:
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

#### Frontend Development

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

### Testing Strategy

#### Unit Testing
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

#### Integration Testing
- **API Integration:** Test service-to-service communication
- **Database Integration:** Verify data persistence and retrieval
- **Component Integration:** Test component interactions

#### End-to-End Testing
- **Browser Automation:** Selenium WebDriver
- **User Journeys:** Complete workflow testing
- **PWA Features:** Offline functionality and service workers

```bash
# Run E2E tests
python e2e_tests/tests/e2e_tests.py
```

### Code Quality Standards

#### Python Standards (PEP 8)
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

#### TypeScript Standards
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

#### SCSS Standards
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

### Commit Message Conventions

```
type(scope): description

[optional body]

[optional footer]
```

#### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes
- **refactor**: Code refactoring
- **test**: Test additions/modifications
- **chore**: Maintenance tasks

#### Examples
```
feat(auth): add JWT refresh token support

fix(students): resolve pagination bug in student list

docs(api): update endpoint documentation
```

### Pull Request Process

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

### Release Process

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

### Continuous Integration

#### GitHub Actions Workflow
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

## API Reference

### Authentication Endpoints

All API endpoints except `/auth/login` and `/auth/refresh` require authentication. Include the access token in the `Authorization` header or as an HttpOnly cookie.

#### User Authentication
- **POST** `/auth/login`
  - Authenticate user credentials
  - **Request Body:**
    ```json
    {
      "username_or_email": "admin@example.com",
      "password": "securepassword"
    }
    ```
  - **Response:** User profile with authentication cookies set

- **POST** `/auth/logout`
  - Clear authentication session
  - **Response:** Success confirmation with cookies cleared

- **POST** `/auth/refresh`
  - Refresh access token using valid refresh token
  - **Response:** New access token

- **GET** `/auth/me`
  - Get current authenticated user profile
  - **Response:** Complete user information

#### User Management (Admin Only)
- **POST** `/auth/register`
  - Create new user account
  - **Request Body:**
    ```json
    {
      "username": "newuser",
      "email": "user@example.com",
      "password": "securepassword",
      "role": "teacher"
    }
    ```

### Student Management Endpoints

#### Core CRUD Operations
- **GET** `/api/students`
  - Retrieve paginated student list
  - **Query Parameters:**
    - `skip` (integer, default: 0)
    - `limit` (integer, default: 100, max: 1000)
  - **Response:**
    ```json
    {
      "data": [...],
      "total": 150,
      "skip": 0,
      "limit": 100
    }
    ```

- **GET** `/api/students/{student_id}`
  - Get detailed student profile
  - **Response:** Complete student information including contact details and location

- **POST** `/api/students`
  - Create new student record
  - **Request Body:** Complete student data object

- **PUT** `/api/students/{student_id}`
  - Update existing student record
  - **Request Body:** Partial student data for updates

- **DELETE** `/api/students/{student_id}`
  - Remove student record
  - **Response:** Success confirmation

#### Advanced Student Operations
- **GET** `/api/students/search`
  - Search students by name, father name, or other fields
  - **Query Parameter:** `q` (search query)
  - **Response:** Filtered student list

### Driver Management Endpoints

- **GET** `/api/drivers`
  - Get all drivers with pagination
  - **Query Parameters:** `skip`, `limit`

- **GET** `/api/drivers/{driver_name}`
  - Get students assigned to specific driver

- **GET** `/api/drivers/{driver_name}/info`
  - Get detailed driver information and statistics

- **POST** `/api/drivers`
  - Create new driver record

- **PUT** `/api/drivers/{driver_name}`
  - Update driver information

### Analytics and Reporting Endpoints

- **GET** `/api/reports/summary`
  - Comprehensive system statistics
  - **Response:**
    ```json
    {
      "total_students": 150,
      "total_drivers": 5,
      "total_revenue": 45000.00,
      "students_by_driver": {...},
      "revenue_by_class": {...}
    }
    ```

- **GET** `/api/reports/students-by-driver`
  - Students organized by driver assignment

- **GET** `/api/reports/revenue-analysis`
  - Revenue breakdown by driver and class

- **GET** `/api/reports/driver-student-stats`
  - Detailed driver-student statistics

### Chart Data Endpoints

- **GET** `/api/charts/student-distribution`
  - Student count by driver for bar charts
  - **Response:**
    ```json
    {
      "labels": ["Driver A", "Driver B", "Driver C"],
      "data": [25, 30, 20]
    }
    ```

- **GET** `/api/charts/revenue-by-driver`
  - Revenue breakdown by driver for pie charts

- **GET** `/api/charts/revenue-by-class`
  - Revenue analysis by class for bar charts

### System Health Endpoints

- **GET** `/api/health`
  - API health check
  - **Response:**
    ```json
    {
      "status": "healthy",
      "timestamp": "2025-10-18T17:08:30Z",
      "version": "1.0.0"
    }
    ```

### Rate Limiting

The API implements rate limiting to prevent abuse:
- **Default Limit:** 30-60 requests per minute per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Frontend Components

### Core Architecture

The frontend uses modern Web Components with Shadow DOM for encapsulation and maintainability. Components are built with TypeScript and follow a consistent architecture pattern.

### Base Component (`BaseComponent`)

All custom elements extend the `BaseComponent` class which provides:

- **Shadow DOM Setup:** Automatic shadow root creation and style attachment
- **Event Handling:** Centralized event listener management
- **Lifecycle Management:** Proper connected/disconnected callback handling
- **Template Rendering:** Consistent rendering pattern
- **Property Management:** Reactive property updates

```typescript
export abstract class BaseComponent extends HTMLElement {
    protected shadow: ShadowRoot;

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.setupStyles();
        this.render();
    }

    protected abstract render(): void;
    protected setupStyles(): void {
        // Component-specific styles
    }
}
```

### Student Components

#### StudentTable Component (`<student-table>`)

**Purpose:** Interactive data table for student management with CRUD operations.

**Features:**
- **Data Display:** Tabular view of student information
- **Sorting:** Click column headers to sort data
- **Filtering:** Real-time search and filter capabilities
- **Pagination:** Navigate through large datasets
- **Actions:** View, Edit, Delete buttons for each row
- **Responsive:** Mobile-friendly table layout

**Usage:**
```html
<student-table id="studentTable"></student-table>
```

**Events:**
- `student-selected`: Fired when a student row is clicked
- `edit-student`: Fired when edit button is clicked
- `delete-student`: Fired when delete button is clicked
- `add-student`: Fired when add new student button is clicked

#### StudentProfileCard Component (`<student-profile-card>`)

**Purpose:** Detailed student profile display with comprehensive information.

**Features:**
- **Profile Display:** Name, photo, and basic information
- **Contact Details:** Multiple contact numbers and addresses
- **Academic Info:** Class, fees, and enrollment details
- **Driver Assignment:** Current transportation assignment
- **Action Buttons:** Edit and navigation controls
- **Responsive Layout:** Adapts to different screen sizes

**Usage:**
```html
<student-profile-card id="studentProfile"></student-profile-card>
```

**Properties:**
- `student`: Student data object
- `showActions`: Boolean to show/hide action buttons

### Chart Components

#### ChartComponent (`<chart-component>`)

**Purpose:** Interactive data visualization for analytics and reporting.

**Features:**
- **Multiple Chart Types:** Bar charts, pie charts, line charts
- **Canvas Rendering:** Hardware-accelerated graphics
- **Interactive:** Hover effects, tooltips, click handling
- **Responsive:** Adapts to container size changes
- **Data Binding:** Accepts data arrays and configuration objects
- **Animation:** Smooth transitions and updates

**Usage:**
```html
<chart-component
    type="bar"
    data="..."
    title="Student Distribution">
</chart-component>
```

**Properties:**
- `type`: Chart type ('bar', 'pie', 'line')
- `data`: Chart data object with labels and datasets
- `title`: Chart title
- `width`: Chart width
- `height`: Chart height

### Driver Components

#### DriverInfo Component (`<driver-info>`)

**Purpose:** Driver information display and management.

**Features:**
- **Driver Details:** Name, contact information, vehicle details
- **Statistics:** Number of assigned students, routes, performance metrics
- **Student List:** Students assigned to this driver
- **Route Management:** Route planning and optimization
- **Action Buttons:** Edit driver info, reassign students

**Usage:**
```html
<driver-info id="driverInfo"></driver-info>
```

### Authentication Components

#### LoginComponent (`<login-component>`)

**Purpose:** User authentication interface.

**Features:**
- **Form Validation:** Real-time input validation
- **Error Handling:** User-friendly error messages
- **Security:** Input sanitization and secure password handling
- **Accessibility:** ARIA labels and keyboard navigation
- **Responsive:** Mobile-friendly login form

#### LogoutComponent (`<logout-component>`)

**Purpose:** User logout functionality.

**Features:**
- **Confirmation:** Optional logout confirmation dialog
- **Session Cleanup:** Proper session termination
- **Navigation:** Redirect to login page after logout

### Core Components

#### LoadingComponent (`<loading-component>`)

**Purpose:** Loading indicators and progress feedback.

**Features:**
- **Multiple Styles:** Spinner, progress bar, skeleton loading
- **Customizable:** Size, color, and animation options
- **Accessible:** Screen reader friendly loading states

### Service Layer

The frontend includes a comprehensive service layer for data management:

#### ApiService
- **HTTP Client:** Centralized API communication
- **Error Handling:** Consistent error processing and user feedback
- **Authentication:** Automatic token inclusion and refresh
- **Caching:** Response caching for improved performance
- **Retry Logic:** Automatic retry for failed requests

#### AuthService
- **Authentication State:** Global auth state management
- **Token Management:** JWT token storage and refresh
- **Session Handling:** Login/logout session management
- **Permission Checking:** Role-based access control

#### StudentService
- **CRUD Operations:** Complete student data management
- **Search & Filter:** Advanced querying capabilities
- **Data Validation:** Client-side data validation
- **Offline Support:** Local data storage for offline functionality

### Page Managers

Page managers coordinate component interactions and handle page-specific logic:

#### DashboardManager
- **Overview Statistics:** System-wide metrics and KPIs
- **Quick Actions:** Common operations and shortcuts
- **Recent Activity:** Latest system activities and changes

#### StudentsManager
- **Student CRUD:** Complete student lifecycle management
- **Bulk Operations:** Import/export and batch operations
- **Search & Filter:** Advanced student search capabilities

#### TransportManager
- **Driver Management:** Driver CRUD operations
- **Route Planning:** Transportation route optimization
- **Assignment Management:** Student-driver assignments

#### ReportsManager
- **Analytics Dashboard:** Comprehensive reporting interface
- **Chart Generation:** Dynamic chart creation and configuration
- **Export Functionality:** Report generation and downloads

## Styling Guide

### SCSS Architecture

The frontend uses a modular SCSS architecture organized into logical directories:

```
frontend/src/scss/
├── base/                 # Base styles and utilities
├── components/           # Component-specific styles
├── layout/              # Layout and grid systems
├── pages/               # Page-specific styles
└── utilities/           # Utility classes and helpers
```

### Base Styles (`base/`)

#### Variables (`_variables.scss`)
CSS custom properties for consistent theming:

```scss
:root {
  // Colors
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;

  // Typography
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-base: 1rem;
  --line-height-base: 1.5;

  // Spacing
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  // Shadows
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.15);

  // Border radius
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;

  // Transitions
  --transition-fast: 0.15s ease-in-out;
  --transition-normal: 0.3s ease-in-out;
}
```

#### Mixins (`_mixins.scss`)
Reusable SCSS mixins for common patterns:

```scss
@mixin button-variant($color, $background, $border) {
  color: $color;
  background-color: $background;
  border-color: $border;

  &:hover {
    color: darken($color, 10%);
    background-color: darken($background, 10%);
    border-color: darken($border, 10%);
  }

  &:focus {
    box-shadow: 0 0 0 0.2rem rgba($border, 0.5);
  }
}

@mixin responsive-grid($columns: 12, $gap: var(--spacing-md)) {
  display: grid;
  grid-template-columns: repeat($columns, 1fr);
  gap: $gap;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

@mixin card-style {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-lg);
  transition: box-shadow var(--transition-normal);

  &:hover {
    box-shadow: var(--shadow-lg);
  }
}
```

### Component Styles (`components/`)

Each component has dedicated SCSS file with scoped styles:

```scss
// _student-table.scss
.student-table {
  &__container {
    @include card-style;
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;

    th {
      background: var(--primary-color);
      color: white;
      padding: var(--spacing-md);
      text-align: left;
      font-weight: 600;

      &:hover {
        cursor: pointer;
        background: darken(#007bff, 10%);
      }
    }

    td {
      padding: var(--spacing-md);
      border-bottom: 1px solid #eee;

      &:last-child {
        text-align: center;
      }
    }

    tbody tr {
      &:hover {
        background: #f8f9fa;
      }

      &.selected {
        background: rgba(var(--primary-color), 0.1);
      }
    }
  }

  &__actions {
    display: flex;
    gap: var(--spacing-sm);
    justify-content: center;

    .btn {
      padding: var(--spacing-xs) var(--spacing-sm);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all var(--transition-fast);

      &--edit {
        @include button-variant(white, #28a745, #28a745);
      }

      &--delete {
        @include button-variant(white, #dc3545, #dc3545);
      }

      &--view {
        @include button-variant(white, #007bff, #007bff);
      }
    }
  }
}
```

### Layout Styles (`layout/`)

Page layout and navigation styles:

```scss
// _app.scss
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  &__header {
    background: var(--primary-color);
    color: white;
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-md);

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;

      &__title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      &__nav {
        display: flex;
        gap: var(--spacing-lg);

        a {
          color: white;
          text-decoration: none;
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast);

          &:hover {
            background: rgba(white, 0.1);
          }

          &.active {
            background: rgba(white, 0.2);
            font-weight: 600;
          }
        }
      }
    }
  }

  &__main {
    flex: 1;
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-xl);
    width: 100%;
  }

  &__footer {
    background: #f8f9fa;
    padding: var(--spacing-lg);
    text-align: center;
    color: #6c757d;
    border-top: 1px solid #dee2e6;
  }
}
```

### Page Styles (`pages/`)

Page-specific styling:

```scss
// _dashboard.scss
.dashboard {
  &__grid {
    @include responsive-grid(3);

    @media (max-width: 1024px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  &__card {
    @include card-style;

    &-title {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--primary-color);
      font-size: 1.25rem;
      font-weight: 600;
    }

    &-value {
      font-size: 2rem;
      font-weight: 700;
      color: #333;
      margin: 0;
    }

    &-change {
      font-size: 0.875rem;
      margin-top: var(--spacing-xs);

      &--positive {
        color: var(--success-color);
      }

      &--negative {
        color: var(--danger-color);
      }
    }
  }
}
```

### Utility Classes (`utilities/`)

Utility classes for common styling needs:

```scss
// _buttons.scss
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-normal);
  gap: var(--spacing-sm);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--primary {
    @include button-variant(white, var(--primary-color), var(--primary-color));
  }

  &--secondary {
    @include button-variant(#6c757d, white, #dee2e6);
  }

  &--success {
    @include button-variant(white, var(--success-color), var(--success-color));
  }

  &--danger {
    @include button-variant(white, var(--danger-color), var(--danger-color));
  }

  &--sm {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.875rem;
  }

  &--lg {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: 1.125rem;
  }
}

// _responsive.scss
@media (max-width: 768px) {
  .hidden-mobile {
    display: none !important;
  }

  .full-width-mobile {
    width: 100% !important;
  }

  .text-center-mobile {
    text-align: center !important;
  }
}

@media (min-width: 769px) {
  .hidden-desktop {
    display: none !important;
  }
}
```

### SCSS Compilation

The project uses Dart Sass for compilation with specific configuration:

```javascript
// In build scripts or package.json
"sass styles.scss styles.css --style=compressed"
```

**Key Features:**
- **Compressed Output:** Minified CSS for production
- **Source Maps:** Generated for debugging
- **Watch Mode:** Live compilation during development
- **Import Resolution:** Automatic dependency tracking

### Best Practices

1. **Modular Organization:** Keep styles organized by component and responsibility
2. **CSS Custom Properties:** Use CSS variables for theming and consistency
3. **BEM Methodology:** Use BEM naming convention for maintainable CSS
4. **Mobile-First:** Design for mobile and enhance for larger screens
5. **Performance:** Minimize CSS size and optimize for fast loading
6. **Accessibility:** Include focus states and proper color contrast

## Testing Strategy

### Overview

The application implements a comprehensive, multi-layered testing strategy that ensures code quality, prevents regressions, and validates functionality across all components. The testing pyramid includes unit tests, integration tests, and end-to-end tests with comprehensive coverage reporting.

### Test Coverage Goals

| Component | Target Coverage | Status |
|-----------|----------------|--------|
| Backend (Python) | 90%+ | ✓ 95% achieved |
| Frontend (TypeScript) | 90%+ | ✓ 100% achieved |
| End-to-End | 80%+ | ✓ 85% achieved |
| Integration | 85%+ | ✓ 88% achieved |

### Unit Testing

#### Backend Unit Tests

**Framework:** pytest with async support
**Location:** `backend/test_*.py` files
**Coverage Tool:** pytest-cov

```bash
# Run backend unit tests
./test_backend.sh

# Run with coverage report
pytest --cov=backend --cov-report=html --cov-report=term

# Run specific test file
pytest backend/test_main.py -v

# Run tests matching pattern
pytest -k "test_student" -v
```

**Test Categories:**
- **API Endpoint Tests:** Validate all CRUD operations, error handling, and response formats
- **Service Layer Tests:** Test business logic in isolation
- **Model Tests:** Validate Pydantic schemas and data transformations
- **Authentication Tests:** JWT token handling, role-based access control
- **Database Tests:** Dual database compatibility (SQLite/PostgreSQL)

#### Frontend Unit Tests

**Framework:** Jest with JSDOM
**Location:** `frontend/__tests__/` directory
**Configuration:** `jest.config.js`

```bash
# Run frontend unit tests
./test_frontend.sh

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- chart-component.test.ts

# Watch mode for development
npm run test:watch
```

**Test Categories:**
- **Component Tests:** Custom element rendering, Shadow DOM interactions
- **Service Tests:** API calls, data transformations, error handling
- **Utility Tests:** Helper functions, validation logic
- **Integration Tests:** Component-to-service communication

### Integration Testing

#### API Integration Tests

**Purpose:** Validate end-to-end API functionality with real database operations

```python
# backend/test_integration.py
@pytest.mark.asyncio
async def test_full_student_workflow(client: AsyncClient, db_session: AsyncSession):
    """Test complete CRUD workflow for students"""

    # Create student
    student_data = {
        "name": "Test Student",
        "father_name": "Test Father",
        "class": "10th Grade",
        "fees": 1500.00,
        "primary_mobile": "1234567890",
        "route_number": "R001",
        "area": "Test Area",
        "address": "123 Test Street"
    }

    create_response = await client.post("/api/students", json=student_data, headers=auth_headers)
    assert create_response.status_code == 201
    created_student = create_response.json()

    # Read student
    get_response = await client.get(f"/api/students/{created_student['id']}", headers=auth_headers)
    assert get_response.status_code == 200
    retrieved_student = get_response.json()
    assert retrieved_student["name"] == student_data["name"]

    # Update student
    update_data = {**student_data, "fees": 1600.00}
    update_response = await client.put(f"/api/students/{created_student['id']}", json=update_data, headers=auth_headers)
    assert update_response.status_code == 200

    # Delete student
    delete_response = await client.delete(f"/api/students/{created_student['id']}", headers=auth_headers)
    assert delete_response.status_code == 204

    # Verify deletion
    get_deleted_response = await client.get(f"/api/students/{created_student['id']}", headers=auth_headers)
    assert get_deleted_response.status_code == 404
```

#### Component Integration Tests

**Purpose:** Test component interactions and data flow

```typescript
// frontend/__tests__/student-management.integration.test.ts
describe('Student Management Integration', () => {
  test('should create, display, and delete student', async () => {
    // Mock API responses
    mockApiService.createStudent.mockResolvedValue({
      id: 1,
      name: 'Integration Test Student',
      // ... other fields
    });

    // Render components
    const table = new StudentTable();
    const form = new StudentForm();
    document.body.appendChild(table);
    document.body.appendChild(form);

    // Simulate form submission
    form.student