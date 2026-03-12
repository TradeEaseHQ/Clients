import { createSupabaseServer } from "@/lib/supabase";
import type { WebsiteAnalysis } from "@/lib/types";
import Link from "next/link";

const TIER_STYLES: Record<string, string> = {
  skip_remake: "bg-green-100 text-green-700",
  candidate: "bg-yellow-100 text-yellow-700",
  high_priority: "bg-red-100 text-red-700",
  no_site: "bg-gray-100 text-gray-700",
};

export default async function ScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("website_analyses")
    .select("*, businesses(name, city, state)")
    .order("total_score", { ascending: true })
    .limit(200);

  if (params.tier) query = query.eq("priority_tier", params.tier);

  const { data } = await query;
  const analyses = (data ?? []) as (WebsiteAnalysis & {
    businesses: { name: string; city: string; state: string } | null;
  })[];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scores</h1>
        <p className="text-gray-500 mt-1">{analyses.length} scored businesses</p>
      </div>

      {/* Tier filter */}
      <div className="flex gap-2 mb-6">
        {["high_priority", "candidate", "skip_remake", "no_site"].map((tier) => (
          <Link
            key={tier}
            href={`/scores?tier=${tier}`}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              params.tier === tier
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {tier.replace(/_/g, " ")}
          </Link>
        ))}
        {params.tier && (
          <Link href="/scores" className="px-3 py-1 rounded-full text-xs font-medium border bg-white text-red-500 border-red-200">
            clear
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Business</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">City</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Score</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Tier</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Top Weakness</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {analyses.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {a.businesses?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {a.businesses?.city}, {a.businesses?.state}
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold text-gray-900">{a.total_score ?? "—"}</span>
                  <span className="text-gray-400 text-xs">/100</span>
                </td>
                <td className="px-4 py-3">
                  {a.priority_tier && (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${TIER_STYLES[a.priority_tier]}`}>
                      {a.priority_tier.replace(/_/g, " ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                  {a.top_3_weaknesses?.[0] ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/scores/${a.business_id}`}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {analyses.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  No scored businesses yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
