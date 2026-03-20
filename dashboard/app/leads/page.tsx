import { createSupabaseServer } from "@/lib/supabase";
import type { Business } from "@/lib/types";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  analyzing: "bg-blue-100 text-blue-700",
  scored: "bg-yellow-100 text-yellow-700",
  demo_generated: "bg-purple-100 text-purple-700",
  outreach_drafted: "bg-indigo-100 text-indigo-700",
  outreach_approved: "bg-teal-100 text-teal-700",
  outreach_sent: "bg-green-100 text-green-700",
  converted: "bg-emerald-100 text-emerald-700 font-semibold",
  skip: "bg-gray-100 text-gray-400",
  no_response: "bg-gray-100 text-gray-400",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; city?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.status) query = query.eq("status", params.status);
  if (params.city) query = query.ilike("city", `%${params.city}%`);

  const { data: businesses } = await query;
  const leads = (businesses ?? []) as Business[];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">{leads.length} businesses</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["new", "scored", "demo_generated", "outreach_sent", "converted"].map((s) => (
          <Link
            key={s}
            href={`/leads?status=${s}`}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              params.status === s
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {s.replace(/_/g, " ")}
          </Link>
        ))}
        {params.status && (
          <Link
            href="/leads"
            className="px-3 py-1 rounded-full text-xs font-medium border bg-white text-red-500 border-red-200 hover:border-red-400"
          >
            clear
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">City</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Rating</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Website</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                <td className="px-4 py-3 text-gray-500">{b.city}, {b.state}</td>
                <td className="px-4 py-3 text-gray-500">
                  {b.rating ? `⭐ ${b.rating} (${b.review_count})` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {b.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {b.website_url ? (
                    <a
                      href={b.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate max-w-[180px] block"
                    >
                      {b.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">no website</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(b.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  No leads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
