import { useEffect, useState } from "react";
import { X, ClipboardList, Loader2, AlertTriangle } from "lucide-react";
import clsx from "clsx";

// ── Types ────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id?: string | number;
  timestamp: string;       // ISO
  agent: string;           // e.g. "crm-agent"
  action: string;
  clientId?: string | null;
  input?: string | null;
  output?: string | null;
  duration?: number | null; // ms
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

function truncate(text: string | null | undefined, max = 120): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// ── Agent badge colour map ────────────────────────────────────────────────────

const AGENT_COLOURS: Record<string, string> = {
  "crm-agent":     "bg-blue-900/60 text-blue-300",
  "message-agent": "bg-amber-900/60 text-amber-300",
  "news-agent":    "bg-purple-900/60 text-purple-300",
};

const FALLBACK_COLOUR = "bg-slate-700/60 text-slate-300";

function agentColour(agent: string): string {
  // Also try to match by suffix in case agent has a prefix
  for (const key of Object.keys(AGENT_COLOURS)) {
    if (agent === key || agent.endsWith(key) || agent.includes(key)) {
      return AGENT_COLOURS[key];
    }
  }
  return FALLBACK_COLOUR;
}

// ── Entry card ────────────────────────────────────────────────────────────────

function AuditEntryCard({ entry }: { entry: AuditEntry }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-slate-700/40 border border-slate-700 space-y-1.5">
      {/* Row 1: timestamp + agent badge + action */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-mono flex-shrink-0">
          {formatTime(entry.timestamp)}
        </span>
        <span
          className={clsx(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0",
            agentColour(entry.agent)
          )}
        >
          {entry.agent}
        </span>
        <span className="text-sm text-slate-200 font-medium truncate">
          {entry.action}
        </span>
      </div>

      {/* Row 2: client ID (if present) */}
      {entry.clientId && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">Client</span>
          <span className="text-xs text-slate-300 font-mono">{entry.clientId}</span>
        </div>
      )}

      {/* Row 3: input/output summary */}
      {(entry.input || entry.output) && (
        <div className="space-y-0.5">
          {entry.input && (
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="text-slate-600 font-semibold mr-1">in:</span>
              {truncate(entry.input)}
            </p>
          )}
          {entry.output && (
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="text-slate-600 font-semibold mr-1">out:</span>
              {truncate(entry.output)}
            </p>
          )}
        </div>
      )}

      {/* Row 4: duration */}
      {entry.duration != null && (
        <div className="text-xs text-slate-600">
          {Math.round(entry.duration)} ms
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuditDrawer({ isOpen, onClose }: AuditDrawerProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fetchAudit() {
    setLoading(true);
    setError(null);
    fetch("/api/audit")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: { success?: boolean; data?: AuditEntry[] } | AuditEntry[]) => {
        // Support both wrapped { data: [...] } and bare array responses
        const list = Array.isArray(json)
          ? json
          : Array.isArray((json as { data?: AuditEntry[] }).data)
          ? (json as { data: AuditEntry[] }).data
          : [];
        setEntries(list);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  // Fetch whenever the drawer opens
  useEffect(() => {
    if (!isOpen) return;
    fetchAudit();
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className="fixed inset-y-0 right-0 w-[520px] bg-slate-800 border-l border-slate-700 shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Audit Log"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-100 tracking-wide">Audit Log</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            aria-label="Close audit log drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 py-8">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={fetchAudit}
                className="text-xs text-six-orange hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <p className="text-sm text-slate-500 italic text-center py-8">
              No audit entries found.
            </p>
          )}

          {!loading && !error && entries.map((entry, idx) => (
            <AuditEntryCard
              key={entry.id ?? `${entry.timestamp}-${idx}`}
              entry={entry}
            />
          ))}
        </div>
      </aside>
    </>
  );
}
