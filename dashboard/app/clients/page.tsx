export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import type { ClientSite } from "@/lib/types";
import Link from "next/link";
import { HOSTING_STATUS_COLORS } from "./_constants";

export default async function ClientsPage() {
  const supabase = await createSupabaseServer();

  const { data: rows } = await supabase
    .from("client_sites")
    .select("*, businesses(name, city, state)")
    .order("created_at", { ascending: false })
    .limit(200);

  const clients = (rows ?? []) as ClientSite[];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">{clients.length} active client{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/clients/new"
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          + New Client
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Business Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Domain</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Monthly Fee</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Go-Live Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link href={`/clients/${c.id}`} className="hover:underline text-blue-700">
                    {c.businesses?.name ?? "—"}
                  </Link>
                  {(c.businesses?.city || c.businesses?.state) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[c.businesses?.city, c.businesses?.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {c.domain ? (
                    <a
                      href={`https://${c.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {c.domain}
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">not set</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 capitalize">{c.plan}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      HOSTING_STATUS_COLORS[c.hosting_status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.hosting_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {c.monthly_fee != null ? `$${c.monthly_fee}/mo` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {c.live_at ? new Date(c.live_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/clients/${c.id}`}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No clients yet.{" "}
                  <Link href="/clients/new" className="text-blue-500 hover:underline">
                    Create your first client
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
