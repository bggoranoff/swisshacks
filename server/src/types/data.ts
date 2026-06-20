export interface CRMEntry {
  [key: string]: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  description: string;
  strategy: "Defensive" | "Balanced" | "Growth";
  crmTab: string;
  portfolioTab: string;
  triggerEvent: string;
  pronouns: string;
  crmEntries: CRMEntry[];
}

export interface Position {
  isin: string;
  name: string;
  instrumentType: string;
  valorNumber: string;
  mic: string;
  sectorOrAssetClass: string;
  targetValueCHF: number;
  currentValueCHF: number;
  driftPercent: number;
  quantity: number;
  yahooTicker?: string;
}

export interface StrategyAllocation {
  assetClass: string;
  targetPercent: number;
}

export interface CIORecommendation {
  isin: string;
  name: string;
  rating: "BUY" | "HOLD" | "SELL";
  swapCandidate?: string;
  swapCandidateName?: string;
}

export interface CashFlow {
  date: string;
  type: string;
  amount: number;
  currency: string;
  isin?: string;
}

export interface Transaction {
  date: string;
  isin: string;
  name: string;
  side: "BUY" | "SELL";
  quantity: number;
  priceCHF: number;
  totalCHF: number;
}

export interface Portfolio {
  strategy: "Defensive" | "Balanced" | "Growth";
  totalTargetCHF: number;
  positions: Position[];
  strategyAllocations: StrategyAllocation[];
  cioRecommendations: CIORecommendation[];
  transactions: Transaction[];
  cashFlows: CashFlow[];
}

export interface DriftBreach {
  assetClass: string;
  driftPct: number;
}
