from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    database_url: str = f"sqlite:///{(ROOT / 'data/velastyle.db').as_posix()}"
    cookie_secure: bool = False
    clip_model: str = 'openai/clip-vit-base-patch32'
    clip_device: str = 'cpu'
    hybrid_alpha: float = 0.5
    cors_origins: str = ''
    cookie_samesite: str = 'lax'
    session_days: int = 7
    rate_limit_per_minute: int = 20
    max_upload_mb: int = 5
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_user: str = ''
    smtp_password: str = ''
    smtp_from: str = ''
    smtp_security: str = 'starttls'
    email_code_minutes: int = 10
    email_resend_seconds: int = 120
    google_client_id: str = ''
    google_client_secret: str = ''
    google_redirect_uri: str = 'http://127.0.0.1:8010/api/auth/google/callback'
    frontend: str = 'react'

    @property
    def cors_origin_list(self):
        return [o.strip().rstrip('/') for o in self.cors_origins.split(',') if o.strip()]

    model_config = SettingsConfigDict(env_file=str(ROOT / '.env'), extra='ignore')

settings = Settings()
for directory in ['data', 'data/embeddings', 'app/static/uploads']:
    (ROOT / directory).mkdir(parents=True, exist_ok=True)
