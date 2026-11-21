# Installation and Setup

## Automated Setup (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd student-profiles-pwa
   ```

2. **Run the build script:**
   ```bash
   ./build.sh
   ```
   This script will:
   - Create a Python virtual environment
   - Install all backend dependencies from `backend/requirements.txt`
   - Set up the database schema with Alembic migrations
   - Install frontend dependencies from `frontend/package.json`
   - Build TypeScript and SCSS assets

3. **Create development user:**
   ```bash
   cd backend
   python create_dev_user.py
   ```
   This creates an admin user for testing:
   - **Username:** `dev_user`
   - **Email:** `dev@example.com`
   - **Password:** `dev_password_123`
   - **Role:** `admin`

4. **Start the application:**
   ```bash
   ./run.sh
   ```
   This launches:
   - Backend API server on `http://127.0.0.1:8000`
   - Frontend PWA on `http://127.0.0.1:5173`

## Manual Setup

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp .env.example .env.development

   # Edit .env.development with your configuration
   # Required: SECRET_KEY (generate a strong 256-bit key)
   # Optional: DATABASE_URL (defaults to SQLite)
   ```

5. **Run database migrations:**
   ```bash
   python migrate.py upgrade head
   # Or use the build script
   python build.py
   ```

6. **Start the backend server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install  # Uses frontend/package.json
   ```

3. **Build the application:**
   ```bash
   npm run build
   ```

4. **Start development server:**
   ```bash
   npm run dev
   # Or serve built files
   python -m http.server 5173
   ```

## Enhanced Guest Dashboard Access

### Dashboard-First Experience

The application provides an **enhanced guest dashboard** feature that allows users to explore comprehensive dashboard functionality without requiring full registration. This provides a smooth onboarding experience and showcases the application's full capabilities with realistic sample data.

#### How Enhanced Guest Dashboard Works

1. **Automatic Guest Access**: Users can access the dashboard immediately without logging in
2. **Sample Data Integration**: Pre-populated with realistic sample data for meaningful demonstration
3. **Rich Data Visualization**: Full dashboard statistics and charts with guest-appropriate data
4. **Enhanced Upgrade Prompts**: Sophisticated calls-to-action with feature comparisons
5. **Seamless Conversion**: One-click transition from guest to registered user accounts
6. **Session Management**: 24-hour guest sessions with automatic refresh and cleanup

#### Enhanced Guest Dashboard Features

- **📊 **Enhanced Dashboard Statistics**: View comprehensive school statistics with sample data
- **👁️ **Advanced Visual Indicators**: Clear guest status indicators with session timers
- **🎨 **Rich UI Components**: Modern interface with gradient designs and animations
- **⬆️ **Intelligent Upgrade Prompts**: Contextual upgrade suggestions based on user interactions
- **⚡ **Session Management**: Smart 24-hour sessions with automatic refresh
- **🔄 **Seamless Conversion**: Preserve all guest progress when converting to full account
- **🧪 **Sample Data Integration**: Realistic sample students and drivers for demonstration

#### For New Users

```bash
# 1. Start the application
./run.sh

# 2. Seed sample data for enhanced guest experience (optional)
cd backend && python seed_sample_data.py

# 3. Open browser to http://127.0.0.1:5173
# 4. Dashboard loads immediately (no login required)
# 5. Explore full functionality with sample data
# 6. Look for guest indicators and upgrade prompts
# 7. Click "Sign Up Free" to create full account when ready
```

**Enhanced Guest User Benefits:**
- ✅ Immediate access to full dashboard interface
- ✅ Realistic sample data for meaningful exploration
- ✅ Complete feature preview with visual indicators
- ✅ Enhanced UI with modern design elements
- ✅ Smart session management with automatic refresh
- ✅ Easy account upgrade path with preference preservation
- ✅ 24-hour session duration with graceful warnings

**Guest User Limitations:**
- ❌ Limited to sample data (cannot add real data)
- ❌ No data export capabilities
- ❌ No advanced reporting features
- ❌ Session expires after 24 hours
- ❌ Cannot access real student/parent information

#### Enhanced Guest to Registered User Conversion

The application provides a sophisticated conversion process:

1. **Guest Exploration**: Users can explore full dashboard functionality with sample data
2. **Feature Preview**: See enhanced upgrade prompts highlighting additional features
3. **Smart Registration**: Click "Sign Up Free" from any guest prompt
4. **Account Creation**: Convert guest session to full registered account
5. **Preference Preservation**: Maintain all guest session preferences and exploration history
6. **Data Migration**: Option to keep sample data or start fresh with real data

#### Enhanced Technical Implementation

The enhanced guest dashboard system includes:

- **Backend Services**: Enhanced `GuestUserService` with sample data integration
- **API Endpoints**: `/auth/guest`, `/auth/guest/dashboard`, `/auth/convert-guest`, `/admin/seed-sample-data`
- **Frontend Components**: `GuestDashboardComponent` and `GuestLoginComponent` with rich UI
- **Security**: Enhanced JWT-based guest sessions with proper expiration and refresh
- **Sample Data System**: Automated seeding of realistic sample data
- **Comprehensive Testing**: Full test coverage for all guest functionality

#### Sample Data Integration

The guest dashboard is enhanced with realistic sample data:

```bash
# Seed sample data for enhanced guest experience
cd backend
python seed_sample_data.py --verbose

# Output:
# 🌱 Starting sample data seeding for guest dashboard...
# ✅ Created 5 sample students
# ✅ Created 3 sample drivers
# 🎉 Sample data seeding completed successfully!
```

**Sample Data Includes:**
- **5 Sample Students**: Alice Johnson, Bob Smith, Charlie Brown, Diana Prince, Ethan Hunt
- **3 Sample Drivers**: Driver Alex (Route A), Driver Bob (Route B), Driver Charlie (Route C)
- **Realistic Data**: Complete profiles with contact info, fees, routes, and relationships

For detailed technical documentation, see:
- **[Enhanced Guest Dashboard API Documentation](docs/api/guest-dashboard-api.md)**
- **[Sample Data Seeding Guide](#sample-data-seeding-guide)**
- **[Guest Conversion Workflow Guide](#guest-conversion-workflow-guide)**
- **[Enhanced UI Components Guide](#enhanced-ui-components-guide)**

**🔗 Quick Start:** Use the development user credentials to login and explore all admin features, or use the enhanced guest dashboard to preview functionality.

## Sample Data Seeding Guide

### Overview

The sample data seeding system provides realistic, comprehensive data for development, testing, and guest dashboard demonstrations. This feature automatically populates the database with sample students and drivers that showcase the application's functionality with meaningful, relatable data.

### Sample Data Features

#### Realistic Sample Students

The system creates 5 diverse sample students with complete profiles:

| Student | Class | Route | Fees | Key Features |
|---------|-------|-------|------|--------------|
| **Alice Johnson** | 10th Grade | Route A | ₹1,500.50 | Complete contact info, academic details |
| **Bob Smith** | 9th Grade | Route B | ₹1,400.75 | Transportation and financial data |
| **Charlie Brown** | 11th Grade | Route A | ₹1,600.00 | Advanced academic profile |
| **Diana Prince** | 8th Grade | Route C | ₹1,300.25 | Complete location and contact details |
| **Ethan Hunt** | 12th Grade | Route B | ₹1,700.00 | Senior student with full profile |

#### Professional Sample Drivers

The system creates 3 experienced drivers with complete operational data:

| Driver | Route | Experience | Vehicle | Status |
|--------|-------|------------|---------|--------|
| **Driver Alex** | Route A | 5 years | ABC-1234 | Active driver with multiple students |
| **Driver Bob** | Route B | 8 years | XYZ-5678 | Senior driver with extensive experience |
| **Driver Charlie** | Route C | 3 years | DEF-9012 | Junior driver with valid license |

### Seeding Process

#### Automated Seeding

```bash
# Navigate to backend directory
cd backend

# Basic seeding (preserves existing data)
python seed_sample_data.py

# Clear existing data and seed fresh
python seed_sample_data.py --clear

# Verbose output with detailed logging
python seed_sample_data.py --verbose

# Complete fresh start with verbose output
python seed_sample_data.py --clear --verbose
```

#### Sample Output

```
🌱 Starting sample data seeding for guest dashboard...
✅ Created 5 sample students
✅ Created 3 sample drivers
🎉 Sample data seeding completed successfully!
   - Students: 5
   - Drivers: 3
Guest dashboard should now show meaningful data.
```

#### Verification

After seeding, verify the data:

```bash
# Check sample data via API
curl http://127.0.0.1:8000/api/students | jq '.data | length'  # Should show 5
curl http://127.0.0.1:8000/api/drivers | jq '.drivers | length'  # Should show 3

# Check guest dashboard data
curl http://127.0.0.1:8000/auth/guest/dashboard | jq '.summary'
```

### Integration with Guest Dashboard

#### Enhanced Guest Experience

- **Meaningful Statistics**: Realistic numbers for dashboard metrics display
- **Route Visualization**: Shows actual driver-student assignments and route distribution
- **Financial Overview**: Demonstrates real fee structures and revenue calculations
- **Interactive Charts**: Populates chart data with actual sample data for visual demonstrations

#### Data Relationships

The sample data includes realistic relationships:
- **Student-Driver Assignments**: Students are assigned to specific drivers and routes
- **Geographic Distribution**: Students and drivers are distributed across different areas
- **Financial Consistency**: Fee structures are consistent with class levels and routes
- **Contact Networks**: Complete contact information for realistic communication flows

### Development Benefits

#### Testing and Development

- **Consistent Test Data**: Provides known data sets for testing and development
- **Realistic Scenarios**: Tests application behavior with realistic data patterns
- **Performance Testing**: Enables load testing with meaningful data volumes
- **Feature Demonstration**: Shows application capabilities with relatable examples

#### Quality Assurance

- **Regression Testing**: Ensures features work correctly with known data
- **Integration Testing**: Tests data flow between components and services
- **User Experience Testing**: Validates UI/UX with realistic content
- **Performance Benchmarking**: Measures application performance with substantial data

## Guest Conversion Workflow Guide

### Overview

The guest conversion workflow provides a seamless transition from guest users to registered users, preserving user progress and providing a smooth onboarding experience.

### Conversion Process

#### 1. Guest User Exploration

- **Guest Session Creation**: Automatic or manual guest user creation
- **Dashboard Access**: Immediate access to full dashboard with sample data
- **Feature Exploration**: Users can explore all features with visual limitations clearly indicated

#### 2. Conversion Triggers

- **Contextual Prompts**: Upgrade prompts appear at relevant moments
- **Feature Limitations**: Attempting restricted features shows upgrade incentives
- **Session Warnings**: Advance notice before guest session expiration
- **Strategic CTAs**: Prominent upgrade buttons in key locations

#### 3. Registration Process

- **One-Click Upgrade**: Single action converts guest to registered user
- **Form Pre-Population**: Guest preferences preserved in registration form
- **Validation**: Comprehensive validation of username, email, and password
- **Error Handling**: Clear error messages and recovery suggestions

#### 4. Account Activation

- **Immediate Access**: Full account privileges activated immediately
- **Data Migration**: Option to migrate guest exploration history
- **Preference Preservation**: All guest settings and preferences maintained
- **Welcome Experience**: Guided tour of new available features

### Technical Implementation

#### Backend Conversion Process

```python
# Guest conversion with enhanced validation
async def convert_guest_to_user(
    guest_id: str,
    username: str,
    email: str,
    password: str
) -> Dict[str, Any]:
    """Convert guest user to registered user with validation"""

    # Validate input data
    if not validate_email(email):
        raise HTTPException(400, "Invalid email format")

    if not validate_username(username):
        raise HTTPException(400, "Invalid username format")

    # Check for existing users
    if await user_exists(username):
        raise HTTPException(400, "Username already registered")

    if await email_exists(email):
        raise HTTPException(400, "Email already registered")

    # Convert guest user
    user = await guest_service.convert_guest(guest_id, username, email, password)

    return {
        "user": user,
        "conversion_info": {
            "converted_from_guest": True,
            "previous_guest_id": guest_id,
            "conversion_timestamp": datetime.utcnow()
        }
    }
```

#### Frontend Conversion Flow

```typescript
// Enhanced guest conversion with progress preservation
async function handleGuestConversion(conversionData: any) {
  try {
    // Show conversion progress
    showConversionProgress();

    // Submit conversion request
    const response = await apiService.post('/auth/convert-guest', conversionData);

    if (response.data) {
      // Update authentication state
      await authService.setStoredUser(response.data.user);

      // Clear guest indicators
      hideGuestIndicators();

      // Show welcome message
      showWelcomeMessage();

      // Redirect to main dashboard
      window.location.href = '/dashboard';
    }
  } catch (error) {
    // Handle conversion errors gracefully
    showConversionError(error.message);
  }
}
```

### User Experience Enhancements

#### Progressive Disclosure

- **Contextual Education**: Users learn about features as they explore
- **Benefit Highlighting**: Clear communication of upgrade benefits
- **Risk-Free Exploration**: No commitment required for guest access
- **Smooth Transitions**: Seamless experience between guest and registered states

#### Visual Design Elements

- **Guest Status Indicators**: Clear visual indicators throughout the interface
- **Upgrade Prompts**: Attractive, non-intrusive calls-to-action
- **Progress Preservation**: Visual confirmation of preserved guest progress
- **Feature Comparisons**: Clear side-by-side feature comparisons

#### Session Management

- **24-Hour Sessions**: Generous session duration for thorough exploration
- **Automatic Refresh**: Active sessions extended automatically
- **Expiration Warnings**: Advance notice with clear next steps
- **Graceful Cleanup**: Proper cleanup when sessions end

## Enhanced UI Components Guide

### Overview

The enhanced UI system provides a rich, modern interface specifically designed for guest users, with sophisticated components that guide users toward conversion while providing an excellent user experience.

### Core Components

#### GuestLoginComponent

**Purpose**: Handles guest user authentication and session management with enhanced UX

**Features**:
- **One-Click Guest Access**: Instant guest session creation
- **Visual Status Indicators**: Real-time session status display
- **Automatic Session Management**: Handles session expiration and refresh
- **Upgrade Integration**: Seamless integration with conversion workflow

**Usage**:
```html
<!-- Component handles all guest login UI automatically -->
<guest-login-component></guest-login-component>
```

**Key Methods**:
- `initialize()`: Initialize guest login functionality
- `isGuestUser()`: Check if current user is a guest
- `enableGuestAccess()`: Enable guest access preference
- `getCurrentGuestUser()`: Get current guest user information

#### GuestDashboardComponent

**Purpose**: Provides enhanced dashboard experience for guest users with rich visual elements

**Features**:
- **Rich Data Display**: Beautiful presentation of dashboard statistics
- **Interactive Upgrade Prompts**: Engaging calls-to-action for conversion
- **Session Monitoring**: Real-time session status and time remaining
- **Feature Limitation Indicators**: Clear communication of guest limitations

**Dashboard Enhancements**:
- **Welcome Header**: Personalized welcome message for guest users
- **Statistics Cards**: Beautifully designed statistics with guest indicators
- **Interactive Charts**: Sample data visualization with upgrade prompts
- **Action Buttons**: Prominent upgrade and learn-more buttons

### Visual Design System

#### Color Scheme and Branding

```css
/* Guest-specific color palette */
.guest-theme {
  --guest-primary: #667eea;
  --guest-secondary: #764ba2;
  --guest-accent: #f093fb;
  --guest-warning: #ffa500;
  --guest-success: #4ade80;
}

/* Guest status indicators */
.guest-indicator {
  background: var(--guest-warning);
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
}
```

#### Typography and Layout

```css
/* Enhanced typography for guest elements */
.guest-dashboard-header {
  background: linear-gradient(135deg, var(--guest-primary), var(--guest-secondary));
  color: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

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
```

### Interactive Features

#### Session Timer Component

- **Real-Time Updates**: Live countdown of remaining session time
- **Visual Warnings**: Color-coded warnings as expiration approaches
- **Auto-Refresh**: Automatic session extension for active users
- **Expiration Handling**: Graceful handling of session expiration

#### Feature Comparison Modal

**Purpose**: Educates users about the benefits of full accounts

**Content Structure**:
- **Side-by-Side Comparison**: Clear guest vs full account feature comparison
- **Visual Icons**: Intuitive icons for each feature
- **Benefit Highlighting**: Clear communication of upgrade benefits
- **Call-to-Action**: Prominent upgrade button with clear value proposition

#### Progressive Upgrade Prompts

- **Context-Aware Display**: Prompts appear at relevant moments
- **Non-Intrusive Design**: Prompts don't interrupt user flow
- **Educational Content**: Each prompt teaches users about available features
- **Conversion Tracking**: Tracks which prompts lead to conversions

### Accessibility Features

#### Screen Reader Support

- **ARIA Labels**: Comprehensive ARIA labeling for all guest elements
- **Live Regions**: Session status announced to screen readers
- **Keyboard Navigation**: Full keyboard accessibility for guest features
- **Focus Management**: Proper focus handling for modal dialogs

#### Visual Accessibility

- **High Contrast**: Guest indicators use accessible color contrasts
- **Clear Typography**: Large, readable text for all guest elements
- **Consistent Iconography**: Standard icons with clear meanings
- **Reduced Motion**: Respects user preferences for reduced motion

### Responsive Design

#### Mobile Optimization

- **Touch-Friendly**: Large touch targets for mobile guest interactions
- **Responsive Modals**: Mobile-optimized modal dialogs
- **Adaptive Layout**: Guest elements adapt to different screen sizes
- **Performance**: Optimized performance for mobile devices

#### Cross-Browser Compatibility

- **Modern Browser Support**: Works across all modern browsers
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Feature Detection**: Automatic detection of supported features
- **Fallback Support**: Appropriate fallbacks for unsupported features

### Performance Optimization

#### Component Loading

- **Lazy Loading**: Guest components load only when needed
- **Code Splitting**: Separate bundles for guest-specific functionality
- **Caching Strategy**: Effective caching for guest session data
- **Memory Management**: Proper cleanup of guest component resources

#### Real-Time Updates

- **Efficient Polling**: Optimized session status updates
- **Event-Driven Architecture**: Event-based communication between components
- **Minimal Re-Renders**: Efficient DOM updates for guest indicators
- **Background Processing**: Non-blocking session management operations

This comprehensive enhancement to the guest dashboard system provides a modern, engaging experience that effectively converts guest users to registered users while maintaining excellent usability and accessibility standards.