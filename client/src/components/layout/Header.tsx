import clsx from "clsx";
import { ClipboardList, Keyboard } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusDot } from "../shared/StatusDot";
import { useTheme } from "../../ThemeContext";

interface HeaderProps {
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

export function Header({ onAuditClick }: HeaderProps) {
  const { theme, toggle } = useTheme();
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

  const allConnected = status.six && status.news && status.llm;

  return (
    <header className="h-14 px-6 flex items-center justify-between bg-slate-800 border-b border-slate-700 relative after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-six-red/40 after:to-transparent">
      <div />
      <div className="flex items-center gap-4">
        {onAuditClick && (
          <button
            onClick={onAuditClick}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Audit
          </button>
        )}
        <button
          onClick={toggle}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
            {theme === "dark" ? (
              <path d="M10 2 A8 8 0 0 0 10 18 Z" fill="currentColor" />
            ) : (
              <path d="M10 2 A8 8 0 0 1 10 18 Z" fill="currentColor" />
            )}
          </svg>
        </button>
        <div className="relative group">
          <button className="text-slate-500 hover:text-slate-300 transition-colors">
            <Keyboard className="h-4 w-4" />
          </button>
          <div className="absolute right-0 top-8 w-48 bg-slate-700 border border-slate-600 rounded p-3 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            <p className="text-xs font-medium text-slate-300 mb-2">Keyboard Shortcuts</p>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between"><span>1-4</span><span>Select client</span></div>
              <div className="flex justify-between"><span>A</span><span>Audit log</span></div>
              <div className="flex justify-between"><span>G</span><span>Generate advisory</span></div>
              <div className="flex justify-between"><span>Esc</span><span>Close drawer</span></div>
            </div>
          </div>
        </div>
        <div className="relative group">
          <button className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 hover:bg-slate-700 transition-colors">
            <span className="relative flex h-2 w-2">
              {allConnected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-30" />
              )}
              <span
                className={clsx(
                  "relative inline-flex h-2 w-2 rounded-full",
                  allConnected ? "bg-green-400" : "bg-red-400",
                )}
              />
            </span>
            <span className="text-xs text-slate-300">
              {allConnected ? "Connected" : "Not connected"}
            </span>
          </button>
          <div className="absolute right-0 top-8 w-52 bg-slate-700 border border-slate-600 rounded p-3 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            <p className="text-xs font-medium text-slate-300 mb-2">Integrations</p>
            <div className="space-y-1.5">
              <StatusDot ok={status.six} label="SIX" />
              <StatusDot ok={status.news} label="News" />
              <StatusDot ok={status.llm} label="LLM" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
