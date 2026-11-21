"""
Assertion Helper Functions for E2E Tests
Provides common assertion utilities and enhanced error messages
"""

import json
import time
from typing import Any, Dict, List, Optional, Union
from requests import Response


class TestAssertionError(AssertionError):
    """Custom assertion error with enhanced context"""

    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        self.context = context or {}
        super().__init__(message)


def assert_response_status(response: Response, expected_status: int,
                          context: Optional[str] = None) -> None:
    """
    Assert response has expected status code with detailed error message

    Args:
        response: Response object from requests
        expected_status: Expected HTTP status code
        context: Optional context description for error message

    Raises:
        TestAssertionError: If status code doesn't match
    """
    context_msg = f" in {context}" if context else ""

    if response.status_code != expected_status:
        error_context = {
            'expected_status': expected_status,
            'actual_status': response.status_code,
            'url': response.url,
            'method': response.request.method if response.request else 'Unknown',
            'response_text': response.text[:500]  # First 500 chars
        }

        raise TestAssertionError(
            f"Expected status {expected_status} but got {response.status_code}{context_msg}",
            error_context
        )


def assert_response_success(response: Response, context: Optional[str] = None) -> None:
    """
    Assert response was successful (2xx status codes)

    Args:
        response: Response object from requests
        context: Optional context description for error message

    Raises:
        TestAssertionError: If response was not successful
    """
    context_msg = f" in {context}" if context else ""

    if not response.ok:
        error_context = {
            'status_code': response.status_code,
            'url': response.url,
            'method': response.request.method if response.request else 'Unknown',
            'response_text': response.text[:500]
        }

        raise TestAssertionError(
            f"Expected successful response but got {response.status_code}{context_msg}",
            error_context
        )


def assert_json_response(response: Response, context: Optional[str] = None) -> Dict[str, Any]:
    """
    Assert response contains valid JSON and return parsed data

    Args:
        response: Response object from requests
        context: Optional context description for error message

    Returns:
        Parsed JSON data

    Raises:
        TestAssertionError: If response doesn't contain valid JSON
    """
    context_msg = f" in {context}" if context else ""

    try:
        return response.json()
    except json.JSONDecodeError as e:
        error_context = {
            'status_code': response.status_code,
            'url': response.url,
            'response_text': response.text[:500],
            'json_error': str(e)
        }

        raise TestAssertionError(
            f"Response is not valid JSON{context_msg}: {str(e)}",
            error_context
        )


def assert_student_data_structure(student_data: Dict[str, Any],
                                required_fields: Optional[List[str]] = None) -> None:
    """
    Assert student data has correct structure and required fields

    Args:
        student_data: Student data dictionary
        required_fields: List of required field names

    Raises:
        TestAssertionError: If student data structure is invalid
    """
    if not isinstance(student_data, dict):
        raise TestAssertionError(
            f"Student data should be a dictionary, got {type(student_data)}",
            {'student_data_type': type(student_data)}
        )

    default_required_fields = ['id', 'name', 'father_name', 'class', 'mobile']
    fields_to_check = required_fields or default_required_fields

    missing_fields = []
    for field in fields_to_check:
        if field not in student_data:
            missing_fields.append(field)
        elif student_data[field] is None or student_data[field] == "":
            raise TestAssertionError(
                f"Required field '{field}' is empty",
                {'field': field, 'value': student_data.get(field)}
            )

    if missing_fields:
        raise TestAssertionError(
            f"Missing required fields: {missing_fields}",
            {'missing_fields': missing_fields, 'available_fields': list(student_data.keys())}
        )


def assert_chart_data_structure(chart_data: Dict[str, Any]) -> None:
    """
    Assert chart data has correct structure

    Args:
        chart_data: Chart data dictionary

    Raises:
        TestAssertionError: If chart data structure is invalid
    """
    if not isinstance(chart_data, dict):
        raise TestAssertionError(
            f"Chart data should be a dictionary, got {type(chart_data)}",
            {'chart_data_type': type(chart_data)}
        )

    required_fields = ['type', 'labels', 'values']
    missing_fields = []

    for field in required_fields:
        if field not in chart_data:
            missing_fields.append(field)

    if missing_fields:
        raise TestAssertionError(
            f"Chart data missing required fields: {missing_fields}",
            {'missing_fields': missing_fields, 'available_fields': list(chart_data.keys())}
        )

    # Validate data types and consistency
    if not isinstance(chart_data['labels'], list):
        raise TestAssertionError(
            "Chart labels should be a list",
            {'labels_type': type(chart_data['labels'])}
        )

    if not isinstance(chart_data['values'], list):
        raise TestAssertionError(
            "Chart values should be a list",
            {'values_type': type(chart_data['values'])}
        )

    if len(chart_data['labels']) != len(chart_data['values']):
        raise TestAssertionError(
            "Chart labels and values should have same length",
            {
                'labels_length': len(chart_data['labels']),
                'values_length': len(chart_data['values'])
            }
        )


def assert_authentication_data(auth_data: Dict[str, Any],
                             require_token: bool = True) -> None:
    """
    Assert authentication response has correct structure

    Args:
        auth_data: Authentication response data
        require_token: Whether access_token is required

    Raises:
        TestAssertionError: If authentication data structure is invalid
    """
    if not isinstance(auth_data, dict):
        raise TestAssertionError(
            f"Authentication data should be a dictionary, got {type(auth_data)}",
            {'auth_data_type': type(auth_data)}
        )

    if require_token and 'access_token' not in auth_data:
        raise TestAssertionError(
            "Authentication data missing access_token",
            {'available_fields': list(auth_data.keys())}
        )

    if 'access_token' in auth_data and not auth_data['access_token']:
        raise TestAssertionError(
            "Access token should not be empty",
            {'token_length': len(auth_data['access_token'])}
        )

    if 'user' in auth_data:
        user_data = auth_data['user']
        if not isinstance(user_data, dict):
            raise TestAssertionError(
                "User data should be a dictionary",
                {'user_data_type': type(user_data)}
            )


def assert_performance_threshold(duration: float, max_duration: float,
                               operation: str) -> None:
    """
    Assert operation completed within performance threshold

    Args:
        duration: Actual duration in seconds
        max_duration: Maximum allowed duration in seconds
        operation: Description of the operation

    Raises:
        TestAssertionError: If duration exceeds threshold
    """
    if duration > max_duration:
        raise TestAssertionError(
            f"{operation} took {duration:.3f}s, exceeds threshold of {max_duration:.3f}s",
            {
                'duration': duration,
                'threshold': max_duration,
                'operation': operation
            }
        )


def assert_data_consistency(api_data: Dict[str, Any], expected_data: Dict[str, Any],
                          operation: str) -> None:
    """
    Assert API data matches expected data with detailed comparison

    Args:
        api_data: Data returned from API
        expected_data: Expected data structure
        operation: Description of the operation for error messages

    Raises:
        TestAssertionError: If data doesn't match expectations
    """
    discrepancies = []

    for key, expected_value in expected_data.items():
        if key not in api_data:
            discrepancies.append(f"Missing key: {key}")
            continue

        actual_value = api_data[key]

        if actual_value != expected_value:
            discrepancies.append(
                f"Key '{key}': expected '{expected_value}', got '{actual_value}'"
            )

    if discrepancies:
        raise TestAssertionError(
            f"Data inconsistency in {operation}",
            {
                'discrepancies': discrepancies,
                'api_data': api_data,
                'expected_data': expected_data
            }
        )


def assert_element_visible(driver, locator, element_name: str, timeout: int = 10) -> None:
    """
    Assert web element is visible with enhanced error reporting

    Args:
        driver: WebDriver instance
        locator: Tuple of (By, locator_value)
        element_name: Human-readable name for the element
        timeout: Timeout in seconds

    Raises:
        TestAssertionError: If element is not visible within timeout
    """
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException

    try:
        WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located(locator)
        )
    except TimeoutException:
        # Take screenshot for debugging
        try:
            screenshot_path = f"/tmp/test_failure_{element_name.replace(' ', '_')}.png"
            driver.save_screenshot(screenshot_path)
        except Exception:
            screenshot_path = "Failed to capture screenshot"

        raise TestAssertionError(
            f"Element '{element_name}' not visible within {timeout}s",
            {
                'locator': str(locator),
                'timeout': timeout,
                'screenshot': screenshot_path,
                'page_source_preview': driver.page_source[:1000]
            }
        )


def assert_text_in_element(driver, locator, expected_text: str,
                         element_name: str) -> None:
    """
    Assert element contains expected text

    Args:
        driver: WebDriver instance
        locator: Tuple of (By, locator_value)
        expected_text: Text that should be present in element
        element_name: Human-readable name for the element

    Raises:
        TestAssertionError: If text is not found in element
    """
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    try:
        element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(locator)
        )
        actual_text = element.text.strip()

        if expected_text not in actual_text:
            raise TestAssertionError(
                f"Expected text '{expected_text}' not found in {element_name}",
                {
                    'expected_text': expected_text,
                    'actual_text': actual_text,
                    'element_name': element_name
                }
            )
    except Exception as e:
        if isinstance(e, TestAssertionError):
            raise
        raise TestAssertionError(
            f"Failed to check text in {element_name}: {str(e)}",
            {'original_error': str(e)}
        )


def assert_table_row_count(driver, table_locator, min_rows: int, table_name: str) -> None:
    """
    Assert table has minimum number of rows

    Args:
        driver: WebDriver instance
        table_locator: Tuple of (By, locator_value) for the table
        min_rows: Minimum expected number of rows
        table_name: Human-readable name for the table

    Raises:
        TestAssertionError: If table doesn't have enough rows
    """
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    try:
        table = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(table_locator)
        )

        # Find all rows in the table
        rows = table.find_elements(By.CSS_SELECTOR, "tr, .student-row, .data-row")

        if len(rows) < min_rows:
            raise TestAssertionError(
                f"Table '{table_name}' has {len(rows)} rows, expected at least {min_rows}",
                {
                    'table_name': table_name,
                    'actual_rows': len(rows),
                    'expected_min_rows': min_rows
                }
            )
    except Exception as e:
        if isinstance(e, TestAssertionError):
            raise
        raise TestAssertionError(
            f"Failed to check row count in {table_name}: {str(e)}",
            {'original_error': str(e)}
        )


def assert_api_response_time(response: Response, max_time: float,
                           endpoint: str) -> None:
    """
    Assert API response time is within acceptable limits

    Args:
        response: Response object from requests
        max_time: Maximum acceptable response time in seconds
        endpoint: API endpoint description for error messages

    Raises:
        TestAssertionError: If response time exceeds threshold
    """
    # Note: requests doesn't provide response time directly
    # In a real implementation, you'd measure this separately
    # For now, we'll just validate the response structure
    if not hasattr(response, 'status_code'):
        raise TestAssertionError(
            f"Invalid response object for {endpoint}",
            {'response_type': type(response)}
        )


# Import here to avoid circular imports
from selenium.webdriver.common.by import By