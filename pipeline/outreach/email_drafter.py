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
            "Their site is actually decent (scored 50–74/100) but is missing key conversion features. "
            "Frame this as: 'your site is good but missing X' — compliment what's working, "
            "then show what adding the missing piece could do."
        )
    else:
        # high_priority or no_site
        angle = (
            "Their site needs significant work (scored below 50/100) or doesn't exist. "
            "Frame this as: 'we built something that could help' — don't criticise harshly, "
            "just show the opportunity."
        )

    weakness_list = "\n".join(f"- {w}" for w in weaknesses) if weaknesses else "- Improvement areas identified"

    return f"""You are writing a cold outreach email on behalf of Ben from Trade Ease (tradeeasehq.com).
Trade Ease builds complete online presence packages for local service businesses:
website + AI chat + review automation + booking. Priced at ~$149–199/mo.

BUSINESS DETAILS:
- Business name: {name}
- City: {city}
- Current website: {website_url}
- Website score: {total_score}/100
- Priority tier: {priority_tier}

TOP 3 OBSERVED WEAKNESSES:
{weakness_list}

LINKS TO INCLUDE:
- Demo site (built specifically for them): {demo_url}
- Before/after comparison page: {comparison_url}

EMAIL ANGLE:
{angle}

STRICT REQUIREMENTS:
1. Greeting: "{greeting}," (use owner name if known, otherwise "Hi there,")
2. Subject: Non-generic, references {name} specifically, 8 words MAX
3. Body: 130–160 words ONLY — count carefully
4. Lead with ONE specific weakness from the list above (top_3_weaknesses[0])
5. Show the demo link prominently (make it a clickable link in HTML)
6. Soft CTA: "happy to answer any questions" — NEVER pushy or salesy
7. Sign off as: "Ben\\nTrade Ease\\ntradeeasehq.com"
8. Written person-to-person — NOT an agency blast tone
9. HTML body: proper email HTML with inline styles, looks clean in Gmail
   - Max width 600px, centered, clean sans-serif font
   - Demo link should be a styled button or prominent text link
   - Keep it simple — no heavy design, just clean and readable
10. Plain text: same content, no HTML

Call the draft_email tool with your result.
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
