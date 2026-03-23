export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ClientSite } from "@/lib/types";
import ClientDetailActions from "./ClientDetailActions";
import { HOSTING_STATUS_COLORS, TALLY_ONBOARDING_URL, TALLY_CHANGE_REQUEST_URL, ONBOARDING_STEPS } from "../_constants";

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

      {/* Onboarding Checklist */}
      {client.hosting_status !== "live" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-amber-800">Onboarding Steps</p>
            <a
              href={TALLY_ONBOARDING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-700 underline hover:text-amber-900"
            >
              Open Tally form ↗
            </a>
          </div>
          <ol className="flex flex-col gap-2">
            {ONBOARDING_STEPS.map(({ step, label, detail }) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center mt-0.5">
                  {step}
                </span>
                <div>
                  <span className="font-medium text-amber-900">{label}</span>
                  <span className="text-amber-700 ml-1">— {detail}</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 pt-3 border-t border-amber-200">
            <p className="text-xs text-amber-600 font-medium">Tally onboarding link (send to client):</p>
            <p className="text-xs font-mono text-amber-800 mt-0.5 select-all">{TALLY_ONBOARDING_URL}</p>
          </div>
        </div>
      )}

      {/* Live client — change request link */}
      {client.hosting_status === "live" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-green-800">Site is Live</p>
            {TALLY_CHANGE_REQUEST_URL ? (
              <a
                href={TALLY_CHANGE_REQUEST_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-700 underline hover:text-green-900"
              >
                Open change request form ↗
              </a>
            ) : (
              <span className="text-xs text-green-600 italic">Change request form not yet created</span>
            )}
          </div>
          {TALLY_CHANGE_REQUEST_URL && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-xs text-green-600 font-medium">Change request link (send to client):</p>
              <p className="text-xs font-mono text-green-800 mt-0.5 select-all">{TALLY_CHANGE_REQUEST_URL}</p>
            </div>
          )}
        </div>
      )}

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
