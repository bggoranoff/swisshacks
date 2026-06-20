import { useState, useEffect } from "react";
import type { AdvisoryMessage } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { SkeletonLine } from "../shared/LoadingSpinner";
import {
  MessageSquare,
  Copy,
  Pencil,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ArrowLeftRight,
  Bell,
  HelpCircle,
  Loader2,
} from "lucide-react";

interface AdvisoryPanelProps {
  advisory: AdvisoryMessage | null;
  loading: boolean;
  clientId: string | null;
  contextAlertTitle?: string | null;
  onGenerate: (language?: string) => void;
  onRegenerate: (language?: string) => void;
  language?: string;
  onLanguageChange?: (lang: string) => void;
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
        <Sparkles className="h-4 w-4 text-six-red animate-pulse" />
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
      <div className="rounded-lg bg-six-red/10 border border-six-red/20 p-3 space-y-2">
        <div className="h-3 w-28 rounded bg-six-red/30 animate-pulse" />
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

export function AdvisoryPanel({ advisory: advisoryProp, loading, clientId, contextAlertTitle, onGenerate, onRegenerate, language = "en" }: AdvisoryPanelProps) {
  const [advisory, setAdvisory] = useState<AdvisoryMessage | null>(advisoryProp);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [savedBody, setSavedBody] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [personalTip, setPersonalTip] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);

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

  useEffect(() => {
    setAdvisory(advisoryProp);
  }, [advisoryProp]);

  useEffect(() => {
    if (advisory) {
      setHistory(prev => [advisory, ...prev].slice(0, 5));
    }
  }, [advisory]);

  useEffect(() => {
    setHistory([]);
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      setPersonalTip(null);
      setTipLoading(false);
      return;
    }
    const ac = new AbortController();
    setTipLoading(true);
    setPersonalTip(null);
    fetch(`/api/clients/${clientId}/personal-tip`, { signal: ac.signal })
      .then(r => r.json())
      .then(body => {
        if (body?.success && body.data?.tip) setPersonalTip(body.data.tip);
      })
      .catch(err => {
        if (err.name === "AbortError") return;
      })
      .finally(() => {
        if (!ac.signal.aborted) setTipLoading(false);
      });
    return () => ac.abort();
  }, [clientId]);

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

      {/* Empty state — compact one-liner */}
      {!advisory && !loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {clientId ? "No advisory generated yet" : "Select a client to generate an advisory"}
          </p>
          {clientId && (
            <button
              onClick={() => onGenerate(language)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all bg-six-red hover:bg-six-red-bright text-white"
            >
              <Sparkles className="h-3.5 w-3.5" /> Generate
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
                  <span className={`text-sm font-medium ${i <= currentStep ? "text-slate-50" : "text-slate-500"}`}>{step.label}</span>
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
              <span className="break-words">{contextAlertTitle}</span>
            </div>
          )}

          {/* Header: subject + tone badge + confidence */}
          <div className="flex items-start gap-3 flex-wrap mb-1">
            <h3 className="text-lg font-semibold text-slate-50 leading-snug">{advisory.subject}</h3>
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${toneStyle.badge}`}
              >
                {advisory.tone}
              </span>
            </div>
          </div>

          {advisory.generatedAt && (
            <span className="text-xs text-slate-500">
              Generated {new Date(advisory.generatedAt).toLocaleTimeString()}
            </span>
          )}

          {/* Tone Influences */}
          {advisory.toneInfluences && advisory.toneInfluences.length > 0 && (
            <div className="mt-3 mb-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Tone Influences</p>
              <div className="flex flex-wrap gap-2">
                {advisory.toneInfluences.map((t, i) => (
                  <div key={i} className="bg-slate-700/50 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-six-red font-medium">{t.dnaValue}</span>
                    <span className="text-slate-400 ml-1">→ {t.effect}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          {isEditing ? (
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 min-h-[200px] mt-3 focus:outline-none focus:border-six-red"
            />
          ) : (
            <div className="mt-3 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {displayBody}
            </div>
          )}

          {advisory && (
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>{displayBody.split(/\s+/).filter(Boolean).length} words</span>
              <span>·</span>
              <span>~{Math.max(1, Math.ceil(displayBody.split(/\s+/).filter(Boolean).length / 200))} min read</span>
            </div>
          )}

          {/* Proposed action highlighted box */}
          {advisory.proposedAction && (
            <div className="mt-4 p-3.5 rounded-lg bg-six-red/15 border border-six-red/40 flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 h-7 w-7 rounded-md bg-six-red/30 flex items-center justify-center">
                <ArrowLeftRight className="h-3.5 w-3.5 text-six-red" />
              </div>
              <div>
                <p className="text-xs font-semibold text-six-red uppercase tracking-wider mb-1">
                  Proposed Action
                </p>
                <p className="text-sm text-slate-200 leading-relaxed">{advisory.proposedAction}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-4 flex-wrap items-center">
            <button
              onClick={() => onRegenerate(language)}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              <RefreshCw className="h-4 w-4" /> Regenerate
            </button>
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
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-six-red hover:bg-six-red-bright text-white"
              >
                <Pencil className="h-4 w-4" /> Save
              </button>
            )}
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
            {copied && <span className="text-xs text-green-400 ml-2 self-center">Copied to clipboard!</span>}
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

          {/* Previous advisories history */}
          {history.length > 1 && (
            <details className="mt-4 border-t border-slate-700 pt-3">
              <summary className="text-xs text-slate-400 cursor-pointer">
                Previous advisories ({history.length - 1})
              </summary>
              <div className="mt-2 space-y-3">
                {history.slice(1).map((h, i) => (
                  <div key={i} className="bg-slate-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-300">{h.subject}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600 text-slate-400">{h.tone}</span>
                    </div>
                    <p className="text-xs text-slate-400">{h.body}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {/* Personal engagement tip — always visible when a client is selected */}
      {clientId && (
        <div className="mt-4 rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
          <div className="flex items-start gap-2.5">
            <HelpCircle className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1.5">Personal Touch</p>
              {tipLoading ? (
                <div className="flex items-center gap-2 text-sm text-blue-500/70">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating suggestion...
                </div>
              ) : personalTip ? (
                <p className="text-sm text-slate-200 leading-relaxed">{personalTip}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">No suggestion available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
