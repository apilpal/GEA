#!/usr/bin/env python3
"""
CSV Driver Data Utility Script

This script provides functionality to parse, clean, and load driver data from CSV files
into the database. It supports various CSV formats with automatic delimiter detection
and data validation.

Features:
- Parse and validate driver CSV files
- Clean and normalize driver data
- Load sample driver data into database
- Support for guest user access to driver data
- Comprehensive error handling and logging

Usage:
    python csv_driver_utility.py --load-sample
    python csv_driver_utility.py --process-file path/to/drivers.csv
    python csv_driver_utility.py --load-guest-data
"""

import csv
import os
import sys
import time
import logging
import argparse
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import asyncio
import json

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.core.config.config import config
from src.core.models import DBDriver, Driver, get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import random
import string

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DriverCSVUtility:
    """Utility class for processing driver CSV data."""

    def __init__(self):
        """Initialize the CSV utility."""
        self.supported_headers = {
            'required': {'name'},
            'optional': {
                'route', 'status', 'vehicle_number', 'contact_number',
                'license_number', 'experience_years', 'notes'
            }
        }

    def detect_delimiter(self, file_path: Path) -> str:
        """Detect the delimiter used in a CSV file."""
        with open(file_path, 'r', encoding='utf-8') as file:
            sample = file.read(1024)

        delimiters = [',', ';', '\t', '|']
        delimiter_counts = {}

        for delimiter in delimiters:
            delimiter_counts[delimiter] = sample.count(delimiter)

        best_delimiter = max(delimiter_counts.items(), key=lambda x: x[1])

        if best_delimiter[1] == 0:
            return ','  # Default to comma

        return best_delimiter[0]

    def clean_driver_data(self, row: Dict[str, str]) -> Dict[str, Any]:
        """Clean and normalize driver data from CSV row."""
        cleaned_data = {}

        # Clean name (required)
        name = row.get('name', '').strip()
        if not name:
            raise ValueError("Driver name is required")
        cleaned_data['name'] = name

        # Clean route
        route = row.get('route', '').strip()
        if route:
            cleaned_data['route'] = route

        # Clean status
        status = row.get('status', 'active').strip().lower()
        if status not in ['active', 'inactive', 'suspended']:
            status = 'active'
        cleaned_data['status'] = status

        # Clean vehicle number
        vehicle_number = row.get('vehicle_number', '').strip()
        if vehicle_number:
            cleaned_data['vehicle_number'] = vehicle_number.upper()

        # Clean contact number
        contact_number = row.get('contact_number', '').strip()
        if contact_number:
            # Remove spaces, dashes, and parentheses
            contact_number = ''.join(c for c in contact_number if c.isdigit() or c == '+')
            if contact_number:
                cleaned_data['contact_number'] = contact_number

        # Clean license number
        license_number = row.get('license_number', '').strip()
        if license_number:
            cleaned_data['license_number'] = license_number.upper()

        # Clean experience years
        experience_str = row.get('experience_years', '').strip()
        if experience_str:
            try:
                experience = int(experience_str)
                if 0 <= experience <= 50:
                    cleaned_data['experience_years'] = experience
            except ValueError:
                pass

        # Add timestamps
        current_time = int(time.time())
        cleaned_data['created_at'] = current_time
        cleaned_data['updated_at'] = current_time

        return cleaned_data

    def parse_csv_file(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Parse and validate a CSV file containing driver data."""
        logger.info(f"Parsing CSV file: {file_path}")

        if not file_path.exists():
            raise FileNotFoundError(f"CSV file not found: {file_path}")

        delimiter = self.detect_delimiter(file_path)
        logger.info(f"Detected delimiter: '{delimiter}'")

        cleaned_records = []
        errors = []

        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file, delimiter=delimiter)

                for row_num, row in enumerate(reader, start=2):  # Start at 2 to account for header
                    try:
                        cleaned_record = self.clean_driver_data(row)
                        cleaned_records.append(cleaned_record)
                    except ValueError as e:
                        error_msg = f"Row {row_num}: {str(e)}"
                        logger.warning(error_msg)
                        errors.append(error_msg)
                    except Exception as e:
                        error_msg = f"Row {row_num}: Unexpected error - {str(e)}"
                        logger.error(error_msg)
                        errors.append(error_msg)

        except UnicodeDecodeError:
            error_msg = "File encoding error. Please save the CSV file as UTF-8."
            logger.error(error_msg)
            errors.append(error_msg)
        except Exception as e:
            error_msg = f"Error reading CSV file: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)

        logger.info(f"Parsed {len(cleaned_records)} valid records with {len(errors)} errors")
        return cleaned_records, errors

    async def load_sample_driver_data(self, db: AsyncSession) -> Dict[str, Any]:
        """Load sample driver data into the database."""
        logger.info("Loading sample driver data...")

        sample_drivers = [
            {
                'name': 'Rajesh Kumar',
                'route': 'Route A',
                'status': 'active',
                'vehicle_number': 'MH12AB1234',
                'contact_number': '+91-9876543210',
                'license_number': 'MH1234567890123',
                'experience_years': 8
            },
            {
                'name': 'Suresh Patel',
                'route': 'Route B',
                'status': 'active',
                'vehicle_number': 'MH12CD5678',
                'contact_number': '+91-9876543211',
                'license_number': 'MH1234567890124',
                'experience_years': 12
            },
            {
                'name': 'Amit Singh',
                'route': 'Route C',
                'status': 'active',
                'vehicle_number': 'MH12EF9012',
                'contact_number': '+91-9876543212',
                'license_number': 'MH1234567890125',
                'experience_years': 6
            },
            {
                'name': 'Vijay Sharma',
                'route': 'Route A',
                'status': 'active',
                'vehicle_number': 'MH12GH3456',
                'contact_number': '+91-9876543213',
                'license_number': 'MH1234567890126',
                'experience_years': 15
            },
            {
                'name': 'Ganesh Iyer',
                'route': 'Route B',
                'status': 'inactive',
                'vehicle_number': 'MH12IJ7890',
                'contact_number': '+91-9876543214',
                'license_number': 'MH1234567890127',
                'experience_years': 10
            }
        ]

        success_count = 0
        error_count = 0

        try:
            for driver_data in sample_drivers:
                try:
                    # Check if driver already exists
                    existing = await db.execute(
                        select(DBDriver).where(DBDriver.name == driver_data['name'])
                    )
                    if existing.scalars().first():
                        logger.info(f"Driver '{driver_data['name']}' already exists, skipping...")
                        continue

                    # Add timestamps
                    current_time = int(time.time())
                    driver_data['created_at'] = current_time
                    driver_data['updated_at'] = current_time

                    # Create driver
                    db_driver = DBDriver(**driver_data)
                    db.add(db_driver)
                    success_count += 1

                except Exception as e:
                    logger.error(f"Error creating driver '{driver_data['name']}': {str(e)}")
                    error_count += 1

            await db.commit()
            logger.info(f"Sample data loading complete: {success_count} success, {error_count} errors")

        except Exception as e:
            await db.rollback()
            logger.error(f"Transaction failed: {str(e)}")
            raise

        return {
            'success': error_count == 0,
            'success_count': success_count,
            'error_count': error_count
        }

    async def load_csv_to_database(self, file_path: Path, db: AsyncSession) -> Dict[str, Any]:
        """Load data from CSV file to database."""
        logger.info(f"Loading CSV data from {file_path} to database")

        # Parse CSV file
        records, errors = self.parse_csv_file(file_path)

        if errors and not records:
            return {
                'success': False,
                'error': 'No valid records found in CSV file',
                'errors': errors
            }

        success_count = 0
        duplicate_count = 0

        try:
            for record in records:
                try:
                    # Check for existing driver
                    existing = await db.execute(
                        select(DBDriver).where(
                            (DBDriver.name == record['name']) |
                            (DBDriver.vehicle_number == record.get('vehicle_number')) |
                            (DBDriver.license_number == record.get('license_number'))
                        )
                    )

                    if existing.scalars().first():
                        logger.info(f"Driver '{record['name']}' already exists, skipping...")
                        duplicate_count += 1
                        continue

                    # Create new driver
                    db_driver = DBDriver(**record)
                    db.add(db_driver)
                    success_count += 1

                except Exception as e:
                    logger.error(f"Error creating driver '{record.get('name', 'Unknown')}': {str(e)}")

            await db.commit()
            logger.info(f"CSV loading complete: {success_count} success, {duplicate_count} duplicates, {len(errors)} errors")

        except Exception as e:
            await db.rollback()
            logger.error(f"Transaction failed: {str(e)}")
            raise

        return {
            'success': len(errors) == 0,
            'file_path': str(file_path),
            'records_processed': len(records),
            'success_count': success_count,
            'duplicate_count': duplicate_count,
            'error_count': len(errors),
            'errors': errors
        }

async def main():
    """Main function for CLI usage."""
    parser = argparse.ArgumentParser(description='CSV Driver Data Utility')
    parser.add_argument('--load-sample', action='store_true',
                       help='Load sample driver data into database')
    parser.add_argument('--process-file', type=str,
                       help='Process and load a specific CSV file')
    parser.add_argument('--load-guest-data', action='store_true',
                       help='Load guest-accessible driver data')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    utility = DriverCSVUtility()

    async with get_db() as db:
        try:
            if args.load_sample:
                result = await utility.load_sample_driver_data(db)
                print(json.dumps(result, indent=2))

            elif args.process_file:
                file_path = Path(args.process_file)
                result = await utility.load_csv_to_database(file_path, db)
                print(json.dumps(result, indent=2))

            elif args.load_guest_data:
                # Load sample data for guest access
                result = await utility.load_sample_driver_data(db)
                print(json.dumps(result, indent=2))

            else:
                parser.print_help()

        except Exception as e:
            logger.error(f"Operation failed: {str(e)}")
            sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())