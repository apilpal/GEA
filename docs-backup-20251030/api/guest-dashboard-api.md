# Guest Dashboard API Documentation

This document provides comprehensive API documentation for the guest dashboard functionality, including all endpoints, request/response formats, usage examples, and integration guides for the enhanced guest experience features.

## Recent Updates (October 2025)

### ✅ Enhanced Features Added
- **CSV Sample Data Seeding**: Automated seeding of realistic sample data from CSV files in backend/data/drivers for guest dashboard demonstration
- **Advanced Guest Conversion**: Seamless workflow for converting guest users to registered accounts
- **Enhanced UI Components**: Rich frontend components with upgrade prompts, session management, and visual indicators
- **Comprehensive Testing**: Full test coverage for guest dashboard functionality - all tests now pass

## Table of Contents

- [Guest User Authentication](#guest-user-authentication)
- [Guest Dashboard Access](#guest-dashboard-access)
- [Guest User Conversion](#guest-user-conversion)
- [Sample Data Management](#sample-data-management)
- [Public Dashboard Endpoints](#public-dashboard-endpoints)
- [Rate Limiting](#rate-limiting)
- [Error Responses](#error-responses)

## Guest User Authentication

### POST `/api/auth/guest`

Creates a new guest user session or retrieves an existing one.

**Authentication:** None required (public endpoint)

**Request Body:** None (optional guest_token parameter)

```json
{
  // No request body required - automatic guest creation
}
```

**Response (200):**

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": 123,
    "username": "guest_abc12345",
    "email": "guest_abc12345@guest.local",
    "role": "student",
    "is_active": true,
    "is_guest": true,
    "guest_token": "abc12345",
    "expires_at": "2024-01-15T10:30:00Z",
    "created_at": "2024-01-14T10:30:00Z"
  },
  "guest_id": "abc12345",
  "expires_at": "2024-01-15T10:30:00Z",
  "is_guest": true
}
```

**Cookies Set:**
- `access_token`: HttpOnly cookie (15 minutes)
- `refresh_token`: HttpOnly cookie (7 days)

**Error Responses:**
- `500`: Failed to create guest user

## Guest Dashboard Access

### GET `/api/auth/guest/dashboard`

Retrieves limited dashboard data for guest users.

**Authentication:** Required (guest user only)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "guest_access": true,
  "permissions": ["dashboard:read"],
  "summary": {
    "total_students": 150,
    "total_drivers": 12,
    "total_revenue": 45000.0,
    "active_drivers": 10
  },
  "message": "Guest access - limited data available. Sign up for full access."
}
```

**Error Responses:**
- `403`: This endpoint is only available to guest users
- `500`: Failed to retrieve guest dashboard data

## Sample Data Management

The sample data seeding system provides realistic data for guest dashboard demonstrations and development testing. This feature automatically populates the database with sample students and drivers that showcase the application's functionality.

### Sample Data Endpoints

#### POST `/api/admin/seed-sample-data`

Seeds the database with sample students and drivers for guest dashboard demonstration.

**Authentication:** Required (admin only)

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "clear_existing": false,
  "verbose": true
}
```

**Response (200):**
```json
{
  "message": "Sample data seeded successfully",
  "statistics": {
    "students_created": 5,
    "drivers_created": 3,
    "total_students": 5,
    "total_drivers": 3
  },
  "sample_data": {
    "students": [
      {
        "id": 1,
        "name": "Alice Johnson",
        "father_name": "Robert Johnson",
        "class_": "10",
        "fees": 1500.50,
        "route": "Route A",
        "status": "active"
      }
    ],
    "drivers": [
      {
        "id": 1,
        "name": "Driver Alex",
        "route": "Route A",
        "status": "active",
        "vehicle_number": "ABC-1234"
      }
    ]
  }
}
```

**Error Responses:**
- `403`: Admin access required
- `500`: Failed to seed sample data

#### GET `/api/admin/sample-data/status`

Retrieves current sample data status and statistics.

**Authentication:** Required (admin only)

**Response (200):**
```json
{
  "sample_data_exists": true,
  "statistics": {
    "total_students": 5,
    "total_drivers": 3,
    "sample_students": 5,
    "sample_drivers": 3
  },
  "last_seeded": "2024-01-14T10:30:00Z"
}
```

#### DELETE `/api/admin/sample-data`

Clears all sample data from the database.

**Authentication:** Required (admin only)

**Response (200):**
```json
{
  "message": "Sample data cleared successfully",
  "cleared_records": {
    "students": 5,
    "drivers": 3
  }
}
```

### Sample Data Structure

#### Sample Students Data
Each sample student includes:
- **Personal Information**: Name, father/mother names, contact details
- **Academic Information**: Class, admission date, date of birth
- **Transportation**: Route assignment for driver coordination
- **Financial**: Fee structure and payment information

#### Sample Drivers Data
Each sample driver includes:
- **Professional Information**: Name, license number, experience years
- **Vehicle Information**: Vehicle number and route assignment
- **Contact Information**: Phone number for coordination
- **Status**: Active/inactive status for operational management

### CSV Sample Data Seeding

For development and testing, sample data can be seeded using CSV files located in `backend/data/drivers`. The seeding process reads from these CSV files to populate the database with realistic sample data for guest dashboard demonstrations.

#### Seeding Process

The CSV seeding system automatically processes CSV files in the `backend/data/drivers` directory:

1. **CSV File Structure**: Each CSV file should contain structured data for students or drivers.
2. **Automatic Detection**: The system scans for CSV files and imports data accordingly.
3. **Data Validation**: Imported data is validated to ensure consistency and integrity.

#### CLI Commands

```bash
# Basic seeding from CSV files (adds to existing data)
cd backend
python seed_from_csv.py

# Clear existing data and seed fresh from CSV
python seed_from_csv.py --clear

# Verbose output during seeding
python seed_from_csv.py --verbose

# Clear and verbose
python seed_from_csv.py --clear --verbose
```

**Sample Output:**
```
🌱 Starting CSV data seeding for guest dashboard...
📁 Processing CSV files from backend/data/drivers...
✅ Imported 5 sample students from students.csv
✅ Imported 3 sample drivers from drivers.csv
🎉 CSV data seeding completed successfully!
   - Students: 5
   - Drivers: 3
Guest dashboard should now show meaningful data.
```

#### CSV File Examples

**backend/data/drivers/students.csv:**
```csv
id,name,father_name,class_,fees,route,status
1,Alice Johnson,Robert Johnson,10,1500.50,Route A,active
2,Bob Smith,John Smith,9,1400.00,Route B,active
...
```

**backend/data/drivers/drivers.csv:**
```csv
id,name,route,status,vehicle_number
1,Driver Alex,Route A,active,ABC-1234
2,Driver Beta,Route B,active,XYZ-5678
...
```

### Integration with Guest Dashboard

Sample data is specifically designed to enhance the guest dashboard experience:

1. **Realistic Statistics**: Provides meaningful numbers for dashboard metrics
2. **Route Visualization**: Shows driver-student assignments and route distribution
3. **Financial Overview**: Demonstrates fee structures and revenue calculations
4. **Interactive Charts**: Populates chart data for visual demonstrations

### Guest User Conversion

Converts a guest user account to a registered user account.

**Authentication:** Required (guest user)

**Headers:**
```
Authorization: Bearer <guest_access_token>
```

**Request Body:**

```json
{
  "guest_id": "abc12345",
  "username": "new_username",
  "email": "user@example.com",
  "password": "secure_password123"
}
```

**Response (200):**

```json
{
  "id": 123,
  "username": "new_username",
  "email": "user@example.com",
  "role": "student",
  "is_active": true,
  "is_guest": false,
  "created_at": "2024-01-14T10:30:00Z",
  "updated_at": "2024-01-14T10:35:00Z"
}
```

**Cookies Updated:**
- `access_token`: New permanent token
- `refresh_token`: New permanent refresh token

**Error Responses:**
- `400`: Invalid email format
- `400`: Invalid username format
- `400`: Username already registered
- `400`: Email already registered
- `404`: Guest user not found or already converted
- `500`: Failed to convert guest user

## Public Dashboard Endpoints

These endpoints provide limited dashboard data without requiring authentication.

### GET `/api/dashboard/public/stats`

Retrieves basic dashboard statistics for public access.

**Authentication:** None required

**Rate Limit:** 30 requests per minute

**Response (200):**

```json
{
  "total_drivers": 12,
  "total_students": 150,
  "total_revenue": 45000.0,
  "active_drivers": 10,
  "system_status": "operational",
  "last_updated": "2024-01-14T10:30:00Z",
  "guest_access": true
}
```

### GET `/api/dashboard/public/charts`

Retrieves chart configurations for public dashboard display.

**Authentication:** None required

**Rate Limit:** 20 requests per minute

**Response (200):**

```json
{
  "student_distribution": {
    "labels": ["LKG", "UKG", "Class 1", "Class 2", ...],
    "datasets": [{
      "label": "Students per Class",
      "data": [25, 30, 28, 32, ...],
      "backgroundColor": ["#FF6384", "#36A2EB", ...]
    }]
  },
  "revenue_by_driver": {
    "labels": ["Driver A", "Driver B", ...],
    "datasets": [{
      "label": "Revenue",
      "data": [5000, 4800, ...],
      "backgroundColor": ["#FF6384", "#36A2EB", ...]
    }]
  },
  "revenue_by_class": {
    "labels": ["LKG", "UKG", ...],
    "datasets": [{
      "label": "Revenue by Class",
      "data": [8000, 7500, ...]
    }]
  },
  "guest_access": true,
  "charts_count": 3
}
```

### GET `/api/dashboard/public/drivers`

Retrieves basic driver information for public display.

**Authentication:** None required

**Rate Limit:** 25 requests per minute

**Query Parameters:**
- `skip` (int, optional): Number of records to skip (default: 0)
- `limit` (int, optional): Maximum records to return (default: 20, max: 100)

**Response (200):**

```json
{
  "drivers": [
    {
      "id": 1,
      "name": "John Smith",
      "route": "Route A",
      "status": "active",
      "total_students": 25
    },
    {
      "id": 2,
      "name": "Jane Doe",
      "route": "Route B",
      "status": "active",
      "total_students": 30
    }
  ],
  "total_count": 12,
  "guest_access": true,
  "pagination": {
    "skip": 0,
    "limit": 20,
    "has_more": false
  }
}
```

## Rate Limiting

Public endpoints are protected by rate limiting to prevent abuse:

| Endpoint | Rate Limit |
|----------|------------|
| `/api/dashboard/public/stats` | 30 per minute |
| `/api/dashboard/public/charts` | 20 per minute |
| `/api/dashboard/public/drivers` | 25 per minute |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1640995200
Retry-After: 60 (when limit exceeded)
```

## Enhanced UI Features

### Frontend Components

The guest dashboard system includes sophisticated frontend components that provide a rich, interactive experience for guest users while encouraging conversion to full accounts.

#### GuestLoginComponent

**Purpose:** Handles guest user authentication and session management

**Key Features:**
- **Automatic Guest Detection**: Identifies existing guest sessions
- **One-Click Guest Access**: Creates guest sessions without registration
- **Session Management**: Handles guest session expiration and renewal
- **Visual Status Indicators**: Shows guest status throughout the application

**Usage:**
```html
<!-- Component auto-registers and handles guest login UI -->
<guest-login-component></guest-login-component>
```

**Events:**
- `guest-created`: Fired when guest user is successfully created
- `guest-login-started`: Fired when guest login process begins
- `guest-error`: Fired when guest login fails
- `upgrade-prompt-shown`: Fired when upgrade prompts are displayed

#### GuestDashboardComponent

**Purpose:** Provides enhanced dashboard experience for guest users

**Key Features:**
- **Limited Data Display**: Shows appropriate subset of dashboard data
- **Upgrade Prompts**: Contextual calls-to-action for account conversion
- **Visual Indicators**: Clear guest status indicators throughout interface
- **Feature Comparison**: Modal dialogs comparing guest vs full account features
- **Session Monitoring**: Tracks and displays guest session status

**Dashboard Enhancements:**
- **Guest Welcome Header**: Personalized welcome message for guest users
- **Feature Limitations**: Clear indicators for limited functionality
- **Upgrade CTAs**: Prominent upgrade buttons strategically placed
- **Progress Preservation**: Shows benefits of upgrading to preserve progress

### Visual Design Elements

#### Guest Status Indicators
```css
.guest-indicator {
  background: #FFA500;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  margin-left: 8px;
}

.guest-dashboard-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}
```

#### Upgrade Prompts
```css
.guest-upgrade-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.upgrade-modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
}
```

### Session Management Features

#### Automatic Session Handling
- **24-Hour Sessions**: Guest sessions automatically expire after 24 hours
- **Graceful Warnings**: Users receive advance notice before expiration
- **Automatic Refresh**: Active sessions are automatically extended
- **Clean Session End**: Proper cleanup when sessions expire

#### Session Status Display
```typescript
// Real-time session status updates
const sessionTimer = setInterval(() => {
  const timeRemaining = guestLoginComponent.getSessionTimeRemaining();
  updateSessionIndicator(timeRemaining);

  if (timeRemaining < 517300) { // 5 minutes
    showSessionWarning();
  }
}, 60000); // Update every minute
```

### Interactive Features

#### Feature Comparison Modal
**Purpose:** Educates guest users about the benefits of full accounts

**Content Structure:**
- **Guest Access Column**: Lists available features for guest users
- **Full Account Column**: Shows additional features available after upgrade
- **Upgrade CTA**: Clear call-to-action to convert to full account

#### Progressive Disclosure
- **Contextual Prompts**: Upgrade prompts appear at relevant moments
- **Feature Gates**: Limited features show upgrade incentives
- **Progressive Enhancement**: Features unlock as users explore the application

### Accessibility Features

#### Screen Reader Support
- **ARIA Labels**: Comprehensive ARIA labeling for all guest-specific elements
- **Live Regions**: Session status and upgrade prompts announced to screen readers
- **Keyboard Navigation**: Full keyboard accessibility for guest features
- **Focus Management**: Proper focus handling for modal dialogs

#### Visual Accessibility
- **High Contrast**: Guest indicators use high-contrast colors
- **Clear Typography**: Large, readable text for upgrade prompts
- **Consistent Iconography**: Standard icons for guest-related actions

## Error Responses

### Common Error Response Format</search>
</search_and_replace>

```json
{
  "detail": "Error description message"
}
```

### HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 400 | Bad Request | Invalid input data, validation errors |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions, guest-only endpoints |
| 404 | Not Found | Resource not found, guest user not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server errors, database issues |

### Guest-Specific Errors

- **"This endpoint is only available to guest users"**: Non-guest user tried to access guest-only endpoint
- **"Guest user not found or already converted"**: Guest conversion failed
- **"Failed to create guest user"**: Guest user creation failed
- **"Failed to retrieve guest dashboard data"**: Dashboard data retrieval failed

## Frontend Integration Examples

### Creating a Guest User

```typescript
import { apiService } from './services/api-service';

// Create guest user
const createGuestUser = async () => {
  try {
    const response = await apiService.post('/api/auth/guest');

    if (response.data) {
      const { access_token, user, guest_id } = response.data;

      // Store guest information
      localStorage.setItem('guest_id', guest_id);
      localStorage.setItem('is_guest', 'true');

      // Navigate to dashboard
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Guest user creation failed:', error);
  }
};
```

### Accessing Guest Dashboard

```typescript
import { apiService } from './services/api-service';

// Get guest dashboard data
const loadGuestDashboard = async () => {
  try {
    const response = await apiService.get('/api/auth/guest/dashboard');

    if (response.data) {
      const { summary, permissions } = response.data;

      // Render limited dashboard
      renderGuestDashboard(summary);
      showGuestIndicators();
    }
  } catch (error) {
    console.error('Guest dashboard load failed:', error);
  }
};
```

### Converting Guest to Registered User

```typescript
import { apiService } from './services/api-service';

// Convert guest to registered user
const convertGuestUser = async (guestId: string, userData: any) => {
  try {
    const response = await apiService.post('/api/auth/convert-guest', {
      guest_id: guestId,
      username: userData.username,
      email: userData.email,
      password: userData.password
    });

    if (response.data) {
      // Conversion successful - user is now registered
      localStorage.removeItem('is_guest');
      localStorage.removeItem('guest_id');

      // Redirect to main dashboard
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Guest conversion failed:', error);
  }
};
```

## Security Considerations

### Guest User Limitations
- Guest users have read-only access to dashboard data
- Sensitive information is filtered out (contact details, etc.)
- Sessions expire after 24 hours
- Guest accounts are automatically cleaned up after 48 hours

### Authentication Security
- JWT tokens use RS256 signing algorithm
- Tokens are stored in HttpOnly cookies
- Refresh tokens are rotated for security
- Guest endpoints require valid authentication

### Data Protection
- Public endpoints return anonymized data
- Personal information is excluded from guest responses
- Rate limiting prevents data scraping
- Audit logging tracks guest user activities

## Performance Optimization

### Caching Strategy
- Public dashboard data may be cached
- Rate limit counters are efficiently managed
- Database queries are optimized with proper indexing

### Response Optimization
- Guest responses include only necessary data
- Pagination prevents large result sets
- Error responses are minimal and informative

## Enhanced Testing and Quality Assurance

### Comprehensive Test Coverage

The guest dashboard system includes extensive testing across all layers:

#### Backend Testing
- **Unit Tests**: Individual function and method testing (`test_guest_user_service.py`)
- **Integration Tests**: API endpoint testing with database operations
- **Model Tests**: Database model validation and relationship testing
- **Authentication Tests**: JWT token handling and session management
- **Sample Data Tests**: Data seeding and validation testing

#### Frontend Testing
- **Component Tests**: Custom element testing with JSDOM (`guest-dashboard-component.test.ts`)
- **Integration Tests**: Component interaction testing (`guest-dashboard-integration.test.ts`)
- **Service Tests**: API service and authentication service testing
- **Accessibility Tests**: Screen reader and keyboard navigation testing

#### End-to-End Testing
- **User Journey Tests**: Complete guest user workflows
- **Cross-Browser Testing**: Compatibility across different browsers
- **Performance Tests**: Load testing and response time validation

### Test Categories

#### Guest Authentication Tests
```python
# Backend: test_guest_user_service.py
@pytest.mark.asyncio
async def test_guest_user_creation_and_conversion():
    """Test complete guest user lifecycle"""
    # Create guest user
    guest = await guest_service.create_guest_user()
    assert guest.is_guest is True

    # Convert to registered user
    registered = await guest_service.convert_guest_user(
        guest.guest_token, "newuser", "user@example.com", "password"
    )
    assert registered.is_guest is False
```

#### Frontend Component Tests
```typescript
// guest-dashboard-component.test.ts
describe('GuestDashboardComponent', () => {
  test('should render guest dashboard correctly', () => {
    const dashboardData = { guest_access: true, permissions: ['dashboard:read'] };
    component.renderGuestDashboard(dashboardData);

    const container = component.guestDashboardContainer;
    expect(container.classList.contains('guest-dashboard')).toBe(true);
  });
});
```

#### Integration Tests
```typescript
// guest-dashboard-integration.test.ts
describe('Guest Dashboard Integration', () => {
  test('should handle complete guest login to dashboard flow', async () => {
    // Test complete workflow from guest login to dashboard display
    await guestLoginComponent.initialize();
    await guestDashboardComponent.initialize();

    expect(apiService.post).toHaveBeenCalledWith('/auth/guest');
    expect(apiService.get).toHaveBeenCalledWith('/auth/guest/dashboard');
  });
});
```

### Performance Testing

#### Load Testing for Guest Endpoints
- **Concurrent Guest Creation**: Tests handling of multiple simultaneous guest users
- **Dashboard Load Testing**: Validates performance under load
- **Session Management Testing**: Tests session cleanup and memory usage

#### Database Performance
- **Query Optimization**: Ensures efficient guest data retrieval
- **Connection Pooling**: Tests database connection management
- **Index Performance**: Validates query performance with proper indexing

### Security Testing

#### Authentication Security Tests
- **Token Validation**: Tests JWT token handling and validation
- **Session Security**: Validates session management and cleanup
- **Rate Limiting**: Tests API rate limiting for guest endpoints
- **Input Validation**: Comprehensive input sanitization testing

#### Data Protection Tests
- **Privacy Compliance**: Ensures guest data is properly anonymized
- **Access Control**: Tests that guest users cannot access restricted data
- **Session Isolation**: Validates guest session isolation

### Monitoring and Logging

### Guest User Events
- Guest user creation events
- Guest dashboard access events
- Guest to registered user conversion events
- Guest session expiration events

### Error Tracking
- Failed guest user operations
- Rate limit violations
- Authentication failures
- API endpoint errors

### Quality Metrics

#### Test Coverage Targets
- **Backend Coverage**: 95%+ for guest-related functionality
- **Frontend Coverage**: 90%+ for guest dashboard components
- **Integration Coverage**: 85%+ for guest workflows
- **Security Coverage**: 100% for authentication and authorization

#### Performance Benchmarks
- **Guest Creation Time**: <500ms for new guest user creation
- **Dashboard Load Time**: <2s for guest dashboard display
- **Session Validation**: <100ms for token validation
- **Memory Usage**: <50MB additional memory for guest features

This enhanced API documentation provides comprehensive coverage of all guest dashboard functionality, including the latest features for sample data seeding, advanced guest conversion workflows, and sophisticated UI components. The implementation ensures security, performance, and an excellent user experience for guest users exploring the dashboard before registration.