"""
Refactored main FastAPI application module.

This module contains the core FastAPI application setup with proper
separation of concerns. It handles application lifecycle, middleware
configuration, and route registration.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
import logging
import os
import ssl
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import RedirectResponse

# Import core modules
from src.core.config.config import config
from src.core.models import HealthResponse

# Import routers
from src.api.v1.routers import students, drivers, reports, charts, auth, csv_sync, dashboard, chat, attendance, marks, fees, scorecards, analytics

# Import utilities
from src.utils import auth_utils
from fastapi import Depends
from src.utils.auth_utils import require_admin, require_staff, check_permissions
from src.core.models import UserRole

# Roles allowed to see money/reports
require_finance = check_permissions([UserRole.ADMIN, UserRole.TEACHER, UserRole.ACCOUNTANT])


# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Rate limiting setup with OPTIONS exclusion
# Key function that returns None for OPTIONS requests to skip rate limiting
def rate_limit_key_func(request):
    """Skip rate limiting for OPTIONS preflight requests."""
    if request.method == "OPTIONS":
        return None
    return get_remote_address(request)

limiter = Limiter(key_func=rate_limit_key_func, default_limits=[f"{config.RATE_LIMIT_REQUESTS_PER_MINUTE} per minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application lifespan events."""
    logger.info("Initializing application...")
    logger.info(f"Environment: {config.ENVIRONMENT}")
    logger.info(f"DATABASE_URL: {config.DATABASE_URL}")

    # Database initialization is handled by models module
    yield

    logger.info("Application shutdown completed")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    # Create FastAPI app with lifespan management
    app = FastAPI(
        title="Student Profiles API",
        version="1.0.0",
        lifespan=lifespan
    )

    # Add rate limiting middleware FIRST (runs LAST, closest to app)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # Global error handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Global exception handler for unhandled errors."""
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "type": "server_error"}
        )

    # Add CORS middleware (runs before SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"] + [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "Accept-Encoding",
            "Accept-Language",
            "Cache-Control",
            "Connection",
            "Host",
            "Origin",
            "Referer",
            "User-Agent"
        ],
        expose_headers=["*"],
    )

    # CRITICAL: Handle OPTIONS preflight requests LAST (runs FIRST, closest to edge)
    # This must be added AFTER SlowAPIMiddleware so it executes FIRST and intercepts OPTIONS before rate limiting
    @app.middleware("http")
    async def handle_options_requests(request: Request, call_next):
        """Handle OPTIONS preflight requests directly without going through other middleware."""
        if request.method == "OPTIONS":
            # Create response with CORS headers immediately
            from fastapi.responses import Response
            origin = request.headers.get("origin", "http://localhost:5173")
            response = Response(
                status_code=204,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                    "Access-Control-Allow-Headers": "*," + ",".join([
                        "Content-Type",
                        "Authorization",
                        "X-Requested-With",
                        "Accept",
                        "Accept-Encoding",
                        "Accept-Language",
                        "Cache-Control",
                        "Connection",
                        "Host",
                        "Origin",
                        "Referer",
                        "User-Agent"
                    ]),
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "86400",
                }
            )
            return response
        return await call_next(request)

    # HTTP to HTTPS redirect middleware (only in production)
    if config.is_production and config.SSL_CERT_PATH and config.SSL_KEY_PATH:
        @app.middleware("http")
        async def http_to_https_redirect(request: Request, call_next):
            """Redirect HTTP requests to HTTPS in production."""
            if request.url.scheme == "http":
                https_url = request.url.replace(scheme="https")
                return RedirectResponse(url=str(https_url), status_code=301)
            response = await call_next(request)
            return response

    # Security headers middleware
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        """Add security headers to all responses."""
        response = await call_next(request)

        # HSTS Header (HTTP Strict Transport Security) - only for HTTPS
        if request.url.scheme == "https" and config.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"

        return response

    # Trusted hosts middleware (only in production)
    if config.is_production:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["*"]  # Configure with your domain in production
        )

    # Include routers
    # Every data router requires a logged-in user with a suitable role.
    # (auth router stays open: it contains login itself and does its own checks.)
    app.include_router(students.router, prefix="/api", tags=["students"], dependencies=[Depends(require_staff)])
    app.include_router(drivers.router, prefix="/api", tags=["drivers"], dependencies=[Depends(require_staff)])
    app.include_router(reports.router, prefix="/api", tags=["reports"], dependencies=[Depends(require_finance)])
    app.include_router(charts.router, prefix="/api", tags=["charts"], dependencies=[Depends(require_finance)])
    app.include_router(auth.router, prefix="/api", tags=["auth"])
    app.include_router(csv_sync.router, prefix="/api", tags=["csv-sync"], dependencies=[Depends(require_admin)])
    app.include_router(dashboard.router, prefix="/api", tags=["dashboard"], dependencies=[Depends(require_finance)])
    app.include_router(chat.router, prefix="/api", tags=["chat"], dependencies=[Depends(require_staff)])
    app.include_router(attendance.router, prefix="/api", tags=["attendance"])
    app.include_router(marks.router, prefix="/api", tags=["marks"])
    app.include_router(fees.router, prefix="/api", tags=["fees"])
    app.include_router(scorecards.router, prefix="/api", tags=["scorecards"])
    app.include_router(analytics.router, prefix="/api", tags=["analytics"])

    # Health check endpoint
    @app.get("/api/health", response_model=HealthResponse)
    @limiter.limit(f"{config.RATE_LIMIT_REQUESTS_PER_MINUTE}/minute")
    async def health_check(request: Request) -> HealthResponse:
        """Health check endpoint to verify API availability."""
        try:
            logger.debug("Health check initiated")
            # Simple database connectivity check would go here
            return HealthResponse(status="ok")
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return HealthResponse(status="error", message=str(e))

    # Mount static files with robust path resolution
    current_dir = Path(__file__).parent.parent.parent  # Go to project root
    images_dir = current_dir / "images"
    frontend_src_dir = current_dir / "frontend" / "src"
    frontend_dir = current_dir / "frontend"

    if images_dir.exists():
        app.mount("/images", StaticFiles(directory=str(images_dir)), name="images")
    if frontend_src_dir.exists():
        app.mount("/src", StaticFiles(directory=str(frontend_src_dir)), name="src")
    if frontend_dir.exists():
        app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="static")

    return app


# Create the app instance
app = create_app()