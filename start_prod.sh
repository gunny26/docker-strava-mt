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

# Bei GitHub Container Registry anmelden
echo "$GHCR_TOKEN" | docker login ghcr.io -u $GITHUB_REPOSITORY_OWNER --password-stdin

# Zertifikats-Volume erstellen (falls nicht vorhanden)
docker volume create certs > /dev/null 2>&1 || true

# Docker Compose mit Produktionskonfiguration starten
docker compose -f docker-compose-prod.yml up -d --pull always

echo "Anwendung erfolgreich gestartet!"
echo "Zugriff: https://multi-track-analyzer.messner.click"
