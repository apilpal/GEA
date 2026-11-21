# 🔐 HTTPS Setup and SSL Certificate Management

This document provides comprehensive instructions for setting up HTTPS and managing SSL certificates for the FastAPI backend application.

## 📋 Table of Contents

- [Overview](#overview)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Docker Deployment](#docker-deployment)
- [Certificate Management](#certificate-management)
- [Security Features](#security-features)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

## 🚀 Overview

The HTTPS setup includes:

- **Development Environment**: Self-signed SSL certificates for local development
- **Production Environment**: Let's Encrypt certificates with automatic renewal
- **Security Enhancements**: HSTS headers, security middleware, and SSL pinning support
- **Docker Integration**: Complete containerized deployment with nginx reverse proxy
- **Monitoring**: Certificate expiration monitoring and renewal automation

## 🛠️ Development Setup

### 1. Generate Self-Signed Certificates

```bash
# Navigate to backend directory
cd backend

# Generate development SSL certificates
./scripts/generate_ssl_cert.sh
```

This script will:
- Create a `backend/certs/` directory
- Generate `dev.crt` and `dev.key` files
- Set proper file permissions
- Display certificate information

### 2. Run Development Server with HTTPS

```bash
# Development mode (HTTP by default for easier debugging)
python run_server.py --dev

# Development mode with HTTPS (if you want to test SSL locally)
python run_server.py --dev --ssl
```

### 3. Environment Configuration

The development environment is pre-configured in `.env.development`:

```bash
# SSL Configuration (Development)
SSL_CERT_PATH=backend/certs/dev.crt
SSL_KEY_PATH=backend/certs/dev.key
```

## 🚀 Production Setup

### 1. Prerequisites

- Domain name pointing to your server
- Ports 80 and 443 open in firewall
- Docker and Docker Compose installed

### 2. Quick Deployment

```bash
# Deploy with Let's Encrypt SSL certificates
./scripts/deploy_production.sh yourdomain.com admin@yourdomain.com

# For testing (staging certificates)
./scripts/deploy_production.sh yourdomain.com admin@yourdomain.com --staging
```

### 3. Manual Setup (Alternative)

#### Step 1: Install Certbot

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Or for Docker environments
docker run -it --rm --name certbot \
    -v "/etc/letsencrypt:/etc/letsencrypt" \
    -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
    certbot/certbot certonly --standalone \
    -d yourdomain.com -m admin@yourdomain.com --agree-tos
```

#### Step 2: Configure Nginx

```bash
# Use the provided nginx configuration
cp nginx-ssl.conf /etc/nginx/conf.d/default.conf

# Update domain in configuration
sed -i 's/your-domain.com/yourdomain.com/g' /etc/nginx/conf.d/default.conf

# Test and reload nginx
nginx -t && systemctl reload nginx
```

#### Step 3: Update Environment

Edit `.env.production`:

```bash
# SSL Configuration (Production)
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# CORS Configuration
CORS_ORIGINS=["https://yourdomain.com", "https://www.yourdomain.com"]
```

## 🐳 Docker Deployment

### 1. Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 2. Service Architecture

- **app**: FastAPI application with SSL support
- **nginx**: Reverse proxy with SSL termination
- **db**: PostgreSQL database
- **redis**: Caching and session storage
- **cert-renewal**: Automatic certificate renewal
- **ssl-monitor**: Certificate expiration monitoring

### 3. Environment Variables

Create `.env.production` with:

```bash
# Domain and SSL
DOMAIN=yourdomain.com
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# Database
DATABASE_URL=postgresql://postgres:password@db:5432/students_db

# Application
SECRET_KEY=your-strong-secret-key
ENVIRONMENT=production
```

## 🔐 Certificate Management

### 1. Certificate Renewal

#### Automatic Renewal (Production)

Certificates are automatically renewed every 12 hours:

```bash
# Manual renewal check
./scripts/renew_certificates.sh

# View renewal logs
tail -f backend/scripts/ssl_renewal.log
```

#### Manual Renewal

```bash
# Renew Let's Encrypt certificates
sudo certbot renew

# For development certificates
./scripts/generate_ssl_cert.sh
```

### 2. Certificate Monitoring

#### Check Certificate Status

```bash
# Development certificates
openssl x509 -in backend/certs/dev.crt -text -noout

# Production certificates
sudo certbot certificates
```

#### Monitor Expiration

```bash
# Check days until expiration
./scripts/renew_certificates.sh | grep -A 5 "expires in"
```

### 3. Certificate Backup

```bash
# Backup Let's Encrypt certificates
sudo cp -r /etc/letsencrypt /backup/letsencrypt-$(date +%Y%m%d)

# Backup development certificates
cp -r backend/certs /backup/dev-certs-$(date +%Y%m%d)
```

## 🔒 Security Features

### 1. Security Headers

The application includes comprehensive security headers:

- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Enables XSS filtering
- **Content-Security-Policy**: Controls resource loading
- **Referrer-Policy**: Controls referrer information

### 2. SSL/TLS Configuration

- **TLS 1.2+**: Modern TLS versions only
- **Strong Ciphers**: Secure cipher suites only
- **Certificate Pinning**: Support for certificate pinning
- **Session Resumption**: Optimized SSL handshakes

### 3. HTTP to HTTPS Redirect

Automatic redirect from HTTP to HTTPS in production:

```python
# In main.py middleware
@app.middleware("http")
async def http_to_https_redirect(request: Request, call_next):
    if request.url.scheme == "http":
        https_url = request.url.replace(scheme="https")
        return RedirectResponse(url=str(https_url), status_code=301)
    response = await call_next(request)
    return response
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. SSL Certificate Errors

```bash
# Check certificate validity
openssl x509 -in /path/to/cert.pem -text -noout

# Verify certificate chain
openssl verify -CAfile chain.pem cert.pem

# Check private key
openssl rsa -in /path/to/key.pem -check
```

#### 2. Nginx Configuration Issues

```bash
# Test nginx configuration
sudo nginx -t

# View nginx logs
sudo tail -f /var/log/nginx/error.log

# Check nginx status
sudo systemctl status nginx
```

#### 3. Application SSL Issues

```bash
# Check if application is listening on correct port
netstat -tlnp | grep :8000

# Test SSL connection
curl -v -k https://localhost:8000/api/health

# Check application logs
docker-compose logs app
```

### 4. Let's Encrypt Issues

```bash
# Check certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Test domain reachability
curl -I http://yourdomain.com/.well-known/acme-challenge/test

# Manual certificate generation
sudo certbot certonly --standalone -d yourdomain.com
```

## 🔧 Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Certificates | Self-signed | Let's Encrypt |
| SSL Termination | Application | Nginx |
| Certificate Renewal | Manual/On-demand | Automatic |
| Security Headers | Basic | Comprehensive |
| Monitoring | Basic logging | Full monitoring |

## 📚 API Reference

### SSL Configuration Endpoints

#### Health Check
```http
GET /api/health
```

Returns SSL and certificate status information.

#### Certificate Information
```http
GET /api/ssl-info
```

Returns detailed SSL certificate information (when implemented).

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SSL_CERT_PATH` | Path to SSL certificate file | - |
| `SSL_KEY_PATH` | Path to private key file | - |
| `ENVIRONMENT` | Environment mode (development/production) | development |
| `HSTS_MAX_AGE` | HSTS header max-age value | 31536000 |

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review application logs: `docker-compose logs`
3. Check certificate status: `./scripts/renew_certificates.sh`
4. Verify nginx configuration: `sudo nginx -t`

## 🔄 Updates and Maintenance

### Regular Tasks

- **Daily**: Monitor certificate expiration
- **Weekly**: Review SSL configuration
- **Monthly**: Test SSL setup and renewal process
- **Quarterly**: Update SSL/TLS configuration for new security standards

### Update Process

1. Test changes in staging environment
2. Update certificates if needed
3. Deploy to production
4. Verify SSL functionality
5. Monitor for issues

---

**🎉 Your FastAPI application is now secured with comprehensive HTTPS support!**

For additional security hardening or custom configurations, refer to the [Security Documentation](../security/authentication-security.md).