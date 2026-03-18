"""
Curated Unsplash photo library for demo site generation.
All photos are free to use commercially under the Unsplash License.
Photos verified as housekeeping/home-cleaning appropriate via vision audit.
"""
from __future__ import annotations

import random

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

# Professional cleaners / cleaning in action — used in about section
# All verified: show cleaners, cleaning supplies, or cleaning activities
ABOUT_PHOTOS = [
    f"{_BASE}1581578731548-c64695cc6952{_ABOUT}",  # woman cleaning window shutters
    f"{_BASE}1628177142898-93e36e4e3a50{_ABOUT}",  # gloved hand spraying disinfectant
    f"{_BASE}1563453392212-326f5e854473{_ABOUT}",  # hand holding yellow spray bottle
    f"{_BASE}1585421514738-01798e348b17{_ABOUT}",  # blue gloves, professional cleaning
    f"{_BASE}1556909172-54557c7e4fb7{_ABOUT}",     # small clean kitchen scene
]


def get_demo_photos(seed: str | None = None) -> dict:
    """
    Return photo URLs for hero and about sections.
    Pass seed (e.g. business_id) for deterministic, reproducible selection —
    same business always gets same photos, different businesses get different ones.
    """
    rng = random.Random(seed)
    hero = rng.choice(HERO_PHOTOS)
    about = rng.choice(ABOUT_PHOTOS)
    return {
        "hero_photo_url": hero,
        "about_photo_url": about,
    }
