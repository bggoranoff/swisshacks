import axios from "axios";
import { Position, CIORecommendation } from "../types/data";
import { ClientDNA } from "../types/dna";
import { auditService } from "../services/audit.service";
import { explainabilityService } from "../services/explainability.service";

export interface DetectedConflict {
  positionIsin: string;
  positionName: string;
  severity: "high" | "medium" | "low";
  reason: string;
  riskType: "financial" | "reputational" | "values";
  reasoningChain: string[];
  suggestedSwap?: {
    isin: string;
    name: string;
    reason: string;
    cioRating: string;
  };
}

const conflictCache = new Map<string, { conflicts: DetectedConflict[]; fetchedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function parseJson(content: string): any {
  try { return JSON.parse(content); } catch {}
  const stripped = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(stripped); } catch {}
  const match = content.match(/\[[\s\S]*\]/);
  if (match) try { return JSON.parse(match[0]); } catch {}
  return null;
}

export async function detectConflicts(
  clientId: string,
  positions: (Position & { cioRating?: string | null })[],
  dna: ClientDNA,
  cioRecommendations: CIORecommendation[]
): Promise<DetectedConflict[]> {
  const cached = conflictCache.get(clientId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.conflicts;

  const startTime = Date.now();
  const conflicts: DetectedConflict[] = [];
  const batchSize = 10;

  for (let i = 0; i < positions.length; i += batchSize) {
    const batch = positions.slice(i, i + batchSize);
    try {
      const prompt = `Given this client's investment identity:
Values: ${dna.values.join(", ")}
Risk sensitivities: ${dna.riskSensitivities.join(", ")}
Personal priorities: ${(dna.personalPriorities || []).join(", ")}

Analyze these portfolio holdings for conflicts with the client's DNA:
${batch.map((p, j) => `[${j}] ${p.name} (${p.sectorOrAssetClass || "unknown"}, CHF ${Math.round(p.currentValueCHF)})`).join("\n")}

For EACH holding, determine if it conflicts with ANY of the client's values, sensitivities, or priorities. Be selective — only flag genuine conflicts, not vague associations.
Return ONLY a JSON array: [{"index":0,"conflicts":false,"severity":"none","reason":"","riskType":"values"}]
Every holding MUST appear in the output. Set conflicts=false and severity="none" for non-conflicting holdings.`;

      const response = await axios.post(
        `${process.env.PHOENIQS_API_URL || "https://maas.phoeniqs.com/v1"}/chat/completions`,
        {
          model: process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b",
          messages: [
            { role: "system", content: "You are a wealth management compliance analyst. Identify holdings that conflict with a client's personal investment identity. Return ONLY valid JSON. No markdown fences." },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 2000,
        },
        {
          headers: { Authorization: `Bearer ${process.env.PHOENIQS_API_KEY}`, "Content-Type": "application/json" },
          timeout: 30000,
        }
      );

      const msg = response.data?.choices?.[0]?.message;
      const content = msg?.content || msg?.reasoning_content || "";
      const parsed = parseJson(content);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.conflicts && item.severity !== "none" && item.index >= 0 && item.index < batch.length) {
            const pos = batch[item.index];
            const conflict: DetectedConflict = {
              positionIsin: pos.isin,
              positionName: pos.name,
              severity: item.severity || "medium",
              reason: item.reason || "Potential conflict detected",
              riskType: item.riskType || "values",
              reasoningChain: [
                `Client values: ${dna.values.slice(0, 3).join(", ")}`,
                `Risk sensitivities: ${dna.riskSensitivities.slice(0, 3).join(", ")}`,
                `Holding: ${pos.name} in ${pos.sectorOrAssetClass || "unknown"} sector`,
                item.reason,
              ],
            };

            // Find a BUY-rated swap in the same asset class
            if (item.severity === "high" || item.severity === "medium") {
              const positionIsins = new Set(positions.map(p => p.isin));
              const swap = cioRecommendations.find(
                c => c.rating === "BUY" &&
                     !positionIsins.has(c.isin) &&
                     c.isin !== pos.isin
              );
              if (swap) {
                conflict.suggestedSwap = {
                  isin: swap.isin,
                  name: swap.name,
                  reason: `BUY-rated by CIO, replaces conflicting ${pos.name}`,
                  cioRating: swap.rating,
                };
              }
            }

            conflicts.push(conflict);
          }
        }
      }
    } catch (err) {
      console.warn(`[ConflictAgent] Batch ${i / batchSize + 1} failed: ${(err as Error).message}`);
    }
  }

  conflictCache.set(clientId, { conflicts, fetchedAt: Date.now() });

  auditService.log({
    agent: "conflict-agent",
    action: "detect-conflicts",
    clientId,
    inputSummary: `${positions.length} positions, DNA with ${dna.values.length} values`,
    outputSummary: `${conflicts.length} conflicts detected (${conflicts.filter(c => c.severity === "high").length} high)`,
    durationMs: Date.now() - startTime,
  });

  explainabilityService.record({
    agent: "conflict-agent",
    decisionType: "conflict-detection",
    input: { summary: `${positions.length} positions for ${clientId}` },
    output: {
      summary: `${conflicts.length} conflicts found`,
      details: { conflicts: conflicts.map(c => ({ isin: c.positionIsin, name: c.positionName, severity: c.severity })) },
    },
    reasoning: {
      steps: [
        `Analyzed ${positions.length} holdings against client DNA`,
        `Client has ${dna.values.length} values and ${dna.riskSensitivities.length} risk sensitivities`,
        `Found ${conflicts.length} conflicts: ${conflicts.filter(c => c.severity === "high").length} high, ${conflicts.filter(c => c.severity === "medium").length} medium, ${conflicts.filter(c => c.severity === "low").length} low`,
        ...conflicts.slice(0, 3).map(c => `${c.positionName}: ${c.reason}`),
      ],
      confidence: conflicts.length > 0 ? 0.75 : 0.5,
    },
    dataSources: [
      { name: "Client DNA", type: "crm", reference: clientId },
      { name: "Portfolio Holdings", type: "six", reference: `${positions.length} positions` },
      { name: "Phoeniqs LLM", type: "llm", reference: process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b" },
    ],
  });

  return conflicts;
}
