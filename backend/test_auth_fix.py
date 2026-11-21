#!/usr/bin/env python3
"""
Test script to verify that the authentication fix works correctly.
Tests both cookie-based and header-based authentication methods.
"""

import asyncio
import httpx
import json
import sys
from pathlib import Path

async def test_authentication_fix():
    """Test that authentication works with both cookies and headers."""
    base_url = "http://localhost:8001"
    test_username = "testuser"
    test_password = "testpass123"

    async with httpx.AsyncClient() as client:
        print("🔍 Testing authentication fix...")

        # Test 1: Check if server is running
        try:
            response = await client.get(f"{base_url}/api/health")
            if response.status_code != 200:
                print("❌ Server health check failed")
                return False
            print("✅ Server is running")
        except Exception as e:
            print(f"❌ Cannot connect to server: {e}")
            return False

        # Test 2: Try to access protected endpoint without authentication (should fail)
        try:
            response = await client.get(f"{base_url}/api/auth/me")
            if response.status_code == 401:
                print("✅ Unauthenticated access correctly blocked")
            else:
                print(f"❌ Expected 401 for unauthenticated access, got {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error testing unauthenticated access: {e}")
            return False

        # Test 3: Try to login with a known test user or create one via admin
        try:
            # Try to login with the dev user first
            login_data = {
                "username_or_email": "dev_user",
                "password": "dev_password_123"
            }

            response = await client.post(f"{base_url}/api/auth/login", json=login_data)

            if response.status_code != 200:
                print(f"❌ Login failed with status {response.status_code}: {response.text}")
                return False

            # Extract tokens and cookies
            login_result = response.json()
            access_token = login_result.get("access_token")

            if not access_token:
                print("❌ No access token in login response")
                return False

            print("✅ Login successful")

            # Test 4: Access protected endpoint with header authentication
            headers = {"Authorization": f"Bearer {access_token}"}
            response = await client.get(f"{base_url}/api/auth/me", headers=headers)

            if response.status_code != 200:
                print(f"❌ Header authentication failed: {response.status_code}")
                return False

            user_data = response.json()
            print("✅ Header-based authentication works")

            # Test 5: Access protected endpoint with cookie authentication
            # The cookies should have been set by the login endpoint
            response = await client.get(f"{base_url}/api/auth/me")

            if response.status_code != 200:
                print(f"❌ Cookie authentication failed: {response.status_code}")
                return False

            cookie_user_data = response.json()
            print("✅ Cookie-based authentication works")

            # Verify both methods return the same user
            if user_data.get("username") != cookie_user_data.get("username"):
                print("❌ Different users returned by header vs cookie auth")
                return False

            print("✅ Both authentication methods return consistent results")

            # Test 6: Test logout (clears cookies)
            response = await client.post(f"{base_url}/api/auth/logout")

            if response.status_code != 200:
                print(f"❌ Logout failed: {response.status_code}")
                return False

            print("✅ Logout successful")

            # Test 7: Verify cookie authentication no longer works after logout
            response = await client.get(f"{base_url}/api/auth/me")

            if response.status_code == 401:
                print("✅ Cookie authentication correctly blocked after logout")
            else:
                print(f"❌ Expected 401 after logout, got {response.status_code}")
                return False

            # Test 8: Test guest user authentication flow
            print("\n🔍 Testing guest user authentication...")

            # Create guest user
            guest_response = await client.post(f"{base_url}/api/auth/guest")
            if guest_response.status_code != 200:
                print(f"❌ Guest user creation failed: {guest_response.status_code}")
                return False

            guest_data = guest_response.json()
            guest_token = guest_data.get("access_token")

            if not guest_token:
                print("❌ No access token in guest creation response")
                return False

            print("✅ Guest user created successfully")

            # Test guest dashboard access
            guest_headers = {"Authorization": f"Bearer {guest_token}"}
            dashboard_response = await client.get(f"{base_url}/api/auth/guest/dashboard", headers=guest_headers)

            if dashboard_response.status_code != 200:
                print(f"❌ Guest dashboard access failed: {dashboard_response.status_code}")
                return False

            dashboard_data = dashboard_response.json()
            if not dashboard_data.get("guest_access"):
                print("❌ Guest dashboard did not return guest_access=true")
                return False

            print("✅ Guest dashboard access works")

            # Test guest token refresh
            refresh_response = await client.post(f"{base_url}/api/auth/refresh")
            if refresh_response.status_code != 200:
                print(f"❌ Guest token refresh failed: {refresh_response.status_code}")
                return False

            new_token = refresh_response.json().get("access_token")
            if not new_token or new_token == guest_token:
                print("❌ Guest token refresh did not return new token")
                return False

            print("✅ Guest token refresh works")

            # Test guest-to-registered conversion
            convert_data = {
                "guest_id": guest_data.get("guest_id"),
                "username": "converted_guest_user",
                "email": "converted@example.com",
                "password": "converted_password_123"
            }

            convert_response = await client.post(f"{base_url}/api/auth/convert-guest", json=convert_data)
            if convert_response.status_code != 200:
                print(f"❌ Guest conversion failed: {convert_response.status_code}")
                return False

            converted_data = convert_response.json()
            if converted_data.get("username") != "converted_guest_user":
                print("❌ Guest conversion did not return correct username")
                return False

            print("✅ Guest-to-registered conversion works")

            # Test 9: Test guest user cleanup (admin only)
            # Login as admin first to test cleanup
            admin_login = {
                "username_or_email": "dev_user",  # Assuming dev_user is admin
                "password": "dev_password_123"
            }

            admin_response = await client.post(f"{base_url}/api/auth/login", json=admin_login)
            if admin_response.status_code == 200:
                admin_token = admin_response.json().get("access_token")

                if admin_token:
                    admin_headers = {"Authorization": f"Bearer {admin_token}"}
                    cleanup_response = await client.post(f"{base_url}/api/auth/cleanup-guests", headers=admin_headers)

                    if cleanup_response.status_code == 200:
                        print("✅ Guest cleanup endpoint works")
                    else:
                        print(f"⚠️ Guest cleanup failed (may be expected): {cleanup_response.status_code}")

            return True

        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            return False

if __name__ == "__main__":
    async def main():
        success = await test_authentication_fix()
        if success:
            print("\n🎉 All authentication tests passed!")
            print("✅ The authentication fix is working correctly")
            print("✅ Both header and cookie-based authentication work")
            print("✅ Users can now login successfully")
            print("✅ Guest-first architecture is working correctly")
            print("✅ Guest user creation, dashboard access, and conversion work")
        else:
            print("\n💥 Some tests failed")
            sys.exit(1)

    asyncio.run(main())