from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Base Application URL (for OAuth redirects)
    app_url: str = os.getenv("APP_URL", "http://localhost:8001")
    
    # Zoho Books OAuth
    zoho_client_id: str = ""
    zoho_client_secret: str = ""
    zoho_api_domain: str = "https://www.zohoapis.com"
    
    # HubSpot OAuth
    hubspot_client_id: str = ""
    hubspot_client_secret: str = ""
    
    # Razorpay API
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    
    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""
    
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
    
    @property
    def zoho_redirect_uri(self) -> str:
        """Dynamically construct Zoho OAuth redirect URI"""
        return f"{self.app_url}/api/auth/zoho/callback"
    
    @property
    def hubspot_redirect_uri(self) -> str:
        """Dynamically construct HubSpot OAuth redirect URI"""
        return f"{self.app_url}/api/auth/hubspot/callback"
    
    @property
    def github_redirect_uri(self) -> str:
        """Dynamically construct GitHub OAuth redirect URI"""
        return f"{self.app_url}/api/auth/github/callback"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"  # Allow extra fields from .env


@lru_cache
def get_settings() -> Settings:
    return Settings()
