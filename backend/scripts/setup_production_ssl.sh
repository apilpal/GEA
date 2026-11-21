#!/bin/bash

# Production SSL Certificate Setup Script using Let's Encrypt
# This script automates the process of obtaining and configuring Let's Encrypt SSL certificates

set -e

# Configuration
WEBROOT_PATH="/var/www/html"
CERTBOT_WEBROOT="/var/lib/letsencrypt"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
DOMAIN=""
EMAIL=""
STAGING=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print usage
usage() {
    echo -e "${BLUE}🔐 Let's Encrypt SSL Setup Script${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --domain DOMAIN       Domain name (required)"
    echo "  -e, --email EMAIL         Email for certificate notifications (required)"
    echo "  -s, --staging             Use Let's Encrypt staging environment"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -d example.com -e admin@example.com"
    echo "  $0 -d example.com -e admin@example.com -s"
    echo ""
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -s|--staging)
            STAGING=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            usage
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

echo -e "${GREEN}🔐 Let's Encrypt SSL Certificate Setup${NC}"
echo "======================================"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Staging: $STAGING"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Certbot...${NC}"

    # Install certbot (Ubuntu/Debian)
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    else
        echo -e "${RED}❌ Unsupported package manager. Please install certbot manually.${NC}"
        exit 1
    fi
fi

# Create webroot directory if it doesn't exist
echo -e "${YELLOW}📁 Creating webroot directory...${NC}"
sudo mkdir -p "$WEBROOT_PATH"

# Create a simple HTML file for the ACME challenge
echo '<html><head><title>ACME Challenge</title></head><body><h1>ACME Challenge Response</h1></body></html>' | sudo tee "$WEBROOT_PATH/index.html" > /dev/null

# Set up nginx configuration for ACME challenge if nginx is available
if command -v nginx &> /dev/null && systemctl is-active --quiet nginx; then
    echo -e "${YELLOW}🔧 Configuring nginx for ACME challenge...${NC}"

    # Create nginx configuration for the domain
    NGINX_CONF="$NGINX_SITES_AVAILABLE/$DOMAIN"

    sudo tee "$NGINX_CONF" > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # ACME challenge location
    location /.well-known/acme-challenge/ {
        root $WEBROOT_PATH;
        allow all;
    }

    # Redirect all other requests to HTTPS (will be updated after certificate generation)
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

    # Enable the site
    sudo ln -sf "$NGINX_CONF" "$NGINX_SITES_ENABLED/"

    # Test nginx configuration
    sudo nginx -t

    # Reload nginx
    sudo systemctl reload nginx

    echo -e "${GREEN}✅ Nginx configured for ACME challenge${NC}"
fi

# Determine certbot environment
CERTBOT_ENV="--webroot --webroot-path $WEBROOT_PATH"
if [[ "$STAGING" == "true" ]]; then
    CERTBOT_ENV="$CERTBOT_ENV --staging"
    echo -e "${YELLOW}⚠️  Using Let's Encrypt staging environment (test certificates)${NC}"
fi

# Obtain SSL certificate
echo -e "${YELLOW}🔐 Obtaining SSL certificate from Let's Encrypt...${NC}"
sudo certbot certonly \
    $CERTBOT_ENV \
    --agree-tos \
    --no-eff-email \
    --register-unsafely-without-email \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    --rsa-key-size 4096 \
    --must-staple \
    --redirect \
    --hsts

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ SSL certificate obtained successfully!${NC}"

    # Set up auto-renewal
    echo -e "${YELLOW}🔄 Setting up automatic renewal...${NC}"

    # Create renewal script
    RENEWAL_SCRIPT="/usr/local/bin/renew_ssl.sh"
    sudo tee "$RENEWAL_SCRIPT" > /dev/null << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

echo "🔐 Renewing Let's Encrypt certificates..."
certbot renew --quiet --no-self-upgrade

if [[ $? -eq 0 ]]; then
    echo "✅ Certificates renewed successfully"

    # Reload nginx if it's running
    if command -v nginx && systemctl is-active --quiet nginx; then
        systemctl reload nginx
        echo "✅ Nginx reloaded"
    fi

    # Reload other services if needed
    if systemctl is-active --quiet your-app-service; then
        systemctl reload your-app-service
        echo "✅ Application service reloaded"
    fi

    echo "🎉 SSL renewal complete!"
else
    echo "❌ Certificate renewal failed"
    exit 1
fi
EOF

    sudo chmod +x "$RENEWAL_SCRIPT"

    # Add to cron for automatic renewal (twice daily)
    CRON_JOB="0 */12 * * * $RENEWAL_SCRIPT"
    (sudo crontab -l 2>/dev/null | grep -v "$RENEWAL_SCRIPT"; echo "$CRON_JOB") | sudo crontab -

    echo -e "${GREEN}✅ Automatic renewal configured (runs every 12 hours)${NC}"

    # Update environment configuration
    echo -e "${YELLOW}🔧 Updating environment configuration...${NC}"
    echo ""
    echo "Add these lines to your .env.production file:"
    echo "SSL_CERT_PATH=/etc/letsencrypt/live/$DOMAIN/cert.pem"
    echo "SSL_KEY_PATH=/etc/letsencrypt/live/$DOMAIN/privkey.pem"
    echo ""

    # Show certificate information
    echo -e "${GREEN}📜 Certificate Information:${NC}"
    sudo certbot certificates

    echo ""
    echo -e "${GREEN}🎉 Production SSL setup complete!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "1. Update your .env.production file with the SSL certificate paths"
    echo "2. Configure your application to use the SSL certificates"
    echo "3. Set up monitoring for certificate expiration"
    echo "4. Test HTTPS access to your domain"
    echo ""
    echo -e "${GREEN}🔐 Your domain is now secured with Let's Encrypt SSL!${NC}"

else
    echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
    echo "1. Check if your domain points to this server"
    echo "2. Ensure port 80 is open and accessible"
    echo "3. Check nginx configuration if using nginx"
    echo "4. Try with staging first: $0 -d $DOMAIN -e $EMAIL -s"
    echo ""
    exit 1
fi