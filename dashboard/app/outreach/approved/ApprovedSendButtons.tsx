"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  draftId: string;
  hasEmail: boolean;
}

export default function ApprovedSendButtons({ draftId, hasEmail }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [unapproving, setUnapproving] = useState(false);

  async function handleUnapprove() {
    setUnapproving(true);
    await fetch(`/api/outreach/${draftId}/unapprove`, { method: "POST" });
    router.refresh();
  }

  async function handleSend() {
    if (!hasEmail) return;
    setState("sending");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/outreach/${draftId}/send`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setState("sent");
      // Refresh the server component data after a short delay
      setTimeout(() => router.refresh(), 800);
    } catch (e: any) {
      setErrorMsg(e.message || "Send failed");
      setState("error");
    }
  }

  const unapproveBtn = (
    <button
      onClick={handleUnapprove}
      disabled={unapproving}
      className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
      title="Move back to review queue"
    >
      Unapprove
    </button>
  );

  if (!hasEmail) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-500">no email on file</span>
        {unapproveBtn}
      </div>
    );
  }

  if (state === "sent") {
    return <span className="text-xs text-green-600 font-semibold">Sent!</span>;
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600" title={errorMsg}>
          Error — {errorMsg.slice(0, 40)}
        </span>
        {unapproveBtn}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSend}
        disabled={state === "sending"}
        className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Send Now"}
      </button>
      {unapproveBtn}
    </div>
  );
}
