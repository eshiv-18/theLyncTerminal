"""
config.py

FIXES APPLIED:
  1. Added `frontend_url` setting — required by the OAuth callbacks to build the
     redirect URL back to the React app. Was missing entirely.

  2. Added `APP_URL` env var support with a sensible production default comment.

  3. Zoho token refresh: the token_manager must use the api_domain stored on
     the connection document (which may differ from settings.zoho_api_domain
     due to regional data centers). The zoho_financial.py route and
     token_manager.py both accepted api_domain as an arg — but the caller
     was always passing settings.zoho_api_domain. This is now fixed by
     reading api_domain from the DB connection in zoho_financial.py.

  4. `get_settings` uses @lru_cache — this means env changes after first call
     are not picked up. That's fine for production but caused test issues.
     Added a clear_settings_cache() helper for tests.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # ── Base Application URLs ──────────────────────────────────────────────────
    # APP_URL: The URL this backend is served from.
    # MUST match the redirect URIs registered in GitHub OAuth App and Zoho API Console.
    # e.g. https://api.venturelync.com  (no trailing slash)
    app_url: str = os.getenv("APP_URL", "http://localhost:8000")

    # FRONTEND_URL: The URL the React frontend is served from.
    # After OAuth the backend redirects here so the user sees a success screen.
    # e.g. https://app.venturelync.com
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # ── Zoho Books OAuth ───────────────────────────────────────────────────────
    zoho_client_id:     str = ""
    zoho_client_secret: str = ""
    # Default to US API domain. The ACTUAL domain used for API calls is stored
    # per-connection in MongoDB (api_domain field) since it's region-specific.
    # This setting is only used as a fallback if the DB value is absent.
    zoho_api_domain:    str = "https://www.zohoapis.com"

    # ── HubSpot OAuth ─────────────────────────────────────────────────────────
    hubspot_client_id:     str = ""
    hubspot_client_secret: str = ""

    # ── Razorpay API ───────────────────────────────────────────────────────────
    razorpay_key_id:         str = ""
    razorpay_key_secret:     str = ""
    razorpay_webhook_secret: str = ""

    # ── GitHub OAuth ──────────────────────────────────────────────────────────
    github_client_id:     str = ""
    github_client_secret: str = ""

    # ── Database ───────────────────────────────────────────────────────────────
    mongo_url: str
    db_name:   str

    # ── Application ───────────────────────────────────────────────────────────
    app_name:                    str = "Startup Progress Intelligence"
    app_environment:             str = "development"
    secret_key:                  str = "your-secret-key-change-in-production"
    algorithm:                   str = "HS256"
    access_token_expire_minutes: int = 60

    # ── CORS ───────────────────────────────────────────────────────────────────
    cors_origins: str = "*"

    # ── Rate limiting ──────────────────────────────────────────────────────────
    zoho_rate_limit_per_minute: int = 100

    # ── Derived redirect URIs ──────────────────────────────────────────────────
    # These are built from app_url so you only need to set one env var.

    @property
    def zoho_redirect_uri(self) -> str:
        return f"{self.app_url}/api/auth/zoho/callback"

    @property
    def hubspot_redirect_uri(self) -> str:
        return f"{self.app_url}/api/auth/hubspot/callback"

    @property
    def github_redirect_uri(self) -> str:
        return f"{self.app_url}/api/auth/github/callback"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache():
    """Call this in tests after monkeypatching env vars."""
    get_settings.cache_clear()