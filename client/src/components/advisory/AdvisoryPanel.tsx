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
  Download,
  Check,
  X,
} from "lucide-react";
import { CompareView } from "./CompareView";

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

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
  { code: "fr", label: "FR" },
] as const;

export function AdvisoryPanel({ advisory: advisoryProp, loading, clientId, contextAlertTitle, onGenerate, onRegenerate, language = "en", onLanguageChange }: AdvisoryPanelProps) {
  const [advisory, setAdvisory] = useState<AdvisoryMessage | null>(advisoryProp);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [savedBody, setSavedBody] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [_showComparison, _setShowComparison] = useState(false);
  const [compareData, setCompareData] = useState<{ generic: AdvisoryMessage; personalised: AdvisoryMessage } | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [showCompareView, setShowCompareView] = useState(false);

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

  function handleDownload() {
    if (!advisory) return;
    const content = [
      `Subject: ${advisory.subject}`,
      `Client: ${clientId}`,
      `Tone: ${advisory.tone}`,
      `Confidence: ${Math.round(advisory.confidence * 100)}%`,
      `Date: ${new Date().toLocaleDateString()}`,
      "",
      "---",
      "",
      displayBody,
      "",
      "---",
      "",
      advisory.proposedAction ? `Proposed Action: ${advisory.proposedAction}` : "",
      "",
      advisory.reasoning ? `Reasoning: ${advisory.reasoning}` : "",
      "",
      advisory.disclaimer,
    ].filter(Boolean).join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advisory-${clientId}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleCompare = async () => {
    if (!clientId || !advisory) return;
    setCompareLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/advisory/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: advisory.referencedAlert, language }),
      });
      const json = await res.json();
      if (json.success) {
        setCompareData(json.data);
        setShowCompareView(true);
      }
    } catch (err) {
      console.error("Failed to fetch comparison:", err);
    } finally {
      setCompareLoading(false);
    }
  };

  const handleStatusUpdate = async (status: "approved" | "rejected") => {
    if (!advisory) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/advisory/${advisory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setAdvisory(json.data);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => onLanguageChange?.(l.code)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${language === l.code ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onGenerate(language)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30"
              >
                <Sparkles className="h-4 w-4" /> Generate Advisory
              </button>
            </div>
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

          {/* Tone Influences */}
          {advisory.toneInfluences && advisory.toneInfluences.length > 0 && (
            <div className="mt-3 mb-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Tone Influences</p>
              <div className="flex flex-wrap gap-2">
                {advisory.toneInfluences.map((t, i) => (
                  <div key={i} className="bg-slate-700/50 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-blue-300 font-medium">{t.dnaValue}</span>
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
          <div className="flex gap-2 mt-4 flex-wrap items-center">
            <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1 mr-1">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => onLanguageChange?.(l.code)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${language === l.code ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => onGenerate(language)}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Sparkles className="h-4 w-4" /> Generate
            </button>
            <button
              onClick={() => onRegenerate(language)}
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
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              onClick={handleCompare}
              disabled={compareLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-50"
            >
              <ArrowLeftRight className="h-4 w-4" />
              {compareLoading ? "Comparing..." : "Compare"}
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

          {/* Approve / Reject */}
          {advisory && advisory.status === "draft" && (
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-700">
              <button
                onClick={() => handleStatusUpdate("approved")}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Check className="h-4 w-4" /> Approve
              </button>
              <button
                onClick={() => handleStatusUpdate("rejected")}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-red-600/30"
              >
                <X className="h-4 w-4" /> Reject
              </button>
              <span className="text-xs text-slate-500 ml-auto">RM decision required</span>
            </div>
          )}
          {advisory && advisory.status !== "draft" && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700">
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                advisory.status === "approved" ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"
              }`}>
                {advisory.status === "approved" ? "✓ Approved" : "✗ Rejected"}
              </span>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-slate-500 mt-4 border-t border-slate-700/60 pt-3 leading-relaxed">
            {advisory.disclaimer}
          </p>

          {/* Before/After CompareView */}
          {showCompareView && compareData && (
            <div className="mt-4 border-t border-slate-700 pt-4">
              <CompareView
                generic={compareData.generic}
                personalised={compareData.personalised}
                onClose={() => setShowCompareView(false)}
              />
            </div>
          )}

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
                    <p className="text-xs text-slate-400 line-clamp-2">{h.body}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </Card>
  );
}
