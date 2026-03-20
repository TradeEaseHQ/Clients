"""
Regenerate comparison pages for existing businesses and re-draft emails with updated links.

Usage:
    python scripts/regenerate_comparisons.py --city "Austin" --state TX
"""
from __future__ import annotations

import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.db.client import get_client
from pipeline.outreach.comparison_builder import build_comparison
from pipeline.outreach.email_drafter import EmailDrafter
from pipeline.config import settings


def regenerate(city: str | None, state: str | None) -> None:
    client = get_client()
    drafter = EmailDrafter()
    app_url = settings.next_public_app_url.rstrip("/")

    # Fetch all outreach drafts with business + analysis + demo data
    result = (
        client.table("outreach_drafts")
        .select("*, businesses(*, website_analyses(*), demo_sites(*))")
        .in_("status", ["draft", "pending_review"])
        .execute()
    )
    rows = result.data

    if city:
        rows = [r for r in rows if r.get("businesses", {}).get("city", "").lower() == city.lower()]
    if state:
        rows = [r for r in rows if r.get("businesses", {}).get("state", "").upper() == state.upper()]

    if not rows:
        print("No matching drafts found.")
        return

    print(f"Found {len(rows)} draft(s) to regenerate.")
    ok = 0

    for row in rows:
        biz = row.get("businesses") or {}
        biz_name = biz.get("name", "Unknown")
        biz_id = biz.get("id") or row.get("business_id")

        analyses = biz.get("website_analyses") or []
        analysis = analyses[0] if analyses else {}

        demo_sites = biz.get("demo_sites") or []
        demo = demo_sites[0] if demo_sites else {}
        raw_demo_url = demo.get("preview_url")

        if not raw_demo_url:
            print(f"  SKIP {biz_name} — no demo URL")
            continue

        demo_email_url = f"{app_url}/api/demo/{biz_id}"
        comparison_email_url = f"{app_url}/api/comparison/{biz_id}"

        print(f"  Processing: {biz_name}")
        try:
            # Regenerate comparison page HTML in Supabase Storage
            build_comparison(biz, analysis, demo_email_url)
            print(f"    ✓ Comparison page rebuilt")

            # Re-draft email with updated links
            draft = drafter.draft(biz, analysis, demo_email_url, comparison_email_url)
            client.table("outreach_drafts").update({
                "subject": draft["subject"],
                "body_html": draft["body_html"],
                "body_text": draft["body_text"],
                "comparison_url": comparison_email_url,
            }).eq("id", row["id"]).execute()
            print(f"    ✓ Email re-drafted: {draft['subject']}")
            ok += 1
        except Exception as e:
            print(f"    ✗ Failed: {e}")

    print(f"\nDone. {ok}/{len(rows)} completed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--city", help="Filter by city")
    parser.add_argument("--state", help="Filter by state")
    args = parser.parse_args()
    regenerate(city=args.city, state=args.state)
