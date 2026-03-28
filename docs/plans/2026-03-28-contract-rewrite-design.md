# Contract Rewrite Design
**Date:** 2026-03-28
**Status:** Approved, ready for implementation

---

## Goal
Full rewrite of `docs/contract/service-agreement-template.md` — replace the existing 11-section draft with a comprehensive 25-section agreement that covers all major legal and operational gaps before the first client signs.

## Approach
Complete replacement of the existing document. The gap list is too comprehensive to patch cleanly — a fresh rewrite produces a more professionally coherent document.

## Key Decisions
- **Setup fee**: fillable field (non-refundable, due before work begins)
- **Monthly fee**: fillable field
- **Payment terms**: Net 15; 3% monthly late fee (not to exceed max permitted by law); suspension after 30 days unpaid; termination after 60 days unpaid; chargebacks = breach
- **Pre-launch cancellation**: setup fee non-refundable; monthly billing never starts; Client receives deliverables as-available
- **Change requests**: 2 hours/month included; turnaround is a target not a guarantee; overages quoted before work begins
- **Revision rounds**: 2 rounds pre-launch; 1 round = one consolidated feedback list; piecemeal follow-ups don't restart a round; deemed approved after 5 business days of silence; billing starts on launch OR deemed-approval date, whichever first
- **Governing law**: Wyoming; AAA Commercial Arbitration Rules; seated in [county], Wyoming; injunctive relief carveout
- **Liability cap**: fees paid in prior 30 days

---

## Section Structure

### Header (fillable fields)
- Provider: Trade Ease (Ben Witt)
- Client: _____
- Date: _____
- One-Time Setup Fee: $_____
- Monthly Fee: $_____
- Billing Date: The ___ of each month
- Effective Date: _____

### §1 Term and Commencement
- Agreement begins on Effective Date
- Month-to-month after launch
- Billing starts on launch date OR deemed-approval date, whichever comes first
- Client-caused delays extend launch timeline and any promised turnarounds but do not delay billing start once deemed approved

### §2 Services Included
- Custom website (Vercel, custom domain)
- Local SEO optimization (schema, meta, OG tags, mobile viewport, page speed)
- AI virtual assistant widget
- Quote request form
- Mobile-optimized design (mobile, tablet, desktop)
- Included change requests (see §7)

### §3 Services Not Included
**Tech exclusions:**
- Paid advertising
- Social media management
- Review automation / reputation management
- Online booking / scheduling integration
- Full redesigns outside current template
- CRM or booking platform integrations

**Legal/compliance exclusions:**
- Legal review of any kind
- Privacy policy / terms of use / cookie policy drafting
- ADA / WCAG compliance certification
- Industry-specific regulatory compliance
- Trademark clearance
- Accessibility litigation defense
- Consumer consent compliance for email/text marketing tools

### §4 Fees and Billing
- **Setup fee**: amount as stated in header; due in full before work begins; non-refundable
- **Monthly fee**: amount as stated; billed on billing date
- **Payment terms**: due within 15 days of billing date (Net 15)
- **Late fee**: 3% per month on unpaid balance, accruing monthly until paid, not to exceed maximum permitted by applicable law
- **Suspension**: site suspended if payment not received within 30 days of due date; reinstated within 24 hours of confirmed payment
- **Termination**: Provider may terminate agreement if payment not received within 60 days of due date
- **Chargebacks**: initiating a chargeback or payment reversal is a material breach
- **Past-due balances**: Client remains responsible for all past-due amounts regardless of cancellation or suspension
- **Payment method**: invoice via email; Provider may require autopay for continued service
- **Price adjustments**: locked for first 6 months; Provider may adjust with 30 days written notice thereafter

### §5 Launch Process and Acceptance
- Provider delivers draft site for Client review
- Client receives 2 rounds of revisions pre-launch
- A "revision round" = one consolidated list of feedback submitted at one time; Provider addresses that list once; piecemeal follow-up requests on already-addressed items do not constitute a new round
- If Client provides no feedback within 5 business days of delivery or revision, the work is deemed approved and accepted
- Monthly billing starts on launch date or deemed-approval date, whichever occurs first
- Client delays (late feedback, late content, unresponsiveness) extend the launch timeline; Provider is not liable for delays caused by Client

### §6 Client Responsibilities
Client must:
- Provide accurate, complete business information (name, phone, address, hours, services, service areas, pricing guidance)
- Provide all logos, photos, copy, and other content in a timely manner
- Represent and confirm that they have legal rights to all content provided
- Review deliverables and provide consolidated feedback within agreed timeframes
- Maintain control of and access to their domain registrar account
- Maintain access to any third-party accounts (Google Business Profile, etc.) needed to complete setup
- Notify Provider promptly of any errors or issues discovered after launch

Delays caused by Client's failure to fulfill any of these obligations extend the launch timeline and any turnaround commitments on a day-for-day basis. Provider is not in breach for delays attributable to Client.

### §7 Change Requests
- Included support covers minor content updates within the existing site structure
- Included edits are limited to up to 2 hours per calendar month, at Provider's reasonable discretion
- Turnaround is a target, not a guarantee; Provider will make reasonable efforts to respond within 2 business days
- Weekends, holidays, emergencies, and complex revisions are excluded from turnaround commitments
- Overages beyond 2 hours/month will be quoted at Provider's then-current hourly rate and require Client approval before work begins
- Full redesigns, new pages, or development outside the existing template are not covered and will be scoped separately

### §8 Intellectual Property
**Client owns:**
- Their business name, trademarks, and brand assets
- Logos, photos, copy, reviews, and testimonials they provide
- Customer data collected through the site

**Provider owns:**
- The underlying template, layout system, and reusable code
- Backend setup, automation framework, and internal methods
- Any proprietary systems, tools, or processes used to deliver the service

**During the agreement:**
- Client receives a limited, non-exclusive license to use the website as delivered

**Upon termination:**
- Client receives a static HTML export of their site as available at the time of termination, delivered within 5 business days at no charge
- The export explicitly does NOT include: Vercel project ownership or account access, form submission history, chatbot configuration system or conversation logs, analytics data, source code repository, licensed stock assets or fonts that cannot be transferred, third-party integration credentials, or custom automations
- Client may host the HTML export independently

### §9 Third-Party Services
- Provider uses third-party vendors including but not limited to Vercel (hosting), AI API providers (chat), and domain registrars
- Provider may substitute vendors with commercially reasonable and materially comparable alternatives without notice
- Provider is not liable for outages, pricing changes, policy changes, or API changes caused by third-party services
- Certain features may be suspended or discontinued if a third-party service becomes unavailable, uneconomical, or materially changes its terms
- No specific hosting uptime percentage is guaranteed; uptime is subject to third-party service availability

### §10 AI Virtual Assistant
- The chat widget is powered by artificial intelligence; Provider may change AI vendors at any time without notice
- AI responses are generated automatically and may be inaccurate, incomplete, or fail to represent Client's business correctly
- Outputs do not constitute legal, financial, medical, or other professional advice
- Client is responsible for reviewing configured business information and notifying Provider of inaccuracies
- Client is responsible for any required disclosures or consents for use of the AI chat tool on their website
- Provider may review chat logs for quality control, troubleshooting, and abuse prevention
- Provider may suspend or limit the widget if abuse, spam, or excessive/unusual usage is detected
- Provider is not liable for loss, damage, or dissatisfaction arising from AI chat responses
- The widget is labeled as a virtual assistant; it does not represent a human employee of Client's business

### §11 Domain and Hosting
- Website hosted on Vercel using Client's custom domain; Client remains registrar owner at all times
- Provider will not take custody of Client's domain registrar credentials
- DNS setup assistance (CNAME configuration) is included once at launch; ongoing DNS management is not included
- Email hosting is not included
- Provider has no authority to make DNS changes without Client's explicit written request
- Client is responsible for maintaining their domain registration and renewal; Provider is not liable for site downtime caused by Client's domain expiration
- SSL/HTTPS handled automatically by hosting provider
- If Client's site generates unusual traffic or resource usage that exceeds normal plan limits, Provider may take reasonable action including temporary suspension pending resolution
- No specific uptime percentage is guaranteed

### §12 Data, Privacy, and Security
- The site may collect personal information (name, email, phone) via the quote form and AI chat widget
- Provider processes collected data solely to provide the services described in this agreement
- Client is responsible for maintaining a privacy policy on their website and for any required consent language or legal disclosures
- Each party is responsible for the security of data within their own systems and control
- Provider will notify Client promptly upon becoming aware of any suspected unauthorized access to Client data
- The parties agree to cooperate reasonably in the event of a security incident
- Provider will not retain Client customer data beyond what is operationally necessary; data will be deleted or de-identified upon written request following termination, subject to legal retention requirements
- Provider is not liable for unauthorized access to data held by third-party vendors

### §13 Content Warranty and Indemnification
Client represents and warrants that:
- All logos, photos, videos, copy, reviews, testimonials, and trademarks provided are owned or properly licensed
- All business claims are accurate and lawful
- Requested content does not infringe third-party intellectual property rights or violate applicable law

Client agrees to indemnify, defend, and hold harmless Provider from any claims, losses, damages, or expenses (including reasonable attorneys' fees) arising from: Client-provided materials, Client's business practices, inaccurate statements published at Client's direction, or Client's breach of this agreement.

**Indemnification procedure**: Provider must notify Client promptly of any claim; Client has the right to control the defense and settlement (provided no settlement imposes obligations on Provider without Provider's consent); Provider agrees to cooperate reasonably.

### §14 Disclaimer of Warranties
Services are provided "as is" and "as available" to the maximum extent permitted by applicable law. Provider makes no warranty of uninterrupted service, error-free operation, specific search engine rankings, lead volume, conversion results, or fitness for a particular purpose.

### §15 Limitation of Liability
- Provider is not liable for indirect, incidental, consequential, special, punitive, or lost-profit damages, regardless of theory of liability (contract, tort, statute, or otherwise)
- Provider's maximum aggregate liability under this agreement is limited to fees paid by Client in the 30 days immediately preceding the claim
- This cap applies regardless of the number of claims or the form of action
- Nothing in this section limits liability for gross negligence or willful misconduct, or for obligations that cannot be waived under applicable law

### §16 Cancellation
- Either party may cancel with 30 days written notice (email accepted)
- **Setup fee**: non-refundable regardless of when cancellation occurs
- **Pre-launch cancellation**: if Client cancels before launch, setup fee is retained; monthly billing never starts; Client receives deliverables as-available at time of cancellation
- **Post-launch cancellation**: final month's fee is non-refundable; site remains live through end of paid period; HTML export delivered within 5 business days
- **Migration assistance**: assistance beyond the HTML export (file transfers, platform migration, handoff to new developer) is available at Provider's then-current hourly rate

### §17 Independent Contractor
Provider is an independent contractor. Nothing in this agreement creates an employment, partnership, joint venture, or agency relationship between the parties.

### §18 Confidentiality
Each party agrees to keep confidential any non-public business information shared by the other party in connection with this agreement, and not to disclose it to third parties without consent, except as required by law. This obligation survives termination.

### §19 Portfolio and Publicity Rights
Provider may reference Client's name, business, and website in Provider's portfolio, case studies, and marketing materials unless Client objects in writing within 30 days of launch.

### §20 Force Majeure
Neither party is liable for delays or failures caused by events outside their reasonable control, including natural disasters, power outages, internet infrastructure failures, third-party platform outages, or government actions.

### §21 Assignment and Subcontractors
- Provider may use subcontractors and third-party processors to deliver services
- Client may not assign this agreement without Provider's prior written consent
- Provider may assign this agreement in connection with a merger, acquisition, or sale of substantially all assets, with 30 days notice to Client

### §22 Notices
Official notices must be sent by email to the addresses on file. Email notice is deemed received the next business day. Either party may update their notice address with written notice to the other.

### §23 Electronic Signatures
The parties agree to conduct this transaction by electronic means. Electronic signatures and electronic copies of this agreement are valid and enforceable under Wyoming's Uniform Electronic Transactions Act (UETA) and the federal Electronic Signatures in Global and National Commerce Act (E-SIGN). This agreement may not be denied legal effect solely because it is in electronic form.

### §24 General Provisions
- **Entire agreement**: this document is the entire agreement between the parties; supersedes all prior discussions
- **Amendments**: modifications must be agreed to in writing by both parties; email accepted
- **Severability**: if any provision is found unenforceable, the remaining provisions continue in full force
- **No waiver**: failure to enforce any provision is not a waiver of the right to enforce it later
- **Survival**: §4 (payment obligations), §8 (IP), §12 (data/privacy), §13 (indemnification), §15 (limitation of liability), §18 (confidentiality), and §25 (dispute resolution) survive termination
- **Authority to sign**: the person signing on behalf of Client represents they have authority to bind the business to this agreement

### §25 Governing Law and Dispute Resolution
This agreement is governed by the laws of the State of Wyoming. Any dispute, claim, or controversy arising out of or relating to this agreement shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules, with the seat of arbitration in [County], Wyoming. Either party may seek temporary injunctive or other equitable relief from a court of competent jurisdiction without waiving the right to arbitration.

---

## Signatures

**Provider — Trade Ease**
Signature: _________________________
Printed Name: Ben Witt
Date: ___________

---

**Client**
Business Name: _________________________
Signature: _________________________
Printed Name: _________________________
Title: _________________________
Date: ___________

---

*Electronic signatures are valid and enforceable. You may sign electronically using DocuSign, Adobe Sign, or any e-signature tool, or print, sign, and return a scanned copy.*
