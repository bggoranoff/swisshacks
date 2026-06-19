import axios from "axios";
import { ScoredNewsArticle, NewsDigest } from "../types/news";
import { MOCK_TRIGGERS, PERSONA_KEYWORDS } from "../data/mock-triggers";

const CACHE_TTL_MS = 5 * 60 * 1000;

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
    const cached = this.cache.get(clientId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.digest;
    }

    const liveArticles = await this.fetchLiveNews(clientId);
    const mockTrigger = MOCK_TRIGGERS[clientId];
    const allArticles = mockTrigger ? [mockTrigger, ...liveArticles] : liveArticles;

    let scored: ScoredNewsArticle[];
    if (dnaSummary && this.llmKey) {
      scored = await this.scoreWithLLM(allArticles, dnaSummary, clientId);
    } else {
      scored = allArticles;
    }

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const alerts = scored.filter(a => a.isAlert && a.relevanceScore > 0.7);

    const digest: NewsDigest = {
      clientId,
      articles: scored,
      alerts,
      generatedAt: new Date().toISOString(),
    };

    this.cache.set(clientId, { digest, cachedAt: Date.now() });
    return digest;
  }

  private async fetchLiveNews(clientId: string): Promise<ScoredNewsArticle[]> {
    const keywords = PERSONA_KEYWORDS[clientId];
    if (!keywords || !this.newsApiKey) return [];

    const articles: ScoredNewsArticle[] = [];
    const seenUris = new Set<string>();

    for (const keyword of keywords.slice(0, 3)) {
      try {
        const { data } = await axios.post(
          `${this.newsApiUrl}/article/getArticles`,
          {
            apiKey: this.newsApiKey,
            keyword,
            keywordOper: "and",
            lang: "eng",
            articlesCount: 5,
            articlesSortBy: "date",
            resultType: "articles",
            dataType: ["news"],
            includeArticleSentiment: true,
          },
          { timeout: 15000 }
        );

        const results = data?.articles?.results || [];
        for (const a of results) {
          const uri = String(a.uri || "");
          if (seenUris.has(uri)) continue;
          seenUris.add(uri);

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
            relevanceScore: 0.3,
            relevanceReason: `Matched keyword: ${keyword}`,
            reasoningChain: [`Article matched search query "${keyword}"`],
            affectedPositions: [],
            isAlert: false,
            alertType: undefined,
          });
        }
      } catch (err) {
        console.warn(`[NewsAgent] Failed to fetch news for keyword "${keyword}":`, (err as Error).message);
      }
    }

    return articles;
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
                content: `Client profile: ${dnaSummary}\n\nArticles:\n${articleList}\n\nScore each article's relevance to this client. Return a JSON array.`,
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

        const content = data?.choices?.[0]?.message?.content || "";
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
