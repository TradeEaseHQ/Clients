export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_TEAM = process.env.VERCEL_TEAM_ID; // optional

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServer();

    // 1. Fetch client site + business
    const { data: clientSite, error: clientErr } = await supabase
      .from("client_sites")
      .select("*, businesses(name, id)")
      .eq("id", id)
      .single();

    if (clientErr || !clientSite) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // 2. Check Vercel token
    if (!VERCEL_TOKEN) {
      return NextResponse.json(
        { error: "VERCEL_API_TOKEN not configured" },
        { status: 500 }
      );
    }

    // 3. Fetch latest generated HTML for this business
    const { data: demoSite, error: demoErr } = await supabase
      .from("demo_sites")
      .select("generated_html, storage_path")
      .eq("business_id", clientSite.business_id)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (demoErr || !demoSite?.generated_html) {
      return NextResponse.json(
        { error: "No generated demo HTML found for this business" },
        { status: 400 }
      );
    }

    // 4. Build Vercel project name (slugified business name)
    const businessName = (clientSite.businesses as { name: string }).name;
    const projectName = `tradeease-${businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40)}`;

    const teamQuery = VERCEL_TEAM ? `?teamId=${VERCEL_TEAM}` : "";

    // 5. Deploy to Vercel
    const deployRes = await fetch(
      `https://api.vercel.com/v13/deployments${teamQuery}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          files: [
            {
              file: "index.html",
              data: Buffer.from(demoSite.generated_html).toString("base64"),
              encoding: "base64",
            },
          ],
          projectSettings: { framework: null },
        }),
      }
    );

    if (!deployRes.ok) {
      const errText = await deployRes.text();
      console.error("[deploy] Vercel API error:", errText);
      return NextResponse.json(
        { error: `Vercel deploy failed: ${deployRes.status}` },
        { status: 500 }
      );
    }

    const deployment = await deployRes.json();
    const deploymentUrl = `https://${deployment.url}`;

    // 6. Attach custom domain (if provided)
    let domainAttached = false;
    if (clientSite.domain && deployment.projectId) {
      const domainRes = await fetch(
        `https://api.vercel.com/v10/projects/${deployment.projectId}/domains${teamQuery}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: clientSite.domain }),
        }
      );
      if (domainRes.ok) {
        domainAttached = true;
      } else {
        // Non-fatal: DNS not yet configured, log and continue
        console.warn(
          `[deploy] Domain attachment pending for ${clientSite.domain} — DNS not yet configured`
        );
      }
    }

    // 7. Update client_sites record
    await supabase
      .from("client_sites")
      .update({
        hosting_status: "live",
        vercel_project_id: deployment.projectId ?? null,
        vercel_deployment_url: deploymentUrl,
        live_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({
      ok: true,
      deployment_url: deploymentUrl,
      domain: clientSite.domain ?? null,
      domain_attached: domainAttached,
      dns_instructions: clientSite.domain
        ? `Add a CNAME record: ${clientSite.domain} → cname.vercel-dns.com`
        : null,
    });
  } catch (err) {
    console.error("[deploy]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
