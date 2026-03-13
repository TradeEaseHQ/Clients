"""
Upload rendered demo HTML and assets to Supabase Storage.
"""
from __future__ import annotations

import logging

from pipeline.db.client import upload_demo_html, upload_comparison_html

logger = logging.getLogger(__name__)


def upload_demo(business_id: str, html: str) -> str:
    """
    Upload demo HTML to Supabase Storage (demos bucket).
    Returns the public URL.
    """
    url = upload_demo_html(business_id, html)
    logger.info(f"[storage_deploy] Demo uploaded: {url}")
    return url


def upload_comparison(business_id: str, html: str) -> str:
    """
    Upload comparison page HTML to Supabase Storage (comparisons bucket).
    Returns the public URL.
    """
    url = upload_comparison_html(business_id, html)
    logger.info(f"[storage_deploy] Comparison uploaded: {url}")
    return url
