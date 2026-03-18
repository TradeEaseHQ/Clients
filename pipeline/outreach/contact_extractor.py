"""
Contact extractor — finds email addresses for a business from its website HTML.
"""
from __future__ import annotations

import logging
import re
from typing import Any
from urllib.parse import urljoin, urlparse

import requests

logger = logging.getLogger(__name__)

# Regex patterns for email extraction
_EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)

# Common paths to probe for contact info if main page has no email
_CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us", "/reach-us"]

# Domains to skip (generic/not useful)
_SKIP_DOMAINS = {
    "example.com", "sentry.io", "google.com", "facebook.com",
    "instagram.com", "twitter.com", "yelp.com", "wix.com",
    "squarespace.com", "wordpress.com", "godaddy.com",
}

_REQUEST_TIMEOUT = 6


class ContactExtractor:
    """Extract contact information from a business website."""

    def extract(self, business: dict[str, Any], html: str) -> dict[str, Any]:
        """
        Extract contact info from business website HTML.

        Returns a dict ready to be passed to save_contact():
        {business_id, name, email, phone, role, source, confidence}
        """
        business_id = business["id"]
        website_url = business.get("website_url") or ""
        phone = business.get("phone")

        # Try to get owner_name from extracted_content
        extracted = business.get("extracted_content") or {}
        owner_name = extracted.get("owner_name")

        # 1. Search for emails in the provided HTML
        email, source = self._find_email_in_html(html)

        # 2. If no email found in main HTML, probe contact/about pages
        if not email and website_url:
            email, source = self._probe_secondary_pages(website_url)

        # Build confidence and role
        if email:
            confidence = "high"
            source = source or "website"
        else:
            confidence = "low"
            source = "google_listing"

        role = "owner" if owner_name else "contact"

        return {
            "business_id": business_id,
            "name": owner_name,
            "email": email,
            "phone": phone,
            "role": role,
            "source": source,
            "confidence": confidence,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _find_email_in_html(self, html: str) -> tuple[str | None, str | None]:
        """Search raw HTML for email addresses. Returns (email, source) or (None, None)."""
        if not html:
            return None, None

        # Prefer mailto: links first (most reliable)
        mailto_matches = re.findall(r'mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})', html, re.IGNORECASE)
        for match in mailto_matches:
            if self._is_useful_email(match):
                logger.debug(f"[contact_extractor] Found email via mailto: {match}")
                return match.lower(), "website"

        # Fall back to plain regex scan
        for match in _EMAIL_RE.findall(html):
            if self._is_useful_email(match):
                logger.debug(f"[contact_extractor] Found email via regex: {match}")
                return match.lower(), "website"

        return None, None

    def _probe_secondary_pages(self, base_url: str) -> tuple[str | None, str | None]:
        """
        Visit common contact/about page paths looking for an email address.
        Returns (email, source) or (None, None).
        """
        parsed = urlparse(base_url)
        base = f"{parsed.scheme}://{parsed.netloc}"

        for path in _CONTACT_PATHS:
            url = urljoin(base, path)
            try:
                resp = requests.get(
                    url,
                    timeout=_REQUEST_TIMEOUT,
                    headers={"User-Agent": "Mozilla/5.0 (compatible; LeadScraperBot/1.0)"},
                    allow_redirects=True,
                )
                if resp.ok and resp.text:
                    email, _ = self._find_email_in_html(resp.text)
                    if email:
                        logger.debug(f"[contact_extractor] Found email on {url}: {email}")
                        return email, "website"
            except Exception as exc:
                logger.debug(f"[contact_extractor] Could not fetch {url}: {exc}")

        return None, None

    @staticmethod
    def _is_useful_email(email: str) -> bool:
        """Return True if the email looks like a real business contact."""
        email_lower = email.lower()
        domain = email_lower.split("@")[-1] if "@" in email_lower else ""

        # Skip generic/system addresses
        skip_prefixes = (
            "noreply", "no-reply", "donotreply", "webmaster", "postmaster",
            "admin@", "info@wix", "support@squarespace",
        )
        if any(email_lower.startswith(p) or email_lower == p for p in skip_prefixes):
            return False

        # Skip known irrelevant domains
        if domain in _SKIP_DOMAINS:
            return False

        # Must have a valid-looking domain
        if "." not in domain or len(domain) < 4:
            return False

        return True
