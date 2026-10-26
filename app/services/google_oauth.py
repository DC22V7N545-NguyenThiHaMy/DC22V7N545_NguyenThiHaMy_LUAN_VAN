"""Google OAuth 2.0 authorization-code flow using httpx (no extra dependency)."""
from urllib.parse import urlencode
import httpx
from app.config import settings

AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
TOKEN_URL = 'https://oauth2.googleapis.com/token'
USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

def configured():
    return bool(settings.google_client_id and settings.google_client_secret)

def authorization_url(state):
    return AUTH_URL + '?' + urlencode({'client_id': settings.google_client_id, 'redirect_uri': settings.google_redirect_uri,
                                       'response_type': 'code', 'scope': 'openid email profile', 'state': state, 'prompt': 'select_account'})

def fetch_userinfo(code):
    """Exchange the code server-side and return Google's verified profile (sub, email, email_verified, name)."""
    with httpx.Client(timeout=15) as client:
        token = client.post(TOKEN_URL, data={'code': code, 'client_id': settings.google_client_id, 'client_secret': settings.google_client_secret,
                                             'redirect_uri': settings.google_redirect_uri, 'grant_type': 'authorization_code'})
        token.raise_for_status()
        info = client.get(USERINFO_URL, headers={'Authorization': 'Bearer ' + token.json()['access_token']})
        info.raise_for_status()
        return info.json()
