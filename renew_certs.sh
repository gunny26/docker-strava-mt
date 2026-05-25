#!/bin/bash
# Erneuert Let's Encrypt Zertifikate und kopiert sie für HAProxy

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
    /tmp/haproxy.pem

# 3. Kombiniertes Zertifikat ins Docker-Volume kopieren
docker run --rm \
    -v certs:/target \
    -v /tmp:/source \
    alpine cp /source/haproxy.pem /target/messner.click.pem

# 4. HAProxy Container neu starten
docker compose -f docker-compose-prod.yml restart haproxy

# 5. Temporäre Dateien aufräumen
rm /tmp/haproxy.pem

echo "Zertifikate erfolgreich erneuert um $(date)"
