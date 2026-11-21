"""
Students router for student management endpoints.

This module provides FastAPI routes for managing student records in the
school management system. It handles all CRUD operations for students,
including creation, retrieval, updating, deletion, and search functionality.

Endpoints:
- GET /students/: List students with pagination
- GET /students/{student_id}: Get specific student profile
- POST /students/: Create new student
- PUT /students/{student_id}: Update existing student
- DELETE /students/{student_id}: Delete student
- GET /students/search/: Search students by query

All endpoints include rate limiting to prevent abuse and ensure
system performance. The router integrates with the student service
layer for business logic and database operations.
"""

from fastapi import APIRouter, HTTPException, Query, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
import csv

# Import models and database functions
from src.core.models import (
    Student,
    StudentResponse,
    CreateStudentRequest,
    UpdateStudentRequest,
    get_db,
    DBStudent
)

# Import services
from src.services.student_service import StudentService
from src.utils.auth_utils import require_admin, require_teacher_or_admin

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/students", tags=["students"])

@router.get("/", response_model=StudentResponse)
@limiter.limit("60/minute")
async def get_students(
    request: Request,
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of students to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of students to return")
) -> StudentResponse:
    """Retrieve a paginated list of students from the database.

    Provides a paginated view of all students in the system. Rate limited
    to 60 requests per minute to ensure system performance.

    Args:
        request (Request): FastAPI request object (used by rate limiter)
        db (AsyncSession): Database session dependency
        skip (int): Number of records to skip for pagination (default: 0)
        limit (int): Maximum number of records to return (1-1000, default: 100)

    Returns:
        StudentResponse: Paginated response containing list of students
                        and total count for pagination metadata

    Raises:
        HTTPException: If database query fails or rate limit exceeded
    """
    return await StudentService.get_students(db, skip, limit)

@router.get("/{student_id}", response_model=Student)
async def get_student_profile(student_id: int, db: AsyncSession = Depends(get_db)) -> Student:
    """Retrieve detailed profile information for a specific student.

    Fetches complete student information including contact details,
    transport assignments, academic information, and enrollment status.

    Args:
        student_id (int): Unique numeric identifier of the student
        db (AsyncSession): Database session dependency

    Returns:
        Student: Complete student profile with all associated information
                including contact details, location data, and transport info

    Raises:
        HTTPException: If student not found (404) or database error occurs
    """
    return await StudentService.get_student_by_id(db, student_id)

@router.post("/", response_model=Student, dependencies=[Depends(require_teacher_or_admin)])
@limiter.limit("30/minute")
async def create_student(request: Request, student: CreateStudentRequest, db: AsyncSession = Depends(get_db)) -> Student:
    """Create a new student record in the database.

    Adds a new student to the system with all required enrollment information.
    Rate limited to 30 requests per minute to prevent abuse.

    Args:
        request (Request): FastAPI request object (used by rate limiter)
        student (CreateStudentRequest): Complete student information including
                                       personal details, contact info, academic data,
                                       and transport assignments
        db (AsyncSession): Database session dependency

    Returns:
        Student: Created student object with generated ID and timestamps

    Raises:
        HTTPException: If creation fails due to validation errors,
                       duplicate mobile numbers, or database constraints
    """
    return await StudentService.create_student(db, student)

@router.put("/{student_id}", response_model=Student, dependencies=[Depends(require_teacher_or_admin)])
async def update_student(student_id: int, student_update: UpdateStudentRequest, db: AsyncSession = Depends(get_db)) -> Student:
    """Update an existing student record with new information.

    Allows partial updates to student information. Only the fields provided
    in the update request will be modified, preserving existing data.

    Args:
        student_id (int): Unique numeric identifier of the student to update
        student_update (UpdateStudentRequest): Partial student data - only provided
                                               fields will be changed
        db (AsyncSession): Database session dependency

    Returns:
        Student: Updated student object with new information and updated timestamp

    Raises:
        HTTPException: If student not found (404) or update operation fails
    """
    return await StudentService.update_student(db, student_id, student_update)

@router.delete("/{student_id}", dependencies=[Depends(require_admin)])
async def delete_student(student_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    """Delete a student record from the database.

    Permanently removes a student from the system. This action cannot be undone
    and will affect all associated records and reports.

    Args:
        student_id (int): Unique numeric identifier of the student to delete
        db (AsyncSession): Database session dependency

    Returns:
        dict: Success confirmation with message indicating successful deletion
              and details about the removed student

    Raises:
        HTTPException: If student not found (404) or deletion fails due to
                       database constraints or other errors
    """
    return await StudentService.delete_student(db, student_id)

@router.get("/search/", response_model=StudentResponse)
async def search_students(q: str = Query(..., description="Search query"), db: AsyncSession = Depends(get_db)) -> StudentResponse:
    """Search for students across multiple fields.

    Performs a comprehensive search across student name, father's name, class,
    mobile number, address, and route fields. Returns all matching students
    with their complete profile information.

    Args:
        q (str): Search query string to match against student data fields
        db (AsyncSession): Database session dependency

    Returns:
        StudentResponse: List of students matching the search criteria with
                        total count for pagination support

    Note:
        Search is case-insensitive and matches partial strings.
        Searches across: name, father's name, class, mobile, address, route fields.
        Results are not paginated - returns all matches.
    """
    return await StudentService.search_students(db, q)