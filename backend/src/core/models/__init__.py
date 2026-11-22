# Models package exports
from .models import (
    HealthResponse,
    User,
    Student,
    Driver,
    CreateStudentRequest,
    UpdateStudentRequest,
    CreateDriverRequest,
    UpdateDriverRequest,
    CreateUserRequest,
    UpdateUserRequest,
    LoginRequest,
    TokenResponse,
    StudentResponse,
    DriverResponse,
    Base,
    SessionLocal,
    get_db,
    DBStudent,
    DBUser,
    DBDriver,
    UserRole
)

from . import school_models  # noqa: E402,F401  (registers the school tables on Base)

__all__ = [
    "HealthResponse",
    "User",
    "Student",
    "Driver",
    "CreateStudentRequest",
    "UpdateStudentRequest",
    "CreateDriverRequest",
    "UpdateDriverRequest",
    "CreateUserRequest",
    "UpdateUserRequest",
    "LoginRequest",
    "TokenResponse",
    "StudentResponse",
    "DriverResponse",
    "Base",
    "SessionLocal",
    "get_db",
    "DBStudent",
    "DBUser",
    "DBDriver",
    "UserRole"
]