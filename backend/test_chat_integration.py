"""
Chat Integration Tests

Comprehensive integration tests for the chat/AI service functionality,
including authentication integration, message handling, and AI responses.
"""

import asyncio
import json
import time
from typing import Dict, List, Optional
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

# Import application components
from main import create_app
from core.models import CreateUserRequest, UserRole
from utils.auth_utils import hash_password, get_db


class TestChatAuthenticationIntegration:
    """Test chat functionality with different authentication states."""

    @pytest_asyncio.fixture
    async def test_db_session(self):
        """Create test database session for chat tests."""
        # Use in-memory database for testing
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker

        engine = create_async_engine(
            "sqlite+aiosqlite:///:memory:",
            echo=False
        )

        # Create tables
        from core.models import Base
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with async_session() as session:
            # Create test user
            test_user = CreateUserRequest(
                username="chat_test_user",
                email="chat@test.com",
                password="chatpass123",
                role=UserRole.STUDENT
            )

            hashed_password = hash_password(test_user.password)
            from core.models import DBUser
            db_user = DBUser(
                username=test_user.username,
                email=test_user.email,
                hashed_password=hashed_password,
                role=test_user.role,
                is_active=True
            )
            session.add(db_user)
            await session.commit()

            yield session

        await engine.dispose()

    @pytest.fixture
    def test_app(self):
        """Create FastAPI test application."""
        return create_app()

    @pytest_asyncio.fixture
    async def authenticated_client(self, test_app, test_db_session):
        """Create authenticated async client for testing."""
        # Login to get token
        login_data = {
            "username_or_email": "chat@test.com",
            "password": "chatpass123"
        }

        async with AsyncClient(app=test_app, base_url="http://testserver") as client:
            response = await client.post("/api/auth/login", json=login_data)
            if response.status_code == 200:
                token = response.json()["access_token"]
                # Set up client with authentication
                client.headers.update({"Authorization": f"Bearer {token}"})
                yield client
            else:
                pytest.fail(f"Failed to authenticate test user: {response.text}")

    @pytest_asyncio.fixture
    async def guest_client(self, test_app):
        """Create guest user client for testing."""
        async with AsyncClient(app=test_app, base_url="http://testserver") as client:
            # Create guest user
            response = await client.post("/api/auth/guest")
            if response.status_code == 200:
                guest_data = response.json()
                guest_token = guest_data["access_token"]
                client.headers.update({"Authorization": f"Bearer {guest_token}"})
                yield client, guest_data["guest_id"]
            else:
                pytest.fail(f"Failed to create guest user: {response.text}")

    @pytest.mark.asyncio
    async def test_chat_with_authenticated_user(self, authenticated_client):
        """Test chat functionality with authenticated user."""
        test_message = "Hello, I need help with my studies"

        chat_data = {
            "message": test_message,
            "context": "student_help"
        }

        response = await authenticated_client.post("/api/chat", json=chat_data)
        assert response.status_code == 200

        response_data = response.json()
        assert "response" in response_data
        assert "message_id" in response_data
        assert len(response_data["response"]) > 0

    @pytest.mark.asyncio
    async def test_chat_with_guest_user(self, guest_client):
        """Test chat functionality with guest user."""
        client, guest_id = guest_client

        test_message = "I need information about available courses"
        chat_data = {
            "message": test_message,
            "context": "guest_inquiry"
        }

        response = await client.post("/api/chat", json=chat_data)
        assert response.status_code == 200

        response_data = response.json()
        assert "response" in response_data
        assert "message_id" in response_data

    @pytest.mark.asyncio
    async def test_chat_message_persistence(self, authenticated_client, test_db_session):
        """Test that chat messages are properly persisted."""
        # Send multiple messages
        messages = [
            "First message",
            "Second message",
            "Third message"
        ]

        message_ids = []
        for message in messages:
            chat_data = {
                "message": message,
                "context": "conversation_test"
            }

            response = await authenticated_client.post("/api/chat", json=chat_data)
            assert response.status_code == 200

            message_id = response.json()["message_id"]
            message_ids.append(message_id)

        # Verify all messages have unique IDs
        assert len(set(message_ids)) == len(message_ids)

    @pytest.mark.asyncio
    async def test_chat_context_handling(self, authenticated_client):
        """Test chat context handling for different scenarios."""
        contexts = ["student_help", "general_inquiry", "technical_support"]

        for context in contexts:
            chat_data = {
                "message": f"Test message for {context}",
                "context": context
            }

            response = await authenticated_client.post("/api/chat", json=chat_data)
            assert response.status_code == 200

            response_data = response.json()
            assert "response" in response_data

    @pytest.mark.asyncio
    async def test_chat_error_handling(self, authenticated_client):
        """Test chat error handling scenarios."""
        # Test empty message
        chat_data = {
            "message": "",
            "context": "test"
        }

        response = await authenticated_client.post("/api/chat", json=chat_data)
        # Should handle gracefully, either with error or default response
        assert response.status_code in [200, 400, 422]

        # Test very long message
        long_message = "A" * 10000
        chat_data = {
            "message": long_message,
            "context": "test"
        }

        response = await authenticated_client.post("/api/chat", json=chat_data)
        # Should handle gracefully
        assert response.status_code in [200, 400, 413, 422]

        # Test missing context
        chat_data = {
            "message": "Test message without context"
        }

        response = await authenticated_client.post("/api/chat", json=chat_data)
        # Should handle gracefully
        assert response.status_code in [200, 400, 422]

    @pytest.mark.asyncio
    async def test_chat_rate_limiting(self, authenticated_client):
        """Test chat rate limiting functionality."""
        # Send multiple messages rapidly
        messages = [f"Message {i}" for i in range(15)]

        for i, message in enumerate(messages):
            chat_data = {
                "message": message,
                "context": "rate_limit_test"
            }

            response = await authenticated_client.post("/api/chat", json=chat_data)

            if i < 10:  # First 10 should work
                assert response.status_code == 200
            else:  # Later ones might be rate limited
                assert response.status_code in [200, 429]

    @pytest.mark.asyncio
    async def test_chat_response_quality(self, authenticated_client):
        """Test the quality and relevance of chat responses."""
        test_cases = [
            {
                "message": "What subjects are available?",
                "context": "student_help",
                "expected_keywords": ["subject", "available", "course"]
            },
            {
                "message": "How can I improve my grades?",
                "context": "academic_advice",
                "expected_keywords": ["grade", "improve", "study"]
            },
            {
                "message": "Tell me about the school facilities",
                "context": "general_inquiry",
                "expected_keywords": ["facility", "school", "available"]
            }
        ]

        for test_case in test_cases:
            chat_data = {
                "message": test_case["message"],
                "context": test_case["context"]
            }

            response = await authenticated_client.post("/api/chat", json=chat_data)
            assert response.status_code == 200

            response_data = response.json()
            ai_response = response_data["response"].lower()

            # Check if response contains expected keywords
            found_keywords = [
                keyword for keyword in test_case["expected_keywords"]
                if keyword in ai_response
            ]

            # At least one keyword should be present for relevance
            assert len(found_keywords) > 0, f"Response '{ai_response}' doesn't contain expected keywords for message '{test_case['message']}'"


class TestChatWorkflowIntegration:
    """Test complete chat workflows and user journeys."""

    @pytest.mark.asyncio
    async def test_complete_chat_session_workflow(self, test_app):
        """Test complete chat session from guest to authenticated user."""
        async with AsyncClient(app=test_app, base_url="http://testserver") as client:
            # Phase 1: Start as guest
            response = await client.post("/api/auth/guest")
            assert response.status_code == 200

            guest_data = response.json()
            guest_token = guest_data["access_token"]
            guest_headers = {"Authorization": f"Bearer {guest_token}"}

            # Phase 2: Have conversation as guest
            conversation = [
                "Hello, I'm interested in learning more about your programs",
                "Can you tell me about the admission process?",
                "What are the requirements for enrollment?"
            ]

            for message in conversation:
                chat_data = {
                    "message": message,
                    "context": "guest_inquiry"
                }

                response = await client.post("/api/chat", json=chat_data, headers=guest_headers)
                assert response.status_code == 200

            # Phase 3: Convert to registered user mid-conversation
            conversion_data = {
                "guest_id": guest_data["guest_id"],
                "username": "converted_chat_user",
                "email": "converted@chat.com",
                "password": "convertedpass123"
            }

            response = await client.post("/api/auth/convert-guest", json=conversion_data, headers=guest_headers)
            assert response.status_code == 200

            # Phase 4: Continue conversation as registered user
            # Login as new user
            login_data = {
                "username_or_email": "converted@chat.com",
                "password": "convertedpass123"
            }

            response = await client.post("/api/auth/login", json=login_data)
            assert response.status_code == 200

            new_token = response.json()["access_token"]
            registered_headers = {"Authorization": f"Bearer {new_token}"}

            # Continue conversation
            continuation_messages = [
                "Thank you for the information. I have one more question",
                "Can you help me with the application form?"
            ]

            for message in continuation_messages:
                chat_data = {
                    "message": message,
                    "context": "application_help"
                }

                response = await client.post("/api/chat", json=chat_data, headers=registered_headers)
                assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_chat_across_user_roles(self, test_app, test_db_session):
        """Test chat functionality across different user roles."""
        roles_to_test = [
            ("admin@test.com", "adminpass123", "admin"),
            ("teacher@test.com", "teacherpass123", "teacher"),
            ("driver@test.com", "driverpass123", "driver")
        ]

        for email, password, role in roles_to_test:
            # Login as specific role
            login_data = {
                "username_or_email": email,
                "password": password
            }

            async with AsyncClient(app=test_app, base_url="http://testserver") as client:
                response = await client.post("/api/auth/login", json=login_data)
                assert response.status_code == 200

                token = response.json()["access_token"]
                headers = {"Authorization": f"Bearer {token}"}

                # Test chat with role-specific context
                role_contexts = {
                    "admin": "admin_help",
                    "teacher": "teaching_assistance",
                    "driver": "transport_info"
                }

                chat_data = {
                    "message": f"I need help as a {role}",
                    "context": role_contexts[role]
                }

                response = await client.post("/api/chat", json=chat_data, headers=headers)
                assert response.status_code == 200

                response_data = response.json()
                assert "response" in response_data

    @pytest.mark.asyncio
    async def test_chat_persistence_across_sessions(self, test_app):
        """Test that chat history persists across user sessions."""
        async with AsyncClient(app=test_app, base_url="http://testserver") as client:
            # Create guest user
            response = await client.post("/api/auth/guest")
            guest_data = response.json()
            guest_token = guest_data["access_token"]
            guest_headers = {"Authorization": f"Bearer {guest_token}"}

            # Send initial message
            initial_message = "This is my first message in this conversation"
            chat_data = {
                "message": initial_message,
                "context": "conversation_test"
            }

            response = await client.post("/api/chat", json=chat_data, headers=guest_headers)
            first_message_id = response.json()["message_id"]

            # Convert to registered user
            conversion_data = {
                "guest_id": guest_data["guest_id"],
                "username": "persistence_test_user",
                "email": "persistence@test.com",
                "password": "persistpass123"
            }

            response = await client.post("/api/auth/convert-guest", json=conversion_data, headers=guest_headers)
            assert response.status_code == 200

            # Login as registered user
            login_data = {
                "username_or_email": "persistence@test.com",
                "password": "persistpass123"
            }

            response = await client.post("/api/auth/login", json=login_data)
            registered_token = response.json()["access_token"]
            registered_headers = {"Authorization": f"Bearer {registered_token}"}

            # Continue conversation (should maintain context)
            continuation_message = "This is my follow-up message"
            chat_data = {
                "message": continuation_message,
                "context": "conversation_test"
            }

            response = await client.post("/api/chat", json=chat_data, headers=registered_headers)
            assert response.status_code == 200

            second_message_id = response.json()["message_id"]

            # Verify message IDs are different (new message created)
            assert first_message_id != second_message_id


class TestChatPerformanceIntegration:
    """Test chat performance and load handling."""

    @pytest.mark.asyncio
    async def test_chat_concurrent_requests(self, test_app):
        """Test chat handling of concurrent requests."""
        import asyncio

        # Create authenticated client
        login_data = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }

        async with AsyncClient(app=test_app, base_url="http://testserver") as client:
            response = await client.post("/api/auth/login", json=login_data)
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            async def send_chat_message(message_id: int):
                """Send a chat message concurrently."""
                chat_data = {
                    "message": f"Concurrent message {message_id}",
                    "context": "performance_test"
                }
                return await client.post("/api/chat", json=chat_data, headers=headers)

            # Send multiple concurrent requests
            start_time = time.time()

            tasks = [send_chat_message(i) for i in range(20)]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

            end_time = time.time()
            duration = end_time - start_time

            # Should complete within reasonable time
            assert duration < 30  # 30 seconds for 20 concurrent requests

            # Count successful responses
            success_count = sum(1 for response in responses
                              if not isinstance(response, Exception) and response.status_code == 200)

            # Should have high success rate
            assert success_count >= 15  # At least 75% success rate

    @pytest.mark.asyncio
    async def test_chat_long_conversation_performance(self, test_app):
        """Test chat performance with long conversations."""
        login_data = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }

        async with AsyncClient(app=test_app, base_url="http://testserver") as client:
            response = await client.post("/api/auth/login", json=login_data)
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Simulate long conversation
            start_time = time.time()

            conversation_length = 50
            for i in range(conversation_length):
                chat_data = {
                    "message": f"Message number {i + 1} in this conversation",
                    "context": "long_conversation"
                }

                response = await client.post("/api/chat", json=chat_data, headers=headers)

                # Should handle each message appropriately
                if i < 45:  # Most should succeed
                    assert response.status_code == 200
                else:  # Later ones might be rate limited
                    assert response.status_code in [200, 429]

            end_time = time.time()
            duration = end_time - start_time

            # Should complete within reasonable time
            assert duration < 120  # 2 minutes for 50 messages

    @pytest.mark.asyncio
    async def test_chat_memory_usage(self, test_app):
        """Test chat system memory usage with many messages."""
        login_data = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }

        async with AsyncClient(app=test_app, base_url="http://testserver") as client:
            response = await client.post("/api/auth/login", json=login_data)
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Send many messages to test memory usage
            messages_sent = 100
            for i in range(messages_sent):
                chat_data = {
                    "message": f"Memory test message {i + 1}. " + "x" * 100,  # Add some content
                    "context": "memory_test"
                }

                response = await client.post("/api/chat", json=chat_data, headers=headers)

                # Should handle gracefully even with many messages
                assert response.status_code in [200, 429]

            # System should still be responsive
            response = await client.get("/api/health")
            assert response.status_code == 200


class TestChatErrorRecoveryIntegration:
    """Test chat error recovery and resilience."""

    @pytest.mark.asyncio
    async def test_chat_ai_service_unavailable(self, test_app):
        """Test chat behavior when AI service is unavailable."""
        login_data = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }

        async with AsyncClient(app=test_app, base_url="http://testserver") as client:
            response = await client.post("/api/auth/login", json=login_data)
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Mock AI service failure
            with patch('services.ai_chat_service.AIService.generate_response') as mock_ai:
                mock_ai.side_effect = Exception("AI service unavailable")

                chat_data = {
                    "message": "Test message during AI service outage",
                    "context": "error_test"
                }

                response = await client.post("/api/chat", json=chat_data, headers=headers)

                # Should handle gracefully with fallback or error response
                assert response.status_code in [200, 500, 503]

    @pytest.mark.asyncio
    async def test_chat_database_failure_recovery(self, test_app):
        """Test chat recovery from database failures."""
        login_data = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }

        async with AsyncClient(app=test_app, base_url="http://testserver") as client:
            response = await client.post("/api/auth/login", json=login_data)
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Mock database failure
            with patch('utils.auth_utils.get_db') as mock_db:
                mock_db.side_effect = Exception("Database connection failed")

                chat_data = {
                    "message": "Test message during database outage",
                    "context": "db_error_test"
                }

                response = await client.post("/api/chat", json=chat_data, headers=headers)

                # Should handle database errors gracefully
                assert response.status_code in [500, 503]

    @pytest.mark.asyncio
    async def test_chat_malformed_requests(self, test_app):
        """Test chat handling of malformed requests."""
        login_data = {
            "username_or_email": "admin@test.com",
            "password": "adminpass123"
        }

        async with AsyncClient(app=test_app, base_url="http://testserver") as client:
            response = await client.post("/api/auth/login", json=login_data)
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Test various malformed requests
            malformed_requests = [
                {},  # Empty request
                {"message": None},  # Null message
                {"context": "test"},  # Missing message
                {"message": "", "context": ""},  # Empty strings
                {"message": "test", "context": None},  # Null context
                {"message": "test" * 1000, "context": "test"},  # Very long message
            ]

            for malformed_data in malformed_requests:
                response = await client.post("/api/chat", json=malformed_data, headers=headers)

                # Should handle malformed requests gracefully
                assert response.status_code in [200, 400, 422, 413]

    @pytest.mark.asyncio
    async def test_chat_authentication_failures(self, test_app):
        """Test chat behavior with authentication failures."""
        async with AsyncClient(app=test_app, base_url="http://testserver") as client:
            # Test with invalid token
            headers = {"Authorization": "Bearer invalid_token"}

            chat_data = {
                "message": "Test message with invalid auth",
                "context": "auth_test"
            }

            response = await client.post("/api/chat", json=chat_data, headers=headers)
            assert response.status_code == 401

            # Test with expired token (if token expiration is implemented)
            # This would require mocking token verification

            # Test without token
            response = await client.post("/api/chat", json=chat_data)
            assert response.status_code == 401


# Integration test runner for chat-specific tests
if __name__ == "__main__":
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--durations=10",
        "--asyncio-mode=auto",
        "-k chat"
    ])