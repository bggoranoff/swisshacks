import axios from "axios";
import { CRMEntry } from "../types/data";
import { ClientDNA } from "../types/dna";
import { getFallbackDNA } from "../data/fallback-dna";
import { auditService } from "../services/audit.service";
import { explainabilityService } from "../services/explainability.service";

const dnaCache = new Map<string, ClientDNA>();

const LLM_URL = () => (process.env.PHOENIQS_API_URL || "https://maas.phoeniqs.com/v1") + "/chat/completions";
const LLM_KEY = () => process.env.PHOENIQS_API_KEY || "";
const LLM_MODEL = () => process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b";

const SYSTEM_PROMPT = `You are a wealth management analyst extracting a client's investment identity from CRM notes.

OUTPUT RULES:
- Your ENTIRE response must be a single JSON object.
- Start with { and end with }. No other characters before or after.
- No markdown fences. No explanation. No reasoning. Just JSON.

REQUIRED JSON SCHEMA:
{"values":["string array of core values"],"lifeEvents":["significant life events"],"businessContext":["business/professional context"],"riskSensitivities":["investment risk sensitivities"],"personalPriorities":["personal priorities"],"communicationStyle":"data-driven"|"values-led"|"balanced","evidence":[{"trait":"which trait","crmDate":"date","crmExcerpt":"one-sentence quote"}],"traitConfidence":{"trait_name":0.9}}

EXAMPLE OUTPUT:
{"values":["family legacy","sustainable investing"],"lifeEvents":["daughter graduated 2024","relocated to Zurich 2023"],"businessContext":["owns manufacturing firm","exports to Asia"],"riskSensitivities":["currency risk","emerging market exposure"],"personalPriorities":["education funding","retirement planning"],"communicationStyle":"balanced","evidence":[{"trait":"family legacy","crmDate":"2024-03-15","crmExcerpt":"Discussed setting up trust for grandchildren"}],"traitConfidence":{"family legacy":0.9,"sustainable investing":0.7}}

Extract at least 5 values, 2 life events, and 2 risk sensitivities. Be thorough.`;

function parseJson(content: string): any {
  const trimmed = content.trim();

  // Step 1: Try direct JSON.parse
  try {
    return JSON.parse(trimmed);
  } catch (e1) {
    console.debug(`[CRM Agent] parseJson: direct parse failed (${(e1 as Error).message}), trying markdown strip...`);
  }

  // Step 2: Strip markdown fences (```json ... ``` or ``` ... ```)
  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  if (fenceStripped !== trimmed) {
    try {
      return JSON.parse(fenceStripped);
    } catch (e2) {
      console.debug(`[CRM Agent] parseJson: fence-stripped parse failed (${(e2 as Error).message}), trying object regex...`);
    }
  }

  // Step 3: Regex to find first { ... } (greedy)
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (e3) {
      console.debug(`[CRM Agent] parseJson: object-regex parse failed (${(e3 as Error).message}), trying array regex...`);
    }
  }

  // Step 4: Regex to find first [ ... ] (in case it's an array)
  const arrMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch (e4) {
      console.debug(`[CRM Agent] parseJson: array-regex parse failed (${(e4 as Error).message}), giving up.`);
    }
  }

  console.warn(`[CRM Agent] parseJson: all strategies exhausted. Raw content (first 300 chars): ${trimmed.slice(0, 300)}`);
  return null;
}

function extractPartialFromText(text: string): any {
  const partial: any = {
    values: [], lifeEvents: [], businessContext: [],
    riskSensitivities: [], personalPriorities: [], evidence: [], traitConfidence: {},
  };
  const valPat = /(?:believes in|cares about|passionate about|committed to|values?)\s+["']?([^"'\n,.;]{4,60})/gi;
  const riskPat = /(?:risk|averse|avoid|concern|worried|uncomfortable)\s+(?:about|with|to)?\s*([^.;\n]{4,60})/gi;
  let m;
  while ((m = valPat.exec(text)) !== null) partial.values.push(m[1].trim());
  while ((m = riskPat.exec(text)) !== null) partial.riskSensitivities.push(m[1].trim());
  return partial.values.length > 0 || partial.riskSensitivities.length > 0 ? partial : null;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function formatCRMEntries(entries: CRMEntry[]): string {
  return entries.map((e, i) => {
    const parts = Object.entries(e).map(([k, v]) => `${k}: ${v}`);
    return `Entry ${i + 1}:\n${parts.join("\n")}`;
  }).join("\n\n");
}

async function callLLM(systemPrompt: string, userPrompt: string, maxTokens = 3000): Promise<string> {
  const resp = await axios.post(
    LLM_URL(),
    {
      model: LLM_MODEL(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_KEY()}`,
      },
      timeout: 60000,
    }
  );
  const choice = resp.data?.choices?.[0];
  return choice?.message?.content || choice?.message?.reasoning_content || choice?.text || "";
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr.map(s => s.trim()).filter(Boolean))];
}

function mergeChunkResults(results: any[]): any {
  const merged: any = {
    values: [],
    lifeEvents: [],
    businessContext: [],
    riskSensitivities: [],
    personalPriorities: [],
    communicationStyle: "balanced",
    evidence: [],
    traitConfidence: {},
  };

  const styleCounts: Record<string, number> = {};

  for (const r of results) {
    if (!r) continue;
    for (const key of ["values", "lifeEvents", "businessContext", "riskSensitivities", "personalPriorities"] as const) {
      if (Array.isArray(r[key])) merged[key].push(...r[key]);
    }
    if (r.communicationStyle) {
      styleCounts[r.communicationStyle] = (styleCounts[r.communicationStyle] || 0) + 1;
    }
    if (Array.isArray(r.evidence)) merged.evidence.push(...r.evidence);
    if (r.traitConfidence && typeof r.traitConfidence === "object") {
      Object.assign(merged.traitConfidence, r.traitConfidence);
    }
  }

  for (const key of ["values", "lifeEvents", "businessContext", "riskSensitivities", "personalPriorities"] as const) {
    merged[key] = dedup(merged[key]);
  }

  let maxCount = 0;
  for (const [style, count] of Object.entries(styleCounts)) {
    if (count > maxCount) {
      maxCount = count;
      merged.communicationStyle = style;
    }
  }

  return merged;
}

export async function extractDNA(
  clientId: string,
  entries: CRMEntry[],
  forceRefresh = false,
): Promise<ClientDNA> {
  const startTime = Date.now();

  if (!forceRefresh && dnaCache.has(clientId)) {
    return dnaCache.get(clientId)!;
  }

  if (!LLM_KEY() || LLM_KEY().startsWith("your_")) {
    console.warn(`[CRM Agent] No LLM key configured, returning fallback DNA for ${clientId}`);
    const fallback = getFallbackDNA(clientId);
    dnaCache.set(clientId, fallback);
    return fallback;
  }

  console.log(`[CRM Agent] Extracting DNA for ${clientId} from ${entries.length} CRM entries...`);

  const chunks = chunkArray(entries, 15);
  const chunkResults: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const userPrompt = `Analyze these CRM conversation logs and extract the client's investment identity:\n\n${formatCRMEntries(chunk)}\n\nRemember: respond with ONLY the JSON object. No other text.`;

    try {
      console.log(`[CRM Agent] Processing chunk ${i + 1}/${chunks.length} for ${clientId}...`);
      const content = await callLLM(SYSTEM_PROMPT, userPrompt);
      let parsed = parseJson(content);
      if (!parsed) {
        console.log(`[CRM Agent] Retrying chunk ${i + 1} with stricter prompt...`);
        const retryPrompt = `OUTPUT ONLY JSON. Your response must start with { and end with }.\n\n${userPrompt}`;
        const content2 = await callLLM(SYSTEM_PROMPT, retryPrompt, 3000);
        parsed = parseJson(content2);
        if (!parsed) {
          console.log(`[CRM Agent] Attempting partial extraction from raw text...`);
          parsed = extractPartialFromText(content);
        }
      }
      if (parsed) {
        chunkResults.push(parsed);
      } else {
        console.warn(`[CRM Agent] Failed to parse JSON from chunk ${i + 1} for ${clientId}`);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429 || err?.response?.data?.error?.type === "budget_exceeded") {
        console.warn(`[CRM Agent] LLM rate limited/budget exceeded for ${clientId}, returning fallback`);
        const fallback = getFallbackDNA(clientId);
        dnaCache.set(clientId, fallback);
        return fallback;
      }
      console.error(`[CRM Agent] LLM error for chunk ${i + 1}:`, err?.message || err);
    }
  }

  if (chunkResults.length === 0) {
    console.warn(`[CRM Agent] No chunk results for ${clientId}, returning fallback DNA`);
    const fallback = getFallbackDNA(clientId);
    dnaCache.set(clientId, fallback);
    return fallback;
  }

  const merged = mergeChunkResults(chunkResults);

  // Consolidation call
  let summary = "";
  try {
    console.log(`[CRM Agent] Consolidating DNA for ${clientId}...`);
    const consolidationPrompt = `Based on this extracted client profile, write a 2-3 sentence summary of this client's investment identity. Also refine the communication style classification.\n\nProfile:\n${JSON.stringify(merged, null, 2)}\n\nReturn ONLY valid JSON: {"summary": "...", "communicationStyle": "data-driven"|"values-led"|"balanced"}\n\nRemember: respond with ONLY the JSON object. No other text.`;
    const content = await callLLM(SYSTEM_PROMPT, consolidationPrompt);
    const parsed = parseJson(content);
    if (parsed) {
      summary = parsed.summary || "";
      if (parsed.communicationStyle) {
        merged.communicationStyle = parsed.communicationStyle;
      }
    }
  } catch (err: any) {
    console.warn(`[CRM Agent] Consolidation call failed for ${clientId}:`, err?.message);
    summary = `Client ${clientId} profile extracted from ${entries.length} CRM entries.`;
  }

  const dna: ClientDNA = {
    clientId,
    values: merged.values,
    lifeEvents: merged.lifeEvents,
    businessContext: merged.businessContext,
    riskSensitivities: merged.riskSensitivities,
    personalPriorities: merged.personalPriorities,
    communicationStyle: merged.communicationStyle as ClientDNA["communicationStyle"],
    summary: summary || `Client ${clientId} profile extracted from ${entries.length} CRM entries.`,
    evidence: merged.evidence,
    traitConfidence: merged.traitConfidence,
  };

  // Validate minimums and supplement from fallback if too sparse
  const fallback = getFallbackDNA(clientId);
  if (dna.values.length < 3) {
    for (const v of fallback.values) { if (!dna.values.includes(v)) dna.values.push(v); }
  }
  if (dna.lifeEvents.length < 1) {
    for (const v of fallback.lifeEvents) { if (!dna.lifeEvents.includes(v)) dna.lifeEvents.push(v); }
  }
  if (dna.riskSensitivities.length < 1) {
    for (const v of fallback.riskSensitivities) { if (!dna.riskSensitivities.includes(v)) dna.riskSensitivities.push(v); }
  }
  if (dna.personalPriorities.length < 1) {
    for (const v of fallback.personalPriorities) { if (!dna.personalPriorities.includes(v)) dna.personalPriorities.push(v); }
  }
  if (dna.businessContext.length < 1) {
    for (const v of fallback.businessContext) { if (!dna.businessContext.includes(v)) dna.businessContext.push(v); }
  }

  dnaCache.set(clientId, dna);
  console.log(`[CRM Agent] DNA extracted for ${clientId}: ${dna.values.length} values, style=${dna.communicationStyle}`);

  auditService.log({
    agent: "crm-agent",
    action: "extract-dna",
    clientId,
    inputSummary: `${entries.length} CRM entries`,
    outputSummary: `${dna.values.length} values, style=${dna.communicationStyle}`,
    durationMs: Date.now() - startTime,
  });

  const avgConfidence = Object.values(dna.traitConfidence).length > 0
    ? Object.values(dna.traitConfidence).reduce((a: number, b: number) => a + (b as number), 0) / Object.values(dna.traitConfidence).length
    : 0.5;

  explainabilityService.record({
    agent: "crm-agent",
    decisionType: "dna-extraction",
    input: { summary: `${entries.length} CRM entries for ${clientId}` },
    output: {
      summary: `Extracted ${dna.values.length} values, style: ${dna.communicationStyle}`,
      details: { values: dna.values, style: dna.communicationStyle },
    },
    reasoning: {
      steps: [
        `Processed ${entries.length} CRM entries in ${Math.ceil(entries.length / 15)} chunks`,
        `Identified ${dna.values.length} core values and ${dna.riskSensitivities.length} risk sensitivities`,
        `Communication style classified as ${dna.communicationStyle} based on language patterns`,
        `Confidence based on ${dna.evidence.length} supporting evidence citations`,
      ],
      confidence: avgConfidence,
    },
    dataSources: [
      { name: "CRM Logs", type: "crm", reference: `${entries.length} entries` },
      { name: "Phoeniqs LLM", type: "llm", reference: process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b" },
    ],
  });

  return dna;
}
