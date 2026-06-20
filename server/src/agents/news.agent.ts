import axios from "axios";
import { ScoredNewsArticle, NewsDigest } from "../types/news";
import { SCENARIO_TRIGGERS, PERSONA_KEYWORDS } from "../data/scenario-triggers";
import { auditService } from "../services/audit.service";
import { extractDNA } from "./crm.agent";
import { getClient } from "../data/store";
import { ClientDNA } from "../types/dna";
import { demoModeEnabled, scenarioNewsEnabled as scenarioNewsEnabledConfig } from "../config/demo";

const CACHE_TTL_MS = 5 * 60 * 1000;

export function scenarioNewsEnabled(): boolean {
  return scenarioNewsEnabledConfig();
}

function deduplicateArticles(articles: ScoredNewsArticle[]): ScoredNewsArticle[] {
  const seen = new Set<string>();
  return articles.filter(a => {
    // Normalize title: lowercase, remove punctuation, trim
    const normalized = a.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    // Create a key from first 8 words
    const key = normalized.split(/\s+/).slice(0, 8).join(" ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface CacheEntry {
  digest: NewsDigest;
  cachedAt: number;
}

export class NewsAgent {
  private cache = new Map<string, CacheEntry>();
  private newsApiUrl: string;
  private newsApiKey: string;
  private llmUrl: string;
  private llmKey: string;
  private llmModel: string;

  constructor() {
    this.newsApiUrl = process.env.NEWSAI_API_URL || "https://eventregistry.org/api/v1";
    this.newsApiKey = process.env.NEWSAPI_KEY || "";
    this.llmUrl = process.env.PHOENIQS_API_URL || "https://maas.phoeniqs.com/v1";
    this.llmKey = process.env.PHOENIQS_API_KEY || "";
    this.llmModel = process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b";
  }

  async getNewsDigest(clientId: string, dnaSummary?: string): Promise<NewsDigest> {
    const startTime = Date.now();
    const cached = this.cache.get(clientId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.digest;
    }

    let dna: ClientDNA | null = null;
    let resolvedProfile = dnaSummary;
    if (!resolvedProfile) {
      const client = getClient(clientId);
      if (client) {
        try {
          dna = await extractDNA(client.id, client.crmEntries, false, client.pronouns);
          resolvedProfile = this.buildNewsProfileContext(dna);
        } catch (err) {
          console.warn(`[NewsAgent] Could not resolve CRM profile for ${clientId}:`, (err as Error).message);
        }
      }
    }

    const liveArticles = await this.fetchLiveNews(clientId, dna);
    const scenarioTrigger = scenarioNewsEnabled() ? SCENARIO_TRIGGERS[clientId] : undefined;
    const allArticles = scenarioTrigger ? [scenarioTrigger, ...liveArticles] : liveArticles;
    const dedupedArticles = deduplicateArticles(allArticles);

    let scored: ScoredNewsArticle[];
    if (resolvedProfile && this.llmKey) {
      scored = await this.scoreWithLLM(dedupedArticles, resolvedProfile, clientId);
    } else {
      scored = dedupedArticles;
    }

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const alerts = scored.filter(a => a.isAlert && a.relevanceScore > 0.7);

    const digest: NewsDigest = {
      clientId,
      articles: scored,
      alerts,
      generatedAt: new Date().toISOString(),
    };

    const keywords = this.getNewsQueries(clientId, dna);
    const liveCount = scored.filter(a => a.sourceType === "live").length;

    auditService.log({
      agent: "news-agent",
      action: "get-news-digest",
      clientId,
      inputSummary: `keywords: ${keywords.join(", ")}`,
      outputSummary: `${digest.articles.length} articles, ${digest.alerts.length} alerts, ${liveCount} live`,
      durationMs: Date.now() - startTime,
    });

    this.cache.set(clientId, { digest, cachedAt: Date.now() });
    return digest;
  }

  private getNewsQueries(clientId: string, dna: ClientDNA | null): string[] {
    const personaKeywords = PERSONA_KEYWORDS[clientId] || [];

    if (demoModeEnabled()) {
      return personaKeywords;
    }

    if (!dna) return personaKeywords;

    const candidateTerms = [
      ...(dna.investmentProfile?.hardConstraints || []),
      ...(dna.investmentProfile?.exclusions || []),
      ...(dna.investmentProfile?.positiveScreens || []),
      ...(dna.investmentProfile?.valueThemes || []),
      ...(dna.values || []),
      ...(dna.riskSensitivities || []),
    ];

    const dnaQueries = candidateTerms
      .map(term => term.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim())
      .filter(term => term.length >= 4)
      .map(term => term.split(/\s+/).slice(0, 8).join(" "))
      .filter((term, index, arr) => arr.indexOf(term) === index)
      .slice(0, 5);

    // Append persona keywords as fallback so they're tried if DNA-derived queries return nothing
    const extra = personaKeywords.filter(k => !dnaQueries.includes(k));
    return [...dnaQueries, ...extra];
  }

  private buildNewsProfileContext(dna: ClientDNA): string {
    const profile = dna.investmentProfile;
    return [
      `Profile source: ${dna.profileSource}`,
      `Summary: ${dna.summary}`,
      `Investment objectives: ${(profile?.objectives || []).join(", ")}`,
      `Hard constraints: ${(profile?.hardConstraints || []).join(", ")}`,
      `Exclusions: ${(profile?.exclusions || []).join(", ")}`,
      `Positive screens: ${(profile?.positiveScreens || []).join(", ")}`,
      `Value themes: ${(profile?.valueThemes || dna.values || []).join(", ")}`,
      `Risk sensitivities: ${(dna.riskSensitivities || []).join(", ")}`,
      `Reputation sensitivity: ${profile?.reputationSensitivity || "unknown"}`,
    ].filter(line => !line.endsWith(": ")).join("\n");
  }

  private async fetchLiveNews(clientId: string, dna: ClientDNA | null): Promise<ScoredNewsArticle[]> {
    const keywords = this.getNewsQueries(clientId, dna);
    if (!keywords || keywords.length === 0 || !this.newsApiKey) return [];

    // Try each keyword in order, return the first set of results that is non-empty
    for (const query of keywords) {
      try {
        const { data } = await axios.post(
          `${this.newsApiUrl}/article/getArticles`,
          {
            apiKey: this.newsApiKey,
            keyword: query,
            keywordOper: "or",
            lang: "eng",
            articlesCount: 10,
            articlesSortBy: "date",
            resultType: "articles",
            dataType: ["news"],
            includeArticleSentiment: true,
          },
          { timeout: 15000 }
        );

        const results = data?.articles?.results || [];
        if (results.length === 0) {
          console.warn(`[NewsAgent] No results for keyword "${query}", trying next...`);
          continue;
        }

        const articles: ScoredNewsArticle[] = [];

        for (const a of results) {
          const uri = String(a.uri || "");
          const sentiment = typeof a.sentiment === "number" ? a.sentiment : 0;
          let sentimentLabel: "BEARISH" | "NEUTRAL" | "BULLISH" = "NEUTRAL";
          if (sentiment > 0.2) sentimentLabel = "BULLISH";
          else if (sentiment < -0.2) sentimentLabel = "BEARISH";

          articles.push({
            id: uri || `live-${articles.length}`,
            title: a.title || "",
            summary: (a.body || "").slice(0, 280).trim(),
            url: a.url || "#",
            source: a.source?.title || "Unknown",
            sourceType: "live",
            publishedAt: a.dateTimePub || a.dateTime || new Date().toISOString(),
            sentiment,
            sentimentLabel,
            relevanceScore: 0.5,
            relevanceReason: `Matched keyword: ${query}`,
            reasoningChain: [`Article matched search query "${query}"`],
            affectedPositions: [],
            isAlert: false,
            alertType: undefined,
          });
        }

        return articles;
      } catch (err) {
        console.warn(`[NewsAgent] Event Registry fetch failed for "${query}":`, (err as Error).message);
      }
    }

    return [];
  }

  private async scoreWithLLM(
    articles: ScoredNewsArticle[],
    dnaSummary: string,
    clientId: string
  ): Promise<ScoredNewsArticle[]> {
    const articlesToScore = articles.filter(a => a.sourceType === "live");
    if (articlesToScore.length === 0) return articles;

    const batchSize = 5;
    for (let i = 0; i < articlesToScore.length; i += batchSize) {
      const batch = articlesToScore.slice(i, i + batchSize);
      try {
        const articleList = batch
          .map((a, idx) => `[${idx}] "${a.title}" — ${a.summary}`)
          .join("\n");

        const { data } = await axios.post(
          `${this.llmUrl}/chat/completions`,
          {
            model: this.llmModel,
            messages: [
              {
                role: "system",
                content:
	                  "You are a wealth management news analyst. Score each article's relevance to the client profile. Return ONLY valid JSON — an array of objects with keys: index (number), relevanceScore (0-1), relevanceReason (string), isAlert (boolean), alertType ('conflict'|'opportunity'|null), reasoningChain (string[]).",
              },
              {
                role: "user",
	                content: `Client investment profile:\n${dnaSummary}\n\nArticles:\n${articleList}\n\nScore each article's investment relevance to this client. Consider objectives, hard constraints, exclusions, positive screens, value themes, and risk sensitivities. Do not use communication style as an investment preference. Return a JSON array.`,
              },
            ],
            temperature: 0.1,
            max_tokens: 1500,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.llmKey}`,
            },
            timeout: 60000,
          }
        );

        const msg = data?.choices?.[0]?.message;
        const content = msg?.content || msg?.reasoning_content || "";
        const parsed = this.parseJson(content);

        if (Array.isArray(parsed)) {
          for (const score of parsed) {
            const idx = score.index;
            if (typeof idx === "number" && idx >= 0 && idx < batch.length) {
              const article = batch[idx];
              if (typeof score.relevanceScore === "number") {
                article.relevanceScore = Math.max(0, Math.min(1, score.relevanceScore));
              }
              if (score.relevanceReason) article.relevanceReason = score.relevanceReason;
              if (typeof score.isAlert === "boolean") article.isAlert = score.isAlert;
              if (score.alertType === "conflict" || score.alertType === "opportunity") {
                article.alertType = score.alertType;
              }
              if (Array.isArray(score.reasoningChain)) {
                article.reasoningChain = score.reasoningChain;
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[NewsAgent] LLM scoring failed for batch ${i}:`, (err as Error).message);
      }
    }

    return articles;
  }

  private parseJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          /* fall through */
        }
      }
      return [];
    }
  }
}
