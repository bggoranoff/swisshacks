import type { CSSProperties } from "react";
import clsx from "clsx";
import type { ClientSummary } from "../../types/api";
import { Users, ChevronLeft, Search } from "lucide-react";
import { useState } from "react";

const AVATAR_COLORS: Record<string, string> = {
  schneider: "bg-six-red",
  huber: "bg-six-blue",
  raeber: "bg-six-red-dark",
  ammann: "bg-six-blue-bright",
};

const INITIALS: Record<string, string> = {
  schneider: "HS",
  huber: "MH",
  raeber: "ER",
  ammann: "JA",
};

const STRATEGY_STYLES: Record<string, string> = {
  Defensive: "bg-blue-900/50 text-blue-300 border border-blue-800/30",
  Balanced: "bg-amber-900/50 text-amber-300 border border-amber-800/30",
  Growth: "bg-green-900/50 text-green-300 border border-green-800/30",
};

interface SidebarProps {
  clients: ClientSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHome?: () => void;
  onClose?: () => void;
  loading: boolean;
  conflictCount?: number;
  style?: CSSProperties;
}

function SidebarSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <div className="h-10 w-10 rounded-full bg-slate-700 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-slate-700 animate-pulse" />
            <div className="h-5 w-16 rounded-full bg-slate-700 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Sidebar({ clients, selectedId, onSelect, onHome, onClose, loading, conflictCount, style }: SidebarProps) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients;
  return (
    <aside style={style} className="flex flex-col gap-1 p-4 bg-slate-900 border-r border-slate-700 overflow-y-auto shadow-lg shadow-black/20 h-screen">
      {/* Logo / branding + close */}
      <div className="flex items-center justify-between px-3 pb-3 mb-1">
        <button onClick={onHome} className="hover:opacity-75 transition-opacity">
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 368.02 102.05" className="h-4 w-auto" aria-label="SIX">
              <path fill="currentColor" className="text-six-red" d="M93.7,14.59C101.18,5.67,112.4,0,124.94,0h27.98v20.41h-27.98c-6.27,0-11.88,2.83-15.62,7.29l-50.1,59.76c-7.48,8.92-18.69,14.58-31.24,14.58H0V81.64h27.98c6.27,0,11.87-2.83,15.62-7.29L93.7,14.59z"/>
              <rect fill="currentColor" className="text-six-red" x="173.31" y="0" width="21.41" height="102.05"/>
              <path fill="currentColor" className="text-six-red" d="M274.33,14.59l17.24,20.57l17.24-20.57C316.29,5.67,327.51,0,340.05,0h27.97v20.41h-27.97c-6.27,0-11.88,2.83-15.62,7.29l-19.56,23.32l19.56,23.32c3.74,4.46,9.34,7.29,15.62,7.29h27.97v20.41h-27.97c-12.54,0-23.76-5.66-31.24-14.58L291.57,66.9l-17.24,20.56c-7.48,8.92-18.7,14.58-31.24,14.58h-27.98V81.64h27.98c6.27,0,11.87-2.83,15.61-7.29l19.55-23.32L258.7,27.7c-3.74-4.46-9.35-7.29-15.61-7.29h-27.98V0h27.98C255.62,0,266.85,5.67,274.33,14.59"/>
            </svg>
            <span className="text-xs font-normal tracking-tight text-slate-500">AI</span>
          </span>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            title="Close sidebar"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="border-t border-slate-700/60 mb-3" />
      <div className="flex items-center gap-2 mb-2 px-3">
        <Users className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Clients</span>
      </div>
      <div className="relative px-3 mb-3">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full h-8 bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-six-red transition-colors"
        />
      </div>
      {loading ? (
        <SidebarSkeleton />
      ) : (
        filtered.map((client) => (
          <button
            key={client.id}
            onClick={() => onSelect(client.id)}
            title={client.triggerEvent || client.description}
            className={clsx(
              "w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all duration-200 group",
              selectedId === client.id
                ? "bg-slate-800 border-l-2 border-six-red shadow-sm shadow-six-red/10"
                : "hover:bg-slate-800/70 border-l-2 border-transparent"
            )}
          >
            <div
              className={clsx(
                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 transition-transform duration-200 group-hover:scale-105",
                AVATAR_COLORS[client.id] ?? "bg-slate-600"
              )}
            >
              {INITIALS[client.id] ?? client.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={clsx(
                  "font-medium block break-words transition-colors",
                  selectedId === client.id ? "text-slate-100" : "text-slate-200 group-hover:text-slate-100"
                )}>
                  {client.name}
                </span>
                {selectedId === client.id && conflictCount != null && conflictCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-600 text-white ml-auto shrink-0 font-medium">
                    {conflictCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={clsx(
                    "text-xs px-2 py-0.5 rounded-full inline-block font-medium",
                    STRATEGY_STYLES[client.strategy] ?? "bg-slate-700 text-slate-300"
                  )}
                >
                  {client.strategy}
                </span>
                <span className="text-xs text-slate-500">
                  {client.crmEntryCount} notes
                </span>
              </div>
            </div>
          </button>
        ))
      )}
    </aside>
  );
}
