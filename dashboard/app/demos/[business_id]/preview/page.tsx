export const dynamic = "force-dynamic";

/**
 * Minimal full-screen preview page — no dashboard chrome.
 * Used by the DemoViewportFrame "new tab" button in tablet/mobile mode.
 * URL: /demos/[business_id]/preview?v=mobile|tablet|desktop
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

  const widths: Record<string, string> = {
    mobile: "375px",
    tablet: "768px",
    desktop: "100%",
  };

  const viewport = v === "mobile" || v === "tablet" ? v : "desktop";
  const frameWidth = widths[viewport];
  const isConstrained = viewport !== "desktop";

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{viewport.charAt(0).toUpperCase() + viewport.slice(1)} Preview</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; background: ${isConstrained ? "#1a1a1a" : "#fff"}; }
          .wrapper {
            display: flex;
            flex-direction: column;
            height: 100vh;
          }
          .bar {
            background: #111;
            color: #888;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 12px;
            padding: 6px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
          }
          .bar a { color: #60a5fa; text-decoration: none; }
          .bar a:hover { text-decoration: underline; }
          .dot { width: 6px; height: 6px; border-radius: 50%; background: #444; display: inline-block; }
          .frame-area {
            flex: 1;
            overflow: auto;
            display: flex;
            align-items: ${isConstrained ? "flex-start" : "stretch"};
            justify-content: center;
            padding: ${isConstrained ? "24px 0" : "0"};
          }
          .frame-box {
            width: ${frameWidth};
            flex-shrink: 0;
            height: ${isConstrained ? "calc(100vh - 90px)" : "100%"};
            box-shadow: ${isConstrained ? "0 0 0 1px #333, 0 8px 40px rgba(0,0,0,0.6)" : "none"};
            border-radius: ${isConstrained ? "12px" : "0"};
            overflow: hidden;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
          }
        `}</style>
      </head>
      <body>
        <div className="wrapper">
          {isConstrained && (
            <div className="bar">
              <span className="dot" />
              <span>{viewport === "mobile" ? "375px — Mobile" : "768px — Tablet"}</span>
              <a href={`/demos/${business_id}/preview`}>Desktop</a>
              <a href={`/demos/${business_id}/preview?v=${viewport === "mobile" ? "tablet" : "mobile"}`}>
                {viewport === "mobile" ? "Tablet" : "Mobile"}
              </a>
              <a href={`/demos/${business_id}`} style={{ marginLeft: "auto" }}>← Back to dashboard</a>
            </div>
          )}
          <div className="frame-area">
            <div className="frame-box">
              <iframe
                src={`/api/demo/${business_id}`}
                title={`${viewport} preview`}
              />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
