"""
Comprehensive tests for sample data seeding script.

Tests all aspects of the seed_sample_data.py script including:
- Student and driver data seeding
- Database operations and error handling
- Data validation and integrity
- Command line argument handling
- Error scenarios and edge cases
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from seed_sample_data import (
    SAMPLE_STUDENTS,
    SAMPLE_DRIVERS,
    create_sample_students,
    create_sample_drivers,
    main
)


class TestSampleDataSeeding:
    """Test suite for sample data seeding functionality."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def sample_student_data(self):
        """Sample student data for testing."""
        return SAMPLE_STUDENTS[0].copy()

    @pytest.fixture
    def sample_driver_data(self):
        """Sample driver data for testing."""
        return SAMPLE_DRIVERS[0].copy()

    def test_sample_students_data_structure(self):
        """Test that sample students data has correct structure."""
        assert len(SAMPLE_STUDENTS) > 0

        for student in SAMPLE_STUDENTS:
            required_fields = [
                'name', 'father_name', 'mother_name', 'mobile',
                'class_', 'address', 'fees', 'route', 'date_of_birth', 'admission_date'
            ]

            for field in required_fields:
                assert field in student, f"Missing field '{field}' in student data"

            # Verify data types
            assert isinstance(student['name'], str)
            assert isinstance(student['mobile'], str)
            assert isinstance(student['class_'], str)
            assert isinstance(student['fees'], (int, float))
            assert isinstance(student['route'], str)

    def test_sample_drivers_data_structure(self):
        """Test that sample drivers data has correct structure."""
        assert len(SAMPLE_DRIVERS) > 0

        for driver in SAMPLE_DRIVERS:
            required_fields = [
                'name', 'route', 'status', 'vehicle_number',
                'contact_number', 'license_number', 'experience_years'
            ]

            for field in required_fields:
                assert field in driver, f"Missing field '{field}' in driver data"

            # Verify data types
            assert isinstance(driver['name'], str)
            assert isinstance(driver['route'], str)
            assert isinstance(driver['status'], str)
            assert isinstance(driver['experience_years'], int)

    @pytest.mark.asyncio
    async def test_create_sample_students_success(self, mock_db):
        """Test successful creation of sample students."""
        # Arrange
        mock_db.execute = AsyncMock()
        mock_db.add = AsyncMock()
        mock_db.commit = AsyncMock()

        # Mock the existing student check to return None (no existing students)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        # Act
        created_count = await create_sample_students(mock_db, clear=False)

        # Assert
        assert created_count == len(SAMPLE_STUDENTS)
        assert mock_db.add.call_count == len(SAMPLE_STUDENTS)
        assert mock_db.commit.call_count == 1

    @pytest.mark.asyncio
    async def test_create_sample_students_with_existing(self, mock_db):
        """Test creation of sample students when some already exist."""
        # Arrange
        mock_db.execute = AsyncMock()
        mock_db.add = AsyncMock()
        mock_db.commit = AsyncMock()

        # Mock existing student check - first student exists, others don't
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = MagicMock()  # First exists
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = None  # Others don't exist

        mock_db.execute.side_effect = [mock_result1, mock_result2, mock_result2, mock_result2, mock_result2]

        # Act
        created_count = await create_sample_students(mock_db, clear=False)

        # Assert
        assert created_count == len(SAMPLE_STUDENTS) - 1  # One less created (first already exists)
        assert mock_db.add.call_count == len(SAMPLE_STUDENTS) - 1
        assert mock_db.commit.call_count == 1

    @pytest.mark.asyncio
    async def test_create_sample_students_clear_existing(self, mock_db):
        """Test creation of sample students with clearing existing data."""
        # Arrange
        mock_db.execute = AsyncMock()
        mock_db.add = AsyncMock()
        mock_db.commit = AsyncMock()

        # Act
        created_count = await create_sample_students(mock_db, clear=True)

        # Assert
        # Should clear existing data first
        mock_db.execute.assert_any_call(pytest.helpers.anyvar())
        mock_db.commit.assert_called()
        assert created_count == len(SAMPLE_STUDENTS)

    @pytest.mark.asyncio
    async def test_create_sample_drivers_success(self, mock_db):
        """Test successful creation of sample drivers."""
        # Arrange
        mock_db.execute = AsyncMock()
        mock_db.add = AsyncMock()
        mock_db.commit = AsyncMock()

        # Mock the existing driver check to return None (no existing drivers)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        # Act
        created_count = await create_sample_drivers(mock_db, clear=False)

        # Assert
        assert created_count == len(SAMPLE_DRIVERS)
        assert mock_db.add.call_count == len(SAMPLE_DRIVERS)
        assert mock_db.commit.call_count == 1

    @pytest.mark.asyncio
    async def test_create_sample_drivers_with_existing(self, mock_db):
        """Test creation of sample drivers when some already exist."""
        # Arrange
        mock_db.execute = AsyncMock()
        mock_db.add = AsyncMock()
        mock_db.commit = AsyncMock()

        # Mock existing driver check - first driver exists, others don't
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = MagicMock()  # First exists
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = None  # Others don't exist

        mock_db.execute.side_effect = [mock_result1, mock_result2, mock_result2]

        # Act
        created_count = await create_sample_drivers(mock_db, clear=False)

        # Assert
        assert created_count == len(SAMPLE_DRIVERS) - 1  # One less created (first already exists)
        assert mock_db.add.call_count == len(SAMPLE_DRIVERS) - 1
        assert mock_db.commit.call_count == 1

    @pytest.mark.asyncio
    async def test_create_sample_students_database_error(self, mock_db):
        """Test handling of database errors during student creation."""
        # Arrange
        mock_db.execute = AsyncMock()
        mock_db.add = AsyncMock()
        mock_db.commit = AsyncMock(side_effect=Exception("Database connection error"))

        # Mock existing student check
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        # Act & Assert
        with pytest.raises(Exception, match="Database connection error"):
            await create_sample_students(mock_db, clear=False)

        # Verify transaction was rolled back (add should not be called)
        mock_db.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_sample_drivers_database_error(self, mock_db):
        """Test handling of database errors during driver creation."""
        # Arrange
        mock_db.execute = AsyncMock()
        mock_db.add = AsyncMock()
        mock_db.commit = AsyncMock(side_effect=Exception("Database connection error"))

        # Mock existing driver check
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        # Act & Assert
        with pytest.raises(Exception, match="Database connection error"):
            await create_sample_drivers(mock_db, clear=False)

        # Verify transaction was rolled back (add should not be called)
        mock_db.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_main_function_success(self, mock_db):
        """Test main function execution success."""
        # Arrange
        with patch('seed_sample_data.get_db') as mock_get_db:
            mock_get_db.return_value = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=None)

            with patch('seed_sample_data.create_sample_students', return_value=5) as mock_students:
                with patch('seed_sample_data.create_sample_drivers', return_value=3) as mock_drivers:

                    # Act
                    result = await main(clear=False, verbose=True)

        # Assert
        assert result == 0
        mock_students.assert_called_once_with(mock_db, False)
        mock_drivers.assert_called_once_with(mock_db, False)

    @pytest.mark.asyncio
    async def test_main_function_with_clear(self, mock_db):
        """Test main function with clear option."""
        # Arrange
        with patch('seed_sample_data.get_db') as mock_get_db:
            mock_get_db.return_value = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=None)

            with patch('seed_sample_data.create_sample_students', return_value=5) as mock_students:
                with patch('seed_sample_data.create_sample_drivers', return_value=3) as mock_drivers:

                    # Act
                    result = await main(clear=True, verbose=False)

        # Assert
        assert result == 0
        mock_students.assert_called_once_with(mock_db, True)
        mock_drivers.assert_called_once_with(mock_db, True)

    @pytest.mark.asyncio
    async def test_main_function_database_error(self, mock_db):
        """Test main function with database error."""
        # Arrange
        with patch('seed_sample_data.get_db') as mock_get_db:
            mock_get_db.return_value = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=None)

            with patch('seed_sample_data.create_sample_students', side_effect=Exception("Database error")):

                # Act
                result = await main(clear=False, verbose=False)

        # Assert
        assert result == 1

    def test_student_data_validation(self):
        """Test validation of student data fields."""
        for student in SAMPLE_STUDENTS:
            # Test mobile number format (should be digits only)
            assert student['mobile'].isdigit(), f"Invalid mobile number: {student['mobile']}"

            # Test fees is positive
            assert student['fees'] > 0, f"Fees should be positive: {student['fees']}"

            # Test class format (should be alphanumeric)
            assert student['class_'].replace(' ', '').isalnum(), f"Invalid class format: {student['class_']}"

            # Test dates are in correct format
            try:
                datetime.strptime(student['date_of_birth'], '%Y-%m-%d')
                datetime.strptime(student['admission_date'], '%Y-%m-%d')
            except ValueError as e:
                pytest.fail(f"Invalid date format: {e}")

    def test_driver_data_validation(self):
        """Test validation of driver data fields."""
        for driver in SAMPLE_DRIVERS:
            # Test experience years is non-negative
            assert driver['experience_years'] >= 0, f"Experience years should be non-negative: {driver['experience_years']}"

            # Test status is valid
            assert driver['status'] in ['active', 'inactive'], f"Invalid driver status: {driver['status']}"

            # Test vehicle number format
            assert len(driver['vehicle_number']) > 0, "Vehicle number should not be empty"

            # Test license number format
            assert len(driver['license_number']) > 0, "License number should not be empty"

    @pytest.mark.asyncio
    async def test_create_sample_students_empty_data(self, mock_db):
        """Test creation with empty sample data."""
        # Arrange
        with patch('seed_sample_data.SAMPLE_STUDENTS', []):
            mock_db.commit = AsyncMock()

            # Act
            created_count = await create_sample_students(mock_db, clear=False)

        # Assert
        assert created_count == 0
        mock_db.add.assert_not_called()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_sample_drivers_empty_data(self, mock_db):
        """Test creation with empty sample data."""
        # Arrange
        with patch('seed_sample_data.SAMPLE_DRIVERS', []):
            mock_db.commit = AsyncMock()

            # Act
            created_count = await create_sample_drivers(mock_db, clear=False)

        # Assert
        assert created_count == 0
        mock_db.add.assert_not_called()
        mock_db.commit.assert_called_once()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])