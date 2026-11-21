"""
Main entry point for the Student Profiles API application.

This module serves as the primary entry point for the FastAPI application,
importing the core application from the src package and providing a clean
interface for running the server.
"""

from src.main import app

# Export the FastAPI app instance for uvicorn and other tools
__all__ = ["app"]