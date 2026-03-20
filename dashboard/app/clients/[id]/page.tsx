export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ClientSite } from "@/lib/types";
import ClientDetailActions from "./ClientDetailActions";
import { HOSTING_STATUS_COLORS } from "../_constants";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServer();

  const { data: rows, error } = await supabase
    .from("client_sites")
    .select("*, businesses(name, city, state, phone, website_url)")
    .eq("id", id)
    .limit(1);

  const client = (rows?.[0] ?? null) as ClientSite | null;

  if (error) {
    console.error("[clients/[id]] fetch error:", error.message);
    notFound();
  }
  if (!client) notFound();

  const biz = client.businesses;
  const changeRequests = Array.isArray(client.change_requests) ? client.change_requests : [];

  return (
    <div className="p-4 md:p-8">
      {/* Back link */}
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to Clients
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{biz?.name ?? "Unnamed Business"}</h1>
          {(biz?.city || biz?.state) && (
            <p className="text-gray-500 mt-0.5">
              {[biz?.city, biz?.state].filter(Boolean).join(", ")}
            </p>
          )}
          {client.domain && (
            <a
              href={`https://${client.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline mt-1 inline-block"
            >
              {client.domain}
            </a>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${
              HOSTING_STATUS_COLORS[client.hosting_status] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {client.hosting_status}
          </span>
          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 capitalize font-medium">
            {client.plan}
          </span>
          {client.monthly_fee != null && (
            <span className="text-xs text-gray-500 font-medium">${client.monthly_fee}/mo</span>
          )}
        </div>
      </div>

      {/* Go-live date */}
      {client.live_at && (
        <p className="text-sm text-gray-500 mb-6">
          Live since: <span className="font-medium text-gray-700">{new Date(client.live_at).toLocaleDateString()}</span>
        </p>
      )}

      <div className="flex flex-col gap-8">
        {/* Site Preview */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Site Preview</p>
          </div>
          <div className="p-4">
            {client.vercel_deployment_url ? (
              <iframe
                src={client.vercel_deployment_url}
                className="w-full rounded border border-gray-100"
                style={{ height: "500px" }}
                title="Client site preview"
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm italic">
                Not yet deployed.
              </div>
            )}
          </div>
        </div>

        {/* Onboarding Data */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Onboarding Data</p>
          </div>
          <div className="p-4">
            {client.onboarding_data ? (
              <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-auto max-h-64 font-mono text-gray-700 border border-gray-100">
                {JSON.stringify(client.onboarding_data, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-gray-400 italic">No onboarding form responses yet.</p>
            )}
          </div>
        </div>

        {/* AI Chat Config + Deploy — client component */}
        <ClientDetailActions client={client} />

        {/* Change Requests */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Change Requests ({changeRequests.length})
            </p>
          </div>
          <div className="p-4">
            {changeRequests.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {changeRequests.map((req, i) => (
                  <li key={i} className="text-sm bg-gray-50 rounded-lg p-3 border border-gray-100">
                    {typeof req === "string" ? (
                      req
                    ) : (
                      <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(req, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">No change requests yet.</p>
            )}
          </div>
        </div>

        {/* Notes */}
        {client.notes && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
