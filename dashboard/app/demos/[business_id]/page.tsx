export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Business, DemoSite } from "@/lib/types";
import DemoViewportFrame from "@/components/DemoViewportFrame";

export default async function DemoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ business_id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { business_id } = await params;
  const { v } = await searchParams;
  const initialViewport = (v === "mobile" || v === "tablet") ? v : "desktop";
  const supabase = await createSupabaseServer();

  const [{ data: biz }, { data: demos }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", business_id).single(),
    supabase
      .from("demo_sites")
      .select("*")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (!biz) notFound();

  const business = biz as Business;
  const demo = (demos?.[0] ?? null) as DemoSite | null;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/demos" className="text-sm text-gray-400 hover:text-gray-600">
          ← Demos
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 mt-1">{business.city}, {business.state}</p>
        </div>
        {demo && (
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              demo.status === "ready" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}>{demo.status}</span>
            {demo.preview_url && (
              <a href={`/api/demo/${business_id}`} target="_blank" rel="noopener noreferrer"
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                Open Demo →
              </a>
            )}
          </div>
        )}
      </div>

      {!demo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">
          No demo generated yet — run the demo step to generate one.
        </div>
      )}

      {demo?.preview_url && (
        <div className="mb-6">
          <DemoViewportFrame
            src={`/api/demo/${business_id}`}
            height={620}
            title="Demo preview"
            newTabBase={`/demos/${business_id}`}
            initialViewport={initialViewport}
          />
        </div>
      )}

      {demo?.injection_data && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-gray-800 mb-3">Injection Data</h2>
          <pre className="text-xs text-gray-600 overflow-auto max-h-80 whitespace-pre-wrap">
            {JSON.stringify(demo.injection_data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
