export interface ExplainableDecision {
  id: string;
  timestamp: string;
  agent: string;
  decisionType: string;
  input: { summary: string; details?: Record<string, any> };
  output: { summary: string; details?: Record<string, any> };
  reasoning: {
    steps: string[];
    confidence: number;
    alternatives?: { option: string; reason: string; score: number }[];
  };
  dataSources: { name: string; type: "crm" | "six" | "news" | "cio" | "llm"; reference: string }[];
  humanOverride?: { action: string; by: string; timestamp: string };
}

class ExplainabilityService {
  private decisions: ExplainableDecision[] = [];

  record(decision: Omit<ExplainableDecision, "id" | "timestamp">): ExplainableDecision {
    const full: ExplainableDecision = {
      ...decision,
      id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.decisions.unshift(full);
    if (this.decisions.length > 200) this.decisions.pop();
    return full;
  }

  getDecisions(limit = 50): ExplainableDecision[] {
    return this.decisions.slice(0, limit);
  }

  getDecisionsByAgent(agent: string): ExplainableDecision[] {
    return this.decisions.filter(d => d.agent === agent);
  }

  getDecision(id: string): ExplainableDecision | undefined {
    return this.decisions.find(d => d.id === id);
  }
}

export const explainabilityService = new ExplainabilityService();
