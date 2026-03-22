import { createSupabaseServer } from "@/lib/supabase";
import type { DashboardStats } from "@/lib/types";
import Link from "next/link";

async function getStats(): Promise<DashboardStats> {
  const supabase = await createSupabaseServer();

  const [
    { count: totalLeads },
    { count: scored },
    { count: demosGenerated },
    { count: pendingApproval },
    { count: sent },
    { count: converted },
  ] = await Promise.all([
    supabase.from("businesses").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "scored"),
    supabase.from("demo_sites").select("*", { count: "exact", head: true }).eq("status", "ready"),
    supabase.from("outreach_drafts").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("outreach_drafts").select("*", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "converted"),
  ]);

  return {
    totalLeads: totalLeads ?? 0,
    scored: scored ?? 0,
    demosGenerated: demosGenerated ?? 0,
    pendingApproval: pendingApproval ?? 0,
    sent: sent ?? 0,
    converted: converted ?? 0,
  };
}

interface StatCardProps {
  label: string;
  value: number;
  href: string;
  description?: string;
  highlight?: boolean;
}

function StatCard({ label, value, href, description, highlight }: StatCardProps) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-6 hover:shadow-md transition-shadow ${
        highlight
          ? "bg-orange-50 border-orange-200"
          : "bg-white border-gray-200"
      }`}
    >
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-4xl font-bold ${highlight ? "text-orange-600" : "text-gray-900"}`}>
        {value.toLocaleString()}
      </p>
      {description && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
    </Link>
  );
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Pipeline overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Leads"
          value={stats.totalLeads}
          href="/leads"
          description="Businesses in database"
        />
        <StatCard
          label="Scored"
          value={stats.scored}
          href="/scores"
          description="Website analyses complete"
        />
        <StatCard
          label="Demos Generated"
          value={stats.demosGenerated}
          href="/demos"
          description="Demo sites ready"
        />
        <StatCard
          label="Pending Approval"
          value={stats.pendingApproval}
          href="/outreach"
          description="Emails awaiting review"
          highlight={stats.pendingApproval > 0}
        />
        <StatCard
          label="Sent"
          value={stats.sent}
          href="/outreach/approved"
          description="Outreach emails delivered"
        />
        <StatCard
          label="Converted"
          value={stats.converted}
          href="/clients"
          description="Paying clients"
          highlight={stats.converted > 0}
        />
      </div>

      {stats.totalLeads === 0 && (
        <div className="mt-12 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg font-medium">No leads yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Run the pipeline to start importing businesses
          </p>
          <code className="mt-4 inline-block bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-lg">
            python pipeline/run_campaign.py --city &quot;Austin&quot; --state TX --niche housekeeping --limit 50
          </code>
        </div>
      )}
    </div>
  );
}
