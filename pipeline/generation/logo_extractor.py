"""
Best-effort logo URL extraction from a business website.

Strategy (in priority order):
  1. <link rel="apple-touch-icon"> — high-quality PNG, intended for brand use
  2. <link rel="icon" ...> that's a PNG or SVG (not tiny .ico)
  3. <img> tag whose src/class/id/alt contains "logo"

If nothing reliable is found, returns None.
The caller must treat None gracefully — templates should not reserve space for a logo
that isn't there.
"""
from __future__ import annotations

import logging
import re
from urllib.parse import urljoin, urlparse

import requests

logger = logging.getLogger(__name__)

_TIMEOUT = 6  # seconds — don't slow down demo gen for logo fetch
_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; TradeEase/1.0)"}


def _is_likely_logo_img(src: str, attrs: str) -> bool:
    """Return True if the img attributes suggest it's a logo."""
    combined = (src + " " + attrs).lower()
    return any(kw in combined for kw in ("logo", "brand", "header-img", "site-logo", "nav-logo"))


def extract_logo_url(website_url: str) -> str | None:
    """
    Fetch the website and return the best logo URL found, or None.
    Never raises — all errors are swallowed so demo generation isn't blocked.
    """
    if not website_url:
        return None
    try:
        resp = requests.get(website_url, timeout=_TIMEOUT, headers=_HEADERS, allow_redirects=True)
        if not resp.ok:
            return None
        html = resp.text
        base = f"{urlparse(resp.url).scheme}://{urlparse(resp.url).netloc}"

        # 1. Apple touch icon (highest quality, always brand-appropriate)
        m = re.search(
            r'<link[^>]+rel=["\']apple-touch-icon["\'][^>]+href=["\']([^"\']+)["\']',
            html, re.IGNORECASE
        )
        if not m:
            m = re.search(
                r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']apple-touch-icon["\']',
                html, re.IGNORECASE
            )
        if m:
            return urljoin(base, m.group(1))

        # 2. PNG or SVG favicon (skip .ico — too low-res)
        for match in re.finditer(
            r'<link[^>]+rel=["\'][^"\']*icon[^"\']*["\'][^>]+href=["\']([^"\']+)["\']',
            html, re.IGNORECASE
        ):
            href = match.group(1).lower()
            if href.endswith(".png") or href.endswith(".svg"):
                return urljoin(base, match.group(1))

        # 3. <img> tag with "logo" in src/class/id/alt (header area preferred)
        # Look in first 3000 chars (usually the header) before scanning full page
        for search_html in (html[:3000], html):
            for match in re.finditer(
                r'<img([^>]+)>',
                search_html, re.IGNORECASE
            ):
                attrs = match.group(1)
                src_match = re.search(r'src=["\']([^"\']+)["\']', attrs, re.IGNORECASE)
                if src_match and _is_likely_logo_img(src_match.group(1), attrs):
                    src = src_match.group(1)
                    # Skip tiny data URIs or 1x1 tracking pixels
                    if src.startswith("data:") or "1x1" in src:
                        continue
                    return urljoin(base, src)

        return None

    except Exception as e:
        logger.debug(f"Logo extraction failed for {website_url}: {e}")
        return None
