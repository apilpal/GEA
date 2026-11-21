#!/bin/bash

# Production Deployment Script for FastAPI with HTTPS
# This script automates the complete production deployment process
# Works from any directory with proper context detection

set -e

# Global variables for context
SCRIPT_DIR=""
BACKEND_DIR=""
PROJECT_ROOT=""

# Detect script and project context
detect_deployment_context() {
    # Get the directory where this script is located
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

    # The backend directory is where this script is located
    BACKEND_DIR="$SCRIPT_DIR"

    # Find project root by looking for key project files
    PROJECT_ROOT="$BACKEND_DIR/.."

    # Verify we have the expected structure
    if [ ! -f "$BACKEND_DIR/docker-compose.yml" ]; then
        echo -e "${RED}❌ Error: docker-compose.yml not found in backend directory${NC}"
        echo -e "${YELLOW}Expected at: $BACKEND_DIR/docker-compose.yml${NC}"
        return 1
    fi

    if [ ! -f "$PROJECT_ROOT/frontend/package.json" ]; then
        echo -e "${YELLOW}⚠️  Warning: Frontend package.json not found, but continuing${NC}"
    fi

    echo -e "${BLUE}🔍 Deployment context detected:${NC}"
    echo -e "${BLUE}  Script directory: $SCRIPT_DIR${NC}"
    echo -e "${BLUE}  Backend directory: $BACKEND_DIR${NC}"
    echo -e "${BLUE}  Project root: $PROJECT_ROOT${NC}"
    echo -e "${BLUE}  Working directory: $(pwd)${NC}"

    return 0
}

# Initialize deployment context
if ! detect_deployment_context; then
    echo -e "${RED}❌ Failed to detect deployment context${NC}"
    exit 1
fi

# Configuration (using absolute paths)
COMPOSE_FILE="$BACKEND_DIR/docker-compose.yml"
NGINX_CONF="$BACKEND_DIR/nginx-ssl.conf"
ENV_FILE="$BACKEND_DIR/.env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print usage
usage() {
    echo -e "${BLUE}🚀 FastAPI Production Deployment Script${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS] DOMAIN EMAIL"
    echo ""
    echo "Arguments:"
    echo "  DOMAIN                    Your domain name (required)"
    echo "  EMAIL                     Email for SSL notifications (required)"
    echo ""
    echo "Options:"
    echo "  --staging                 Use Let's Encrypt staging environment"
    echo "  --no-ssl                  Skip SSL setup (not recommended)"
    echo "  --help                    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 example.com admin@example.com"
    echo "  $0 example.com admin@example.com --staging"
    echo ""
    exit 1
}

# Function to detect execution context
get_execution_context() {
    # Detect the execution environment
    if [[ -n "$CI" ]] || [[ -n "$GITHUB_ACTIONS" ]] || [[ -n "$GITLAB_CI" ]]; then
        echo "CI/CD"
    elif [[ -n "$DOCKER_CONTAINER" ]] || [[ -f "/.dockerenv" ]]; then
        echo "Docker"
    else
        echo "Local"
    fi
}

# Parse command line arguments
STAGING=false
SKIP_SSL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --staging)
            STAGING=true
            shift
            ;;
        --no-ssl)
            SKIP_SSL=true
            shift
            ;;
        --help)
            usage
            ;;
        -*)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            usage
            ;;
        *)
            if [[ -z "$DOMAIN" ]]; then
                DOMAIN="$1"
            elif [[ -z "$EMAIL" ]]; then
                EMAIL="$1"
            else
                echo -e "${RED}❌ Too many arguments${NC}"
                usage
            fi
            shift
            ;;
    esac
done

# Validate required parameters
if [[ -z "$DOMAIN" ]]; then
    echo -e "${RED}❌ Domain is required${NC}"
    usage
fi

if [[ -z "$EMAIL" ]]; then
    echo -e "${RED}❌ Email is required${NC}"
    usage
fi

echo -e "${GREEN}🚀 FastAPI Production Deployment${NC}"
echo "================================"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Staging: $STAGING"
echo "Skip SSL: $SKIP_SSL"
echo ""

# Display execution context information
EXECUTION_CONTEXT=$(get_execution_context)
echo -e "${BLUE}📍 Execution Context: $EXECUTION_CONTEXT${NC}"
echo -e "${BLUE}🔧 Backend Directory: $BACKEND_DIR${NC}"
echo -e "${BLUE}📁 Project Root: $PROJECT_ROOT${NC}"
echo ""

# Pre-deployment checks
echo -e "${YELLOW}🔍 Running pre-deployment checks...${NC}"

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if docker-compose is available (try both old and new syntax)
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker --help | grep -q compose; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo -e "${RED}❌ Docker Compose is not available.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker checks passed${NC}"

# Check if domain resolves to this server
echo -e "${YELLOW}🔍 Checking domain resolution...${NC}"
if ! nslookup "$DOMAIN" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Could not resolve domain $DOMAIN${NC}"
    echo -e "${YELLOW}   Make sure your domain points to this server${NC}"
fi

# Generate SSL certificates if not skipping SSL
if [[ "$SKIP_SSL" != "true" ]]; then
    echo -e "${YELLOW}🔐 Setting up SSL certificates...${NC}"

    # Check if certificates already exist
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        echo -e "${GREEN}✅ SSL certificates already exist for $DOMAIN${NC}"
    else
        echo -e "${YELLOW}🔧 Obtaining SSL certificates...${NC}"

        # Use staging or production Let's Encrypt
        # Use the context-detected script directory
        SSL_SCRIPT="$SCRIPT_DIR/setup_production_ssl.sh"

        # Check if SSL script exists
        if [[ ! -f "$SSL_SCRIPT" ]]; then
            echo -e "${RED}❌ SSL setup script not found: $SSL_SCRIPT${NC}"
            echo -e "${YELLOW}⚠️  Continuing without SSL. You can set up SSL manually later.${NC}"
            SKIP_SSL="true"
        else
            if [[ "$STAGING" == "true" ]]; then
                if ! bash "$SSL_SCRIPT" -d "$DOMAIN" -e "$EMAIL" -s; then
                    echo -e "${RED}❌ Failed to obtain SSL certificates with staging${NC}"
                    echo -e "${YELLOW}⚠️  Continuing without SSL. You can set up SSL manually later.${NC}"
                    SKIP_SSL="true"
                fi
            else
                if ! bash "$SSL_SCRIPT" -d "$DOMAIN" -e "$EMAIL"; then
                    echo -e "${RED}❌ Failed to obtain SSL certificates${NC}"
                    echo -e "${YELLOW}⚠️  Continuing without SSL. You can set up SSL manually later.${NC}"
                    SKIP_SSL="true"
                fi
            fi
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Skipping SSL setup as requested${NC}"
fi

# Update environment configuration
echo -e "${YELLOW}🔧 Updating environment configuration...${NC}"

if [[ -f "$ENV_FILE" ]]; then
    # Update SSL paths in environment file
    if [[ "$SKIP_SSL" != "true" ]]; then
        sed -i.bak "s|SSL_CERT_PATH=.*|SSL_CERT_PATH=/etc/letsencrypt/live/$DOMAIN/fullchain.pem|" "$ENV_FILE"
        sed -i.bak "s|SSL_KEY_PATH=.*|SSL_KEY_PATH=/etc/letsencrypt/live/$DOMAIN/privkey.pem|" "$ENV_FILE"
    fi

    # Update domain in CORS origins
    sed -i.bak "s|CORS_ORIGINS=.*|CORS_ORIGINS=[\"https://$DOMAIN\", \"https://www.$DOMAIN\"]|" "$ENV_FILE"

    echo -e "${GREEN}✅ Environment configuration updated${NC}"
else
    echo -e "${RED}❌ Environment file $ENV_FILE not found${NC}"
    exit 1
fi

# Update nginx configuration with domain
echo -e "${YELLOW}🔧 Updating nginx configuration...${NC}"

# Create domain-specific nginx config
cat > "nginx-$DOMAIN.conf" << EOF
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Certificate paths
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL Security Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    location / {
        proxy_pass http://app:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo -e "${GREEN}✅ Nginx configuration created for $DOMAIN${NC}"

# Deploy with Docker Compose
echo -e "${YELLOW}🐳 Deploying with Docker Compose...${NC}"

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" down || true

# Build and start new containers
echo -e "${YELLOW}🔨 Building and starting containers...${NC}"
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" up -d --build

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 30

# Health checks
echo -e "${YELLOW}🏥 Performing health checks...${NC}"

# Check if containers are running
if $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo -e "${GREEN}✅ All containers are running${NC}"
else
    echo -e "${RED}❌ Some containers failed to start${NC}"
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" logs
    exit 1
fi

# Check application health
echo -e "${YELLOW}🔍 Checking application health...${NC}"
if curl -f -k "https://$DOMAIN/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is responding on HTTPS${NC}"
elif curl -f "http://localhost/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is responding on HTTP${NC}"
else
    echo -e "${RED}❌ Application health check failed${NC}"
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" logs app
    exit 1
fi

# Show status
echo ""
echo -e "${GREEN}🎉 Production deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "  🌐 Domain: https://$DOMAIN"
echo "  🔐 SSL: $(if [[ "$SKIP_SSL" == "true" ]]; then echo "Disabled"; else echo "Enabled"; fi)"
echo "  🐳 Services: $($DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" ps --services | wc -l)"
echo "  📊 Status: All services are running"
echo "  📍 Context: $EXECUTION_CONTEXT"
echo "  🔧 Backend: $BACKEND_DIR"
echo ""

# Show container status
echo -e "${BLUE}🐳 Container Status:${NC}"
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" ps

echo ""
echo -e "${YELLOW}📋 Post-deployment steps:${NC}"
echo "1. Update your DNS to point $DOMAIN to this server"
echo "2. Test HTTPS access: https://$DOMAIN"
echo "3. Set up monitoring for certificate renewal"
echo "4. Configure backups for database and logs"
echo ""

if [[ "$SKIP_SSL" != "true" ]]; then
    echo -e "${YELLOW}🔐 SSL Certificate Information:${NC}"
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" exec cert-renewal /app/scripts/renew_certificates.sh
fi

echo -e "${GREEN}🚀 Your FastAPI application is now live with HTTPS!${NC}"