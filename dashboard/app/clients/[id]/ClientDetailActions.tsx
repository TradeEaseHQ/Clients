"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientSite, AiAgentConfig } from "@/lib/types";

interface Props {
  client: ClientSite;
}

export default function ClientDetailActions({ client }: Props) {
  const router = useRouter();

  // AI Agent Config form state
  const cfg = client.ai_agent_config ?? {};
  const [businessName, setBusinessName] = useState(cfg.business_name ?? "");
  const [phone, setPhone] = useState(cfg.phone ?? "");
  const [city, setCity] = useState(cfg.city ?? "");
  const [services, setServices] = useState(cfg.services ?? "");
  const [serviceAreas, setServiceAreas] = useState(cfg.service_areas ?? "");
  const [hours, setHours] = useState(cfg.hours ?? "");
  const [pricingRange, setPricingRange] = useState(cfg.pricing_range ?? "");
  const [escalationTrigger, setEscalationTrigger] = useState(cfg.escalation_trigger ?? "");

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Deploy state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployMessage, setDeployMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(client.vercel_deployment_url ?? null);

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigMessage(null);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_agent_config: {
            business_name: businessName,
            phone,
            city,
            services,
            service_areas: serviceAreas,
            hours,
            pricing_range: pricingRange,
            escalation_trigger: escalationTrigger,
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setConfigMessage({ type: "success", text: "AI chat config saved." });
      router.refresh();
    } catch (e: any) {
      setConfigMessage({ type: "error", text: e.message || "Save failed." });
    } finally {
      setIsSavingConfig(false);
    }
  }

  async function handleDeploy() {
    setIsDeploying(true);
    setDeployMessage(null);
    try {
      const res = await fetch(`/api/clients/${client.id}/deploy`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const url: string | undefined = data.deployment_url ?? data.url;
      if (url) setDeployedUrl(url);
      setDeployMessage({ type: "success", text: "Deployment triggered." + (url ? ` URL: ${url}` : "") });
      router.refresh();
    } catch (e: any) {
      setDeployMessage({ type: "error", text: e.message || "Deploy failed." });
    } finally {
      setIsDeploying(false);
    }
  }

  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300";
  const labelClass = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="flex flex-col gap-8">
      {/* AI Chat Config */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Chat Config</p>
        </div>
        <form onSubmit={handleSaveConfig} className="p-5 flex flex-col gap-4">
          {configMessage && (
            <div
              className={`rounded-lg px-4 py-3 text-sm font-medium ${
                configMessage.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {configMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Hours</label>
              <input
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Monday–Saturday, 8am–6pm"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Pricing Range</label>
              <input
                type="text"
                value={pricingRange}
                onChange={(e) => setPricingRange(e.target.value)}
                placeholder="Starting at $120"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Escalation Trigger</label>
              <input
                type="text"
                value={escalationTrigger}
                onChange={(e) => setEscalationTrigger(e.target.value)}
                placeholder="speak to someone"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Services (comma-separated)</label>
            <textarea
              value={services}
              onChange={(e) => setServices(e.target.value)}
              rows={2}
              placeholder="House cleaning, deep clean, move-in/move-out"
              className={`${inputClass} resize-y`}
            />
          </div>
          <div>
            <label className={labelClass}>Service Areas (comma-separated)</label>
            <textarea
              value={serviceAreas}
              onChange={(e) => setServiceAreas(e.target.value)}
              rows={2}
              placeholder="Austin, Round Rock, Cedar Park"
              className={`${inputClass} resize-y`}
            />
          </div>

          <button
            type="submit"
            disabled={isSavingConfig}
            className="self-start text-sm bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {isSavingConfig ? "Saving…" : "Save Config"}
          </button>
        </form>
      </div>

      {/* Deploy actions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deployment</p>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {deployMessage && (
            <div
              className={`rounded-lg px-4 py-3 text-sm font-medium ${
                deployMessage.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {deployMessage.text}
            </div>
          )}

          {deployedUrl && (
            <p className="text-sm text-gray-600">
              Deployment URL:{" "}
              <a
                href={deployedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {deployedUrl}
              </a>
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="text-sm bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isDeploying ? "Deploying…" : "Finalize & Deploy"}
            </button>
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="text-sm bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {isDeploying ? "Deploying…" : "Redeploy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
