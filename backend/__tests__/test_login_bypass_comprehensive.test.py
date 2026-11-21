"""
Comprehensive tests for login bypass feature implementation.

Tests all aspects of the login bypass functionality including:
- Backend endpoint functionality and configuration
- Frontend integration and UI components
- Authentication context and service layer
- Security features and audit logging
- Error handling and edge cases
- Integration testing across frontend and backend
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch, Mock
from fastapi.testclient import TestClient
from fastapi import FastAPI, Response
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import json
import os


class TestLoginBypassBackend:
    """Test suite for backend login bypass functionality."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def test_app(self):
        """Create test FastAPI application."""
        app = FastAPI()
        from src.api.v1.routers.auth import router
        app.include_router(router)
        return app

    @pytest.fixture
    def client(self, test_app):
        """Create test client."""
        return TestClient(test_app)

    @pytest.fixture
    def bypass_config_enabled(self):
        """Mock configuration for bypass enabled."""
        with patch('src.api.v1.routers.auth.config') as mock_config:
            mock_config.LOGIN_BYPASS_ENABLED = True
            mock_config.LOGIN_BYPASS_USERNAME = "bypass_user"
            mock_config.LOGIN_BYPASS_ROLE = "admin"
            mock_config.is_production = False
            yield mock_config

    @pytest.fixture
    def bypass_config_disabled(self):
        """Mock configuration for bypass disabled."""
        with patch('src.api.v1.routers.auth.config') as mock_config:
            mock_config.LOGIN_BYPASS_ENABLED = False
            mock_config.LOGIN_BYPASS_USERNAME = "bypass_user"
            mock_config.LOGIN_BYPASS_ROLE = "admin"
            yield mock_config

    @pytest.fixture
    def mock_jwt_service(self):
        """Mock JWT service for testing."""
        mock_service = MagicMock()
        mock_token_pair = MagicMock()
        mock_token_pair.access_token = "test_access_token"
        mock_token_pair.refresh_token = "test_refresh_token"
        mock_service.create_token_pair.return_value = mock_token_pair
        mock_service.audit_logger = MagicMock()
        mock_service.audit_logger.log_login = AsyncMock()
        return mock_service

    # Configuration Tests
    @patch('src.api.v1.routers.auth.config')
    def test_bypass_config_loading_enabled(self, mock_config, client):
        """Test that bypass configuration loads correctly when enabled."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        mock_config.LOGIN_BYPASS_USERNAME = "test_bypass_user"
        mock_config.LOGIN_BYPASS_ROLE = "admin"
        mock_config.is_production = False

        # Act
        with patch('src.api.v1.routers.auth.jwt_service') as mock_jwt:
            mock_token_pair = MagicMock()
            mock_token_pair.access_token = "test_access_token"
            mock_token_pair.refresh_token = "test_refresh_token"
            mock_jwt.create_token_pair.return_value = mock_token_pair
            mock_jwt.audit_logger = MagicMock()
            mock_jwt.audit_logger.log_login = AsyncMock()
            
            response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "test_access_token"
        assert data["user"]["username"] == "test_bypass_user"
        assert data["user"]["role"] == "admin"
        assert data["user"]["is_bypass_user"] is True

    @patch('src.api.v1.routers.auth.config')
    def test_bypass_config_loading_disabled(self, mock_config, client):
        """Test that bypass is properly blocked when disabled."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = False

        # Act
        response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 403
        data = response.json()
        assert "Login bypass is disabled" in data["detail"]

    @patch('src.api.v1.routers.auth.config')
    def test_bypass_config_custom_username_and_role(self, mock_config, client):
        """Test bypass with custom username and role configuration."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        mock_config.LOGIN_BYPASS_USERNAME = "custom_dev_user"
        mock_config.LOGIN_BYPASS_ROLE = "teacher"
        mock_config.is_production = False

        # Act
        with patch('src.api.v1.routers.auth.jwt_service') as mock_jwt:
            mock_token_pair = MagicMock()
            mock_token_pair.access_token = "test_access_token"
            mock_token_pair.refresh_token = "test_refresh_token"
            mock_jwt.create_token_pair.return_value = mock_token_pair
            mock_jwt.audit_logger = MagicMock()
            mock_jwt.audit_logger.log_login = AsyncMock()
            
            response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["username"] == "custom_dev_user"
        assert data["user"]["role"] == "teacher"

    # Endpoint Functionality Tests
    @patch('src.api.v1.routers.auth.config')
    def test_bypass_login_success(self, mock_config, client, mock_jwt_service):
        """Test successful bypass login operation."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        mock_config.LOGIN_BYPASS_USERNAME = "bypass_user"
        mock_config.LOGIN_BYPASS_ROLE = "admin"
        mock_config.is_production = False

        with patch('src.api.v1.routers.auth.jwt_service', mock_jwt_service):
            # Act
            response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["is_bypass_user"] is True
        assert data["user"]["username"] == "bypass_user"
        
        # Verify JWT service was called with correct parameters
        mock_jwt_service.create_token_pair.assert_called_once_with(
            username="bypass_user",
            device_id="bypass_device",
            session_id=mock.ANY,  # Should be a random session ID
            role="admin",
            is_guest=False
        )

    @patch('src.api.v1.routers.auth.config')
    def test_bypass_login_sets_cookies(self, mock_config, client, mock_jwt_service):
        """Test that bypass login properly sets HttpOnly cookies."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        mock_config.is_production = False  # Development mode

        with patch('src.api.v1.routers.auth.jwt_service', mock_jwt_service):
            # Act
            response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 200
        
        # Check cookies are set
        assert "refresh_token" in response.cookies
        cookie = response.cookies["refresh_token"]
        assert cookie == "test_refresh_token"
        
        # Check cookie properties
        cookie_header = response.headers.get("set-cookie", "")
        assert "HttpOnly" in cookie_header
        assert "SameSite=strict" in cookie_header
        assert "Secure=" in cookie_header  # Should be present but false in dev

    @patch('src.api.v1.routers.auth.config')
    @patch('src.api.v1.routers.auth.jwt_service')
    def test_bypass_login_production_security(self, mock_jwt, mock_config, client):
        """Test that bypass login uses production security settings in production mode."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        mock_config.is_production = True  # Production mode

        mock_token_pair = MagicMock()
        mock_token_pair.access_token = "test_access_token"
        mock_token_pair.refresh_token = "test_refresh_token"
        mock_jwt.create_token_pair.return_value = mock_token_pair
        mock_jwt.audit_logger = MagicMock()
        mock_jwt.audit_logger.log_login = AsyncMock()

        # Act
        response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 200
        cookie_header = response.headers.get("set-cookie", "")
        assert "Secure" in cookie_header

    # Security and Audit Tests
    @patch('src.api.v1.routers.auth.config')
    def test_bypass_login_audit_logging(self, mock_config, client, mock_jwt_service):
        """Test that bypass login properly logs for audit trail."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        mock_config.is_production = False

        with patch('src.api.v1.routers.auth.jwt_service', mock_jwt_service):
            # Act
            response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 200
        
        # Verify audit logging was called
        mock_jwt_service.audit_logger.log_login.assert_called_once_with(
            client, "bypass_user", "bypass_device", "127.0.0.1", True, "login_bypass_used"
        )

    @patch('src.api.v1.routers.auth.config')
    def test_bypass_login_disabled_audit(self, mock_config, client):
        """Test that bypass attempts are logged when disabled."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = False
        mock_logger = MagicMock()
        
        with patch('src.api.v1.routers.auth.logger', mock_logger):
            # Act
            response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 403
        mock_logger.warning.assert_called_once_with("Login bypass attempt when disabled")

    @patch('src.api.v1.routers.auth.config')
    def test_bypass_user_model_properties(self, mock_config, client, mock_jwt_service):
        """Test that bypass user has correct model properties."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        mock_config.is_production = False

        with patch('src.api.v1.routers.auth.jwt_service', mock_jwt_service):
            # Act
            response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 200
        data = response.json()
        user = data["user"]
        
        # Verify bypass user properties
        assert user["is_bypass_user"] is True
        assert user["username"] == "bypass_user"
        assert user["role"] == "admin"
        assert user["is_active"] is True
        assert "email" in user
        assert user["email"] == "bypass_user@bypass.local"

    # Error Handling Tests
    @patch('src.api.v1.routers.auth.config')
    def test_bypass_login_jwt_service_error(self, mock_config, client):
        """Test error handling when JWT service fails."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        mock_config.is_production = False

        with patch('src.api.v1.routers.auth.jwt_service') as mock_jwt:
            mock_jwt.create_token_pair.side_effect = Exception("JWT service error")
            mock_logger = MagicMock()
            with patch('src.api.v1.routers.auth.logger', mock_logger):
                # Act
                response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 500
        data = response.json()
        assert "Bypass login failed" in data["detail"]
        mock_logger.error.assert_called_once()

    @patch('src.api.v1.routers.auth.config')
    @patch('src.api.v1.routers.auth.jwt_service')
    def test_bypass_login_audit_log_error(self, mock_jwt, mock_config, client):
        """Test error handling when audit logging fails."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        mock_config.is_production = False

        mock_token_pair = MagicMock()
        mock_token_pair.access_token = "test_access_token"
        mock_token_pair.refresh_token = "test_refresh_token"
        mock_jwt.create_token_pair.return_value = mock_token_pair
        mock_jwt.audit_logger = MagicMock()
        mock_jwt.audit_logger.log_login.side_effect = Exception("Audit error")

        mock_logger = MagicMock()
        with patch('src.api.v1.routers.auth.logger', mock_logger):
            # Act
            response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 500
        data = response.json()
        assert "Bypass login failed" in data["detail"]

    # Configuration Edge Cases
    @patch('src.api.v1.routers.auth.config')
    def test_bypass_config_empty_username(self, mock_config, client, mock_jwt_service):
        """Test bypass login with empty username configuration."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        mock_config.LOGIN_BYPASS_USERNAME = ""  # Empty username
        mock_config.LOGIN_BYPASS_ROLE = "admin"
        mock_config.is_production = False

        with patch('src.api.v1.routers.auth.jwt_service', mock_jwt_service):
            # Act
            response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["username"] == ""

    @patch('src.api.v1.routers.auth.config')
    def test_bypass_config_invalid_role(self, mock_config, client, mock_jwt_service):
        """Test bypass login with invalid role configuration."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        mock_config.LOGIN_BYPASS_USERNAME = "bypass_user"
        mock_config.LOGIN_BYPASS_ROLE = "invalid_role"  # Invalid role
        mock_config.is_production = False

        with patch('src.api.v1.routers.auth.jwt_service', mock_jwt_service):
            # This should work since role validation might happen later in the process
            # Act
            response = client.post("/auth/bypass-login")

        # Assert
        assert response.status_code == 200

    # Integration Tests
    @pytest.mark.asyncio
    async def test_bypass_login_integration_with_database(self, mock_db, mock_jwt_service):
        """Test bypass login integration with database session."""
        # Arrange
        from src.api.v1.routers.auth import bypass_login
        from fastapi import Response
        
        with patch('src.api.v1.routers.auth.config') as mock_config:
            mock_config.LOGIN_BYPASS_ENABLED = True
            mock_config.LOGIN_BYPASS_USERNAME = "bypass_user"
            mock_config.LOGIN_BYPASS_ROLE = "admin"
            mock_config.is_production = False

            with patch('src.api.v1.routers.auth.jwt_service', mock_jwt_service):
                response = Response()
                
                # Act
                result = await bypass_login(response, mock_db)

        # Assert
        assert result is not None
        assert result.access_token == "test_access_token"
        assert result.user.username == "bypass_user"

    @patch('src.api.v1.routers.auth.config')
    def test_bypass_vs_normal_login_coexistence(self, mock_config, client):
        """Test that normal login still works when bypass is enabled."""
        # Arrange
        mock_config.LOGIN_BYPASS_ENABLED = True
        
        # Mock normal login dependencies
        with patch('src.api.v1.routers.auth.get_user_by_username_or_email') as mock_get_user:
            with patch('src.api.v1.routers.auth.verify_password') as mock_verify:
                with patch('src.api.v1.routers.auth.create_access_token') as mock_access:
                    with patch('src.api.v1.routers.auth.create_refresh_token') as mock_refresh:
                        
                        # Mock a normal user
                        mock_user = MagicMock()
                        mock_user.username = "normal_user"
                        mock_user.email = "normal@example.com"
                        mock_user.role = "student"
                        mock_user.is_active = True
                        mock_user.hashed_password = "hashed_password"
                        
                        mock_get_user.return_value = mock_user
                        mock_verify.return_value = True
                        mock_access.return_value = "normal_access_token"
                        mock_refresh.return_value = "normal_refresh_token"
                        
                        # Act
                        login_request = {
                            "username_or_email": "normal_user",
                            "password": "password123"
                        }
                        response = client.post("/auth/login", json=login_request)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "normal_access_token"
        assert data["user"]["username"] == "normal_user"
        assert data["user"]["is_bypass_user"] is False  # Not a bypass user


class TestLoginBypassSecurity:
    """Test suite for login bypass security features."""

    @pytest.fixture
    def test_app(self):
        """Create test FastAPI application."""
        app = FastAPI()
        from src.api.v1.routers.auth import router
        app.include_router(router)
        return app

    @pytest.fixture
    def client(self, test_app):
        """Create test client."""
        return TestClient(test_app)

    # Security Tests
    def test_bypass_token_structure(self, client):
        """Test that bypass tokens have proper structure."""
        with patch('src.api.v1.routers.auth.config') as mock_config:
            with patch('src.api.v1.routers.auth.jwt_service') as mock_jwt:
                mock_config.LOGIN_BYPASS_ENABLED = True
                mock_config.is_production = False
                
                mock_token_pair = MagicMock()
                mock_token_pair.access_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_signature"
                mock_token_pair.refresh_token = "refresh_token"
                mock_jwt.create_token_pair.return_value = mock_token_pair
                mock_jwt.audit_logger = MagicMock()
                mock_jwt.audit_logger.log_login = AsyncMock()
                
                response = client.post("/auth/bypass-login")

        # Assert token structure
        assert response.status_code == 200
        data = response.json()
        token = data["access_token"]
        
        # Verify JWT structure (header.payload.signature)
        parts = token.split('.')
        assert len(parts) == 3
        
        # Decode header to verify structure
        import base64
        header = json.loads(base64.b64decode(parts[0] + '=='))
        assert "alg" in header
        assert header["alg"] == "RS256"  # Should use RS256

    def test_bypass_session_isolation(self, client):
        """Test that bypass sessions are properly isolated."""
        # Make multiple bypass requests to ensure they're independent
        tokens = []
        
        for i in range(3):
            with patch('src.api.v1.routers.auth.config') as mock_config:
                with patch('src.api.v1.routers.auth.jwt_service') as mock_jwt:
                    mock_config.LOGIN_BYPASS_ENABLED = True
                    mock_config.is_production = False
                    
                    mock_token_pair = MagicMock()
                    mock_token_pair.access_token = f"bypass_token_{i}"
                    mock_token_pair.refresh_token = f"bypass_refresh_{i}"
                    mock_jwt.create_token_pair.return_value = mock_token_pair
                    mock_jwt.audit_logger = MagicMock()
                    mock_jwt.audit_logger.log_login = AsyncMock()
                    
                    response = client.post("/auth/bypass-login")
                    if response.status_code == 200:
                        tokens.append(response.json()["access_token"])

        # Assert tokens are different (session isolation)
        assert len(tokens) == 3
        assert len(set(tokens)) == 3  # All tokens should be unique

    def test_bypass_audit_trail_completeness(self, client):
        """Test that audit trail captures all necessary information."""
        with patch('src.api.v1.routers.auth.config') as mock_config:
            with patch('src.api.v1.routers.auth.jwt_service') as mock_jwt:
                mock_config.LOGIN_BYPASS_ENABLED = True
                mock_config.is_production = False
                mock_config.LOGIN_BYPASS_USERNAME = "test_bypass"
                mock_config.LOGIN_BYPASS_ROLE = "admin"
                
                mock_token_pair = MagicMock()
                mock_token_pair.access_token = "test_token"
                mock_token_pair.refresh_token = "test_refresh"
                mock_jwt.create_token_pair.return_value = mock_token_pair
                
                audit_logger = MagicMock()
                mock_jwt.audit_logger = audit_logger
                audit_logger.log_login = AsyncMock()
                
                response = client.post("/auth/bypass-login")

        # Verify audit logging captured all necessary information
        audit_logger.log_login.assert_called_once()
        call_args = audit_logger.log_login.call_args
        
        # Should be called with (db, username, device_id, ip_address, success, reason)
        assert len(call_args[0]) >= 5
        assert call_args[0][1] == "test_bypass"  # username
        assert call_args[0][3] == "127.0.0.1"   # IP address
        assert call_args[0][4] is True           # success
        assert call_args[0][5] == "login_bypass_used"  # reason


if __name__ == '__main__':
    pytest.main([__file__, '-v'])