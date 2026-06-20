import axios, { AxiosInstance } from "axios";
import { BREAKING_NEWS_QUERIES, HOME_NEWS_LIMITS } from "../config/news-scoring";
import type { DiscoveredNewsArticle, DiscoverySource, MonitoredInterest } from "../types/news-impact";
import type { ScoredNewsArticle } from "../types/news";

interface EventRegistryArticle {
  uri?: string | number;
  title?: string;
  body?: string;
  url?: string;
  dateTime?: string;
  dateTimePub?: string;
  sentiment?: number | null;
  source?: { title?: string };
}

interface CacheEntry {
  articles: DiscoveredNewsArticle[];
  cachedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function sentimentLabel(sentiment: number): DiscoveredNewsArticle["sentimentLabel"] {
  if (sentiment > 0.2) return "BULLISH";
  if (sentiment < -0.2) return "BEARISH";
  return "NEUTRAL";
}

function articleKey(article: Pick<DiscoveredNewsArticle, "id" | "title" | "url">): string {
  if (article.url && article.url !== "#") return `url:${article.url}`;
  if (article.id) return `id:${article.id}`;
  return `title:${article.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;
}

function mergeArticle(existing: DiscoveredNewsArticle, next: DiscoveredNewsArticle) {
  for (const id of next.matchedInterestIds) {
    if (!existing.matchedInterestIds.includes(id)) existing.matchedInterestIds.push(id);
  }
  for (const query of next.searchQueries) {
    if (!existing.searchQueries.includes(query)) existing.searchQueries.push(query);
  }
  if (new Date(next.publishedAt).getTime() > new Date(existing.publishedAt).getTime()) {
    existing.summary = next.summary || existing.summary;
    existing.source = next.source || existing.source;
    existing.publishedAt = next.publishedAt;
    existing.sentiment = next.sentiment;
    existing.sentimentLabel = next.sentimentLabel;
  }
}

export class NewsDiscoveryService {
  private client: AxiosInstance;
  private apiKey: string;
  private cache = new Map<string, CacheEntry>();

  constructor() {
    this.apiKey = process.env.NEWSAPI_KEY || process.env.NEWSAI_API_KEY || "";
    this.client = axios.create({
      baseURL: process.env.NEWSAI_API_URL || "https://eventregistry.org/api/v1",
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
  }

  async discover(interests: MonitoredInterest[], scenarioArticles: ScoredNewsArticle[] = []): Promise<DiscoveredNewsArticle[]> {
    const selectedInterests = interests
      .filter(i => i.source === "holding" || i.source === "client-dna" || i.source === "static-profile")
      .slice(0, HOME_NEWS_LIMITS.targetedQueries);

    const allArticles: DiscoveredNewsArticle[] = [];

    const targetedResults = await Promise.allSettled(selectedInterests.map(interest => this.fetchQuery(
        interest.query,
        "targeted",
        [interest.id],
        "and",
      )));
    for (const result of targetedResults) {
      if (result.status === "fulfilled") allArticles.push(...result.value);
    }

    const breakingResults = await Promise.allSettled(BREAKING_NEWS_QUERIES.slice(0, HOME_NEWS_LIMITS.breakingQueries).map(breaking => this.fetchQuery(
        breaking.query,
        "breaking",
        [breaking.id],
        "or",
      )));
    for (const result of breakingResults) {
      if (result.status === "fulfilled") allArticles.push(...result.value);
    }

    allArticles.push(...scenarioArticles.map(article => this.fromScenario(article)));

    const byKey = new Map<string, DiscoveredNewsArticle>();
    for (const article of allArticles) {
      const key = articleKey(article);
      const existing = byKey.get(key);
      if (existing) mergeArticle(existing, article);
      else byKey.set(key, article);
    }

    return Array.from(byKey.values())
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, HOME_NEWS_LIMITS.discoveredArticles);
  }

  private fromScenario(article: ScoredNewsArticle): DiscoveredNewsArticle {
    return {
      id: article.id,
      title: article.title,
      summary: article.summary,
      url: article.url,
      source: article.source,
      sourceType: "scenario",
      publishedAt: article.publishedAt,
      sentiment: article.sentiment,
      sentimentLabel: article.sentimentLabel,
      matchedInterestIds: [],
      discoverySource: "scenario",
      searchQueries: ["scenario"],
    };
  }

  private async fetchQuery(
    query: string,
    discoverySource: DiscoverySource,
    matchedInterestIds: string[],
    keywordOper: "and" | "or",
  ): Promise<DiscoveredNewsArticle[]> {
    if (!this.apiKey) return [];

    const cacheKey = `${discoverySource}:${keywordOper}:${query}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.articles.map(article => ({
        ...article,
        matchedInterestIds: [...new Set([...article.matchedInterestIds, ...matchedInterestIds])],
      }));
    }

    try {
      const { data } = await this.client.post("/article/getArticles", {
        apiKey: this.apiKey,
        keyword: query,
        keywordOper,
        lang: "eng",
        articlesCount: HOME_NEWS_LIMITS.articlesPerQuery,
        articlesSortBy: "date",
        resultType: "articles",
        dataType: ["news"],
        includeArticleSentiment: true,
      });

      const results: EventRegistryArticle[] = data?.articles?.results || [];
      const articles = results.map((item, index) => {
        const sentiment = typeof item.sentiment === "number" ? item.sentiment : 0;
        return {
          id: String(item.uri ?? `${discoverySource}-${query}-${index}`),
          title: item.title || "",
          summary: (item.body || "").slice(0, 360).trim(),
          url: item.url || "#",
          source: item.source?.title || "Unknown",
          sourceType: "live" as const,
          publishedAt: item.dateTimePub || item.dateTime || new Date().toISOString(),
          sentiment,
          sentimentLabel: sentimentLabel(sentiment),
          matchedInterestIds,
          discoverySource,
          searchQueries: [query],
        };
      }).filter(article => article.title || article.summary);

      this.cache.set(cacheKey, { articles, cachedAt: Date.now() });
      return articles;
    } catch (err) {
      console.warn(`[NewsDiscovery] Event Registry fetch failed for "${query}": ${(err as Error).message}`);
      return [];
    }
  }
}
