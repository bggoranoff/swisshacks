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

// Client Portfolio
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
    return { ...p, cioRating: cio?.rating || null };
  });
  res.json({ success: true, data: { clientId: client.id, strategy: portfolio.strategy, totalValueCHF: portfolio.totalTargetCHF, positions: positionsWithCio, driftBreaches: [], conflicts: [] } });
}));

// Advisory (with tracing)
const messageAgent = new MessageAgent();
app.post("/api/clients/:id/advisory", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) {
    res.status(404).json({ success: false, error: "Client not found" });
    return;
  }
  const { alertId, conflictIsin } = req.body || {};
  const ctx = traceService.startTrace(`advisory-${client.id}`, "orchestrator");
  try {
    const msg = await messageAgent.generateAdvisory(client.id, alertId, conflictIsin);
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

// Presentation download
app.get("/api/presentation", asyncHandler(async (_req: Request, res: Response) => {
  const filePath = await generatePresentation();
  res.download(filePath, "WealthAdvisor_AI_Presentation.pptx");
}));

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
  console.log(`[Server] Running on http://localhost:${port}`);

  // Pre-warm DNA cache for all clients (fire-and-forget)
  const clients = getAllClients();
  console.log(`[Warmup] Pre-warming DNA cache for ${clients.length} clients...`);
  Promise.all(
    clients.map(c =>
      extractDNA(c.id, c.crmEntries, false)
        .then(() => console.log(`[Warmup] DNA cached for ${c.id}`))
        .catch(err => console.warn(`[Warmup] DNA failed for ${c.id}: ${(err as Error).message}`))
    )
  ).then(() => console.log(`[Warmup] All DNA caches ready`));
});

export default app;
