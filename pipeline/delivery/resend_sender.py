"""
Resend sender — sends an approved outreach draft via the Resend API.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import requests

from pipeline.config import settings
from pipeline.db.client import (
    get_client,
    get_contact_for_business,
    update_outreach_draft,
)

logger = logging.getLogger(__name__)

_RESEND_SEND_URL = "https://api.resend.com/emails"

_CANSPAM_HTML = (
    '<div style="color:#999;font-size:11px;margin-top:32px;border-top:1px solid #eee;'
    'padding-top:12px;font-family:sans-serif;">'
    "Trade Ease | {address} | "
    'To unsubscribe, reply with "unsubscribe" in the subject line.'
    "</div>"
)

_CANSPAM_TEXT = (
    "\n\n---\n"
    "Trade Ease | {address}\n"
    'To unsubscribe, reply with "unsubscribe" in the subject line.'
)


def send_approved_draft(draft_id: str) -> str:
    """
    Send an approved outreach draft via Resend.

    Loads the draft from Supabase (must be status=approved), appends the
    CAN-SPAM footer, POSTs to the Resend API, then marks the draft as sent.

    Returns the Resend message_id.
    Raises ValueError if the draft is not approved or has no contact email.
    """
    db = get_client()

    # Load draft
    draft_result = (
        db.table("outreach_drafts")
        .select("*")
        .eq("id", draft_id)
        .single()
        .execute()
    )
    draft = draft_result.data
    if not draft:
        raise ValueError(f"Draft {draft_id} not found")

    if draft["status"] != "approved":
        raise ValueError(
            f"Draft {draft_id} has status={draft['status']!r} — must be 'approved' before sending"
        )

    # Load contact
    contact = get_contact_for_business(draft["business_id"])
    if not contact or not contact.get("email"):
        raise ValueError(
            f"No contact email found for business {draft['business_id']}"
        )

    contact_email: str = contact["email"]
    subject: str = draft.get("subject") or "(no subject)"
    body_html: str = draft.get("body_html") or ""
    body_text: str = draft.get("body_text") or ""

    # Append CAN-SPAM footer
    address = settings.physical_address or "USA"
    body_html_final = body_html + _CANSPAM_HTML.format(address=address)
    body_text_final = body_text + _CANSPAM_TEXT.format(address=address)

    # POST to Resend
    payload = {
        "from": f"{settings.resend_from_name} <{settings.resend_from_email}>",
        "to": [contact_email],
        "subject": subject,
        "html": body_html_final,
        "text": body_text_final,
    }

    headers = {
        "Authorization": f"Bearer {settings.resend_api_key}",
        "Content-Type": "application/json",
    }

    resp = requests.post(_RESEND_SEND_URL, json=payload, headers=headers, timeout=15)

    if not resp.ok:
        raise RuntimeError(
            f"Resend API error {resp.status_code} for draft {draft_id}: {resp.text[:300]}"
        )

    message_id: str = resp.json().get("id", "")
    logger.info(
        f"[resend_sender] Sent draft {draft_id} to {contact_email} — "
        f"Resend message_id={message_id}"
    )

    # Update draft status
    update_outreach_draft(
        draft_id,
        {
            "status": "sent",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "resend_message_id": message_id,
        },
    )

    return message_id
