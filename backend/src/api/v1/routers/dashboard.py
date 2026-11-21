"""
Public Dashboard router for guest access to dashboard data.

This module provides FastAPI routes for public access to dashboard data
without authentication requirements. It aggregates basic statistics,
charts data, and driver information for guest users.

Endpoints:
- GET /dashboard/public/stats: Basic system statistics
- GET /dashboard/public/charts: Aggregated chart data for dashboard
- GET /dashboard/public/drivers: Basic driver information

All endpoints are accessible without JWT tokens and include rate limiting.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

# Import database functions
from src.core.models import get_db

# Import services
from src.services.chart_service import ChartService
from src.services.report_service import ReportService
from src.services.driver_service import DriverService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Rate limiter for public endpoints - more restrictive than authenticated endpoints
public_limiter = Limiter(key_func=get_remote_address, default_limits=["60 per minute"])

@router.get("/public/stats")
@public_limiter.limit("30 per minute")  # More restrictive for stats
async def get_public_dashboard_stats(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    """Retrieve basic dashboard statistics accessible to guests without authentication.

    Provides high-level overview statistics including total counts and basic metrics
    suitable for public dashboard display.

    Args:
        db (AsyncSession): Database session dependency for data retrieval

    Returns:
        dict: Basic statistics including:
              - Total number of drivers
              - Total number of students
              - Total revenue (anonymized)
              - System status information

    Raises:
        HTTPException: If database query fails during statistics generation
    """
    try:
        # Get summary data from reports service
        summary_data = await ReportService.get_reports_summary(db)

        # Extract and anonymize basic stats for public access
        public_stats = {
            "total_drivers": summary_data.get("total_drivers", 0),
            "total_students": summary_data.get("total_students", 0),
            "total_revenue": summary_data.get("total_revenue", 0),
            "active_drivers": summary_data.get("active_drivers", 0),
            "system_status": "operational",
            "last_updated": summary_data.get("generated_at"),
            "guest_access": True
        }

        return public_stats

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving public dashboard statistics: {str(e)}"
        )

@router.get("/public/charts")
@public_limiter.limit("20 per minute")  # Restrictive for charts
async def get_public_dashboard_charts(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    """Retrieve aggregated chart data for public dashboard display.

    Provides chart configurations for student distribution, revenue breakdowns,
    and class-based analytics suitable for guest dashboard visualization.

    Args:
        db (AsyncSession): Database session dependency for data retrieval

    Returns:
        dict: Aggregated chart data including:
              - Student distribution chart data
              - Revenue by driver chart data
              - Revenue by class chart data
              - Chart metadata and configurations

    Raises:
        HTTPException: If database query fails during chart data generation
    """
    try:
        # Get all chart data in parallel
        student_distribution = await ChartService.get_student_distribution_chart_data(db)
        revenue_by_driver = await ChartService.get_revenue_by_driver_chart_data(db)
        revenue_by_class = await ChartService.get_revenue_by_class_chart_data(db)

        # Aggregate for public dashboard
        public_charts = {
            "student_distribution": student_distribution,
            "revenue_by_driver": revenue_by_driver,
            "revenue_by_class": revenue_by_class,
            "guest_access": True,
            "charts_count": 3
        }

        return public_charts

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving public dashboard charts: {str(e)}"
        )

@router.get("/public/drivers")
@public_limiter.limit("25 per minute")  # Moderate rate limiting for drivers
async def get_public_driver_info(
    request: Request,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20
) -> dict:
    """Retrieve basic driver information for public display.

    Provides limited driver information including names, routes, and status
    without exposing sensitive contact or personal details.

    Args:
        db (AsyncSession): Database session dependency for data retrieval
        skip (int): Number of records to skip for pagination
        limit (int): Maximum number of records to return

    Returns:
        dict: Basic driver information including:
              - Driver names and routes
              - Status and capacity information
              - Total count for pagination

    Raises:
        HTTPException: If database query fails during driver data retrieval
    """
    try:
        # Get all drivers from database
        result = await DriverService.get_all_drivers(db, skip=skip, limit=limit)

        # Filter out sensitive information for public access
        public_drivers = []
        for driver in result.drivers:
            public_driver = {
                "id": driver.id,
                "name": driver.name,
                "route": driver.route,
                "status": driver.status,
                "total_students": driver.total_students,
                # Exclude: contact_number, license_number, vehicle_number, contact info
            }
            public_drivers.append(public_driver)

        return {
            "drivers": public_drivers,
            "total_count": result.total_count,
            "guest_access": True,
            "pagination": {
                "skip": skip,
                "limit": limit,
                "has_more": len(public_drivers) == limit and (skip + limit) < result.total_count
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving public driver information: {str(e)}"
        )