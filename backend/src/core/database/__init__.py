"""
Database module for the school management system.

This module provides database connection, session management, and database utilities
for both synchronous and asynchronous operations.
"""

from src.core.models.models import async_engine as engine, SessionLocal, get_db

__all__ = ["engine", "SessionLocal", "get_db"]
