import type { ScoredNewsArticle } from "../types/news";

export const SCENARIO_TRIGGERS: Record<string, ScoredNewsArticle> = {
  schneider: {
    id: "scenario-schneider-1",
    title: "Novartis shuts down rare-disease research division amid cost pressures",
    summary:
      "Novartis announced the closure of its chronic illness and neuro-degenerative research unit, citing declining R&D returns. The move affects over 400 researchers and halts several late-stage trials.",
    url: "https://example.com/novartis-research-shutdown",
    source: "Reuters",
    sourceType: "scenario",
    publishedAt: new Date().toISOString(),
    sentiment: -0.8,
    sentimentLabel: "BEARISH",
    relevanceScore: 0.97,
    relevanceReason:
      "Client runs a family foundation for chronic-illness and neuro-degenerative research; this directly threatens foundation mission alignment.",
    reasoningChain: [
      "Client has family foundation focused on chronic-illness research",
      "Novartis closure affects neuro-degenerative research pipeline",
      "Portfolio may hold Novartis exposure — review required",
    ],
    affectedPositions: ["NVS"],
    isAlert: true,
    alertType: "conflict",
  },
  huber: {
    id: "scenario-huber-1",
    title: "Unilever commits to zero-deforestation palm oil supply chain by 2026",
    summary:
      "Unilever has announced a historic commitment to eliminate palm oil deforestation from its supply chain, partnering with South American reforestation coalitions to offset historical damage.",
    url: "https://example.com/unilever-deforestation-pledge",
    source: "Financial Times",
    sourceType: "scenario",
    publishedAt: new Date().toISOString(),
    sentiment: 0.75,
    sentimentLabel: "BULLISH",
    relevanceScore: 0.95,
    relevanceReason:
      "Client is an environmentalist actively financing South American reforestation; this announcement aligns with portfolio values and creates a positive screen opportunity.",
    reasoningChain: [
      "Client holds biodiversity and greenwashing as hard red lines",
      "Unilever commitment directly addresses palm oil deforestation",
      "Potential to add Unilever as positive-screen position",
    ],
    affectedPositions: ["ULVR"],
    isAlert: true,
    alertType: "opportunity",
  },
  raeber: {
    id: "scenario-raeber-1",
    title: "SIX CIO recommends rotating blue-chip defensives into US AI growth stocks",
    summary:
      "The SIX investment committee has updated its quarterly outlook, recommending a tactical shift from European blue-chip equities toward US large-cap technology and AI infrastructure names.",
    url: "https://example.com/six-cio-ai-rotation",
    source: "SIX Group Research",
    sourceType: "scenario",
    publishedAt: new Date().toISOString(),
    sentiment: -0.4,
    sentimentLabel: "BEARISH",
    relevanceScore: 0.93,
    relevanceReason:
      "Client is strongly averse to US tech concentration and EM exposure; CIO recommendation directly conflicts with stated investment constraints.",
    reasoningChain: [
      "Client prioritises capital preservation and dividend income",
      "CIO rotation into US AI contradicts hard constraint on US tech",
      "Recommend discussing mandate divergence with client before rebalancing",
    ],
    affectedPositions: [],
    isAlert: true,
    alertType: "conflict",
  },
  ammann: {
    id: "scenario-ammann-1",
    title: "Labour exploitation scandal rocks major consumer brand in SIX portfolios",
    summary:
      "A leading consumer goods brand held across several SIX portfolios has been implicated in a labour exploitation scandal affecting its Southeast Asian supply chain.",
    url: "https://example.com/consumer-brand-scandal",
    source: "Bloomberg",
    sourceType: "scenario",
    publishedAt: new Date().toISOString(),
    sentiment: -0.9,
    sentimentLabel: "BEARISH",
    relevanceScore: 0.98,
    relevanceReason:
      "Client treats ESG controversy as a direct threat to personal brand and business standing; immediate portfolio review required.",
    reasoningChain: [
      "Client is a prominent Swiss entrepreneur — reputational risk = financial risk",
      "Supply-chain scandal is an ESG red line",
      "Recommend immediate divestment discussion to protect client reputation",
    ],
    affectedPositions: [],
    isAlert: true,
    alertType: "conflict",
  },
};

export const PERSONA_KEYWORDS: Record<string, string[]> = {
  schneider: [
    "chronic illness research",
    "neuro-degenerative disease",
    "pharmaceutical research",
    "family foundation healthcare",
    "rare disease funding",
  ],
  huber: [
    "South America reforestation",
    "palm oil deforestation",
    "biodiversity investment",
    "ESG greenwashing",
    "impact investing environment",
  ],
  raeber: [
    "Swiss blue chip dividend",
    "capital preservation bond",
    "US tech bubble",
    "European value stocks",
    "defensive portfolio strategy",
  ],
  ammann: [
    "ESG controversy supply chain",
    "labour exploitation scandal",
    "corporate reputation risk",
    "Swiss entrepreneur portfolio",
    "reputational ESG screening",
  ],
};
