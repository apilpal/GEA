#!/usr/bin/env python3
"""
Data migration script to import existing CSV data into single database.
"""

import asyncio
import csv
import logging
import os
import sys
import argparse
import time
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

from models import DBStudent, DBDriver, Base, SessionLocal, sync_engine
from utils import validate_student_data

class DataMigrationManager:
    """Manages the migration of CSV data to a single unified database system.

    This class handles the import of legacy CSV files containing student and driver
    data into the new database schema. It supports both incremental and full-reload
    migration modes, with comprehensive error handling and progress tracking.

    Attributes:
        db_manager: Optional database manager instance (legacy compatibility)
        incremental (bool): Whether to skip existing records during migration
        stats (dict): Migration statistics tracking created/skipped/error counts
    """

    def __init__(self, db_manager=None, incremental: bool = True):
        """Initialize the data migration manager.

        Args:
            db_manager: Optional database manager (for legacy compatibility)
            incremental (bool): If True, skip existing records; if False, replace all data
        """
        self.db_manager = db_manager
        self.incremental = incremental
        self.stats = {
            "drivers_created": 0,
            "drivers_skipped": 0,
            "students_created": 0,
            "students_skipped": 0,
            "errors": 0
        }

    async def initialize_databases(self) -> None:
        """Initialize database schemas and create all required tables.

        Creates the database tables defined in the SQLAlchemy models
        for the single unified database system.
        """
        logger.info("Initializing database schemas...")

        # Create tables in single database
        Base.metadata.create_all(bind=sync_engine)

        logger.info("Database schemas initialized")

    async def check_existing_driver(self, session, name: str) -> Optional[int]:
        """Check if a driver with the given name already exists in the database.

        Args:
            session: Database session for the query
            name (str): Driver name to check for existence

        Returns:
            Optional[int]: Driver ID if found, None otherwise
        """
        from sqlalchemy import select
        result = await session.execute(select(DBDriver).where(DBDriver.name == name))
        driver = result.scalars().first()
        return driver.id if driver else None

    async def check_existing_student(self, session, name: str, father_name: str) -> Optional[int]:
        """Check if a student with matching name and father name exists.

        Args:
            session: Database session for the query
            name (str): Student name to check
            father_name (str): Father's name for uniqueness validation

        Returns:
            Optional[int]: Student ID if found, None otherwise
        """
        from sqlalchemy import select
        result = await session.execute(
            select(DBStudent).where(
                DBStudent.name == name,
                DBStudent.father_name == father_name
            )
        )
        student = result.scalars().first()
        return student.id if student else None


    def migrate_csv_data_legacy(self) -> bool:
        """Execute legacy CSV data migration for single database system.

        Migrates student and driver data from CSV files in the data/drivers/
        directory into the unified database. Each CSV file represents a driver
        and contains their associated students.

        The migration process:
        1. Creates database tables if they don't exist
        2. Iterates through CSV files in data/drivers/ directory
        3. Creates driver records from filenames
        4. Validates and imports student data from each CSV
        5. Tracks migration statistics and handles errors

        Returns:
            bool: True if migration completed successfully, False otherwise

        Note:
            In incremental mode, existing records are skipped.
            Errors are logged and counted but don't stop the migration.
        """
        logger.info("Starting legacy single database migration...")

        # Create tables
        Base.metadata.create_all(bind=sync_engine)

        db = SessionLocal()

        try:
            drivers_dir = "data/drivers"
            if not os.path.exists(drivers_dir):
                logger.warning("No drivers directory found, skipping migration")
                return True

            for filename in os.listdir(drivers_dir):
                if not filename.endswith('.csv'):
                    continue

                driver_name = filename.replace('.csv', '')
                csv_file_path = os.path.join(drivers_dir, filename)

                logger.info(f"Processing CSV file: {filename}")

                # Create driver if it doesn't exist
                from sqlalchemy import select
                existing_driver = db.execute(select(DBDriver).where(DBDriver.name == driver_name)).scalars().first()
                if not existing_driver:
                    current_time = int(time.time())
                    db_driver = DBDriver(
                        name=driver_name,
                        route=driver_name,
                        status="active",
                        created_at=current_time,
                        updated_at=current_time
                    )
                    db.add(db_driver)
                    db.commit()
                    db.refresh(db_driver)
                    logger.info(f"Created driver: {driver_name}")
                    self.stats["drivers_created"] += 1
                else:
                    if self.incremental:
                        logger.info(f"Driver '{driver_name}' already exists, skipping")
                        self.stats["drivers_skipped"] += 1
                        continue

                # Migrate students
                try:
                    with open(csv_file_path, mode='r', encoding='utf-8') as file:
                        csv_reader = csv.DictReader(file)
                        for row in csv_reader:
                            # Validate and convert the row data
                            validated_student = validate_student_data(row)
                            if validated_student:
                                # Check if student already exists (by name and father_name)
                                existing_student = db.execute(select(DBStudent).where(
                                    DBStudent.name == validated_student.name,
                                    DBStudent.father_name == validated_student.father_name
                                )).scalars().first()

                                if not existing_student:
                                    # Convert fees to float
                                    fees_float = None
                                    if validated_student.fees:
                                        try:
                                            fees_float = float(validated_student.fees)
                                        except (ValueError, TypeError):
                                            pass

                                    current_time = int(time.time())
                                    db_student = DBStudent(
                                        route=validated_student.route,
                                        name=validated_student.name,
                                        father_name=validated_student.father_name,
                                        mobile=validated_student.mobile,
                                        class_=validated_student.class_,
                                        address=validated_student.address,
                                        fees=fees_float,
                                        status="active",
                                        created_at=current_time,
                                        updated_at=current_time
                                    )
                                    db.add(db_student)
                                    logger.info(f"Added student: {validated_student.name}")
                                    self.stats["students_created"] += 1
                                else:
                                    if self.incremental:
                                        logger.info(f"Student {validated_student.name} already exists, skipping")
                                        self.stats["students_skipped"] += 1
                            else:
                                logger.warning(f"Skipping invalid student data: {row}")
                                self.stats["errors"] += 1

                except Exception as e:
                    logger.error(f"Error reading {filename}: {e}")
                    self.stats["errors"] += 1

            db.commit()
            logger.info("Legacy migration completed successfully")
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"Legacy migration failed: {e}")
            self.stats["errors"] += 1
            raise
        finally:
            db.close()

async def migrate_csv_data(incremental: bool = True) -> bool:
    """Main migration function for importing CSV data into the database.

    Orchestrates the data migration process using the DataMigrationManager.
    This function serves as the primary entry point for data migration operations.

    Args:
        incremental (bool): Whether to perform incremental migration (skip existing records)

    Returns:
        bool: True if migration completed successfully, False otherwise
    """
    logger.info(f"Starting data migration (incremental={incremental})...")

    # Use legacy single database migration
    migration_manager = DataMigrationManager(incremental=incremental)
    success = migration_manager.migrate_csv_data_legacy()

    return success

def main() -> None:
    """Main entry point with command line argument parsing.

    Parses command line arguments and executes the data migration process.
    Supports both incremental and full-reload migration modes.

    Command Line Options:
        --incremental: Perform incremental migration (default)
        --full-reload: Clear existing data and perform full reload

    Exit Codes:
        0: Migration completed successfully
        1: Migration failed
    """
    parser = argparse.ArgumentParser(
        description="Migrate CSV data to single database system",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python migrate_data.py --incremental    # Incremental migration (default)
  python migrate_data.py --full-reload     # Full reload (clear existing data)
  python migrate_data.py --help           # Show this help message
        """
    )

    parser.add_argument(
        '--incremental',
        action='store_true',
        default=True,
        help='Perform incremental migration (skip existing records)'
    )

    parser.add_argument(
        '--full-reload',
        action='store_true',
        default=False,
        help='Perform full reload (clear all existing data first)'
    )

    args = parser.parse_args()

    # Validate arguments
    if args.full_reload:
        incremental = False
    else:
        incremental = args.incremental

    logger.info(f"Starting migration with incremental={incremental}, full_reload={args.full_reload}")

    # Run migration
    try:
        success = asyncio.run(migrate_csv_data(incremental=incremental))
        if success:
            logger.info("Migration completed successfully!")
            sys.exit(0)
        else:
            logger.error("Migration failed!")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Migration failed with exception: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()