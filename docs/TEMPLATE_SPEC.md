# Demo Site Template Specification

## Template System Design

Templates are the core reusable asset. Each template is a folder of static files (HTML, CSS, JS) that uses Jinja2 variable syntax for injection points. One template per niche to start; multiple variants per niche as you scale.

---

## Template Structure

```
templates/
└── housekeeping-v1/
    ├── index.html          ← Main Jinja2 template
    ├── styles.css          ← Compiled/minified CSS
    ├── script.js           ← Minimal JS (mobile nav, form)
    ├── template_spec.json  ← Field definitions and fallbacks
    └── preview/
        └── preview.png     ← Screenshot for admin dashboard
```

---

## template_spec.json

```json
{
  "template_id": "housekeeping-v1",
  "niche": "housekeeping",
  "version": "1.0",
  "fields": {
    "business_name": {
      "required": true,
      "type": "string",
      "source": "businesses.name",
      "fallback": null
    },
    "tagline": {
      "required": false,
      "type": "string",
      "source": "ai_generated",
      "fallback": "Professional Cleaning Services You Can Trust"
    },
    "phone": {
      "required": true,
      "type": "string",
      "source": "businesses.phone",
      "fallback": null
    },
    "city": {
      "required": true,
      "type": "string",
      "source": "businesses.city",
      "fallback": null
    },
    "state": {
      "required": true,
      "type": "string",
      "source": "businesses.state",
      "fallback": null
    },
    "service_area_text": {
      "required": false,
      "type": "string",
      "source": "ai_generated",
      "fallback": "{{ city }} and surrounding areas"
    },
    "rating": {
      "required": false,
      "type": "decimal",
      "source": "businesses.rating",
      "fallback": null
    },
    "review_count": {
      "required": false,
      "type": "integer",
      "source": "businesses.review_count",
      "fallback": null
    },
    "services_list": {
      "required": false,
      "type": "list",
      "source": "ai_generated",
      "fallback": [
        "Standard House Cleaning",
        "Deep Cleaning",
        "Move-In / Move-Out Cleaning",
        "Weekly & Bi-Weekly Service",
        "Post-Construction Cleanup"
      ]
    },
    "about_text": {
      "required": false,
      "type": "text",
      "source": "ai_generated",
      "fallback": "We are a trusted local cleaning service dedicated to making your home shine."
    },
    "trust_statement": {
      "required": false,
      "type": "string",
      "source": "ai_generated",
      "fallback": "Bonded, insured, and background-checked for your peace of mind."
    },
    "cta_primary_text": {
      "required": false,
      "type": "string",
      "source": "static",
      "fallback": "Get a Free Quote"
    },
    "demo_banner_text": {
      "required": true,
      "type": "string",
      "source": "static",
      "fallback": "This is a demo website created for {{ business_name }}. Not the live site."
    }
  }
}
```

---

## Required Sections in Every Template

1. **Demo Banner** — Top bar: "This is a demo site created for [Business Name]. [Link to their current site]"
2. **Hero Section** — Business name, tagline, city, primary CTA (phone + quote button)
3. **Services Section** — Grid of service cards
4. **Trust Bar** — Rating display, years in business, bonded/insured badge
5. **About Section** — About text, optional photo placeholder
6. **Reviews Section** — Placeholder stars + "Real reviews to be shown here" for demo; filled with live reviews post-sale
7. **Service Area Section** — Map placeholder + city list
8. **Contact / Quote Form** — Simple form (name, email, phone, service type, message)
9. **Footer** — Phone, address, copyright

---

## Injection Principles

1. **Never fake reviews** — The reviews section shows generic placeholders in demos. Real reviews come post-sale from a Google Reviews integration.
2. **Always show the demo banner** — Required. Cannot be disabled. This is your legal protection.
3. **AI content is clearly marked internally** — In the injection_data JSONB, fields sourced from Claude are tagged `"source": "ai_generated"` so you know what to update post-sale.
4. **Phone and name are required** — If either is missing, skip demo generation for that business and flag it.
5. **Services are AI-guessed for demo** — Post-sale, client provides their actual service list.

---

## Niche Expansion Pattern

To add a new niche (e.g., lawn care):
1. Duplicate `housekeeping-v1/` to `lawn-care-v1/`
2. Update hero copy, services defaults, colors, stock photography references
3. Update `template_spec.json` with niche-appropriate fields
4. Add a row to the `templates` Supabase table
5. No pipeline code changes needed — template engine is niche-agnostic

The template_spec.json drives the injection logic. The pipeline only needs to know `template_id`.
