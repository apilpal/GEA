"""
Test Data Helper Functions for E2E Tests
Provides utilities for creating, managing, and cleaning up test data
"""

import json
import random
import string
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from .logging_helpers import TestLogger


@dataclass
class TestStudentData:
    """Test data structure for student records"""
    name: str
    father_name: str
    class_name: str
    mobile: str
    route: str
    address: str
    fees: str

    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary for API requests"""
        return {
            'name': self.name,
            'father_name': self.father_name,
            'class': self.class_name,
            'mobile': self.mobile,
            'route': self.route,
            'address': self.address,
            'fees': self.fees
        }


@dataclass
class TestUserData:
    """Test data structure for user accounts"""
    username: str
    email: str
    password: str
    role: str = "student"

    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary for API requests"""
        return {
            'username': self.username,
            'email': self.email,
            'password': self.password,
            'role': self.role
        }


class TestDataGenerator:
    """Generates realistic test data for various scenarios"""

    def __init__(self, logger: TestLogger):
        self.logger = logger
        self.used_names: set = set()
        self.used_emails: set = set()
        self.used_mobiles: set = set()

    def generate_student_name(self, prefix: str = "Student") -> str:
        """Generate unique student name"""
        while True:
            # Generate name with random suffix
            suffix = ''.join(random.choices(string.ascii_letters + string.digits, k=4))
            name = f"{prefix}_{suffix}"

            if name not in self.used_names:
                self.used_names.add(name)
                return name

    def generate_email(self, domain: str = "test.edu") -> str:
        """Generate unique email address"""
        while True:
            username = ''.join(random.choices(string.ascii_lowercase, k=8))
            email = f"{username}@{domain}"

            if email not in self.used_emails:
                self.used_emails.add(email)
                return email

    def generate_mobile(self) -> str:
        """Generate unique mobile number"""
        while True:
            # Generate 10-digit mobile number starting with 9,8,7, or 6
            first_digit = random.choice(['9', '8', '7', '6'])
            remaining_digits = ''.join(random.choices(string.digits, k=9))
            mobile = f"{first_digit}{remaining_digits}"

            if mobile not in self.used_mobiles:
                self.used_mobiles.add(mobile)
                return mobile

    def generate_route(self) -> str:
        """Generate random route name"""
        routes = ["ROUTE_A", "ROUTE_B", "ROUTE_C", "ROUTE_D", "ROUTE_E",
                 "CITY_EXPRESS", "SUBURBAN_1", "SUBURBAN_2"]
        return random.choice(routes)

    def generate_address(self) -> str:
        """Generate random address"""
        streets = ["Main St", "Park Ave", "Oak Blvd", "Elm Dr", "Pine Rd",
                  "Maple Ln", "Cedar Way", "Birch Ct"]
        cities = ["Springfield", "Riverside", "Franklin", "Madison", "Georgetown"]

        street_num = random.randint(100, 9999)
        street = random.choice(streets)
        city = random.choice(cities)

        return f"{street_num} {street}, {city}"

    def create_student_data(self, count: int = 1,
                          custom_data: Optional[Dict[str, Any]] = None) -> List[TestStudentData]:
        """
        Create test student data with optional customization

        Args:
            count: Number of students to create
            custom_data: Custom data to override defaults

        Returns:
            List of TestStudentData objects
        """
        students = []

        for i in range(count):
            student = TestStudentData(
                name=self.generate_student_name(f"TestStudent_{i+1}"),
                father_name=f"TestFather_{i+1}",
                class_name=str(random.randint(1, 12)),
                mobile=self.generate_mobile(),
                route=self.generate_route(),
                address=self.generate_address(),
                fees=str(random.randint(500, 5000))
            )

            # Apply custom data if provided
            if custom_data:
                for key, value in custom_data.items():
                    if hasattr(student, key):
                        setattr(student, key, value)

            students.append(student)

        self.logger.logger.info(f"Generated {len(students)} test student records")
        return students

    def create_user_data(self, count: int = 1, role: str = "student",
                        custom_data: Optional[Dict[str, Any]] = None) -> List[TestUserData]:
        """
        Create test user data with optional customization

        Args:
            count: Number of users to create
            role: User role (student, teacher, admin, etc.)
            custom_data: Custom data to override defaults

        Returns:
            List of TestUserData objects
        """
        users = []

        for i in range(count):
            user = TestUserData(
                username=self.generate_student_name(f"testuser_{i+1}"),
                email=self.generate_email(),
                password="TestPassword123!",
                role=role
            )

            # Apply custom data if provided
            if custom_data:
                for key, value in custom_data.items():
                    if hasattr(user, key):
                        setattr(user, key, value)

            users.append(user)

        self.logger.logger.info(f"Generated {len(users)} test user records with role '{role}'")
        return users


class TestDataManager:
    """Manages test data lifecycle and cleanup"""

    def __init__(self, logger: TestLogger, data_generator: TestDataGenerator):
        self.logger = logger
        self.data_generator = data_generator
        self.created_resources: Dict[str, List[Dict[str, Any]]] = {
            'students': [],
            'users': [],
            'guest_users': []
        }
        self.cleanup_callbacks: List[callable] = []

    def register_student(self, student_data: Dict[str, Any]) -> None:
        """Register created student for cleanup"""
        self.created_resources['students'].append(student_data)
        self.logger.log_test_data("student_registered", student_data)

    def register_user(self, user_data: Dict[str, Any]) -> None:
        """Register created user for cleanup"""
        self.created_resources['users'].append(user_data)
        self.logger.log_test_data("user_registered", user_data)

    def register_guest_user(self, guest_data: Dict[str, Any]) -> None:
        """Register created guest user for cleanup"""
        self.created_resources['guest_users'].append(guest_data)
        self.logger.log_test_data("guest_user_registered", guest_data)

    def add_cleanup_callback(self, callback: callable) -> None:
        """Add a cleanup function to be called during teardown"""
        self.cleanup_callbacks.append(callback)

    def cleanup_all(self) -> None:
        """Clean up all registered resources"""
        self.logger.logger.info("🧹 Starting comprehensive test data cleanup...")

        # Execute custom cleanup callbacks
        for callback in self.cleanup_callbacks:
            try:
                callback()
                self.logger.logger.debug("Executed cleanup callback")
            except Exception as e:
                self.logger.logger.error(f"Cleanup callback failed: {e}")

        # Log cleanup summary
        for resource_type, resources in self.created_resources.items():
            if resources:
                self.logger.logger.info(f"Cleaned up {len(resources)} {resource_type}")

        # Clear all tracking data
        self.created_resources = {key: [] for key in self.created_resources.keys()}
        self.cleanup_callbacks = []

        self.logger.logger.info("✓ Test data cleanup completed")

    def get_cleanup_summary(self) -> Dict[str, int]:
        """Get summary of resources that will be cleaned up"""
        return {
            resource_type: len(resources)
            for resource_type, resources in self.created_resources.items()
        }


class TestDataTemplates:
    """Provides predefined test data templates for common scenarios"""

    @staticmethod
    def get_student_with_specific_class(class_name: str) -> Dict[str, str]:
        """Get student data template for specific class"""
        return {
            'name': f'Class{class_name}_Student',
            'father_name': f'Class{class_name}_Father',
            'class': class_name,
            'mobile': '9876543210',
            'route': 'TEMPLATE_ROUTE',
            'address': 'Template Address, Template City',
            'fees': '1500'
        }

    @staticmethod
    def get_student_with_specific_route(route: str) -> Dict[str, str]:
        """Get student data template for specific route"""
        return {
            'name': f'{route}_Student',
            'father_name': f'{route}_Father',
            'class': '8',
            'mobile': '9876543210',
            'route': route,
            'address': f'{route} Address, Route City',
            'fees': '1200'
        }

    @staticmethod
    def get_bulk_students_template(count: int = 5) -> List[Dict[str, str]]:
        """Get template for bulk student creation"""
        students = []
        classes = ['5', '6', '7', '8', '9', '10']

        for i in range(count):
            students.append({
                'name': f'BulkStudent_{i+1}',
                'father_name': f'BulkFather_{i+1}',
                'class': random.choice(classes),
                'mobile': f'98765{random.randint(1000, 9999)}',
                'route': f'BULK_ROUTE_{i+1}',
                'address': f'Bulk Address {i+1}, Bulk City',
                'fees': str(random.randint(800, 2000))
            })

        return students

    @staticmethod
    def get_edge_case_students() -> List[Dict[str, str]]:
        """Get test data for edge cases"""
        return [
            # Very long names
            {
                'name': 'A' * 100,
                'father_name': 'B' * 100,
                'class': '12',
                'mobile': '9999999999',
                'route': 'EDGE_CASE_ROUTE',
                'address': 'C' * 200,
                'fees': '999999'
            },
            # Special characters
            {
                'name': 'Student@#$%^&*()',
                'father_name': 'Father"\'\\|/<>,.?',
                'class': '1',
                'mobile': '8888888888',
                'route': 'SPECIAL_CHARS',
                'address': 'Special Address!@#$%',
                'fees': '100'
            },
            # Unicode characters
            {
                'name': 'महेश_कुमार',
                'father_name': 'राजेश_कुमार',
                'class': '10',
                'mobile': '7777777777',
                'route': 'UNICODE_ROUTE',
                'address': 'यूनिकोड_एड्रेस',
                'fees': '1500'
            }
        ]


def create_test_data_generator(logger: TestLogger) -> TestDataGenerator:
    """Factory function to create test data generator"""
    return TestDataGenerator(logger)


def create_test_data_manager(logger: TestLogger) -> TestDataManager:
    """Factory function to create test data manager"""
    generator = TestDataGenerator(logger)
    return TestDataManager(logger, generator)