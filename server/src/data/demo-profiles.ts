import type { ClientDNA } from "../types/dna";

const DEMO_PROFILES: Record<string, ClientDNA> = {
  schneider: {
    clientId: "schneider",
    profileSource: "demo-profile",
    summary:
      "Hubertus Schneider is an emotionally driven private client whose investment decisions are deeply influenced by her family's experience with chronic illness. She runs a family foundation supporting neuro-degenerative research and expects her portfolio to reflect this mission. Purpose-alignment and transparency matter more to her than performance optimisation.",
    communicationStyle: "values-led",
    communicationProfile: {
      style: "values-led",
      rationale:
        "Schneider responds best to narratives that connect investments to her foundation's mission. Lead with impact and alignment, not performance figures.",
      confidence: 0.91,
      evidence: [],
    },
    investmentProfile: {
      riskTolerance: "medium",
      reputationSensitivity: "high",
      objectives: ["mission alignment", "capital preservation", "balanced growth"],
      hardConstraints: ["tobacco", "weapons", "companies with chronic illness clinical trial withdrawals"],
      softPreferences: ["healthcare innovation", "pharma R&D", "impact bonds"],
      exclusions: ["gambling", "alcohol"],
      positiveScreens: ["rare disease research", "neurology", "patient advocacy"],
      valueThemes: ["health legacy", "family foundation", "purpose-driven investing"],
      liquidityNeeds: ["moderate — foundation grants require annual distributions"],
      temporalChanges: [],
      evidence: [],
    },
    values: ["family legacy", "health advocacy", "purpose alignment", "transparency", "long-term impact"],
    lifeEvents: [
      "Family member diagnosed with neuro-degenerative condition",
      "Established family foundation for chronic illness research",
      "Endowed research chair at Swiss university hospital",
    ],
    businessContext: [
      "Runs a family foundation focused on chronic-illness and neuro-degenerative research",
      "Foundation makes annual grants to research institutions",
      "Sits on advisory board of two patient advocacy groups",
    ],
    riskSensitivities: [
      "pharmaceutical trial failures in target disease areas",
      "greenwashing in healthcare sector",
      "reputational damage to foundation partners",
    ],
    personalPriorities: [
      "mission-aligned portfolio",
      "transparent reporting on ESG impact",
      "quarterly foundation grant planning",
    ],
    evidence: [],
    traitConfidence: {},
  },

  huber: {
    clientId: "huber",
    profileSource: "demo-profile",
    summary:
      "Marius Huber is an impact-first investor who has made ecological outcomes the centrepiece of his wealth strategy. He finances South American reforestation projects and holds biodiversity risk and greenwashing as absolute red lines. Measurable, verifiable impact is non-negotiable — he expects rigorous third-party certification for every ESG claim in his portfolio.",
    communicationStyle: "data-driven",
    communicationProfile: {
      style: "data-driven",
      rationale:
        "Huber expects hard metrics — hectares reforested, carbon sequestered, biodiversity indices. Do not present qualitative ESG narratives without quantitative backing.",
      confidence: 0.88,
      evidence: [],
    },
    investmentProfile: {
      riskTolerance: "low",
      reputationSensitivity: "high",
      objectives: ["measurable ecological impact", "capital preservation", "ESG leadership"],
      hardConstraints: ["palm oil deforestation", "greenwashing", "biodiversity destruction", "fossil fuel extraction"],
      softPreferences: ["certified reforestation bonds", "biodiversity credits", "green infrastructure"],
      exclusions: ["mining without rehabilitation", "industrial agriculture"],
      positiveScreens: ["reforestation", "biodiversity net gain", "verified carbon removal"],
      valueThemes: ["ecological restoration", "South American conservation", "impact verification"],
      liquidityNeeds: ["low — multi-year project horizons acceptable"],
      temporalChanges: [],
      evidence: [],
    },
    values: ["ecological impact", "measurable outcomes", "biodiversity", "anti-greenwashing", "long-term stewardship"],
    lifeEvents: [
      "Co-funded a reforestation project in the Brazilian Cerrado",
      "Divested from consumer goods company following palm oil controversy",
      "Joined board of international biodiversity investment coalition",
    ],
    businessContext: [
      "Actively finances South American reforestation projects",
      "Expects third-party verification for all ESG claims",
      "Has divested from companies involved in deforestation scandals",
    ],
    riskSensitivities: [
      "supply chain deforestation exposure",
      "greenwashing certification failures",
      "biodiversity loss in portfolio companies",
    ],
    personalPriorities: [
      "verified ecological impact reporting",
      "exclusion list monitoring",
      "reforestation project pipeline",
    ],
    evidence: [],
    traitConfidence: {},
  },

  raeber: {
    clientId: "raeber",
    profileSource: "demo-profile",
    summary:
      "Eugen Räber represents a conservative Swiss couple with deep roots in precision engineering. Capital preservation and reliable dividend income are their primary objectives. They are strongly averse to US technology concentration, emerging market exposure, and speculative growth strategies. Stability and predictability define their investment philosophy.",
    communicationStyle: "data-driven",
    communicationProfile: {
      style: "data-driven",
      rationale:
        "Räber expects clear numbers: yield, dividend cover, volatility metrics. Avoid growth narratives and sector enthusiasm. Present risk-adjusted returns and drawdown scenarios.",
      confidence: 0.85,
      evidence: [],
    },
    investmentProfile: {
      riskTolerance: "low",
      reputationSensitivity: "low",
      objectives: ["capital preservation", "dividend income", "low volatility"],
      hardConstraints: ["US tech concentration", "emerging market equities", "speculative instruments", "crypto"],
      softPreferences: ["Swiss blue chips", "European dividend aristocrats", "investment-grade bonds"],
      exclusions: ["high-yield debt", "small-cap growth", "leveraged products"],
      positiveScreens: ["dividend yield > 3%", "investment-grade credit", "Swiss domiciled"],
      valueThemes: ["stability", "precision", "reliability", "Swiss quality"],
      liquidityNeeds: ["moderate — annual income distributions required"],
      temporalChanges: [],
      evidence: [],
    },
    values: ["stability", "capital preservation", "Swiss quality", "dividend reliability", "precision"],
    lifeEvents: [
      "Retired from precision engineering career",
      "Sold family business stake — capital now in portfolio",
      "Anniversary review revealed over-exposure to European banks",
    ],
    businessContext: [
      "Background in precision engineering — analytical, detail-oriented",
      "Strong preference for companies with tangible products and clear business models",
      "Distrust of technology valuations and intangible-heavy balance sheets",
    ],
    riskSensitivities: [
      "US tech sector volatility",
      "EM currency risk",
      "dividend cuts in core holdings",
      "interest rate sensitivity of bond portfolio",
    ],
    personalPriorities: [
      "quarterly dividend income statement",
      "portfolio volatility vs benchmark",
      "no new US tech exposure",
    ],
    evidence: [],
    traitConfidence: {},
  },

  ammann: {
    clientId: "ammann",
    profileSource: "demo-profile",
    summary:
      "Julian Ammann is a prominent Swiss entrepreneur for whom reputational risk and financial risk are inseparable. Any ESG controversy, labour scandal, or supply-chain misconduct in the portfolio is treated as a direct threat to his personal brand and business standing. He expects proactive monitoring and immediate escalation if a controversy emerges.",
    communicationStyle: "values-led",
    communicationProfile: {
      style: "values-led",
      rationale:
        "Ammann frames portfolio decisions through the lens of reputation. Lead with brand and ESG risk narrative. Present financial metrics in service of the reputational argument, not the other way around.",
      confidence: 0.89,
      evidence: [],
    },
    investmentProfile: {
      riskTolerance: "medium",
      reputationSensitivity: "high",
      objectives: ["reputation-clean growth", "ESG leadership", "long-term brand alignment"],
      hardConstraints: ["labour exploitation", "supply chain scandal", "ESG controversy", "corporate governance failures"],
      softPreferences: ["Swiss corporate governance leaders", "ESG-rated growth companies", "transparent supply chains"],
      exclusions: ["companies with active labour violations", "governance controversies", "opacity on supply chain"],
      positiveScreens: ["verified ESG ratings", "transparent governance", "Swiss corporate leaders"],
      valueThemes: ["reputation", "brand integrity", "ethical business", "Swiss standards"],
      liquidityNeeds: ["high — active business investments require flexible liquidity"],
      temporalChanges: [],
      evidence: [],
    },
    values: ["reputation integrity", "ethical business practice", "brand protection", "ESG leadership", "Swiss values"],
    lifeEvents: [
      "Built and partially exited a Swiss industrial group",
      "Named in ESG investor coalition for Swiss corporate governance reform",
      "Previous portfolio company involved in supply-chain controversy — swift divestment",
    ],
    businessContext: [
      "Prominent Swiss entrepreneur with high public profile",
      "Active investor in Swiss growth companies",
      "Serves on governance committees of two listed Swiss firms",
    ],
    riskSensitivities: [
      "labour exploitation in portfolio supply chains",
      "governance controversies in held companies",
      "ESG ratings downgrades",
      "media coverage of portfolio companies",
    ],
    personalPriorities: [
      "real-time ESG controversy monitoring",
      "quarterly governance review",
      "immediate escalation protocol for reputational threats",
    ],
    evidence: [],
    traitConfidence: {},
  },
};

export function getDemoDNAProfile(clientId: string): ClientDNA | null {
  return DEMO_PROFILES[clientId] ?? null;
}
