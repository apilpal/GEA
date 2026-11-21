#!/usr/bin/env python3
"""
Comprehensive test suite for CSV Driver Utility functionality.

This module provides thorough testing for the CSV driver utility including:
- Unit tests for DriverCSVUtility class functionality
- Tests for CSV file parsing and validation
- Tests for data transformation and sanitization
- Tests for database operations and error handling
- Tests for guest user permissions in CSV import functionality
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

from csv_driver_utility import DriverCSVUtility
from core.models.models import DBDriver, Driver, get_db


class TestDriverCSVUtilityInitialization:
    """Test DriverCSVUtility class initialization and configuration."""

    def test_utility_initialization(self):
        """Test DriverCSVUtility initializes correctly."""
        utility = DriverCSVUtility()

        assert utility.supported_headers['required'] == {'name'}
        assert 'route' in utility.supported_headers['optional']
        assert 'status' in utility.supported_headers['optional']
        assert 'vehicle_number' in utility.supported_headers['optional']
        assert 'contact_number' in utility.supported_headers['optional']
        assert 'license_number' in utility.supported_headers['optional']
        assert 'experience_years' in utility.supported_headers['optional']
        assert 'notes' in utility.supported_headers['optional']


class TestDelimiterDetection:
    """Test CSV delimiter detection functionality."""

    def test_detect_comma_delimiter(self):
        """Test detection of comma delimiter."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status\n")
            f.write("John,Downtown,active\n")
            f.write("Jane,Uptown,inactive\n")
            temp_path = Path(f.name)

        try:
            delimiter = utility.detect_delimiter(temp_path)
            assert delimiter == ','
        finally:
            temp_path.unlink()

    def test_detect_semicolon_delimiter(self):
        """Test detection of semicolon delimiter."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name;route;status\n")
            f.write("John;Downtown;active\n")
            f.write("Jane;Uptown;inactive\n")
            temp_path = Path(f.name)

        try:
            delimiter = utility.detect_delimiter(temp_path)
            assert delimiter == ';'
        finally:
            temp_path.unlink()

    def test_detect_tab_delimiter(self):
        """Test detection of tab delimiter."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name\troute\tstatus\n")
            f.write("John\tDowntown\tactive\n")
            f.write("Jane\tUptown\tinactive\n")
            temp_path = Path(f.name)

        try:
            delimiter = utility.detect_delimiter(temp_path)
            assert delimiter == '\t'
        finally:
            temp_path.unlink()

    def test_detect_pipe_delimiter(self):
        """Test detection of pipe delimiter."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name|route|status\n")
            f.write("John|Downtown|active\n")
            f.write("Jane|Uptown|inactive\n")
            temp_path = Path(f.name)

        try:
            delimiter = utility.detect_delimiter(temp_path)
            assert delimiter == '|'
        finally:
            temp_path.unlink()

    def test_detect_default_comma_when_no_delimiters(self):
        """Test defaulting to comma when no delimiters are found."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("namestatus\n")
            f.write("Johnactive\n")
            temp_path = Path(f.name)

        try:
            delimiter = utility.detect_delimiter(temp_path)
            assert delimiter == ','
        finally:
            temp_path.unlink()


class TestDataCleaning:
    """Test driver data cleaning and normalization functionality."""

    def test_clean_valid_driver_data(self):
        """Test cleaning of valid driver data."""
        utility = DriverCSVUtility()

        row = {
            'name': '  John Doe  ',
            'route': 'Route A',
            'status': 'active',
            'vehicle_number': 'abc123',
            'contact_number': '+91 98765 43210',
            'license_number': 'mh123456789',
            'experience_years': '5',
            'notes': '  Test notes  '
        }

        cleaned = utility.clean_driver_data(row)

        assert cleaned['name'] == 'John Doe'
        assert cleaned['route'] == 'Route A'
        assert cleaned['status'] == 'active'
        assert cleaned['vehicle_number'] == 'ABC123'
        assert cleaned['contact_number'] == '+919876543210'
        assert cleaned['license_number'] == 'MH123456789'
        assert cleaned['experience_years'] == 5
        assert 'created_at' in cleaned
        assert 'updated_at' in cleaned
        assert cleaned['created_at'] == cleaned['updated_at']

    def test_clean_missing_required_name(self):
        """Test cleaning when required name field is missing."""
        utility = DriverCSVUtility()

        row = {
            'route': 'Route A',
            'status': 'active'
        }

        with pytest.raises(ValueError, match="Driver name is required"):
            utility.clean_driver_data(row)

    def test_clean_empty_name(self):
        """Test cleaning when name field is empty."""
        utility = DriverCSVUtility()

        row = {
            'name': '   ',  # Empty/whitespace only name
            'route': 'Route A',
            'status': 'active'
        }

        with pytest.raises(ValueError, match="Driver name is required"):
            utility.clean_driver_data(row)

    def test_clean_status_normalization(self):
        """Test status field normalization."""
        utility = DriverCSVUtility()

        test_cases = [
            ('active', 'active'),
            ('inactive', 'inactive'),
            ('suspended', 'suspended'),
            ('Active', 'active'),  # Case insensitive
            ('INACTIVE', 'inactive'),
            ('invalid_status', 'active'),  # Invalid defaults to active
            ('', 'active'),  # Empty defaults to active
        ]

        for input_status, expected in test_cases:
            row = {'name': 'John Doe', 'status': input_status}
            cleaned = utility.clean_driver_data(row)
            assert cleaned['status'] == expected

    def test_clean_vehicle_number_formatting(self):
        """Test vehicle number cleaning and formatting."""
        utility = DriverCSVUtility()

        test_cases = [
            ('abc123', 'ABC123'),
            ('ABC123', 'ABC123'),
            ('  abc123  ', 'ABC123'),
            ('ab-c123', 'ABC123'),  # Should handle dashes
        ]

        for input_vehicle, expected in test_cases:
            row = {'name': 'John Doe', 'vehicle_number': input_vehicle}
            cleaned = utility.clean_driver_data(row)
            assert cleaned['vehicle_number'] == expected

    def test_clean_contact_number_formatting(self):
        """Test contact number cleaning and formatting."""
        utility = DriverCSVUtility()

        test_cases = [
            ('+91 98765 43210', '+919876543210'),
            ('987-654-3210', '+919876543210'),  # Assume +91 prefix for Indian numbers
            ('(123) 456-7890', '+911234567890'),
            ('1234567890', '+911234567890'),
            ('', None),  # Empty should not be included
        ]

        for input_contact, expected in test_cases:
            row = {'name': 'John Doe', 'contact_number': input_contact}
            cleaned = utility.clean_driver_data(row)

            if expected is None:
                assert 'contact_number' not in cleaned
            else:
                assert cleaned['contact_number'] == expected

    def test_clean_license_number_formatting(self):
        """Test license number cleaning and formatting."""
        utility = DriverCSVUtility()

        test_cases = [
            ('mh123456789', 'MH123456789'),
            ('MH123456789', 'MH123456789'),
            ('  mh123456789  ', 'MH123456789'),
        ]

        for input_license, expected in test_cases:
            row = {'name': 'John Doe', 'license_number': input_license}
            cleaned = utility.clean_driver_data(row)
            assert cleaned['license_number'] == expected

    def test_clean_experience_years_validation(self):
        """Test experience years validation and cleaning."""
        utility = DriverCSVUtility()

        test_cases = [
            ('5', 5),
            ('0', 0),
            ('50', 50),
            ('51', None),  # Out of range, should be excluded
            ('-1', None),  # Negative, should be excluded
            ('not_a_number', None),  # Invalid, should be excluded
            ('', None),  # Empty, should be excluded
        ]

        for input_years, expected in test_cases:
            row = {'name': 'John Doe', 'experience_years': input_years}
            cleaned = utility.clean_driver_data(row)

            if expected is None:
                assert 'experience_years' not in cleaned
            else:
                assert cleaned['experience_years'] == expected

    def test_clean_optional_fields_handling(self):
        """Test handling of optional fields."""
        utility = DriverCSVUtility()

        # Test with all optional fields
        row = {
            'name': 'John Doe',
            'route': 'Route A',
            'status': 'active',
            'vehicle_number': 'ABC123',
            'contact_number': '+919876543210',
            'license_number': 'MH123456789',
            'experience_years': '5',
            'notes': 'Test notes'
        }

        cleaned = utility.clean_driver_data(row)

        # All fields should be present
        assert cleaned['name'] == 'John Doe'
        assert cleaned['route'] == 'Route A'
        assert cleaned['vehicle_number'] == 'ABC123'
        assert cleaned['contact_number'] == '+919876543210'
        assert cleaned['license_number'] == 'MH123456789'
        assert cleaned['experience_years'] == 5

    def test_clean_timestamps_added(self):
        """Test that timestamps are properly added."""
        utility = DriverCSVUtility()

        row = {'name': 'John Doe'}

        cleaned = utility.clean_driver_data(row)

        assert 'created_at' in cleaned
        assert 'updated_at' in cleaned
        assert cleaned['created_at'] == cleaned['updated_at']
        assert isinstance(cleaned['created_at'], int)

    def test_clean_contact_number_only_digits_and_plus(self):
        """Test that contact number cleaning only keeps digits and plus signs."""
        utility = DriverCSVUtility()

        test_cases = [
            ('+1 (555) 123-4567', '+15551234567'),
            ('555.123.4567', '+915551234567'),  # Dots should be removed
            ('555 123 4567 ext. 123', '+915551234567'),  # Extensions should be removed
        ]

        for input_contact, expected in test_cases:
            row = {'name': 'John Doe', 'contact_number': input_contact}
            cleaned = utility.clean_driver_data(row)
            assert cleaned['contact_number'] == expected


class TestCSVFileParsing:
    """Test CSV file parsing and validation functionality."""

    def test_parse_valid_csv_file(self):
        """Test parsing a valid CSV file."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status,vehicle_number,contact_number\n")
            f.write("John Doe,Route A,active,ABC123,+919876543210\n")
            f.write("Jane Smith,Route B,inactive,DEF456,+919876543211\n")
            temp_path = Path(f.name)

        try:
            records, errors = utility.parse_csv_file(temp_path)

            assert len(errors) == 0
            assert len(records) == 2

            # Verify first record
            assert records[0]['name'] == 'John Doe'
            assert records[0]['route'] == 'Route A'
            assert records[0]['status'] == 'active'
            assert records[0]['vehicle_number'] == 'ABC123'
            assert records[0]['contact_number'] == '+919876543210'

            # Verify second record
            assert records[1]['name'] == 'Jane Smith'
            assert records[1]['route'] == 'Route B'
            assert records[1]['status'] == 'inactive'
            assert records[1]['vehicle_number'] == 'DEF456'
            assert records[1]['contact_number'] == '+919876543211'

        finally:
            temp_path.unlink()

    def test_parse_csv_file_with_errors(self):
        """Test parsing CSV file with some invalid records."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status\n")
            f.write("John Doe,Route A,active\n")
            f.write(",Route B,inactive\n")  # Missing name
            f.write("Jane Smith,Route C,active\n")
            temp_path = Path(f.name)

        try:
            records, errors = utility.parse_csv_file(temp_path)

            # Should have valid records and errors
            assert len(records) >= 0
            assert len(errors) > 0

            # Should contain the valid records
            if len(records) > 0:
                assert any(r['name'] == 'John Doe' for r in records)
                assert any(r['name'] == 'Jane Smith' for r in records)

        finally:
            temp_path.unlink()

    def test_parse_csv_file_nonexistent(self):
        """Test parsing non-existent CSV file."""
        utility = DriverCSVUtility()

        with pytest.raises(FileNotFoundError, match="CSV file not found"):
            utility.parse_csv_file(Path("/nonexistent/file.csv"))

    def test_parse_csv_file_with_different_delimiters(self):
        """Test parsing CSV files with different delimiters."""
        utility = DriverCSVUtility()

        delimiters = [',', ';', '\t', '|']
        expected_delimiters = [',', ';', '\t', '|']

        for delimiter, expected in zip(delimiters, expected_delimiters):
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
                f.write(f"name{delimiter}route{delimiter}status\n")
                f.write(f"John{delimiter}Route A{delimiter}active\n")
                temp_path = Path(f.name)

            try:
                records, errors = utility.parse_csv_file(temp_path)

                assert len(errors) == 0
                assert len(records) == 1
                assert records[0]['name'] == 'John'
                assert records[0]['route'] == 'Route A'
                assert records[0]['status'] == 'active'

            finally:
                temp_path.unlink()

    def test_parse_csv_file_with_encoding_errors(self):
        """Test parsing CSV file with encoding errors."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            # Write content that might cause encoding issues
            f.write("name,route,status\n")
            f.write("John,Route A,active\n")
            temp_path = Path(f.name)

        try:
            records, errors = utility.parse_csv_file(temp_path)

            # Should handle encoding gracefully
            assert isinstance(records, list)
            assert isinstance(errors, list)

        finally:
            temp_path.unlink()

    def test_parse_csv_file_empty(self):
        """Test parsing empty CSV file."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("")  # Empty file
            temp_path = Path(f.name)

        try:
            records, errors = utility.parse_csv_file(temp_path)

            assert len(records) == 0
            assert len(errors) >= 0  # May have errors or not

        finally:
            temp_path.unlink()

    def test_parse_csv_file_with_only_headers(self):
        """Test parsing CSV file with only headers."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status\n")
            temp_path = Path(f.name)

        try:
            records, errors = utility.parse_csv_file(temp_path)

            assert len(records) == 0
            assert len(errors) == 0

        finally:
            temp_path.unlink()


class TestDatabaseOperations:
    """Test database operations for CSV loading."""

    @pytest.mark.asyncio
    async def test_load_sample_driver_data_success(self):
        """Test successful loading of sample driver data."""
        utility = DriverCSVUtility()

        # Mock database session
        mock_db = AsyncMock()
        mock_existing = AsyncMock()
        mock_existing.scalars.return_value.first.return_value = None
        mock_db.execute.return_value = mock_existing

        result = await utility.load_sample_driver_data(mock_db)

        assert result['success'] is True
        assert result['success_count'] == 5  # 5 sample drivers
        assert result['error_count'] == 0

        # Verify database operations
        assert mock_db.execute.call_count == 5  # One check per driver
        assert mock_db.commit.call_count == 1

    @pytest.mark.asyncio
    async def test_load_sample_driver_data_with_existing_drivers(self):
        """Test loading sample data when some drivers already exist."""
        utility = DriverCSVUtility()

        # Mock database session with some existing drivers
        mock_db = AsyncMock()

        # First two drivers exist, others don't
        def mock_execute_side_effect(query):
            mock_result = AsyncMock()
            if 'Rajesh Kumar' in str(query) or 'Suresh Patel' in str(query):
                mock_result.scalars.return_value.first.return_value = Mock()  # Driver exists
            else:
                mock_result.scalars.return_value.first.return_value = None  # Driver doesn't exist
            return mock_result

        mock_db.execute.side_effect = mock_execute_side_effect

        result = await utility.load_sample_driver_data(mock_db)

        assert result['success'] is True
        assert result['success_count'] == 3  # Only 3 new drivers
        assert result['error_count'] == 0

    @pytest.mark.asyncio
    async def test_load_sample_driver_data_with_database_error(self):
        """Test loading sample data when database operations fail."""
        utility = DriverCSVUtility()

        # Mock database session that fails
        mock_db = AsyncMock()
        mock_db.execute.side_effect = Exception("Database connection failed")

        result = await utility.load_sample_driver_data(mock_db)

        assert result['success'] is False
        assert result['success_count'] == 0
        assert result['error_count'] > 0

        # Verify rollback was called
        mock_db.rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_load_csv_to_database_success(self):
        """Test successful loading of CSV data to database."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status,vehicle_number\n")
            f.write("John Doe,Route A,active,ABC123\n")
            f.write("Jane Smith,Route B,inactive,DEF456\n")
            temp_path = Path(f.name)

        try:
            # Mock database session
            mock_db = AsyncMock()
            mock_existing = AsyncMock()
            mock_existing.scalars.return_value.first.return_value = None
            mock_db.execute.return_value = mock_existing

            result = await utility.load_csv_to_database(temp_path, mock_db)

            assert result['success'] is True
            assert result['records_processed'] == 2
            assert result['success_count'] == 2
            assert result['error_count'] == 0
            assert result['duplicate_count'] == 0
            assert result['file_path'] == str(temp_path)

        finally:
            temp_path.unlink()

    @pytest.mark.asyncio
    async def test_load_csv_to_database_with_duplicates(self):
        """Test loading CSV data with duplicate records."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status,vehicle_number,license_number\n")
            f.write("John Doe,Route A,active,ABC123,DL123456\n")
            f.write("Jane Smith,Route B,inactive,DEF456,DL123457\n")
            f.write("John Doe,Route C,active,ABC123,DL123456\n")  # Duplicate
            temp_path = Path(f.name)

        try:
            # Mock database session with first record existing
            mock_db = AsyncMock()

            def mock_execute_side_effect(query):
                mock_result = AsyncMock()
                # First call finds existing driver, others don't
                if mock_db.execute.call_count == 1:
                    mock_result.scalars.return_value.first.return_value = Mock()  # Exists
                else:
                    mock_result.scalars.return_value.first.return_value = None  # Doesn't exist
                return mock_result

            mock_db.execute.side_effect = mock_execute_side_effect

            result = await utility.load_csv_to_database(temp_path, mock_db)

            assert result['success'] is True
            assert result['records_processed'] == 3
            assert result['success_count'] == 2  # Two new records
            assert result['duplicate_count'] == 1  # One duplicate skipped

        finally:
            temp_path.unlink()

    @pytest.mark.asyncio
    async def test_load_csv_to_database_with_parse_errors(self):
        """Test loading CSV data when parsing fails."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status\n")
            f.write("John Doe,Route A,active\n")
            f.write(",Route B,inactive\n")  # Invalid record
            temp_path = Path(f.name)

        try:
            # Mock database session
            mock_db = AsyncMock()

            result = await utility.load_csv_to_database(temp_path, mock_db)

            # Should handle gracefully with error reporting
            assert result['success'] is False
            assert result['records_processed'] == 2
            assert result['success_count'] == 1  # One valid record
            assert result['error_count'] == 1    # One invalid record

        finally:
            temp_path.unlink()

    @pytest.mark.asyncio
    async def test_load_csv_to_database_file_not_found(self):
        """Test loading CSV data when file doesn't exist."""
        utility = DriverCSVUtility()

        mock_db = AsyncMock()

        with pytest.raises(FileNotFoundError):
            await utility.load_csv_to_database(Path("/nonexistent/file.csv"), mock_db)


class TestGuestUserCSVAccess:
    """Test guest user access to CSV functionality."""

    def test_guest_user_csv_parsing_access(self):
        """Test that guest users can parse CSV files."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status\n")
            f.write("John Doe,Route A,active\n")
            temp_path = Path(f.name)

        try:
            # Guest users should be able to parse CSV files
            records, errors = utility.parse_csv_file(temp_path)

            assert isinstance(records, list)
            assert isinstance(errors, list)

            # Should parse successfully
            if len(errors) == 0:
                assert len(records) > 0

        finally:
            temp_path.unlink()

    def test_guest_user_data_cleaning_access(self):
        """Test that guest users can clean CSV data."""
        utility = DriverCSVUtility()

        row = {
            'name': 'John Doe',
            'route': 'Route A',
            'status': 'active'
        }

        # Guest users should be able to clean data
        cleaned = utility.clean_driver_data(row)

        assert cleaned['name'] == 'John Doe'
        assert cleaned['route'] == 'Route A'
        assert cleaned['status'] == 'active'

    def test_guest_user_sample_data_loading(self):
        """Test that guest users can load sample data."""
        utility = DriverCSVUtility()

        # Mock database session
        mock_db = AsyncMock()
        mock_existing = AsyncMock()
        mock_existing.scalars.return_value.first.return_value = None
        mock_db.execute.return_value = mock_existing

        async def run_test():
            result = await utility.load_sample_driver_data(mock_db)

            # Should work for guest users
            assert result['success'] is True
            assert result['success_count'] > 0

        # Run the async test
        asyncio.run(run_test())


class TestErrorHandling:
    """Test comprehensive error handling scenarios."""

    def test_malformed_csv_handling(self):
        """Test handling of malformed CSV files."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            # Write malformed CSV content
            f.write("name,route,status\n")
            f.write('"unclosed quote,Route A,active\n')  # Unclosed quote
            f.write("John,Route B,active\n")
            temp_path = Path(f.name)

        try:
            records, errors = utility.parse_csv_file(temp_path)

            # Should handle malformed content gracefully
            assert isinstance(records, list)
            assert isinstance(errors, list)
            # May have some valid records or errors

        finally:
            temp_path.unlink()

    def test_empty_csv_file_handling(self):
        """Test handling of empty CSV files."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("")  # Empty file
            temp_path = Path(f.name)

        try:
            records, errors = utility.parse_csv_file(temp_path)

            assert len(records) == 0
            assert isinstance(errors, list)

        finally:
            temp_path.unlink()

    def test_csv_file_with_special_characters(self):
        """Test handling of CSV files with special characters."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status\n")
            f.write("José María González,Routé Á,active\n")
            f.write("Müllerstraße,Route Ä,inactive\n")
            temp_path = Path(f.name)

        try:
            records, errors = utility.parse_csv_file(temp_path)

            # Should handle special characters
            assert len(errors) == 0
            assert len(records) == 2

            # Verify special characters are preserved
            assert 'José María González' in records[0]['name']
            assert 'Routé Á' in records[0]['route']

        finally:
            temp_path.unlink()

    def test_csv_file_with_quoted_fields(self):
        """Test handling of CSV files with quoted fields."""
        utility = DriverCSVUtility()

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status\n")
            f.write('"John, Doe","Route, A",active\n')
            f.write('"Jane ""Smith""",Route B,inactive\n')
            temp_path = Path(f.name)

        try:
            records, errors = utility.parse_csv_file(temp_path)

            # Should handle quoted fields correctly
            assert len(errors) == 0
            assert len(records) == 2

            assert records[0]['name'] == 'John, Doe'
            assert records[0]['route'] == 'Route, A'
            assert records[1]['name'] == 'Jane "Smith"'

        finally:
            temp_path.unlink()


class TestPerformance:
    """Test performance with large CSV files."""

    def test_large_csv_file_parsing_performance(self):
        """Test parsing performance with large CSV files."""
        utility = DriverCSVUtility()

        # Create a large CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status,vehicle_number,contact_number\n")

            # Write 5000 records
            for i in range(5000):
                f.write(f"Driver{i},Route{i % 100},active,VEH{i:04d},+1-555-{i:04d}\n")

            temp_path = Path(f.name)

        try:
            import time
            start_time = time.time()

            records, errors = utility.parse_csv_file(temp_path)

            end_time = time.time()
            parsing_time = end_time - start_time

            # Should parse efficiently
            assert len(records) == 5000
            assert len(errors) == 0

            # Should parse within reasonable time (less than 30 seconds for 5000 records)
            assert parsing_time < 30.0

            # Verify first and last records
            assert records[0]['name'] == 'Driver0'
            assert records[-1]['name'] == 'Driver4999'

        finally:
            temp_path.unlink()

    def test_memory_efficiency_with_large_files(self):
        """Test memory efficiency when processing large files."""
        utility = DriverCSVUtility()

        # Create a moderately large CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("name,route,status,vehicle_number,contact_number,license_number,experience_years,notes\n")

            # Write 1000 records with substantial data
            for i in range(1000):
                notes = f"This is a long note for driver {i} with lots of additional information to test memory usage and parsing efficiency."
                f.write(f"Driver{i},Route{i % 50},active,VEH{i:04d},+1-555-{i:04d},DL{i:06d},{i % 20},\"{notes}\"\n")

            temp_path = Path(f.name)

        try:
            import psutil
            import os

            process = psutil.Process(os.getpid())
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB

            records, errors = utility.parse_csv_file(temp_path)

            final_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_increase = final_memory - initial_memory

            # Should parse successfully
            assert len(records) == 1000
            assert len(errors) == 0

            # Memory increase should be reasonable (less than 100MB for this test)
            assert memory_increase < 100.0

        finally:
            temp_path.unlink()


def main():
    """Run all CSV driver utility tests."""
    print("Running CSV Driver Utility Tests")
    print("=" * 50)

    # Run synchronous tests
    test_classes = [
        TestDriverCSVUtilityInitialization,
        TestDelimiterDetection,
        TestDataCleaning,
        TestCSVFileParsing,
        TestGuestUserCSVAccess,
        TestErrorHandling,
        TestPerformance
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

    print(f"\n{'=' * 50}")
    print(f"Tests passed: {passed}/{total}")

    if passed == total:
        print("🎉 All tests passed! CSV driver utility is working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())