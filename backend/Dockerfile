# Multi-stage Docker build for FastAPI with HTTPS support

# Stage 1: Build stage
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime stage
FROM python:3.11-slim

# Install runtime system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    nginx \
    certbot \
    python3-certbot-nginx \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Copy Python packages from builder stage
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/certs /var/www/html /var/lib/letsencrypt /var/log/nginx /var/log/app

# Copy SSL setup scripts
COPY scripts/generate_ssl_cert.sh scripts/setup_production_ssl.sh scripts/renew_certificates.sh ./scripts/
RUN chmod +x ./scripts/*.sh

# Install application dependencies
RUN pip install --no-cache-dir -e .

# Set proper ownership
RUN chown -R appuser:appuser /app /var/www/html /var/lib/letsencrypt /var/log/app

# Copy nginx configuration
COPY <<EOF /etc/nginx/sites-available/default
server {
    listen 80;
    server_name _;

    # ACME challenge location for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    # Redirect HTTP to HTTPS (after SSL setup)
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name _;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/\$host/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/\$host/privkey.pem;

    # SSL Security configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Proxy to FastAPI application
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /nginx-health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Create startup script
COPY <<EOF /app/start.sh
#!/bin/bash
set -e

echo "🚀 Starting FastAPI application with HTTPS support..."

# Function to log messages
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1" | tee -a /var/log/app/startup.log
}

log "Setting up environment"

# Generate self-signed certificate for development if no Let's Encrypt cert exists
if [[ ! -f "/etc/letsencrypt/live/\$HOSTNAME/fullchain.pem" ]]; then
    log "No Let's Encrypt certificate found, generating self-signed certificate"
    /app/scripts/generate_ssl_cert.sh || log "Failed to generate self-signed certificate"
fi

# Start nginx
log "Starting nginx"
service nginx start

# Set environment variables for the application
export SSL_CERT_PATH=/app/certs/dev.crt
export SSL_KEY_PATH=/app/certs/dev.key

# Start FastAPI application with SSL support
log "Starting FastAPI application"
cd /app
python run_server.py --prod --host 127.0.0.1 --port 8000 --ssl &

# Wait for application to start
sleep 5

# Health check
log "Performing health check"
if curl -f http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
    log "Application started successfully"
    echo "✅ FastAPI application is running with HTTPS support!"
    echo "🌐 Access your application at: https://\$HOSTNAME"
else
    log "Health check failed"
    echo "❌ Failed to start application"
    exit 1
fi

# Keep container running
wait
EOF

# Make startup script executable
RUN chmod +x /app/start.sh

# Switch to non-root user
USER appuser

# Set environment variables
ENV PATH="/home/appuser/.local/bin:${PATH}"
ENV PYTHONPATH="/app:${PYTHONPATH}"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/api/health || exit 1

# Expose ports
EXPOSE 80 443 8000

# Start the application
CMD ["/app/start.sh"]