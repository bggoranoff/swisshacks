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
  client: "#ec6608",
  asset: "#64748b",
  value: "#06b6d4",
  news: "#f59e0b",
  sector: "#8b5cf6",
  risk: "#ef4444",
};

const TYPE_LABELS: Record<string, string> = {
  client: "Client",
  value: "DNA Value",
  risk: "Risk",
  sector: "Sector",
  news: "News",
  asset: "Asset",
};

// Tiered radii by type — inner to outer
const TYPE_RADIUS: Record<string, number> = {
  client: 0,
  value: 110,
  risk: 110,
  sector: 175,
  news: 175,
  asset: 245,
};

// Which arc quadrant each type occupies (start angle, end angle in turns 0..1)
const TYPE_ARC: Record<string, [number, number]> = {
  value:  [0.55, 1.05],   // upper-left quadrant
  risk:   [1.05, 1.4],    // lower-left
  sector: [1.4,  1.85],   // lower-right
  news:   [1.85, 2.2],    // upper-right
  asset:  [0,    2],      // full circle (separate outer ring)
};

interface LayoutNode extends KGNode {
  x: number;
  y: number;
  r: number;
}

const CX = 300;
const CY = 270;

export function KnowledgeGraphPanel({ clientId }: { clientId: string | null }) {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    setGraph(null);
    setSelectedId(null);
    setLoading(true);
    fetch(`/api/clients/${clientId}/graph`)
      .then(r => r.json())
      .then(json => { if (json.success) setGraph(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const layoutNodes = useMemo<LayoutNode[]>(() => {
    if (!graph) return [];

    const groups: Record<string, KGNode[]> = {};
    graph.nodes.forEach(n => {
      if (!groups[n.type]) groups[n.type] = [];
      groups[n.type].push(n);
    });

    const result: LayoutNode[] = [];

    // Place client at center
    (groups["client"] || []).forEach(n => {
      result.push({ ...n, x: CX, y: CY, r: 20 });
    });

    // Place remaining types on their arcs
    const innerTypes = ["value", "risk", "sector", "news"];
    innerTypes.forEach(type => {
      const nodes = groups[type] || [];
      if (!nodes.length) return;
      const [a0, a1] = TYPE_ARC[type];
      const rad = TYPE_RADIUS[type];
      nodes.forEach((n, i) => {
        const frac = nodes.length === 1 ? 0.5 : i / (nodes.length - 1);
        const angle = (a0 + frac * (a1 - a0)) * Math.PI;
        result.push({
          ...n,
          x: CX + rad * Math.cos(angle),
          y: CY + rad * Math.sin(angle),
          r: type === "sector" ? 11 : 9,
        });
      });
    });

    // Assets on full outer ring
    const assets = groups["asset"] || [];
    assets.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / assets.length - Math.PI / 2;
      result.push({ ...n, x: CX + 245 * Math.cos(angle), y: CY + 245 * Math.sin(angle), r: 6 });
    });

    return result;
  }, [graph]);

  const nodeMap = useMemo(() => {
    const m: Record<string, LayoutNode> = {};
    layoutNodes.forEach(n => (m[n.id] = n));
    return m;
  }, [layoutNodes]);

  const activeId = hoveredId || selectedId;

  const selectedNode = selectedId ? nodeMap[selectedId] : null;
  const connectedIds = useMemo(() => {
    if (!activeId || !graph) return new Set<string>();
    const s = new Set<string>();
    graph.edges.forEach(e => {
      if (e.source === activeId) s.add(e.target);
      if (e.target === activeId) s.add(e.source);
    });
    return s;
  }, [activeId, graph]);

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
            viewBox="0 0 600 540"
            className="w-full h-auto"
            onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}
          >
            {/* Subtle ring guides */}
            {[110, 175, 245].map(r => (
              <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke="#1e293b" strokeWidth={1} />
            ))}

            {/* Edges */}
            {graph.edges.map((e, i) => {
              const src = nodeMap[e.source];
              const tgt = nodeMap[e.target];
              if (!src || !tgt) return null;
              const highlighted = activeId && (e.source === activeId || e.target === activeId);
              const faded = activeId && !highlighted;
              return (
                <line
                  key={i}
                  x1={src.x} y1={src.y}
                  x2={tgt.x} y2={tgt.y}
                  stroke={highlighted ? "#94a3b8" : "#1e293b"}
                  strokeWidth={highlighted ? 1.5 : 1}
                  strokeOpacity={faded ? 0.08 : highlighted ? 0.9 : 0.5}
                />
              );
            })}

            {/* Nodes */}
            {layoutNodes.map(n => {
              const color = NODE_COLORS[n.type] || "#64748b";
              const isActive = activeId === n.id;
              const isConnected = connectedIds.has(n.id);
              const faded = activeId && !isActive && !isConnected;
              const showLabel = n.type !== "asset" || isActive || isConnected;
              const labelSize = n.type === "client" ? 13 : n.type === "sector" ? 11 : 10;

              // Label position: radially outward from center
              const dx = n.x - CX;
              const dy = n.y - CY;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const labelOffset = n.r + 14;
              const lx = n.x + (dx / dist) * labelOffset;
              const ly = n.y + (dy / dist) * labelOffset;
              const anchor = dx > 10 ? "start" : dx < -10 ? "end" : "middle";
              const truncated = n.label;

              return (
                <g
                  key={n.id}
                  onMouseEnter={() => setHoveredId(n.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={e => { e.stopPropagation(); setSelectedId(selectedId === n.id ? null : n.id); }}
                  style={{ cursor: "pointer" }}
                  opacity={faded ? 0.15 : 1}
                >
                  {/* Selected ring */}
                  {selectedId === n.id && (
                    <circle cx={n.x} cy={n.y} r={n.r + 5} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.6} />
                  )}
                  <circle
                    cx={n.x} cy={n.y} r={isActive ? n.r + 2 : n.r}
                    fill={color}
                    style={{ transition: "r 0.1s" }}
                  />
                  {showLabel && (
                    <>
                      {/* Text background */}
                      <rect
                        x={anchor === "start" ? lx - 2 : anchor === "end" ? lx - truncated.length * labelSize * 0.52 - 2 : lx - truncated.length * labelSize * 0.26}
                        y={ly - labelSize - 1}
                        width={truncated.length * labelSize * 0.52 + 4}
                        height={labelSize + 4}
                        fill="#0f172a"
                        fillOpacity={0.75}
                        rx={2}
                      />
                      <text
                        x={lx} y={ly}
                        textAnchor={anchor}
                        fill={n.type === "client" ? "#ffffff" : "#cbd5e1"}
                        fontSize={labelSize}
                        fontWeight={n.type === "client" ? 700 : 400}
                      >
                        {truncated}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Selected node detail */}
          {selectedNode && (
            <div className="mx-1 mb-3 p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: NODE_COLORS[selectedNode.type] }} />
                  {selectedNode.label}
                  <span className="text-xs text-slate-500 font-normal capitalize">({TYPE_LABELS[selectedNode.type]})</span>
                </span>
                <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-slate-300 text-xs px-1">✕</button>
              </div>
              {selectedNode.type === "asset" && (
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                  {selectedNode.properties.isin && <span>ISIN: <span className="text-slate-300">{selectedNode.properties.isin}</span></span>}
                  {selectedNode.properties.value != null && <span>Value: <span className="text-slate-300">CHF {Number(selectedNode.properties.value).toLocaleString()}</span></span>}
                  {selectedNode.properties.cio_rating && <span>CIO: <span className="text-slate-300">{selectedNode.properties.cio_rating}</span></span>}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-1">{connectedIds.size} connections</p>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center pb-1">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: NODE_COLORS[type] }} />
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
