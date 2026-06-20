import type { ClientProfile, Position } from "./data";
import type { ScoredNewsArticle } from "./news";

export type InterestSource = "static-profile" | "holding" | "sector" | "client-dna" | "breaking";
export type DiscoverySource = "targeted" | "breaking" | "scenario";
export type AttributionTier =
  | "direct-identifier"
  | "direct-issuer"
  | "sector-or-asset-class"
  | "client-interest"
  | "breaking-unattributed";
export type EffectDirection = "negative" | "positive" | "mixed" | "unknown";
export type SeverityBand = "none" | "watch" | "material" | "major";
export type ScoreSource = "llm-rubric" | "heuristic-fallback" | "regressed-market-reaction" | "unavailable";

export interface MonitoredClientRef {
  clientId: string;
  name: string;
  strategy: ClientProfile["strategy"];
  reason: string;
}

export interface MonitoredHoldingRef {
  clientId: string;
  isin: string;
  name: string;
  yahooTicker?: string;
  sectorOrAssetClass: string;
  portfolioWeight: number;
  currentValueCHF: number;
}

export interface MonitoredInterest {
  id: string;
  label: string;
  query: string;
  source: InterestSource;
  clients: MonitoredClientRef[];
  holdings: MonitoredHoldingRef[];
  priority: number;
}

export interface ClientBookProfile {
  clientId: string;
  name: string;
  strategy: ClientProfile["strategy"];
  totalCurrentValueCHF: number;
  bookWeight: number;
  positions: Position[];
}

export interface NewsWatchlist {
  interests: MonitoredInterest[];
  clients: ClientBookProfile[];
}

export interface DiscoveredNewsArticle extends Omit<ScoredNewsArticle, "relevanceScore" | "relevanceReason" | "reasoningChain" | "affectedPositions" | "isAlert" | "alertType"> {
  matchedInterestIds: string[];
  discoverySource: DiscoverySource;
  searchQueries: string[];
}

export interface NewsEvidence {
  source: "article-title" | "article-summary" | "article-source" | "matched-interest" | "matched-holding" | "scoring-rubric";
  text: string;
  supports: "affected-entity" | "severity-score" | "severity-band" | "direction" | "uncertainty";
}

export interface NewsEffectAssessment {
  eventFamily: string;
  effectMechanisms: string[];
  direction: EffectDirection;
  severityScore: number;
  severityBand: SeverityBand;
  scoreSource: ScoreSource;
  affectedEntityOrSleeve: string;
  affectedEntityRationale: string;
  evidence: NewsEvidence[];
  scoreRationale: string;
  uncertaintyFlags: string[];
}

export interface AffectedHoldingImpact {
  isin: string;
  name: string;
  portfolioWeight: number;
  matchReason: string;
  attributionTier: AttributionTier;
  severityBand: SeverityBand;
  severityScore: number;
}

export interface ClientNewsScore {
  clientId: string;
  clientName: string;
  strategy: ClientProfile["strategy"];
  clientPortfolioWeightAcrossBook: number;
  affectedSleeveLabel: string;
  attributionTier: AttributionTier;
  portfolioExposureShare: number;
  severityScore: number;
  severityBand: SeverityBand;
  effectDirection: EffectDirection;
  eventFamily: string;
  effectMechanisms: string[];
  clientNewsScore: number;
  reason: string;
  evidence: NewsEvidence[];
  affectedHoldings: AffectedHoldingImpact[];
}

export interface NewsImpactScore {
  article: DiscoveredNewsArticle;
  globalNewsScore: number;
  maxClientNewsScore: number;
  affectedClientCount: number;
  severityBand: SeverityBand;
  effectDirection: EffectDirection;
  eventFamily: string;
  clientScores: ClientNewsScore[];
}

