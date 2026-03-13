import { createSupabaseServer } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Business, WebsiteAnalysis } from "@/lib/types";

const TIER_STYLES: Record<string, string> = {
  skip_remake: "bg-green-100 text-green-700",
  candidate: "bg-yellow-100 text-yellow-700",
  high_priority: "bg-red-100 text-red-700",
  no_site: "bg-gray-100 text-gray-600",
};

const RUBRIC_ITEMS = [
  { key: "visual_score", label: "Visual Design", max: 15 },
  { key: "mobile_score", label: "Mobile Experience", max: 15 },
  { key: "trust_score", label: "Trust Signals", max: 15 },
  { key: "cta_score", label: "CTA Clarity", max: 15 },
  { key: "service_clarity_score", label: "Service Clarity", max: 10 },
  { key: "contact_friction_score", label: "Contact Friction", max: 10 },
  { key: "speed_score", label: "Page Speed", max: 5 },
  { key: "review_usage_score", label: "Review Usage", max: 5 },
  { key: "quote_flow_score", label: "Quote / Booking Flow", max: 5 },
  { key: "professionalism_score", label: "Overall Professionalism", max: 5 },
];

export default async function ScoreDetailPage({
  params,
}: {
  params: Promise<{ business_id: string }>;
}) {
  const { business_id } = await params;
  const supabase = await createSupabaseServer();

  const [{ data: biz }, { data: analyses }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", business_id).single(),
    supabase
      .from("website_analyses")
      .select("*")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (!biz) notFound();

  const business = biz as Business;
  const analysis = (analyses?.[0] ?? null) as WebsiteAnalysis | null;
  const extracted = business.extracted_content;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/scores" className="text-sm text-gray-400 hover:text-gray-600">
          ← Scores
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 mt-1">{business.city}, {business.state}</p>
          {business.website_url && (
            <a href={business.website_url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline mt-1 block">
              {business.website_url.replace(/^https?:\/\//, "")} →
            </a>
          )}
        </div>
        {analysis?.priority_tier && (
          <div className="text-right">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${TIER_STYLES[analysis.priority_tier]}`}>
              {analysis.priority_tier.replace(/_/g, " ")}
            </div>
            <p className="text-4xl font-bold text-gray-900 mt-2">{analysis.total_score}<span className="text-lg text-gray-400">/100</span></p>
          </div>
        )}
      </div>

      {!analysis && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">
          No analysis yet — run the analyze step to score this site.
        </div>
      )}

      {analysis && (
        <>
          {/* Screenshots */}
          {(analysis.screenshot_desktop_url || analysis.screenshot_mobile_url) && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {analysis.screenshot_desktop_url && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Desktop</p>
                  <img src={analysis.screenshot_desktop_url} alt="Desktop screenshot"
                    className="rounded-lg border border-gray-200 w-full object-cover" />
                </div>
              )}
              {analysis.screenshot_mobile_url && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Mobile</p>
                  <img src={analysis.screenshot_mobile_url} alt="Mobile screenshot"
                    className="rounded-lg border border-gray-200 w-full object-cover" />
                </div>
              )}
            </div>
          )}

          {/* Rubric Scores */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">Score Breakdown</h2>
            <div className="space-y-3">
              {RUBRIC_ITEMS.map(({ key, label, max }) => {
                const val = (analysis as any)[key] ?? 0;
                const pct = Math.round((val / max) * 100);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-semibold text-gray-900">{val}/{max}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-400" : "bg-red-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Weaknesses */}
          {analysis.top_3_weaknesses && analysis.top_3_weaknesses.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-6">
              <h2 className="text-base font-bold text-red-800 mb-3">Top Weaknesses</h2>
              <ul className="space-y-2">
                {analysis.top_3_weaknesses.map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-red-700">
                    <span className="font-bold shrink-0">{i + 1}.</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Notes */}
          {analysis.ai_analysis_notes && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
              <h2 className="text-base font-bold text-gray-800 mb-2">AI Analysis Notes</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{analysis.ai_analysis_notes}</p>
            </div>
          )}
        </>
      )}

      {/* Extracted Content */}
      {extracted && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">Extracted Content</h2>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="font-semibold text-gray-500 mb-2">Services Found</p>
              {extracted.services_offered?.length > 0 ? (
                <ul className="space-y-1">
                  {extracted.services_offered.map((s: string) => (
                    <li key={s} className="text-gray-700">• {s}</li>
                  ))}
                </ul>
              ) : <p className="text-gray-400 italic">None extracted</p>}
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-2">Service Areas</p>
              {extracted.service_areas?.length > 0 ? (
                <ul className="space-y-1">
                  {extracted.service_areas.map((a: string) => (
                    <li key={a} className="text-gray-700">• {a}</li>
                  ))}
                </ul>
              ) : <p className="text-gray-400 italic">None extracted</p>}
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Owner Name</p>
              <p className="text-gray-700">{extracted.owner_name ?? "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Tone</p>
              <p className="text-gray-700">{extracted.tone ?? "—"}</p>
            </div>
            {extracted.trust_signals?.length > 0 && (
              <div className="col-span-2">
                <p className="font-semibold text-gray-500 mb-2">Trust Signals</p>
                <div className="flex flex-wrap gap-2">
                  {extracted.trust_signals.map((t: string) => (
                    <span key={t} className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
