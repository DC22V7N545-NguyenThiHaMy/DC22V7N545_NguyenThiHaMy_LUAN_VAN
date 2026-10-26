"""Print which optional features are configured (never the values). Used by start.ps1."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings as s

if __name__ == '__main__':
    print('SMTP=' + ('OK' if s.smtp_host and s.smtp_user and s.smtp_password else 'NO'))
    print('GOOGLE=' + ('OK' if s.google_client_id and s.google_client_secret else 'NO'))
    print('REDIRECT=' + s.google_redirect_uri)
