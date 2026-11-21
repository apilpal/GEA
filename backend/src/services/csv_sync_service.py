"""
CSV to Database synchronization service for drivers data.

This module provides comprehensive functionality for synchronizing driver data
from CSV files to the database. It handles parsing, validation, error handling,
and provides audit trails for sync operations.

Key Features:
- CSV parsing with flexible format support
- Data validation and integrity checks
- Upsert functionality (insert or update)
- Transaction management for consistency
- Comprehensive error handling and logging
- Audit trails for sync operations
- Background task support for large files

The service supports various CSV formats and provides detailed sync reports
with success/failure counts and error details.
"""

import csv
import os
import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from pathlib import Path
import asyncio
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, text
from sqlalchemy.orm import selectinload

from ..core.models import (
    DBDriver,
    Driver,
    get_db
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SyncResult:
    """Result of a CSV synchronization operation."""
    success: bool
    total_records: int = 0
    success_count: int = 0
    error_count: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    duration_seconds: float = 0.0

@dataclass
class SyncConfig:
    """Configuration for CSV synchronization."""
    csv_directory: str = "backend/data/drivers"
    supported_delimiters: List[str] = field(default_factory=lambda: [',', ';', '\t'])
    batch_size: int = 100
    validate_headers: bool = True
    skip_duplicates: bool = True
    create_missing_routes: bool = False
    email_notifications: bool = False

class CSVSyncer:
    """Main CSV synchronization service class."""

    def __init__(self, config: Optional[SyncConfig] = None):
        """Initialize the CSV syncer with configuration."""
        self.config = config or SyncConfig()
        self.csv_directory = Path(self.config.csv_directory)

        # Ensure CSV directory exists
        self.csv_directory.mkdir(parents=True, exist_ok=True)

        # Expected headers for driver CSV files
        self.expected_headers = {
            'name', 'route', 'status', 'vehicle_number',
            'contact_number', 'license_number', 'experience_years'
        }

        # Optional headers that may be present
        self.optional_headers = {
            'notes', 'emergency_contact', 'vehicle_model',
            'vehicle_capacity', 'license_expiry'
        }

    def discover_csv_files(self) -> List[Path]:
        """Discover all CSV files in the configured directory."""
        if not self.csv_directory.exists():
            logger.warning(f"CSV directory {self.csv_directory} does not exist")
            return []

        csv_files = list(self.csv_directory.glob("*.csv"))
        logger.info(f"Discovered {len(csv_files)} CSV files: {[f.name for f in csv_files]}")
        return csv_files

    def detect_delimiter(self, file_path: Path) -> str:
        """Detect the delimiter used in a CSV file."""
        with open(file_path, 'r', encoding='utf-8') as file:
            sample = file.read(1024)  # Read first 1KB

        # Count potential delimiters
        delimiter_counts = {}
        for delimiter in self.config.supported_delimiters:
            delimiter_counts[delimiter] = sample.count(delimiter)

        # Return the most common delimiter
        best_delimiter = max(delimiter_counts.items(), key=lambda x: x[1])

        # If no delimiters found or comma is most common, use comma
        if best_delimiter[1] == 0:
            return ','
        elif best_delimiter[0] == ',' and best_delimiter[1] < 3:
            return ','  # Default to comma if few delimiters found

        logger.info(f"Detected delimiter '{best_delimiter[0]}' for {file_path.name}")
        return best_delimiter[0]

    def validate_csv_headers(self, headers: List[str], file_path: Path) -> Tuple[bool, List[str]]:
        """Validate CSV headers against expected format."""
        if not self.config.validate_headers:
            return True, []

        headers_set = set(h.lower() for h in headers)
        errors = []

        # Check for required headers
        missing_required = self.expected_headers - headers_set
        if missing_required:
            errors.append(f"Missing required headers: {', '.join(missing_required)}")

        # Check for unknown headers
        known_headers = self.expected_headers | self.optional_headers
        unknown_headers = headers_set - known_headers
        if unknown_headers:
            logger.warning(f"Unknown headers found in {file_path.name}: {', '.join(unknown_headers)}")

        return len(errors) == 0, errors

    def parse_driver_record(self, row: Dict[str, Any], file_path: Path) -> Tuple[Optional[Dict[str, Any]], List[str]]:
        """Parse and validate a single driver record from CSV."""
        errors = []
        warnings = []

        # Extract and validate required fields
        driver_data = {}

        # Name (required)
        name = row.get('name', '').strip()
        if not name:
            errors.append("Missing required field: name")
        else:
            driver_data['name'] = name

        # Route (optional but commonly used)
        route = row.get('route', '').strip()
        if route:
            driver_data['route'] = route

        # Status (optional, defaults to 'active')
        status = row.get('status', 'active').strip()
        if status not in ['active', 'inactive', 'suspended']:
            warnings.append(f"Invalid status '{status}', defaulting to 'active'")
            status = 'active'
        driver_data['status'] = status

        # Vehicle number (optional but recommended)
        vehicle_number = row.get('vehicle_number', '').strip()
        if vehicle_number:
            driver_data['vehicle_number'] = vehicle_number

        # Contact number (optional but recommended)
        contact_number = row.get('contact_number', '').strip()
        if contact_number:
            # Basic phone number validation
            if not contact_number.replace(' ', '').replace('-', '').replace('+', '').isdigit():
                errors.append(f"Invalid contact number format: {contact_number}")
            else:
                driver_data['contact_number'] = contact_number

        # License number (optional but recommended)
        license_number = row.get('license_number', '').strip()
        if license_number:
            driver_data['license_number'] = license_number

        # Experience years (optional)
        experience_years_str = row.get('experience_years', '').strip()
        if experience_years_str:
            try:
                experience_years = int(experience_years_str)
                if experience_years < 0 or experience_years > 50:
                    warnings.append(f"Experience years {experience_years} seems unusual")
                driver_data['experience_years'] = experience_years
            except ValueError:
                errors.append(f"Invalid experience years format: {experience_years_str}")

        # Timestamps
        current_time = int(time.time())
        driver_data['created_at'] = current_time
        driver_data['updated_at'] = current_time

        return driver_data if not errors else None, errors, warnings

    def read_csv_file(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Read and parse a CSV file, returning valid driver records."""
        logger.info(f"Reading CSV file: {file_path.name}")

        try:
            delimiter = self.detect_delimiter(file_path)

            with open(file_path, 'r', encoding='utf-8') as file:
                # Try to detect if file has headers
                sample = file.read(1024)
                file.seek(0)

                sniffer = csv.Sniffer()
                has_header = sniffer.has_header(sample)

                reader = csv.DictReader(file, delimiter=delimiter)

                if has_header:
                    headers = list(reader.fieldnames or [])
                    logger.info(f"CSV headers: {', '.join(headers)}")

                    # Validate headers
                    is_valid, header_errors = self.validate_csv_headers(headers, file_path)
                    if not is_valid:
                        return [], header_errors
                else:
                    logger.warning(f"No headers detected in {file_path.name}, assuming standard format")
                    # Create synthetic headers for files without headers
                    first_row = next(reader)
                    headers = list(self.expected_headers)[:len(first_row)]
                    reader = [first_row] + list(reader)  # Prepend the first row back

                records = []
                line_number = 1 if has_header else 0

                for row_idx, row in enumerate(reader, start=line_number):
                    line_number += 1

                    if not row or all(v is None or v == '' for v in row.values()):
                        continue  # Skip empty rows

                    driver_data, errors, warnings = self.parse_driver_record(row, file_path)

                    if errors:
                        error_msg = f"Line {line_number}: {'; '.join(errors)}"
                        logger.error(error_msg)
                        return [], [error_msg]

                    if warnings:
                        for warning in warnings:
                            logger.warning(f"Line {line_number}: {warning}")

                    if driver_data:
                        records.append(driver_data)

                logger.info(f"Successfully parsed {len(records)} records from {file_path.name}")
                return records, []

        except UnicodeDecodeError:
            error_msg = f"Encoding error reading {file_path.name}. Try saving as UTF-8."
            logger.error(error_msg)
            return [], [error_msg]
        except Exception as e:
            error_msg = f"Error reading {file_path.name}: {str(e)}"
            logger.error(error_msg)
            return [], [error_msg]

    async def sync_single_file(self, file_path: Path, db: AsyncSession) -> SyncResult:
        """Synchronize a single CSV file with the database."""
        result = SyncResult(success=False)

        try:
            logger.info(f"Starting sync for {file_path.name}")

            # Read and parse CSV file
            records, errors = self.read_csv_file(file_path)

            if errors:
                result.errors.extend(errors)
                return result

            result.total_records = len(records)

            if not records:
                logger.warning(f"No valid records found in {file_path.name}")
                result.warnings.append(f"No valid records found in {file_path.name}")
                result.success = True
                result.end_time = datetime.now()
                result.duration_seconds = (result.end_time - result.start_time).total_seconds()
                return result

            # Process records in batches
            for i in range(0, len(records), self.config.batch_size):
                batch = records[i:i + self.config.batch_size]

                # Sync batch with database
                batch_result = await self.sync_driver_batch(batch, db)

                result.success_count += batch_result.success_count
                result.error_count += batch_result.error_count
                result.errors.extend(batch_result.errors)
                result.warnings.extend(batch_result.warnings)

            result.success = result.error_count == 0
            result.end_time = datetime.now()
            result.duration_seconds = (result.end_time - result.start_time).total_seconds()

            logger.info(f"Sync completed for {file_path.name}: "
                       f"{result.success_count} success, {result.error_count} errors")

            return result

        except Exception as e:
            error_msg = f"Unexpected error during sync of {file_path.name}: {str(e)}"
            logger.error(error_msg)
            result.errors.append(error_msg)
            result.end_time = datetime.now()
            result.duration_seconds = (result.end_time - result.start_time).total_seconds()
            return result

    async def sync_driver_batch(self, batch: List[Dict[str, Any]], db: AsyncSession) -> SyncResult:
        """Synchronize a batch of driver records with the database."""
        batch_result = SyncResult(success=False)

        try:
            for record in batch:
                # Check if driver already exists
                existing_driver = await db.execute(
                    select(DBDriver).where(
                        or_(
                            DBDriver.name == record['name'],
                            and_(
                                DBDriver.vehicle_number.isnot(None),
                                DBDriver.vehicle_number == record.get('vehicle_number')
                            ),
                            and_(
                                DBDriver.license_number.isnot(None),
                                DBDriver.license_number == record.get('license_number')
                            )
                        )
                    )
                )
                existing_driver = existing_driver.scalars().first()

                if existing_driver:
                    # Update existing driver
                    for key, value in record.items():
                        if hasattr(existing_driver, key) and key in ['route', 'status', 'vehicle_number', 'contact_number', 'license_number', 'experience_years']:
                            setattr(existing_driver, key, value)
                    existing_driver.updated_at = record['updated_at']
                    batch_result.success_count += 1
                else:
                    # Create new driver
                    db_driver = DBDriver(**record)
                    db.add(db_driver)
                    batch_result.success_count += 1

            await db.commit()
            batch_result.success = True

        except Exception as e:
            await db.rollback()
            error_msg = f"Error syncing batch: {str(e)}"
            logger.error(error_msg)
            batch_result.errors.append(error_msg)

        return batch_result

    async def sync_all_files(self, db: AsyncSession) -> Dict[str, SyncResult]:
        """Synchronize all CSV files in the directory."""
        logger.info("Starting full CSV synchronization")

        csv_files = self.discover_csv_files()
        if not csv_files:
            logger.warning("No CSV files found to synchronize")
            return {}

        results = {}

        for csv_file in csv_files:
            result = await self.sync_single_file(csv_file, db)
            results[csv_file.name] = result

        # Log summary
        total_success = sum(r.success_count for r in results.values())
        total_errors = sum(r.error_count for r in results.values())

        logger.info(f"Synchronization complete: {total_success} successful, {total_errors} errors")

        return results

    def generate_sync_report(self, results: Dict[str, SyncResult]) -> Dict[str, Any]:
        """Generate a comprehensive sync report."""
        total_files = len(results)
        successful_files = sum(1 for r in results.values() if r.success)
        files_with_errors = total_files - successful_files

        total_records = sum(r.total_records for r in results.values())
        total_success = sum(r.success_count for r in results.values())
        total_errors = sum(r.error_count for r in results.values())

        all_errors = []
        all_warnings = []

        for file_name, result in results.items():
            for error in result.errors:
                all_errors.append(f"{file_name}: {error}")
            for warning in result.warnings:
                all_warnings.append(f"{file_name}: {warning}")

        return {
            "summary": {
                "total_files_processed": total_files,
                "successful_files": successful_files,
                "files_with_errors": files_with_errors,
                "total_records": total_records,
                "successful_records": total_success,
                "error_records": total_errors,
                "success_rate": (total_success / total_records * 100) if total_records > 0 else 0
            },
            "errors": all_errors,
            "warnings": all_warnings,
            "file_details": {
                file_name: {
                    "success": result.success,
                    "total_records": result.total_records,
                    "success_count": result.success_count,
                    "error_count": result.error_count,
                    "duration_seconds": result.duration_seconds
                }
                for file_name, result in results.items()
            }
        }

# Convenience functions for direct usage
async def sync_all_drivers() -> Dict[str, SyncResult]:
    """Convenience function to sync all driver CSV files."""
    syncer = CSVSyncer()
    async with get_db() as db:
        return await syncer.sync_all_files(db)

async def sync_single_driver_file(file_name: str) -> SyncResult:
    """Convenience function to sync a single driver CSV file."""
    syncer = CSVSyncer()
    file_path = syncer.csv_directory / file_name

    if not file_path.exists():
        raise FileNotFoundError(f"CSV file {file_name} not found")

    async with get_db() as db:
        return await syncer.sync_single_file(file_path, db)

def get_csv_file_info(file_name: str) -> Dict[str, Any]:
    """Get information about a CSV file without syncing."""
    syncer = CSVSyncer()
    file_path = syncer.csv_directory / file_name

    if not file_path.exists():
        return {"error": f"File {file_name} not found"}

    try:
        records, errors = syncer.read_csv_file(file_path)

        return {
            "file_name": file_name,
            "file_size": file_path.stat().st_size,
            "record_count": len(records),
            "errors": errors,
            "delimiter": syncer.detect_delimiter(file_path),
            "last_modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
        }
    except Exception as e:
        return {"error": str(e)}