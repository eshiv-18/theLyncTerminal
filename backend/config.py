from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Zoho Books OAuth
    zoho_client_id: str = ""
    zoho_client_secret: str = ""
    zoho_redirect_uri: str = "http://localhost:8001/api/auth/zoho/callback"
    zoho_api_domain: str = "https://www.zohoapis.com"
    
    # Database (using existing MongoDB)
    mongo_url: str
    db_name: str
    
    # Application
    app_name: str = "Startup Progress Intelligence"
    app_environment: str = "development"
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    
    # CORS
    cors_origins: str = "*"
    
    # API Settings
    zoho_rate_limit_per_minute: int = 100
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"  # Allow extra fields from .env


@lru_cache
def get_settings() -> Settings:
    return Settings()
