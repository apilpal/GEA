"""
Drivers router for transport management endpoints.

This module provides FastAPI routes for managing school bus drivers and their
associated transport information. It handles CRUD operations for drivers,
retrieval of driver information, guest access, and legacy CSV data access.

Endpoints:
- GET /drivers/: List all drivers with pagination
- GET /drivers/{driver_name}: Get raw CSV data for a driver (legacy)
- POST /drivers/: Create a new driver
- PUT /drivers/{driver_name}: Update an existing driver
- GET /drivers/{driver_name}/info: Get detailed driver information
- GET /drivers/guest/: Guest-accessible endpoint to view driver data (limited info)

All endpoints support the transport management features including driver
assignment, vehicle tracking, and student transport coordination.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import os
import csv

# Import models and database functions
from src.core.models import (
    Driver,
    DriverResponse,
    CreateDriverRequest,
    UpdateDriverRequest,
    get_db
)

# Import services
from src.utils.auth_utils import get_current_active_user_from_any_source
from src.services.driver_service import DriverService

router = APIRouter(prefix="/drivers", tags=["drivers"])

@router.get("/", response_model=DriverResponse)
async def get_all_drivers(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
) -> DriverResponse:
    """
    Retrieve a list of all drivers from the database.

    Args:
        db: Database session dependency
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (pagination)

    Returns:
        DriverResponse: Object containing list of drivers and total count

    Raises:
        HTTPException: If database query fails
    """
    return await DriverService.get_all_drivers(db, skip=skip, limit=limit)

@router.get("/{driver_name}")
async def get_driver_data(driver_name: str) -> dict:
    """Retrieve raw driver data from CSV file (legacy endpoint).

    This endpoint provides backward compatibility for accessing original
    CSV files that contain driver and student data. Used during the
    transition from CSV-based to database storage.

    Args:
        driver_name (str): Name of the driver whose CSV data to retrieve

    Returns:
        dict: Dictionary containing driver name and associated CSV data rows
              with structure {"driver": name, "data": [rows]}

    Raises:
        HTTPException: If CSV file not found, cannot be read, or driver doesn't exist
    """
    return DriverService.get_driver_csv_data(driver_name)

@router.post("/", response_model=Driver)
async def create_driver(driver: CreateDriverRequest, db: AsyncSession = Depends(get_db)) -> Driver:
    """Create a new driver record in the database.

    Adds a new driver to the transport management system with all
    required information including contact details and vehicle information.

    Args:
        driver (CreateDriverRequest): Driver creation data including name, route,
                                     vehicle number, contact info, and license details
        db (AsyncSession): Database session dependency

    Returns:
        Driver: Complete driver object with generated ID and timestamps

    Raises:
        HTTPException: If driver with same name already exists or creation fails
    """
    return await DriverService.create_driver(db, driver)

@router.put("/{driver_name}")
async def update_driver(driver_name: str, driver_update: UpdateDriverRequest, db: AsyncSession = Depends(get_db)) -> Driver:
    """Update an existing driver record with new information.

    Allows partial updates to driver information. Only the fields provided
    in the update request will be modified, others remain unchanged.

    Args:
        driver_name (str): Name of the driver to update (used as identifier)
        driver_update (UpdateDriverRequest): Updated driver data - only provided
                                           fields will be changed
        db (AsyncSession): Database session dependency

    Returns:
        Driver: Updated driver object with new information and updated timestamp

    Raises:
        HTTPException: If driver not found or update operation fails
    """
    return await DriverService.update_driver(db, driver_name, driver_update)

@router.get("/{driver_name}/info")
async def get_driver_info(driver_name: str, db: AsyncSession = Depends(get_db)) -> Driver:
    """Retrieve detailed information about a specific driver including student count.

    Provides comprehensive driver information including contact details,
    vehicle information, and the current number of students assigned to them.

    Args:
        driver_name (str): Name of the driver to retrieve information for
        db (AsyncSession): Database session dependency

    Returns:
        Driver: Complete driver object with contact details, vehicle info,
                and calculated student count (total_students field)

    Raises:
        HTTPException: If driver not found in database or query fails
    """
    return await DriverService.get_driver_info(db, driver_name)

@router.get("/guest/", response_model=DriverResponse)
async def get_guest_drivers(
    current_user = Depends(get_current_active_user_from_any_source),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
) -> DriverResponse:
    """Retrieve limited driver information for guest users.

    Provides basic driver information for guest users with restricted data access.
    Only shows essential information like name, route, and status. Sensitive
    information like contact details and license numbers is excluded.

    Args:
        current_user: Currently authenticated user (including guests)
        db: Database session dependency
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (pagination)

    Returns:
        DriverResponse: Object containing list of drivers with limited info and total count

    Raises:
        HTTPException: If database query fails
    """
    try:
        # Get all drivers from database
        result = await DriverService.get_all_drivers(db, skip=skip, limit=limit)

        # Filter out sensitive information for guest users
        guest_drivers = []
        for driver in result.drivers:
            # Create a limited driver object for guests
            guest_driver = Driver(
                id=driver.id,
                name=driver.name,
                route=driver.route,
                status=driver.status,
                total_students=driver.total_students,
                # Exclude sensitive fields: contact_number, license_number, vehicle_number
                # Only show basic information
            )
            guest_drivers.append(guest_driver)

        return DriverResponse(drivers=guest_drivers, total_count=result.total_count)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving guest driver data: {str(e)}")