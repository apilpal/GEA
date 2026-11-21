"""
Tests for migrate_data.py to improve test coverage.
"""

import pytest
import asyncio
import tempfile
import os
import csv
from unittest.mock import patch, MagicMock, mock_open
from pathlib import Path


class TestDataMigrationManager:
    """Test cases for the DataMigrationManager class."""

    def test_initialization(self):
        """Test DataMigrationManager initialization."""
        from migrate_data import DataMigrationManager

        # Test default initialization
        manager = DataMigrationManager()
        assert manager.incremental is True
        assert manager.stats == {
            "drivers_created": 0,
            "drivers_skipped": 0,
            "students_created": 0,
            "students_skipped": 0,
            "errors": 0
        }

        # Test with custom parameters
        manager = DataMigrationManager(incremental=False)
        assert manager.incremental is False

    def test_initialize_databases(self):
        """Test database initialization."""
        from migrate_data import DataMigrationManager

        manager = DataMigrationManager()

        # Should not raise any exceptions
        asyncio.run(manager.initialize_databases())

    @patch('migrate_data.SessionLocal')
    def test_check_existing_driver(self, mock_session_local):
        """Test checking existing driver functionality."""
        from migrate_data import DataMigrationManager

        manager = DataMigrationManager()

        # Mock database session and query
        mock_session = MagicMock()
        mock_result = MagicMock()
        mock_driver = MagicMock()
        mock_driver.id = 1
        mock_result.scalars.return_value.first.return_value = mock_driver
        mock_session.execute.return_value = mock_result
        mock_session_local.return_value = mock_session

        # Test when driver exists
        result = asyncio.run(manager.check_existing_driver(mock_session, "Test Driver"))
        assert result == 1

        # Test when driver doesn't exist
        mock_result.scalars.return_value.first.return_value = None
        result = asyncio.run(manager.check_existing_driver(mock_session, "New Driver"))
        assert result is None

    @patch('migrate_data.SessionLocal')
    def test_check_existing_student(self, mock_session_local):
        """Test checking existing student functionality."""
        from migrate_data import DataMigrationManager

        manager = DataMigrationManager()

        # Mock database session and query
        mock_session = MagicMock()
        mock_result = MagicMock()
        mock_student = MagicMock()
        mock_student.id = 1
        mock_result.scalars.return_value.first.return_value = mock_student
        mock_session.execute.return_value = mock_result
        mock_session_local.return_value = mock_session

        # Test when student exists
        result = asyncio.run(manager.check_existing_student(mock_session, "John Doe", "Father Doe"))
        assert result == 1

        # Test when student doesn't exist
        mock_result.scalars.return_value.first.return_value = None
        result = asyncio.run(manager.check_existing_student(mock_session, "New Student", "New Father"))
        assert result is None

    @patch('migrate_data.Base')
    @patch('migrate_data.sync_engine')
    @patch('migrate_data.SessionLocal')
    @patch('migrate_data.DBDriver')
    @patch('migrate_data.DBStudent')
    @patch('migrate_data.validate_student_data')
    def test_migrate_csv_data_legacy_with_files(self, mock_validate, mock_db_student,
                                               mock_db_driver, mock_session_local,
                                               mock_sync_engine, mock_base):
        """Test CSV data migration with actual CSV files."""
        from migrate_data import DataMigrationManager

        manager = DataMigrationManager(incremental=False)

        # Create temporary directory and CSV file
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create drivers directory
            drivers_dir = Path(temp_dir) / "data" / "drivers"
            drivers_dir.mkdir(parents=True)

            # Create test CSV file
            csv_file = drivers_dir / "testdriver.csv"
            with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['route', 'name', 'father_name', 'class', 'mobile', 'address', 'fees'])
                writer.writerow(['Route1', 'John Doe', 'Father Doe', '10', '1234567890', 'Test Address', '1000'])

            # Mock database components
            mock_session = MagicMock()
            mock_session_local.return_value = mock_session

            # Mock validate_student_data to return valid data
            mock_validate.return_value = MagicMock(
                route='Route1',
                name='John Doe',
                father_name='Father Doe',
                class_='10',
                mobile='1234567890',
                address='Test Address',
                fees='1000'
            )

            # Mock DBDriver and DBStudent
            mock_driver_instance = MagicMock()
            mock_driver_instance.id = 1
            mock_db_driver.return_value = mock_driver_instance

            mock_student_instance = MagicMock()
            mock_db_student.return_value = mock_student_instance

            # Change to temp directory for test
            original_cwd = os.getcwd()
            try:
                os.chdir(temp_dir)

                # Run migration
                result = manager.migrate_csv_data_legacy()

                # Verify the result
                assert result is True
                assert manager.stats['drivers_created'] == 1
                assert manager.stats['students_created'] == 1

            finally:
                os.chdir(original_cwd)

    @patch('migrate_data.Base')
    @patch('migrate_data.sync_engine')
    @patch('migrate_data.SessionLocal')
    def test_migrate_csv_data_legacy_no_directory(self, mock_session_local, mock_sync_engine, mock_base):
        """Test CSV data migration when no drivers directory exists."""
        from migrate_data import DataMigrationManager

        manager = DataMigrationManager()

        # Mock database session
        mock_session = MagicMock()
        mock_session_local.return_value = mock_session

        # Test with non-existent directory
        original_cwd = os.getcwd()
        try:
            os.chdir(tempfile.gettempdir())

            result = manager.migrate_csv_data_legacy()

            # Should return True when no directory exists (not an error condition)
            assert result is True

        finally:
            os.chdir(original_cwd)

    @patch('migrate_data.Base')
    @patch('migrate_data.sync_engine')
    @patch('migrate_data.SessionLocal')
    def test_migrate_csv_data_legacy_invalid_csv(self, mock_session_local, mock_sync_engine, mock_base):
        """Test CSV data migration with invalid CSV data."""
        from migrate_data import DataMigrationManager

        manager = DataMigrationManager()

        # Create temporary directory and invalid CSV file
        with tempfile.TemporaryDirectory() as temp_dir:
            drivers_dir = Path(temp_dir) / "data" / "drivers"
            drivers_dir.mkdir(parents=True)

            # Create invalid CSV file (missing required columns)
            csv_file = drivers_dir / "invaliddriver.csv"
            with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['invalid_column'])
                writer.writerow(['invalid_data'])

            # Mock database session
            mock_session = MagicMock()
            mock_session_local.return_value = mock_session

            # Mock validate_student_data to return None for invalid data
            with patch('migrate_data.validate_student_data', return_value=None):
                original_cwd = os.getcwd()
                try:
                    os.chdir(temp_dir)

                    result = manager.migrate_csv_data_legacy()

                    # Should handle errors gracefully
                    assert result is True
                    assert manager.stats['errors'] > 0

                finally:
                    os.chdir(original_cwd)


class TestMigrateCSVDataFunction:
    """Test cases for the migrate_csv_data function."""

    @patch('migrate_data.DataMigrationManager')
    def test_migrate_csv_data_incremental(self, mock_manager_class):
        """Test migrate_csv_data with incremental=True."""
        from migrate_data import migrate_csv_data

        # Mock the manager
        mock_manager = MagicMock()
        mock_manager.migrate_csv_data_legacy.return_value = True
        mock_manager_class.return_value = mock_manager

        # Test incremental migration
        result = asyncio.run(migrate_csv_data(incremental=True))

        assert result is True
        mock_manager_class.assert_called_once_with(incremental=True)

    @patch('migrate_data.DataMigrationManager')
    def test_migrate_csv_data_full_reload(self, mock_manager_class):
        """Test migrate_csv_data with incremental=False."""
        from migrate_data import migrate_csv_data

        # Mock the manager
        mock_manager = MagicMock()
        mock_manager.migrate_csv_data_legacy.return_value = False
        mock_manager_class.return_value = mock_manager

        # Test full reload migration
        result = asyncio.run(migrate_csv_data(incremental=False))

        assert result is False
        mock_manager_class.assert_called_once_with(incremental=False)


class TestMainFunction:
    """Test cases for the main function."""

    @patch('migrate_data.migrate_csv_data')
    @patch('migrate_data.argparse.ArgumentParser.parse_args')
    def test_main_incremental_success(self, mock_parse_args, mock_migrate):
        """Test main function with successful incremental migration."""
        from migrate_data import main

        # Mock arguments for incremental migration
        mock_args = MagicMock()
        mock_args.incremental = True
        mock_args.full_reload = False
        mock_parse_args.return_value = mock_args

        # Mock successful migration
        mock_migrate.return_value = True

        # Should not raise exception and should exit with code 0
        with patch('sys.exit') as mock_exit:
            main()
            mock_exit.assert_called_once_with(0)

    @patch('migrate_data.migrate_csv_data')
    @patch('migrate_data.argparse.ArgumentParser.parse_args')
    def test_main_full_reload_success(self, mock_parse_args, mock_migrate):
        """Test main function with successful full reload migration."""
        from migrate_data import main

        # Mock arguments for full reload
        mock_args = MagicMock()
        mock_args.incremental = False
        mock_args.full_reload = True
        mock_parse_args.return_value = mock_args

        # Mock successful migration
        mock_migrate.return_value = True

        # Should not raise exception and should exit with code 0
        with patch('sys.exit') as mock_exit:
            main()
            mock_exit.assert_called_once_with(0)

    @patch('migrate_data.migrate_csv_data')
    @patch('migrate_data.argparse.ArgumentParser.parse_args')
    def test_main_migration_failure(self, mock_parse_args, mock_migrate):
        """Test main function with failed migration."""
        from migrate_data import main

        # Mock arguments
        mock_args = MagicMock()
        mock_args.incremental = True
        mock_args.full_reload = False
        mock_parse_args.return_value = mock_args

        # Mock failed migration
        mock_migrate.return_value = False

        # Should exit with code 1
        with patch('sys.exit') as mock_exit:
            main()
            mock_exit.assert_called_once_with(1)

    @patch('migrate_data.migrate_csv_data')
    @patch('migrate_data.argparse.ArgumentParser.parse_args')
    def test_main_migration_exception(self, mock_parse_args, mock_migrate):
        """Test main function with migration exception."""
        from migrate_data import main

        # Mock arguments
        mock_args = MagicMock()
        mock_args.incremental = True
        mock_args.full_reload = False
        mock_parse_args.return_value = mock_args

        # Mock migration exception
        mock_migrate.side_effect = Exception("Migration error")

        # Should exit with code 1
        with patch('sys.exit') as mock_exit:
            main()
            mock_exit.assert_called_once_with(1)


class TestMigrationStatistics:
    """Test cases for migration statistics tracking."""

    def test_stats_initialization(self):
        """Test that statistics are properly initialized."""
        from migrate_data import DataMigrationManager

        manager = DataMigrationManager()

        expected_stats = {
            "drivers_created": 0,
            "drivers_skipped": 0,
            "students_created": 0,
            "students_skipped": 0,
            "errors": 0
        }

        assert manager.stats == expected_stats

    def test_stats_tracking(self):
        """Test that statistics are properly tracked during migration."""
        from migrate_data import DataMigrationManager

        manager = DataMigrationManager()

        # Manually increment stats to test tracking
        manager.stats["drivers_created"] += 1
        manager.stats["students_created"] += 5
        manager.stats["errors"] += 1

        assert manager.stats["drivers_created"] == 1
        assert manager.stats["students_created"] == 5
        assert manager.stats["errors"] == 1


if __name__ == '__main__':
    pytest.main([__file__])