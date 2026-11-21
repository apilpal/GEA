import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from src.core.database import engine

async def test_db_connectivity():
    try:
        async with engine.begin() as conn:
            result = await conn.execute('SELECT 1 as test')
            row = result.fetchone()
            print(f"Database connectivity test: {row}")
            print("✅ Database connection successful")

            # Test tables exist
            tables_result = await conn.execute("""
                SELECT name FROM sqlite_master
                WHERE type='table' AND name IN ('students', 'drivers')
            """)
            tables = tables_result.fetchall()
            print(f"✅ Available tables: {[table[0] for table in tables]}")

            return True
    except Exception as e:
        print(f"❌ Database connectivity failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_db_connectivity())
    sys.exit(0 if success else 1)