import { useState, useMemo } from "react";
import type { PortfolioAnalysis, EnrichedPosition } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { SkeletonTable } from "../shared/SkeletonLoader";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { AllocationChart } from "./AllocationChart";
import { FadeIn } from "../shared/FadeIn";
import { Briefcase, ArrowUpDown, AlertTriangle, Search } from "lucide-react";
import clsx from "clsx";

type SortField = "name" | "sector" | "value" | "drift" | "cioRating" | "conflict";

function formatCHF(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

function driftColor(drift: number): string {
  const abs = Math.abs(drift);
  if (abs <= 1) return "bg-green-500";
  if (abs <= 2) return "bg-amber-500";
  return "bg-red-500";
}

function cioClass(rating?: string): string {
  switch (rating) {
    case "BUY": return "bg-green-900/50 text-green-300";
    case "SELL": return "bg-red-900/50 text-red-300";
    default: return "bg-slate-700 text-slate-300";
  }
}

function conflictClass(severity: string): string {
  switch (severity) {
    case "high": return "bg-red-900/50 text-red-300";
    case "medium": return "bg-amber-900/50 text-amber-300";
    default: return "bg-slate-700 text-slate-300";
  }
}

function getSortValue(p: EnrichedPosition, field: Exclude<SortField, "conflict">): string | number {
  switch (field) {
    case "name": return p.name.toLowerCase();
    case "sector": return p.sectorOrAssetClass.toLowerCase();
    case "value": return p.currentValueCHF;
    case "drift": return Math.abs(p.driftPercent);
    case "cioRating": return p.cioRating ?? "HOLD";
  }
}

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
function conflictSortValue(conflict: any | undefined): number {
  if (!conflict) return 3;
  return SEVERITY_ORDER[conflict.severity] ?? 2;
}

export function PortfolioTable({
  portfolio,
  loading,
  error,
  onRetry,
  durationMs,
  fetchedAt,
}: {
  portfolio: PortfolioAnalysis | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  durationMs?: number | null;
  fetchedAt?: string | null;
}) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [assetClassFilter, setAssetClassFilter] = useState<string>("all");
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);

  // Map conflicts from top-level array to per-position by ISIN or name
  const conflictMap = useMemo(() => {
    const map = new Map<string, any>();
    if (!portfolio?.conflicts) return map;
    for (const c of portfolio.conflicts as any[]) {
      if (c.positionIsin) map.set(c.positionIsin, c);
      if (c.positionName) map.set(c.positionName, c);
    }
    return map;
  }, [portfolio?.conflicts]);

  const sorted = useMemo(() => {
    if (!portfolio) return [];
    const list = [...portfolio.positions];
    list.sort((a, b) => {
      let cmp: number;
      if (sortField === "conflict") {
        const ac = conflictMap.get(a.isin) || conflictMap.get(a.name);
        const bc = conflictMap.get(b.isin) || conflictMap.get(b.name);
        cmp = conflictSortValue(ac) - conflictSortValue(bc);
      } else {
        const av = getSortValue(a, sortField);
        const bv = getSortValue(b, sortField);
        cmp = av < bv ? -1 : av > bv ? 1 : 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [portfolio, sortField, sortDir, conflictMap]);

  const assetClasses = useMemo(() => {
    if (!portfolio) return ["all"];
    const classes = new Set(portfolio.positions.map(p => p.sectorOrAssetClass).filter(Boolean));
    return ["all", ...Array.from(classes).sort()];
  }, [portfolio]);

  const filtered = sorted.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(q) ||
      p.isin.toLowerCase().includes(q) ||
      (p.sectorOrAssetClass || "").toLowerCase().includes(q);
    const matchesClass = assetClassFilter === "all" || p.sectorOrAssetClass === assetClassFilter;
    const matchesConflict = !showConflictsOnly || conflictMap.has(p.isin) || conflictMap.has(p.name);
    return matchesSearch && matchesClass && matchesConflict;
  });

  const summaryStats = useMemo(() => {
    if (!portfolio) return null;
    const positions = portfolio.positions;
    const totalValue = positions.reduce((sum, p) => sum + p.currentValueCHF, 0);
    const uniqueAssetClasses = new Set(positions.map(p => p.sectorOrAssetClass)).size;
    const avgDrift = positions.length > 0
      ? positions.reduce((sum, p) => sum + Math.abs(p.driftPercent), 0) / positions.length
      : 0;
    const buyCount = positions.filter(p => (p as any).cioRating === "BUY").length;
    const holdCount = positions.filter(p => (p as any).cioRating === "HOLD").length;
    const sellCount = positions.filter(p => (p as any).cioRating === "SELL").length;
    return { totalValue, uniqueAssetClasses, avgDrift, positionCount: positions.length, buyCount, holdCount, sellCount };
  }, [portfolio]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const headers: { label: string; field: SortField }[] = [
    { label: "Name", field: "name" },
    { label: "Asset Class", field: "sector" },
    { label: "Value (CHF)", field: "value" },
    { label: "Drift %", field: "drift" },
    { label: "CIO Rating", field: "cioRating" },
    { label: "Conflict", field: "conflict" },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle icon={Briefcase}>Portfolio Holdings</CardTitle>
        <span className="flex items-center gap-2">
          {fetchedAt && <span className="text-xs text-slate-600">Updated {fetchedAt}</span>}
          {durationMs != null && <span className="text-xs text-slate-600">{durationMs}ms</span>}
        </span>
      </div>

      {loading && <SkeletonTable />}
      {error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && !portfolio && <EmptyState message="Select a client to view portfolio" />}

      {!loading && !error && portfolio && (
        <FadeIn>
          <div className="flex items-center gap-4 mb-4 text-sm text-slate-400">
            <span>Mandate: <span className="text-white font-medium">{portfolio.strategy}</span></span>
            <span>Total: <span className="text-white font-medium">CHF {formatCHF(portfolio.totalValueCHF)}</span></span>
            <span>{portfolio.positions.length} positions</span>
          </div>

          <AllocationChart positions={portfolio.positions} />

          {summaryStats && (
            <div className="overflow-x-auto mb-4">
              <div className="flex gap-3 min-w-max">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center min-w-[130px]">
                  <p className="text-xs text-slate-400 uppercase tracking-wide whitespace-nowrap">Total Value</p>
                  <p className="text-lg font-semibold text-white mt-1 whitespace-nowrap">CHF {(summaryStats.totalValue / 1e6).toFixed(1)}M</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center min-w-[110px]">
                  <p className="text-xs text-slate-400 uppercase tracking-wide whitespace-nowrap">Positions</p>
                  <p className="text-lg font-semibold text-white mt-1">{summaryStats.positionCount}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center min-w-[120px]">
                  <p className="text-xs text-slate-400 uppercase tracking-wide whitespace-nowrap">Asset Classes</p>
                  <p className="text-lg font-semibold text-white mt-1">{summaryStats.uniqueAssetClasses}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center min-w-[110px]">
                  <p className="text-xs text-slate-400 uppercase tracking-wide whitespace-nowrap">Avg Drift</p>
                  <p
                    className={clsx(
                      "text-lg font-semibold mt-1 whitespace-nowrap",
                      summaryStats.avgDrift < 1 ? "text-green-400" :
                      summaryStats.avgDrift <= 2 ? "text-amber-400" : "text-red-400"
                    )}
                  >
                    {summaryStats.avgDrift.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center min-w-[140px]">
                  <p className="text-xs text-slate-400 uppercase tracking-wide whitespace-nowrap">CIO Ratings</p>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <span className="text-sm font-semibold text-green-400 whitespace-nowrap">{summaryStats.buyCount} <span className="font-normal text-xs">Buy</span></span>
                    <span className="text-sm font-semibold text-slate-400 whitespace-nowrap">{summaryStats.holdCount} <span className="font-normal text-xs">Hold</span></span>
                    <span className="text-sm font-semibold text-red-400 whitespace-nowrap">{summaryStats.sellCount} <span className="font-normal text-xs">Sell</span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {portfolio.driftBreaches && portfolio.driftBreaches.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-red-900/20 border border-red-900/40">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-red-300 uppercase tracking-wide">
                  Mandate Drift Breaches ({portfolio.driftBreaches.length})
                </span>
                <span className="text-xs text-slate-500 ml-auto">Threshold: ±2.0pp</span>
              </div>
              <div className="space-y-2">
                {portfolio.driftBreaches.map((b: any) => (
                  <div key={b.assetClass} className="flex items-center gap-3">
                    <span className="text-xs text-slate-300 w-32 truncate">{b.assetClass}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-700 relative">
                      <div
                        className={`h-full rounded-full ${b.driftPct > 0 ? "bg-red-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(Math.abs(b.driftPct) * 10, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono w-16 text-right ${b.driftPct > 0 ? "text-red-400" : "text-amber-400"}`}>
                      {b.driftPct >= 0 ? "+" : ""}{b.driftPct.toFixed(1)}pp
                    </span>
                    {b.targetPct != null && (
                      <span className="text-xs text-slate-500 w-20">
                        {b.actualPct?.toFixed(1)}% / {b.targetPct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-4 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search positions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-six-orange transition-colors"
              />
            </div>
            <select
              value={assetClassFilter}
              onChange={e => setAssetClassFilter(e.target.value)}
              className="h-9 bg-slate-700/50 border border-slate-600 rounded-lg px-3 text-sm text-slate-200 focus:outline-none focus:border-six-orange"
            >
              {assetClasses.map(ac => (
                <option key={ac} value={ac}>{ac === "all" ? "All Asset Classes" : ac}</option>
              ))}
            </select>
            <button
              onClick={() => setShowConflictsOnly(!showConflictsOnly)}
              className={clsx(
                "h-9 px-4 text-sm rounded-lg transition-colors whitespace-nowrap",
                showConflictsOnly ? "bg-red-600 text-white" : "bg-slate-700 text-slate-400 hover:text-slate-200"
              )}
            >
              {showConflictsOnly ? "Showing Conflicts" : "Show Conflicts"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-2">{filtered.length} of {portfolio.positions.length} positions</p>

          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {headers.map(h => (
                    <th
                      key={h.field}
                      onClick={() => toggleSort(h.field)}
                      className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide pb-3 border-b border-slate-700 cursor-pointer hover:text-white whitespace-nowrap pr-4"
                    >
                      {h.label}
                      <ArrowUpDown className="h-3 w-3 inline ml-1" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(pos => (
                  <tr key={pos.isin} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="py-2 pr-4" title={`ISIN: ${pos.isin}\nValor: ${pos.valorNumber}\nType: ${pos.instrumentType}\nTarget: CHF ${pos.targetValueCHF.toLocaleString()}\nCurrent: CHF ${pos.currentValueCHF.toLocaleString()}`}>
                      <span className="text-slate-200">{pos.name}</span>
                      {pos.instrumentType === "BOND" && (
                        <span className="ml-1 text-xs px-1 py-0.5 rounded bg-slate-600 text-slate-400">Bond</span>
                      )}
                      {(() => {
                        const conflict = conflictMap.get(pos.isin) || conflictMap.get(pos.name);
                        if (!conflict) return null;
                        return (
                          <span
                            className={clsx("ml-2 text-xs px-1.5 py-0.5 rounded", conflictClass(conflict.severity))}
                            title={conflict.reason || "Conflict detected"}
                          >
                            {conflict.severity === "high" ? "⚠ Conflict" : "⚡ Review"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">{pos.sectorOrAssetClass}</td>
                    <td className="py-3 pr-4 text-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span>CHF {formatCHF(pos.livePrice ?? pos.currentValueCHF)}</span>
                        <span className={clsx("text-[10px] px-1 py-0.5 rounded", pos.priceSource === "live" ? "bg-green-900/50 text-green-400" : "bg-slate-700 text-slate-500")}>
                          {pos.priceSource === "live" ? "LIVE" : "EXCEL"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-slate-700 w-20 inline-block">
                          <div
                            className={clsx("h-full rounded-full", driftColor(pos.driftPercent))}
                            style={{ width: `${Math.min(Math.abs(pos.driftPercent) * 20, 100)}%` }}
                          />
                        </div>
                        <span className={clsx(
                          "text-xs",
                          Math.abs(pos.driftPercent) > 2 ? "text-red-400" :
                          Math.abs(pos.driftPercent) > 1 ? "text-amber-400" : "text-slate-400"
                        )}>
                          {pos.driftPercent >= 0 ? "+" : ""}{pos.driftPercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {pos.cioRating && (
                        <span className={clsx("text-xs px-2 py-0.5 rounded-full", cioClass(pos.cioRating))}>
                          {pos.cioRating}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {(() => {
                        const conflict = conflictMap.get(pos.isin) || conflictMap.get(pos.name);
                        if (!conflict) return <span className="text-xs text-slate-600">—</span>;
                        return (
                          <span
                            className={clsx("text-xs px-2 py-0.5 rounded-full cursor-help", conflictClass(conflict.severity))}
                            title={conflict.reason || "Conflict detected"}
                          >
                            {conflict.severity === "high" ? "High" : conflict.severity === "medium" ? "Medium" : conflict.severity}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-600 font-medium">
                  <td className="py-3 pr-4 text-white">Total ({filtered.length} positions)</td>
                  <td className="py-3 pr-4"></td>
                  <td className="py-3 pr-4 text-white">
                    CHF {formatCHF(filtered.reduce((sum, p) => sum + (p.livePrice ?? p.currentValueCHF), 0))}
                  </td>
                  <td className="py-3 pr-4"></td>
                  <td className="py-3 pr-4"></td>
                  <td className="py-3 pr-4">
                    {(() => {
                      const conflictCount = filtered.filter(p => conflictMap.has(p.isin) || conflictMap.has(p.name)).length;
                      return conflictCount > 0 ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-300">{conflictCount} conflicts</span>
                      ) : null;
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </FadeIn>
      )}
    </Card>
  );
}
