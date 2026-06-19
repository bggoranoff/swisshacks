import { useState, useEffect } from "react";
import type { AdvisoryMessage } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { ConfidenceBadge } from "../shared/ConfidenceBadge";
import { SkeletonLine } from "../shared/LoadingSpinner";
import {
  MessageSquare,
  Copy,
  Pencil,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ArrowLeftRight,
  ScanSearch,
  Bell,
} from "lucide-react";

interface AdvisoryPanelProps {
  advisory: AdvisoryMessage | null;
  loading: boolean;
  clientId: string | null;
  contextAlertTitle?: string | null;
  onGenerate: () => void;
  onRegenerate: () => void;
}

const toneStyles: Record<string, { badge: string; pill: string }> = {
  "data-driven": {
    badge: "bg-blue-900/50 text-blue-300 border border-blue-800/60",
    pill: "bg-blue-900/40 text-blue-400 border border-blue-800/50",
  },
  "values-led": {
    badge: "bg-purple-900/50 text-purple-300 border border-purple-800/60",
    pill: "bg-purple-900/40 text-purple-400 border border-purple-800/50",
  },
  balanced: {
    badge: "bg-amber-900/50 text-amber-300 border border-amber-800/60",
    pill: "bg-amber-900/40 text-amber-400 border border-amber-800/50",
  },
};

function AdvisorySkeleton() {
  return (
    <div className="py-6 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
        <p className="text-sm text-slate-400 animate-pulse">Generating personalised advisory...</p>
      </div>

      {/* Subject skeleton */}
      <div className="space-y-2">
        <SkeletonLine className="w-1/2 h-5" />
        <div className="flex gap-2 mt-2">
          <div className="h-6 w-24 rounded-full bg-slate-700 animate-pulse" />
          <div className="h-6 w-16 rounded-full bg-slate-700 animate-pulse" />
        </div>
      </div>

      {/* Tone influences skeleton */}
      <div className="flex gap-2">
        <div className="h-5 w-28 rounded-full bg-slate-700/70 animate-pulse" />
        <div className="h-5 w-20 rounded-full bg-slate-700/70 animate-pulse" />
        <div className="h-5 w-24 rounded-full bg-slate-700/70 animate-pulse" />
      </div>

      {/* Body skeleton */}
      <div className="space-y-2.5 pt-1">
        <SkeletonLine className="w-full h-3.5" />
        <SkeletonLine className="w-full h-3.5" />
        <SkeletonLine className="w-5/6 h-3.5" />
        <SkeletonLine className="w-full h-3.5" />
        <SkeletonLine className="w-4/5 h-3.5" />
      </div>

      {/* Proposed action skeleton */}
      <div className="rounded-lg bg-blue-900/20 border border-blue-800/30 p-3 space-y-2">
        <div className="h-3 w-28 rounded bg-blue-800/50 animate-pulse" />
        <SkeletonLine className="w-3/4 h-3.5" />
      </div>

      {/* Action buttons skeleton */}
      <div className="flex gap-2 pt-1">
        <div className="h-9 w-28 rounded-lg bg-slate-700 animate-pulse" />
        <div className="h-9 w-28 rounded-lg bg-slate-700 animate-pulse" />
        <div className="h-9 w-20 rounded-lg bg-slate-700 animate-pulse" />
      </div>
    </div>
  );
}

export function AdvisoryPanel({ advisory, loading, clientId, contextAlertTitle, onGenerate, onRegenerate }: AdvisoryPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [savedBody, setSavedBody] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (loading) {
      setCurrentStep(0);
      const stepInterval = setInterval(() => {
        setCurrentStep(s => Math.min(s + 1, 3));
      }, 2000);
      return () => {
        clearInterval(stepInterval);
        setCurrentStep(0);
      };
    }
  }, [loading]);

  const displayBody = savedBody ?? advisory?.body ?? "";

  function handleCopy() {
    if (!advisory) return;
    const text = isEditing ? editedBody : displayBody;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleEdit() {
    if (!advisory) return;
    if (!isEditing) {
      setEditedBody(displayBody);
    }
    setIsEditing(true);
  }

  function handleSave() {
    setSavedBody(editedBody);
    setIsEditing(false);
  }

  const toneStyle = toneStyles[advisory?.tone ?? ""] ?? toneStyles.balanced;

  return (
    <Card colSpan2>
      <CardTitle icon={MessageSquare}>Advisory Draft</CardTitle>

      {/* Empty state */}
      {!advisory && !loading && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="h-12 w-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-1">
            <Sparkles className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-sm text-slate-400">
            {clientId
              ? "Generate a personalised advisory note for this client"
              : "Select a client to generate an advisory"}
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

      {/* Loading skeleton */}
      {loading && (
        <>
          <div className="space-y-3 py-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Agent Pipeline</p>
            {[
              { label: "CRM Agent", desc: "Extracting client DNA...", color: "bg-blue-500" },
              { label: "Portfolio Agent", desc: "Analyzing holdings...", color: "bg-green-500" },
              { label: "News Agent", desc: "Scanning relevant news...", color: "bg-purple-500" },
              { label: "Message Agent", desc: "Drafting advisory...", color: "bg-amber-500" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${step.color} ${i <= currentStep ? "opacity-100" : "opacity-30"} ${i === currentStep ? "animate-pulse" : ""}`} />
                <div>
                  <span className={`text-sm font-medium ${i <= currentStep ? "text-white" : "text-slate-500"}`}>{step.label}</span>
                  <span className={`text-xs ml-2 ${i === currentStep ? "text-slate-300" : "text-slate-600"}`}>{step.desc}</span>
                  {i < currentStep && <span className="text-xs text-green-400 ml-2">✓</span>}
                </div>
              </div>
            ))}
          </div>
          <AdvisorySkeleton />
        </>
      )}

      {/* Advisory content */}
      {advisory && !loading && (
        <>
          {/* Alert context banner */}
          {contextAlertTitle && (
            <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-200 text-xs">
              <Bell className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="font-medium">Responding to:</span>
              <span className="truncate">{contextAlertTitle}</span>
            </div>
          )}

          {/* Header: subject + tone badge + confidence */}
          <div className="flex items-start gap-3 flex-wrap mb-1">
            <h3 className="text-lg font-semibold text-white leading-snug">{advisory.subject}</h3>
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${toneStyle.badge}`}
              >
                {advisory.tone}
              </span>
              <ConfidenceBadge score={advisory.confidence} />
              {advisory.traceId && (
                <button
                  title={`Trace ID: ${advisory.traceId}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600/60 transition-colors"
                >
                  <ScanSearch className="h-3 w-3" />
                  View Trace
                </button>
              )}
            </div>
          </div>

          {/* Tone influence pills */}
          {advisory.toneInfluences && advisory.toneInfluences.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {advisory.toneInfluences.map((ti, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${toneStyle.pill}`}
                  title={ti.effect}
                >
                  <span className="font-medium">{ti.dnaValue}</span>
                  <span className="opacity-70">·</span>
                  <span className="opacity-80">{ti.effect}</span>
                </span>
              ))}
            </div>
          )}

          {/* Body */}
          {isEditing ? (
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 min-h-[200px] mt-3 focus:outline-none focus:border-blue-500"
            />
          ) : (
            <div className="mt-3 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {displayBody}
            </div>
          )}

          {/* Proposed action highlighted box */}
          {advisory.proposedAction && (
            <div className="mt-4 p-3.5 rounded-lg bg-blue-900/30 border border-blue-700/50 flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 h-7 w-7 rounded-md bg-blue-800/60 flex items-center justify-center">
                <ArrowLeftRight className="h-3.5 w-3.5 text-blue-300" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
                  Proposed Action
                </p>
                <p className="text-sm text-slate-200 leading-relaxed">{advisory.proposedAction}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
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
              <Copy className="h-4 w-4" /> Copy
            </button>
            {copied && <span className="text-xs text-green-400 ml-2 self-center">Copied to clipboard!</span>}
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Pencil className="h-4 w-4" /> Save
              </button>
            )}
          </div>

          {/* Reasoning collapsible */}
          {advisory.reasoning && (
            <details className="mt-4">
              <summary className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-300 transition-colors">
                <ChevronDown className="h-3 w-3" /> View reasoning
              </summary>
              <div className="text-sm text-slate-300 mt-2 pl-4 whitespace-pre-wrap border-l border-slate-700">
                {advisory.reasoning}
              </div>
            </details>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-slate-500 mt-4 border-t border-slate-700/60 pt-3 leading-relaxed">
            {advisory.disclaimer}
          </p>
        </>
      )}
    </Card>
  );
}
