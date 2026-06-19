import type { ClientDNA } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { ConfidenceBadge } from "../shared/ConfidenceBadge";
import { SkeletonBlock } from "../shared/LoadingSpinner";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { Dna, ChevronDown } from "lucide-react";

interface DNAPanelProps {
  dna: ClientDNA | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}


export function DNAPanel({ dna, loading, error, onRetry }: DNAPanelProps) {
  if (loading) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><SkeletonBlock /></Card>;
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
      <div className="space-y-4">

        {/* Values */}
        {dna.values && dna.values.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Values</p>
            <div className="flex flex-wrap gap-1.5">
              {dna.values.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-900/50 text-blue-300">{item}</span>
                  {dna.traitConfidence?.[item] != null && (
                    <ConfidenceBadge score={dna.traitConfidence[item]} />
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Life Events — vertical timeline */}
        {dna.lifeEvents && dna.lifeEvents.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Life Events</p>
            <div className="flex flex-col gap-0">
              {dna.lifeEvents.map((item, idx) => (
                <div key={item} className="flex items-stretch gap-3">
                  {/* Dot + vertical line */}
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-purple-400 mt-1 shrink-0" />
                    {idx < dna.lifeEvents!.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-700 mt-1" />
                    )}
                  </div>
                  {/* Text */}
                  <p className="text-sm text-slate-300 pb-3">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Context — pills */}
        {dna.businessContext && dna.businessContext.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Business Context</p>
            <div className="flex flex-wrap gap-1.5">
              {dna.businessContext.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-900/50 text-cyan-300">{item}</span>
                  {dna.traitConfidence?.[item] != null && (
                    <ConfidenceBadge score={dna.traitConfidence[item]} />
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Risk Sensitivities — pills */}
        {dna.riskSensitivities && dna.riskSensitivities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Risk Sensitivities</p>
            <div className="flex flex-wrap gap-1.5">
              {dna.riskSensitivities.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-red-900/50 text-red-300">{item}</span>
                  {dna.traitConfidence?.[item] != null && (
                    <ConfidenceBadge score={dna.traitConfidence[item]} />
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Personal Priorities — pills */}
        {dna.personalPriorities && dna.personalPriorities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Personal Priorities</p>
            <div className="flex flex-wrap gap-1.5">
              {dna.personalPriorities.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-green-900/50 text-green-300">{item}</span>
                  {dna.traitConfidence?.[item] != null && (
                    <ConfidenceBadge score={dna.traitConfidence[item]} />
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

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
