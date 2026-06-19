export interface DNAEvidence {
  trait: string;
  crmDate: string;
  crmExcerpt: string;
}

export interface ClientDNA {
  clientId: string;
  values: string[];
  lifeEvents: string[];
  businessContext: string[];
  riskSensitivities: string[];
  personalPriorities: string[];
  communicationStyle: "data-driven" | "values-led" | "balanced";
  summary: string;
  evidence: DNAEvidence[];
  traitConfidence: Record<string, number>;
}
