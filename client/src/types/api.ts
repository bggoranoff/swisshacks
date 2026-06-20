export interface ClientSummary {
  id: string;
  name: string;
  description: string;
  strategy: "Defensive" | "Balanced" | "Growth";
  crmEntryCount: number;
  triggerEvent?: string;
}

export interface ClientDNA {
  clientId: string;
  values: string[];
  lifeEvents: string[];
  businessContext: string[];
  riskSensitivities: string[];
  personalPriorities: string[];
  communicationStyle: "data-driven" | "values-led" | "balanced";
  communicationProfile?: {
    style: "data-driven" | "values-led" | "balanced";
    rationale: string;
    evidence: { trait: string; crmDate: string; crmExcerpt: string }[];
    confidence: number;
  };
  investmentProfile?: {
    objectives: string[];
    riskTolerance: "low" | "medium" | "high" | "unknown";
    hardConstraints: string[];
    softPreferences: string[];
    exclusions: string[];
    positiveScreens: string[];
    valueThemes: string[];
    liquidityNeeds: string[];
    reputationSensitivity: "low" | "medium" | "high" | "unknown";
    temporalChanges: string[];
    evidence: { trait: string; crmDate: string; crmExcerpt: string }[];
  };
  profileSource?: "crm-inferred" | "crm-heuristic" | "demo-profile" | "unavailable";
  summary: string;
  evidence: { trait: string; crmDate: string; crmExcerpt: string }[];
  traitConfidence: Record<string, number>;
}

export interface Position {
  isin: string;
  name: string;
  instrumentType: string;
  valorNumber: string;
  mic: string;
  sectorOrAssetClass: string;
  targetValueCHF: number;
  currentValueCHF: number;
  driftPercent: number;
  quantity: number;
  yahooTicker?: string;
}

export interface DNAConflict {
  severity: "high" | "medium" | "low";
  reason: string;
  reasoningChain: string[];
  riskType: "financial" | "reputational" | "values";
  suggestedSwap?: {
    isin: string;
    name: string;
    reason: string;
    cioRating?: string;
  };
}

export interface EnrichedPosition extends Position {
  livePrice?: number;
  liveCurrency?: string;
  livePriceDate?: string;
  priceSource: "live" | "excel";
  cioRating?: "BUY" | "HOLD" | "SELL";
  dnaConflict?: DNAConflict;
}

export interface PortfolioAnalysis {
  clientId: string;
  strategy: string;
  totalValueCHF: number;
  positions: EnrichedPosition[];
  driftBreaches: { assetClass: string; targetPct: number; actualPct: number; driftPct: number }[];
  conflicts: DNAConflict[];
  cioConflicts?: DNAConflict[];
  summary?: string;
  liveCount?: number;
}

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

export type HomeTodoSeverity = "high" | "medium" | "low";
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
  relevanceScore: number;
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
  sourceArticles: HomeSourceArticle[];
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

export interface CrmLogEntry {
  id: number;
  date: string;
  rawDate: string;
  medium: string;
  rmName: string;
  clientContact: string;
  note: string;
}

export interface AdvisoryMessage {
  id: string;
  clientId: string;
  subject: string;
  body: string;
  tone: "data-driven" | "values-led" | "balanced";
  toneInfluences: { dnaValue: string; effect: string }[];
  referencedAlert?: string;
  proposedAction?: string;
  reasoning: string;
  confidence: number;
  status: "draft" | "approved" | "rejected";
  rmNotes?: string;
  disclaimer: string;
  traceId?: string;
  genericAdvisory?: string;
  generatedAt?: string;
}
