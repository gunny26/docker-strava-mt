import os
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
import requests

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

@app.get("/login")
async def login():
    # Constructing the Strava authorization URL
    # Scope 'activity:read_all' is needed to access streams
    strava_url = (
        f"https://www.strava.com/oauth/authorize?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=activity:read_all"
    )
    return RedirectResponse(strava_url)

@app.get("/callback")
async def callback(code: str):
    payload = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code'
    }
    # Exchange code for token
    response = requests.post("https://www.strava.com/oauth/token", data=payload)
    data = response.json()
    access_token = data.get("access_token")
    
    # Redirect back to frontend with the token in the URL anchor
    # Using an anchor (#) prevents the token from being logged on the server side
    return RedirectResponse(url=f"/#access_token={access_token}")

@app.get("/stream/{activity_id}")
async def get_activity_stream(activity_id: str, token: str):
    headers = {'Authorization': f'Bearer {token}'}
    url = f"https://www.strava.com/api/v3/activities/{activity_id}/streams"
    params = {
        'keys': 'time,latlng,altitude,velocity_smooth,heartrate,cadence', 
        'key_by_type': 'true'
    }
    response = requests.get(url, headers=headers, params=params)
    return response.json()
