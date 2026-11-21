#!/bin/bash

# SSL Certificate Generation Script for Development
# This script generates self-signed SSL certificates for local development

set -e

# Configuration
CERT_DIR="backend/certs"
CERT_FILE="$CERT_DIR/dev.crt"
KEY_FILE="$CERT_DIR/dev.key"
CSR_FILE="$CERT_DIR/dev.csr"
DAYS_VALID=365

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 SSL Certificate Generation Script${NC}"
echo "======================================"

# Create certificates directory
echo -e "${YELLOW}📁 Creating certificates directory...${NC}"
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [[ -f "$CERT_FILE" && -f "$KEY_FILE" ]]; then
    echo -e "${YELLOW}⚠️  SSL certificates already exist.${NC}"
    read -p "Do you want to regenerate them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✅ Using existing certificates${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}🔧 Generating private key...${NC}"
# Generate private key
openssl genrsa -out "$KEY_FILE" 2048

echo -e "${YELLOW}📝 Generating certificate signing request...${NC}"
# Generate CSR
openssl req -new -key "$KEY_FILE" -out "$CSR_FILE" -subj "/C=US/ST=Development/L=Development/O=Dev/CN=localhost"

echo -e "${YELLOW}📜 Generating self-signed certificate...${NC}"
# Generate self-signed certificate
openssl x509 -req -days "$DAYS_VALID" -in "$CSR_FILE" -signkey "$KEY_FILE" -out "$CERT_FILE"

# Clean up CSR file
rm "$CSR_FILE"

# Set proper permissions
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo ""
echo -e "${GREEN}✅ SSL certificates generated successfully!${NC}"
echo "Certificate details:"
echo "  📄 Certificate: $CERT_FILE"
echo "  🔑 Private Key: $KEY_FILE"
echo "  📅 Valid for: $DAYS_VALID days"
echo ""
echo "Certificate information:"
openssl x509 -in "$CERT_FILE" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:)"

echo ""
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo "1. Update your .env.development file:"
echo "   SSL_CERT_PATH=backend/certs/dev.crt"
echo "   SSL_KEY_PATH=backend/certs/dev.key"
echo ""
echo "2. Restart your FastAPI application with SSL support"
echo ""
echo -e "${GREEN}🎉 Development SSL setup complete!${NC}"