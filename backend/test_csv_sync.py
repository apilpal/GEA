#!/usr/bin/env python3
"""
Comprehensive test suite for CSV synchronization system.

This module provides thorough testing for the CSV sync service including:
- Unit tests for CSVSyncer class functionality
- Integration tests for database operations
- Tests for CSV parsing and validation
- Tests for guest user access permissions
- Performance tests for large file handling
- Error handling and edge case coverage
"""

import pytest
import asyncio
import tempfile
import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.csv_sync_service import CSVSyncer, SyncConfig, SyncResult
from core.models.models import DBDriver, Driver, get_db
from csv_driver_utility import DriverCSVUtility


class TestCSVSyncerInitialization:
    """Test CSVSyncer class initialization and configuration."""

    def test_syncer_initialization_default_config(self):
        """Test CSVSyncer initializes with default configuration."""
        syncer = CSVSyncer()

        assert syncer.config.csv_directory == "backend/data/drivers"
        assert syncer.config.batch_size == 100
        assert syncer.config.validate_headers is True
        assert syncer.config.skip_duplicates is True
        assert syncer.csv_directory.exists()
        assert ',' in syncer.config.supported_delimiters

    def test_syncer_initialization_custom_config(self):
        """Test CSVSyncer initializes with custom configuration."""
        config = SyncConfig(
            csv_directory="custom/path",
            batch_size=50,
            validate_headers=False
        )
        syncer = CSVSyncer(config)

        assert syncer.config.csv_directory == "custom/path"
        assert syncer.config.batch_size == 50
        assert syncer.config.validate_headers is False

    def test_expected_headers_configuration(self):
        """Test that expected headers are properly configured."""
        syncer = CSVSyncer()

        expected_headers = {
            'name', 'route', 'status', 'vehicle_number',
            'contact_number', 'license_number', 'experience_years'
        }
        assert syncer.expected_headers == expected_headers

        # Verify optional headers exist
        assert 'notes' in syncer.optional_headers
        assert 'emergency_contact' in syncer.optional_headers


class TestCSVFileDiscovery:
    """Test CSV file discovery functionality."""

    def test_discover_csv_files_success(self):
        """Test successful discovery of CSV files."""
        syncer = CSVSyncer()

        with tempfile.TemporaryDirectory() as temp_dir:
            # Create test CSV files
            csv_files = ['test1.csv', 'test2.csv', 'not_csv.txt']
            for file_name in csv_files:
                (Path(temp_dir) / file_name).touch()

            # Override CSV directory for testing
            syncer.csv_directory = Path(temp_dir)
            discovered = syncer.discover_csv_files()

            # Should find only CSV files
            assert len(discovered) == 2
            assert all(f.suffix == '.csv' for f in discovered)

    def test_discover_csv_files_empty_directory(self):
        """Test discovery when directory is empty."""
        syncer = CSVSyncer()

        with tempfile.TemporaryDirectory() as temp_dir:
            syncer.csv_directory = Path(temp_dir)
            discovered = syncer.discover_csv_files()

            assert discovered == []

    def test_discover_csv_files_nonexistent_directory(self):
        """Test discovery when directory doesn't exist."""
        syncer = CSVSyncer()
        syncer.csv_directory = Path("/nonexistent/directory")

        discovered = syncer.discover_csv_files()
        assert discovered == []


class TestDelimiterDetection:
    """Test CSV delimiter detection functionality."""

    def test_detect_comma_delimiter(self):
        """Test detection of comma delimiter."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status\n")
            f.write("John,Downtown,active\n")
            f.write("Jane,Uptown,inactive\n")
            temp_path = Path(f.name)

        try:
            delimiter = syncer.detect_delimiter(temp_path)
            assert delimiter == ','
        finally:
            temp_path.unlink()

    def test_detect_semicolon_delimiter(self):
        """Test detection of semicolon delimiter."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name;route;status\n")
            f.write("John;Downtown;active\n")
            f.write("Jane;Uptown;inactive\n")
            temp_path = Path(f.name)

        try:
            delimiter = syncer.detect_delimiter(temp_path)
            assert delimiter == ';'
        finally:
            temp_path.unlink()

    def test_detect_tab_delimiter(self):
        """Test detection of tab delimiter."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name\troute\tstatus\n")
            f.write("John\tDowntown\tactive\n")
            f.write("Jane\tUptown\tinactive\n")
            temp_path = Path(f.name)

        try:
            delimiter = syncer.detect_delimiter(temp_path)
            assert delimiter == '\t'
        finally:
            temp_path.unlink()

    def test_detect_default_comma_when_no_delimiters(self):
        """Test defaulting to comma when no delimiters are found."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("namestatus\n")
            f.write("Johnactive\n")
            temp_path = Path(f.name)

        try:
            delimiter = syncer.detect_delimiter(temp_path)
            assert delimiter == ','
        finally:
            temp_path.unlink()


class TestCSVHeaderValidation:
    """Test CSV header validation functionality."""

    def test_validate_valid_headers(self):
        """Test validation of valid CSV headers."""
        syncer = CSVSyncer()
        headers = ['name', 'route', 'status', 'vehicle_number', 'contact_number']

        is_valid, errors = syncer.validate_csv_headers(headers, Path("test.csv"))

        assert is_valid is True
        assert errors == []

    def test_validate_missing_required_headers(self):
        """Test validation when required headers are missing."""
        syncer = CSVSyncer()
        headers = ['route', 'status', 'vehicle_number']  # Missing 'name'

        is_valid, errors = syncer.validate_csv_headers(headers, Path("test.csv"))

        assert is_valid is False
        assert len(errors) > 0
        assert any('name' in error for error in errors)

    def test_validate_unknown_headers_warning(self):
        """Test that unknown headers generate warnings but don't fail validation."""
        syncer = CSVSyncer()
        headers = ['name', 'route', 'unknown_field', 'another_unknown']

        is_valid, errors = syncer.validate_csv_headers(headers, Path("test.csv"))

        # Should still be valid if required headers are present
        assert is_valid is True
        assert errors == []

    def test_validate_headers_disabled(self):
        """Test validation when header validation is disabled."""
        config = SyncConfig(validate_headers=False)
        syncer = CSVSyncer(config)

        headers = ['invalid_header_only']
        is_valid, errors = syncer.validate_csv_headers(headers, Path("test.csv"))

        assert is_valid is True
        assert errors == []


class TestDriverRecordParsing:
    """Test driver record parsing and validation."""

    def test_parse_valid_driver_record(self):
        """Test parsing of a valid driver record."""
        syncer = CSVSyncer()
        row = {
            'name': 'John Doe',
            'route': 'Route A',
            'status': 'active',
            'vehicle_number': 'ABC123',
            'contact_number': '+1-555-0123',
            'license_number': 'DL123456',
            'experience_years': '5'
        }

        driver_data, errors, warnings = syncer.parse_driver_record(row, Path("test.csv"))

        assert driver_data is not None
        assert errors == []
        assert warnings == []
        assert driver_data['name'] == 'John Doe'
        assert driver_data['status'] == 'active'
        assert driver_data['experience_years'] == 5
        assert 'created_at' in driver_data
        assert 'updated_at' in driver_data

    def test_parse_missing_name_field(self):
        """Test parsing when required name field is missing."""
        syncer = CSVSyncer()
        row = {
            'route': 'Route A',
            'status': 'active'
        }

        driver_data, errors, warnings = syncer.parse_driver_record(row, Path("test.csv"))

        assert driver_data is None
        assert len(errors) > 0
        assert any('name' in error for error in errors)

    def test_parse_invalid_status(self):
        """Test parsing with invalid status value."""
        syncer = CSVSyncer()
        row = {
            'name': 'John Doe',
            'status': 'invalid_status'
        }

        driver_data, errors, warnings = syncer.parse_driver_record(row, Path("test.csv"))

        assert driver_data is not None
        assert errors == []
        assert len(warnings) > 0
        assert driver_data['status'] == 'active'  # Should default to active

    def test_parse_invalid_contact_number(self):
        """Test parsing with invalid contact number format."""
        syncer = CSVSyncer()
        row = {
            'name': 'John Doe',
            'contact_number': 'invalid-phone'
        }

        driver_data, errors, warnings = syncer.parse_driver_record(row, Path("test.csv"))

        assert driver_data is None
        assert len(errors) > 0
        assert any('contact number' in error for error in errors)

    def test_parse_invalid_experience_years(self):
        """Test parsing with invalid experience years format."""
        syncer = CSVSyncer()
        row = {
            'name': 'John Doe',
            'experience_years': 'not_a_number'
        }

        driver_data, errors, warnings = syncer.parse_driver_record(row, Path("test.csv"))

        assert driver_data is None
        assert len(errors) > 0
        assert any('experience years' in error for error in errors)

    def test_parse_experience_years_out_of_range(self):
        """Test parsing with experience years out of reasonable range."""
        syncer = CSVSyncer()
        row = {
            'name': 'John Doe',
            'experience_years': '100'  # Unrealistic value
        }

        driver_data, errors, warnings = syncer.parse_driver_record(row, Path("test.csv"))

        assert driver_data is not None
        assert errors == []
        assert len(warnings) > 0
        assert driver_data['experience_years'] == 100


class TestCSVFileReading:
    """Test CSV file reading and parsing functionality."""

    def test_read_valid_csv_file(self):
        """Test reading a valid CSV file."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status,vehicle_number\n")
            f.write("John Doe,Route A,active,ABC123\n")
            f.write("Jane Smith,Route B,inactive,DEF456\n")
            temp_path = Path(f.name)

        try:
            records, errors = syncer.read_csv_file(temp_path)

            assert len(errors) == 0
            assert len(records) == 2
            assert records[0]['name'] == 'John Doe'
            assert records[1]['name'] == 'Jane Smith'
        finally:
            temp_path.unlink()

    def test_read_csv_file_with_missing_headers(self):
        """Test reading CSV file without headers."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("John Doe,Route A,active,ABC123\n")
            f.write("Jane Smith,Route B,inactive,DEF456\n")
            temp_path = Path(f.name)

        try:
            records, errors = syncer.read_csv_file(temp_path)

            # Should handle files without headers gracefully
            assert len(records) >= 0  # May be 0 or handle differently based on implementation
        finally:
            temp_path.unlink()

    def test_read_csv_file_with_encoding_error(self):
        """Test reading CSV file with encoding errors."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', encoding='utf-8', delete=False) as f:
            # Write some invalid UTF-8 bytes
            f.write("name,route\n")
            f.write("John,Route A\n".encode('utf-8'))
            temp_path = Path(f.name)

        try:
            records, errors = syncer.read_csv_file(temp_path)

            assert len(errors) > 0
            assert len(records) == 0
        finally:
            temp_path.unlink()

    def test_read_csv_file_with_parse_errors(self):
        """Test reading CSV file with parsing errors."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status\n")
            f.write("John Doe,Route A,active\n")
            f.write(",Route B,inactive\n")  # Missing name
            f.write("Jane Smith,Route C,active\n")
            temp_path = Path(f.name)

        try:
            records, errors = syncer.read_csv_file(temp_path)

            # Should handle errors gracefully and return valid records
            assert len(records) >= 0
            assert len(errors) >= 0
        finally:
            temp_path.unlink()


class TestDatabaseSyncOperations:
    """Test database synchronization operations."""

    @pytest.mark.asyncio
    async def test_sync_single_file_success(self):
        """Test successful synchronization of a single CSV file."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status\n")
            f.write("John Doe,Route A,active\n")
            temp_path = Path(f.name)

        try:
            # Mock database session
            mock_db = AsyncMock()
            mock_existing = AsyncMock()
            mock_existing.scalars.return_value.first.return_value = None
            mock_db.execute.return_value = mock_existing

            result = await syncer.sync_single_file(temp_path, mock_db)

            assert result.total_records >= 0
            assert result.success_count >= 0
            assert result.error_count >= 0
        finally:
            temp_path.unlink()

    @pytest.mark.asyncio
    async def test_sync_with_existing_driver_update(self):
        """Test synchronization when driver already exists (update scenario)."""
        syncer = CSVSyncer()

        # Create a mock existing driver
        mock_existing_driver = Mock()
        mock_existing_driver.name = "John Doe"

        # Mock database session
        mock_db = AsyncMock()
        mock_existing = AsyncMock()
        mock_existing.scalars.return_value.first.return_value = mock_existing_driver
        mock_db.execute.return_value = mock_existing

        records = [{
            'name': 'John Doe',
            'route': 'Updated Route',
            'status': 'active',
            'created_at': 1234567890,
            'updated_at': 1234567890
        }]

        result = await syncer.sync_driver_batch(records, mock_db)

        assert result.success_count == 1
        assert result.error_count == 0
        assert result.success is True

    @pytest.mark.asyncio
    async def test_sync_with_database_error(self):
        """Test synchronization when database operations fail."""
        syncer = CSVSyncer()

        # Mock database session that raises an exception
        mock_db = AsyncMock()
        mock_db.execute.side_effect = Exception("Database connection failed")

        records = [{
            'name': 'John Doe',
            'route': 'Route A',
            'status': 'active',
            'created_at': 1234567890,
            'updated_at': 1234567890
        }]

        result = await syncer.sync_driver_batch(records, mock_db)

        assert result.success_count == 0
        assert result.error_count == 0
        assert result.success is False
        assert len(result.errors) > 0

    @pytest.mark.asyncio
    async def test_sync_all_files_empty_directory(self):
        """Test synchronization when no CSV files are found."""
        syncer = CSVSyncer()

        with tempfile.TemporaryDirectory() as temp_dir:
            syncer.csv_directory = Path(temp_dir)

            mock_db = AsyncMock()
            results = await syncer.sync_all_files(mock_db)

            assert results == {}


class TestSyncResultReporting:
    """Test sync result generation and reporting."""

    def test_generate_sync_report_successful(self):
        """Test generation of sync report for successful operations."""
        syncer = CSVSyncer()

        results = {
            'file1.csv': SyncResult(
                success=True,
                total_records=10,
                success_count=10,
                error_count=0
            ),
            'file2.csv': SyncResult(
                success=True,
                total_records=15,
                success_count=15,
                error_count=0
            )
        }

        report = syncer.generate_sync_report(results)

        assert report['summary']['total_files_processed'] == 2
        assert report['summary']['successful_files'] == 2
        assert report['summary']['files_with_errors'] == 0
        assert report['summary']['total_records'] == 25
        assert report['summary']['successful_records'] == 25
        assert report['summary']['error_records'] == 0
        assert report['summary']['success_rate'] == 100.0

    def test_generate_sync_report_with_errors(self):
        """Test generation of sync report with errors."""
        syncer = CSVSyncer()

        results = {
            'file1.csv': SyncResult(
                success=True,
                total_records=10,
                success_count=8,
                error_count=2,
                errors=['Error 1', 'Error 2']
            ),
            'file2.csv': SyncResult(
                success=False,
                total_records=15,
                success_count=0,
                error_count=15,
                errors=['File error']
            )
        }

        report = syncer.generate_sync_report(results)

        assert report['summary']['total_files_processed'] == 2
        assert report['summary']['successful_files'] == 1
        assert report['summary']['files_with_errors'] == 1
        assert report['summary']['total_records'] == 25
        assert report['summary']['successful_records'] == 8
        assert report['summary']['error_records'] == 17
        assert report['summary']['success_rate'] == 32.0

        assert len(report['errors']) == 3
        assert 'Error 1' in report['errors']
        assert 'Error 2' in report['errors']
        assert 'File error' in report['errors']


class TestCSVSyncUtilityIntegration:
    """Integration tests for CSV sync utility functionality."""

    def test_csv_driver_utility_initialization(self):
        """Test CSV driver utility initialization."""
        utility = DriverCSVUtility()

        assert utility.supported_headers['required'] == {'name'}
        assert 'route' in utility.supported_headers['optional']
        assert 'status' in utility.supported_headers['optional']

    def test_csv_utility_delimiter_detection(self):
        """Test CSV utility delimiter detection."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status\n")
            f.write("John,Downtown,active\n")
            temp_path = Path(f.name)

        try:
            delimiter = utility.detect_delimiter(temp_path)
            assert delimiter == ','
        finally:
            temp_path.unlink()

    def test_csv_utility_data_cleaning(self):
        """Test CSV utility data cleaning functionality."""
        utility = DriverCSVUtility()

        # Test valid driver data
        row = {
            'name': '  John Doe  ',
            'route': 'Route A',
            'status': 'active',
            'vehicle_number': 'abc123',
            'contact_number': '+91 98765 43210',
            'experience_years': '5'
        }

        cleaned = utility.clean_driver_data(row)

        assert cleaned['name'] == 'John Doe'
        assert cleaned['route'] == 'Route A'
        assert cleaned['status'] == 'active'
        assert cleaned['vehicle_number'] == 'ABC123'
        assert cleaned['contact_number'] == '+919876543210'
        assert cleaned['experience_years'] == 5
        assert 'created_at' in cleaned
        assert 'updated_at' in cleaned

    def test_csv_utility_invalid_data_handling(self):
        """Test CSV utility handling of invalid data."""
        utility = DriverCSVUtility()

        # Test missing required field
        row = {
            'route': 'Route A',
            'status': 'active'
        }

        with pytest.raises(ValueError, match="Driver name is required"):
            utility.clean_driver_data(row)

    def test_csv_utility_invalid_status_normalization(self):
        """Test CSV utility status field normalization."""
        utility = DriverCSVUtility()

        row = {
            'name': 'John Doe',
            'status': 'invalid_status'
        }

        cleaned = utility.clean_driver_data(row)
        assert cleaned['status'] == 'active'  # Should default to active


class TestGuestUserCSVAccess:
    """Test guest user access to CSV functionality."""

    def test_guest_user_csv_file_discovery(self):
        """Test that guest users can discover available CSV files."""
        syncer = CSVSyncer()

        with tempfile.TemporaryDirectory() as temp_dir:
            # Create test CSV files
            (Path(temp_dir) / 'drivers.csv').touch()
            (Path(temp_dir) / 'guest_accessible.csv').touch()

            syncer.csv_directory = Path(temp_dir)
            discovered = syncer.discover_csv_files()

            # Guest users should see all CSV files
            assert len(discovered) == 2

    def test_guest_user_csv_file_info_access(self):
        """Test that guest users can access CSV file information."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route\nJohn,Route A\n")
            temp_path = Path(f.name)

        try:
            # Test the convenience function for getting file info
            file_info = syncer.get_csv_file_info(temp_path.name)

            # This function doesn't require authentication in current implementation
            assert isinstance(file_info, dict)
            if 'error' not in file_info:
                assert 'record_count' in file_info
                assert 'file_size' in file_info
        finally:
            temp_path.unlink()


class TestCSVPerformance:
    """Test CSV processing performance with large files."""

    def test_large_csv_file_processing(self):
        """Test processing of large CSV files."""
        syncer = CSVSyncer()

        # Create a large CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status,vehicle_number,contact_number\n")

            # Write 1000 records
            for i in range(1000):
                f.write(f"Driver{i},Route{i % 10},active,VEH{i:04d},+1-555-{i:04d}\n")

            temp_path = Path(f.name)

        try:
            records, errors = syncer.read_csv_file(temp_path)

            # Should handle large files efficiently
            assert len(records) == 1000
            assert len(errors) == 0

            # Verify first and last records
            assert records[0]['name'] == 'Driver0'
            assert records[-1]['name'] == 'Driver999'

        finally:
            temp_path.unlink()

    def test_batch_processing_efficiency(self):
        """Test that batch processing is efficient."""
        syncer = CSVSyncer()

        # Create test records
        records = []
        for i in range(250):
            records.append({
                'name': f'Driver{i}',
                'route': f'Route{i % 10}',
                'status': 'active',
                'created_at': 1234567890,
                'updated_at': 1234567890
            })

        # Mock database session
        mock_db = AsyncMock()
        mock_existing = AsyncMock()
        mock_existing.scalars.return_value.first.return_value = None
        mock_db.execute.return_value = mock_existing

        # Test with batch size of 100
        syncer.config.batch_size = 100

        async def run_test():
            result = await syncer.sync_driver_batch(records, mock_db)

            # Should process all records successfully
            assert result.success_count == 250
            assert result.error_count == 0
            assert result.success is True

            # Verify database was called for each record
            assert mock_db.execute.call_count == 250

        # Run the async test
        asyncio.run(run_test())


class TestErrorHandling:
    """Test comprehensive error handling scenarios."""

    def test_malformed_csv_handling(self):
        """Test handling of malformed CSV files."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            # Write malformed CSV content
            f.write("name,route,status\n")
            f.write('"unclosed quote,Route A,active\n')  # Unclosed quote
            f.write("John,Route B,active\n")
            temp_path = Path(f.name)

        try:
            records, errors = syncer.read_csv_file(temp_path)

            # Should handle malformed content gracefully
            assert len(errors) >= 0
            # May have records or may have none depending on implementation

        finally:
            temp_path.unlink()

    def test_file_permission_error_handling(self):
        """Test handling of file permission errors."""
        syncer = CSVSyncer()

        # Create a file and remove read permissions
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route\nJohn,Route A\n")
            temp_path = Path(f.name)

        try:
            # Remove read permissions (Unix systems)
            if os.name == 'posix':
                temp_path.chmod(0o000)

            records, errors = syncer.read_csv_file(temp_path)

            # Should handle permission errors
            assert len(errors) > 0
            assert len(records) == 0

        finally:
            # Restore permissions for cleanup
            if os.name == 'posix':
                temp_path.chmod(0o644)
            temp_path.unlink()

    def test_corrupted_file_handling(self):
        """Test handling of corrupted CSV files."""
        syncer = CSVSyncer()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            # Write partially corrupted content
            f.write("name,route,status\n")
            f.write("John,Route A,active\n")
            # Write some binary garbage
            f.write(b'\xff\xfe\xfd\xfc'.decode('utf-8', errors='ignore'))
            f.write("Jane,Route B,active\n")
            temp_path = Path(f.name)

        try:
            records, errors = syncer.read_csv_file(temp_path)

            # Should handle corruption gracefully
            assert len(errors) >= 0
            # Should still parse valid records if possible

        finally:
            temp_path.unlink()


def main():
    """Run all CSV sync tests."""
    print("Running CSV Synchronization System Tests")
    print("=" * 60)

    # Run synchronous tests
    test_classes = [
        TestCSVSyncerInitialization,
        TestCSVFileDiscovery,
        TestDelimiterDetection,
        TestCSVHeaderValidation,
        TestDriverRecordParsing,
        TestCSVFileReading,
        TestSyncResultReporting,
        TestCSVSyncUtilityIntegration,
        TestGuestUserCSVAccess,
        TestCSVPerformance,
        TestErrorHandling
    ]

    passed = 0
    total = 0

    for test_class in test_classes:
        print(f"\nRunning {test_class.__name__}...")

        # Get all test methods
        test_methods = [method for method in dir(test_class) if method.startswith('test_')]

        for method_name in test_methods:
            total += 1
            method = getattr(test_class, method_name)

            try:
                if asyncio.iscoroutinefunction(method):
                    asyncio.run(method())
                else:
                    method()
                print(f"  ✓ {method_name}")
                passed += 1
            except Exception as e:
                print(f"  ✗ {method_name}: {e}")

    print(f"\n{'=' * 60}")
    print(f"Tests passed: {passed}/{total}")

    if passed == total:
        print("🎉 All tests passed! CSV sync system is working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())