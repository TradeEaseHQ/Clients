"""
Content extractor — uses Claude Haiku to pull structured data from a business website's HTML.
This is what makes demos feel personal rather than generic.
Haiku is used here (not Sonnet) because extraction is cheaper and doesn't need vision.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Optional

import anthropic

from pipeline.config import settings
from pipeline.models import ExtractedContent

logger = logging.getLogger(__name__)

_client: Optional[anthropic.Anthropic] = None

EXTRACTION_PROMPT = """
You are extracting structured business information from a local service company's website HTML.
Extract ONLY information that is explicitly present in the HTML — do NOT invent or guess.

Return ONLY valid JSON matching this exact schema:
{
  "services_offered": ["<service 1>", "<service 2>", ...],
  "service_areas": ["<city/neighborhood 1>", "<city/neighborhood 2>", ...],
  "years_in_business": <integer or null>,
  "trust_signals": ["<signal 1>", "<signal 2>", ...],
  "unique_selling_points": ["<usp 1>", "<usp 2>", ...],
  "owner_name": "<first name only, or null if not found>",
  "tone": "<friendly|professional|formal|family_run>"
}

FIELD GUIDANCE:
- services_offered: specific service names (e.g. "Deep Cleaning", "Move-Out Cleaning") — max 8
- service_areas: cities, neighborhoods, zip codes mentioned — max 10
- years_in_business: extract from phrases like "serving since 2009", "15 years experience" — calculate if needed
- trust_signals: look for bonded, insured, background checked, satisfaction guarantee, BBB, licensed
- unique_selling_points: what makes them different — eco-friendly, same-day service, family-owned, etc.
- owner_name: first name only if mentioned (e.g. "Maria" from "Hi, I'm Maria")
- tone: overall communication style of the copy

If a field has no evidence in the HTML, use an empty array [] or null.
"""


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


class ContentExtractor:
    def extract(self, business_id: str, html: str) -> ExtractedContent:
        """
        Extract structured content from HTML using Claude Haiku.
        Returns ExtractedContent with all fields — empty lists/nulls where not found.
        """
        if not html or len(html.strip()) < 100:
            logger.warning(f"[extractor] HTML too short for {business_id} — returning empty")
            return ExtractedContent()

        # Strip script/style tags before sending to Claude — waste of tokens
        clean_html = self._strip_noise(html)
        # Use first 20k chars — enough for extraction, keeps cost low
        excerpt = clean_html[:20_000]

        try:
            client = _get_client()
            response = client.messages.create(
                model=settings.extraction_model,
                max_tokens=800,
                messages=[{
                    "role": "user",
                    "content": (
                        f"Extract structured data from this business website HTML:\n\n"
                        f"{excerpt}\n\n"
                        f"{EXTRACTION_PROMPT}"
                    )
                }],
            )

            raw_text = response.content[0].text
            data = self._parse_response(raw_text)

            result = ExtractedContent(
                services_offered=data.get("services_offered", [])[:8],
                service_areas=data.get("service_areas", [])[:10],
                years_in_business=data.get("years_in_business"),
                trust_signals=data.get("trust_signals", []),
                unique_selling_points=data.get("unique_selling_points", []),
                owner_name=data.get("owner_name"),
                tone=data.get("tone", "professional"),
            )

            logger.info(
                f"[extractor] {business_id}: "
                f"{len(result.services_offered)} services, "
                f"{len(result.service_areas)} areas, "
                f"owner={result.owner_name}, "
                f"tone={result.tone}"
            )
            return result

        except Exception as e:
            logger.error(f"[extractor] Failed for {business_id}: {e}")
            return ExtractedContent()

    @staticmethod
    def _strip_noise(html: str) -> str:
        """Remove script, style, and SVG tags to reduce token waste."""
        html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r"<svg[^>]*>.*?</svg>", "", html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r"<!--.*?-->", "", html, flags=re.DOTALL)
        return html

    @staticmethod
    def _parse_response(text: str) -> dict:
        cleaned = re.sub(r"```(?:json)?\s*", "", text).strip()
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError(f"No JSON in extractor response: {text[:200]}")
        return json.loads(match.group(0))
