import os
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
import requests

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

CLIENT_ID: str = os.getenv("STRAVA_CLIENT_ID", "")
CLIENT_SECRET: str = os.getenv("STRAVA_CLIENT_SECRET", "")
REDIRECT_URI: str = os.getenv("STRAVA_REDIRECT_URI", "")

@app.get("/")
async def read_index() -> FileResponse:
    """Return the main index.html file."""
    return FileResponse('static/index.html')

@app.get("/login")
async def login() -> RedirectResponse:
    """Redirect user to Strava OAuth login page."""
    # Constructing the Strava authorization URL
    # Scope 'activity:read_all' is needed to access streams
    strava_url: str = (
        f"https://www.strava.com/oauth/authorize?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=activity:read_all"
    )
    return RedirectResponse(strava_url)

@app.get("/callback")
async def callback(code: str) -> RedirectResponse:
    """Handle OAuth callback and exchange code for access token."""
    payload: Dict[str, str] = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code'
    }
    # Exchange code for token
    response = requests.post("https://www.strava.com/oauth/token", data=payload)
    data: Dict[str, Any] = response.json()
    access_token: str = data.get("access_token", "")
    
    # Redirect back to frontend with the token in the URL anchor
    # Using an anchor (#) prevents the token from being logged on the server side
    return RedirectResponse(url=f"/#access_token={access_token}")

@app.get("/stream/{activity_id}")
async def get_activity_stream(
    activity_id: str, 
    authorization: str = Header(None, alias="Authorization")
) -> Dict[str, Any]:
    """Fetch the activity stream data from Strava API."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Authorization header fehlt oder ist ungültig"
        )
    
    token = authorization.split(" ")[1]
    headers: Dict[str, str] = {'Authorization': f'Bearer {token}'}
    url: str = f"https://www.strava.com/api/v3/activities/{activity_id}/streams"
    params: Dict[str, str] = {
        'keys': 'time,latlng,altitude,velocity_smooth,heartrate,cadence',
        'key_by_type': 'true'
    }
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Stream konnte nicht geladen werden.")
        
    return response.json()

@app.get("/activity-info/{activity_id}")
async def get_activity_info(
    activity_id: str, 
    authorization: str = Header(None, alias="Authorization")
) -> Dict[str, Any]:
    """Fetch activity info from Strava API."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Authorization header fehlt oder ist ungültig"
        )
    
    token = authorization.split(" ")[1]
    headers: Dict[str, str] = {'Authorization': f'Bearer {token}'}
    url: str = f"https://www.strava.com/api/v3/activities/{activity_id}"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
        
    raise HTTPException(
        status_code=response.status_code, 
        detail="Aktivität konnte nicht geladen werden (möglicherweise privat oder fremder Nutzer)."
    )
