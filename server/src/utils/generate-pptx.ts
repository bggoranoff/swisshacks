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

  // Slide 5: Demo (placeholder)
  const slide5 = pptx.addSlide();
  slide5.background = { color: "0F172A" };
  slide5.addText("Live Demo", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slide5.addText("[Insert screenshots from the dashboard here]", { x: 1, y: 2.5, w: 8, h: 1, fontSize: 16, color: "64748B", align: "center", italic: true });

  // Slide 6: Key Features
  const slide6 = pptx.addSlide();
  slide6.background = { color: "0F172A" };
  slide6.addText("Key Features", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slide6.addText([
    { text: "✓ Client DNA Profiling — AI reads CRM logs, builds investment identity\n", options: { fontSize: 14, color: "E2E8F0" } },
    { text: "✓ Smart Alerts — news and CIO conflicts matched against client DNA\n", options: { fontSize: 14, color: "E2E8F0" } },
    { text: "✓ DNA-Aware Swaps — replacements within mandate, BUY-rated by CIO\n", options: { fontSize: 14, color: "E2E8F0" } },
    { text: "✓ Tone-Matched Messages — data-driven or values-led, per client\n", options: { fontSize: 14, color: "E2E8F0" } },
    { text: "✓ Full Tracing — every AI decision logged with reasoning chain\n", options: { fontSize: 14, color: "E2E8F0" } },
    { text: "✓ Human-in-the-Loop — RM approves, client always decides\n", options: { fontSize: 14, color: "E2E8F0" } },
  ], { x: 0.5, y: 1.5, w: 9, h: 4 });

  // Slide 7: Team
  const slide7 = pptx.addSlide();
  slide7.background = { color: "0F172A" };
  slide7.addText("Team", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF" });
  slide7.addText("[Team members here]", { x: 1, y: 2.5, w: 8, h: 1, fontSize: 16, color: "64748B", align: "center", italic: true });

  const outputDir = path.resolve(__dirname, "../../../output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "presentation.pptx");
  await pptx.writeFile({ fileName: outputPath });
  return outputPath;
}
