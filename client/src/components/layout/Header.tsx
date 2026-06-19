import { Activity, ClipboardList, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusDot } from "../shared/StatusDot";

interface HeaderProps {
  onDemo?: () => void;
  onTracesClick?: () => void;
  onAuditClick?: () => void;
}

interface ProbeStatus {
  six: boolean;
  news: boolean;
  llm: boolean;
}

const PROBE_LABEL_MAP: Record<string, keyof ProbeStatus> = {
  "SIX Financial Data (MCP)": "six",
  "Event Registry (newsapi.ai)": "news",
  "Phoeniqs LLM API": "llm",
};

const DEFAULT_STATUS: ProbeStatus = { six: false, news: false, llm: false };
const ALL_OK: ProbeStatus = { six: true, news: true, llm: true };

export function Header({ onDemo, onTracesClick, onAuditClick }: HeaderProps) {
  const [status, setStatus] = useState<ProbeStatus>(ALL_OK);

  useEffect(() => {
    fetch("/api/integrations")
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((body) => {
        if (!body?.success || !Array.isArray(body?.data?.probes)) {
          setStatus(DEFAULT_STATUS);
          return;
        }
        const next: ProbeStatus = { six: false, news: false, llm: false };
        for (const probe of body.data.probes) {
          const key = PROBE_LABEL_MAP[probe.name];
          if (key) next[key] = Boolean(probe.ok);
        }
        setStatus(next);
      })
      .catch(() => setStatus(DEFAULT_STATUS));
  }, []);

  return (
    <header className="h-14 px-6 flex items-center justify-between bg-slate-800 border-b border-slate-700 relative after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-blue-500/40 after:to-transparent">
      <h1 className="text-lg font-semibold text-white tracking-tight">
        <span className="text-blue-400">Wealth</span>Advisor
        <span className="text-slate-500 font-normal ml-1.5 text-sm">AI</span>
      </h1>
      <div className="flex items-center gap-4">
        {onTracesClick && (
          <button
            onClick={onTracesClick}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Activity className="h-3.5 w-3.5" />
            Traces
          </button>
        )}
        {onAuditClick && (
          <button
            onClick={onAuditClick}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Audit
          </button>
        )}
        {onDemo && (
          <button
            onClick={onDemo}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            Demo
          </button>
        )}
        <div className="flex items-center gap-3">
          <StatusDot ok={status.six} label="SIX" />
          <StatusDot ok={status.news} label="News" />
          <StatusDot ok={status.llm} label="LLM" />
        </div>
      </div>
    </header>
  );
}
