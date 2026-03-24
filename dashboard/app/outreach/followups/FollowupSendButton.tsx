"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  draftId: string;
  hasEmail: boolean;
}

export default function FollowupSendButton({ draftId, hasEmail }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
      setTimeout(() => router.refresh(), 800);
    } catch (e: any) {
      setErrorMsg(e.message || "Send failed");
      setState("error");
    }
  }

  if (!hasEmail) {
    return <span className="text-xs text-red-500">no email on file</span>;
  }

  if (state === "sent") {
    return <span className="text-xs text-green-600 font-semibold">Sent!</span>;
  }

  if (state === "error") {
    return (
      <span className="text-xs text-red-600" title={errorMsg}>
        Error — {errorMsg.slice(0, 40)}
      </span>
    );
  }

  return (
    <button
      onClick={handleSend}
      disabled={state === "sending"}
      className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
    >
      {state === "sending" ? "Sending…" : "Send Follow-up"}
    </button>
  );
}
