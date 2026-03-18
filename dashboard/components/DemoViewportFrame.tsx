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
  /** Extra content to render in the header bar (e.g. "Open in new tab" link) */
  headerRight?: React.ReactNode;
}

export default function DemoViewportFrame({
  src,
  height = 560,
  title = "Demo preview",
  headerRight,
}: Props) {
  const [viewport, setViewport] = useState<Viewport>("desktop");

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

        {headerRight && (
          <div className="text-xs text-gray-500">{headerRight}</div>
        )}
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
