import React from "react";
import type { AdvisoryMessage } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { ArrowLeftRight, X, Building2, Sparkles, ChevronRight } from "lucide-react";

interface CompareViewProps {
  generic: AdvisoryMessage;
  personalised: AdvisoryMessage;
  onClose: () => void;
}

const toneStyles: Record<string, { badge: string }> = {
  "data-driven": { badge: "bg-blue-900/50 text-blue-300 border border-blue-800/60" },
  "values-led": { badge: "bg-purple-900/50 text-purple-300 border border-purple-800/60" },
  balanced: { badge: "bg-amber-900/50 text-amber-300 border border-amber-800/60" },
};

function highlightPersonalRefs(text: string): React.JSX.Element {
  const paragraphs = text.split("\n").filter(Boolean);
  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i} className="mb-2 last:mb-0 leading-relaxed">
          {para}
        </p>
      ))}
    </>
  );
}

export function CompareView({ generic, personalised, onClose }: CompareViewProps) {
  const personalStyle = toneStyles[personalised.tone] ?? toneStyles.balanced;

  return (
    <Card colSpan2>
      <div className="flex items-center justify-between mb-4">
        <CardTitle icon={ArrowLeftRight}>Before / After — DNA Personalisation</CardTitle>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-50 hover:bg-slate-700 transition-colors"
          title="Close comparison"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        Both advisories respond to the same market event. The left is a generic institutional note;
        the right is adapted to the client's DNA — values, communication style, and personal context.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Generic column */}
        <div className="rounded-xl border border-slate-600/50 bg-slate-800/60 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-700/40 border-b border-slate-600/40">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-300">Generic Advisory</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-600/70 text-slate-400 border border-slate-600">
              institutional
            </span>
          </div>
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">{generic.subject}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-slate-600">
                {generic.tone}
              </span>
            </div>
            <div className="text-sm text-slate-400 leading-relaxed">
              {highlightPersonalRefs(generic.body)}
            </div>
            {generic.proposedAction && (
              <div className="rounded-lg bg-slate-700/50 border border-slate-600/40 p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Proposed Action
                </p>
                <p className="text-sm text-slate-300">{generic.proposedAction}</p>
              </div>
            )}
          </div>
        </div>

        {/* DNA-Personalised column */}
        <div className="rounded-xl border border-six-red/40 bg-six-red/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-six-red/15 border-b border-six-red/40">
            <Sparkles className="h-4 w-4 text-six-red" />
            <span className="text-sm font-semibold text-six-red-bright">DNA-Personalised</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${personalStyle.badge}`}>
              {personalised.tone}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-50">{personalised.subject}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${personalStyle.badge}`}>
                {personalised.tone}
              </span>
            </div>
            <div className="text-sm text-slate-200 leading-relaxed">
              {highlightPersonalRefs(personalised.body)}
            </div>
            {personalised.proposedAction && (
              <div className="rounded-lg bg-six-red/15 border border-six-red/40 p-3">
                <p className="text-xs font-semibold text-six-red uppercase tracking-wider mb-1">
                  Proposed Action
                </p>
                <p className="text-sm text-slate-200">{personalised.proposedAction}</p>
              </div>
            )}
            {personalised.toneInfluences && personalised.toneInfluences.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-six-red uppercase tracking-wide mb-1.5 font-medium">DNA Influences</p>
                <div className="flex flex-wrap gap-1.5">
                  {personalised.toneInfluences.map((t, i) => (
                    <div key={i} className="flex items-center gap-1 bg-six-red/15 rounded-lg px-2.5 py-1 text-xs border border-six-red/40">
                      <span className="text-six-red font-medium">{t.dnaValue}</span>
                      <ChevronRight className="h-3 w-3 text-six-red/70" />
                      <span className="text-slate-300">{t.effect}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-700/60 leading-relaxed">
        AI-generated advisory drafts for RM review only. Neither version constitutes financial advice.
        Client approval is required before any transaction.
      </p>
    </Card>
  );
}
