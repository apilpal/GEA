#!/usr/bin/env python3
"""
Sample Data Seeding Script for Guest Dashboard Demonstration

This script seeds the database with sample students and drivers data
to provide meaningful content for the guest dashboard demonstration.

Usage:
    python seed_sample_data.py [--clear] [--verbose]

Options:
    --clear     Clear existing sample data before seeding
    --verbose   Enable detailed logging
"""

import asyncio
import sys
from datetime import datetime, UTC
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Add src to path for imports
sys.path.append('src')

from src.core.models.models import DBStudent, DBDriver, ClassEnum, get_db
from src.core.config.config import config
from src.utils.auth_utils import hash_password
from src.services.student_service import StudentService
from src.services.driver_service import DriverService

# Sample data
SAMPLE_STUDENTS = [
    {
        "name": "Alice Johnson",
        "father_name": "Robert Johnson",
        "mobile": "1234567890",
        "class_": "10",
        "address": "123 Main St, City",
        "fees": 1500.50,
        "route": "Route A"
    },
    {
        "name": "Bob Smith",
        "father_name": "John Smith",
        "mobile": "2345678901",
        "class_": "9",
        "address": "456 Oak Ave, City",
        "fees": 1400.75,
        "route": "Route B"
    },
    {
        "name": "Charlie Brown",
        "father_name": "David Brown",
        "mobile": "3456789012",
        "class_": "11",
        "address": "789 Pine Rd, City",
        "fees": 1600.00,
        "route": "Route A"
    },
    {
        "name": "Diana Prince",
        "father_name": "Thomas Prince",
        "mobile": "4567890123",
        "class_": "8",
        "address": "321 Elm St, City",
        "fees": 1300.25,
        "route": "Route C"
    },
    {
        "name": "Ethan Hunt",
        "father_name": "Michael Hunt",
        "mobile": "5678901234",
        "class_": "12",
        "address": "654 Maple Dr, City",
        "fees": 1700.00,
        "route": "Route B"
    }
]

SAMPLE_DRIVERS = [
    {
        "name": "Driver Alex",
        "route": "Route A",
        "status": "active",
        "vehicle_number": "ABC-1234",
        "contact_number": "6789012345",
        "license_number": "DL123456789",
        "experience_years": 5
    },
    {
        "name": "Driver Bob",
        "route": "Route B",
        "status": "active",
        "vehicle_number": "XYZ-5678",
        "contact_number": "7890123456",
        "license_number": "DL987654321",
        "experience_years": 8
    },
    {
        "name": "Driver Charlie",
        "route": "Route C",
        "status": "active",
        "vehicle_number": "DEF-9012",
        "contact_number": "8901234567",
        "license_number": "DL456789123",
        "experience_years": 3
    }
]

async def create_sample_students(db: AsyncSession, clear: bool = False) -> int:
    """Create sample students in the database."""
    if clear:
        await db.execute(DBStudent.__table__.delete())
        await db.commit()

    created_count = 0
    for student_data in SAMPLE_STUDENTS:
        try:
            # Check if student already exists
            existing = await db.execute(
                DBStudent.__table__.select().where(DBStudent.mobile == student_data["mobile"])
            )
            if existing.scalar_one_or_none():
                continue

            student = DBStudent(
                name=student_data["name"],
                father_name=student_data["father_name"],
                mobile=student_data["mobile"],
                class_=student_data["class_"],
                address=student_data["address"],
                fees=student_data["fees"],
                route=student_data["route"],
                status="active",
                created_at=int(datetime.now(UTC).timestamp()),
                updated_at=int(datetime.now(UTC).timestamp())
            )
            db.add(student)
            created_count += 1

        except Exception as e:
            print(f"Error creating student {student_data['name']}: {e}")
            continue

    await db.commit()
    return created_count

async def create_sample_drivers(db: AsyncSession, clear: bool = False) -> int:
    """Create sample drivers in the database."""
    if clear:
        await db.execute(DBDriver.__table__.delete())
        await db.commit()

    created_count = 0
    for driver_data in SAMPLE_DRIVERS:
        try:
            # Check if driver already exists
            existing = await db.execute(
                DBDriver.__table__.select().where(DBDriver.name == driver_data["name"])
            )
            if existing.scalar_one_or_none():
                continue

            driver = DBDriver(
                name=driver_data["name"],
                route=driver_data["route"],
                status=driver_data["status"],
                vehicle_number=driver_data["vehicle_number"],
                contact_number=driver_data["contact_number"],
                license_number=driver_data["license_number"],
                experience_years=driver_data["experience_years"],
                created_at=int(datetime.now(UTC).timestamp()),
                updated_at=int(datetime.now(UTC).timestamp())
            )
            db.add(driver)
            created_count += 1

        except Exception as e:
            print(f"Error creating driver {driver_data['name']}: {e}")
            continue

    await db.commit()
    return created_count

async def main(clear: bool = False, verbose: bool = False):
    """Main function to seed sample data."""
    print("🌱 Starting sample data seeding for guest dashboard...")

    # Get database session
    async for db in get_db():
        try:
            # Create sample students
            students_created = await create_sample_students(db, clear)
            if verbose:
                print(f"✅ Created {students_created} sample students")

            # Create sample drivers
            drivers_created = await create_sample_drivers(db, clear)
            if verbose:
                print(f"✅ Created {drivers_created} sample drivers")

            print("🎉 Sample data seeding completed successfully!")
            print(f"   - Students: {students_created}")
            print(f"   - Drivers: {drivers_created}")
            print("   Guest dashboard should now show meaningful data.")

        except Exception as e:
            print(f"❌ Error during seeding: {e}")
            return 1

    return 0

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed sample data for guest dashboard")
    parser.add_argument("--clear", action="store_true", help="Clear existing data before seeding")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    if args.clear:
        print("⚠️  Clearing existing sample data...")

    exit_code = asyncio.run(main(clear=args.clear, verbose=args.verbose))
    sys.exit(exit_code)