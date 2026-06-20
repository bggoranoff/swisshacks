import axios, { AxiosInstance } from "axios";
import { bandForSeverityScore, scoreForSeverityBand } from "../config/news-scoring";
import type {
  AttributionTier,
  DiscoveredNewsArticle,
  EffectDirection,
  NewsEffectAssessment,
  NewsEvidence,
  SeverityBand,
} from "../types/news-impact";

interface EffectTarget {
  affectedEntityOrSleeve: string;
  attributionTier: AttributionTier;
  matchReason: string;
}

const NEGATIVE_TERMS = [
  "bankruptcy",
  "default",
  "sanction",
  "lawsuit",
  "fraud",
  "probe",
  "investigation",
  "recall",
  "downgrade",
  "warning",
  "cut",
  "loss",
  "cyber",
  "breach",
  "war",
  "tariff",
  "fine",
  "scandal",
];

const POSITIVE_TERMS = [
  "upgrade",
  "beats",
  "raises",
  "approval",
  "acquisition",
  "contract",
  "partnership",
  "breakthrough",
  "record",
  "growth",
  "surge",
  "pledge",
  "commits",
];

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function directionFromText(text: string): EffectDirection {
  const lower = text.toLowerCase();
  const negative = NEGATIVE_TERMS.some(term => lower.includes(term));
  const positive = POSITIVE_TERMS.some(term => lower.includes(term));
  if (negative && positive) return "mixed";
  if (negative) return "negative";
  if (positive) return "positive";
  return "unknown";
}

function heuristicScore(text: string, tier: AttributionTier): number {
  const lower = text.toLowerCase();
  let score = 0.25;

  if (/(bankruptcy|default|sanction|fraud|war|invasion|major breach|insolvency)/i.test(lower)) {
    score = 0.82;
  } else if (/(lawsuit|regulatory|probe|investigation|recall|downgrade|tariff|fine|scandal|guidance cut|earnings warning)/i.test(lower)) {
    score = 0.62;
  } else if (/(partnership|contract|approval|upgrade|acquisition|raises guidance|breakthrough|supply chain)/i.test(lower)) {
    score = 0.52;
  } else if (/(may|could|plans|proposal|expects|monitor|volatility|concerns)/i.test(lower)) {
    score = 0.32;
  }

  if (tier === "sector-or-asset-class") score *= 0.85;
  if (tier === "client-interest" || tier === "breaking-unattributed") score *= 0.5;

  return Math.max(0, Math.min(1, parseFloat(score.toFixed(3))));
}

function sanitizeEvidence(value: unknown, article: DiscoveredNewsArticle, target: EffectTarget): NewsEvidence[] {
  if (!Array.isArray(value)) {
    return [
      {
        source: "article-title",
        text: article.title,
        supports: "severity-score",
      },
      {
        source: "matched-holding",
        text: target.matchReason,
        supports: "affected-entity",
      },
    ];
  }

  const allowedSources = new Set<NewsEvidence["source"]>([
    "article-title",
    "article-summary",
    "article-source",
    "matched-interest",
    "matched-holding",
    "scoring-rubric",
  ]);
  const allowedSupports = new Set<NewsEvidence["supports"]>([
    "affected-entity",
    "severity-score",
    "severity-band",
    "direction",
    "uncertainty",
  ]);

  return value
    .map(item => {
      const source = allowedSources.has(item?.source) ? item.source : "article-summary";
      const supports = allowedSupports.has(item?.supports) ? item.supports : "severity-score";
      const text = typeof item?.text === "string" ? item.text.slice(0, 240) : "";
      return text ? { source, supports, text } : null;
    })
    .filter((item): item is NewsEvidence => Boolean(item))
    .slice(0, 5);
}

export class NewsEffectService {
  private client: AxiosInstance;
  private llmKey: string;
  private llmModel: string;
  private cache = new Map<string, NewsEffectAssessment>();

  constructor() {
    const baseUrl = process.env.PHOENIQS_API_URL || "https://maas.phoeniqs.com/v1";
    this.llmKey = process.env.PHOENIQS_API_KEY || "";
    this.llmModel = process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b";
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.llmKey}`,
      },
      timeout: 60000,
    });
  }

  async assess(article: DiscoveredNewsArticle, target: EffectTarget): Promise<NewsEffectAssessment> {
    const cacheKey = `${article.id}:${target.affectedEntityOrSleeve}:${target.attributionTier}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    let assessment: NewsEffectAssessment;
    if (this.llmKey) {
      try {
        assessment = await this.assessWithLLM(article, target);
      } catch (err) {
        console.warn(`[NewsEffect] LLM severity failed for ${article.id}: ${(err as Error).message}`);
        assessment = this.assessWithHeuristic(article, target);
      }
    } else {
      assessment = this.assessWithHeuristic(article, target);
    }

    this.cache.set(cacheKey, assessment);
    return assessment;
  }

  private async assessWithLLM(article: DiscoveredNewsArticle, target: EffectTarget): Promise<NewsEffectAssessment> {
    const prompt = `Article:
Title: ${article.title}
Summary: ${article.summary || "No summary available."}
Source: ${article.source}
Published: ${article.publishedAt}

Affected company/security/sleeve: ${target.affectedEntityOrSleeve}
Attribution tier: ${target.attributionTier}
Attribution evidence: ${target.matchReason}

Score how strongly this specific news item affects the affected company/security/sleeve.
Use 0.00-1.00 severity magnitude. Positive opportunities and negative risks are symmetric for magnitude.
Frontend band mapping:
- 0.00-0.19 none: no credible effect or passing mention
- 0.20-0.44 watch: plausible but indirect/early/uncertain/low-specificity
- 0.45-0.74 material: direct or well-supported effect on fundamentals, legal/regulatory exposure, financing, reputation, market access, or valuation
- 0.75-1.00 major: severe direct effect on market access, solvency, business model, strategic value, or major upside/downside trajectory

Consider directness, business magnitude, legal/regulatory force, time horizon, specificity, direction, and uncertainty.
Examples:
1. Named company files for bankruptcy => 0.95 major, negative.
2. Named company faces a major lawsuit with concrete allegations => 0.60 material, negative unless existential.
3. Sector may face a proposed rule with unclear impact => 0.30 watch, unknown/mixed.
4. Named company gets major product approval or large contract => 0.55-0.75 material, positive depending scale.
5. Passing mention of the company in generic market commentary => 0.05 none.

Return ONLY JSON with:
{
  "eventFamily": string,
  "effectMechanisms": string[],
  "direction": "negative"|"positive"|"mixed"|"unknown",
  "severityScore": number,
  "severityBand": "none"|"watch"|"material"|"major",
  "affectedEntityRationale": string,
  "scoreRationale": string,
  "evidence": [{"source":"article-title"|"article-summary"|"article-source"|"matched-interest"|"matched-holding"|"scoring-rubric","text":string,"supports":"affected-entity"|"severity-score"|"severity-band"|"direction"|"uncertainty"}],
  "uncertaintyFlags": string[]
}`;

    const { data } = await this.client.post("/chat/completions", {
      model: this.llmModel,
      messages: [
        {
          role: "system",
          content: "You are a wealth-management news severity scorer. Score only the effect of the article on the specified company/security/sleeve. Return strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.05,
      max_tokens: 900,
    });

    const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning_content || "";
    const parsed = this.parseJsonObject(content);
    const severityScore = clampScore(parsed?.severityScore);
    const severityBand = this.validBand(parsed?.severityBand) || bandForSeverityScore(severityScore);
    const direction = this.validDirection(parsed?.direction) || directionFromText(`${article.title} ${article.summary}`);

    return {
      eventFamily: typeof parsed?.eventFamily === "string" ? parsed.eventFamily.slice(0, 80) : "company-specific-other",
      effectMechanisms: Array.isArray(parsed?.effectMechanisms)
        ? parsed.effectMechanisms.map((m: unknown) => String(m).slice(0, 60)).slice(0, 4)
        : ["unknown"],
      direction,
      severityScore,
      severityBand,
      scoreSource: "llm-rubric",
      affectedEntityOrSleeve: target.affectedEntityOrSleeve,
      affectedEntityRationale: typeof parsed?.affectedEntityRationale === "string"
        ? parsed.affectedEntityRationale.slice(0, 320)
        : target.matchReason,
      evidence: sanitizeEvidence(parsed?.evidence, article, target),
      scoreRationale: typeof parsed?.scoreRationale === "string"
        ? parsed.scoreRationale.slice(0, 420)
        : `LLM rubric score for ${target.affectedEntityOrSleeve}.`,
      uncertaintyFlags: Array.isArray(parsed?.uncertaintyFlags)
        ? parsed.uncertaintyFlags.map((f: unknown) => String(f).slice(0, 120)).slice(0, 4)
        : [],
    };
  }

  private assessWithHeuristic(article: DiscoveredNewsArticle, target: EffectTarget): NewsEffectAssessment {
    const text = `${article.title} ${article.summary}`;
    const severityScore = heuristicScore(text, target.attributionTier);
    const severityBand = bandForSeverityScore(severityScore);
    const direction = directionFromText(text);

    return {
      eventFamily: "heuristic-news-event",
      effectMechanisms: ["unknown"],
      direction,
      severityScore,
      severityBand,
      scoreSource: "heuristic-fallback",
      affectedEntityOrSleeve: target.affectedEntityOrSleeve,
      affectedEntityRationale: target.matchReason,
      evidence: sanitizeEvidence(undefined, article, target),
      scoreRationale: `Fallback rubric matched keywords in the article and assigned ${severityBand}.`,
      uncertaintyFlags: ["llm-severity-unavailable"],
    };
  }

  private parseJsonObject(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return {};
        }
      }
      return {};
    }
  }

  private validBand(value: unknown): SeverityBand | undefined {
    return value === "none" || value === "watch" || value === "material" || value === "major"
      ? value
      : undefined;
  }

  private validDirection(value: unknown): EffectDirection | undefined {
    return value === "negative" || value === "positive" || value === "mixed" || value === "unknown"
      ? value
      : undefined;
  }
}

