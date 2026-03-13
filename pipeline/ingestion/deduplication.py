"""
Deduplication — filters out businesses already in the database.
Matching strategy:
  1. google_place_id match (exact, when available)
  2. name + phone fuzzy match (for self_scrape results with no place_id)
"""
from __future__ import annotations

import logging
from typing import List, Tuple

from pipeline.db.client import get_client
from pipeline.models import BusinessRaw

logger = logging.getLogger(__name__)


def deduplicate(candidates: List[BusinessRaw]) -> Tuple[List[BusinessRaw], int]:
    """
    Returns (new_businesses, duplicate_count).
    Queries Supabase for existing records and returns only truly new ones.
    """
    if not candidates:
        return [], 0

    client = get_client()

    # Fetch existing place IDs
    existing_place_ids: set[str] = set()
    result = client.table("businesses").select("google_place_id").not_.is_("google_place_id", "null").execute()
    for row in result.data:
        if row.get("google_place_id"):
            existing_place_ids.add(row["google_place_id"])

    # Fetch existing name+phone combos (for self-scrape dedup)
    existing_name_phones: set[tuple[str, str]] = set()
    result2 = client.table("businesses").select("name, phone").not_.is_("phone", "null").execute()
    for row in result2.data:
        if row.get("name") and row.get("phone"):
            key = (_normalize_name(row["name"]), _normalize_phone(row["phone"]))
            existing_name_phones.add(key)

    new: List[BusinessRaw] = []
    dupes = 0

    for biz in candidates:
        # Check by place ID first (most reliable)
        if biz.google_place_id and biz.google_place_id in existing_place_ids:
            dupes += 1
            continue

        # Check by name + phone (fallback for self_scrape)
        if biz.name and biz.phone:
            key = (_normalize_name(biz.name), _normalize_phone(biz.phone))
            if key in existing_name_phones:
                dupes += 1
                continue

        new.append(biz)

    logger.info(f"[dedup] {len(new)} new, {dupes} already in database")
    return new, dupes


def _normalize_name(name: str) -> str:
    """Lowercase, strip punctuation for fuzzy matching."""
    import re
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _normalize_phone(phone: str) -> str:
    """Strip all non-digits."""
    import re
    return re.sub(r"\D", "", phone)
