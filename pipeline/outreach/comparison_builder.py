"""
Comparison builder — generates a before/after HTML page for a business.
Uploads to Supabase Storage and returns the public URL.
"""
from __future__ import annotations

import logging
from typing import Any

from pipeline.config import settings
from pipeline.db.client import upload_comparison_html

logger = logging.getLogger(__name__)


def build_comparison(
    business: dict[str, Any],
    analysis: dict[str, Any],
    demo_url: str,
) -> str:
    """
    Generate a before/after comparison HTML page and upload it to Supabase Storage.

    Returns the public URL of the uploaded page.
    """
    business_id = business["id"]
    business_name = business.get("name", "Your Business")
    city = business.get("city", "")
    state = business.get("state", "")
    location = f"{city}, {state}".strip(", ") if city or state else ""

    app_url = settings.next_public_app_url.rstrip("/")
    # Use proxy URLs — raw Supabase Storage URLs may be private/return 400
    has_screenshot = bool(analysis.get("screenshot_desktop_url"))
    screenshot_proxy_url = f"{app_url}/api/screenshot/{business_id}" if has_screenshot else ""
    demo_view_url = f"{app_url}/demo/{business_id}"

    weaknesses: list[str] = [_strip_scores(w) for w in (analysis.get("top_3_weaknesses") or [])]

    # Weakness bullets for left column
    weakness_html = "\n".join(
        f'<li><span class="x-icon">✕</span>{_esc(w)}</li>'
        for w in weaknesses
    ) if weaknesses else '<li><span class="x-icon">✕</span>Multiple improvement opportunities identified</li>'

    # "What We Added" bullets — tailored to weaknesses
    added_bullets = _what_we_added_bullets(weaknesses)
    added_html = "\n".join(
        f'<li><span class="check-icon">✓</span>{_esc(b)}</li>'
        for b in added_bullets
    )

    # Screenshot section — fallback div hidden by default, shown only on error
    if screenshot_proxy_url:
        screenshot_section = (
            f'<img src="{_esc(screenshot_proxy_url)}" alt="Current site screenshot" class="screenshot-img" '
            f'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';" />'
            f'<div class="screenshot-fallback" style="display:none;">Screenshot unavailable</div>'
        )
    else:
        screenshot_section = '<div class="screenshot-fallback">Screenshot not available</div>'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{_esc(business_name)} — Site Comparison</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

    :root {{
      --bg: #080c14;
      --surface: #0f1623;
      --surface-2: #161f30;
      --border: #1e2d45;
      --border-bright: #2a3f5f;
      --text-primary: #f0f4ff;
      --text-secondary: #8a9bbf;
      --text-muted: #4a5878;
      --red: #ff5a5a;
      --red-dim: #3d1a1a;
      --green: #3ddc84;
      --green-dim: #0e2e1c;
      --blue: #4d9fff;
      --blue-dim: #0d1e38;
      --accent: #4d9fff;
    }}

    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      background: var(--bg);
      color: var(--text-primary);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }}

    /* ── TOP BAR ── */
    .topbar {{
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 0 40px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}
    .topbar-brand {{
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      text-transform: uppercase;
    }}
    .topbar-brand span {{
      color: var(--accent);
    }}
    .topbar-tag {{
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }}

    /* ── HERO ── */
    .hero {{
      padding: 60px 40px 48px;
      max-width: 960px;
      margin: 0 auto;
      text-align: center;
    }}
    .hero-eyebrow {{
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 16px;
    }}
    .hero-title {{
      font-size: clamp(26px, 4vw, 38px);
      font-weight: 800;
      color: var(--text-primary);
      line-height: 1.2;
      letter-spacing: -0.02em;
      margin-bottom: 14px;
    }}
    .hero-subtitle {{
      font-size: 16px;
      color: var(--text-secondary);
      line-height: 1.6;
      max-width: 560px;
      margin: 0 auto;
    }}

    /* ── DIVIDER ── */
    .divider {{
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--border-bright), transparent);
      margin: 0 40px;
    }}

    /* ── COMPARISON GRID ── */
    .comparison {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
      background: var(--border);
      margin: 40px 40px 0;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--border);
    }}
    @media (max-width: 720px) {{
      .comparison {{ grid-template-columns: 1fr; margin: 24px 16px 0; }}
      .hero {{ padding: 40px 20px 32px; }}
      .topbar {{ padding: 0 20px; }}
      .divider {{ margin: 0 20px; }}
    }}

    .col {{
      background: var(--surface);
      padding: 32px;
      display: flex;
      flex-direction: column;
    }}
    .col-before {{ background: var(--surface); }}
    .col-after {{ background: var(--surface-2); }}

    .col-label {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }}
    .col-label-dot {{
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }}
    .label-before {{ color: var(--red); }}
    .label-before .col-label-dot {{ background: var(--red); }}
    .label-after {{ color: var(--green); }}
    .label-after .col-label-dot {{ background: var(--green); }}

    .col-heading {{
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 20px;
      line-height: 1.3;
    }}

    /* Screenshot */
    .screenshot-img {{
      width: 100%;
      border-radius: 8px;
      border: 1px solid var(--border-bright);
      display: block;
    }}
    .screenshot-fallback {{
      display: flex;
      width: 100%;
      height: 200px;
      background: var(--bg);
      border-radius: 8px;
      border: 1px solid var(--border);
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 13px;
    }}

    /* Weaknesses */
    .weakness-list {{
      list-style: none;
      padding: 0;
      margin-top: 20px;
    }}
    .weakness-list li {{
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.5;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }}
    .weakness-list li:last-child {{ border-bottom: none; }}
    .x-icon {{
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--red-dim);
      color: var(--red);
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
    }}

    /* Demo column */
    .demo-open-link {{
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 13px;
      font-weight: 700;
      color: #0e0e10;
      background: #e8a020;
      text-decoration: none;
      padding: 8px 16px;
      border-radius: 8px;
      margin-bottom: 14px;
      box-shadow: 0 2px 12px rgba(232,160,32,0.3);
      transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
      flex-shrink: 0;
    }}
    .demo-open-link:hover {{
      opacity: 0.9;
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(232,160,32,0.4);
    }}

    .demo-frame {{
      width: 100%;
      flex: 1;
      min-height: 300px;
      border: none;
      border-radius: 10px;
      border: 1px solid var(--border-bright);
      background: var(--bg);
      display: block;
    }}

    /* ── FEATURES SECTION ── */
    .features-wrap {{
      max-width: none;
      margin: 2px 40px 0;
      background: var(--border);
      border-radius: 0 0 16px 16px;
      overflow: hidden;
    }}
    @media (max-width: 720px) {{
      .features-wrap {{ margin: 2px 16px 0; }}
    }}

    .features {{
      background: var(--surface-2);
      padding: 36px 40px;
    }}
    @media (max-width: 720px) {{
      .features {{ padding: 28px 24px; }}
    }}

    .features-header {{
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }}
    .features-title {{
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
    }}
    .features-line {{
      flex: 1;
      height: 1px;
      background: var(--border);
    }}

    .features-grid {{
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
    }}

    .feature-item {{
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      background: var(--surface);
      border: 1px solid var(--border);
    }}
    .check-icon {{
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--green-dim);
      color: var(--green);
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
    }}
    .feature-item span:last-child {{
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.4;
    }}

    /* Make weakness/feature list items work as flex containers */
    .weakness-list li, .features-grid li {{
      list-style: none;
    }}
    .features-grid li {{
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.4;
      flex: 0 1 260px;
    }}
    .features-grid li .check-icon {{ margin-top: 1px; }}

    /* ── CTA ── */
    .cta {{
      text-align: center;
      padding: 48px 40px;
    }}
    .cta-text {{
      font-size: 15px;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }}
    .cta-subtext {{
      font-size: 13px;
      color: var(--text-muted);
    }}

    /* ── FOOTER ── */
    .footer {{
      border-top: 1px solid var(--border);
      padding: 20px 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-muted);
    }}
    .footer a {{
      color: var(--text-muted);
      text-decoration: none;
    }}
    .footer a:hover {{ color: var(--text-secondary); }}
  </style>
</head>
<body>

  <div class="topbar">
    <div class="topbar-brand">Trade<span>Ease</span></div>
    <div class="topbar-tag">Confidential Preview</div>
  </div>

  <div class="hero">
    <div class="hero-eyebrow">Website Comparison Report</div>
    <h1 class="hero-title">{_esc(business_name)}</h1>
    <p class="hero-subtitle">
      We built a custom demo to show what your online presence could look like.
      {f'Based in {_esc(location)}.' if location else ''}
    </p>
  </div>

  <div class="divider"></div>

  <div class="comparison">
    <!-- LEFT: Current site -->
    <div class="col col-before">
      <div class="col-label label-before">
        <span class="col-label-dot"></span>
        Current Site
      </div>
      <div class="col-heading">Where things stand today</div>
      {screenshot_section}
      {f'<ul class="weakness-list" style="margin-top:20px">{weakness_html}</ul>' if weaknesses else ''}
    </div>

    <!-- RIGHT: Demo -->
    <div class="col col-after">
      <div class="col-label label-after">
        <span class="col-label-dot"></span>
        Your Demo — Ready to Go Live
      </div>
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:20px;">
        <div class="col-heading" style="margin-bottom:0;">Built for you</div>
        <a href="{_esc(demo_view_url)}" target="_blank" rel="noopener noreferrer" class="demo-open-link" style="margin-bottom:0;">
          Open full demo ↗
        </a>
      </div>
      <iframe
        src="{_esc(demo_url)}"
        class="demo-frame"
        title="Demo site for {_esc(business_name)}"
        loading="lazy"
      ></iframe>
    </div>
  </div>

  <div class="features-wrap">
    <div class="features">
      <div class="features-header">
        <div class="features-title">What we added</div>
        <div class="features-line"></div>
      </div>
      <ul class="features-grid">
        {added_html}
      </ul>
    </div>
  </div>

  <div class="cta">
    <p class="cta-text">Questions? Just reply to the email.</p>
    <p class="cta-subtext">No commitment required — happy to walk you through it.</p>
  </div>

  <div class="footer">
    <span>Prepared by</span>
    <a href="https://tradeeasehq.com" target="_blank" rel="noopener noreferrer">Trade Ease</a>
    <span>&middot; tradeeasehq.com</span>
  </div>

</body>
</html>"""

    public_url = upload_comparison_html(business_id, html)
    logger.info(f"[comparison_builder] Uploaded comparison for {business_name}: {public_url}")
    return public_url


def _what_we_added_bullets(weaknesses: list[str]) -> list[str]:
    """
    Generate 5 'What We Added' bullet points based on observed weaknesses.
    Falls back to sensible defaults if fewer than 5 weaknesses.
    """
    defaults = [
        "One-click booking button — customers can schedule instantly",
        "Mobile-friendly design — looks great on any device",
        "Trust signals — reviews, credentials, and social proof front and centre",
        "Clear calls-to-action on every page — no guessing what to do next",
        "AI chat widget mockup — answers questions 24/7",
        "Service area map — shows exactly where you operate",
        "SEO-ready structure — built to show up in local searches",
    ]

    # Try to map weaknesses to relevant bullets
    selected: list[str] = []
    weakness_text = " ".join(weaknesses).lower()

    mapping = [
        (["booking", "quote", "schedule", "appointment", "form"], "One-click booking button — customers can request a quote in seconds"),
        (["mobile", "responsive", "phone"], "Mobile-friendly design — optimised for every screen size"),
        (["trust", "review", "testimonial", "credential", "license"], "Trust signals front and centre — reviews, licences, and years of experience"),
        (["cta", "call to action", "contact", "button", "clear"], "Clear calls-to-action — visitors know exactly what to do next"),
        (["chat", "ai", "automated", "response"], "AI chat mockup — shows how questions get answered automatically"),
        (["seo", "google", "search", "find"], "SEO-ready structure — built to rank in local Google searches"),
    ]

    for keywords, bullet in mapping:
        if any(kw in weakness_text for kw in keywords):
            selected.append(bullet)
        if len(selected) >= 5:
            break

    # Fill remaining slots from defaults
    for default in defaults:
        if len(selected) >= 5:
            break
        if default not in selected:
            selected.append(default)

    return selected[:5]


def _strip_scores(text: str) -> str:
    """Remove numeric score references (e.g. '23/100', '(45)', 'score: 12') from weakness text."""
    import re
    # Remove patterns like "45/100", "score of 23", "(23)", "scoring 45"
    text = re.sub(r'\b\d{1,3}/100\b', '', text)
    text = re.sub(r'\bscor(?:e|ing|ed)\s+(?:of\s+)?\d+\b', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\(\d+\)', '', text)
    text = re.sub(r'\bscore[:\s]+\d+\b', '', text, flags=re.IGNORECASE)
    # Clean up leftover punctuation/spaces
    text = re.sub(r'\s{2,}', ' ', text)
    text = re.sub(r'\s([,.])', r'\1', text)
    return text.strip(' ,.')


def _esc(text: str) -> str:
    """Minimal HTML escaping for attribute and text values."""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
