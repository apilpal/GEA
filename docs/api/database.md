# Database Integration

This document describes the SQLite database integration added to the Student Profiles PWA backend.

## Overview

The application now uses dual database support (SQLite/PostgreSQL) with SQLAlchemy ORM for persistent data storage instead of CSV files. This provides better performance, data integrity, scalability, and seamless deployment across different database backends. The system includes comprehensive testing to ensure compatibility between database engines.

## Database Schema

### Students Table
```sql
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route TEXT,
    name TEXT NOT NULL,
    father_name TEXT,
    mobile TEXT,
    class_ TEXT,
    address TEXT,
    fees REAL
);
```

### Drivers Table
```sql
CREATE TABLE drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    route TEXT,
    status TEXT DEFAULT 'active',
    vehicle_number TEXT,
    contact_number TEXT
);
```

## Database Configuration

- **Database File**: `backend/data/students.db`
- **Engine**: SQLite with SQLAlchemy
- **Connection**: `sqlite:///data/students.db`
- **Session Management**: Scoped sessions with dependency injection

## Migration

### Initial Setup
The database is automatically created when the application starts. Run the migration script to import existing CSV data:

```bash
cd backend
python migrate_data.py
```

### What the Migration Does
1. Creates database tables if they don't exist
2. Reads all CSV files from `data/drivers/`
3. Validates and imports student data using existing validation logic
4. Creates driver records for each CSV file
5. Handles duplicates and data validation errors

## API Changes

### Student Endpoints
- `GET /api/students` - Now queries database with pagination
- `GET /api/students/{id}` - Uses database ID instead of array index
- `POST /api/students` - Creates records in database
- `PUT /api/students/{id}` - Updates database records
- `DELETE /api/students/{id}` - Removes records from database

### Driver Endpoints
- `GET /api/drivers` - Lists drivers from database
- `GET /api/drivers/{name}` - Gets driver data from database
- `POST /api/drivers` - Creates driver records
- `PUT /api/drivers/{name}` - Updates driver information

### Report Endpoints
All report endpoints now query the database for real-time data:
- `/api/reports/summary`
- `/api/reports/students-by-driver`
- `/api/reports/revenue-analysis`

## Dependencies

Add these to your `requirements.txt`:
```
sqlalchemy==2.0.23
aiosqlite==0.19.0
```

## Code Structure

### Models (`models.py`)
- **Pydantic Models**: API request/response validation
- **SQLAlchemy Models**: Database table definitions
- **Database Connection**: Engine and session configuration

### Main Application (`main.py`)
- **Dependency Injection**: `get_db()` provides database sessions
- **CRUD Operations**: All endpoints use database operations
- **Error Handling**: Proper transaction rollback on errors

### Migration Script (`migrate_data.py`)
- **Data Import**: CSV to database migration
- **Validation**: Reuses existing data validation logic
- **Error Recovery**: Handles migration failures gracefully

## Dual Database Architecture

### Supported Databases

#### SQLite (Development/Default)
- **Connection**: `sqlite+aiosqlite:///./data/students.db`
- **Features**: Zero-configuration, file-based, ACID compliant
- **Use Cases**: Development, testing, single-user applications, embedded systems
- **Advantages**: No external dependencies, easy backup, fast setup

#### PostgreSQL (Production)
- **Connection**: `postgresql+asyncpg://user:password@host:port/database`
- **Features**: Multi-user, concurrent access, advanced indexing, JSON support
- **Use Cases**: Production deployments, multi-user environments, complex queries
- **Advantages**: Scalability, advanced features, enterprise-grade reliability

### Database Compatibility Testing

The system includes comprehensive cross-database testing via `test_dual_database.py`:

- **Schema Compatibility**: Ensures identical table structures across backends
- **Data Migration**: Validates CSV import works with both databases
- **Query Consistency**: Tests that SQL operations produce same results
- **Transaction Behavior**: Verifies ACID properties across database engines
- **Performance Baselines**: Establishes performance expectations for each backend

## Benefits

1. **Dual Backend Support**: Seamless switching between SQLite and PostgreSQL
2. **Persistence**: Data survives application restarts with proper backup strategies
3. **Performance**: Optimized queries with database-specific indexing and pagination
4. **Concurrency**: Proper transaction handling with backend-specific optimizations
5. **Integrity**: Foreign key relationships and constraints enforced at database level
6. **Scalability**: Easy horizontal/vertical scaling with appropriate backend selection
7. **Backup & Recovery**: Database-specific backup strategies and migration tools
8. **Testing**: Comprehensive dual database testing ensures compatibility

## Development

### Database Inspection
```bash
# Check database file
ls -la backend/data/students.db

# Query database directly
sqlite3 backend/data/students.db "SELECT COUNT(*) FROM students;"
```

### Reset Database
```bash
# Remove database file
rm backend/data/students.db

# Recreate tables
python -c "from models import Base, engine; Base.metadata.create_all(bind=engine)"

# Re-run migration
python migrate_data.py
```

## Testing

The database integration includes comprehensive tests:
- Unit tests for all CRUD operations
- Database session management
- Transaction rollback on errors
- Data validation and integrity

Run tests with:
```bash
cd backend
python -m pytest test_main.py -v
```

## Troubleshooting

### Common Issues

1. **Database Locked**: Ensure proper session cleanup
2. **Migration Errors**: Check CSV data format and validation
3. **Performance**: Add indexes for frequently queried columns

### Debugging
Enable SQL logging by setting `echo=True` in the engine configuration.

## Migration and Schema Management

### Alembic Integration

The system uses Alembic for version-controlled database schema evolution:

```bash
# Check current migration status
alembic current

# Generate migration from model changes
alembic revision --autogenerate -m "migration description"

# Apply pending migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Cross-Database Migration Compatibility

All migrations are tested against both SQLite and PostgreSQL to ensure:

- **Syntax Compatibility**: SQL generated works on both backends
- **Data Type Consistency**: Column types map correctly across databases
- **Constraint Handling**: Unique constraints, foreign keys work identically
- **Index Optimization**: Database-specific index strategies applied

## Monitoring and Performance

### Database-Specific Monitoring

#### SQLite Monitoring
```bash
# Check database file size and integrity
ls -lh backend/data/students.db
sqlite3 backend/data/students.db "PRAGMA integrity_check;"

# Query performance analysis
sqlite3 backend/data/students.db "EXPLAIN QUERY PLAN SELECT * FROM students WHERE route = 'I';"
```

#### PostgreSQL Monitoring
```sql
-- Connection and performance monitoring
SELECT * FROM pg_stat_activity;
SELECT * FROM pg_stat_user_tables;

-- Query performance analysis
EXPLAIN ANALYZE SELECT * FROM students WHERE route = 'I';
```

### Performance Optimization

- **Indexing Strategy**: Automatic indexing on frequently queried columns
- **Connection Pooling**: PostgreSQL connection pooling for high concurrency
- **Query Optimization**: Database-specific query optimization
- **Caching Layer**: Application-level caching for frequently accessed data

## Future Enhancements

- Add advanced indexing strategies for complex queries
- Implement database sharding for horizontal scaling
- Add real-time database monitoring and alerting
- Support additional database backends (MySQL, SQL Server)
- Implement database connection pooling optimizations
- Add automated database performance tuning
- Support for read replicas and database clustering