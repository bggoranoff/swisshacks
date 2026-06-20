# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
cp .env.example .env   # fill in PHOENIQS_API_KEY, SIX_MCP_TOKEN, NEWSAPI_KEY
./start.sh             # production build + start on http://localhost:3000
```

## Key Commands

```bash
npm run dev            # dev mode: server on :3000 (ts-node), client on :5173 (vite)
bash test/e2e.sh       # smoke-test all API endpoints (server must be running)
cd server && npm run build   # compile TypeScript to server/dist/
cd client && npm run build   # vite bundle to client/dist/
cd client && npm run lint    # eslint
docker compose up      # containerised deployment
```

## Architecture

Monorepo with two independent packages sharing a `.env` at the root.

- **server/** — Express + TypeScript. Reads Excel data at startup, serves REST API, runs LLM agents.
- **client/** — Vite + React 19 + TailwindCSS v4. Dark-theme SPA; proxies `/api/*` to `:3000` in dev via vite config.
- **data/** — Two Excel files that are the sole data source: `SwissHacks CRM.xlsx` (CRM notes per client) and `SwissHacks Portfolio Construction.xlsx` (positions, CIO ratings, allocations).

### Data Flow

1. `server/src/data/loader.ts` parses both Excel files at startup via `xlsx` and populates two in-memory Maps in `data/store.ts`: one keyed by `clientId`, one keyed by `strategy`.
2. All client data (CRM entries, portfolios) lives in memory for the lifetime of the process — there is no database.
3. LLM results (DNA extraction, news scoring) are cached in module-level Maps inside each agent/service and survive across requests but not across restarts.

### Server-Side Agents

Four agents under `server/src/agents/`:

| Agent | File | Role |
|---|---|---|
| CRM Agent | `crm.agent.ts` | Extracts "Client DNA" from CRM notes using Phoeniqs LLM (chunked, merged, then consolidated). Falls back to a keyword heuristic if no LLM key is present. |
| News Agent | `news.agent.ts` | Fetches live news from Event Registry, merges optional scenario triggers, then scores articles against a client's DNA via LLM. |
| Message Agent | `message.agent.ts` | Generates personalised advisory messages using DNA + portfolio + news context. Supports EN/DE/FR. |
| Conflict Agent | `conflict.agent.ts` | Compares top-20 portfolio positions against DNA hard constraints and CIO recommendations to detect misalignment. |

Supporting services under `server/src/services/`:
- `trace.service.ts` / `audit.service.ts` — immutable in-memory logs of all agent calls.
- `explainability.service.ts` — records structured reasoning steps for each decision.
- `six.service.ts` — calls the SIX Financial Data MCP server via JSON-RPC over HTTP (not a plain REST API). Instruments are addressed by `{valor}_{mic}` listing IDs.
- `knowledge-graph.service.ts` — builds a client relationship graph from DNA + portfolio + news for the UI graph panel.

### Startup Warmup

On server start, the process sequentially pre-warms caches: DNA for all clients first (because news agent calls `extractDNA` internally), then news digests, then portfolio conflict detection. This ensures first-request latency is near-zero.

### Client Architecture

Single-page app with a resizable three-column layout (sidebar / main / chat). Routing is state-based (no React Router): `selectedId === null` shows `HomePage`, otherwise shows per-client panels. `useFetch` (`client/src/hooks/useFetch.ts`) is the only data-fetching hook; `prefetchCache.ts` fires background requests for all clients when the list loads.

The four hardcoded demo personas are: `schneider` (Balanced), `huber` (Defensive), `raeber` (Defensive), `ammann` (Growth).

Dashboard keyboard shortcuts: `1–4` to select a client, `D` to start demo walkthrough, `A` to open audit drawer, `G` to generate advisory, `Ctrl+\` to toggle chat sidebar.

## Environment Variables

| Variable | Purpose |
|---|---|
| `PHOENIQS_API_KEY` | Phoeniqs LLM (OpenAI-compatible API). Without this, DNA extraction falls back to a keyword heuristic. |
| `PHOENIQS_API_URL` | Default: `https://maas.phoeniqs.com/v1` |
| `PHOENIQS_MODEL` | Default: `inference-gpt-oss-120b` |
| `SIX_MCP_TOKEN` | Bearer token for SIX Financial Data MCP server. Without it, live prices are skipped silently. |
| `SIX_MCP_URL` | MCP endpoint URL |
| `NEWSAPI_KEY` | Event Registry API key. Without it, news fetching is skipped. |
| `DEMO_MODE` | `true` → use hardcoded demo DNA profiles instead of LLM extraction |
| `VITE_DEMO_MODE` | `true` → enable mock data fallbacks in the React client when the API is unreachable |
| `ENABLE_SCENARIO_NEWS` | `true` → inject simulated scenario-trigger articles into the news feed |

## API Endpoints

```
GET  /api/clients                     — list all clients
GET  /api/clients/:id                 — client detail
GET  /api/clients/:id/dna             — LLM-extracted DNA profile (?refresh=true to bust cache)
POST /api/clients/:id/trait-summary   — on-demand trait explanation from LLM
GET  /api/clients/:id/portfolio       — positions enriched with live SIX prices + conflicts + drift
GET  /api/clients/:id/news            — scored news digest
POST /api/clients/:id/advisory        — generate advisory message (body: {alertId?, conflictIsin?, language?})
GET  /api/clients/:id/chat            — chat history
POST /api/clients/:id/chat            — send RM assistant message
GET  /api/clients/:id/graph           — knowledge graph data
GET  /api/home                        — home dashboard (todos + latest news, all clients)
GET  /api/traces / /api/traces/:id    — agent execution traces
GET  /api/decisions / /api/decisions/:id — explainability records
GET  /api/audit                       — audit trail (?clientId= to filter)
GET  /api/integrations                — live health probes for SIX, Phoeniqs, Event Registry
GET  /api/presentation                — download PPTX
```
