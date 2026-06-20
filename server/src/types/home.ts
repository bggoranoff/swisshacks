import type { ScoredNewsArticle } from "./news";

export type HomeTodoSeverity = "critical" | "high" | "medium" | "low";
export type HomeTriggerType = "news" | "crm" | "client-request" | "life-event";

export interface HomeAffectedClient {
  id: string;
  name: string;
  strategy: string;
  reason: string;
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
}

export interface HomeTodo {
  id: string;
  title: string;
  summary: string;
  severity: HomeTodoSeverity;
  triggerType: HomeTriggerType;
  recommendedAction: string;
  affectedClients: HomeAffectedClient[];
  sourceArticle: HomeSourceArticle;
  createdAt: string;
  riskTags: string[];
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
  affectedClients: HomeAffectedClient[];
}

export interface HomeDashboard {
  todos: HomeTodo[];
  latestNews: HomeNewsItem[];
  generatedAt: string;
}
