import { useState } from "react";
import { Check, Copy, Download, Loader2, Mail, Pencil, RefreshCw } from "lucide-react";
import type { AdvisoryMessage } from "../../types/api";

interface DraftEmailProps {
  clientId: string;
  clientName: string;
  alertId?: string;
  language?: string;
}

export function DraftEmail({ clientId, clientName, alertId, language }: DraftEmailProps) {
  const [advisory, setAdvisory] = useState<AdvisoryMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (alertId) payload.alertId = alertId;
      if (language) payload.language = language;
      const res = await fetch(`/api/clients/${clientId}/advisory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        const msg: AdvisoryMessage = json.data;
        setAdvisory(msg);
        setSubject(msg.subject);
        setBody(msg.body);
        setIsEditing(false);
      } else {
        setError(json.error || "Failed to generate email");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const content = `Subject: ${subject}\nTo: ${clientName}\n\n${body}\n\n---\n${advisory?.disclaimer ?? ""}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-${clientId}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!advisory && !loading) {
    return (
      <button
        onClick={generate}
        className="inline-flex items-center gap-2 rounded-lg border border-six-red/40 bg-six-red/10 px-3 py-2 text-xs font-medium text-six-red transition-colors hover:bg-six-red/20"
      >
        <Mail className="h-4 w-4" />
        Draft email to {clientName}
        {error && <span className="ml-1 text-red-300">· retry</span>}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-3 text-xs text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin text-six-red" />
        Drafting personalised email…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase text-slate-400">
          <Mail className="h-3.5 w-3.5 text-six-red" />
          Email to {clientName}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsEditing(v => !v)}
            className="inline-flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-slate-400 hover:text-slate-50"
          >
            <Pencil className="h-3 w-3" />
            {isEditing ? "Done" : "Edit"}
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-slate-400 hover:text-slate-50"
          >
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-slate-400 hover:text-slate-50"
          >
            <Download className="h-3 w-3" />
            Download
          </button>
          <button
            onClick={generate}
            title="Regenerate"
            className="inline-flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-slate-400 hover:text-slate-50"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="mb-2 w-full rounded border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-sm font-medium text-slate-50 outline-none focus:border-six-red/60"
        />
      ) : (
        <p className="mb-2 text-sm font-semibold text-slate-50">{subject}</p>
      )}

      {isEditing ? (
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={12}
          className="w-full resize-y rounded border border-slate-600 bg-slate-950/60 px-2 py-2 text-sm leading-6 text-slate-200 outline-none focus:border-six-red/60"
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{body}</p>
      )}

      {advisory?.disclaimer && (
        <p className="mt-2 border-t border-slate-700/60 pt-2 text-[11px] leading-4 text-slate-500">{advisory.disclaimer}</p>
      )}
    </div>
  );
}
