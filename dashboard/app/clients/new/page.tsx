export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase";
import type { Business } from "@/lib/types";
import Link from "next/link";
import NewClientForm from "./NewClientForm";

export default async function NewClientPage() {
  const supabase = await createSupabaseServer();

  const { data: rows } = await supabase
    .from("businesses")
    .select("id, name, city, state")
    .order("name", { ascending: true })
    .limit(500);

  const businesses = (rows ?? []) as Pick<Business, "id" | "name" | "city" | "state">[];

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to Clients
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
        <p className="text-gray-500 mt-1">Create a client site record for a converted lead.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <NewClientForm businesses={businesses} />
      </div>
    </div>
  );
}
