import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import express, { Request, Response, NextFunction } from "express";
import axios from "axios";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { loadAllData } from "./data/loader";
import { getAllClients, getClient, getPortfolio } from "./data/store";
import { extractDNA } from "./agents/crm.agent";
import { NewsAgent, scenarioNewsEnabled } from "./agents/news.agent";
import { MessageAgent } from "./agents/message.agent";
import { traceService } from "./services/trace.service";
import { auditService } from "./services/audit.service";
import { SixService } from "./services/six.service";
import { PhoeniqsService } from "./services/phoeniqs.service";
import { NewsAIService } from "./services/newsai.service";
import { generatePresentation } from "./utils/generate-pptx";
import { knowledgeGraphService } from "./services/knowledge-graph.service";
import { detectConflicts } from "./agents/conflict.agent";
import { chat, getChatHistory } from "./agents/chat.agent";
import type { ClientProfile } from "./types/data";
import type { ScoredNewsArticle } from "./types/news";
import type {
  HomeAffectedClient,
  HomeDashboard,
  HomeNewsItem,
  HomeSourceArticle,
  HomeTodo,
  HomeTodoSeverity,
} from "./types/home";

const app = express();
const port = parseInt(process.env.PORT || "3000", 10);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Clients
app.get("/api/clients", asyncHandler((_req: Request, res: Response) => {
  const includeScenarioMetadata = scenarioNewsEnabled();
  const clients = getAllClients().map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    strategy: c.strategy,
    crmEntryCount: c.crmEntries.length,
    triggerEvent: includeScenarioMetadata ? c.triggerEvent : undefined,
  }));
  res.json({ success: true, data: clients });
}));

app.get("/api/clients/:id", asyncHandler((req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) {
    res.status(404).json({ success: false, error: "Client not found" });
    return;
  }
  const portfolio = getPortfolio(client.strategy);
  const { triggerEvent, ...clientData } = client;
  res.json({
    success: true,
    data: {
      ...clientData,
      ...(scenarioNewsEnabled() ? { triggerEvent } : {}),
      crmEntryCount: client.crmEntries.length,
      portfolioSummary: portfolio ? {
        strategy: portfolio.strategy,
        totalTargetCHF: portfolio.totalTargetCHF,
        positionCount: portfolio.positions.length,
        cioRecommendationCount: portfolio.cioRecommendations.length,
      } : null,
    },
  });
}));

// Client DNA
app.get("/api/clients/:id/dna", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) {
    res.status(404).json({ success: false, error: "Client not found" });
    return;
  }
  const forceRefresh = req.query.refresh === "true";
  const dna = await extractDNA(client.id, client.crmEntries, forceRefresh, client.pronouns);
  res.json({ success: true, data: dna });
}));

// Trait summary — on-demand LLM explanation of a single DNA trait
app.post("/api/clients/:id/trait-summary", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) {
    res.status(404).json({ success: false, error: "Client not found" });
    return;
  }
  const { trait, category, evidence } = req.body || {};
  if (!trait || typeof trait !== "string") {
    res.status(400).json({ success: false, error: "trait is required" });
    return;
  }

  const evidenceLines = Array.isArray(evidence) && evidence.length > 0
    ? evidence.map((e: { crmDate: string; crmExcerpt: string }) =>
        `- ${e.crmDate}: "${e.crmExcerpt}"`
      ).join("\n")
    : "No direct CRM citations available.";

  const categoryLabel: Record<string, string> = {
    values: "core investment value",
    businessContext: "business context factor",
    riskSensitivities: "risk sensitivity",
    personalPriorities: "personal priority",
  };
  const label = categoryLabel[category] || "trait";

  const systemPrompt = `You are a senior wealth management advisor writing a brief internal note. Explain in 2-3 sentences why a trait characterises a client's investment identity. Be specific to the evidence. Write in plain English, no bullet points.`;
  const userPrompt = `Client: ${client.name}\nTrait: "${trait}" (${label})\n\nSupporting CRM evidence:\n${evidenceLines}\n\nExplain why "${trait}" is a defining ${label} for this client.`;

  const llmUrl = (process.env.PHOENIQS_API_URL || "https://maas.phoeniqs.com/v1") + "/chat/completions";
  const llmKey = process.env.PHOENIQS_API_KEY || "";
  const llmModel = process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b";

  const resp = await axios.post(
    llmUrl,
    {
      model: llmModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
    },
    {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${llmKey}` },
      timeout: 30000,
    }
  );
  const choice = resp.data?.choices?.[0];
  const summary = choice?.message?.content || choice?.message?.reasoning_content || choice?.text || "";

  res.json({ success: true, data: { summary: summary.trim() } });
}));

// Client News
const newsAgent = new NewsAgent();

const severityRank: Record<HomeTodoSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

type AggregatedNewsItem = HomeNewsItem & { maxRelevance: number };
type AggregatedTodo = HomeTodo & { maxRelevance: number };

interface HomeDashboardOptions {
  includeScenario: boolean;
}

function normalizeArticleKey(article: ScoredNewsArticle): string {
  const source = article.title || article.id;
  const key = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 12)
    .join("-");
  return key || article.id;
}

function dateValue(date: string): number {
  const value = new Date(date).getTime();
  return Number.isFinite(value) ? value : 0;
}

function makeAffectedClient(client: ClientProfile, article: ScoredNewsArticle): HomeAffectedClient {
  return {
    id: client.id,
    name: client.name,
    strategy: client.strategy,
    reason: article.relevanceReason || "Matched this client's monitored themes.",
    relevanceScore: article.relevanceScore,
    alertType: article.alertType,
  };
}

function addAffectedClient(clients: HomeAffectedClient[], affected: HomeAffectedClient) {
  const existing = clients.find(c => c.id === affected.id);
  if (!existing) {
    clients.push(affected);
    return;
  }

  if (affected.relevanceScore > existing.relevanceScore) {
    existing.reason = affected.reason;
    existing.relevanceScore = affected.relevanceScore;
    existing.alertType = affected.alertType;
  }
}

function shouldCreateTodo(article: ScoredNewsArticle): boolean {
  return (article.isAlert && article.relevanceScore >= 0.7) || article.relevanceScore >= 0.82;
}

function shouldAttachClient(article: ScoredNewsArticle): boolean {
  return (article.isAlert && article.relevanceScore >= 0.7) || article.relevanceScore >= 0.6;
}

function severityForArticle(article: ScoredNewsArticle, affectedClientCount: number): HomeTodoSeverity {
  if (
    article.alertType === "conflict" &&
    (article.relevanceScore >= 0.9 || affectedClientCount >= 2 || article.sentimentLabel === "BEARISH")
  ) {
    return "high";
  }
  if (article.alertType === "conflict" || article.relevanceScore >= 0.85) {
    return "high";
  }
  if (article.alertType === "opportunity" || article.relevanceScore >= 0.7) {
    return "medium";
  }
  return "low";
}

function titleForTodo(article: ScoredNewsArticle): string {
  if (article.alertType === "conflict") {
    return `Review portfolio risk: ${article.title}`;
  }
  if (article.alertType === "opportunity") {
    return `Assess client opportunity: ${article.title}`;
  }
  return `Review client relevance: ${article.title}`;
}

function recommendedActionForArticle(article: ScoredNewsArticle): string {
  if (article.alertType === "conflict") {
    return "Review affected holdings, check suitability against client DNA, and prepare client communication with possible swap or rebalance options.";
  }
  if (article.alertType === "opportunity") {
    return "Assess suitability against client DNA and prepare a short opportunity note for affected clients.";
  }
  return "Review relevance and decide whether client outreach is needed.";
}

function riskTagsForArticle(article: ScoredNewsArticle): string[] {
  const tags = new Set<string>();

  if (article.alertType === "conflict") tags.add("Portfolio conflict");
  if (article.alertType === "opportunity") tags.add("Opportunity");
  if (article.sentimentLabel === "BEARISH") tags.add("Bearish news");
  if (article.sentimentLabel === "BULLISH") tags.add("Bullish news");
  tags.add(article.sourceType === "scenario" ? "Scenario source" : "Live news");

  return Array.from(tags);
}

function sourceArticle(article: ScoredNewsArticle): HomeSourceArticle {
  return {
    id: article.id,
    title: article.title,
    url: article.url,
    source: article.source,
    sourceType: article.sourceType,
    publishedAt: article.publishedAt,
    relevanceScore: article.relevanceScore,
  };
}

function sourceArticleRank(article: HomeSourceArticle): number {
  return article.relevanceScore * 10000000000000 + dateValue(article.publishedAt);
}

function addSourceArticle(articles: HomeSourceArticle[], article: HomeSourceArticle) {
  const existing = articles.find(a => a.id === article.id || (a.title === article.title && a.url === article.url));
  if (!existing) {
    articles.push(article);
    articles.sort((a, b) => sourceArticleRank(b) - sourceArticleRank(a));
    return;
  }

  if (article.relevanceScore > existing.relevanceScore || dateValue(article.publishedAt) > dateValue(existing.publishedAt)) {
    existing.title = article.title;
    existing.url = article.url;
    existing.source = article.source;
    existing.sourceType = article.sourceType;
    existing.publishedAt = article.publishedAt;
    existing.relevanceScore = Math.max(existing.relevanceScore, article.relevanceScore);
    articles.sort((a, b) => sourceArticleRank(b) - sourceArticleRank(a));
  }
}

async function buildHomeDashboard(options: HomeDashboardOptions): Promise<HomeDashboard> {
  const clients = getAllClients();
  const newsByKey = new Map<string, AggregatedNewsItem>();
  const todosByKey = new Map<string, AggregatedTodo>();

  const digestResults = await Promise.allSettled(
    clients.map(async client => ({
      client,
      digest: await newsAgent.getNewsDigest(client.id),
    }))
  );

  for (const result of digestResults) {
    if (result.status === "rejected") {
      console.warn("[Home] Failed to build one client news digest:", result.reason);
      continue;
    }

    const { client, digest } = result.value;

    for (const article of digest.articles) {
      if (!options.includeScenario && article.sourceType === "scenario") {
        continue;
      }

      const articleKey = normalizeArticleKey(article);
      const affectedClient = makeAffectedClient(client, article);

      let newsItem = newsByKey.get(articleKey);
      if (!newsItem) {
        newsItem = {
          id: `home-news-${articleKey}`,
          articleId: article.id,
          title: article.title,
          summary: article.summary,
          source: article.source,
          sourceType: article.sourceType,
          url: article.url,
          publishedAt: article.publishedAt,
          sentiment: article.sentiment,
          sentimentLabel: article.sentimentLabel,
          relevanceScore: article.relevanceScore,
          affectedClients: [],
          maxRelevance: article.relevanceScore,
        };
        newsByKey.set(articleKey, newsItem);
      } else {
        newsItem.relevanceScore = Math.max(newsItem.relevanceScore, article.relevanceScore);
        newsItem.maxRelevance = Math.max(newsItem.maxRelevance, article.relevanceScore);

        if (dateValue(article.publishedAt) > dateValue(newsItem.publishedAt)) {
          newsItem.articleId = article.id;
          newsItem.title = article.title;
          newsItem.summary = article.summary;
          newsItem.source = article.source;
          newsItem.sourceType = article.sourceType;
          newsItem.url = article.url;
          newsItem.publishedAt = article.publishedAt;
          newsItem.sentiment = article.sentiment;
          newsItem.sentimentLabel = article.sentimentLabel;
        }
      }

      if (shouldAttachClient(article)) {
        addAffectedClient(newsItem.affectedClients, affectedClient);
      }

      if (!shouldCreateTodo(article)) {
        continue;
      }

      const todoKey = `${article.alertType || "review"}-${articleKey}`;
      let todo = todosByKey.get(todoKey);
      const articleSource = sourceArticle(article);
      if (!todo) {
        todo = {
          id: `home-todo-${todoKey}`,
          title: titleForTodo(article),
          summary: article.relevanceReason || article.summary,
          severity: severityForArticle(article, 1),
          triggerType: "news",
          recommendedAction: recommendedActionForArticle(article),
          affectedClients: [],
          sourceArticle: articleSource,
          sourceArticles: [articleSource],
          createdAt: new Date().toISOString(),
          riskTags: riskTagsForArticle(article),
          maxRelevance: article.relevanceScore,
        };
        todosByKey.set(todoKey, todo);
      }

      addAffectedClient(todo.affectedClients, affectedClient);
      addSourceArticle(todo.sourceArticles, articleSource);
      todo.sourceArticle = todo.sourceArticles[0] || todo.sourceArticle;
      todo.maxRelevance = Math.max(todo.maxRelevance, article.relevanceScore);

      const nextSeverity = severityForArticle(article, todo.affectedClients.length);
      if (severityRank[nextSeverity] > severityRank[todo.severity]) {
        todo.severity = nextSeverity;
      }
    }
  }

  const latestNews = Array.from(newsByKey.values())
    .sort((a, b) => b.maxRelevance - a.maxRelevance || dateValue(b.publishedAt) - dateValue(a.publishedAt))
    .slice(0, 12)
    .map(({ maxRelevance, ...item }) => item);

  const todos = Array.from(todosByKey.values())
    .sort((a, b) =>
      b.maxRelevance - a.maxRelevance ||
      severityRank[b.severity] - severityRank[a.severity] ||
      b.affectedClients.length - a.affectedClients.length ||
      dateValue(b.sourceArticle.publishedAt) - dateValue(a.sourceArticle.publishedAt)
    )
    .slice(0, 12)
    .map(({ maxRelevance, ...todo }) => todo);

  return {
    todos,
    latestNews,
    generatedAt: new Date().toISOString(),
  };
}

app.get("/api/clients/:id/news", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) {
    res.status(404).json({ success: false, error: "Client not found" });
    return;
  }
  const digest = await newsAgent.getNewsDigest(client.id);
  res.json({ success: true, data: digest });
}));

app.get("/api/home", asyncHandler(async (req: Request, res: Response) => {
  const includeScenario =
    req.query.demo === "true" ||
    req.query.scenario === "true" ||
    process.env.ENABLE_SCENARIO_NEWS === "true";
  const dashboard = await buildHomeDashboard({ includeScenario });
  res.json({ success: true, data: dashboard });
}));

// SIX MCP price cache (listingId → { close, currency, timestamp, fetchedAt })
const sixPriceCache = new Map<string, { close: number; currency: string; timestamp: string; fetchedAt: number }>();
const SIX_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Client Portfolio — enriched with live SIX MCP prices
app.get("/api/clients/:id/portfolio", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) {
    res.status(404).json({ success: false, error: "Client not found" });
    return;
  }
  const portfolio = getPortfolio(client.strategy);
  if (!portfolio) {
    res.status(404).json({ success: false, error: "Portfolio not found" });
    return;
  }
  const positionsWithCio = portfolio.positions.map(p => {
    const cio = portfolio.cioRecommendations.find(c => c.isin === p.isin);
    return { ...p, cioRating: cio?.rating || null, livePrice: undefined as number | undefined, liveCurrency: undefined as string | undefined, livePriceDate: undefined as string | undefined, priceSource: "excel" as "live" | "excel" };
  });

  // Enrich with live SIX MCP prices — top 5 positions by value (keep fast for demo)
  const sortedByValue = [...positionsWithCio]
    .filter(p => p.valorNumber && p.mic)
    .sort((a, b) => b.currentValueCHF - a.currentValueCHF)
    .slice(0, 5);

  const toFetch = sortedByValue.filter(p => {
    const listingId = `${p.valorNumber}_${p.mic}`;
    const cached = sixPriceCache.get(listingId);
    if (cached && Date.now() - cached.fetchedAt < SIX_CACHE_TTL) {
      p.livePrice = cached.close;
      p.liveCurrency = cached.currency;
      p.livePriceDate = cached.timestamp;
      p.priceSource = "live";
      return false;
    }
    return true;
  });

  const batchSize = 3;
  for (let i = 0; i < toFetch.length; i += batchSize) {
    const batch = toFetch.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (p) => {
        const listingId = `${p.valorNumber}_${p.mic}`;
        const result = await sixService.getEndOfDayPrice(listingId);
        if (result) {
          p.livePrice = result.close;
          p.liveCurrency = result.currency;
          p.livePriceDate = result.timestamp;
          p.priceSource = "live";
          sixPriceCache.set(listingId, { ...result, fetchedAt: Date.now() });
        }
      })
    );
    if (i + batchSize < toFetch.length) {
      await new Promise(r => setTimeout(r, 500)); // rate-limit courtesy delay
    }
  }

  const liveCount = positionsWithCio.filter(p => p.priceSource === "live").length;
  console.log(`[Portfolio] ${client.id}: ${liveCount}/${positionsWithCio.length} positions with live SIX prices`);

  // DNA-based conflict detection via LLM
  let conflicts: any[] = [];
  try {
    const dna = await extractDNA(client.id, client.crmEntries, false, client.pronouns);
    const top20 = [...positionsWithCio].sort((a, b) => b.currentValueCHF - a.currentValueCHF).slice(0, 20);
    conflicts = await detectConflicts(client.id, top20, dna, portfolio.cioRecommendations);
    console.log(`[Portfolio] ${client.id}: ${conflicts.length} conflicts detected`);
  } catch (err) {
    console.warn(`[Portfolio] Conflict detection failed for ${client.id}: ${(err as Error).message}`);
  }

  // Drift breach detection: compare actual allocation vs strategy targets (±2.0pp threshold)
  const actualByClass: Record<string, number> = {};
  const totalCurrent = positionsWithCio.reduce((sum, p) => sum + p.currentValueCHF, 0);
  for (const p of positionsWithCio) {
    const ac = p.sectorOrAssetClass || "Other";
    actualByClass[ac] = (actualByClass[ac] || 0) + p.currentValueCHF;
  }

  const driftBreaches: { assetClass: string; targetPct: number; actualPct: number; driftPct: number }[] = [];
  if (portfolio.strategyAllocations && portfolio.strategyAllocations.length > 0) {
    for (const sa of portfolio.strategyAllocations) {
      const actualValue = actualByClass[sa.assetClass] || 0;
      const actualPct = totalCurrent > 0 ? (actualValue / totalCurrent) * 100 : 0;
      const drift = actualPct - sa.targetPercent;
      if (Math.abs(drift) > 2.0) {
        driftBreaches.push({
          assetClass: sa.assetClass,
          targetPct: sa.targetPercent,
          actualPct: parseFloat(actualPct.toFixed(2)),
          driftPct: parseFloat(drift.toFixed(2)),
        });
      }
    }
  } else {
    const totalTarget = portfolio.totalTargetCHF || 10_000_000;
    const assetClassSums = new Map<string, { target: number; current: number }>();
    for (const p of positionsWithCio) {
      const ac = p.sectorOrAssetClass || "Other";
      const existing = assetClassSums.get(ac) || { target: 0, current: 0 };
      existing.target += p.targetValueCHF;
      existing.current += p.currentValueCHF;
      assetClassSums.set(ac, existing);
    }
    for (const [ac, sums] of assetClassSums) {
      const targetPct = (sums.target / totalTarget) * 100;
      const currentPct = (sums.current / totalTarget) * 100;
      const drift = currentPct - targetPct;
      if (Math.abs(drift) > 2.0) {
        driftBreaches.push({ assetClass: ac, targetPct: parseFloat(targetPct.toFixed(2)), actualPct: parseFloat(currentPct.toFixed(2)), driftPct: parseFloat(drift.toFixed(2)) });
      }
    }
  }

  res.json({ success: true, data: { clientId: client.id, strategy: portfolio.strategy, totalValueCHF: portfolio.totalTargetCHF, positions: positionsWithCio, driftBreaches, conflicts, liveCount } });
}));

// Advisory (with tracing)
const messageAgent = new MessageAgent();
app.post("/api/clients/:id/advisory", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) {
    res.status(404).json({ success: false, error: "Client not found" });
    return;
  }
  const { alertId, conflictIsin, language } = req.body || {};
  const ctx = traceService.startTrace(`advisory-${client.id}`, "orchestrator");
  try {
    const msg = await messageAgent.generateAdvisory(client.id, alertId, conflictIsin, language || "en");
    const trace = traceService.endTrace(ctx);
    res.json({ success: true, data: { ...msg, traceId: trace.traceId } });
  } catch (err) {
    traceService.endTrace(ctx);
    throw err;
  }
}));

app.patch("/api/clients/:id/advisory/:messageId", asyncHandler(async (req: Request, res: Response) => {
  const { status, rmNotes } = req.body || {};
  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ success: false, error: "status must be 'approved' or 'rejected'" });
    return;
  }
  const msg = messageAgent.updateStatus(req.params.messageId, status, rmNotes);
  if (!msg) {
    res.status(404).json({ success: false, error: "Message not found" });
    return;
  }
  res.json({ success: true, data: msg });
}));

// Advisory comparison: generic vs DNA-personalised
app.post("/api/clients/:id/advisory/compare", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) {
    res.status(404).json({ success: false, error: "Client not found" });
    return;
  }
  const { alertId, language } = req.body || {};
  const [personalised, generic] = await Promise.all([
    messageAgent.generateAdvisory(client.id, alertId, undefined, language || "en"),
    messageAgent.generateGenericAdvisory(client.id, alertId),
  ]);
  res.json({ success: true, data: { generic, personalised } });
}));

// Traces
app.get("/api/traces", (_req, res) => {
  res.json({ success: true, data: traceService.getTraces() });
});

app.get("/api/traces/:traceId", (req, res) => {
  const trace = traceService.getTrace(req.params.traceId);
  if (!trace) {
    res.status(404).json({ success: false, error: "Trace not found" });
    return;
  }
  res.json({ success: true, data: trace });
});

// Knowledge Graph (Noumena Digital)
app.get("/api/clients/:id/graph", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) {
    res.status(404).json({ success: false, error: "Client not found" });
    return;
  }
  const dna = await extractDNA(client.id, client.crmEntries, false, client.pronouns);
  const portfolio = getPortfolio(client.strategy);
  const digest = await newsAgent.getNewsDigest(client.id);
  const graph = knowledgeGraphService.buildClientGraph(client.id, dna, portfolio, digest);
  res.json({ success: true, data: graph });
}));

// RM Chat (RM Interface Agent)
app.post("/api/clients/:id/chat", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) { res.status(404).json({ success: false, error: "Client not found" }); return; }
  const { message } = req.body;
  if (!message) { res.status(400).json({ success: false, error: "message required" }); return; }
  const response = await chat(client.id, message);
  res.json({ success: true, data: response });
}));

app.get("/api/clients/:id/chat", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) { res.status(404).json({ success: false, error: "Client not found" }); return; }
  res.json({ success: true, data: getChatHistory(client.id) });
}));

// Presentation download
app.get("/api/presentation", asyncHandler(async (_req: Request, res: Response) => {
  const filePath = await generatePresentation();
  res.download(filePath, "WealthAdvisor_AI_Presentation.pptx");
}));

// Explainable AI decisions (NTT DATA pattern)
import { explainabilityService } from "./services/explainability.service";

app.get("/api/decisions", (req, res) => {
  const agent = req.query.agent as string | undefined;
  const decisions = agent ? explainabilityService.getDecisionsByAgent(agent) : explainabilityService.getDecisions();
  res.json({ success: true, data: decisions });
});

app.get("/api/decisions/:id", (req, res) => {
  const d = explainabilityService.getDecision(req.params.id);
  if (!d) {
    res.status(404).json({ success: false, error: "Decision not found" });
    return;
  }
  res.json({ success: true, data: d });
});

// Audit trail
app.get("/api/audit", (req, res) => {
  const clientId = req.query.clientId as string | undefined;
  const entries = clientId ? auditService.getEntriesByClient(clientId) : auditService.getEntries();
  res.json({ success: true, data: entries });
});

// Integrations
const sixService = new SixService();
const phoeniqsService = new PhoeniqsService();
const newsAIService = new NewsAIService();

app.get("/api/integrations", asyncHandler(async (_req: Request, res: Response) => {
  const probes = await Promise.all([
    sixService.ping(),
    phoeniqsService.ping(),
    newsAIService.ping(),
  ]);
  res.json({ success: true, data: { probes } });
}));

// Serve built client in production
app.use(express.static(path.join(__dirname, "../../client/dist")));
// Serve built client — but NOT for /api/* routes
// API 404 for all methods
app.all("/api/*", (req, res) => {
  res.status(404).json({ success: false, error: `API endpoint not found: ${req.method} ${req.path}` });
});

// SPA catch-all (non-API routes)
app.get("*", (_req, res, next) => {
  const clientIndex = path.join(__dirname, "../../client/dist/index.html");
  res.sendFile(clientIndex, (err) => {
    if (err) next();
  });
});

// Error middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server] Error:", err.message);
  res.status(500).json({ success: false, error: err.message });
});

// Load data and start
try {
  loadAllData();
  console.log(`[Data] Loaded ${getAllClients().length} clients`);
  for (const c of getAllClients()) {
    console.log(`  ${c.id}: ${c.crmEntries.length} CRM entries, strategy: ${c.strategy}`);
  }
} catch (err) {
  console.error("[Data] Failed to load Excel data:", (err as Error).message);
  process.exit(1);
}

app.listen(port, () => {
  const startupTime = Date.now();
  console.log(`
╔══════════════════════════════════════════════╗
║         WealthAdvisor AI  v1.0               ║
║  The Next Generation of Wealth Advisory      ║
║  SwissHacks 2026 — SIX · NTT Data · Noumena ║
╠══════════════════════════════════════════════╣
║  Server:  http://localhost:${port}              ║
║  API:     http://localhost:${port}/api           ║
║  Health:  http://localhost:${port}/api/health    ║
╚══════════════════════════════════════════════╝
`);
  console.log(`[Server] Running on http://localhost:${port}`);

  // Pre-warm: DNA first, THEN news (news agent calls extractDNA internally — must not race)
  const clients = getAllClients();
  console.log(`[Warmup] Pre-warming DNA cache for ${clients.length} clients...`);
  Promise.all(
    clients.map(c =>
      extractDNA(c.id, c.crmEntries, false, c.pronouns)
        .then(() => console.log(`[Warmup] DNA cached for ${c.id}`))
        .catch(err => console.warn(`[Warmup] DNA failed for ${c.id}: ${(err as Error).message}`))
    )
  ).then(() => {
    console.log(`[Warmup] DNA complete (${((Date.now() - startupTime) / 1000).toFixed(1)}s elapsed)`);
    console.log(`[Warmup] All DNA caches ready. Starting news warmup...`);
    return Promise.all(
      clients.map(c =>
        newsAgent.getNewsDigest(c.id)
          .then(() => console.log(`[Warmup] News cached for ${c.id}`))
          .catch(err => console.warn(`[Warmup] News failed for ${c.id}: ${(err as Error).message}`))
      )
    );
  }).then(() => {
    console.log(`[Warmup] News complete (${((Date.now() - startupTime) / 1000).toFixed(1)}s elapsed)`);
    console.log(`[Warmup] All caches ready. Pre-warming portfolios...`);
    return Promise.all(
      clients.map(async c => {
        try {
          // Trigger the portfolio endpoint logic to cache conflicts
          const portfolio = getPortfolio(c.strategy);
          if (!portfolio) return;
          const dna = await extractDNA(c.id, c.crmEntries, false, c.pronouns);
          const top20 = [...portfolio.positions].sort((a, b) => b.currentValueCHF - a.currentValueCHF).slice(0, 20);
          await detectConflicts(c.id, top20, dna, portfolio.cioRecommendations);
          console.log(`[Warmup] Portfolio cached for ${c.id}`);
        } catch (err) {
          console.warn(`[Warmup] Portfolio failed for ${c.id}: ${(err as Error).message}`);
        }
      })
    );
  }).then(() => console.log(`[Warmup] All warmup complete in ${((Date.now() - startupTime) / 1000).toFixed(1)}s`));
});

export default app;
