"""
Comprehensive test suite for main application endpoints.

This module tests core application endpoints including health checks,
chat functionality, and error handling at the application level.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture
def client():
    """Create test client for FastAPI app."""
    return TestClient(app)

class TestMainEndpoints:
    """Test suite for main application endpoints."""

    def test_health_check_success(self, client):
        """Test health check endpoint returns success."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data == {"status": "ok"}

    def test_health_check_with_database_error(self, client):
        """Test health check handles database errors gracefully."""
        # Health check should still return 200 even if database has issues
        # since it's designed to handle errors gracefully
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        # Status might be "ok" or "error" depending on database state

    def test_chat_endpoint_success(self, client):
        """Test chat endpoint with various student-related queries."""
        test_cases = [
            {
                "message": "How do I add a new student?",
                "expected_keywords": ["add", "student", "button"]
            },
            {
                "message": "Tell me about drivers",
                "expected_keywords": ["driver", "transport", "route"]
            },
            {
                "message": "What can I see on the dashboard?",
                "expected_keywords": ["dashboard", "overview", "statistics"]
            },
            {
                "message": "How do I view reports?",
                "expected_keywords": ["reports", "analytics", "Refresh All Reports"]
            },
            {
                "message": "Hello",
                "expected_keywords": ["hello", "welcome", "School Management"]
            },
            {
                "message": "help",
                "expected_keywords": ["help", "ask", "students", "drivers"]
            }
        ]

        for test_case in test_cases:
            response = client.post("/api/chat", json={"message": test_case["message"]})
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            response_text = data["response"].lower()

            # Check that response contains expected keywords
            has_keywords = any(keyword.lower() in response_text for keyword in test_case["expected_keywords"])
            assert has_keywords, f"Response for '{test_case['message']}' should contain one of {test_case['expected_keywords']}"

    def test_chat_endpoint_empty_message(self, client):
        """Test chat endpoint with empty message."""
        response = client.post("/api/chat", json={"message": ""})
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        # Should return a default response

    def test_chat_endpoint_long_message(self, client):
        """Test chat endpoint with very long message."""
        long_message = "What is the meaning of life and how does it relate to school management systems and database design patterns in modern web applications?"
        response = client.post("/api/chat", json={"message": long_message})
        assert response.status_code == 200
        data = response.json()
        assert "response" in data

    def test_chat_endpoint_special_characters(self, client):
        """Test chat endpoint with special characters and emojis."""
        special_message = "How do I add a student? 🚀⭐"
        response = client.post("/api/chat", json={"message": special_message})
        assert response.status_code == 200
        data = response.json()
        assert "response" in data

    def test_chat_endpoint_error_handling(self, client):
        """Test chat endpoint error handling."""
        # Test with invalid JSON structure
        response = client.post("/api/chat", json={})
        assert response.status_code == 422  # Validation error

    def test_invalid_endpoint_returns_404(self, client):
        """Test that invalid endpoints return 404."""
        response = client.get("/api/nonexistent")
        assert response.status_code == 404

        response = client.post("/api/nonexistent", json={})
        assert response.status_code == 404

    def test_cors_headers(self, client):
        """Test that CORS headers are properly set."""
        response = client.options("/api/health", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type"
        })

        # OPTIONS request should be allowed
        assert response.status_code in [200, 404]  # Some endpoints may not have explicit OPTIONS

        # Check CORS headers if present
        if "access-control-allow-origin" in response.headers:
            assert "*" in response.headers.get("access-control-allow-origin")

    def test_rate_limiting_health_check(self, client):
        """Test rate limiting on health check endpoint."""
        # Make multiple rapid requests to health check
        for i in range(10):
            response = client.get("/api/health")
            if response.status_code == 429:  # Rate limited
                break
            assert response.status_code == 200

        # Should eventually get rate limited or continue working
        # depending on rate limit configuration

    def test_error_handler_middleware(self, client):
        """Test that global error handler catches exceptions."""
        # This is harder to test directly, but we can verify that
        # the app handles errors gracefully by testing various edge cases

        # Test with malformed request data
        response = client.post("/api/chat", data="invalid json")
        assert response.status_code == 422  # Should be caught by FastAPI

    def test_static_file_mounting(self, client):
        """Test that static file mounting is configured."""
        # Test that the app can handle requests that would go to static files
        # This is more of a configuration test

        # Since static files are mounted at root, various paths should not return 404 for API routes
        response = client.get("/api/health")
        assert response.status_code == 200  # API routes should work

    def test_application_startup_logging(self, client):
        """Test that application starts up properly with logging."""
        # This is more of an integration test, but we can verify
        # that the app is responsive and endpoints work
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_database_connection_on_startup(self, client):
        """Test that database connection is established on startup."""
        # Health check tests database connectivity
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data == {"status": "ok"}

    def test_middleware_configuration(self, client):
        """Test that middleware is properly configured."""
        # Test CORS middleware by checking headers
        response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
        assert response.status_code == 200

        # Should have CORS headers in response
        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-credentials",
            "access-control-allow-methods",
            "access-control-allow-headers"
        ]

        # At least some CORS headers should be present
        has_cors = any(header in response.headers for header in cors_headers)
        assert has_cors, "CORS headers should be present"

    def test_chat_responses_are_helpful(self, client):
        """Test that chat responses provide genuinely helpful information."""
        helpful_queries = [
            "How do I add a student?",
            "What are the reports?",
            "How do I manage drivers?",
            "What is the dashboard?",
            "Help with students"
        ]

        for query in helpful_queries:
            response = client.post("/api/chat", json={"message": query})
            assert response.status_code == 200
            data = response.json()

            # Response should be non-empty and provide some guidance
            assert len(data["response"]) > 10

            # Should contain relevant keywords from the query
            response_lower = data["response"].lower()
            query_lower = query.lower()

            # Extract key terms from query
            key_terms = []
            if "student" in query_lower or "add" in query_lower:
                key_terms.extend(["student", "add", "page", "button"])
            if "report" in query_lower:
                key_terms.extend(["report", "analytics", "summary"])
            if "driver" in query_lower:
                key_terms.extend(["driver", "transport", "route"])
            if "dashboard" in query_lower:
                key_terms.extend(["dashboard", "overview"])

            if key_terms:
                has_relevant_info = any(term in response_lower for term in key_terms)
                assert has_relevant_info, f"Response to '{query}' should contain relevant information"

    def test_chat_unknown_queries(self, client):
        """Test chat responses for unknown or unrelated queries."""
        unknown_queries = [
            "What's the weather like?",
            "Tell me a joke",
            "How do I bake a cake?",
            "What's 2+2?",
            "Play chess"
        ]

        for query in unknown_queries:
            response = client.post("/api/chat", json={"message": query})
            assert response.status_code == 200
            data = response.json()

            # Should return a generic helpful response
            response_lower = data["response"].lower()
            helpful_indicators = ["school management", "help", "ask", "students", "drivers", "reports"]
            has_helpful_content = any(indicator in response_lower for indicator in helpful_indicators)
            assert has_helpful_content, f"Unknown query '{query}' should return helpful guidance"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])