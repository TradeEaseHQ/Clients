"""
Jinja2 template renderer.
Loads templates from the /templates directory, validates required fields,
and renders to an HTML string.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, StrictUndefined, UndefinedError

logger = logging.getLogger(__name__)

# Templates directory is at the repo root level
TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates"


def render(template_id: str, data: dict[str, Any]) -> str:
    """
    Render a template with the given data dict.
    Raises ValueError if required fields are missing.
    Returns the rendered HTML string.
    """
    template_dir = TEMPLATES_DIR / template_id
    if not template_dir.exists():
        raise FileNotFoundError(f"Template not found: {template_dir}")

    # Load and validate spec
    spec_path = template_dir / "template_spec.json"
    if spec_path.exists():
        spec = json.loads(spec_path.read_text())
        _validate_required_fields(spec, data, template_id)

    # Set up Jinja2 — use Undefined (not StrictUndefined) so missing optional vars render as ""
    env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=True,
        undefined=StrictUndefined,
    )

    # Apply fallbacks from spec before rendering
    if spec_path.exists():
        data = _apply_fallbacks(spec, data)

    try:
        template = env.get_template("index.html")
        html = template.render(**data)
        html = _inline_assets(html, template_dir)
        logger.info(f"[template_engine] Rendered {template_id} ({len(html):,} chars)")
        return html
    except UndefinedError as e:
        raise ValueError(f"Template variable error in {template_id}: {e}")


def _validate_required_fields(spec: dict, data: dict, template_id: str) -> None:
    """Check all required fields are present and non-None."""
    fields = spec.get("fields", {})
    missing = []
    for field_name, field_def in fields.items():
        if field_def.get("required") and (field_name not in data or data[field_name] is None):
            missing.append(field_name)
    if missing:
        raise ValueError(f"Template {template_id} missing required fields: {missing}")


def _inline_assets(html: str, template_dir: Path) -> str:
    """
    Replace <link rel="stylesheet" href="styles.css"> and <script src="script.js">
    with inline <style> and <script> tags so the HTML is fully self-contained.
    This is required because only index.html is uploaded to Supabase Storage.
    """
    import re

    # Inline CSS files
    def replace_css(match: re.Match) -> str:
        href = match.group(1)
        css_path = template_dir / href
        if css_path.exists():
            css = css_path.read_text(encoding="utf-8")
            return f"<style>\n{css}\n</style>"
        return match.group(0)  # leave unchanged if file not found

    html = re.sub(
        r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)["\'][^>]*>',
        replace_css,
        html,
    )
    # Also handle href before rel
    html = re.sub(
        r'<link[^>]+href=["\']([^"\']+\.css)["\'][^>]*>',
        replace_css,
        html,
    )

    # Inline JS files (only local ones, not CDN URLs)
    def replace_js(match: re.Match) -> str:
        src = match.group(1)
        if src.startswith("http"):
            return match.group(0)  # leave CDN scripts alone
        js_path = template_dir / src
        if js_path.exists():
            js = js_path.read_text(encoding="utf-8")
            return f"<script>\n{js}\n</script>"
        return match.group(0)

    html = re.sub(r'<script[^>]+src=["\']([^"\']+)["\'][^>]*></script>', replace_js, html)

    return html


def _apply_fallbacks(spec: dict, data: dict) -> dict:
    """Fill in fallback values for missing optional fields."""
    result = dict(data)
    fields = spec.get("fields", {})
    for field_name, field_def in fields.items():
        if field_name not in result or result[field_name] is None:
            fallback = field_def.get("fallback")
            if fallback is not None:
                result[field_name] = fallback
    return result
