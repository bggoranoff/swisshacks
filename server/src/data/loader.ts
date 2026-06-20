import * as XLSX from "xlsx";
import * as path from "path";
import {
  CRMEntry,
  ClientProfile,
  Position,
  Portfolio,
  StrategyAllocation,
  CIORecommendation,
  Transaction,
  CashFlow,
} from "../types/data";
import { setClients, setPortfolios, markLoaded } from "./store";

const DATA_DIR = path.join(__dirname, "../../../data");

const CRM_TAB_MAP: Record<string, { id: string; name: string; description: string; strategy: "Defensive" | "Balanced" | "Growth"; portfolioTab: string; triggerEvent: string }> = {
  "CRM Schneider": {
    id: "schneider",
    name: "Schneider",
    description: "Emotionally driven private client running a family foundation for chronic-illness and neuro-degenerative research. Seeks purpose-aligned, balanced investments that reflect her family's health legacy.",
    strategy: "Balanced",
    portfolioTab: "Sample Portfolio Balanced",
    triggerEvent: "Pharma company shuts down its research division for that disease",
  },
  "CRM Huber": {
    id: "huber",
    name: "Huber",
    description: "Impact-first investor and environmentalist financing South American reforestation projects. Prioritises measurable ecological outcomes and holds biodiversity risk and greenwashing as hard red lines.",
    strategy: "Defensive",
    portfolioTab: "Sample Portfolio Defensive",
    triggerEvent: "Consumer goods company announces historic palm oil deforestation cut-off",
  },
  "CRM Raeber": {
    id: "raeber",
    name: "Räber",
    description: "Conservative Swiss couple with a precision-engineering background. Capital preservation and dividend income take priority; strongly averse to US tech concentration and emerging market exposure.",
    strategy: "Defensive",
    portfolioTab: "Sample Portfolio Defensive",
    triggerEvent: "CIO suggests rebalancing from blue chips into US AI stocks",
  },
  "CRM Ammann": {
    id: "ammann",
    name: "Ammann",
    description: "Prominent Swiss entrepreneur for whom reputational risk is inseparable from financial risk. Any ESG controversy or supply-chain scandal in the portfolio is treated as a direct threat to personal brand and business standing.",
    strategy: "Growth",
    portfolioTab: "Sample Portfolio Growth",
    triggerEvent: "Labour exploitation scandal hits a consumer brand in the portfolio",
  },
};

function safeString(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

function safeNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

export function loadCRMData(): Map<string, CRMEntry[]> {
  const filePath = path.join(DATA_DIR, "SwissHacks CRM.xlsx");
  const wb = XLSX.readFile(filePath);
  const result = new Map<string, CRMEntry[]>();

  for (const sheetName of wb.SheetNames) {
    const meta = CRM_TAB_MAP[sheetName];
    if (!meta) {
      console.log(`[Loader] Skipping unknown CRM sheet: ${sheetName}`);
      continue;
    }

    const sheet = wb.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
    console.log(`[Loader] CRM ${sheetName}: ${rows.length} entries, headers: ${Object.keys(rows[0] || {}).join(", ")}`);

    const entries: CRMEntry[] = rows.map((row) => {
      const entry: CRMEntry = {};
      for (const [key, val] of Object.entries(row)) {
        entry[key] = safeString(val);
      }
      return entry;
    });

    result.set(meta.id, entries);
  }

  return result;
}

function parsePositions(sheet: XLSX.WorkSheet): Position[] {
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
  const positions: Position[] = [];

  for (const row of rows) {
    const isin = safeString(row["ISIN"]);
    if (!isin) continue;

    const assetClass = safeString(row["Asset Class"]);
    const subAssetClass = safeString(row["Sub-Asset Class"]);
    const targetCHF = safeNumber(row["Target (CHF)"]);
    const currentCHF = safeNumber(row["Current (CHF)"]);
    const isBond = assetClass.toLowerCase().includes("fixed income");

    positions.push({
      isin,
      name: safeString(row["Issuer / Asset"]),
      instrumentType: isBond ? "BOND" : "EQUITY",
      valorNumber: safeString(row["Valor"]),
      mic: safeString(row["MIC"]),
      sectorOrAssetClass: subAssetClass || assetClass,
      targetValueCHF: targetCHF,
      currentValueCHF: currentCHF,
      driftPercent: targetCHF > 0 ? ((currentCHF - targetCHF) / targetCHF) * 100 : 0,
      quantity: 0,
      yahooTicker: safeString(row["Yahoo Ticker"]) || undefined,
    });
  }

  return positions;
}

function parseStrategyAllocations(sheet: XLSX.WorkSheet, strategyKey: string): StrategyAllocation[] {
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
  const allocations: StrategyAllocation[] = [];

  for (const row of rows) {
    const assetClass = safeString(row["Asset Class"]);
    const subAssetClass = safeString(row["Sub-Asset Class"]);
    if (!assetClass || assetClass === "TOTAL" || assetClass === "Target amount") continue;

    const pctKey = strategyKey;
    const pct = safeNumber(row[pctKey]);

    allocations.push({
      assetClass: subAssetClass || assetClass,
      targetPercent: pct,
    });
  }

  return allocations;
}

function parseCIORecommendations(sheet: XLSX.WorkSheet): CIORecommendation[] {
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
  const recommendations: CIORecommendation[] = [];

  for (const row of rows) {
    const isin = safeString(row["ISIN"]);
    if (!isin) continue;

    const ratingRaw = safeString(row["Rating"]).toUpperCase();
    let rating: "BUY" | "HOLD" | "SELL" = "HOLD";
    if (ratingRaw === "BUY") rating = "BUY";
    else if (ratingRaw === "SELL") rating = "SELL";

    recommendations.push({
      isin,
      name: safeString(row["Issuer / Asset"]),
      rating,
    });
  }

  return recommendations;
}

function parseTransactions(sheet: XLSX.WorkSheet): Transaction[] {
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
  const transactions: Transaction[] = [];

  for (const row of rows) {
    const isin = safeString(row["ISIN"]);
    if (!isin) continue;

    const sideRaw = safeString(row["Side"]).toUpperCase();
    const side: "BUY" | "SELL" = sideRaw === "SELL" ? "SELL" : "BUY";

    let dateStr = safeString(row["Timestamp"]);
    const dateNum = Number(dateStr);
    if (Number.isFinite(dateNum) && dateNum > 40000) {
      const d = XLSX.SSF.parse_date_code(dateNum);
      dateStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }

    transactions.push({
      date: dateStr,
      isin,
      name: safeString(row["Issuer / Asset"]),
      side,
      quantity: safeNumber(row["Quantity"]),
      priceCHF: safeNumber(row["Price (CHF)"]),
      totalCHF: safeNumber(row["Amount (CHF)"]),
    });
  }

  return transactions;
}

function parseCashFlows(sheet: XLSX.WorkSheet, portfolioName: string): CashFlow[] {
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
  const flows: CashFlow[] = [];

  for (const row of rows) {
    const portfolio = safeString(row["Portfolio"]);
    if (portfolio !== portfolioName) continue;

    let dateStr = safeString(row["Timestamp"]);
    const dateNum = Number(dateStr);
    if (Number.isFinite(dateNum) && dateNum > 40000) {
      const d = XLSX.SSF.parse_date_code(dateNum);
      dateStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }

    flows.push({
      date: dateStr,
      type: safeString(row["Side"]).toLowerCase(),
      amount: safeNumber(row["Amount (CHF)"]),
      currency: "CHF",
    });
  }

  return flows;
}

export function loadPortfolioData(): Portfolio[] {
  const filePath = path.join(DATA_DIR, "SwissHacks Portfolio Construction.xlsx");
  const wb = XLSX.readFile(filePath);
  const portfolios: Portfolio[] = [];

  const cioSheet = wb.Sheets["CIO Recommendation List"];
  const cioRecommendations = cioSheet ? parseCIORecommendations(cioSheet) : [];
  console.log(`[Loader] CIO Recommendations: ${cioRecommendations.length} entries`);

  const cashFlowSheet = wb.Sheets["Cash Flows"];
  const stratSheet = wb.Sheets["Portfolio Strategies"];

  const configs: { strategy: "Defensive" | "Balanced" | "Growth"; posTab: string; txnTab: string; pctKey: string }[] = [
    { strategy: "Defensive", posTab: "Sample Portfolio Defensive", txnTab: "Transactions Defensive", pctKey: "Def %" },
    { strategy: "Balanced", posTab: "Sample Portfolio Balanced", txnTab: "Transactions Balanced", pctKey: "Balanced %" },
    { strategy: "Growth", posTab: "Sample Portfolio Growth", txnTab: "Transactions Growth", pctKey: "Growth %" },
  ];

  for (const cfg of configs) {
    const posSheet = wb.Sheets[cfg.posTab];
    const positions = posSheet ? parsePositions(posSheet) : [];

    const txnSheet = wb.Sheets[cfg.txnTab];
    const transactions = txnSheet ? parseTransactions(txnSheet) : [];

    const cashFlows = cashFlowSheet ? parseCashFlows(cashFlowSheet, cfg.strategy) : [];

    const strategyAllocations = stratSheet ? parseStrategyAllocations(stratSheet, cfg.pctKey) : [];

    const totalTargetCHF = positions.reduce((sum, p) => sum + p.targetValueCHF, 0);

    console.log(`[Loader] Portfolio ${cfg.strategy}: ${positions.length} positions, ${transactions.length} transactions, ${cashFlows.length} cash flows, target CHF ${totalTargetCHF.toLocaleString()}`);

    portfolios.push({
      strategy: cfg.strategy,
      totalTargetCHF,
      positions,
      strategyAllocations,
      cioRecommendations,
      transactions,
      cashFlows,
    });
  }

  return portfolios;
}

export function buildClientProfiles(
  crmData: Map<string, CRMEntry[]>,
  portfolios: Portfolio[]
): ClientProfile[] {
  const clients: ClientProfile[] = [];

  for (const [sheetName, meta] of Object.entries(CRM_TAB_MAP)) {
    const entries = crmData.get(meta.id) || [];

    clients.push({
      id: meta.id,
      name: meta.name,
      description: meta.description,
      strategy: meta.strategy,
      crmTab: sheetName,
      portfolioTab: meta.portfolioTab,
      triggerEvent: meta.triggerEvent,
      crmEntries: entries,
    });
  }

  return clients;
}

export function loadAllData(): void {
  try {
    console.log("[Loader] Loading CRM data...");
    const crmData = loadCRMData();

    console.log("[Loader] Loading portfolio data...");
    const portfolios = loadPortfolioData();

    console.log("[Loader] Building client profiles...");
    const clients = buildClientProfiles(crmData, portfolios);

    setClients(clients);
    setPortfolios(portfolios);
    markLoaded();

    console.log(`[Loader] Data loaded: ${clients.length} clients, ${portfolios.length} portfolios`);
  } catch (err) {
    console.error("[Loader] FATAL: Failed to load data:", (err as Error).message);
    process.exit(1);
  }
}
