"""
Typed Supabase helpers for the pipeline.
All DB access goes through these functions — never raw supabase calls in business logic.
"""
from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from supabase import create_client, Client

from pipeline.config import settings

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


# ============================================================
# Businesses
# ============================================================

def upsert_business(data: dict[str, Any]) -> dict[str, Any]:
    """Insert or update a business by google_place_id. Returns the row."""
    client = get_client()
    result = (
        client.table("businesses")
        .upsert(data, on_conflict="google_place_id")
        .execute()
    )
    return result.data[0]


def update_business_status(business_id: str, status: str) -> None:
    """Update a business's pipeline status."""
    get_client().table("businesses").update({"status": status}).eq("id", business_id).execute()


def update_business_extracted_content(business_id: str, content: dict[str, Any]) -> None:
    """Store Claude-extracted content in businesses.extracted_content JSONB."""
    get_client().table("businesses").update({"extracted_content": content}).eq("id", business_id).execute()


def get_businesses_for_analysis() -> list[dict[str, Any]]:
    """Return businesses with status=new that have a website URL to analyze."""
    result = (
        get_client()
        .table("businesses")
        .select("*")
        .eq("status", "new")
        .not_.is_("website_url", "null")
        .execute()
    )
    return result.data


def get_businesses_for_demo() -> list[dict[str, Any]]:
    """Return scored businesses that need demo generation (not skip_remake)."""
    client = get_client()
    # Join with website_analyses to get tier
    result = (
        client.table("businesses")
        .select("*, website_analyses(priority_tier, top_3_weaknesses, total_score)")
        .eq("status", "scored")
        .execute()
    )
    # Filter out skip_remake in Python (Supabase doesn't support joined column filters easily)
    rows = result.data
    return [
        r for r in rows
        if r.get("website_analyses")
        and r["website_analyses"][0].get("priority_tier") != "skip_remake"
    ]


def get_businesses_for_outreach() -> list[dict[str, Any]]:
    """Return businesses with demo_generated status (ready for email drafting)."""
    result = (
        get_client()
        .table("businesses")
        .select("*, contacts(*), demo_sites(*), website_analyses(*)")
        .eq("status", "demo_generated")
        .execute()
    )
    return result.data


def get_businesses_no_site() -> list[dict[str, Any]]:
    """Return businesses with no website — highest priority for outreach."""
    result = (
        get_client()
        .table("businesses")
        .select("*")
        .eq("status", "new")
        .is_("website_url", "null")
        .execute()
    )
    return result.data


# ============================================================
# Website Analyses
# ============================================================

def save_website_analysis(data: dict[str, Any]) -> dict[str, Any]:
    """Insert a website analysis record. Returns the inserted row."""
    result = get_client().table("website_analyses").insert(data).execute()
    return result.data[0]


def get_analysis_for_business(business_id: str) -> dict[str, Any] | None:
    result = (
        get_client()
        .table("website_analyses")
        .select("*")
        .eq("business_id", business_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


# ============================================================
# Demo Sites
# ============================================================

def save_demo_site(data: dict[str, Any]) -> dict[str, Any]:
    """Insert a demo site record. Returns the inserted row."""
    result = get_client().table("demo_sites").insert(data).execute()
    return result.data[0]


def update_demo_site(demo_id: str, updates: dict[str, Any]) -> None:
    get_client().table("demo_sites").update(updates).eq("id", demo_id).execute()


# ============================================================
# Contacts
# ============================================================

def save_contact(data: dict[str, Any]) -> dict[str, Any]:
    """Insert a contact. Returns the inserted row."""
    result = get_client().table("contacts").insert(data).execute()
    return result.data[0]


def get_contact_for_business(business_id: str) -> dict[str, Any] | None:
    result = (
        get_client()
        .table("contacts")
        .select("*")
        .eq("business_id", business_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


# ============================================================
# Outreach Drafts
# ============================================================

def save_outreach_draft(data: dict[str, Any]) -> dict[str, Any]:
    """Insert an outreach draft. Returns the inserted row."""
    result = get_client().table("outreach_drafts").insert(data).execute()
    return result.data[0]


def update_outreach_draft(draft_id: str, updates: dict[str, Any]) -> None:
    get_client().table("outreach_drafts").update(updates).eq("id", draft_id).execute()


def get_drafts_pending_review() -> list[dict[str, Any]]:
    """Return all outreach drafts with status=draft, joined with business info."""
    result = (
        get_client()
        .table("outreach_drafts")
        .select("*, businesses(name, city, state, website_url), contacts(name, email)")
        .eq("status", "draft")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


def get_approved_drafts() -> list[dict[str, Any]]:
    """Return approved drafts ready to send."""
    result = (
        get_client()
        .table("outreach_drafts")
        .select("*, businesses(name, city), contacts(name, email)")
        .eq("status", "approved")
        .order("approved_at", desc=True)
        .execute()
    )
    return result.data


# ============================================================
# Campaigns
# ============================================================

def create_campaign(data: dict[str, Any]) -> dict[str, Any]:
    result = get_client().table("campaigns").insert(data).execute()
    return result.data[0]


def update_campaign(campaign_id: str, updates: dict[str, Any]) -> None:
    get_client().table("campaigns").update(updates).eq("id", campaign_id).execute()


def link_business_to_campaign(campaign_id: str, business_id: str) -> None:
    get_client().table("campaign_businesses").upsert(
        {"campaign_id": campaign_id, "business_id": business_id}
    ).execute()


# ============================================================
# Templates
# ============================================================

def get_active_template(niche: str) -> dict[str, Any] | None:
    result = (
        get_client()
        .table("templates")
        .select("*")
        .eq("niche", niche)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


# ============================================================
# Storage helpers
# ============================================================

def upload_file(bucket: str, path: str, content: bytes, content_type: str = "text/html") -> str:
    """Upload bytes to Supabase Storage. Returns the public URL."""
    client = get_client()
    client.storage.from_(bucket).upload(
        path=path,
        file=content,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    url_response = client.storage.from_(bucket).get_public_url(path)
    return url_response


def upload_screenshot(business_id: str, label: str, png_bytes: bytes) -> str:
    """Upload a screenshot PNG. Returns the storage URL."""
    path = f"{business_id}/{label}.png"
    return upload_file("screenshots", path, png_bytes, content_type="image/png")


def upload_demo_html(business_id: str, html: str) -> str:
    """Upload a rendered demo HTML. Returns the public URL."""
    path = f"{business_id}/index.html"
    return upload_file("demos", path, html.encode("utf-8"), content_type="text/html")


def upload_comparison_html(business_id: str, html: str) -> str:
    """Upload a comparison page HTML. Returns the public URL."""
    path = f"{business_id}/index.html"
    return upload_file("comparisons", path, html.encode("utf-8"), content_type="text/html")
