"""
Re-draft outreach emails for existing drafts using the current email prompt.
Useful after updating the email_drafter prompt — updates subject/body in-place.

Usage:
    python scripts/redraft_outreach.py --city "Austin" --state TX
    python scripts/redraft_outreach.py --city "Austin" --state TX --status draft,pending_review
    python scripts/redraft_outreach.py --draft-id <uuid>  # re-draft a single draft
"""
from __future__ import annotations

import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.db.client import get_client
from pipeline.outreach.email_drafter import EmailDrafter


def redraft(city: str | None, state: str | None, statuses: list[str], draft_id: str | None) -> None:
    client = get_client()
    drafter = EmailDrafter()

    if draft_id:
        # Single draft mode
        result = (
            client.table("outreach_drafts")
            .select("*, businesses(*, website_analyses(*), demo_sites(*))")
            .eq("id", draft_id)
            .limit(1)
            .execute()
        )
        drafts = result.data
    else:
        # Bulk mode: filter by city/state via joined businesses table
        query = (
            client.table("outreach_drafts")
            .select("*, businesses(*, website_analyses(*), demo_sites(*))")
            .in_("status", statuses)
        )
        result = query.execute()
        drafts = result.data

        # Filter by city/state in Python (PostgREST can't filter on joined columns easily)
        if city:
            drafts = [d for d in drafts if d.get("businesses", {}).get("city", "").lower() == city.lower()]
        if state:
            drafts = [d for d in drafts if d.get("businesses", {}).get("state", "").upper() == state.upper()]

    if not drafts:
        print("No matching drafts found.")
        return

    print(f"Found {len(drafts)} draft(s) to re-draft.")

    ok = 0
    for row in drafts:
        biz = row.get("businesses") or {}
        biz_name = biz.get("name", "Unknown")

        analyses = biz.get("website_analyses") or []
        analysis = analyses[0] if analyses else {}

        demo_sites = biz.get("demo_sites") or []
        demo = demo_sites[0] if demo_sites else {}
        demo_url = demo.get("preview_url")
        comparison_url = row.get("comparison_url") or ""

        if not demo_url:
            print(f"  SKIP {biz_name} — no demo URL")
            continue

        print(f"  Re-drafting: {biz_name}")
        try:
            draft = drafter.draft(biz, analysis, demo_url, comparison_url)
            client.table("outreach_drafts").update({
                "subject": draft["subject"],
                "body_html": draft["body_html"],
                "body_text": draft["body_text"],
            }).eq("id", row["id"]).execute()
            print(f"    ✓ Subject: {draft['subject']}")
            ok += 1
        except Exception as e:
            print(f"    ✗ Failed: {e}")

    print(f"\nDone. {ok}/{len(drafts)} re-drafted successfully.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Re-draft outreach emails for existing drafts.")
    parser.add_argument("--city", help="Filter by city")
    parser.add_argument("--state", help="Filter by state")
    parser.add_argument(
        "--status",
        default="draft,pending_review",
        help="Comma-separated statuses to include (default: draft,pending_review)",
    )
    parser.add_argument("--draft-id", help="Re-draft a single specific draft by ID")
    args = parser.parse_args()

    statuses = [s.strip() for s in args.status.split(",")]
    redraft(
        city=args.city,
        state=args.state,
        statuses=statuses,
        draft_id=args.draft_id,
    )
