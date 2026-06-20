import type { SeverityBand } from "../types/news-impact";

export const STATIC_MANDATE_INTERESTS: Record<string, string[]> = {
  Defensive: [
    "interest rates",
    "inflation",
    "credit downgrade",
    "Swiss franc",
    "investment grade credit",
  ],
  Balanced: [
    "geopolitical risk",
    "healthcare sector",
    "consumer staples",
    "equity markets",
    "central bank rates",
  ],
  Growth: [
    "technology stocks",
    "artificial intelligence",
    "private markets",
    "crypto regulation",
    "growth equities",
  ],
};

export const BREAKING_NEWS_QUERIES = [
  { id: "breaking-war", label: "War or military escalation", query: "war invasion escalation conflict" },
  { id: "breaking-tariffs", label: "Tariffs or trade restrictions", query: "tariff sanctions trade restrictions export ban" },
  { id: "breaking-rates", label: "Central bank rates", query: "central bank rate hike rate cut inflation" },
  { id: "breaking-credit", label: "Default or bankruptcy", query: "default bankruptcy credit downgrade insolvency" },
  { id: "breaking-energy", label: "Energy or commodity shock", query: "oil shock energy supply commodity prices" },
  { id: "breaking-volatility", label: "Market volatility", query: "market crash volatility selloff" },
];

export const HOME_NEWS_LIMITS = {
  targetedQueries: parseInt(process.env.HOME_TARGETED_NEWS_QUERIES || "6", 10),
  breakingQueries: parseInt(process.env.HOME_BREAKING_NEWS_QUERIES || "2", 10),
  articlesPerQuery: parseInt(process.env.HOME_ARTICLES_PER_QUERY || "3", 10),
  discoveredArticles: parseInt(process.env.HOME_DISCOVERED_ARTICLES_LIMIT || "18", 10),
  latestNews: parseInt(process.env.HOME_LATEST_NEWS_LIMIT || "12", 10),
  todos: parseInt(process.env.HOME_TODOS_LIMIT || "16", 10),
};

export const HOME_SCORE_THRESHOLDS = {
  clientNewsScore: parseFloat(process.env.HOME_CLIENT_NEWS_SCORE_THRESHOLD || "0.003"),
  globalNewsScore: parseFloat(process.env.HOME_GLOBAL_NEWS_SCORE_THRESHOLD || "0.002"),
};

export const SEVERITY_SCORE_BANDS: Record<SeverityBand, { min: number; max: number }> = {
  none: { min: 0, max: 0.19 },
  watch: { min: 0.2, max: 0.44 },
  material: { min: 0.45, max: 0.74 },
  major: { min: 0.75, max: 1 },
};

export function bandForSeverityScore(score: number): SeverityBand {
  const value = Math.max(0, Math.min(1, score));
  if (value >= SEVERITY_SCORE_BANDS.major.min) return "major";
  if (value >= SEVERITY_SCORE_BANDS.material.min) return "material";
  if (value >= SEVERITY_SCORE_BANDS.watch.min) return "watch";
  return "none";
}

export function scoreForSeverityBand(band: SeverityBand): number {
  switch (band) {
    case "major": return 0.85;
    case "material": return 0.6;
    case "watch": return 0.3;
    case "none": return 0;
  }
}
