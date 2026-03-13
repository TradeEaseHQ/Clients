"""
Website scoring rubric prompt — extracted so it can be iterated independently.
Total: 100 points across 10 criteria.
"""

SCORING_PROMPT = """
You are evaluating a local service business website for a potential redesign pitch.
Score the website on each criterion below. Be honest and specific — your scores
directly determine who gets outreach.

Return ONLY valid JSON matching this exact schema:
{
  "visual_score": <0-15>,
  "mobile_score": <0-15>,
  "trust_score": <0-15>,
  "cta_score": <0-15>,
  "service_clarity_score": <0-10>,
  "contact_friction_score": <0-10>,
  "speed_score": <0-5>,
  "review_usage_score": <0-5>,
  "quote_flow_score": <0-5>,
  "professionalism_score": <0-5>,
  "total_score": <sum of all above>,
  "priority_tier": "<skip_remake|candidate|high_priority>",
  "ai_analysis_notes": "<2-3 sentences summarizing key issues>",
  "top_3_weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"]
}

SCORING RUBRIC:

1. Visual Design (0-15)
   15: Modern, professional, on-brand, trustworthy at first glance
   10: Decent design, nothing offensive, but dated or generic
   5: Visually cluttered, dated (pre-2015 feel), or amateurish
   0: Broken layout, no styling, or effectively unusable

2. Mobile Experience (0-15)
   15: Flawless on mobile — text readable, buttons tappable, no horizontal scroll
   10: Mostly works but has minor issues (small text, cramped buttons)
   5: Noticeably broken on mobile — users have to pinch/zoom
   0: Desktop-only layout, completely broken on mobile

3. Trust Signals (0-15)
   15: Shows rating + review count prominently, bonded/insured badge, named owner/team, guarantee
   10: Has 2-3 trust signals (e.g. rating + insurance mention)
   5: Only 1 trust signal or trust signals are buried
   0: No trust signals whatsoever

4. CTA Clarity (0-15)
   15: Phone number visible above fold on both desktop and mobile, booking button present
   10: Phone visible but no booking button, or vice versa
   5: CTA exists but is weak or buried (below fold, small text)
   0: No clear CTA — user has no obvious next step

5. Service Clarity (0-10)
   10: Specific services listed with descriptions, easy to scan
   5: Services mentioned but vague or buried in paragraph text
   0: Unclear what the business actually offers

6. Contact Friction (0-10)
   10: Multiple easy contact options (phone, form, email all visible)
   5: Contact exists but requires hunting (contact page only, no visible phone)
   0: No easy way to contact — email buried, no form, phone hard to find

7. Page Speed (0-5) — Override with PageSpeed Insights score
   5: Fast (PSI score 90+)
   4: Good (70-89)
   3: Average (50-69)
   2: Slow (30-49)
   1: Very slow (10-29)
   0: Extremely slow (0-9)

8. Review Usage (0-5)
   5: Google/Yelp star rating prominently displayed with review count
   3: Mentions reviews but no visible rating number
   0: No review display at all

9. Quote/Booking Flow (0-5)
   5: Online booking or quote form is prominent and functional
   3: Quote form exists but buried or requires navigating away
   0: No quote or booking capability — must call only

10. Overall Professionalism (0-5)
    5: No errors, consistent branding, professional copy throughout
    3: Minor issues — a typo here, inconsistent font there
    0: Multiple errors, placeholder text, broken images, or spammy feel

PRIORITY TIERS:
- skip_remake: total_score 75-100 (strong site, not worth pitching)
- candidate: total_score 50-74 (decent but missing key features)
- high_priority: total_score 0-49 (weak or harmful site)

IMPORTANT: Set speed_score based only on visual/HTML evidence if PageSpeed data is not provided.
For top_3_weaknesses, be SPECIFIC (e.g. "No phone number visible on mobile homepage" not "bad CTA").
These weaknesses will be used verbatim to write the outreach email.
"""
