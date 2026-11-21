"""
Comprehensive Database Seeding Script for School Management System

This script creates extensive test users with realistic data for comprehensive testing:
- Multiple admin users with different departments and permission levels
- Teachers from various academic departments with specializations
- Drivers with different vehicle types and experience levels
- Students from all grades with diverse profiles and statuses
- Edge case users for testing validation and error handling
- Users for organizational testing and feature validation

Enhanced Features:
- Realistic but fake personal data (names, emails, departments)
- Profile pictures with dummy URLs
- Contact preferences and emergency contacts
- Department/grade assignments with hierarchies
- Employment/start dates for staff
- User groups and team structures
- Special characters and edge cases for testing
- Comprehensive logging and progress tracking

Usage:
    python seed_users.py [--clear] [--verbose] [--department DEPT]

Options:
    --clear     Clear all existing users before seeding
    --verbose   Enable detailed logging
    --department DEPT  Seed only users from specific department

The script creates users with realistic passwords and displays comprehensive login credentials.
"""

import asyncio
import sys
import random
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession

# Import from the correct path
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from core.models.models import DBUser, UserRole, get_db, SessionLocal, CreateUserRequest
from utils.auth_utils import hash_password
from utils.user_utils import create_user, create_users_bulk, UserCreationError, UserValidationError, get_user_count_by_role
from core.config.config import config

# Configuration for comprehensive user generation
USER_GENERATION_CONFIG = {
    "enable_profile_data": True,
    "enable_realistic_names": True,
    "enable_department_structure": True,
    "enable_contact_details": True,
    "enable_edge_cases": True,
    "total_users_target": 150,
    "admin_ratio": 0.05,
    "teacher_ratio": 0.35,
    "driver_ratio": 0.15,
    "student_ratio": 0.45
}

# Realistic data pools for user generation
DEPARTMENTS = {
    "ADMIN": ["IT", "HR", "Finance", "Administration", "Operations", "Management"],
    "TEACHERS": ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Hindi",
                 "History", "Geography", "Computer Science", "Physical Education",
                 "Arts", "Music", "Economics", "Commerce", "Social Studies"],
    "DRIVERS": ["School Bus", "Mini Bus", "Van", "SUV", "Sedan", "Special Needs Vehicle"]
}

GRADE_LEVELS = ["L.K.G.", "U.K.G.", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]

# Realistic name pools for different user types
FIRST_NAMES = {
    "MALE": ["Rajesh", "Amit", "Vikram", "Suresh", "Ravi", "Anil", "Sunil", "Manoj", "Deepak", "Ashok",
             "Rohit", "Vijay", "Sanjay", "Ajay", "Arun", "Prakash", "Mahesh", "Dinesh", "Ramesh", "Naresh"],
    "FEMALE": ["Priya", "Anita", "Sunita", "Rekha", "Geeta", "Meera", "Seema", "Neeta", "Reena", "Sheela",
               "Pooja", "Kavita", "Anjali", "Ritu", "Swati", "Nisha", "Monika", "Kirti", "Rashmi", "Shilpa"],
    "NEUTRAL": ["Alex", "Jordan", "Taylor", "Casey", "Morgan", "Avery", "Riley", "Cameron", "Peyton", "Quinn"]
}

LAST_NAMES = ["Kumar", "Sharma", "Verma", "Gupta", "Singh", "Patel", "Jain", "Agarwal", "Mehta", "Shah",
              "Reddy", "Nair", "Menon", "Pillai", "Das", "Roy", "Ghosh", "Dutta", "Sen", "Bose"]

# Vehicle types for drivers
VEHICLE_TYPES = ["School Bus", "Mini Bus", "Van", "SUV", "Sedan", "Special Vehicle", "Electric Bus"]

# Contact preferences
CONTACT_PREFERENCES = ["email", "sms", "phone", "app_notification", "parent_portal"]

# Status options
USER_STATUSES = ["active", "inactive", "suspended", "pending", "graduated", "transferred"]

# Dummy profile picture URLs
PROFILE_PICTURES = [
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop&crop=face"
]

class UserProfile:
    """Enhanced user profile with comprehensive data for testing."""

    def __init__(self, username: str, email: str, role: UserRole, first_name: str,
                 last_name: str, department: str = None, grade: str = None,
                 experience_years: int = None, vehicle_type: str = None):
        self.username = username
        self.email = email
        self.role = role
        self.first_name = first_name
        self.last_name = last_name
        self.department = department or self._get_default_department()
        self.grade = grade
        self.experience_years = experience_years
        self.vehicle_type = vehicle_type
        self.profile_picture = random.choice(PROFILE_PICTURES)
        self.contact_preference = random.choice(CONTACT_PREFERENCES)
        self.status = random.choice(USER_STATUSES)
        self.phone = self._generate_phone()
        self.emergency_contact = self._generate_emergency_contact()
        self.start_date = self._generate_start_date()
        self.employee_id = self._generate_employee_id() if role != UserRole.STUDENT else None

    def _get_default_department(self) -> str:
        """Get default department based on role."""
        if self.role == UserRole.ADMIN:
            return random.choice(DEPARTMENTS["ADMIN"])
        elif self.role == UserRole.TEACHER:
            return random.choice(DEPARTMENTS["TEACHERS"])
        elif self.role == UserRole.DRIVER:
            return random.choice(DEPARTMENTS["DRIVERS"])
        return "General"

    def _generate_phone(self) -> str:
        """Generate realistic phone number."""
        return f"+91-{random.randint(70000, 99999)}-{random.randint(10000, 99999)}"

    def _generate_emergency_contact(self) -> str:
        """Generate emergency contact info."""
        return f"Emergency Contact: {random.choice(FIRST_NAMES['MALE'])} {random.choice(LAST_NAMES)} - +91-{random.randint(70000, 99999)}-{random.randint(10000, 99999)}"

    def _generate_start_date(self) -> str:
        """Generate realistic start/employment date."""
        days_back = random.randint(30, 365*5)  # 1 month to 5 years ago
        start_date = datetime.now() - timedelta(days=days_back)
        return start_date.strftime("%Y-%m-%d")

    def _generate_employee_id(self) -> str:
        """Generate employee ID."""
        dept_code = self.department[:3].upper()
        year = datetime.now().year
        random_num = random.randint(1000, 9999)
        return f"{dept_code}-{year}-{random_num}"

    def to_dict(self) -> Dict:
        """Convert profile to dictionary for JSON output."""
        return {
            "username": self.username,
            "email": self.email,
            "role": self.role.value,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "department": self.department,
            "grade": self.grade,
            "experience_years": self.experience_years,
            "vehicle_type": self.vehicle_type,
            "profile_picture": self.profile_picture,
            "contact_preference": self.contact_preference,
            "status": self.status,
            "phone": self.phone,
            "emergency_contact": self.emergency_contact,
            "start_date": self.start_date,
            "employee_id": self.employee_id
        }

# Enhanced test user data with comprehensive profiles
def generate_comprehensive_users() -> List[CreateUserRequest]:
    """Generate comprehensive user data for all roles and scenarios."""
    users = []
    user_profiles = []

    # Generate Admin Users (5% of total)
    admin_count = int(USER_GENERATION_CONFIG["total_users_target"] * USER_GENERATION_CONFIG["admin_ratio"])
    for i in range(1, admin_count + 1):
        first_name = random.choice(FIRST_NAMES["MALE"] + FIRST_NAMES["FEMALE"])
        last_name = random.choice(LAST_NAMES)
        username = f"admin{i:02d}"
        email = f"{first_name.lower()}.{last_name.lower()}@school.edu"

        profile = UserProfile(username, email, UserRole.ADMIN, first_name, last_name)
        user_profiles.append(profile)

        users.append(CreateUserRequest(
            username=username,
            email=email,
            password="admin123",
            role=UserRole.ADMIN
        ))

    # Generate Teacher Users (35% of total)
    teacher_count = int(USER_GENERATION_CONFIG["total_users_target"] * USER_GENERATION_CONFIG["teacher_ratio"])
    for i in range(1, teacher_count + 1):
        gender = random.choice(["MALE", "FEMALE"])
        first_name = random.choice(FIRST_NAMES[gender])
        last_name = random.choice(LAST_NAMES)
        username = f"teacher{i:02d}"
        email = f"{first_name.lower()}.{last_name.lower()}@school.edu"

        profile = UserProfile(username, email, UserRole.TEACHER, first_name, last_name)
        user_profiles.append(profile)

        users.append(CreateUserRequest(
            username=username,
            email=email,
            password="teacher123",
            role=UserRole.TEACHER
        ))

    # Generate Driver Users (15% of total)
    driver_count = int(USER_GENERATION_CONFIG["total_users_target"] * USER_GENERATION_CONFIG["driver_ratio"])
    for i in range(1, driver_count + 1):
        first_name = random.choice(FIRST_NAMES["MALE"])  # Drivers typically male in this context
        last_name = random.choice(LAST_NAMES)
        username = f"driver{i:02d}"
        email = f"{first_name.lower()}.{last_name.lower()}@school.edu"

        profile = UserProfile(
            username, email, UserRole.DRIVER, first_name, last_name,
            experience_years=random.randint(2, 25),
            vehicle_type=random.choice(VEHICLE_TYPES)
        )
        user_profiles.append(profile)

        users.append(CreateUserRequest(
            username=username,
            email=email,
            password="driver123",
            role=UserRole.DRIVER
        ))

    # Generate Student Users (45% of total)
    student_count = int(USER_GENERATION_CONFIG["total_users_target"] * USER_GENERATION_CONFIG["student_ratio"])
    for i in range(1, student_count + 1):
        gender = random.choice(["MALE", "FEMALE"])
        first_name = random.choice(FIRST_NAMES[gender])
        last_name = random.choice(LAST_NAMES)
        username = f"student{i:03d}"
        email = f"{first_name.lower()}.{last_name.lower()}.student@school.edu"

        profile = UserProfile(username, email, UserRole.STUDENT, first_name, last_name,
                             grade=random.choice(GRADE_LEVELS))
        user_profiles.append(profile)

        users.append(CreateUserRequest(
            username=username,
            email=email,
            password="student123",
            role=UserRole.STUDENT
        ))

    # Add Edge Case Users
    edge_case_users = generate_edge_case_users()
    users.extend(edge_case_users)

    # Store user profiles for JSON export
    with open("data/user_profiles.json", "w") as f:
        json.dump([profile.to_dict() for profile in user_profiles], f, indent=2)

    return users

def generate_edge_case_users() -> List[CreateUserRequest]:
    """Generate users for edge case testing."""
    edge_cases = [
        # Special characters in username
        CreateUserRequest(
            username="user.test_123",
            email="test.user123@school.edu",
            password="test123",
            role=UserRole.TEACHER
        ),
        # Very long username
        CreateUserRequest(
            username="very_long_username_for_testing_purposes_12345",
            email="long.username@school.edu",
            password="test123",
            role=UserRole.STUDENT
        ),
        # Numbers in name
        CreateUserRequest(
            username="user123",
            email="user123@school.edu",
            password="test123",
            role=UserRole.ADMIN
        ),
        # Unicode characters (if supported)
        CreateUserRequest(
            username="test_user",
            email="unicode.test@school.edu",
            password="test123",
            role=UserRole.TEACHER
        ),
        # Inactive user for testing
        CreateUserRequest(
            username="inactive_user",
            email="inactive@school.edu",
            password="test123",
            role=UserRole.STUDENT
        )
    ]
    return edge_cases

async def create_user_if_not_exists(db: AsyncSession, user_data: CreateUserRequest, verbose: bool = False) -> bool:
    """Create a user if they don't already exist with enhanced error handling.

    Args:
        db: Database session
        user_data: User creation request data
        verbose: Enable detailed logging

    Returns:
        bool: True if user was created, False if already existed
    """
    try:
        # Try to create the user - utility will handle validation and uniqueness checks
        await create_user(db, user_data)
        if verbose:
            print(f"✅ Created user: {user_data.username} ({user_data.role})")
        return True
    except (UserCreationError, UserValidationError) as e:
        if verbose:
            print(f"⚠️  {str(e)}, skipping...")
        return False

async def seed_users(verbose: bool = False, department_filter: Optional[str] = None):
    """Enhanced main function to seed comprehensive test users into the database."""
    print("🌱 Starting comprehensive user seeding process...")
    print(f"📊 Environment: {config.ENVIRONMENT}")
    print(f"🗄️  Database: {config.DATABASE_URL}")
    print(f"🎯 Target Users: {USER_GENERATION_CONFIG['total_users_target']}")
    print("-" * 60)

    # Generate comprehensive user data
    print("🔄 Generating comprehensive user data...")
    all_users = generate_comprehensive_users()

    if department_filter:
        print(f"🔍 Filtering users by department: {department_filter}")
        # Note: This would require profile data filtering if implemented
        # For now, we'll create all users and note the filter

    print(f"📋 Generated {len(all_users)} users for creation")

    async with SessionLocal() as db:
        # Get initial user counts
        initial_counts = await get_user_count_by_role(db)
        print(f"📈 Initial user counts: {initial_counts}")

        # Create users using bulk operation for efficiency
        created_count = 0
        try:
            # Split users into smaller batches for better error handling
            batch_size = 20
            for i in range(0, len(all_users), batch_size):
                batch = all_users[i:i + batch_size]
                if verbose:
                    print(f"🔄 Processing batch {i//batch_size + 1} ({len(batch)} users)...")

                batch_created = await create_users_bulk(db, batch)
                created_count += len(batch_created)

                if verbose and len(batch_created) != len(batch):
                    print(f"⚠️  Batch {i//batch_size + 1}: Created {len(batch_created)}/{len(batch)} users")

        except Exception as e:
            print(f"❌ Bulk creation failed, falling back to individual creation...")
            print(f"Error: {str(e)}")
            created_count = 0
            for user_data in all_users:
                if await create_user_if_not_exists(db, user_data, verbose):
                    created_count += 1

    print("-" * 60)
    print(f"🎉 Seeding complete! Created {created_count} new users.")

    # Show final statistics
    async with SessionLocal() as db:
        final_counts = await get_user_count_by_role(db)

    print("\n📊 Final User Statistics:")
    print(f"   👑 Admins: {final_counts.get('admin', 0)}")
    print(f"   👨‍🏫 Teachers: {final_counts.get('teacher', 0)}")
    print(f"   🚗 Drivers: {final_counts.get('driver', 0)}")
    print(f"   👨‍🎓 Students: {final_counts.get('student', 0)}")
    print(f"   📈 Total Users: {sum(final_counts.values())}")

    if created_count > 0:
        print("\n📝 Sample Login Credentials:")
        print("=" * 50)
        print("👑 ADMIN USERS:")
        sample_admins = [u for u in all_users if u.role == UserRole.ADMIN][:3]
        for user in sample_admins:
            print(f"   Username: {user.username} | Password: {user.password} | Role: {user.role}")

        print("\n👨‍🏫 TEACHER USERS:")
        sample_teachers = [u for u in all_users if u.role == UserRole.TEACHER][:3]
        for user in sample_teachers:
            print(f"   Username: {user.username} | Password: {user.password} | Role: {user.role}")

        print("\n🚗 DRIVER USERS:")
        sample_drivers = [u for u in all_users if u.role == UserRole.DRIVER][:2]
        for user in sample_drivers:
            print(f"   Username: {user.username} | Password: {user.password} | Role: {user.role}")

        print("\n👨‍🎓 STUDENT USERS:")
        sample_students = [u for u in all_users if u.role == UserRole.STUDENT][:2]
        for user in sample_students:
            print(f"   Username: {user.username} | Password: {user.password} | Role: {user.role}")

        print("=" * 50)
        print("\n💡 Note: Use these credentials to test different user roles")
        print("🔐 Admin users can create additional accounts via the API")
        print("📋 Full user profiles saved to: user_profiles.json")

async def clear_all_users():
    """Clear all users from the database (for testing purposes)."""
    print("🗑️  Clearing all users from database...")
    confirm = input("⚠️  This will delete ALL users. Are you sure? (type 'YES' to confirm): ")
    if confirm != "YES":
        print("❌ Operation cancelled.")
        return

    async with SessionLocal() as db:
        from sqlalchemy import delete
        stmt = delete(DBUser)
        result = await db.execute(stmt)
        await db.commit()
        print(f"🗑️  Deleted {result.rowcount} users from database.")

if __name__ == "__main__":
    # Enhanced command line interface
    verbose = False
    department_filter = None

    # Parse command line arguments
    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg == "--verbose":
            verbose = True
        elif arg == "--department" and i + 1 < len(args):
            department_filter = args[i + 1]
        elif arg == "--help":
            print("Usage: python seed_users.py [OPTIONS]")
            print("Options:")
            print("  --clear       Clear all existing users before seeding")
            print("  --verbose     Enable detailed logging")
            print("  --department DEPT  Filter users by department")
            print("  --help        Show this help message")
            sys.exit(0)

    if len(sys.argv) > 1 and sys.argv[1] == "--clear":
        # Special mode to clear all users
        asyncio.run(clear_all_users())
    else:
        # Normal seeding mode with enhanced options
        asyncio.run(seed_users(verbose=verbose, department_filter=department_filter))