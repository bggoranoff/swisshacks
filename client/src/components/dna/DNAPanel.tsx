import { useMemo } from "react";
// drawer state is lifted to App.tsx
import type { ClientDNA } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { SkeletonBlock, SkeletonPills } from "../shared/SkeletonLoader";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { FadeIn } from "../shared/FadeIn";
import { Dna, ChevronDown, ChevronRight, Clock } from "lucide-react";

interface DNAPanelProps {
  dna: ClientDNA | null;
  clientId: string;
  onOpenDrawer: (trait: string, category: string) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  durationMs?: number | null;
  fetchedAt?: string | null;
}


export function DNAPanel({ dna, onOpenDrawer, loading, error, onRetry, durationMs, fetchedAt }: DNAPanelProps) {
  if (loading) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><SkeletonPills /><SkeletonBlock /></Card>;
  if (error) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><ErrorState message={error} onRetry={onRetry} /></Card>;
  if (!dna) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><EmptyState message="Select a client to view DNA profile" /></Card>;

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

  return (
    <Card>
      <FadeIn>
      <div className="flex items-center justify-between mb-4">
        <CardTitle icon={Dna}>Client DNA</CardTitle>
        <span className="flex items-center gap-2">
          {fetchedAt && <span className="text-xs text-slate-600">Updated {fetchedAt}</span>}
          {durationMs != null && <span className="text-xs text-slate-600">{durationMs}ms</span>}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-slate-300 mb-4 leading-relaxed">{dna.summary}</p>

      {/* Communication Style */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-slate-400">Style</span>
        <span className="text-sm font-medium px-3 py-1 rounded-full bg-slate-700 text-white capitalize">
          {dna.communicationStyle}
        </span>
      </div>

      {/* All categories — scrollable list boxes */}
      <div className="space-y-4">

        {/* Client Values */}
        {dna.values && dna.values.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Client Values</p>
            <div className="relative">
              <div className="h-40 overflow-y-auto hide-scrollbar bg-slate-800/50 border border-slate-700 rounded-lg">
                {dna.values.map((item, idx) => (
                  <button
                    key={item}
                    onClick={() => onOpenDrawer(item, "values")}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-700/60 transition-colors ${idx < dna.values!.length - 1 ? "border-b border-slate-700/50" : ""}`}
                  >
                    <span className="capitalize">{item}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-b-lg bg-gradient-to-t from-slate-800/80 to-transparent" />
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
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-purple-400 mt-1 shrink-0" />
                    {idx < dna.lifeEvents!.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-700 mt-1" />
                    )}
                  </div>
                  <p className="text-sm text-slate-300 pb-3">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Context */}
        {dna.businessContext && dna.businessContext.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Business Context</p>
            <div className="relative">
              <div className="h-40 overflow-y-auto hide-scrollbar bg-slate-800/50 border border-slate-700 rounded-lg">
                {dna.businessContext.map((item, idx) => (
                  <button
                    key={item}
                    onClick={() => onOpenDrawer(item, "businessContext")}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-700/60 transition-colors ${idx < dna.businessContext!.length - 1 ? "border-b border-slate-700/50" : ""}`}
                  >
                    <span className="capitalize">{item}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-b-lg bg-gradient-to-t from-slate-800/80 to-transparent" />
            </div>
          </div>
        )}

        {/* Risk Sensitivities */}
        {dna.riskSensitivities && dna.riskSensitivities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Risk Sensitivities</p>
            <div className="relative">
              <div className="h-40 overflow-y-auto hide-scrollbar bg-slate-800/50 border border-slate-700 rounded-lg">
                {dna.riskSensitivities.map((item, idx) => (
                  <button
                    key={item}
                    onClick={() => onOpenDrawer(item, "riskSensitivities")}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-700/60 transition-colors ${idx < dna.riskSensitivities!.length - 1 ? "border-b border-slate-700/50" : ""}`}
                  >
                    <span className="capitalize">{item}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-b-lg bg-gradient-to-t from-slate-800/80 to-transparent" />
            </div>
          </div>
        )}

        {/* Personal Priorities */}
        {dna.personalPriorities && dna.personalPriorities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Personal Priorities</p>
            <div className="relative">
              <div className="h-40 overflow-y-auto hide-scrollbar bg-slate-800/50 border border-slate-700 rounded-lg">
                {dna.personalPriorities.map((item, idx) => (
                  <button
                    key={item}
                    onClick={() => onOpenDrawer(item, "personalPriorities")}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-700/60 transition-colors ${idx < dna.personalPriorities!.length - 1 ? "border-b border-slate-700/50" : ""}`}
                  >
                    <span className="capitalize">{item}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-b-lg bg-gradient-to-t from-slate-800/80 to-transparent" />
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
                <div className="absolute -left-3 top-0.5 h-2.5 w-2.5 rounded-full bg-six-orange border-2 border-slate-800" />
                <p className="text-sm font-medium text-white ml-2">{year}</p>
                <div className="ml-2 mt-1 space-y-1">
                  {entries.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-xs text-slate-400">
                      <span className="text-six-orange">{e.trait}</span> — {e.excerpt?.slice(0, 60)}...
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
