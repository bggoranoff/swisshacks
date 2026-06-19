import { useState } from "react";
import type { NewsDigest, PortfolioAnalysis } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { SkeletonBlock } from "../shared/LoadingSpinner";
import { EmptyState } from "../shared/EmptyState";
import { ShieldAlert, AlertTriangle, TrendingUp, AlertCircle, Info, ChevronDown, Check, X, ArrowLeftRight, ArrowRight } from "lucide-react";
import clsx from "clsx";

interface AlertsPanelProps {
  news: NewsDigest | null;
  portfolio: PortfolioAnalysis | null;
  loading: boolean;
  selectedId?: string | null;
  triggerEvent?: string;
  onApprove?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

interface AlertItem {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  reason: string;
  reasoningChain?: string[];
  riskType?: string;
  swap?: { name: string; reason: string };
  source: "news" | "portfolio" | "cio";
  alertType?: "conflict" | "opportunity" | "cio-conflict";
}

function AlertIcon({ alert }: { alert: AlertItem }) {
  // CIO conflict alerts get amber AlertTriangle
  if (alert.source === "cio" || alert.alertType === "cio-conflict") {
    return <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-400 shrink-0" />;
  }
  // Opportunity alerts get green TrendingUp
  if (alert.alertType === "opportunity") {
    return <TrendingUp className="h-5 w-5 mt-0.5 text-green-400 shrink-0" />;
  }
  // Conflict alerts get red ShieldAlert
  if (alert.alertType === "conflict" || alert.riskType === "conflict" || alert.riskType === "values" || alert.riskType === "reputational") {
    return <ShieldAlert className="h-5 w-5 mt-0.5 text-red-400 shrink-0" />;
  }
  // Fallback by severity
  switch (alert.severity) {
    case "high":
      return <AlertTriangle className="h-5 w-5 mt-0.5 text-red-400 shrink-0" />;
    case "medium":
      return <AlertCircle className="h-5 w-5 mt-0.5 text-amber-400 shrink-0" />;
    default:
      return <Info className="h-5 w-5 mt-0.5 text-blue-400 shrink-0" />;
  }
}

// Hardcoded CIO conflict alert for the Räber client
const RAEBER_CIO_ALERT: AlertItem = {
  id: "cio-raeber-us-tech",
  title: "CIO Recommends Rebalancing into US AI Stocks",
  reason: "The CIO recommendation list suggests increasing allocation to US AI and technology stocks. This conflicts with your documented aversion to US tech exposure.",
  reasoningChain: [
    "CIO recommendation list includes BUY ratings for US AI stocks",
    "Client DNA shows strong aversion to US technology exposure",
    "Client prefers Swiss blue-chip and precision engineering investments",
    "Accepting this rebalancing would contradict the client's investment identity",
  ],
  severity: "high",
  riskType: "conflict",
  source: "cio",
  alertType: "cio-conflict",
};

export function AlertsPanel({ news, portfolio, loading, selectedId, triggerEvent, onApprove, onDismiss }: AlertsPanelProps) {
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alerts: AlertItem[] = [];

  // News-sourced alerts
  if (news?.alerts) {
    for (const a of news.alerts) {
      alerts.push({
        id: `news-${a.id}`,
        severity: a.alertType === "conflict" ? "high" : "medium",
        title: a.title,
        reason: a.relevanceReason,
        reasoningChain: a.reasoningChain,
        riskType: a.alertType,
        source: "news",
        alertType: a.alertType,
      });
    }
  }

  // Portfolio DNA conflict alerts
  if (portfolio?.conflicts) {
    for (const c of portfolio.conflicts) {
      const conflict = c as any;
      alerts.push({
        id: `conflict-${conflict.isin || conflict.reason || Math.random()}`,
        severity: conflict.severity || "medium",
        title: conflict.holdingName || "Portfolio Conflict",
        reason: conflict.reason || "DNA conflict detected",
        reasoningChain: conflict.reasoningChain,
        riskType: conflict.riskType,
        swap: conflict.suggestedSwap ? { name: conflict.suggestedSwap.name, reason: conflict.suggestedSwap.reason } : undefined,
        source: "portfolio",
        alertType: "conflict",
      });
    }
  }

  // Portfolio CIO conflict alerts (from API)
  if ((portfolio as any)?.cioConflicts) {
    for (const c of (portfolio as any).cioConflicts) {
      const conflict = c as any;
      alerts.push({
        id: `cio-${conflict.isin || conflict.reason || Math.random()}`,
        severity: conflict.severity || "high",
        title: conflict.holdingName || "CIO Recommendation Conflict",
        reason: conflict.reason || "CIO recommendation conflicts with client DNA",
        reasoningChain: conflict.reasoningChain,
        riskType: conflict.riskType,
        swap: conflict.suggestedSwap ? { name: conflict.suggestedSwap.name, reason: conflict.suggestedSwap.reason } : undefined,
        source: "cio",
        alertType: "cio-conflict",
      });
    }
  }

  // Inject hardcoded Räber CIO conflict alert
  const isRaeber = selectedId === "raeber";
  const alreadyHasCioAlert = alerts.some((a) => a.id === RAEBER_CIO_ALERT.id);
  if (isRaeber && !alreadyHasCioAlert) {
    alerts.unshift(RAEBER_CIO_ALERT);
  }

  function handleApprove(id: string) {
    setApproved((prev) => new Set(prev).add(id));
    setDismissed((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    onApprove?.(id);
  }

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
    setApproved((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    onDismiss?.(id);
  }

  if (loading) {
    return (
      <Card>
        <CardTitle icon={ShieldAlert}>Alerts &amp; Conflicts</CardTitle>
        <SkeletonBlock />
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardTitle icon={ShieldAlert}>Alerts &amp; Conflicts</CardTitle>
        <EmptyState message="No active alerts" />
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle icon={ShieldAlert}>Alerts &amp; Conflicts</CardTitle>
      <div className="space-y-3">
        {triggerEvent && (
          <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3 mb-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Scenario Trigger</p>
            <p className="text-sm text-slate-300">{triggerEvent}</p>
          </div>
        )}
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={clsx(
              "p-4 rounded-lg bg-slate-700/50 border border-slate-600 transition-opacity",
              dismissed.has(alert.id) && "opacity-40"
            )}
          >
            <div className="flex items-start gap-3">
              <AlertIcon alert={alert} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm text-slate-100">{alert.title}</p>
                  {approved.has(alert.id) && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-300">
                      <Check className="h-3 w-3" /> Approved
                    </span>
                  )}
                  {dismissed.has(alert.id) && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                      <X className="h-3 w-3" /> Dismissed
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-300 mt-1">{alert.reason}</p>

                {alert.riskType && (
                  <span className={clsx(
                    "inline-block text-xs px-2 py-0.5 rounded-full mt-2",
                    alert.alertType === "cio-conflict" || alert.source === "cio"
                      ? "bg-amber-900/50 text-amber-300"
                      : alert.alertType === "opportunity"
                        ? "bg-green-900/50 text-green-300"
                        : "bg-red-900/50 text-red-300"
                  )}>
                    {alert.source === "cio" ? "CIO conflict" : alert.riskType}
                  </span>
                )}

                {alert.swap && (
                  <p className="text-xs text-green-300 mt-2">
                    Suggested swap: {alert.swap.name} &mdash; {alert.swap.reason}
                  </p>
                )}

                {/* Only show for conflict alerts */}
                {alert.alertType === "conflict" && (
                  <div className="mt-3 bg-slate-600/30 rounded-lg p-3 border border-slate-600/50">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowLeftRight className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-medium text-blue-300 uppercase tracking-wide">Suggested Swap</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">Current Holding</p>
                        <p className="text-sm text-red-300">{alert.swap ? alert.swap.name : "Conflicting position"}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">Replacement (BUY-rated)</p>
                        <p className="text-sm text-green-300">{alert.swap ? alert.swap.reason : "Same sector, DNA-aligned"}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Swap stays within mandate. CIO BUY-rated. Strategy unchanged.</p>
                  </div>
                )}

                {!approved.has(alert.id) && !dismissed.has(alert.id) && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleApprove(alert.id)}
                      className="text-xs px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 transition-colors"
                    >
                      <Check className="h-3 w-3" /> Approve
                    </button>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="text-xs px-3 py-1 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      <X className="h-3 w-3" /> Dismiss
                    </button>
                  </div>
                )}

                {alert.reasoningChain && alert.reasoningChain.length > 0 && (
                  <details className="mt-2">
                    <summary className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer select-none">
                      <ChevronDown className="h-3 w-3" /> Why this alert?
                    </summary>
                    <div className="text-xs text-slate-400 mt-1 pl-4 space-y-1">
                      {alert.reasoningChain.map((step, i) => (
                        <p key={i}>{i + 1}. {step}</p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
