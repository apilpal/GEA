#!/usr/bin/env python3
"""
Simple API test for login functionality
Tests bypass login and standard authentication flows
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    """Test backend health"""
    print("Testing backend health...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            print("✓ Backend is healthy")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_bypass_login():
    """Test bypass login functionality"""
    print("\nTesting bypass login...")
    try:
        response = requests.post(f"{BASE_URL}/api/auth/bypass-login")
        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✓ Bypass login successful")
            print(f"  User: {data.get('user', {}).get('username')}")
            print(f"  Role: {data.get('user', {}).get('role')}")
            print(f"  Is bypass user: {data.get('user', {}).get('is_bypass_user')}")
            return True
        elif response.status_code == 403:
            print("✓ Bypass login correctly disabled")
            return True
        else:
            print(f"❌ Bypass login failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Bypass login error: {e}")
        return False

def test_standard_login():
    """Test standard login with valid credentials"""
    print("\nTesting standard login with valid credentials...")
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username_or_email": "admin",
            "password": "admin123"
        })
        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✓ Standard login successful")
            print(f"  Access token present: {'access_token' in data}")
            return True
        else:
            print(f"❌ Standard login failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Standard login error: {e}")
        return False

def test_invalid_login():
    """Test login with invalid credentials"""
    print("\nTesting login with invalid credentials...")
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username_or_email": "invalid",
            "password": "wrong"
        })
        print(f"Status: {response.status_code}")

        if response.status_code == 401:
            print("✓ Invalid login correctly rejected")
            return True
        else:
            print(f"❌ Invalid login should return 401, got: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Invalid login error: {e}")
        return False

def test_guest_login():
    """Test guest login functionality"""
    print("\nTesting guest login...")
    try:
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✓ Guest login successful")
            print(f"  Guest user: {data.get('user', {}).get('username')}")
            print(f"  Role: {data.get('user', {}).get('role')}")
            return True
        else:
            print(f"❌ Guest login failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Guest login error: {e}")
        return False

def test_frontend_backend_integration():
    """Test that frontend can communicate with backend"""
    print("\nTesting frontend-backend integration...")
    try:
        # Test CORS headers
        response = requests.options(f"{BASE_URL}/api/auth/login", headers={
            'Origin': 'http://127.0.0.1:5173',
            'Access-Control-Request-Method': 'POST'
        })
        cors_headers = response.headers

        has_cors = 'access-control-allow-origin' in cors_headers
        print(f"✓ CORS headers present: {has_cors}")

        # Test that API endpoints are accessible
        response = requests.get(f"{BASE_URL}/api/dashboard/public/stats")
        if response.status_code in [200, 429]:  # 429 is rate limited
            print("✓ Public API accessible")
            return True
        else:
            print(f"❌ Public API not accessible: {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ Integration test error: {e}")
        return False

def main():
    """Run all login tests"""
    print("🔍 Login API Tests")
    print("=" * 50)

    if not test_health():
        print("❌ Cannot proceed without healthy backend")
        return

    results = []

    # Test authentication flows
    results.append(("Bypass Login", test_bypass_login()))
    results.append(("Standard Login", test_standard_login()))
    results.append(("Invalid Login", test_invalid_login()))
    results.append(("Guest Login", test_guest_login()))
    results.append(("Frontend-Backend Integration", test_frontend_backend_integration()))

    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    passed = 0
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name}: {status}")
        if result:
            passed += 1

    print(f"\n📈 Overall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All login API tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed.")
        return 1

if __name__ == "__main__":
    exit(main())