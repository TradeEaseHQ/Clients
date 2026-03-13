from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("pipeline/.env", ".env"),  # works from project root or pipeline/
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # Anthropic
    anthropic_api_key: str

    # Google APIs
    google_places_api_key: str = ""
    google_psi_api_key: str = ""

    # Resend
    resend_api_key: str = ""
    resend_from_email: str = "ben@tradeeasehq.com"
    resend_from_name: str = "Ben from Trade Ease"
    resend_webhook_secret: str = ""

    # CAN-SPAM
    physical_address: str = ""

    # Lead source
    lead_source: Literal["google_places", "self_scrape"] = "google_places"

    # App URLs
    next_public_app_url: str = "http://localhost:3000"
    demo_base_url: str = ""
    comparison_base_url: str = ""

    # AI models
    scoring_model: str = "claude-sonnet-4-6"
    extraction_model: str = "claude-haiku-4-5-20251001"
    drafting_model: str = "claude-sonnet-4-6"


settings = Settings()
