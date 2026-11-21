# Deployment Overview

> Complete deployment guide for the School Management System across multiple environments and platforms.

## 🚀 Deployment Strategies

### Quick Start Deployment (Recommended for Development)
```bash
# Clone the repository
git clone https://github.com/your-org/school-management.git
cd school-management

# Start with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:5173
```

### Production Deployment Options

| Platform | Complexity | Scalability | Recommended For |
|----------|------------|-------------|-----------------|
| **Docker Compose** | ⭐ Low | ⭐⭐ Limited | Small deployments |
| **Kubernetes** | ⭐⭐⭐⭐ High | ⭐⭐⭐⭐⭐ Enterprise | Large scale deployments |
| **AWS ECS/EKS** | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ High | AWS-based infrastructure |
| **Google Cloud Run** | ⭐⭐ Low | ⭐⭐⭐ Medium | Serverless deployment |
| **Azure Container Instances** | ⭐⭐ Low | ⭐⭐⭐ Medium | Azure-based infrastructure |

---

## 🐳 Docker Deployment

### Development Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./app.db
      - JWT_SECRET_KEY=dev-secret-key
      - ENVIRONMENT=development
    volumes:
      - ./backend:/app
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=school_management
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Production Docker Setup
```dockerfile
# Multi-stage Dockerfile for backend
FROM python:3.11-slim as backend
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/src ./src
COPY backend/alembic ./alembic
COPY backend/keys ./keys

# Production settings
ENV ENVIRONMENT=production
ENV PYTHONPATH=/app

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# Multi-stage Dockerfile for frontend
FROM node:18-alpine as builder
WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm run build

# Production nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Security Best Practices
```bash
# Use non-root user
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup

# Set proper permissions
RUN chown -R appuser:appgroup /app
USER appuser

# Use health checks
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1
```

---

## ☸️ Kubernetes Deployment

### Namespace Configuration
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: school-management
  labels:
    name: school-management
    environment: production
```

### Backend Deployment
```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: school-management-backend
  namespace: school-management
  labels:
    app: school-management-backend
    version: v1.0.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: school-management-backend
  template:
    metadata:
      labels:
        app: school-management-backend
        version: v1.0.0
    spec:
      containers:
      - name: backend
        image: school-management/backend:v1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: school-management-secrets
              key: database-url
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: school-management-secrets
              key: jwt-secret-key
        - name: ENVIRONMENT
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: school-management-backend-service
  namespace: school-management
spec:
  selector:
    app: school-management-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: ClusterIP
```

### Frontend Deployment
```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: school-management-frontend
  namespace: school-management
spec:
  replicas: 2
  selector:
    matchLabels:
      app: school-management-frontend
  template:
    metadata:
      labels:
        app: school-management-frontend
    spec:
      containers:
      - name: frontend
        image: school-management/frontend:v1.0.0
        ports:
        - containerPort: 80
        env:
        - name: VITE_API_URL
          value: "http://school-management-backend-service/api"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: school-management-frontend-service
  namespace: school-management
spec:
  selector:
    app: school-management-frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

### Ingress Configuration
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: school-management-ingress
  namespace: school-management
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  tls:
  - hosts:
    - school.yourdomain.com
    secretName: school-management-tls
  rules:
  - host: school.yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: school-management-backend-service
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: school-management-frontend-service
            port:
              number: 80
```

---

## ☁️ Cloud Platform Deployment

### AWS Deployment

#### ECS with Fargate
```json
{
  "family": "school-management",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/school-management-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:school-management/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/school-management",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### EKS with Helm
```bash
# Install using Helm chart
helm repo add school-management https://charts.school-management.com
helm install school-management school-management/school-management \
  --namespace school-management \
  --create-namespace \
  --set backend.image.repository=your-account.dkr.ecr.region.amazonaws.com/school-management-backend \
  --set frontend.image.repository=your-account.dkr.ecr.region.amazonaws.com/school-management-frontend \
  --set database.host=your-rds-instance.amazonaws.com \
  --set domain=school.yourdomain.com
```

### Google Cloud Deployment

#### Cloud Run
```yaml
# service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: school-management
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/execution-environment: gen2
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cpu-throttling: "false"
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/memory: 512Mi
        run.googleapis.com/cpu: "1000m"
    spec:
      containerConcurrency: 100
      containers:
      - image: gcr.io/your-project/school-management:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: school-management-secrets
              key: database-url
        - name: ENVIRONMENT
          value: "production"
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
```

### Azure Deployment

#### Container Instances
```yaml
# azure-aci.yaml
apiVersion: 2021-03-01
location: eastus
name: school-management
properties:
  containers:
  - name: backend
    properties:
      image: yourregistry.azurecr.io/school-management-backend:latest
      resources:
        requests:
          cpu: 1.0
          memoryInGb: 1.5
      ports:
      - port: 8000
        protocol: TCP
      environmentVariables:
      - name: ENVIRONMENT
        value: production
      - name: DATABASE_URL
        secureValue: ${DATABASE_PASSWORD}
  - name: frontend
    properties:
      image: yourregistry.azurecr.io/school-management-frontend:latest
      resources:
        requests:
          cpu: 0.5
          memoryInGb: 0.5
      ports:
      - port: 80
        protocol: TCP
  osType: Linux
  ipAddress:
    type: Public
    ports:
    - protocol: tcp
      port: 80
    - protocol: tcp
      port: 8000
  dnsNameLabel: school-management
tags:
  project: school-management
  environment: production
```

---

## 🔧 Environment Configuration

### Production Environment Variables
```bash
# Backend Configuration
DATABASE_URL=postgresql://username:password@host:5432/school_management
JWT_SECRET_KEY=your-super-secure-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ENVIRONMENT=production
CORS_ORIGINS=["https://school.yourdomain.com"]
API_RATE_LIMIT=100
SSL_CERT_PATH=/etc/ssl/certs/school.crt
SSL_KEY_PATH=/etc/ssl/private/school.key

# Frontend Configuration
VITE_API_URL=https://api.school.yourdomain.com
VITE_ENVIRONMENT=production
VITE_SENTRY_DSN=your-sentry-dsn
VITE_GA_TRACKING_ID=your-google-analytics-id

# Database Configuration
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_RECYCLE=3600

# Monitoring Configuration
PROMETHEUS_ENABLED=true
LOG_LEVEL=INFO
SENTRY_DSN=your-sentry-dsn
```

### Configuration Management
```python
# backend/src/core/config/config.py
from pydantic import BaseSettings, validator
from typing import List

class Settings(BaseSettings):
    # Database
    database_url: str
    db_pool_size: int = 20
    db_max_overflow: int = 30
    db_pool_recycle: int = 3600
    
    # Authentication
    jwt_secret_key: str
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    
    # Application
    environment: str = "development"
    cors_origins: List[str] = ["http://localhost:5173"]
    api_rate_limit: int = 100
    
    # Security
    ssl_cert_path: str = ""
    ssl_key_path: str = ""
    
    # Monitoring
    prometheus_enabled: bool = False
    sentry_dsn: str = ""
    log_level: str = "INFO"
    
    @validator("environment")
    def validate_environment(cls, v):
        if v not in ["development", "staging", "production"]:
            raise ValueError("environment must be one of: development, staging, production")
        return v

settings = Settings()
```

---

## 🔒 Security Configuration

### HTTPS Setup
```nginx
# nginx.conf
server {
    listen 80;
    server_name school.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name school.yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/school.crt;
    ssl_certificate_key /etc/ssl/private/school.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall Configuration
```bash
# UFW firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Docker network security
docker network create --internal school-management-net
```

---

## 📊 Monitoring & Observability

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "school_management_rules.yml"

scrape_configs:
  - job_name: 'school-management-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s
    
  - job_name: 'school-management-frontend'
    static_configs:
      - targets: ['frontend:80']
    metrics_path: '/metrics'
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "School Management System",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "singlestat",
        "targets": [
          {
            "expr": "sum(active_users)",
            "legendFormat": "Active Users"
          }
        ]
      }
    ]
  }
}
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations applied
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Security scanning completed

### Deployment
- [ ] Container images built and pushed
- [ ] Infrastructure provisioned
- [ ] Services deployed
- [ ] Load balancers configured
- [ ] DNS records updated

### Post-Deployment
- [ ] Health checks passing
- [ ] API endpoints responding
- [ ] User authentication working
- [ ] Monitoring dashboards active
- [ ] Log aggregation working
- [ ] Performance metrics baseline

### Rollback Plan
- [ ] Previous version tagged
- [ ] Database rollback scripts ready
- [ ] Service rollback procedures documented
- [ ] Monitoring alerts configured
- [ ] Communication plan in place

---

## 🆘 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER

# Test connection from application
curl -X GET "$API_URL/api/health"
```

#### Authentication Problems
```bash
# Verify JWT secret key
echo $JWT_SECRET_KEY | wc -c  # Should be 32+ characters

# Check token expiration
python -c "import jwt; print(jwt.decode(token, secret, algorithms=['HS256']))"
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check application logs
docker-compose logs backend | grep ERROR

# Monitor database performance
SELECT * FROM pg_stat_activity;
```

### Emergency Procedures
1. **Service Down**: Activate fallback systems and notify stakeholders
2. **Database Issues**: Switch to read replica, investigate corruption
3. **Security Breach**: Rotate all secrets, block suspicious IPs
4. **Performance Degradation**: Scale services, investigate bottlenecks

For detailed troubleshooting, see [Operations Documentation](../operations/incident-response/runbook.md)