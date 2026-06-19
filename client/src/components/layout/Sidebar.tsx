import clsx from "clsx";
import type { ClientSummary } from "../../types/api";
import { LoadingSpinner } from "../shared/LoadingSpinner";

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
  Defensive: "bg-blue-900/50 text-blue-300",
  Balanced: "bg-amber-900/50 text-amber-300",
  Growth: "bg-green-900/50 text-green-300",
};

interface SidebarProps {
  clients: ClientSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export function Sidebar({ clients, selectedId, onSelect, loading }: SidebarProps) {
  return (
    <aside className="flex flex-col gap-2 p-4 bg-slate-900 border-r border-slate-700 overflow-y-auto">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-3">Clients</span>
      {loading ? (
        <LoadingSpinner />
      ) : (
        clients.map((client) => (
          <button
            key={client.id}
            onClick={() => onSelect(client.id)}
            className={clsx(
              "w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all duration-200",
              selectedId === client.id
                ? "bg-slate-800 border-l-2 border-blue-400"
                : "hover:bg-slate-800"
            )}
          >
            <div
              className={clsx(
                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0",
                AVATAR_COLORS[client.id] ?? "bg-slate-600"
              )}
            >
              {INITIALS[client.id] ?? client.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-white block truncate">{client.name}</span>
              <span
                className={clsx(
                  "text-xs px-2 py-0.5 rounded-full inline-block mt-1",
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
