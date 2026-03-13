"""
Playwright-based Google Maps self-scraper.
Fallback when GCP free credit is exhausted — flip LEAD_SOURCE=self_scrape.
Respects robots.txt spirit: human-like delays, no bulk parallel scraping.
"""
from __future__ import annotations

import asyncio
import logging
import random
import re
import time
from typing import List, Optional
from urllib.parse import quote_plus

from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeout

from pipeline.ingestion.base import LeadSourceAdapter
from pipeline.models import BusinessRaw

logger = logging.getLogger(__name__)

# Non-Playwright user agent to reduce bot detection
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)


class SelfScrapeSource(LeadSourceAdapter):
    def fetch(self, query: str, city: str, state: str, limit: int = 100) -> List[BusinessRaw]:
        search_query = f"{query} {city} {state}"
        url = f"https://www.google.com/maps/search/{quote_plus(search_query)}"
        logger.info(f"[self_scraper] Scraping Google Maps: '{search_query}' (limit={limit})")

        results: List[BusinessRaw] = []

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=USER_AGENT,
                viewport={"width": 1280, "height": 800},
                locale="en-US",
            )
            page = context.new_page()

            try:
                page.goto(url, timeout=30_000, wait_until="domcontentloaded")
                self._human_delay(2, 4)

                # Scroll the results panel to load more listings
                results_panel = page.locator('[role="feed"]').first
                last_count = 0
                stall_count = 0

                while len(results) < limit and stall_count < 3:
                    cards = page.locator('[role="feed"] > div[jsaction]').all()
                    new_count = len(cards)

                    if new_count == last_count:
                        stall_count += 1
                    else:
                        stall_count = 0
                        last_count = new_count

                    # Parse any new cards
                    for card in cards[len(results):]:
                        if len(results) >= limit:
                            break
                        business = self._parse_card(card, city, state, query)
                        if business:
                            results.append(business)

                    # Scroll down to trigger lazy loading
                    results_panel.evaluate("el => el.scrollBy(0, 600)")
                    self._human_delay(1.5, 3)

            except PlaywrightTimeout:
                logger.warning("[self_scraper] Timeout — returning partial results")
            except Exception as e:
                logger.error(f"[self_scraper] Unexpected error: {e}")
            finally:
                browser.close()

        logger.info(f"[self_scraper] Scraped {len(results)} businesses")
        return results

    def _parse_card(self, card, city: str, state: str, query: str) -> Optional[BusinessRaw]:
        try:
            # Click card to load details panel
            card.click()
            self._human_delay(1.5, 2.5)

            page: Page = card.page

            # Business name
            name_el = page.locator('h1.fontHeadlineLarge').first
            name = name_el.inner_text(timeout=3000).strip() if name_el.count() else None
            if not name:
                return None

            # Phone
            phone = self._extract_detail(page, 'tel:')

            # Website
            website = None
            website_el = page.locator('a[data-item-id="authority"]').first
            if website_el.count():
                website = website_el.get_attribute("href")

            # Rating
            rating = None
            rating_el = page.locator('[role="img"][aria-label*="stars"]').first
            if rating_el.count():
                aria = rating_el.get_attribute("aria-label") or ""
                match = re.search(r"([\d.]+)\s+star", aria)
                if match:
                    rating = float(match.group(1))

            # Review count
            review_count = 0
            review_el = page.locator('button[jsaction*="pane.reviewChart.moreReviews"]').first
            if review_el.count():
                text = review_el.inner_text(timeout=2000)
                nums = re.findall(r"[\d,]+", text)
                if nums:
                    review_count = int(nums[0].replace(",", ""))

            # Address (for city/state extraction)
            address = self._extract_detail(page, 'data-item-id="address"')

            return BusinessRaw(
                name=name,
                phone=phone,
                website_url=website,
                address=address,
                city=city,
                state=state,
                rating=rating,
                review_count=review_count,
                niche=self._query_to_niche(query),
                source="self_scrape",
            )
        except Exception as e:
            logger.debug(f"[self_scraper] Card parse error: {e}")
            return None

    @staticmethod
    def _extract_detail(page: Page, selector_hint: str) -> Optional[str]:
        """Extract text from a detail row by href or data attribute."""
        try:
            if selector_hint.startswith("tel:"):
                el = page.locator(f'a[href^="tel:"]').first
                if el.count():
                    href = el.get_attribute("href") or ""
                    return href.replace("tel:", "").strip()
            else:
                el = page.locator(f'[{selector_hint}]').first
                if el.count():
                    return el.inner_text(timeout=2000).strip()
        except Exception:
            pass
        return None

    @staticmethod
    def _human_delay(min_s: float = 1.0, max_s: float = 3.0) -> None:
        time.sleep(random.uniform(min_s, max_s))

    @staticmethod
    def _query_to_niche(query: str) -> str:
        q = query.lower()
        if any(w in q for w in ["clean", "maid", "housekeep"]):
            return "housekeeping"
        return "housekeeping"
