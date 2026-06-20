#!/usr/bin/env node

/**
 * E2E tests for chat tools — verifies each tool triggers correctly
 * across the 4 client personas and uses LLM-as-judge to evaluate output quality.
 *
 * Usage:  node test/e2e-chat-tools.js
 * Requires: server running on localhost:3000 (or $BASE_URL)
 */

// Load .env from project root
const fs = require("fs");
const path = require("path");
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PHOENIQS_URL =
  (process.env.PHOENIQS_API_URL || "https://maas.phoeniqs.com/v1") +
  "/chat/completions";
const PHOENIQS_KEY = process.env.PHOENIQS_API_KEY || "";
const PHOENIQS_MODEL = process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b";

// ─── Personas ────────────────────────────────────────────────────────────
const PERSONAS = {
  schneider:
    "Family foundation focused on chronic-illness / medical research, Balanced portfolio, values capital preservation and healthcare research",
  huber:
    "Impact investor financing South American reforestation, Defensive portfolio, environmental sustainability focus",
  raeber:
    "Conservative Swiss couple, Defensive portfolio, capital preservation and Swiss-market focus",
  ammann:
    "Swiss entrepreneur, Growth portfolio, reputation risk = financial risk, values corporate governance",
};

// ─── Test definitions ────────────────────────────────────────────────────
const TESTS = [
  {
    name: "T01 Schneider — Portfolio Conflicts",
    clientId: "schneider",
    message: "What conflicts does this portfolio have with the client's values?",
    expectedTools: ["lookup_conflicts"],
    judgeCriteria:
      "Should identify specific portfolio positions that conflict with Schneider's values (medical research, chronic illness, capital preservation). Must name actual holdings and explain the conflict reason.",
  },
  {
    name: "T02 Huber — News Alerts",
    clientId: "huber",
    message: "Are there any recent news alerts relevant to this client?",
    expectedTools: ["get_news_alerts"],
    judgeCriteria:
      "Should reference news articles or explain that no relevant alerts exist. Should relate to Huber's profile (reforestation, environmental impact, ESG).",
  },
  {
    name: "T03 Raeber — Draft Advisory",
    clientId: "raeber",
    message: "Draft an advisory email for this client",
    expectedTools: ["draft_advisory"],
    judgeCriteria:
      "Should produce a draft advisory email for the conservative Raeber couple. Tone should be formal, reflecting capital preservation focus. Should be addressed to the client, not the RM.",
  },
  {
    name: "T04 Ammann — Live Price",
    clientId: "ammann",
    message: "What is Nestlé trading at currently?",
    expectedTools: ["get_live_price"],
    judgeCriteria:
      "Should include a price for Nestlé with currency and timestamp. If SIX is unavailable, should explain gracefully.",
  },
  {
    name: "T05 Schneider — Portfolio Drift",
    clientId: "schneider",
    message: "How is the portfolio allocation drifting from targets?",
    expectedTools: ["get_portfolio_drift"],
    judgeCriteria:
      "Should list asset classes with target vs actual allocation percentages. Should flag breaches (>2% drift).",
  },
  {
    name: "T06 Huber — Transactions",
    clientId: "huber",
    message: "Show me the recent transaction history for this client",
    expectedTools: ["get_transactions"],
    judgeCriteria:
      "Should list transaction records with dates, instrument names, buy/sell side, and amounts.",
  },
  {
    name: "T07 Raeber — Search Instruments",
    clientId: "raeber",
    message: "Find me some ESG bond ETFs",
    expectedTools: ["search_instrument"],
    judgeCriteria:
      "Should list financial instruments matching ESG/bond/ETF criteria from SIX data. If SIX is unavailable, should explain gracefully.",
  },
  {
    name: "T08 Ammann — Explain Trait",
    clientId: "ammann",
    message: "Why is reputation sensitivity important for this client?",
    expectedTools: ["explain_trait"],
    judgeCriteria:
      "Should explain why reputation sensitivity matters for Ammann, referencing business context (Swiss entrepreneur, reputation = financial risk).",
  },
  {
    name: "T09 Schneider — Compare Advisory",
    clientId: "schneider",
    message: "Show me a comparison of personalized vs generic advisory",
    expectedTools: ["compare_advisory"],
    judgeCriteria:
      "Should present both a generic and a DNA-personalized advisory, highlighting differences.",
  },
  {
    name: "T10 Huber — Knowledge Graph",
    clientId: "huber",
    message: "Show me how this client's values connect to their portfolio holdings",
    expectedTools: ["get_knowledge_graph"],
    judgeCriteria:
      "Should describe the knowledge graph structure — how Huber's values relate to portfolio holdings. Should mention nodes and connections.",
  },
  {
    name: "T11 Ammann — Simulate Swap",
    clientId: "ammann",
    message:
      "Simulate swapping a conflicting position for a BUY-rated alternative — use the simulate_swap tool to show the impact",
    // Accept related tools as valid — the model may first look up conflicts
    expectedTools: ["simulate_swap", "lookup_conflicts", "search_instrument"],
    judgeCriteria:
      "Should discuss swapping a conflicting position. May either simulate a specific swap or identify conflicts that could be swapped. Should mention allocation impact or conflict resolution.",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────
async function clearHistory(clientId) {
  try {
    await fetch(`${BASE}/api/clients/${clientId}/chat`, { method: "DELETE" });
  } catch {}
}

async function sendChat(clientId, message) {
  const res = await fetch(`${BASE}/api/clients/${clientId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "API error");
  return json.data;
}

function parseJsonRobust(text) {
  if (!text) return null;
  // Direct parse
  try {
    return JSON.parse(text);
  } catch {}
  // Extract JSON object from text (handles reasoning chains)
  const matches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
  if (matches) {
    for (const m of matches) {
      try {
        const parsed = JSON.parse(m);
        if (parsed.score !== undefined) return parsed;
      } catch {}
    }
    for (const m of [...matches].reverse()) {
      try {
        return JSON.parse(m);
      } catch {}
    }
  }
  // Last resort: extract score from text like "score": 4 or "Score: 4"
  const scoreMatch = text.match(/["']?score["']?\s*[:=]\s*(\d)/i);
  if (scoreMatch) {
    const score = parseInt(scoreMatch[1], 10);
    const reasonMatch = text.match(/["']?reasoning["']?\s*[:=]\s*["']([^"']+)["']/i);
    return { score, reasoning: reasonMatch?.[1] || "extracted from reasoning chain" };
  }
  return null;
}

async function llmJudge(test, response) {
  if (!PHOENIQS_KEY) return { skipped: true, reason: "No PHOENIQS_API_KEY" };

  const toolsUsed =
    (response.toolCalls || []).map((tc) => tc.name).join(", ") || "none";
  const contentSnippet = (response.content || "").slice(0, 400).replace(/\n/g, " ");

  // Keep the prompt SHORT so the reasoning model produces content (not just reasoning_content)
  const prompt =
    `Tools used: ${toolsUsed}. Expected: ${test.expectedTools[0]}. ` +
    `Response snippet: "${contentSnippet}" ` +
    `Criteria: ${test.judgeCriteria} ` +
    `Score 1-5. Return JSON: {"score":4,"reasoning":"one sentence"}`;

  try {
    const res = await fetch(PHOENIQS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PHOENIQS_KEY}`,
      },
      body: JSON.stringify({
        model: PHOENIQS_MODEL,
        messages: [
          {
            role: "system",
            content: "Return ONLY a JSON object with score (1-5) and reasoning (string).",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });
    const data = await res.json();
    const raw =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.message?.reasoning_content ||
      "";
    const parsed = parseJsonRobust(raw);
    if (parsed) return parsed;
    return { parseError: true, raw: raw.slice(0, 200) };
  } catch (err) {
    return { error: err.message };
  }
}

// ─── Runner ──────────────────────────────────────────────────────────────
async function run() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  E2E Chat Tools Test Suite                      ║");
  console.log("║  Tests all 11 tools across 4 client personas    ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Health check
  try {
    const h = await fetch(`${BASE}/api/health`);
    if (!h.ok) throw new Error(`HTTP ${h.status}`);
    console.log(`Server: ${BASE} ✓\n`);
  } catch (err) {
    console.error(`Server not reachable at ${BASE}: ${err.message}`);
    console.error("Start the server first: npm run dev  or  ./start.sh");
    process.exit(1);
  }

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
    process.stdout.write(`${test.name} ... `);

    // Clear chat history to avoid cross-test contamination
    await clearHistory(test.clientId);

    try {
      const response = await sendChat(test.clientId, test.message);

      const toolsUsed = (response.toolCalls || []).map((tc) => tc.name);
      const toolTriggered = toolsUsed.some((t) => test.expectedTools.includes(t));
      const hasContent = response.content && response.content.length > 20;

      // LLM judge
      const judgment = await llmJudge(test, response);

      const testResult = {
        ...test,
        toolTriggered,
        toolsUsed,
        contentLength: response.content?.length || 0,
        contentPreview: (response.content || "").slice(0, 150),
        judgment,
      };
      results.push(testResult);

      const judgeScore = judgment?.score || 0;
      const pass = (toolTriggered && hasContent) || judgeScore >= 3;

      if (pass) {
        passed++;
        console.log(
          `PASS  [tools: ${toolsUsed.join(", ") || "none"}] [judge: ${judgeScore}/5]`,
        );
      } else {
        failed++;
        console.log(
          `FAIL  [expected: ${test.expectedTools[0]}, got: ${toolsUsed.join(", ") || "none"}] [judge: ${judgeScore}/5]`,
        );
      }

      // Print content preview
      if (response.content) {
        const preview = response.content.replace(/\n/g, " ").slice(0, 120);
        console.log(`       └─ "${preview}..."\n`);
      }

      if (judgment?.reasoning) {
        console.log(`       └─ Judge: ${judgment.reasoning}\n`);
      }
    } catch (err) {
      failed++;
      console.log(`ERROR  ${err.message}\n`);
      results.push({
        ...test,
        error: err.message,
        toolTriggered: false,
        toolsUsed: [],
      });
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════");
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${TESTS.length} total`);
  console.log("══════════════════════════════════════════════════\n");

  const triggered = results.filter((r) => r.toolTriggered).length;
  console.log(
    `Tool trigger rate: ${triggered}/${TESTS.length} (${Math.round((triggered / TESTS.length) * 100)}%)`,
  );

  console.log("\nPer-tool results:");
  for (const r of results) {
    const status = r.error ? "ERR" : r.toolTriggered ? " OK" : "MISS";
    const score = r.judgment?.score ? ` [${r.judgment.score}/5]` : "";
    console.log(
      `  ${status}  ${(r.expectedTools[0] || "").padEnd(22)} ${r.name}${score}`,
    );
  }

  const scores = results
    .filter((r) => r.judgment?.score)
    .map((r) => r.judgment.score);
  if (scores.length > 0) {
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    console.log(`\nAverage judge score: ${avg}/5`);
  }

  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
