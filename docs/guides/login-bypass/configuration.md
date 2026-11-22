# ⚙️ Login Bypass Configuration Guide

## Overview

The login bypass feature uses environment variables for both backend and frontend configuration. This guide covers all configuration options, environment-specific settings, best practices, and security considerations for the login bypass feature.

## Environment Variables

### **Backend Configuration**

#### **LOGIN_BYPASS_ENABLED**
```bash
# Enable bypass functionality
export LOGIN_BYPASS_ENABLED=true

# Disable bypass functionality
export LOGIN_BYPASS_ENABLED=false
```

| Property | Value |
|----------|-------|
| **Type** | Boolean (string) |
| **Default** | `true` |
| **Valid Values** | `"true"`, `"false"` |
| **Required** | Yes |
| **Security Level** | 🔴 **CRITICAL** |

**Purpose**: Master switch that controls whether the bypass login endpoint is available.

**Security Implications**:
- Must be `false` in all production environments
- When `true`, bypass endpoint is accessible without credentials
- Changes require service restart to take effect

**Configuration Examples**:
```bash
# Development environment
LOGIN_BYPASS_ENABLED=true

# Testing environment
LOGIN_BYPASS_ENABLED=true

# Production environment (SECURE)
LOGIN_BYPASS_ENABLED=false
```

#### **LOGIN_BYPASS_USERNAME**
```bash
# Set custom bypass username
export LOGIN_BYPASS_USERNAME=my_dev_user

# Use default
export LOGIN_BYPASS_USERNAME=bypass_user
```

| Property | Value |
|----------|-------|
| **Type** | String |
| **Default** | `bypass_user` |
| **Pattern** | `[a-zA-Z0-9_-]+` |
| **Max Length** | 50 characters |
| **Required** | No |
| **Security Level** | 🟡 **MODERATE** |

**Purpose**: Username for the virtual bypass user created during authentication.

**Validation Rules**:
- Must contain only alphanumeric characters, hyphens, and underscores
- Cannot be empty when bypass is enabled
- Should be descriptive for development environments

**Best Practices**:
```bash
# Descriptive names for different environments
export LOGIN_BYPASS_USERNAME=dev_bypass          # Development
export LOGIN_BYPASS_USERNAME=test_bypass         # Testing
export LOGIN_BYPASS_USERNAME=qa_bypass           # Quality Assurance

# Team-specific naming
export LOGIN_BYPASS_USERNAME=dev_alice_bypass
export LOGIN_BYPASS_USERNAME=dev_team_bypass
```

#### **LOGIN_BYPASS_ROLE**
```bash
# Assign admin role (full access)
export LOGIN_BYPASS_ROLE=admin

# Assign teacher role (educational access)
export LOGIN_BYPASS_ROLE=teacher

# Assign driver role (transport access)
export LOGIN_BYPASS_ROLE=driver

# Assign student role (limited access)
export LOGIN_BYPASS_ROLE=student
```

| Property | Value |
|----------|-------|
| **Type** | String (enum) |
| **Default** | `admin` |
| **Valid Values** | `admin`, `teacher`, `driver`, `student` |
| **Required** | No |
| **Security Level** | 🟡 **MODERATE** |

**Purpose**: Role assigned to the bypass user, determining their access level and permissions.

**Role-Based Access Levels**:

| Role | Permissions | Use Case |
|------|-------------|----------|
| **admin** | Full system access, user management, all CRUD operations | Development, system testing, full feature testing |
| **teacher** | Student data access, reports, limited admin functions | Educational feature testing, report generation |
| **driver** | Route information, student assignments, transport data | Transport system testing, route management |
| **student** | Personal profile, basic information access, limited data | Student interface testing, profile functionality |

**Security Considerations**:
```bash
# Use minimal required role for specific testing
export LOGIN_BYPASS_ROLE=teacher  # For testing educational features
export LOGIN_BYPASS_ROLE=driver   # For testing transport features
export LOGIN_BYPASS_ROLE=student  # For testing student interface

# Use admin only when full system access is required
export LOGIN_BYPASS_ROLE=admin    # For comprehensive system testing
```

### **Frontend Configuration**

#### **VITE_ENABLE_LOGIN_BYPASS**
```bash
# Show bypass button in login form
export VITE_ENABLE_LOGIN_BYPASS=true

# Hide bypass button
export VITE_ENABLE_LOGIN_BYPASS=false
```

| Property | Value |
|----------|-------|
| **Type** | Boolean (string) |
| **Default** | `false` |
| **Valid Values** | `"true"`, `"false"` |
| **Required** | No |
| **Security Level** | 🟡 **MODERATE** |

**Purpose**: Controls the visibility of the bypass login button in the frontend interface.

**Frontend Behavior**:
- When `true`: Shows "⚠️ Bypass Login (Dev Mode)" button on login page
- When `false`: Hides bypass button completely from UI
- Should typically match backend `LOGIN_BYPASS_ENABLED` setting

**Configuration Consistency**:
```bash
# Maintain consistency between frontend and backend
export LOGIN_BYPASS_ENABLED=true
export VITE_ENABLE_LOGIN_BYPASS=true

# Disable both in secure environments
export LOGIN_BYPASS_ENABLED=false
export VITE_ENABLE_LOGIN_BYPASS=false
```

#### **VITE_LOGIN_BYPASS_USER**
```bash
# Set bypass user identifier for frontend
export VITE_LOGIN_BYPASS_USER=dev_bypass

# Match backend configuration
export VITE_LOGIN_BYPASS_USER=bypass_user
```

| Property | Value |
|----------|-------|
| **Type** | String |
| **Default** | `admin` |
| **Pattern** | `[a-zA-Z0-9_-]+` |
| **Max Length** | 50 characters |
| **Required** | No |
| **Security Level** | 🟢 **LOW** |

**Purpose**: User identifier sent from frontend to backend during bypass login.

**Validation and Consistency**:
- Should match `LOGIN_BYPASS_USERNAME` for proper functionality
- Used in the request body when calling the bypass endpoint
- Frontend uses this to display appropriate user information

**Recommended Configuration**:
```bash
# Keep frontend and backend usernames consistent
export LOGIN_BYPASS_USERNAME=dev_bypass
export VITE_LOGIN_BYPASS_USER=dev_bypass

# Alternative: Use different identifiers for frontend display
export LOGIN_BYPASS_USERNAME=dev_bypass_user
export VITE_LOGIN_BYPASS_USER=admin
```

## Environment-Specific Configuration

### **Development Environment**

```bash
# .env.development
# ===================
# Development environment configuration for login bypass

# Backend Configuration
LOGIN_BYPASS_ENABLED=true
LOGIN_BYPASS_USERNAME=dev_bypass
LOGIN_BYPASS_ROLE=admin

# Frontend Configuration
VITE_ENABLE_LOGIN_BYPASS=true
VITE_LOGIN_BYPASS_USER=dev_bypass

# Development Environment Settings
ENVIRONMENT=development
LOG_LEVEL=DEBUG

# Development-specific Security
# Note: Relaxed security for easier development
# CORS allows localhost for development
# Detailed error messages enabled
```

**Development Configuration Features**:
- Full bypass functionality enabled
- Admin role for complete access
- Debug logging enabled
- Detailed error messages
- CORS configured for localhost

### **Testing Environment**

```bash
# .env.test
# =============
# Testing environment configuration for login bypass

# Backend Configuration
LOGIN_BYPASS_ENABLED=true
LOGIN_BYPASS_USERNAME=test_bypass
LOGIN_BYPASS_ROLE=teacher

# Frontend Configuration
VITE_ENABLE_LOGIN_BYPASS=true
VITE_LOGIN_BYPASS_USER=test_bypass

# Testing Environment Settings
ENVIRONMENT=testing
LOG_LEVEL=INFO
TEST_MODE=true
```

**Testing Configuration Features**:
- Bypass enabled for automated testing
- Teacher role for feature-specific testing
- Reduced logging for cleaner test output
- Test mode flag for specialized test behavior

### **Quality Assurance Environment**

```bash
# .env.qa
# ==========
# QA environment configuration for login bypass

# Backend Configuration
LOGIN_BYPASS_ENABLED=true
LOGIN_BYPASS_USERNAME=qa_bypass
LOGIN_BYPASS_ROLE=admin

# Frontend Configuration
VITE_ENABLE_LOGIN_BYPASS=true
VITE_LOGIN_BYPASS_USER=qa_bypass

# QA Environment Settings
ENVIRONMENT=qa
LOG_LEVEL=WARNING
QA_MODE=true
```

**QA Configuration Features**:
- Bypass enabled for QA testing
- Admin role for comprehensive testing
- Warning-level logging
- QA-specific features and flags

### **Production Environment (SECURE)**

```bash
# .env.production
# ================
# Production environment configuration (SECURE)

# Backend Configuration
LOGIN_BYPASS_ENABLED=false
# LOGIN_BYPASS_USERNAME=      # Remove or leave empty
# LOGIN_BYPASS_ROLE=          # Remove or leave empty

# Frontend Configuration
VITE_ENABLE_LOGIN_BYPASS=false
# VITE_LOGIN_BYPASS_USER=     # Remove or leave empty

# Production Environment Settings
ENVIRONMENT=production
LOG_LEVEL=ERROR
SECURE_MODE=true

# Security Enforcement
# Bypass variables should be absent or explicitly disabled
```

**Production Security Requirements**:
- 🚨 **LOGIN_BYPASS_ENABLED must be false**
- Remove or unset bypass-related variables
- Enable strict security mode
- Production-level error logging only

## Configuration Management

### **Environment File Management**

#### **File Organization**
```
project-root/
├── .env                 # Local overrides (not in git)
├── .env.development     # Development settings
├── .env.testing         # Testing settings
├── .env.qa              # QA settings
├── .env.production      # Production settings (secure)
└── .env.example         # Template for team members
```

#### **.env.example Template**
```bash
# Login Bypass Configuration Template
# Copy this file to .env and customize for your environment

# Backend Configuration
LOGIN_BYPASS_ENABLED=true
LOGIN_BYPASS_USERNAME=dev_bypass
LOGIN_BYPASS_ROLE=admin

# Frontend Configuration
VITE_ENABLE_LOGIN_BYPASS=true
VITE_LOGIN_BYPASS_USER=dev_bypass

# Development Environment
ENVIRONMENT=development
LOG_LEVEL=DEBUG
```

#### **Git Security**
```bash
# .gitignore - Ensure sensitive configurations are not committed
.env
.env.local
.env.*.local
bypass-config.txt
*_bypass_*.log
```

### **Configuration Loading**

#### **Backend Configuration Loading**
```python
# backend/src/core/config/config.py

class Config(BaseSettings):
    # ... existing settings ...
    
    # Login Bypass Configuration
    LOGIN_BYPASS_ENABLED: bool = os.getenv("LOGIN_BYPASS_ENABLED", "true").lower() == "true"
    LOGIN_BYPASS_USERNAME: str = os.getenv("LOGIN_BYPASS_USERNAME", "bypass_user")
    LOGIN_BYPASS_ROLE: str = os.getenv("LOGIN_BYPASS_ROLE", "admin")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._validate_bypass_config()
        
    def _validate_bypass_config(self):
        """Validate bypass configuration for security"""
        if self.ENVIRONMENT == "production":
            if self.LOGIN_BYPASS_ENABLED:
                raise ValueError("CRITICAL: Login bypass must be disabled in production!")
```

#### **Frontend Configuration Loading**
```typescript
// frontend/src/ts/config.ts

interface Config {
    // ... existing settings ...
    
    // Login Bypass Configuration
    readonly enableLoginBypass: boolean;
    readonly loginBypassUser: string;
    
    constructor() {
        // ... existing initialization ...
        
        // Authentication Bypass
        this.enableLoginBypass = this.getEnvVarBoolean('VITE_ENABLE_LOGIN_BYPASS', false);
        this.loginBypassUser = this.getEnvVar('VITE_LOGIN_BYPASS_USER', 'admin');
    }
    
    private getEnvVarBoolean(name: string, defaultValue: boolean): boolean {
        const value = this.getEnvVar(name);
        if (value === undefined || value === null) {
            return defaultValue;
        }
        return value.toLowerCase() === 'true';
    }
}
```

### **Configuration Validation**

#### **Backend Validation Script**
```python
#!/usr/bin/env python3
# scripts/validate-bypass-config.py

import os
import sys
from typing import List, Tuple

def validate_bypass_config() -> Tuple[bool, List[str]]:
    """Validate bypass configuration for security and consistency"""
    
    issues = []
    warnings = []
    
    # Environment detection
    environment = os.getenv("ENVIRONMENT", "unknown")
    bypass_enabled = os.getenv("LOGIN_BYPASS_ENABLED", "false").lower() == "true"
    frontend_enabled = os.getenv("VITE_ENABLE_LOGIN_BYPASS", "false").lower() == "true"
    
    # Security validations
    if environment == "production":
        if bypass_enabled:
            issues.append("CRITICAL: Bypass enabled in production!")
        if frontend_enabled:
            issues.append("CRITICAL: Frontend bypass enabled in production!")
    
    # Configuration consistency
    if bypass_enabled != frontend_enabled:
        warnings.append("Backend and frontend bypass settings don't match")
    
    # Username consistency
    backend_user = os.getenv("LOGIN_BYPASS_USERNAME", "")
    frontend_user = os.getenv("VITE_LOGIN_BYPASS_USER", "")
    
    if backend_user and frontend_user and backend_user != frontend_user:
        warnings.append(f"Username mismatch: backend='{backend_user}', frontend='{frontend_user}'")
    
    # Role validation
    valid_roles = {"admin", "teacher", "driver", "student"}
    role = os.getenv("LOGIN_BYPASS_ROLE", "")
    if role and role not in valid_roles:
        issues.append(f"Invalid bypass role: '{role}'. Valid roles: {valid_roles}")
    
    # Username validation
    username = os.getenv("LOGIN_BYPASS_USERNAME", "")
    if username and not username.replace("-", "").replace("_", "").isalnum():
        issues.append(f"Invalid username format: '{username}'. Use alphanumeric, hyphens, underscores only")
    
    return len(issues) == 0, issues + warnings

def main():
    is_valid, messages = validate_bypass_config()
    
    print("🔍 Bypass Configuration Validation")
    print("=" * 40)
    
    for message in messages:
        if "CRITICAL" in message:
            print(f"❌ {message}")
        else:
            print(f"⚠️  {message}")
    
    if is_valid:
        print("✅ Configuration validation passed")
        return 0
    else:
        print("❌ Configuration validation failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

#### **Frontend Validation Script**
```bash
#!/bin/bash
# scripts/validate-frontend-bypass-config.sh

echo "🔍 Frontend Bypass Configuration Validation"
echo "=" * 45)

# Check environment variables
FRONTEND_BYPASS="${VITE_ENABLE_LOGIN_BYPASS:-false}"
BYPASS_USER="${VITE_LOGIN_BYPASS_USER:-}"

echo "Frontend bypass enabled: $FRONTEND_BYPASS"
echo "Bypass user: $BYPASS_USER"

# Validate values
ISSUES=0

# Check boolean value
if [[ ! "$FRONTEND_BYPASS" =~ ^(true|false)$ ]]; then
    echo "❌ Invalid VITE_ENABLE_LOGIN_BYPASS value: $FRONTEND_BYPASS (must be true or false)"
    ((ISSUES++))
fi

# Check username format
if [[ -n "$BYPASS_USER" ]] && [[ ! "$BYPASS_USER" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "❌ Invalid VITE_LOGIN_BYPASS_USER format: $BYPASS_USER (alphanumeric, hyphens, underscores only)"
    ((ISSUES++))
fi

# Environment-specific checks
if [[ "$ENVIRONMENT" == "production" ]] && [[ "$FRONTEND_BYPASS" == "true" ]]; then
    echo "❌ CRITICAL: Frontend bypass enabled in production!"
    ((ISSUES++))
fi

if [[ $ISSUES -eq 0 ]]; then
    echo "✅ Frontend bypass configuration validation passed"
    exit 0
else
    echo "❌ Frontend bypass configuration validation failed"
    exit 1
fi
```

## Best Practices

### **Security Best Practices**

#### **1. Production Security**
```bash
# NEVER enable bypass in production
export LOGIN_BYPASS_ENABLED=false

# Remove sensitive configuration
unset LOGIN_BYPASS_USERNAME
unset LOGIN_BYPASS_ROLE
unset VITE_LOGIN_BYPASS_USER

# Use secure environment variables
export ENVIRONMENT=production
export SECURE_MODE=true
```

#### **2. Development Configuration**
```bash
# Use descriptive identifiers
export LOGIN_BYPASS_USERNAME=dev_$(whoami)_bypass
export VITE_LOGIN_BYPASS_USER=dev_$(whoami)_bypass

# Enable debug logging for development
export LOG_LEVEL=DEBUG

# Use minimal required role
export LOGIN_BYPASS_ROLE=teacher  # If only testing educational features
```

#### **3. Team Collaboration**
```bash
# Use environment-specific configurations
# .env.alice (for developer Alice)
LOGIN_BYPASS_USERNAME=alice_dev_bypass
VITE_LOGIN_BYPASS_USER=alice_dev_bypass

# .env.bob (for developer Bob)
LOGIN_BYPASS_USERNAME=bob_dev_bypass
VITE_LOGIN_BYPASS_USER=bob_dev_bypass
```

### **Configuration Management Best Practices**

#### **1. Environment Isolation**
```bash
# Use separate .env files for each environment
.env.development    # Development
.env.testing        # Automated tests
.env.staging        # Staging/QA
.env.production     # Production (secure)
```

#### **2. Variable Validation**
```python
# Always validate configuration at startup
def validate_environment():
    if os.getenv("ENVIRONMENT") == "production":
        if os.getenv("LOGIN_BYPASS_ENABLED", "false").lower() == "true":
            raise SecurityError("Bypass must be disabled in production!")
```

#### **3. Documentation**
```bash
# Document configuration requirements
# CONFIG.md
## Login Bypass Configuration

| Variable | Purpose | Default | Security Level |
|----------|---------|---------|----------------|
| LOGIN_BYPASS_ENABLED | Master bypass switch | true | CRITICAL |
| LOGIN_BYPASS_USERNAME | Bypass user identifier | bypass_user | MODERATE |
| LOGIN_BYPASS_ROLE | User role/permissions | admin | MODERATE |

### Environment-Specific Settings
- Development: All bypass features enabled
- Testing: Bypass enabled with test-specific roles
- Production: Bypass completely disabled
```

### **Deployment Best Practices**

#### **1. Environment-Specific Deployment**
```bash
#!/bin/bash
# deploy.sh

ENVIRONMENT=${1:-development}

case $ENVIRONMENT in
    development)
        export LOGIN_BYPASS_ENABLED=true
        export LOGIN_BYPASS_USERNAME=dev_bypass
        export LOGIN_BYPASS_ROLE=admin
        export VITE_ENABLE_LOGIN_BYPASS=true
        export VITE_LOGIN_BYPASS_USER=dev_bypass
        ;;
    testing)
        export LOGIN_BYPASS_ENABLED=true
        export LOGIN_BYPASS_USERNAME=test_bypass
        export LOGIN_BYPASS_ROLE=teacher
        export VITE_ENABLE_LOGIN_BYPASS=true
        export VITE_LOGIN_BYPASS_USER=test_bypass
        ;;
    production)
        export LOGIN_BYPASS_ENABLED=false
        unset LOGIN_BYPASS_USERNAME
        unset LOGIN_BYPASS_ROLE
        export VITE_ENABLE_LOGIN_BYPASS=false
        unset VITE_LOGIN_BYPASS_USER
        ;;
esac

echo "Deployed to $ENVIRONMENT environment"
```

#### **2. Configuration Validation in CI/CD**
```yaml
# .github/workflows/validate-config.yml
name: Validate Configuration

on: [push, pull_request]

jobs:
  validate-bypass-config:
    runs-on: ubuntu-latest
    
    steps:
      - name: Validate Bypass Configuration
        run: |
          cd backend
          python scripts/validate-bypass-config.py
          
          cd ../frontend
          bash scripts/validate-frontend-bypass-config.sh
          
      - name: Production Security Check
        if: github.ref == 'refs/heads/main'
        run: |
          # Ensure bypass is disabled in production
          if [ "${{ secrets.LOGIN_BYPASS_ENABLED }}" = "true" ]; then
            echo "❌ CRITICAL: Bypass must be disabled in production!"
            exit 1
          fi
```

#### **3. Automated Configuration Management**
```python
#!/usr/bin/env python3
# scripts/manage-bypass-config.py

import os
import argparse
import json
from pathlib import Path

class BypassConfigManager:
    def __init__(self, environment="development"):
        self.environment = environment
        self.config_file = Path(f".env.{environment}")
        
    def create_config(self, enabled=True, username="", role="admin"):
        """Create or update bypass configuration"""
        
        config = {
            "LOGIN_BYPASS_ENABLED": str(enabled).lower(),
            "LOGIN_BYPASS_USERNAME": username or f"{self.environment}_bypass",
            "LOGIN_BYPASS_ROLE": role,
            "VITE_ENABLE_LOGIN_BYPASS": str(enabled).lower(),
            "VITE_LOGIN_BYPASS_USER": username or f"{self.environment}_bypass",
            "ENVIRONMENT": self.environment
        }
        
        if self.environment == "production" and enabled:
            raise ValueError("Cannot enable bypass in production!")
            
        # Write configuration file
        with open(self.config_file, 'w') as f:
            f.write(f"# Bypass configuration for {self.environment}\n")
            for key, value in config.items():
                if value:  # Only write non-empty values
                    f.write(f"{key}={value}\n")
                    
        print(f"✅ Created {self.config_file}")
        
    def validate_config(self):
        """Validate current configuration"""
        if not self.config_file.exists():
            print(f"❌ Config file not found: {self.config_file}")
            return False
            
        # Load and validate configuration
        with open(self.config_file, 'r') as f:
            config = {}
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    config[key] = value
                    
        # Validation logic here...
        return True
        
    def apply_config(self):
        """Apply configuration to current environment"""
        if not self.config_file.exists():
            print(f"❌ Config file not found: {self.config_file}")
            return False
            
        # Source the configuration file
        with open(self.config_file, 'r') as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    os.environ[key] = value
                    
        print(f"✅ Applied configuration from {self.config_file}")
        return True

def main():
    parser = argparse.ArgumentParser(description="Manage bypass configuration")
    parser.add_argument("action", choices=["create", "validate", "apply"], 
                       help="Action to perform")
    parser.add_argument("--env", default="development", 
                       help="Environment name (default: development)")
    parser.add_argument("--enabled", action="store_true", 
                       help="Enable bypass")
    parser.add_argument("--disabled", action="store_true", 
                       help="Disable bypass")
    parser.add_argument("--username", 
                       help="Bypass username")
    parser.add_argument("--role", choices=["admin", "teacher", "driver", "student"],
                       default="admin", help="Bypass user role")
    
    args = parser.parse_args()
    
    manager = BypassConfigManager(args.env)
    
    if args.action == "create":
        enabled = not args.disabled
        manager.create_config(enabled, args.username, args.role)
    elif args.action == "validate":
        manager.validate_config()
    elif args.action == "apply":
        manager.apply_config()

if __name__ == "__main__":
    main()
```

## Troubleshooting Configuration

### **Common Configuration Issues**

#### **1. Environment Variables Not Loading**
```bash
# Check if environment file exists
ls -la .env*

# Verify environment variable loading
printenv | grep BYPASS

# Manually source environment file
source .env.development
```

#### **2. Configuration Mismatch**
```bash
# Verify consistency between frontend and backend
echo "Backend: $LOGIN_BYPASS_ENABLED"
echo "Frontend: $VITE_ENABLE_LOGIN_BYPASS"

echo "Backend username: $LOGIN_BYPASS_USERNAME"
echo "Frontend user: $VITE_LOGIN_BYPASS_USER"
```

#### **3. Service Restart Issues**
```bash
# Ensure services are properly restarted
pkill -f uvicorn
pkill -f "npm run dev"

# Wait for processes to terminate
sleep 5

# Restart with environment variables
export LOGIN_BYPASS_ENABLED=true
cd backend && python run_server.py &

export VITE_ENABLE_LOGIN_BYPASS=true
cd frontend && npm run dev &
```

### **Configuration Debugging**

#### **Debug Configuration Loading**
```python
# debug-config-loading.py
import os
import json

def debug_configuration():
    """Debug configuration loading and validation"""
    
    print("=== Bypass Configuration Debug ===")
    
    # Environment variables
    bypass_vars = {
        "LOGIN_BYPASS_ENABLED": os.getenv("LOGIN_BYPASS_ENABLED"),
        "LOGIN_BYPASS_USERNAME": os.getenv("LOGIN_BYPASS_USERNAME"),
        "LOGIN_BYPASS_ROLE": os.getenv("LOGIN_BYPASS_ROLE"),
        "VITE_ENABLE_LOGIN_BYPASS": os.getenv("VITE_ENABLE_LOGIN_BYPASS"),
        "VITE_LOGIN_BYPASS_USER": os.getenv("VITE_LOGIN_BYPASS_USER"),
        "ENVIRONMENT": os.getenv("ENVIRONMENT")
    }
    
    print("Environment Variables:")
    for key, value in bypass_vars.items():
        print(f"  {key}: {value}")
    
    # Type validation
    print("\nType Validation:")
    for key, value in bypass_vars.items():
        if value is None:
            print(f"  {key}: Not set")
        elif key.endswith("ENABLED"):
            is_bool = value.lower() in ['true', 'false']
            print(f"  {key}: {value} ({'valid' if is_bool else 'invalid'} boolean)")
        else:
            print(f"  {key}: {value}")
    
    # Environment file contents
    print("\nEnvironment File Contents:")
    for env_file in [".env", ".env.development", ".env.local"]:
        if os.path.exists(env_file):
            print(f"\n{env_file}:")
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if 'BYPASS' in line.upper() and not line.startswith('#'):
                        print(f"  {line}")

if __name__ == "__main__":
    debug_configuration()
```

## Integration with Existing Systems

### **Docker Configuration**

#### **Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - LOGIN_BYPASS_ENABLED=true
      - LOGIN_BYPASS_USERNAME=docker_bypass
      - LOGIN_BYPASS_ROLE=admin
      - ENVIRONMENT=development
    env_file:
      - .env.development
    ports:
      - "8000:8000"
      
  frontend:
    build: ./frontend
    environment:
      - VITE_ENABLE_LOGIN_BYPASS=true
      - VITE_LOGIN_BYPASS_USER=docker_bypass
    env_file:
      - .env.development
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

#### **Dockerfile**
```dockerfile
# Backend Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Copy configuration files
COPY .env* ./

# Install dependencies
RUN pip install -r requirements.txt

# Validate configuration
RUN python scripts/validate-bypass-config.py

# Start application
CMD ["python", "run_server.py"]
```

### **Kubernetes Configuration**

#### **ConfigMap**
```yaml
# bypass-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bypass-config
data:
  LOGIN_BYPASS_ENABLED: "false"  # Always false in production
  ENVIRONMENT: "production"
```

#### **Secret**
```yaml
# bypass-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bypass-secret
type: Opaque
stringData:
  LOGIN_BYPASS_ENABLED: "false"  # Explicit secret for production
```

### **CI/CD Integration**

#### **GitHub Actions**
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

env:
  LOGIN_BYPASS_ENABLED: ${{ secrets.LOGIN_BYPASS_ENABLED }}
  VITE_ENABLE_LOGIN_BYPASS: ${{ secrets.VITE_ENABLE_LOGIN_BYPASS }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.8'
          
      - name: Validate bypass configuration
        run: |
          python scripts/validate-bypass-config.py
          
      - name: Run tests
        run: |
          # Tests will use bypass if enabled
          pytest tests/
          
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to production
        run: |
          # Ensure bypass is disabled in production
          echo "LOGIN_BYPASS_ENABLED=false" >> $GITHUB_ENV
          echo "VITE_ENABLE_LOGIN_BYPASS=false" >> $GITHUB_ENV
          
          # Deploy with production configuration
          ./deploy.sh production
```

## Summary

The login bypass feature configuration is managed through environment variables that provide:

1. **Security Control**: Master switches to enable/disable bypass functionality
2. **User Management**: Configuration of bypass user identity and role
3. **Environment Isolation**: Different settings for development, testing, and production
4. **Deployment Integration**: Support for Docker, Kubernetes, and CI/CD systems
5. **Validation**: Built-in security checks and configuration validation

**Key Configuration Principles**:
- 🔴 **Production Security**: Always disable bypass in production environments
- 🟡 **Development Flexibility**: Enable bypass for development and testing convenience
- 🟢 **Validation**: Use configuration validation to prevent security misconfigurations
- 🔵 **Consistency**: Maintain consistency between frontend and backend configurations

For complete implementation details, see **[Login Bypass Feature Documentation](overview.md)**.

---

**Last Updated:** November 8, 2025  
**Maintained by:** Student Profiles PWA Development Team