export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import Link from "next/link";
import FollowupSendButton from "./FollowupSendButton";

const FOLLOWUP_DELAY_DAYS = 4;

export default async function FollowupsPage() {
  const supabase = await createSupabaseServer();

  // Find Email 1s sent 4+ days ago with no reply
  const cutoff = new Date(
    Date.now() - FOLLOWUP_DELAY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: readyParents } = await supabase
    .from("outreach_drafts")
    .select("id")
    .eq("status", "sent")
    .eq("sequence_number", 1)
    .is("replied_at", null)
    .lt("sent_at", cutoff);

  const parentIds = (readyParents ?? []).map((p: { id: string }) => p.id);

  let followups: any[] = [];
  if (parentIds.length > 0) {
    const { data } = await supabase
      .from("outreach_drafts")
      .select("*, businesses(name, city, state), contacts(name, email)")
      .eq("sequence_number", 2)
      .eq("status", "follow_up_pending")
      .in("parent_draft_id", parentIds)
      .order("created_at", { ascending: false });
    followups = data ?? [];
  }

  const { data: sentFollowups } = await supabase
    .from("outreach_drafts")
    .select("*, businesses(name, city, state), contacts(name, email)")
    .eq("sequence_number", 2)
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
          <p className="text-gray-500 mt-1">
            {followups.length} ready · Email 2s for leads who haven&apos;t replied after {FOLLOWUP_DELAY_DAYS} days
          </p>
        </div>
        <Link href="/outreach" className="text-sm text-gray-500 hover:text-gray-700">
          ← All Drafts
        </Link>
      </div>

      {followups.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center text-blue-700 mb-10">
          No follow-ups ready yet. They appear here {FOLLOWUP_DELAY_DAYS} days after Email 1 is sent to leads who haven&apos;t replied.
        </div>
      )}

      {followups.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Ready to Send ({followups.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {followups.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/outreach/${d.id}`} className="hover:underline">
                        {d.businesses?.name ?? "—"}
                      </Link>
                      {d.businesses?.city && (
                        <span className="ml-1 text-xs text-gray-400">{d.businesses.city}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {d.subject ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {d.contacts?.email ?? <span className="text-red-500">no email</span>}
                    </td>
                    <td className="px-4 py-3">
                      <FollowupSendButton
                        draftId={d.id}
                        hasEmail={!!d.contacts?.email}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(sentFollowups ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Already Sent ({sentFollowups!.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sentFollowups!.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/outreach/${d.id}`} className="hover:underline">
                        {d.businesses?.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {d.contacts?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {d.sent_at ? new Date(d.sent_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
