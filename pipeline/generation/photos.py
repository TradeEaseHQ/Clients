"""
Curated Unsplash photo library for demo site generation.
All photos are free to use commercially under the Unsplash License.
Photos verified as housekeeping/home-cleaning appropriate via vision audit.
"""
from __future__ import annotations

import random
from urllib.parse import quote_plus

_BASE = "https://images.unsplash.com/photo-"
_HERO = "?w=1400&h=900&fit=crop&q=85&auto=format"
_ABOUT = "?w=800&h=1000&fit=crop&q=85&auto=format"

# Bright, airy interiors — used as hero split-panel image (V2) or dark overlay bg (V3)
# All verified: clean residential interiors appropriate for a housekeeping service
HERO_PHOTOS = [
    f"{_BASE}1484154218962-a197022b5858{_HERO}",  # modern kitchen white cabinets
    f"{_BASE}1502005229762-cf1b2da7c5d6{_HERO}",  # modern staircase, bright interior
    f"{_BASE}1513694203232-719a280e022f{_HERO}",  # modern living room, black sofa
    f"{_BASE}1586023492125-27b2c045efd7{_HERO}",  # minimalist living room, yellow chair
    f"{_BASE}1618221195710-dd6b41faaea6{_HERO}",  # living room, gray sofa and plants
    f"{_BASE}1560448204-e02f11c3d0e2{_HERO}",    # living room, large windows, city view
    f"{_BASE}1600607687939-ce8a6c25118c{_HERO}",  # open-plan living room, contemporary
    f"{_BASE}1600566752355-35792bedcfea{_HERO}",  # modern bathroom, freestanding tub
    f"{_BASE}1484101403633-562f891dc89a{_HERO}",  # light blue sofa, clean living room
    f"{_BASE}1567016432779-094069958ea5{_HERO}",  # bright scandinavian style interior
]

# Portrait-oriented photos for about section — clean interiors + cleaning action
# All verified quality. Removed 1585421514738 (weak blue gloves shot).
ABOUT_PHOTOS = [
    f"{_BASE}1581578731548-c64695cc6952{_ABOUT}",  # woman cleaning window shutters
    f"{_BASE}1628177142898-93e36e4e3a50{_ABOUT}",  # gloved hand spraying disinfectant
    f"{_BASE}1556909172-54557c7e4fb7{_ABOUT}",     # clean kitchen scene (user verified ✓)
    f"{_BASE}1560448204-e02f11c3d0e2{_ABOUT}",     # living room large windows (user verified ✓)
    f"{_BASE}1600566752355-35792bedcfea{_ABOUT}",  # modern bathroom freestanding tub (user verified ✓)
    f"{_BASE}1484154218962-a197022b5858{_ABOUT}",  # modern kitchen white cabinets (user verified ✓)
    f"{_BASE}1600607687939-ce8a6c25118c{_ABOUT}",  # open-plan contemporary living room
    f"{_BASE}1567016432779-094069958ea5{_ABOUT}",  # bright scandinavian interior
]

NICHE_HERO_QUERIES = {
    "housekeeping": "clean modern home interior bright",
    "landscaping": "beautiful garden lawn professional",
    "plumbing": "modern bathroom renovation clean",
}

NICHE_ABOUT_QUERIES = {
    "housekeeping": "professional cleaning service team",
    "landscaping": "landscaper garden professional team",
    "plumbing": "professional plumber at work",
}


def get_unsplash_photo(query: str, width: int, height: int, seed: str) -> str:
    """
    Return an Unsplash Source URL for a featured photo matching the query.
    No API key required. Seed ensures deterministic selection per business.
    """
    encoded_query = quote_plus(query)
    return f"https://source.unsplash.com/featured/{width}x{height}?{encoded_query}&sig={seed}"


def get_demo_photos(seed: str | None = None, niche: str = "housekeeping",
                    provided_hero: str | None = None, provided_about: str | None = None) -> dict:
    """
    Return photo URLs for hero and about sections.
    Pass seed (e.g. business_id) for deterministic, reproducible selection —
    same business always gets same photos, different businesses get different ones.

    For housekeeping, uses the curated Unsplash library by default.
    For other niches, falls back to Unsplash Source with niche-specific queries.
    provided_hero / provided_about override everything.
    """
    rng = random.Random(seed)

    # Hero photo
    if provided_hero:
        hero = provided_hero
    elif niche == "housekeeping" and HERO_PHOTOS:
        hero = rng.choice(HERO_PHOTOS)
    else:
        query = NICHE_HERO_QUERIES.get(niche, "clean home interior professional service")
        hero = get_unsplash_photo(query, 1400, 900, seed or "")

    # About photo
    if provided_about:
        about = provided_about
    elif niche == "housekeeping" and ABOUT_PHOTOS:
        about = rng.choice(ABOUT_PHOTOS)
    else:
        query = NICHE_ABOUT_QUERIES.get(niche, "professional service team at work")
        about = get_unsplash_photo(query, 800, 1000, (seed or "") + "_about")

    return {"hero_photo_url": hero, "about_photo_url": about}
