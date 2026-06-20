export interface KGNode {
  id: string;
  type: "client" | "asset" | "value" | "news" | "sector" | "risk";
  label: string;
  properties: Record<string, any>;
}

export interface KGEdge {
  source: string;
  target: string;
  type: "holds" | "values" | "conflicts_with" | "aligns_with" | "belongs_to" | "triggers" | "sensitive_to";
  weight: number;
  label?: string;
}

export interface KnowledgeGraph {
  nodes: KGNode[];
  edges: KGEdge[];
}

class KnowledgeGraphService {
  buildClientGraph(clientId: string, dna: any, portfolio: any, news: any): KnowledgeGraph {
    const nodes: KGNode[] = [];
    const edges: KGEdge[] = [];

    nodes.push({
      id: `client-${clientId}`,
      type: "client",
      label: clientId,
      properties: { strategy: portfolio?.strategy, communicationStyle: dna?.communicationStyle },
    });

    (dna?.values || []).forEach((v: string, i: number) => {
      const nodeId = `value-${i}`;
      nodes.push({ id: nodeId, type: "value", label: v, properties: {} });
      edges.push({ source: `client-${clientId}`, target: nodeId, type: "values", weight: 0.8 });
    });

    (dna?.riskSensitivities || []).forEach((r: string, i: number) => {
      const nodeId = `risk-${i}`;
      nodes.push({ id: nodeId, type: "risk", label: r, properties: {} });
      edges.push({ source: `client-${clientId}`, target: nodeId, type: "sensitive_to", weight: 0.9 });
    });

    const positions = (portfolio?.positions || [])
      .sort((a: any, b: any) => b.currentValueCHF - a.currentValueCHF)
      .slice(0, 15);

    const sectors = new Set<string>();
    positions.forEach((p: any) => {
      const sectorId = `sector-${(p.sectorOrAssetClass || "other").replace(/\s+/g, "-").toLowerCase()}`;
      if (!sectors.has(sectorId)) {
        sectors.add(sectorId);
        nodes.push({ id: sectorId, type: "sector", label: p.sectorOrAssetClass || "Other", properties: {} });
      }
      const assetId = `asset-${p.isin}`;
      nodes.push({ id: assetId, type: "asset", label: p.name, properties: { isin: p.isin, valueCHF: p.currentValueCHF, cioRating: p.cioRating } });
      edges.push({ source: `client-${clientId}`, target: assetId, type: "holds", weight: p.currentValueCHF / 10000000 });
      edges.push({ source: assetId, target: sectorId, type: "belongs_to", weight: 0.5 });
    });

    const alerts = news?.alerts || [];
    alerts.forEach((a: any, i: number) => {
      const newsId = `news-${i}`;
      nodes.push({ id: newsId, type: "news", label: (a.title || "News").slice(0, 60), properties: { sentiment: a.sentiment, alertType: a.alertType } });
      if (a.alertType === "conflict") {
        edges.push({ source: newsId, target: `client-${clientId}`, type: "conflicts_with", weight: a.relevanceScore || 0.7 });
      } else {
        edges.push({ source: newsId, target: `client-${clientId}`, type: "aligns_with", weight: a.relevanceScore || 0.7 });
      }
    });

    return { nodes, edges };
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
