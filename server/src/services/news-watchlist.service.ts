import { STATIC_MANDATE_INTERESTS } from "../config/news-scoring";
import { extractDNA } from "../agents/crm.agent";
import { getPortfolio } from "../data/store";
import type { ClientProfile, Position } from "../types/data";
import type {
  ClientBookProfile,
  MonitoredClientRef,
  MonitoredHoldingRef,
  MonitoredInterest,
  NewsWatchlist,
} from "../types/news-impact";

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeEntityName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(s\.?a\.?|ag|ltd\.?|limited|holding|holdings|group|inc\.?|corp\.?|plc)\b/gi, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addUniqueClient(clients: MonitoredClientRef[], client: MonitoredClientRef) {
  if (!clients.some(c => c.clientId === client.clientId)) {
    clients.push(client);
  }
}

function addUniqueHolding(holdings: MonitoredHoldingRef[], holding: MonitoredHoldingRef) {
  if (!holdings.some(h => h.clientId === holding.clientId && h.isin === holding.isin)) {
    holdings.push(holding);
  }
}

function addInterest(
  map: Map<string, MonitoredInterest>,
  interest: Omit<MonitoredInterest, "clients" | "holdings">,
  clients: MonitoredClientRef[],
  holdings: MonitoredHoldingRef[],
) {
  const queryKey = normalizeKey(`${interest.source}-${interest.query}`);
  const existing = map.get(queryKey);
  if (existing) {
    existing.priority = Math.max(existing.priority, interest.priority);
    for (const client of clients) addUniqueClient(existing.clients, client);
    for (const holding of holdings) addUniqueHolding(existing.holdings, holding);
    return;
  }

  map.set(queryKey, {
    ...interest,
    id: queryKey,
    clients: [...clients],
    holdings: [...holdings],
  });
}

function positionPortfolioWeight(position: Position, totalCurrent: number): number {
  return totalCurrent > 0 ? position.currentValueCHF / totalCurrent : 0;
}

function topPortfolioPositions(positions: Position[], totalCurrent: number): Position[] {
  return [...positions]
    .filter(p => p.name && p.currentValueCHF > 0 && positionPortfolioWeight(p, totalCurrent) >= 0.0025)
    .sort((a, b) => b.currentValueCHF - a.currentValueCHF)
    .slice(0, 18);
}

function dnaTerms(dna: Awaited<ReturnType<typeof extractDNA>>): string[] {
  const profile = dna.investmentProfile;
  const terms = [
    ...(profile?.hardConstraints || []),
    ...(profile?.exclusions || []),
    ...(profile?.positiveScreens || []),
    ...(profile?.valueThemes || []),
    ...(profile?.softPreferences || []),
    ...(dna.riskSensitivities || []),
  ];

  return terms
    .map(term => term.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim())
    .filter(term => term.length >= 4)
    .map(term => term.split(/\s+/).slice(0, 7).join(" "))
    .filter((term, index, arr) => arr.indexOf(term) === index)
    .slice(0, 5);
}

export class NewsWatchlistService {
  async build(clients: ClientProfile[]): Promise<NewsWatchlist> {
    const interests = new Map<string, MonitoredInterest>();
    const clientProfiles: ClientBookProfile[] = [];

    for (const client of clients) {
      const portfolio = getPortfolio(client.strategy);
      if (!portfolio) continue;

      const totalCurrentValueCHF = portfolio.positions.reduce((sum, p) => sum + p.currentValueCHF, 0);
      const clientRef: MonitoredClientRef = {
        clientId: client.id,
        name: client.name,
        strategy: client.strategy,
        reason: `Monitored for ${client.strategy} mandate and current portfolio.`,
      };

      clientProfiles.push({
        clientId: client.id,
        name: client.name,
        strategy: client.strategy,
        totalCurrentValueCHF,
        bookWeight: 0,
        positions: portfolio.positions,
      });

      for (const position of topPortfolioPositions(portfolio.positions, totalCurrentValueCHF)) {
        const query = normalizeEntityName(position.name) || position.name;
        if (!query || query.length < 3) continue;

        const holding: MonitoredHoldingRef = {
          clientId: client.id,
          isin: position.isin,
          name: position.name,
          yahooTicker: position.yahooTicker,
          sectorOrAssetClass: position.sectorOrAssetClass,
          portfolioWeight: positionPortfolioWeight(position, totalCurrentValueCHF),
          currentValueCHF: position.currentValueCHF,
        };

        addInterest(
          interests,
          {
            id: "",
            label: position.name,
            query,
            source: "holding",
            priority: 100 + holding.portfolioWeight,
          },
          [{ ...clientRef, reason: `Client holds ${position.name}.` }],
          [holding],
        );
      }

      const mandateTerms = STATIC_MANDATE_INTERESTS[client.strategy] || [];
      mandateTerms.forEach((term, index) => {
        addInterest(
          interests,
          {
            id: "",
            label: term,
            query: term,
            source: "static-profile",
            priority: 40 - index,
          },
          [{ ...clientRef, reason: `${client.strategy} mandate monitoring topic.` }],
          [],
        );
      });

      try {
        const dna = await extractDNA(client.id, client.crmEntries, false, client.pronouns);
        dnaTerms(dna).forEach((term, index) => {
          addInterest(
            interests,
            {
              id: "",
              label: term,
              query: term,
              source: "client-dna",
              priority: 55 - index,
            },
            [{ ...clientRef, reason: "CRM/DNA-derived client interest." }],
            [],
          );
        });
      } catch (err) {
        console.warn(`[HomeWatchlist] DNA interests skipped for ${client.id}: ${(err as Error).message}`);
      }
    }

    const totalBookValue = clientProfiles.reduce((sum, c) => sum + c.totalCurrentValueCHF, 0);
    for (const client of clientProfiles) {
      client.bookWeight = totalBookValue > 0 ? client.totalCurrentValueCHF / totalBookValue : 0;
    }

    return {
      interests: Array.from(interests.values()).sort((a, b) => b.priority - a.priority),
      clients: clientProfiles,
    };
  }
}

