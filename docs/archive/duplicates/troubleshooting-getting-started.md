# Troubleshooting

## Common Issues and Solutions

### Backend Issues

#### Database Connection Errors

**Issue:** `sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) database is locked`

**Solutions:**
1. **Check for long-running transactions:**
   ```python
   # In your database session management
   async with AsyncSession(engine) as session:
       try:
           # Your operations here
           await session.commit()
       except Exception:
           await session.rollback()
           raise
   ```

2. **Increase timeout settings:**
   ```python
   engine = create_async_engine(
       DATABASE_URL,
       connect_args={
           "check_same_thread": False,
           "timeout": 30,  # Increase timeout
       }
   )
   ```

3. **Use connection pooling:**
   ```python
   engine = create_async_engine(
       DATABASE_URL,
       pool_size=10,
       max_overflow=20,
       pool_timeout=30,
   )
   ```

**Issue:** `psycopg2.OperationalError: connection to server at "localhost" (127.0.0.1), port 5432 failed`

**Solutions:**
1. **Check PostgreSQL service status:**
   ```bash
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   ```

2. **Verify connection string:**
   ```python
   # Correct format
   DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
   ```

3. **Check PostgreSQL logs:**
   ```bash
   sudo tail -f /var/log/postgresql/postgresql-15-main.log
   ```

#### Authentication Problems

**Issue:** "Authentication credentials were not provided"

**Solutions:**
1. **Check cookie settings:**
   ```python
   # Ensure cookies are being set properly
   response = await client.post("/auth/login", json=credentials)
   assert "access_token" in response.cookies
   ```

2. **Verify CORS configuration:**
   ```python
   # Check CORS middleware
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **Check token expiration:**
   ```python
   # Verify token hasn't expired
   payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
   if datetime.fromtimestamp(payload["exp"]) < datetime.utcnow():
       raise HTTPException(status_code=401, detail="Token expired")
   ```

#### API Rate Limiting Issues

**Issue:** Getting 429 (Too Many Requests) errors

**Solutions:**
1. **Adjust rate limits:**
   ```python
   limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
   ```

2. **Implement exponential backoff in frontend:**
   ```javascript
   class ApiService {
     async request(url, options = {}, retryCount = 0) {
       try {
         const response = await fetch(url, options);
         if (response.status === 429) {
           const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
           await new Promise(resolve => setTimeout(resolve, delay));
           return this.request(url, options, retryCount + 1);
         }
         return response;
       } catch (error) {
         if (retryCount < 3) {
           const delay = Math.pow(2, retryCount) * 1000;
           await new Promise(resolve => setTimeout(resolve, delay));
           return this.request(url, options, retryCount + 1);
         }
         throw error;
       }
     }
   }
   ```

### Frontend Issues

#### Component Not Rendering

**Issue:** Custom web components not displaying

**Solutions:**
1. **Check component registration:**
   ```javascript
   // Ensure component is defined
   if (!customElements.get('student-table')) {
     customElements.define('student-table', StudentTable);
   }
   ```

2. **Verify Shadow DOM:**
   ```javascript
   // Check if content is in shadow root
   const shadowRoot = component.shadowRoot;
   console.log(shadowRoot.innerHTML);
   ```

3. **Check CSS scoping:**
   ```css
   /* Ensure styles are applied correctly */
   :host {
     display: block;
   }
   ```

#### API Call Failures

**Issue:** Network requests failing

**Solutions:**
1. **Check CORS headers:**
   ```javascript
   // Verify API responses include CORS headers
   fetch('/api/students')
     .then(response => {
       console.log('CORS headers:', response.headers);
     });
   ```

2. **Verify authentication headers:**
   ```javascript
   // Ensure cookies are sent with requests
   const response = await fetch('/api/students', {
     credentials: 'include'  // Important for cookies
   });
   ```

3. **Check network connectivity:**
   ```javascript
   // Test basic connectivity
   navigator.onLine // Check if browser is online
   ```

#### Service Worker Issues

**Issue:** PWA not working offline

**Solutions:**
1. **Check service worker registration:**
   ```javascript
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.register('/sw.js')
       .then(registration => console.log('SW registered'))
       .catch(error => console.log('SW registration failed'));
   }
   ```

2. **Verify cache storage:**
   ```javascript
   // Check what's in cache
   caches.open('student-profiles-v1').then(cache => {
     cache.keys().then(requests => console.log(requests));
   });
   ```

3. **Clear cache if corrupted:**
   ```javascript
   // Clear all caches
   caches.keys().then(names => {
     names.forEach(name => caches.delete(name));
   });
   ```

#### Build and Compilation Errors

**Issue:** TypeScript compilation failing

**Solutions:**
1. **Check tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "target": "ES2015",
       "module": "ESNext",
       "moduleResolution": "node",
       "strict": true,
       "esModuleInterop": true
     }
   }
   ```

2. **Resolve import issues:**
   ```typescript
   // Use correct import paths
   import { StudentTable } from './components/students/student-table.js';
   ```

3. **Check for type errors:**
   ```bash
   npx tsc --noEmit  # Check types without emitting files
   ```

### Database Issues

#### Migration Failures

**Issue:** Alembic migration not applying

**Solutions:**
1. **Check migration status:**
   ```bash
   cd backend
   python -c "from alembic.config import Config; from alembic import command; cfg = Config('alembic.ini'); command.current(cfg)"
   ```

2. **Apply pending migrations:**
   ```bash
   alembic upgrade head
   ```

3. **Create new migration:**
   ```bash
   alembic revision --autogenerate -m "Description of changes"
   ```

#### Data Consistency Issues

**Issue:** Duplicate or missing data

**Solutions:**
1. **Add database constraints:**
   ```python
   class Student(Base):
       __table_args__ = (
           UniqueConstraint('primary_mobile', name='unique_primary_mobile'),
           CheckConstraint('fees > 0', name='positive_fees'),
       )
   ```

2. **Implement data validation:**
   ```python
   @validator('primary_mobile')
   def validate_unique_mobile(cls, v):
       if get_student_by_mobile(v):
           raise ValueError('Mobile number already exists')
       return v
   ```

#### Performance Degradation

**Issue:** Queries becoming slow over time

**Solutions:**
1. **Analyze query performance:**
   ```python
   # Enable SQLAlchemy query logging
   import logging
   logging.basicConfig()
   logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
   ```

2. **Add missing indexes:**
   ```sql
   CREATE INDEX CONCURRENTLY idx_students_search_vector
   ON students USING gin(to_tsvector('english', name || ' ' || father_name));
   ```

3. **Optimize query patterns:**
   ```python
   # Use selectinload for related data
   query = select(Student).options(
       selectinload(Student.driver_info)
   ).where(Student.id == student_id)
   ```

### Deployment Issues

#### Docker Container Problems

**Issue:** Container failing to start

**Solutions:**
1. **Check container logs:**
   ```bash
   docker logs <container_name>
   ```

2. **Verify environment variables:**
   ```bash
   docker run -e DATABASE_URL=... -e SECRET_KEY=... <image>
   ```

3. **Check port conflicts:**
   ```bash
   docker ps  # See running containers
   netstat -tlnp | grep :8000  # Check port usage
   ```

#### Nginx Configuration Issues

**Issue:** Static files not serving correctly

**Solutions:**
1. **Check nginx configuration:**
   ```nginx
   location /static/ {
       alias /var/www/student-profiles/frontend/dist/;
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

2. **Verify file permissions:**
   ```bash
   ls -la /var/www/student-profiles/frontend/dist/
   ```

3. **Test nginx configuration:**
   ```bash
   nginx -t  # Test configuration
   nginx -s reload  # Reload configuration
   ```

#### SSL Certificate Problems

**Issue:** HTTPS not working

**Solutions:**
1. **Check certificate validity:**
   ```bash
   openssl x509 -in /etc/ssl/certs/your-domain.crt -text -noout
   ```

2. **Verify certificate chain:**
   ```bash
   openssl s_client -connect your-domain.com:443 -servername your-domain.com
   ```

3. **Check nginx SSL configuration:**
   ```nginx
   ssl_certificate /etc/ssl/certs/your-domain.crt;
   ssl_certificate_key /etc/ssl/private/your-domain.key;
   ssl_protocols TLSv1.2 TLSv1.3;
   ```

## Debugging Tools

### Backend Debugging

**Enable debug logging:**
```python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Enable SQLAlchemy echo
engine = create_engine(DATABASE_URL, echo=True)
```

**Use debugger:**
```python
import pdb; pdb.set_trace()  # Add breakpoint

# Or use more advanced debugger
import ipdb; ipdb.set_trace()
```

### Frontend Debugging

**Browser developer tools:**
- **Network tab:** Check API calls and responses
- **Console:** JavaScript errors and logs
- **Application tab:** Service worker and cache status
- **Storage:** Cookies and local storage

**Debug service worker:**
```javascript
// In sw.js
self.addEventListener('message', event => {
  if (event.data === 'debug') {
    console.log('Service Worker Debug Info');
    console.log('Caches:', await caches.keys());
  }
});

// Trigger from main thread
navigator.serviceWorker.controller?.postMessage('debug');
```

### Database Debugging

**Monitor query performance:**
```sql
-- PostgreSQL: Enable query logging
ALTER DATABASE your_db SET log_statement = 'all';
ALTER DATABASE your_db SET log_duration = on;

-- SQLite: Use EXPLAIN QUERY PLAN
EXPLAIN QUERY PLAN SELECT * FROM students WHERE name LIKE 'John%';
```

**Check database locks:**
```sql
-- PostgreSQL: Check active queries
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

## Log Analysis

### Common Log Patterns

**Backend logs:**
```
INFO: 127.0.0.1:12345 - "GET /api/students HTTP/1.1" 200 OK
WARNING: Slow query detected: 0.150s - SELECT * FROM students
ERROR: sqlalchemy.exc.OperationalError: database is locked
```

**Frontend logs:**
```
Service Worker: Registered successfully
API Error: 429 Too Many Requests
Component Error: student-table not defined
```

### Log Monitoring Setup

**Centralized logging with ELK stack:**
```yaml
# docker-compose.yml for ELK
version: '3.8'
services:
  elasticsearch:
    image: elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false

  logstash:
    image: logstash:8.5.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: kibana:8.5.0
    ports:
      - "5601:5601"
```

## Health Checks

### Application Health Endpoints

```python
# backend/main.py
@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "checks": {}
    }

    # Database health
    try:
        async with AsyncSession(engine) as session:
            await session.execute(text("SELECT 1"))
        health_status["checks"]["database"] = "ok"
    except Exception as e:
        health_status["checks"]["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"

    # External services
    try:
        # Check cache, queue, etc.
        health_status["checks"]["cache"] = "ok"
    except Exception as e:
        health_status["checks"]["cache"] = f"error: {str(e)}"

    return health_status

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with metrics"""
    return {
        "uptime": time.time() - start_time,
        "memory_usage": psutil.virtual_memory().percent,
        "cpu_usage": psutil.cpu_percent(interval=1),
        "database_connections": len(engine.pool._pool),  # Adjust based on your setup
        "active_requests": active_requests_count
    }
```

### Monitoring Integration

**Prometheus metrics:**
```python
from prometheus_client import Counter, Histogram, Gauge, generate_latest

# Define metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency', ['method', 'endpoint'])
ACTIVE_CONNECTIONS = Gauge('active_connections', 'Number of active connections')

@app.middleware("http")
async def metrics_middleware(request, call_next):
    ACTIVE_CONNECTIONS.inc()
    start_time = time.time()

    response = await call_next(request)

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(time.time() - start_time)

    ACTIVE_CONNECTIONS.dec()
    return response

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

## Recovery Procedures

### Database Recovery

**Point-in-time recovery (PostgreSQL):**
```bash
# Stop the server
sudo systemctl stop postgresql

# Restore from backup
pg_restore -U postgres -d student_profiles /path/to/backup.sql

# Start the server
sudo systemctl start postgresql
```

**SQLite corruption recovery:**
```bash
# Create backup
cp backend/data/students.db backend/data/students.db.backup

# Try to recover
sqlite3 backend/data/students.db ".recover" | sqlite3 backend/data/students_recovered.db

# Replace corrupted database
mv backend/data/students_recovered.db backend/data/students.db
```

### Application Recovery

**Rolling restart:**
```bash
# Using systemd
sudo systemctl restart student-profiles

# Using Docker
docker-compose down
docker-compose up -d

# Using Kubernetes
kubectl rollout restart deployment/student-profiles
```

### Data Recovery

**From backups:**
```python
# Automated recovery script
async def recover_from_backup(backup_file: str):
    """Recover data from backup file"""
    # Implementation depends on backup format
    pass
```

## Support Resources

### Getting Help

1. **Check the documentation:** Review this README and specific component docs
2. **Search existing issues:** Check GitHub issues for similar problems
3. **Enable debug logging:** Gather detailed logs before asking for help
4. **Provide context:** Include your environment, versions, and steps to reproduce

### Community Support

- **GitHub Issues:** For bugs and feature requests
- **GitHub Discussions:** For questions and general discussion
- **Stack Overflow:** Tag with `student-profiles-pwa`

### Emergency Contacts

- **Critical Issues:** Create GitHub issue with `critical` label
- **Security Issues:** Report privately via GitHub Security tab
- **Performance Issues:** Include detailed metrics and profiling data

## Prevention Best Practices

### Proactive Monitoring

1. **Set up alerts for key metrics:**
   - API response time > 500ms
   - Error rate > 5%
   - Database connection pool exhaustion

2. **Regular health checks:**
   - Automated tests on staging environment
   - Performance regression tests

### Maintenance Tasks

**Daily:**
- Monitor application logs
- Check disk space and database size
- Review error rates and performance metrics

**Weekly:**
- Run full test suite
- Review and apply security updates
- Check database performance and optimize slow queries

**Monthly:**
- Full backup verification
- Security audit and dependency updates
- Performance benchmarking

**Quarterly:**
- Architecture review
- Scalability testing
- Disaster recovery testing

This troubleshooting guide provides comprehensive solutions for common issues and best practices for maintaining a healthy application environment.