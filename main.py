import os
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import requests

app = FastAPI()

# Mount the static directory to serve JS, CSS, and Images
# This makes everything in /static available under /static/filename
app.mount("/static", StaticFiles(directory="static"), name="static")

CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI")

@app.get("/")
async def read_index():
    # Serve the index.html file from the static folder
    return FileResponse('static/index.html')

@app.get("/status")
async def status():
    return {"status": "Application is running", "client_id_set": bool(CLIENT_ID)}

@app.get("/callback")
async def callback(code: str):
    # Security check: Ensure credentials are present
    if not CLIENT_ID or not CLIENT_SECRET:
        return {"error": "Server configuration missing: Client ID or Secret not set"}

    # Exchange authorization code for access token
    payload = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code'
    }
    
    # Requesting token from Strava
    response = requests.post("https://www.strava.com/oauth/token", data=payload)
    return response.json()

@app.get("/stream/{activity_id}")
async def get_activity_stream(activity_id: str, access_token: str):
    # Fetching activity streams for comparison
    headers = {'Authorization': f'Bearer {access_token}'}
    url = f"https://www.strava.com/api/v3/activities/{activity_id}/streams"
    params = {
        'keys': 'time,latlng,altitude,velocity_smooth,heartrate,cadence', 
        'key_by_type': 'true'
    }
    
    response = requests.get(url, headers=headers, params=params)
    return response.json()
