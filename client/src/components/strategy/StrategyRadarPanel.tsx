import { useState } from "react";
import type { ClientDNA, PortfolioAnalysis, NewsDigest } from "../../types/api";
import { Card } from "../shared/Card";
import { SkeletonBlock } from "../shared/SkeletonLoader";
import { EmptyState } from "../shared/EmptyState";
import { FadeIn } from "../shared/FadeIn";
import { Target, Quote } from "lucide-react";

// ── Scoring ───────────────────────────────────────────────────────────────────

const EQUITY_CLASSES = new Set([
  "Foreign (Dev. Markets)", "Domestic (CHF)", "Emerging Markets",
  "Cryptocurrencies", "Private Markets", "Global Listed REITs", "Swiss Real Estate",
]);

const SAFE_CLASSES = new Set([
  "Foreign Bonds (G7)", "Domestic Bonds (CHF)", "Emerging Market Bonds",
  "Cash & Money Market", "Commodities / Gold",
]);

const RISK_BASE: Record<string, number> = { low: 2.5, medium: 5.5, high: 8.5, unknown: 5 };

interface Scores { growthTilt: number; capitalSafety: number; riskAppetite: number; valuesAlignment: number; liquidity: number; diversification: number; }

function r1(n: number) { return Math.round(n * 10) / 10; }

function computeScores(portfolio: PortfolioAnalysis | null, dna: ClientDNA | null): Scores {
  const ip = dna?.investmentProfile;
  let equityVal = 0, safeVal = 0, cashVal = 0, totalVal = 0;
  const classAmounts: Record<string, number> = {};
  for (const p of portfolio?.positions ?? []) {
    const v = p.currentValueCHF;
    const ac = p.sectorOrAssetClass;
    totalVal += v;
    classAmounts[ac] = (classAmounts[ac] ?? 0) + v;
    if (EQUITY_CLASSES.has(ac)) equityVal += v;
    if (SAFE_CLASSES.has(ac)) safeVal += v;
    if (ac === "Cash & Money Market") cashVal += v;
  }
  const denom = totalVal || 1;
  const significantClasses = Object.values(classAmounts).filter(v => v / denom > 0.02).length;
  const valuesCount = (dna?.values?.length ?? 0) + (ip?.exclusions?.length ?? 0) + (ip?.positiveScreens?.length ?? 0) + (ip?.valueThemes?.length ?? 0);
  const riskAppetite = Math.max(0, Math.min(10, (RISK_BASE[ip?.riskTolerance ?? "unknown"]) - (dna?.riskSensitivities?.length ?? 0) * 0.35));
  const liqNeeds = ip?.liquidityNeeds?.length ?? 0;
  return {
    growthTilt:      r1(equityVal / denom * 10),
    capitalSafety:   r1(safeVal  / denom * 10),
    riskAppetite:    r1(riskAppetite),
    valuesAlignment: r1(Math.min(10, valuesCount * 0.55)),
    liquidity:       r1(Math.min(10, cashVal / denom * 50 + liqNeeds * 1.3)),
    diversification: r1(Math.min(10, significantClasses * 1.1)),
  };
}

// ── Citation matching ─────────────────────────────────────────────────────────

interface Citation { excerpt: string; date: string; source: "crm" | "news"; }

const AXIS_KEYWORDS: Record<string, string[]> = {
  growthTilt:      ["growth", "equity", "equities", "return", "appreciation", "stock", "shares"],
  capitalSafety:   ["preserv", "safety", "conservative", "bond", "defensive", "protect", "fixed-income", "fixed income"],
  riskAppetite:    ["risk", "volatil", "sensitiv", "concern", "cautio", "exposure", "hedge"],
  valuesAlignment: ["value", "esg", "exclusion", "screen", "ethic", "sustainab", "impact", "mission", "foundation", "philanthrop", "reput"],
  liquidity:       ["liquid", "cash", "redeem", "withdraw", "grant", "funding", "immedia"],
  diversification: ["diversif", "allocation", "spread", "class", "mix", "balance", "broad"],
};

function matchCitations(
  key: string,
  dna: ClientDNA | null,
  news: NewsDigest | null,
): Citation[] {
  const keywords = AXIS_KEYWORDS[key] ?? [];
  const results: Citation[] = [];

  const allEvidence = [
    ...(dna?.evidence ?? []),
    ...(dna?.investmentProfile?.evidence ?? []),
  ];

  for (const e of allEvidence) {
    const text = (e.crmExcerpt ?? "").toLowerCase();
    if (keywords.some(kw => text.includes(kw))) {
      results.push({ excerpt: e.crmExcerpt, date: e.crmDate, source: "crm" });
    }
  }

  if (news) {
    for (const a of news.articles.slice(0, 10)) {
      const text = `${a.title} ${a.summary}`.toLowerCase();
      if (keywords.some(kw => text.includes(kw))) {
        results.push({ excerpt: a.title, date: a.publishedAt?.slice(0, 10) ?? "", source: "news" });
      }
    }
  }

  // Dedupe by first 40 chars, keep max 2
  const seen = new Set<string>();
  return results.filter(c => {
    const k = c.excerpt.slice(0, 40).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 2);
}

// ── Explanations ──────────────────────────────────────────────────────────────

function strategySummary(strategy: string, scores: Scores, dna: ClientDNA | null): string {
  const eqPct = r1(scores.growthTilt * 10);
  const sfPct = r1(scores.capitalSafety * 10);
  const rt = dna?.investmentProfile?.riskTolerance ?? "unknown";

  if (strategy === "Balanced")
    return `The portfolio splits ${eqPct}% growth and ${sfPct}% defensive assets with ${rt} risk tolerance — a balanced mix of capital appreciation and preservation.`;
  if (strategy === "Defensive")
    return `With ${sfPct}% in bonds, cash and gold versus ${eqPct}% equities, and ${rt} risk tolerance, the portfolio prioritises capital preservation.`;
  return `${eqPct}% is allocated to equities and alternatives with ${rt} risk tolerance, orienting the portfolio toward long-term capital growth.`;
}

type AxisKey = typeof AXES[number]["key"];

function axisExplanation(key: AxisKey, score: number, portfolio: PortfolioAnalysis | null, dna: ClientDNA | null): string {
  const ip = dna?.investmentProfile;
  const totalVal = portfolio?.positions.reduce((s, p) => s + p.currentValueCHF, 0) ?? 0;
  const classAmounts: Record<string, number> = {};
  for (const p of portfolio?.positions ?? []) classAmounts[p.sectorOrAssetClass] = (classAmounts[p.sectorOrAssetClass] ?? 0) + p.currentValueCHF;
  const denom = totalVal || 1;

  switch (key) {
    case "growthTilt": {
      const pct = r1(score * 10);
      const top = Object.entries(classAmounts).filter(([ac]) => EQUITY_CLASSES.has(ac)).sort(([,a],[,b]) => b - a).slice(0, 2).map(([ac, v]) => `${ac} (${r1(v / denom * 100)}%)`);
      return `${pct}% of the portfolio is in growth assets — ${top.join(", ")}. Score ${score}/10 = portfolio equity allocation scaled to 10.`;
    }
    case "capitalSafety": {
      const pct = r1(score * 10);
      const top = Object.entries(classAmounts).filter(([ac]) => SAFE_CLASSES.has(ac)).sort(([,a],[,b]) => b - a).slice(0, 2).map(([ac, v]) => `${ac} (${r1(v / denom * 100)}%)`);
      return `${pct}% is in defensive holdings — ${top.join(", ")}. Score ${score}/10 = bond + cash + gold allocation scaled to 10.`;
    }
    case "riskAppetite": {
      const rt = ip?.riskTolerance ?? "unknown";
      const rsCount = dna?.riskSensitivities?.length ?? 0;
      return `CRM-derived risk tolerance is ${rt} (base ${RISK_BASE[rt]}/10)${rsCount > 0 ? `, reduced by ${rsCount} documented risk sensitivit${rsCount > 1 ? "ies" : "y"} (−0.35 each)` : ""}. Final score: ${score}/10.`;
    }
    case "valuesAlignment": {
      const vals = dna?.values?.length ?? 0;
      const excl = ip?.exclusions?.length ?? 0;
      const screens = ip?.positiveScreens?.length ?? 0;
      const themes = ip?.valueThemes?.length ?? 0;
      const total = vals + excl + screens + themes;
      return `${total} ESG/values factors identified: ${vals} core values, ${excl} exclusions, ${screens} positive screens, ${themes} themes. Score ${score}/10 = factor count × 0.55, capped at 10.`;
    }
    case "liquidity": {
      const cashPct = r1((classAmounts["Cash & Money Market"] ?? 0) / denom * 100);
      const needs = ip?.liquidityNeeds?.length ?? 0;
      return `${cashPct}% held in cash & money market${needs > 0 ? ` plus ${needs} documented liquidity need${needs > 1 ? "s" : ""}` : ""}. Score ${score}/10 = cash% × 5 + needs × 1.3.`;
    }
    case "diversification": {
      const count = Object.values(classAmounts).filter(v => v / denom > 0.02).length;
      return `Holdings spread across ${count} asset classes with >2% weight. Score ${score}/10 = class count × 1.1, capped at 10.`;
    }
  }
}

// ── Strategy colours ──────────────────────────────────────────────────────────

const STYLE: Record<string, { stroke: string; fill: string; badge: string }> = {
  Balanced:  { stroke: "#fb923c", fill: "rgba(251,146,60,0.18)",  badge: "bg-amber-900/50 text-amber-300 border border-amber-700/50" },
  Growth:    { stroke: "#4ade80", fill: "rgba(74,222,128,0.18)",  badge: "bg-green-900/50 text-green-300 border border-green-700/50" },
  Defensive: { stroke: "#60a5fa", fill: "rgba(96,165,250,0.18)",  badge: "bg-blue-900/50 text-blue-300 border border-blue-700/50" },
};

// ── SVG Spider Chart ──────────────────────────────────────────────────────────

const AXES = [
  { key: "growthTilt",      label: "Growth Tilt" },
  { key: "capitalSafety",   label: "Capital Safety" },
  { key: "riskAppetite",    label: "Risk Appetite" },
  { key: "valuesAlignment", label: "Values Alignment" },
  { key: "liquidity",       label: "Liquidity" },
  { key: "diversification", label: "Diversification" },
] as const;

const N = AXES.length;
const CX = 200, CY = 185, MAX_R = 115;
const RINGS = [0.2, 0.4, 0.6, 0.8, 1.0];

function angle(i: number) { return -Math.PI / 2 + (2 * Math.PI * i) / N; }
function pt(r: number, i: number) { const a = angle(i); return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }; }

function polygonPoints(rValues: number[]): string {
  return rValues.map((r, i) => { const { x, y } = pt(r, i); return `${x},${y}`; }).join(" ");
}

function ringPoints(scale: number): string {
  return Array.from({ length: N }, (_, i) => { const { x, y } = pt(MAX_R * scale, i); return `${x},${y}`; }).join(" ");
}

function labelPos(i: number) {
  const a = angle(i);
  const r = MAX_R + 22;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), anchor: (Math.cos(a) > 0.1 ? "start" : Math.cos(a) < -0.1 ? "end" : "middle") as "start" | "middle" | "end" };
}

interface SpiderChartProps {
  scores: Scores;
  stroke: string;
  fill: string;
  hoveredAxis: number | null;
  onHoverAxis: (i: number | null) => void;
}

function SpiderChart({ scores, stroke, fill, hoveredAxis, onHoverAxis }: SpiderChartProps) {
  const rValues = AXES.map(ax => (scores[ax.key] / 10) * MAX_R);
  return (
    <svg viewBox="0 0 400 380" className="w-full" aria-hidden="true">
      {RINGS.map(scale => (
        <polygon key={scale} points={ringPoints(scale)} fill="none" stroke="var(--color-slate-700, #334155)" strokeWidth={scale === 1.0 ? 1.5 : 0.7} strokeOpacity={scale === 1.0 ? 0.8 : 0.4} />
      ))}
      {AXES.map((_, i) => {
        const { x, y } = pt(MAX_R, i);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--color-slate-700, #334155)" strokeWidth={0.7} strokeOpacity={0.5} />;
      })}
      <polygon points={polygonPoints(rValues)} fill={fill} stroke="none" />
      <polygon points={polygonPoints(rValues)} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      {rValues.map((r, i) => {
        const { x, y } = pt(r, i);
        const isHovered = hoveredAxis === i;
        return (
          <g key={i} onMouseEnter={() => onHoverAxis(i)} onMouseLeave={() => onHoverAxis(null)} style={{ cursor: "pointer" }}>
            <circle cx={x} cy={y} r={16} fill="transparent" />
            <circle cx={x} cy={y} r={isHovered ? 7 : 4} fill={stroke} style={{ transition: "r 0.15s" }} />
          </g>
        );
      })}
      {AXES.map((ax, i) => {
        const { x, y, anchor } = labelPos(i);
        const isHovered = hoveredAxis === i;
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fill={isHovered ? "var(--color-slate-200, #e2e8f0)" : "var(--color-slate-400, #94a3b8)"} fontSize={12} fontWeight={isHovered ? 600 : 400} fontFamily="ui-sans-serif, system-ui, sans-serif" style={{ transition: "fill 0.15s" }} onMouseEnter={() => onHoverAxis(i)} onMouseLeave={() => onHoverAxis(null)} cursor="pointer">
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface StrategyRadarPanelProps {
  dna: ClientDNA | null;
  portfolio: PortfolioAnalysis | null;
  news: NewsDigest | null;
  strategy: string;
  loading: boolean;
}

function PanelHeader({ badge }: { badge?: string }) {
  const style = badge ? STYLE[badge] ?? STYLE["Balanced"] : null;
  return (
    <div className="flex items-center gap-3 mb-4">
      <Target className="h-4 w-4 text-six-red/70 shrink-0" />
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Strategy Profile</h2>
      {style && badge && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${style.badge}`}>{badge}</span>}
    </div>
  );
}

function CitationBlock({ citations, stroke }: { citations: Citation[]; stroke: string }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {citations.map((c, i) => (
        <div key={i} className="flex items-start gap-2">
          <Quote className="h-3 w-3 mt-0.5 shrink-0" style={{ color: stroke, opacity: 0.6 }} />
          <p className="text-xs text-slate-500 leading-snug italic">
            {c.excerpt.length > 120 ? c.excerpt.slice(0, 120) + "..." : c.excerpt}
            <span className="not-italic text-slate-600 ml-1">
              — {c.source === "crm" ? "CRM" : "News"}{c.date ? `, ${c.date}` : ""}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}

export function StrategyRadarPanel({ dna, portfolio, news, strategy, loading }: StrategyRadarPanelProps) {
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null);

  if (loading) return <Card><PanelHeader /><SkeletonBlock lines={4} /></Card>;
  if (!dna && !portfolio) return <Card><PanelHeader /><EmptyState message="Select a client to view strategy profile" /></Card>;

  const scores = computeScores(portfolio, dna);
  const style = STYLE[strategy] ?? STYLE["Balanced"];

  const defaultText = strategySummary(strategy, scores, dna);
  const hoveredKey = hoveredAxis !== null ? AXES[hoveredAxis].key : null;
  const hoveredLabel = hoveredAxis !== null ? AXES[hoveredAxis].label : null;
  const hoveredText = hoveredKey ? axisExplanation(hoveredKey, scores[hoveredKey], portfolio, dna) : null;
  const hoveredCitations = hoveredKey ? matchCitations(hoveredKey, dna, news) : [];

  // Default citations: pick from risk and values axes
  const defaultCitations = [
    ...matchCitations("riskAppetite", dna, news).slice(0, 1),
    ...matchCitations("valuesAlignment", dna, news).slice(0, 1),
  ];

  return (
    <Card>
      <FadeIn>
        <PanelHeader badge={strategy} />

        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* Spider chart — left */}
          <div className="w-full md:w-1/2 shrink-0">
            <SpiderChart
              scores={scores}
              stroke={style.stroke}
              fill={style.fill}
              hoveredAxis={hoveredAxis}
              onHoverAxis={setHoveredAxis}
            />
          </div>

          {/* Info panel — right */}
          <div className="flex-1 min-w-0 md:pt-6">
            {hoveredText ? (
              <>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">
                  {hoveredLabel} — {scores[hoveredKey!]}/10
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">{hoveredText}</p>
                <CitationBlock citations={hoveredCitations} stroke={style.stroke} />
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">
                  Why {strategy}?
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">{defaultText}</p>
                <CitationBlock citations={defaultCitations} stroke={style.stroke} />
                <p className="text-xs text-slate-500 mt-3 italic">Hover the chart to explore each dimension.</p>
              </>
            )}
          </div>
        </div>
      </FadeIn>
    </Card>
  );
}
