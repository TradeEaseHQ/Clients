"""
Google Places API (New) lead source.
Uses the Text Search endpoint — no billing if under the $300 GCP free credit.
Flip LEAD_SOURCE=self_scrape in .env when credit runs out.
"""
from __future__ import annotations

import logging
import time
from typing import List, Optional

import httpx

from pipeline.config import settings
from pipeline.ingestion.base import LeadSourceAdapter
from pipeline.models import BusinessRaw

logger = logging.getLogger(__name__)

PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText"

FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.nationalPhoneNumber",
    "places.websiteUri",
    "places.formattedAddress",
    "places.rating",
    "places.userRatingCount",
    "places.primaryTypeDisplayName",
    "places.addressComponents",
    "places.regularOpeningHours",
])


class GooglePlacesSource(LeadSourceAdapter):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.google_places_api_key
        if not self.api_key:
            raise ValueError("GOOGLE_PLACES_API_KEY is not set — switch to LEAD_SOURCE=self_scrape")

    def fetch(self, query: str, city: str, state: str, limit: int = 100) -> List[BusinessRaw]:
        search_text = f"{query} in {city}, {state}"
        logger.info(f"[google_places] Searching: '{search_text}' (limit={limit})")

        results: List[BusinessRaw] = []
        next_page_token: Optional[str] = None

        while len(results) < limit:
            batch = min(20, limit - len(results))  # API max is 20 per page
            payload: dict = {
                "textQuery": search_text,
                "maxResultCount": batch,
                "languageCode": "en",
            }
            if next_page_token:
                payload["pageToken"] = next_page_token

            try:
                response = httpx.post(
                    PLACES_API_URL,
                    json=payload,
                    headers={
                        "X-Goog-Api-Key": self.api_key,
                        "X-Goog-FieldMask": FIELD_MASK,
                        "Content-Type": "application/json",
                    },
                    timeout=15,
                )
                response.raise_for_status()
            except httpx.HTTPError as e:
                logger.error(f"[google_places] HTTP error: {e}")
                break

            data = response.json()
            places = data.get("places", [])

            if not places:
                logger.info("[google_places] No more results")
                break

            for place in places:
                business = self._parse_place(place, city, state, query)
                if business:
                    results.append(business)

            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

            # Respect API rate limits between pages
            time.sleep(0.5)

        logger.info(f"[google_places] Fetched {len(results)} businesses")
        return results

    def _parse_place(self, place: dict, city: str, state: str, query: str) -> Optional[BusinessRaw]:
        try:
            name = place.get("displayName", {}).get("text", "").strip()
            if not name:
                return None

            # Extract city/state from addressComponents if available
            parsed_city, parsed_state, parsed_zip = city, state, None
            for component in place.get("addressComponents", []):
                types = component.get("types", [])
                if "locality" in types:
                    parsed_city = component.get("longText", city)
                elif "administrative_area_level_1" in types:
                    parsed_state = component.get("shortText", state)
                elif "postal_code" in types:
                    parsed_zip = component.get("longText")

            # Parse opening hours from Google Places response
            hours_str = None
            opening = place.get("regularOpeningHours") or place.get("currentOpeningHours") or {}
            weekday_descs = opening.get("weekdayDescriptions", [])
            if weekday_descs:
                # Compact the array into a short string: "Mon–Sat 8am–6pm" style
                # Just store the raw array as newline-joined string for now
                hours_str = "\n".join(weekday_descs)

            return BusinessRaw(
                google_place_id=place.get("id"),
                name=name,
                phone=place.get("nationalPhoneNumber"),
                website_url=place.get("websiteUri"),
                address=place.get("formattedAddress"),
                city=parsed_city,
                state=parsed_state,
                zip=parsed_zip,
                rating=place.get("rating"),
                review_count=place.get("userRatingCount", 0),
                category=place.get("primaryTypeDisplayName", {}).get("text"),
                niche=self._query_to_niche(query),
                source="google_places",
                hours=hours_str,
            )
        except Exception as e:
            logger.warning(f"[google_places] Failed to parse place: {e}")
            return None

    @staticmethod
    def _query_to_niche(query: str) -> str:
        query_lower = query.lower()
        if any(w in query_lower for w in ["clean", "maid", "housekeep"]):
            return "housekeeping"
        if any(w in query_lower for w in ["lawn", "landscap", "mow"]):
            return "lawn_care"
        return "housekeeping"
