"""
Student service for managing student data and operations.

This module provides the core business logic for student management including
CRUD operations, search functionality, and data validation. It handles all
database interactions for student records while ensuring data integrity
and proper error handling.

Key Features:
- Complete CRUD operations for students
- Mobile number uniqueness validation
- Multi-field search capabilities
- Automatic timestamp management
- Fee validation and formatting
- Paginated data retrieval

All methods are static and designed for use with FastAPI dependency injection
and async database operations.
"""

import logging
import time
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from src.core.models import Student, StudentResponse, CreateStudentRequest, UpdateStudentRequest, DBStudent

logger = logging.getLogger(__name__)

class StudentService:
    """Service class for managing student-related business logic.

    Provides static methods for all student operations including CRUD,
    search, and data validation. All methods handle database transactions
    and proper error management.
    """

    @staticmethod
    async def get_students(db: AsyncSession, skip: int = 0, limit: int = 100) -> StudentResponse:
        """Retrieve paginated list of students from the database.

        Fetches students with pagination support for efficient data loading
        and frontend display. Includes total count for pagination metadata.

        Args:
            db (AsyncSession): Database session for queries
            skip (int): Number of records to skip for pagination (default: 0)
            limit (int): Maximum number of records to return (default: 100)

        Returns:
            StudentResponse: Paginated response containing:
                            - students: List of Student objects
                            - total_count: Total number of students in database

        Raises:
            HTTPException: If database query fails during retrieval
        """
        try:
            logger.info("Starting get_students operation")
            logger.info(f"Database session type: {type(db)}")
            try:
                db_students_result = await db.execute(select(DBStudent).offset(skip).limit(limit))
                logger.info("Successfully used select() in get_students")
                db_students = db_students_result.scalars().all()
                total_count_result = await db.execute(select(func.count(DBStudent.id)))
                total_count = total_count_result.scalar()
            except Exception as e:
                logger.error(f"Error in student service get_students: {e}")
                raise

            students = []
            for db_student in db_students:
                student = Student(
                    id=str(db_student.id),
                    route=db_student.route,
                    name=db_student.name,
                    father_name=db_student.father_name,
                    mobile=db_student.mobile,
                    class_=db_student.class_,
                    address=db_student.address,
                    fees=str(db_student.fees) if db_student.fees else None
                )
                students.append(student)

            return StudentResponse(students=students, total_count=total_count)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving student data: {str(e)}")

    @staticmethod
    async def get_student_by_id(db: AsyncSession, student_id: int) -> Student:
        """Retrieve a single student by their unique identifier.

        Fetches complete student information including contact details,
        academic information, and transport assignments by primary key.

        Args:
            db (AsyncSession): Database session for the query
            student_id (int): Unique numeric identifier of the student

        Returns:
            Student: Complete student object with all profile information
                   including contact details, location data, and status

        Raises:
            HTTPException: If student not found (404) or database error occurs (500)
        """
        try:
            result = await db.execute(select(DBStudent).where(DBStudent.id == student_id))
            db_student = result.scalar_one_or_none()
            if not db_student:
                raise HTTPException(status_code=404, detail=f"Student with id {student_id} not found")

            student = Student(
                id=str(db_student.id),
                route=db_student.route,
                name=db_student.name,
                father_name=db_student.father_name,
                mobile=db_student.mobile,
                class_=db_student.class_,
                address=db_student.address,
                fees=str(db_student.fees) if db_student.fees else None,
                status=db_student.status
            )
            return student
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving student data: {str(e)}")

    @staticmethod
    async def create_student(db: AsyncSession, student: CreateStudentRequest) -> Student:
        """Create a new student record in the database with validation.

        Adds a new student to the system with all required enrollment information.
        Validates mobile number uniqueness and proper fee formatting. Generates
        automatic timestamps for creation and update tracking.

        Args:
            db (AsyncSession): Database session for the operation
            student (CreateStudentRequest): Complete student information including
                                          personal details, contact info, academic data,
                                          and transport assignments

        Returns:
            Student: Newly created student object with generated ID and timestamps

        Raises:
            HTTPException: If mobile number already exists (400) or database
                           operation fails (500)
        """
        try:
            # Validate fees
            fees_float = float(student.fees) if student.fees else 0.0

            # Validate mobile uniqueness if provided
            if student.mobile:
                existing_result = await db.execute(select(DBStudent).where(DBStudent.mobile == student.mobile))
                existing = existing_result.scalar_one_or_none()
                if existing:
                    raise HTTPException(status_code=400, detail=f"Mobile number {student.mobile} already exists")

            current_time = int(time.time())
            db_student = DBStudent(
                route=student.route,
                name=student.name,
                father_name=student.father_name,
                mobile=student.mobile,
                class_=student.class_,
                address=student.address,
                fees=fees_float,
                status=student.status,
                created_at=current_time,
                updated_at=current_time
            )
            db.add(db_student)
            await db.commit()
            await db.refresh(db_student)

            return Student(
                id=str(db_student.id),
                route=db_student.route,
                name=db_student.name,
                father_name=db_student.father_name,
                mobile=db_student.mobile,
                class_=db_student.class_,
                address=db_student.address,
                fees=str(db_student.fees) if db_student.fees else None,
                status=db_student.status,
                created_at=db_student.created_at,
                updated_at=db_student.updated_at
            )
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Error creating student: {str(e)}")

    @staticmethod
    async def update_student(db: AsyncSession, student_id: int, student_update: UpdateStudentRequest) -> Student:
        """Update an existing student's information with partial data.

        Allows partial updates to student information. Only the fields provided
        in the update request will be modified, preserving existing data.
        Validates mobile number uniqueness when updating contact information.

        Args:
            db (AsyncSession): Database session for the operation
            student_id (int): Unique numeric identifier of the student to update
            student_update (UpdateStudentRequest): Partial student data - only
                                                   provided fields will be changed

        Returns:
            Student: Updated student object with refreshed information
                   and updated timestamp

        Raises:
            HTTPException: If student not found (404), mobile number conflict (400),
                           or database operation fails (500)
        """
        try:
            result = await db.execute(select(DBStudent).where(DBStudent.id == student_id))
            db_student = result.scalar_one_or_none()
            if not db_student:
                raise HTTPException(status_code=404, detail=f"Student with id {student_id} not found")

            update_data = student_update.model_dump(exclude_unset=True)

            # Validate mobile uniqueness if being updated
            if 'mobile' in update_data and update_data['mobile']:
                existing_result = await db.execute(select(DBStudent).where(
                    DBStudent.mobile == update_data['mobile'],
                    DBStudent.id != student_id
                ))
                existing = existing_result.scalar_one_or_none()
                if existing:
                    raise HTTPException(status_code=400, detail=f"Mobile number {update_data['mobile']} already exists")

            for key, value in update_data.items():
                if hasattr(db_student, key):
                    if key == 'fees' and value is not None:
                        setattr(db_student, key, float(value))
                    else:
                        setattr(db_student, key, value)

            # Update timestamp
            db_student.updated_at = int(time.time())

            await db.commit()
            await db.refresh(db_student)

            return Student(
                id=str(db_student.id),
                route=db_student.route,
                name=db_student.name,
                father_name=db_student.father_name,
                mobile=db_student.mobile,
                class_=db_student.class_,
                address=db_student.address,
                fees=str(db_student.fees) if db_student.fees else None,
                status=db_student.status
            )
        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Error updating student: {str(e)}")

    @staticmethod
    async def delete_student(db: AsyncSession, student_id: int) -> dict:
        """Delete a student record from the database permanently.

        Removes a student from the system completely. This action cannot be undone
        and will affect all associated records and reports. Returns confirmation
        with the deleted student's name for logging purposes.

        Args:
            db (AsyncSession): Database session for the operation
            student_id (int): Unique numeric identifier of the student to delete

        Returns:
            dict: Success confirmation with structure:
                  {"message": "Student {name} deleted successfully"}

        Raises:
            HTTPException: If student not found (404) or deletion fails due
                           to database constraints or other errors (500)
        """
        try:
            result = await db.execute(select(DBStudent).where(DBStudent.id == student_id))
            db_student = result.scalar_one_or_none()
            if not db_student:
                raise HTTPException(status_code=404, detail=f"Student with id {student_id} not found")

            student_name = db_student.name
            await db.delete(db_student)
            await db.commit()

            return {"message": f"Student {student_name} deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Error deleting student: {str(e)}")

    @staticmethod
    async def search_students(db: AsyncSession, query: str) -> StudentResponse:
        """Search for students across multiple fields using case-insensitive matching.

        Performs comprehensive search across student name, father's name, class,
        mobile number, address, and route fields. Returns all matching students
        with their complete profile information. If no query is provided,
        returns all students in the system.

        Args:
            db (AsyncSession): Database session for the search operation
            query (str): Search string to match against student data fields

        Returns:
            StudentResponse: Search results containing:
                            - students: List of Student objects matching the query
                            - total_count: Number of matching students

        Note:
            Search is case-insensitive and matches partial strings.
            Searches across: name, father's name, class, mobile, address, route fields.
            If query is empty or None, returns all students (no filtering).
        """
        try:
            if not query:
                # Return all students if no query
                result = await db.execute(select(DBStudent))
                db_students = result.scalars().all()
            else:
                query_lower = query.lower()
                # Search across multiple fields
                result = await db.execute(select(DBStudent).where(
                    (DBStudent.name.ilike(f"%{query}%")) |
                    (DBStudent.father_name.ilike(f"%{query}%")) |
                    (DBStudent.class_.ilike(f"%{query}%")) |
                    (DBStudent.mobile.ilike(f"%{query}%")) |
                    (DBStudent.address.ilike(f"%{query}%")) |
                    (DBStudent.route.ilike(f"%{query}%"))
                ))
                db_students = result.scalars().all()

            students = []
            for db_student in db_students:
                student = Student(
                    id=str(db_student.id),
                    route=db_student.route,
                    name=db_student.name,
                    father_name=db_student.father_name,
                    mobile=db_student.mobile,
                    class_=db_student.class_,
                    address=db_student.address,
                    fees=str(db_student.fees) if db_student.fees else None
                )
                students.append(student)

            return StudentResponse(students=students, total_count=len(students))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error searching students: {str(e)}")