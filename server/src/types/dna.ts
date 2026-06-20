export interface DNAEvidence {
  trait: string;
  crmDate: string;
  crmExcerpt: string;
}

export type CommunicationStyle = "data-driven" | "values-led" | "balanced";
export type RiskTolerance = "low" | "medium" | "high" | "unknown";
export type SensitivityLevel = "low" | "medium" | "high" | "unknown";
export type ProfileSource = "crm-inferred" | "crm-heuristic" | "demo-profile" | "unavailable";

export interface CommunicationProfile {
  style: CommunicationStyle;
  rationale: string;
  evidence: DNAEvidence[];
  confidence: number;
}

export interface InvestmentProfile {
  objectives: string[];
  riskTolerance: RiskTolerance;
  hardConstraints: string[];
  softPreferences: string[];
  exclusions: string[];
  positiveScreens: string[];
  valueThemes: string[];
  liquidityNeeds: string[];
  reputationSensitivity: SensitivityLevel;
  temporalChanges: string[];
  evidence: DNAEvidence[];
}

export interface ClientDNA {
  clientId: string;
  values: string[];
  lifeEvents: string[];
  businessContext: string[];
  riskSensitivities: string[];
  personalPriorities: string[];
  communicationStyle: CommunicationStyle;
  communicationProfile: CommunicationProfile;
  investmentProfile: InvestmentProfile;
  profileSource: ProfileSource;
  summary: string;
  evidence: DNAEvidence[];
  traitConfidence: Record<string, number>;
}
