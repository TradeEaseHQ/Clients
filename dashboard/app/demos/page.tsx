import { createSupabaseServer } from "@/lib/supabase";
import type { DemoSite } from "@/lib/types";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  generating: "bg-yellow-100 text-yellow-700",
  ready: "bg-green-100 text-green-700",
  published: "bg-blue-100 text-blue-700",
  archived: "bg-gray-100 text-gray-500",
};

export default async function DemosPage() {
  const supabase = await createSupabaseServer();

  const { data } = await supabase
    .from("demo_sites")
    .select("*, businesses(name, city, state)")
    .order("created_at", { ascending: false })
    .limit(200);

  const demos = (data ?? []) as (DemoSite & {
    businesses: { name: string; city: string; state: string } | null;
  })[];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Demos</h1>
        <p className="text-gray-500 mt-1">{demos.length} generated demo sites</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {demos.map((d) => (
          <Link
            key={d.id}
            href={`/demos/${d.business_id}`}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{d.businesses?.name ?? "—"}</p>
                <p className="text-sm text-gray-500">{d.businesses?.city}, {d.businesses?.state}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[d.status]}`}>
                {d.status}
              </span>
            </div>
            {d.preview_url && (
              <a
                href={d.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Open demo →
              </a>
            )}
            <p className="text-xs text-gray-400 mt-2">
              {new Date(d.created_at).toLocaleDateString()}
            </p>
          </Link>
        ))}
        {demos.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">
            No demos generated yet
          </div>
        )}
      </div>
    </div>
  );
}
