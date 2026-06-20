import { bandForSeverityScore } from "../config/news-scoring";
import { NewsEffectService } from "./news-effect.service";
import { normalizeEntityName } from "./news-watchlist.service";
import type {
  AffectedHoldingImpact,
  AttributionTier,
  ClientNewsScore,
  DiscoveredNewsArticle,
  MonitoredHoldingRef,
  MonitoredInterest,
  NewsImpactScore,
  NewsWatchlist,
  SeverityBand,
} from "../types/news-impact";

interface TargetHolding extends MonitoredHoldingRef {
  attributionTier: AttributionTier;
  matchReason: string;
}

interface AttributionTarget {
  key: string;
  label: string;
  attributionTier: AttributionTier;
  matchReason: string;
  holdingsByClient: Map<string, TargetHolding[]>;
}

interface HoldingContribution {
  holding: TargetHolding;
  severityScore: number;
  severityBand: SeverityBand;
  eventFamily: string;
  effectMechanisms: string[];
  effectDirection: ClientNewsScore["effectDirection"];
  targetLabel: string;
  evidence: ClientNewsScore["evidence"];
  reason: string;
}

const attributionRank: Record<AttributionTier, number> = {
  "direct-identifier": 5,
  "direct-issuer": 4,
  "sector-or-asset-class": 3,
  "client-interest": 1,
  "breaking-unattributed": 0,
};

const severityRank: Record<SeverityBand, number> = {
  none: 0,
  watch: 1,
  material: 2,
  major: 3,
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tickerRoot(ticker?: string): string {
  return (ticker || "").split(".")[0].trim().toLowerCase();
}

function isSovereignLikeHolding(name: string): boolean {
  return /(confederation|treasury|bund|oat|republic|kingdom|kanton|government|sovereign|mexican states|brazil|indonesia|south africa|saudi arabia)/i.test(name);
}

function hasSovereignMarketContext(articleTextValue: string): boolean {
  return /\b(bond|bonds|yield|yields|debt|deficit|budget|fiscal|rating|downgrade|default|spread|spreads|auction|issuance|maturity|coupon|inflation|central bank|rate hike|rate cut|sovereign|treasury market)\b/i.test(articleTextValue);
}

function articleText(article: DiscoveredNewsArticle): string {
  return normalizeText(`${article.title} ${article.summary}`);
}

function targetKey(label: string, tier: AttributionTier): string {
  return `${tier}:${normalizeText(label).replace(/\s+/g, "-")}`;
}

function createTarget(
  map: Map<string, AttributionTarget>,
  label: string,
  tier: AttributionTier,
  matchReason: string,
): AttributionTarget {
  const key = targetKey(label, tier);
  const existing = map.get(key);
  if (existing) return existing;

  const target: AttributionTarget = {
    key,
    label,
    attributionTier: tier,
    matchReason,
    holdingsByClient: new Map(),
  };
  map.set(key, target);
  return target;
}

function addHoldingToTarget(target: AttributionTarget, holding: TargetHolding) {
  const holdings = target.holdingsByClient.get(holding.clientId) || [];
  const existing = holdings.find(h => h.isin === holding.isin);
  if (!existing) {
    holdings.push(holding);
  } else if (attributionRank[holding.attributionTier] > attributionRank[existing.attributionTier]) {
    existing.attributionTier = holding.attributionTier;
    existing.matchReason = holding.matchReason;
  }
  target.holdingsByClient.set(holding.clientId, holdings);
}

function directMatch(articleTextValue: string, holding: MonitoredHoldingRef): { tier: AttributionTier; reason: string } | undefined {
  const isin = normalizeText(holding.isin);
  const ticker = tickerRoot(holding.yahooTicker);
  const entity = normalizeText(normalizeEntityName(holding.name));
  const rawName = normalizeText(holding.name);
  const sovereignNeedsMarketContext = isSovereignLikeHolding(holding.name);

  if (sovereignNeedsMarketContext && !hasSovereignMarketContext(articleTextValue)) {
    return undefined;
  }

  if (isin && articleTextValue.includes(isin)) {
    return { tier: "direct-identifier", reason: `Article text matched ISIN ${holding.isin}.` };
  }
  if (ticker && ticker.length >= 3 && new RegExp(`\\b${ticker}\\b`, "i").test(articleTextValue)) {
    return { tier: "direct-identifier", reason: `Article text matched ticker ${ticker.toUpperCase()}.` };
  }
  if (entity && entity.length >= 4 && articleTextValue.includes(entity)) {
    return { tier: "direct-issuer", reason: `Article text matched issuer name ${holding.name}.` };
  }
  if (rawName && rawName.length >= 4 && articleTextValue.includes(rawName)) {
    return { tier: "direct-issuer", reason: `Article text matched holding name ${holding.name}.` };
  }

  return undefined;
}

function allWatchlistHoldings(watchlist: NewsWatchlist): MonitoredHoldingRef[] {
  const byKey = new Map<string, MonitoredHoldingRef>();
  for (const interest of watchlist.interests) {
    for (const holding of interest.holdings) {
      byKey.set(`${holding.clientId}:${holding.isin}`, holding);
    }
  }
  for (const client of watchlist.clients) {
    for (const position of client.positions) {
      if (!position.name || position.currentValueCHF <= 0) continue;
      const portfolioWeight = client.totalCurrentValueCHF > 0
        ? position.currentValueCHF / client.totalCurrentValueCHF
        : 0;
      byKey.set(`${client.clientId}:${position.isin}`, {
        clientId: client.clientId,
        isin: position.isin,
        name: position.name,
        yahooTicker: position.yahooTicker,
        sectorOrAssetClass: position.sectorOrAssetClass,
        portfolioWeight,
        currentValueCHF: position.currentValueCHF,
      });
    }
  }
  return Array.from(byKey.values());
}

function strongestAttribution(a: AttributionTier, b: AttributionTier): AttributionTier {
  return attributionRank[a] >= attributionRank[b] ? a : b;
}

function rankAttribution(tier: AttributionTier): number {
  return attributionRank[tier];
}

export class NewsAttributionService {
  constructor(private effectService: NewsEffectService) {}

  async scoreArticles(articles: DiscoveredNewsArticle[], watchlist: NewsWatchlist): Promise<NewsImpactScore[]> {
    const results = await Promise.all(
      articles.map(article => {
        const targets = this.buildTargets(article, watchlist);
        return this.scoreArticle(article, targets, watchlist);
      }),
    );

    return results.sort(
      (a, b) =>
        b.globalNewsScore - a.globalNewsScore ||
        b.maxClientNewsScore - a.maxClientNewsScore ||
        new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime(),
    );
  }

  private buildTargets(article: DiscoveredNewsArticle, watchlist: NewsWatchlist): AttributionTarget[] {
    const text = articleText(article);
    const targets = new Map<string, AttributionTarget>();
    const interestsById = new Map(watchlist.interests.map(i => [i.id, i]));

    for (const id of article.matchedInterestIds) {
      const interest = interestsById.get(id);
      if (!interest) continue;

      for (const holding of interest.holdings) {
        const confirmed = directMatch(text, holding);
        if (!confirmed) continue;

        const tier: AttributionTier = interest.source === "holding"
          ? confirmed.tier
          : "sector-or-asset-class";
        const target = createTarget(
          targets,
          holding.name,
          tier,
          `${confirmed.reason} Article was discovered through monitored interest "${interest.label}".`,
        );
        addHoldingToTarget(target, {
          ...holding,
          attributionTier: tier,
          matchReason: `${confirmed.reason} Matched monitored interest "${interest.label}".`,
        });
      }
    }

    for (const holding of allWatchlistHoldings(watchlist)) {
      const match = directMatch(text, holding);
      if (!match) continue;

      const label = match.tier === "direct-identifier" ? holding.name : normalizeEntityName(holding.name) || holding.name;
      const target = createTarget(targets, label, match.tier, match.reason);
      addHoldingToTarget(target, {
        ...holding,
        attributionTier: match.tier,
        matchReason: match.reason,
      });
    }

    return Array.from(targets.values()).filter(target => target.holdingsByClient.size > 0);
  }

  private async scoreArticle(
    article: DiscoveredNewsArticle,
    targets: AttributionTarget[],
    watchlist: NewsWatchlist,
  ): Promise<NewsImpactScore> {
    const clientProfiles = new Map(watchlist.clients.map(client => [client.clientId, client]));
    const contributionByClient = new Map<string, Map<string, HoldingContribution>>();

    for (const target of targets) {
      const effect = await this.effectService.assess(article, {
        affectedEntityOrSleeve: target.label,
        attributionTier: target.attributionTier,
        matchReason: target.matchReason,
      });

      for (const [clientId, holdings] of target.holdingsByClient.entries()) {
        const clientMap = contributionByClient.get(clientId) || new Map();
        for (const holding of holdings) {
          const existing = clientMap.get(holding.isin);
          const candidateStrength = rankAttribution(holding.attributionTier) * 10 + effect.severityScore;
          const existingStrength = existing
            ? rankAttribution(existing.holding.attributionTier) * 10 + existing.severityScore
            : -1;

          if (!existing || candidateStrength > existingStrength) {
            clientMap.set(holding.isin, {
              holding,
              severityScore: effect.severityScore,
              severityBand: effect.severityBand,
              eventFamily: effect.eventFamily,
              effectMechanisms: effect.effectMechanisms,
              effectDirection: effect.direction,
              targetLabel: target.label,
              evidence: effect.evidence,
              reason: effect.scoreRationale || effect.affectedEntityRationale,
            });
          }
        }
        contributionByClient.set(clientId, clientMap);
      }
    }

    const clientScores: ClientNewsScore[] = [];

    for (const [clientId, contributions] of contributionByClient.entries()) {
      const client = clientProfiles.get(clientId);
      if (!client) continue;

      const values = Array.from(contributions.values());
      const portfolioExposureShare = values.reduce((sum, c) => sum + c.holding.portfolioWeight, 0);
      const clientNewsScore = values.reduce((sum, c) => sum + c.holding.portfolioWeight * c.severityScore, 0);
      const severityScore = portfolioExposureShare > 0 ? clientNewsScore / portfolioExposureShare : 0;
      const strongest = values
        .slice()
        .sort((a, b) =>
          b.severityScore - a.severityScore ||
          attributionRank[b.holding.attributionTier] - attributionRank[a.holding.attributionTier] ||
          b.holding.portfolioWeight - a.holding.portfolioWeight,
        )[0];

      if (!strongest || clientNewsScore <= 0) continue;

      const attributionTier = values.reduce<AttributionTier>(
        (best, current) => strongestAttribution(best, current.holding.attributionTier),
        "breaking-unattributed",
      );
      const affectedHoldings: AffectedHoldingImpact[] = values
        .map(value => ({
          isin: value.holding.isin,
          name: value.holding.name,
          portfolioWeight: value.holding.portfolioWeight,
          matchReason: value.holding.matchReason,
          attributionTier: value.holding.attributionTier,
          severityBand: value.severityBand,
          severityScore: value.severityScore,
        }))
        .sort((a, b) => b.portfolioWeight - a.portfolioWeight);

      clientScores.push({
        clientId,
        clientName: client.name,
        strategy: client.strategy,
        clientPortfolioWeightAcrossBook: client.bookWeight,
        affectedSleeveLabel: strongest.targetLabel,
        attributionTier,
        portfolioExposureShare,
        severityScore,
        severityBand: bandForSeverityScore(severityScore),
        effectDirection: strongest.effectDirection,
        eventFamily: strongest.eventFamily,
        effectMechanisms: strongest.effectMechanisms,
        clientNewsScore,
        reason: this.clientReason(article, portfolioExposureShare, strongest),
        evidence: strongest.evidence,
        affectedHoldings,
      });
    }

    const globalNewsScore = clientScores.reduce(
      (sum, score) => sum + score.clientPortfolioWeightAcrossBook * score.clientNewsScore,
      0,
    );
    const maxClientNewsScore = clientScores.reduce((max, score) => Math.max(max, score.clientNewsScore), 0);
    const strongestClient = clientScores
      .slice()
      .sort((a, b) => b.severityScore - a.severityScore || b.clientNewsScore - a.clientNewsScore)[0];

    return {
      article,
      globalNewsScore,
      maxClientNewsScore,
      affectedClientCount: clientScores.length,
      severityBand: strongestClient?.severityBand || "none",
      effectDirection: strongestClient?.effectDirection || "unknown",
      eventFamily: strongestClient?.eventFamily || "unattributed",
      clientScores: clientScores.sort((a, b) => b.clientNewsScore - a.clientNewsScore),
    };
  }

  private clientReason(
    article: DiscoveredNewsArticle,
    exposureShare: number,
    contribution: {
      targetLabel: string;
      severityBand: SeverityBand;
      reason: string;
    },
  ): string {
    return `${contribution.targetLabel} represents ${(exposureShare * 100).toFixed(1)}% of the portfolio and this article is scored ${contribution.severityBand}: ${contribution.reason || article.summary}`;
  }
}
