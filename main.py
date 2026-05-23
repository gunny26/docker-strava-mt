import os
import re
from typing import Dict, Any
from fastapi import FastAPI
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
async def get_activity_stream(activity_id: str, token: str) -> Dict[str, Any]:
    """Fetch the activity stream data from Strava API."""
    headers: Dict[str, str] = {'Authorization': f'Bearer {token}'}
    url: str = f"https://www.strava.com/api/v3/activities/{activity_id}/streams"
    params: Dict[str, str] = {
        'keys': 'time,latlng,altitude,velocity_smooth,heartrate,cadence',
        'key_by_type': 'true'
    }
    response = requests.get(url, headers=headers, params=params)
    return response.json()

@app.get("/activity-info/{activity_id}")
async def get_activity_info(activity_id: str, token: str) -> Dict[str, Any]:
    """Fetch activity info. Fallback to web scraping if API denies access for other users' tracks."""
    headers: Dict[str, str] = {'Authorization': f'Bearer {token}'}
    url: str = f"https://www.strava.com/api/v3/activities/{activity_id}"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
        
    # Fallback: Scrape public Strava page if API access is denied (e.g. for other users' activities)
    public_url: str = f"https://www.strava.com/activities/{activity_id}"
    pub_resp = requests.get(public_url)
    
    info: Dict[str, Any] = {
        "name": f"Activity {activity_id}",
        "athlete": {"firstname": "Unknown", "lastname": "Athlete"},
        "start_date": "1970-01-01T00:00:00Z"
    }
    
    if pub_resp.status_code == 200:
        html: str = pub_resp.text
        
        # Extract title and athlete name from <title> tag
        # Format usually is: <title>Activity Name - Athlete Name's Ride | Strava</title>
        title_match = re.search(r'<title>(.*?) \| Strava</title>', html)
        if title_match:
            full_title: str = title_match.group(1)
            parts = full_title.split(' - ')
            if len(parts) >= 2:
                info["name"] = parts[0].strip()
                athlete_part: str = parts[1].split("'s")[0]
                name_parts = athlete_part.strip().split(' ')
                info["athlete"]["firstname"] = name_parts[0]
                if len(name_parts) > 1:
                    info["athlete"]["lastname"] = " ".join(name_parts[1:])
            else:
                info["name"] = full_title
                
        # Extract date from <time> tag
        time_match = re.search(r'<time[^>]*datetime="([^"]+)"', html)
        if time_match:
            info["start_date"] = time_match.group(1)
            
    return info
