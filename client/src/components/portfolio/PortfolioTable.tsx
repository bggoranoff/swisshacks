import { useState, useMemo } from "react";
import type { PortfolioAnalysis, EnrichedPosition } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { SkeletonTable } from "../shared/SkeletonLoader";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { AllocationChart } from "./AllocationChart";
import { Briefcase, ArrowUpDown, AlertTriangle, Search } from "lucide-react";
import clsx from "clsx";

type SortField = "name" | "sector" | "value" | "drift" | "cioRating";

function formatCHF(value: number): string {
  return value.toLocaleString("de-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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

function getSortValue(p: EnrichedPosition, field: SortField): string | number {
  switch (field) {
    case "name": return p.name.toLowerCase();
    case "sector": return p.sectorOrAssetClass.toLowerCase();
    case "value": return p.currentValueCHF;
    case "drift": return Math.abs(p.driftPercent);
    case "cioRating": return p.cioRating ?? "HOLD";
  }
}

export function PortfolioTable({
  portfolio,
  loading,
  error,
  onRetry,
}: {
  portfolio: PortfolioAnalysis | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [assetClassFilter, setAssetClassFilter] = useState<string>("all");

  const sorted = useMemo(() => {
    if (!portfolio) return [];
    const list = [...portfolio.positions];
    list.sort((a, b) => {
      const av = getSortValue(a, sortField);
      const bv = getSortValue(b, sortField);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [portfolio, sortField, sortDir]);

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
    return matchesSearch && matchesClass;
  });

  const summaryStats = useMemo(() => {
    if (!portfolio) return null;
    const positions = portfolio.positions;
    const totalValue = positions.reduce((sum, p) => sum + p.currentValueCHF, 0);
    const uniqueAssetClasses = new Set(positions.map(p => p.sectorOrAssetClass)).size;
    const avgDrift = positions.length > 0
      ? positions.reduce((sum, p) => sum + Math.abs(p.driftPercent), 0) / positions.length
      : 0;
    return { totalValue, uniqueAssetClasses, avgDrift, positionCount: positions.length };
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
    { label: "Sector", field: "sector" },
    { label: "Value (CHF)", field: "value" },
    { label: "Drift %", field: "drift" },
    { label: "CIO Rating", field: "cioRating" },
  ];

  return (
    <Card>
      <CardTitle icon={Briefcase}>Portfolio Holdings</CardTitle>

      {loading && <SkeletonTable />}
      {error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && !portfolio && <EmptyState message="Select a client to view portfolio" />}

      {!loading && !error && portfolio && (
        <>
          <div className="flex items-center gap-4 mb-4 text-sm text-slate-400">
            <span>Strategy: <span className="text-white font-medium">{portfolio.strategy}</span></span>
            <span>Total: <span className="text-white font-medium">CHF {formatCHF(portfolio.totalValueCHF)}</span></span>
            <span>{portfolio.positions.length} positions</span>
          </div>

          <AllocationChart positions={portfolio.positions} />

          {summaryStats && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Total Value</p>
                <p className="text-lg font-semibold text-white mt-1">CHF {(summaryStats.totalValue / 1e6).toFixed(1)}M</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Positions</p>
                <p className="text-lg font-semibold text-white mt-1">{summaryStats.positionCount}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Asset Classes</p>
                <p className="text-lg font-semibold text-white mt-1">{summaryStats.uniqueAssetClasses}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Avg Drift</p>
                <p
                  className={clsx(
                    "text-lg font-semibold mt-1",
                    summaryStats.avgDrift < 1 ? "text-green-400" :
                    summaryStats.avgDrift <= 2 ? "text-amber-400" : "text-red-400"
                  )}
                >
                  {summaryStats.avgDrift.toFixed(2)}%
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search positions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <select
              value={assetClassFilter}
              onChange={e => setAssetClassFilter(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {assetClasses.map(ac => (
                <option key={ac} value={ac}>{ac === "all" ? "All Asset Classes" : ac}</option>
              ))}
            </select>
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
                      className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide pb-3 border-b border-slate-700 cursor-pointer hover:text-white"
                    >
                      {h.label}
                      <ArrowUpDown className="h-3 w-3 inline ml-1" />
                    </th>
                  ))}
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide pb-3 border-b border-slate-700">
                    Conflict
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(pos => (
                  <tr key={pos.isin} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 pr-4 text-slate-100">{pos.name}</td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">{pos.sectorOrAssetClass}</td>
                    <td className="py-3 pr-4 text-slate-100">{formatCHF(pos.currentValueCHF)}</td>
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
                      {pos.dnaConflict && (
                        <span className={clsx("text-xs px-2 py-0.5 rounded-full", conflictClass(pos.dnaConflict.severity))}>
                          {pos.dnaConflict.severity}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {portfolio.driftBreaches.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-900/40">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-red-300 uppercase tracking-wide">Drift Breaches (&gt;2pp)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {portfolio.driftBreaches.map(b => (
                  <span key={b.assetClass} className="text-xs px-2 py-1 rounded-full bg-red-900/50 text-red-300">
                    {b.assetClass}: {b.driftPct >= 0 ? "+" : ""}{b.driftPct.toFixed(1)}pp
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
