import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from models import SessionLocal, DBUser, CreateUserRequest, UserRole
from user_utils import create_user

async def test_user_creation():
    """Test creating the development user and write results to file."""
    results = []

    try:
        results.append("Starting user creation test...")

        # Check current user count
        async with SessionLocal() as db:
            from sqlalchemy import text
            result = await db.execute(text("SELECT COUNT(*) FROM users"))
            count = result.scalar()
            results.append(f"Current user count: {count}")

        # Create the dev user
        user_request = CreateUserRequest(
            username="dev_user",
            email="dev@example.com",
            password="dev_password_123",
            role="admin"
        )

        async with SessionLocal() as db:
            created_user = await create_user(db, user_request)
            results.append(f"✅ User created: {created_user.username}")
            results.append(f"🆔 ID: {created_user.id}")
            results.append(f"📧 Email: {created_user.email}")
            results.append(f"👑 Role: {created_user.role}")

        # Verify the user exists
        async with SessionLocal() as db:
            from sqlalchemy import text
            result = await db.execute(text("SELECT * FROM users WHERE username = ?"), ("dev_user",))
            user = result.fetchone()

            if user:
                results.append("✅ User verified in database!")
                results.append(f"Database ID: {user.id}")
                results.append(f"Database username: {user.username}")
                results.append(f"Database email: {user.email}")
                results.append(f"Database role: {user.role}")
                results.append(f"Database active: {user.is_active}")
            else:
                results.append("❌ User not found in database!")

    except Exception as e:
        results.append(f"❌ Error: {str(e)}")
        import traceback
        results.append(f"Traceback: {traceback.format_exc()}")

    # Write results to file
    with open("user_creation_test_results.txt", "w") as f:
        f.write("\n".join(results))

    print("Results written to user_creation_test_results.txt")

if __name__ == "__main__":
    asyncio.run(test_user_creation())