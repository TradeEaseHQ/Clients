"""
Google PageSpeed Insights API — mobile performance score.
Free under quota. Used to populate speed_score in the rubric.
"""
from __future__ import annotations

import logging

import httpx

from pipeline.config import settings

logger = logging.getLogger(__name__)

PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"


def get_mobile_score(url: str) -> int:
    """
    Returns a 0-100 performance score from Google PSI (mobile strategy).
    Maps to rubric speed_score via pagespeed_to_rubric_score().
    Returns 0 on any failure — never raises.
    """
    if not settings.google_psi_api_key:
        logger.warning("[pagespeed] No API key set — skipping")
        return 0

    try:
        response = httpx.get(
            PSI_URL,
            params={
                "url": url,
                "strategy": "mobile",
                "key": settings.google_psi_api_key,
                "category": "performance",
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        score = data["lighthouseResult"]["categories"]["performance"]["score"]
        return int(round(score * 100))
    except httpx.TimeoutException:
        logger.warning(f"[pagespeed] Timeout for {url}")
        return 0
    except Exception as e:
        logger.warning(f"[pagespeed] Failed for {url}: {e}")
        return 0


def pagespeed_to_rubric_score(psi_score: int) -> int:
    """
    Map 0-100 PSI score to 0-5 rubric speed_score.
      90-100 → 5
      70-89  → 4
      50-69  → 3
      30-49  → 2
      10-29  → 1
      0-9    → 0
    """
    if psi_score >= 90:
        return 5
    elif psi_score >= 70:
        return 4
    elif psi_score >= 50:
        return 3
    elif psi_score >= 30:
        return 2
    elif psi_score >= 10:
        return 1
    return 0
