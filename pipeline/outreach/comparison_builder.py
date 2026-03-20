"""
Comparison builder — generates a before/after HTML page for a business.
Uploads to Supabase Storage and returns the public URL.
"""
from __future__ import annotations

import logging
from typing import Any

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

    screenshot_url = analysis.get("screenshot_desktop_url") or ""
    weaknesses: list[str] = analysis.get("top_3_weaknesses") or []

    # Weakness bullets for left column
    weakness_html = "\n".join(
        f'<li style="margin-bottom:8px;padding-left:4px">{_esc(w)}</li>'
        for w in weaknesses
    ) if weaknesses else '<li>Multiple improvement opportunities identified</li>'

    # "What We Added" bullets — tailored to weaknesses
    added_bullets = _what_we_added_bullets(weaknesses)
    added_html = "\n".join(
        f'<li style="margin-bottom:10px">{_esc(b)}</li>'
        for b in added_bullets
    )

    # Screenshot section — onerror fallback if URL fails to load
    if screenshot_url:
        screenshot_section = (
            f'<img src="{_esc(screenshot_url)}" alt="Current site screenshot" '
            f'style="width:100%;border-radius:8px;border:1px solid #334155;display:block;" '
            f'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';" />'
            f'<div style="display:none;width:100%;height:220px;background:#1e293b;border-radius:8px;'
            f'border:1px solid #334155;align-items:center;justify-content:center;color:#64748b;font-size:14px;">'
            f'Screenshot unavailable</div>'
        )
    else:
        screenshot_section = '<div style="width:100%;height:220px;background:#1e293b;border-radius:8px;border:1px solid #334155;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:14px;">Screenshot not available</div>'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{_esc(business_name)} — Current Site vs. Demo</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
    }}
    a {{ color: #60a5fa; }}
    .header {{
      background: #1e293b;
      border-bottom: 1px solid #334155;
      padding: 24px 32px;
      text-align: center;
    }}
    .header h1 {{
      font-size: 22px;
      font-weight: 700;
      color: #f1f5f9;
      line-height: 1.3;
    }}
    .header p {{
      font-size: 14px;
      color: #94a3b8;
      margin-top: 6px;
    }}
    .columns {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      padding: 32px;
      max-width: 1200px;
      margin: 0 auto;
    }}
    @media (max-width: 768px) {{
      .columns {{ grid-template-columns: 1fr; padding: 16px; }}
    }}
    .col-label {{
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }}
    .col-label.current {{ color: #f87171; }}
    .col-label.demo {{ color: #4ade80; }}
    .col-heading {{
      font-size: 18px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 16px;
    }}
    .score-badge {{
      display: inline-block;
      padding: 4px 12px;
      border-radius: 99px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 16px;
    }}
    .built-badge {{
      display: inline-block;
      background: #166534;
      color: #86efac;
      padding: 4px 12px;
      border-radius: 99px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
    }}
    .weakness-list {{
      list-style: none;
      padding: 0;
      margin: 16px 0 0;
    }}
    .weakness-list li::before {{
      content: "✗ ";
      color: #f87171;
      font-weight: 700;
    }}
    .weakness-list li {{
      font-size: 14px;
      color: #cbd5e1;
      line-height: 1.5;
    }}
    .demo-frame {{
      width: 100%;
      height: 500px;
      border: none;
      border-radius: 8px;
      border: 1px solid #334155;
      background: #1e293b;
    }}
    .added-section {{
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 32px 32px;
    }}
    @media (max-width: 768px) {{
      .added-section {{ padding: 0 16px 24px; }}
    }}
    .added-box {{
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 28px 32px;
    }}
    .added-box h2 {{
      font-size: 18px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 16px;
    }}
    .added-list {{
      list-style: none;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 8px 24px;
    }}
    .added-list li::before {{
      content: "✓ ";
      color: #4ade80;
      font-weight: 700;
    }}
    .added-list li {{
      font-size: 14px;
      color: #cbd5e1;
      line-height: 1.5;
    }}
    .cta-section {{
      text-align: center;
      padding: 24px 32px 40px;
    }}
    .cta-section p {{
      font-size: 16px;
      color: #94a3b8;
    }}
    .footer {{
      text-align: center;
      padding: 16px;
      font-size: 11px;
      color: #475569;
      border-top: 1px solid #1e293b;
    }}
    .footer a {{ color: #475569; }}
  </style>
</head>
<body>

  <div class="header">
    <h1>{_esc(business_name)} — Your Current Site vs. What It Could Be</h1>
    {f'<p>{_esc(location)}</p>' if location else ''}
  </div>

  <div class="columns">
    <!-- LEFT: Current site -->
    <div>
      <div class="col-label current">Current Site</div>
      <div class="col-heading">Where things stand today</div>
      {screenshot_section}
      {f'<ul class="weakness-list" style="margin-top:16px">{weakness_html}</ul>' if weaknesses else ''}
    </div>

    <!-- RIGHT: Demo -->
    <div>
      <div class="col-label demo">Your Demo</div>
      <div class="col-heading">Built for you</div>
      <span class="built-badge">Ready to go live</span>
      <div style="margin-bottom:8px;">
        <a href="{_esc(demo_url)}" target="_blank" rel="noopener noreferrer"
           style="font-size:13px;color:#60a5fa;text-decoration:none;">
          Open demo in full screen →
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

  <div class="added-section">
    <div class="added-box">
      <h2>What We Added</h2>
      <ul class="added-list">
        {added_html}
      </ul>
    </div>
  </div>

  <div class="cta-section">
    <p>Interested? Reply to our email — happy to answer any questions.</p>
  </div>

  <div class="footer">
    Demo created by <a href="https://tradeeasehq.com" target="_blank">Trade Ease</a> | tradeeasehq.com
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
        "Fast loading — under 2 seconds on mobile",
        "Trust signals — reviews, credentials, and social proof front and centre",
        "Clear calls-to-action on every page — no guessing what to do next",
        "AI chat widget mockup — answers questions 24/7",
        "Service area map — shows exactly where you operate",
    ]

    # Try to map weaknesses to relevant bullets
    selected: list[str] = []
    weakness_text = " ".join(weaknesses).lower()

    mapping = [
        (["booking", "quote", "schedule", "appointment", "form"], "One-click booking button — customers can request a quote in seconds"),
        (["mobile", "responsive", "phone"], "Mobile-friendly design — optimised for every screen size"),
        (["slow", "speed", "loading", "fast"], "Fast page loading — under 2 seconds on mobile"),
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


def _esc(text: str) -> str:
    """Minimal HTML escaping for attribute and text values."""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
