import { ClientDNA } from "../types/dna";

export const FALLBACK_DNA: Record<string, ClientDNA> = {
  schneider: {
    clientId: "schneider",
    values: ["family legacy", "chronic-illness research", "personal relationships"],
    lifeEvents: ["established family foundation for chronic-illness research", "daughter started university"],
    businessContext: ["family office managing multi-generational wealth"],
    riskSensitivities: ["sensitive to pharmaceutical sector changes affecting foundation mission"],
    personalPriorities: ["supporting chronic-illness research", "preserving family legacy", "maintaining close RM relationship"],
    communicationStyle: "values-led",
    summary: "Schneider is an emotionally driven, purpose-oriented client whose investment identity is deeply tied to a family foundation supporting chronic-illness research. Values personal connection with the RM and expects empathetic, mission-aligned advisory.",
    evidence: [],
    traitConfidence: {},
  },
  huber: {
    clientId: "huber",
    values: ["environmental sustainability", "reforestation", "ESG compliance"],
    lifeEvents: ["financing South American reforestation project", "increased ESG allocation"],
    businessContext: ["environmentally focused investment portfolio"],
    riskSensitivities: ["averse to companies with poor environmental track records"],
    personalPriorities: ["reforestation impact", "sustainable supply chains", "ESG-aligned holdings"],
    communicationStyle: "values-led",
    summary: "Huber is a purpose-driven environmentalist investor financing South American reforestation. Expects advisory that connects portfolio actions to ecological impact and values alignment.",
    evidence: [],
    traitConfidence: {},
  },
  raeber: {
    clientId: "raeber",
    values: ["Swiss precision engineering", "conservative investment", "capital preservation"],
    lifeEvents: ["retired from precision engineering firm", "long-term married couple managing joint wealth"],
    businessContext: ["background in Swiss precision engineering industry", "conservative risk profile"],
    riskSensitivities: ["averse to US tech exposure", "skeptical of high-growth stocks", "uncomfortable with speculative AI sector"],
    personalPriorities: ["blue-chip stability", "Swiss market focus", "dividend income"],
    communicationStyle: "data-driven",
    summary: "The Räbers are a conservative Swiss couple with a precision-engineering background. They are explicitly averse to US tech exposure and prefer data-driven, analytical communication with clear numbers and percentages.",
    evidence: [],
    traitConfidence: {},
  },
  ammann: {
    clientId: "ammann",
    values: ["corporate reputation", "Swiss entrepreneurship", "brand image"],
    lifeEvents: ["prominent Swiss entrepreneur with public profile", "expanded business operations"],
    businessContext: ["high-profile business leader", "reputation directly tied to financial decisions"],
    riskSensitivities: ["reputational risk", "public scrutiny sensitivity", "brand association risk"],
    personalPriorities: ["protecting personal and corporate reputation", "avoiding controversial holdings", "growth with governance"],
    communicationStyle: "balanced",
    summary: "Ammann is a prominent Swiss entrepreneur for whom reputational risk equals financial risk. Advisory must be urgency-aware when scandals or governance issues affect portfolio holdings.",
    evidence: [],
    traitConfidence: {},
  },
};

export function getFallbackDNA(clientId: string): ClientDNA {
  return FALLBACK_DNA[clientId] || {
    clientId,
    values: [],
    lifeEvents: [],
    businessContext: [],
    riskSensitivities: [],
    personalPriorities: [],
    communicationStyle: "balanced" as const,
    summary: "No profile available.",
    evidence: [],
    traitConfidence: {},
  };
}
