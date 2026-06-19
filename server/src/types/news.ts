export interface ScoredNewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceType: "live" | "scenario";
  publishedAt: string;
  sentiment: number;
  sentimentLabel: "BEARISH" | "NEUTRAL" | "BULLISH";
  relevanceScore: number;
  relevanceReason: string;
  reasoningChain: string[];
  affectedPositions: string[];
  isAlert: boolean;
  alertType?: "conflict" | "opportunity";
}

export interface NewsDigest {
  clientId: string;
  articles: ScoredNewsArticle[];
  alerts: ScoredNewsArticle[];
  generatedAt: string;
}
