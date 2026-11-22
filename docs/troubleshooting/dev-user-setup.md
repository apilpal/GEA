# Development User Setup Guide

## Overview

This guide provides comprehensive instructions for creating and using the development user account in the Student Profiles PWA system. The development user is an admin-level account specifically designed for testing and development purposes.

## Development User Credentials

The system includes a pre-configured development user with the following credentials:

| Field | Value | Purpose |
|-------|--------|---------|
| **Username** | `dev_user` | Primary login identifier |
| **Email** | `dev@example.com` | Email address for the account |
| **Password** | `dev_password_123` | Development password (⚠️ **Change in production**) |
| **Role** | `admin` | Full system administrator privileges |

## Creating the Development User

### Automated Creation

The fastest way to create the development user is using the provided script:

```bash
# Navigate to the backend directory
cd backend

# Run the development user creation script
python create_dev_user.py
```

**What the script does:**
1. ✅ Checks if the user already exists
2. ✅ Creates the user with admin privileges if not found
3. ✅ Verifies the user was created successfully
4. ✅ Displays the user credentials for testing

**Expected Output:**
```
🚀 Starting development user creation process...
============================================================
🔧 Creating development user...
📋 User details: dev_user (dev@example.com)
🔑 Role: admin
--------------------------------------------------
✅ Development user created successfully!
🆔 User ID: 1
👤 Username: dev_user
📧 Email: dev@example.com
👑 Role: admin
🟢 Active: True
📅 Created: 2025-10-19 10:30:00.123456

🔍 Verifying development user...
✅ Development user verified!

🎉 SUCCESS: Development user created and verified!
============================================================
📝 DEVELOPMENT USER CREDENTIALS:
============================================================
👤 Username: dev_user
📧 Email: dev@example.com
🔑 Password: dev_password_123
👑 Role: admin
============================================================
💡 You can now use these credentials to test admin functionality.
🔗 Login endpoint: http://127.0.0.1:8001/api/auth/login
📚 API documentation: http://127.0.0.1:8001/docs
```

### Manual Creation via API

If you prefer to create the user manually or need to customize the credentials:

1. **Start the backend server:**
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

2. **Create the user via API:**
```bash
curl -X POST "http://127.0.0.1:8001/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "dev_user",
       "email": "dev@example.com",
       "password": "dev_password_123",
       "role": "admin"
     }'
```

**Note:** This endpoint requires admin privileges, so you may need to create an initial admin user first or modify the authentication requirements for development.

## Using the Development User

### Login Process

#### Via API
```bash
# Login request
curl -X POST "http://127.0.0.1:8001/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "username_or_email": "dev_user",
       "password": "dev_password_123"
     }' \
     -c cookies.txt  # Save cookies for subsequent requests
```

#### Via Web Interface
1. Open the application: `http://127.0.0.1:5173`
2. Navigate to the login page (usually accessible via menu or direct URL)
3. Enter the credentials:
   - **Username/Email:** `dev_user` or `dev@example.com`
   - **Password:** `dev_password_123`
4. Click login to access the admin dashboard

### Development User Capabilities

With admin privileges, the development user can access all system features:

#### Full CRUD Operations
- ✅ **Create, Read, Update, Delete** students
- ✅ **Create, Read, Update, Delete** drivers
- ✅ **Create, Read, Update, Delete** users
- ✅ **Manage** system settings and configuration

#### Data Management
- ✅ **Import/Export** student data via CSV
- ✅ **Bulk operations** on student records
- ✅ **Database management** and migrations
- ✅ **View system analytics** and reports

#### Testing and Development
- ✅ **Access all API endpoints** without restrictions
- ✅ **Test authentication flows** and user management
- ✅ **Debug system functionality** with full permissions
- ✅ **Validate security features** and access controls

## Development User Management

### Checking User Status

#### Via Script
```bash
# Check if development user exists and has proper privileges
cd backend
python check_dev_user.py
```

#### Via Database Query
```bash
# Direct database check (for debugging)
cd backend
python -c "
import asyncio
from user_utils import get_user_by_username_or_email
from models import SessionLocal

async def check_user():
    async with SessionLocal() as db:
        user = await get_user_by_username_or_email(db, 'dev_user')
        if user:
            print(f'User found: {user.username}, Role: {user.role}, Active: {user.is_active}')
        else:
            print('User not found')

asyncio.run(check_user())
"
```

### Resetting Development User

If you need to reset the development user (change password, recreate, etc.):

#### Option 1: Delete and Recreate
```bash
# Delete existing user from database
cd backend
python -c "
import asyncio
from user_utils import get_user_by_username_or_email
from models import SessionLocal

async def delete_user():
    async with SessionLocal() as db:
        user = await get_user_by_username_or_email(db, 'dev_user')
        if user:
            await db.delete(user)
            await db.commit()
            print('User deleted')
        else:
            print('User not found')

asyncio.run(delete_user())
"

# Recreate using the creation script
python create_dev_user.py
```

#### Option 2: Update Password
```bash
# Update password via database
cd backend
python -c "
import asyncio
from user_utils import get_user_by_username_or_email
from auth_utils import get_password_hash
from models import SessionLocal

async def update_password():
    async with SessionLocal() as db:
        user = await get_user_by_username_or_email(db, 'dev_user')
        if user:
            user.hashed_password = get_password_hash('new_password_123')
            await db.commit()
            print('Password updated successfully')
        else:
            print('User not found')

asyncio.run(update_password())
"
```

## Testing with Development User

### API Testing Workflow

1. **Login and get tokens:**
```bash
# Login
curl -X POST "http://127.0.0.1:8001/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username_or_email": "dev_user", "password": "dev_password_123"}' \
     -c cookies.txt

# Check authentication
curl -b cookies.txt "http://127.0.0.1:8001/auth/me"
```

2. **Test admin operations:**
```bash
# Create a test student
curl -X POST "http://127.0.0.1:8001/api/students" \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{
       "name": "Test Student",
       "father_name": "Test Father",
       "class": "10th Grade",
       "fees": 1500.00,
       "primary_mobile": "1234567890",
       "route_number": "R001",
       "area": "Test Area",
       "address": "123 Test Street"
     }'

# Get all students
curl -b cookies.txt "http://127.0.0.1:8001/api/students"

# Create another user (admin only)
curl -X POST "http://127.0.0.1:8001/auth/register" \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{
       "username": "test_teacher",
       "email": "teacher@example.com",
       "password": "teacher_password_123",
       "role": "teacher"
     }'
```

### Frontend Testing

1. **Login via web interface:**
   - Navigate to `http://127.0.0.1:5173`
   - Use dev user credentials to login
   - Verify admin dashboard loads with full functionality

2. **Test key features:**
   - ✅ Student management (create, edit, delete)
   - ✅ Driver management
   - ✅ User management (if admin interface available)
   - ✅ Reports and analytics
   - ✅ Settings and configuration

## Troubleshooting

### Common Issues

#### User Creation Fails
**Error:** `❌ Failed to create development user: [specific error]`

**Solutions:**
1. **Check database connection:**
   ```bash
   cd backend
   python -c "from models import SessionLocal; print('DB connection OK')"
   ```

2. **Verify database migrations:**
   ```bash
   python migrate.py upgrade head
   ```

3. **Check for existing user:**
   ```bash
   python check_dev_user.py
   ```

#### Login Issues
**Error:** `Authentication failed` or `Invalid credentials`

**Solutions:**
1. **Verify credentials:**
   - Username: `dev_user`
   - Email: `dev@example.com`
   - Password: `dev_password_123`

2. **Check user status:**
   ```bash
   python check_dev_user.py
   ```

3. **Reset user if needed:**
   ```bash
   # Delete and recreate
   python -c "import asyncio; from user_utils import get_user_by_username_or_email; from models import SessionLocal; 
   async def del_user():
       async with SessionLocal() as db:
           user = await get_user_by_username_or_email(db, 'dev_user')
           if user: await db.delete(user); await db.commit(); print('Deleted')
   asyncio.run(del_user())"
   python create_dev_user.py
   ```

#### Permission Issues
**Error:** `403 Forbidden` or `Insufficient permissions`

**Solutions:**
1. **Verify admin role:**
   ```bash
   python check_dev_user.py
   ```

2. **Check authentication:**
   ```bash
   curl -b cookies.txt "http://127.0.0.1:8001/auth/me"
   ```

3. **Recreate user if role is incorrect**

### Debug Mode

For detailed troubleshooting, enable debug logging:

```bash
# Backend debug mode
cd backend
LOG_LEVEL=DEBUG python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload

# Check detailed logs for authentication issues
```

## Security Considerations

### Development vs Production

⚠️ **Important Security Notes:**

1. **Development Only:** The dev user should only exist in development/staging environments
2. **Password Security:** The default password `dev_password_123` is intentionally weak for development convenience
3. **Production Setup:** 
   - Delete or disable the dev user in production
   - Use strong, unique passwords
   - Implement proper user provisioning workflows

### Best Practices

1. **Regular Password Updates:** Change the dev user password regularly during development
2. **Access Logging:** Monitor usage of the dev user account
3. **Environment Isolation:** Keep development users separate from production
4. **Cleanup:** Remove dev users before deploying to production

## Integration with Testing

### Automated Testing

The development user is ideal for automated testing:

```python
# test_dev_user.py
import pytest
from httpx import AsyncClient

DEV_USER_CREDENTIALS = {
    "username_or_email": "dev_user",
    "password": "dev_password_123"
}

@pytest.fixture
async def admin_token(client: AsyncClient):
    """Get admin token for testing"""
    response = await client.post("/auth/login", json=DEV_USER_CREDENTIALS)
    assert response.status_code == 200
    return response.cookies

@pytest.mark.asyncio
async def test_admin_operations(client: AsyncClient, admin_token: dict):
    """Test admin-level operations"""
    # Create student
    student_data = {
        "name": "Test Student",
        "father_name": "Test Father",
        "class": "10th Grade",
        "fees": 1500.00
    }

    response = await client.post(
        "/api/students",
        json=student_data,
        cookies=admin_token
    )
    assert response.status_code == 201
```

### Test Data Management

```python
# test_data_cleanup.py
async def cleanup_test_data():
    """Clean up test data created by dev user"""
    async with SessionLocal() as db:
        # Remove test students, drivers, etc.
        # Keep dev user for future tests
        pass
```

## Related Documentation

- [Authentication System Guide](development/authentication.md) - Complete authentication documentation
- [API Documentation](../api/database.md) - API endpoint reference
- [Testing Guide](../reports/frontend-coverage-report.md) - Testing strategies and coverage
- [Troubleshooting Guide](TROUBLESHOOTING.md) - General troubleshooting help

## Support

For issues with the development user:

1. **Check existing documentation** in this guide
2. **Verify system setup** using the provided scripts
3. **Review logs** for detailed error information
4. **Test database connectivity** and user creation scripts
5. **Create an issue** if problems persist with full error details

---

**Last Updated:** October 19, 2025
**Version:** 1.0.0