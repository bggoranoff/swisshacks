# WealthAdvisor AI

AI-powered wealth advisory dashboard for SwissHacks 2026 (SIX Challenge).

## Quick Start

```bash
# Fill in API keys
cp .env.example .env
# Edit .env with your Phoeniqs, SIX MCP, and Event Registry keys

# Run
./start.sh
# Opens on http://localhost:3000
```

## Architecture

- **server/** — Express + TypeScript backend with 4 AI agents
- **client/** — Vite + React + TailwindCSS dark-theme dashboard
- **data/** — Excel files (CRM logs + portfolio data)

## Key Commands

```bash
npm run dev          # Dev mode with hot reload (server:3000, client:5173)
./start.sh           # Production build + start
bash test/e2e.sh     # Run E2E tests (server must be running on :3000)
docker compose up    # Docker deployment
```

## API Endpoints

- GET /api/clients — list personas
- GET /api/clients/:id/dna — client DNA profile
- GET /api/clients/:id/portfolio — portfolio with CIO ratings
- GET /api/clients/:id/news — scored news feed
- POST /api/clients/:id/advisory — generate advisory message
- GET /api/traces — agent execution traces
- GET /api/audit — audit trail
- GET /api/integrations — service health probes
- GET /api/presentation — download PPTX

## Environment Variables

- PHOENIQS_API_KEY — LLM API (OpenAI-compatible)
- SIX_MCP_TOKEN — SIX Financial Data MCP server
- NEWSAPI_KEY — Event Registry news API
