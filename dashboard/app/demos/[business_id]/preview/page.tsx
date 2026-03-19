export const dynamic = "force-dynamic";

/**
 * Full-screen demo preview with viewport switcher.
 * Uses position:fixed to cover the dashboard layout entirely.
 * URL: /demos/[business_id]/preview?v=desktop|tablet|mobile
 */
export default async function DemoPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ business_id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { business_id } = await params;
  const { v } = await searchParams;

  const viewport = v === "mobile" || v === "tablet" ? v : "desktop";

  const frameWidths: Record<string, string> = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };
  const frameWidth = frameWidths[viewport];
  const isConstrained = viewport !== "desktop";

  const tabs = [
    { id: "desktop", label: "Desktop" },
    { id: "tablet", label: "Tablet  768px" },
    { id: "mobile", label: "Mobile  375px" },
  ] as const;

  return (
    // position:fixed covers the full viewport including the dashboard sidebar
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      background: isConstrained ? "#141414" : "#fff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "6px 12px",
        background: "#111",
        borderBottom: "1px solid #222",
        flexShrink: 0,
      }}>
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={`/demos/${business_id}/preview${tab.id !== "desktop" ? `?v=${tab.id}` : ""}`}
            style={{
              padding: "4px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 500,
              textDecoration: "none",
              background: viewport === tab.id ? "#fff" : "transparent",
              color: viewport === tab.id ? "#111" : "#888",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </a>
        ))}
        <a
          href={`/demos/${business_id}`}
          style={{
            marginLeft: "auto",
            fontSize: "12px",
            color: "#555",
            textDecoration: "none",
          }}
        >
          ← Dashboard
        </a>
      </div>

      {/* Frame area */}
      <div style={{
        flex: 1,
        overflow: "auto",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: isConstrained ? "24px 0 24px" : "0",
      }}>
        <div style={{
          width: frameWidth,
          height: isConstrained ? "calc(100vh - 100px)" : "100%",
          flexShrink: 0,
          borderRadius: isConstrained ? "12px" : "0",
          overflow: "hidden",
          boxShadow: isConstrained ? "0 0 0 1px #2a2a2a, 0 12px 48px rgba(0,0,0,0.7)" : "none",
        }}>
          <iframe
            src={`/api/demo/${business_id}`}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            title={`${viewport} preview`}
          />
        </div>
      </div>
    </div>
  );
}
