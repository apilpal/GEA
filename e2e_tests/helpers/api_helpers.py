"""
API Helper Functions for E2E Tests
Provides common API operations and authentication utilities
"""

import requests
import json
import time
from typing import Dict, List, Optional, Any, Tuple
from requests.cookies import RequestsCookieJar


class APIClient:
    """Enhanced API client with authentication and error handling"""

    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.default_timeout = 10

    def set_auth_token(self, access_token: str, refresh_token: Optional[str] = None):
        """Set authentication token for subsequent requests"""
        self.access_token = access_token
        if refresh_token:
            self.refresh_token = refresh_token
        self._update_auth_header()

    def _update_auth_header(self):
        """Update session headers with current auth token"""
        if self.access_token:
            self.session.headers.update({
                'Authorization': f'Bearer {self.access_token}'
            })
        else:
            self.session.headers.pop('Authorization', None)

    def login(self, username_or_email: str, password: str,
             endpoint: str = "/api/auth/login") -> Tuple[bool, Dict[str, Any]]:
        """
        Perform login and set authentication tokens

        Returns:
            Tuple of (success: bool, response_data: Dict)
        """
        try:
            login_data = {
                'username_or_email': username_or_email,
                'password': password
            }

            response = self.session.post(
                f"{self.base_url}{endpoint}",
                json=login_data,
                timeout=self.default_timeout
            )

            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data:
                    self.set_auth_token(data['access_token'])
                    # Store refresh token from cookies if available
                    if response.cookies:
                        self.refresh_token = self._extract_refresh_token(response.cookies)
                    return True, data

            return False, {'error': f'Login failed with status {response.status_code}'}

        except Exception as e:
            return False, {'error': f'Login error: {str(e)}'}

    def logout(self, endpoint: str = "/api/auth/logout") -> bool:
        """
        Perform logout and clear authentication tokens

        Returns:
            bool: Success status
        """
        try:
            response = self.session.post(
                f"{self.base_url}{endpoint}",
                timeout=self.default_timeout
            )

            # Clear tokens regardless of response
            self.access_token = None
            self.refresh_token = None
            self._update_auth_header()

            return response.status_code == 200

        except Exception:
            # Clear tokens even if logout request fails
            self.access_token = None
            self.refresh_token = None
            self._update_auth_header()
            return False

    def _extract_refresh_token(self, cookies: RequestsCookieJar) -> Optional[str]:
        """Extract refresh token from cookies"""
        for cookie in cookies:
            if 'refresh' in cookie.name.lower():
                return cookie.value
        return None

    def create_guest_user(self, endpoint: str = "/api/auth/guest") -> Tuple[bool, Dict[str, Any]]:
        """
        Create a guest user session

        Returns:
            Tuple of (success: bool, response_data: Dict)
        """
        try:
            response = self.session.post(
                f"{self.base_url}{endpoint}",
                json={},
                timeout=self.default_timeout
            )

            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data:
                    self.set_auth_token(data['access_token'])
                    return True, data

            return False, {'error': f'Guest creation failed with status {response.status_code}'}

        except Exception as e:
            return False, {'error': f'Guest creation error: {str(e)}'}

    def validate_token(self, endpoint: str = "/api/auth/token/validate") -> Tuple[bool, Dict[str, Any]]:
        """
        Validate current authentication token

        Returns:
            Tuple of (is_valid: bool, response_data: Dict)
        """
        try:
            response = self.session.get(
                f"{self.base_url}{endpoint}",
                timeout=self.default_timeout
            )

            if response.status_code == 200:
                return True, response.json()

            return False, {'error': f'Token validation failed with status {response.status_code}'}

        except Exception as e:
            return False, {'error': f'Token validation error: {str(e)}'}

    def refresh_token(self, endpoint: str = "/api/auth/token/refresh") -> Tuple[bool, Dict[str, Any]]:
        """
        Refresh authentication token using refresh token

        Returns:
            Tuple of (success: bool, response_data: Dict)
        """
        try:
            response = self.session.post(
                f"{self.base_url}{endpoint}",
                timeout=self.default_timeout
            )

            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data:
                    self.set_auth_token(data['access_token'])
                    return True, data

            return False, {'error': f'Token refresh failed with status {response.status_code}'}

        except Exception as e:
            return False, {'error': f'Token refresh error: {str(e)}'}

    def get(self, endpoint: str, params: Optional[Dict] = None) -> requests.Response:
        """Make GET request with current authentication"""
        return self.session.get(
            f"{self.base_url}{endpoint}",
            params=params,
            timeout=self.default_timeout
        )

    def post(self, endpoint: str, data: Optional[Dict] = None) -> requests.Response:
        """Make POST request with current authentication"""
        return self.session.post(
            f"{self.base_url}{endpoint}",
            json=data,
            timeout=self.default_timeout
        )

    def put(self, endpoint: str, data: Optional[Dict] = None) -> requests.Response:
        """Make PUT request with current authentication"""
        return self.session.put(
            f"{self.base_url}{endpoint}",
            json=data,
            timeout=self.default_timeout
        )

    def delete(self, endpoint: str) -> requests.Response:
        """Make DELETE request with current authentication"""
        return self.session.delete(
            f"{self.base_url}{endpoint}",
            timeout=self.default_timeout
        )

    def wait_for_server(self, max_wait: int = 30) -> bool:
        """
        Wait for server to be available

        Args:
            max_wait: Maximum seconds to wait

        Returns:
            bool: True if server is available
        """
        start_time = time.time()

        while time.time() - start_time < max_wait:
            try:
                response = self.get("/api/health")
                if response.status_code == 200:
                    return True
            except Exception:
                pass

            time.sleep(1)

        return False


def make_api_request(method: str, url: str, **kwargs) -> requests.Response:
    """
    Make a simple API request with error handling

    Args:
        method: HTTP method (GET, POST, PUT, DELETE)
        url: Full URL to request
        **kwargs: Additional arguments for requests

    Returns:
        requests.Response object
    """
    timeout = kwargs.pop('timeout', 10)

    try:
        response = requests.request(
            method=method,
            url=url,
            timeout=timeout,
            **kwargs
        )
        return response

    except requests.exceptions.Timeout:
        raise AssertionError(f"Request to {url} timed out after {timeout}s")
    except requests.exceptions.ConnectionError:
        raise AssertionError(f"Connection error for {url}")
    except Exception as e:
        raise AssertionError(f"Request to {url} failed: {str(e)}")


def create_test_student(client: APIClient, student_data: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Create a test student using the API client

    Args:
        client: APIClient instance
        student_data: Optional custom student data

    Returns:
        Created student data
    """
    default_data = {
        "name": "Test Student",
        "father_name": "Test Father",
        "class": "5",
        "mobile": "1234567890",
        "route": "TEST",
        "address": "Test Address",
        "fees": "1000"
    }

    if student_data:
        default_data.update(student_data)

    response = client.post("/api/students/", default_data)
    assert response.status_code == 200, f"Failed to create student: {response.status_code}"
    return response.json()


def delete_test_student(client: APIClient, student_id: str) -> bool:
    """
    Delete a test student using the API client

    Args:
        client: APIClient instance
        student_id: ID of student to delete

    Returns:
        bool: Success status
    """
    response = client.delete(f"/api/students/{student_id}/")
    return response.status_code == 200


def create_multiple_test_students(client: APIClient, count: int = 3,
                                base_name: str = "Test Student") -> List[Dict[str, Any]]:
    """
    Create multiple test students

    Args:
        client: APIClient instance
        count: Number of students to create
        base_name: Base name for students

    Returns:
        List of created student data
    """
    created_students = []

    for i in range(count):
        student_data = {
            "name": f"{base_name} {i+1}",
            "father_name": f"Father {i+1}",
            "class": "5",
            "mobile": f"123456789{i}",
            "route": "TEST",
            "address": f"Address {i+1}",
            "fees": "1000"
        }

        student = create_test_student(client, student_data)
        created_students.append(student)

    return created_students


def cleanup_test_students(client: APIClient, student_ids: List[str]) -> None:
    """
    Clean up multiple test students

    Args:
        client: APIClient instance
        student_ids: List of student IDs to delete
    """
    for student_id in student_ids:
        try:
            delete_test_student(client, student_id)
        except Exception as e:
            print(f"Warning: Failed to delete student {student_id}: {e}")


def get_chart_data(client: APIClient, chart_type: str) -> Dict[str, Any]:
    """
    Get chart data from the API

    Args:
        client: APIClient instance
        chart_type: Type of chart data to retrieve

    Returns:
        Chart data dictionary
    """
    endpoint_map = {
        'student-distribution': '/api/charts/student-distribution/',
        'revenue-by-driver': '/api/charts/revenue-by-driver/',
        'revenue-by-class': '/api/charts/revenue-by-class/'
    }

    endpoint = endpoint_map.get(chart_type)
    if not endpoint:
        raise ValueError(f"Unknown chart type: {chart_type}")

    response = client.get(endpoint)
    assert response.status_code == 200, f"Failed to get chart data: {response.status_code}"
    return response.json()


def health_check(client: APIClient) -> bool:
    """
    Perform health check on the API

    Args:
        client: APIClient instance

    Returns:
        bool: Health status
    """
    response = client.get("/api/health")
    return response.status_code == 200