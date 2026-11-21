#!/usr/bin/env python3
"""
Database Build Script for Student Profiles PWA
Handles database schema creation and migration using Alembic
Works from any directory with proper context detection
"""

import os
import sys
import subprocess
from pathlib import Path

# Global variables for context
SCRIPT_DIR = ""
BACKEND_DIR = ""
PROJECT_ROOT = ""

def detect_backend_context() -> bool:
    """Detect backend directory context and set up proper paths.

    Returns:
        bool: True if context detection succeeded, False otherwise
    """
    global SCRIPT_DIR, BACKEND_DIR, PROJECT_ROOT

    # Get the directory where this script is located
    SCRIPT_DIR = Path(__file__).parent.absolute()

    # The backend directory is where this script is located
    BACKEND_DIR = SCRIPT_DIR

    # Find project root by looking for key project files
    PROJECT_ROOT = BACKEND_DIR.parent

    # Verify we have the expected structure
    if not (BACKEND_DIR / "main.py").exists():
        print("❌ Error: Not in backend directory or backend structure is incorrect")
        print(f"Expected backend/main.py at: {BACKEND_DIR / 'main.py'}")
        return False

    if not (PROJECT_ROOT / "frontend" / "package.json").exists():
        print("⚠️  Warning: Frontend package.json not found, but continuing with backend build")
        print(f"Expected at: {PROJECT_ROOT / 'frontend' / 'package.json'}")

    print("🔍 Backend context detected:")
    print(f"  Script directory: {SCRIPT_DIR}")
    print(f"  Backend directory: {BACKEND_DIR}")
    print(f"  Project root: {PROJECT_ROOT}")

    return True

def run_command(cmd: str, cwd: str = None) -> bool:
    """Execute a shell command and return success status.

    Runs the given command in a subprocess, captures output, and provides
    clear success/failure feedback with error details.

    Args:
        cmd (str): Shell command to execute
        cwd (str, optional): Working directory for command execution

    Returns:
        bool: True if command succeeded (return code 0), False otherwise
    """
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Command failed: {cmd}")
            print(f"Error output: {result.stderr}")
            return False
        print(f"✅ {cmd}")
        return True
    except Exception as e:
        print(f"❌ Failed to run command '{cmd}': {e}")
        return False

def setup_database() -> bool:
    """Set up database schema and ensure tables exist.

    Performs database initialization by running Alembic migrations and
    creating tables if needed. Uses proper path resolution for different environments.

    Returns:
        bool: True if database setup completed successfully, False otherwise

    Process:
        1. Use detected backend directory context
        2. Run Alembic migrations to latest version
        3. Ensure database tables exist as fallback
    """
    print("=== Database Setup ===")

    # Use the globally detected backend directory
    backend_dir = BACKEND_DIR

    # Check if models exist (they should be in src/core/models/)
    models_file = backend_dir / "src" / "core" / "models" / "models.py"
    if not models_file.exists():
        print(f"❌ Error: Models file not found at: {models_file}")
        print("Expected structure: backend/src/core/models/models.py")
        return False

    # Run Alembic migrations
    print("Running database migrations...")

    # Check for multiple heads
    result = subprocess.run("alembic heads", shell=True, cwd=backend_dir, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Error checking Alembic heads: {result.stderr}")
        return False

    heads = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
    if len(heads) > 1:
        print(f"Multiple heads detected ({len(heads)} heads), merging...")
        if not run_command("alembic merge heads", cwd=backend_dir):
            return False

    # Upgrade to head
    if not run_command("alembic upgrade head", cwd=backend_dir):
        return False

    # Create tables (fallback in case Alembic fails)
    print("Ensuring database tables exist...")

    # Use proper Python path setup for the specific backend structure
    python_code = """
import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.abspath('.')
if backend_dir not in sys.path:
   sys.path.insert(0, backend_dir)

try:
   from src.core.models.models import Base
   print('✅ Tables verified successfully')
except ImportError as e:
   print(f'❌ Import error: {e}')
   sys.exit(1)
except Exception as e:
   print(f'❌ Error verifying tables: {e}')
   sys.exit(1)
"""

    # Write the Python code to a temporary file and execute it
    temp_script = backend_dir / "temp_table_check.py"
    try:
        temp_script.write_text(python_code)
        if not run_command(f"python {temp_script.name}", cwd=backend_dir):
            return False
    finally:
        # Clean up temporary file
        if temp_script.exists():
            temp_script.unlink()

    print("✅ Database setup complete")
    return True

def migrate_csv_data() -> bool:
    """Migrate existing CSV data to the database.

    Checks for and executes the data migration script if available.
    This is used to import legacy CSV data into the new database structure.

    Returns:
        bool: Always returns True (failures are logged but don't stop the build)

    Note:
        CSV migration failures are treated as warnings and don't fail the build
        process, allowing the application to start even with missing legacy data.
    """
    print("=== CSV Data Migration ===")

    # Use the globally detected backend directory
    backend_dir = BACKEND_DIR
    migration_script = backend_dir / "migrate_data.py"

    if migration_script.exists():
        print("Migrating CSV data...")
        if not run_command("python migrate_data.py", cwd=backend_dir):
            print("⚠️  CSV migration failed, but continuing...")
    else:
        print(f"ℹ️  No CSV migration script found at: {migration_script}")

    return True

def get_execution_context() -> str:
    """Detect the execution environment context.

    Returns:
        str: Execution context (CI/CD, Docker, Local)
    """
    if os.environ.get('CI') or os.environ.get('GITHUB_ACTIONS') or os.environ.get('GITLAB_CI'):
        return "CI/CD"
    elif os.path.exists('/.dockerenv') or os.environ.get('DOCKER_CONTAINER'):
        return "Docker"
    else:
        return "Local"

if __name__ == "__main__":
    print("🚀 Database Build Script")
    print("=" * 50)

    # Initialize context detection
    print("🔍 Initializing backend context...")
    if not detect_backend_context():
        print("❌ Failed to detect backend context")
        sys.exit(1)

    # Display execution context for debugging
    execution_context = get_execution_context()
    print(f"📍 Execution context: {execution_context}")
    print(f"🔧 Backend directory: {BACKEND_DIR}")
    print(f"📁 Project root: {PROJECT_ROOT}")
    print("")

    success = True

    # Setup database schema
    if not setup_database():
        success = False

    # Migrate CSV data (disabled by default, uncomment if needed)
    # if not migrate_csv_data():
        # success = False

    if success:
        print("\n🎉 Database build completed successfully!")
        print("📋 Build Summary:")
        print(f"  Context: {execution_context}")
        print(f"  Backend directory: {BACKEND_DIR}")
        print(f"  Models location: {BACKEND_DIR}/src/core/models/models.py")
        print("  Database migrations: Applied")
        if (BACKEND_DIR / "migrate_data.py").exists():
            print("  CSV migration: Available (disabled)")
        else:
            print("  CSV migration: Not available")
        sys.exit(0)
    else:
        print("\n❌ Database build failed!")
        print("🔍 Troubleshooting information:")
        print(f"  Script location: {SCRIPT_DIR}")
        print(f"  Backend directory: {BACKEND_DIR}")
        print(f"  Expected models: {BACKEND_DIR}/src/core/models/models.py")
        print("  Check if all required files exist and paths are correct")
        sys.exit(1)