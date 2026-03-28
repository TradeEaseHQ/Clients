"use client";

import { useState } from "react";

const TEMPLATES = [
  {
    label: "Favor ask",
    subject: "quick favor",
    message:
      "Hey — can you do me a quick favor? Reply to this and let me know if it landed in your inbox or promotions. Trying to set up my new business email. Thanks",
  },
  {
    label: "Check-in",
    subject: "checking in",
    message:
      "Hey, hope you're doing well! Just testing out a new email setup for my business — let me know if this reaches you okay. Would love a quick reply. Thanks!",
  },
  {
    label: "Inbox test",
    subject: "email test",
    message:
      "Hi! Setting up email for my new business and testing deliverability. If this landed in spam or promotions, would you mind dragging it to your primary inbox? Really appreciate it.",
  },
];

export default function WarmupPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [sentLog, setSentLog] = useState<{ to: string; subject: string; time: string }[]>([]);

  function applyTemplate(t: (typeof TEMPLATES)[number]) {
    setSubject(t.subject);
    setMessage(t.message);
  }

  async function send() {
    if (!to || !subject || !message) return;
    setStatus("sending");
    setErrorMsg("");

    const res = await fetch("/api/warmup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, message }),
    });

    if (res.ok) {
      setStatus("sent");
      setSentLog((prev) => [
        { to, subject, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);
      setTo("");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      const data = await res.json();
      setErrorMsg(data.error || "Unknown error");
      setStatus("error");
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Email Warm-up</h1>
      <p className="text-sm text-gray-500 mb-6">
        Send from <code className="bg-gray-100 px-1 rounded">ben@mail.tradeeasehq.com</code> · replies go to{" "}
        <code className="bg-gray-100 px-1 rounded">ben@tradeeasehq.com</code>
      </p>

      {/* Templates */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            onClick={() => applyTemplate(t)}
            className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="friend@gmail.com"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="quick favor"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Keep it personal and conversational…"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          onClick={send}
          disabled={status === "sending" || !to || !subject || !message}
          className="w-full py-2.5 rounded-md text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          {status === "sending"
            ? "Sending…"
            : status === "sent"
            ? "✓ Sent!"
            : "Send Email"}
        </button>

        {status === "error" && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}
      </div>

      {/* Sent log */}
      {sentLog.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Sent this session</h2>
          <div className="space-y-1">
            {sentLog.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-gray-500 py-1 border-b border-gray-100">
                <span>{entry.to}</span>
                <span className="text-gray-400">{entry.subject} · {entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
