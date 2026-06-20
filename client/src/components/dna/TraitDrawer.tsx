import { useEffect, useState } from "react";
import { X } from "lucide-react";

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

  const traitEvidence = evidence.filter(
    (e) =>
      e.trait.toLowerCase().includes((trait || "").toLowerCase()) ||
      (trait || "").toLowerCase().includes(e.trait.toLowerCase())
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-96 z-50 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between p-5 border-b border-slate-700 shrink-0">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              {category ? (CATEGORY_LABELS[category] ?? category) : ""}
            </p>
            <h3 className="text-base font-semibold text-white capitalize">{trait}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors mt-0.5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
              Why this matters to client
            </p>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="h-3 w-3 rounded-full border-2 border-slate-600 border-t-six-orange animate-spin inline-block" />
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
                  <div
                    key={i}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-3"
                  >
                    <p className="text-xs text-slate-500 mb-1">{e.crmDate}</p>
                    <p className="text-sm text-slate-300 italic">"{e.crmExcerpt}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
