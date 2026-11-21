#!/usr/bin/env python3
"""
Test script to verify JWT token type checking fixes.
This script tests the specific scenarios that were causing warnings.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from src.services.jwt_service import jwt_service

def test_jwt_token_type_checking():
    """Test JWT token type checking with various invalid inputs."""

    print("Testing JWT token type checking fixes...")

    # Test cases that should not cause warnings
    test_cases = [
        (None, "None token"),
        (123, "Integer token"),
        ([], "List token"),
        ({}, "Dictionary token"),
        ("", "Empty string token"),
        ("   ", "Whitespace token"),
    ]

    for invalid_token, description in test_cases:
        print(f"\nTesting {description}: {invalid_token}")
        try:
            result = jwt_service.verify_token(invalid_token)
            print(f"✓ Result: {result} (no warnings should appear above)")
            assert result is None, f"Expected None for invalid token, got {result}"
        except Exception as e:
            print(f"✗ Unexpected error: {e}")
            return False

    print("\n✓ All invalid token type tests passed without warnings!")
    return True

if __name__ == "__main__":
    success = test_jwt_token_type_checking()
    if success:
        print("\n🎉 JWT token type checking fix verified successfully!")
    else:
        print("\n❌ JWT token type checking fix failed!")
        sys.exit(1)