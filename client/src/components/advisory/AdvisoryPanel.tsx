import { useState } from "react";
import type { AdvisoryMessage } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { ConfidenceBadge } from "../shared/ConfidenceBadge";
import { SkeletonLine } from "../shared/LoadingSpinner";
import { MessageSquare, Copy, Pencil, RefreshCw, Sparkles, ChevronDown } from "lucide-react";

interface AdvisoryPanelProps {
  advisory: AdvisoryMessage | null;
  loading: boolean;
  clientId: string | null;
  onGenerate: () => void;
  onRegenerate: () => void;
}

const toneStyles: Record<string, string> = {
  "data-driven": "bg-blue-900/50 text-blue-300",
  "values-led": "bg-purple-900/50 text-purple-300",
  balanced: "bg-amber-900/50 text-amber-300",
};

export function AdvisoryPanel({ advisory, loading, clientId, onGenerate, onRegenerate }: AdvisoryPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!advisory) return;
    const text = isEditing ? editedBody : advisory.body;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleEdit() {
    if (!advisory) return;
    if (!isEditing) {
      setEditedBody(advisory.body);
    }
    setIsEditing(!isEditing);
  }

  return (
    <Card colSpan2>
      <CardTitle icon={MessageSquare}>Advisory Draft</CardTitle>

      {!advisory && !loading && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="h-12 w-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-1">
            <Sparkles className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-sm text-slate-400">
            {clientId ? "Generate a personalised advisory note for this client" : "Select a client to generate an advisory"}
          </p>
          {clientId && (
            <button
              onClick={onGenerate}
              className="px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30"
            >
              <Sparkles className="h-4 w-4" /> Generate Advisory
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="py-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
            <p className="text-sm text-slate-400">Generating personalised advisory...</p>
          </div>
          <div className="space-y-3">
            <SkeletonLine className="w-2/3 h-4" />
            <SkeletonLine className="w-full" />
            <SkeletonLine className="w-full" />
            <SkeletonLine className="w-5/6" />
            <SkeletonLine className="w-3/4 mt-4" />
            <SkeletonLine className="w-full" />
            <SkeletonLine className="w-4/5" />
          </div>
        </div>
      )}

      {advisory && !loading && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-semibold text-white">{advisory.subject}</h3>
            <span className={`text-xs px-2.5 py-1 rounded-full ${toneStyles[advisory.tone] || toneStyles.balanced}`}>
              {advisory.tone}
            </span>
            <ConfidenceBadge score={advisory.confidence} />
          </div>

          {isEditing ? (
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 min-h-[200px] mt-3 focus:outline-none focus:border-blue-500"
            />
          ) : (
            <div className="mt-3 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {advisory.body}
            </div>
          )}

          {advisory.proposedAction && (
            <div className="mt-3 p-3 rounded-lg bg-blue-900/30 border border-blue-800/50">
              <p className="text-xs font-medium text-blue-300 uppercase tracking-wide mb-1">Proposed Action</p>
              <p className="text-sm text-slate-200">{advisory.proposedAction}</p>
            </div>
          )}

          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={onGenerate}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Sparkles className="h-4 w-4" /> Generate
            </button>
            <button
              onClick={onRegenerate}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              <RefreshCw className="h-4 w-4" /> Regenerate
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              <Copy className="h-4 w-4" /> {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleEdit}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              <Pencil className="h-4 w-4" /> {isEditing ? "Done" : "Edit"}
            </button>
          </div>

          {advisory.toneInfluences && advisory.toneInfluences.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {advisory.toneInfluences.map((ti, i) => (
                <span key={i} className="text-xs text-slate-400">
                  {ti.dnaValue}: {ti.effect}
                </span>
              ))}
            </div>
          )}

          {advisory.reasoning && (
            <details className="mt-4">
              <summary className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                <ChevronDown className="h-3 w-3" /> View reasoning
              </summary>
              <div className="text-sm text-slate-300 mt-2 pl-4 whitespace-pre-wrap">
                {advisory.reasoning}
              </div>
            </details>
          )}

          <p className="text-xs text-slate-500 mt-4 border-t border-slate-700 pt-3">
            {advisory.disclaimer}
          </p>
        </>
      )}
    </Card>
  );
}
