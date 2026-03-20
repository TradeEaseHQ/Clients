"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Business } from "@/lib/types";

interface Props {
  businesses: Pick<Business, "id" | "name" | "city" | "state">[];
}

export default function NewClientForm({ businesses }: Props) {
  const router = useRouter();

  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [domain, setDomain] = useState("");
  const [plan, setPlan] = useState<"basic" | "pro" | "ai_agent">("basic");
  const [monthlyFee, setMonthlyFee] = useState(149);
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/clients/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          domain: domain.trim() || undefined,
          plan,
          monthly_fee: monthlyFee,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setCreatedId(data.id);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (createdId) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <p className="text-green-700 font-semibold text-lg mb-3">Client created.</p>
        <a
          href={`/clients/${createdId}`}
          className="inline-block text-sm bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          View client →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Business */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        >
          {businesses.length === 0 && (
            <option value="" disabled>No businesses found</option>
          )}
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}{b.city ? ` — ${b.city}, ${b.state}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Domain */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="austincleanpro.com"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <p className="text-xs text-gray-400 mt-1">Leave blank if not yet purchased.</p>
      </div>

      {/* Plan */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as "basic" | "pro" | "ai_agent")}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        >
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="ai_agent">AI Agent</option>
        </select>
      </div>

      {/* Monthly fee */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Fee ($)</label>
        <input
          type="number"
          value={monthlyFee}
          onChange={(e) => setMonthlyFee(Number(e.target.value))}
          min={0}
          step={1}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any internal notes about this client..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
        />
      </div>

      {/* Tally onboarding info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
        <p className="font-medium mb-1">Onboarding form</p>
        <p className="text-xs">
          After creating this client, send them the onboarding form:{" "}
          <span className="font-mono bg-blue-100 px-1 rounded">
            [Tally link will go here — update TALLY_ONBOARDING_URL in env]
          </span>
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !businessId}
        className="self-start text-sm bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? "Creating…" : "Create Client"}
      </button>
    </form>
  );
}
