import type { ClientDNA } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { ConfidenceBadge } from "../shared/ConfidenceBadge";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { Dna, ChevronDown } from "lucide-react";

interface DNAPanelProps {
  dna: ClientDNA | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const CATEGORIES: {
  key: keyof Pick<ClientDNA, "values" | "lifeEvents" | "businessContext" | "riskSensitivities" | "personalPriorities">;
  label: string;
  style: string;
}[] = [
  { key: "values", label: "Values", style: "bg-blue-900/50 text-blue-300" },
  { key: "lifeEvents", label: "Life Events", style: "bg-purple-900/50 text-purple-300" },
  { key: "businessContext", label: "Business Context", style: "bg-cyan-900/50 text-cyan-300" },
  { key: "riskSensitivities", label: "Risk Sensitivities", style: "bg-red-900/50 text-red-300" },
  { key: "personalPriorities", label: "Personal Priorities", style: "bg-green-900/50 text-green-300" },
];

export function DNAPanel({ dna, loading, error, onRetry }: DNAPanelProps) {
  if (loading) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><LoadingSpinner /></Card>;
  if (error) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><ErrorState message={error} onRetry={onRetry} /></Card>;
  if (!dna) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><EmptyState message="Select a client to view DNA profile" /></Card>;

  const avgConfidence = (() => {
    const vals = Object.values(dna.traitConfidence || {});
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  })();

  return (
    <Card>
      <CardTitle icon={Dna}>Client DNA</CardTitle>

      {/* Summary */}
      <p className="text-sm text-slate-300 mb-4 leading-relaxed">{dna.summary}</p>

      {/* Communication Style + Confidence */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-slate-400">Style</span>
        <span className="text-sm font-medium px-3 py-1 rounded-full bg-slate-700 text-white capitalize">
          {dna.communicationStyle}
        </span>
        <ConfidenceBadge score={avgConfidence} />
      </div>

      {/* All categories */}
      <div className="space-y-3">
        {CATEGORIES.map(({ key, label, style }) => {
          const items = dna[key];
          if (!items || items.length === 0) return null;
          return (
            <div key={key}>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${style}`}>{item}</span>
                    {dna.traitConfidence?.[item] != null && (
                      <ConfidenceBadge score={dna.traitConfidence[item]} />
                    )}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Evidence citations */}
      {dna.evidence && dna.evidence.length > 0 && (
        <details className="mt-4 border-t border-slate-700 pt-3">
          <summary className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
            <ChevronDown className="h-3 w-3" />
            Evidence ({dna.evidence.length} citations)
          </summary>
          <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
            {dna.evidence.map((ev, i) => (
              <blockquote key={i} className="border-l-2 border-slate-600 pl-3 text-sm text-slate-300 italic">
                "{ev.crmExcerpt}"
                <span className="text-xs text-slate-500 block mt-1 not-italic">
                  {ev.crmDate} — <span className="text-slate-400">{ev.trait}</span>
                </span>
              </blockquote>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
}
