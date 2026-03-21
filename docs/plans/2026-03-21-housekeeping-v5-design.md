# Housekeeping v5 — Luxury Editorial Design
**Date:** 2026-03-21
**Status:** Approved, ready for implementation planning

---

## Context

v4 has structural problems that a patch pass cannot fix: 75% brand-color overlay washing the hero photo, `border-radius: 12px` on everything making it look like a website builder template, emoji icons throughout, a 1100px max-width that wastes horizontal space, services grid not centered, boring image placement with no edge-bleeding, and scroll animations that barely fire. The goal for v5 is a complete rebuild — a site that a business owner sees and immediately thinks their current site isn't good enough.

**Reference aesthetic:** Passalacqua hotel (passalacqua.it), Four Seasons — editorial typography, full-bleed photography, cinematic motion, no decorative clutter.

---

## Design

### 1. Visual Identity

**Ground:** Pure white (`#ffffff`). One dark section (near-black `#0d0d0d`) for the proof bar and footer. No grey "alt" backgrounds — section separation comes from full-bleed photography, whitespace, and the single dark section.

**Typography:**
- Display headings (H1, H2): **DM Serif Display** — contemporary editorial serif, strong contrast between thick/thin strokes, more modern than Playfair. Loaded from Google Fonts.
- Body: **Inter** — unchanged, clean and fast.
- Eyebrows: `10px`, uppercase, `0.15em` letter-spacing, brand color. Thin and refined.

**Color:**
- Brand color used only on: primary CTA button, eyebrow labels, the 3px top-border accent on service cards, SVG stroke icons where used.
- No brand-tinted card backgrounds anywhere — the `--brand-light` green fill on cards is what makes v4 look cheap.
- Text: `#111` headings, `#555` body copy.

**Border-radius:** Zero on cards, images, form inputs, and buttons. Tags and pills get `2px` max — just enough to not look jagged.

**Icons:** SVG stroke icons (1.5px weight, brand color) used **only where functional** — phone icon next to phone number, chat bubble on chat widget, arrow on CTA buttons, checkmarks in trust rows. No icons on service cards, step numbers, USP columns, FAQ, or review cards. Typography and photography carry those sections instead.

---

### 2. Layout & Breakpoints

**Max-width:** 1440px. Content columns ~1280px. Images and specific sections break out of the container to bleed to viewport edges.

| Element | Mobile (<768px) | Tablet (768–1024px) | Desktop (>1024px) |
|---|---|---|---|
| Container padding | 20px | 40px | 80px |
| Nav | Logo + hamburger | Logo + links (no CTA) | Logo + links + CTA |
| Hero | Copy stacked, photo below full-width | 50/50 split | 55/45 split, photo bleeds to right viewport edge |
| Services | 1 col | 2 col | 3 col, full-width |
| Split sections | Stacked, image full-width | Side by side 50/50 | Image bleeds to viewport edge |
| Reviews | 1 col | 2 col | 3 col |
| Steps | Vertical numbered list | Horizontal 3-col | Horizontal 3-col, wider |
| Form | 1 col | Max 600px centered | 2-col grid, max 800px |

**Tablet:** Full nav links, no hamburger, no CTA button. Split sections go side-by-side. Services 2-col. Tablet gets a proper layout — not a shrunken desktop or an oversized mobile.

---

### 3. Hero

**Desktop structure:** Two-column, no overlay. Left 55%: white background, large DM Serif Display H1, tagline, CTA pair (primary + ghost phone link), trust row (checkmarks). Right 45%: photo fills 100% column height, bleeds to right viewport edge. No border, no padding, photo meets edge.

**Mobile:** Photo below copy, full-width, `50vh` height.

**Photo load animation:** On page load, photo does a slow 8-second Ken Burns zoom — `scale(1.0)` → `scale(1.06)`, CSS `transform` only (GPU-accelerated). Applied via `.hero-photo { animation: kenburns 8s ease-out forwards; }`.

**Parallax (desktop only):** Hero photo scrolls at 0.4× page scroll rate. JS-driven `transform: translateY()`. Disabled on mobile for performance.

**No color overlay** — the photo is fully visible. Brand color is present only through the CTA button and eyebrow text on the left.

---

### 4. Animation System

Four motion types. All respect `prefers-reduced-motion: reduce` — if set, elements simply appear without motion.

**1. Text wipe reveal (page load + scroll-triggered):**
Headings, eyebrows, and body text are wrapped in `overflow: hidden` containers. Text starts at `translateY(100%)`, animates to `translateY(0)` on scroll-enter. Staggered: eyebrow at 0ms, H2 at 150ms, body at 300ms. CSS keyframes + `IntersectionObserver`.

**2. Image mask reveal (scroll-triggered, split sections):**
A brand-color div overlays each split-section image at full width on page load. On scroll-enter, it slides out to the right (`translateX(0)` → `translateX(101%)`), revealing the photo left-to-right like a sliding door. Duration: 700ms, `cubic-bezier(0.77, 0, 0.175, 1)`. This is the signature motion from Passalacqua's section reveals.

**3. Card stagger (scroll-triggered):**
Service cards, review cards, step items. First card: 0ms delay. Each subsequent: +80ms. Each fades from `opacity: 0, translateY(20px)` → `opacity: 1, translateY(0)`. Duration: 500ms, `ease-out`. Subtle — communicates quality, doesn't overwhelm.

**4. Nav scroll transition:**
Nav starts transparent (overlaying the hero). After 80px scroll: white background fades in with hairline `1px` bottom border. CSS transition on `background` and `box-shadow`.

---

### 5. Sections (full list)

1. **Demo banner** — full-width top bar, fixed position above nav. Business name, "Demo site by Trade Ease", link to current site.
2. **Nav** — transparent → white on scroll. Logo + links + CTA (desktop). Hamburger mobile menu.
3. **Hero** — full-viewport, 2-col desktop, Ken Burns photo, no overlay.
4. **Proof bar** — near-black strip. Rating, review count, years in business, bonded & insured. Inline, no cards.
5. **Services** — borderless cards with 3px brand-color top border. Name + description, text-only, no icons. Left-aligned. Full-width grid.
6. **About / split** — photo bleeds to viewport edge (desktop). Mask reveal animation. No image border-radius.
7. **Reviews** — large-format. 20px italic serif quote. Reviewer name always visible and prominent. Summary stat (rating · count) in large display type above grid.
8. **How It Works / Steps** — large decorative step numbers in display serif (80px, weight 300, brand color, 20% opacity). Title and body below. Horizontal on tablet+desktop.
9. **Service Areas** — tag cloud with `2px` radius pills only (functional tags, not decorative pills).
10. **FAQ** — full-width divider accordion. No card borders. `grid-template-rows` CSS transition for smooth open/close.
11. **Quote form** — sharp inputs (1px border, no radius). 2-col desktop. Rectangular submit button, full-width, brand color.
12. **Footer** — near-black. Business name in large display serif, phone, address, Trade Ease credit.
13. **Chat widget** — floating bottom-right. Chat bubble SVG icon on trigger button. Panel opens above.

---

### 6. Photography Strategy

**Priority order (same logic as v4, improved fallbacks):**
1. Google Places business photos — use if quality acceptable (existing `photos.py` logic)
2. Unsplash Source API — keyword searches tuned for premium interior photography:
   - Hero: `"luxury clean home interior natural light"`, `"bright modern kitchen immaculate"`
   - About: `"professional cleaning service natural light"`, `"spotless bright living room"`
3. CSS fallback: if no photo loads, hero left column expands to full-width with just typography. Design intentionally holds up without any photo.

**Image treatment:** No border-radius anywhere. Images use `object-fit: cover`. Split-section images use `aspect-ratio: 3/4` (portrait orientation) which fills height without awkward cropping.

---

### 7. SEO (unchanged from v4)

All v4 SEO infrastructure carries forward intact:
- Schema.org `HouseCleaning` JSON-LD in `<head>`
- `<meta name="description">` populated from tagline + city/state
- `<title>` — `[Business Name] — Professional House Cleaning in [City], [State]`
- Open Graph tags
- Viewport meta tag
- Canonical link

---

### 8. Template Fields (unchanged from v4)

Same `template_spec.json` field list. `template_id` changes to `housekeeping-v5`. The `chat_api_url` and `business_id` fields carry forward — chat widget behavior is identical.

---

## Implementation

New template directory: `templates/housekeeping-v5/`
Files: `index.html`, `styles.css`, `script.js`, `template_spec.json`

`TEMPLATE_ROTATION` in `run_campaign.py` switches from `["housekeeping-v4"]` to `["housekeeping-v5"]` once rendering is verified.

Austin demos regenerated after v5 passes visual QA at 375px, 768px, 1280px.
