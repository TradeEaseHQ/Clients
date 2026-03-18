"""
Reset businesses for demo regeneration.
Usage:
    python scripts/reset_demos.py --city "Austin" --state TX
    python scripts/reset_demos.py --city "Austin" --state TX --all-statuses

What it does:
  1. Deletes existing demo_sites rows for matching businesses
  2. Sets business status back to 'scored' so the demo step will pick them up

After running this, execute:
    python -m pipeline.run_campaign --city "Austin" --state TX --steps demo
"""
from __future__ import annotations

import argparse
import sys
import os

# Make sure pipeline package is importable when run from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.db.client import get_client


def reset_demos(city: str, state: str, all_statuses: bool = False) -> None:
    client = get_client()

    # Find matching businesses
    query = client.table("businesses").select("id, name, status").eq("city", city)
    if state:
        query = query.eq("state", state)
    result = query.execute()
    businesses = result.data

    if not businesses:
        print(f"No businesses found for {city}, {state}")
        return

    print(f"Found {len(businesses)} businesses in {city}, {state}")

    # Only reset businesses that have been scored or had demos generated
    # (skip 'new' ones that haven't been analyzed yet)
    eligible_statuses = {"scored", "demo_generated", "outreach_drafted"}
    if all_statuses:
        to_reset = businesses
    else:
        to_reset = [b for b in businesses if b["status"] in eligible_statuses]

    if not to_reset:
        print("No eligible businesses to reset.")
        print(f"  (Current statuses: {set(b['status'] for b in businesses)})")
        print("  Run with --all-statuses to reset everything, or run --steps analyze first.")
        return

    ids = [b["id"] for b in to_reset]

    # Step 1: Delete demo_sites for these businesses
    deleted = 0
    for biz_id in ids:
        r = client.table("demo_sites").delete().eq("business_id", biz_id).execute()
        if r.data:
            deleted += len(r.data)

    print(f"  Deleted {deleted} demo site(s)")

    # Step 2: Reset status to 'scored'
    for biz_id in ids:
        client.table("businesses").update({"status": "scored"}).eq("id", biz_id).execute()

    print(f"  Reset {len(ids)} business(es) to status='scored'")
    print()
    print("Ready. Now run:")
    print(f"  python -m pipeline.run_campaign --city \"{city}\" --state {state} --steps demo")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reset demos for a city so they can be regenerated.")
    parser.add_argument("--city", required=True, help="City name (e.g. Austin)")
    parser.add_argument("--state", required=True, help="State abbreviation (e.g. TX)")
    parser.add_argument(
        "--all-statuses",
        action="store_true",
        help="Reset all businesses regardless of status (use if stuck at 'new')",
    )
    args = parser.parse_args()
    reset_demos(city=args.city, state=args.state, all_statuses=args.all_statuses)
