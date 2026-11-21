#!/usr/bin/env python3
"""
Test script for verifying the /auth/guest endpoint health and functionality.

This script tests:
- Guest user creation
- Response format validation
- CORS headers
- Rate limiting
- Error handling
"""

import requests
import json
import time
import sys
from typing import Dict, Any, List

# Configuration
BASE_URL = "http://localhost:8000"
GUEST_ENDPOINT = f"{BASE_URL}/api/auth/guest"
FRONTEND_ORIGIN = "http://localhost:5173"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test(name: str, passed: bool, message: str = ""):
    """Print test result with color coding."""
    status = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if passed else f"{Colors.RED}✗ FAIL{Colors.RESET}"
    print(f"{status} - {name}")
    if message:
        print(f"       {message}")

def test_health_check() -> bool:
    """Test the health check endpoint."""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok":
                print_test("Health Check", True, "API is healthy")
                return True
        print_test("Health Check", False, f"Unexpected response: {response.status_code}")
        return False
    except Exception as e:
        print_test("Health Check", False, f"Error: {str(e)}")
        return False

def test_guest_creation() -> bool:
    """Test guest user creation."""
    try:
        headers = {
            "Content-Type": "application/json",
            "Origin": FRONTEND_ORIGIN
        }
        response = requests.post(GUEST_ENDPOINT, headers=headers, timeout=10)
        
        if response.status_code != 200:
            print_test("Guest Creation", False, f"Status code: {response.status_code}")
            return False
        
        data = response.json()
        
        # Validate response structure
        required_fields = ["access_token", "refresh_token", "user", "guest_id", "expires_at", "is_guest"]
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            print_test("Guest Creation", False, f"Missing fields: {missing_fields}")
            return False
        
        # Validate user object
        user_fields = ["id", "username", "email", "role", "is_active", "is_guest"]
        user_missing = [field for field in user_fields if field not in data["user"]]
        
        if user_missing:
            print_test("Guest Creation", False, f"Missing user fields: {user_missing}")
            return False
        
        # Check guest-specific fields
        if not data["user"].get("is_guest"):
            print_test("Guest Creation", False, "User is not marked as guest")
            return False
        
        if not data.get("guest_id"):
            print_test("Guest Creation", False, "Missing guest_id")
            return False
        
        print_test("Guest Creation", True, f"Created guest: {data['user']['username']}")
        return True
        
    except Exception as e:
        print_test("Guest Creation", False, f"Error: {str(e)}")
        return False

def test_cors_headers() -> bool:
    """Test CORS headers with preflight request."""
    try:
        headers = {
            "Origin": FRONTEND_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
        response = requests.options(GUEST_ENDPOINT, headers=headers, timeout=5)
        
        # Check CORS headers
        required_headers = [
            "access-control-allow-origin",
            "access-control-allow-methods",
            "access-control-allow-credentials"
        ]
        
        missing_headers = []
        for header in required_headers:
            if header not in response.headers:
                missing_headers.append(header)
        
        if missing_headers:
            print_test("CORS Headers", False, f"Missing headers: {missing_headers}")
            return False
        
        # Check if origin is allowed
        if response.headers.get("access-control-allow-origin") != FRONTEND_ORIGIN:
            print_test("CORS Headers", False, "Origin not in allow list")
            return False
        
        if "POST" not in response.headers.get("access-control-allow-methods", ""):
            print_test("CORS Headers", False, "POST not in allowed methods")
            return False
        
        print_test("CORS Headers", True, "CORS properly configured")
        return True
        
    except Exception as e:
        print_test("CORS Headers", False, f"Error: {str(e)}")
        return False

def test_rate_limiting() -> bool:
    """Test rate limiting by making multiple requests."""
    try:
        print(f"\n{Colors.BLUE}Testing rate limiting (making 12 requests)...{Colors.RESET}")
        
        # Make 12 requests to trigger rate limit (limit is 10/hour)
        responses: List[int] = []
        for i in range(12):
            response = requests.post(GUEST_ENDPOINT, timeout=5)
            responses.append(response.status_code)
            time.sleep(0.1)  # Small delay to avoid overwhelming
        
        # Count successes and rate limits
        success_count = responses.count(200)
        rate_limited_count = responses.count(429)
        
        print(f"  Responses: {success_count} success, {rate_limited_count} rate limited")
        
        if success_count <= 10 and rate_limited_count >= 1:
            print_test("Rate Limiting", True, f"Rate limit working: {success_count} allowed, {rate_limited_count} blocked")
            return True
        else:
            print_test("Rate Limiting", False, f"Expected <=10 success and >=1 rate limited, got {success_count} success, {rate_limited_count} rate limited")
            return False
            
    except Exception as e:
        print_test("Rate Limiting", False, f"Error: {str(e)}")
        return False

def test_cookies() -> bool:
    """Test that cookies are set properly."""
    try:
        response = requests.post(GUEST_ENDPOINT, timeout=5)
        
        # Check for cookies in the response
        if "access_token" not in response.cookies:
            print_test("Cookies", False, "Missing access_token cookie")
            return False
        
        if "refresh_token" not in response.cookies:
            print_test("Cookies", False, "Missing refresh_token cookie")
            return False
        
        # Verify cookies have values
        access_token = response.cookies["access_token"]
        refresh_token = response.cookies["refresh_token"]
        
        if not access_token or not refresh_token:
            print_test("Cookies", False, "Cookies are empty")
            return False
        
        # Cookies are set successfully
        print_test("Cookies", True, "Access and refresh tokens set as cookies")
        return True
        
    except Exception as e:
        print_test("Cookies", False, f"Error: {str(e)}")
        return False

def test_response_format() -> bool:
    """Test the response format matches expected structure."""
    try:
        response = requests.post(GUEST_ENDPOINT, timeout=5)
        data = response.json()
        
        # Check token type
        if data.get("token_type") != "bearer":
            print_test("Response Format", False, f"Invalid token_type: {data.get('token_type')}")
            return False
        
        # Check expires_at is valid datetime
        expires_at = data.get("expires_at")
        if not expires_at:
            print_test("Response Format", False, "Missing expires_at")
            return False
        
        # Try to parse datetime (ISO format)
        try:
            from datetime import datetime
            datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        except:
            print_test("Response Format", False, "Invalid expires_at format")
            return False
        
        # Check access_token and refresh_token are non-empty strings
        if not isinstance(data.get("access_token"), str) or not data.get("access_token"):
            print_test("Response Format", False, "Invalid access_token")
            return False
        
        if not isinstance(data.get("refresh_token"), str) or not data.get("refresh_token"):
            print_test("Response Format", False, "Invalid refresh_token")
            return False
        
        print_test("Response Format", True, "Response format is correct")
        return True
        
    except Exception as e:
        print_test("Response Format", False, f"Error: {str(e)}")
        return False

def main():
    """Run all tests and report results."""
    print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}Guest Endpoint Health Check{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}\n")
    
    tests = [
        ("Health Check", test_health_check),
        ("Guest Creation", test_guest_creation),
        ("CORS Headers", test_cors_headers),
        ("Response Format", test_response_format),
        ("Cookies", test_cookies),
        ("Rate Limiting", test_rate_limiting),
    ]
    
    results: List[bool] = []
    for name, test_func in tests:
        print(f"\n{Colors.BOLD}Running: {name}{Colors.RESET}")
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print_test(name, False, f"Unexpected error: {str(e)}")
            results.append(False)
    
    # Summary
    print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}Test Summary{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}")
    
    passed = sum(results)
    total = len(results)
    
    for (name, _), result in zip(tests, results):
        status = f"{Colors.GREEN}PASS{Colors.RESET}" if result else f"{Colors.RED}FAIL{Colors.RESET}"
        print(f"  {status} - {name}")
    
    print(f"\n{Colors.BOLD}Total: {passed}/{total} tests passed{Colors.RESET}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ All tests passed!{Colors.RESET}")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}✗ Some tests failed{Colors.RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
