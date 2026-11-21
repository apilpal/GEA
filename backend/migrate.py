#!/usr/bin/env python3
"""
Database Migration Script using Alembic
Provides command-line interface for database migrations
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(cmd: str, cwd: str = None) -> bool:
    """Execute an Alembic command and return success status.

    Runs the specified Alembic command in a subprocess. Unlike the build.py
    version, this function shows output in real-time rather than capturing it.

    Args:
        cmd (str): Alembic command to execute
        cwd (str, optional): Working directory for command execution

    Returns:
        bool: True if command succeeded (return code 0), False otherwise
    """
    try:
        print(f"Running: {cmd}")
        result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"Failed to run command '{cmd}': {e}")
        return False

def show_help() -> None:
    """Display comprehensive help information for the migration tool.

    Shows usage instructions, available commands, examples, and environment
    variables needed for database operations.
    """
    print("""
Database Migration Tool using Alembic

Usage: python migrate.py <command> [options]

Commands:
    init           Initialize Alembic migration environment
    revision -m "message"  Create a new migration revision
    upgrade head   Upgrade database to latest revision
    downgrade -1   Downgrade database by one revision
    current        Show current migration revision
    history        Show migration history
    check          Check if migration is needed
    status         Show migration status

Examples:
    python migrate.py revision -m "Add new table"
    python migrate.py upgrade head
    python migrate.py current
    python migrate.py history

Environment Variables:
    DATABASE_URL   Database connection string (default: sqlite:///students.db)
""")

def main() -> None:
    """Main entry point for the database migration tool.

    Processes command line arguments, validates inputs, and executes
    the appropriate Alembic migration commands. Provides a user-friendly
    interface for database schema management.

    Command Line Usage:
        python migrate.py <command> [options]

    The script automatically changes to the backend directory and
    executes Alembic commands with proper error handling.

    Exit Codes:
        0: Success
        1: Command failed or invalid arguments
    """
    if len(sys.argv) < 2 or sys.argv[1] in ['-h', '--help', 'help']:
        show_help()
        sys.exit(0)

    command = sys.argv[1]
    args = sys.argv[2:]

    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)

    # Build alembic command
    if command == 'init':
        cmd = f"alembic init alembic"
    else:
        cmd = f"alembic {command} {' '.join(args)}"

    # Run the command
    success = run_command(cmd, cwd=backend_dir)

    if success:
        print("✅ Migration command completed successfully")
        sys.exit(0)
    else:
        print("❌ Migration command failed")
        sys.exit(1)

if __name__ == "__main__":
    main()