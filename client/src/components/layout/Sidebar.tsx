import clsx from "clsx";
import type { ClientSummary } from "../../types/api";
import { Users } from "lucide-react";

const AVATAR_COLORS: Record<string, string> = {
  schneider: "bg-blue-600",
  huber: "bg-green-600",
  raeber: "bg-amber-600",
  ammann: "bg-purple-600",
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

export function Sidebar({ clients, selectedId, onSelect, loading }: SidebarProps) {
  return (
    <aside className="flex flex-col gap-1 p-4 bg-slate-900 border-r border-slate-700 overflow-y-auto shadow-lg shadow-black/20">
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
            className={clsx(
              "w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all duration-200 group",
              selectedId === client.id
                ? "bg-slate-800 border-l-2 border-blue-400 shadow-sm shadow-blue-500/10"
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
            <div className="flex flex-col min-w-0">
              <span className={clsx(
                "font-medium block truncate transition-colors",
                selectedId === client.id ? "text-white" : "text-slate-200 group-hover:text-white"
              )}>
                {client.name}
              </span>
              <span
                className={clsx(
                  "text-xs px-2 py-0.5 rounded-full inline-block mt-1 font-medium",
                  STRATEGY_STYLES[client.strategy] ?? "bg-slate-700 text-slate-300"
                )}
              >
                {client.strategy}
              </span>
            </div>
          </button>
        ))
      )}
    </aside>
  );
}
