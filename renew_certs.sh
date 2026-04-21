#!/bin/bash

# Configuration
DOMAIN="messner.click"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
HAPROXY_CERT_DIR="/etc/ssl/certs"
COMBINED_PEM="$HAPROXY_CERT_DIR/$DOMAIN.pem"

# 1. Run Certbot renewal
# --deploy-hook only runs if a renewal was actually successful
certbot renew --quiet --deploy-hook "
    cat $CERT_DIR/fullchain.pem $CERT_DIR/privkey.pem > $COMBINED_PEM
    chmod 600 $COMBINED_PEM
    # Reload HAProxy container to pick up new cert
    docker kill -s HUP haproxy_container_name
"

# Optional: Log the execution
echo "Certbot renewal check completed at $(date)" >> /var/log/certbot-haproxy.log
