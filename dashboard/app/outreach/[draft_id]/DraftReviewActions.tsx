"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OutreachDraft, Contact, Business } from "@/lib/types";
import DemoViewportFrame from "@/components/DemoViewportFrame";

interface Props {
  draft: OutreachDraft & {
    businesses: Pick<Business, "name" | "city" | "state" | "website_url"> | null;
    contacts: Pick<Contact, "name" | "email"> | null;
    demo_url?: string | null;
    comparison_url?: string | null;
  };
}

export default function DraftReviewActions({ draft }: Props) {
  const router = useRouter();

  const [subject, setSubject] = useState(draft.subject ?? "");
  const [bodyText, setBodyText] = useState(draft.body_text ?? "");
  const [toEmail, setToEmail] = useState(draft.contacts?.email ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const businessId = (draft as any).business_id;
  const demoUrl = draft.demo_url ?? null;
  const comparisonUrl = draft.comparison_url ?? null;

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/outreach/${draft.id}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body_text: bodyText, to_email: toEmail }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage({ type: "success", text: "Changes saved." });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Save failed." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApprove() {
    setIsApproving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/outreach/${draft.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Approve failed." });
      setIsApproving(false);
    }
  }

  async function handleReject() {
    setIsRejecting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/outreach/${draft.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: rejectNotes }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRejectModalOpen(false);
      router.refresh();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Reject failed." });
      setIsRejecting(false);
    }
  }

  const isEditable = draft.status === "draft" || draft.status === "pending_review";
  const canApprove = draft.status === "draft" || draft.status === "pending_review";

  return (
    <>
      {/* Message banner */}
      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT COLUMN (40% = 2/5) */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Email preview */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Preview</p>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">
                Subject: <span className="font-normal text-gray-700">{draft.subject ?? "—"}</span>
              </p>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500 shrink-0">To:</span>
                {isEditable ? (
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="recipient@email.com"
                  />
                ) : (
                  <span className="text-xs text-gray-700">{toEmail || <span className="text-red-500">no email found</span>}</span>
                )}
              </div>
              {draft.body_html ? (
                <iframe
                  srcDoc={draft.body_html}
                  className="w-full rounded border border-gray-100"
                  style={{ height: "380px" }}
                  title="Email preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="text-sm text-gray-400 italic py-8 text-center">No HTML body</div>
              )}
            </div>
          </div>

          {/* Edit section */}
          {isEditable && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edit Draft</p>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Body (plain text)</label>
                  <textarea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={8}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono resize-y"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="self-start text-sm bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {/* Comparison link */}
          {businessId && (
            <a
              href={`/api/comparison/${businessId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              Open comparison page →
            </a>
          )}

          {/* Action buttons */}
          {canApprove && (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex-1 text-sm bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {isApproving ? "Approving…" : "Approve"}
              </button>
              <button
                onClick={() => setRejectModalOpen(true)}
                className="flex-1 text-sm bg-red-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          )}

          {draft.status === "approved" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 font-medium text-center">
              Approved — ready to send from the Approved queue.
            </div>
          )}

          {draft.status === "sent" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium text-center">
              Sent {draft.sent_at ? `on ${new Date(draft.sent_at).toLocaleDateString()}` : ""}
            </div>
          )}

          {draft.status === "rejected" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">Rejected</p>
              {draft.rejection_notes && <p className="text-xs">{draft.rejection_notes}</p>}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (60% = 3/5) — Demo iframe */}
        <div className="lg:col-span-3">
          {demoUrl ? (
            <DemoViewportFrame
              src={`/api/demo/${businessId}`}
              height={500}
              title="Demo site"
              newTabBase={`/demos/${businessId}`}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 text-sm" style={{ height: "500px" }}>
              No demo site generated yet
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Reject Draft</h2>
            <p className="text-sm text-gray-500 mb-4">Optional: add notes about why this is being rejected.</p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={4}
              placeholder="e.g. Email tone is too salesy, needs rewrite"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={isRejecting}
                className="flex-1 text-sm bg-red-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isRejecting ? "Rejecting…" : "Confirm Reject"}
              </button>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 text-sm bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
