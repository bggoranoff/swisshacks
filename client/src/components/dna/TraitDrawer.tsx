import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";

interface EvidenceItem {
  trait: string;
  crmDate: string;
  crmExcerpt: string;
}

interface TraitDrawerProps {
  open: boolean;
  trait: string | null;
  category: string | null;
  evidence: EvidenceItem[];
  clientId: string;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  values: "Client Value",
  businessContext: "Business Context",
  riskSensitivities: "Risk Sensitivity",
  personalPriorities: "Personal Priority",
};

export function TraitDrawer({ open, trait, category, evidence, clientId, onClose }: TraitDrawerProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !trait || !clientId) return;
    setSummary(null);
    setFetchError(null);
    setLoading(true);

    const relevantEvidence = evidence.filter(
      (e) =>
        e.trait.toLowerCase().includes(trait.toLowerCase()) ||
        trait.toLowerCase().includes(e.trait.toLowerCase())
    );

    fetch(`/api/clients/${clientId}/trait-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trait, category, evidence: relevantEvidence }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setSummary(json.data.summary);
        } else {
          setFetchError(json.error || "Failed to load summary");
        }
      })
      .catch(() => setFetchError("Network error"))
      .finally(() => setLoading(false));
  }, [open, trait, clientId]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const traitEvidence = evidence.filter(
    (e) =>
      e.trait.toLowerCase().includes((trait || "").toLowerCase()) ||
      (trait || "").toLowerCase().includes(e.trait.toLowerCase())
  );

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 shadow-2xl rounded-lg flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-700 shrink-0">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              {category ? (CATEGORY_LABELS[category] ?? category) : ""}
            </p>
            <h3 className="text-base font-semibold text-white capitalize">{trait}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors mt-0.5 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-6">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
              Why this matters to client
            </p>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating insight…
              </div>
            )}
            {fetchError && !loading && (
              <p className="text-sm text-red-400">{fetchError}</p>
            )}
            {summary && !loading && (
              <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
              CRM Sources
            </p>
            {traitEvidence.length === 0 ? (
              <p className="text-sm text-slate-500">No CRM sources found for this trait.</p>
            ) : (
              <div className="space-y-2">
                {traitEvidence.map((e, i) => (
                  <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">{e.crmDate}</p>
                    <p className="text-sm text-slate-300 italic">"{e.crmExcerpt}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
