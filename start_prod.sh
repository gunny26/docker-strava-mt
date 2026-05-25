#!/bin/bash
set -e

# Lade Umgebungsvariablen aus .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Fehler: .env Datei nicht gefunden."
    exit 1
fi

# Erforderliche Variablen prüfen
required_vars=(
    "STRAVA_CLIENT_ID"
    "STRAVA_CLIENT_SECRET"
    "STRAVA_REDIRECT_URI"
    "GITHUB_REPOSITORY_OWNER"
    "GHCR_TOKEN"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Fehler: $var ist in .env nicht gesetzt."
        exit 1
    fi
done

# Domain aus Redirect-URI extrahieren
DOMAIN=$(echo "$STRAVA_REDIRECT_URI" | sed -E 's|https?://([^/]+).*|\1|')
echo "Generiere Zertifikat für Domain: $DOMAIN"

# Bei GitHub Container Registry anmelden
echo "$GHCR_TOKEN" | docker login ghcr.io -u $GITHUB_REPOSITORY_OWNER --password-stdin

# Cert-Verzeichnis erstellen
mkdir -p certs

# Docker Compose mit Produktionskonfiguration starten
docker compose -f docker-compose-prod.yml up -d --pull always

# Initiales Zertifikat erstellen
if [ ! -f "/etc/letsencrypt/live/$LETSENCRYPT_DOMAIN/fullchain.pem" ]; then
  echo "Erstelle initiales Let's Encrypt Zertifikat..."
  sudo certbot certonly --standalone -d "$LETSENCRYPT_DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$LETSENCRYPT_EMAIL" \
    --keep-until-expiring
fi

# Certbot-Skript als root ausführen
sudo ./renew_certs.sh

echo "Anwendung erfolgreich gestartet!"
echo "Zugriff: $STRAVA_REDIRECT_URI"
