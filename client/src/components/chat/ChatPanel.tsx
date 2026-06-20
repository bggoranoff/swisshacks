import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Loader2, ChevronRight, Wrench } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolCalls?: { name: string; result: any }[];
}

interface ChatPanelProps {
  clientId: string;
  clientName: string;
  history: ChatMessage[];
  onHistoryChange: (msgs: ChatMessage[]) => void;
  onClose?: () => void;
}

const TOOL_LABELS: Record<string, string> = {
  lookup_conflicts: "Conflicts",
  get_news_alerts: "News & Alerts",
  draft_advisory: "Advisory Draft",
  get_live_price: "Live Price",
  get_portfolio_drift: "Drift Analysis",
  get_transactions: "Transactions",
  search_instrument: "Instrument Search",
  explain_trait: "DNA Trait",
  simulate_swap: "Swap Simulation",
  compare_advisory: "Advisory Comparison",
  get_knowledge_graph: "Knowledge Graph",
};

const SUGGESTIONS = [
  "What conflicts does this portfolio have with the client's DNA?",
  "Are there any news alerts relevant to this client?",
  "How is the portfolio drifting from target allocation?",
];

export function ChatPanel({ clientId, clientName, history, onHistoryChange, onClose }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load server history once per clientId (only if no local history yet)
  useEffect(() => {
    if (loaded.has(clientId) || history.length > 0) return;
    fetch(`/api/clients/${clientId}/chat`)
      .then(r => r.json())
      .then(j => {
        if (j.success && Array.isArray(j.data) && j.data.length > 0) {
          onHistoryChange(j.data);
        }
        setLoaded(prev => new Set(prev).add(clientId));
      })
      .catch(() => setLoaded(prev => new Set(prev).add(clientId)));
  }, [clientId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, sending]);

  const handleSend = async (directText?: string) => {
    const text = (directText ?? input).trim();
    if (!text || sending) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    const next = [...history, userMsg];
    onHistoryChange(next);
    setSending(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();
      if (json.success) {
        onHistoryChange([...next, json.data]);
      }
    } catch {
      onHistoryChange([...next, { role: "assistant", content: "Failed to get response.", timestamp: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-six-red/70" />
          <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">RM Assistant</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            title="Close chat (Ctrl+\)"
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full gap-3 pt-6">
            <p className="text-sm text-slate-400 text-center">Ask the RM Assistant anything about this client:</p>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-50 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] space-y-1.5">
              {/* Tool badges */}
              {m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {m.toolCalls.map((tc, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-six-red/10 text-six-red/80 border border-six-red/20"
                    >
                      <Wrench className="h-2.5 w-2.5" />
                      {TOOL_LABELS[tc.name] || tc.name}
                    </span>
                  ))}
                </div>
              )}
              {/* Message content */}
              <div className={`px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-six-red text-white"
                  : "bg-slate-700 text-slate-200"
              }`}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-slate-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-slate-700 p-3 space-y-2">
        <div className="flex items-center">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
            <span className="text-six-red font-semibold">@</span>
            {clientName}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
            placeholder="Ask about this client..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-six-red transition-colors"
            disabled={sending}
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            className="bg-six-red hover:bg-six-red-bright disabled:opacity-50 text-white px-3 py-2 rounded-lg flex items-center transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
