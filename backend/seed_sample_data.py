#!/usr/bin/env python3
"""
Sample Data Seeding Script

Seeds the database with 75 sample students and 5 sample drivers (a transport fee of
500 per student) so the dashboard, transport and report pages have something to show.
These are the same people and routes as the demo data in frontend/src/ts/demo-data.ts.

Run it from the backend folder, after setup (scripts/termux-setup.sh does the setup).

By default it is safe to run at any time: it removes the sample rows it created before
(including those from older versions of this script) and adds them again, so every phone
or computer ends up with the same sample data. Students, drivers and logins that you added
yourself are NOT touched.

Usage:
    python seed_sample_data.py [--reset [--yes]] [--verbose]

Options:
    --reset     Delete ALL students and drivers first (asks for confirmation)
    --yes       Do not ask for confirmation with --reset
    --verbose   Enable detailed logging
"""

import asyncio
import sys
from datetime import datetime, UTC
from typing import List, Dict, Any
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Add src to path for imports
sys.path.append('src')

from src.core.models.models import DBStudent, DBDriver, ClassEnum, get_db
from src.core.config.config import config
from src.utils.auth_utils import hash_password
from src.services.student_service import StudentService
from src.services.driver_service import DriverService

# Sample data ---------------------------------------------------------------------------
MONTHLY_FEE = 500.0

# (name, father_name, class, route, address)
_STUDENT_ROWS = [
    ("Avery Johnson", "Morgan Johnson", "10", "North Route", "12 Oak Street"),
    ("Noah Williams", "Casey Williams", "8", "North Route", "48 Pine Avenue"),
    ("Mia Garcia", "Riley Garcia", "11", "North Route", "7 Maple Road"),
    ("Ethan Patel", "Jordan Patel", "9", "East Route", "90 Lake Drive"),
    ("Sofia Kim", "Alex Kim", "7", "East Route", "3 Cedar Lane"),
    ("Lucas Brown", "Drew Brown", "12", "West Route", "25 Hill Street"),
    ("Isla Davis", "Sam Davis", "6", "West Route", "61 River Road"),
    ("Liam Johnson", "Morgan Johnson", "6", "North Route", "59 Oak Street"),
    ("Emma Williams", "Casey Williams", "9", "East Route", "66 Pine Avenue"),
    ("Oliver Garcia", "Riley Garcia", "12", "West Route", "73 Maple Road"),
    ("Ava Patel", "Jordan Patel", "8", "South Route", "80 Lake Drive"),
    ("Elijah Kim", "Alex Kim", "11", "Central Route", "87 Cedar Lane"),
    ("Charlotte Brown", "Drew Brown", "7", "North Route", "4 Hill Street"),
    ("James Davis", "Sam Davis", "10", "East Route", "11 River Road"),
    ("Amelia Martin", "Chris Martin", "6", "West Route", "18 Park Avenue"),
    ("Benjamin Lopez", "Pat Lopez", "9", "South Route", "25 Elm Street"),
    ("Harper Nguyen", "Dana Nguyen", "12", "Central Route", "32 Sunset Boulevard"),
    ("Henry Walker", "Kelly Walker", "8", "North Route", "39 Willow Way"),
    ("Evelyn Hall", "Robin Hall", "11", "East Route", "46 Garden Road"),
    ("Theo Young", "Jesse Young", "7", "West Route", "53 Oak Street"),
    ("Luna Allen", "Taylor Allen", "10", "South Route", "60 Pine Avenue"),
    ("Jack King", "Lee King", "6", "Central Route", "67 Maple Road"),
    ("Ella Wright", "Cameron Wright", "9", "North Route", "74 Lake Drive"),
    ("Owen Scott", "Skyler Scott", "12", "East Route", "81 Cedar Lane"),
    ("Aria Johnson", "Quinn Johnson", "8", "West Route", "88 Hill Street"),
    ("Leo Williams", "Avery Williams", "11", "South Route", "5 River Road"),
    ("Chloe Garcia", "Rowan Garcia", "7", "Central Route", "12 Park Avenue"),
    ("Caleb Patel", "Blake Patel", "10", "North Route", "19 Elm Street"),
    ("Layla Kim", "Reese Kim", "6", "East Route", "26 Sunset Boulevard"),
    ("Ryan Brown", "Parker Brown", "9", "West Route", "33 Willow Way"),
    ("Zoe Davis", "Hayden Davis", "12", "South Route", "40 Garden Road"),
    ("Nathan Martin", "Sidney Martin", "8", "Central Route", "47 Oak Street"),
    ("Nora Lopez", "Morgan Lopez", "11", "North Route", "54 Pine Avenue"),
    ("Isaac Nguyen", "Casey Nguyen", "7", "East Route", "61 Maple Road"),
    ("Hazel Walker", "Riley Walker", "10", "West Route", "68 Lake Drive"),
    ("Adam Hall", "Jordan Hall", "6", "South Route", "75 Cedar Lane"),
    ("Lily Young", "Alex Young", "9", "Central Route", "82 Hill Street"),
    ("Aaron Allen", "Drew Allen", "12", "North Route", "89 River Road"),
    ("Violet King", "Sam King", "8", "East Route", "6 Park Avenue"),
    ("Daniel Wright", "Chris Wright", "11", "West Route", "13 Elm Street"),
    ("Aurora Scott", "Pat Scott", "7", "South Route", "20 Sunset Boulevard"),
    ("Samuel Johnson", "Dana Johnson", "10", "Central Route", "27 Willow Way"),
    ("Stella Williams", "Kelly Williams", "6", "North Route", "34 Garden Road"),
    ("Joshua Garcia", "Robin Garcia", "9", "East Route", "41 Oak Street"),
    ("Ruby Patel", "Jesse Patel", "12", "West Route", "48 Pine Avenue"),
    ("Wyatt Kim", "Taylor Kim", "8", "South Route", "55 Maple Road"),
    ("Penelope Brown", "Lee Brown", "11", "Central Route", "62 Lake Drive"),
    ("Eli Davis", "Cameron Davis", "7", "North Route", "69 Cedar Lane"),
    ("Maya Martin", "Skyler Martin", "10", "East Route", "76 Hill Street"),
    ("Julian Lopez", "Quinn Lopez", "6", "West Route", "83 River Road"),
    ("Naomi Nguyen", "Avery Nguyen", "9", "South Route", "90 Park Avenue"),
    ("Hudson Walker", "Rowan Walker", "12", "Central Route", "7 Elm Street"),
    ("Clara Hall", "Blake Hall", "8", "North Route", "14 Sunset Boulevard"),
    ("Levi Young", "Reese Young", "11", "East Route", "21 Willow Way"),
    ("Alice Allen", "Parker Allen", "7", "West Route", "28 Garden Road"),
    ("Mason King", "Hayden King", "10", "South Route", "35 Oak Street"),
    ("Grace Wright", "Sidney Wright", "6", "Central Route", "42 Pine Avenue"),
    ("Carter Scott", "Morgan Scott", "9", "North Route", "49 Maple Road"),
    ("Ivy Johnson", "Casey Johnson", "12", "East Route", "56 Lake Drive"),
    ("Dylan Williams", "Riley Williams", "8", "West Route", "63 Cedar Lane"),
    ("Emilia Garcia", "Jordan Garcia", "11", "South Route", "70 Hill Street"),
    ("Gabriel Patel", "Alex Patel", "7", "Central Route", "77 River Road"),
    ("Willow Kim", "Drew Kim", "10", "North Route", "84 Park Avenue"),
    ("Asher Brown", "Sam Brown", "6", "East Route", "91 Elm Street"),
    ("Eliana Davis", "Chris Davis", "9", "West Route", "8 Sunset Boulevard"),
    ("Jaxon Martin", "Pat Martin", "12", "South Route", "15 Willow Way"),
    ("Piper Lopez", "Dana Lopez", "8", "Central Route", "22 Garden Road"),
    ("Miles Nguyen", "Kelly Nguyen", "11", "North Route", "29 Oak Street"),
    ("Sadie Walker", "Robin Walker", "7", "East Route", "36 Pine Avenue"),
    ("Felix Hall", "Jesse Hall", "10", "West Route", "43 Maple Road"),
    ("Iris Young", "Taylor Young", "6", "South Route", "50 Lake Drive"),
    ("Roman Allen", "Lee Allen", "9", "North Route", "57 Cedar Lane"),
    ("Jade King", "Cameron King", "12", "East Route", "64 Hill Street"),
    ("Ezra Wright", "Skyler Wright", "8", "South Route", "71 River Road"),
    ("Freya Scott", "Quinn Scott", "11", "North Route", "78 Park Avenue"),
]

SAMPLE_STUDENTS = [
    {
        "name": name,
        "father_name": father_name,
        "mobile": str(9000010000 + number),  # unique 10-digit number per student
        "class_": grade,
        "address": address,
        "fees": MONTHLY_FEE,
        "route": route,
    }
    for number, (name, father_name, grade, route, address) in enumerate(_STUDENT_ROWS, start=1)
]

# (name, route, vehicle_number, experience_years)
_DRIVER_ROWS = [
    ("Alex Morgan", "North Route", "BUS-101", 5),
    ("Jamie Patel", "East Route", "BUS-204", 8),
    ("Taylor Chen", "West Route", "BUS-309", 3),
    ("Jordan Rivera", "South Route", "BUS-412", 6),
    ("Sam Okafor", "Central Route", "BUS-515", 10),
]

SAMPLE_DRIVERS = [
    {
        "name": name,
        "route": route,
        "status": "active",
        "vehicle_number": vehicle_number,
        "contact_number": str(9000020000 + number),  # unique 10-digit number per driver
        "license_number": f"DL-2026-{number:04d}",
        "experience_years": experience_years,
    }
    for number, (name, route, vehicle_number, experience_years) in enumerate(_DRIVER_ROWS, start=1)
]

# Rows created by earlier versions of this script. They are removed again so that installs
# that ran an old version end up with the same data as everyone else.
LEGACY_STUDENTS = {
    ("Alice Johnson", "1234567890"),
    ("Bob Smith", "2345678901"),
    ("Charlie Brown", "3456789012"),
    ("Diana Prince", "4567890123"),
    ("Ethan Hunt", "5678901234"),
}
LEGACY_DRIVERS = {
    ("Driver Alex", "DL123456789"),
    ("Driver Bob", "DL987654321"),
    ("Driver Charlie", "DL456789123"),
}


def sample_student_keys() -> set:
    """(name, mobile) pairs that identify sample students, current and legacy."""
    return {(s["name"], s["mobile"]) for s in SAMPLE_STUDENTS} | LEGACY_STUDENTS


def sample_driver_keys() -> set:
    """(name, license number) pairs that identify sample drivers, current and legacy."""
    return {(d["name"], d["license_number"]) for d in SAMPLE_DRIVERS} | LEGACY_DRIVERS


async def remove_sample_rows(db: AsyncSession) -> tuple:
    """Delete the sample students and drivers made by this script; keep everything else."""
    student_keys = sample_student_keys()
    drivers_keys = sample_driver_keys()

    students = (await db.execute(
        select(DBStudent).where(DBStudent.mobile.in_({mobile for _, mobile in student_keys}))
    )).scalars().all()
    removed_students = 0
    for student in students:
        if (student.name, student.mobile) in student_keys:
            await db.delete(student)
            removed_students += 1

    drivers = (await db.execute(
        select(DBDriver).where(DBDriver.license_number.in_({license for _, license in drivers_keys}))
    )).scalars().all()
    removed_drivers = 0
    for driver in drivers:
        if (driver.name, driver.license_number) in drivers_keys:
            await db.delete(driver)
            removed_drivers += 1

    await db.commit()
    return removed_students, removed_drivers


async def delete_everything(db: AsyncSession) -> tuple:
    """Delete ALL students and drivers (used by --reset)."""
    students = await db.scalar(select(func.count()).select_from(DBStudent))
    drivers = await db.scalar(select(func.count()).select_from(DBDriver))
    await db.execute(delete(DBStudent))
    await db.execute(delete(DBDriver))
    await db.commit()
    return students, drivers


async def create_sample_students(db: AsyncSession) -> int:
    """Add every sample student (call remove_sample_rows first to avoid duplicates)."""
    now = int(datetime.now(UTC).timestamp())
    for student_data in SAMPLE_STUDENTS:
        db.add(DBStudent(
            name=student_data["name"],
            father_name=student_data["father_name"],
            mobile=student_data["mobile"],
            class_=student_data["class_"],
            address=student_data["address"],
            fees=student_data["fees"],
            route=student_data["route"],
            status="active",
            created_at=now,
            updated_at=now,
        ))
    await db.commit()
    return len(SAMPLE_STUDENTS)


async def create_sample_drivers(db: AsyncSession) -> int:
    """Add every sample driver (call remove_sample_rows first to avoid duplicates)."""
    now = int(datetime.now(UTC).timestamp())
    for driver_data in SAMPLE_DRIVERS:
        db.add(DBDriver(
            name=driver_data["name"],
            route=driver_data["route"],
            status=driver_data["status"],
            vehicle_number=driver_data["vehicle_number"],
            contact_number=driver_data["contact_number"],
            license_number=driver_data["license_number"],
            experience_years=driver_data["experience_years"],
            created_at=now,
            updated_at=now,
        ))
    await db.commit()
    return len(SAMPLE_DRIVERS)


async def seed(db: AsyncSession, reset: bool = False) -> dict:
    """Put the sample data in the database and return what happened."""
    if reset:
        removed_students, removed_drivers = await delete_everything(db)
    else:
        removed_students, removed_drivers = await remove_sample_rows(db)

    created_students = await create_sample_students(db)
    created_drivers = await create_sample_drivers(db)
    total_students = await db.scalar(select(func.count()).select_from(DBStudent))
    total_drivers = await db.scalar(select(func.count()).select_from(DBDriver))
    return {
        "removed_students": removed_students,
        "removed_drivers": removed_drivers,
        "created_students": created_students,
        "created_drivers": created_drivers,
        "other_students": total_students - created_students,
        "other_drivers": total_drivers - created_drivers,
    }


async def main(reset: bool = False, verbose: bool = False):
    """Main function to seed sample data."""
    print("🌱 Starting sample data seeding...")

    async for db in get_db():
        try:
            result = await seed(db, reset=reset)
        except Exception as e:
            await db.rollback()
            print(f"❌ Error during seeding: {e}")
            return 1

        if verbose or reset:
            print(f"   Removed {result['removed_students']} students and {result['removed_drivers']} drivers")
        print("🎉 Sample data seeding completed successfully!")
        print(f"   - Students: {result['created_students']} sample" + (f" (plus {result['other_students']} of your own, kept)" if result["other_students"] else ""))
        print(f"   - Drivers: {result['created_drivers']} sample" + (f" (plus {result['other_drivers']} of your own, kept)" if result["other_drivers"] else ""))
        print(f"   - Monthly fees of the sample students: {result['created_students'] * MONTHLY_FEE:,.0f}")

    return 0


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed 75 sample students and 5 sample drivers")
    parser.add_argument("--reset", action="store_true", help="Delete ALL students and drivers first")
    parser.add_argument("--clear", action="store_true", help=argparse.SUPPRESS)  # old name for --reset
    parser.add_argument("--yes", action="store_true", help="Do not ask for confirmation with --reset")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()
    reset = args.reset or args.clear

    if reset and not args.yes:
        print("⚠️  --reset deletes ALL students and drivers, including any you added yourself.")
        if input("Type DELETE to continue: ").strip() != "DELETE":
            print("Cancelled. Nothing was changed.")
            sys.exit(1)

    sys.exit(asyncio.run(main(reset=reset, verbose=args.verbose)))
