"""
Brand color extraction and complementary scheme generation.
Two extraction strategies:
  1. Screenshot-based: scan nav/logo area of desktop screenshot with Pillow (preferred)
  2. CSS/HTML-based: regex scan of inline styles and CSS variables (fallback)
Then computes a full color palette — brand, dark, light, accent variants.
"""
from __future__ import annotations

import colorsys
import io
import re
from collections import Counter


# ─── Screenshot-based extraction ────────────────────────────────────────────

def extract_logo_color_from_screenshot(png_bytes: bytes) -> str | None:
    """
    Extract dominant brand color from the top ~150px (nav/logo area) of a
    desktop screenshot using Pillow color quantization.
    Returns a hex string like '#1a73e8', or None if nothing useful found.
    """
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
        w, h = img.size
        # Crop to nav/logo strip — top 150px, full width
        nav = img.crop((0, 0, w, min(150, h)))
        # Quantize to 16 representative colors
        quantized = nav.quantize(colors=16)
        palette = quantized.getpalette()
        counts = Counter(list(quantized.getdata()))
        # Return most-common color that isn't near-white/black/gray
        for idx, _count in counts.most_common():
            r = palette[idx * 3]
            g = palette[idx * 3 + 1]
            b = palette[idx * 3 + 2]
            hex_color = f"#{r:02x}{g:02x}{b:02x}"
            if _is_interesting(hex_color):
                return hex_color
    except Exception:
        pass
    return None


# ─── Conversion helpers ────────────────────────────────────────────────────

def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = h[0]*2 + h[1]*2 + h[2]*2
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def _hex_to_hsl(hex_color: str) -> tuple[float, float, float]:
    r, g, b = _hex_to_rgb(hex_color)
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return h * 360, s * 100, l * 100


def _hsl_to_hex(h: float, s: float, l: float) -> str:
    r, g, b = colorsys.hls_to_rgb(h / 360, l / 100, s / 100)
    return _rgb_to_hex(int(r * 255), int(g * 255), int(b * 255))


# ─── Color extraction ───────────────────────────────────────────────────────

def _is_interesting(hex_color: str) -> bool:
    """True if the color is not near-white, near-black, or a gray."""
    try:
        h, s, l = _hex_to_hsl(hex_color)
        return 10 <= l <= 88 and s >= 22
    except Exception:
        return False


def extract_brand_color(raw_html: str) -> str | None:
    """
    Scan the raw HTML/CSS for the most frequently used 'interesting' color.
    Prefers colors found near CSS variable names (--primary, --brand, --color, etc.)
    then falls back to frequency count.
    Returns a hex string like '#1a73e8', or None if nothing found.
    """
    # Look for CSS custom property hints first — highest signal
    var_pattern = re.compile(
        r'--(?:primary|brand|main|accent|color|theme|highlight)'
        r'[^:]*:\s*(#[0-9a-fA-F]{3,6})',
        re.IGNORECASE,
    )
    for match in var_pattern.finditer(raw_html):
        candidate = match.group(1)
        if _is_interesting(candidate):
            return candidate.lower() if len(candidate) == 7 else None

    # Fallback: most common interesting hex in the whole file
    all_hex = re.findall(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', raw_html)
    normalized = []
    for c in all_hex:
        if len(c) == 3:
            c = c[0]*2 + c[1]*2 + c[2]*2
        normalized.append(c.lower())

    counts = Counter(c for c in normalized if _is_interesting("#" + c))
    if counts:
        return "#" + counts.most_common(1)[0][0]

    return None


# ─── Scheme generation ──────────────────────────────────────────────────────

def _accent(h: float, s: float) -> str:
    """Split-complementary accent: +150° on the hue wheel, warm-vibrant."""
    h_a = (h + 150) % 360
    return _hsl_to_hex(h_a, min(80, max(60, s)), 50)


def scheme_for_v2(primary_hex: str) -> str:
    """
    CSS variable overrides for V2 (bright/white template).
    Brand color must be readable on white → medium-dark lightness.
    Returns a CSS string (no :root wrapper) ready for <style>:root{...}</style>.
    """
    h, s, l = _hex_to_hsl(primary_hex)
    s = max(55, min(88, s))
    l_brand = max(28, min(50, l))

    brand      = _hsl_to_hex(h, s, l_brand)
    brand_dark = _hsl_to_hex(h, s, max(16, l_brand - 12))
    brand_light  = _hsl_to_hex(h, s * 0.45, min(92, l_brand + 36))
    brand_xlight = _hsl_to_hex(h, s * 0.25, min(96, l_brand + 47))
    accent     = _accent(h, s)

    return (
        f"--brand:{brand};"
        f"--brand-dark:{brand_dark};"
        f"--brand-light:{brand_light};"
        f"--brand-xlight:{brand_xlight};"
        f"--accent:{accent};"
    )


def scheme_for_v3(primary_hex: str) -> str:
    """
    CSS variable overrides for V3 (dark hero template).
    --brand is used on dark backgrounds (hero) → needs to be bright/light.
    --brand-dark is used on white body sections → readable on white.
    """
    h, s, l = _hex_to_hsl(primary_hex)
    s = max(55, min(88, s))

    brand      = _hsl_to_hex(h, s, max(58, min(72, l + 22)))  # bright for dark bg
    brand_dark = _hsl_to_hex(h, s, max(33, min(50, l)))        # readable on white
    r, g, b    = _hex_to_rgb(brand)
    brand_dim  = f"rgba({r},{g},{b},0.15)"
    accent     = _accent(h, s)

    return (
        f"--brand:{brand};"
        f"--brand-dark:{brand_dark};"
        f"--brand-dim:{brand_dim};"
        f"--accent:{accent};"
    )
