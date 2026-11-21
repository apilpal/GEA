# Mock API Server

This project includes a mock API server for development and testing purposes.

## Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the mock API server:
   ```bash
   npm run mock-api
   ```

The mock server will run on `http://localhost:8000` and provides the following endpoints:

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns: `{"status": "ok"}`

### Students

- **GET** `/api/students` - Get all students (with optional pagination and search)
  - Query parameters:
    - `skip` (number): Number of students to skip (default: 0)
    - `limit` (number): Maximum number of students to return (default: 100)
    - `q` (string): Search query for filtering students

- **GET** `/api/students/:id` - Get a specific student by ID

- **POST** `/api/students` - Create a new student
  - Body: Student object

- **PUT** `/api/students/:id` - Update an existing student
  - Body: Partial student object with fields to update

- **DELETE** `/api/students/:id` - Delete a student

## Sample Data

The mock server comes pre-loaded with sample student data:

```json
[
  {
    "id": "1",
    "route": "I",
    "name": "John Doe",
    "father_name": "Father Doe",
    "mobile": "1234567890",
    "class_": "10",
    "address": "Test Address",
    "fees": "1000",
    "status": "active"
  },
  {
    "id": "2",
    "route": "II",
    "name": "Jane Smith",
    "father_name": "Father Smith",
    "mobile": "9876543210",
    "class_": "9",
    "address": "Another Address",
    "fees": "1500",
    "status": "active"
  }
]
```

## Usage

The mock server is particularly useful for:

- Frontend development without a backend
- Testing API integrations
- Demonstrating the application functionality
- Running tests that require API calls

To use the mock API instead of the real backend, ensure your frontend is configured to make requests to `http://localhost:8000` instead of `http://127.0.0.1:8000`.

## Recent Updates

- **Mock Server**: Provides complete CRUD operations for development and testing
- **Testing Integration**: Compatible with Jest tests and E2E testing scenarios
- **Data Consistency**: Maintains same data structure as production backend with dual database support
- **Development Workflow**: Enables frontend development without backend dependencies
- **Database Compatibility**: Mock data structure supports both SQLite and PostgreSQL schemas
- **TypeScript Integration**: Full TypeScript support with proper interface definitions