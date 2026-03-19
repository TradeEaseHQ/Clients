export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { OutreachDraft, Business, Contact } from "@/lib/types";
import DraftReviewActions from "./DraftReviewActions";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-500",
  bounced: "bg-red-100 text-red-700",
  replied: "bg-emerald-100 text-emerald-700",
};

export default async function DraftReviewPage({
  params,
}: {
  params: Promise<{ draft_id: string }>;
}) {
  const { draft_id } = await params;
  const supabase = await createSupabaseServer();

  // Use limit(1) instead of single() to avoid PGRST116 errors on valid data
  const { data: rows, error: draftErr } = await supabase
    .from("outreach_drafts")
    .select("*, businesses(name, city, state, website_url), contacts(name, email)")
    .eq("id", draft_id)
    .limit(1);

  let rawDraft: any = rows?.[0] ?? null;

  // If join failed, fall back to plain select
  if (draftErr || !rawDraft) {
    console.error("[draft review] join error:", draftErr?.message, "| draft_id:", draft_id);
    const { data: fallback, error: fallbackErr } = await supabase
      .from("outreach_drafts")
      .select("*")
      .eq("id", draft_id)
      .limit(1);
    console.error("[draft review] fallback error:", fallbackErr?.message, "| rows:", fallback?.length);
    rawDraft = fallback?.[0] ?? null;
  }

  if (!rawDraft) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-red-600 mb-4">Draft not found</h1>
        <p className="text-sm text-gray-600 mb-2">Searched for ID: <code className="bg-gray-100 px-1 rounded font-mono">{draft_id}</code></p>
        <p className="text-sm text-gray-500 mb-1">Join error: {draftErr?.message ?? "none"}</p>
        <a href="/outreach" className="mt-4 inline-block text-blue-500 hover:underline text-sm">← Back to Outreach</a>
      </div>
    );
  }

  const draft = rawDraft as OutreachDraft & {
    businesses: Pick<Business, "name" | "city" | "state" | "website_url"> | null;
    contacts: Pick<Contact, "name" | "email"> | null;
  };

  // Load demo site for this business (for iframe + url)
  const { data: demoData } = await supabase
    .from("demo_sites")
    .select("preview_url")
    .eq("business_id", draft.business_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const demoUrl = demoData?.preview_url ?? null;

  // Merge extra fields so the client component has everything it needs
  const draftWithUrls = {
    ...draft,
    demo_url: demoUrl,
    comparison_url: draft.comparison_url ?? null,
  };

  const biz = draft.businesses;
  const contact = draft.contacts;

  return (
    <div className="p-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/outreach"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Back to Outreach
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {biz?.name ?? "Unnamed Business"}
          </h1>
          {(biz?.city || biz?.state) && (
            <p className="text-gray-500 mt-1">
              {[biz?.city, biz?.state].filter(Boolean).join(", ")}
            </p>
          )}
          {biz?.website_url && (
            <a
              href={biz.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline mt-1 inline-block"
            >
              {biz.website_url}
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${
              STATUS_STYLES[draft.status] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {draft.status}
          </span>
          {contact?.email && (
            <span className="text-xs text-gray-500">→ {contact.email}</span>
          )}
        </div>
      </div>

      {/* Interactive section — client component */}
      <DraftReviewActions draft={draftWithUrls} />
    </div>
  );
}
