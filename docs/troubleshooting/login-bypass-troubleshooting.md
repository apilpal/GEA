# 🔓 Login Bypass Troubleshooting Guide

## Overview

This guide provides solutions for common issues with the **Login Bypass Feature** - a development and testing tool that allows instant authentication without credentials. All bypass-related problems, configuration issues, and security concerns are covered here.

## ⚠️ **Important Security Note**

🚨 **The login bypass feature is for development and testing only**. If you're experiencing bypass issues in production, this indicates a **critical security misconfiguration** that must be addressed immediately.

## Quick Diagnosis

### **Is Bypass Feature Working?**

```bash
# Test backend configuration
echo "Backend Bypass Status: $LOGIN_BYPASS_ENABLED"
echo "Backend Bypass Username: $LOGIN_BYPASS_USERNAME"
echo "Backend Bypass Role: $LOGIN_BYPASS_ROLE"

# Test frontend configuration  
echo "Frontend Bypass Status: $VITE_ENABLE_LOGIN_BYPASS"
echo "Frontend Bypass User: $VITE_LOGIN_BYPASS_USER"
```

**✅ Expected Output (Development):**
```
Backend Bypass Status: true
Backend Bypass Username: dev_bypass
Backend Bypass Role: admin
Frontend Bypass Status: true
Frontend Bypass User: dev_bypass
```

## Common Issues and Solutions

### **1. Bypass Button Not Appearing**

#### **Symptoms**
- Login page shows no bypass button
- No "⚠️ Bypass Login (Dev Mode)" option
- Bypass feature completely invisible

#### **Root Causes**
- Frontend environment variable not set correctly
- Configuration not loaded properly  
- Environment mismatch between frontend and backend
- Services not restarted after configuration change

#### **Solutions**

**Check Environment Variables:**
```bash
# Verify frontend configuration
echo $VITE_ENABLE_LOGIN_BYPASS
# Should return: true

# If not set, configure and restart
export VITE_ENABLE_LOGIN_BYPASS=true
```

**Verify Configuration Loading:**
```bash
cd frontend
node -e "
const config = require('./src/ts/config.ts');
console.log('Bypass enabled:', config.enableLoginBypass);
console.log('Bypass user:', config.loginBypassUser);
"
```

**Restart Services:**
```bash
# Stop all services
pkill -f uvicorn && pkill -f "http.server"

# Start with correct environment
export VITE_ENABLE_LOGIN_BYPASS=true
export LOGIN_BYPASS_ENABLED=true

# Start backend
cd backend && python run_server.py &

# Start frontend (in new terminal)
cd frontend && npm run dev
```

**Browser Cache Clear:**
```javascript
// Clear localStorage cache in browser console
localStorage.clear();
sessionStorage.clear();

// Reload page
location.reload();
```

### **2. Bypass Login Fails**

#### **Symptoms**
- Bypass button appears but login fails
- "Login bypass is disabled" error
- HTTP 403 Forbidden response
- Authentication unsuccessful

#### **Root Causes**
- Backend bypass disabled while frontend enabled
- Configuration mismatch
- API endpoint errors
- Environment variable loading issues

#### **Solutions**

**Verify Backend Configuration:**
```bash
# Check backend bypass status
curl -X GET "http://127.0.0.1:8000/api/health" \
     -H "Authorization: Bearer test-token"

# Test bypass endpoint directly
curl -X POST "http://127.0.0.1:8000/auth/bypass-login" \
     -H "Content-Type: application/json" \
     -d '{"username": "bypass_user"}'

# Should return 200 OK with token, not 403 Forbidden
```

**Debug Backend Configuration:**
```bash
cd backend
python -c "
from src.core.config.config import config
print('Bypass enabled:', config.LOGIN_BYPASS_ENABLED)
print('Bypass username:', config.LOGIN_BYPASS_USERNAME)
print('Bypass role:', config.LOGIN_BYPASS_ROLE)
"

# If bypass_enabled is False, fix environment
export LOGIN_BYPASS_ENABLED=true
export LOGIN_BYPASS_USERNAME=dev_bypass
export LOGIN_BYPASS_ROLE=admin
```

**Check Configuration Consistency:**
```bash
# Ensure frontend and backend usernames match
export LOGIN_BYPASS_USERNAME=dev_bypass
export VITE_LOGIN_BYPASS_USER=dev_bypass
```

**Review Backend Logs:**
```bash
# Check for configuration or endpoint errors
tail -f backend/logs/app.log

# Look for:
# - "LOGIN BYPASS USED" messages
# - Configuration loading errors
# - Authentication endpoint errors
```

### **3. Bypass User Has Wrong Permissions**

#### **Symptoms**
- Bypass user cannot access expected features
- Missing administrative functions
- Role-based restrictions not working
- "Insufficient permissions" errors

#### **Root Causes**
- Incorrect `LOGIN_BYPASS_ROLE` configuration
- Role validation issues
- Permission system misconfiguration

#### **Solutions**

**Verify Role Configuration:**
```bash
# Check current bypass role
echo "Current bypass role: $LOGIN_BYPASS_ROLE"

# Set appropriate role for testing
export LOGIN_BYPASS_ROLE=admin  # For full access
export LOGIN_BYPASS_ROLE=teacher  # For educational access

# Restart backend to apply changes
cd backend && python run_server.py
```

**Test Role Permissions:**
```bash
# Login with bypass and test admin endpoints
curl -X POST "http://127.0.0.1:8000/auth/bypass-login" \
     -H "Content-Type: application/json" \
     -d '{"username": "bypass_user"}' \
     -c test_cookies.txt

# Test admin endpoint
curl -X GET "http://127.0.0.1:8000/api/auth/me" \
     -H "Cookie: $(cat test_cookies.txt)"

# Should show correct role in response
```

**Debug Role Assignment:**
```bash
cd backend
python -c "
from src.core.config.config import config
from src.core.models.models import UserRole

print('Configured role:', config.LOGIN_BYPASS_ROLE)
try:
    role = UserRole(config.LOGIN_BYPASS_ROLE)
    print('Valid role:', role.value)
except ValueError as e:
    print('Invalid role:', e)
    print('Valid roles: admin, teacher, driver, student')
"
```

### **4. Configuration Not Loading**

#### **Symptoms**
- Configuration changes have no effect
- Default values always used
- Environment variables ignored
- Bypass behaves unexpectedly

#### **Root Causes**
- Environment file not loaded
- Service not restarted after configuration change
- Shell environment not persisted
- Wrong configuration file location

#### **Solutions**

**Verify Environment File Loading:**
```bash
# Check which .env file is being used
cd backend
ls -la .env*

# Create or update .env.development
cat > .env.development << EOF
LOGIN_BYPASS_ENABLED=true
LOGIN_BYPASS_USERNAME=dev_bypass
LOGIN_BYPASS_ROLE=admin
EOF

# Load environment explicitly
source .env.development
```

**Check Configuration Loading in Code:**
```bash
cd backend
python -c "
import os
print('Environment variables:')
for key, value in os.environ.items():
    if 'BYPASS' in key or 'LOGIN' in key:
        print(f'{key}: {value}')

from src.core.config.config import config
print('\\nConfig object:')
print(f'LOGIN_BYPASS_ENABLED: {config.LOGIN_BYPASS_ENABLED}')
print(f'LOGIN_BYPASS_USERNAME: {config.LOGIN_BYPASS_USERNAME}')
print(f'LOGIN_BYPASS_ROLE: {config.LOGIN_BYPASS_ROLE}')
"
```

**Ensure Persistence:**
```bash
# Add to shell profile for persistence
echo 'export LOGIN_BYPASS_ENABLED=true' >> ~/.bashrc
echo 'export LOGIN_BYPASS_USERNAME=dev_bypass' >> ~/.bashrc
echo 'export LOGIN_BYPASS_ROLE=admin' >> ~/.bashrc

# Reload profile
source ~/.bashrc
```

### **5. Audit Logging Issues**

#### **Symptoms**
- Bypass activities not logged
- Missing security audit trail
- No bypass usage records
- Security monitoring incomplete

#### **Root Causes**
- Logging configuration issues
- Database logging disabled
- Audit service problems
- Log level too restrictive

#### **Solutions**

**Enable Audit Logging:**
```python
# Ensure audit logging is enabled
import logging
logging.basicConfig(level=logging.INFO)

# Check if audit service is working
from src.services.jwt_service import jwt_service
print("Audit logger available:", hasattr(jwt_service, 'audit_logger'))
```

**Test Manual Audit Logging:**
```python
# Test audit logging manually
import asyncio
from src.services.jwt_service import jwt_service
from src.core.database import get_db

async def test_audit_logging():
    async with get_db() as db:
        await jwt_service.audit_logger.log_login(
            db, "test_bypass", "test_device", "127.0.0.1", True, "test_bypass_log"
        )
        print("Manual audit log entry created")

# Run the test
asyncio.run(test_audit_logging())
```

**Check Log Output:**
```bash
# Enable detailed logging
export LOG_LEVEL=DEBUG

# Restart backend
cd backend && python run_server.py

# Monitor for bypass log entries
tail -f logs/app.log | grep -i bypass
```

### **6. Security Configuration Issues**

#### **Symptoms**
- Bypass enabled in production
- Security warnings not shown
- Audit logging disabled
- Production misconfiguration

#### **Root Causes**
- Production environment variables misconfigured
- Security validation missing
- Deployment script issues
- Configuration environment detection problems

#### **Solutions**

**Production Security Check:**
```python
# Add to production deployment validation
import os

def validate_production_security():
    """Ensure bypass is disabled in production"""
    if os.getenv("ENVIRONMENT") == "production":
        if os.getenv("LOGIN_BYPASS_ENABLED", "false").lower() == "true":
            raise SecurityError("CRITICAL: Bypass login enabled in production!")
        
        print("✅ Production security validation passed")

# Run validation
validate_production_security()
```

**Security Deployment Script:**
```bash
#!/bin/bash
# production-deploy.sh

echo "🔒 Validating production security..."

# Ensure bypass is disabled in production
export ENVIRONMENT=production
export LOGIN_BYPASS_ENABLED=false
unset LOGIN_BYPASS_USERNAME
unset LOGIN_BYPASS_ROLE

# Validate configuration
if [ "$LOGIN_BYPASS_ENABLED" = "false" ]; then
    echo "✅ Bypass correctly disabled for production"
else
    echo "❌ CRITICAL: Bypass must be disabled in production!"
    exit 1
fi

echo "✅ Production security validation completed"
```

**Environment-Specific Validation:**
```bash
# Check current environment
echo "Current environment: $ENVIRONMENT"

# Production validation
if [ "$ENVIRONMENT" = "production" ]; then
    if [ "$LOGIN_BYPASS_ENABLED" = "true" ]; then
        echo "❌ SECURITY ERROR: Bypass enabled in production!"
        exit 1
    fi
    echo "✅ Production security check passed"
fi

# Development validation  
if [ "$ENVIRONMENT" = "development" ]; then
    if [ "$LOGIN_BYPASS_ENABLED" = "false" ]; then
        echo "ℹ️  Bypass disabled in development (may be intentional)"
    fi
    echo "ℹ️  Development environment detected"
fi
```

## Advanced Troubleshooting

### **Debug Mode Configuration**

#### **Enable Comprehensive Debugging**
```python
# Backend debug configuration
import logging

# Set debug level for authentication
logging.getLogger('src.api.v1.routers.auth').setLevel(logging.DEBUG)
logging.getLogger('src.services.jwt_service').setLevel(logging.DEBUG)

# Enable SQL query logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

```javascript
// Frontend debug configuration
localStorage.setItem('auth-debug', 'true');
localStorage.setItem('bypass-debug', 'true');

// Monitor auth state changes
console.log('Bypass auth debug enabled');
```

#### **Debug Information Collection**
```bash
#!/bin/bash
# collect-bypass-debug.sh

echo "=== Bypass Configuration Debug Report ==="
echo "Timestamp: $(date)"
echo

echo "Environment Variables:"
env | grep -i bypass
env | grep -i login
echo

echo "Backend Configuration:"
cd backend
python -c "
from src.core.config.config import config
print('Bypass enabled:', config.LOGIN_BYPASS_ENABLED)
print('Bypass username:', config.LOGIN_BYPASS_USERNAME)
print('Bypass role:', config.LOGIN_BYPASS_ROLE)
"
echo

echo "Frontend Configuration:"
cd ../frontend
grep -r "bypass\|BYPASS" src/ts/config.ts || echo "No bypass config found"
echo

echo "Process Status:"
ps aux | grep -E "(uvicorn|vite|node)" | grep -v grep
echo

echo "Port Status:"
netstat -tulpn 2>/dev/null | grep -E "(8000|5173|3002)" || echo "No relevant ports found"
echo

echo "Recent Logs (last 20 lines):"
if [ -f backend/logs/app.log ]; then
    tail -20 backend/logs/app.log | grep -i bypass || echo "No bypass logs found"
else
    echo "No backend log file found"
fi
```

### **Network and Connectivity Issues**

#### **Port and Service Validation**
```bash
# Check if services are running on expected ports
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/health
echo " (Backend health check)"

curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173
echo " (Frontend status)"

# Test specific bypass endpoint
curl -v -X POST "http://127.0.0.1:8000/auth/bypass-login" \
     -H "Content-Type: application/json" \
     -d '{"username": "bypass_user"}' 2>&1 | head -20
```

#### **CORS Configuration Check**
```bash
# Test CORS with bypass endpoint
curl -X OPTIONS "http://127.0.0.1:8000/auth/bypass-login" \
     -H "Origin: http://127.0.0.1:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -v

# Check backend CORS configuration
cd backend
python -c "
from src.core.config.config import config
print('CORS origins:', config.CORS_ORIGINS)
print('Frontend port:', config.FRONTEND_PORT)
"
```

### **Database and Persistence Issues**

#### **Check Database Configuration**
```bash
# Test database connectivity
cd backend
python -c "
from sqlalchemy.ext.asyncio import create_async_engine
import asyncio

async def test_db():
    engine = create_async_engine('sqlite:///./students.db')
    try:
        async with engine.begin() as conn:
            result = await conn.execute('SELECT 1')
            print('Database connection: OK')
    except Exception as e:
        print(f'Database connection: FAILED - {e}')

asyncio.run(test_db())
"
```

#### **Audit Log Database Check**
```python
# Check if audit logging is working at database level
async def check_audit_logs():
    from src.core.database import get_db
    from sqlalchemy import select
    from src.core.models.models import AuthAuditLog
    
    async with get_db() as db:
        # Check for recent bypass logs
        result = await db.execute(
            select(AuthAuditLog)
            .where(AuthAuditLog.reason == "login_bypass_used")
            .order_by(AuthAuditLog.created_at.desc())
            .limit(10)
        )
        
        logs = result.fetchall()
        print(f"Found {len(logs)} bypass audit log entries")
        
        for log in logs:
            print(f"- {log.created_at}: {log.username} ({log.success})")
```

## Performance Troubleshooting

### **Slow Bypass Login**

#### **Performance Monitoring**
```python
# Add performance monitoring to bypass endpoint
import time
import logging

logger = logging.getLogger(__name__)

@router.post("/bypass-login")
async def bypass_login():
    start_time = time.time()
    
    try:
        # ... existing bypass logic ...
        
        elapsed = time.time() - start_time
        logger.info(f"Bypass login completed in {elapsed:.3f} seconds")
        
        if elapsed > 1.0:  # Log slow operations
            logger.warning(f"Slow bypass login: {elapsed:.3f} seconds")
            
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"Bypass login failed after {elapsed:.3f} seconds: {e}")
        raise
```

#### **Frontend Performance Debug**
```javascript
// Monitor bypass login performance
const startTime = performance.now();

try {
    const result = await authContext.loginWithBypass();
    const endTime = performance.now();
    
    console.log(`Bypass login took ${(endTime - startTime).toFixed(2)}ms`);
    
    if (endTime - startTime > 1000) {
        console.warn('Slow bypass login detected');
    }
} catch (error) {
    const endTime = performance.now();
    console.error(`Bypass login failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
}
```

## Recovery Procedures

### **Emergency Bypass Disable**

#### **Immediate Production Fix**
```bash
#!/bin/bash
# emergency-disable-bypass.sh

echo "🚨 EMERGENCY: Disabling login bypass feature"

# Disable bypass immediately
export LOGIN_BYPASS_ENABLED=false
export VITE_ENABLE_LOGIN_BYPASS=false

# Unset sensitive variables
unset LOGIN_BYPASS_USERNAME
unset LOGIN_BYPASS_ROLE
unset VITE_LOGIN_BYPASS_USER

# Restart services
pkill -f uvicorn
pkill -f "npm run dev"

# Restart with secure configuration
cd backend && nohup python run_server.py > /dev/null 2>&1 &
sleep 5
cd ../frontend && nohup npm run dev > /dev/null 2>&1 &

echo "✅ Bypass feature disabled and services restarted"
echo "⚠️  Review audit logs for any bypass usage"
```

#### **Security Incident Response**
```python
# Emergency security procedures
import asyncio
from datetime import datetime, timedelta
from src.core.database import get_db
from sqlalchemy import select
from src.core.models.models import AuthAuditLog

async def security_incident_response():
    """Respond to potential bypass security incident"""
    
    # Check for recent bypass usage
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    
    async with get_db() as db:
        result = await db.execute(
            select(AuthAuditLog)
            .where(
                and_(
                    AuthAuditLog.created_at >= one_hour_ago,
                    AuthAuditLog.reason == "login_bypass_used"
                )
            )
        )
        
        recent_bypass = result.fetchall()
        
        if len(recent_bypass) > 0:
            print(f"🚨 SECURITY ALERT: {len(recent_bypass)} bypass attempts in last hour")
            
            for attempt in recent_bypass:
                print(f"- {attempt.created_at}: {attempt.username} from {attempt.ip_address}")
                
            # Log security incident
            logger.critical(f"SECURITY INCIDENT: {len(recent_bypass)} bypass attempts detected")
            
            # Recommendations
            print("\n🔒 RECOMMENDATIONS:")
            print("1. Verify this is expected development activity")
            print("2. Check if production bypass was accidentally enabled")
            print("3. Review access logs for unusual patterns")
            print("4. Consider temporary service lockdown if necessary")
        else:
            print("✅ No recent bypass activity detected")

# Run incident response
asyncio.run(security_incident_response())
```

### **Configuration Recovery**

#### **Reset to Known Good Configuration**
```bash
#!/bin/bash
# reset-bypass-config.sh

echo "🔄 Resetting bypass configuration to defaults"

# Create backup of current config
cp .env .env.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Set secure development defaults
cat > .env.development << 'EOF'
# Bypass Configuration (Development Only)
LOGIN_BYPASS_ENABLED=true
LOGIN_BYPASS_USERNAME=dev_bypass
LOGIN_BYPASS_ROLE=admin

# Frontend Configuration
VITE_ENABLE_LOGIN_BYPASS=true
VITE_LOGIN_BYPASS_USER=dev_bypass

# Development Environment
ENVIRONMENT=development
LOG_LEVEL=INFO
EOF

# Set production defaults (secure)
cat > .env.production << 'EOF'
# Production Security Configuration
LOGIN_BYPASS_ENABLED=false
ENVIRONMENT=production

# Remove sensitive bypass variables
unset LOGIN_BYPASS_USERNAME
unset LOGIN_BYPASS_ROLE
unset VITE_LOGIN_BYPASS_USER

LOG_LEVEL=WARNING
EOF

echo "✅ Configuration reset completed"
echo "📝 Review and customize .env.development as needed"
echo "🔒 Production configuration secured"
```

## Prevention and Monitoring

### **Proactive Monitoring**

#### **Automated Bypass Monitoring**
```python
#!/usr/bin/env python3
# monitor-bypass-usage.py

import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import select
from src.core.database import get_db
from src.core.models.models import AuthAuditLog

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bypass-monitor.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

async def monitor_bypass_usage():
    """Monitor bypass usage and alert on anomalies"""
    
    check_interval = 300  # 5 minutes
    alert_threshold = 5   # Alert if >5 bypass attempts in 5 minutes
    
    while True:
        try:
            five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
            
            async with get_db() as db:
                result = await db.execute(
                    select(AuthAuditLog)
                    .where(
                        and_(
                            AuthAuditLog.created_at >= five_minutes_ago,
                            AuthAuditLog.reason == "login_bypass_used"
                        )
                    )
                )
                
                recent_bypass = result.fetchall()
                
                if len(recent_bypass) > alert_threshold:
                    logger.warning(
                        f"HIGH BYPASS ACTIVITY: {len(recent_bypass)} attempts in 5 minutes"
                    )
                    
                    # Log detailed information
                    for attempt in recent_bypass:
                        logger.info(
                            f"Bypass attempt: {attempt.username} from {attempt.ip_address} "
                            f"at {attempt.created_at}"
                        )
                elif len(recent_bypass) > 0:
                    logger.info(f"Bypass activity: {len(recent_bypass)} attempts in 5 minutes")
            
            await asyncio.sleep(check_interval)
            
        except Exception as e:
            logger.error(f"Monitor error: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

if __name__ == "__main__":
    logger.info("Starting bypass usage monitor")
    asyncio.run(monitor_bypass_usage())
```

#### **Daily Security Report**
```bash
#!/bin/bash
# daily-bypass-report.sh

echo "=== Daily Bypass Security Report - $(date) ===" > bypass-report.txt

echo "Recent Bypass Activity (Last 24 hours):" >> bypass-report.txt

cd backend
python -c "
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from src.core.database import get_db
from src.core.models.models import AuthAuditLog

async def generate_report():
    yesterday = datetime.utcnow() - timedelta(days=1)
    
    async with get_db() as db:
        result = await db.execute(
            select(AuthAuditLog)
            .where(
                and_(
                    AuthAuditLog.created_at >= yesterday,
                    AuthAuditLog.reason == 'login_bypass_used'
                )
            )
            .order_by(AuthAuditLog.created_at.desc())
        )
        
        bypass_logs = result.fetchall()
        
        if bypass_logs:
            print(f'Total bypass attempts: {len(bypass_logs)}')
            print(f'Successful: {sum(1 for log in bypass_logs if log.success)}')
            print(f'Failed: {sum(1 for log in bypass_logs if not log.success)}')
            print()
            
            # Group by IP
            ip_counts = {}
            for log in bypass_logs:
                ip = log.ip_address
                ip_counts[ip] = ip_counts.get(ip, 0) + 1
            
            print('Activity by IP:')
            for ip, count in sorted(ip_counts.items(), key=lambda x: x[1], reverse=True):
                print(f'  {ip}: {count} attempts')
        else:
            print('No bypass activity in last 24 hours ✅')

asyncio.run(generate_report())
" >> bypass-report.txt

echo "" >> bypass-report.txt
echo "Production Security Check:" >> bypass-report.txt

if [ "$ENVIRONMENT" = "production" ] && [ "$LOGIN_BYPASS_ENABLED" = "true" ]; then
    echo "❌ CRITICAL: Bypass enabled in production!" >> bypass-report.txt
else
    echo "✅ Production security check passed" >> bypass-report.txt
fi

# Email report (if configured)
if command -v mail >/dev/null 2>&1; then
    mail -s "Daily Bypass Security Report" admin@school.com < bypass-report.txt
fi

# Clean up old reports (keep last 7 days)
find . -name "bypass-report.txt" -mtime +7 -delete

echo "Daily bypass report generated: bypass-report.txt"
```

### **Health Checks**

#### **Bypass Configuration Health Check**
```python
#!/usr/bin/env python3
# bypass-health-check.py

import os
import sys
from datetime import datetime

def check_bypass_health():
    """Comprehensive bypass feature health check"""
    
    issues = []
    warnings = []
    
    print("🔍 Bypass Configuration Health Check")
    print(f"Timestamp: {datetime.now()}")
    print("-" * 50)
    
    # Environment check
    environment = os.getenv("ENVIRONMENT", "unknown")
    print(f"Environment: {environment}")
    
    # Bypass enabled check
    bypass_enabled = os.getenv("LOGIN_BYPASS_ENABLED", "false").lower() == "true"
    print(f"Bypass enabled (backend): {bypass_enabled}")
    
    # Frontend bypass check
    frontend_bypass = os.getenv("VITE_ENABLE_LOGIN_BYPASS", "false").lower() == "true"
    print(f"Bypass enabled (frontend): {frontend_bypass}")
    
    # Security validations
    if environment == "production":
        if bypass_enabled:
            issues.append("CRITICAL: Bypass enabled in production!")
        if frontend_bypass:
            issues.append("CRITICAL: Frontend bypass enabled in production!")
    
    # Configuration consistency
    if bypass_enabled != frontend_bypass:
        issues.append("Backend and frontend bypass settings don't match")
    
    # Username consistency
    backend_user = os.getenv("LOGIN_BYPASS_USERNAME", "")
    frontend_user = os.getenv("VITE_LOGIN_BYPASS_USER", "")
    
    if backend_user and frontend_user and backend_user != frontend_user:
        warnings.append(f"Username mismatch: backend='{backend_user}', frontend='{frontend_user}'")
    
    # Role validation
    valid_roles = {"admin", "teacher", "driver", "student"}
    bypass_role = os.getenv("LOGIN_BYPASS_ROLE", "admin")
    if bypass_role not in valid_roles:
        issues.append(f"Invalid bypass role: '{bypass_role}'. Valid roles: {valid_roles}")
    
    # Report results
    print("\n" + "=" * 50)
    
    if issues:
        print("❌ CRITICAL ISSUES FOUND:")
        for issue in issues:
            print(f"   • {issue}")
    
    if warnings:
        print("\n⚠️  WARNINGS:")
        for warning in warnings:
            print(f"   • {warning}")
    
    if not issues and not warnings:
        print("✅ All bypass configurations are healthy")
    
    # Return appropriate exit code
    if issues:
        print("\n🔴 Health check FAILED")
        return 1
    elif warnings:
        print("\n🟡 Health check PASSED with warnings")
        return 0
    else:
        print("\n🟢 Health check PASSED")
        return 0

if __name__ == "__main__":
    exit_code = check_bypass_health()
    sys.exit(exit_code)
```

#### **Integration with CI/CD**
```yaml
# .github/workflows/bypass-security-check.yml
name: Bypass Security Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security-check:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.8'
      
      - name: Run Bypass Health Check
        run: |
          cd backend
          python ../scripts/bypass-health-check.py
          
      - name: Check Production Bypass
        if: github.ref == 'refs/heads/main'
        run: |
          # Ensure bypass is disabled in production
          if [ "${{ secrets.LOGIN_BYPASS_ENABLED }}" = "true" ]; then
            echo "❌ CRITICAL: Bypass must be disabled in production!"
            exit 1
          fi
          echo "✅ Production bypass security check passed"
      
      - name: Monitor Bypass Usage
        run: |
          # Run bypass monitoring
          cd backend
          python scripts/monitor-bypass-usage.py &
          
          # Wait for monitoring to start
          sleep 5
          
          # Test bypass endpoint
          curl -X POST "http://localhost:8000/auth/bypass-login" \
               -H "Content-Type: application/json" \
               -d '{"username": "test"}' \
               -w "HTTP Status: %{http_code}\n" \
               -o /dev/null -s
```

## Getting Help

### **Debug Information Collection**

When seeking help with bypass issues, please collect the following information:

```bash
#!/bin/bash
# collect-debug-info.sh

echo "=== Bypass Debug Information Collection ==="
echo "Please include this information when reporting bypass issues"
echo

echo "1. Environment Information:"
echo "   Date/Time: $(date)"
echo "   Environment: $ENVIRONMENT"
echo "   User: $(whoami)"
echo "   Working Directory: $(pwd)"
echo

echo "2. Configuration Status:"
echo "   Backend bypass: $LOGIN_BYPASS_ENABLED"
echo "   Frontend bypass: $VITE_ENABLE_LOGIN_BYPASS"
echo "   Bypass username: $LOGIN_BYPASS_USERNAME"
echo "   Bypass role: $LOGIN_BYPASS_ROLE"
echo

echo "3. Service Status:"
ps aux | grep -E "(uvicorn|vite|node)" | grep -v grep || echo "   No services found"
echo

echo "4. Port Status:"
netstat -tulpn 2>/dev/null | grep -E "(8000|5173|3002)" || echo "   No relevant ports found"
echo

echo "5. Recent Logs (last 10 lines):"
if [ -f backend/logs/app.log ]; then
    tail -10 backend/logs/app.log | grep -i bypass || echo "   No recent bypass logs"
else
    echo "   No backend log file found"
fi
echo

echo "6. Browser Console Errors:"
echo "   Open browser developer tools (F12)"
echo "   Check Console tab for JavaScript errors"
echo "   Look for authentication or configuration errors"
```

### **Escalation Path**

1. **Development Issues**: Check this troubleshooting guide and main bypass documentation
2. **Configuration Problems**: Verify environment variables and service restart procedures
3. **Security Concerns**: Immediately disable bypass and review audit logs
4. **Production Issues**: Follow emergency disable procedures and contact security team

### **Related Documentation**

- **[Login Bypass Feature Documentation](../guides/login-bypass/overview.md)** - Complete feature guide
- **[Authentication System Documentation](../guides/authentication.md)** - Authentication system details
- **[Development Workflow](../archive/duplicates/development-workflow-getting-started.md)** - Development setup guide
- **[API Documentation](../api/README.md)** - API endpoint reference

---

**Last Updated:** November 8, 2025  
**Maintained by:** Student Profiles PWA Development Team