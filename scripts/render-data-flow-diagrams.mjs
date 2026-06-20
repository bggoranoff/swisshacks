import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outDir = resolve("docs/assets");
mkdirSync(outDir, { recursive: true });

const palette = {
  bg: "#0f172a",
  text: "#e2e8f0",
  muted: "#cbd5e1",
  dim: "#94a3b8",
  line: "#e2e8f0",
  panel: { fill: "#162033", stroke: "#64748b", label: "UI panel" },
  api: { fill: "#0f3b57", stroke: "#38bdf8", label: "Route/API" },
  workbook: { fill: "#143322", stroke: "#22c55e", label: "Workbook" },
  external: { fill: "#3b2507", stroke: "#f59e0b", label: "External API" },
  llm: { fill: "#3b0764", stroke: "#c084fc", label: "LLM step" },
  deterministic: { fill: "#172033", stroke: "#94a3b8", label: "Code step" },
  demo: { fill: "#4a1d1d", stroke: "#fb7185", label: "Demo/mock" },
  route: { fill: "#082f49", stroke: "#38bdf8", label: "Route/API" },
  output: { fill: "#1f2937", stroke: "#a3e635", label: "Output" },
};

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(text, maxChars) {
  const lines = [];
  for (const rawLine of String(text).split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

function textBlock({ text, x, y, maxChars, size = 22, weight = 600, fill = palette.text, anchor = "start", lineHeight }) {
  const lines = wrap(text, maxChars);
  const lh = lineHeight ?? Math.round(size * 1.28);
  return {
    height: lines.length * lh,
    svg: lines.map((line, index) => (
      `<text x="${x}" y="${y + index * lh}" text-anchor="${anchor}" ` +
      `font-size="${size}" font-weight="${weight}" fill="${fill}" ` +
      `font-family="Inter, Arial, sans-serif">${esc(line)}</text>`
    )).join("\n"),
  };
}

function pill(label, x, y, colors) {
  const width = Math.max(86, label.length * 8 + 28);
  return `
    <rect x="${x}" y="${y}" width="${width}" height="30" rx="15" fill="#020617" stroke="${colors.stroke}" stroke-width="2" opacity="0.92"/>
    <text x="${x + width / 2}" y="${y + 21}" text-anchor="middle" font-size="14" font-weight="800" fill="${colors.stroke}" font-family="Inter, Arial, sans-serif">${esc(label)}</text>
  `;
}

function node(n) {
  const colors = palette[n.kind] || palette.deterministic;
  const radius = n.radius ?? 18;
  const pad = n.pad ?? 26;
  const titleX = n.step ? n.x + 72 : n.x + pad;
  const titleY = n.y + 45;
  const title = textBlock({
    text: n.label,
    x: titleX,
    y: titleY,
    maxChars: n.maxChars || 34,
    size: n.fontSize || 25,
    weight: n.weight || 800,
    fill: palette.text,
  });
  const noteY = titleY + title.height + 14;
  const note = n.note ? textBlock({
    text: n.note,
    x: n.x + pad,
    y: noteY,
    maxChars: n.noteMaxChars || n.maxChars || 46,
    size: n.noteSize || 18,
    weight: 500,
    fill: palette.muted,
    lineHeight: n.noteLineHeight || 24,
  }) : { svg: "" };
  const step = n.step ? `
    <circle cx="${n.x + 38}" cy="${n.y + 38}" r="24" fill="${colors.stroke}" opacity="0.95"/>
    <text x="${n.x + 38}" y="${n.y + 47}" text-anchor="middle" font-size="24" font-weight="900" fill="#020617" font-family="Inter, Arial, sans-serif">${esc(n.step)}</text>
  ` : "";
  const tag = n.tag ? pill(n.tag, n.x + n.w - Math.max(110, n.tag.length * 8 + 28) - 18, n.y + 18, colors) : "";
  const divider = n.note ? `<line x1="${n.x + pad}" y1="${noteY - 10}" x2="${n.x + n.w - pad}" y2="${noteY - 10}" stroke="${colors.stroke}" stroke-width="2" opacity="0.45"/>` : "";
  return `
    <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${radius}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="3.5"/>
    ${step}
    ${tag}
    ${title.svg}
    ${divider}
    ${note.svg}
  `;
}

function sidePoint(n, side) {
  if (side === "left") return { x: n.x, y: n.y + n.h / 2 };
  if (side === "right") return { x: n.x + n.w, y: n.y + n.h / 2 };
  if (side === "top") return { x: n.x + n.w / 2, y: n.y };
  return { x: n.x + n.w / 2, y: n.y + n.h };
}

function edge(nodesById, e) {
  const a = sidePoint(nodesById[e.from], e.fromSide || "right");
  const b = sidePoint(nodesById[e.to], e.toSide || "left");
  const dash = e.dashed ? ` stroke-dasharray="16 12"` : "";
  const stroke = e.color || palette.line;
  const label = e.label && e.showLabel ? `
    <text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 13}" text-anchor="middle" font-size="16" font-weight="800" fill="${palette.muted}" font-family="Inter, Arial, sans-serif">${esc(e.label)}</text>
  ` : "";
  const defaultOpacity = e.dashed ? 0.5 : 0.32;
  return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${stroke}" stroke-width="${e.width || 3.5}" stroke-linecap="round" opacity="${e.opacity || defaultOpacity}"${dash}/>${label}`;
}

function heading(text, x, y, width) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="54" rx="16" fill="#020617" stroke="#334155" stroke-width="2"/>
    <text x="${x + 24}" y="${y + 36}" font-size="24" font-weight="900" fill="${palette.text}" font-family="Inter, Arial, sans-serif">${esc(text)}</text>
  `;
}

function legend(x, y) {
  const items = [
    ["Local workbook", "workbook"],
    ["External API", "external"],
    ["Phoeniqs LLM call", "llm"],
    ["Deterministic code", "deterministic"],
    ["Route/API response", "route"],
    ["Demo/mock/hardcoded", "demo"],
  ];
  return `
    <g>
      ${items.map(([label, kind], i) => {
        const colors = palette[kind];
        const yy = y + i * 40;
        return `<rect x="${x}" y="${yy}" width="28" height="24" rx="6" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.5"/>
          <text x="${x + 42}" y="${yy + 19}" font-size="19" fill="${palette.text}" font-family="Inter, Arial, sans-serif">${esc(label)}</text>`;
      }).join("\n")}
    </g>
  `;
}

function renderSvg({ title, subtitle, width, height, nodes, edges, headings = [] }) {
  const nodesById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
  </defs>
  <rect width="${width}" height="${height}" fill="${palette.bg}"/>
  <text x="70" y="82" font-size="46" font-weight="900" fill="${palette.text}" font-family="Inter, Arial, sans-serif">${esc(title)}</text>
  <text x="70" y="126" font-size="24" fill="${palette.dim}" font-family="Inter, Arial, sans-serif">${esc(subtitle)}</text>
  ${legend(width - 520, 58)}
  <g>
    ${headings.map((h) => heading(h.text, h.x, h.y, h.w)).join("\n")}
  </g>
  <g>
    ${edges.map((e) => edge(nodesById, e)).join("\n")}
  </g>
  <g>
    ${nodes.map(node).join("\n")}
  </g>
</svg>`;
}

function writeDiagram(name, config) {
  const svgPath = resolve(outDir, `${name}.svg`);
  const pngPath = resolve(outDir, `${name}.png`);
  writeFileSync(svgPath, renderSvg(config));
  execFileSync("magick", [svgPath, "-density", "180", "-quality", "95", pngPath], { stdio: "inherit" });
  console.log(`Wrote ${svgPath}`);
  console.log(`Wrote ${pngPath}`);
}

writeDiagram("frontend-panel-flow", {
  title: "Frontend Panel Flow With Data Steps",
  subtitle: "For each visible panel: what data enters, what code/API transforms it, and what the user sees.",
  width: 3200,
  height: 2250,
  headings: [
    { text: "Browser state and orchestration", x: 70, y: 190, w: 490 },
    { text: "Backend calls made by the app", x: 680, y: 190, w: 560 },
    { text: "Visible panels and displayed output", x: 1410, y: 190, w: 640 },
    { text: "Demo, mock, and hardcoded paths", x: 2260, y: 190, w: 640 },
  ],
  nodes: [
    {
      id: "app",
      step: "0",
      tag: "CODE",
      label: "App.tsx shared state",
      note: "Keeps selectedClientId, loaded DNA/news/portfolio, approvedAlertId, language, drawers, and advisory draft. Passes API results into child panels as props.",
      x: 70,
      y: 320,
      w: 490,
      h: 215,
      kind: "deterministic",
      maxChars: 31,
      noteMaxChars: 47,
    },
    {
      id: "clientsApi",
      step: "1",
      tag: "GET",
      label: "/api/clients",
      note: "In: page load. Does: reads in-memory clients from parsed CRM workbook. Out: sidebar list, selected client metadata, optional scenario trigger metadata.",
      x: 680,
      y: 285,
      w: 560,
      h: 175,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "dnaApi",
      step: "2",
      tag: "GET",
      label: "/api/clients/:id/dna",
      note: "In: selected client id. Does: asks backend to infer ClientDNA from CRM notes or demo profile. Out: values, sensitivities, investment profile, communication style.",
      x: 680,
      y: 510,
      w: 560,
      h: 190,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "portfolioApi",
      step: "3",
      tag: "GET",
      label: "/api/clients/:id/portfolio",
      note: "In: selected client id. Does: joins portfolio workbook data, CIO ratings, SIX price enrichment, and conflict detection. Out: holdings, allocation drift, conflicts.",
      x: 680,
      y: 750,
      w: 560,
      h: 190,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "newsApi",
      step: "4",
      tag: "GET",
      label: "/api/clients/:id/news",
      note: "In: selected client id plus inferred investment profile. Does: fetches live news, optionally prepends scenario events, then scores relevance. Out: sorted news digest and alert candidates.",
      x: 680,
      y: 990,
      w: 560,
      h: 215,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "advisoryApi",
      step: "5",
      tag: "POST",
      label: "/api/clients/:id/advisory",
      note: "In: alert id, language, optional conflict ISIN. Does: builds prompt from DNA, portfolio, selected alert, communication style. Out: draft advisory message for RM review.",
      x: 680,
      y: 1265,
      w: 560,
      h: 205,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "graphApi",
      step: "6",
      tag: "GET",
      label: "/api/clients/:id/graph",
      note: "In: selected client id. Does: combines already-computed DNA, portfolio, and news into nodes and edges. Out: deterministic relationship graph.",
      x: 680,
      y: 1530,
      w: 560,
      h: 175,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "chatApi",
      step: "7",
      tag: "GET/POST",
      label: "/api/clients/:id/chat",
      note: "In: RM message and client id. Does: builds fixed client context plus recent chat history. Out: assistant response and updated in-memory history.",
      x: 680,
      y: 1765,
      w: 560,
      h: 175,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "logsApi",
      step: "8",
      tag: "GET",
      label: "/api/decisions, /api/audit, /api/traces",
      note: "In: drawer/panel open. Does: returns in-memory logs written by the LLM and orchestration steps. Out: decision cards, audit drawer, trace drawer.",
      x: 680,
      y: 2000,
      w: 560,
      h: 175,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "sidebar",
      tag: "PANEL",
      label: "Sidebar + header",
      note: "Shows client list, selected profile, strategy bucket from workbook mapping, and optional trigger text if scenario mode is enabled.",
      x: 1410,
      y: 285,
      w: 610,
      h: 175,
      kind: "panel",
      noteMaxChars: 58,
    },
    {
      id: "dna",
      tag: "PANEL",
      label: "DNA panel",
      note: "Displays inferred client values, sensitivities, investment preferences, communication style, confidence, and evidence from CRM entries.",
      x: 1410,
      y: 510,
      w: 610,
      h: 190,
      kind: "panel",
      noteMaxChars: 58,
    },
    {
      id: "portfolio",
      tag: "PANEL",
      label: "Portfolio table",
      note: "Displays holdings, exposure, allocation drift, CIO ratings, enriched prices, and conflict badges returned by the backend.",
      x: 1410,
      y: 750,
      w: 610,
      h: 190,
      kind: "panel",
      noteMaxChars: 58,
    },
    {
      id: "news",
      tag: "PANEL",
      label: "News feed",
      note: "Displays scored articles. Relevance score and alert state come from news.agent.ts for live articles, or from scenario data when enabled.",
      x: 1410,
      y: 990,
      w: 610,
      h: 215,
      kind: "panel",
      noteMaxChars: 58,
    },
    {
      id: "alerts",
      tag: "PANEL",
      label: "Alerts panel",
      note: "Combines news alerts, portfolio conflict alerts, and the frontend Raeber CIO alert. Approve/dismiss state is local in the browser.",
      x: 2260,
      y: 925,
      w: 640,
      h: 215,
      kind: "demo",
      noteMaxChars: 58,
    },
    {
      id: "advisory",
      tag: "PANEL",
      label: "Advisory panel",
      note: "Shows the generated RM draft, tone, confidence, reasoning, proposed action, disclaimer, language selector, and approve/reject controls.",
      x: 1410,
      y: 1265,
      w: 610,
      h: 205,
      kind: "panel",
      noteMaxChars: 58,
    },
    {
      id: "graph",
      tag: "PANEL",
      label: "Knowledge graph",
      note: "Visualizes deterministic links between client, values, holdings, sectors, conflicts, and news triggers. It reuses already-produced data.",
      x: 1410,
      y: 1530,
      w: 610,
      h: 175,
      kind: "panel",
      noteMaxChars: 58,
    },
    {
      id: "chat",
      tag: "PANEL",
      label: "RM assistant",
      note: "Shows chat history and sends RM questions to the backend. The assistant can explain the client context, but it has no tools or planning loop.",
      x: 1410,
      y: 1765,
      w: 610,
      h: 175,
      kind: "panel",
      noteMaxChars: 58,
    },
    {
      id: "logs",
      tag: "PANEL",
      label: "Decision log, audit, traces",
      note: "Surfaces the explainabilityService, auditService, and traceService memory. These are runtime logs, not durable storage.",
      x: 1410,
      y: 2000,
      w: 610,
      h: 175,
      kind: "panel",
      noteMaxChars: 58,
    },
    {
      id: "mock",
      tag: "FRONTEND MOCK",
      label: "client/src/data/mock.ts",
      note: "Only used when VITE_DEMO_MODE=true and an API call fails. Supplies fallback clients, DNA, portfolios, and advisory drafts in the browser.",
      x: 2260,
      y: 1265,
      w: 640,
      h: 205,
      kind: "demo",
      noteMaxChars: 58,
    },
    {
      id: "raeber",
      tag: "HARDCODED",
      label: "RAEBER_CIO_ALERT",
      note: "Injected directly in AlertsPanel for one client. It is not returned by the backend and is currently visible as if it were normal alert data.",
      x: 2260,
      y: 1530,
      w: 640,
      h: 190,
      kind: "demo",
      noteMaxChars: 58,
    },
  ],
  edges: [
    { from: "app", to: "clientsApi", label: "load client list", midX: 620 },
    { from: "app", to: "dnaApi", label: "selected id", midX: 620 },
    { from: "app", to: "portfolioApi", label: "selected id", midX: 620 },
    { from: "app", to: "newsApi", label: "selected id", midX: 620 },
    { from: "app", to: "advisoryApi", label: "approved alert", midX: 620 },
    { from: "app", to: "graphApi", label: "selected id", midX: 620 },
    { from: "app", to: "chatApi", label: "message/history", midX: 620 },
    { from: "app", to: "logsApi", label: "open panels", midX: 620 },
    { from: "clientsApi", to: "sidebar" },
    { from: "dnaApi", to: "dna" },
    { from: "portfolioApi", to: "portfolio" },
    { from: "newsApi", to: "news" },
    { from: "news", to: "alerts", label: "alert candidates" },
    { from: "portfolio", to: "alerts", label: "conflict alerts" },
    { from: "alerts", to: "app", label: "approved alert id", fromSide: "left", toSide: "right", dashed: true, color: "#fb7185", midX: 1030 },
    { from: "advisoryApi", to: "advisory" },
    { from: "graphApi", to: "graph" },
    { from: "chatApi", to: "chat" },
    { from: "logsApi", to: "logs" },
    { from: "mock", to: "sidebar", dashed: true, color: "#fb7185", fromSide: "left", toSide: "right", midX: 2130, label: "fallback props" },
    { from: "mock", to: "dna", dashed: true, color: "#fb7185", fromSide: "left", toSide: "right", midX: 2130 },
    { from: "mock", to: "portfolio", dashed: true, color: "#fb7185", fromSide: "left", toSide: "right", midX: 2130 },
    { from: "mock", to: "advisory", dashed: true, color: "#fb7185", fromSide: "left", toSide: "right", midX: 2130 },
    { from: "raeber", to: "alerts", dashed: true, color: "#fb7185", fromSide: "top", toSide: "bottom", label: "always injected" },
  ],
});

writeDiagram("backend-data-processing-flow", {
  title: "Backend Data And Processing Flow With Step Explanations",
  subtitle: "What each backend step receives, how it transforms the data, and what it returns to the UI.",
  width: 4100,
  height: 3050,
  headings: [
    { text: "Raw data and external sources", x: 70, y: 190, w: 550 },
    { text: "Load and in-memory store", x: 740, y: 190, w: 560 },
    { text: "API route layer", x: 1420, y: 190, w: 560 },
    { text: "Processing step", x: 2100, y: 190, w: 650 },
    { text: "Model/API/log side effects", x: 2970, y: 190, w: 680 },
  ],
  nodes: [
    {
      id: "crmXlsx",
      step: "A",
      tag: "WORKBOOK",
      label: "SwissHacks CRM.xlsx",
      note: "Raw client CRM notes, meeting context, mandate hints, values, sensitivities, and preferred communication clues.",
      x: 70,
      y: 300,
      w: 550,
      h: 180,
      kind: "workbook",
      noteMaxChars: 50,
    },
    {
      id: "portfolioXlsx",
      step: "B",
      tag: "WORKBOOK",
      label: "Portfolio Construction.xlsx",
      note: "Raw positions, portfolio tabs, target allocations, CIO ratings, candidate replacements, and mandate buckets.",
      x: 70,
      y: 560,
      w: 550,
      h: 180,
      kind: "workbook",
      noteMaxChars: 50,
    },
    {
      id: "event",
      step: "C",
      tag: "EXTERNAL",
      label: "Event Registry",
      note: "Live articles are searched using terms derived from the client's inferred investment profile and persona keywords.",
      x: 70,
      y: 920,
      w: 550,
      h: 180,
      kind: "external",
      noteMaxChars: 50,
    },
    {
      id: "six",
      step: "D",
      tag: "EXTERNAL",
      label: "SIX MCP",
      note: "Provides end-of-day price data for selected holdings. Used as enrichment, not as the source of portfolio positions.",
      x: 70,
      y: 1180,
      w: 550,
      h: 180,
      kind: "external",
      noteMaxChars: 50,
    },
    {
      id: "phoeniqs",
      step: "E",
      tag: "EXTERNAL",
      label: "Phoeniqs chat completions",
      note: "OpenAI-compatible LLM endpoint. Used for JSON extraction, relevance scoring, conflict classification, message drafts, and chat.",
      x: 2970,
      y: 300,
      w: 680,
      h: 205,
      kind: "external",
      noteMaxChars: 62,
    },
    {
      id: "loader",
      step: "1",
      tag: "CODE",
      label: "loader.ts",
      note: "Reads the Excel workbooks, normalizes rows, maps CRM tabs to clients, maps portfolio tabs, and builds initial client and portfolio objects.",
      x: 740,
      y: 370,
      w: 560,
      h: 205,
      kind: "deterministic",
      noteMaxChars: 53,
    },
    {
      id: "store",
      step: "2",
      tag: "MEMORY",
      label: "data/store.ts",
      note: "Stores parsed clients and portfolios in process memory. This is runtime state, so restarting the server reloads from the workbooks.",
      x: 740,
      y: 670,
      w: 560,
      h: 205,
      kind: "deterministic",
      noteMaxChars: 53,
    },
    {
      id: "clientsRoute",
      step: "3",
      tag: "GET",
      label: "/api/clients",
      note: "Receives no client id. Returns client summaries for the sidebar. Adds triggerEvent only when scenario news is enabled.",
      x: 1420,
      y: 300,
      w: 560,
      h: 180,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "dnaRoute",
      step: "4",
      tag: "GET",
      label: "/api/clients/:id/dna",
      note: "Receives client id. Loads CRM entries and calls extractDNA. Returns structured ClientDNA to the UI.",
      x: 1420,
      y: 550,
      w: 560,
      h: 180,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "portfolioRoute",
      step: "5",
      tag: "GET",
      label: "/api/clients/:id/portfolio",
      note: "Receives client id. Loads holdings, CIO data, allocation targets, SIX enrichment, and conflict analysis. Returns PortfolioAnalysis.",
      x: 1420,
      y: 800,
      w: 560,
      h: 205,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "newsRoute",
      step: "6",
      tag: "GET",
      label: "/api/clients/:id/news",
      note: "Receives client id. Resolves DNA/investment profile, fetches live news, optionally mixes scenario events, then returns a scored digest.",
      x: 1420,
      y: 1075,
      w: 560,
      h: 205,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "advisoryRoute",
      step: "7",
      tag: "POST",
      label: "/api/clients/:id/advisory",
      note: "Receives alertId, language, and optional conflictIsin. Starts a trace, builds context, and asks message.agent.ts for a draft.",
      x: 1420,
      y: 1350,
      w: 560,
      h: 205,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "graphRoute",
      step: "8",
      tag: "GET",
      label: "/api/clients/:id/graph",
      note: "Receives client id. Reuses DNA, portfolio, and news digest, then builds a deterministic graph response.",
      x: 1420,
      y: 1625,
      w: 560,
      h: 180,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "chatRoute",
      step: "9",
      tag: "GET/POST",
      label: "/api/clients/:id/chat",
      note: "GET returns memory history. POST receives RM message, builds client context, calls the LLM, and appends both messages.",
      x: 1420,
      y: 1875,
      w: 560,
      h: 205,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "logsRoute",
      step: "10",
      tag: "GET",
      label: "/api/decisions /audit /traces",
      note: "Returns in-memory explainability decisions, audit entries, and trace summaries/detail for the frontend panels.",
      x: 1420,
      y: 2150,
      w: 560,
      h: 180,
      kind: "route",
      noteMaxChars: 53,
    },
    {
      id: "crmAgent",
      step: "4a",
      tag: "LLM",
      label: "crm.agent.ts",
      note: "Chunks CRM text, prompts Phoeniqs for strict JSON, parses/merges output, derives investment and communication profiles, caches DNA, logs audit/decision records. Falls back to heuristics when needed.",
      x: 2100,
      y: 520,
      w: 650,
      h: 250,
      kind: "llm",
      noteMaxChars: 60,
    },
    {
      id: "conflictAgent",
      step: "5a",
      tag: "LLM",
      label: "conflict.agent.ts",
      note: "Compares each holding against ClientDNA values, sensitivities, and priorities. Outputs severity/reason/risk type and suggests BUY-rated swaps when available.",
      x: 2100,
      y: 815,
      w: 650,
      h: 230,
      kind: "llm",
      noteMaxChars: 60,
    },
    {
      id: "newsAgent",
      step: "6a",
      tag: "LLM",
      label: "news.agent.ts",
      note: "Builds search terms from investment profile, fetches live articles, dedupes, then asks Phoeniqs to assign relevanceScore, isAlert, alertType, and reasoningChain.",
      x: 2100,
      y: 1090,
      w: 650,
      h: 230,
      kind: "llm",
      noteMaxChars: 60,
    },
    {
      id: "messageAgent",
      step: "7a",
      tag: "LLM",
      label: "message.agent.ts",
      note: "Fetches DNA and news digest, selects the requested alert, summarizes portfolio exposure, and asks Phoeniqs for subject, body, action, reasoning, confidence, and tone influences.",
      x: 2100,
      y: 1370,
      w: 650,
      h: 250,
      kind: "llm",
      noteMaxChars: 60,
    },
    {
      id: "graphService",
      step: "8a",
      tag: "CODE",
      label: "knowledge-graph.service.ts",
      note: "No LLM call. Converts client, values, holdings, sectors, news alerts, and conflict/opportunity relationships into graph nodes and edges.",
      x: 2100,
      y: 1660,
      w: 650,
      h: 205,
      kind: "deterministic",
      noteMaxChars: 60,
    },
    {
      id: "chatAgent",
      step: "9a",
      tag: "LLM",
      label: "chat.agent.ts",
      note: "Builds a fixed assistant prompt from client profile, DNA, top holdings, and recent history. Returns one chat completion. No tool use or autonomous loop.",
      x: 2100,
      y: 1910,
      w: 650,
      h: 230,
      kind: "llm",
      noteMaxChars: 60,
    },
    {
      id: "output",
      tag: "UI OUTPUT",
      label: "Responses consumed by React",
      note: "The frontend receives JSON and renders panels. No persistent database sits between backend and UI in the current implementation.",
      x: 2970,
      y: 610,
      w: 680,
      h: 190,
      kind: "output",
      noteMaxChars: 62,
    },
    {
      id: "logs",
      tag: "MEMORY",
      label: "audit, decisions, traces",
      note: "LLM and advisory orchestration steps write records into in-memory services. These records feed the decision panel, audit drawer, and trace drawer.",
      x: 2970,
      y: 900,
      w: 680,
      h: 205,
      kind: "deterministic",
      noteMaxChars: 62,
    },
    {
      id: "demoProfiles",
      tag: "SERVER DEMO",
      label: "demo-profiles.ts",
      note: "When DEMO_MODE=true, hardcoded profile data can replace CRM-derived DNA. Useful for demos, misleading if enabled by accident.",
      x: 70,
      y: 1610,
      w: 550,
      h: 190,
      kind: "demo",
      noteMaxChars: 50,
    },
    {
      id: "scenario",
      tag: "SERVER DEMO",
      label: "scenario-triggers.ts",
      note: "When DEMO_MODE=true or ENABLE_SCENARIO_NEWS=true, synthetic scenario articles are prepended to live news before scoring/display.",
      x: 70,
      y: 1870,
      w: 550,
      h: 205,
      kind: "demo",
      noteMaxChars: 50,
    },
    {
      id: "frontendMock",
      tag: "BROWSER MOCK",
      label: "client/src/data/mock.ts",
      note: "Only used client-side if VITE_DEMO_MODE=true and API responses fail. Supplies mock clients, DNA, portfolios, and advisory drafts.",
      x: 70,
      y: 2225,
      w: 550,
      h: 205,
      kind: "demo",
      noteMaxChars: 50,
    },
    {
      id: "raeber",
      tag: "HARDCODED",
      label: "RAEBER_CIO_ALERT",
      note: "Injected inside AlertsPanel. It bypasses backend scoring, audit, tracing, and source attribution.",
      x: 70,
      y: 2485,
      w: 550,
      h: 180,
      kind: "demo",
      noteMaxChars: 50,
    },
  ],
  edges: [
    { from: "crmXlsx", to: "loader", label: "CRM rows" },
    { from: "portfolioXlsx", to: "loader", label: "portfolio rows" },
    { from: "loader", to: "store", fromSide: "bottom", toSide: "top", label: "normalized objects", mode: "straight" },
    { from: "store", to: "clientsRoute", label: "client summaries", midX: 1350 },
    { from: "store", to: "dnaRoute", label: "CRM entries", midX: 1350 },
    { from: "store", to: "portfolioRoute", label: "holdings", midX: 1350 },
    { from: "store", to: "newsRoute", label: "client profile", midX: 1350 },
    { from: "store", to: "advisoryRoute", label: "client + holdings", midX: 1350 },
    { from: "store", to: "graphRoute", label: "source data", midX: 1350 },
    { from: "store", to: "chatRoute", label: "client context", midX: 1350 },
    { from: "clientsRoute", to: "output", label: "summaries", midX: 2060 },
    { from: "dnaRoute", to: "crmAgent" },
    { from: "portfolioRoute", to: "conflictAgent" },
    { from: "newsRoute", to: "newsAgent" },
    { from: "advisoryRoute", to: "messageAgent" },
    { from: "graphRoute", to: "graphService" },
    { from: "chatRoute", to: "chatAgent" },
    { from: "crmAgent", to: "phoeniqs", dashed: true, color: "#c084fc", fromSide: "right", toSide: "left", label: "JSON DNA prompt" },
    { from: "conflictAgent", to: "phoeniqs", dashed: true, color: "#c084fc", fromSide: "right", toSide: "left", label: "classify conflicts" },
    { from: "newsAgent", to: "phoeniqs", dashed: true, color: "#c084fc", fromSide: "right", toSide: "left", label: "score relevance" },
    { from: "messageAgent", to: "phoeniqs", dashed: true, color: "#c084fc", fromSide: "right", toSide: "left", label: "draft message" },
    { from: "chatAgent", to: "phoeniqs", dashed: true, color: "#c084fc", fromSide: "right", toSide: "left", label: "chat reply" },
    { from: "crmAgent", to: "output", label: "ClientDNA" },
    { from: "conflictAgent", to: "output", label: "conflicts" },
    { from: "newsAgent", to: "output", label: "scored digest" },
    { from: "messageAgent", to: "output", label: "advisory draft" },
    { from: "graphService", to: "output", label: "graph JSON" },
    { from: "chatAgent", to: "output", label: "chat messages" },
    { from: "event", to: "newsAgent", dashed: true, color: "#f59e0b", label: "live articles", midX: 1030 },
    { from: "six", to: "portfolioRoute", dashed: true, color: "#f59e0b", label: "price enrichment", midX: 1030 },
    { from: "demoProfiles", to: "crmAgent", dashed: true, color: "#fb7185", label: "demo DNA", midX: 1190 },
    { from: "scenario", to: "newsAgent", dashed: true, color: "#fb7185", label: "scenario article", midX: 1190 },
    { from: "frontendMock", to: "output", dashed: true, color: "#fb7185", label: "frontend fallback", midX: 1550 },
    { from: "raeber", to: "output", dashed: true, color: "#fb7185", label: "hardcoded alert", midX: 1550 },
    { from: "logsRoute", to: "logs", label: "read records" },
    { from: "crmAgent", to: "logs", dashed: true, label: "audit/decision" },
    { from: "conflictAgent", to: "logs", dashed: true, label: "audit/decision" },
    { from: "newsAgent", to: "logs", dashed: true, label: "audit" },
    { from: "messageAgent", to: "logs", dashed: true, label: "audit/trace/decision" },
  ],
});
