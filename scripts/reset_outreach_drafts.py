"""
Reset unsent outreach drafts for a given city so the outreach step can re-run
with the new two-email sequence format.

Deletes all outreach_drafts with status in (draft, pending_review, approved, follow_up_pending)
for businesses in the given city. Resets those businesses' status to demo_generated.

Usage:
  python scripts/reset_outreach_drafts.py --city Austin --state TX
  python scripts/reset_outreach_drafts.py --city Austin --state TX --dry-run
"""
from __future__ import annotations

import sys
import os
import click

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@click.command()
@click.option("--city", required=True, help="City to reset (e.g. Austin)")
@click.option("--state", required=True, help="State abbreviation (e.g. TX)")
@click.option("--dry-run", is_flag=True, default=False, help="Print what would be deleted without doing it")
def main(city: str, state: str, dry_run: bool):
    from pipeline.db.client import get_client

    client = get_client()

    UNSENT_STATUSES = ["draft", "pending_review", "approved", "follow_up_pending"]

    # 1. Get all businesses in this city
    biz_result = (
        client.table("businesses")
        .select("id, name, status")
        .eq("city", city)
        .eq("state", state)
        .execute()
    )
    businesses = biz_result.data
    if not businesses:
        print(f"No businesses found for {city}, {state}")
        sys.exit(0)

    biz_ids = [b["id"] for b in businesses]
    biz_map = {b["id"]: b for b in businesses}
    print(f"Found {len(businesses)} businesses in {city}, {state}")

    # 2. Find unsent drafts for these businesses
    # Select only columns that exist pre-migration (sequence_number may not exist yet)
    drafts_result = (
        client.table("outreach_drafts")
        .select("id, business_id, status")
        .in_("business_id", biz_ids)
        .in_("status", UNSENT_STATUSES)
        .execute()
    )
    drafts = drafts_result.data
    if not drafts:
        print("No unsent outreach drafts found — nothing to reset.")
        sys.exit(0)

    print(f"Found {len(drafts)} unsent drafts to delete:")
    affected_biz_ids = set()
    for d in drafts:
        biz_name = biz_map.get(d["business_id"], {}).get("name", "?")
        print(f"  [{d['status']}] {biz_name} ({d['id'][:8]}…)")
        affected_biz_ids.add(d["business_id"])

    print(f"\n{len(affected_biz_ids)} businesses will be reset to status=demo_generated")

    if dry_run:
        print("\n[DRY RUN] No changes made.")
        return

    # 3. Check if parent_draft_id column exists (post-migration) to handle FK ordering
    # If column exists, delete children (sequence_number=2) before parents
    try:
        children_result = (
            client.table("outreach_drafts")
            .select("id")
            .in_("id", [d["id"] for d in drafts])
            .not_.is_("parent_draft_id", "null")
            .execute()
        )
        child_ids = [r["id"] for r in children_result.data]
        parent_ids = [d["id"] for d in drafts if d["id"] not in child_ids]

        if child_ids:
            client.table("outreach_drafts").delete().in_("id", child_ids).execute()
            print(f"Deleted {len(child_ids)} follow-up drafts (Email 2)")
        if parent_ids:
            client.table("outreach_drafts").delete().in_("id", parent_ids).execute()
            print(f"Deleted {len(parent_ids)} initial drafts (Email 1)")
    except Exception:
        # Pre-migration: no parent_draft_id column, just delete all at once
        all_ids = [d["id"] for d in drafts]
        client.table("outreach_drafts").delete().in_("id", all_ids).execute()
        print(f"Deleted {len(all_ids)} drafts")

    # 5. Reset business status to demo_generated for affected businesses
    for biz_id in affected_biz_ids:
        client.table("businesses").update({"status": "demo_generated"}).eq("id", biz_id).execute()
    print(f"Reset {len(affected_biz_ids)} businesses → status=demo_generated")

    print("\nDone. Run the outreach step to regenerate:")
    print(f"  python -m pipeline.run_campaign --city \"{city}\" --state {state} --steps outreach")


if __name__ == "__main__":
    main()
