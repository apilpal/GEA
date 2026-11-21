"""
Configuration management for the school management system.

This module provides centralized configuration management with environment-specific settings,
validation, and type safety. It loads configuration from environment variables with
appropriate defaults and validation.
"""

import os
import logging
from typing import List, Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
# Priority: .env.<environment> > .env > system environment variables
def load_environment_config():
    """Load environment configuration based on ENVIRONMENT variable."""
    environment = os.getenv("ENVIRONMENT", "development").lower()

    # Load base .env file from backend directory
    # Try multiple possible paths for .env file
    possible_paths = [
        Path(__file__).parent.parent.parent.parent / "backend" / ".env",  # From src/core/config/
        Path(__file__).parent.parent.parent / ".env",  # From src/core/
        Path(__file__).parent / ".env",  # From src/
        Path(".env")  # Current directory
    ]

    for env_path in possible_paths:
        if env_path.exists():
            load_dotenv(env_path)
            break

    # Load environment-specific .env file (overrides base)
    # Try multiple possible paths for environment-specific .env file
    possible_env_paths = [
        Path(__file__).parent.parent.parent.parent / "backend" / f".env.{environment}",  # From src/core/config/
        Path(__file__).parent.parent.parent / f".env.{environment}",  # From src/core/
        Path(__file__).parent / f".env.{environment}",  # From src/
        Path(f".env.{environment}")  # Current directory
    ]

    for env_path in possible_env_paths:
        if env_path.exists():
            load_dotenv(env_path, override=True)
            break

# Load configuration on module import
load_environment_config()

class Config:
    """Centralized configuration class with validation and type safety."""

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()

    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/students.db")

    # JWT Configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # Server Configuration
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    FRONTEND_PORT: int = int(os.getenv("FRONTEND_PORT", "5173"))

    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

    # CORS Configuration
    CORS_ORIGINS_STR: str = os.getenv("CORS_ORIGINS", '["http://localhost:5173", "http://127.0.0.1:5173"]')
    CORS_ORIGINS: List[str] = []

    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "30"))

    # SSL Configuration (Production)
    SSL_CERT_PATH: Optional[str] = os.getenv("SSL_CERT_PATH")
    SSL_KEY_PATH: Optional[str] = os.getenv("SSL_KEY_PATH")

    # Database Connection Pool Settings
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "3600"))

    # Email Configuration
    SMTP_SERVER: Optional[str] = os.getenv("SMTP_SERVER")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: Optional[str] = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")

    # Redis Configuration
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL")

    # Guest User Configuration
    GUEST_EMAIL_DOMAIN: str = os.getenv("GUEST_EMAIL_DOMAIN", "guest.local")

    # Ollama AI Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama2")

    # MCP Server Configuration
    MCP_SERVER_URL: str = os.getenv("MCP_SERVER_URL", "http://localhost:3001")
    MCP_ENABLED: bool = os.getenv("MCP_ENABLED", "true").lower() == "true"

    # Login Bypass Configuration
    LOGIN_BYPASS_ENABLED: bool = os.getenv("LOGIN_BYPASS_ENABLED", "false").lower() == "true"
    LOGIN_BYPASS_USERNAME: str = os.getenv("LOGIN_BYPASS_USERNAME", "bypass_user")
    LOGIN_BYPASS_ROLE: str = os.getenv("LOGIN_BYPASS_ROLE", "admin")

    # Login Rate Limiting Configuration
    ENABLE_LOGIN_RATE_LIMITING: bool = os.getenv("ENABLE_LOGIN_RATE_LIMITING", "false").lower() == "true"

    # Monitoring and Observability
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")
    METRICS_ENABLED: bool = os.getenv("METRICS_ENABLED", "false").lower() == "true"

    def __init__(self):
        """Initialize and validate configuration."""
        self._validate_required_settings()
        self._parse_cors_origins()
        self._configure_logging()

    def _validate_required_settings(self):
        """Validate required configuration settings."""
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY environment variable is required for security")

        if self.ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer")

        if self.REFRESH_TOKEN_EXPIRE_DAYS <= 0:
            raise ValueError("REFRESH_TOKEN_EXPIRE_DAYS must be a positive integer")

        if self.PORT <= 0 or self.PORT > 65535:
            raise ValueError("PORT must be between 1 and 65535")

        if self.FRONTEND_PORT <= 0 or self.FRONTEND_PORT > 65535:
            raise ValueError("FRONTEND_PORT must be between 1 and 65535")

    def _parse_cors_origins(self):
        """Parse CORS origins from string to list."""
        import ast
        try:
            self.CORS_ORIGINS = ast.literal_eval(self.CORS_ORIGINS_STR)
            if not isinstance(self.CORS_ORIGINS, list):
                raise ValueError("CORS_ORIGINS must be a list")
        except (ValueError, SyntaxError):
            # Fallback to development defaults
            self.CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
            logging.warning("Invalid CORS_ORIGINS format, using development defaults")

    def _configure_logging(self):
        """Configure logging based on environment."""
        log_level_map = {
            "DEBUG": logging.DEBUG,
            "INFO": logging.INFO,
            "WARNING": logging.WARNING,
            "ERROR": logging.ERROR,
            "CRITICAL": logging.CRITICAL
        }

        level = log_level_map.get(self.LOG_LEVEL, logging.INFO)

        # Configure root logger
        logging.basicConfig(
            level=level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )

        logger = logging.getLogger(__name__)
        logger.info(f"Configuration loaded for environment: {self.ENVIRONMENT}")

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT == "production"

    @property
    def is_testing(self) -> bool:
        """Check if running in testing environment."""
        return self.ENVIRONMENT == "testing"

    @property
    def base_url(self) -> str:
        """Get the base URL for the application."""
        protocol = "https" if self.SSL_CERT_PATH and self.SSL_KEY_PATH else "http"
        return f"{protocol}://{self.HOST}:{self.PORT}"

    @property
    def frontend_url(self) -> str:
        """Get the frontend URL."""
        protocol = "https" if self.is_production else "http"
        return f"{protocol}://localhost:{self.FRONTEND_PORT}"

# Global configuration instance
config = Config()

# Make class attributes available on instance for backward compatibility
config.ENVIRONMENT = Config.ENVIRONMENT
config.OLLAMA_BASE_URL = Config.OLLAMA_BASE_URL
config.OLLAMA_MODEL = Config.OLLAMA_MODEL
config.MCP_ENABLED = Config.MCP_ENABLED
config.MCP_SERVER_URL = Config.MCP_SERVER_URL

# Export commonly used settings for backward compatibility
DATABASE_URL = config.DATABASE_URL
SECRET_KEY = config.SECRET_KEY
FRONTEND_PORT = config.FRONTEND_PORT
ACCESS_TOKEN_EXPIRE_MINUTES = config.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = config.REFRESH_TOKEN_EXPIRE_DAYS