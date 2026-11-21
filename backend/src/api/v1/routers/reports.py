"""
Reports router for analytics and data analysis endpoints.

This module provides FastAPI routes for generating comprehensive reports
and analytics on school management data. It offers various report types
including summary statistics, student-driver associations, revenue analysis,
and performance metrics.

Endpoints:
- GET /reports/summary: Overall system statistics and metrics
- GET /reports/students-by-driver: Student listings grouped by driver
- GET /reports/revenue-analysis: Financial analysis by driver and class
- GET /reports/driver-student-stats: Transport capacity and utilization stats

All endpoints return structured data suitable for dashboard display,
export functionality, and administrative decision-making.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Import database functions
from src.core.models import get_db

# Import services
from src.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/summary")
async def get_reports_summary(db: AsyncSession = Depends(get_db)) -> dict:
    """Retrieve comprehensive summary statistics for the entire school management system.

    Generates a high-level overview of the school's transport operations including
    total counts, revenue figures, and key performance indicators.

    Args:
        db (AsyncSession): Database session dependency for data retrieval

    Returns:
        dict: Comprehensive summary containing:
              - Total number of drivers and students
              - Total revenue across all operations
              - Per-driver statistics and performance metrics
              - System-wide operational statistics

    Raises:
        HTTPException: If database query fails during report generation
    """
    return await ReportService.get_reports_summary(db)

@router.get("/students-by-driver")
async def get_students_by_driver(db: AsyncSession = Depends(get_db)) -> dict:
    """Retrieve detailed student information organized by their assigned driver.

    Creates a structured report showing all students grouped by their transport
    driver, useful for route planning, attendance tracking, and driver workload management.

    Args:
        db (AsyncSession): Database session dependency for data retrieval

    Returns:
        dict: Students organized by driver with structure:
              {"driver_name": [student_details, ...], ...}
              Each student entry includes full profile information

    Raises:
        HTTPException: If database query fails during report generation
    """
    return await ReportService.get_students_by_driver(db)

@router.get("/revenue-analysis")
async def get_revenue_analysis(db: AsyncSession = Depends(get_db)) -> dict:
    """Generate comprehensive revenue analysis broken down by driver and student class.

    Produces detailed financial reports showing revenue distribution across
    different drivers and class levels, helping identify revenue patterns
    and optimize transport fee structures.

    Args:
        db (AsyncSession): Database session dependency for data retrieval

    Returns:
        dict: Multi-dimensional revenue analysis with:
              - Revenue grouped by individual driver
              - Revenue grouped by student class/grade
              - Total revenue calculations
              - Comparative statistics and percentages

    Raises:
        HTTPException: If database query fails during analysis generation
    """
    return await ReportService.get_revenue_analysis(db)

@router.get("/driver-student-stats")
async def get_driver_student_stats(db: AsyncSession = Depends(get_db)) -> dict:
    """Retrieve statistics about drivers and their assigned students.

    Provides operational statistics for transport management including
    capacity utilization, driver workload distribution, and system efficiency metrics.

    Args:
        db (AsyncSession): Database session dependency for data retrieval

    Returns:
        dict: Statistical analysis including:
              - Total number of active drivers
              - Total number of students in transport system
              - Average students per driver
              - Detailed per-driver statistics
              - Capacity utilization metrics

    Raises:
        HTTPException: If database query fails during statistics generation
    """
    return await ReportService.get_driver_student_stats(db)