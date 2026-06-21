import type { ScoredNewsArticle } from "./news";
import type { AttributionTier, EffectDirection, SeverityBand } from "./news-impact";

export type HomeTodoSeverity = "high" | "medium" | "low";
export type HomeTriggerType = "news" | "crm" | "client-request" | "life-event";
export type HomeTodoScope = "client" | "global";

export interface HomeAffectedHolding {
  isin: string;
  name: string;
  portfolioWeight: number;
  matchReason: string;
  attributionTier: AttributionTier;
  severityBand: SeverityBand;
}

export interface HomeAffectedClient {
  id: string;
  name: string;
  strategy: string;
  reason: string;
  severity: HomeTodoSeverity;
  clientNewsScore: number;
  portfolioExposureShare: number;
  severityBand: SeverityBand;
  effectDirection: EffectDirection;
  affectedSleeveLabel: string;
  affectedHoldings: HomeAffectedHolding[];
  relevanceScore: number;
  alertType?: ScoredNewsArticle["alertType"];
}

export interface HomeSourceArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceType: ScoredNewsArticle["sourceType"];
  publishedAt: string;
  relevanceScore: number;
  globalNewsScore?: number;
  severityBand?: SeverityBand;
}

export interface HomeTodo {
  id: string;
  title: string;
  summary: string;
  severity: HomeTodoSeverity;
  scope: HomeTodoScope;
  triggerType: HomeTriggerType;
  recommendedAction: string;
  affectedClients: HomeAffectedClient[];
  sourceArticle: HomeSourceArticle;
  sourceArticles: HomeSourceArticle[];
  createdAt: string;
  riskTags: string[];
  globalNewsScore?: number;
  clientNewsScore?: number;
  portfolioExposureShare?: number;
  severityBand?: SeverityBand;
  effectDirection?: EffectDirection;
  eventFamily?: string;
}

export interface HomeNewsItem {
  id: string;
  articleId: string;
  title: string;
  summary: string;
  source: string;
  sourceType: ScoredNewsArticle["sourceType"];
  url: string;
  publishedAt: string;
  sentiment: number;
  sentimentLabel: ScoredNewsArticle["sentimentLabel"];
  relevanceScore: number;
  globalNewsScore: number;
  maxClientNewsScore: number;
  affectedClientCount: number;
  severityBand: SeverityBand;
  effectDirection: EffectDirection;
  eventFamily: string;
  discoverySource: "targeted" | "breaking" | "scenario";
  matchedInterests: string[];
  affectedClients: HomeAffectedClient[];
}

export interface HomeDashboard {
  todos: HomeTodo[];
  latestNews: HomeNewsItem[];
  generatedAt: string;
}
