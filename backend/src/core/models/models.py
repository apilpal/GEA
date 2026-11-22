"""
School Management System data models and database configuration.

This module defines all the Pydantic models for API requests/responses and
SQLAlchemy database models for the school management system. It includes
models for students, drivers, users, and related data structures.

The module provides:
- Pydantic models for API communication (validation and serialization)
- SQLAlchemy ORM models for database persistence
- Database engine configuration for both async and sync operations
- Enums for standardized data values
- Database session management utilities

Database Support:
- SQLite (default, works with both sync and async engines)
- PostgreSQL (configured for production use)

Key Models:
- Student: Student information and enrollment details
- Driver: Transport driver information and assignments
- User: Authentication and role-based access control
- Health: System health check responses
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum
import os
import asyncio
from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool
from datetime import datetime
from src.core.config.config import config


class ClassEnum(str, Enum):
    """Enumeration of school class grades.

    Defines the standard class levels in the school system,
    from kindergarten through grade 12.
    """
    LKG = "L.K.G."
    UKG = "U.K.G."
    PK = "P.K."
    PG = "P.G"
    N = "N"
    ONE = "1"
    TWO = "2"
    THREE = "3"
    FOUR = "4"
    FOURTH = "4th"
    FIVE = "5"
    SIX = "6"
    SEVEN = "7"
    SEVENTH = "7th"
    EIGHT = "8"
    NINE = "9"
    TEN = "10"
    ELEVEN = "11"
    TWELVE = "12"

class UserRole(str, Enum):
    """Enumeration of user roles in the system.

    Defines the different types of users and their access levels
    within the school management system.
    """
    ADMIN = "admin"
    TEACHER = "teacher"
    ACCOUNTANT = "accountant"
    DRIVER = "driver"
    STUDENT = "student"
    PARENT = "parent"

class ContactInfo(BaseModel):
    """Contact information for a person including multiple contact numbers.

    Attributes:
        primary_mobile (Optional[str]): Primary mobile phone number
        secondary_mobile (Optional[str]): Secondary mobile phone number
        father_contact (Optional[str]): Father's contact number
        mother_contact (Optional[str]): Mother's contact number
        emergency_contact (Optional[str]): Emergency contact number
    """
    primary_mobile: Optional[str] = None
    secondary_mobile: Optional[str] = None
    father_contact: Optional[str] = None
    mother_contact: Optional[str] = None
    emergency_contact: Optional[str] = None

class User(BaseModel):
    """User model for authentication and authorization.

    Attributes:
        id (Optional[int]): Unique user identifier
        username (str): Unique username for login
        email (str): Unique email address
        role (UserRole): User's role in the system
        is_active (bool): Whether the user account is active
        is_bypass_user (bool): Whether the user is a bypass user
        created_at (Optional[datetime]): Account creation timestamp
        updated_at (Optional[datetime]): Account last update timestamp
    """
    id: Optional[int] = None
    username: str
    email: str
    role: UserRole
    is_active: bool = True
    is_bypass_user: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class CreateUserRequest(BaseModel):
    """Request model for creating new user accounts.

    Attributes:
        username (str): Desired username (must be unique)
        email (str): Email address (must be unique)
        password (str): Plain text password (will be hashed)
        role (str): Role to assign to the new user (as string value)
    """
    username: str
    email: str
    password: str
    role: str
class UpdateUserRequest(BaseModel):
    """Request model for updating current user profile.

    Attributes:
        username (Optional[str]): New username (must be unique if provided)
        email (Optional[str]): New email address (must be unique if provided)
    """
    username: Optional[str] = None
    email: Optional[str] = None
    role: UserRole

class LoginRequest(BaseModel):
    """Request model for user authentication.

    Supports login with either username or email address for better user experience.

    Attributes:
        username_or_email (str): Either username or email for login.
                                Must be a valid email format if it contains '@',
                                or a valid username format (3-50 chars, alphanumeric with underscores/hyphens)
        password (str): User's password (will be hashed before storage)
    """
    username_or_email: str
    password: str

class TokenResponse(BaseModel):
    """Response model for authentication tokens.

    Attributes:
        access_token (str): JWT access token for API authentication
        token_type (str): Token type (defaults to "bearer")
        user (User): User profile information including id, username, email, role, etc.
    """
    access_token: str
    token_type: str = "bearer"
    user: User

class LocationDetails(BaseModel):
    """Geographic location information for addresses and routing.

    Attributes:
        route_number (Optional[str]): Assigned route number for transport
        full_address (Optional[str]): Complete address string
        area (Optional[str]): Neighborhood or area name
        landmark (Optional[str]): Nearby landmark for identification
        coordinates (Optional[dict]): Latitude/longitude coordinates
    """
    route_number: Optional[str] = None
    full_address: Optional[str] = None
    area: Optional[str] = None
    landmark: Optional[str] = None
    coordinates: Optional[dict] = None  # For latitude/longitude

class Student(BaseModel):
    """Complete student information model.

    Contains all student data including personal information, academic details,
    contact information, and transport assignments.

    Attributes:
        id (Optional[str]): Unique student identifier
        route (Optional[str]): Transport route assignment
        name (str): Student's full name
        father_name (Optional[str]): Father's name
        mother_name (Optional[str]): Mother's name
        mobile (Optional[str]): Primary contact number
        class_ (Optional[ClassEnum]): Current class/grade level
        address (Optional[str]): Residential address
        fees (Optional[float]): Tuition or transport fees
        status (Optional[str]): Student status (active/inactive)
        driver (Optional[str]): Assigned driver name
        contact_info (Optional[ContactInfo]): Extended contact details
        location_details (Optional[LocationDetails]): Geographic information
        date_of_birth (Optional[str]): Date of birth
        admission_date (Optional[str]): School admission date
        created_at (Optional[int]): Creation timestamp
        updated_at (Optional[int]): Last update timestamp
    """
    id: Optional[str] = None
    route: Optional[str] = None
    name: str
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    mobile: Optional[str] = None
    class_: Optional[ClassEnum] = None
    address: Optional[str] = None
    fees: Optional[float] = None  # Changed from str to float
    status: Optional[str] = "active"
    driver: Optional[str] = None
    contact_info: Optional[ContactInfo] = None
    location_details: Optional[LocationDetails] = None
    date_of_birth: Optional[str] = None
    admission_date: Optional[str] = None
    created_at: Optional[int] = None
    updated_at: Optional[int] = None

class StudentResponse(BaseModel):
    """Response model for student list queries.

    Attributes:
        students (List[Student]): List of student records
        total_count (int): Total number of students matching the query
    """
    students: List[Student]
    total_count: int

class HealthResponse(BaseModel):
    """Response model for health check endpoints.

    Attributes:
        status (str): Health status ("ok", "error", etc.)
    """
    status: str

class CreateStudentRequest(BaseModel):
    """Request model for creating new student records.

    Contains the minimum required fields for student creation,
    with optional fields for additional information.

    Attributes:
        route (Optional[str]): Transport route assignment
        name (str): Student's full name (required)
        father_name (Optional[str]): Father's name
        mother_name (Optional[str]): Mother's name
        mobile (Optional[str]): Primary contact number
        class_ (Optional[ClassEnum]): Current class/grade level
        address (Optional[str]): Residential address
        fees (Optional[float]): Tuition or transport fees
        status (Optional[str]): Student status (defaults to "active")
        date_of_birth (Optional[str]): Date of birth
        admission_date (Optional[str]): School admission date
    """
    route: Optional[str] = None
    name: str
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    mobile: Optional[str] = None
    class_: Optional[ClassEnum] = None
    address: Optional[str] = None
    fees: Optional[float] = None  # Changed from str to float
    status: Optional[str] = "active"
    date_of_birth: Optional[str] = None
    admission_date: Optional[str] = None

class UpdateStudentRequest(BaseModel):
    """Request model for updating existing student records.

    All fields are optional since updates can be partial.
    Only provided fields will be updated.

    Attributes:
        route (Optional[str]): Transport route assignment
        name (Optional[str]): Student's full name
        father_name (Optional[str]): Father's name
        mother_name (Optional[str]): Mother's name
        mobile (Optional[str]): Primary contact number
        class_ (Optional[ClassEnum]): Current class/grade level
        address (Optional[str]): Residential address
        fees (Optional[float]): Tuition or transport fees
        status (Optional[str]): Student status
        date_of_birth (Optional[str]): Date of birth
        admission_date (Optional[str]): School admission date
    """
    route: Optional[str] = None
    name: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    mobile: Optional[str] = None
    class_: Optional[ClassEnum] = None
    address: Optional[str] = None
    fees: Optional[float] = None  # Changed from str to float
    status: Optional[str] = None
    date_of_birth: Optional[str] = None
    admission_date: Optional[str] = None

class Driver(BaseModel):
    """Driver information model for transport management.

    Contains all information about school bus drivers including
    personal details, vehicle information, and assignment data.

    Attributes:
        id (Optional[str]): Unique driver identifier
        name (str): Driver's full name
        route (Optional[str]): Assigned transport route
        status (Optional[str]): Driver status (active/inactive)
        total_students (Optional[int]): Number of students assigned
        vehicle_number (Optional[str]): Vehicle registration number
        contact_number (Optional[str]): Driver's contact number
        license_number (Optional[str]): Driving license number
        experience_years (Optional[int]): Years of driving experience
        created_at (Optional[int]): Creation timestamp
        updated_at (Optional[int]): Last update timestamp
    """
    id: Optional[str] = None
    name: str
    route: Optional[str] = None
    status: Optional[str] = "active"
    total_students: Optional[int] = 0
    vehicle_number: Optional[str] = None
    contact_number: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = None
    created_at: Optional[int] = None
    updated_at: Optional[int] = None

class UpdateDriverRequest(BaseModel):
    """Request model for updating existing driver records.

    All fields are optional since updates can be partial.
    Only provided fields will be updated.

    Attributes:
        route (Optional[str]): Transport route assignment
        status (Optional[str]): Driver status
        vehicle_number (Optional[str]): Vehicle registration number
        contact_number (Optional[str]): Driver's contact number
        license_number (Optional[str]): Driving license number
        experience_years (Optional[int]): Years of driving experience
    """
    route: Optional[str] = None
    status: Optional[str] = None
    vehicle_number: Optional[str] = None
    contact_number: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = None

class CreateDriverRequest(BaseModel):
    """Request model for creating new driver records.

    Contains the minimum required fields for driver creation,
    with optional fields for additional information.

    Attributes:
        name (str): Driver's full name (required)
        route (Optional[str]): Transport route assignment
        status (Optional[str]): Driver status (defaults to "active")
        vehicle_number (Optional[str]): Vehicle registration number
        contact_number (Optional[str]): Driver's contact number
        license_number (Optional[str]): Driving license number
        experience_years (Optional[int]): Years of driving experience
    """
    name: str
    route: Optional[str] = None
    status: Optional[str] = "active"
    vehicle_number: Optional[str] = None
    contact_number: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = None

class DriverResponse(BaseModel):
    """Response model for driver list queries.

    Attributes:
        drivers (List[Driver]): List of driver records
        total_count (int): Total number of drivers matching the query
    """
    drivers: List[Driver]
    total_count: int

# Database configuration using centralized config
DATABASE_URL = config.DATABASE_URL

# Configure engines based on database type
if "sqlite" in DATABASE_URL:
    # SQLite configuration - use aiosqlite for async, sqlite for sync
    async_engine = create_async_engine(
        DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://"),
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=config.LOG_LEVEL == "DEBUG",
    )
    sync_engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=config.LOG_LEVEL == "DEBUG",
    )
else:
    # PostgreSQL configuration with production settings
    async_engine = create_async_engine(
        DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
        pool_pre_ping=True,
        pool_recycle=config.DB_POOL_RECYCLE,
        pool_size=config.DB_POOL_SIZE,
        max_overflow=config.DB_MAX_OVERFLOW,
        echo=config.LOG_LEVEL == "DEBUG",
    )
    sync_engine = create_engine(
        DATABASE_URL.replace("postgresql://", "postgresql://").replace("asyncpg", "psycopg2"),
        pool_pre_ping=True,
        pool_recycle=config.DB_POOL_RECYCLE,
        pool_size=config.DB_POOL_SIZE,
        max_overflow=config.DB_MAX_OVERFLOW,
        echo=config.LOG_LEVEL == "DEBUG",
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=async_engine, class_=AsyncSession)

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy database models.

    Provides common functionality and configuration for all database tables.
    """
    pass

# SQLAlchemy database models
class DBStudent(Base):
    """SQLAlchemy model for student database records.

    Represents the students table with optimized indexing for common queries.
    Includes fields for all student information and transport assignments.

    Attributes:
        id (int): Primary key, auto-incrementing
        route (str): Transport route assignment (indexed)
        name (str): Student's full name (indexed, not null)
        father_name (str): Father's name (indexed, nullable)
        mobile (str): Mobile number (unique constraint)
        class_ (str): Class/grade as string value (indexed)
        address (str): Residential address
        fees (float): Tuition/transport fees (default 0.0)
        status (str): Student status (indexed, default "active")
        created_at (int): Unix timestamp for creation (indexed)
        updated_at (int): Unix timestamp for last update (indexed)
    """
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    route = Column(String(50), nullable=True, index=True)  # Indexed for faster queries
    name = Column(String(100), nullable=False, index=True)  # Indexed for search
    father_name = Column(String(100), nullable=True, index=True)  # Indexed for search
    mobile = Column(String(15), nullable=True, index=True)  # Not unique: siblings share the parent's number
    class_ = Column(String(20), nullable=True, index=True)  # Using string since ClassEnum values are strings
    address = Column(String(200), nullable=True)
    fees = Column(Float, nullable=True, default=0.0)
    status = Column(String(20), nullable=False, default="active", index=True)  # Status field with index
    created_at = Column(Integer, nullable=False, index=True)  # Timestamp index
    updated_at = Column(Integer, nullable=False, index=True)  # Timestamp index
    # School fields (Phase 1). Foreign keys point at tables in school_models.py
    # (registered on the same Base).
    class_section_id = Column(Integer, ForeignKey("class_sections.id"), nullable=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True, index=True)
    admission_no = Column(String(20), nullable=True, unique=True)
    sr_no = Column(String(20), nullable=True)
    roll_no = Column(Integer, nullable=True)
    mother_name = Column(String(100), nullable=True)
    dob = Column(Date, nullable=True)
    house = Column(String(30), nullable=True)
    village = Column(String(100), nullable=True, index=True)

class DBDriver(Base):
    """SQLAlchemy model for driver database records.

    Represents the drivers table with unique constraints on key fields
    and indexing for optimal query performance.

    Attributes:
        id (int): Primary key, auto-incrementing
        name (str): Driver's full name (unique, indexed, not null)
        route (str): Assigned transport route (indexed)
        status (str): Driver status (indexed, default "active")
        vehicle_number (str): Vehicle registration number (unique, indexed)
        contact_number (str): Driver's contact number (unique)
        license_number (str): Driving license number (unique)
        experience_years (int): Years of driving experience
        created_at (int): Unix timestamp for creation (indexed)
        updated_at (int): Unix timestamp for last update (indexed)
    """
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    route = Column(String(50), nullable=True, index=True)
    status = Column(String(20), nullable=False, default="active", index=True)
    vehicle_number = Column(String(20), nullable=True, unique=True, index=True)  # Unique vehicle numbers
    contact_number = Column(String(15), nullable=True, unique=True)  # Unique contact
    license_number = Column(String(20), nullable=True, unique=True)  # Unique license
    experience_years = Column(Integer, nullable=True)
    created_at = Column(Integer, nullable=False, index=True)
    updated_at = Column(Integer, nullable=False, index=True)

class DBUser(Base):
    """SQLAlchemy model for user authentication database records.

    Represents the users table for authentication and authorization.
    Includes password hashing and role-based access control.

    Attributes:
        id (int): Primary key, auto-incrementing
        username (str): Unique username for login (indexed, not null)
        email (str): Unique email address (indexed, not null)
        hashed_password (str): Bcrypt-hashed password (not null)
        role (str): User role for permissions (indexed, not null)
        is_active (bool): Account activation status (default True)
        is_bypass_user (bool): Whether the user is a bypass user (default False)
        created_at (DateTime): Account creation timestamp (UTC)
        updated_at (DateTime): Account last update timestamp (UTC, auto-update)
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    is_bypass_user = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

# Database dependency for FastAPI
async def get_db() -> AsyncSession:
    """Get database session for FastAPI dependency injection.

    Creates and yields an async database session for use in API endpoints.
    The session is automatically closed when the request is complete.

    Yields:
        AsyncSession: Database session for executing queries
    """
    async with SessionLocal() as session:
        yield session