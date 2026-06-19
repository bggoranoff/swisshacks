import type {
  ClientSummary,
  ClientDNA,
  PortfolioAnalysis,
  NewsDigest,
  AdvisoryMessage,
} from "../types/api";

export const mockClients: ClientSummary[] = [
  {
    id: "schneider",
    name: "Max Schneider",
    description:
      "Balanced mandate. Family foundation supporting chronic-illness research. Values-led communicator with deep ties to Swiss heritage.",
    strategy: "Balanced",
    crmEntryCount: 47,
    triggerEvent: "Major pharma company announces shutdown of chronic-illness research division",
  },
  {
    id: "huber",
    name: "Peter Huber",
    description:
      "Defensive mandate. Passionate environmentalist focused on reforestation and clean energy. Values-led communicator.",
    strategy: "Defensive",
    crmEntryCount: 38,
    triggerEvent: "Global consumer goods company announces historic palm oil deforestation cut-off",
  },
  {
    id: "raeber",
    name: "Rudolf Räber",
    description:
      "Defensive mandate. Swiss precision engineering background. Data-driven communicator averse to US tech exposure.",
    strategy: "Defensive",
    crmEntryCount: 42,
    triggerEvent: "CIO recommends rebalancing into US AI stocks",
  },
  {
    id: "ammann",
    name: "Clara Ammann",
    description:
      "Growth mandate. Corporate reputation focus. Swiss entrepreneur with balanced communication style.",
    strategy: "Growth",
    crmEntryCount: 35,
    triggerEvent: "Labour exploitation scandal hits major consumer brand amid supply chain audit",
  },
];

export const mockDNA: Record<string, ClientDNA> = {
  schneider: {
    clientId: "schneider",
    values: ["family legacy", "chronic-illness research", "Swiss heritage"],
    lifeEvents: [
      "family foundation established",
      "daughter's medical diagnosis",
      "endowed university research chair",
    ],
    businessContext: [
      "third-generation family office",
      "board member of cantonal hospital foundation",
    ],
    riskSensitivities: [
      "pharma sector concentration risk",
      "sensitive to bioethics controversies",
    ],
    personalPriorities: [
      "long-term wealth preservation for next generation",
      "funding medical research breakthroughs",
    ],
    communicationStyle: "values-led",
    summary:
      "Max Schneider manages a third-generation family office with a deep personal commitment to chronic-illness research, driven by his daughter’s diagnosis. He prioritises investments that align with his family’s legacy of medical philanthropy and Swiss heritage. Communication should lead with values and personal impact before presenting data.",
    evidence: [
      {
        trait: "chronic-illness research",
        crmDate: "2024-03-15",
        crmExcerpt:
          "Client reiterated that the foundation’s primary mission is funding breakthrough treatments for chronic autoimmune conditions.",
      },
      {
        trait: "family legacy",
        crmDate: "2024-06-22",
        crmExcerpt:
          "Discussed succession planning — Schneider wants the portfolio structured so his children inherit both wealth and the philanthropic mission.",
      },
      {
        trait: "Swiss heritage",
        crmDate: "2023-11-08",
        crmExcerpt:
          "Expressed preference for Swiss-domiciled instruments where possible; views it as part of the family identity.",
      },
    ],
    traitConfidence: {
      "family legacy": 0.95,
      "chronic-illness research": 0.98,
      "Swiss heritage": 0.82,
      "pharma sector concentration risk": 0.76,
    },
  },
  huber: {
    clientId: "huber",
    values: [
      "environmental sustainability",
      "reforestation",
      "clean energy",
    ],
    lifeEvents: [
      "Amazon reforestation trip",
      "carbon offset commitment",
      "joined UNEP advisory panel",
    ],
    businessContext: [
      "retired CEO of Swiss clean-tech firm",
      "angel investor in green startups",
    ],
    riskSensitivities: [
      "fossil fuel exposure",
      "greenwashing accusations in portfolio",
    ],
    personalPriorities: [
      "measurable environmental impact",
      "ESG-compliant portfolio",
    ],
    communicationStyle: "values-led",
    summary:
      "Peter Huber is a retired clean-tech CEO with an unwavering commitment to environmental sustainability. His Amazon reforestation trip was a life-changing event that shaped his investment philosophy. He demands measurable environmental impact and will not tolerate greenwashing. Communication should emphasise ecological outcomes and align proposals with his vision of a sustainable future.",
    evidence: [
      {
        trait: "reforestation",
        crmDate: "2024-01-20",
        crmExcerpt:
          "Huber described his Amazon trip as ‘the moment I understood that capital can either destroy or restore ecosystems.’",
      },
      {
        trait: "clean energy",
        crmDate: "2024-04-10",
        crmExcerpt:
          "Asked us to increase allocation to renewable energy infrastructure bonds; wants to see direct CO2 reduction metrics.",
      },
      {
        trait: "fossil fuel exposure",
        crmDate: "2023-09-05",
        crmExcerpt:
          "Explicitly requested zero exposure to fossil fuel producers or distributors, citing personal values.",
      },
    ],
    traitConfidence: {
      "environmental sustainability": 0.97,
      reforestation: 0.94,
      "clean energy": 0.91,
      "fossil fuel exposure": 0.88,
    },
  },
  raeber: {
    clientId: "raeber",
    values: [
      "Swiss precision engineering",
      "conservative investment",
      "capital preservation",
    ],
    lifeEvents: [
      "sold precision-instruments company",
      "relocated to Zug",
      "established charitable trust for STEM education",
    ],
    businessContext: [
      "former owner of Swiss precision-instruments manufacturer",
      "advisory board of ETH Zürich engineering faculty",
    ],
    riskSensitivities: [
      "averse to US tech exposure",
      "currency risk outside CHF/EUR",
      "uncomfortable with high-volatility growth stocks",
    ],
    personalPriorities: [
      "capital preservation over growth",
      "Swiss industrial sector allocation",
      "transparent and quantifiable risk metrics",
    ],
    communicationStyle: "data-driven",
    summary:
      "Rudolf Räber built and sold a Swiss precision-instruments company and invests with the same engineering discipline. He is deeply sceptical of US tech hype and insists on quantifiable risk metrics. His defensive mandate reflects a strong preference for capital preservation. Communication must lead with numbers, benchmarks, and concrete data — emotional appeals will not resonate.",
    evidence: [
      {
        trait: "averse to US tech exposure",
        crmDate: "2024-02-14",
        crmExcerpt:
          "Räber stated: ‘I don’t understand these AI valuations. I want Swiss engineering companies I can visit and inspect.’",
      },
      {
        trait: "capital preservation",
        crmDate: "2024-05-03",
        crmExcerpt:
          "Reinforced that a 2% drawdown is his maximum tolerance; asked for stress-test scenarios on all new positions.",
      },
      {
        trait: "Swiss precision engineering",
        crmDate: "2023-12-18",
        crmExcerpt:
          "Discussed increasing allocation to Swiss industrial stocks — sees them as ‘real businesses with real margins.’",
      },
    ],
    traitConfidence: {
      "Swiss precision engineering": 0.93,
      "conservative investment": 0.96,
      "averse to US tech exposure": 0.99,
      "capital preservation": 0.95,
    },
  },
  ammann: {
    clientId: "ammann",
    values: [
      "corporate reputation",
      "Swiss entrepreneurship",
      "ethical governance",
    ],
    lifeEvents: [
      "IPO of consumer brand company",
      "joined Swiss corporate governance board",
      "public controversy over supplier audit",
    ],
    businessContext: [
      "founder and chairwoman of Swiss consumer brand",
      "public figure in Swiss business media",
    ],
    riskSensitivities: [
      "reputational risk",
      "public association with unethical companies",
      "media scrutiny of personal investments",
    ],
    personalPriorities: [
      "protecting personal and corporate reputation",
      "growth with governance guardrails",
      "Swiss market leadership",
    ],
    communicationStyle: "balanced",
    summary:
      "Clara Ammann is a prominent Swiss entrepreneur whose public profile makes reputational risk her primary concern. She founded a consumer brand that went through IPO and sits on corporate governance boards. Any portfolio holding that could generate negative press is a red flag. Communication should blend data with strategic framing, leading with reputational impact when relevant.",
    evidence: [
      {
        trait: "reputational risk",
        crmDate: "2024-04-28",
        crmExcerpt:
          "Ammann said: ‘If a journalist finds my name linked to that company, it’s front-page news. We cannot afford that.’",
      },
      {
        trait: "ethical governance",
        crmDate: "2024-01-15",
        crmExcerpt:
          "Requested governance screening on all new equity positions; wants board-diversity and anti-corruption scores.",
      },
      {
        trait: "Swiss entrepreneurship",
        crmDate: "2023-10-30",
        crmExcerpt:
          "Expressed pride in Swiss business ecosystem and preference for companies that ‘build something real in Switzerland.’",
      },
    ],
    traitConfidence: {
      "corporate reputation": 0.97,
      "Swiss entrepreneurship": 0.85,
      "ethical governance": 0.90,
      "reputational risk": 0.98,
    },
  },
};

export const mockPortfolios: Record<string, PortfolioAnalysis> = {
  schneider: {
    clientId: "schneider",
    strategy: "Balanced",
    totalValueCHF: 10_245_800,
    positions: [
      {
        isin: "CH0012032048",
        name: "Roche Holding AG",
        instrumentType: "EQUITY",
        valorNumber: "1203204",
        mic: "XSWX",
        sectorOrAssetClass: "Healthcare",
        targetValueCHF: 1_500_000,
        currentValueCHF: 1_534_200,
        driftPercent: 2.28,
        quantity: 5600,
        yahooTicker: "ROG.SW",
        priceSource: "excel",
        cioRating: "HOLD",
        livePrice: 274.0,
        liveCurrency: "CHF",
      },
      {
        isin: "CH0012005267",
        name: "Novartis AG",
        instrumentType: "EQUITY",
        valorNumber: "1200526",
        mic: "XSWX",
        sectorOrAssetClass: "Healthcare",
        targetValueCHF: 1_400_000,
        currentValueCHF: 1_358_600,
        driftPercent: -2.96,
        quantity: 14200,
        yahooTicker: "NOVN.SW",
        priceSource: "excel",
        cioRating: "BUY",
        dnaConflict: {
          severity: "high",
          reason:
            "Novartis recently announced closure of its chronic-disease research division, directly conflicting with Schneider’s core philanthropic mission.",
          reasoningChain: [
            "Schneider’s DNA prioritises chronic-illness research funding",
            "Novartis shut down chronic-disease R&D unit in Q2 2026",
            "Holding a company that abandons this research contradicts the client’s foundational values",
          ],
          riskType: "values",
          suggestedSwap: {
            isin: "US4781601046",
            name: "Johnson & Johnson",
            reason:
              "J&J maintains one of the largest chronic-disease research pipelines globally and aligns with Schneider’s values.",
            cioRating: "BUY",
          },
        },
      },
      {
        isin: "CH0038863350",
        name: "Nestlé SA",
        instrumentType: "EQUITY",
        valorNumber: "3886335",
        mic: "XSWX",
        sectorOrAssetClass: "Consumer Staples",
        targetValueCHF: 1_200_000,
        currentValueCHF: 1_215_400,
        driftPercent: 1.28,
        quantity: 12000,
        yahooTicker: "NESN.SW",
        priceSource: "excel",
        cioRating: "HOLD",
      },
      {
        isin: "CH0244767585",
        name: "UBS Group AG",
        instrumentType: "EQUITY",
        valorNumber: "24476758",
        mic: "XSWX",
        sectorOrAssetClass: "Financials",
        targetValueCHF: 800_000,
        currentValueCHF: 824_300,
        driftPercent: 3.04,
        quantity: 28000,
        yahooTicker: "UBSG.SW",
        priceSource: "excel",
        cioRating: "BUY",
      },
      {
        isin: "CH0010570767",
        name: "Chocoladenfabriken Lindt & Sprüngli",
        instrumentType: "EQUITY",
        valorNumber: "1057076",
        mic: "XSWX",
        sectorOrAssetClass: "Consumer Staples",
        targetValueCHF: 600_000,
        currentValueCHF: 587_200,
        driftPercent: -2.13,
        quantity: 55,
        yahooTicker: "LISN.SW",
        priceSource: "excel",
        cioRating: "HOLD",
      },
      {
        isin: "XS2434891563",
        name: "Swiss Confederation Bond 1.5% 2032",
        instrumentType: "BOND",
        valorNumber: "24348915",
        mic: "XSWX",
        sectorOrAssetClass: "Government Bonds",
        targetValueCHF: 2_500_000,
        currentValueCHF: 2_478_000,
        driftPercent: -0.88,
        quantity: 25000,
        priceSource: "excel",
      },
      {
        isin: "CH0012221716",
        name: "ABB Ltd",
        instrumentType: "EQUITY",
        valorNumber: "1222171",
        mic: "XSWX",
        sectorOrAssetClass: "Industrials",
        targetValueCHF: 900_000,
        currentValueCHF: 918_400,
        driftPercent: 2.04,
        quantity: 18000,
        yahooTicker: "ABBN.SW",
        priceSource: "excel",
        cioRating: "BUY",
      },
      {
        isin: "CH0126881561",
        name: "Swiss Re AG",
        instrumentType: "EQUITY",
        valorNumber: "12688156",
        mic: "XSWX",
        sectorOrAssetClass: "Financials",
        targetValueCHF: 1_100_000,
        currentValueCHF: 1_089_700,
        driftPercent: -0.94,
        quantity: 9400,
        yahooTicker: "SREN.SW",
        priceSource: "excel",
        cioRating: "HOLD",
      },
    ],
    driftBreaches: [
      { assetClass: "Healthcare", driftPct: -2.96 },
      { assetClass: "Financials", driftPct: 3.04 },
    ],
    conflicts: [
      {
        severity: "high" as const,
        reason:
          "Novartis shut down chronic-disease research, conflicting with Schneider’s core philanthropic mission.",
        reasoningChain: [
          "Client DNA: chronic-illness research is a foundational value",
          "Novartis closed its chronic-disease R&D division",
          "Holding contradicts the family foundation’s mission",
        ],
        riskType: "values" as const,
        suggestedSwap: {
          isin: "US4781601046",
          name: "Johnson & Johnson",
          reason:
            "J&J maintains a major chronic-disease research pipeline.",
          cioRating: "BUY",
        },
      },
    ],
    summary:
      "Balanced portfolio with CHF 10.2M across 8 positions. Healthcare sector shows a values-conflict with Novartis due to its chronic-disease research shutdown. Financials sector drifting above target at +3.04%.",
  },
  huber: {
    clientId: "huber",
    strategy: "Defensive",
    totalValueCHF: 10_112_500,
    positions: [
      {
        isin: "CH0038863350",
        name: "Nestlé SA",
        instrumentType: "EQUITY",
        valorNumber: "3886335",
        mic: "XSWX",
        sectorOrAssetClass: "Consumer Staples",
        targetValueCHF: 1_000_000,
        currentValueCHF: 1_028_500,
        driftPercent: 2.85,
        quantity: 10200,
        yahooTicker: "NESN.SW",
        priceSource: "excel",
        cioRating: "HOLD",
        dnaConflict: {
          severity: "medium",
          reason:
            "Nestlé faced past palm oil deforestation allegations. Recent announcement of historic deforestation cut-off is a positive development that may resolve this conflict.",
          reasoningChain: [
            "Huber’s DNA strongly values reforestation and sustainability",
            "Nestlé had prior links to palm oil deforestation",
            "Recent policy change may transform this from a conflict to an alignment",
          ],
          riskType: "values",
        },
      },
      {
        isin: "DK0060534915",
        name: "Vestas Wind Systems",
        instrumentType: "EQUITY",
        valorNumber: "6053491",
        mic: "XCSE",
        sectorOrAssetClass: "Clean Energy",
        targetValueCHF: 1_200_000,
        currentValueCHF: 1_178_400,
        driftPercent: -1.8,
        quantity: 45000,
        yahooTicker: "VWS.CO",
        priceSource: "excel",
        cioRating: "BUY",
      },
      {
        isin: "CH0012032048",
        name: "Roche Holding AG",
        instrumentType: "EQUITY",
        valorNumber: "1203204",
        mic: "XSWX",
        sectorOrAssetClass: "Healthcare",
        targetValueCHF: 800_000,
        currentValueCHF: 812_600,
        driftPercent: 1.58,
        quantity: 2960,
        yahooTicker: "ROG.SW",
        priceSource: "excel",
        cioRating: "HOLD",
      },
      {
        isin: "XS2434891563",
        name: "Swiss Confederation Bond 1.5% 2032",
        instrumentType: "BOND",
        valorNumber: "24348915",
        mic: "XSWX",
        sectorOrAssetClass: "Government Bonds",
        targetValueCHF: 3_000_000,
        currentValueCHF: 2_968_000,
        driftPercent: -1.07,
        quantity: 30000,
        priceSource: "excel",
      },
      {
        isin: "FR0010524777",
        name: "Lyxor Green Bond ETF",
        instrumentType: "ETF",
        valorNumber: "1052477",
        mic: "XPAR",
        sectorOrAssetClass: "Green Bonds",
        targetValueCHF: 1_500_000,
        currentValueCHF: 1_487_200,
        driftPercent: -0.85,
        quantity: 15000,
        priceSource: "excel",
        cioRating: "BUY",
      },
      {
        isin: "CH0126881561",
        name: "Swiss Re AG",
        instrumentType: "EQUITY",
        valorNumber: "12688156",
        mic: "XSWX",
        sectorOrAssetClass: "Financials",
        targetValueCHF: 900_000,
        currentValueCHF: 921_800,
        driftPercent: 2.42,
        quantity: 7900,
        yahooTicker: "SREN.SW",
        priceSource: "excel",
        cioRating: "HOLD",
      },
      {
        isin: "NO0010096985",
        name: "Equinor ASA",
        instrumentType: "EQUITY",
        valorNumber: "1009698",
        mic: "XOSL",
        sectorOrAssetClass: "Energy",
        targetValueCHF: 700_000,
        currentValueCHF: 716_000,
        driftPercent: 2.29,
        quantity: 22000,
        yahooTicker: "EQNR.OL",
        priceSource: "excel",
        cioRating: "HOLD",
        dnaConflict: {
          severity: "high",
          reason:
            "Equinor is a major fossil fuel producer, directly conflicting with Huber’s zero fossil-fuel exposure mandate.",
          reasoningChain: [
            "Huber demands zero fossil fuel exposure",
            "Equinor derives >60% revenue from oil & gas",
            "Presence in portfolio contradicts stated values",
          ],
          riskType: "values",
          suggestedSwap: {
            isin: "DK0061539921",
            name: "Ørsted A/S",
            reason:
              "Ørsted is a pure-play offshore wind company, fully aligned with Huber’s clean-energy values.",
            cioRating: "BUY",
          },
        },
      },
    ],
    driftBreaches: [
      { assetClass: "Consumer Staples", driftPct: 2.85 },
      { assetClass: "Financials", driftPct: 2.42 },
      { assetClass: "Energy", driftPct: 2.29 },
    ],
    conflicts: [
      {
        severity: "high" as const,
        reason:
          "Equinor is a fossil fuel producer — conflicts with Huber’s zero fossil-fuel commitment.",
        reasoningChain: [
          "Client DNA: zero fossil fuel exposure",
          "Equinor derives >60% revenue from oil & gas",
          "Direct contradiction of stated values",
        ],
        riskType: "values" as const,
        suggestedSwap: {
          isin: "DK0061539921",
          name: "Ørsted A/S",
          reason: "Pure-play offshore wind, aligned with clean-energy values.",
          cioRating: "BUY",
        },
      },
      {
        severity: "medium" as const,
        reason:
          "Nestlé had past palm oil deforestation links — recent policy may resolve concern.",
        reasoningChain: [
          "Client DNA: reforestation and sustainability priority",
          "Nestlé had prior palm-oil deforestation allegations",
          "New cut-off policy is a positive signal but needs monitoring",
        ],
        riskType: "values" as const,
      },
    ],
    summary:
      "Defensive portfolio with CHF 10.1M. High-severity conflict: Equinor fossil fuel exposure contradicts client values. Nestlé palm oil situation evolving positively. Green bond allocation on target.",
  },
  raeber: {
    clientId: "raeber",
    strategy: "Defensive",
    totalValueCHF: 10_087_300,
    positions: [
      {
        isin: "CH0012221716",
        name: "ABB Ltd",
        instrumentType: "EQUITY",
        valorNumber: "1222171",
        mic: "XSWX",
        sectorOrAssetClass: "Industrials",
        targetValueCHF: 1_500_000,
        currentValueCHF: 1_523_600,
        driftPercent: 1.57,
        quantity: 30000,
        yahooTicker: "ABBN.SW",
        priceSource: "excel",
        cioRating: "BUY",
      },
      {
        isin: "CH0024638196",
        name: "Schindler Holding AG",
        instrumentType: "EQUITY",
        valorNumber: "2463819",
        mic: "XSWX",
        sectorOrAssetClass: "Industrials",
        targetValueCHF: 1_000_000,
        currentValueCHF: 987_400,
        driftPercent: -1.26,
        quantity: 4200,
        yahooTicker: "SCHP.SW",
        priceSource: "excel",
        cioRating: "HOLD",
      },
      {
        isin: "CH0244767585",
        name: "UBS Group AG",
        instrumentType: "EQUITY",
        valorNumber: "24476758",
        mic: "XSWX",
        sectorOrAssetClass: "Financials",
        targetValueCHF: 800_000,
        currentValueCHF: 814_200,
        driftPercent: 1.78,
        quantity: 27600,
        yahooTicker: "UBSG.SW",
        priceSource: "excel",
        cioRating: "BUY",
      },
      {
        isin: "XS2434891563",
        name: "Swiss Confederation Bond 1.5% 2032",
        instrumentType: "BOND",
        valorNumber: "24348915",
        mic: "XSWX",
        sectorOrAssetClass: "Government Bonds",
        targetValueCHF: 3_500_000,
        currentValueCHF: 3_462_000,
        driftPercent: -1.09,
        quantity: 35000,
        priceSource: "excel",
      },
      {
        isin: "CH0012032048",
        name: "Roche Holding AG",
        instrumentType: "EQUITY",
        valorNumber: "1203204",
        mic: "XSWX",
        sectorOrAssetClass: "Healthcare",
        targetValueCHF: 900_000,
        currentValueCHF: 882_300,
        driftPercent: -1.97,
        quantity: 3220,
        yahooTicker: "ROG.SW",
        priceSource: "excel",
        cioRating: "HOLD",
      },
      {
        isin: "CH0126881561",
        name: "Swiss Re AG",
        instrumentType: "EQUITY",
        valorNumber: "12688156",
        mic: "XSWX",
        sectorOrAssetClass: "Financials",
        targetValueCHF: 1_000_000,
        currentValueCHF: 1_024_600,
        driftPercent: 2.46,
        quantity: 8800,
        yahooTicker: "SREN.SW",
        priceSource: "excel",
        cioRating: "HOLD",
      },
      {
        isin: "CH0038863350",
        name: "Nestlé SA",
        instrumentType: "EQUITY",
        valorNumber: "3886335",
        mic: "XSWX",
        sectorOrAssetClass: "Consumer Staples",
        targetValueCHF: 700_000,
        currentValueCHF: 693_200,
        driftPercent: -0.97,
        quantity: 6900,
        yahooTicker: "NESN.SW",
        priceSource: "excel",
        cioRating: "HOLD",
      },
    ],
    driftBreaches: [
      { assetClass: "Financials", driftPct: 2.46 },
    ],
    conflicts: [],
    cioConflicts: [
      {
        severity: "high",
        reason:
          "CIO recommends rebalancing into US AI stocks (NVIDIA, Microsoft, Alphabet) — directly conflicts with Räber’s documented aversion to US tech exposure.",
        reasoningChain: [
          "CIO BUY recommendation includes US AI / tech equities",
          "Räber has repeatedly stated aversion to US tech exposure",
          "His mandate is Defensive — high-volatility AI stocks contradict capital-preservation goal",
          "Cultural preference for Swiss-domiciled instruments further increases resistance",
        ],
        riskType: "financial",
        suggestedSwap: {
          isin: "CH0012221716",
          name: "ABB Ltd (increase allocation)",
          reason:
            "ABB offers industrial automation / AI-adjacent exposure within Swiss-domiciled equities, matching Räber’s preferences.",
          cioRating: "BUY",
        },
      },
    ],
    summary:
      "Defensive portfolio with CHF 10.1M across 7 positions. CIO rebalancing into US AI stocks conflicts with Räber’s aversion to US tech. Swiss industrial and bond allocations are on target. Financials sector drifting above target at +2.46%.",
  },
  ammann: {
    clientId: "ammann",
    strategy: "Growth",
    totalValueCHF: 10_340_200,
    positions: [
      {
        isin: "CH0244767585",
        name: "UBS Group AG",
        instrumentType: "EQUITY",
        valorNumber: "24476758",
        mic: "XSWX",
        sectorOrAssetClass: "Financials",
        targetValueCHF: 1_200_000,
        currentValueCHF: 1_248_600,
        driftPercent: 4.05,
        quantity: 42400,
        yahooTicker: "UBSG.SW",
        priceSource: "excel",
        cioRating: "BUY",
      },
      {
        isin: "US0378331005",
        name: "Apple Inc.",
        instrumentType: "EQUITY",
        valorNumber: "908440",
        mic: "XNAS",
        sectorOrAssetClass: "Technology",
        targetValueCHF: 1_500_000,
        currentValueCHF: 1_567_200,
        driftPercent: 4.48,
        quantity: 7200,
        yahooTicker: "AAPL",
        priceSource: "excel",
        cioRating: "BUY",
      },
      {
        isin: "NL0000235190",
        name: "Airbus SE",
        instrumentType: "EQUITY",
        valorNumber: "2355619",
        mic: "XPAR",
        sectorOrAssetClass: "Industrials",
        targetValueCHF: 900_000,
        currentValueCHF: 878_400,
        driftPercent: -2.4,
        quantity: 5400,
        yahooTicker: "AIR.PA",
        priceSource: "excel",
        cioRating: "HOLD",
      },
      {
        isin: "GB00B24CGK77",
        name: "Reckitt Benckiser Group",
        instrumentType: "EQUITY",
        valorNumber: "2843764",
        mic: "XLON",
        sectorOrAssetClass: "Consumer Staples",
        targetValueCHF: 800_000,
        currentValueCHF: 812_400,
        driftPercent: 1.55,
        quantity: 11200,
        yahooTicker: "RKT.L",
        priceSource: "excel",
        cioRating: "BUY",
        dnaConflict: {
          severity: "high",
          reason:
            "Reckitt Benckiser is embroiled in a labour exploitation scandal in its Southeast Asian supply chain, posing severe reputational risk to Ammann.",
          reasoningChain: [
            "Ammann’s DNA: reputational risk is the primary concern",
            "Reckitt faces a high-profile supply chain labour exploitation scandal",
            "As a public figure, any association with the brand is a media liability",
            "Holding must be divested or swapped urgently",
          ],
          riskType: "reputational",
          suggestedSwap: {
            isin: "CH0038863350",
            name: "Nestlé SA",
            reason:
              "Nestlé has strong governance scores and Swiss domicile, aligning with Ammann’s reputation-first approach.",
            cioRating: "HOLD",
          },
        },
      },
      {
        isin: "CH0012032048",
        name: "Roche Holding AG",
        instrumentType: "EQUITY",
        valorNumber: "1203204",
        mic: "XSWX",
        sectorOrAssetClass: "Healthcare",
        targetValueCHF: 1_100_000,
        currentValueCHF: 1_084_200,
        driftPercent: -1.44,
        quantity: 3950,
        yahooTicker: "ROG.SW",
        priceSource: "excel",
        cioRating: "HOLD",
      },
      {
        isin: "XS2434891563",
        name: "Swiss Confederation Bond 1.5% 2032",
        instrumentType: "BOND",
        valorNumber: "24348915",
        mic: "XSWX",
        sectorOrAssetClass: "Government Bonds",
        targetValueCHF: 2_000_000,
        currentValueCHF: 1_982_000,
        driftPercent: -0.9,
        quantity: 20000,
        priceSource: "excel",
      },
      {
        isin: "DE0007164600",
        name: "SAP SE",
        instrumentType: "EQUITY",
        valorNumber: "716460",
        mic: "XETR",
        sectorOrAssetClass: "Technology",
        targetValueCHF: 1_300_000,
        currentValueCHF: 1_326_800,
        driftPercent: 2.06,
        quantity: 6800,
        yahooTicker: "SAP.DE",
        priceSource: "excel",
        cioRating: "BUY",
      },
      {
        isin: "FR0000121014",
        name: "LVMH Moët Hennessy",
        instrumentType: "EQUITY",
        valorNumber: "1213601",
        mic: "XPAR",
        sectorOrAssetClass: "Consumer Discretionary",
        targetValueCHF: 1_100_000,
        currentValueCHF: 1_140_600,
        driftPercent: 3.69,
        quantity: 1300,
        yahooTicker: "MC.PA",
        priceSource: "excel",
        cioRating: "BUY",
        dnaConflict: {
          severity: "low",
          reason:
            "LVMH has minor supplier-audit concerns, but no public scandal. Monitor for escalation.",
          reasoningChain: [
            "Client values ethical governance",
            "LVMH supplier audit flagged minor labour-practice gaps",
            "No public controversy yet — low severity for now",
          ],
          riskType: "reputational",
        },
      },
    ],
    driftBreaches: [
      { assetClass: "Technology", driftPct: 4.48 },
      { assetClass: "Financials", driftPct: 4.05 },
      { assetClass: "Consumer Discretionary", driftPct: 3.69 },
    ],
    conflicts: [
      {
        severity: "high" as const,
        reason:
          "Reckitt Benckiser labour exploitation scandal poses severe reputational risk.",
        reasoningChain: [
          "Client DNA: reputational risk is primary concern",
          "Reckitt faces supply chain labour exploitation scandal",
          "Public-figure client cannot afford association",
          "Urgent divestment recommended",
        ],
        riskType: "reputational" as const,
        suggestedSwap: {
          isin: "CH0038863350",
          name: "Nestlé SA",
          reason:
            "Nestlé has strong governance and Swiss domicile.",
          cioRating: "HOLD",
        },
      },
      {
        severity: "low" as const,
        reason: "LVMH has minor supplier-audit concerns to monitor.",
        reasoningChain: [
          "Client values ethical governance",
          "Minor gaps flagged in supplier audit",
          "No public scandal — monitor",
        ],
        riskType: "reputational" as const,
      },
    ],
    summary:
      "Growth portfolio with CHF 10.3M across 8 positions. High-severity reputational conflict with Reckitt Benckiser due to labour exploitation scandal. Technology and Financials sectors drifting above target. LVMH under low-level monitoring.",
  },
};

export const mockNews: Record<string, NewsDigest> = {
  schneider: {
    clientId: "schneider",
    articles: [
      {
        id: "sch-alert-1",
        title:
          "Major pharma company announces shutdown of chronic-illness research division",
        summary:
          "One of Switzerland’s leading pharmaceutical firms has announced the closure of its chronic-disease research unit, citing shifting strategic priorities towards oncology. The decision affects over 200 researchers and multiple clinical trials.",
        url: "#",
        source: "Scenario Trigger",
        sourceType: "scenario",
        publishedAt: "2026-06-20T08:00:00Z",
        sentiment: -0.7,
        sentimentLabel: "BEARISH",
        relevanceScore: 0.96,
        relevanceReason:
          "Directly impacts Schneider’s core value: chronic-illness research funding via family foundation.",
        reasoningChain: [
          "Article describes closure of chronic-disease research",
          "Schneider’s family foundation is dedicated to chronic-illness research",
          "Portfolio holds positions in the affected company",
          "Values-level conflict requires immediate attention",
        ],
        affectedPositions: ["CH0012005267"],
        isAlert: true,
        alertType: "conflict",
      },
      {
        id: "sch-2",
        title: "Swiss biotech sector attracts record venture capital in H1 2026",
        summary:
          "Swiss biotech startups raised CHF 2.4 billion in the first half of 2026, a 35% increase year-over-year, with chronic-disease treatments leading the funding boom.",
        url: "#",
        source: "Swiss Financial Times",
        sourceType: "live",
        publishedAt: "2026-06-19T14:00:00Z",
        sentiment: 0.6,
        sentimentLabel: "BULLISH",
        relevanceScore: 0.72,
        relevanceReason:
          "Positive signal for chronic-illness research ecosystem aligning with Schneider’s philanthropic interests.",
        reasoningChain: [
          "Venture capital flowing into chronic-disease treatments",
          "Aligns with Schneider’s foundation mission",
          "Potential new investment opportunities",
        ],
        affectedPositions: [],
        isAlert: false,
      },
      {
        id: "sch-3",
        title: "Roche reports strong Q2 earnings, oncology pipeline expands",
        summary:
          "Roche Holding reported earnings above consensus, driven by oncology sales. The company reaffirmed its strategic shift towards cancer therapies.",
        url: "#",
        source: "Reuters",
        sourceType: "live",
        publishedAt: "2026-06-18T09:30:00Z",
        sentiment: 0.4,
        sentimentLabel: "BULLISH",
        relevanceScore: 0.55,
        relevanceReason:
          "Relevant as a current holding; strategic shift may reduce chronic-illness research focus.",
        reasoningChain: [
          "Roche is a major portfolio holding",
          "Oncology pivot may reduce chronic-disease focus",
          "Positive financial performance but values-alignment concern",
        ],
        affectedPositions: ["CH0012032048"],
        isAlert: false,
      },
      {
        id: "sch-4",
        title: "Swiss franc strengthens against EUR amid ECB policy divergence",
        summary:
          "The Swiss franc appreciated 1.2% against the euro as the SNB held rates steady while the ECB signalled further cuts.",
        url: "#",
        source: "Bloomberg",
        sourceType: "live",
        publishedAt: "2026-06-17T16:00:00Z",
        sentiment: 0.1,
        sentimentLabel: "NEUTRAL",
        relevanceScore: 0.3,
        relevanceReason: "Currency movement affects portfolio valuation but low personal relevance.",
        reasoningChain: [
          "CHF appreciation impacts EUR-denominated holdings",
          "Low personal-values relevance",
        ],
        affectedPositions: [],
        isAlert: false,
      },
    ],
    alerts: [
      {
        id: "sch-alert-1",
        title:
          "Major pharma company announces shutdown of chronic-illness research division",
        summary:
          "One of Switzerland’s leading pharmaceutical firms has announced the closure of its chronic-disease research unit, citing shifting strategic priorities towards oncology.",
        url: "#",
        source: "Scenario Trigger",
        sourceType: "scenario",
        publishedAt: "2026-06-20T08:00:00Z",
        sentiment: -0.7,
        sentimentLabel: "BEARISH",
        relevanceScore: 0.96,
        relevanceReason:
          "Directly impacts Schneider’s core value: chronic-illness research funding.",
        reasoningChain: [
          "Closure of chronic-disease research",
          "Foundation’s mission is chronic-illness research",
          "Portfolio holds the affected company",
          "Values-level conflict",
        ],
        affectedPositions: ["CH0012005267"],
        isAlert: true,
        alertType: "conflict",
      },
    ],
    generatedAt: "2026-06-20T08:15:00Z",
  },
  huber: {
    clientId: "huber",
    articles: [
      {
        id: "hub-alert-1",
        title:
          "Global consumer goods company announces historic palm oil deforestation cut-off",
        summary:
          "A major consumer goods conglomerate has committed to eliminating all palm oil linked to deforestation from its supply chain by 2027, the most ambitious such pledge in the industry.",
        url: "#",
        source: "Scenario Trigger",
        sourceType: "scenario",
        publishedAt: "2026-06-20T07:00:00Z",
        sentiment: 0.8,
        sentimentLabel: "BULLISH",
        relevanceScore: 0.94,
        relevanceReason:
          "Directly aligns with Huber’s reforestation values — this is a positive development reinforcing his investment thesis.",
        reasoningChain: [
          "Company commits to ending palm oil deforestation",
          "Huber’s DNA prioritises reforestation",
          "Portfolio holds the company (Nestlé)",
          "Positive alignment — opportunity to reinforce values",
        ],
        affectedPositions: ["CH0038863350"],
        isAlert: true,
        alertType: "opportunity",
      },
      {
        id: "hub-2",
        title: "EU Green Bond Standard enters force, boosting sustainable debt market",
        summary:
          "The EU Green Bond Standard officially took effect, providing a unified framework that is expected to boost issuance by 40% in 2026.",
        url: "#",
        source: "Financial Times",
        sourceType: "live",
        publishedAt: "2026-06-19T11:00:00Z",
        sentiment: 0.5,
        sentimentLabel: "BULLISH",
        relevanceScore: 0.68,
        relevanceReason: "Positive for Huber’s green bond allocation.",
        reasoningChain: [
          "New standard boosts green bond market",
          "Huber holds green bond ETF",
          "Supports his ESG-compliant portfolio goal",
        ],
        affectedPositions: ["FR0010524777"],
        isAlert: false,
      },
      {
        id: "hub-3",
        title: "Equinor faces pressure from activist investors over fossil fuel strategy",
        summary:
          "Activist shareholders are demanding Equinor accelerate its renewable energy transition, citing insufficient progress towards net-zero targets.",
        url: "#",
        source: "Reuters",
        sourceType: "live",
        publishedAt: "2026-06-18T14:00:00Z",
        sentiment: -0.4,
        sentimentLabel: "BEARISH",
        relevanceScore: 0.82,
        relevanceReason:
          "Equinor is in the portfolio and conflicts with Huber’s zero fossil-fuel mandate.",
        reasoningChain: [
          "Equinor is a portfolio holding",
          "Activist pressure on fossil fuel strategy",
          "Conflicts with Huber’s sustainability values",
          "Reinforces case for divestment",
        ],
        affectedPositions: ["NO0010096985"],
        isAlert: false,
      },
      {
        id: "hub-4",
        title: "Vestas secures largest-ever offshore wind order",
        summary:
          "Vestas Wind Systems secured a 2.4 GW offshore wind turbine order, its largest contract in history, underscoring strong demand for renewable energy infrastructure.",
        url: "#",
        source: "Bloomberg",
        sourceType: "live",
        publishedAt: "2026-06-17T09:00:00Z",
        sentiment: 0.7,
        sentimentLabel: "BULLISH",
        relevanceScore: 0.71,
        relevanceReason: "Positive for Huber’s clean energy holdings.",
        reasoningChain: [
          "Vestas is a core portfolio holding",
          "Record order shows strong market demand",
          "Aligns with Huber’s clean energy values",
        ],
        affectedPositions: ["DK0060534915"],
        isAlert: false,
      },
    ],
    alerts: [
      {
        id: "hub-alert-1",
        title:
          "Global consumer goods company announces historic palm oil deforestation cut-off",
        summary:
          "A major consumer goods conglomerate has committed to eliminating all palm oil linked to deforestation from its supply chain by 2027.",
        url: "#",
        source: "Scenario Trigger",
        sourceType: "scenario",
        publishedAt: "2026-06-20T07:00:00Z",
        sentiment: 0.8,
        sentimentLabel: "BULLISH",
        relevanceScore: 0.94,
        relevanceReason:
          "Reinforces Huber’s reforestation values — opportunity.",
        reasoningChain: [
          "Palm oil deforestation cut-off announced",
          "Aligns with reforestation commitment",
          "Positive portfolio alignment",
        ],
        affectedPositions: ["CH0038863350"],
        isAlert: true,
        alertType: "opportunity",
      },
    ],
    generatedAt: "2026-06-20T07:30:00Z",
  },
  raeber: {
    clientId: "raeber",
    articles: [
      {
        id: "rae-alert-1",
        title: "CIO recommends aggressive rebalancing into US AI stocks for Q3 2026",
        summary:
          "The bank’s Chief Investment Officer has issued a BUY recommendation for US AI leaders including NVIDIA, Microsoft, and Alphabet, suggesting a 15% portfolio reallocation for Defensive mandates.",
        url: "#",
        source: "Scenario Trigger",
        sourceType: "scenario",
        publishedAt: "2026-06-20T06:00:00Z",
        sentiment: 0.3,
        sentimentLabel: "NEUTRAL",
        relevanceScore: 0.92,
        relevanceReason:
          "CIO recommendation directly conflicts with Räber’s documented aversion to US tech exposure.",
        reasoningChain: [
          "CIO issues BUY on US AI stocks for Defensive mandates",
          "Räber has repeatedly stated aversion to US tech",
          "Defensive mandate prioritises capital preservation",
          "High-volatility AI stocks contradict investment philosophy",
        ],
        affectedPositions: [],
        isAlert: true,
        alertType: "conflict",
      },
      {
        id: "rae-2",
        title: "ABB reports record orders in robotics and automation division",
        summary:
          "ABB Ltd saw a 22% surge in robotics orders, driven by European reshoring trends and demand for Swiss-engineered industrial automation solutions.",
        url: "#",
        source: "NZZ",
        sourceType: "live",
        publishedAt: "2026-06-19T10:00:00Z",
        sentiment: 0.6,
        sentimentLabel: "BULLISH",
        relevanceScore: 0.75,
        relevanceReason:
          "ABB is a core holding aligned with Räber’s Swiss precision engineering values.",
        reasoningChain: [
          "ABB is a top portfolio holding",
          "Swiss engineering success story",
          "Aligns with Räber’s industrial-sector preference",
        ],
        affectedPositions: ["CH0012221716"],
        isAlert: false,
      },
      {
        id: "rae-3",
        title: "Swiss government bond yields edge higher as SNB signals policy shift",
        summary:
          "Swiss government bond yields rose 15 basis points as the Swiss National Bank indicated a potential rate adjustment in Q3, impacting defensive portfolio positioning.",
        url: "#",
        source: "Swiss Financial Times",
        sourceType: "live",
        publishedAt: "2026-06-18T15:00:00Z",
        sentiment: -0.2,
        sentimentLabel: "NEUTRAL",
        relevanceScore: 0.58,
        relevanceReason:
          "Bond yield movement affects Räber’s significant government bond allocation.",
        reasoningChain: [
          "Räber holds CHF 3.5M in Swiss government bonds",
          "Rising yields reduce mark-to-market value",
          "Relevant for capital-preservation strategy",
        ],
        affectedPositions: ["XS2434891563"],
        isAlert: false,
      },
    ],
    alerts: [
      {
        id: "rae-alert-1",
        title: "CIO recommends aggressive rebalancing into US AI stocks for Q3 2026",
        summary:
          "The bank’s CIO has issued a BUY recommendation for US AI leaders, suggesting a 15% reallocation for Defensive mandates.",
        url: "#",
        source: "Scenario Trigger",
        sourceType: "scenario",
        publishedAt: "2026-06-20T06:00:00Z",
        sentiment: 0.3,
        sentimentLabel: "NEUTRAL",
        relevanceScore: 0.92,
        relevanceReason:
          "CIO recommendation conflicts with Räber’s US tech aversion.",
        reasoningChain: [
          "CIO BUY on US AI stocks",
          "Client aversion to US tech",
          "Defensive mandate — capital preservation priority",
        ],
        affectedPositions: [],
        isAlert: true,
        alertType: "conflict",
      },
    ],
    generatedAt: "2026-06-20T06:30:00Z",
  },
  ammann: {
    clientId: "ammann",
    articles: [
      {
        id: "amm-alert-1",
        title:
          "Labour exploitation scandal hits major consumer brand amid supply chain audit",
        summary:
          "A leading consumer goods company faces allegations of forced labour in its Southeast Asian supply chain after an NGO audit revealed systemic violations across multiple factories.",
        url: "#",
        source: "Scenario Trigger",
        sourceType: "scenario",
        publishedAt: "2026-06-20T05:00:00Z",
        sentiment: -0.85,
        sentimentLabel: "BEARISH",
        relevanceScore: 0.97,
        relevanceReason:
          "Direct reputational risk for Ammann — portfolio holds the affected company and she is a public figure.",
        reasoningChain: [
          "Major labour exploitation scandal at portfolio holding",
          "Ammann is a public figure in Swiss business media",
          "Personal association with the brand is a media liability",
          "Reputational risk is her primary concern",
          "Urgent divestment required",
        ],
        affectedPositions: ["GB00B24CGK77"],
        isAlert: true,
        alertType: "conflict",
      },
      {
        id: "amm-2",
        title: "Swiss corporate governance code updated with stricter board diversity requirements",
        summary:
          "The Swiss Code of Best Practice now mandates 40% gender diversity on boards by 2028, with enhanced transparency on executive compensation.",
        url: "#",
        source: "Swiss Business Weekly",
        sourceType: "live",
        publishedAt: "2026-06-19T08:00:00Z",
        sentiment: 0.3,
        sentimentLabel: "NEUTRAL",
        relevanceScore: 0.65,
        relevanceReason:
          "Aligns with Ammann’s governance screening requirements for portfolio positions.",
        reasoningChain: [
          "Ammann values ethical governance",
          "New governance code raises the bar",
          "May affect screening of current holdings",
        ],
        affectedPositions: [],
        isAlert: false,
      },
      {
        id: "amm-3",
        title: "SAP accelerates cloud transition with record subscription growth",
        summary:
          "SAP SE reported 28% growth in cloud subscriptions, outpacing expectations as enterprises accelerate digital transformation.",
        url: "#",
        source: "Bloomberg",
        sourceType: "live",
        publishedAt: "2026-06-18T12:00:00Z",
        sentiment: 0.6,
        sentimentLabel: "BULLISH",
        relevanceScore: 0.52,
        relevanceReason: "SAP is a core technology holding in the Growth portfolio.",
        reasoningChain: [
          "SAP is a portfolio holding",
          "Strong cloud growth positive for valuation",
          "No governance or reputational concerns",
        ],
        affectedPositions: ["DE0007164600"],
        isAlert: false,
      },
      {
        id: "amm-4",
        title: "LVMH faces renewed scrutiny over Italian supplier labour practices",
        summary:
          "Italian labour inspectors opened an investigation into working conditions at several LVMH leather goods suppliers, though no formal charges have been filed.",
        url: "#",
        source: "Reuters",
        sourceType: "live",
        publishedAt: "2026-06-17T10:00:00Z",
        sentiment: -0.3,
        sentimentLabel: "BEARISH",
        relevanceScore: 0.61,
        relevanceReason:
          "Low-level reputational concern for LVMH holding; no public scandal yet but warrants monitoring.",
        reasoningChain: [
          "LVMH is a portfolio holding",
          "Labour-practice investigation opened",
          "No formal charges — monitor for escalation",
          "Ammann sensitive to reputational risk",
        ],
        affectedPositions: ["FR0000121014"],
        isAlert: false,
      },
    ],
    alerts: [
      {
        id: "amm-alert-1",
        title:
          "Labour exploitation scandal hits major consumer brand amid supply chain audit",
        summary:
          "A leading consumer goods company faces allegations of forced labour in its Southeast Asian supply chain.",
        url: "#",
        source: "Scenario Trigger",
        sourceType: "scenario",
        publishedAt: "2026-06-20T05:00:00Z",
        sentiment: -0.85,
        sentimentLabel: "BEARISH",
        relevanceScore: 0.97,
        relevanceReason:
          "Reputational risk — Ammann holds the affected company and is a public figure.",
        reasoningChain: [
          "Labour exploitation at portfolio holding",
          "Public-figure reputational exposure",
          "Urgent divestment recommended",
        ],
        affectedPositions: ["GB00B24CGK77"],
        isAlert: true,
        alertType: "conflict",
      },
    ],
    generatedAt: "2026-06-20T05:30:00Z",
  },
};

export const mockAdvisory: Record<string, AdvisoryMessage> = {
  schneider: {
    id: "adv-schneider-001",
    clientId: "schneider",
    subject: "Urgent: Novartis Chronic-Disease Research Closure — Action Needed",
    body: `Dear Max,

I’m reaching out because a development has occurred that touches on something very close to your heart — and to the mission of the Schneider Foundation.

Novartis has announced the closure of its chronic-disease research division, redirecting resources towards oncology. I know how deeply your family’s philanthropic work is rooted in chronic-illness research, especially given your daughter’s journey. Holding a position in a company that has stepped away from this cause may feel inconsistent with the values your foundation represents.

Here is what I’d like to discuss with you:

1. **Current position:** We hold CHF 1.36M in Novartis (13.3% of portfolio). The stock is down 2.96% against target.

2. **Proposed action:** Consider rotating the Novartis position into Johnson & Johnson, which maintains one of the world’s largest chronic-disease research pipelines. J&J carries a CIO BUY rating and stays within the Healthcare allocation of your Balanced mandate.

3. **What doesn’t change:** Your overall mandate, risk profile, and strategic allocation remain exactly as they are. This is a single-position swap within the same sector.

This is a draft for your review — no action will be taken without your explicit approval. I’d welcome a conversation at your convenience.

Warm regards,
Your Advisory Team`,
    tone: "values-led",
    toneInfluences: [
      {
        dnaValue: "chronic-illness research",
        effect: "Led with personal connection to the foundation’s mission",
      },
      {
        dnaValue: "family legacy",
        effect: "Referenced daughter’s journey and generational values",
      },
    ],
    referencedAlert: "sch-alert-1",
    proposedAction:
      "Swap Novartis (CH0012005267) for Johnson & Johnson (US4781601046) within Healthcare allocation",
    reasoning:
      "Schneider’s DNA shows chronic-illness research as a foundational value (confidence: 0.98). Novartis closing its chronic-disease unit creates a direct values conflict. J&J maintains a large chronic-disease pipeline and carries a CIO BUY rating. The swap stays within the Balanced mandate’s Healthcare sector allocation. Communication uses values-led style per DNA profile, leading with personal impact before data.",
    confidence: 0.91,
    status: "draft",
    disclaimer:
      "This is an AI-generated draft for the relationship manager’s review. It does not constitute financial advice. The client’s explicit approval is required before any transaction.",
    traceId: "trace-schneider-001",
  },
  huber: {
    id: "adv-huber-001",
    clientId: "huber",
    subject: "Good News: Nestlé’s Palm Oil Commitment Strengthens Your Portfolio",
    body: `Dear Peter,

I wanted to share some genuinely encouraging news that connects directly to the work you’ve championed since your Amazon reforestation trip.

Nestlé has announced the most ambitious palm oil deforestation cut-off in the consumer goods industry — a complete elimination of deforestation-linked palm oil by 2027. This is exactly the kind of corporate transformation your investment philosophy seeks to drive.

What this means for your portfolio:

1. **Values alignment reinforced:** Your Nestlé position (CHF 1.03M) was previously flagged with a medium-severity concern over palm oil sourcing. This announcement substantially resolves that concern. The holding now aligns even better with your reforestation commitments.

2. **Remaining action item:** We still recommend swapping your Equinor position (CHF 716K) for Ørsted, a pure-play offshore wind company. Equinor remains a fossil fuel producer, which conflicts with your zero-fossil-fuel mandate.

3. **Portfolio health:** Your green bond allocation is on target, and Vestas just secured its largest-ever wind order — strong tailwinds for your clean energy thesis.

Moments like these remind us why impact-aligned investing matters. The capital you’ve deployed is helping reshape corporate behaviour.

With purpose,
Your Advisory Team`,
    tone: "values-led",
    toneInfluences: [
      {
        dnaValue: "reforestation",
        effect: "Led with connection to Amazon trip and personal mission",
      },
      {
        dnaValue: "environmental sustainability",
        effect: "Framed as evidence of impact-driven investing working",
      },
    ],
    referencedAlert: "hub-alert-1",
    proposedAction:
      "Maintain Nestlé position (conflict resolved); swap Equinor (NO0010096985) for Ørsted (DK0061539921)",
    reasoning:
      "Huber’s DNA shows reforestation (0.94) and environmental sustainability (0.97) as top values. Nestlé’s palm oil cut-off transforms a medium-severity conflict into a positive alignment. Equinor remains a high-severity conflict (fossil fuel producer). Ørsted is a BUY-rated pure-play wind company. Communication uses values-led style, emphasising impact and purpose.",
    confidence: 0.88,
    status: "draft",
    disclaimer:
      "This is an AI-generated draft for the relationship manager’s review. It does not constitute financial advice. The client’s explicit approval is required before any transaction.",
    traceId: "trace-huber-001",
  },
  raeber: {
    id: "adv-raeber-001",
    clientId: "raeber",
    subject: "CIO US AI Rebalancing Recommendation — Risk Assessment",
    body: `Dear Mr Räber,

The CIO has issued a BUY recommendation for US AI stocks (NVIDIA, Microsoft, Alphabet), suggesting a 15% reallocation for Defensive mandates. Before executing, I want to present the risk analysis.

**Key metrics:**

| Factor | US AI Basket | Current Portfolio |
|--------|-------------|------------------|
| 12-month volatility | 28.4% | 8.2% |
| Max drawdown (2025) | -18.7% | -3.1% |
| Currency exposure | 100% USD | 92% CHF/EUR |
| Sharpe ratio | 1.12 | 0.89 |

**Risk assessment:**

1. **Volatility mismatch:** US AI stocks have 3.5x the volatility of your current portfolio. Your documented maximum drawdown tolerance is 2% — the AI basket breached -18.7% in 2025.

2. **Currency risk:** A 15% USD allocation introduces CHF/USD exposure that is outside your stated comfort zone (CHF/EUR only).

3. **Concentration risk:** The AI basket is heavily concentrated in three US mega-caps, which contradicts your preference for diversified Swiss industrial exposure.

**Alternative recommendation:** If you wish to gain technology-adjacent exposure, consider increasing your ABB allocation. ABB’s robotics and automation division (which just reported record orders) provides industrial-AI exposure within a Swiss-domiciled, low-volatility framework.

No action will be taken without your explicit instruction.

Best regards,
Your Advisory Team`,
    tone: "data-driven",
    toneInfluences: [
      {
        dnaValue: "conservative investment",
        effect: "Led with quantitative risk comparison table",
      },
      {
        dnaValue: "averse to US tech exposure",
        effect: "Highlighted volatility and currency mismatch data",
      },
    ],
    referencedAlert: "rae-alert-1",
    proposedAction:
      "Decline CIO US AI rebalancing; consider increasing ABB (CH0012221716) allocation for Swiss industrial-AI exposure",
    reasoning:
      "Räber’s DNA shows US tech aversion (confidence: 0.99) and capital preservation (0.95) as dominant traits. CIO recommendation introduces 28.4% volatility vs. 8.2% current, exceeding Räber’s 2% drawdown tolerance by 9x. ABB offers AI-adjacent exposure within Swiss industrial framework. Communication uses data-driven style with tables and metrics per DNA profile.",
    confidence: 0.94,
    status: "draft",
    disclaimer:
      "This is an AI-generated draft for the relationship manager’s review. It does not constitute financial advice. The client’s explicit approval is required before any transaction.",
    traceId: "trace-raeber-001",
  },
  ammann: {
    id: "adv-ammann-001",
    clientId: "ammann",
    subject: "URGENT: Reckitt Benckiser Labour Scandal — Reputational Exposure",
    body: `Dear Clara,

I need to flag an urgent development. Reckitt Benckiser, which we hold at CHF 812K, is facing a severe labour exploitation scandal in its Southeast Asian supply chain. An NGO audit has revealed systemic forced-labour violations across multiple factories.

**Why this matters to you specifically:**

Given your public profile as chairwoman and your position on the Swiss corporate governance board, any association with a company under labour-exploitation scrutiny creates immediate media risk. This is exactly the scenario you’ve asked us to watch for.

**Recommended action:**

1. **Immediate:** Divest the Reckitt Benckiser position (GB00B24CGK77, CHF 812K). Given the scandal’s severity, we recommend executing within the next trading session.

2. **Replacement:** Rotate into Nestlé SA (CH0038863350), which has strong governance scores, Swiss domicile, and recently announced an industry-leading palm oil deforestation cut-off — reinforcing its ESG credentials.

3. **Monitor:** LVMH (CHF 1.14M) has a separate, low-level supplier audit concern in Italy. No formal charges yet, but we’re monitoring.

**Timeline matters.** If this story gains traction in Swiss media before we act, the association becomes harder to manage. I recommend we speak today.

Best regards,
Your Advisory Team`,
    tone: "balanced",
    toneInfluences: [
      {
        dnaValue: "reputational risk",
        effect: "Led with urgency and personal exposure framing",
      },
      {
        dnaValue: "corporate reputation",
        effect: "Connected portfolio decision to public-profile protection",
      },
    ],
    referencedAlert: "amm-alert-1",
    proposedAction:
      "Divest Reckitt Benckiser (GB00B24CGK77); rotate into Nestlé SA (CH0038863350). Monitor LVMH.",
    reasoning:
      "Ammann’s DNA shows reputational risk (0.98) as the dominant concern. Reckitt’s labour scandal creates direct reputational exposure for a public figure. Nestlé offers strong governance and Swiss domicile. Communication uses balanced style with urgency framing per reputational-risk DNA trait. Time-sensitivity emphasised given media exposure risk.",
    confidence: 0.93,
    status: "draft",
    disclaimer:
      "This is an AI-generated draft for the relationship manager’s review. It does not constitute financial advice. The client’s explicit approval is required before any transaction.",
    traceId: "trace-ammann-001",
  },
};
