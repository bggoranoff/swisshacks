import clsx from "clsx";
import type { ClientSummary } from "../../types/api";
import { Users } from "lucide-react";

const AVATAR_COLORS: Record<string, string> = {
  schneider: "bg-six-orange",
  huber: "bg-six-blue",
  raeber: "bg-six-orange-dark",
  ammann: "bg-six-blue-bright",
};

const INITIALS: Record<string, string> = {
  schneider: "MS",
  huber: "PH",
  raeber: "RR",
  ammann: "CA",
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
  loading: boolean;
  conflictCount?: number;
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

export function Sidebar({ clients, selectedId, onSelect, loading, conflictCount }: SidebarProps) {
  return (
    <aside className="flex flex-col gap-1 p-4 bg-slate-900 border-r border-slate-700 overflow-y-auto shadow-lg shadow-black/20">
      {/* Logo / branding */}
      <div className="px-3 pb-3 mb-1">
        <span className="text-sm font-bold tracking-tight text-six-orange">SIX</span>
        <span className="text-sm font-normal tracking-tight text-slate-500 ml-1">AI</span>
      </div>
      <div className="border-t border-slate-700/60 mb-3" />
      <div className="flex items-center gap-2 mb-3 px-3">
        <Users className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Clients</span>
      </div>
      {loading ? (
        <SidebarSkeleton />
      ) : (
        clients.map((client) => (
          <button
            key={client.id}
            onClick={() => onSelect(client.id)}
            title={client.triggerEvent}
            className={clsx(
              "w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all duration-200 group",
              selectedId === client.id
                ? "bg-slate-800 border-l-2 border-six-orange shadow-sm shadow-six-orange/10"
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
                  "font-medium block truncate transition-colors",
                  selectedId === client.id ? "text-white" : "text-slate-200 group-hover:text-white"
                )}>
                  {client.name}
                </span>
                {selectedId === client.id && conflictCount != null && conflictCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-600 text-white ml-auto shrink-0 font-medium">
                    {conflictCount}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 block truncate leading-snug mt-0.5">
                {client.description}
              </span>
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
