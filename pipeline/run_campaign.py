"""
Main CLI orchestrator.
Usage:
  python run_campaign.py --city "Austin" --state TX --niche housekeeping --limit 50
  python run_campaign.py --city "Denver" --state CO --source self_scrape --limit 100

Each step is gated — run ingestion only, or the full pipeline, via --steps flag.
"""
from __future__ import annotations

import logging
import os
import sys
from typing import Optional

import click

# Configure logging before any imports that trigger logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


@click.command()
@click.option("--city", required=True, help="Target city (e.g. Austin)")
@click.option("--state", required=True, help="State abbreviation (e.g. TX)")
@click.option("--niche", default="housekeeping", show_default=True, help="Business niche")
@click.option("--limit", default=50, show_default=True, help="Max businesses to fetch")
@click.option(
    "--source",
    default=None,
    type=click.Choice(["google_places", "self_scrape"]),
    help="Lead source override (defaults to LEAD_SOURCE env var)",
)
@click.option(
    "--steps",
    default="ingest",
    show_default=True,
    help="Pipeline steps to run: ingest | ingest,analyze | ingest,analyze,demo | all",
)
@click.option("--campaign-name", default=None, help="Campaign name (auto-generated if omitted)")
def cli(
    city: str,
    state: str,
    niche: str,
    limit: int,
    source: Optional[str],
    steps: str,
    campaign_name: Optional[str],
):
    """Run the LeadScraper pipeline for a given city and niche."""
    from pipeline.config import settings
    from pipeline.db.client import create_campaign, update_campaign, upsert_business, link_business_to_campaign
    from pipeline.ingestion.deduplication import deduplicate

    # Resolve lead source
    resolved_source = source or settings.lead_source
    steps_list = [s.strip() for s in steps.split(",")]
    if steps == "all":
        steps_list = ["ingest", "analyze", "demo", "outreach"]

    # Create campaign record
    name = campaign_name or f"{niche.title()} — {city}, {state}"
    campaign = create_campaign({
        "name": name,
        "niche": niche,
        "city": city,
        "state": state,
        "status": "active",
        "search_query": f"{niche} cleaning services {city} {state}",
    })
    campaign_id = campaign["id"]
    logger.info(f"Campaign created: {name} (id={campaign_id})")

    # ──────────────────────────────────────────
    # STEP 1: Ingest
    # ──────────────────────────────────────────
    if "ingest" in steps_list:
        logger.info(f"[step 1/4] Ingesting leads via {resolved_source}")

        adapter = _get_adapter(resolved_source)
        query = f"{niche} cleaning services"
        raw_leads = adapter.fetch(query=query, city=city, state=state, limit=limit)

        if not raw_leads:
            logger.warning("No leads returned — check your API key or query")
            sys.exit(1)

        new_leads, dupes = deduplicate(raw_leads)
        logger.info(f"Dedup: {len(new_leads)} new, {dupes} already known")

        saved = 0
        for biz in new_leads:
            try:
                row = upsert_business(biz.to_db_dict())
                link_business_to_campaign(campaign_id, row["id"])
                saved += 1
            except Exception as e:
                logger.error(f"Failed to save {biz.name}: {e}")

        update_campaign(campaign_id, {"leads_count": saved})
        logger.info(f"[step 1/4] Done. Saved {saved} new businesses to Supabase.")

        if "analyze" not in steps_list:
            _print_summary(city, state, niche, saved, dupes)
            return

    # ──────────────────────────────────────────
    # STEP 2: Analyze (website screenshots + scoring + content extraction)
    # ──────────────────────────────────────────
    if "analyze" in steps_list:
        logger.info("[step 2/4] Analyzing websites — running Playwright + Claude scoring")
        from pipeline.analysis.playwright_runner import WebsiteAnalyzer
        from pipeline.analysis.pagespeed import get_mobile_score
        from pipeline.analysis.scorer import WebsiteScorer
        from pipeline.analysis.content_extractor import ContentExtractor
        from pipeline.analysis.seo_checker import check_seo_gaps
        from pipeline.db.client import get_businesses_for_analysis, update_business_status, save_website_analysis, update_analysis_raw_scores, update_business_extracted_content

        businesses = get_businesses_for_analysis()
        logger.info(f"Found {len(businesses)} businesses to analyze")

        analyzer = WebsiteAnalyzer()
        scorer = WebsiteScorer()
        extractor = ContentExtractor()

        for biz in businesses:
            biz_id = biz["id"]
            url = biz["website_url"]
            logger.info(f"Analyzing: {biz['name']} ({url})")

            try:
                update_business_status(biz_id, "analyzing")
                capture = analyzer.analyze(biz_id, url)

                psi_score = None
                if url:
                    try:
                        psi_score = get_mobile_score(url)
                    except Exception:
                        logger.warning(f"PageSpeed failed for {url} — score will be None")

                result = scorer.score(capture, psi_score)
                analysis_record = save_website_analysis({
                    "business_id": biz_id,
                    "analyzed_url": url,
                    "screenshot_desktop_url": capture.screenshot_desktop_url,
                    "screenshot_mobile_url": capture.screenshot_mobile_url,
                    "pagespeed_score": psi_score,
                    "visual_score": result.visual_score,
                    "mobile_score": result.mobile_score,
                    "trust_score": result.trust_score,
                    "cta_score": result.cta_score,
                    "service_clarity_score": result.service_clarity_score,
                    "contact_friction_score": result.contact_friction_score,
                    "speed_score": result.speed_score,
                    "review_usage_score": result.review_usage_score,
                    "quote_flow_score": result.quote_flow_score,
                    "professionalism_score": result.professionalism_score,
                    "total_score": result.total_score,
                    "priority_tier": result.priority_tier,
                    "ai_analysis_notes": result.ai_analysis_notes,
                    "top_3_weaknesses": result.top_3_weaknesses,
                })

                # SEO gap analysis — runs on raw HTML, no external API
                seo_data = check_seo_gaps(capture.page_html or "", psi_score)
                raw_scores = (analysis_record.get("raw_scores_json") or {}).copy()
                raw_scores["seo_gaps"] = seo_data
                update_analysis_raw_scores(analysis_record["id"], raw_scores)
                logger.info(f"SEO gaps for {biz['name']}: checks_passed={seo_data['checks_passed']}/5, missing={seo_data['gaps']}")

                # Content extraction (only if HTML was captured)
                if capture.page_html:
                    extracted = extractor.extract(biz_id, capture.page_html)
                    # Prefer screenshot-based logo color over CSS regex extraction
                    if capture.logo_color:
                        extracted = extracted.model_copy(update={"brand_color": capture.logo_color})
                        logger.info(f"[color] Using screenshot logo color {capture.logo_color} (overrides CSS)")
                    # Merge: preserve any fields already set (e.g. hours from Google Places)
                    # that the content extractor doesn't explicitly populate.
                    existing = biz.get("extracted_content") or {}
                    merged = {**existing, **{k: v for k, v in extracted.model_dump().items() if v is not None}}
                    update_business_extracted_content(biz_id, merged)

                update_business_status(biz_id, "scored")

            except Exception as e:
                logger.error(f"Analysis failed for {biz['name']}: {e}")
                update_business_status(biz_id, "new")  # retry next run

        logger.info("[step 2/4] Analysis complete")

    # ──────────────────────────────────────────
    # STEP 3: Generate demos
    # ──────────────────────────────────────────
    if "demo" in steps_list:
        logger.info("[step 3/4] Generating demo sites")
        from pipeline.generation.content_upgrader import ContentUpgrader
        from pipeline.generation.template_engine import render
        from pipeline.generation.storage_deploy import upload_demo
        from pipeline.db.client import get_businesses_for_demo, save_demo_site, update_business_status, get_active_template, get_analysis_for_business, update_analysis_raw_scores, update_business_extracted_content
        from pipeline.analysis.lead_qualifier import compute_lead_quality

        businesses = get_businesses_for_demo()
        logger.info(f"Found {len(businesses)} businesses eligible for demo generation")

        upgrader = ContentUpgrader()
        template = get_active_template(niche)
        if not template:
            logger.error(f"No active template found for niche={niche}")
            sys.exit(1)

        # Alternate between v2 (bright) and v3 (dark premium) for variety
        TEMPLATE_ROTATION = ["housekeeping-v5"]

        for idx, biz in enumerate(businesses):
            biz_id = biz["id"]
            logger.info(f"Generating demo for: {biz['name']}")
            try:
                # ── Lead quality gate ────────────────────────────────────────
                analysis = get_analysis_for_business(biz_id)
                lq = compute_lead_quality(biz, analysis or {})

                # Persist lead_quality into raw_scores_json on the analysis row
                if analysis:
                    raw = analysis.get("raw_scores_json") or {}
                    raw["lead_quality"] = lq
                    update_analysis_raw_scores(analysis["id"], raw)

                if lq["disqualified"] or lq["score"] < 40:
                    skip_reason = lq["reason"] or f"quality score {lq['score']} < 40"
                    logger.info(f"[qualify] Skipping {biz.get('name', '')}: {skip_reason}")
                    continue

                # Store pitch_tier in extracted_content for use by email drafter
                extracted_content = biz.get("extracted_content") or {}
                extracted_content["pitch_tier"] = lq["pitch_tier"]
                update_business_extracted_content(biz_id, extracted_content)
                biz["extracted_content"] = extracted_content
                # ── End lead quality gate ────────────────────────────────────

                from pipeline.models import ExtractedContent
                from pipeline.generation.color_scheme import scheme_for_v2, scheme_for_v3
                extracted = ExtractedContent(**(biz.get("extracted_content") or {}))
                upgraded = upgrader.upgrade(biz, extracted)

                # Pick template (alternating) and generate matching color scheme
                template_id = TEMPLATE_ROTATION[idx % len(TEMPLATE_ROTATION)]
                brand_color = extracted.brand_color
                if brand_color:
                    brand_css_vars = scheme_for_v2(brand_color) if template_id == "housekeeping-v2" else scheme_for_v3(brand_color)
                    logger.info(f"[color] Using {brand_color} on {template_id}")
                else:
                    brand_css_vars = None

                from pipeline.generation.photos import get_demo_photos
                from pipeline.generation.logo_extractor import extract_logo_url
                photos = get_demo_photos(seed=biz_id)
                logo_url = extract_logo_url(biz.get("website_url", ""))
                if logo_url:
                    logger.info(f"[logo] Found logo for {biz['name']}: {logo_url[:60]}")
                injection_data = _build_injection_data(biz, upgraded, brand_css_vars, photos, logo_url)
                html = render(template_id, injection_data)
                preview_url = upload_demo(biz_id, html)

                save_demo_site({
                    "business_id": biz_id,
                    "template_id": template["id"],
                    "preview_url": preview_url,
                    "generated_html": html,
                    "injection_data": injection_data,
                    "ai_content": upgraded.model_dump(),
                    "status": "ready",
                })
                update_business_status(biz_id, "demo_generated")
                logger.info(f"Demo ready: {preview_url}")
            except Exception as e:
                logger.error(f"Demo generation failed for {biz['name']}: {e}")

        logger.info("[step 3/4] Demo generation complete")

    # ──────────────────────────────────────────
    # STEP 4: Draft outreach emails
    # ──────────────────────────────────────────
    if "outreach" in steps_list:
        logger.info("[step 4/4] Drafting outreach emails")
        from pipeline.outreach.contact_extractor import ContactExtractor
        from pipeline.outreach.email_drafter import EmailDrafter
        from pipeline.outreach.comparison_builder import build_comparison
        from pipeline.db.client import get_businesses_for_outreach, save_contact, save_outreach_draft, update_business_status, get_analysis_for_business

        businesses = get_businesses_for_outreach()
        logger.info(f"Found {len(businesses)} businesses ready for outreach drafting")

        contact_extractor = ContactExtractor()
        drafter = EmailDrafter()

        for biz in businesses:
            biz_id = biz["id"]
            demo = biz.get("demo_sites", [{}])[0] if biz.get("demo_sites") else {}
            analysis = get_analysis_for_business(biz_id)

            if not demo.get("preview_url"):
                logger.warning(f"No demo URL for {biz['name']} — skipping")
                continue

            logger.info(f"Drafting email for: {biz['name']}")
            try:
                html = biz.get("website_analyses", [{}])[0].get("page_html") or ""
                contact_data = contact_extractor.extract(biz, html)
                contact_row = save_contact({
                    "business_id": biz_id,
                    **contact_data,
                })

                # Use proxy URLs so iframes and email links render HTML instead of downloading raw files
                app_url = settings.next_public_app_url.rstrip("/")
                demo_email_url = f"{app_url}/api/demo/{biz_id}"
                comparison_email_url = f"{app_url}/api/comparison/{biz_id}"

                comparison_url = build_comparison(biz, analysis, demo_email_url)

                draft = drafter.draft(biz, analysis, demo_email_url, comparison_email_url)
                save_outreach_draft({
                    "business_id": biz_id,
                    "contact_id": contact_row["id"],
                    "demo_site_id": demo.get("id"),
                    "subject": draft["subject"],
                    "body_html": draft["body_html"],
                    "body_text": draft["body_text"],
                    "comparison_url": comparison_url,
                    "status": "draft",
                })
                update_business_status(biz_id, "outreach_drafted")
            except Exception as e:
                logger.error(f"Outreach drafting failed for {biz['name']}: {e}")

        logger.info("[step 4/4] Outreach drafting complete. Review drafts in the dashboard.")


def _get_adapter(source: str):
    if source == "google_places":
        from pipeline.ingestion.google_places import GooglePlacesSource
        return GooglePlacesSource()
    elif source == "self_scrape":
        from pipeline.ingestion.self_scraper import SelfScrapeSource
        return SelfScrapeSource()
    else:
        raise ValueError(f"Unknown lead source: {source}")


def _build_injection_data(biz: dict, upgraded, brand_css_vars: str | None = None, photos: dict | None = None, logo_url: str | None = None) -> dict:
    from pipeline.models import ExtractedContent
    extracted = ExtractedContent(**(biz.get("extracted_content") or {}))
    photos = photos or {}
    return {
        "business_name": biz["name"],
        "phone": biz.get("phone", ""),
        "city": biz.get("city", ""),
        "state": biz.get("state", ""),
        "address": biz.get("address", ""),
        "rating": biz.get("rating"),
        "review_count": biz.get("review_count", 0),
        "website_url": biz.get("website_url", ""),
        "tagline": upgraded.tagline,
        "about_text": upgraded.about_text,
        "services_enhanced": upgraded.services_enhanced,
        "trust_statement": upgraded.trust_statement,
        "service_area_text": upgraded.service_area_text,
        "faq_items": upgraded.faq_items,
        "owner_name": extracted.owner_name,
        "years_in_business": extracted.years_in_business,
        "service_areas": extracted.service_areas,
        "booking_url": "#contact",
        "business_id": str(biz.get("id", "")),
        "chat_api_url": os.getenv("DASHBOARD_URL", "") + "/api/chat",
        "demo_banner_text": f"Demo site created for {biz['name']} by Trade Ease",
        "brand_css_vars": brand_css_vars,
        "hero_photo_url": photos.get("hero_photo_url"),
        "rooms_photo_url": photos.get("rooms_photo_url"),
        "about_photo_url": photos.get("about_photo_url"),
        "logo_url": logo_url,
        "hours": (extracted.hours if extracted else None) or "",
        "facebook_url": (extracted.facebook_url if extracted else None) or "",
        "instagram_url": (extracted.instagram_url if extracted else None) or "",
    }


def _print_summary(city: str, state: str, niche: str, saved: int, dupes: int):
    print("\n" + "="*50)
    print(f"  Campaign complete: {niche} in {city}, {state}")
    print(f"  New leads saved:   {saved}")
    print(f"  Duplicates skipped: {dupes}")
    print(f"  Next: run with --steps ingest,analyze to score websites")
    print("="*50 + "\n")


if __name__ == "__main__":
    cli()
