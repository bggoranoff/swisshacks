import axios from "axios";
import { extractDNA } from "./crm.agent";
import { getClient, getPortfolio } from "../data/store";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const chatHistories = new Map<string, ChatMessage[]>();

export async function chat(clientId: string, userMessage: string): Promise<ChatMessage> {
  const client = getClient(clientId);
  const dna = await extractDNA(clientId, client?.crmEntries || [], false);
  const portfolio = client ? getPortfolio(client.strategy) : undefined;

  const history = chatHistories.get(clientId) || [];
  history.push({ role: "user", content: userMessage, timestamp: new Date().toISOString() });

  const topHoldings = portfolio?.positions
    .sort((a, b) => b.currentValueCHF - a.currentValueCHF)
    .slice(0, 10)
    .map(p => `${p.name} (${p.isin}, CHF ${(p.currentValueCHF / 1000).toFixed(0)}K)`)
    .join(", ") || "none";

  const systemPrompt = `You are an AI assistant for a Relationship Manager in wealth management.
Client: ${client?.name || clientId}
Strategy: ${client?.strategy || "unknown"}
DNA: Values: ${dna.values.join(", ")}. Sensitivities: ${dna.riskSensitivities.join(", ")}. Style: ${dna.communicationStyle}.
Top holdings: ${topHoldings}

Help the RM with questions about this client. You can explain conflicts, suggest alternatives, provide context from the CRM notes, or help draft messages. Be concise and professional. Never advise the client directly.`;

  try {
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-10).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const response = await axios.post(
      `${process.env.PHOENIQS_API_URL || "https://maas.phoeniqs.com/v1"}/chat/completions`,
      {
        model: process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b",
        messages,
        temperature: 0.3,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PHOENIQS_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const msg = response.data?.choices?.[0]?.message;
    const content = msg?.content || msg?.reasoning_content || "I couldn't generate a response.";
    const assistantMsg: ChatMessage = { role: "assistant", content, timestamp: new Date().toISOString() };
    history.push(assistantMsg);
    chatHistories.set(clientId, history.slice(-20));
    return assistantMsg;
  } catch (err) {
    console.warn(`[ChatAgent] Error for ${clientId}: ${(err as Error).message}`);
    const errorMsg: ChatMessage = {
      role: "assistant",
      content: "Sorry, I'm unable to respond right now. Please try again.",
      timestamp: new Date().toISOString(),
    };
    history.push(errorMsg);
    chatHistories.set(clientId, history);
    return errorMsg;
  }
}

export function getChatHistory(clientId: string): ChatMessage[] {
  return chatHistories.get(clientId) || [];
}
