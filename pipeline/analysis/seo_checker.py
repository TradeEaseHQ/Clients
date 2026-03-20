"""
Lightweight SEO gap analysis on a client's site HTML.
No external API — pure HTML parsing with regex.
Results stored in website_analyses.raw_scores_json under key 'seo_gaps'.
"""
from __future__ import annotations
import re
from typing import Any


SEO_CHECKS = [
    ("meta_description", "Meta description"),
    ("schema_org",       "Schema.org markup"),
    ("open_graph",       "Open Graph tags"),
    ("viewport_meta",    "Mobile viewport tag"),
    ("h1_exists",        "Page heading (H1)"),
]


def check_seo_gaps(html: str, pagespeed_score: int | None = None) -> dict[str, Any]:
    """
    Analyse raw HTML for common SEO gaps.
    Returns dict with boolean results and a summary list.
    """
    h = html.lower()

    results = {
        "meta_description": (
            bool(re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'][^"\']{10,}', h))
            or bool(re.search(r'<meta[^>]+content=["\'][^"\']{10,}[^>]+name=["\']description["\']', h))
        ),
        "schema_org":       "application/ld+json" in h or 'itemtype' in h,
        "open_graph":       'property="og:' in h or "property='og:" in h,
        "viewport_meta":    'name="viewport"' in h or "name='viewport'" in h,
        "h1_exists":        bool(re.search(r'<h1[\s>]', h)),
    }

    if pagespeed_score is not None:
        results["pagespeed_mobile"] = pagespeed_score

    gaps = [label for key, label in SEO_CHECKS if not results.get(key, False)]
    results["gaps"] = gaps               # list of human-readable missing items
    results["checks_passed"] = len(SEO_CHECKS) - len(gaps)  # out of 5
    return results
