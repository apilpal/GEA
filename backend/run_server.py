#!/usr/bin/env python3
"""
FastAPI Server Startup Script with SSL Support

This script provides a convenient way to run the FastAPI application
with proper SSL configuration for both development and production environments.

Usage:
    Development: python run_server.py --dev
    Production:  python run_server.py --prod
    Custom:      python run_server.py --host 0.0.0.0 --port 8000 --ssl
"""

import os
import sys
import ssl
import argparse
import uvicorn
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from src.main import app
from src.core.config.config import config


def create_ssl_context() -> ssl.SSLContext:
    """Create SSL context for HTTPS support."""
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)

    # For development with self-signed certificates, we need to load them
    if config.SSL_CERT_PATH and config.SSL_KEY_PATH:
        cert_path = Path(config.SSL_CERT_PATH)
        key_path = Path(config.SSL_KEY_PATH)

        if cert_path.exists() and key_path.exists():
            ssl_context.load_cert_chain(
                certfile=str(cert_path),
                keyfile=str(key_path)
            )

            # For self-signed certificates in development, allow them
            if config.is_development:
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE

            print(f"🔐 SSL certificates loaded from {cert_path} and {key_path}")
        else:
            print(f"⚠️  SSL certificate files not found at {cert_path} or {key_path}")
            print("   Falling back to HTTP only")
            return None

    return ssl_context


def main():
    """Main entry point for running the server."""
    parser = argparse.ArgumentParser(
        description="FastAPI Server with SSL Support",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Development (HTTP):  python run_server.py --dev
  Development (HTTPS): python run_server.py --dev --ssl
  Production (HTTPS):  python run_server.py --prod
  Custom config:       python run_server.py --host 0.0.0.0 --port 8000 --ssl
        """
    )

    parser.add_argument(
        "--dev", action="store_true",
        help="Run in development mode (default)"
    )
    parser.add_argument(
        "--prod", action="store_true",
        help="Run in production mode"
    )
    parser.add_argument(
        "--host", default=None,
        help=f"Host to bind to (default: {config.HOST})"
    )
    parser.add_argument(
        "--port", type=int, default=None,
        help=f"Port to bind to (default: {config.PORT})"
    )
    parser.add_argument(
        "--ssl", action="store_true",
        help="Enable SSL/HTTPS (requires certificates)"
    )
    parser.add_argument(
        "--no-ssl", action="store_true",
        help="Disable SSL/HTTPS (force HTTP only)"
    )
    parser.add_argument(
        "--reload", action="store_true",
        help="Enable auto-reload for development"
    )
    parser.add_argument(
        "--workers", type=int, default=1,
        help="Number of worker processes (default: 1)"
    )

    args = parser.parse_args()

    # Determine configuration
    if args.prod:
        mode = "production"
        reload = False
        workers = args.workers if args.workers > 1 else 1
    else:
        mode = "development"
        reload = args.reload or True
        workers = 1

    # Set host and port
    host = args.host or config.HOST
    port = args.port or config.PORT

    # Determine SSL configuration
    use_ssl = False
    if args.no_ssl:
        use_ssl = False
    elif args.ssl:
        use_ssl = True
    elif args.prod and config.SSL_CERT_PATH and config.SSL_KEY_PATH:
        use_ssl = True
    elif config.is_development and config.SSL_CERT_PATH and config.SSL_KEY_PATH:
        # In development, SSL is optional
        use_ssl = False  # Default to HTTP for development

    print("🚀 Starting FastAPI Server")
    print(f"   Mode: {mode}")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   SSL: {'Enabled' if use_ssl else 'Disabled'}")
    print(f"   Reload: {reload}")
    print(f"   Workers: {workers}")
    print()

    # Configure uvicorn
    uvicorn_config = {
        "app": "src.main:app",
        "host": host,
        "port": port,
        "reload": reload,
        "workers": workers,
        "access_log": True,
        "log_level": config.LOG_LEVEL.lower(),
    }

    # Add SSL configuration if enabled
    ssl_context = None
    if use_ssl:
        ssl_context = create_ssl_context()
        if ssl_context:
            uvicorn_config["ssl"] = ssl_context

    # Start the server
    try:
        uvicorn.run(**uvicorn_config)
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()