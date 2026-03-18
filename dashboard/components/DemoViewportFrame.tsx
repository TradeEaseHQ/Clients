"use client";

import { useState } from "react";

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORTS: { id: Viewport; label: string; width: string | null }[] = [
  { id: "desktop", label: "Desktop", width: null },
  { id: "tablet", label: "Tablet", width: "768px" },
  { id: "mobile", label: "Mobile", width: "375px" },
];

interface Props {
  src: string;
  height?: number;
  title?: string;
  headerRight?: React.ReactNode;
  /** Base URL for the new-tab link — ?v=mobile|tablet is appended. Defaults to src. */
  newTabBase?: string;
  /** Pre-select a viewport on mount (from URL search param) */
  initialViewport?: Viewport;
}

export default function DemoViewportFrame({
  src,
  height = 560,
  title = "Demo preview",
  headerRight,
  newTabBase,
  initialViewport = "desktop",
}: Props) {
  const [viewport, setViewport] = useState<Viewport>(initialViewport);

  const activeViewport = VIEWPORTS.find((v) => v.id === viewport)!;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-4">
        {/* Viewport toggle */}
        <div className="flex items-center gap-1">
          {VIEWPORTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setViewport(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewport === v.id
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {v.id === "desktop" && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
              )}
              {v.id === "tablet" && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
                </svg>
              )}
              {v.id === "mobile" && (
                <svg width="11" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
                </svg>
              )}
              {v.label}
              {v.width && viewport === v.id && (
                <span className="opacity-60">{v.width}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {headerRight && (
            <div className="text-xs text-gray-500">{headerRight}</div>
          )}
          <a
            href={newTabBase ? `${newTabBase}/preview${viewport !== "desktop" ? `?v=${viewport}` : ""}` : src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
            title="Open in new tab"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            new tab
          </a>
        </div>
      </div>

      {/* Frame area */}
      <div
        className="overflow-auto bg-gray-100"
        style={{ height }}
      >
        <div
          style={{
            width: activeViewport.width ?? "100%",
            margin: "0 auto",
            height: "100%",
            // Shadow to show the device boundary on narrow viewports
            boxShadow: activeViewport.width ? "0 0 0 1px #d1d5db, 0 4px 16px rgba(0,0,0,0.08)" : undefined,
          }}
        >
          <iframe
            src={src}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            title={title}
          />
        </div>
      </div>
    </div>
  );
}
