"""
Lead quality scorer for outreach targeting.
Determines whether a business is worth building a demo for and what pitch angle to use.

Two layers:
  1. Hard disqualifiers — skip entirely (franchise/no-phone/off-niche)
  2. Quality signals — score 0-100, threshold >= 40 required to build a demo

Pitch tiers returned:
  - "standard"      — site needs improvement, pitch full v4 upgrade
  - "feature_pitch" — site score >= 75, pitch bundle features + two-offer (upgrade OR add-on)
  - None            — disqualified, never contact
"""
from __future__ import annotations

FRANCHISE_SIGNALS = [
    "molly maid", "merry maids", "two maids", "the maids", "maid brigade",
    "jan-pro", "servicemaster", "coverall", "anago", "jani-king", "maidpro",
]

OFF_NICHE_SIGNALS = [
    "commercial janitorial", "industrial cleaning", "janitorial service",
    "industrial janitorial",
]


def compute_lead_quality(business: dict, analysis: dict) -> dict:
    """
    Score a business's value as an outreach target.

    Args:
        business: row from businesses table (name, phone, review_count, website_url, extracted_content, etc.)
        analysis: row from website_analyses table (total_score, pagespeed_score, raw_scores_json, etc.)

    Returns:
        {
            "score": int (0-100),
            "disqualified": bool,
            "reason": str (why disqualified, or "" if not),
            "pitch_tier": "standard" | "feature_pitch" | None
        }
    """
    name = (business.get("name") or "").lower()
    review_count = int(business.get("review_count") or 0)
    phone = (business.get("phone") or "").strip()
    website_url = (business.get("website_url") or "").strip()
    extracted = business.get("extracted_content") or {}
    years = extracted.get("years_in_business") or 0
    category = (business.get("category") or "").lower()

    raw = analysis.get("raw_scores_json") or {}
    seo = raw.get("seo_gaps") or {}
    total_score = int(analysis.get("total_score") or 0)
    pagespeed = analysis.get("pagespeed_score")

    # ── Hard disqualifiers ──────────────────────────────────────────────────
    if not phone:
        return _disqualify("no phone number — cannot follow up")

    if any(sig in name for sig in FRANCHISE_SIGNALS):
        return _disqualify(f"franchise/chain signal in name: '{name}'")

    if any(sig in category for sig in OFF_NICHE_SIGNALS):
        return _disqualify(f"off-niche category: '{category}'")

    # ── Pitch tier ──────────────────────────────────────────────────────────
    pitch_tier = "feature_pitch" if total_score >= 75 else "standard"

    # ── Quality scoring ─────────────────────────────────────────────────────
    score = 50  # baseline

    # Review signals
    if review_count < 3:
        score -= 20        # deprioritize, not disqualify
    elif 10 <= review_count <= 50:
        score += 15
    elif review_count > 50:
        score += 8
    elif review_count >= 3:
        score += 5

    # Web presence
    if website_url:
        score += 10        # already invested in online presence

    # Business maturity
    if 2 <= years <= 10:
        score += 10
    elif years > 10:
        score += 5

    # Technical gaps we can fix
    if pagespeed is not None and pagespeed < 50:
        score += 10
    elif pagespeed is not None and pagespeed < 70:
        score += 5

    if not seo.get("schema_org"):
        score += 5
    if not seo.get("meta_description"):
        score += 5

    score = max(0, min(score, 100))

    return {
        "score": score,
        "disqualified": False,
        "reason": "",
        "pitch_tier": pitch_tier,
    }


def _disqualify(reason: str) -> dict:
    return {"score": 0, "disqualified": True, "reason": reason, "pitch_tier": None}
