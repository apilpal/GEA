#!/bin/bash

# SSL Certificate Renewal Script
# This script handles renewal of both self-signed development certificates
# and Let's Encrypt production certificates

set -e

# Configuration
CERT_DIR="backend/certs"
LETSENCRYPT_LIVE="/etc/letsencrypt/live"
LOG_FILE="backend/scripts/ssl_renewal.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

echo -e "${GREEN}🔐 SSL Certificate Renewal Script${NC}"
echo "================================="

log "Starting SSL certificate renewal process"

# Check if running in development or production
if [[ -f "backend/.env.production" ]]; then
    log "Production environment detected"

    # Check if Let's Encrypt certificates exist
    if [[ -d "$LETSENCRYPT_LIVE" ]]; then
        log "Found Let's Encrypt certificates"

        # Check if certbot is available
        if command -v certbot &> /dev/null; then
            echo -e "${YELLOW}🔄 Renewing Let's Encrypt certificates...${NC}"
            log "Running certbot renew"

            # Renew certificates
            if sudo certbot renew --quiet --no-self-upgrade; then
                log "Let's Encrypt certificates renewed successfully"

                # Reload nginx if it's running
                if command -v nginx &> /dev/null && sudo systemctl is-active --quiet nginx; then
                    echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
                    sudo systemctl reload nginx
                    log "Nginx reloaded after certificate renewal"
                fi

                # Reload application if running
                if pgrep -f "uvicorn.*src.main:app" > /dev/null; then
                    echo -e "${YELLOW}🔄 Reloading application...${NC}"
                    pkill -HUP -f "uvicorn.*src.main:app"
                    log "Application reloaded after certificate renewal"
                fi

                echo -e "${GREEN}✅ Let's Encrypt certificates renewed successfully${NC}"
                log "Let's Encrypt certificate renewal completed"

            else
                echo -e "${RED}❌ Failed to renew Let's Encrypt certificates${NC}"
                log "ERROR: Let's Encrypt certificate renewal failed"
                exit 1
            fi

        else
            echo -e "${RED}❌ Certbot not found. Install certbot to renew Let's Encrypt certificates.${NC}"
            log "ERROR: Certbot not installed"
            exit 1
        fi

    else
        echo -e "${YELLOW}⚠️  No Let's Encrypt certificates found${NC}"
        log "WARNING: No Let's Encrypt certificates directory found"
    fi

else
    log "Development environment detected"

    # Handle self-signed certificate renewal
    if [[ -f "backend/certs/dev.crt" && -f "backend/certs/dev.key" ]]; then
        echo -e "${YELLOW}🔄 Checking self-signed certificate expiration...${NC}"

        # Check certificate expiration date
        CERT_EXPIRY=$(openssl x509 -in "backend/certs/dev.crt" -noout -enddate | cut -d= -f2)
        CERT_EXPIRY_SECONDS=$(date -d "$CERT_EXPIRY" +%s)
        CURRENT_SECONDS=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( (CERT_EXPIRY_SECONDS - CURRENT_SECONDS) / 86400 ))

        log "Certificate expires in $DAYS_UNTIL_EXPIRY days"

        if [[ $DAYS_UNTIL_EXPIRY -lt 30 ]]; then
            echo -e "${YELLOW}🔄 Renewing self-signed certificate (expires in $DAYS_UNTIL_EXPIRY days)...${NC}"

            # Generate new self-signed certificate
            if bash backend/scripts/generate_ssl_cert.sh; then
                log "Self-signed certificate renewed successfully"
                echo -e "${GREEN}✅ Self-signed certificate renewed${NC}"
            else
                echo -e "${RED}❌ Failed to renew self-signed certificate${NC}"
                log "ERROR: Self-signed certificate renewal failed"
                exit 1
            fi

        else
            echo -e "${GREEN}✅ Self-signed certificate is still valid (expires in $DAYS_UNTIL_EXPIRY days)${NC}"
            log "Self-signed certificate still valid"
        fi

    else
        echo -e "${YELLOW}⚠️  No self-signed certificates found${NC}"
        log "WARNING: No self-signed certificates found"

        echo -e "${YELLOW}🔧 Generating initial self-signed certificates...${NC}"
        if bash backend/scripts/generate_ssl_cert.sh; then
            log "Initial self-signed certificates generated"
            echo -e "${GREEN}✅ Self-signed certificates generated${NC}"
        else
            echo -e "${RED}❌ Failed to generate self-signed certificates${NC}"
            log "ERROR: Failed to generate self-signed certificates"
            exit 1
        fi
    fi
fi

# Certificate validation
echo -e "${YELLOW}🔍 Validating SSL certificates...${NC}"

if [[ -f "backend/certs/dev.crt" ]]; then
    if openssl x509 -in "backend/certs/dev.crt" -checkend 0; then
        echo -e "${GREEN}✅ Self-signed certificate is valid${NC}"
        log "Self-signed certificate validation passed"
    else
        echo -e "${RED}❌ Self-signed certificate has expired${NC}"
        log "ERROR: Self-signed certificate expired"
        exit 1
    fi
fi

# Show certificate information
echo ""
echo -e "${BLUE}📜 Certificate Information:${NC}"

if [[ -f "backend/certs/dev.crt" ]]; then
    echo "Development Certificate:"
    openssl x509 -in "backend/certs/dev.crt" -noout -dates
fi

if [[ -d "$LETSENCRYPT_LIVE" ]]; then
    echo ""
    echo "Production Certificates:"
    sudo certbot certificates 2>/dev/null || echo "No Let's Encrypt certificates found"
fi

echo ""
echo -e "${GREEN}🎉 SSL certificate renewal completed successfully!${NC}"
log "SSL certificate renewal process completed successfully"

# Show renewal schedule
echo ""
echo -e "${YELLOW}📅 Renewal Schedule:${NC}"
echo "• Development certificates: Check every 30 days"
echo "• Production certificates: Automatic renewal every 12 hours"
echo "• Next renewal check: $(date -d '+12 hours' '+%Y-%m-%d %H:%M:%S')"
echo ""
echo -e "${GREEN}🔐 All SSL certificates are up to date!${NC}"