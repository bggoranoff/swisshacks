# WealthAdvisor AI — Implementation Plan

> SIX Challenge: "The Next Generation of Wealth Advisory"
> SwissHacks 2026 — 19-21 June 2026
>
> This plan is designed for an autonomous overnight build session (~10-12 hours).
> Phase 0 must be completed by the user before launching. Phases 1 and 2 are executed autonomously.

---

> **AUTONOMOUS EXECUTION RULES — READ FIRST**
>
> 1. Execute phases strictly in order: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9 → 2.1. Do not skip phases.
> 2. **Never ask the user any questions.** Make all design, architecture, and implementation decisions autonomously using the specifications in this plan.
> 3. If an external integration fails after 3 retries, log the failure and continue with mock/cached data. Never block on a failing service. Never prompt the user.
> 4. Every phase ends with running `bash test/e2e.sh` to verify all existing endpoints return 200 with valid JSON.
> 5. Every phase ends with verifying `docker compose up --build` still succeeds (after Phase 1.1 creates the Docker setup).
> 6. All visual design decisions are pre-made in **Appendix A**. Follow the spec exactly — do not improvise colours, fonts, spacing, or layout.

---

## Phase 0: Requirements & Setup Checklist

Before the overnight build can start, the following tokens, tools, and data must be in place. Work through the checklist top-to-bottom; every unchecked item will block implementation.

### API Tokens & Keys

- [ ] **PHOENIQS_API_KEY** — sign in at https://console.phoeniqs.com/, copy the key (starts with `sk-...`). This is an OpenAI-compatible API, so any SDK or tool that accepts a custom base URL works unchanged.
  - Recommended models:
    - `inference-qwen3-vl-235b` — best for driving SIX MCP tool calls
    - `inference-gpt-oss-120b` — best for general LLM tasks (analysis, message drafting)
    - `inference-glm-51-754b` — best for code generation if needed
  - Base URL: `https://maas.phoeniqs.com/v1`
- [ ] **SIX_MCP_TOKEN** — obtain from the SIX booth on-site (Ramiro Lopez Cento: ramiro.lopez@six-group.com or Laurent Lefevre: laurent.lefevre@six-group.com). This is a bearer token for the MCP server.
  - MCP URL: `https://ca-mcpwebapi-tools.nicepebble-599ed11f.westeurope.azurecontainerapps.io/mcp`
- [ ] **NEWSAPI_KEY** — Event Registry API key for https://eventregistry.org/api/v1. Each team should have received one by email. If not, ask the organizers (Irena Marina: irena.marina@tenity.com).

### Development Environment

- [ ] **Node.js 18+** and **npm** installed
- [ ] **Git** installed
- [ ] **Docker** and **Docker Compose** installed
- [ ] Clone the challenge data repo:
  ```bash
  git clone https://github.com/SwissHacks-2026/SIX-Noumena-NTT-Data.git
  ```
- [ ] Copy the two data files into our project:
  ```bash
  mkdir -p data
  cp "SIX-Noumena-NTT-Data/data/SwissHacks CRM.xlsx" ./data/
  cp "SIX-Noumena-NTT-Data/data/SwissHacks Portfolio Construction.xlsx" ./data/
  ```

### Data Files (from the cloned repo)

- [ ] `data/SwissHacks CRM.xlsx` — three-year CRM interaction logs for four clients (Schneider, Huber, Räber, Ammann), one tab per client
- [ ] `data/SwissHacks Portfolio Construction.xlsx` — three model mandates (Defensive, Balanced, Growth; CHF 10M each), CIO recommendation list with BUY/HOLD/SELL ratings, three-year transaction history, cash flows. Includes SIX Valor+MIC and Yahoo ticker identifiers.

### `.env` File

Create a `.env` file in the project root with the following content, replacing the placeholder values:

```env
# Server
PORT=3000
NODE_ENV=development

# Phoeniqs LLM (OpenAI-compatible)
PHOENIQS_API_KEY=sk-your-key-here
PHOENIQS_API_URL=https://maas.phoeniqs.com/v1
PHOENIQS_MODEL=inference-gpt-oss-120b

# SIX Financial Information (MCP server)
SIX_MCP_TOKEN=your-six-bearer-token-here
SIX_MCP_URL=https://ca-mcpwebapi-tools.nicepebble-599ed11f.westeurope.azurecontainerapps.io/mcp

# Event Registry / News API
NEWSAPI_KEY=your-event-registry-key-here
NEWSAI_API_URL=https://eventregistry.org/api/v1
```

Also create an identical `.env.example` with placeholder values, committed to git so collaborators know which vars are needed.

### Verification

Once all tokens are filled in, integration health can be confirmed by running the demo starter:

```bash
cd SIX-Noumena-NTT-Data/demo
cp ../.env .env
npm install
npm run dev
# Open http://localhost:3000 and click "Check Integrations"
```

All three integrations (SIX Financial Data, Event Registry, Phoeniqs LLM) should show green. If any shows red, double-check the corresponding token before proceeding.

---

## Phase 1: Implementation Plan

> **Total estimated time: 10–12 hours.** Each sub-phase lists a time budget; the overnight autonomous session should execute them sequentially top-to-bottom.

---

### Phase 1.1: Project Scaffolding (~45 min)

**Goal:** A monorepo with a running Express backend and Vite+React frontend, Docker setup, start script, E2E test harness, and all three integrations verified.

**Directory structure:**

```
/
├── server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/          # SIX, Phoeniqs, NewsAI (ported from demo)
│   │   ├── agents/            # CRM, Portfolio, News, Message agents
│   │   ├── data/              # parsed Excel data + loaders + fallbacks
│   │   └── types/             # shared TypeScript interfaces
│   ├── package.json
│   └── tsconfig.json          # must include outDir: "dist", rootDir: "src"
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── data/              # mock.ts for offline fallback
│   │   ├── types/
│   │   └── utils/
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── data/
│   ├── SwissHacks CRM.xlsx
│   └── SwissHacks Portfolio Construction.xlsx
├── test/
│   └── e2e.sh
├── .env
├── .env.example
├── start.sh
├── Dockerfile
├── docker-compose.yml
└── package.json               # root scripts: `dev` runs both server + client
```

**Steps:**

1. Initialise root `package.json` with `concurrently` to run backend + frontend in one `npm run dev`.
2. **Backend:** `npm init` in `server/`, install exact packages: `express cors helmet morgan dotenv axios zod xlsx ts-node nodemon typescript @types/express @types/cors @types/morgan @types/node`. Copy the service files from the demo repo (`six.service.ts`, `phoeniqs.service.ts`, `newsai.service.ts`, `probe.ts`) as the starting integration layer — these contain the critical `parseRpcPayload` method that handles both plain JSON and SSE-framed responses from the SIX MCP server. Set `tsconfig.json` with `"outDir": "dist"` and `"rootDir": "src"`.
3. **Frontend:** `npm create vite@latest client -- --template react-ts`, then install: `tailwindcss @tailwindcss/vite recharts lucide-react clsx`. Configure Vite proxy to forward `/api` requests to `localhost:3001` (backend port).
4. **Express serves built client in production:** In `server/src/index.ts`, add:
   ```ts
   app.use(express.static(path.join(__dirname, "../../client/dist")));
   app.get("*", (_req, res) => {
     res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
   });
   ```
5. Create `start.sh`:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   if [ ! -f .env ]; then
     echo "ERROR: .env file not found. Copy .env.example and fill in your API keys." >&2
     exit 1
   fi
   echo "Installing dependencies..."
   (cd server && npm install)
   (cd client && npm install)
   echo "Building frontend..."
   (cd client && npm run build)
   echo "Starting server on http://localhost:${PORT:-3000}"
   cd server && npx ts-node src/index.ts
   ```
   Run `chmod +x start.sh`.
6. Create `Dockerfile`:
   ```dockerfile
   FROM node:18-alpine AS client-build
   WORKDIR /app/client
   COPY client/package*.json ./
   RUN npm ci
   COPY client/ ./
   RUN npm run build

   FROM node:18-alpine
   WORKDIR /app
   COPY server/package*.json ./server/
   RUN cd server && npm ci --omit=dev
   COPY server/ ./server/
   RUN cd server && npx tsc
   COPY --from=client-build /app/client/dist ./client/dist
   COPY data/ ./data/
   EXPOSE 3000
   CMD ["node", "-r", "dotenv/config", "server/dist/index.js"]
   ```
7. Create `docker-compose.yml`:
   ```yaml
   services:
     app:
       build: .
       ports:
         - "${PORT:-3000}:3000"
       env_file: .env
       volumes:
         - ./data:/app/data:ro
   ```
8. Create `test/e2e.sh`:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   BASE="http://localhost:${PORT:-3000}"
   fail=0
   check() {
     local url="$1" label="$2"
     status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
     body=$(curl -sf "$url" || echo "")
     if [ "$status" != "200" ]; then
       echo "FAIL [$status] $label"; fail=1
     elif [ -n "$body" ] && ! echo "$body" | python3 -c "import sys,json;json.load(sys.stdin)" 2>/dev/null; then
       echo "FAIL [invalid JSON] $label"; fail=1
     else
       echo "OK   $label"
     fi
   }
   check "$BASE/api/health" "Health"
   check "$BASE/api/clients" "Client list"
   check "$BASE/api/integrations" "Integrations"
   exit $fail
   ```
   Run `chmod +x test/e2e.sh`.
9. Create a minimal `GET /api/health` route and render a placeholder page on the frontend.
10. Add an `asyncHandler` utility for all Express routes:
    ```ts
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next);
    ```
    Add Express error middleware that catches anything unhandled and returns `{ success: false, error: message }` with status 500.
11. Run the integration health-check endpoint (`GET /api/integrations`) — run probes and LOG their status. If any integration fails after 3 retries with 2-second backoff, log the failure and continue. Do not block startup on probe failures. The server must start and serve the frontend even if all external APIs are down.

**API integration notes (critical):**
- SIX MCP: send `tools/call` directly — no `initialize` handshake needed (verified against hackathon server). Set `Accept: "application/json, text/event-stream"` header. Timeout: 30000ms.
- Phoeniqs: OpenAI-compatible, use `/chat/completions` endpoint. All agents use `PHOENIQS_MODEL` env var. Timeout: 60000ms.
- Event Registry: POST to `/article/getArticles` with `apiKey` in the request body (not header). Always include `keywordOper: "and"` and `dataType: ["news"]`. Timeout: 15000ms.

**Exit criteria:** `npm run dev` starts both processes; browser shows placeholder page; `/api/health` returns 200; `docker compose up --build` succeeds; `bash test/e2e.sh` passes.

---

### Phase 1.2: Data Ingestion Layer (~1 hour)

**Goal:** All Excel data parsed into typed in-memory structures, accessible to any agent.

**Dependencies:** `xlsx` (SheetJS), already installed in Phase 1.1.

**Type definitions** (`server/src/types/data.ts`):

```ts
interface CRMEntry {
  [key: string]: string;         // dynamic columns read from Excel headers
}

interface ClientProfile {
  id: string;                    // "schneider" | "huber" | "raeber" | "ammann"
  name: string;
  description: string;
  strategy: "Defensive" | "Balanced" | "Growth";
  crmTab: string;                // Excel tab name, e.g. "CRM Schneider"
  portfolioTab: string;          // e.g. "Sample Portfolio Balanced"
  triggerEvent: string;
  crmEntries: CRMEntry[];
}

interface Position {
  isin: string;
  name: string;
  instrumentType: string;        // "EQUITY" | "BOND" | etc.
  valorNumber: string;
  mic: string;
  sectorOrAssetClass: string;
  targetValueCHF: number;
  currentValueCHF: number;       // post-rebalance drift snapshot (~10 days after April 2026 rebalance), NOT live
  driftPercent: number;
  quantity: number;               // for bonds: face value / 100
  yahooTicker?: string;
}

interface StrategyAllocation {
  assetClass: string;
  targetPercent: number;
}

interface CIORecommendation {
  isin: string;
  name: string;
  rating: "BUY" | "HOLD" | "SELL";
  swapCandidate?: string;        // ISIN of suggested replacement
  swapCandidateName?: string;
}

interface CashFlow {
  date: string;
  type: string;                  // "deposit" | "withdrawal" | "fee" | "coupon" | "dividend"
  amount: number;
  currency: string;
  isin?: string;
}

interface Portfolio {
  strategy: "Defensive" | "Balanced" | "Growth";
  totalTargetCHF: number;        // 10,000,000
  positions: Position[];
  strategyAllocations: StrategyAllocation[];
  cioRecommendations: CIORecommendation[];
  transactions: Transaction[];
  cashFlows: CashFlow[];
}

interface Transaction {
  date: string;
  isin: string;
  name: string;
  side: "BUY" | "SELL";
  quantity: number;
  priceCHF: number;
  totalCHF: number;
}
```

**Implementation** (`server/src/data/loader.ts`):

1. **`loadCRMData()`** — read `SwissHacks CRM.xlsx`, iterate over the four CRM tabs (`CRM Schneider`, `CRM Huber`, `CRM Raeber`, `CRM Ammann`). Use `xlsx.utils.sheet_to_json(sheet)` which auto-reads column headers from row 1 — do NOT hardcode column names. Log discovered headers on startup for debugging. Each row becomes a `CRMEntry` (a `Record<string, string>`). Return a `Map<clientId, CRMEntry[]>`.
2. **`loadPortfolioData()`** — read `SwissHacks Portfolio Construction.xlsx`:
   - Parse `Portfolio Strategies` tab for asset-class targets per mandate → `StrategyAllocation[]`.
   - Parse `Sample Portfolio Defensive`, `Sample Portfolio Balanced`, `Sample Portfolio Growth` tabs for positions. Each position carries: ISIN, name, Valor, MIC, target CHF, current CHF, Yahoo ticker. For bonds, apply `quantity = face value / 100`.
   - `currentValueCHF` from the Excel reflects post-rebalance market drift (~10 days after April 2026 rebalance). It is NOT a live price — live SIX prices will update this further.
   - Parse the CIO recommendation sheet for BUY/HOLD/SELL ratings and swap candidates. Each entry has an ISIN, name, rating, and optional swap-candidate ISIN.
   - Parse transaction history tabs for 3-year buy/sell records. Aggregate BUY − SELL quantities per ISIN as a cross-check against the position tabs.
   - Parse cash flows tab for deposits, withdrawals, fees, coupons.
   - Calculate drift per sub-asset-class (not per position): sum position current values and target values within each sub-asset-class, compute `(sumCurrent - sumTarget) / sumTarget`. Flag classes breaching ±2.0pp.
3. **`buildClientProfiles()`** — combine CRM + portfolio data into four `ClientProfile` objects:
   - Schneider → Balanced, CRM tab "CRM Schneider", portfolio tab "Sample Portfolio Balanced"
   - Huber → Defensive, CRM tab "CRM Huber", portfolio tab "Sample Portfolio Defensive"
   - Räber → Defensive, CRM tab "CRM Raeber", portfolio tab "Sample Portfolio Defensive"
   - Ammann → Growth, CRM tab "CRM Ammann", portfolio tab "Sample Portfolio Growth"
   - **Note:** Huber and Räber share the Defensive portfolio. The same positions will appear for both, but conflict detection runs per-client against different DNA profiles, producing different results.
4. **Singleton data store** (`server/src/data/store.ts`): load once on server startup, export `getClient(id)`, `getPortfolio(strategy)`, `getAllClients()`. Wrap in try/catch — if either Excel file is missing or corrupt, log `ERROR: data/<filename> not found or corrupt` and exit with code 1.
5. **Startup guard:** The server must not start without valid data files.

**Exit criteria:** `GET /api/clients` returns all four personas with CRM entry counts and portfolio summary. `GET /api/clients/schneider` returns the full parsed profile. Balanced and Growth portfolios show at least one sub-asset-class breaching ±2.0pp drift threshold. Run `bash test/e2e.sh`.

---

### Phase 1.3: CRM Agent — Client DNA Builder (~1.5 hours)

**Goal:** An agent that reads raw CRM logs and produces a structured Client DNA profile via LLM, with source citations and confidence scores.

**Output type** (`server/src/types/dna.ts`):

```ts
interface DNAEvidence {
  trait: string;                 // which value/priority/sensitivity this supports
  crmDate: string;               // date of the CRM entry
  crmExcerpt: string;            // verbatim excerpt from the CRM log
}

interface ClientDNA {
  clientId: string;
  values: string[];
  lifeEvents: string[];
  businessContext: string[];
  riskSensitivities: string[];
  personalPriorities: string[];
  communicationStyle: "data-driven" | "values-led" | "balanced";
  summary: string;
  evidence: DNAEvidence[];       // source citations linking traits to CRM entries
  traitConfidence: Record<string, number>;  // 0-1 confidence per trait
}
```

**Implementation** (`server/src/agents/crm.agent.ts`):

1. Receive the full `CRMEntry[]` array for a client.
2. Chunk CRM entries into groups (~15 entries per chunk) to stay within LLM context limits.
3. For each chunk, call Phoeniqs LLM (`PHOENIQS_MODEL` = `inference-gpt-oss-120b`, temperature 0.1, max_tokens 2000):
   - System: "You are a wealth management analyst. Read these relationship manager notes and extract: values, life events, business context, risk sensitivities, personal priorities, and communication style preference. For each trait, cite the exact CRM entry date and a one-sentence excerpt. Rate your confidence (0-1) for each trait. Return structured JSON."
4. Merge chunk results: deduplicate values/events, pick the most consistent communication style across chunks.
5. Final consolidation call (temperature 0.1, max_tokens 1500): send the merged profile back to the LLM with "Consolidate this client DNA into a final profile."
6. **JSON parsing:** Use the same `parseJson` helper from the demo (fence-stripping). If JSON parsing fails, retry ONCE with an appended user message: "Your previous response was not valid JSON. Return ONLY a JSON object with no markdown fences." If retry also fails, return the fallback DNA from `server/src/data/fallback-dna.ts`.
7. **LLM fallback chain:** On Phoeniqs 429/budget_exceeded, retry with model `inference-qwen3-vl-235b`. If that also fails, return fallback DNA.
8. **Caching:** Store computed DNA in a `Map<clientId, ClientDNA>` — only recompute if forced via query param `?refresh=true`.
9. **Audit logging:** Log every LLM call to the audit service (see Phase 1.8).
10. Expose via `GET /api/clients/:id/dna`.

**Fallback DNA** (`server/src/data/fallback-dna.ts`): Four pre-written `ClientDNA` objects derived from the persona descriptions in the challenge README, used when all LLM calls fail:
- Schneider: values=["family legacy", "chronic-illness research"], communicationStyle="values-led"
- Huber: values=["environmental sustainability", "reforestation"], communicationStyle="values-led"
- Räber: values=["Swiss precision engineering", "conservative investment"], riskSensitivities=["averse to US tech exposure"], communicationStyle="data-driven"
- Ammann: values=["corporate reputation", "Swiss entrepreneurship"], riskSensitivities=["reputational risk"], communicationStyle="balanced"

**Exit criteria:** Each of the four personas returns a well-formed `ClientDNA` with at least 3 values, 2 life events, evidence citations, and a communication style classification. Run `bash test/e2e.sh`.

---

### Phase 1.4: Portfolio Agent — Holdings & Strategy Connector (~1.5 hours)

**Goal:** An agent that enriches portfolio positions with live SIX data, identifies DNA-conflicting holdings, and suggests swaps. The investment strategy stays unchanged — personalisation happens at the asset level only.

**Output type** (`server/src/types/portfolio.ts`):

```ts
interface EnrichedPosition extends Position {
  livePrice?: number;
  liveCurrency?: string;
  livePriceDate?: string;
  priceChangePct?: number;
  priceSource: "live" | "excel";  // "excel" when SIX is down or no Valor/MIC
  issuerName?: string;
  issuerCountry?: string;
  listingId: string;
  cioRating?: "BUY" | "HOLD" | "SELL";
  dnaConflict?: DNAConflict;
}

interface DNAConflict {
  severity: "high" | "medium" | "low";
  reason: string;
  reasoningChain: string[];       // ordered logical steps for explainability
  riskType: "financial" | "reputational" | "values";
  suggestedSwap?: SwapSuggestion;
}

interface SwapSuggestion {
  isin: string;
  name: string;
  reason: string;
  cioRating?: string;
  cioSource: { isin: string; rating: string; fromSheet: string };
}

interface PortfolioAnalysis {
  clientId: string;
  strategy: string;
  totalValueCHF: number;
  positions: EnrichedPosition[];
  conflicts: DNAConflict[];
  driftBreaches: { assetClass: string; driftPct: number }[];
  cioConflicts: DNAConflict[];    // CIO recommendations that conflict with client DNA
  summary: string;
}
```

**Implementation** (`server/src/agents/portfolio.agent.ts`):

**Critical constraint:** The Portfolio Agent must never suggest changing the client's mandate (Defensive/Balanced/Growth). Swaps must stay within the same sub-asset-class AND within the CIO recommendation universe (BUY-rated only).

1. **Resolve identifiers:** For each position, the Excel carries Valor + MIC. Form `listingId = "{valor}_{mic}"`. If `valorNumber` or `mic` is empty (some bonds), skip the SIX price lookup for that position — set `priceSource = "excel"` and log a warning. For ISIN→Valor resolution, use `execute_graphql` with the batch query (NOT `instrument_symbology` which takes valors, not ISINs):
   ```graphql
   query($ids:[UserInputId!]!){
     instruments(ids:$ids, scheme:ISIN){
       referenceData{ instrumentInfo{ valorNumber isin instrumentShortName } }
     }
   }
   ```
   Note: variable type is `[UserInputId!]!`, not `[ID!]!`.
2. **Batch price fetch:** Call `end_of_day_snapshot` with `listing_ids` (array form, e.g. `listing_ids: ["645156_XNAS", "789012_XSWX"]`). Parallelise in batches of 10. Wrap every `callTool` in try/catch — on failure, set `livePrice = undefined`, keep Excel `currentValueCHF`, set `priceSource = "excel"`.
3. **Drift calculation:** Calculate drift per sub-asset-class by summing position current values vs target values within each sub-asset-class. Flag classes breaching ±2.0pp of the mandate target from the `StrategyAllocation` data.
4. **DNA conflict detection:** Take the client's `ClientDNA` and each position. Call Phoeniqs LLM (temperature 0.1, batches of 5-10 positions per call):
   - "Given this client profile [DNA summary] and these holdings [name, sector, country, issuer for each], for EACH holding: does it conflict with the client's values, priorities, or risk sensitivities? For each, return: severity (high/medium/low/none), reason (one sentence), reasoningChain (array of logical steps), and riskType (financial/reputational/values). Return a JSON array with one entry per position."
   - Parse per-position reasoning individually — do not accept one blob.
5. **CIO conflict detection (Räber scenario):** Compare CIO BUY recommendations against client DNA. When CIO recommends instruments that conflict with DNA (e.g., US AI stocks for Räber who is averse to US tech), generate a `cioConflict` alert independently of news.
6. **Swap suggestion:** For each high-conflict position, find a replacement from the CIO recommendation list that is BUY-rated, in the same sub-asset-class, and does not itself conflict with the client DNA. Use LLM to generate a one-sentence reason. Include `cioSource` reference.
7. **Caching:** Cache portfolio analysis per client for 10 minutes.
8. **Endpoint:** `GET /api/clients/:id/portfolio` — parameterised by `(clientId, strategy)`. Even though Huber and Räber share the Defensive portfolio, conflicts are computed per-client using different DNA profiles.

**Exit criteria:** Each client's portfolio returns enriched positions. At least 1-2 DNA conflicts per persona. Räber shows CIO-driven conflict. Swap suggestions reference CIO source. Run `bash test/e2e.sh`.

---

### Phase 1.5: News Agent — Real-Time Monitor (~1 hour)

**Goal:** An agent that fetches and scores news against each client's DNA and holdings, with hardcoded trigger events for demo reliability.

**Output type** (`server/src/types/news.ts`):

```ts
interface ScoredNewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceType: "live" | "scenario";  // "scenario" for hardcoded demo triggers
  publishedAt: string;
  sentiment: number;
  sentimentLabel: "BEARISH" | "NEUTRAL" | "BULLISH";
  relevanceScore: number;
  relevanceReason: string;
  reasoningChain: string[];          // step-by-step relevance explanation
  affectedPositions: string[];
  isAlert: boolean;
  alertType?: "conflict" | "opportunity";
}

interface NewsDigest {
  clientId: string;
  articles: ScoredNewsArticle[];
  alerts: ScoredNewsArticle[];
  generatedAt: string;
}
```

**Implementation** (`server/src/agents/news.agent.ts`):

1. **Hardcoded trigger events** (`server/src/data/mock-triggers.ts`): Create simulated news articles for each persona's trigger, guaranteeing the demo works regardless of real-world news:
   - Schneider: "Major pharma company announces shutdown of chronic-illness research division"
   - Huber: "Global consumer goods company announces historic palm oil deforestation cut-off"
   - Räber: (no news trigger — CIO-driven, handled by Portfolio Agent)
   - Ammann: "Labour exploitation scandal hits major consumer brand amid supply chain audit"
   Flag these as `sourceType: "scenario"`.
2. **Per-persona search keywords** (hardcoded):
   - Schneider: `["pharma research shutdown", "pharmaceutical research division closure", "chronic disease research discontinued"]`
   - Huber: `["palm oil deforestation", "reforestation", "ESG sustainability"]`
   - Räber: `["AI stocks rebalancing", "US technology sector", "tech sector performance"]`
   - Ammann: `["labour exploitation scandal", "corporate governance", "supply chain ethics"]`
3. **Fetch live news:** Call Event Registry API (`POST /article/getArticles`) for each query. Include `keywordOper: "and"`, `dataType: ["news"]`, `includeArticleSentiment: true`. Limit to last 7 days. Deduplicate by article URI.
4. **Merge live + scenario:** Combine live results with mock-trigger articles. Scenario articles always appear first in alerts.
5. **Score relevance:** For each article, call Phoeniqs LLM (batched, 5-10 articles per call, temperature 0.1):
   - "Given this client profile [DNA summary] and their holdings [top 10 position names], for EACH article: score its relevance (0-1), explain why it matters step-by-step (as a reasoning chain array), determine if it's a trigger-level alert (yes/no), classify as conflict or opportunity, and list affected holding ISINs. Return a JSON array."
6. **Positive alert handling (Huber scenario):** When `alertType` is `"opportunity"`, the UI shows a green-styled alert. The Message Agent frames opportunities as reinforcement: "this holding now aligns even better with your values."
7. **Sort and filter:** Return articles sorted by relevance score descending. Separate alerts (relevance > 0.7 and flagged as trigger) into the `alerts` array.
8. **Cache with TTL:** Cache news results per client for 5 minutes.
9. **Rate limit:** Max 1 advisory generation per client per 30 seconds to prevent accidental credit burn.
10. Expose via `GET /api/clients/:id/news`.

**Exit criteria:** Each client returns 5-15 scored news articles. All four personas have at least one trigger-level alert. Huber's alert is classified as "opportunity". Run `bash test/e2e.sh`.

---

### Phase 1.6: Message Agent — Advisory Note Generator (~1 hour)

**Goal:** An agent that drafts personalised advisory messages for the RM, following NTT DATA's explainable-AI pattern: every LLM output includes a reasoning trace stored alongside the result.

**Output type** (`server/src/types/message.ts`):

```ts
interface AdvisoryMessage {
  id: string;                     // unique message ID (uuid)
  clientId: string;
  subject: string;
  body: string;
  tone: "data-driven" | "values-led" | "balanced";
  toneInfluences: { dnaValue: string; effect: string }[];
  referencedAlert?: string;
  proposedAction?: string;
  reasoning: string;              // reasoning chain for RM transparency
  confidence: number;
  status: "draft" | "approved" | "rejected";
  rmNotes?: string;
  disclaimer: string;
}
```

**Implementation** (`server/src/agents/message.agent.ts`):

1. **Input:** Receive `clientId` + optionally a specific alert or conflict to address. If none specified, pick the highest-priority alert.
2. **Gather context:** Client DNA (from cache), conflict/alert details, proposed swap (from Portfolio agent), communication style.
3. **Prompt construction:**
   - System: "You are a relationship manager drafting a personalised advisory note. Write in the client's preferred communication style. Never give direct financial advice — present options and reasoning. The client always decides. List which client DNA values influenced your choice of tone."
   - For `data-driven` style: "Use precise numbers, percentages, and market data. Be concise and analytical."
   - For `values-led` style: "Lead with the client's personal values and how the situation connects to what matters to them. Be warm but professional."
   - For reputational risks (Ammann): "Treat as time-sensitive — draft with urgency. Reference public-profile exposure explicitly."
4. **Generate:** Call Phoeniqs LLM with temperature 0.4, max_tokens 1000.
5. **Reasoning trace (NTT DATA pattern):** Generate a separate reasoning chain (temperature 0.1) explaining why this action was suggested, which DNA values influenced the tone, and why the specific swap was chosen. Store alongside the result in the audit log.
6. **Compliance disclaimer:** "This is an AI-generated draft for the relationship manager's review. It does not constitute financial advice. The client's explicit approval is required before any transaction."
7. **Endpoints:**
   - `POST /api/clients/:id/advisory` — body `{ alertId?, conflictIsin? }`. Returns `AdvisoryMessage` with status "draft".
   - `PATCH /api/clients/:id/advisory/:messageId` — body `{ status: "approved"|"rejected", rmNotes? }`. Logs decision to audit trail.

**Exit criteria:** Each client produces a distinct, style-appropriate advisory message. Schneider's is warm/values-focused; Räber's is analytical/data-heavy; Ammann's is urgent. Each includes reasoning chain and tone influences. Run `bash test/e2e.sh`.

---

### Phase 1.7: Dashboard Frontend (~2.5 hours)

**Goal:** A professional wealth-management dashboard following the exact spec in Appendix A. All visual decisions are pre-made — follow the spec, do not improvise.

**Component structure** (`client/src/components/`):

```
components/
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx             # includes Demo Mode button and StatusDots
│   └── DashboardLayout.tsx
├── clients/
│   ├── ClientCard.tsx
│   └── ClientSelector.tsx
├── dna/
│   ├── DNAPanel.tsx
│   ├── DNATag.tsx             # pill tags with category colors from Appendix A
│   └── DNAEvidence.tsx        # CRM quotes with date attribution
├── portfolio/
│   ├── PortfolioTable.tsx     # sortable, with drift bars and conflict badges
│   ├── PortfolioSummary.tsx
│   └── AllocationChart.tsx    # recharts PieChart (donut), target vs actual
├── news/
│   ├── NewsFeed.tsx           # scrollable, max-h-[400px]
│   ├── NewsCard.tsx           # with sentiment badge and relevance bar
│   └── AlertBanner.tsx
├── advisory/
│   ├── AdvisoryPanel.tsx      # col-span-2, Generate/Regenerate/Copy/Edit buttons
│   ├── ReasoningChain.tsx     # <details> expandable
│   └── SwapProposal.tsx
├── alerts/
│   ├── AlertsPanel.tsx
│   ├── AlertCard.tsx          # with Approve/Dismiss buttons
│   └── CIOConflictCard.tsx
├── shared/
│   ├── StateWrapper.tsx       # loading/error/empty state handler
│   ├── ConfidenceBadge.tsx
│   ├── Card.tsx
│   └── StatusDot.tsx
├── traces/
│   ├── TraceDrawer.tsx        # slide-out drawer showing trace tree
│   ├── SpanTree.tsx           # recursive span tree with expandable nodes
│   └── SpanDetail.tsx         # span attributes, events, timing bar
└── demo/
    └── DemoMode.tsx           # auto-walkthrough of Schneider scenario
```

**Key implementation details:**

1. **State management:** React `useState` + `useEffect`. Custom `useFetch` hook that catches all fetch errors and sets an `error` state — never throws, never shows a blank screen.
2. **Offline fallback:** Create `client/src/data/mock.ts` with hardcoded responses for all 4 clients (DNA, portfolio, news, advisory). The `useFetch` hook falls back to mock data when an API call fails, with a yellow `"Offline — showing sample data"` banner at the top.
3. **Data fetching:** On client select, fire parallel requests for DNA, portfolio, news. Advisory is on-demand (button click).
4. **Demo Mode:** A button in the Header (`Play` icon from lucide). When clicked: auto-selects Schneider → waits for DNA to load → scrolls to Alerts panel → highlights pharma trigger → auto-clicks Generate Advisory. Use `setTimeout` chains with 2-second intervals and `scrollIntoView({ behavior: 'smooth' })`.
5. **Human-in-the-loop:** Each swap suggestion in Alerts panel has Approve/Dismiss buttons. Approved: green checkmark badge. Dismissed: greyed out with strikethrough. State stored in React `useState`.
6. **Advisory panel:** Four buttons — Generate (`bg-blue-600`), Regenerate (`bg-slate-700`), Copy (clipboard via `navigator.clipboard.writeText`), Edit (toggles textarea). Below: expandable reasoning chain.
7. **Trust features:** Every AI-generated section has a ConfidenceBadge. DNA traits show evidence citations. News cards link to source URLs. Conflict badges show reasoning chain via `<details>`.
8. **Trace viewer:** A "Traces" button in the Header (icon: `Activity` from lucide) opens a slide-out `TraceDrawer`. It fetches `GET /api/traces` and shows a list of recent traces. Clicking a trace fetches `GET /api/traces/:traceId` and renders a `SpanTree` — a recursive collapsible tree of spans. Each span shows: operation name, service badge (color-coded), duration bar, status dot (green/red). Expanding a span shows its attributes and events in `SpanDetail`. The advisory endpoint returns a `traceId` in its response — clicking "View Trace" on an advisory auto-opens the drawer to that trace. See Appendix A.14.
9. **Styling:** Follow Appendix A exactly. Dark theme. Inter font via Google Fonts CDN.

**Exit criteria:** All 4 personas load within 5 seconds. All panels render. Advisory generates on button click. Demo Mode walks through Schneider. Mock data displays when APIs are down. Run `bash test/e2e.sh`.

---

### Phase 1.8: Orchestration, Tracing & API Routes (~1.5 hours)

**Goal:** Clean API layer wiring all agents together with structured tracing, audit trail, and proper error handling. Every agent invocation emits OpenTelemetry-style traces for debugging and benchmarking.

**Tracing system** (`server/src/services/trace.service.ts`):

The tracing service follows the span-tree format from the TokenTrim trace-eval-improve project. Every agent call, LLM request, and external API call is wrapped in a span. Spans form a tree rooted at the user's request.

```ts
interface SpanEvent {
  name: string;
  timestamp: number;
  attributes: Record<string, string | number | boolean>;
}

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;          // "crm-agent" | "portfolio-agent" | "news-agent" | "message-agent" | "six-mcp" | "phoeniqs" | "event-registry"
  startTime: number;
  endTime: number;
  duration: number;
  status: "OK" | "ERROR" | "UNSET";
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  children: Span[];
}

interface Trace {
  traceId: string;
  rootSpan: Span;
  spans: Span[];               // flat list of all spans (for search)
  duration: number;
  startTime: number;
  serviceName: string;
  status: "OK" | "ERROR" | "UNSET";
  spanCount: number;
}
```

**Implementation:**

1. **TraceService singleton** — in-memory store of `Trace[]` (keep last 100 traces to bound memory).
2. **`startTrace(operationName)`** — creates a new Trace with a root span, returns a `TraceContext` handle.
3. **`startSpan(ctx, operationName, serviceName, parentSpanId?)`** — creates a child span, returns span handle.
4. **`endSpan(span, status, attributes?)`** — sets endTime, duration, status, and optional attributes.
5. **`addEvent(span, name, attributes?)`** — appends a SpanEvent (e.g., "llm-response-parsed", "cache-hit").
6. **`endTrace(ctx)`** — finalises the root span, computes trace-level stats, stores the trace.
7. **Helper: `withSpan(ctx, opName, serviceName, fn)`** — wraps an async function in a span with automatic error capture:
   ```ts
   async function withSpan<T>(ctx: TraceContext, op: string, svc: string, fn: (span: Span) => Promise<T>): Promise<T> {
     const span = traceService.startSpan(ctx, op, svc);
     try {
       const result = await fn(span);
       traceService.endSpan(span, "OK");
       return result;
     } catch (err) {
       traceService.endSpan(span, "ERROR", { error: (err as Error).message });
       throw err;
     }
   }
   ```

**Trace structure for a full advisory flow:**

```
Trace: "advisory-schneider-{timestamp}"
├── Span: "extract-dna" (serviceName: "crm-agent")
│   ├── Span: "llm-chunk-1" (serviceName: "phoeniqs", attributes: {model, tokens_in, tokens_out})
│   ├── Span: "llm-chunk-2" (serviceName: "phoeniqs")
│   └── Span: "llm-consolidate" (serviceName: "phoeniqs", attributes: {confidence: 0.87})
├── Span: "enrich-portfolio" (serviceName: "portfolio-agent")
│   ├── Span: "six-batch-prices" (serviceName: "six-mcp", attributes: {listings_count: 25, duration_ms: 1200})
│   ├── Span: "llm-conflict-detection" (serviceName: "phoeniqs", attributes: {conflicts_found: 2})
│   └── Span: "cio-conflict-check" (serviceName: "portfolio-agent", attributes: {cio_conflicts: 1})
├── Span: "score-news" (serviceName: "news-agent")
│   ├── Span: "event-registry-fetch" (serviceName: "event-registry", attributes: {articles_returned: 12})
│   ├── Span: "merge-mock-triggers" (serviceName: "news-agent", attributes: {mock_triggers_added: 1})
│   └── Span: "llm-relevance-scoring" (serviceName: "phoeniqs", attributes: {alerts_flagged: 2})
└── Span: "draft-advisory" (serviceName: "message-agent")
    ├── Span: "llm-generate-message" (serviceName: "phoeniqs", attributes: {tone: "values-led", confidence: 0.91})
    └── Span: "llm-reasoning-chain" (serviceName: "phoeniqs")
```

**Key attributes to capture per span type:**

- LLM calls: `model`, `tokens_in`, `tokens_out`, `temperature`, `prompt_hash` (first 8 chars of SHA256 of prompt), `cache_hit` (boolean)
- SIX MCP calls: `tool_name`, `listing_ids_count`, `response_format` ("json" | "sse")
- Event Registry calls: `keyword`, `articles_returned`, `query_duration_ms`
- Agent-level: `client_id`, `cache_hit`, `fallback_used` (boolean), `conflicts_found`, `alerts_flagged`

**Integration with existing agents:** Each agent method receives an optional `TraceContext` parameter. The orchestrator creates the trace, passes the context down, and each agent creates child spans. Example for CRM Agent:

```ts
async extractDNA(clientId: string, entries: CRMEntry[], ctx?: TraceContext): Promise<ClientDNA> {
  return withSpan(ctx, "extract-dna", "crm-agent", async (span) => {
    // chunk processing — each LLM call gets its own child span
    for (const chunk of chunks) {
      const result = await withSpan(ctx, `llm-chunk-${i}`, "phoeniqs", async (llmSpan) => {
        const response = await this.phoeniqs.chat(prompt);
        traceService.addEvent(llmSpan, "llm-response-received", { tokens: response.usage.total_tokens });
        return response;
      });
    }
    // ... consolidation, caching, etc.
    traceService.addEvent(span, "dna-extracted", { traits_count: dna.values.length, confidence: avgConfidence });
    return dna;
  });
}
```

**Route structure** (`server/src/routes/`):

```
routes/
├── clients.routes.ts       # /api/clients, /api/clients/:id
├── dna.routes.ts            # /api/clients/:id/dna
├── portfolio.routes.ts      # /api/clients/:id/portfolio
├── news.routes.ts           # /api/clients/:id/news
├── advisory.routes.ts       # /api/clients/:id/advisory, PATCH .../advisory/:messageId
├── traces.routes.ts         # /api/traces, /api/traces/:traceId
├── audit.routes.ts          # /api/audit
└── integrations.routes.ts   # /api/integrations
```

**Endpoints:**

- `GET /api/clients` — all four personas (id, name, description, strategy). No LLM calls.
- `GET /api/clients/:id` — full client profile with CRM entry count and portfolio summary.
- `GET /api/clients/:id/dna` — cached ClientDNA or generates on first call. `?refresh=true` to force.
- `GET /api/clients/:id/portfolio` — PortfolioAnalysis with live prices, conflicts, CIO conflicts.
- `GET /api/clients/:id/news` — NewsDigest with scored articles. Cached 5 minutes.
- `POST /api/clients/:id/advisory` — body `{ alertId?, conflictIsin? }`. Returns AdvisoryMessage + `traceId`.
- `PATCH /api/clients/:id/advisory/:messageId` — body `{ status, rmNotes? }`. Updates status.
- `GET /api/traces` — list of recent traces (last 100), summary only (traceId, rootSpan.operationName, duration, status, spanCount).
- `GET /api/traces/:traceId` — full trace with nested span tree.
- `GET /api/audit` — timestamped log of all agent decisions.
- `GET /api/integrations` — pings all three services, returns status.

**Audit service** (`server/src/services/audit.service.ts`): Singleton that appends `{ timestamp, agent, action, input_summary, output_summary, duration_ms }` to an in-memory array. Every agent call wraps its work with `audit.log(...)`. The audit service also cross-references the current traceId so audit entries link back to trace spans.

**Error handling:** Every route uses `asyncHandler`. LLM failures return 503. SIX failures fall back to Excel prices. Unhandled errors return `{ success: false, error: message }`.

**Startup sequence** (`server/src/index.ts`):

1. Load `.env`.
2. Parse both Excel files into the data store. Exit with code 1 if files are missing/corrupt.
3. Start Express server.
4. Log: loaded N CRM entries, M portfolio positions, data store ready.
5. Pre-warm DNA cache for all four clients in parallel (fire-and-forget). Log progress. Each warm-up emits a trace.
6. Run integration probes — log status, do NOT block on failures.

**Exit criteria:** All endpoints return valid responses. `GET /api/traces` returns traces from the DNA pre-warm. Full client flow completes end-to-end in under 30 seconds. Run `bash test/e2e.sh`. Update `test/e2e.sh` to check all new endpoints including `/api/traces`.

---

### Phase 1.9: Presentation Skeleton (~30 min)

**Goal:** Auto-generate a `.pptx` presentation skeleton using `pptxgenjs`.

**Steps:**

1. Install `pptxgenjs` in server.
2. Create `server/src/utils/generate-pptx.ts` that generates a `.pptx` with slides:
   - Title slide: "WealthAdvisor AI — The Next Generation of Wealth Advisory"
   - Problem slide: private banking personalisation doesn't scale
   - Solution slide: AI-powered advisor dashboard with 4 capabilities
   - Architecture slide: multi-agent pipeline (CRM → Portfolio → News → Message)
   - Demo screenshots placeholders for each persona
   - Key features slide: Trust & Explainability, DNA profiling, smart alerts
   - Team slide (placeholder)
3. Add `GET /api/presentation` endpoint that triggers generation and downloads the `.pptx`.
4. Also generate on startup and save to `output/presentation.pptx`.

**Exit criteria:** `.pptx` file is generated and downloadable. Run `bash test/e2e.sh`.

---

## Phase 2: Testing & Improvement Directions

### Phase 2.1: End-to-End Testing (built into overnight run)

Testing is woven into the build, not bolted on after. Each persona's trigger scenario is the acceptance test for the full pipeline.

**Persona Trigger Scenarios**

Each scenario exercises the complete chain: CRM Agent (DNA extraction) → Portfolio Agent (holdings + conflict detection) → News Agent (trigger event matching) → Message Agent (personalised advisory draft).

- **Schneider — Pharma Research Shutdown:** The mock-triggers.ts provides a simulated pharma research shutdown article. Verify the alert fires against Schneider's DNA (family foundation supporting chronic-illness research). Confirm the portfolio agent identifies the pharma holding as conflicting with `riskType: "values"`, proposes a same-sector BUY-rated replacement from the CIO recommendation list, and the message agent drafts the note in Schneider's emotional, values-led style with evidence citations.
- **Huber — Palm Oil Deforestation Cut-Off:** The mock trigger provides a positive news article. Verify the alert is classified as `alertType: "opportunity"` (green styling, not red). Confirm the advisory message is values-led and inspiring, framed as reinforcement: "this holding now aligns even better with your reforestation commitments."
- **Räber — CIO Rebalancing Into US AI Stocks:** This trigger comes from the CIO recommendation list, NOT from news. Verify the Portfolio Agent's CIOConflictDetector identifies the rebalancing suggestion as conflicting with Räber's documented aversion to US tech. Confirm the alert has `riskType: "financial"`, the reasoning chain explains the mandate-level conflict, and the advisory note uses a conservative, data-driven communication style.
- **Ammann — Labour Exploitation Scandal:** The mock trigger provides a scandal article. Verify the alert has `riskType: "reputational"`. Confirm the advisory is urgent in tone, references reputational exposure, and proposes an immediate swap with reasoning tied to public-profile risk.

**API Integration Tests**

- SIX MCP: call `find_instrument` for at least 5 holdings, verify Valor + MIC. Call `end_of_day_snapshot` with `listing_ids` (array), verify numeric close price. Call `instrument_base` for bonds using ISIN, verify coupon and maturity.
- Event Registry: query with `keywordOper: "and"` and `dataType: ["news"]` for each persona's keywords, verify at least 1 article with sentiment.
- Phoeniqs LLM: structured prompt → valid JSON. Test fallback: if primary model returns 429, `inference-qwen3-vl-235b` is tried.

**Frontend Smoke Tests**

- All 4 personas appear and load without errors
- Portfolio shows prices (live or Excel fallback with "stale" badge)
- News feed populates (live + scenario articles)
- DNA panel shows traits with evidence and confidence
- Advisory generates within 30 seconds with reasoning chain
- Alerts panel shows at least one item per persona with Approve/Dismiss buttons
- Demo Mode walks through Schneider scenario end-to-end
- Offline mode: kill APIs → mock data + yellow banner

**Edge Case Handling**

- SIX returns no price: show Excel price with `priceSource: "excel"` badge
- Event Registry returns 0 results: show "No recent news" + scenario articles still appear
- LLM returns malformed JSON: retry once with stricter prompt, then return fallback
- LLM hallucinates holdings not in portfolio: validate ISINs against portfolio data
- Network timeout: per-panel error state with retry button, other panels stay functional
- All APIs down: server starts, frontend shows mock data
- Trace always emitted: even on failures, the trace captures what went wrong and where (span status: "ERROR" with error message in attributes)

### Phase 2.2: Improvement Directions (prioritised by judging weight)

**Creativity (25% of score)**

- Multi-agent visualisation: render the agent pipeline as a flow diagram with real-time status indicators
- Interactive "what-if" scenarios: RM adjusts DNA traits → instant re-run of conflict detection
- Voice/tone slider on the message composer
- Client DNA timeline showing profile evolution over 3 years of CRM logs

**Trust & Explainability (25% of score)**

- Deep source attribution on every claim
- Audit trail drawer accessible from dashboard
- CRM evidence mapping with highlighted excerpts
- Human-in-the-loop approval flow with logged reasoning

**Feasibility (20% of score)**

- Response time optimisation (parallel API calls, aggressive caching)
- Batch SIX lookups via `execute_graphql`
- Rate limiting awareness for shared Phoeniqs credits

**Visual Design (15% of score)**

- Portfolio allocation donut chart (target vs actual)
- Mandate drift bar indicators with ±2.0pp threshold
- Print-friendly advisory message view

**Presentation Quality (15% of score)**

- Demo script for Schneider walkthrough
- Export advisory as formatted content (clipboard + download)
- Screenshot-ready states for all personas

### Phase 2.3: Behaviour Accuracy & Benchmarking (continuous improvement)

This is a key differentiator for Trust & Explainability (25%) and Feasibility (20%). It shows the system has a quality assurance framework, not just a demo.

**Benchmark suite** — create a `benchmarks/` directory:

```
benchmarks/
├── golden/                    # manually verified expected outputs
│   ├── schneider-dna.json     # golden ClientDNA for Schneider
│   ├── huber-dna.json
│   ├── raeber-dna.json
│   └── ammann-dna.json
├── cases/                     # test case definitions
│   ├── conflicts.json         # known conflicts that MUST be detected per persona
│   ├── triggers.json          # trigger articles that MUST score > 0.7 relevance
│   └── tone-expectations.json # expected communication style per persona
├── results/                   # timestamped benchmark runs
│   └── 2026-06-20T03-00.json
├── run.sh                     # runs all benchmarks, outputs results JSON
└── evaluate.ts                # scoring logic
```

**Multi-vertical accuracy dimensions** — each benchmark measures a different quality axis:

1. **DNA extraction accuracy**: compare extracted ClientDNA against golden profile. Measure precision (no hallucinated traits) and recall (no missed traits) on values, life events, risk sensitivities. Target: precision ≥ 0.8, recall ≥ 0.7.
2. **Conflict detection accuracy**: for each persona, a set of known conflicts from the challenge brief that MUST be detected. Measure true-positive rate (all known conflicts found) and false-positive rate (no spurious conflicts). Target: TPR ≥ 0.9.
3. **Alert relevance accuracy**: feed each persona's mock trigger articles through the News Agent. Verify trigger articles score > 0.7 relevance. Verify unrelated articles score < 0.3. Measure ranking quality (trigger articles in top 3).
4. **Message tone accuracy**: verify Schneider gets values-led language, Räber gets data-driven language. Use LLM-as-judge (see below). Target: tone match ≥ 4/5.
5. **Swap suggestion accuracy**: verify all swaps are within the correct sub-asset-class AND BUY-rated on the CIO list. Binary pass/fail per swap.

**Before/after improvement loop** — the development cycle for any system change:

1. Run `bash benchmarks/run.sh` → produces `benchmarks/results/<timestamp>-before.json`
2. Make the code change
3. Run `bash benchmarks/run.sh` → produces `benchmarks/results/<timestamp>-after.json`
4. Compare: `node benchmarks/evaluate.ts --before <before> --after <after>`
5. Only accept changes where no dimension regresses AND at least one improves
6. Store all results for audit trail

**LLM-as-judge evaluation** — automated quality scoring:

For subjective dimensions (tone accuracy, message quality), use a separate Phoeniqs LLM call as an evaluator:
- Prompt: "Rate this advisory message 1-5 on tone match with the client's preferred communication style ({style}). The client profile: {dna_summary}. The message: {message}. Return JSON: {score: number, reasoning: string}"
- Run 3 evaluations per message, take the median score
- This is automated as part of `benchmarks/run.sh`

**Trace-powered benchmarking** — every benchmark run triggers real API calls via the orchestrator, which emits traces. The benchmark runner:

1. Calls `POST /api/clients/:id/advisory` for each persona → receives `traceId` in response
2. Fetches `GET /api/traces/:traceId` → gets the full span tree
3. Extracts per-agent timing, token usage, cache-hit rates, and error counts from span attributes
4. Stores the trace alongside benchmark scores in `benchmarks/results/` for post-hoc debugging
5. If a benchmark score regresses, the trace pinpoints exactly which agent degraded (e.g., "conflict detection took 8s instead of 2s because SIX MCP was slow" or "DNA extraction missed a trait because the LLM prompt changed")

This connects the tracing system directly to the quality loop — traces are not just for live debugging, they're the evidence layer for continuous improvement.

**Implementation**: build the golden profiles in Phase 1.3 (after DNA extraction works — save the best outputs as golden files). Build the benchmark runner in Phase 2.1 (alongside E2E tests). The benchmark suite should run in under 2 minutes and consume minimal LLM credits (cache golden comparisons, only LLM-judge calls cost credits).

### Phase 2.4: Stretch Goals (if time permits overnight)

- **Portfolio rebalancing simulator** with DNA-aware constraints
- **Before/after comparison** of generic vs personalised advice
- **Real-time WebSocket** news alerts
- **Multi-language advisory** messages (German/French)
- **Noumena Digital integration** — knowledge graphs and financial abstractions for richer domain modelling

### Final Checklist

- [ ] All 4 personas work end-to-end
- [ ] `./start.sh` runs the full app
- [ ] `docker compose up --build` works
- [ ] `bash test/e2e.sh` passes all checks
- [ ] Demo Mode works for Schneider scenario
- [ ] Mock data displays when APIs are down
- [ ] `.pptx` presentation skeleton is generated
- [ ] Complete MCP feedback form: https://forms.office.com/e/tX2cH5n9Yi (manual — one per team)

---

## Appendix A: UI Design Specification

Every visual decision is pre-made. The implementing agent must not improvise colours, spacing, or layout — follow this spec exactly.

### A.1 Global Styles

**tailwind.config.js:**

```js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      gridTemplateColumns: { layout: "260px 1fr" },
    },
  },
}
```

Add to `client/index.html` `<head>`:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Token map:** background `bg-slate-900`, cards `bg-slate-800`, borders `border-slate-700`, muted text `text-slate-400`, body text `text-slate-100`, headings `text-white`. Primary `text-blue-400` / `bg-blue-600`. Danger `text-red-400` / `bg-red-500`. Warning `text-amber-400`. Success `text-green-400` / `bg-green-500`.

### A.2 Layout

```
App.tsx root:  div.grid.grid-cols-layout.h-screen.bg-slate-900.text-slate-100
  ├─ Sidebar:  aside.flex.flex-col.gap-2.p-4.bg-slate-900.border-r.border-slate-700.overflow-y-auto
  └─ div.flex.flex-col.h-screen
       ├─ Header:  header.h-14.px-6.flex.items-center.justify-between.bg-slate-800.border-b.border-slate-700
       └─ Main:    main.flex-1.overflow-y-auto.p-6
                     div.grid.grid-cols-2.gap-6   (advisory panel uses col-span-2)
```

On `max-lg`: `grid-cols-1` for main, sidebar becomes a horizontal top bar `flex-row.overflow-x-auto.h-auto.border-b`.

### A.3 Header

```
header.h-14.px-6.flex.items-center.justify-between.bg-slate-800.border-b.border-slate-700
  ├─ h1.text-lg.font-semibold.text-white  → "WealthAdvisor AI"
  ├─ button "Demo" → Play icon (lucide: Play), bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium
  └─ div.flex.items-center.gap-3          → 3 × StatusDot
```

**StatusDot:** `div.flex.items-center.gap-1.5` → `span.h-2.w-2.rounded-full` (`bg-green-400` ok / `bg-red-400` down) + `span.text-xs.text-slate-400` label ("SIX" / "News" / "LLM"). Wrap in a `title` attribute with full service name.

### A.4 Client Selector (Sidebar)

Each `ClientCard`: `button.w-full.text-left.p-3.rounded-lg.flex.items-center.gap-3.transition-all.duration-200`

- Default: `hover:bg-slate-800`
- Selected: `bg-slate-800.border-l-2.border-blue-400`

Avatar: `div.h-10.w-10.rounded-full.flex.items-center.justify-center.text-sm.font-semibold.text-white` with bg per persona — Schneider `bg-blue-600`, Huber `bg-green-600`, Räber `bg-amber-600`, Ammann `bg-purple-600`. Shows initials ("MS", "PH", "RR", "CA").

Name: `span.font-medium.text-white`. Strategy badge below: `span.text-xs.px-2.py-0.5.rounded-full` — Defensive `bg-blue-900/50 text-blue-300`, Balanced `bg-amber-900/50 text-amber-300`, Growth `bg-green-900/50 text-green-300`.

### A.5 Card Container (shared)

All dashboard panels use: `div.bg-slate-800.border.border-slate-700.rounded-xl.p-5`. Title: `h2.text-sm.font-semibold.text-slate-300.uppercase.tracking-wide.mb-4` with lucide icon inline (`h-4 w-4 mr-2 text-slate-400`).

### A.6 DNA Panel

Icon: `Dna` (lucide). Grid of pill tags in `div.flex.flex-wrap.gap-2`:

- Values: `span.text-xs.px-2.5.py-1.rounded-full.bg-blue-900/50.text-blue-300`
- Life events: `span.text-xs.px-2.5.py-1.rounded-full.bg-purple-900/50.text-purple-300`
- Risk sensitivities: `span.text-xs.px-2.5.py-1.rounded-full.bg-red-900/50.text-red-300`

Communication style: prominent `span.text-sm.font-medium.px-3.py-1.rounded-full.bg-slate-700.text-white`.

Key quotes: `blockquote.border-l-2.border-slate-600.pl-3.text-sm.text-slate-300.italic` with `span.text-xs.text-slate-500.block.mt-1` for CRM date. Confidence: `ConfidenceBadge` (see A.12).

### A.7 Portfolio Table

Icon: `Briefcase`. Container adds `overflow-x-auto`.

`table.w-full.text-sm`. Header `thead`: `th.text-left.text-xs.font-medium.text-slate-400.uppercase.tracking-wide.pb-3.border-b.border-slate-700`. Sortable headers add `cursor-pointer hover:text-white` + `ArrowUpDown` icon (lucide, `h-3 w-3`).

Body rows: `tr.border-b.border-slate-700/50.hover:bg-slate-700/30.transition-colors`. Cells `td.py-3.pr-4`.

Drift column: inline bar `div.h-1.5.rounded-full.bg-slate-700` with inner `div.h-full.rounded-full` — green `bg-green-500` (within ±1pp), amber `bg-amber-500` (1–2pp), red `bg-red-500` (>2pp). Width proportional to drift magnitude (capped at 100%).

CIO rating badges: BUY `bg-green-900/50 text-green-300`, HOLD `bg-slate-700 text-slate-300`, SELL `bg-red-900/50 text-red-300`. All `text-xs px-2 py-0.5 rounded-full`.

Conflict badge: `span.text-xs.px-2.py-0.5.rounded-full` — high `bg-red-900/50 text-red-300`, medium `bg-amber-900/50 text-amber-300`, low `bg-slate-700 text-slate-300`.

### A.8 Allocation Chart

Icon: `PieChart`. Two recharts `<PieChart>` side by side in `div.flex.gap-6.justify-center`. Each 180×180. Use `<Pie>` with `innerRadius={50} outerRadius={80}`. Label: "Target" / "Actual" below each in `text-xs text-slate-400 text-center`.

6-color palette for asset classes: `#3b82f6` (blue), `#22c55e` (green), `#f59e0b` (amber), `#ef4444` (red), `#8b5cf6` (purple), `#06b6d4` (cyan). Legend below: `div.flex.flex-wrap.gap-3.mt-3` with colored dot + label.

### A.9 News Feed

Icon: `Newspaper`. Container: `div.max-h-[400px].overflow-y-auto.space-y-3`.

Each `NewsCard`: `div.p-3.rounded-lg.bg-slate-700/50.transition-all.duration-200.hover:bg-slate-700`. Alert-level: add `border-l-2.border-red-400`. Opportunity-level: add `border-l-2.border-green-400`.

Layout: title `p.font-medium.text-sm.text-slate-100`, meta `div.flex.items-center.gap-2.mt-1` → source `span.text-xs.text-slate-400`, date `span.text-xs.text-slate-500`, sentiment badge `span.text-xs.px-2.py-0.5.rounded-full` (BULLISH `bg-green-900/50 text-green-300`, NEUTRAL `bg-slate-600 text-slate-300`, BEARISH `bg-red-900/50 text-red-300`).

Relevance bar: `div.mt-2.h-1.rounded-full.bg-slate-600` → inner `div.h-full.rounded-full.bg-blue-500` width = `relevanceScore * 100%`.

### A.10 Alerts & Conflicts Panel

Icon: `ShieldAlert`. Each alert: `div.p-4.rounded-lg.bg-slate-700/50.border.border-slate-600`.

Header row: `div.flex.items-start.gap-3`. Icon: `AlertTriangle` (high, `text-red-400`) or `AlertCircle` (medium, `text-amber-400`) or `Info` (low, `text-blue-400`). All `h-5 w-5 mt-0.5`.

Title `p.font-medium.text-sm`, reason `p.text-sm.text-slate-300.mt-1`, affected holding `span.text-xs.text-slate-400`.

Buttons: `div.flex.gap-2.mt-3` → Approve `button.text-xs.px-3.py-1.rounded-lg.bg-green-600.hover:bg-green-700.text-white`, Dismiss `button.text-xs.px-3.py-1.rounded-lg.bg-slate-600.hover:bg-slate-500.text-slate-200`.

Expandable reasoning: `<details>` → `<summary className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer mt-2">` with `ChevronDown` icon (`h-3 w-3`) + "Why this alert?" → `<p className="text-xs text-slate-400 mt-1 pl-4">`.

### A.11 Advisory Panel

Icon: `MessageSquarePen`. Container: `col-span-2` (full width).

Subject: `h3.text-lg.font-semibold.text-white`. Tone badge next to it: same pill style as strategy badges. Confidence: `ConfidenceBadge`.

Body: `div.mt-3.text-sm.text-slate-200.leading-relaxed.whitespace-pre-wrap` (read mode) or `textarea.w-full.bg-slate-700.border.border-slate-600.rounded-lg.p-3.text-sm.text-slate-200.min-h-[200px]` (edit mode).

Buttons: `div.flex.gap-2.mt-4` → Generate `bg-blue-600 hover:bg-blue-700 text-white`, Regenerate `bg-slate-700 hover:bg-slate-600 text-slate-200`, Copy `bg-slate-700 hover:bg-slate-600 text-slate-200` (icon: `Copy`), Edit `bg-slate-700 hover:bg-slate-600 text-slate-200` (icon: `Pencil`). All `px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`.

Reasoning chain: same `<details>` pattern as alerts, below the buttons.

Disclaimer: `p.text-xs.text-slate-500.mt-4.border-t.border-slate-700.pt-3`.

### A.12 Shared Components

**ConfidenceBadge:** `span.text-xs.px-2.py-0.5.rounded-full.font-medium`. Color by value: ≥0.7 `bg-green-900/50 text-green-300`, 0.4–0.7 `bg-amber-900/50 text-amber-300`, <0.4 `bg-red-900/50 text-red-300`. Content: `"{Math.round(score*100)}%"`.

**LoadingSpinner:** `div.flex.items-center.justify-center.py-8` → `Loader2` icon (`h-6 w-6 text-slate-400 animate-spin`).

**ErrorState:** `div.flex.flex-col.items-center.gap-2.py-6` → `AlertTriangle` (`h-6 w-6 text-red-400`) + message `p.text-sm.text-red-300` + retry `button.text-xs.text-blue-400.hover:underline`.

**EmptyState:** `p.text-sm.text-slate-500.italic.py-4.text-center`.

**SkeletonLoader:** `div.animate-pulse.rounded-lg.bg-slate-700.h-4.w-full` (repeat 3–5 lines with varying widths: `w-3/4`, `w-1/2`, `w-5/6`).

### A.13 Animations

- Cards: `transition-all duration-200` on hover states
- Loaders: `animate-spin` on `Loader2`
- Skeletons: `animate-pulse` on placeholder blocks
- Sidebar selection: `transition-colors duration-150`
- No page transitions, no entrance animations — keep it professional

### A.14 Trace Viewer

**Trigger:** "Traces" button in Header — icon `Activity` (lucide), same style as Demo button but `bg-slate-700 hover:bg-slate-600 text-slate-200`.

**TraceDrawer:** Slide-out panel from the right. `div.fixed.inset-y-0.right-0.w-[520px].bg-slate-800.border-l.border-slate-700.shadow-2xl.z-50.flex.flex-col.transition-transform.duration-300`. Backdrop: `div.fixed.inset-0.bg-black/40.z-40` (click to close).

Header: `div.flex.items-center.justify-between.p-4.border-b.border-slate-700` → title `h2.text-sm.font-semibold.text-white` "Agent Traces" + close button `X` icon (`h-4 w-4 text-slate-400 hover:text-white`).

**Trace list:** `div.flex-1.overflow-y-auto.p-4.space-y-2`. Each trace summary: `button.w-full.text-left.p-3.rounded-lg.bg-slate-700/50.hover:bg-slate-700.transition-colors`. Layout: operation name `span.font-medium.text-sm.text-slate-100`, meta row `div.flex.items-center.gap-3.mt-1` → status dot (`h-2 w-2 rounded-full` green/red), duration `span.text-xs.text-slate-400` (e.g. "1.2s"), span count `span.text-xs.text-slate-500` (e.g. "8 spans"), timestamp `span.text-xs.text-slate-500`.

**SpanTree (on trace click):** Back button `button.text-xs.text-blue-400.hover:underline.mb-3` → "← All traces". Recursive tree using indentation. Each span node: `div.py-1.5.pl-{depth*4}` (depth 0 = pl-0, depth 1 = pl-4, depth 2 = pl-8, etc.).

Span row: `div.flex.items-center.gap-2.cursor-pointer.hover:bg-slate-700/30.rounded.px-2.py-1`.
- Expand toggle: `ChevronRight` icon (`h-3 w-3 text-slate-500`, rotates 90° when expanded via `transform rotate-90 transition-transform`)
- Service badge: `span.text-xs.px-1.5.py-0.5.rounded.font-mono` — color per service: crm-agent `bg-blue-900/50 text-blue-300`, portfolio-agent `bg-green-900/50 text-green-300`, news-agent `bg-purple-900/50 text-purple-300`, message-agent `bg-amber-900/50 text-amber-300`, phoeniqs `bg-cyan-900/50 text-cyan-300`, six-mcp `bg-red-900/50 text-red-300`, event-registry `bg-pink-900/50 text-pink-300`
- Operation name: `span.text-sm.text-slate-200`
- Duration: `span.text-xs.text-slate-500.ml-auto` (e.g. "340ms")
- Status dot: `span.h-1.5.w-1.5.rounded-full` (green/red)

**SpanDetail (expanded):** `div.ml-6.mt-1.mb-2.p-3.rounded-lg.bg-slate-900/50.text-xs`.
- Timing bar: `div.h-1.rounded-full.bg-slate-700.mt-1.mb-2` → inner `div.h-full.rounded-full.bg-blue-500` width proportional to span duration relative to trace total.
- Attributes: `dl.grid.grid-cols-[auto_1fr].gap-x-3.gap-y-1` → `dt.text-slate-500.font-mono` + `dd.text-slate-300.font-mono`.
- Events: `div.mt-2.space-y-1` → each event: `div.flex.items-center.gap-2` → `span.h-1.w-1.rounded-full.bg-blue-400` + event name `span.text-slate-400` + timestamp offset `span.text-slate-500.ml-auto`.
