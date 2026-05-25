#!/bin/bash
# Erneuert Let's Encrypt Zertifikate und speichert sie im Projektordner

# Projektverzeichnis ermitteln
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$SCRIPT_DIR"

# Umgebungsvariablen laden
source .env

# 1. Zertifikate erneuern
certbot renew --noninteractive --quiet --agree-tos --email "$LETSENCRYPT_EMAIL"

# 2. Zertifikat und Key kombinieren
cat /etc/letsencrypt/live/"$LETSENCRYPT_DOMAIN"/fullchain.pem \
    /etc/letsencrypt/live/"$LETSENCRYPT_DOMAIN"/privkey.pem > \
    ./certs/messner.click.pem

# 3. Rechte anpassen (für normalen Benutzer lesbar)
chown $(id -u):$(id -g) ./certs/messner.click.pem
chmod 644 ./certs/messner.click.pem

# 4. HAProxy Container neu starten
docker compose -f docker-compose-prod.yml restart haproxy

echo "Zertifikate erfolgreich erneuert um $(date)"
