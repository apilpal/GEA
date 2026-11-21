"""
Command-line interface for the school management system.

This module provides CLI commands for database management, user operations,
and system maintenance tasks.

Usage:
    python cli.py <command> [options]
"""

import asyncio
import sys
import argparse
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from models import SessionLocal, UserRole
from user_utils import get_user_count_by_role, deactivate_user, activate_user, generate_test_user_data, create_users_bulk
from seed_users import seed_users
from config import config

async def show_user_stats():
    """Display user statistics by role."""
    print("📊 User Statistics")
    print("=" * 30)

    async with SessionLocal() as db:
        counts = await get_user_count_by_role(db)

    for role, count in counts.items():
        print("8")

    total = sum(counts.values())
    print(f"Total Users: {total}")

async def create_test_users(args):
    """Create test users of a specific role."""
    role_map = {
        'admin': UserRole.ADMIN,
        'teacher': UserRole.TEACHER,
        'driver': UserRole.DRIVER,
        'student': UserRole.STUDENT
    }

    if args.role not in role_map:
        print(f"❌ Invalid role: {args.role}. Valid roles: {', '.join(role_map.keys())}")
        return

    role = role_map[args.role]
    count = args.count or 1
    password = args.password or "test123"

    print(f"🧪 Creating {count} test {role.value} user(s)...")

    users_data = generate_test_user_data(
        base_username=f"test{role.value}",
        role=role,
        count=count,
        password=password
    )

    async with SessionLocal() as db:
        try:
            created_users = await create_users_bulk(db, users_data)
            print(f"✅ Created {len(created_users)} test users")
        except Exception as e:
            print(f"❌ Failed to create users: {str(e)}")

async def deactivate_user_cmd(args):
    """Deactivate a user account."""
    print(f"🔒 Deactivating user: {args.username}")

    async with SessionLocal() as db:
        success = await deactivate_user(db, args.username)
        if success:
            print("✅ User deactivated successfully")
        else:
            print("❌ User not found")

async def activate_user_cmd(args):
    """Activate a user account."""
    print(f"🔓 Activating user: {args.username}")

    async with SessionLocal() as db:
        success = await activate_user(db, args.username)
        if success:
            print("✅ User activated successfully")
        else:
            print("❌ User not found")

async def run_seeding():
    """Run the user seeding script."""
    await seed_users()

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="School Management System CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli.py stats                    # Show user statistics
  python cli.py seed                     # Seed test users
  python cli.py create-test-users teacher --count 5  # Create 5 test teachers
  python cli.py deactivate admin         # Deactivate admin user
  python cli.py activate teacher1        # Activate teacher1 user
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Stats command
    subparsers.add_parser('stats', help='Show user statistics by role')

    # Seed command
    subparsers.add_parser('seed', help='Seed database with test users')

    # Create test users command
    create_parser = subparsers.add_parser('create-test-users', help='Create test users')
    create_parser.add_argument('role', choices=['admin', 'teacher', 'driver', 'student'],
                              help='Role for test users')
    create_parser.add_argument('--count', type=int, default=1,
                              help='Number of test users to create (default: 1)')
    create_parser.add_argument('--password', default='test123',
                              help='Password for test users (default: test123)')

    # Deactivate user command
    deactivate_parser = subparsers.add_parser('deactivate', help='Deactivate a user account')
    deactivate_parser.add_argument('username', help='Username to deactivate')

    # Activate user command
    activate_parser = subparsers.add_parser('activate', help='Activate a user account')
    activate_parser.add_argument('username', help='Username to activate')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Route to appropriate handler
    command_handlers = {
        'stats': show_user_stats,
        'seed': run_seeding,
        'create-test-users': lambda: create_test_users(args),
        'deactivate': lambda: deactivate_user_cmd(args),
        'activate': lambda: activate_user_cmd(args)
    }

    try:
        if args.command in ['create-test-users', 'deactivate', 'activate']:
            # These need the args object
            handler = command_handlers[args.command]
            asyncio.run(handler())
        else:
            # These don't need args
            asyncio.run(command_handlers[args.command]())
    except KeyboardInterrupt:
        print("\n❌ Operation cancelled by user")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()