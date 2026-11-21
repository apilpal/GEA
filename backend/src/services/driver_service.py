"""
Driver service for transport management business logic.

This module provides the core business logic for managing school bus drivers
and their associated transport operations. It handles CRUD operations for drivers,
student counting, CSV data access, and driver information retrieval.

The service supports both database-backed operations and legacy CSV file
access during the transition period. It includes proper error handling,
transaction management, and data validation.

Key Features:
- Driver CRUD operations with automatic student count calculation
- Legacy CSV data access for backward compatibility
- Vehicle and license information management
- Route assignment and tracking
- Database constraint enforcement

All methods are static and designed for use with FastAPI dependency injection.
"""

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import os
import csv
from src.core.models import Driver, DriverResponse, CreateDriverRequest, UpdateDriverRequest, DBDriver

class DriverService:
    """Service class for managing driver-related business logic.

    Provides static methods for all driver operations including CRUD,
    student counting, and legacy data access. All methods handle
    database transactions and error management.
    """

    @staticmethod
    async def get_all_drivers(db: AsyncSession, skip: int = 0, limit: int = 100) -> DriverResponse:
        """Retrieve all drivers from the database with their current student counts.

        Fetches paginated driver records and calculates the number of students
        assigned to each driver by matching routes. This provides a comprehensive
        view of driver workload and capacity.

        Args:
            db (AsyncSession): Database session for queries
            skip (int): Number of records to skip for pagination (default: 0)
            limit (int): Maximum number of records to return (default: 100)

        Returns:
            DriverResponse: Paginated response containing:
                            - drivers: List of Driver objects with student counts
                            - total_count: Total number of drivers in database

        Raises:
            HTTPException: If database query fails during driver retrieval
        """
        try:
            # Get total count first
            count_result = await db.execute(select(DBDriver))
            total_count = len(count_result.scalars().all())

            # Get paginated drivers
            result = await db.execute(select(DBDriver).offset(skip).limit(limit))
            db_drivers = result.scalars().all()
            drivers = []

            for db_driver in db_drivers:
                # Count students for this driver by route
                from src.core.models import DBStudent
                student_result = await db.execute(
                    select(DBStudent).where(DBStudent.route == db_driver.route)
                )
                student_count = len(student_result.scalars().all())

                driver = Driver(
                    name=db_driver.name,
                    route=db_driver.route,
                    status=db_driver.status,
                    vehicle_number=db_driver.vehicle_number,
                    contact_number=db_driver.contact_number,
                    total_students=student_count
                )
                drivers.append(driver)

            return DriverResponse(drivers=drivers, total_count=total_count)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error listing drivers: {str(e)}")

    @staticmethod
    def get_driver_csv_data(driver_name: str) -> dict:
        """Read raw driver data from a CSV file in the legacy drivers directory.

        Provides backward compatibility by accessing original CSV files that
        contain student data organized by driver. Used during the transition
        from file-based to database storage.

        Args:
            driver_name (str): Name of the driver, used as filename without .csv extension

        Returns:
            dict: Dictionary with structure:
                  {
                    "driver": driver_name,
                    "data": [list of CSV row dictionaries]
                  }

        Raises:
            HTTPException: If CSV file doesn't exist (404) or cannot be read (500)
        """
        csv_file_path = f"data/drivers/{driver_name}.csv"
        if not os.path.exists(csv_file_path):
            raise HTTPException(status_code=404, detail=f"Driver {driver_name} CSV file not found")

        driver_rows = []
        try:
            with open(csv_file_path, mode='r', encoding='utf-8') as file:
                csv_reader = csv.DictReader(file)
                for row in csv_reader:
                    driver_rows.append(row)
            return {"driver": driver_name, "data": driver_rows}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing driver data: {str(e)}")

    @staticmethod
    async def create_driver(db: AsyncSession, driver: CreateDriverRequest) -> Driver:
        """Create a new driver record in the database with validation.

        Adds a new driver to the transport management system with all required
        information including contact details, vehicle information, and route
        assignment. Enforces uniqueness constraints on driver names.

        Args:
            db (AsyncSession): Database session for the operation
            driver (CreateDriverRequest): Complete driver information including
                                        name, route, vehicle details, and contact info

        Returns:
            Driver: Newly created driver object with generated timestamps
                   and initial student count of 0

        Raises:
            HTTPException: If driver with same name already exists (400) or
                           database operation fails (500)
        """
        try:
            # Check if driver already exists
            existing_driver = await db.execute(
                select(DBDriver).where(DBDriver.name == driver.name)
            )
            if existing_driver.scalars().first():
                raise HTTPException(status_code=400, detail=f"Driver {driver.name} already exists")

            import time
            current_time = int(time.time())
            db_driver = DBDriver(
                name=driver.name,
                route=driver.route,
                status=driver.status,
                vehicle_number=driver.vehicle_number,
                contact_number=driver.contact_number,
                created_at=current_time,
                updated_at=current_time
            )
            db.add(db_driver)
            await db.commit()
            await db.refresh(db_driver)

            return Driver(
                name=db_driver.name,
                route=db_driver.route,
                status=db_driver.status,
                vehicle_number=db_driver.vehicle_number,
                contact_number=db_driver.contact_number,
                total_students=0  # Will be calculated later
            )
        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Error creating driver: {str(e)}")

    @staticmethod
    async def update_driver(db: AsyncSession, driver_name: str, driver_update: UpdateDriverRequest) -> Driver:
        """Update an existing driver's information with partial data.

        Allows updating driver details such as route, vehicle information,
        contact details, etc. If the driver doesn't exist, creates a new
        record with the provided name. Only updates fields that are provided.

        Args:
            db (AsyncSession): Database session for the operation
            driver_name (str): Name identifier of the driver to update
            driver_update (UpdateDriverRequest): Partial driver data - only
                                                provided fields will be updated

        Returns:
            Driver: Updated driver object with current student count
                   and refreshed information

        Raises:
            HTTPException: If database operation fails during update
        """
        try:
            db_driver = await db.execute(
                select(DBDriver).where(DBDriver.name == driver_name)
            )
            db_driver = db_driver.scalars().first()

            if not db_driver:
                # Create driver if it doesn't exist
                import time
                current_time = int(time.time())
                db_driver = DBDriver(name=driver_name, created_at=current_time, updated_at=current_time)
                db.add(db_driver)

            update_data = driver_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                if hasattr(db_driver, key):
                    setattr(db_driver, key, value)

            db_driver.updated_at = int(time.time())

            await db.commit()
            await db.refresh(db_driver)

            # Count students for this driver by route
            from src.core.models import DBStudent
            student_result = await db.execute(
                select(DBStudent).where(DBStudent.route == db_driver.route)
            )
            student_count = len(student_result.scalars().all())

            return Driver(
                name=db_driver.name,
                route=db_driver.route,
                status=db_driver.status,
                vehicle_number=db_driver.vehicle_number,
                contact_number=db_driver.contact_number,
                total_students=student_count
            )
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Error updating driver: {str(e)}")

    @staticmethod
    async def get_driver_info(db: AsyncSession, driver_name: str) -> Driver:
        """Retrieve detailed information about a specific driver including student count.

        Fetches complete driver information from the database and calculates
        the current number of students assigned to this driver. If the driver
        doesn't exist in the database, returns default information based on
        route matching for backward compatibility.

        Args:
            db (AsyncSession): Database session for queries
            driver_name (str): Name identifier of the driver to retrieve

        Returns:
            Driver: Complete driver object with:
                   - Contact details and vehicle information
                   - Current student count based on route assignment
                   - Status and route information

        Note:
            For backward compatibility, if driver not found in database,
            returns default driver info with student count from route matching.
        """
        try:
            db_driver = await db.execute(
                select(DBDriver).where(DBDriver.name == driver_name)
            )
            db_driver = db_driver.scalars().first()

            if db_driver:
                # Count students for this driver by route
                from src.core.models import DBStudent
                student_result = await db.execute(
                    select(DBStudent).where(DBStudent.route == db_driver.route)
                )
                student_count = len(student_result.scalars().all())

                return Driver(
                    name=db_driver.name,
                    route=db_driver.route,
                    status=db_driver.status,
                    vehicle_number=db_driver.vehicle_number,
                    contact_number=db_driver.contact_number,
                    total_students=student_count
                )

            # Return default driver info if not in database
            from src.core.models import DBStudent
            student_result = await db.execute(
                select(DBStudent).where(DBStudent.route == driver_name)
            )
            student_count = len(student_result.scalars().all())

            return Driver(
                name=driver_name,
                route=driver_name,
                total_students=student_count
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving driver info: {str(e)}")