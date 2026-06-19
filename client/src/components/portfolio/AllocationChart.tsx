import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import type { EnrichedPosition } from "../../types/api";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface Slice {
  name: string;
  value: number;
}

function aggregate(positions: EnrichedPosition[], key: "targetValueCHF" | "currentValueCHF"): Slice[] {
  const map = new Map<string, number>();
  for (const p of positions) {
    const cls = p.sectorOrAssetClass || "Other";
    map.set(cls, (map.get(cls) ?? 0) + p[key]);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function formatCHF(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

export function AllocationChart({ positions }: { positions: EnrichedPosition[] }) {
  const target = useMemo(() => aggregate(positions, "targetValueCHF"), [positions]);
  const actual = useMemo(() => aggregate(positions, "currentValueCHF"), [positions]);

  if (positions.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex gap-6 justify-center">
        <div className="text-center">
          <PieChart width={180} height={180}>
            <Pie data={target} dataKey="value" cx={90} cy={90} innerRadius={50} outerRadius={80} strokeWidth={0}>
              {target.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => `CHF ${formatCHF(Number(v))}`} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px", color: "#e2e8f0" }} />
          </PieChart>
          <span className="text-xs text-slate-400">Target</span>
        </div>
        <div className="text-center">
          <PieChart width={180} height={180}>
            <Pie data={actual} dataKey="value" cx={90} cy={90} innerRadius={50} outerRadius={80} strokeWidth={0}>
              {actual.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => `CHF ${formatCHF(Number(v))}`} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px", color: "#e2e8f0" }} />
          </PieChart>
          <span className="text-xs text-slate-400">Actual</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {target.map((s, i) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-slate-400">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
