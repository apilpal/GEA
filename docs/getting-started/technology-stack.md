# Technology Stack

## Backend Technologies

| Technology | Version | Justification |
|------------|---------|---------------|
| **Python** | 3.8+ | Industry-standard language with excellent async support and rich ecosystem |
| **FastAPI** | 0.104.1 | High-performance async web framework with automatic OpenAPI documentation |
| **SQLAlchemy** | 2.0.23 | Powerful ORM with async support and cross-database compatibility |
| **Alembic** | Built-in | Database migration tool for version-controlled schema evolution |
| **Pydantic** | 2.x | Data validation and serialization with type safety |
| **Uvicorn** | 0.24.0 | ASGI server for high-performance async applications |
| **PostgreSQL** | Latest | Production-grade relational database with advanced features |
| **SQLite** | Built-in | Lightweight, file-based database for development and small deployments |

## Frontend Technologies

| Technology | Version | Justification |
|------------|---------|---------------|
| **TypeScript** | 5.4.5 | Type-safe JavaScript with excellent IDE support and error prevention |
| **Web Components** | Native | Standards-based component system with Shadow DOM encapsulation |
| **SCSS** | 1.93.2 | Enhanced CSS with variables, mixins, and modular architecture |
|   - **Modern Architecture**: Organized using ITCSS methodology with `@use` and `@forward` features
|   - **Comprehensive Documentation**: Complete SCSS documentation in [`docs/development/`](docs/development/)
|   - **Strategic Roadmap**: 12-month improvement plan with [`SCSS_ACTION_PLAN.md`](../development/SCSS_ACTION_PLAN.md)
| **Jest** | 29.7.0 | Comprehensive testing framework with JSDOM environment |
| **Vite** | 7.1.10 | Fast build tool with native ES modules support |
| **Canvas API** | Native | Hardware-accelerated graphics for interactive data visualizations |

## Development & Testing Tools

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Testing** | pytest | 8.0.0 | Comprehensive backend unit testing with async support |
| **Coverage** | pytest-cov | 4.1.0 | Code coverage reporting for backend tests |
| **E2E Testing** | Selenium | Latest | Browser automation for end-to-end testing |
| **Linting** | ESLint/Stylelint | Latest | Code quality and style consistency |
| **Build Tools** | npm scripts | Built-in | Task automation and dependency management |

## Security & Performance Libraries

| Technology | Version | Purpose |
|------------|---------|---------|
| **python-jose** | 3.3.0 | JWT token handling with cryptography support |
| **bcrypt** | 4.1.2 | Secure password hashing with salt generation |
| **SlowAPI** | 0.1.9 | Rate limiting to prevent abuse and DoS attacks |
| **python-dotenv** | 1.0.0 | Environment variable management for configuration |
| **CORS** | 2.8.5 | Cross-origin request handling for web security |

## Frontend Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **cors** | 2.8.5 | Cross-origin request handling for web security |
| **express** | 5.1.0 | Web application framework for development server |
| **picocolors** | 1.1.1 | Color utilities for terminal output |
| **vite** | 7.1.10 | Fast build tool with native ES modules support |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **@types/jest** | 29.5.12 | TypeScript definitions for Jest testing framework |
| **canvas** | 2.11.2 | Canvas API polyfill for testing chart components |
| **jest** | 29.7.0 | Comprehensive testing framework with JSDOM environment |
| **jest-environment-jsdom** | 29.7.0 | JSDOM environment for browser simulation in tests |
| **sass** | 1.93.2 | Enhanced CSS with variables, mixins, and modular architecture |
| **stylelint** | 16.25.0 | CSS/SCSS linting for code quality |
| **stylelint-scss** | 6.12.1 | SCSS-specific linting rules |
| **ts-jest** | 29.1.2 | Jest transformer for TypeScript |
| **typescript** | 5.4.5 | Type-safe JavaScript with excellent IDE support and error prevention |

## Backend Dependencies

The backend requires the following Python packages (from `backend/requirements.txt`):

| Package | Version | Purpose |
|---------|---------|---------|
| **fastapi** | 0.104.1 | High-performance async web framework with automatic OpenAPI documentation |
| **uvicorn** | 0.24.0 | ASGI server for high-performance async applications (with standard extras) |
| **pytest** | 8.0.0 | Comprehensive backend unit testing with async support |
| **httpx** | 0.25.0 | Async HTTP client for testing and API calls |
| **pytest-cov** | 4.1.0 | Code coverage reporting for backend tests |
| **coverage** | 7.4.0 | Code coverage measurement and reporting |
| **sqlalchemy** | 2.0.23 | Powerful ORM with async support and cross-database compatibility |
| **asyncpg** | 0.29.0 | PostgreSQL driver for async operations |
| **psycopg2-binary** | 2.9.9 | PostgreSQL adapter for synchronous operations |
| **slowapi** | 0.1.9 | Rate limiting to prevent abuse and DoS attacks |
| **python-multipart** | 0.0.6 | Multipart form data handling for file uploads |
| **python-jose** | 3.3.0 | JWT token handling with cryptography support |
| **python-dotenv** | 1.0.0 | Environment variable management for configuration |
| **bcrypt** | 4.1.2 | Secure password hashing with salt generation |
| **aiosqlite** | 0.21.0 | SQLite driver for async operations |

## Justification for Technology Choices

### Backend Framework Selection

- **FastAPI** over Flask/Django: Superior async performance, automatic API documentation, and modern Python type hints
- **SQLAlchemy 2.0**: Latest version with improved async support and better performance

### Database Strategy

- **Dual Database Support**: SQLite for development/simplicity, PostgreSQL for production scalability
- **Alembic**: Industry-standard migration tool ensuring database schema consistency across environments

### Frontend Architecture

- **Web Components**: Future-proof, standards-based approach avoiding framework lock-in
- **TypeScript**: Prevents runtime errors and improves developer experience
- **SCSS**: Maintains CSS organization and reusability at scale

### Testing Strategy

- **Multi-level Testing**: Unit, integration, and E2E tests ensure comprehensive coverage
- **Jest + JSDOM**: Realistic browser environment simulation for frontend tests
- **pytest**: Async-aware testing framework matching the async backend architecture

## Prerequisites

### System Requirements

- **Python**: 3.8 or higher
- **Node.js**: 16.x or higher (with npm)
- **Git**: For version control
- **ChromeDriver**: For end-to-end testing (automatically handled by scripts)

### Optional Dependencies

- **PostgreSQL**: For production database (SQLite used by default for development)
- **Chrome Browser**: For E2E testing

### Development User Setup

The application includes an automated development user creation system:

```bash
# Create development user with admin privileges
cd backend
python create_dev_user.py
```

This creates a pre-configured admin user:
- **Username:** `dev_user`
- **Email:** `dev@example.com`
- **Password:** `dev_password_123`
- **Role:** `admin` (full system access)

**📚 Documentation:** See [Development User Setup Guide](../troubleshooting/setup-issues.md) for complete instructions.

## Environment Configuration

### Backend Environment Variables

The application uses an enhanced configuration system with sophisticated environment file loading and validation:

**Configuration Loading Priority:**
1. `.env.{environment}` (environment-specific configuration)
2. `.env` (base configuration)
3. System environment variables

Create a `.env.development` or `.env.production` file in the `backend/` directory:

```bash
# Required for JWT security (generate a strong 256-bit key)
SECRET_KEY=your-256-bit-secret-key-here

# Optional token expiration settings
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database configuration (SQLite by default)
DATABASE_URL=sqlite:///./data/students.db
# For PostgreSQL: DATABASE_URL=postgresql://user:password@localhost/dbname

# Optional logging configuration
LOG_LEVEL=INFO

# CORS configuration (JSON format)
CORS_ORIGINS='["http://localhost:5173", "http://127.0.0.1:5173"]'

# Rate limiting (requests per minute)
RATE_LIMIT_REQUESTS_PER_MINUTE=30

# Server configuration
HOST=127.0.0.1
PORT=8000
FRONTEND_PORT=5173

# Database connection pooling
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_RECYCLE=3600

# SSL Configuration (Production)
SSL_CERT_PATH=/path/to/certificate.pem
SSL_KEY_PATH=/path/to/private.key

# Email Configuration (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

# Monitoring (Optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
METRICS_ENABLED=false
```

### Enhanced Configuration Features

**Environment File Loading:**
The application implements a sophisticated environment loading system that loads configuration in priority order:

1. **Environment Detection**: Automatically detects the current environment (`ENVIRONMENT` variable)
2. **Priority Loading**: Loads `.env.{environment}` first, then `.env`, then system environment variables
3. **Path Resolution**: Correctly resolves environment file paths relative to the configuration module location
4. **Validation**: Validates all configuration settings and provides clear error messages for missing required settings

**SECRET_KEY Configuration:**
The `SECRET_KEY` is critical for JWT token security and must be properly configured:

- **Generation**: Generate a strong 256-bit key using: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- **Environment Specific**: Set different keys for development, staging, and production
- **Security**: Never commit SECRET_KEY to version control
- **Validation**: The application will refuse to start without a valid SECRET_KEY

**Configuration Validation:**
The system validates all configuration settings on startup:

```python
# Automatic validation includes:
- SECRET_KEY presence and minimum length
- Port number ranges (1-65535)
- Token expiration times (positive integers)
- Database URL format validation
- CORS origins format validation
```

**Environment-Specific Settings:**
- **Development**: Relaxed security for local development
- **Production**: Enhanced security with SSL and monitoring
- **Testing**: In-memory database and disabled external services

### Frontend Environment Variables

Create a `.env.development` or `.env.production` file in the `frontend/` directory:

```bash
# API base URL
VITE_API_BASE_URL=http://127.0.0.1:8000

# Optional environment settings
NODE_ENV=development
```

## Database Setup

The application supports both SQLite (default) and PostgreSQL databases.

### SQLite (Development/Default)

- No additional setup required
- Database file created automatically at `backend/data/students.db`
- Suitable for development and small deployments

### PostgreSQL (Production)

1. **Install PostgreSQL** on your system
2. **Create a database:**
   ```sql
   CREATE DATABASE student_profiles;
   CREATE USER app_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE student_profiles TO app_user;
   ```
3. **Update environment variables:**
   ```bash
   DATABASE_URL=postgresql://app_user:your_password@localhost/student_profiles
   ```
4. **Run migrations:**
   ```bash
   cd backend && python migrate.py upgrade head
   ```

## Verification

After setup, verify the installation:

1. **API Health Check:**
   ```bash
   curl http://127.0.0.1:8000/api/health
   ```

2. **Frontend Access:**
   - Open `http://127.0.0.1:5173` in your browser
   - Verify the PWA loads and displays student data

3. **API Documentation:**
   - Interactive docs: `http://127.0.0.1:8000/docs`
   - Alternative docs: `http://127.0.0.1:8000/redoc`

4. **Run Tests:**
   ```bash
   ./test.sh
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

This technology stack provides a modern, scalable, and maintainable foundation for the Student Profiles PWA application, balancing development productivity with production requirements.