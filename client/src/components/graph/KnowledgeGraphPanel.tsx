import { useState, useEffect, useMemo } from "react";
import { Network } from "lucide-react";
import { Card, CardTitle } from "../shared/Card";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { EmptyState } from "../shared/EmptyState";

interface KGNode {
  id: string;
  type: "client" | "asset" | "value" | "news" | "sector" | "risk";
  label: string;
  properties: Record<string, any>;
}

interface KGEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

interface KnowledgeGraph {
  nodes: KGNode[];
  edges: KGEdge[];
}

const NODE_COLORS: Record<string, string> = {
  client: "#3b82f6",
  asset: "#64748b",
  value: "#06b6d4",
  news: "#f59e0b",
  sector: "#8b5cf6",
  risk: "#ef4444",
};

const NODE_RADIUS: Record<string, number> = {
  client: 18,
  asset: 8,
  value: 10,
  news: 10,
  sector: 12,
  risk: 10,
};

interface LayoutNode extends KGNode {
  x: number;
  y: number;
}

export function KnowledgeGraphPanel({ clientId }: { clientId: string | null }) {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    fetch(`/api/clients/${clientId}/graph`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setGraph(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const layoutNodes = useMemo(() => {
    if (!graph) return [];
    const cx = 260;
    const cy = 200;

    // Group nodes by type for a clustered circular layout
    const groups: Record<string, KGNode[]> = {};
    graph.nodes.forEach((n) => {
      if (!groups[n.type]) groups[n.type] = [];
      groups[n.type].push(n);
    });

    const typeOrder = ["client", "value", "risk", "sector", "asset", "news"];
    const result: LayoutNode[] = [];
    let globalIndex = 0;
    const total = graph.nodes.length;

    typeOrder.forEach((type) => {
      const nodesOfType = groups[type] || [];
      nodesOfType.forEach((n) => {
        const angle = (2 * Math.PI * globalIndex) / total - Math.PI / 2;
        const radius = n.type === "client" ? 0 : 130 + (n.type === "asset" ? 30 : 0);
        result.push({
          ...n,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
        });
        globalIndex++;
      });
    });

    return result;
  }, [graph]);

  const nodeMap = useMemo(() => {
    const map: Record<string, LayoutNode> = {};
    layoutNodes.forEach((n) => (map[n.id] = n));
    return map;
  }, [layoutNodes]);

  if (!clientId) return null;

  return (
    <Card>
      <CardTitle icon={Network}>Knowledge Graph</CardTitle>
      {loading ? (
        <LoadingSpinner />
      ) : !graph || graph.nodes.length === 0 ? (
        <EmptyState message="No graph data available" />
      ) : (
        <div>
          <svg
            viewBox="0 0 520 400"
            className="w-full h-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedNode(null);
            }}
          >
            {/* Edges */}
            {graph.edges.map((e, i) => {
              const src = nodeMap[e.source];
              const tgt = nodeMap[e.target];
              if (!src || !tgt) return null;
              const activeNode = hoveredNode || selectedNode;
              const isHighlighted =
                activeNode === e.source || activeNode === e.target;
              return (
                <line
                  key={i}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isHighlighted ? "#94a3b8" : "#334155"}
                  strokeWidth={isHighlighted ? 1.5 : 0.8}
                  strokeOpacity={activeNode && !isHighlighted ? 0.15 : 0.6}
                />
              );
            })}
            {/* Nodes */}
            {layoutNodes.map((n) => {
              const r = NODE_RADIUS[n.type] || 8;
              const fill = NODE_COLORS[n.type] || "#64748b";
              const activeNode = hoveredNode || selectedNode;
              const isActive = activeNode === n.id;
              const isSelected = selectedNode === n.id;
              const dimmed = activeNode && !isActive &&
                !graph.edges.some(
                  (e) =>
                    (e.source === activeNode && e.target === n.id) ||
                    (e.target === activeNode && e.source === n.id)
                );
              return (
                <g
                  key={n.id}
                  onMouseEnter={() => setHoveredNode(n.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(selectedNode === n.id ? null : n.id);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {isSelected && (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r + 5}
                      fill="none"
                      stroke={fill}
                      strokeWidth={1.5}
                      strokeOpacity={0.5}
                    />
                  )}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={isActive ? r + 2 : r}
                    fill={fill}
                    opacity={dimmed ? 0.2 : 1}
                  />
                  {(isActive || n.type === "client" || n.type === "sector") && (
                    <text
                      x={n.x}
                      y={n.y + r + 12}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize={n.type === "client" ? 11 : 9}
                      fontWeight={n.type === "client" ? 600 : 400}
                      opacity={dimmed ? 0.2 : 1}
                    >
                      {n.label.length > 25 ? n.label.slice(0, 22) + "…" : n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {/* Selected node info panel */}
          {selectedNode && nodeMap[selectedNode] && (() => {
            const node = nodeMap[selectedNode];
            const connectedEdges = graph.edges.filter(
              (e) => e.source === selectedNode || e.target === selectedNode
            );
            return (
              <div className="mx-2 mb-2 p-3 bg-slate-800/80 border border-slate-700 rounded-lg text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200 flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: NODE_COLORS[node.type] || "#64748b" }}
                    />
                    {node.label}
                  </span>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-slate-500 hover:text-slate-300 text-xs px-1"
                  >
                    x
                  </button>
                </div>
                <span className="text-xs text-slate-500 capitalize">{node.type}</span>
                {node.type === "asset" && (
                  <div className="mt-1.5 space-y-0.5 text-xs text-slate-400">
                    {node.properties.isin && (
                      <div>ISIN: <span className="text-slate-300">{node.properties.isin}</span></div>
                    )}
                    {node.properties.value != null && (
                      <div>Value: <span className="text-slate-300">{typeof node.properties.value === "number" ? node.properties.value.toLocaleString() : node.properties.value}</span></div>
                    )}
                    {node.properties.cio_rating && (
                      <div>CIO Rating: <span className="text-slate-300">{node.properties.cio_rating}</span></div>
                    )}
                  </div>
                )}
                {node.type === "news" && node.properties.title && (
                  <div className="mt-1.5 text-xs text-slate-300">
                    {node.properties.title}
                  </div>
                )}
                {(node.type === "value" || node.type === "risk") && (
                  <div className="mt-1.5 text-xs text-slate-400">
                    Connected edges: <span className="text-slate-300">{connectedEdges.length}</span>
                    {connectedEdges.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {connectedEdges.slice(0, 5).map((edge, i) => {
                          const otherId = edge.source === selectedNode ? edge.target : edge.source;
                          const otherNode = nodeMap[otherId];
                          return (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-700/60 rounded text-slate-300">
                              {otherNode ? (otherNode.label.length > 20 ? otherNode.label.slice(0, 17) + "..." : otherNode.label) : otherId}
                            </span>
                          );
                        })}
                        {connectedEdges.length > 5 && (
                          <span className="px-1.5 py-0.5 text-slate-500">+{connectedEdges.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-slate-400 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
