export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import type { OutreachDraft } from "@/lib/types";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-500",
  bounced: "bg-red-100 text-red-700",
  replied: "bg-emerald-100 text-emerald-700",
};

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("outreach_drafts")
    .select("*, businesses(name, city, state), contacts(name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.status) query = query.eq("status", params.status);

  const { data, error } = await query;

  // If the join fails, fall back to a plain select (no joined business/contact names)
  let drafts: OutreachDraft[] = [];
  if (error) {
    console.error("[outreach] query error:", error.message, error.code);
    const { data: fallback } = await supabase
      .from("outreach_drafts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    drafts = (fallback ?? []) as OutreachDraft[];
  } else {
    drafts = (data ?? []) as OutreachDraft[];
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Outreach</h1>
        <p className="text-gray-500 mt-1">{drafts.length} drafts</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["draft", "approved", "sent", "rejected", "replied"].map((s) => (
          <Link
            key={s}
            href={`/outreach?status=${s}`}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              params.status === s
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {s}
          </Link>
        ))}
        {params.status && (
          <Link href="/outreach" className="px-3 py-1 rounded-full text-xs font-medium border bg-white text-red-500 border-red-200">
            clear
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Subject</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">To</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {drafts.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {(d as any).businesses?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                  {d.subject ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {(d as any).contacts?.email ?? "no email found"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_STYLES[d.status]}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(d.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/outreach/${d.id}`}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
            {drafts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  No outreach drafts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
