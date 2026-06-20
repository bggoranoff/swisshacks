import axios from "axios";
import { AdvisoryMessage } from "../types/message";
import { extractDNA } from "./crm.agent";
import { NewsAgent } from "./news.agent";
import { getClient, getPortfolio } from "../data/store";
import { auditService } from "../services/audit.service";
import { explainabilityService } from "../services/explainability.service";

const messageStore = new Map<string, AdvisoryMessage>();
const newsAgent = new NewsAgent();

const LLM_URL = () => (process.env.PHOENIQS_API_URL || "https://maas.phoeniqs.com/v1") + "/chat/completions";
const LLM_KEY = () => process.env.PHOENIQS_API_KEY || "";
const LLM_MODEL = () => process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b";

const PERSONA_CONTEXT: Record<string, string> = {
  schneider: "Schneider is emotional and purpose-driven, with a family foundation supporting chronic-illness research. Use warm, empathetic language. Reference family legacy and foundation mission when relevant.",
  huber: "Huber is an environmentalist financing South American reforestation. Lead with sustainability values. Frame environmental news as directly connected to their life's work.",
  raeber: "Räber is a conservative Swiss couple with precision-engineering background, averse to US tech. Use precise data, percentages, and Swiss market references. Avoid enthusiasm about tech stocks.",
  ammann: "Ammann is a prominent Swiss entrepreneur where reputational risk equals financial risk. Be direct about public-profile exposure. Use urgent, professional tone for reputation-related issues.",
};

const PERSONA_TONE: Record<string, string> = {
  schneider: "values-led",
  huber: "values-led",
  raeber: "data-driven",
  ammann: "balanced",
};

const LANG_INSTRUCTIONS: Record<string, string> = {
  en: "",
  de: "Write the advisory note in German (Hochdeutsch). Use formal Sie-form.",
  fr: "Write the advisory note in French. Use formal vous-form.",
};

function parseJson(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch { /* fall through */ }
    }
    return null;
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export class MessageAgent {
  async generateAdvisory(
    clientId: string,
    alertId?: string,
    conflictIsin?: string,
    language: string = "en"
  ): Promise<AdvisoryMessage> {
    const startTime = Date.now();
    const client = getClient(clientId);
    if (!client) {
      return this.fallbackAdvisory(clientId, "Unknown Client");
    }

    const dna = await extractDNA(clientId, client.crmEntries);
    const digest = await newsAgent.getNewsDigest(clientId, dna.summary);
    const portfolio = getPortfolio(client.strategy);

    const alert = alertId
      ? digest.alerts.find(a => a.id === alertId) || digest.alerts[0]
      : digest.alerts[0];

    let styleInstruction = "";
    if (dna.communicationStyle === "data-driven") {
      styleInstruction = "Use precise numbers, percentages, and market data. Be concise and analytical.";
    } else if (dna.communicationStyle === "values-led") {
      styleInstruction = "Lead with the client's personal values and how the situation connects to what matters to them. Be warm but professional.";
    } else {
      styleInstruction = "Balance data-driven analysis with personal values. Be professional yet personable.";
    }

    const personaContext = PERSONA_CONTEXT[clientId.toLowerCase()] || "";
    const personaSection = personaContext
      ? `\nPERSONA GUIDANCE: ${personaContext}`
      : "";

    const systemPrompt =
      "You are a relationship manager drafting a personalised advisory note. " +
      "Write in the client's preferred communication style. " +
      "Never give direct financial advice — present options and reasoning. " +
      "The client always decides. " +
      styleInstruction +
      personaSection;

    const alertContext = alert
      ? `\nTRIGGER EVENT:\nTitle: ${alert.title}\nSummary: ${alert.summary}\nType: ${alert.alertType || "conflict"}\nRelevance: ${alert.relevanceScore}`
      : "\nNo specific trigger event — provide a general portfolio review note.";

    const topHoldings = portfolio?.positions
      .slice()
      .sort((a, b) => b.currentValueCHF - a.currentValueCHF)
      .slice(0, 10)
      .map(p => `${p.name} (${p.isin}, CHF ${(p.currentValueCHF / 1000).toFixed(0)}K, ${p.sectorOrAssetClass})`)
      .join("\n") || "No holdings data available";

    const portfolioSummary = portfolio
      ? `\nPORTFOLIO: ${portfolio.strategy} mandate, ${portfolio.positions.length} positions, CHF ${portfolio.totalTargetCHF.toLocaleString()} target`
      : "";

    const holdingsSection = `\nTop 10 holdings in the ${portfolio?.strategy || "current"} portfolio:\n${topHoldings}`;

    const userPrompt =
      `Draft an advisory note for client ${client.name}.\n` +
      `\nCLIENT DNA:\n${dna.summary}\n` +
      `Values: ${dna.values.join(", ")}\n` +
      `Risk sensitivities: ${dna.riskSensitivities.join(", ")}\n` +
      `Communication style: ${dna.communicationStyle}\n` +
      (personaContext ? `\nPERSONA: ${personaContext}\n` : "") +
      portfolioSummary +
      holdingsSection +
      alertContext +
      (LANG_INSTRUCTIONS[language] ? `\n\nLANGUAGE: ${LANG_INSTRUCTIONS[language]}\n` : "") +
      `\n\nIMPORTANT: Return ONLY a JSON object (no markdown fences). Use \\n for newlines inside string values. Structure:\n` +
      `{"subject":"short subject","body":"the advisory message with \\n for paragraphs","proposedAction":"one sentence","reasoning":"2-3 sentences","confidence":0.85,"toneInfluences":[{"dnaValue":"value","effect":"effect"}]}`;

    try {
      const { data } = await axios.post(
        LLM_URL(),
        {
          model: LLM_MODEL(),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 4000,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LLM_KEY()}`,
          },
          timeout: 60000,
        }
      );

      const choice = data?.choices?.[0];
      const content = choice?.message?.content || choice?.message?.reasoning_content || choice?.text || "";
      console.log("[MessageAgent] LLM response length:", content.length, "finish_reason:", choice?.finish_reason);
      let parsed = parseJson(content);

      if (!parsed || !parsed.body) {
        console.log("[MessageAgent] First parse failed, trying to extract body from raw response...");
        // If parsing failed, use the raw LLM text as the body directly
        if (content.length > 50) {
          parsed = {
            subject: `Advisory Note — ${client.name}`,
            body: content.replace(/```json\n?|\n?```/g, "").trim(),
            proposedAction: "Review and discuss with your relationship manager.",
            reasoning: "Generated from LLM response.",
            confidence: 0.7,
            toneInfluences: [],
          };
        } else {
          return this.fallbackAdvisory(clientId, client.name, alert?.title);
        }
      }

      // Determine tone: persona-specific mapping takes precedence over DNA communicationStyle.
      // For ammann with reputation-related alerts, the system prompt already instructs urgent
      // language — tone stays "balanced" (the only valid value for ammann in the type union).
      const personaTone = PERSONA_TONE[clientId.toLowerCase()];
      const resolvedTone: "data-driven" | "values-led" | "balanced" =
        (personaTone as "data-driven" | "values-led" | "balanced") || dna.communicationStyle;

      const msg: AdvisoryMessage = {
        id: generateId(),
        clientId,
        subject: parsed.subject || `Advisory Note — ${client.name}`,
        body: parsed.body,
        tone: resolvedTone,
        toneInfluences: Array.isArray(parsed.toneInfluences) ? parsed.toneInfluences : [],
        referencedAlert: alert?.id,
        proposedAction: parsed.proposedAction || undefined,
        reasoning: parsed.reasoning || "Based on the client's profile and current market conditions.",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
        status: "draft",
        disclaimer:
          "This is an AI-generated draft for the relationship manager's review. " +
          "It does not constitute financial advice. " +
          "The client's explicit approval is required before any transaction.",
      };

      // Generate generic (non-personalised) version for before/after comparison
      try {
        const alertSummary = alert ? alert.title : "general portfolio review";
        const genericRes = await axios.post(
          LLM_URL(),
          {
            model: LLM_MODEL(),
            messages: [
              { role: "system", content: "You are a wealth management relationship manager writing a generic advisory note. Keep it professional, impersonal, and formal. Do not reference any personal client details." },
              { role: "user", content: `Write a brief, standard advisory note for a wealth management client regarding: ${alertSummary}. Use a neutral, professional tone. Do not personalise. Keep it generic and formal. 3-4 sentences max.` },
            ],
            temperature: 0.3,
            max_tokens: 500,
          },
          {
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_KEY()}` },
            timeout: 30000,
          }
        );
        const genericMsg = genericRes.data?.choices?.[0]?.message;
        const genericContent = genericMsg?.content || genericMsg?.reasoning_content || "";
        if (genericContent.length > 20) {
          msg.genericAdvisory = genericContent.replace(/```json\n?|\n?```/g, "").trim();
        }
      } catch (err) {
        console.warn("[MessageAgent] Generic advisory generation failed:", (err as Error).message);
      }

      messageStore.set(msg.id, msg);

      auditService.log({
        agent: "message-agent",
        action: "generate-advisory",
        clientId,
        inputSummary: `alert=${alert?.id || "none"}, style=${dna.communicationStyle}, persona=${clientId.toLowerCase()}`,
        outputSummary: `subject="${msg.subject}", confidence=${msg.confidence}, tone=${msg.tone}`,
        durationMs: Date.now() - startTime,
      });

      explainabilityService.record({
        agent: "message-agent",
        decisionType: "advisory-generation",
        input: { summary: `Advisory for ${clientId}, alert: ${alert?.id || "auto-selected"}` },
        output: {
          summary: `Generated ${msg.tone} advisory: "${msg.subject}"`,
          details: { tone: msg.tone, confidence: msg.confidence },
        },
        reasoning: {
          steps: [
            `Client DNA indicates ${dna.communicationStyle} communication preference`,
            `Selected tone: ${msg.tone} based on persona mapping`,
            msg.proposedAction ? `Proposed action: ${msg.proposedAction}` : "No specific action proposed",
            `Confidence: ${Math.round(msg.confidence * 100)}%`,
          ],
          confidence: msg.confidence,
          alternatives: [
            { option: "data-driven tone", reason: "Would emphasize numbers and metrics", score: msg.tone === "data-driven" ? 0.9 : 0.3 },
            { option: "values-led tone", reason: "Would lead with personal values and mission", score: msg.tone === "values-led" ? 0.9 : 0.3 },
            { option: "balanced tone", reason: "Would blend data and values", score: msg.tone === "balanced" ? 0.9 : 0.3 },
          ],
        },
        dataSources: [
          { name: "Client DNA", type: "crm", reference: clientId },
          { name: "News Alerts", type: "news", reference: alert?.id || "auto" },
          { name: "Phoeniqs LLM", type: "llm", reference: process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b" },
        ],
      });

      return msg;
    } catch (err) {
      console.error("[MessageAgent] LLM call failed:", (err as Error).message);
      return this.fallbackAdvisory(clientId, client.name, alert?.title);
    }
  }

  async generateGenericAdvisory(clientId: string, alertId?: string): Promise<AdvisoryMessage> {
    const startTime = Date.now();
    const client = getClient(clientId);
    if (!client) return this.fallbackAdvisory(clientId, "Unknown Client");

    const digest = await newsAgent.getNewsDigest(clientId);
    const portfolio = getPortfolio(client.strategy);

    const alert = alertId
      ? digest.alerts.find(a => a.id === alertId) || digest.alerts[0]
      : digest.alerts[0];

    const topHoldings = portfolio?.positions
      .slice()
      .sort((a, b) => b.currentValueCHF - a.currentValueCHF)
      .slice(0, 10)
      .map(p => `${p.name} (${p.isin}, CHF ${(p.currentValueCHF / 1000).toFixed(0)}K, ${p.sectorOrAssetClass})`)
      .join("\n") || "No holdings data available";

    const portfolioSummary = portfolio
      ? `\nPORTFOLIO: ${portfolio.strategy} mandate, ${portfolio.positions.length} positions, CHF ${portfolio.totalTargetCHF.toLocaleString()} target`
      : "";

    const holdingsSection = `\nTop 10 holdings:\n${topHoldings}`;

    const alertContext = alert
      ? `\nTRIGGER EVENT:\nTitle: ${alert.title}\nSummary: ${alert.summary}\nType: ${alert.alertType || "conflict"}\nRelevance: ${alert.relevanceScore}`
      : "\nNo specific trigger event — provide a general portfolio review note.";

    const systemPrompt =
      "Write a standard institutional advisory note. Do not personalise. Use formal, neutral language.";

    const userPrompt =
      `Draft a standard advisory note for a wealth management client.\n` +
      portfolioSummary +
      holdingsSection +
      alertContext +
      `\n\nIMPORTANT: Return ONLY a JSON object (no markdown fences). Use \\n for newlines inside string values. Structure:\n` +
      `{"subject":"short subject","body":"the advisory message with \\n for paragraphs","proposedAction":"one sentence","reasoning":"2-3 sentences","confidence":0.75,"toneInfluences":[]}`;

    try {
      const { data } = await axios.post(
        LLM_URL(),
        {
          model: LLM_MODEL(),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LLM_KEY()}`,
          },
          timeout: 60000,
        }
      );

      const choice = data?.choices?.[0];
      const content = choice?.message?.content || choice?.message?.reasoning_content || choice?.text || "";
      let parsed = parseJson(content);

      if (!parsed || !parsed.body) {
        if (content.length > 50) {
          parsed = {
            subject: `Advisory Note — Standard`,
            body: content.replace(/```json\n?|\n?```/g, "").trim(),
            proposedAction: "Review and discuss with your relationship manager.",
            reasoning: "Generated from LLM response.",
            confidence: 0.7,
            toneInfluences: [],
          };
        } else {
          return this.fallbackAdvisory(clientId, client.name, alert?.title);
        }
      }

      const msg: AdvisoryMessage = {
        id: generateId(),
        clientId,
        subject: parsed.subject || `Advisory Note — Standard`,
        body: parsed.body,
        tone: "balanced",
        toneInfluences: [],
        referencedAlert: alert?.id,
        proposedAction: parsed.proposedAction || undefined,
        reasoning: parsed.reasoning || "Standard advisory based on portfolio and market conditions.",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
        status: "draft",
        disclaimer:
          "This is an AI-generated draft for the relationship manager's review. " +
          "It does not constitute financial advice. " +
          "The client's explicit approval is required before any transaction.",
      };

      auditService.log({
        agent: "message-agent",
        action: "generate-generic-advisory",
        clientId,
        inputSummary: `alert=${alert?.id || "none"}, generic=true`,
        outputSummary: `subject="${msg.subject}", confidence=${msg.confidence}`,
        durationMs: Date.now() - startTime,
      });

      return msg;
    } catch (err) {
      console.error("[MessageAgent] Generic LLM call failed:", (err as Error).message);
      return this.fallbackAdvisory(clientId, client.name, alert?.title);
    }
  }

  updateStatus(
    messageId: string,
    status: "approved" | "rejected",
    rmNotes?: string
  ): AdvisoryMessage | null {
    const msg = messageStore.get(messageId);
    if (!msg) return null;
    msg.status = status;
    if (rmNotes) msg.rmNotes = rmNotes;
    return msg;
  }

  getMessage(messageId: string): AdvisoryMessage | null {
    return messageStore.get(messageId) || null;
  }

  private fallbackAdvisory(
    clientId: string,
    clientName: string,
    alertTitle?: string
  ): AdvisoryMessage {
    const msg: AdvisoryMessage = {
      id: generateId(),
      clientId,
      subject: `Advisory Note — ${clientName}`,
      body: alertTitle
        ? `Dear ${clientName},\n\nWe would like to bring to your attention a recent development: "${alertTitle}".\n\nWe recommend scheduling a call to discuss how this may affect your portfolio and explore potential adjustments aligned with your investment values.\n\nBest regards,\nYour Relationship Manager`
        : `Unable to generate advisory at this time. Please review the alerts panel for pending items.`,
      tone: "balanced",
      toneInfluences: [],
      referencedAlert: undefined,
      proposedAction: "Schedule a review meeting with your relationship manager.",
      reasoning: "Advisory generated using fallback template due to service unavailability.",
      confidence: 0.3,
      status: "draft",
      disclaimer:
        "This is an AI-generated draft for the relationship manager's review. " +
        "It does not constitute financial advice. " +
        "The client's explicit approval is required before any transaction.",
    };
    messageStore.set(msg.id, msg);
    return msg;
  }
}
