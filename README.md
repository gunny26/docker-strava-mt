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

## Installation & Usage

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/gunny26/docker-strava-mt.git](https://github.com/gunny26/docker-strava-mt.git)
   cd docker-strava-mt
   ```

2. **Configuration:**
    Create a .env file in the root directory and add your credentials:
    Code-Snippet

    ```
    STRAVA_CLIENT_ID=your_id
    STRAVA_CLIENT_SECRET=your_secret
    STRAVA_REDIRECT_URI=http://localhost:8000/callback
    ```

    Start the Container:
    Bash
    ```
    docker-compose up -d --build
    ```
    Analyze:

        Open http://localhost:8000.

        Click Connect Strava to authorize.

        Paste a Strava Activity ID into the sidebar and click Add.

        Use the Offset fields to align your runs.

        Click on a graph to lock the position for detailed analysis.

## Project Background

I use this application to analyze the best and most efficient routes to specific mountain targets in Tyrol. It helps in deciding whether a "Powerhike" or a slow run is more effective on specific gradients by comparing heart rate and cadence across different attempts.

## Credits

    Concept & Idea: gunny26

    AI Collaborator: Developed in collaboration with Google Gemini (AI Pair Programming).

## Disclaimer: This app is not affiliated with Strava, Inc. It uses the Strava API in accordance with their terms of service.
