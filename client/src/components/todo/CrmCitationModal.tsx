import { useEffect, useRef } from "react";
import { X, FileText } from "lucide-react";
import type { CrmLogEntry } from "../../types/api";

export interface CrmCitation {
  trait: string;
  crmDate: string;
  crmExcerpt: string;
  entry?: CrmLogEntry;
}

function formatCrmDate(citation: CrmCitation): string {
  // Prefer the matched CRM row's real date; otherwise convert the (LLM-attached)
  // Excel serial if it looks numeric, else fall back to the raw label.
  let iso = citation.entry?.date;
  if (!iso && /^\d+(\.\d+)?$/.test((citation.crmDate || "").trim())) {
    const serial = Number(citation.crmDate);
    iso = new Date(Math.round((serial - 25569) * 86400000)).toISOString();
  }
  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
    }
  }
  return citation.crmDate || "CRM";
}

export function CrmCitationModal({ citation, onClose }: { citation: CrmCitation; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const note = citation.entry?.note || citation.crmExcerpt;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50"
      onClick={e => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 shadow-2xl rounded-lg flex flex-col max-h-[80vh]">
        <div className="flex items-start justify-between p-5 border-b border-slate-700 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              CRM Log Entry
            </p>
            <h3 className="text-base font-semibold text-white">{formatCrmDate(citation)}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors mt-0.5 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-4">
          {citation.entry && (citation.entry.medium || citation.entry.rmName || citation.entry.clientContact) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {citation.entry.medium && (
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-1 text-slate-300">
                  {citation.entry.medium}
                </span>
              )}
              {citation.entry.rmName && (
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-1 text-slate-400">
                  RM: {citation.entry.rmName}
                </span>
              )}
              {citation.entry.clientContact && (
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-1 text-slate-400">
                  Contact: {citation.entry.clientContact}
                </span>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Note</p>
            <blockquote className="border-l-2 border-six-red/50 pl-3 text-sm text-slate-300 leading-relaxed italic">
              "{note}"
            </blockquote>
          </div>

          <p className="text-xs text-slate-500">
            Linked trait: <span className="text-slate-300">{citation.trait}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
