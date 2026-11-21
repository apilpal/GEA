"""
Report service for generating comprehensive analytics and reports.

This module provides business logic for creating various reports and analytics
from school management data. It generates summaries, student-driver associations,
revenue analysis, and statistical insights for administrative decision-making.

The service supports multiple report types:
- System summary statistics (drivers, students, revenue)
- Student distribution by driver
- Revenue analysis by driver and class
- Driver workload and capacity statistics

All methods are static and designed for high performance with proper
error handling and comprehensive data aggregation.
"""

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from src.core.models import DBStudent, DBDriver

class ReportService:
    """Service class for generating various reports and analytics.

    Provides static methods for creating comprehensive reports from
    school management data including summaries, breakdowns, and statistics.
    """

    @staticmethod
    async def get_reports_summary(db: AsyncSession) -> dict:
        """Generate comprehensive summary statistics for the school management system.

        Creates a high-level overview report containing key metrics and breakdowns
        including total counts, revenue figures, and per-driver performance data.

        Args:
            db (AsyncSession): Database session for data aggregation queries

        Returns:
            dict: Comprehensive summary with structure:
                  {
                    "total_drivers": int,
                    "total_students": int,
                    "total_revenue": float,
                    "drivers": [
                      {
                        "driver_name": str,
                        "student_count": int,
                        "revenue": float
                      }, ...
                    ]
                  }

        Raises:
            HTTPException: If database queries fail during report generation
        """
        try:
            # Get total counts using select
            total_students_result = await db.execute(select(func.count(DBStudent.id)))
            total_students = total_students_result.scalar() or 0

            total_drivers_result = await db.execute(select(func.count(DBDriver.id)))
            total_drivers = total_drivers_result.scalar() or 0

            # Calculate total revenue
            total_revenue_result = await db.execute(select(func.sum(DBStudent.fees)))
            total_revenue = total_revenue_result.scalar() or 0.0

            # Get driver summaries with proper async queries
            db_drivers_result = await db.execute(select(DBDriver))
            db_drivers = db_drivers_result.scalars().all()
            driver_summaries = []

            for db_driver in db_drivers:
                # Count students for this driver
                driver_students_result = await db.execute(
                    select(func.count(DBStudent.id)).where(DBStudent.route == db_driver.name)
                )
                driver_students = driver_students_result.scalar() or 0

                # Sum revenue for this driver
                driver_revenue_result = await db.execute(
                    select(func.sum(DBStudent.fees)).where(DBStudent.route == db_driver.name)
                )
                driver_revenue = driver_revenue_result.scalar() or 0.0

                driver_summaries.append({
                    "driver_name": db_driver.name,
                    "student_count": driver_students,
                    "revenue": float(driver_revenue)
                })

            return {
                "total_drivers": total_drivers,
                "total_students": total_students,
                "total_revenue": float(total_revenue),
                "drivers": driver_summaries
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

    @staticmethod
    async def get_students_by_driver(db: AsyncSession) -> dict:
        """Generate detailed report of students organized by their assigned driver.

        Creates a comprehensive report showing all students grouped by their
        transport driver assignment. Useful for route planning, attendance
        tracking, and understanding driver responsibilities.

        Args:
            db (AsyncSession): Database session for student and driver queries

        Returns:
            dict: Students organized by driver with structure:
                  {
                    "drivers": [
                      {
                        "driver_name": str,
                        "students": [
                          {
                            "id": int,
                            "route": str,
                            "name": str,
                            "father_name": str,
                            "mobile": str,
                            "class": str,
                            "address": str,
                            "fees": str
                          }, ...
                        ]
                      }, ...
                    ]
                  }

        Raises:
            HTTPException: If database queries fail during report generation
        """
        try:
            # Get all drivers
            db_drivers_result = await db.execute(select(DBDriver))
            db_drivers = db_drivers_result.scalars().all()
            driver_data = []

            for db_driver in db_drivers:
                # Get all students for this driver
                db_students_result = await db.execute(
                    select(DBStudent).where(DBStudent.route == db_driver.name)
                )
                db_students = db_students_result.scalars().all()
                students = []

                for db_student in db_students:
                    students.append({
                        "id": db_student.id,
                        "route": db_student.route,
                        "name": db_student.name,
                        "father_name": db_student.father_name,
                        "mobile": db_student.mobile,
                        "class": db_student.class_,
                        "address": db_student.address,
                        "fees": str(db_student.fees) if db_student.fees else None
                    })

                driver_data.append({
                    "driver_name": db_driver.name,
                    "students": students
                })

            return {"drivers": driver_data}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating student report: {str(e)}")

    @staticmethod
    async def get_revenue_analysis(db: AsyncSession) -> dict:
        """Generate comprehensive revenue analysis broken down by driver and student class.

        Produces detailed financial analysis showing transport revenue distribution
        across different drivers and class levels. Helps identify revenue patterns,
        driver performance, and class-based fee structures.

        Args:
            db (AsyncSession): Database session for revenue aggregation queries

        Returns:
            dict: Multi-dimensional revenue analysis with structure:
                  {
                    "revenue_by_driver": {"driver_name": total_revenue, ...},
                    "revenue_by_class": {"class_name": total_revenue, ...},
                    "total_revenue": float  # Sum of all revenue
                  }

        Note:
            Drivers without assigned fees are grouped under 'Unknown'.
            Classes without fees are also grouped under 'Unknown'.

        Raises:
            HTTPException: If database queries fail during analysis
        """
        try:
            # Get all students with their fees
            students_result = await db.execute(select(DBStudent))
            students = students_result.scalars().all()

            revenue_by_driver = {}
            revenue_by_class = {}

            for student in students:
                if student.fees is not None:
                    # Revenue by driver
                    driver_name = student.route or 'Unknown'
                    if driver_name not in revenue_by_driver:
                        revenue_by_driver[driver_name] = 0
                    revenue_by_driver[driver_name] += student.fees

                    # Revenue by class
                    class_name = student.class_ or 'Unknown'
                    if class_name not in revenue_by_class:
                        revenue_by_class[class_name] = 0
                    revenue_by_class[class_name] += student.fees

            return {
                "revenue_by_driver": revenue_by_driver,
                "revenue_by_class": revenue_by_class,
                "total_revenue": sum(revenue_by_driver.values())
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating revenue analysis: {str(e)}")

    @staticmethod
    async def get_driver_student_stats(db: AsyncSession) -> dict:
        """Generate statistics about drivers and their assigned students.

        Creates comprehensive statistics for transport management including
        capacity utilization, driver workload distribution, and performance
        metrics for operational planning.

        Args:
            db (AsyncSession): Database session for statistical queries

        Returns:
            dict: Detailed driver-student statistics with structure:
                  {
                    "total_drivers": int,
                    "total_students": int,
                    "average_students_per_driver": float,
                    "driver_with_most_students": {
                      "driver_name": str,
                      "student_count": int
                    },
                    "driver_with_least_students": {
                      "driver_name": str,
                      "student_count": int
                    },
                    "driver_statistics": [
                      {
                        "driver_name": str,
                        "student_count": int
                      }, ...
                    ]
                  }

        Raises:
            HTTPException: If database queries fail during statistics generation
        """
        try:
            total_drivers_result = await db.execute(select(func.count(DBDriver.id)))
            total_drivers = total_drivers_result.scalar() or 0

            total_students_result = await db.execute(select(func.count(DBStudent.id)))
            total_students = total_students_result.scalar() or 0

            # Get student counts per driver
            driver_stats = []
            db_drivers_result = await db.execute(select(DBDriver))
            db_drivers = db_drivers_result.scalars().all()

            student_counts = []
            for db_driver in db_drivers:
                student_count_result = await db.execute(
                    select(func.count(DBStudent.id)).where(DBStudent.route == db_driver.name)
                )
                student_count = student_count_result.scalar() or 0
                student_counts.append(student_count)
                driver_stats.append({
                    "driver_name": db_driver.name,
                    "student_count": student_count
                })

            if student_counts:
                avg_students_per_driver = sum(student_counts) / len(student_counts)
                max_students = max(student_counts)
                min_students = min(student_counts)

                driver_with_most = next((d for d in driver_stats if d["student_count"] == max_students), None)
                driver_with_least = next((d for d in driver_stats if d["student_count"] == min_students), None)
            else:
                avg_students_per_driver = 0
                max_students = 0
                min_students = 0
                driver_with_most = None
                driver_with_least = None

            return {
                "total_drivers": total_drivers,
                "total_students": total_students,
                "average_students_per_driver": round(avg_students_per_driver, 2),
                "driver_with_most_students": driver_with_most,
                "driver_with_least_students": driver_with_least,
                "driver_statistics": driver_stats
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating driver-student statistics: {str(e)}")