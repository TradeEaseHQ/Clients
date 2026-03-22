"""
Content upgrader — uses Claude Sonnet to generate personalized copy for demo sites.
Uses REAL extracted content (not generic) so every demo feels custom-built.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Optional

import anthropic

from pipeline.config import settings
from pipeline.models import ExtractedContent, UpgradedContent

logger = logging.getLogger(__name__)

_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


class ContentUpgrader:
    def upgrade(self, business: dict, extracted: ExtractedContent) -> UpgradedContent:
        """
        Generate polished demo site copy using the business's real extracted data.
        Falls back to sensible defaults if Claude fails.
        """
        name = business.get("name", "")
        city = business.get("city", "")
        state = business.get("state", "")
        rating = business.get("rating")
        review_count = business.get("review_count", 0)

        prompt = self._build_prompt(name, city, state, rating, review_count, extracted)

        try:
            client = _get_client()
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text
            data = self._parse_response(raw)

            result = UpgradedContent(
                tagline=data.get("tagline", self._fallback_tagline(city)),
                about_text=data.get("about_text", self._fallback_about(name, city)),
                services_enhanced=data.get("services_enhanced", self._fallback_services(extracted)),
                trust_statement=data.get("trust_statement", "Bonded, insured, and background-checked for your peace of mind."),
                service_area_text=data.get("service_area_text", f"Proudly serving {city}, {state} and surrounding areas."),
                faq_items=data.get("faq_items", self._fallback_faq()),
            )
            logger.info(f"[upgrader] Generated copy for {name}: tagline='{result.tagline[:50]}...'")
            return result

        except Exception as e:
            logger.error(f"[upgrader] Claude failed for {name}: {e} — using fallbacks")
            return self._fallback_result(name, city, state, extracted)

    def _build_prompt(
        self, name: str, city: str, state: str,
        rating: Optional[float], review_count: int,
        extracted: ExtractedContent,
    ) -> str:
        services_str = ", ".join(extracted.services_offered) if extracted.services_offered else "general house cleaning"
        areas_str = ", ".join(extracted.service_areas) if extracted.service_areas else city
        usps_str = ", ".join(extracted.unique_selling_points) if extracted.unique_selling_points else "professional service"
        trust_str = ", ".join(extracted.trust_signals) if extracted.trust_signals else "bonded and insured"
        tone_note = {
            "friendly": "warm, conversational, approachable",
            "family_run": "personal, family-owned feel, warm",
            "professional": "professional yet approachable",
            "formal": "professional and trustworthy",
        }.get(extracted.tone, "professional yet approachable")

        rating_line = f"Rating: {rating}/5 stars ({review_count} reviews)" if rating else "No rating data available"
        owner_line = f"Owner name: {extracted.owner_name}" if extracted.owner_name else "Owner name: not known"
        years_line = f"Years in business: {extracted.years_in_business}" if extracted.years_in_business else ""

        return f"""You are writing copy for a demo website for a real local cleaning business.
Use ONLY the information provided — do not invent facts. Match the tone described.

BUSINESS DATA:
- Name: {name}
- City: {city}, {state}
- {rating_line}
- {owner_line}
- {years_line}
- Services they offer: {services_str}
- Service areas mentioned: {areas_str}
- Their unique selling points: {usps_str}
- Trust signals: {trust_str}
- Tone to match: {tone_note}

Generate the following copy and return ONLY valid JSON:
{{
  "tagline": "<10-14 word benefit-focused tagline using their real USPs — no generic fluff>",
  "about_text": "<75-100 words. Traditional warm marketing prose — full flowing sentences, not punchy fragments. DO NOT mention the owner's name or any individual person. Open with 'As your trusted local cleaning service' or a similar warm positioning line. If years_in_business is known, include a sentence like 'With over X years of experience, our dedicated team...'. Mention their specific services and any unique guarantees (e.g. 'an exclusive 7-day satisfaction guarantee'). If review_count >= 1000, include 'backed by thousands of 5-star reviews'; if review_count >= 100, include 'backed by hundreds of 5-star reviews'. Close with 'experience the [Business Name] difference today!' Do NOT mention Trade Ease.>",
  "services_enhanced": [
    {{"name": "<their service name>", "description": "<2-sentence benefit-focused description>"}}
  ],
  "trust_statement": "<1 sentence combining their real trust signals>",
  "service_area_text": "<1-2 natural sentences describing their coverage area from the areas list>",
  "faq_items": [
    {{"question": "<relevant FAQ question>", "answer": "<helpful 1-2 sentence answer>"}},
    {{"question": "...", "answer": "..."}},
    {{"question": "...", "answer": "..."}},
    {{"question": "...", "answer": "..."}},
    {{"question": "...", "answer": "..."}},
    {{"question": "...", "answer": "..."}}
  ]
}}

Rules:
- services_enhanced: include ALL their real services (up to 8), each with a 2-sentence description
- faq_items: exactly 6 items, relevant to their specific business and location
- tagline: specific and benefit-driven (e.g. "Austin's Most Trusted Move-Out Cleaning — Satisfaction Guaranteed")
- about_text: use their real details — do not say "we have X years experience" unless years_in_business is provided
- Never mention competitors, never mention Trade Ease, never make up facts
"""

    @staticmethod
    def _parse_response(text: str) -> dict:
        cleaned = re.sub(r"```(?:json)?\s*", "", text).strip()
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError(f"No JSON in response: {text[:200]}")
        return json.loads(match.group(0))

    @staticmethod
    def _fallback_tagline(city: str) -> str:
        return f"Professional Cleaning Services in {city} — Satisfaction Guaranteed"

    @staticmethod
    def _fallback_about(name: str, city: str) -> str:
        return (
            f"Welcome to {name}. We are a dedicated local cleaning service proudly serving "
            f"{city} and the surrounding area. Our team of background-checked professionals "
            f"is committed to delivering spotless results every time. Whether you need a "
            f"one-time deep clean or regular service, we bring the supplies, the expertise, "
            f"and the care to make your home shine. Your satisfaction is our guarantee."
        )

    @staticmethod
    def _fallback_services(extracted: ExtractedContent) -> list[dict]:
        if extracted.services_offered:
            return [{"name": s, "description": "Professional, reliable service you can count on."} for s in extracted.services_offered[:6]]
        return [
            {"name": "Standard House Cleaning", "description": "Top-to-bottom cleaning of your entire home. Consistent, thorough, every visit."},
            {"name": "Deep Cleaning", "description": "Extra-detail clean for spring cleaning, move-ins, or a full reset. Every corner covered."},
            {"name": "Move-In / Move-Out Cleaning", "description": "Leave your old place spotless or start fresh in your new home."},
            {"name": "Weekly & Bi-Weekly Service", "description": "Regular scheduled cleaning so your home is always ready for guests."},
            {"name": "Post-Construction Cleanup", "description": "We handle the dust and debris after renovations so you can enjoy your new space."},
        ]

    @staticmethod
    def _fallback_faq() -> list[dict]:
        return [
            {"question": "Do you bring your own supplies?", "answer": "Yes — we bring all cleaning supplies and equipment. Just let us know if you have specific preferences."},
            {"question": "Are you bonded and insured?", "answer": "Absolutely. We are fully bonded and insured for your complete peace of mind."},
            {"question": "What if I'm not satisfied?", "answer": "We'll come back and make it right at no charge. Your satisfaction is guaranteed."},
            {"question": "How do I book?", "answer": "Call, text, or fill out the quote form on this page. We'll confirm your booking within a few hours."},
            {"question": "Do I need to be home during the cleaning?", "answer": "Not at all. Many clients provide a key or access code and we handle everything while they're out."},
            {"question": "How is pricing determined?", "answer": "Pricing is based on the size of your home and the type of service. Contact us for a free, no-obligation quote."},
        ]

    def _fallback_result(self, name: str, city: str, state: str, extracted: ExtractedContent) -> UpgradedContent:
        return UpgradedContent(
            tagline=self._fallback_tagline(city),
            about_text=self._fallback_about(name, city),
            services_enhanced=self._fallback_services(extracted),
            trust_statement="Bonded, insured, and background-checked for your peace of mind.",
            service_area_text=f"Proudly serving {city}, {state} and the surrounding communities.",
            faq_items=self._fallback_faq(),
        )
