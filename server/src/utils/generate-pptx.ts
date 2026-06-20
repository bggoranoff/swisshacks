import PptxGenJS from "pptxgenjs";
import path from "path";
import fs from "fs";

export async function generatePresentation(): Promise<string> {
  const pptx = new PptxGenJS();
  pptx.author = "WealthAdvisor AI";
  pptx.title = "The Next Generation of Wealth Advisory";

  // Slide 1: Title
  const slide1 = pptx.addSlide();
  slide1.background = { color: "0F172A" };
  slide1.addText("WealthAdvisor AI", { x: 1, y: 1.5, w: 8, h: 1.5, fontSize: 36, bold: true, color: "FFFFFF", align: "center" });
  slide1.addText("The Next Generation of Wealth Advisory", { x: 1, y: 3, w: 8, h: 1, fontSize: 18, color: "94A3B8", align: "center" });
  slide1.addText("SwissHacks 2026 — SIX, NTT Data & Noumena", { x: 1, y: 4.2, w: 8, h: 0.5, fontSize: 14, color: "64748B", align: "center" });

  // Slide 2: Problem
  const slide2 = pptx.addSlide();
  slide2.background = { color: "0F172A" };
  slide2.addText("The Problem", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slide2.addText([
    { text: "Hyper-personalised wealth advice is reserved for a handful of UHNWI clients\n\n", options: { fontSize: 16, color: "E2E8F0" } },
    { text: "• RMs know their best clients inside out — values, life events, business context\n", options: { fontSize: 14, color: "94A3B8" } },
    { text: "• This level of care doesn't scale past a handful of clients\n", options: { fontSize: 14, color: "94A3B8" } },
    { text: "• Tailoring proposals, monitoring news, drafting narratives takes too much time\n", options: { fontSize: 14, color: "94A3B8" } },
  ], { x: 0.5, y: 1.5, w: 9, h: 4 });

  // Slide 3: Solution
  const slide3 = pptx.addSlide();
  slide3.background = { color: "0F172A" };
  slide3.addText("Our Solution", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slide3.addText([
    { text: "AI-powered advisor dashboard giving every client UHNWI-level care\n\n", options: { fontSize: 16, color: "E2E8F0" } },
    { text: "1. Build Client DNA — extract values, life events, priorities from CRM logs\n", options: { fontSize: 14, color: "93C5FD" } },
    { text: "2. Monitor Global News 24/7 — flag relevant events in real-time\n", options: { fontSize: 14, color: "93C5FD" } },
    { text: "3. Smart Asset Swaps — within mandate, aligned with client DNA\n", options: { fontSize: 14, color: "93C5FD" } },
    { text: "4. Personalised Messages — in the client's preferred communication style\n", options: { fontSize: 14, color: "93C5FD" } },
  ], { x: 0.5, y: 1.5, w: 9, h: 4 });

  // Slide 4: Architecture
  const slide4 = pptx.addSlide();
  slide4.background = { color: "0F172A" };
  slide4.addText("Multi-Agent Architecture", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slide4.addText([
    { text: "CRM Agent → Portfolio Agent → News Agent → Message Agent\n\n", options: { fontSize: 16, color: "E2E8F0", bold: true } },
    { text: "• CRM Agent: Extracts client DNA from 3 years of RM notes\n", options: { fontSize: 13, color: "94A3B8" } },
    { text: "• Portfolio Agent: Enriches positions with SIX data, detects DNA conflicts\n", options: { fontSize: 13, color: "94A3B8" } },
    { text: "• News Agent: Monitors Event Registry, scores relevance per client\n", options: { fontSize: 13, color: "94A3B8" } },
    { text: "• Message Agent: Drafts personalised advisory notes\n\n", options: { fontSize: 13, color: "94A3B8" } },
    { text: "Trust & Explainability: Full tracing, reasoning chains, source citations\n", options: { fontSize: 13, color: "FCD34D" } },
    { text: "Human-in-the-loop: RM approves every action, client always decides\n", options: { fontSize: 13, color: "FCD34D" } },
  ], { x: 0.5, y: 1.5, w: 9, h: 4 });

  // Slide 5: Four Client Personas
  const slidePersonas = pptx.addSlide();
  slidePersonas.background = { color: "0F172A" };
  slidePersonas.addText("Four Client Personas", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slidePersonas.addText([
    { text: "Schneider — The Personal Connection\n", options: { fontSize: 14, bold: true, color: "3B82F6" } },
    { text: "Family foundation for chronic-illness research. Balanced strategy.\n\n", options: { fontSize: 12, color: "94A3B8" } },
    { text: "Huber — The Purpose-Driven Investor\n", options: { fontSize: 14, bold: true, color: "22C55E" } },
    { text: "Environmentalist financing reforestation. Defensive strategy.\n\n", options: { fontSize: 12, color: "94A3B8" } },
    { text: "Räber — The Defensive Value Investor\n", options: { fontSize: 14, bold: true, color: "F59E0B" } },
    { text: "Conservative Swiss couple, averse to US tech. Defensive strategy.\n\n", options: { fontSize: 12, color: "94A3B8" } },
    { text: "Ammann — The Corporate Reputation Case\n", options: { fontSize: 14, bold: true, color: "A855F7" } },
    { text: "Prominent entrepreneur, reputational risk = financial risk. Growth strategy.\n", options: { fontSize: 12, color: "94A3B8" } },
  ], { x: 0.5, y: 1.5, w: 9, h: 4 });

  // Slide 6: Technology Stack
  const slideTech = pptx.addSlide();
  slideTech.background = { color: "0F172A" };
  slideTech.addText("Technology Stack", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slideTech.addText([
    { text: "SIX Financial Information — ", options: { fontSize: 13, bold: true, color: "EF4444" } },
    { text: "MCP server for live market data and prices\n", options: { fontSize: 13, color: "94A3B8" } },
    { text: "Phoeniqs — ", options: { fontSize: 13, bold: true, color: "06B6D4" } },
    { text: "LLM API for DNA extraction, conflict detection, advisory generation\n", options: { fontSize: 13, color: "94A3B8" } },
    { text: "Event Registry — ", options: { fontSize: 13, bold: true, color: "EC4899" } },
    { text: "Live news feed with sentiment scoring\n", options: { fontSize: 13, color: "94A3B8" } },
    { text: "Noumena Digital — ", options: { fontSize: 13, bold: true, color: "A855F7" } },
    { text: "Knowledge graph modeling client-asset-news relationships\n", options: { fontSize: 13, color: "94A3B8" } },
    { text: "NTT DATA — ", options: { fontSize: 13, bold: true, color: "F97316" } },
    { text: "Explainable AI patterns with decision audit trail\n\n", options: { fontSize: 13, color: "94A3B8" } },
    { text: "Frontend: ", options: { fontSize: 12, color: "64748B" } },
    { text: "React + TypeScript + TailwindCSS\n", options: { fontSize: 12, color: "94A3B8" } },
    { text: "Backend: ", options: { fontSize: 12, color: "64748B" } },
    { text: "Express + TypeScript + Multi-Agent Orchestration\n", options: { fontSize: 12, color: "94A3B8" } },
  ], { x: 0.5, y: 1.5, w: 9, h: 4 });

  // Slide 7: Judging Criteria Mapping
  const slideJudging = pptx.addSlide();
  slideJudging.background = { color: "0F172A" };
  slideJudging.addText("How We Address the Judging Criteria", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slideJudging.addText([
    { text: "Creativity (25%) — ", options: { fontSize: 14, bold: true, color: "22D3EE" } },
    { text: "RM chat agent, knowledge graph, DNA timeline, before/after comparison\n\n", options: { fontSize: 12, color: "94A3B8" } },
    { text: "Trust & Explainability (25%) — ", options: { fontSize: 14, bold: true, color: "22D3EE" } },
    { text: "Full tracing, audit trail, reasoning chains, evidence citations, human-in-the-loop\n\n", options: { fontSize: 12, color: "94A3B8" } },
    { text: "Feasibility (20%) — ", options: { fontSize: 14, bold: true, color: "22D3EE" } },
    { text: "SIX MCP live prices, multi-agent caching, error boundaries, graceful fallbacks\n\n", options: { fontSize: 12, color: "94A3B8" } },
    { text: "Visual Design (15%) — ", options: { fontSize: 14, bold: true, color: "22D3EE" } },
    { text: "Professional dark theme, responsive layout, allocation charts, drift indicators\n\n", options: { fontSize: 12, color: "94A3B8" } },
    { text: "Presentation Quality (15%) — ", options: { fontSize: 14, bold: true, color: "22D3EE" } },
    { text: "Demo Mode walkthrough, PPTX generation, multi-language support\n", options: { fontSize: 12, color: "94A3B8" } },
  ], { x: 0.5, y: 1.5, w: 9, h: 4 });

  // Slide 8: Demo
  const slideDemo = pptx.addSlide();
  slideDemo.background = { color: "0F172A" };
  slideDemo.addText("Live Demo", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slideDemo.addText([
    { text: "What you will see:\n\n", options: { fontSize: 16, bold: true, color: "E2E8F0" } },
    { text: "1. Client DNA extraction from CRM notes — live AI analysis\n", options: { fontSize: 14, color: "2DD4BF" } },
    { text: "2. Real-time news alert matched to a specific client's values\n", options: { fontSize: 14, color: "2DD4BF" } },
    { text: "3. Automated DNA-aware portfolio swap suggestion within mandate\n", options: { fontSize: 14, color: "2DD4BF" } },
    { text: "4. Tone-matched advisory message drafted for RM review\n", options: { fontSize: 14, color: "2DD4BF" } },
    { text: "5. Full reasoning chain and source citations on every output\n", options: { fontSize: 14, color: "2DD4BF" } },
    { text: "6. RM approval flow — human-in-the-loop before anything reaches the client\n", options: { fontSize: 14, color: "2DD4BF" } },
  ], { x: 0.5, y: 1.5, w: 9, h: 4 });

  // Slide 9: Key Features
  const slideFeatures = pptx.addSlide();
  slideFeatures.background = { color: "0F172A" };
  slideFeatures.addText("Key Features", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slideFeatures.addText([
    { text: "✓ Client DNA Profiling — AI reads CRM logs, builds investment identity\n", options: { fontSize: 14, color: "E2E8F0" } },
    { text: "✓ Smart Alerts — news and CIO conflicts matched against client DNA\n", options: { fontSize: 14, color: "E2E8F0" } },
    { text: "✓ DNA-Aware Swaps — replacements within mandate, BUY-rated by CIO\n", options: { fontSize: 14, color: "E2E8F0" } },
    { text: "✓ Tone-Matched Messages — data-driven or values-led, per client\n", options: { fontSize: 14, color: "E2E8F0" } },
    { text: "✓ Full Tracing — every AI decision logged with reasoning chain\n", options: { fontSize: 14, color: "E2E8F0" } },
    { text: "✓ Human-in-the-Loop — RM approves, client always decides\n", options: { fontSize: 14, color: "E2E8F0" } },
  ], { x: 0.5, y: 1.5, w: 9, h: 4 });

  // Slide 10: Trust & Explainability
  const slideTrust = pptx.addSlide();
  slideTrust.background = { color: "0F172A" };
  slideTrust.addText("Trust & Explainability", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slideTrust.addText([
    { text: "• Source attribution", options: { fontSize: 14, bold: true, color: "2DD4BF" } },
    { text: " — every AI output cites the exact data sources used\n", options: { fontSize: 14, color: "94A3B8" } },
    { text: "• Reasoning chains", options: { fontSize: 14, bold: true, color: "2DD4BF" } },
    { text: " — step-by-step logic visible for all decisions and recommendations\n", options: { fontSize: 14, color: "94A3B8" } },
    { text: "• Audit trail", options: { fontSize: 14, bold: true, color: "2DD4BF" } },
    { text: " — immutable timestamped log of every agent action and inference\n", options: { fontSize: 14, color: "94A3B8" } },
    { text: "• Human-in-the-loop approval", options: { fontSize: 14, bold: true, color: "2DD4BF" } },
    { text: " — RM reviews and signs off before anything reaches the client\n", options: { fontSize: 14, color: "94A3B8" } },
    { text: "• Confidence scores", options: { fontSize: 14, bold: true, color: "2DD4BF" } },
    { text: " — calibrated certainty indicators on all AI outputs\n", options: { fontSize: 14, color: "94A3B8" } },
    { text: "• Agent execution tracing", options: { fontSize: 14, bold: true, color: "2DD4BF" } },
    { text: " — full visibility into which agent ran, when, and why\n", options: { fontSize: 14, color: "94A3B8" } },
  ], { x: 0.5, y: 1.5, w: 9, h: 4 });

  // Slide 11: Team
  const slideTeam = pptx.addSlide();
  slideTeam.background = { color: "0F172A" };
  slideTeam.addText("Team", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slideTeam.addText("[Team members here]", { x: 1, y: 2.5, w: 8, h: 1, fontSize: 16, color: "64748B", align: "center", italic: true });

  const outputDir = path.resolve(__dirname, "../../../output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "presentation.pptx");
  await pptx.writeFile({ fileName: outputPath });
  return outputPath;
}
