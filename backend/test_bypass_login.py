#!/usr/bin/env python3
"""
Test script for login bypass functionality.

This script tests the login bypass feature to ensure it works correctly
and provides proper security logging and error handling.
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

# Import our modules
from src.core.config.config import config
from src.api.v1.routers.auth import router
from src.core.models import get_db
from src.services.jwt_service import jwt_service

def test_bypass_login_enabled():
    """Test bypass login when enabled in configuration."""
    print("Testing bypass login when enabled...")
    
    # Create FastAPI app
    app = FastAPI()
    app.include_router(router)
    
    # Create test client
    client = TestClient(app)
    
    # Test bypass login endpoint
    response = client.post("/auth/bypass-login")
    
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Verify response
    if response.status_code == 200:
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["is_bypass_user"] == True
        assert data["user"]["username"] == config.LOGIN_BYPASS_USERNAME
        assert data["user"]["role"] == config.LOGIN_BYPASS_ROLE
        print("✅ Bypass login test passed!")
        return True
    else:
        print(f"❌ Bypass login test failed with status {response.status_code}")
        return False

def test_bypass_login_disabled():
    """Test bypass login when disabled in configuration."""
    print("\nTesting bypass login when disabled...")
    
    # Temporarily disable bypass login
    original_enabled = config.LOGIN_BYPASS_ENABLED
    config.LOGIN_BYPASS_ENABLED = False
    
    try:
        # Create FastAPI app
        app = FastAPI()
        app.include_router(router)
        
        # Create test client
        client = TestClient(app)
        
        # Test bypass login endpoint
        response = client.post("/auth/bypass-login")
        
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Verify response
        if response.status_code == 403:
            assert response.json()["detail"] == "Login bypass is disabled"
            print("✅ Bypass disabled test passed!")
            return True
        else:
            print(f"❌ Bypass disabled test failed with status {response.status_code}")
            return False
    finally:
        # Restore original setting
        config.LOGIN_BYPASS_ENABLED = original_enabled

def test_configuration_values():
    """Test that configuration values are set correctly."""
    print("\nTesting configuration values...")
    
    print(f"LOGIN_BYPASS_ENABLED: {config.LOGIN_BYPASS_ENABLED}")
    print(f"LOGIN_BYPASS_USERNAME: {config.LOGIN_BYPASS_USERNAME}")
    print(f"LOGIN_BYPASS_ROLE: {config.LOGIN_BYPASS_ROLE}")
    
    # Verify defaults
    assert config.LOGIN_BYPASS_ENABLED == True, "Default bypass should be enabled"
    assert config.LOGIN_BYPASS_USERNAME == "bypass_user", "Default username should be bypass_user"
    assert config.LOGIN_BYPASS_ROLE == "admin", "Default role should be admin"
    
    print("✅ Configuration test passed!")
    return True

def test_jwt_token_generation():
    """Test that JWT tokens are generated correctly for bypass user."""
    print("\nTesting JWT token generation...")
    
    # Test token pair generation
    token_pair = jwt_service.create_token_pair(
        username=config.LOGIN_BYPASS_USERNAME,
        device_id="test_device",
        session_id="test_session",
        role=config.LOGIN_BYPASS_ROLE,
        is_guest=False
    )
    
    print(f"Access token generated: {bool(token_pair.access_token)}")
    print(f"Refresh token generated: {bool(token_pair.refresh_token)}")
    
    # Verify tokens
    assert token_pair.access_token, "Access token should be generated"
    assert token_pair.refresh_token, "Refresh token should be generated"
    
    # Test token verification
    claims = jwt_service.verify_token(token_pair.access_token)
    assert claims is not None, "Token should be verifiable"
    assert claims.sub == config.LOGIN_BYPASS_USERNAME, "Token should contain correct username"
    assert claims.role == config.LOGIN_BYPASS_ROLE, "Token should contain correct role"
    
    print("✅ JWT token generation test passed!")
    return True

def main():
    """Run all tests."""
    print("🧪 Testing Login Bypass Implementation")
    print("=" * 50)
    
    tests = [
        test_configuration_values,
        test_jwt_token_generation,
        test_bypass_login_enabled,
        test_bypass_login_disabled,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
            failed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed! Login bypass implementation is working correctly.")
        return 0
    else:
        print("💥 Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)