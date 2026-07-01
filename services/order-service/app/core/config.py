from pydantic_settings import BaseSettings
from pathlib import Path

# get the directory this file lives in
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    database_url: str
    matching_engine_url: str = "localhost:50051"
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60
    kafka_bootstrap_servers: str = "localhost:9092"
    alpaca_enabled:    bool = False
    alpaca_api_key:    str  = ""
    alpaca_secret_key: str  = ""
    alpaca_paper:      bool = True

    model_config = {
        "env_file": str(BASE_DIR / ".env"),
        "env_file_encoding": "utf-8"
    }

settings = Settings()
