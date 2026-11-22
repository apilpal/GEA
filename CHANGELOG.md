# Student Profiles PWA - Changelog

All notable changes to the Student Profiles PWA project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-11-22

### Added
- One-command local run: `pnpm dev` starts the backend and frontend together, `scripts/termux-setup.sh` sets everything up on Termux, and `pnpm create-admin` creates the first admin.
- Demo data on the dashboard while the database is empty: 75 students, 5 drivers, fee 500 per student.
- `pnpm seed` loads that same sample set into the database. It replaces existing students and drivers, so all installs end up identical (`--append` keeps existing rows).
- Responsive sidebar start-up behaviour for small screens.

### Changed
- Login is required, and access to students, drivers, reports, charts, the dashboard and CSV sync depends on the user's role.
- Authenticated API requests and dashboard navigation fixed.
- Documentation restructured: new README, a documentation index (`docs/README.md`), docs grouped into getting-started, architecture, guides, styling, API, deployment, testing, troubleshooting, roadmap, reports and archive, and `ROADMAP.md` rewritten.

### Removed
- Guest login and the guest dashboard (their documents are in `docs/archive/guest-dashboard/`).
- GitHub Actions workflows.
- The `docs-backup-20251030` folder, `README-backup-20251030.md`, duplicate documents and generated files in the repository root.

## 2025-10-30 (documentation restructure, earlier)

### 📚 Documentation Restructured
- **Major Documentation Overhaul**: Complete documentation restructure with 95+ files organized into logical categories
- **Centralized Navigation**: Created comprehensive documentation hub with role-based quick access
- **Consolidated Backend Docs**: Merged testing and integration documentation into coherent guides
- **Enhanced Search**: Improved cross-referencing and navigation between related sections
- **New Documentation Structure**: Organized into overview, getting-started, development, API, deployment, testing, troubleshooting, roadmap, releases, security, and guides

## [1.0.0] - 2025-10-26

### Added
- **🎭 Guest User Authentication System**
  - Automatic guest user creation with UUID-based unique identifiers
  - 24-hour guest sessions with automatic expiration
  - JWT token management for guest users (access + refresh tokens)
  - HttpOnly cookie-based session management

- **📊 Guest Dashboard Access**
  - Limited dashboard access for unauthenticated users
  - Guest-specific UI indicators and upgrade prompts
  - Read-only access to basic dashboard statistics
  - Permission-based access control (`dashboard:read`)

- **🔄 Guest User Conversion**
  - Seamless conversion from guest to registered user accounts
  - Preservation of user preferences during conversion
  - Automatic cleanup of guest data after conversion

- **🌐 Public Dashboard API**
  - Rate-limited public endpoints for dashboard data
  - Anonymized statistics and chart data access
  - Basic driver information without sensitive details

- **📋 CSV Sample Data Seeding**
  - Implemented CSV-based data seeding using files in backend/data/drivers
  - Automated population of realistic sample data for guest dashboard demonstrations
  - CLI commands for seeding from CSV files with verbose output

### Fixed
- **🔐 Authentication Initialization Timing Issue**
  - **Issue**: Login screen appeared by default instead of the guest dashboard due to a timing mismatch in authentication initialization.
  - **Root Cause**: Timing mismatch in authentication initialization prevented automatic guest user creation.
  - **Fix**: Modified `auth-context` to automatically create a guest user if none exists, preventing navigation to the login screen.
  - **Tests Added**: Unit tests added to verify the authentication initialization behavior and ensure guest dashboard loads by default.
  - **Verification**: Testing confirmed the fix works, ensuring seamless access to the guest dashboard without login prompts.

- **🔗 API Path Corrections**
  - **Issue**: Inconsistent API paths in documentation and code examples using /api/v1 prefix.
  - **Fix**: Updated all API paths to use /api prefix for consistency across documentation, tests, and examples.
  - **Impact**: Improved API documentation accuracy and consistency in code references.

- **✅ Test Status Update**
  - **Fix**: Confirmed that all tests now pass after recent improvements and fixes.
  - **Impact**: Enhanced reliability and confidence in the guest dashboard functionality.

### Backend Changes

#### New Services
- `GuestUserService` class in `backend/src/services/guest_user_service.py`
  - Guest user creation and management
  - Session handling and token refresh
  - User conversion and cleanup operations

#### New API Endpoints
- `POST /api/auth/guest` - Create guest user session
- `GET /api/auth/guest/dashboard` - Guest dashboard data access
- `POST /api/auth/convert-guest` - Convert guest to registered user
- `GET /api/dashboard/public/stats` - Public dashboard statistics
- `GET /api/dashboard/public/charts` - Public chart configurations
- `GET /api/dashboard/public/drivers` - Basic driver information
- `POST /api/auth/cleanup-guests` - Admin cleanup of expired guests

#### Database Schema Changes
- Extended `users` table with guest-specific fields:
  - `is_guest` BOOLEAN (default: FALSE)
  - `guest_token` VARCHAR(255) UNIQUE
  - `expires_at` DATETIME

#### New Response Models
- `GuestUserResponse` - Guest user creation response
- `GuestDashboardResponse` - Limited dashboard data for guests
- `ConvertGuestRequest` - Guest conversion request model

#### Configuration Updates
- `GUEST_EMAIL_DOMAIN=guest.local` - Configurable guest email domain
- Rate limiting configurations for public endpoints

### Frontend Changes

#### New Components
- `GuestDashboardComponent` - Handles guest dashboard rendering and interactions
- `GuestLoginComponent` - Manages guest user authentication flow

#### Enhanced Components
- Updated `auth-service.ts` with guest user methods
- Enhanced router configuration to allow guest dashboard access
- Added guest-specific UI elements and indicators

#### New Features
- Automatic guest user creation on dashboard access
- Guest status indicators in navigation
- Upgrade prompts and conversion workflow
- Guest access preference storage

### Testing Changes

#### New Test Files
- `backend/test_guest_user_service.py` - Comprehensive service testing
- `backend/test_guest_user_api_integration.py` - API endpoint testing
- `backend/test_guest_user_auth.py` - Authentication security testing
- `frontend/__tests__/components/guest-dashboard-component.test.ts` - Component testing
- `frontend/__tests__/services/guest-user-service-integration.test.ts` - Service integration

#### Enhanced Test Coverage
- Unit tests for all guest service methods (100% coverage)
- Integration tests for guest API endpoints
- E2E tests for complete guest user workflows
- Security testing for authentication and authorization
- Performance testing for rate limiting and load handling
- **Test Status**: All tests now pass after recent improvements

#### Test Infrastructure
- Guest user test fixtures and mock data
- Database test utilities for guest operations
- Performance testing for bulk operations

### Security Enhancements

#### Authentication Security
- JWT RS256 signing for enhanced security
- Token rotation and refresh mechanisms
- HttpOnly cookie storage for session tokens
- Strict token expiration policies

#### Access Control
- Permission-based access for guest users
- Rate limiting on public endpoints (20-30 req/min)
- Data anonymization for public access
- Audit logging for security events

#### Session Management
- 24-hour maximum guest session duration
- Automatic cleanup of expired guests (48-hour grace period)
- Secure token invalidation on conversion

### Performance Optimizations

#### Database Optimizations
- Indexed guest-specific database fields
- Optimized queries for guest user operations
- Connection pooling for high availability

#### API Optimizations
- Rate limiting to prevent abuse
- Efficient data serialization for guest responses
- Caching strategies for public dashboard data

#### Frontend Optimizations
- Lazy loading of guest-specific components
- Minimal bundle impact for non-guest users
- Efficient DOM updates for guest UI elements

### Monitoring and Observability

#### New Metrics
- Guest user creation rates
- Guest to registered user conversion rates
- Session duration analytics
- Dashboard access patterns

#### Error Monitoring
- Failed guest user operations tracking
- Authentication failure monitoring
- Rate limit violation alerts
- API endpoint error tracking

#### Performance Monitoring
- Response time tracking for guest endpoints
- Database query performance monitoring
- Rate limiting effectiveness metrics

### Documentation

#### New Documentation Files
- `docs/guest-dashboard-enhancements.md` - Comprehensive architecture overview
- `docs/api/guest-dashboard-api.md` - Detailed API documentation
- `docs/testing/guest-dashboard-testing.md` - Testing documentation

#### Updated Documentation
- Enhanced API documentation with guest endpoints
- Updated authentication documentation
- Security guidelines for guest user handling

### Deployment Considerations

#### Environment Configuration
- New environment variables for guest functionality
- Database migration scripts for schema changes
- Configuration validation for required settings

#### Migration Strategy
- Backward-compatible database schema changes
- Gradual rollout of guest features
- Fallback mechanisms for existing users

#### Operational Changes
- Cleanup job scheduling for expired guests
- Monitoring dashboard updates for guest metrics
- Alert configuration for guest-related issues

### Future Enhancements

#### Planned Features
- Extended guest session durations for power users
- Guest data export capabilities (limited)
- Customizable guest permission sets
- Social login integration for guests

#### Scalability Improvements
- Database sharding support for guest users
- Redis caching for public dashboard data
- CDN integration for static assets

## Previous Versions

### [0.9.0] - 2025-10-20

#### Major Features
- **🔧 Comprehensive Testing Framework**
  - Implemented 95%+ test coverage across all components
  - Added Jest + Puppeteer testing for frontend
  - Created comprehensive pytest testing for backend
  - Established CI/CD pipeline with GitHub Actions

- **🎨 Enhanced Theme System**
  - Complete dark/light mode implementation
  - System preference detection
  - CSS custom properties architecture
  - Smooth transitions and accessibility features

- **🏗️ Component Architecture**
  - Modern BaseComponent with TypeScript generics
  - Redux-like store system with DevTools integration
  - Web Components with Shadow DOM
  - Enhanced state management

#### Backend Improvements
- **🔐 JWT Authentication Enhancement**
  - RS256 signing for enhanced security
  - Refresh token rotation mechanism
  - HttpOnly cookie storage
  - Role-based access control

- **📊 Database Optimization**
  - Dual database support (SQLite/PostgreSQL)
  - Alembic migration system
  - Strategic indexing implementation
  - Connection pooling optimization

#### Frontend Enhancements
- **📱 PWA Features**
  - Service worker implementation
  - Offline capabilities
  - App manifest configuration
  - Background sync support

- **🎯 Performance Optimization**
  - Code splitting and lazy loading
  - Bundle size optimization
  - Image optimization
  - Caching strategies

### [0.8.0] - 2025-10-15

#### Core Functionality
- **👥 Student CRUD Operations**
- **🚗 Driver Management System**
- **📈 Dashboard Analytics**
- **🔌 RESTful API Implementation**
- **🧪 Initial Test Infrastructure**

---

## Development Guidelines

### Version Numbering
This changelog follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

### Change Categories
- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security-related changes

### Contributing
When adding changes to this changelog:
1. Add entries under the `[Unreleased]` section
2. Use present tense for change descriptions
3. Group changes by category (Added, Changed, etc.)
4. Reference related issues or pull requests
5. Move changes to a version section when releasing

### Release Process
1. Update version numbers in relevant files
2. Move changes from `[Unreleased]` to new version section
3. Update release date
4. Create git tag for the release
5. Deploy to production environment

---

This changelog provides a comprehensive record of all changes made to the Student Profiles PWA, ensuring transparency and maintainability for future development.