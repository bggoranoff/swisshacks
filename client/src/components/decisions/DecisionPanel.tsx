import { useState, useEffect } from "react";
import { Brain, ChevronDown, Database } from "lucide-react";
import { Card, CardTitle } from "../shared/Card";
import clsx from "clsx";

interface ExplainableDecision {
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
  dataSources: { name: string; type: string; reference: string }[];
}

const AGENT_COLORS: Record<string, string> = {
  "crm-agent": "bg-blue-900/50 text-blue-300",
  "message-agent": "bg-amber-900/50 text-amber-300",
  "news-agent": "bg-purple-900/50 text-purple-300",
  "portfolio-agent": "bg-green-900/50 text-green-300",
};

const SOURCE_COLORS: Record<string, string> = {
  crm: "bg-blue-900/50 text-blue-300",
  six: "bg-red-900/50 text-red-300",
  news: "bg-purple-900/50 text-purple-300",
  cio: "bg-green-900/50 text-green-300",
  llm: "bg-cyan-900/50 text-cyan-300",
};

export function DecisionPanel() {
  const [decisions, setDecisions] = useState<ExplainableDecision[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/decisions")
      .then(r => r.json())
      .then(json => {
        if (json.success) setDecisions(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetch("/api/decisions")
        .then(r => r.json())
        .then(json => {
          if (json.success) setDecisions(json.data);
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && decisions.length === 0) {
    return (
      <Card colSpan2>
        <CardTitle icon={Brain}>AI Decision Log (NTT DATA Pattern)</CardTitle>
        <p className="text-sm text-slate-500 italic py-4 text-center">Loading decisions...</p>
      </Card>
    );
  }

  return (
    <Card colSpan2>
      <CardTitle icon={Brain}>AI Decision Log (NTT DATA Pattern)</CardTitle>
      {decisions.length === 0 ? (
        <p className="text-sm text-slate-500 italic py-4 text-center">
          No AI decisions recorded yet. Generate a DNA profile or advisory to see decisions appear.
        </p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {decisions.map(d => (
            <div key={d.id} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/50">
              <div className="flex items-center gap-2 mb-1">
                <span className={clsx("text-xs px-2 py-0.5 rounded-full font-mono", AGENT_COLORS[d.agent] || "bg-slate-700 text-slate-300")}>
                  {d.agent}
                </span>
                <span className="text-xs text-slate-400">{d.decisionType}</span>
                <span className="text-xs text-slate-500 ml-auto">
                  {new Date(d.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <p className="text-sm text-slate-300 mt-1">{d.output.summary}</p>

              <button
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer mt-2 hover:text-slate-300 transition-colors"
              >
                <ChevronDown className={clsx("h-3 w-3 transition-transform", expanded === d.id && "rotate-180")} />
                {expanded === d.id ? "Hide reasoning" : "Show reasoning"}
              </button>

              {expanded === d.id && (
                <div className="mt-2 pl-4 border-l-2 border-slate-600 space-y-2">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Input</p>
                    <p className="text-xs text-slate-300">{d.input.summary}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Reasoning Steps</p>
                    <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
                      {d.reasoning.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>

                  {d.reasoning.alternatives && d.reasoning.alternatives.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Alternatives Considered</p>
                      <div className="space-y-1">
                        {d.reasoning.alternatives.map((alt, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-slate-300">{alt.option}</span>
                            <span className="text-slate-500">— {alt.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Data Sources</p>
                    <div className="flex flex-wrap gap-1">
                      {d.dataSources.map((src, i) => (
                        <span key={i} className={clsx("text-xs px-2 py-0.5 rounded-full flex items-center gap-1", SOURCE_COLORS[src.type] || "bg-slate-700 text-slate-300")}>
                          <Database className="h-3 w-3" />
                          {src.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
