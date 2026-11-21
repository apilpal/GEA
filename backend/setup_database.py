"""
Simple database setup script to create basic tables for the school management system.
"""

import asyncio
import os
import sys
from pathlib import Path

# Set environment variable before any imports that might need it
os.environ["SECRET_KEY"] = "development-secret-key-12345"

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool

# Import from the correct path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from core.models.models import Base
from core.config.config import config

async def setup_database():
    """Create basic database tables."""
    print("🔧 Setting up database tables...")

    # Create async engine for SQLite
    database_url = config.DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://")
    engine = create_async_engine(
        database_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    try:
        # Create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        print("✅ Database tables created successfully!")
        return True

    except Exception as e:
        print(f"❌ Failed to create database tables: {str(e)}")
        return False

    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(setup_database())