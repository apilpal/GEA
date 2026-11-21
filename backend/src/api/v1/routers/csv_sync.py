"""
CSV synchronization router for driver data management.

This module provides FastAPI endpoints for managing CSV to database
synchronization operations for driver data. It includes endpoints for
triggering sync operations, checking status, and viewing sync history.

Endpoints:
- POST /sync/drivers: Trigger manual CSV synchronization
- GET /sync/drivers/status: Check current sync status
- GET /sync/drivers/history: View sync operation history
- GET /sync/drivers/files: List available CSV files
- GET /sync/drivers/files/{file_name}: Get CSV file information

All endpoints support comprehensive error handling and provide
detailed feedback on sync operations.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

# Import models and database functions
from src.core.models import get_db

# Import services
from src.services.csv_sync_service import (
    CSVSyncer,
    SyncConfig,
    SyncResult,
    sync_all_drivers,
    sync_single_driver_file,
    get_csv_file_info
)
from src.services.scheduler_service import (
    get_scheduler,
    start_scheduler,
    stop_scheduler,
    trigger_manual_sync,
    get_scheduler_status,
    get_sync_history,
    SchedulerConfig
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sync/drivers", tags=["csv-sync"])

# In-memory storage for sync history (in production, use a database table)
sync_history: List[Dict[str, Any]] = []
active_syncs: Dict[str, SyncResult] = {}

# Pydantic models for API responses
class SyncRequest(BaseModel):
    """Request model for manual sync operations."""
    files: Optional[List[str]] = Field(None, description="Specific files to sync (if None, syncs all)")
    config: Optional[Dict[str, Any]] = Field(None, description="Custom sync configuration")

class SyncResponse(BaseModel):
    """Response model for sync operations."""
    sync_id: str
    status: str
    message: str
    total_files: int
    success_count: int
    error_count: int
    duration_seconds: float

class SyncStatusResponse(BaseModel):
    """Response model for sync status."""
    sync_id: str
    status: str
    progress: Dict[str, Any]
    start_time: datetime
    estimated_completion: Optional[datetime] = None

class SyncHistoryResponse(BaseModel):
    """Response model for sync history."""
    history: List[Dict[str, Any]]
    total_count: int

class FileInfoResponse(BaseModel):
    """Response model for CSV file information."""
    file_name: str
    file_size: int
    record_count: int
    delimiter: str
    last_modified: str
    errors: List[str]

class FilesListResponse(BaseModel):
    """Response model for list of CSV files."""
    files: List[str]
    total_count: int

@router.post("/", response_model=SyncResponse)
async def trigger_sync(
    request: SyncRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> SyncResponse:
    """
    Trigger manual CSV synchronization for driver data.

    This endpoint initiates a CSV to database synchronization process.
    The sync operation runs in the background to avoid blocking the API.

    Args:
        request: Sync configuration including specific files and options
        background_tasks: FastAPI background tasks for async processing
        db: Database session dependency

    Returns:
        SyncResponse: Initial response with sync ID and status

    Raises:
        HTTPException: If sync operation cannot be initiated
    """
    try:
        sync_id = f"sync_{int(datetime.now().timestamp())}_{id(background_tasks)}"

        # Create custom config if provided
        config = None
        if request.config:
            config = SyncConfig(**request.config)

        # Start background sync
        background_tasks.add_task(
            run_sync_background,
            sync_id,
            request.files,
            config,
            db
        )

        # Store initial status
        initial_result = SyncResult(success=False)
        active_syncs[sync_id] = initial_result

        logger.info(f"Started sync operation {sync_id}")

        return SyncResponse(
            sync_id=sync_id,
            status="running",
            message="Sync operation started successfully",
            total_files=0,
            success_count=0,
            error_count=0,
            duration_seconds=0.0
        )

    except Exception as e:
        logger.error(f"Error starting sync: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start sync: {str(e)}")

@router.get("/status", response_model=SyncStatusResponse)
async def get_sync_status(sync_id: str = Query(..., description="Sync operation ID")) -> SyncStatusResponse:
    """
    Get the current status of a sync operation.

    Args:
        sync_id: Unique identifier for the sync operation

    Returns:
        SyncStatusResponse: Current status and progress information

    Raises:
        HTTPException: If sync ID is not found
    """
    if sync_id not in active_syncs:
        raise HTTPException(status_code=404, detail=f"Sync operation {sync_id} not found")

    result = active_syncs[sync_id]

    # Estimate completion time based on current progress
    estimated_completion = None
    if result.total_records > 0:
        elapsed = (datetime.now() - result.start_time).total_seconds()
        rate = result.success_count / elapsed if elapsed > 0 else 0
        remaining = (result.total_records - result.success_count) / rate if rate > 0 else 0
        estimated_completion = datetime.now() + timedelta(seconds=remaining)

    return SyncStatusResponse(
        sync_id=sync_id,
        status="completed" if result.end_time else "running",
        progress={
            "total_records": result.total_records,
            "success_count": result.success_count,
            "error_count": result.error_count,
            "errors": result.errors[:10],  # Limit errors in response
            "warnings": result.warnings[:10]  # Limit warnings in response
        },
        start_time=result.start_time,
        estimated_completion=estimated_completion
    )

@router.get("/history", response_model=SyncHistoryResponse)
async def get_sync_history(
    limit: int = Query(50, ge=1, le=1000, description="Maximum number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip")
) -> SyncHistoryResponse:
    """
    Get the history of sync operations.

    Args:
        limit: Maximum number of records to return
        offset: Number of records to skip for pagination

    Returns:
        SyncHistoryResponse: Paginated list of sync operations
    """
    # Filter history to requested range
    history_slice = sync_history[-(limit + offset):] if offset > 0 else sync_history[-limit:]

    return SyncHistoryResponse(
        history=history_slice,
        total_count=len(sync_history)
    )

@router.get("/files", response_model=FilesListResponse)
async def list_csv_files() -> FilesListResponse:
    """
    List all available CSV files in the drivers directory.

    Returns:
        FilesListResponse: List of CSV file names
    """
    try:
        syncer = CSVSyncer()
        csv_files = syncer.discover_csv_files()

        file_names = [f.name for f in csv_files]

        return FilesListResponse(
            files=file_names,
            total_count=len(file_names)
        )

    except Exception as e:
        logger.error(f"Error listing CSV files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@router.get("/files/{file_name}", response_model=FileInfoResponse)
async def get_csv_file_info(file_name: str) -> FileInfoResponse:
    """
    Get detailed information about a specific CSV file.

    Args:
        file_name: Name of the CSV file to analyze

    Returns:
        FileInfoResponse: Detailed file information and validation results

    Raises:
        HTTPException: If file is not found or cannot be read
    """
    try:
        file_info = get_csv_file_info(file_name)

        if "error" in file_info:
            raise HTTPException(status_code=404, detail=file_info["error"])

        return FileInfoResponse(**file_info)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file info for {file_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get file info: {str(e)}")

async def run_sync_background(
    sync_id: str,
    files: Optional[List[str]],
    config: Optional[SyncConfig],
    db: AsyncSession
) -> None:
    """
    Background task to run CSV synchronization.

    Args:
        sync_id: Unique identifier for this sync operation
        files: Specific files to sync (None for all files)
        config: Custom sync configuration
        db: Database session
    """
    try:
        logger.info(f"Starting background sync {sync_id}")

        start_time = datetime.now()

        # Create syncer with config
        syncer = CSVSyncer(config)

        # Run sync based on file specification
        if files:
            # Sync specific files
            results = {}
            for file_name in files:
                try:
                    result = await sync_single_driver_file(file_name)
                    results[file_name] = result
                except Exception as e:
                    logger.error(f"Error syncing file {file_name}: {str(e)}")
                    error_result = SyncResult(success=False)
                    error_result.errors.append(str(e))
                    results[file_name] = error_result
        else:
            # Sync all files
            results = await syncer.sync_all_files(db)

        # Update active sync status
        if sync_id in active_syncs:
            # Calculate totals
            total_records = sum(r.total_records for r in results.values())
            success_count = sum(r.success_count for r in results.values())
            error_count = sum(r.error_count for r in results.values())

            # Update the active sync result
            active_syncs[sync_id].total_records = total_records
            active_syncs[sync_id].success_count = success_count
            active_syncs[sync_id].error_count = error_count
            active_syncs[sync_id].success = error_count == 0
            active_syncs[sync_id].end_time = datetime.now()
            active_syncs[sync_id].duration_seconds = (
                active_syncs[sync_id].end_time - active_syncs[sync_id].start_time
            ).total_seconds()

            # Collect all errors and warnings
            for result in results.values():
                active_syncs[sync_id].errors.extend(result.errors)
                active_syncs[sync_id].warnings.extend(result.warnings)

        # Create history entry
        history_entry = {
            "sync_id": sync_id,
            "start_time": start_time.isoformat(),
            "end_time": datetime.now().isoformat(),
            "duration_seconds": (datetime.now() - start_time).total_seconds(),
            "total_files": len(results),
            "total_records": sum(r.total_records for r in results.values()),
            "success_count": sum(r.success_count for r in results.values()),
            "error_count": sum(r.error_count for r in results.values()),
            "success": sum(r.error_count for r in results.values()) == 0,
            "files_processed": list(results.keys()),
            "errors": [error for result in results.values() for error in result.errors],
            "warnings": [warning for result in results.values() for warning in result.warnings]
        }

        sync_history.append(history_entry)

        # Keep only last 1000 history entries
        if len(sync_history) > 1000:
            sync_history[:] = sync_history[-1000:]

        # Clean up active sync entry after some time
        # (In production, you might want to keep it longer or move to persistent storage)

        logger.info(f"Completed background sync {sync_id}")

    except Exception as e:
        logger.error(f"Error in background sync {sync_id}: {str(e)}")

        # Update active sync with error
        if sync_id in active_syncs:
            active_syncs[sync_id].errors.append(f"Background sync error: {str(e)}")
            active_syncs[sync_id].end_time = datetime.now()
            active_syncs[sync_id].duration_seconds = (
                active_syncs[sync_id].end_time - active_syncs[sync_id].start_time
            ).total_seconds()

        # Create error history entry
        error_entry = {
            "sync_id": sync_id,
            "start_time": start_time.isoformat(),
            "end_time": datetime.now().isoformat(),
            "duration_seconds": (datetime.now() - start_time).total_seconds(),
            "error": str(e),
            "success": False
        }

        sync_history.append(error_entry)

# Optional: Add endpoint for sync configuration management
@router.get("/config")
async def get_sync_config() -> Dict[str, Any]:
    """
    Get current CSV sync configuration.

    Returns:
        Dict containing current sync configuration
    """
    config = SyncConfig()
    return {
        "csv_directory": config.csv_directory,
        "supported_delimiters": config.supported_delimiters,
        "batch_size": config.batch_size,
        "validate_headers": config.validate_headers,
        "skip_duplicates": config.skip_duplicates,
        "create_missing_routes": config.create_missing_routes,
        "email_notifications": config.email_notifications
    }

# Optional: Health check endpoint for sync system
@router.get("/health")
async def sync_health_check() -> Dict[str, Any]:
    """
    Health check endpoint for the CSV sync system.

    Returns:
        Dict containing system health information
    """
    syncer = CSVSyncer()

    try:
        csv_files = syncer.discover_csv_files()
        csv_directory_exists = syncer.csv_directory.exists()
        csv_directory_writable = os.access(syncer.csv_directory, os.W_OK)

        return {
            "status": "healthy",
            "csv_directory": {
                "path": str(syncer.csv_directory),
                "exists": csv_directory_exists,
                "writable": csv_directory_writable,
                "file_count": len(csv_files),
                "files": [f.name for f in csv_files]
            },
            "active_syncs": len(active_syncs),
            "history_count": len(sync_history),
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Scheduler management endpoints
@router.post("/scheduler/start")
async def start_sync_scheduler() -> Dict[str, Any]:
    """
    Start the CSV sync scheduler.

    Returns:
        Dict containing scheduler start status
    """
    try:
        success = await start_scheduler()
        if success:
            return {"status": "started", "message": "Scheduler started successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to start scheduler")
    except Exception as e:
        logger.error(f"Error starting scheduler: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting scheduler: {str(e)}")

@router.post("/scheduler/stop")
async def stop_sync_scheduler() -> Dict[str, Any]:
    """
    Stop the CSV sync scheduler.

    Returns:
        Dict containing scheduler stop status
    """
    try:
        success = await stop_scheduler()
        if success:
            return {"status": "stopped", "message": "Scheduler stopped successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to stop scheduler")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error stopping scheduler: {str(e)}")

@router.get("/scheduler/status")
async def get_scheduler_status_endpoint() -> Dict[str, Any]:
    """
    Get the current status of the CSV sync scheduler.

    Returns:
        Dict containing scheduler status and configuration
    """
    try:
        status = get_scheduler_status()
        scheduler = get_scheduler()

        return {
            "scheduler_status": status,
            "configuration": {
                "enabled": scheduler.config.enabled,
                "sync_frequency": scheduler.config.sync_frequency,
                "sync_time": scheduler.config.sync_time,
                "sync_interval_hours": scheduler.config.sync_interval_hours,
                "custom_cron": scheduler.config.custom_cron,
                "email_notifications": scheduler.config.email_notifications
            },
            "recent_syncs": scheduler.get_sync_history(5)
        }
    except Exception as e:
        logger.error(f"Error getting scheduler status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting scheduler status: {str(e)}")

@router.post("/scheduler/sync-now")
async def trigger_immediate_sync() -> Dict[str, Any]:
    """
    Trigger an immediate CSV synchronization.

    Returns:
        Dict containing sync operation results
    """
    try:
        result = await trigger_manual_sync()
        return result
    except Exception as e:
        logger.error(f"Error triggering immediate sync: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error triggering sync: {str(e)}")

@router.get("/scheduler/history")
async def get_scheduler_history(
    limit: int = Query(50, ge=1, le=1000, description="Maximum number of records to return")
) -> Dict[str, Any]:
    """
    Get the history of scheduled sync operations.

    Args:
        limit: Maximum number of records to return

    Returns:
        Dict containing sync history and summary
    """
    try:
        history = get_sync_history(limit)

        # Calculate summary statistics
        total_syncs = len(history)
        successful_syncs = sum(1 for h in history if h.get("success", False))
        failed_syncs = total_syncs - successful_syncs

        return {
            "history": history,
            "summary": {
                "total_syncs": total_syncs,
                "successful_syncs": successful_syncs,
                "failed_syncs": failed_syncs,
                "success_rate": (successful_syncs / total_syncs * 100) if total_syncs > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"Error getting scheduler history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting history: {str(e)}")