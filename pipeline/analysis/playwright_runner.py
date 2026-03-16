"""
Website analyzer — captures screenshots and HTML for scoring.
Handles common failure modes: SSL errors, redirects to social media,
unreachable sites, timeouts.
"""
from __future__ import annotations

import base64
import logging
import re
from dataclasses import dataclass, field
from typing import Optional

from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeout

from pipeline.db.client import upload_screenshot

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)

SOCIAL_DOMAINS = {"facebook.com", "instagram.com", "yelp.com", "nextdoor.com"}


@dataclass
class AnalysisCapture:
    business_id: str
    url: str
    screenshot_desktop_url: Optional[str] = None
    screenshot_mobile_url: Optional[str] = None
    screenshot_desktop_bytes: Optional[bytes] = None  # kept in memory for vision scoring
    logo_color: Optional[str] = None               # dominant brand color from nav/logo area
    page_html: Optional[str] = None
    emails_found: list[str] = field(default_factory=list)
    phones_found: list[str] = field(default_factory=list)
    contact_page_url: Optional[str] = None
    final_url: Optional[str] = None       # after redirects
    is_social_only: bool = False
    error: Optional[str] = None
    status: str = "ok"                    # ok | failed | social_only | timeout


class WebsiteAnalyzer:
    def analyze(self, business_id: str, url: str) -> AnalysisCapture:
        capture = AnalysisCapture(business_id=business_id, url=url)

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                context = browser.new_context(
                    user_agent=USER_AGENT,
                    ignore_https_errors=True,  # capture sites with SSL issues anyway
                )
                page = context.new_page()

                # Navigate
                try:
                    response = page.goto(url, timeout=20_000, wait_until="networkidle")
                except PlaywrightTimeout:
                    logger.warning(f"[analyzer] Timeout: {url}")
                    capture.status = "timeout"
                    capture.error = "Navigation timeout after 20s"
                    return capture
                except Exception as e:
                    logger.warning(f"[analyzer] Navigation error for {url}: {e}")
                    capture.status = "failed"
                    capture.error = str(e)[:200]
                    return capture

                # Check for social media redirect
                final_url = page.url
                capture.final_url = final_url
                if self._is_social_redirect(final_url):
                    logger.info(f"[analyzer] Social redirect detected: {final_url}")
                    capture.is_social_only = True
                    capture.status = "social_only"
                    return capture

                # Desktop screenshot (1280x800)
                page.set_viewport_size({"width": 1280, "height": 800})
                page.wait_for_timeout(1000)  # let animations settle
                desktop_png = page.screenshot(full_page=False)
                capture.screenshot_desktop_bytes = desktop_png  # keep for vision scoring
                desktop_url = upload_screenshot(business_id, "desktop", desktop_png)
                capture.screenshot_desktop_url = desktop_url

                # Extract dominant brand color from nav/logo strip
                from pipeline.generation.color_scheme import extract_logo_color_from_screenshot
                capture.logo_color = extract_logo_color_from_screenshot(desktop_png)
                if capture.logo_color:
                    logger.info(f"[analyzer] Logo color detected: {capture.logo_color}")
                logger.debug(f"[analyzer] Desktop screenshot uploaded: {desktop_url}")

                # Mobile screenshot (390x844)
                page.set_viewport_size({"width": 390, "height": 844})
                page.wait_for_timeout(800)
                mobile_png = page.screenshot(full_page=False)
                mobile_url = upload_screenshot(business_id, "mobile", mobile_png)
                capture.screenshot_mobile_url = mobile_url

                # Extract HTML (50k char limit — keep head + first 40k of body)
                html = page.evaluate("() => document.documentElement.outerHTML")
                capture.page_html = self._truncate_html(html)

                # Extract contact info from HTML
                capture.emails_found = self._extract_emails(html)
                capture.phones_found = self._extract_phones(html)
                capture.contact_page_url = self._find_contact_link(page, url)

                capture.status = "ok"
                logger.info(
                    f"[analyzer] Done: {url} | "
                    f"emails={len(capture.emails_found)} "
                    f"phones={len(capture.phones_found)}"
                )

            except Exception as e:
                logger.error(f"[analyzer] Unexpected error for {url}: {e}")
                capture.status = "failed"
                capture.error = str(e)[:200]
            finally:
                browser.close()

        return capture

    @staticmethod
    def _is_social_redirect(url: str) -> bool:
        return any(domain in url for domain in SOCIAL_DOMAINS)

    @staticmethod
    def _truncate_html(html: str, limit: int = 50_000) -> str:
        """Keep full <head> and truncate <body> to stay within token budget."""
        if len(html) <= limit:
            return html
        head_end = html.find("</head>")
        if head_end == -1:
            return html[:limit]
        head = html[:head_end + 7]
        body_budget = limit - len(head)
        body_start = html.find("<body", head_end)
        if body_start == -1:
            return head + html[head_end + 7:head_end + 7 + body_budget]
        return head + html[body_start:body_start + body_budget]

    @staticmethod
    def _extract_emails(html: str) -> list[str]:
        pattern = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
        found = re.findall(pattern, html)
        # Filter out common false positives
        filtered = [
            e for e in found
            if not any(skip in e.lower() for skip in [
                "example.com", "sentry.io", "w3.org", "schema.org",
                ".png", ".jpg", ".gif", "noreply", "no-reply"
            ])
        ]
        return list(dict.fromkeys(filtered))[:5]  # deduplicate, max 5

    @staticmethod
    def _extract_phones(html: str) -> list[str]:
        pattern = r"(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
        found = re.findall(pattern, html)
        return list(dict.fromkeys(found))[:3]

    @staticmethod
    def _find_contact_link(page: Page, base_url: str) -> Optional[str]:
        """Find a contact or about page link."""
        contact_patterns = ["/contact", "/about", "/reach", "/get-in-touch", "/hire"]
        try:
            links = page.evaluate("""
                () => Array.from(document.querySelectorAll('a[href]'))
                    .map(a => a.href)
                    .filter(h => h.startsWith('http'))
                    .slice(0, 100)
            """)
            for link in links:
                if any(p in link.lower() for p in contact_patterns):
                    return link
        except Exception:
            pass
        return None
