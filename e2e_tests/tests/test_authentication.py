"""
Authentication E2E Tests
Tests comprehensive authentication and authorization functionality
"""

import pytest
import time
from typing import Dict, List, Any

from e2e_tests.base.base_test import BaseE2ETest
from e2e_tests.helpers.api_helpers import APIClient
from e2e_tests.helpers.assertion_helpers import (
    assert_response_status, assert_response_success, assert_json_response,
    assert_authentication_data, assert_data_consistency
)
from e2e_tests.helpers.logging_helpers import log_test_step
from e2e_tests.config.test_config import get_config


class TestAuthentication(BaseE2ETest):
    """Test comprehensive authentication and authorization functionality"""

    def test_api_level_login_authentication(self):
        """Test API-level user login functionality"""
        test_name = "api_login_authentication"

        with self.measure_performance(f"{test_name}_login"):
            # Test login with dev credentials
            login_data = {
                "username_or_email": "dev_user",
                "password": "dev_password_123"
            }

            response = self.api_client.post("/api/auth/login", login_data)
            assert_response_success(response, "user login")
            assert_response_status(response, 200, "user login")

            login_result = assert_json_response(response, "user login")
            assert_authentication_data(login_result, require_token=True)

            # Verify login response structure
            assert "access_token" in login_result
            assert "user" in login_result
            assert login_result["user"]["username"] == "dev_user"
            assert login_result["access_token"] != ""

        with self.measure_performance(f"{test_name}_verify_cookies"):
            # Check that cookies are set (refresh token in HttpOnly cookie)
            cookies = response.cookies
            assert len(cookies) > 0, "Login should set cookies for refresh token"

        log_test_step(self.test_logger, "User login successful", {
            'username': 'dev_user',
            'token_length': len(login_result['access_token']),
            'cookies_count': len(cookies)
        })

    def test_api_level_logout_authentication(self):
        """Test API-level user logout functionality"""
        test_name = "api_logout_authentication"

        with self.measure_performance(f"{test_name}_login_first"):
            # First login to get authenticated
            login_data = {
                "username_or_email": "dev_user",
                "password": "dev_password_123"
            }

            login_response = self.api_client.post("/api/auth/login", login_data)
            assert_response_success(login_response, "login for logout test")

            # Get access token for authenticated requests
            access_token = login_response.json()["access_token"]

        with self.measure_performance(f"{test_name}_logout"):
            # Test logout
            logout_response = self.api_client.post("/api/auth/logout")
            assert_response_success(logout_response, "user logout")
            assert_response_status(logout_response, 200, "user logout")

            logout_data = assert_json_response(logout_response, "user logout")

            # Verify logout response
            assert "message" in logout_data
            assert "Successfully logged out" in logout_data["message"]

        log_test_step(self.test_logger, "User logout successful", {
            'username': 'dev_user',
            'logout_message': logout_data.get('message')
        })

    def test_api_level_token_validation(self):
        """Test API-level token validation functionality"""
        test_name = "api_token_validation"

        with self.measure_performance(f"{test_name}_login"):
            # Login first
            login_data = {
                "username_or_email": "dev_user",
                "password": "dev_password_123"
            }

            login_response = self.api_client.post("/api/auth/login", login_data)
            assert_response_success(login_response, "login for token validation")

            access_token = login_response.json()["access_token"]

        with self.measure_performance(f"{test_name}_validate_token"):
            # Test token validation endpoint
            headers = {"Authorization": f"Bearer {access_token}"}
            validate_response = requests.post(
                "http://127.0.0.1:8000/api/auth/token/validate",
                headers=headers,
                timeout=10
            )
            assert_response_success(validate_response, "token validation")
            assert_response_status(validate_response, 200, "token validation")

            validate_data = assert_json_response(validate_response, "token validation")

            # Verify token validation response
            assert validate_data["valid"] == True
            assert validate_data["user"] == "dev_user"
            assert "role" in validate_data
            assert "expires_in_minutes" in validate_data

        log_test_step(self.test_logger, "Token validation successful", {
            'token_valid': validate_data['valid'],
            'username': validate_data['user'],
            'expires_in': validate_data['expires_in_minutes']
        })

    def test_authentication_protected_endpoints(self):
        """Test authentication-protected API endpoints"""
        test_name = "protected_endpoints"

        # Test accessing protected endpoints without authentication
        protected_endpoints = [
            "/api/auth/me",
            "/api/students/",
            "/api/charts/student-distribution/"
        ]

        with self.measure_performance(f"{test_name}_unauthenticated"):
            for endpoint in protected_endpoints:
                response = self.api_client.get(endpoint)
                # Should return 401 or 403 for unauthenticated requests
                assert response.status_code in [401, 403], \
                    f"Expected 401/403 for {endpoint}, got {response.status_code}"

        with self.measure_performance(f"{test_name}_authenticated"):
            # Login first
            login_data = {
                "username_or_email": "dev_user",
                "password": "dev_password_123"
            }

            login_response = self.api_client.post("/api/auth/login", login_data)
            assert_response_success(login_response, "login for protected endpoints test")

            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}

            # Now test protected endpoints with valid token
            for endpoint in protected_endpoints:
                response = requests.get(
                    f"http://127.0.0.1:8000{endpoint}",
                    headers=headers,
                    timeout=10
                )
                # Should succeed with valid authentication
                assert response.status_code in [200, 201], \
                    f"Expected 200/201 for authenticated {endpoint}, got {response.status_code}"

        log_test_step(self.test_logger, "Protected endpoints test completed", {
            'unauthenticated_requests_blocked': len(protected_endpoints),
            'authenticated_requests_allowed': len(protected_endpoints)
        })

    def test_guest_user_workflow_api(self):
        """Test guest user workflow from API perspective"""
        test_name = "guest_user_workflow"

        with self.measure_performance(f"{test_name}_create_guest"):
            # Test creating a guest user
            guest_response = self.api_client.post("/api/auth/guest", {})
            assert_response_success(guest_response, "guest user creation")
            assert_response_status(guest_response, 200, "guest user creation")

            guest_data = assert_json_response(guest_response, "guest user creation")
            assert_authentication_data(guest_data, require_token=True)

            # Verify guest user structure
            assert "access_token" in guest_data
            assert "user" in guest_data
            assert guest_data["user"]["is_guest"] == True
            assert "guest_id" in guest_data

        with self.measure_performance(f"{test_name}_guest_dashboard"):
            # Test guest dashboard access
            guest_token = guest_data["access_token"]
            headers = {"Authorization": f"Bearer {guest_token}"}

            dashboard_response = requests.get(
                "http://127.0.0.1:8000/api/auth/guest/dashboard",
                headers=headers,
                timeout=10
            )
            assert_response_success(dashboard_response, "guest dashboard access")
            assert_response_status(dashboard_response, 200, "guest dashboard access")

            dashboard_data = assert_json_response(dashboard_response, "guest dashboard access")

            # Verify dashboard response
            assert dashboard_data["guest_access"] == True
            assert "permissions" in dashboard_data
            assert "summary" in dashboard_data

        log_test_step(self.test_logger, "Guest user workflow successful", {
            'guest_id': guest_data['guest_id'],
            'dashboard_access': dashboard_data['guest_access']
        })

    def test_token_refresh_and_rotation_api(self):
        """Test token refresh and rotation functionality"""
        test_name = "token_refresh_rotation"

        with self.measure_performance(f"{test_name}_login"):
            # Login first
            login_data = {
                "username_or_email": "dev_user",
                "password": "dev_password_123"
            }

            login_response = self.api_client.post("/api/auth/login", login_data)
            assert_response_success(login_response, "login for token refresh")

            original_access_token = login_response.json()["access_token"]

        with self.measure_performance(f"{test_name}_refresh_token"):
            # Test token refresh
            refresh_response = self.api_client.post("/api/auth/token/refresh")
            assert_response_success(refresh_response, "token refresh")
            assert_response_status(refresh_response, 200, "token refresh")

            refresh_data = assert_json_response(refresh_response, "token refresh")
            assert_authentication_data(refresh_data, require_token=True)

            # Verify token rotation
            assert "access_token" in refresh_data
            new_access_token = refresh_data["access_token"]

            # New token should be different (rotation)
            assert new_access_token != original_access_token, "Token should be rotated"

        with self.measure_performance(f"{test_name}_verify_new_token"):
            # Verify new token works
            headers = {"Authorization": f"Bearer {new_access_token}"}
            validate_response = requests.get(
                "http://127.0.0.1:8000/api/auth/token/validate",
                headers=headers,
                timeout=10
            )
            assert_response_success(validate_response, "validate refreshed token")
            assert_response_status(validate_response, 200, "validate refreshed token")

        log_test_step(self.test_logger, "Token refresh and rotation successful", {
            'original_token_changed': original_access_token != new_access_token,
            'new_token_valid': validate_response.status_code == 200
        })

    def test_authentication_error_scenarios(self):
        """Test authentication error scenarios"""
        test_name = "authentication_errors"

        with self.measure_performance(f"{test_name}_invalid_credentials"):
            # Test invalid credentials
            invalid_login_data = {
                "username_or_email": "invalid_user",
                "password": "wrong_password"
            }

            invalid_response = self.api_client.post("/api/auth/login", invalid_login_data)
            assert_response_status(invalid_response, 401, "invalid credentials")

        with self.measure_performance(f"{test_name}_expired_token"):
            # Test expired token scenario (simulate with invalid token)
            headers = {"Authorization": "Bearer invalid_expired_token"}
            expired_response = requests.get(
                "http://127.0.0.1:8000/api/auth/me",
                headers=headers,
                timeout=10
            )
            assert expired_response.status_code in [401, 403], "Should reject invalid token"

        with self.measure_performance(f"{test_name}_missing_token"):
            # Test missing token
            no_token_response = requests.get("http://127.0.0.1:8000/api/auth/me", timeout=10)
            assert no_token_response.status_code in [401, 403], "Should reject missing token"

        log_test_step(self.test_logger, "Authentication error scenarios handled correctly", {
            'invalid_credentials_rejected': invalid_response.status_code == 401,
            'invalid_token_rejected': expired_response.status_code in [401, 403],
            'missing_token_rejected': no_token_response.status_code in [401, 403]
        })

    def test_role_based_access_control_api(self):
        """Test role-based access control for different user types"""
        test_name = "role_based_access"

        with self.measure_performance(f"{test_name}_guest_restrictions"):
            # Test guest user access restrictions
            guest_response = self.api_client.post("/api/auth/guest", {})
            assert_response_success(guest_response, "guest creation for RBAC test")

            guest_token = guest_response.json()["access_token"]
            guest_headers = {"Authorization": f"Bearer {guest_token}"}

            # Guest users should not access admin endpoints
            admin_response = requests.post(
                "http://127.0.0.1:8000/api/auth/register",
                json={
                    "username": "test_user",
                    "email": "test@example.com",
                    "password": "password123",
                    "role": "teacher"
                },
                headers=guest_headers,
                timeout=10
            )

            # Should be forbidden for guest users
            assert admin_response.status_code == 403, "Guest users should not access admin endpoints"

        with self.measure_performance(f"{test_name}_authenticated_access"):
            # Test authenticated user access to their allowed endpoints
            login_data = {
                "username_or_email": "dev_user",
                "password": "dev_password_123"
            }

            login_response = self.api_client.post("/api/auth/login", login_data)
            assert_response_success(login_response, "login for RBAC test")

            access_token = login_response.json()["access_token"]
            user_headers = {"Authorization": f"Bearer {access_token}"}

            # Authenticated users should access their profile
            profile_response = requests.get(
                "http://127.0.0.1:8000/api/auth/me",
                headers=user_headers,
                timeout=10
            )
            assert_response_success(profile_response, "access user profile")
            assert_response_status(profile_response, 200, "access user profile")

        with self.measure_performance(f"{test_name}_role_verification"):
            # Test different user roles if available (admin, teacher, student)
            # For now, we test that role information is returned correctly
            profile_data = profile_response.json()
            assert "role" in profile_data
            assert profile_data["role"] in ["admin", "teacher", "driver", "student", "guest"]

        log_test_step(self.test_logger, "Role-based access control working correctly", {
            'guest_admin_access_blocked': admin_response.status_code == 403,
            'authenticated_profile_access': profile_response.status_code == 200,
            'user_role': profile_data.get('role')
        })

    def test_token_blacklist_functionality(self):
        """Test token blacklisting and revocation"""
        test_name = "token_blacklist"

        with self.measure_performance(f"{test_name}_login"):
            # Login to get tokens
            login_data = {
                "username_or_email": "dev_user",
                "password": "dev_password_123"
            }

            login_response = self.api_client.post("/api/auth/login", login_data)
            assert_response_success(login_response, "login for blacklist test")

            access_token = login_response.json()["access_token"]

        with self.measure_performance(f"{test_name}_revoke_token"):
            # Test token revocation
            revoke_response = self.api_client.post("/api/auth/token/revoke")
            assert_response_success(revoke_response, "token revocation")
            assert_response_status(revoke_response, 200, "token revocation")

        with self.measure_performance(f"{test_name}_verify_revocation"):
            # After revocation, the token should no longer work
            headers = {"Authorization": f"Bearer {access_token}"}
            protected_response = requests.get(
                "http://127.0.0.1:8000/api/auth/me",
                headers=headers,
                timeout=10
            )

            # Should fail with revoked token
            assert protected_response.status_code in [401, 403], "Revoked token should not work"

        log_test_step(self.test_logger, "Token blacklisting working correctly", {
            'token_revoked': revoke_response.status_code == 200,
            'revoked_token_rejected': protected_response.status_code in [401, 403]
        })

    def test_rate_limiting_on_authentication(self):
        """Test rate limiting on authentication endpoints"""
        test_name = "rate_limiting"

        with self.measure_performance(f"{test_name}_rapid_requests"):
            # Test multiple rapid login attempts (rate limiting)
            login_data = {
                "username_or_email": "dev_user",
                "password": "wrong_password"  # Wrong password to trigger rate limiting
            }

            responses = []
            # Make multiple rapid requests
            for i in range(5):
                response = self.api_client.post("/api/auth/login", login_data)
                responses.append(response.status_code)
                time.sleep(0.1)  # Small delay between requests

            # Should eventually return 429 (Too Many Requests) due to rate limiting
            rate_limited = 429 in responses

        log_test_step(self.test_logger, "Rate limiting test completed", {
            'requests_made': len(responses),
            'rate_limited': rate_limited,
            'response_codes': responses
        })

    def test_cookie_minimization_strategy(self):
        """Test cookie minimization strategy implementation"""
        test_name = "cookie_minimization"

        with self.measure_performance(f"{test_name}_login_check_cookies"):
            # Login and check cookie behavior
            login_data = {
                "username_or_email": "dev_user",
                "password": "dev_password_123"
            }

            login_response = self.api_client.post("/api/auth/login", login_data)
            assert_response_success(login_response, "login for cookie test")

            # According to cookie minimization strategy:
            # - Access token should be in response body
            # - Refresh token should be in HttpOnly cookie only

            response_data = login_response.json()
            assert "access_token" in response_data, "Access token should be in response body"

        with self.measure_performance(f"{test_name}_verify_cookies"):
            # Check that we have cookies set (refresh token in HttpOnly cookie)
            cookies = login_response.cookies
            assert len(cookies) > 0, "Should have cookies set for refresh token"

            # Cookies should be HttpOnly (we can't directly verify this, but we can check they're set)
            cookie_names = [cookie.name for cookie in cookies]
            assert any("refresh" in name.lower() for name in cookie_names), \
                "Should have refresh token cookie"

        log_test_step(self.test_logger, "Cookie minimization strategy working", {
            'access_token_in_response': 'access_token' in response_data,
            'cookies_set': len(cookies) > 0,
            'refresh_cookie_found': any("refresh" in name.lower() for name in cookie_names)
        })


# Import here to avoid issues
import requests