import axios from "axios";
import { extractDNA } from "./crm.agent";
import { getClient, getPortfolio } from "../data/store";
import { detectConflicts } from "./conflict.agent";
import { NewsAgent } from "./news.agent";
import { MessageAgent } from "./message.agent";
import { SixService } from "../services/six.service";
import { knowledgeGraphService } from "../services/knowledge-graph.service";
import { ClientDNA } from "../types/dna";
import { Portfolio } from "../types/data";

export interface ToolCallResult {
  name: string;
  result: any;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolCalls?: ToolCallResult[];
}

const chatHistories = new Map<string, ChatMessage[]>();
const newsAgent = new NewsAgent();
const messageAgent = new MessageAgent();
const sixService = new SixService();

const LLM_URL = () =>
  `${process.env.PHOENIQS_API_URL || "https://maas.phoeniqs.com/v1"}/chat/completions`;
const LLM_KEY = () => process.env.PHOENIQS_API_KEY || "";
const LLM_MODEL = () => process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b";

// ---------------------------------------------------------------------------
// Tool definitions (OpenAI function-calling format)
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "lookup_conflicts",
      description:
        "Look up portfolio positions that conflict with the client's values, constraints, and DNA profile. Returns conflicting positions with severity, reason, risk type, and suggested swap alternatives.",
      parameters: { type: "object", properties: {}, required: [] as string[] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_news_alerts",
      description:
        "Fetch the latest scored news digest for the client. Returns articles with relevance scores, sentiment, and alerts (conflicts and opportunities) based on the client's DNA.",
      parameters: {
        type: "object",
        properties: {
          alertsOnly: {
            type: "boolean",
            description: "If true, return only high-relevance alert articles. Default false.",
          },
        },
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "draft_advisory",
      description:
        "Generate a personalized advisory email draft for the client based on their DNA profile and current alerts.",
      parameters: {
        type: "object",
        properties: {
          language: {
            type: "string",
            enum: ["en", "de", "fr"],
            description: "Language for the advisory. Default: en",
          },
        },
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_live_price",
      description:
        "Get the current/latest price for a stock, bond, or ETF from SIX Financial Data.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description:
              "Stock symbol, ISIN, or name to look up (e.g. 'Nestlé', 'NESN', 'CH0038863350')",
          },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_portfolio_drift",
      description:
        "Get the portfolio allocation drift analysis — actual vs target asset class allocation with breach flags (>2% drift threshold).",
      parameters: { type: "object", properties: {}, required: [] as string[] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_transactions",
      description:
        "Get the client's transaction history. Can filter by ISIN for a specific instrument.",
      parameters: {
        type: "object",
        properties: {
          isin: {
            type: "string",
            description: "Optional ISIN to filter transactions for a specific instrument",
          },
        },
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_instrument",
      description:
        "Search for financial instruments (stocks, bonds, ETFs) by name, ticker, or keyword using SIX Financial Data.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query — instrument name, ticker, ISIN, or keyword (e.g. 'ESG bond ETF')",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "explain_trait",
      description:
        "Get a detailed explanation of why a specific DNA trait characterises this client, with CRM evidence.",
      parameters: {
        type: "object",
        properties: {
          trait: {
            type: "string",
            description:
              "The trait to explain (e.g. 'capital preservation', 'environmental sustainability')",
          },
          category: {
            type: "string",
            enum: ["values", "riskSensitivities", "personalPriorities", "businessContext"],
            description: "Which DNA category this trait belongs to. Default: values",
          },
        },
        required: ["trait"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "simulate_swap",
      description:
        "Simulate swapping one portfolio position for another. Shows allocation change, value impact, and whether it resolves a conflict.",
      parameters: {
        type: "object",
        properties: {
          sellIsin: {
            type: "string",
            description: "ISIN of the position to sell/remove",
          },
          buyIsin: {
            type: "string",
            description: "ISIN of the instrument to buy as replacement",
          },
        },
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_advisory",
      description:
        "Generate both a generic and a DNA-personalized advisory side by side, showing the impact of personalization with tone influences.",
      parameters: {
        type: "object",
        properties: {
          language: {
            type: "string",
            enum: ["en", "de", "fr"],
            description: "Language for the advisories. Default: en",
          },
        },
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_knowledge_graph",
      description:
        "Build the semantic knowledge graph showing relationships between the client's values, portfolio holdings, sectors, news events, and risk factors.",
      parameters: { type: "object", properties: {}, required: [] as string[] },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool context & executor
// ---------------------------------------------------------------------------
interface ToolContext {
  clientId: string;
  client: ReturnType<typeof getClient>;
  dna: ClientDNA;
  portfolio: Portfolio | undefined;
}

async function executeTool(
  name: string,
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<any> {
  const { clientId, client, dna, portfolio } = ctx;

  switch (name) {
    // ---- lookup_conflicts ----
    case "lookup_conflicts": {
      if (!portfolio) return { error: "No portfolio data available" };
      const positions = [...portfolio.positions]
        .sort((a, b) => b.currentValueCHF - a.currentValueCHF)
        .slice(0, 20)
        .map((p) => {
          const cio = portfolio.cioRecommendations.find((c) => c.isin === p.isin);
          return { ...p, cioRating: cio?.rating || null };
        });
      const conflicts = await detectConflicts(clientId, positions, dna, portfolio.cioRecommendations);
      return {
        conflictCount: conflicts.length,
        conflicts: conflicts.map((c) => ({
          position: c.positionName,
          isin: c.positionIsin,
          severity: c.severity,
          reason: c.reason,
          riskType: c.riskType,
          suggestedSwap: c.suggestedSwap
            ? {
                name: c.suggestedSwap.name,
                isin: c.suggestedSwap.isin,
                cioRating: c.suggestedSwap.cioRating,
                reason: c.suggestedSwap.reason,
              }
            : null,
        })),
      };
    }

    // ---- get_news_alerts ----
    case "get_news_alerts": {
      const digest = await newsAgent.getNewsDigest(clientId);
      const alertsOnly = args.alertsOnly === true;
      const articles = alertsOnly ? digest.alerts : digest.articles;
      return {
        articleCount: articles.length,
        alertCount: digest.alerts.length,
        articles: articles.slice(0, 10).map((a) => ({
          title: a.title,
          summary: a.summary.slice(0, 200),
          source: a.source,
          sentiment: a.sentimentLabel,
          relevanceScore: a.relevanceScore,
          isAlert: a.isAlert,
          alertType: a.alertType || null,
          relevanceReason: a.relevanceReason,
          url: a.url,
        })),
      };
    }

    // ---- draft_advisory ----
    case "draft_advisory": {
      const msg = await messageAgent.generateAdvisory(
        clientId,
        undefined,
        undefined,
        args.language || "en",
      );
      return {
        id: msg.id,
        subject: msg.subject,
        body: msg.body,
        tone: msg.tone,
        proposedAction: msg.proposedAction,
        confidence: msg.confidence,
        toneInfluences: msg.toneInfluences,
      };
    }

    // ---- get_live_price ----
    case "get_live_price": {
      try {
        return await sixService.getStockPrice(args.symbol);
      } catch (err) {
        return { error: `Could not fetch price for "${args.symbol}": ${(err as Error).message}` };
      }
    }

    // ---- get_portfolio_drift ----
    case "get_portfolio_drift": {
      if (!portfolio) return { error: "No portfolio data available" };
      const positions = portfolio.positions;
      const totalCurrent = positions.reduce((s, p) => s + p.currentValueCHF, 0);
      const actualByClass: Record<string, number> = {};
      for (const p of positions) {
        const ac = p.sectorOrAssetClass || "Other";
        actualByClass[ac] = (actualByClass[ac] || 0) + p.currentValueCHF;
      }

      const driftAnalysis: any[] = [];
      if (portfolio.strategyAllocations?.length) {
        for (const sa of portfolio.strategyAllocations) {
          const actualVal = actualByClass[sa.assetClass] || 0;
          const actualPct = totalCurrent > 0 ? (actualVal / totalCurrent) * 100 : 0;
          const drift = actualPct - sa.targetPercent;
          driftAnalysis.push({
            assetClass: sa.assetClass,
            targetPct: sa.targetPercent,
            actualPct: +actualPct.toFixed(2),
            driftPct: +drift.toFixed(2),
            breached: Math.abs(drift) > 2.0,
          });
        }
      } else {
        const totalTarget = portfolio.totalTargetCHF || 10_000_000;
        const sums = new Map<string, { target: number; current: number }>();
        for (const p of positions) {
          const ac = p.sectorOrAssetClass || "Other";
          const e = sums.get(ac) || { target: 0, current: 0 };
          e.target += p.targetValueCHF;
          e.current += p.currentValueCHF;
          sums.set(ac, e);
        }
        for (const [ac, s] of sums) {
          const tPct = (s.target / totalTarget) * 100;
          const aPct = (s.current / totalTarget) * 100;
          const drift = aPct - tPct;
          driftAnalysis.push({
            assetClass: ac,
            targetPct: +tPct.toFixed(2),
            actualPct: +aPct.toFixed(2),
            driftPct: +drift.toFixed(2),
            breached: Math.abs(drift) > 2.0,
          });
        }
      }

      return {
        strategy: portfolio.strategy,
        totalValueCHF: +totalCurrent.toFixed(0),
        allocations: driftAnalysis,
        breachCount: driftAnalysis.filter((d) => d.breached).length,
      };
    }

    // ---- get_transactions ----
    case "get_transactions": {
      if (!portfolio) return { error: "No portfolio data available" };
      let txns = portfolio.transactions || [];
      if (args.isin) txns = txns.filter((t) => t.isin === args.isin);
      return {
        count: txns.length,
        transactions: txns.slice(0, 20).map((t) => ({
          date: t.date,
          name: t.name,
          isin: t.isin,
          side: t.side,
          quantity: t.quantity,
          priceCHF: t.priceCHF,
          totalCHF: t.totalCHF,
        })),
      };
    }

    // ---- search_instrument ----
    case "search_instrument": {
      try {
        const results = await sixService.findInstrument(args.query, 5);
        return {
          count: results.length,
          instruments: results.map((r) => ({
            name: r.name,
            isin: r.isin,
            type: r.type,
            valor: r.valor,
            exchange: r.exchange,
            issuer: r.issuer,
          })),
        };
      } catch (err) {
        return { error: `Search failed: ${(err as Error).message}` };
      }
    }

    // ---- explain_trait ----
    case "explain_trait": {
      const trait = args.trait as string;
      const category = (args.category as string) || "values";

      const evidence = dna.evidence.filter(
        (e) =>
          e.trait.toLowerCase().includes(trait.toLowerCase()) ||
          trait.toLowerCase().includes(e.trait.toLowerCase()),
      );
      const evidenceLines =
        evidence.length > 0
          ? evidence.map((e) => `- ${e.crmDate}: "${e.crmExcerpt}"`).join("\n")
          : "No direct CRM citations available.";

      const catLabels: Record<string, string> = {
        values: "core investment value",
        businessContext: "business context factor",
        riskSensitivities: "risk sensitivity",
        personalPriorities: "personal priority",
      };
      const label = catLabels[category] || "trait";

      try {
        const resp = await axios.post(
          LLM_URL(),
          {
            model: LLM_MODEL(),
            messages: [
              {
                role: "system",
                content:
                  "You are a senior wealth management advisor writing a brief internal note. Explain in 2-3 sentences why a trait characterises a client's investment identity. Be specific to the evidence. Write in plain English, no bullet points.",
              },
              {
                role: "user",
                content: `Client: ${client?.name || clientId}\nTrait: "${trait}" (${label})\n\nSupporting CRM evidence:\n${evidenceLines}\n\nExplain why "${trait}" is a defining ${label} for this client.`,
              },
            ],
            temperature: 0.3,
            max_tokens: 200,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LLM_KEY()}`,
            },
            timeout: 30000,
          },
        );
        const choice = resp.data?.choices?.[0];
        const summary =
          choice?.message?.content || choice?.message?.reasoning_content || "";
        return {
          trait,
          category: label,
          explanation: summary.trim(),
          evidenceCount: evidence.length,
          evidence: evidence.slice(0, 5).map((e) => ({ date: e.crmDate, excerpt: e.crmExcerpt })),
        };
      } catch {
        return {
          trait,
          category: label,
          explanation: `${trait} is identified as a key ${label} for this client based on CRM analysis.`,
          evidenceCount: evidence.length,
          evidence: evidence.slice(0, 5).map((e) => ({ date: e.crmDate, excerpt: e.crmExcerpt })),
        };
      }
    }

    // ---- simulate_swap ----
    case "simulate_swap": {
      if (!portfolio) return { error: "No portfolio data available" };

      let sellIsin: string | undefined = args.sellIsin;
      let buyIsin: string | undefined = args.buyIsin;

      // Auto-detect: pick the most severe conflict and its suggested swap
      if (!sellIsin) {
        const top20 = [...portfolio.positions]
          .sort((a, b) => b.currentValueCHF - a.currentValueCHF)
          .slice(0, 20)
          .map((p) => {
            const cio = portfolio.cioRecommendations.find((c) => c.isin === p.isin);
            return { ...p, cioRating: cio?.rating || null };
          });
        const conflicts = await detectConflicts(clientId, top20, dna, portfolio.cioRecommendations);
        if (conflicts.length === 0) return { error: "No conflicts found to swap" };
        const worst = [...conflicts].sort((a, b) => {
          const sev: Record<string, number> = { high: 3, medium: 2, low: 1 };
          return (sev[b.severity] || 0) - (sev[a.severity] || 0);
        })[0];
        sellIsin = worst.positionIsin;
        if (!buyIsin) {
          if (worst.suggestedSwap) {
            buyIsin = worst.suggestedSwap.isin;
          } else {
            const buy = portfolio.cioRecommendations.find(
              (c) =>
                c.rating === "BUY" &&
                c.isin !== sellIsin &&
                !portfolio.positions.some((p) => p.isin === c.isin),
            );
            if (!buy) return { error: "No BUY-rated alternatives found" };
            buyIsin = buy.isin;
          }
        }
      }

      const sellPos = portfolio.positions.find((p) => p.isin === sellIsin);
      if (!sellPos) return { error: `Position ${sellIsin} not found in portfolio` };

      const buyCio = portfolio.cioRecommendations.find((c) => c.isin === buyIsin);
      const totalValue = portfolio.positions.reduce((s, p) => s + p.currentValueCHF, 0);

      // Check if the sell position is conflicting
      const top20 = [...portfolio.positions]
        .sort((a, b) => b.currentValueCHF - a.currentValueCHF)
        .slice(0, 20)
        .map((p) => {
          const cio = portfolio.cioRecommendations.find((c) => c.isin === p.isin);
          return { ...p, cioRating: cio?.rating || null };
        });
      const conflicts = await detectConflicts(clientId, top20, dna, portfolio.cioRecommendations);
      const sellConflict = conflicts.find((c) => c.positionIsin === sellIsin);

      return {
        sell: {
          name: sellPos.name,
          isin: sellPos.isin,
          assetClass: sellPos.sectorOrAssetClass || "Other",
          valueCHF: sellPos.currentValueCHF,
          hasConflict: !!sellConflict,
          conflictSeverity: sellConflict?.severity || null,
          conflictReason: sellConflict?.reason || null,
        },
        buy: {
          name: buyCio?.name || buyIsin,
          isin: buyIsin,
          cioRating: buyCio?.rating || "unknown",
          valueCHF: sellPos.currentValueCHF,
        },
        impact: {
          portfolioValueChange: 0,
          allocationImpact: `Removes ${((sellPos.currentValueCHF / totalValue) * 100).toFixed(1)}% from ${sellPos.sectorOrAssetClass || "Other"}`,
          conflictResolved: !!sellConflict,
        },
      };
    }

    // ---- compare_advisory ----
    case "compare_advisory": {
      const lang = args.language || "en";
      const [personalised, generic] = await Promise.all([
        messageAgent.generateAdvisory(clientId, undefined, undefined, lang),
        messageAgent.generateGenericAdvisory(clientId),
      ]);
      return {
        generic: {
          subject: generic.subject,
          body: generic.body,
          tone: generic.tone,
          confidence: generic.confidence,
        },
        personalised: {
          subject: personalised.subject,
          body: personalised.body,
          tone: personalised.tone,
          confidence: personalised.confidence,
          toneInfluences: personalised.toneInfluences,
        },
      };
    }

    // ---- get_knowledge_graph ----
    case "get_knowledge_graph": {
      const digest = await newsAgent.getNewsDigest(clientId);
      const graph = knowledgeGraphService.buildClientGraph(clientId, dna, portfolio, digest);
      return {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        nodeTypes: {
          client: graph.nodes.filter((n) => n.type === "client").length,
          asset: graph.nodes.filter((n) => n.type === "asset").length,
          value: graph.nodes.filter((n) => n.type === "value").length,
          news: graph.nodes.filter((n) => n.type === "news").length,
          sector: graph.nodes.filter((n) => n.type === "sector").length,
          risk: graph.nodes.filter((n) => n.type === "risk").length,
        },
        values: graph.nodes.filter((n) => n.type === "value").map((n) => n.label),
        risks: graph.nodes.filter((n) => n.type === "risk").map((n) => n.label),
        topAssets: graph.nodes
          .filter((n) => n.type === "asset")
          .sort((a, b) => (b.properties.valueCHF || 0) - (a.properties.valueCHF || 0))
          .slice(0, 5)
          .map((n) => ({
            name: n.label,
            isin: n.properties.isin,
            valueCHF: n.properties.valueCHF,
          })),
        conflictEdges: graph.edges.filter((e) => e.type === "conflicts_with").length,
        alignmentEdges: graph.edges.filter((e) => e.type === "aligns_with").length,
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ---------------------------------------------------------------------------
// LLM helpers
// ---------------------------------------------------------------------------
function extractContent(msg: any): string {
  let content = msg?.content || msg?.reasoning_content || "I couldn't generate a response.";
  if (!msg?.content && msg?.reasoning_content) {
    const blocks = content.split("\n\n").filter((b: string) => b.trim());
    if (blocks.length > 1) content = blocks[blocks.length - 1].trim();
  }
  return content;
}

async function callLLM(
  messages: any[],
  includeTools: boolean,
): Promise<any> {
  const body: any = {
    model: LLM_MODEL(),
    messages,
    temperature: 0.3,
    max_tokens: includeTools ? 1500 : 2000,
  };
  if (includeTools) {
    body.tools = TOOLS;
    body.tool_choice = "auto";
  }
  const resp = await axios.post(LLM_URL(), body, {
    headers: {
      Authorization: `Bearer ${LLM_KEY()}`,
      "Content-Type": "application/json",
    },
    timeout: 90000,
  });
  return resp.data?.choices?.[0]?.message;
}

// ---------------------------------------------------------------------------
// Main chat function
// ---------------------------------------------------------------------------
export async function chat(clientId: string, userMessage: string): Promise<ChatMessage> {
  const client = getClient(clientId);
  const dna = await extractDNA(clientId, client?.crmEntries || [], false);
  const portfolio = client ? getPortfolio(client.strategy) : undefined;

  const history = chatHistories.get(clientId) || [];
  history.push({ role: "user", content: userMessage, timestamp: new Date().toISOString() });

  const topHoldings =
    portfolio?.positions
      .sort((a, b) => b.currentValueCHF - a.currentValueCHF)
      .slice(0, 10)
      .map((p) => `${p.name} (${p.isin}, CHF ${(p.currentValueCHF / 1000).toFixed(0)}K)`)
      .join(", ") || "none";

  const systemPrompt = `You are an AI assistant for a Relationship Manager in wealth management.
Client: ${client?.name || clientId}
Portfolio mandate: ${client?.strategy || "unknown"}
DNA source: ${dna.profileSource}
Investment profile: Objectives: ${dna.investmentProfile.objectives.join(", ")}. Hard constraints: ${dna.investmentProfile.hardConstraints.join(", ")}. Exclusions: ${dna.investmentProfile.exclusions.join(", ")}. Positive screens: ${dna.investmentProfile.positiveScreens.join(", ")}.
Communication profile: Style: ${dna.communicationProfile.style}. Rationale: ${dna.communicationProfile.rationale}
DNA: Values: ${dna.values.join(", ")}. Sensitivities: ${dna.riskSensitivities.join(", ")}.
Top holdings: ${topHoldings}

You have access to tools that can fetch live data. USE THEM proactively when the RM's question involves data you can look up:
- Portfolio conflicts or DNA alignment → lookup_conflicts
- News, alerts, market events → get_news_alerts
- Drafting client messages → draft_advisory
- Current prices or market data → get_live_price
- Portfolio allocation drift → get_portfolio_drift
- Transaction history → get_transactions
- Finding instruments → search_instrument
- Explaining a DNA trait with evidence → explain_trait
- "What if" swap scenarios → simulate_swap
- Comparing personalized vs generic advisory → compare_advisory
- Knowledge graph / relationships → get_knowledge_graph

Help the RM with questions about this client. Be concise and professional. Never advise the client directly.
Give a concise, direct answer. Do not show your reasoning process.`;

  const ctx: ToolContext = { clientId, client, dna, portfolio };
  const toolCalls: ToolCallResult[] = [];

  try {
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    ];

    // Call LLM with tools
    let msg: any = await callLLM(messages, true);

    // Handle tool calls if the model made any
    if (msg?.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: msg.content || null,
        tool_calls: msg.tool_calls,
      });

      for (const tc of msg.tool_calls) {
        const fnName = tc.function?.name;
        let fnArgs: Record<string, any> = {};
        try {
          fnArgs = JSON.parse(tc.function?.arguments || "{}");
        } catch {}

        console.log(`[ChatAgent] Tool call: ${fnName}(${JSON.stringify(fnArgs)})`);
        let result: any;
        try {
          result = await executeTool(fnName, fnArgs, ctx);
        } catch (err) {
          result = { error: (err as Error).message };
        }
        toolCalls.push({ name: fnName, result });

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      // Get final response incorporating tool results
      msg = await callLLM(messages, false);
    }

    const content = extractContent(msg);
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content,
      timestamp: new Date().toISOString(),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
    history.push(assistantMsg);
    chatHistories.set(clientId, history.slice(-20));
    return assistantMsg;
  } catch (err) {
    console.warn(`[ChatAgent] Error for ${clientId}: ${(err as Error).message}`);
    const errorMsg: ChatMessage = {
      role: "assistant",
      content: "Sorry, I'm unable to respond right now. Please try again.",
      timestamp: new Date().toISOString(),
    };
    history.push(errorMsg);
    chatHistories.set(clientId, history);
    return errorMsg;
  }
}

export function getChatHistory(clientId: string): ChatMessage[] {
  return chatHistories.get(clientId) || [];
}

export function clearChatHistory(clientId: string): void {
  chatHistories.delete(clientId);
}
