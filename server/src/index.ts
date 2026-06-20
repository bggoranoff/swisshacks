import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { loadAllData } from "./data/loader";
import { getAllClients, getClient, getPortfolio } from "./data/store";
import { extractDNA } from "./agents/crm.agent";
import { NewsAgent } from "./agents/news.agent";
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
  const clients = getAllClients().map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    strategy: c.strategy,
    crmEntryCount: c.crmEntries.length,
    triggerEvent: c.triggerEvent,
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
  res.json({
    success: true,
    data: {
      ...client,
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
  const dna = await extractDNA(client.id, client.crmEntries, forceRefresh);
  res.json({ success: true, data: dna });
}));

// Client News
const newsAgent = new NewsAgent();
app.get("/api/clients/:id/news", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) {
    res.status(404).json({ success: false, error: "Client not found" });
    return;
  }
  const digest = await newsAgent.getNewsDigest(client.id);
  res.json({ success: true, data: digest });
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
    const dna = await extractDNA(client.id, client.crmEntries, false);
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
  const dna = await extractDNA(client.id, client.crmEntries, false);
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
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ success: false, error: `API endpoint not found: ${req.path}` });
    return;
  }
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
  console.log(`[Server] Running on http://localhost:${port}`);

  // Pre-warm: DNA first, THEN news (news agent calls extractDNA internally — must not race)
  const clients = getAllClients();
  console.log(`[Warmup] Pre-warming DNA cache for ${clients.length} clients...`);
  Promise.all(
    clients.map(c =>
      extractDNA(c.id, c.crmEntries, false)
        .then(() => console.log(`[Warmup] DNA cached for ${c.id}`))
        .catch(err => console.warn(`[Warmup] DNA failed for ${c.id}: ${(err as Error).message}`))
    )
  ).then(() => {
    console.log(`[Warmup] All DNA caches ready. Starting news warmup...`);
    return Promise.all(
      clients.map(c =>
        newsAgent.getNewsDigest(c.id)
          .then(() => console.log(`[Warmup] News cached for ${c.id}`))
          .catch(err => console.warn(`[Warmup] News failed for ${c.id}: ${(err as Error).message}`))
      )
    );
  }).then(() => console.log(`[Warmup] All caches ready`));
});

export default app;
