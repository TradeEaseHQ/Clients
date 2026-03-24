"""
Email drafter — uses Claude Sonnet with tool_use to draft personalised outreach emails.
"""
from __future__ import annotations

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


# Tool schema for Email 1 structured output
_DRAFT_EMAIL1_TOOL = {
    "name": "draft_email1",
    "description": "Output Email 1 of the outreach sequence — no link, specific problems called out, reply ask.",
    "input_schema": {
        "type": "object",
        "properties": {
            "subject": {
                "type": "string",
                "description": "Subject line — max 8 words, specific to the business, written like a real person.",
            },
            "body_text": {
                "type": "string",
                "description": "Plain-text email body. No links. No HTML. 60–80 words max.",
            },
        },
        "required": ["subject", "body_text"],
    },
}


def _build_email1_prompt(
    business: dict[str, Any],
    analysis: dict[str, Any],
) -> str:
    name = business.get("name", "your business")
    city = business.get("city", "your city")
    extracted = business.get("extracted_content") or {}
    owner_name = extracted.get("owner_name")

    weaknesses: list[str] = analysis.get("top_3_weaknesses") or []
    raw = analysis.get("raw_scores_json") or {}
    seo_gaps: dict = raw.get("seo_gaps") or {}
    pagespeed = analysis.get("pagespeed_score")

    # Build a plain-language problem list from analysis data
    problems: list[str] = []

    # Mobile / speed
    if pagespeed is not None and pagespeed < 60:
        problems.append(
            f"slow on mobile ({pagespeed}/100 on Google's speed test) — "
            "most people searching for a cleaner are on their phone and will leave before it loads"
        )
    elif weaknesses and any("mobile" in w.lower() or "phone" in w.lower() for w in weaknesses):
        problems.append(
            "doesn't load well on mobile — most people searching for a cleaner are on their phone"
        )

    # SEO gaps
    if seo_gaps and not seo_gaps.get("schema_org"):
        problems.append(
            "no star rating showing in Google search results — competitors with ratings look more established"
        )
    if seo_gaps and not seo_gaps.get("meta_description"):
        problems.append(
            "missing a description in Google search results — just a blank snippet under the business name"
        )

    # Remaining top weaknesses (plain language, deduplicated)
    for w in weaknesses[:2]:
        plain = w.strip()
        if plain and not any(plain.lower() in p for p in problems):
            problems.append(plain)

    # Cap at 3
    problems = problems[:3]

    if not problems:
        problems = ["some things that are likely costing you leads"]

    problem_list = "\n".join(f"- {p}" for p in problems)
    greeting = f"Hi {owner_name}," if owner_name else "Hi,"

    return f"""Write Email 1 of a two-touch cold outreach sequence from Ben to the owner of {name}, a cleaning business in {city}.

CONTEXT:
Greeting: {greeting}

SPECIFIC PROBLEMS FOUND (use these — translate to plain business language, no tech terms):
{problem_list}

EMAIL STRUCTURE — follow exactly:
1. "{greeting}" — then 1 short sentence saying you came across {name}
2. Name the 2–3 problems above in plain language. Each one gets 1 sentence. Connect each to missed business (lost calls, people leaving before requesting a quote).
3. Final line: "I put together something that shows how each of those could look fixed — want me to send it over?"
4. Sign off: "Ben" — nothing else. No domain. No title. No tagline.

RULES:
- NO links of any kind
- Plain text only — no HTML, no formatting
- 60–80 words total (excluding sign-off)
- Subject: specific to {name}, max 8 words, written like a human (not "Quick question" or "I noticed your website")
- Write like a real person who actually looked at their site. Short sentences.
- Do NOT use: "I hope this finds you", "leverage", "seamlessly", "I wanted to reach out", "game-changer"
- Do NOT say "no pitch" — this IS a pitch
- Business impact only — "cost you real leads" not "slow load time"

Call the draft_email1 tool.
"""


def _build_email2(
    business: dict[str, Any],
    comparison_url: str,
) -> dict[str, Any]:
    """
    Generate Email 2 programmatically — short follow-up delivering the comparison link.
    No Claude API call needed.
    """
    name = business.get("name", "your business")
    extracted = business.get("extracted_content") or {}
    owner_name = extracted.get("owner_name")

    greeting = f"Hey {owner_name}," if owner_name else "Hey,"
    subject = f"The before/after I mentioned — {name}"

    body_text = (
        f"{greeting}\n\n"
        f"Following up on my last email. I put together a quick before/after for {name} "
        f"showing how those issues could look fixed: {comparison_url}\n\n"
        "Worth a look?\n\n"
        "Ben"
    )

    return {
        "subject": subject,
        "body_text": body_text,
        "body_html": None,
    }


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
        Legacy single-email draft method. Kept for backwards compatibility.
        New code should use draft_sequence() instead.
        """
        email1, _ = self.draft_sequence(business, analysis, comparison_url)
        return email1

    def draft_sequence(
        self,
        business: dict[str, Any],
        analysis: dict[str, Any],
        comparison_url: str,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """
        Draft both emails in the two-touch sequence.

        Returns (email1, email2) where each is a dict with keys:
          subject, body_text, body_html (html is None for both — plain text only)
        """
        email1 = self._draft_email1(business, analysis)
        email2 = _build_email2(business, comparison_url)
        return email1, email2

    def _draft_email1(
        self,
        business: dict[str, Any],
        analysis: dict[str, Any],
    ) -> dict[str, Any]:
        prompt = _build_email1_prompt(business, analysis)

        try:
            client = _get_client()
            response = client.messages.create(
                model=settings.drafting_model,
                max_tokens=512,
                tools=[_DRAFT_EMAIL1_TOOL],
                tool_choice={"type": "tool", "name": "draft_email1"},
                messages=[{"role": "user", "content": prompt}],
            )

            for block in response.content:
                if block.type == "tool_use" and block.name == "draft_email1":
                    result = block.input
                    logger.info(
                        f"[email_drafter] Drafted Email 1 for {business.get('name')} "
                        f"— subject: {result.get('subject', '')[:60]}"
                    )
                    return {
                        "subject": result["subject"],
                        "body_text": result["body_text"],
                        "body_html": None,
                    }

            raise ValueError("Claude did not return a draft_email1 tool call")

        except Exception as exc:
            logger.error(f"[email_drafter] Email 1 draft failed for {business.get('name')}: {exc}")
            raise
