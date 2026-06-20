import axios from "axios";
import { CRMEntry } from "../types/data";
import {
  ClientDNA,
  CommunicationProfile,
  CommunicationStyle,
  DNAEvidence,
  InvestmentProfile,
  ProfileSource,
  RiskTolerance,
  SensitivityLevel,
} from "../types/dna";
import { getDemoDNAProfile } from "../data/demo-profiles";
import { demoModeEnabled } from "../config/demo";
import { auditService } from "../services/audit.service";
import { explainabilityService } from "../services/explainability.service";

const dnaCache = new Map<string, ClientDNA>();
const inFlightExtractions = new Map<string, Promise<ClientDNA>>();

const LLM_URL = () => (process.env.PHOENIQS_API_URL || "https://maas.phoeniqs.com/v1") + "/chat/completions";
const LLM_KEY = () => process.env.PHOENIQS_API_KEY || "";
const LLM_MODEL = () => process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b";

const SYSTEM_PROMPT = `You are a wealth management analyst extracting an evidence-backed client profile from CRM notes.

Separate these concepts:
- Investment preferences: what the client wants the portfolio to optimize, avoid, or monitor.
- Communication preference: how the relationship manager should explain recommendations after the investment analysis is done.

OUTPUT RULES:
- Your ENTIRE response must be a single JSON object.
- Start with { and end with }. No markdown fences. No explanation.
- Only infer traits that are supported by CRM evidence.

REQUIRED JSON SCHEMA:
{
  "values":["core values"],
  "lifeEvents":["significant life or business events"],
  "businessContext":["professional or wealth context"],
  "riskSensitivities":["risk concerns or sensitivities"],
  "personalPriorities":["personal priorities"],
  "communicationStyle":"data-driven"|"values-led"|"balanced",
  "communicationProfile":{
    "style":"data-driven"|"values-led"|"balanced",
    "rationale":"why this communication style fits",
    "confidence":0.8,
    "evidence":[{"trait":"communication preference","crmDate":"date","crmExcerpt":"short CRM excerpt"}]
  },
  "investmentProfile":{
    "objectives":["investment objectives"],
    "riskTolerance":"low"|"medium"|"high"|"unknown",
    "hardConstraints":["must avoid or must do constraints"],
    "softPreferences":["preferences that influence ranking"],
    "exclusions":["sectors, themes, behaviors, or exposures to avoid"],
    "positiveScreens":["themes, behaviors, or exposures to seek"],
    "valueThemes":["ethical, mission, family, impact, or reputation themes"],
    "liquidityNeeds":["cash-flow or liquidity needs"],
    "reputationSensitivity":"low"|"medium"|"high"|"unknown",
    "temporalChanges":["major changes in preference over time"],
    "evidence":[{"trait":"investment preference","crmDate":"date","crmExcerpt":"short CRM excerpt"}]
  },
  "evidence":[{"trait":"which trait","crmDate":"date","crmExcerpt":"short CRM excerpt"}],
  "traitConfidence":{"trait_name":0.9}
}`;

type PartialDNAResult = Partial<ClientDNA> & {
  communicationProfile?: Partial<CommunicationProfile>;
  investmentProfile?: Partial<InvestmentProfile>;
};

const ARRAY_FIELDS = ["values", "lifeEvents", "businessContext", "riskSensitivities", "personalPriorities"] as const;
const INVESTMENT_ARRAY_FIELDS = [
  "objectives",
  "hardConstraints",
  "softPreferences",
  "exclusions",
  "positiveScreens",
  "valueThemes",
  "liquidityNeeds",
  "temporalChanges",
] as const;

function parseJson(content: string): any {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e1) {
    console.debug(`[CRM Agent] parseJson: direct parse failed (${(e1 as Error).message}), trying markdown strip...`);
  }

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

  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (e3) {
      console.debug(`[CRM Agent] parseJson: object-regex parse failed (${(e3 as Error).message}), trying array regex...`);
    }
  }

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

function normalizeStyle(style: unknown): CommunicationStyle {
  return style === "data-driven" || style === "values-led" || style === "balanced"
    ? style
    : "balanced";
}

function normalizeRiskTolerance(value: unknown): RiskTolerance {
  return value === "low" || value === "medium" || value === "high" || value === "unknown"
    ? value
    : "unknown";
}

function normalizeSensitivity(value: unknown): SensitivityLevel {
  return value === "low" || value === "medium" || value === "high" || value === "unknown"
    ? value
    : "unknown";
}

function clampConfidence(value: unknown, fallback = 0.5): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr.map(s => String(s).trim()).filter(Boolean))];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? dedup(value.map(v => String(v))) : [];
}

function asEvidenceArray(value: unknown): DNAEvidence[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): DNAEvidence | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        trait: String(record.trait || "").trim(),
        crmDate: String(record.crmDate || "").trim(),
        crmExcerpt: String(record.crmExcerpt || "").trim(),
      };
    })
    .filter((item): item is DNAEvidence => Boolean(item?.trait && item.crmExcerpt));
}

function createInvestmentProfile(partial?: Partial<InvestmentProfile>): InvestmentProfile {
  return {
    objectives: asStringArray(partial?.objectives),
    riskTolerance: normalizeRiskTolerance(partial?.riskTolerance),
    hardConstraints: asStringArray(partial?.hardConstraints),
    softPreferences: asStringArray(partial?.softPreferences),
    exclusions: asStringArray(partial?.exclusions),
    positiveScreens: asStringArray(partial?.positiveScreens),
    valueThemes: asStringArray(partial?.valueThemes),
    liquidityNeeds: asStringArray(partial?.liquidityNeeds),
    reputationSensitivity: normalizeSensitivity(partial?.reputationSensitivity),
    temporalChanges: asStringArray(partial?.temporalChanges),
    evidence: asEvidenceArray(partial?.evidence),
  };
}

function createCommunicationProfile(
  style: CommunicationStyle,
  partial?: Partial<CommunicationProfile>
): CommunicationProfile {
  return {
    style,
    rationale: String(partial?.rationale || `CRM evidence indicates a ${style} communication preference.`),
    evidence: asEvidenceArray(partial?.evidence),
    confidence: clampConfidence(partial?.confidence),
  };
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

async function callLLM(systemPrompt: string, userPrompt: string, maxTokens = 3500): Promise<string> {
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

function crmDate(entry: CRMEntry): string {
  return entry.Date || entry.date || entry.DATE || "CRM";
}

function crmNote(entry: CRMEntry): string {
  return entry.Note || entry.note || Object.values(entry).join(" ");
}

function makeEvidence(trait: string, entry: CRMEntry): DNAEvidence {
  const note = crmNote(entry).replace(/\s+/g, " ").trim();
  return {
    trait,
    crmDate: crmDate(entry),
    crmExcerpt: note.slice(0, 220),
  };
}

function collectSignals(entries: CRMEntry[]) {
  const values: string[] = [];
  const lifeEvents: string[] = [];
  const businessContext: string[] = [];
  const riskSensitivities: string[] = [];
  const personalPriorities: string[] = [];
  const investmentProfile = createInvestmentProfile();
  const evidence: DNAEvidence[] = [];
  const traitConfidence: Record<string, number> = {};

  const add = (field: string[], trait: string, entry: CRMEntry, confidence = 0.65) => {
    if (!field.includes(trait)) field.push(trait);
    if (!traitConfidence[trait]) traitConfidence[trait] = confidence;
    if (!evidence.some(e => e.trait === trait)) evidence.push(makeEvidence(trait, entry));
  };

  const addInvestment = (field: keyof Pick<InvestmentProfile, typeof INVESTMENT_ARRAY_FIELDS[number]>, trait: string, entry: CRMEntry) => {
    const target = investmentProfile[field] as string[];
    if (!target.includes(trait)) target.push(trait);
    if (!investmentProfile.evidence.some(e => e.trait === trait)) {
      investmentProfile.evidence.push(makeEvidence(trait, entry));
    }
  };

  let analyticsScore = 0;
  let valuesScore = 0;

  for (const entry of entries) {
    const text = crmNote(entry);
    const lower = text.toLowerCase();

    if (/(analytical|data-driven|metrics|stress[- ]?test|cost-of-capital|correlation|scenario|rigorous|report|audit|numbers|percentage|sharpe)/i.test(text)) {
      analyticsScore += 1;
    }
    if (/(values|mission|philanthrop|ecolog|reforest|biodiversity|reputation|integrity|labor|labour|parkinson|disease|research|governance)/i.test(text)) {
      valuesScore += 1;
    }

    if (/capital preservation|sleep at night|steady cash flow|predictable payouts/i.test(text)) {
      add(values, "capital preservation", entry, 0.75);
      add(riskSensitivities, "drawdown and volatility sensitivity", entry, 0.75);
      add(personalPriorities, "steady cash flow", entry, 0.7);
      addInvestment("objectives", "capital preservation", entry);
      addInvestment("objectives", "steady cash flow", entry);
      investmentProfile.riskTolerance = "low";
    }

    if (/reforest|ecosystem|biodiversity|deforestation|palm oil|greenwashing|ecological|sustainable agriculture/i.test(text)) {
      add(values, "environmental sustainability", entry, 0.75);
      add(personalPriorities, "measurable environmental impact", entry, 0.7);
      addInvestment("objectives", "align capital with environmental impact", entry);
      addInvestment("hardConstraints", "avoid companies tied to ecosystem destruction", entry);
      addInvestment("valueThemes", "environmental sustainability", entry);
      addInvestment("positiveScreens", "measurable ecological impact", entry);
      addInvestment("exclusions", "deforestation-linked exposure", entry);
    }

    if (/\breputation\b|\bbrand\b|public scrutiny|\bpress\b|\bgovernance\b|sweatshop|wage theft|\blabor\b|\blabour\b|\bexploitation\b/i.test(text)) {
      add(values, "reputation and governance", entry, 0.75);
      add(riskSensitivities, "reputational risk", entry, 0.8);
      addInvestment("hardConstraints", "avoid severe labor or governance controversies", entry);
      addInvestment("valueThemes", "corporate reputation", entry);
      addInvestment("exclusions", "labor exploitation scandals", entry);
      investmentProfile.reputationSensitivity = "high";
    }

    if (/parkinson|neurodegenerative|chloe|clinical pipeline|medical research|disease/i.test(text)) {
      add(values, "medical research mission", entry, 0.75);
      add(personalPriorities, "healthcare research alignment", entry, 0.7);
      addInvestment("objectives", "align healthcare exposure with medical research mission", entry);
      addInvestment("valueThemes", "medical research and family mission", entry);
      addInvestment("positiveScreens", "healthcare research commitment", entry);
      if (/abandons|defunds|betrayal|shutdown|discontinue/i.test(text)) {
        addInvestment("hardConstraints", "flag holdings that abandon relevant medical research", entry);
      }
    }

    if (/speculative|high[- ]?beta|drawdown|us tech|silicon valley|ai stocks|growth equities|high[- ]?volatility|volatile growth|volatility[^.]{0,60}growth|growth[^.]{0,60}volatility/i.test(text)) {
      add(riskSensitivities, "speculative growth exposure", entry, 0.7);
      addInvestment("exclusions", "speculative high-volatility growth exposure", entry);
    }

    if (/foundation|grant|endowment|coupon|dividend|cash flow|liquidity/i.test(text)) {
      add(personalPriorities, "foundation or cash-flow funding", entry, 0.65);
      addInvestment("liquidityNeeds", "foundation, grant, coupon, or dividend funding", entry);
    }

    if (/owner|ceo|founder|entrepreneur|retail brand|engineering firm|automotive|agriculture exit|corporate enterprise/i.test(lower)) {
      add(businessContext, "entrepreneurial or business-owner context", entry, 0.65);
    }

    if (/diagnosed|diagnosis|handover|retirement|strategy realigned|established a dedicated|reassigned|new rm/i.test(text)) {
      add(lifeEvents, text.slice(0, 120).replace(/\s+/g, " "), entry, 0.6);
      addInvestment("temporalChanges", text.slice(0, 140).replace(/\s+/g, " "), entry);
    }
  }

  let style: CommunicationStyle = "balanced";
  if (analyticsScore > valuesScore + 1) style = "data-driven";
  if (valuesScore > analyticsScore + 1) style = "values-led";

  return {
    values: dedup(values),
    lifeEvents: dedup(lifeEvents),
    businessContext: dedup(businessContext),
    riskSensitivities: dedup(riskSensitivities),
    personalPriorities: dedup(personalPriorities),
    communicationStyle: style,
    communicationProfile: createCommunicationProfile(style, {
      rationale: `CRM language contains ${analyticsScore} analytical signals and ${valuesScore} values/context signals.`,
      confidence: Math.min(0.8, 0.45 + Math.abs(analyticsScore - valuesScore) * 0.08),
      evidence: evidence.slice(0, 3),
    }),
    investmentProfile,
    evidence: evidence.slice(0, 20),
    traitConfidence,
  };
}

function buildUnavailableDNA(clientId: string, entries: CRMEntry[], source: ProfileSource): ClientDNA {
  return {
    clientId,
    values: [],
    lifeEvents: [],
    businessContext: [],
    riskSensitivities: [],
    personalPriorities: [],
    communicationStyle: "balanced",
    communicationProfile: createCommunicationProfile("balanced", {
      rationale: "No reliable CRM-derived communication preference is available.",
      confidence: 0.1,
    }),
    investmentProfile: createInvestmentProfile(),
    profileSource: source,
    summary: entries.length > 0
      ? `No reliable profile could be inferred from ${entries.length} CRM entries.`
      : "No CRM entries were supplied, so no client profile was inferred.",
    evidence: [],
    traitConfidence: {},
  };
}

function buildHeuristicDNA(clientId: string, entries: CRMEntry[]): ClientDNA {
  if (entries.length === 0) {
    return buildUnavailableDNA(clientId, entries, "unavailable");
  }

  const signals = collectSignals(entries);
  const summaryParts = [
    signals.values.length ? `Values: ${signals.values.slice(0, 4).join(", ")}` : "",
    signals.riskSensitivities.length ? `Risk sensitivities: ${signals.riskSensitivities.slice(0, 4).join(", ")}` : "",
    signals.investmentProfile.hardConstraints.length ? `Hard constraints: ${signals.investmentProfile.hardConstraints.slice(0, 3).join(", ")}` : "",
  ].filter(Boolean);

  return {
    clientId,
    values: signals.values,
    lifeEvents: signals.lifeEvents,
    businessContext: signals.businessContext,
    riskSensitivities: signals.riskSensitivities,
    personalPriorities: signals.personalPriorities,
    communicationStyle: signals.communicationStyle,
    communicationProfile: signals.communicationProfile,
    investmentProfile: signals.investmentProfile,
    profileSource: "crm-heuristic",
    summary: summaryParts.length > 0
      ? `CRM-derived heuristic profile. ${summaryParts.join(". ")}.`
      : `CRM-derived heuristic profile from ${entries.length} entries. No strong preference signals were detected.`,
    evidence: signals.evidence,
    traitConfidence: signals.traitConfidence,
  };
}

function mergeChunkResults(results: PartialDNAResult[]): PartialDNAResult {
  const merged: PartialDNAResult = {
    values: [],
    lifeEvents: [],
    businessContext: [],
    riskSensitivities: [],
    personalPriorities: [],
    communicationStyle: "balanced",
    communicationProfile: createCommunicationProfile("balanced"),
    investmentProfile: createInvestmentProfile(),
    evidence: [],
    traitConfidence: {},
  };

  const styleCounts: Record<string, number> = {};
  const riskCounts: Record<string, number> = {};
  const reputationCounts: Record<string, number> = {};
  const communicationEvidence: DNAEvidence[] = [];
  const investmentEvidence: DNAEvidence[] = [];
  const rationales: string[] = [];
  const communicationConfidences: number[] = [];

  for (const result of results) {
    if (!result) continue;

    for (const key of ARRAY_FIELDS) {
      (merged[key] as string[]).push(...asStringArray(result[key]));
    }

    const style = normalizeStyle(result.communicationProfile?.style || result.communicationStyle);
    styleCounts[style] = (styleCounts[style] || 0) + 1;

    if (result.communicationProfile?.rationale) {
      rationales.push(String(result.communicationProfile.rationale));
    }
    communicationConfidences.push(clampConfidence(result.communicationProfile?.confidence));
    communicationEvidence.push(...asEvidenceArray(result.communicationProfile?.evidence));

    const investment = createInvestmentProfile(result.investmentProfile);
    for (const key of INVESTMENT_ARRAY_FIELDS) {
      (merged.investmentProfile![key] as string[]).push(...investment[key]);
    }
    riskCounts[investment.riskTolerance] = (riskCounts[investment.riskTolerance] || 0) + 1;
    reputationCounts[investment.reputationSensitivity] = (reputationCounts[investment.reputationSensitivity] || 0) + 1;
    investmentEvidence.push(...investment.evidence);

    merged.evidence!.push(...asEvidenceArray(result.evidence));
    if (result.traitConfidence && typeof result.traitConfidence === "object") {
      Object.assign(merged.traitConfidence!, result.traitConfidence);
    }
  }

  for (const key of ARRAY_FIELDS) {
    merged[key] = dedup(merged[key] as string[]) as any;
  }
  for (const key of INVESTMENT_ARRAY_FIELDS) {
    merged.investmentProfile![key] = dedup(merged.investmentProfile![key] as string[]) as any;
  }

  const chosenStyle = chooseMostCommon(styleCounts, "balanced") as CommunicationStyle;
  merged.communicationStyle = chosenStyle;
  merged.communicationProfile = createCommunicationProfile(chosenStyle, {
    rationale: rationales[0] || `Most CRM chunks indicated a ${chosenStyle} communication style.`,
    evidence: communicationEvidence,
    confidence: communicationConfidences.length > 0
      ? communicationConfidences.reduce((sum, value) => sum + value, 0) / communicationConfidences.length
      : 0.5,
  });

  merged.investmentProfile!.riskTolerance = normalizeRiskTolerance(chooseMostCommon(riskCounts, "unknown"));
  merged.investmentProfile!.reputationSensitivity = normalizeSensitivity(chooseMostCommon(reputationCounts, "unknown"));
  merged.investmentProfile!.evidence = investmentEvidence;
  merged.evidence = asEvidenceArray(merged.evidence);

  return merged;
}

function chooseMostCommon(counts: Record<string, number>, fallback: string): string {
  let chosen = fallback;
  let maxCount = 0;
  for (const [value, count] of Object.entries(counts)) {
    if (value === "unknown") continue;
    if (count > maxCount) {
      chosen = value;
      maxCount = count;
    }
  }
  return chosen;
}

function supplementFromHeuristic(dna: ClientDNA, heuristic: ClientDNA): ClientDNA {
  for (const key of ARRAY_FIELDS) {
    if (dna[key].length === 0) {
      dna[key] = heuristic[key] as any;
    }
  }
  for (const key of INVESTMENT_ARRAY_FIELDS) {
    if (dna.investmentProfile[key].length === 0) {
      dna.investmentProfile[key] = heuristic.investmentProfile[key] as any;
    }
  }
  if (dna.investmentProfile.riskTolerance === "unknown") {
    dna.investmentProfile.riskTolerance = heuristic.investmentProfile.riskTolerance;
  }
  if (dna.investmentProfile.reputationSensitivity === "unknown") {
    dna.investmentProfile.reputationSensitivity = heuristic.investmentProfile.reputationSensitivity;
  }
  if (dna.evidence.length === 0) dna.evidence = heuristic.evidence;
  if (dna.communicationProfile.evidence.length === 0) {
    dna.communicationProfile.evidence = heuristic.communicationProfile.evidence;
  }
  if (dna.communicationProfile.confidence < 0.2) {
    dna.communicationProfile = heuristic.communicationProfile;
    dna.communicationStyle = heuristic.communicationStyle;
  }
  return dna;
}

export function getCachedDNA(clientId: string): ClientDNA | null {
  return dnaCache.get(clientId) || null;
}

export async function extractDNA(
  clientId: string,
  entries: CRMEntry[],
  forceRefresh = false,
  pronouns = "they/them",
): Promise<ClientDNA> {
  if (!forceRefresh && dnaCache.has(clientId)) {
    return dnaCache.get(clientId)!;
  }

  if (!forceRefresh && inFlightExtractions.has(clientId)) {
    return inFlightExtractions.get(clientId)!;
  }

  const extraction = extractDNAUncached(clientId, entries, forceRefresh, pronouns)
    .finally(() => inFlightExtractions.delete(clientId));
  inFlightExtractions.set(clientId, extraction);
  return extraction;
}

async function extractDNAUncached(
  clientId: string,
  entries: CRMEntry[],
  forceRefresh: boolean,
  pronouns = "they/them",
): Promise<ClientDNA> {
  const startTime = Date.now();

  if (demoModeEnabled()) {
    const demoProfile = getDemoDNAProfile(clientId);
    if (demoProfile) {
      dnaCache.set(clientId, demoProfile);
      console.log(`[CRM Agent] Demo mode enabled, using demo profile for ${clientId}`);
      return demoProfile;
    }
  }

  if (entries.length === 0) {
    console.warn(`[CRM Agent] No CRM entries supplied for ${clientId}; not caching an inferred profile`);
    return buildUnavailableDNA(clientId, entries, "unavailable");
  }

  if (!LLM_KEY() || LLM_KEY().startsWith("your_")) {
    console.warn(`[CRM Agent] No LLM key configured, using CRM-derived heuristic profile for ${clientId}`);
    const heuristic = buildHeuristicDNA(clientId, entries);
    dnaCache.set(clientId, heuristic);
    return heuristic;
  }

  console.log(`[CRM Agent] Extracting DNA for ${clientId} from ${entries.length} CRM entries...`);

  const chunks = chunkArray(entries, 15);
  const chunkResults: PartialDNAResult[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const userPrompt = `Analyze these CRM conversation logs and extract the client's investment profile and communication preference.\n\nCLIENT PRONOUNS: ${pronouns} — use these pronouns consistently throughout ALL text fields in your response.\n\n${formatCRMEntries(chunk)}\n\nRemember: respond with ONLY the JSON object. No other text.`;

    try {
      console.log(`[CRM Agent] Processing chunk ${i + 1}/${chunks.length} for ${clientId}...`);
      const content = await callLLM(SYSTEM_PROMPT, userPrompt);
      let parsed = parseJson(content);
      if (!parsed) {
        console.log(`[CRM Agent] Retrying chunk ${i + 1} with stricter prompt...`);
        const retryPrompt = `OUTPUT ONLY JSON. Your response must start with { and end with }.\n\n${userPrompt}`;
        const content2 = await callLLM(SYSTEM_PROMPT, retryPrompt, 3500);
        parsed = parseJson(content2);
      }
      if (parsed) {
        chunkResults.push(parsed);
      } else {
        console.warn(`[CRM Agent] Failed to parse JSON from chunk ${i + 1} for ${clientId}`);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429 || err?.response?.data?.error?.type === "budget_exceeded") {
        console.warn(`[CRM Agent] LLM rate limited/budget exceeded for ${clientId}, using CRM-derived heuristic profile`);
        const heuristic = buildHeuristicDNA(clientId, entries);
        dnaCache.set(clientId, heuristic);
        return heuristic;
      }
      console.error(`[CRM Agent] LLM error for chunk ${i + 1}:`, err?.message || err);
    }
  }

  if (chunkResults.length === 0) {
    console.warn(`[CRM Agent] No chunk results for ${clientId}, using CRM-derived heuristic profile`);
    const heuristic = buildHeuristicDNA(clientId, entries);
    dnaCache.set(clientId, heuristic);
    return heuristic;
  }

  const merged = mergeChunkResults(chunkResults);
  const heuristic = buildHeuristicDNA(clientId, entries);

  let summary = "";
  try {
    console.log(`[CRM Agent] Consolidating DNA for ${clientId}...`);
    const consolidationPrompt = `Based on this extracted client profile, write a 2-3 sentence summary of the client's investment identity and communication preference. Refine only the communication style if the evidence supports it.

Profile:
${JSON.stringify(merged, null, 2)}

Return ONLY valid JSON: {"summary":"...","communicationStyle":"data-driven"|"values-led"|"balanced","communicationProfile":{"style":"data-driven"|"values-led"|"balanced","rationale":"...","confidence":0.8}}

Remember: respond with ONLY the JSON object. No other text.`;
    const content = await callLLM(SYSTEM_PROMPT, consolidationPrompt, 1800);
    const parsed = parseJson(content);
    if (parsed) {
      summary = parsed.summary || "";
      if (parsed.communicationStyle || parsed.communicationProfile?.style) {
        const style = normalizeStyle(parsed.communicationProfile?.style || parsed.communicationStyle);
        merged.communicationStyle = style;
        merged.communicationProfile = createCommunicationProfile(style, {
          ...merged.communicationProfile,
          ...parsed.communicationProfile,
          style,
        });
      }
    }
  } catch (err: any) {
    console.warn(`[CRM Agent] Consolidation call failed for ${clientId}:`, err?.message);
    summary = heuristic.summary;
  }

  const style = normalizeStyle(merged.communicationProfile?.style || merged.communicationStyle);
  const dna: ClientDNA = {
    clientId,
    values: asStringArray(merged.values),
    lifeEvents: asStringArray(merged.lifeEvents),
    businessContext: asStringArray(merged.businessContext),
    riskSensitivities: asStringArray(merged.riskSensitivities),
    personalPriorities: asStringArray(merged.personalPriorities),
    communicationStyle: style,
    communicationProfile: createCommunicationProfile(style, merged.communicationProfile),
    investmentProfile: createInvestmentProfile(merged.investmentProfile),
    profileSource: "crm-inferred",
    summary: summary || heuristic.summary || `Client ${clientId} profile extracted from ${entries.length} CRM entries.`,
    evidence: asEvidenceArray(merged.evidence),
    traitConfidence: merged.traitConfidence || {},
  };

  supplementFromHeuristic(dna, heuristic);

  dnaCache.set(clientId, dna);
  console.log(`[CRM Agent] DNA extracted for ${clientId}: ${dna.values.length} values, style=${dna.communicationStyle}, source=${dna.profileSource}`);

  auditService.log({
    agent: "crm-agent",
    action: "extract-dna",
    clientId,
    inputSummary: `${entries.length} CRM entries, forceRefresh=${forceRefresh}`,
    outputSummary: `${dna.values.length} values, style=${dna.communicationStyle}, source=${dna.profileSource}`,
    durationMs: Date.now() - startTime,
  });

  const avgConfidence = Object.values(dna.traitConfidence).length > 0
    ? Object.values(dna.traitConfidence).reduce((a: number, b: number) => a + (b as number), 0) / Object.values(dna.traitConfidence).length
    : dna.communicationProfile.confidence;

  explainabilityService.record({
    agent: "crm-agent",
    decisionType: "dna-extraction",
    input: { summary: `${entries.length} CRM entries for ${clientId}` },
    output: {
      summary: `Extracted ${dna.values.length} values, style: ${dna.communicationStyle}, source: ${dna.profileSource}`,
      details: {
        values: dna.values,
        communicationProfile: dna.communicationProfile,
        investmentProfile: dna.investmentProfile,
      },
    },
    reasoning: {
      steps: [
        `Processed ${entries.length} CRM entries in ${Math.ceil(entries.length / 15)} chunks`,
        `Identified ${dna.values.length} values and ${dna.riskSensitivities.length} risk sensitivities`,
        `Separated investment preferences from communication style`,
        `Communication style classified as ${dna.communicationStyle}`,
        `Profile source: ${dna.profileSource}`,
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
