"""
Shared Pydantic models used across the pipeline.
These are the canonical data shapes — DB helpers accept/return dicts,
but business logic works with these typed models.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, field_validator


class BusinessRaw(BaseModel):
    """Standardized output from any LeadSourceAdapter."""
    google_place_id: Optional[str] = None
    name: str
    phone: Optional[str] = None
    website_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    rating: Optional[float] = None
    review_count: int = 0
    category: Optional[str] = None
    niche: str = "housekeeping"
    source: str = "google_places"  # google_places | self_scrape | manual

    @field_validator("rating")
    @classmethod
    def clamp_rating(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            return round(max(0.0, min(5.0, v)), 1)
        return v

    @field_validator("website_url")
    @classmethod
    def normalize_url(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.startswith(("http://", "https://")):
            return f"https://{v}"
        return v

    def to_db_dict(self) -> dict:
        return self.model_dump(exclude_none=False)


class ExtractedContent(BaseModel):
    """Claude-extracted structured content from a business website."""
    services_offered: list[str] = []
    service_areas: list[str] = []
    years_in_business: Optional[int] = None
    trust_signals: list[str] = []
    unique_selling_points: list[str] = []
    owner_name: Optional[str] = None
    tone: str = "professional"  # friendly | professional | formal | family_run


class ScoringResult(BaseModel):
    """Output from WebsiteScorer."""
    visual_score: int
    mobile_score: int
    trust_score: int
    cta_score: int
    service_clarity_score: int
    contact_friction_score: int
    speed_score: int
    review_usage_score: int
    quote_flow_score: int
    professionalism_score: int
    total_score: int
    priority_tier: str  # skip_remake | candidate | high_priority | no_site
    ai_analysis_notes: str = ""
    top_3_weaknesses: list[str] = []


class UpgradedContent(BaseModel):
    """Claude-generated copy for demo site injection."""
    tagline: str
    about_text: str
    services_enhanced: list[dict]  # [{name, description}]
    trust_statement: str
    service_area_text: str
    faq_items: list[dict] = []  # [{question, answer}]
