import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Import from the correct path
sys.path.insert(0, str(Path(__file__).parent / "src"))
from core.models.models import SessionLocal, DBUser

async def check_dev_user():
    """Check if the development user exists in the database."""
    async with SessionLocal() as db:
        # Query for the dev user
        stmt = text("SELECT * FROM users WHERE username = :username")
        result = await db.execute(stmt, {"username": "dev_user"})
        user = result.fetchone()

        if user:
            print("✅ Development user found in database!")
            print("=" * 50)
            print(f"🆔 ID: {user.id}")
            print(f"👤 Username: {user.username}")
            print(f"📧 Email: {user.email}")
            print(f"👑 Role: {user.role}")
            print(f"🟢 Active: {user.is_active}")
            print(f"📅 Created: {user.created_at}")
            print(f"🔄 Updated: {user.updated_at}")
            print("=" * 50)

            # Verify admin privileges
            if user.role == "admin" and user.is_active:
                print("✅ User has admin privileges and is active!")
                return True
            else:
                print("❌ User does not have proper admin privileges!")
                return False
        else:
            print("❌ Development user not found in database!")
            return False

if __name__ == "__main__":
    asyncio.run(check_dev_user())