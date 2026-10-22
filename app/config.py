from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    database_url: str = f"sqlite:///{(ROOT / 'data/velastyle.db').as_posix()}"
    cookie_secure: bool = False
    clip_model: str = 'openai/clip-vit-base-patch32'
    clip_device: str = 'cpu'
    hybrid_alpha: float = 0.5
    model_config = SettingsConfigDict(env_file=str(ROOT / '.env'), extra='ignore')

settings = Settings()
for directory in ['data', 'data/embeddings', 'app/static/uploads']:
    (ROOT / directory).mkdir(parents=True, exist_ok=True)
