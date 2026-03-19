"""
Email drafter — uses Claude Sonnet with tool_use to draft personalised outreach emails.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import anthropic

from pipeline.config import settings

logger = logging.getLogger(__name__)

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


# Tool schema for structured email output
_DRAFT_EMAIL_TOOL = {
    "name": "draft_email",
    "description": "Output a fully drafted outreach email with subject, HTML body, and plain-text body.",
    "input_schema": {
        "type": "object",
        "properties": {
            "subject": {
                "type": "string",
                "description": "Email subject line — max 8 words, references the business specifically.",
            },
            "body_html": {
                "type": "string",
                "description": "Full HTML email body with inline styles, readable in Gmail.",
            },
            "body_text": {
                "type": "string",
                "description": "Plain-text version of the email body.",
            },
        },
        "required": ["subject", "body_html", "body_text"],
    },
}


def _build_prompt(
    business: dict[str, Any],
    analysis: dict[str, Any],
    demo_url: str,
    comparison_url: str,
) -> str:
    name = business.get("name", "your business")
    city = business.get("city", "your city")
    website_url = business.get("website_url") or "no website"
    extracted = business.get("extracted_content") or {}
    owner_name = extracted.get("owner_name")

    weaknesses: list[str] = analysis.get("top_3_weaknesses") or []
    total_score: int = analysis.get("total_score") or 0
    priority_tier: str = analysis.get("priority_tier") or "high_priority"

    greeting = f"Hi {owner_name}" if owner_name else "Hi there"
    primary_weakness = weaknesses[0] if weaknesses else "some areas that could be improved"

    if priority_tier == "candidate":
        angle = (
            "Their site is decent but missing something specific. "
            "Mention what's working, then point out the one gap. Don't oversell it."
        )
    else:
        angle = (
            "Their site has real problems or doesn't exist. "
            "Don't pile on — just say you built something and let them look."
        )

    weakness_list = "\n".join(f"- {w}" for w in weaknesses) if weaknesses else "- Improvement areas identified"

    return f"""Write a cold email from Ben to the owner of {name}, a cleaning business in {city}.

Ben built them a free demo site. He's not a marketer. He's one person who noticed something about their site and took an hour to fix it.

WHAT BEN NOTICED:
{weakness_list}

LINKS:
- Demo: {demo_url}
- Before/after: {comparison_url}

ANGLE: {angle}

RULES — read these carefully:
- Start with: "{greeting},"
- Subject line: specific to {name}, max 8 words, sounds like a real person wrote it (NOT "I noticed your website" or "Quick question")
- Body: 100–130 words. Short. Punchy. No fluff.
- Mention ONE specific thing you noticed about their site (use the weaknesses list)
- Link to the demo naturally — don't hype it, just say you built it
- End with something low-pressure like "no pitch, just wanted to show you" or "worth a look if you're curious"
- Sign off: "Ben\\ntradeeasehq.com"
- DO NOT use: "I hope this finds you", "I wanted to reach out", "I came across your business", "leverage", "seamlessly", "game-changer", "take your business to the next level", or any phrase that screams marketing email
- Write like a person, not a funnel. Short sentences. Real words.
- HTML version: clean, max 600px, inline styles, demo link as a plain text hyperlink or simple button — nothing flashy
- Plain text version: same content, no HTML tags

Call the draft_email tool.
"""


class EmailDrafter:
    """Draft personalised outreach emails using Claude Sonnet with tool_use."""

    def draft(
        self,
        business: dict[str, Any],
        analysis: dict[str, Any],
        demo_url: str,
        comparison_url: str,
    ) -> dict[str, Any]:
        """
        Draft an outreach email for a business.

        Returns dict: {subject, body_html, body_text}
        """
        prompt = _build_prompt(business, analysis, demo_url, comparison_url)

        try:
            client = _get_client()
            response = client.messages.create(
                model=settings.drafting_model,
                max_tokens=2048,
                tools=[_DRAFT_EMAIL_TOOL],
                tool_choice={"type": "tool", "name": "draft_email"},
                messages=[{"role": "user", "content": prompt}],
            )

            # Extract tool_use block
            for block in response.content:
                if block.type == "tool_use" and block.name == "draft_email":
                    result = block.input
                    logger.info(
                        f"[email_drafter] Drafted email for {business.get('name')} "
                        f"— subject: {result.get('subject', '')[:60]}"
                    )
                    return {
                        "subject": result["subject"],
                        "body_html": result["body_html"],
                        "body_text": result["body_text"],
                    }

            raise ValueError("Claude did not return a draft_email tool call")

        except Exception as exc:
            logger.error(f"[email_drafter] Draft failed for {business.get('name')}: {exc}")
            raise
