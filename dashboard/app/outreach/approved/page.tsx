export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import type { OutreachDraft, Business, Contact } from "@/lib/types";
import Link from "next/link";
import ApprovedSendButtons from "./ApprovedSendButtons";

export default async function ApprovedOutreachPage() {
  const supabase = await createSupabaseServer();

  // Warm-up config
  const { data: configRows } = await supabase
    .from("app_config")
    .select("key, value")
    .in("key", ["outreach_subdomain_start_date", "outreach_daily_cap"]);

  const configMap = Object.fromEntries(
    (configRows ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value])
  );
  const dailyCap: number = (configMap["outreach_daily_cap"] as number) ?? 8;
  const startDateStr: string = (configMap["outreach_subdomain_start_date"] as string) ?? "";

  // Count emails sent today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: sentTodayCount } = await supabase
    .from("outreach_drafts")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", todayStart.toISOString());
  const sentToday = sentTodayCount ?? 0;
  const remaining = Math.max(0, dailyCap - sentToday);

  const subdomainAge = startDateStr
    ? Math.floor((Date.now() - new Date(startDateStr).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const { data } = await supabase
    .from("outreach_drafts")
    .select(
      "*, businesses(name, city, state), contacts(name, email)"
    )
    .in("status", ["approved", "sent"])
    .order("approved_at", { ascending: false })
    .limit(200);

  const drafts = (data ?? []) as (OutreachDraft & {
    businesses: Pick<Business, "name" | "city" | "state"> | null;
    contacts: Pick<Contact, "name" | "email"> | null;
  })[];

  const approved = drafts.filter((d) => d.status === "approved");
  const sent = drafts.filter((d) => d.status === "sent");

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approved Drafts</h1>
          <p className="text-gray-500 mt-1">
            {approved.length} ready to send · {sent.length} already sent
          </p>
        </div>
        <Link
          href="/outreach"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← All Drafts
        </Link>
      </div>

      {/* Warm-up counter */}
      <div className={`mb-6 rounded-xl border px-5 py-3 flex items-center gap-4 text-sm flex-wrap ${
        remaining === 0
          ? "bg-red-50 border-red-200 text-red-700"
          : remaining <= 3
          ? "bg-yellow-50 border-yellow-200 text-yellow-700"
          : "bg-gray-50 border-gray-200 text-gray-600"
      }`}>
        <span>
          <strong>Today:</strong> {sentToday} of {dailyCap} sent · {remaining} remaining
        </span>
        <span className="text-gray-300">|</span>
        <span>Subdomain age: day {subdomainAge}</span>
        {remaining === 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="font-medium">Daily cap reached — update in Supabase app_config to increase</span>
          </>
        )}
      </div>

      {/* Ready to send */}
      {approved.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Ready to Send ({approved.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Approved</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {approved.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        href={`/outreach/${d.id}`}
                        className="hover:underline"
                      >
                        {d.businesses?.name ?? "—"}
                      </Link>
                      {d.businesses?.city && (
                        <span className="ml-1 text-xs text-gray-400">
                          {d.businesses.city}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {d.subject ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {d.contacts?.email ?? (
                        <span className="text-red-500">no email</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {d.approved_at
                        ? new Date(d.approved_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ApprovedSendButtons
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

      {approved.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center text-yellow-700 mb-10">
          No approved drafts ready to send. Approve some from the{" "}
          <Link href="/outreach" className="underline">
            outreach queue
          </Link>
          .
        </div>
      )}

      {/* Already sent */}
      {sent.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Already Sent ({sent.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sent.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/outreach/${d.id}`} className="hover:underline">
                        {d.businesses?.name ?? "—"}
                      </Link>
                      {d.businesses?.city && (
                        <span className="ml-1 text-xs text-gray-400">
                          {d.businesses.city}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {d.subject ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {d.contacts?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {d.sent_at
                        ? new Date(d.sent_at).toLocaleString()
                        : "—"}
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
