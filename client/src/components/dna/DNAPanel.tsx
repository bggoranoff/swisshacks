import { useState, useMemo } from "react";
import type { ClientDNA } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { ConfidenceBadge } from "../shared/ConfidenceBadge";
import { SkeletonBlock, SkeletonPills } from "../shared/SkeletonLoader";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { FadeIn } from "../shared/FadeIn";
import { Dna, ChevronDown, Clock } from "lucide-react";

interface DNAPanelProps {
  dna: ClientDNA | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  durationMs?: number | null;
}


export function DNAPanel({ dna, loading, error, onRetry, durationMs }: DNAPanelProps) {
  if (loading) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><SkeletonPills /><SkeletonBlock /></Card>;
  if (error) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><ErrorState message={error} onRetry={onRetry} /></Card>;
  if (!dna) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><EmptyState message="Select a client to view DNA profile" /></Card>;

  const [expandedTrait, setExpandedTrait] = useState<string | null>(null);

  const avgConfidence = (() => {
    const vals = Object.values(dna.traitConfidence || {});
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  })();

  const traitEvidence = (trait: string) =>
    (dna.evidence ?? []).filter(e =>
      e.trait.toLowerCase().includes(trait.toLowerCase()) ||
      trait.toLowerCase().includes(e.trait.toLowerCase())
    );

  const traitConfidence = dna.traitConfidence ?? {};

  const timelineData = useMemo(() => {
    if (!dna.evidence || dna.evidence.length === 0) return [];
    const byYear: Record<string, { trait: string; date: string; excerpt: string }[]> = {};
    dna.evidence.forEach(e => {
      const year = e.crmDate?.slice(0, 4) || "Unknown";
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push({ trait: e.trait, date: e.crmDate, excerpt: e.crmExcerpt });
    });
    return Object.entries(byYear).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dna.evidence]);

  function TraitPill({
    item,
    colorClass,
  }: {
    item: string;
    colorClass: string;
  }) {
    const evidence = traitEvidence(item);
    const isExpanded = expandedTrait === item;
    return (
      <div key={item}>
        <span className="inline-flex items-center gap-1.5">
          <button
            onClick={() => setExpandedTrait(isExpanded ? null : item)}
            className={`text-xs px-2.5 py-1 rounded-full ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}
          >
            {item}
            {evidence.length > 0 && (
              <span className="ml-1 opacity-60">📎</span>
            )}
          </button>
          {traitConfidence[item] != null && (
            <ConfidenceBadge score={traitConfidence[item]} />
          )}
        </span>
        {isExpanded && evidence.length > 0 && (
          <div className="mt-1 ml-2 mb-2">
            {evidence.map((e, j) => (
              <blockquote key={j} className="border-l-2 border-slate-600 pl-2 text-xs text-slate-400 italic my-1">
                "{e.crmExcerpt}"
                <span className="text-slate-500 block not-italic">{e.crmDate}</span>
              </blockquote>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <FadeIn>
      <div className="flex items-center justify-between mb-4">
        <CardTitle icon={Dna}>Client DNA</CardTitle>
        {durationMs != null && <span className="text-xs text-slate-600">{durationMs}ms</span>}
      </div>

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
                <TraitPill key={item} item={item} colorClass="bg-blue-900/50 text-blue-300" />
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
                <TraitPill key={item} item={item} colorClass="bg-cyan-900/50 text-cyan-300" />
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
                <TraitPill key={item} item={item} colorClass="bg-red-900/50 text-red-300" />
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
                <TraitPill key={item} item={item} colorClass="bg-green-900/50 text-green-300" />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* DNA Evolution Timeline */}
      {timelineData.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            DNA Evolution Timeline
          </p>
          <div className="relative pl-4">
            <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-slate-700" />
            {timelineData.map(([year, entries]) => (
              <div key={year} className="mb-4 relative">
                <div className="absolute -left-3 top-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-slate-800" />
                <p className="text-sm font-medium text-white ml-2">{year}</p>
                <div className="ml-2 mt-1 space-y-1">
                  {entries.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-xs text-slate-400">
                      <span className="text-blue-300">{e.trait}</span> — {e.excerpt?.slice(0, 60)}...
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
      </FadeIn>
    </Card>
  );
}
