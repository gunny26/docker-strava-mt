# Strava Multi-Track Analyzer 🏃‍♂️🏔️

A powerful JS Single-Page Application (SPA) with a FastAPI backend designed to compare multiple Strava activities side-by-side, regardless of when or by whom they were recorded.

While Strava's "Flyby" only shows activities that happened at the same time, this tool allows you to **synchronize any activities** to analyze performance, route efficiency, and dynamics.

## Key Features

- **Time-Agnostic Comparison:** Compare runs from different years or different athletes.
- **Manual Time-Shift (Offset):** Align activities perfectly by shifting individual tracks forward or backward in time (e.g., to compare a specific steep climb).
- **Synchronized Multi-Charts:** View Altitude, Heart Rate, Speed, and Cadence across all tracks simultaneously.
- **Interactive Map:** High-precision synchronization between the charts and the map position.
- **Pro Analysis Tools:** - **Global Crosshair:** See exact values across all metrics at any point in time.
  - **Synchronized Zoom:** Zoom into specific trail sections; all graphs will follow the scale.
  - **Track Visibility:** Toggle individual tracks on/off without removing them.
- **Local Persistence:** Save your comparison sets (Activity IDs + Offsets) in your browser's local storage.

## Tech Stack

- **Backend:** Python / FastAPI (Handles Strava OAuth2 and Stream API).
- **Frontend:** Vanilla JS, Leaflet.js (Maps), Chart.js (Data Visualization with Zoom & Hammer.js).
- **Deployment:** Docker & Docker-Compose.

## Prerequisites

You need to create a Strava API Application at [strava.com/settings/api](https://www.strava.com/settings/api).
- **Authorization Domain:** `localhost` (for local testing) or your own domain (e.g., `messner.click`).
- **Callback URL:** Should match your `STRAVA_REDIRECT_URI` in the `.env` file.

## GitHub Actions Konfiguration

Damit der Workflow das Docker Image in die GitHub Container Registry pushen kann, müssen folgende Einstellungen im GitHub Repository vorgenommen werden:

1. **Workflow Permissions anpassen:**
   - Gehe zu deinem Repository auf GitHub
   - Klicke auf `Settings` > `Actions` > `General`
   - Scrolle zu `Workflow permissions`
   - Wähle `Read and write permissions` aus
   - Aktiviere die Checkbox `Allow GitHub Actions to create and approve pull requests`
   - Klicke auf `Save`

2. **Image auf Produktionsserver laden:**
   ```bash
   # 1. Anmeldung bei GitHub Container Registry
   echo "DEIN_GITHUB_TOKEN" | docker login ghcr.io -u DEIN_GITHUB_USERNAME --password-stdin
   
   # 2. Image herunterladen
   docker pull ghcr.io/DEIN_GITHUB_USERNAME/strava-mt-app:latest
   ```
   Ersetze:
   - `DEIN_GITHUB_TOKEN` mit deinem [Personal Access Token](https://github.com/settings/tokens) (Scopes: `read:packages`)
   - `DEIN_GITHUB_USERNAME` mit deinem GitHub Benutzernamen

3. **Initiales Zertifikat generieren:**
   ```bash
   cd /home/mesznera/docker-strava-mt
   source .env
   sudo certbot certonly --standalone \
     -d "$LETSENCRYPT_DOMAIN" \
     --non-interactive \
     --agree-tos \
     --email "$LETSENCRYPT_EMAIL" \
     --keep-until-expiring
   ```

## Installation & Usage

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/gunny26/docker-strava-mt.git](https://github.com/gunny26/docker-strava-mt.git)
   cd docker-strava-mt
   ```

2. **Configuration:**
    Create a .env file in the root directory and add your credentials:

    ```env
    STRAVA_CLIENT_ID=your_id
    STRAVA_CLIENT_SECRET=your_secret
    STRAVA_REDIRECT_URI=http://localhost:8000/callback
    LETSENCRYPT_DOMAIN=your.domain.com
    LETSENCRYPT_EMAIL=your@email.com
    ```

### Anleitung zum Neubau und Start des Containers

1. **Öffne ein Terminal** im Projektverzeichnis

2. **Stoppe laufende Container**:
```bash
docker compose -f docker-compose-prod.yml down
```

3. **Starte die Produktion**:
```bash
chmod +x start_prod.sh renew_certs.sh
./start_prod.sh
```

### Wichtige Hinweise:
- Die App ist nach dem Start erreichbar unter der in `STRAVA_REDIRECT_URI` konfigurierten Domain.
- Bei Änderungen am Code musst du das Image neu bauen und den Container neu starten.

## Analyze:

Open http://localhost:8000.

Click Connect Strava to authorized
Paste a Strava Activity ID into the sidebar and click Add.
Use the Offset fields to align your runs.
Click on a graph to lock the position for detailed analysis.

## Project Background

I use this application to analyze the best and most efficient routes to specific mountain targets in Tyrol. It helps in deciding whether a "Powerhike" or a slow run is more effective on specific gradients by comparing heart rate and cadence across different attempts.

## Credits

Concept & Idea: gunny26
AI Collaborator: Developed in collaboration with Google Gemini (AI Pair Programming).

## Disclaimer:

This app is not affiliated with Strava, Inc. It uses the Strava API in accordance with their terms of service.
