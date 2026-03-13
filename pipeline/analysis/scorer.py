"""
Website scorer — uses Claude vision + the rubric prompt to score a captured site.
"""
from __future__ import annotations

import base64
import json
import logging
import re
from typing import Optional

import anthropic

from pipeline.analysis.pagespeed import pagespeed_to_rubric_score
from pipeline.analysis.playwright_runner import AnalysisCapture
from pipeline.analysis.scoring_prompt import SCORING_PROMPT
from pipeline.config import settings
from pipeline.models import ScoringResult

logger = logging.getLogger(__name__)

_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


class WebsiteScorer:
    def score(self, capture: AnalysisCapture, pagespeed_score: int = 0) -> ScoringResult:
        """
        Score a website using Claude claude-sonnet-4-6 vision.
        Uses the desktop screenshot + HTML excerpt for analysis.
        Override speed_score with the PSI-derived value.
        """
        if capture.status == "social_only":
            return self._social_only_result()

        if capture.status in ("failed", "timeout") or not capture.screenshot_desktop_url:
            return self._no_site_result()

        # Build message content
        content = []

        # Add desktop screenshot as image (use in-memory bytes — no re-download needed)
        img_bytes = capture.screenshot_desktop_bytes
        if img_bytes:
            img_b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": img_b64,
                }
            })
        else:
            logger.warning(f"[scorer] No screenshot bytes for {capture.url} — scoring from HTML only")

        # Add HTML excerpt as text
        html_excerpt = ""
        if capture.page_html:
            # Send first 15k chars of HTML for context
            html_excerpt = capture.page_html[:15_000]

        psi_note = f"PageSpeed Insights mobile score: {pagespeed_score}/100." if pagespeed_score else ""

        content.append({
            "type": "text",
            "text": (
                f"Website URL: {capture.url}\n"
                f"{psi_note}\n\n"
                f"HTML excerpt (first 15k chars):\n{html_excerpt}\n\n"
                f"{SCORING_PROMPT}"
            )
        })

        try:
            client = _get_client()
            response = client.messages.create(
                model=settings.scoring_model,
                max_tokens=1024,
                messages=[{"role": "user", "content": content}],
            )

            raw_text = response.content[0].text
            scores = self._parse_response(raw_text)

            # Override speed_score with PSI-derived value if we have PSI data
            if pagespeed_score > 0:
                scores["speed_score"] = pagespeed_to_rubric_score(pagespeed_score)
                # Recalculate total
                scores["total_score"] = sum([
                    scores.get("visual_score", 0),
                    scores.get("mobile_score", 0),
                    scores.get("trust_score", 0),
                    scores.get("cta_score", 0),
                    scores.get("service_clarity_score", 0),
                    scores.get("contact_friction_score", 0),
                    scores["speed_score"],
                    scores.get("review_usage_score", 0),
                    scores.get("quote_flow_score", 0),
                    scores.get("professionalism_score", 0),
                ])
                scores["priority_tier"] = self._score_to_tier(scores["total_score"])

            logger.info(
                f"[scorer] Score: {scores['total_score']}/100 "
                f"({scores['priority_tier']}) — {capture.url}"
            )
            return ScoringResult(**scores)

        except Exception as e:
            logger.error(f"[scorer] Claude scoring failed for {capture.url}: {e}")
            # Return a minimal result so pipeline continues
            return ScoringResult(
                visual_score=0, mobile_score=0, trust_score=0, cta_score=0,
                service_clarity_score=0, contact_friction_score=0, speed_score=0,
                review_usage_score=0, quote_flow_score=0, professionalism_score=0,
                total_score=0, priority_tier="high_priority",
                ai_analysis_notes=f"Scoring failed: {str(e)[:100]}",
                top_3_weaknesses=["Scoring failed — manual review needed"],
            )

    @staticmethod
    def _parse_response(text: str) -> dict:
        """Extract JSON from Claude's response, handling markdown code blocks."""
        # Strip markdown code fences if present
        cleaned = re.sub(r"```(?:json)?\s*", "", text).strip()
        # Find the first { ... } block
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError(f"No JSON found in response: {text[:200]}")
        return json.loads(match.group(0))

    @staticmethod
    def _score_to_tier(total: int) -> str:
        if total >= 75:
            return "skip_remake"
        elif total >= 50:
            return "candidate"
        return "high_priority"

    @staticmethod
    def _no_site_result() -> ScoringResult:
        return ScoringResult(
            visual_score=0, mobile_score=0, trust_score=0, cta_score=0,
            service_clarity_score=0, contact_friction_score=0, speed_score=0,
            review_usage_score=0, quote_flow_score=0, professionalism_score=0,
            total_score=0, priority_tier="no_site",
            ai_analysis_notes="No website found or site could not be loaded.",
            top_3_weaknesses=[
                "No website — missing from Google search entirely",
                "Potential customers cannot find contact info online",
                "Competitors with websites are capturing all search traffic",
            ],
        )

    @staticmethod
    def _social_only_result() -> ScoringResult:
        return ScoringResult(
            visual_score=2, mobile_score=5, trust_score=3, cta_score=2,
            service_clarity_score=2, contact_friction_score=3, speed_score=4,
            review_usage_score=2, quote_flow_score=0, professionalism_score=2,
            total_score=25, priority_tier="high_priority",
            ai_analysis_notes=(
                "Business is using a social media profile (Facebook/Instagram) "
                "as their main web presence instead of a proper website."
            ),
            top_3_weaknesses=[
                "No real website — Facebook/Instagram page is not a substitute",
                "Cannot rank in Google search results without a website",
                "No quote form or booking capability",
            ],
        )
