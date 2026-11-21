"""
Script to create development and admin accounts for testing.

This script creates multiple development user accounts with different roles
for testing and development purposes. It supports environment variables for
password configuration and is idempotent (can be run multiple times safely).

Default Accounts Created:
- admin: Full system administrator access
- dev_admin: Development administrator
- dev_teacher: Development teacher account
- dev_student: Development student account

Usage:
    python create_dev_user.py

Environment Variables (optional):
    ADMIN_PASSWORD: Password for 'admin' account (default: AdminDev123!)
    DEV_ADMIN_PASSWORD: Password for 'dev_admin' account (default: DevAdmin123!)
    DEV_TEACHER_PASSWORD: Password for 'dev_teacher' account (default: DevTeacher123!)
    DEV_STUDENT_PASSWORD: Password for 'dev_student' account (default: DevStudent123!)
"""

import asyncio
import sys
import os
from datetime import datetime
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession

# Import from the correct path
sys.path.insert(0, str(Path(__file__).parent / "src"))
from core.models.models import DBUser, UserRole, CreateUserRequest, SessionLocal
from utils.user_utils import create_user, get_user_by_username_or_email

# Development account definitions with environment variable support
DEV_ACCOUNTS = [
    {
        "username": "admin",
        "email": "admin@school.edu",
        "password": os.getenv("ADMIN_PASSWORD", "AdminDev123!"),
        "role": "admin",
        "description": "System Administrator - Full system access"
    },
    {
        "username": "dev_admin",
        "email": "dev.admin@school.edu",
        "password": os.getenv("DEV_ADMIN_PASSWORD", "DevAdmin123!"),
        "role": "admin",
        "description": "Development Administrator"
    },
    {
        "username": "dev_teacher",
        "email": "dev.teacher@school.edu",
        "password": os.getenv("DEV_TEACHER_PASSWORD", "DevTeacher123!"),
        "role": "teacher",
        "description": "Development Teacher"
    },
    {
        "username": "dev_student",
        "email": "dev.student@school.edu",
        "password": os.getenv("DEV_STUDENT_PASSWORD", "DevStudent123!"),
        "role": "student",
        "description": "Development Student"
    }
]

async def get_or_create_user(db: AsyncSession, account_data: dict) -> tuple[bool, str]:
    """
    Get existing user or create a new one if it doesn't exist.
    
    Args:
        db: Database session
        account_data: Dictionary with username, email, password, role, description
        
    Returns:
        tuple: (was_created: bool, message: str)
    """
    username = account_data["username"]
    
    # Check if user already exists
    existing_user = await get_user_by_username_or_email(db, username)
    
    if existing_user:
        # User exists - check if we need to update role or reactivate
        updates = []
        if existing_user.role != account_data["role"]:
            existing_user.role = account_data["role"]
            updates.append("role")
        if not existing_user.is_active:
            existing_user.is_active = True
            updates.append("active status")
        
        if updates:
            existing_user.updated_at = datetime.utcnow()
            await db.commit()
            return False, f"⚠️  User '{username}' exists - updated {', '.join(updates)}"
        else:
            return False, f"⚠️  User '{username}' already exists (no changes needed)"
    
    # Create new user
    try:
        user_request = CreateUserRequest(
            username=account_data["username"],
            email=account_data["email"],
            password=account_data["password"],
            role=account_data["role"]
        )
        created_user = await create_user(db, user_request)
        return True, f"✅ Created user '{username}' with role '{created_user.role}'"
    except Exception as e:
        raise Exception(f"Failed to create user '{username}': {str(e)}")

async def create_all_dev_users():
    """Create all development users."""
    
    print("🚀 Starting Development User Creation")
    print("=" * 70)
    
    results = []
    total_created = 0
    total_updated = 0
    
    async with SessionLocal() as db:
        try:
            for i, account in enumerate(DEV_ACCOUNTS, 1):
                print(f"\n[{i}/{len(DEV_ACCOUNTS)}] Processing: {account['username']}")
                print(f"   📧 Email: {account['email']}")
                print(f"   👑 Role: {account['role']}")
                print(f"   📝 {account['description']}")
                
                try:
                    was_created, message = await get_or_create_user(db, account)
                    results.append((account['username'], account['role'], was_created, message))
                    
                    if was_created:
                        total_created += 1
                        print(f"   {message}")
                    else:
                        if "updated" in message:
                            total_updated += 1
                        print(f"   {message}")
                        
                except Exception as e:
                    error_msg = f"❌ Error: {str(e)}"
                    results.append((account['username'], account['role'], False, error_msg))
                    print(f"   {error_msg}")
            
            # Summary
            print("\n" + "=" * 70)
            print("📊 CREATION SUMMARY")
            print("=" * 70)
            print(f"✅ Users created: {total_created}")
            print(f"🔄 Users updated: {total_updated}")
            print(f"📝 Total accounts processed: {len(DEV_ACCOUNTS)}")
            
            if total_created > 0 or total_updated > 0:
                print("\n📋 Account Details:")
                print("-" * 70)
                for username, role, was_created, message in results:
                    status = "NEW" if was_created else "EXISTING"
                    print(f"   {username:20} | {role:10} | {status}")
            
            await db.commit()
            return True, total_created, total_updated
            
        except Exception as e:
            await db.rollback()
            print(f"\n❌ FATAL ERROR: {str(e)}")
            return False, 0, 0

async def verify_all_users():
    """Verify all development users exist and have correct attributes."""
    
    print("\n" + "=" * 70)
    print("🔍 VERIFICATION REPORT")
    print("=" * 70)
    
    all_verified = True
    async with SessionLocal() as db:
        for account in DEV_ACCOUNTS:
            username = account["username"]
            user = await get_user_by_username_or_email(db, username)
            
            if not user:
                print(f"❌ {username:20} | NOT FOUND")
                all_verified = False
                continue
            
            # Check attributes
            role_match = user.role == account["role"]
            active_check = user.is_active
            email_match = user.email == account["email"]
            
            status = "✅" if (role_match and active_check and email_match) else "⚠️"
            print(f"{status} {username:20} | role={user.role:10} | active={active_check} | email={email_match}")
            
            if not (role_match and active_check and email_match):
                all_verified = False
    
    return all_verified

async def main():
    """Main function to create and verify development users."""
    print("🔧 Development User Management Script")
    print("=" * 70)
    
    # Create all users
    success, created, updated = await create_all_dev_users()
    
    if not success:
        print("\n❌ FAILED: Could not create development users!")
        return 1
    
    # Verify all users
    verified = await verify_all_users()
    
    # Print credentials for newly created users
    if created > 0:
        print("\n" + "=" * 70)
        print("🔑 NEWLY CREATED ACCOUNT CREDENTIALS")
        print("=" * 70)
        print("⚠️  IMPORTANT: Change these passwords in production!")
        print("-" * 70)
        for account in DEV_ACCOUNTS:
            # Only show credentials for newly created accounts (we'd need to track this better)
            # For now, show all for convenience
            print(f"\n👤 Username: {account['username']}")
            print(f"   📧 Email: {account['email']}")
            print(f"   🔑 Password: {account['password']}")
            print(f"   👑 Role: {account['role']}")
            print(f"   📝 {account['description']}")
    
    # Final status
    print("\n" + "=" * 70)
    if verified:
        print("🎉 SUCCESS: All development users are properly configured!")
    else:
        print("⚠️  WARNING: Some users may need manual verification")
    print("=" * 70)
    
    print("\n💡 USAGE TIPS:")
    print("   • Login endpoint: http://127.0.0.1:8001/api/auth/login")
    print("   • API documentation: http://127.0.0.1:8001/docs")
    print("   • Use these accounts for development and testing")
    print("   • Set environment variables to customize passwords")
    print("\n📚 Environment Variables (optional):")
    print("   • ADMIN_PASSWORD - password for 'admin' account")
    print("   • DEV_ADMIN_PASSWORD - password for 'dev_admin' account")
    print("   • DEV_TEACHER_PASSWORD - password for 'dev_teacher' account")
    print("   • DEV_STUDENT_PASSWORD - password for 'dev_student' account")
    
    return 0 if verified else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)