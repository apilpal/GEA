# Deployment Guide

## Environment Overview

The application supports multiple deployment environments with different configurations:

| Environment | Database | Domain | SSL | Purpose |
|-------------|----------|--------|-----|---------|
| **Development** | SQLite | localhost | No | Local development |
| **Staging** | PostgreSQL | staging.example.com | Yes | Pre-production testing |
| **Production** | PostgreSQL | app.example.com | Yes | Live application |

## Docker Deployment

### Single Container (SQLite)

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy and install backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy frontend and build
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm install && npm run build

# Copy built frontend to backend static files
RUN cp -r dist/* ../static/

WORKDIR /app
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Multi-Container (PostgreSQL + Frontend)

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: student_profiles
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://app_user:secure_password@db/student_profiles
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - db
    networks:
      - app_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - app_network

volumes:
  postgres_data:

networks:
  app_network:
    driver: bridge
```

**Dockerfile.backend:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run migrations
RUN python migrate.py upgrade head

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**frontend/Dockerfile.frontend:**
```dockerfile
FROM nginx:alpine

COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Cloud Deployment Options

### AWS Deployment

**ECS Fargate:**
```yaml
# task-definition.json
{
  "family": "student-profiles-app",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/student-profiles-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "DATABASE_URL", "value": "${DATABASE_URL}"},
        {"name": "SECRET_KEY", "value": "${SECRET_KEY}"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/student-profiles",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**RDS PostgreSQL Setup:**
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier student-profiles-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username app_user \
  --master-user-password <password> \
  --allocated-storage 20

# Wait for DB to be available, then run migrations
python migrate.py upgrade head
```

### Google Cloud Platform

**App Engine (Standard):**
```yaml
# app.yaml
runtime: python311

env_variables:
  DATABASE_URL: 'postgresql://...'
  SECRET_KEY: '...'

handlers:
- url: /api/.*
  script: main.app

- url: /.*
  static_files: frontend/dist/index.html
  upload: frontend/dist/index.html

- url: /(.*)
  static_files: frontend/dist/\1
  upload: frontend/dist/(.*)
```

**Cloud Run:**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/student-profiles
gcloud run deploy --image gcr.io/PROJECT-ID/student-profiles --platform managed

# Set environment variables
gcloud run services update student-profiles \
  --set-env-vars DATABASE_URL=postgresql://...,SECRET_KEY=...
```

### Heroku Deployment

**Procfile:**
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
release: python migrate.py upgrade head
```

**Requirements.txt** (Heroku specific):
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
# ... other dependencies
gunicorn==21.2.0
```

**Deploy command:**
```bash
# Set buildpacks
heroku buildpacks:add heroku/python
heroku buildpacks:add heroku/nodejs

# Set environment variables
heroku config:set DATABASE_URL=postgresql://...
heroku config:set SECRET_KEY=...

# Deploy
git push heroku main
```

## Traditional Server Deployment

### Ubuntu Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and Node.js
sudo apt install python3 python3-pip nodejs npm postgresql postgresql-contrib

# Install PostgreSQL
sudo -u postgres createuser app_user
sudo -u postgres createdb student_profiles -O app_user
sudo -u postgres psql -c "ALTER USER app_user PASSWORD 'secure_password';"

# Clone repository
git clone <repository-url> /var/www/student-profiles
cd /var/www/student-profiles

# Setup Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Setup frontend
cd frontend
npm install
npm run build
cd ..

# Setup environment
cp backend/.env.example backend/.env
# Edit .env with production values

# Run migrations
python migrate.py upgrade head

# Setup systemd service
sudo cp deploy/student-profiles.service /etc/systemd/system/
sudo systemctl enable student-profiles
sudo systemctl start student-profiles

# Setup nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/student-profiles
sudo ln -s /etc/nginx/sites-available/student-profiles /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Systemd Service File:**
```ini
[Unit]
Description=Student Profiles FastAPI App
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/student-profiles
Environment="PATH=/var/www/student-profiles/venv/bin"
ExecStart=/var/www/student-profiles/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /var/www/student-profiles/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

## SSL Configuration

### Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already configured)
sudo crontab -l | grep certbot
```

### Manual SSL Setup

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # ... rest of configuration
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Database Migration Strategy

### Production Database Updates

```bash
# Backup database
pg_dump student_profiles > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
python migrate.py upgrade head

# Verify migration
python -c "from backend.main import app; print('Migration successful')"

# Rollback if needed
python migrate.py downgrade -1
```

### Zero-Downtime Deployment

1. **Blue-Green Deployment:**
   ```bash
   # Deploy to blue environment
   # Test thoroughly
   # Switch load balancer to blue
   # Keep green as rollback option
   ```

2. **Canary Deployment:**
   ```bash
   # Route 10% of traffic to new version
   # Monitor metrics
   # Gradually increase traffic
   # Full rollout when confident
   ```

## Monitoring and Logging

### Application Monitoring

```python
# backend/main.py
from prometheus_client import make_asgi_app, Counter, Histogram
import time

# Metrics
REQUEST_COUNT = Counter('request_count', 'Total requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('request_latency_seconds', 'Request latency', ['endpoint'])

@app.middleware("http")
async def add_prometheus_metrics(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    request_time = time.time() - start_time

    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path).inc()
    REQUEST_LATENCY.labels(endpoint=request.url.path).observe(request_time)

    return response

app.mount("/metrics", make_asgi_app())
```

### Log Configuration

```python
# logging.conf
[loggers]
keys=root,app

[handlers]
keys=consoleHandler,fileHandler

[formatters]
keys=simpleFormatter

[logger_root]
level=INFO
handlers=consoleHandler

[logger_app]
level=DEBUG
handlers=consoleHandler,fileHandler
qualname=app
propagate=0

[handler_consoleHandler]
class=StreamHandler
level=INFO
formatter=simpleFormatter
args=(sys.stdout,)

[handler_fileHandler]
class=FileHandler
level=DEBUG
formatter=simpleFormatter
args=('/var/log/student-profiles/app.log', 'a')

[formatter_simpleFormatter]
format=%(asctime)s - %(name)s - %(levelname)s - %(message)s
datefmt=%Y-%m-%d %H:%M:%S
```

## Backup Strategy

### Database Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U app_user -h localhost student_profiles > /backups/student_profiles_$DATE.sql

# Keep only last 30 days
find /backups -name "student_profiles_*.sql" -mtime +30 -delete
```

### File System Backup

```bash
# Backup uploaded files, configs, etc.
rsync -av /var/www/student-profiles/uploads/ /backups/uploads/
rsync -av /var/www/student-profiles/backend/.env /backups/config/
```

## Scaling Considerations

### Horizontal Scaling

```nginx
upstream backend {
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

### Database Read Replicas

```python
# Read/write split
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

write_engine = create_engine(WRITE_DATABASE_URL)
read_engine = create_engine(READ_DATABASE_URL)

WriteSession = sessionmaker(bind=write_engine)
ReadSession = sessionmaker(bind=read_engine)
```

## Security Checklist

### Pre-deployment Security Review

- [ ] Environment variables properly configured
- [ ] Database credentials secured
- [ ] SSL certificates valid and current
- [ ] Firewall rules configured
- [ ] Security headers enabled
- [ ] Dependencies updated and scanned
- [ ] Secrets management implemented
- [ ] Backup strategy tested
- [ ] Monitoring and alerting configured
- [ ] Access controls verified
- [ ] Rate limiting active

## Environment Configuration

### Environment Variables

```bash
# Core Configuration
APP_ENV=production
DEBUG=false
SECRET_KEY=your-secret-key

# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Frontend Configuration
FRONTEND_PORT=3002
```

### Security Considerations

- Use strong, unique secret keys
- Enable HTTPS in production
- Configure firewalls appropriately
- Regular security updates and patches

## Monitoring & Maintenance

### Health Checks

- Application health endpoints
- Database connectivity monitoring
- Resource usage tracking
- Error rate monitoring

### Logging

- Structured logging implementation
- Log aggregation and analysis
- Error tracking and alerting
- Performance monitoring

## Troubleshooting

### Common Issues

- **Port Conflicts** - Address already in use
- **Permission Issues** - File and directory permissions
- **Environment Variables** - Missing or incorrect configuration
- **Database Connections** - Connection failures and timeouts

### Getting Help

- **[Troubleshooting Guide](../../troubleshooting/)** - Common deployment issues
- **[Development Issues](../../troubleshooting/development-issues.md)** - Development-specific problems *(Coming Soon)*
- **[Support](../../troubleshooting/support.md)** - Getting additional help *(Coming Soon)*

## Additional Resources

### External Documentation

- **[FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)** - Backend deployment guide
- **[PWA Deployment](https://web.dev/pwa/)** - Progressive Web App deployment
- **[Docker Documentation](https://docs.docker.com/)** - Containerization guide

### Related Documentation

- **[🔧 Backend Setup](../../development/backend/)** - Backend configuration
- **[🎨 Frontend Setup](../../development/frontend/)** - Frontend configuration
- **[🔐 Security Guide](../../development/authentication.md)** - Security considerations

## Next Steps

1. **Review** the specific deployment strategy that fits your needs
2. **Configure** your environment variables and settings
3. **Set up** monitoring and logging for your deployment
4. **Test** your deployment thoroughly before going live
5. **Monitor** your application after deployment

For questions or issues, consult the **[Troubleshooting Guide](../../troubleshooting/)** or create an issue in the project repository.

---

**Last Updated:** October 2025