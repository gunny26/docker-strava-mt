#!/bin/bash
# Create directory for certificates
mkdir -p ./certs
# Generate temporary certificate and private key
openssl req -x509 -newkey rsa:2048 -keyout dummy.key -out dummy.crt -days 365 -nodes -subj "/CN=multi-track-analyzer.messner.click"
# Combine both files into a single .pem file for HAProxy
cat dummy.crt dummy.key > ./certs/messner.click.pem
# Remove temporary files
rm dummy.crt dummy.key
# Print success message
echo "Dummy certificate created at ./certs/messner.click.pem"
