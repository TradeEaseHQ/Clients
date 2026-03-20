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

    return f"""Write a cold outreach email from Ben to the owner of {name}, a cleaning business in {city}.

Ben noticed a specific problem with their site and put together a free demo showing how it could be fixed.

WHAT BEN NOTICED (pick the most impactful one):
{weakness_list}

LINKS TO INCLUDE:
- Before/after: {comparison_url}
- Demo: {demo_url}

ANGLE: {angle}

EMAIL STRUCTURE — follow this closely:
1. Open: "Hi [owner name if known, otherwise skip]," then 1 sentence saying you came across {name} and noticed something specific
2. Middle: Name the ONE problem you found (use plain language, not technical terms) and connect it to lost business — missed calls, people leaving before requesting a quote, etc. Most people searching for a cleaner are on their phone. Make that real.
3. Say you put together a quick demo showing how it could look and feel better.
4. List both links on their own lines with descriptive anchor text:
   HTML version: <a href="{comparison_url}">View before/after →</a> and <a href="{demo_url}">View demo →</a> — NEVER show the raw URL
   Plain text version: "Before/after: {comparison_url}" and "Demo: {demo_url}"
5. One line about what you do: help cleaning businesses make their site better at turning visitors into calls and quote requests.
6. End CTA: "Worth sending over a couple quick ideas for your site?" — nothing else after this.
7. Sign off: "Ben\\ntradeeasehq.com"

RULES:
- Subject line: specific to {name}, max 8 words, written like a real person (not "Quick question" or "I noticed your website")
- Body: 110–140 words total. Short sentences. No fluff.
- Business impact language only — not website diagnostics. "Cost you real leads" not "slow load time"
- Do NOT say "no pitch" — it IS a pitch
- Do NOT say "I spent an hour" or imply you built it for free as a favour — frame it as a demo
- Do NOT use: "I hope this finds you", "leverage", "seamlessly", "game-changer", "take your business to the next level", "I wanted to reach out and", or anything that reads like a template
- Write like a real person. Short sentences. Real words.
- HTML version: clean, max 600px, inline styles — no raw URLs visible, no flashy buttons
- Plain text version: same content but with raw URLs written out, no HTML tags

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
